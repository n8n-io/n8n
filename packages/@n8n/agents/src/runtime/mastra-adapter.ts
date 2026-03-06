import { Mastra } from '@mastra/core';
import { Agent as MastraAgent } from '@mastra/core/agent';
import type { MastraMemory } from '@mastra/core/memory';
import { InMemoryStore } from '@mastra/core/storage';
import type { z } from 'zod';

import type { Message } from '../message';
import { CheckpointBridgeStore } from './checkpoint-bridge';
import { createFilteredLogger } from './logger';
import { toMastraMessages } from './message-adapter';
import type {
	AgentResult,
	BuiltTool,
	BuiltProviderTool,
	BuiltMemory,
	RunOptions,
	CheckpointStore,
	FinishReason,
	StreamChunk,
	TokenUsage,
} from '../types';

/** Map from tool name to optional toMessage (output) -> Message. Used to incorporate tool messages in results. */
type ToolToMessageMap = Map<string, (output: unknown) => Message | undefined>;

/**
 * Configuration accepted by the MastraAdapter.
 * This is the normalized form produced by the Agent builder.
 */
export interface MastraAdapterConfig {
	name: string;
	model: string | { id: `${string}/${string}`; apiKey: string };
	instructions: string;
	tools?: BuiltTool[];
	providerTools?: BuiltProviderTool[];
	memory?: BuiltMemory;
	structuredOutput?: z.ZodType;
	checkpointStorage?: 'memory' | CheckpointStore;
}

/**
 * Shape of chunks emitted by Mastra's fullStream (internal; not from node_modules types).
 * Used as the input type for the stream transform so we output our StreamChunk type.
 */
interface MastraStreamChunk {
	type: string;
	runId?: string;
	payload?: {
		text?: string;
		toolName?: string;
		toolCallId?: string;
		args?: unknown;
		result?: unknown;
		providerMetadata?: Record<string, unknown>;
		error?: { message?: string };
		inputTokens?: number;
		outputTokens?: number;
		finishReason?: string;
	};
}

/**
 * Build our custom AgentResult from normalized generate/stream result fields.
 * When toolToMessageMap is provided, appends Messages from tools that define _toMessage (output -> Message).
 */
function toAgentResult(
	params: {
		text: string;
		toolCalls: Array<{ tool: string; input: unknown; output: unknown }>;
		inputTokens: number;
		outputTokens: number;
		steps: number;
		output?: unknown;
	},
	toolToMessageMap?: ToolToMessageMap,
): AgentResult {
	const { text, toolCalls, inputTokens, outputTokens, steps, output } = params;
	const usage: TokenUsage = {
		promptTokens: inputTokens,
		completionTokens: outputTokens,
		totalTokens: inputTokens + outputTokens,
	};
	const content: Array<{ type: 'text'; text: string }> = text ? [{ type: 'text', text }] : [];
	const messages: Message[] = [{ role: 'assistant', content }];

	if (toolToMessageMap && toolCalls.length > 0) {
		for (const tc of toolCalls) {
			const toMessage = toolToMessageMap.get(tc.tool);
			if (toMessage && tc.output !== undefined) {
				try {
					const toolMessage = toMessage(tc.output);
					if (toolMessage) {
						messages.push(toolMessage);
					}
				} catch {
					// Skip this tool message on error
				}
			}
		}
	}

	return {
		messages,
		usage,
		rawResponse: output,
		toolCalls,
		steps,
		output,
	};
}

/**
 * TransformStream that converts Mastra stream chunks to our StreamChunk type.
 * When toolToMessageMap is provided, tool-result chunks may produce additional content chunks from tools' _toMessage.
 */
