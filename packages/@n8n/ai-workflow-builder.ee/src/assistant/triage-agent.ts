import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { Logger } from '@n8n/backend-common';

import { extractTextContent } from '@/code-builder/utils/content-extractors';
import { prompt } from '@/prompts/builder';
import type { StreamChunk, StreamOutput } from '@/types/streaming';

import { ASK_ASSISTANT_TOOL } from './ask-assistant.tool';
import type { AssistantHandler } from './assistant-handler';
import { BUILD_WORKFLOW_TOOL } from './build-workflow.tool';
import type { StreamWriter } from './types';
import type { ChatPayload } from '../workflow-builder-agent';

type TriageConversationEntry =
	| { type: 'build-request'; message: string }
	| { type: 'assistant-exchange'; userQuery: string; assistantSummary: string }
	| { type: 'plan'; userQuery: string; plan: string };

export interface TriageAgentConfig {
	llm: BaseChatModel;
	assistantHandler: AssistantHandler;
	buildWorkflow: (
		payload: ChatPayload,
		userId: string,
		abortSignal?: AbortSignal,
	) => AsyncIterable<StreamOutput>;
	logger?: Logger;
}

export interface TriageAgentParams {
	payload: ChatPayload;
	userId: string;
	abortSignal?: AbortSignal;
	sdkSessionId?: string;
	conversationHistory?: TriageConversationEntry[];
}

/**
 * Public return type from `TriageAgent.run()`.
 * Intentionally mirrors `TriageAgentState` today. Kept separate so that
 * internal-only fields (e.g. iteration counters) can be added to the state
 * later without leaking through the public API.
 */
export interface TriageAgentOutcome {
	sdkSessionId?: string;
	assistantSummary?: string;
	buildExecuted?: boolean;
}

/** Result of dispatching a single tool call */
interface ToolResult {
	content: string;
	/** When true, exit the agent loop immediately — don't send the result back to the LLM. */
	endLoop?: boolean;
}

/** Mutable state tracked across agent loop iterations */
interface TriageAgentState {
	sdkSessionId?: string;
	assistantSummary?: string;
	buildExecuted?: boolean;
}

/** Maximum agent loop iterations to prevent runaway loops */
const MAX_ITERATIONS = 10;

const TRIAGE_PROMPT = prompt()
	.section(
		'role',
		`You are a triage agent for the n8n workflow builder.
You have tools available. Use them when appropriate, or respond directly if neither tool fits.

Rules:
- Make exactly zero or one tool call per turn
- Pass the user's query faithfully to ask_assistant
- Include the full user request as instructions for build_workflow
- If neither tool is appropriate, respond directly with helpful text
- Use conversation history (if provided) to understand context from previous turns`,
	)
	.build();

/**
 * Triage agent that classifies user messages and executes tools directly:
 * - `ask_assistant` — help/debug queries via AssistantHandler (no credits)
 * - `build_workflow` — workflow generation via CodeWorkflowBuilder (credits consumed)
 * - direct text reply — conversational responses (no credits)
 *
 * Unlike a router, this agent executes tools in-place, streaming all chunks
 * (assistant + builder) through a single generator. The consumer sees the
 * final outcome (facts, not routing decisions) after the generator completes.
 */
export class TriageAgent {
	private readonly llm: BaseChatModel;

	private readonly assistantHandler: AssistantHandler;

	private readonly buildWorkflow: (
		payload: ChatPayload,
		userId: string,
		abortSignal?: AbortSignal,
	) => AsyncIterable<StreamOutput>;

	private readonly logger?: Logger;

	constructor(config: TriageAgentConfig) {
		this.llm = config.llm;
		this.assistantHandler = config.assistantHandler;
		this.buildWorkflow = config.buildWorkflow;
		this.logger = config.logger;
	}

	/**
	 * Run the triage agent loop: LLM -> tool call -> execute -> ToolMessage -> loop.
	 * The loop is tool-agnostic — all tool knowledge lives in executeTool().
	 * Yields `StreamOutput` chunks and returns the outcome.
	 */
	async *run(params: TriageAgentParams): AsyncGenerator<StreamOutput, TriageAgentOutcome> {
		const { payload, userId, abortSignal, sdkSessionId, conversationHistory } = params;

		if (!this.llm.bindTools) {
			throw new Error('LLM does not support bindTools');
		}
		const llmWithTools = this.llm.bindTools([ASK_ASSISTANT_TOOL, BUILD_WORKFLOW_TOOL]);

		const conversationEntryToString = (entry: TriageConversationEntry): string => {
			switch (entry.type) {
				case 'build-request':
					return entry.message;
				case 'assistant-exchange':
					return `[Help] Q: ${entry.userQuery} → A: ${entry.assistantSummary}`;
				case 'plan':
					return `[Plan] Q: ${entry.userQuery} → ${entry.plan}`;
			}
		};

		let systemContent = TRIAGE_PROMPT;
		if (conversationHistory && conversationHistory.length > 0) {
			const lines = conversationHistory.map((entry, index) => {
				return `${index + 1}. ${conversationEntryToString(entry)}`;
			});
			systemContent += `\n\nConversation history:\n${lines.join('\n')}`;
		}

		const messages: BaseMessage[] = [
			new SystemMessage(systemContent),
			new HumanMessage(payload.message),
		];

		const ctx = { userId, payload, abortSignal };
		const state: TriageAgentState = { sdkSessionId };

		let reachedMaxIterations = true;

		for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
			const response: AIMessageChunk = await llmWithTools.invoke(messages, {
				signal: abortSignal,
			});
			messages.push(response);

			const toolCalls = response.tool_calls ?? [];

			if (toolCalls.length === 0) {
				this.logger?.debug('[TriageAgent] No tool call, responding with text', {
					iteration: iteration + 1,
				});
				const text = extractTextContent(new AIMessage({ content: response.content })) ?? '';
				if (text) {
					yield this.wrapChunk({
						role: 'assistant',
						type: 'message',
						text,
					});
				}
				reachedMaxIterations = false;
				break;
			}

			for (const toolCall of toolCalls) {
				this.logger?.debug('[TriageAgent] Tool called', {
					toolName: toolCall.name,
					iteration: iteration + 1,
				});
				const toolCallId = toolCall.id ?? `tc-${iteration}`;
				const result = yield* this.executeToolWithStreaming(toolCall, ctx, state);

				this.logger?.debug('[TriageAgent] Tool completed', {
					toolName: toolCall.name,
					iteration: iteration + 1,
					endLoop: result.endLoop,
				});

				messages.push(
					new ToolMessage({
						tool_call_id: toolCallId,
						content: result.content,
					}),
				);

				if (result.endLoop) {
					return this.getOutcome(state);
				}
			}
		}

