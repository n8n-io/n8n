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
} from '../types';

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
 * Internal adapter that translates n8n builder types into Mastra Agent
 * constructor calls and normalizes generate results.
 *
 * This class is NOT exported from the package — it is an implementation
 * detail of the Agent builder.
 */
export class MastraAdapter {
	readonly mastraAgent: MastraAgent;

	private readonly structuredOutputSchema?: z.ZodType;

	private readonly approvalToolNames: string[];

	private readonly storeResultsToolNames: Set<string>;

	private readonly hasMemory: boolean;

	constructor(config: MastraAdapterConfig) {
		if (!config.model) {
			throw new Error(`Agent "${config.name}" requires a model`);
		}

		this.hasMemory = !!config.memory;

		// Convert BuiltTool array to the Record<string, tool> map Mastra expects
		const tools: Record<string, unknown> = {};
		this.approvalToolNames = [];
		this.storeResultsToolNames = new Set();
		if (config.tools) {
			for (const tool of config.tools) {
				tools[tool.name] = tool._mastraTool;
				if (tool._approval) {
					this.approvalToolNames.push(tool.name);
				}
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
		textStream: ReadableStream<string>;
		fullStream: ReadableStream<unknown>;
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
		if (this.approvalToolNames.length > 0) {
			streamOptions.requireToolApproval = true;
		}

		const mastraInput = Array.isArray(input) ? toMastraMessages(input) : input;
		const output = await this.mastraAgent.stream(mastraInput, streamOptions);

		// Collect tool results from the stream for storeResults persistence.
		// We can't rely on getResult().toolCalls for the streaming path since
		// Mastra may return empty tool calls there.
		const streamToolResults: Array<{ tool: string; input: unknown; output: unknown }> = [];

		// Wrap the fullStream to auto-approve tools that aren't in the approval list.
		// When Mastra pauses for approval on a non-approval tool, we immediately
		// approve it and splice the resumed stream into the output.
		const approvalSet = new Set(this.approvalToolNames);
		const mastraAgent = this.mastraAgent;
		const wrappedFullStream = new ReadableStream({
			async start(controller) {
				const processStream = async (stream: ReadableStream<unknown>) => {
					const reader = stream.getReader();
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						const chunk = value as {
							type?: string;
							runId?: string;
							payload?: { toolName?: string; toolCallId?: string };
						};
						if (
							chunk.type === 'tool-call-approval' &&
							chunk.payload?.toolName &&
							!approvalSet.has(chunk.payload.toolName)
						) {
							// Auto-approve this tool and continue with the resumed stream
							const resumed = await mastraAgent.approveToolCall({
								runId: chunk.runId ?? '',
								toolCallId: chunk.payload.toolCallId,
							});
							const resumedOutput = resumed as unknown as { fullStream?: ReadableStream<unknown> };
							if (resumedOutput.fullStream) {
								await processStream(resumedOutput.fullStream);
							}
							return; // original stream is done after suspension
						}
						controller.enqueue(value);
					}
				};
				try {
					await processStream(output.fullStream as ReadableStream<unknown>);
					controller.close();
				} catch (error) {
					controller.error(error);
				}
			},
		});

		const getResult = async (): Promise<AgentResult> => {
			// Wait for the stream to fully complete — some fields may be promises or arrays
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

			const streamResult: AgentResult = {
				text: text ?? '',
				toolCalls: mergedToolCalls.length > 0 ? mergedToolCalls : streamToolResults,
				tokens: {
					input: usage?.inputTokens ?? 0,
					output: usage?.outputTokens ?? 0,
				},
				steps: steps?.length ?? 0,
				output: parsedObject,
			};

			// Use stream-collected tool results for saving (more reliable than
			// getResult().toolCalls which can be empty in the streaming path)
			const resultForSave =
				streamToolResults.length > 0
					? { ...streamResult, toolCalls: streamToolResults }
					: streamResult;
			await this.saveToolResultsToMemory(resultForSave, options);

			return streamResult;
		};
		// Wrap the output stream to collect tool results for storeResults persistence.
		const baseStream =
			this.approvalToolNames.length > 0
				? wrappedFullStream
				: (output.fullStream as ReadableStream<unknown>);

		const storeToolNames = this.storeResultsToolNames;
		const tappedStream = baseStream.pipeThrough(
			new TransformStream({
				transform(chunk, controller) {
					const c = chunk as {
						type?: string;
						payload?: { toolName?: string; args?: unknown; result?: unknown };
					};
					if (
						c.type === 'tool-result' &&
						c.payload?.toolName &&
						storeToolNames.has(c.payload.toolName)
					) {
						streamToolResults.push({
							tool: c.payload.toolName,
							input: c.payload.args,
							output: c.payload.result,
						});
					}
					controller.enqueue(chunk);
				},
			}),
		);

		return {
			textStream: output.textStream as ReadableStream<string>,
			fullStream: tappedStream,
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
		if (this.approvalToolNames.length > 0) {
			executionOptions.requireToolApproval = true;
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
		const agentResult: AgentResult = {
			text: output.text ?? '',
			toolCalls: mergedToolCalls,
			tokens: {
				input: output.usage?.inputTokens ?? 0,
				output: output.usage?.outputTokens ?? 0,
			},
			steps: output.steps?.length ?? 0,
			output: (output as unknown as { object?: unknown }).object,
		};

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
		for (const tc of result.toolCalls) {
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
		const typedOutput = output as unknown as { fullStream?: ReadableStream<unknown> };
		return {
			fullStream:
				typedOutput.fullStream ??
				new ReadableStream({
					start(c) {
						c.close();
					},
				}),
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
		const typedOutput = output as unknown as { fullStream?: ReadableStream<unknown> };
		return {
			fullStream:
				typedOutput.fullStream ??
				new ReadableStream({
					start(c) {
						c.close();
					},
				}),
		};
	}
}
