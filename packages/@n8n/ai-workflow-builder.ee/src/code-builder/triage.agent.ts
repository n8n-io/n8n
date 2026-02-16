import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { Logger } from '@n8n/backend-common';

import type { AssistantHandler } from '@/assistant/assistant-handler';
import type { StreamWriter } from '@/assistant/types';
import { extractTextContent } from '@/code-builder/utils/content-extractors';
import { MAX_TRIAGE_ITERATIONS } from '@/constants';
import { prompt } from '@/prompts/builder';
import type { StreamChunk, StreamOutput } from '@/types/streaming';
import type { ChatPayload } from '@/workflow-builder-agent';

import { ASK_ASSISTANT_TOOL } from './tools/ask-assistant.tool';
import { BUILD_WORKFLOW_TOOL } from './tools/build-workflow.tool';

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

function conversationEntryToString(entry: TriageConversationEntry): string {
	switch (entry.type) {
		case 'build-request':
			return entry.message;
		case 'assistant-exchange':
			return `[Help] Q: ${entry.userQuery} → A: ${entry.assistantSummary}`;
		case 'plan':
			return `[Plan] Q: ${entry.userQuery} → ${entry.plan}`;
	}
}

function buildTriagePrompt(conversationHistory?: TriageConversationEntry[]): string {
	return prompt()
		.section(
			'role',
			'You are a triage agent for the n8n workflow builder. ' +
				'Your job is to classify each user message and route it to the right handler.',
		)
		.section(
			'routing',
			`Route each message using one or more of these:

1. **build_workflow** — The user wants to create, modify, or change a workflow.
   Pass the full user request as instructions.

2. **ask_assistant** — The user has a general question about n8n concepts, needs help understanding how something works, wants guidance on setting up credentials, or needs to diagnose a workflow error.
   Pass the user's query faithfully.

3. **Direct reply** — Simple conversational messages that don't need either tool.
   Respond with helpful text directly.`,
		)
		.section(
			'rules',
			`- For error/debug messages: first call ask_assistant to diagnose, then call build_workflow to apply the fix
- For pure questions (no fix needed): call ask_assistant and respond with its answer — no follow-up build required
- When in doubt between ask_assistant and build_workflow, prefer build_workflow for any message that implies changing the workflow
- Use conversation history to resolve references like "change that" or "the previous node"`,
		)
		.sectionIf(conversationHistory && conversationHistory.length > 0, 'conversation history', () =>
			conversationHistory!
				.map((entry, i) => `${i + 1}. ${conversationEntryToString(entry)}`)
				.join('\n'),
		)
		.build();
}

/**
 * Triage agent that classifies user messages and executes tools directly:
 * - `ask_assistant` — help/conceptual queries via AssistantHandler (no credits)
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

		const systemContent = buildTriagePrompt(conversationHistory);

		const messages: BaseMessage[] = [
			new SystemMessage(systemContent),
			new HumanMessage(payload.message),
		];

		const ctx = { userId, payload, abortSignal };
		const state: TriageAgentState = { sdkSessionId };

		let reachedMaxIterations = true;

		for (let iteration = 0; iteration < MAX_TRIAGE_ITERATIONS; iteration++) {
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
	 * Starts a tool, drains its streaming queue concurrently,
	 * and yields chunks as they arrive. Tool-agnostic, all tool knowledge
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
					if (queue.length > 0 || done) {
						resolve();
					}
				});
			}
		}

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
				// Stable ID so the frontend can match running → completed on the same tool entry.
				const assistantToolCallId = `triage-ask-assistant-${Date.now()}`;

				// Show tool progress immediately.
				enqueue(
					this.wrapChunk({
						type: 'tool',
						toolName: 'assistant',
						toolCallId: assistantToolCallId,
						customDisplayTitle: 'Asking assistant...',
						status: 'running',
					}),
				);

				const progressWriter: StreamWriter = (chunk) => {
					if (chunk.type === 'tool') {
						enqueue(this.wrapChunk(chunk));
					}
				};

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
					progressWriter,
					ctx.abortSignal,
				);

				const chunks: StreamChunk[] = [
					{
						type: 'tool',
						toolName: 'assistant',
						toolCallId: assistantToolCallId,
						status: 'completed',
					},
				];
				if (result.responseText) {
					chunks.push({
						role: 'assistant',
						type: 'message',
						text: result.responseText,
					});
				}
				enqueue({ messages: chunks });

				state.sdkSessionId = result.sdkSessionId;
				state.assistantSummary = result.summary;
				return { content: result.summary };
			}

			case 'build_workflow': {
				// We pass the original payload (not toolCall.args.instructions) because
				// CodeWorkflowBuilder.chat() needs full context (workflow state, feature
				// flags, etc.). The LLM's `instructions` field serves as chain-of-thought
				// for the routing decision and is useful in LangSmith traces.
				//
				// When ask_assistant ran earlier in the same loop (two-step diagnosis flow),
				// prepend its diagnosis so the builder has error context.
				const enrichedPayload = state.assistantSummary
					? {
							...ctx.payload,
							message: `[Diagnosis]: ${state.assistantSummary}\n\n${ctx.payload.message}`,
						}
					: ctx.payload;
				for await (const chunk of this.buildWorkflow(
					enrichedPayload,
					ctx.userId,
					ctx.abortSignal,
				)) {
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
	 * Returns facts about what happened, not routing decisions.
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