function createMastraToStreamChunkTransform(
	toolToMessageMap?: ToolToMessageMap,
): TransformStream<MastraStreamChunk, StreamChunk> {
	return new TransformStream<MastraStreamChunk, StreamChunk>({
		transform(chunk, controller) {
			const payload = chunk.payload;
			const providerMetadata = payload?.providerMetadata;

			if (chunk.type === 'text-delta' && payload?.text !== undefined) {
				controller.enqueue({
					...(providerMetadata && { providerMetadata }),
					type: 'text-delta',
					delta: payload.text,
				});
				return;
			}
			if (chunk.type === 'reasoning-delta' && payload?.text !== undefined) {
				controller.enqueue({
					...(providerMetadata && { providerMetadata }),
					type: 'reasoning-delta',
					delta: payload.text,
				});
				return;
			}
			if (chunk.type === 'tool-call-delta') {
				controller.enqueue({
					...(providerMetadata && { providerMetadata }),
					type: 'tool-call-delta',
					...(payload?.toolName && { name: payload.toolName }),
					...(typeof payload?.args === 'string' && { argumentsDelta: payload.args }),
				});
				return;
			}
			if (chunk.type === 'tool-call' && payload?.toolName) {
				controller.enqueue({
					...(providerMetadata && { providerMetadata }),
					type: 'content',
					content: {
						...(providerMetadata && { providerMetadata }),
						type: 'tool-call',
						toolName: payload.toolName,
						toolCallId: payload.toolCallId,
						input:
							typeof payload.args === 'string' ? payload.args : JSON.stringify(payload.args ?? {}),
					},
				});
				return;
			}
			if (chunk.type === 'tool-result' && payload?.toolName) {
				controller.enqueue({
					...(providerMetadata && { providerMetadata }),
					type: 'content',
					content: {
						...(providerMetadata && { providerMetadata }),
						type: 'tool-result',
						toolName: payload.toolName,
						toolCallId: payload.toolCallId ?? '',
						result: payload.result,
						input:
							typeof payload.args === 'string' ? payload.args : JSON.stringify(payload.args ?? {}),
					},
				});
				// If this tool defines toMessage, emit its message as content chunks so the stream incorporates them
				const toMessage = toolToMessageMap?.get(payload.toolName);
				if (toMessage && payload.result !== undefined) {
					try {
						const toolMessage = toMessage(payload.result);
						if (toolMessage?.content?.length) {
							for (const block of toolMessage.content) {
								controller.enqueue({
									type: 'content',
									content: block,
								});
							}
						}
					} catch {
						// Skip emitting tool message on error
					}
				}
				return;
			}
			if (chunk.type === 'error') {
				controller.enqueue({
					...(providerMetadata && { providerMetadata }),
					type: 'error',
					error: payload?.error ?? new Error('Stream error'),
				});
				return;
			}
			if (chunk.type === 'tool-call-approval' && payload?.toolName) {
				controller.enqueue({
					...(providerMetadata && { providerMetadata }),
					type: 'tool-call-approval',
					runId: chunk.runId,
					toolCallId: payload.toolCallId,
					tool: payload.toolName,
					input: payload.args,
				});
				return;
			}
			if (chunk.type === 'finish' || chunk.type === 'step-finish') {
				const finishReason: FinishReason = (payload?.finishReason as FinishReason) ?? 'stop';
				const usage: TokenUsage | undefined =
					payload?.inputTokens !== undefined || payload?.outputTokens !== undefined
						? {
								promptTokens: payload?.inputTokens ?? 0,
								completionTokens: payload?.outputTokens ?? 0,
								totalTokens: (payload?.inputTokens ?? 0) + (payload?.outputTokens ?? 0),
							}
						: undefined;
				controller.enqueue({
					...(providerMetadata && { providerMetadata }),
					type: 'finish',
					finishReason,
					...(usage && { usage }),
				});
			}
		},
	});
}

/**
 * Internal adapter that translates n8n builder types into Mastra Agent
 * constructor calls and normalizes generate results.
 *
 * This class is NOT exported from the package — it is an implementation
 * detail of the Agent builder.
 */
export class MastraAdapter {
	readonly mastraAgent: MastraAgent;

	private readonly structuredOutputSchema?: z.ZodType;

	private readonly toolToMessageMap: ToolToMessageMap;
	private readonly storeResultsToolNames: Set<string>;
	private readonly hasMemory: boolean;
	constructor(config: MastraAdapterConfig) {
		if (!config.model) {
			throw new Error(`Agent "${config.name}" requires a model`);
		}

		// Convert BuiltTool array to the Record<string, tool> map Mastra expects
		const tools: Record<string, unknown> = {};
		this.storeResultsToolNames = new Set();
		this.hasMemory = !!config.memory;
		if (config.tools) {
			for (const tool of config.tools) {
				tools[tool.name] = tool._mastraTool;
				if (tool._storeResults) {
					this.storeResultsToolNames.add(tool.name);
				}
			}
		}
		// Provider-defined tools (e.g. Anthropic web search) are passed through as-is
		if (config.providerTools) {
			for (const pt of config.providerTools) {
				tools[pt.name] = pt._providerTool;
			}
		}

		this.toolToMessageMap = new Map<string, (output: unknown) => Message | undefined>();
		if (config.tools) {
			for (const tool of config.tools) {
				if (tool._toMessage) {
					this.toolToMessageMap.set(tool.name, tool._toMessage);
				}
			}
		}

		this.structuredOutputSchema = config.structuredOutput;

		this.mastraAgent = new MastraAgent({
			id: config.name,
			name: config.name,
			instructions: config.instructions,
			model: config.model,
			tools: tools as Record<string, never>,
			...(config.memory ? { memory: config.memory._mastraMemory as MastraMemory } : {}),
		});

		// Register the agent with a Mastra instance when it needs storage —
		// either for checkpoint snapshots (tool approval) or for memory persistence.
		// Mastra's constructor calls __registerMastra on the agent, injecting the storage backend.
		if (config.checkpointStorage || config.memory) {
			const store =
				config.checkpointStorage === 'memory'
					? new InMemoryStore()
					: config.checkpointStorage
						? new CheckpointBridgeStore(config.checkpointStorage)
						: new InMemoryStore();

			const mastra = new Mastra({
				agents: { [config.name]: this.mastraAgent },
				storage: store,
			});

			// Mastra constructor calls __registerMastra on the agent, injecting storage
			void mastra;
		}

		// Suppress known noisy runtime warnings (e.g. memory-related warnings during tool approval).
		// Must be set AFTER the Mastra registration above, which overwrites the agent's logger.
		(this.mastraAgent as unknown as { __setLogger: (l: unknown) => void }).__setLogger(
			createFilteredLogger(),
		);
	}