		if (reachedMaxIterations) {
			this.logger?.warn('[TriageAgent] Max iterations reached');
		}

		return this.getOutcome(state);
	}

	/**
	 * Generic bridge: starts a tool, drains its streaming queue concurrently,
	 * and yields chunks as they arrive. Tool-agnostic — all tool knowledge
	 * lives in executeTool().
	 *
	 * The bridge is strictly needed for callback-based tools (`ask_assistant`,
	 * where the writer callback pushes chunks). For generator-based tools
	 * (`build_workflow`) the bridge adds minimal overhead but keeps all tools
	 * on a single uniform path, making it trivial to add future tools.
	 */
	private async *executeToolWithStreaming(
		toolCall: { name: string; args: Record<string, unknown> },
		ctx: { userId: string; payload: ChatPayload; abortSignal?: AbortSignal },
		state: TriageAgentState,
	): AsyncGenerator<StreamOutput, ToolResult> {
		const queue: StreamOutput[] = [];
		let resolveNext: (() => void) | undefined;
		let done = false;

		const enqueue = (output: StreamOutput) => {
			queue.push(output);
			resolveNext?.();
		};

		const toolPromise = this.executeTool(toolCall, ctx, state, enqueue).finally(() => {
			done = true;
			resolveNext?.();
		});

		while (!done || queue.length > 0) {
			if (queue.length > 0) {
				yield queue.shift()!;
			} else if (!done) {
				await new Promise<void>((resolve) => {
					resolveNext = resolve;
					// Check again in case chunk arrived between the check and await
					if (queue.length > 0 || done) {
						resolve();
					}
				});
			}
		}

		// Re-throws if executeTool() errored, after any partial chunks have been
		// drained and yielded by the while-loop above.
		return await toolPromise;
	}

	/**
	 * Plain async function containing all tool knowledge. Streams via
	 * the enqueue() side-effect callback.
	 */
	private async executeTool(
		toolCall: { name: string; args: Record<string, unknown> },
		ctx: { userId: string; payload: ChatPayload; abortSignal?: AbortSignal },
		state: TriageAgentState,
		enqueue: (output: StreamOutput) => void,
	): Promise<ToolResult> {
		switch (toolCall.name) {
			case 'ask_assistant': {
				const writer: StreamWriter = (chunk: StreamChunk) => {
					enqueue({ messages: [chunk] });
				};

				// Yield tool progress: running
				enqueue(
					this.wrapChunk({
						type: 'tool',
						toolName: 'assistant',
						customDisplayTitle: 'Asking assistant',
						status: 'running',
					}),
				);

				const currentWorkflow = ctx.payload.workflowContext?.currentWorkflow;
				const workflowJSON = currentWorkflow
					? {
							name: currentWorkflow.name ?? '',
							nodes: currentWorkflow.nodes ?? [],
							connections: currentWorkflow.connections ?? {},
						}
					: undefined;

				const result = await this.assistantHandler.execute(
					{
						query: (toolCall.args as { query: string }).query,
						sdkSessionId: state.sdkSessionId,
						workflowJSON,
					},
					ctx.userId,
					writer,
					ctx.abortSignal,
				);

				enqueue(
					this.wrapChunk({
						type: 'tool',
						toolName: 'assistant',
						status: 'completed',
					}),
				);

				state.sdkSessionId = result.sdkSessionId;
				state.assistantSummary = result.summary;
				return { content: result.summary };
			}

			case 'build_workflow': {
				// We pass the original payload (not toolCall.args.instructions) because
				// CodeWorkflowBuilder.chat() needs full context (workflow state, feature
				// flags, etc.). The LLM's `instructions` field serves as chain-of-thought
				// for the routing decision and is useful in LangSmith traces.
				for await (const chunk of this.buildWorkflow(ctx.payload, ctx.userId, ctx.abortSignal)) {
					enqueue(chunk);
				}
				state.buildExecuted = true;
				return { content: 'Workflow built.', endLoop: true };
			}

			default:
				this.logger?.warn('[TriageAgent] Unknown tool call', {
					toolName: toolCall.name,
				});
				return { content: `Unknown tool: ${toolCall.name}` };
		}
	}

	/**
	 * Trivial state copy — returns facts about what happened, not routing decisions.
	 */
	private getOutcome(state: TriageAgentState): TriageAgentOutcome {
		return {
			sdkSessionId: state.sdkSessionId,
			assistantSummary: state.assistantSummary,
			buildExecuted: state.buildExecuted,
		};
	}

	private wrapChunk(chunk: StreamChunk): StreamOutput {
		return { messages: [chunk] };
	}
}
