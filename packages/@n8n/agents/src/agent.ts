import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { Message } from './message';
import { AgentRun } from './run';
import { MastraAdapter } from './runtime/mastra-adapter';
import type {
	AgentResult,
	BuiltAgent,
	BuiltGuardrail,
	BuiltMemory,
	BuiltProviderTool,
	BuiltScorer,
	BuiltTool,
	CheckpointStore,
	Run,
	RunOptions,
} from './types';

/** Normalize input to a Message array — accepts a plain string or pre-formed messages. */
function toMessages(input: string | Message[]): Message[] {
	if (Array.isArray(input)) return input;
	return [{ role: 'user', content: [{ type: 'text', text: input }] }];
}

/**
 * Builder for creating AI agents with a fluent API.
 *
 * Usage:
 * ```typescript
 * const agent = new Agent('assistant')
 *   .model('anthropic/claude-sonnet-4')
 *   .credential('anthropic')
 *   .instructions('You are a helpful assistant.')
 *   .tool(searchTool);
 *
 * const run = agent.run('Hello!');
 * const result = await run.result;
 * ```
 */
export class Agent {
	private name: string;

	private modelId?: string;

	private instructionsText?: string;

	private tools: BuiltTool[] = [];

	private providerTools: BuiltProviderTool[] = [];

	private memoryConfig?: BuiltMemory;

	// TODO: Guardrails and scorers are accepted by the builder API for forward
	// compatibility but not yet wired to the Mastra adapter. They will be
	// connected when the guardrail/eval pipeline is implemented.
	private inputGuardrails: BuiltGuardrail[] = [];

	private outputGuardrails: BuiltGuardrail[] = [];

	private scorers: BuiltScorer[] = [];

	private outputSchema?: z.ZodType;

	private checkpointStore?: 'memory' | CheckpointStore;

	private credentialName?: string;

	private _resolvedApiKey?: string;

	private _built?: BuiltAgent;

	constructor(name: string) {
		this.name = name;
	}

	/** Set the model identifier (e.g. 'anthropic/claude-sonnet-4'). Required before building. */
	model(modelId: string): this {
		this.modelId = modelId;
		return this;
	}

	/** Set the system instructions for the agent. Required before building. */
	instructions(text: string): this {
		this.instructionsText = text;
		return this;
	}

	/** Add a tool to the agent's capabilities. Accepts a built tool or a Tool builder (which will be built automatically). */
	tool(t: BuiltTool | { build(): BuiltTool }): this {
		const built = '_mastraTool' in t ? t : t.build();
		this.tools.push(built);
		return this;
	}

	/** Add a provider-defined tool (e.g. Anthropic web search, OpenAI code interpreter). */
	providerTool(builtProviderTool: BuiltProviderTool): this {
		this.providerTools.push(builtProviderTool);
		return this;
	}

	/** Set the memory configuration for the agent. Accepts a built memory or a Memory builder. */
	memory(m: BuiltMemory | { build(): BuiltMemory }): this {
		this.memoryConfig = '_mastraMemory' in m ? m : m.build();
		return this;
	}

	/** Add an input guardrail. Accepts a built guardrail or a Guardrail builder. */
	inputGuardrail(g: BuiltGuardrail | { build(): BuiltGuardrail }): this {
		this.inputGuardrails.push('_config' in g ? g : g.build());
		return this;
	}

	/** Add an output guardrail. Accepts a built guardrail or a Guardrail builder. */
	outputGuardrail(g: BuiltGuardrail | { build(): BuiltGuardrail }): this {
		this.outputGuardrails.push('_config' in g ? g : g.build());
		return this;
	}

	/** Add a scorer. Accepts a built scorer or a Scorer builder. */
	scorer(s: BuiltScorer | { build(): BuiltScorer }): this {
		this.scorers.push('_mastraScorer' in s ? s : s.build());
		return this;
	}

	/**
	 * Set the checkpoint storage for tool approval (human-in-the-loop).
	 * Required when any tool uses `.requiresApproval()`.
	 *
	 * - `'memory'` — in-process storage (lost on restart, fine for dev)
	 * - A storage provider instance (e.g. `new LibSQLStore(...)`, `new PgStore(...)`)
	 *
	 * @example
	 * ```typescript
	 * const agent = new Agent('assistant')
	 *   .model('anthropic/claude-sonnet-4-5')
	 *   .instructions('...')
	 *   .tool(dangerousTool) // has .requiresApproval()
	 *   .checkpoint('memory')
	 *   .build();
	 * ```
	 */
	checkpoint(storage: 'memory' | CheckpointStore): this {
		this.checkpointStore = storage;
		return this;
	}

	/**
	 * Declare a credential this agent requires. The execution engine resolves
	 * the credential name to an API key at build time and injects it into the
	 * model configuration — user code never handles raw keys.
	 *
	 * @example
	 * ```typescript
	 * const agent = new Agent('assistant')
	 *   .model('anthropic/claude-sonnet-4-5')
	 *   .credential('anthropic')
	 *   .instructions('You are helpful.');
	 * ```
	 */
	credential(name: string): this {
		this.credentialName = name;
		return this;
	}

	/** @internal Read the declared credential name (used by the execution engine). */
	protected get declaredCredential(): string | undefined {
		return this.credentialName;
	}