	/**
	 * Call Mastra's stream and return a text stream plus a way to get the
	 * full result (including tool calls) after the stream completes.
	 */
	async stream(
		input: Message[],
		options?: RunOptions,
	): Promise<{
		fullStream: ReadableStream<StreamChunk>;
		textStream: ReadableStream<string>;
		getResult: () => Promise<AgentResult>;
	}> {
		const memoryOptions =
			options?.threadId && options?.resourceId
				? {
						memory: {
							thread: options.threadId,
							resource: options.resourceId,
						},
					}
				: {};

		const streamOptions: Record<string, unknown> = { ...memoryOptions };
		if (this.structuredOutputSchema) {
			streamOptions.structuredOutput = { schema: this.structuredOutputSchema };
		}
		const mastraInput = Array.isArray(input) ? toMastraMessages(input) : input;
		const output = await this.mastraAgent.stream(mastraInput, streamOptions);

		// Collect ALL tool results from the stream. When tools go through
		// the approval flow, their results arrive on the resumed stream
		// but the promise-based output.toolCalls/toolResults only capture
		// results from the original (pre-suspension) stream.
		const streamToolResults: Array<{ tool: string; input: unknown; output: unknown }> = [];
		const fullStream = (output.fullStream as ReadableStream<MastraStreamChunk>)
			.pipeThrough(createMastraToStreamChunkTransform(this.toolToMessageMap))
			.pipeThrough(
				new TransformStream<StreamChunk, StreamChunk>({
					transform(chunk, controller) {
						if (chunk.type === 'content' && chunk.content.type === 'tool-result') {
							streamToolResults.push({
								tool: chunk.content.toolName,
								input: chunk.content.input,
								output: chunk.content.result,
							});
						}
						controller.enqueue(chunk);
					},
				}),
			);

		const getResult = async (): Promise<AgentResult> => {
			const [text, usage, parsedObject, rawToolCalls, rawToolResults] = await Promise.all([
				output.text,
				output.usage,
				Promise.resolve(output.object).catch(() => undefined),
				Promise.resolve(output.toolCalls).catch(() => []),
				Promise.resolve(output.toolResults).catch(() => []),
			]);

			const resolvedToolCalls = Array.isArray(rawToolCalls) ? rawToolCalls : [];
			const resolvedToolResults = Array.isArray(rawToolResults) ? rawToolResults : [];

			const toolCalls = resolvedToolCalls.map((tc) => ({
				tool: tc.payload?.toolName ?? '',
				input: tc.payload?.args,
				output: tc.payload?.output,
			}));

			const toolResults = resolvedToolResults.map((tr) => ({
				tool: tr.payload?.toolName ?? '',
				input: tr.payload?.args,
				output: tr.payload?.result,
			}));

			// Match by index rather than name — the same tool can be called multiple
			// times and matching by name always returns the first result.
			const mergedToolCalls = toolCalls.map((tc, idx) => ({
				tool: tc.tool,
				input: tc.input,
				output: toolResults[idx]?.output ?? tc.output,
			}));

			const steps = await output.steps;

			const streamResult = toAgentResult(
				{
					text: text ?? '',
					toolCalls: mergedToolCalls,
					inputTokens: usage?.inputTokens ?? 0,
					outputTokens: usage?.outputTokens ?? 0,
					steps: steps?.length ?? 0,
					output: parsedObject,
				},
				this.toolToMessageMap,
			);

			// Use stream-collected tool results for saving (more reliable than
			// getResult().toolCalls which can be empty in the streaming path)
			const resultForSave =
				streamToolResults.length > 0
					? { ...streamResult, toolCalls: streamToolResults }
					: streamResult;
			await this.saveToolResultsToMemory(resultForSave, options);

			return streamResult;
		};

		return {
			fullStream,
			textStream: output.textStream as ReadableStream<string>,
			getResult,
		};
	}