	/** @internal Set the resolved API key (called by the execution engine before super.build()). */
	protected set resolvedApiKey(key: string) {
		this._resolvedApiKey = key;
	}

	/**
	 * Set a structured output schema. When set, the agent's response will be
	 * parsed into a typed object matching the schema, available as `result.output`.
	 *
	 * @example
	 * ```typescript
	 * const agent = new Agent('extractor')
	 *   .model('anthropic/claude-sonnet-4-5')
	 *   .instructions('Extract structured data.')
	 *   .structuredOutput(z.object({
	 *     code: z.string(),
	 *     explanation: z.string(),
	 *   }))
	 *   .build();
	 *
	 * const result = await agent.run('...').result;
	 * console.log(result.output); // { code: '...', explanation: '...' }
	 * ```
	 */
	structuredOutput(schema: z.ZodType): this {
		this.outputSchema = schema;
		return this;
	}

	/** @internal Lazy-build the agent on first use. */
	private ensureBuilt(): BuiltAgent {
		this._built ??= this.build();
		return this._built;
	}

	/** Approve a pending tool call. Returns the resumed stream. Lazy-builds on first call. */
	async approveToolCall(
		runId: string,
		toolCallId?: string,
	): Promise<{ fullStream: ReadableStream<unknown> }> {
		return await this.ensureBuilt().approveToolCall(runId, toolCallId);
	}

	/** Decline a pending tool call. Returns the resumed stream. Lazy-builds on first call. */
	async declineToolCall(
		runId: string,
		toolCallId?: string,
	): Promise<{ fullStream: ReadableStream<unknown> }> {
		return await this.ensureBuilt().declineToolCall(runId, toolCallId);
	}

	/** Run the agent with a prompt or messages. Lazy-builds on first call. */
	run(input: string | Message[], options?: RunOptions): Run {
		return this.ensureBuilt().run(toMessages(input), options);
	}

	/** Stream the agent with a prompt or messages. Lazy-builds on first call. */
	stream(input: string | Message[], options?: RunOptions): Run {
		return this.ensureBuilt().stream(toMessages(input), options);
	}

	/** Stream text from the agent. Lazy-builds on first call. */
	async streamText(
		input: string | Message[],
		options?: RunOptions,
	): Promise<{
		textStream: ReadableStream<string>;
		fullStream: ReadableStream<unknown>;
		getResult: () => Promise<AgentResult>;
	}> {
		return await this.ensureBuilt().streamText(toMessages(input), options);
	}

	/** Convert this agent into a tool usable by other agents. Lazy-builds on first call. */
	asTool(description: string): BuiltTool {
		return this.ensureBuilt().asTool(description);
	}

	/** @internal Validate configuration and produce a BuiltAgent. Overridden by the execution engine. */
	protected build(): BuiltAgent {
		if (!this.modelId) {
			throw new Error(`Agent "${this.name}" requires a model`);
		}
		if (!this.instructionsText) {
			throw new Error(`Agent "${this.name}" requires instructions`);
		}

		const hasApprovalTools = this.tools.some((t) => t._approval);
		if (hasApprovalTools && !this.checkpointStore) {
			throw new Error(
				`Agent "${this.name}" has tools with .requiresApproval() but no checkpoint storage. ` +
					"Add .checkpoint('memory') for in-process storage, " +
					'or pass a persistent store (e.g. LibSQLStore, PgStore).',
			);
		}

		const modelConfig: string | { id: `${string}/${string}`; apiKey: string } = this._resolvedApiKey
			? { id: this.modelId as `${string}/${string}`, apiKey: this._resolvedApiKey }
			: this.modelId;

		const adapter = new MastraAdapter({
			name: this.name,
			model: modelConfig,
			instructions: this.instructionsText,
			tools: this.tools.length > 0 ? this.tools : undefined,
			providerTools: this.providerTools.length > 0 ? this.providerTools : undefined,
			memory: this.memoryConfig,
			structuredOutput: this.outputSchema,
			checkpointStorage: this.checkpointStore,
		});

		const name = this.name;

		return {
			name,

			run(input: Message[], options?: RunOptions) {
				const resultPromise = adapter.generate(input, options);
				return new AgentRun(resultPromise);
			},

			stream(input: Message[], options?: RunOptions) {
				// Streaming will be fully wired in a later task.
				// For now, delegate to generate via the same run mechanism.
				const resultPromise = adapter.generate(input, options);
				return new AgentRun(resultPromise);
			},

			async streamText(input: Message[], options?: RunOptions) {
				return await adapter.stream(input, options);
			},

			asTool(description: string): BuiltTool {
				const agentAdapter = adapter;

				const mastraTool = createTool({
					id: name,
					description,
					inputSchema: z.object({ prompt: z.string() }),
					outputSchema: z.object({ response: z.string() }),
					execute: async ({ prompt: toolPrompt }) => {
						const result = await agentAdapter.generate([
							{ role: 'user', content: [{ type: 'text', text: toolPrompt }] },
						]);
						return { response: result.text };
					},
				});

				return {
					name,
					description,
					_mastraTool: mastraTool,
				};
			},

			async approveToolCall(runId: string, toolCallId?: string) {
				return await adapter.approveToolCall(runId, toolCallId);
			},

			async declineToolCall(runId: string, toolCallId?: string) {
				return await adapter.declineToolCall(runId, toolCallId);
			},
		};
	}
}