	/**
	 * Call Mastra's generate and normalize the result into our AgentResult.
	 */
	async generate(input: Message[], options?: RunOptions): Promise<AgentResult> {
		const memoryOptions =
			options?.threadId && options?.resourceId
				? {
						memory: {
							thread: options.threadId,
							resource: options.resourceId,
						},
					}
				: {};

		const executionOptions: Record<string, unknown> = { ...memoryOptions };
		if (this.structuredOutputSchema) {
			executionOptions.structuredOutput = { schema: this.structuredOutputSchema };
		}

		const mastraInput = Array.isArray(input) ? toMastraMessages(input) : input;
		const output = await this.mastraAgent.generate(mastraInput, executionOptions);

		// Normalize Mastra's FullOutput into our AgentResult
		const toolCalls = (output.toolCalls ?? []).map((tc) => ({
			tool: tc.payload?.toolName ?? '',
			input: tc.payload?.args,
			output: tc.payload?.output,
		}));

		const toolResults = (output.toolResults ?? []).map((tr) => ({
			tool: tr.payload?.toolName ?? '',
			input: tr.payload?.args,
			output: tr.payload?.result,
		}));

		// Match by index rather than name — the same tool can be called multiple
		// times and matching by name always returns the first result.
		const mergedToolCalls = toolCalls.map((tc, idx) => ({
			tool: tc.tool,
			input: tc.input,
			output: toolResults[idx]?.output ?? tc.output,
		}));
		const agentResult = toAgentResult(
			{
				text: output.text ?? '',
				toolCalls: mergedToolCalls,
				inputTokens: output.usage?.inputTokens ?? 0,
				outputTokens: output.usage?.outputTokens ?? 0,
				steps: output.steps?.length ?? 0,
				output: (output as unknown as { object?: unknown }).object,
			},
			this.toolToMessageMap,
		);
		await this.saveToolResultsToMemory(agentResult, options);

		return agentResult;
	}

	/**
	 * Save tool results to memory as a synthetic assistant message.
	 * Only saves results for tools that have .storeResults() enabled.
	 */
	private async saveToolResultsToMemory(result: AgentResult, options?: RunOptions): Promise<void> {
		if (
			!this.hasMemory ||
			this.storeResultsToolNames.size === 0 ||
			!options?.threadId ||
			!options?.resourceId
		) {
			return;
		}

		const toolSummaries: string[] = [];
		const toolCalls = result.toolCalls ?? [];
		for (const tc of toolCalls) {
			if (this.storeResultsToolNames.has(tc.tool)) {
				const outputStr =
					typeof tc.output === 'string' ? tc.output : JSON.stringify(tc.output, null, 2);
				toolSummaries.push(`[Tool result: ${tc.tool}]\n${outputStr}`);
			}
		}

		if (toolSummaries.length === 0) return;

		// Mastra stores memory via getMemory() (async), not as a direct property
		const mastraAgent = this.mastraAgent as unknown as {
			getMemory?: () => Promise<MastraMemory | undefined>;
			memory?: MastraMemory;
		};
		const memory = mastraAgent.getMemory ? await mastraAgent.getMemory() : mastraAgent.memory;
		if (!memory || typeof memory.saveMessages !== 'function') return;

		const syntheticMessage = {
			id: `tool-results-${Date.now()}`,
			role: 'assistant' as const,
			content: {
				format: 2 as const,
				parts: [{ type: 'text' as const, text: toolSummaries.join('\n\n') }],
			},
			createdAt: new Date(),
			threadId: options.threadId,
			resourceId: options.resourceId,
		};

		try {
			await memory.saveMessages({ messages: [syntheticMessage as never] });
		} catch {
			// Best-effort — don't fail the request if memory save fails
		}
	}

	/**
	 * Approve a pending tool call. Returns the resumed stream.
	 */
	async approveToolCall(
		runId: string,
		toolCallId?: string,
	): Promise<{ fullStream: ReadableStream<unknown> }> {
		const output = await this.mastraAgent.approveToolCall({ runId, toolCallId });
		const fullStream = (output.fullStream as ReadableStream<MastraStreamChunk>).pipeThrough(
			createMastraToStreamChunkTransform(this.toolToMessageMap),
		);
		return {
			fullStream,
		};
	}

	/**
	 * Decline a pending tool call. Returns the resumed stream.
	 */
	async declineToolCall(
		runId: string,
		toolCallId?: string,
	): Promise<{ fullStream: ReadableStream<unknown> }> {
		const output = await this.mastraAgent.declineToolCall({ runId, toolCallId });
		const fullStream = (output.fullStream as ReadableStream<MastraStreamChunk>).pipeThrough(
			createMastraToStreamChunkTransform(this.toolToMessageMap),
		);
		return {
			fullStream,
		};
	}
}
