import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import type { Eval } from './eval';
import type { Message } from './message';
import { AgentRun } from './run';
import { MastraAdapter } from './runtime/mastra-adapter';
import type {
	BuiltAgent,
	BuiltEval,
	BuiltGuardrail,
	BuiltMemory,
	BuiltProviderTool,
	BuiltTool,
	CheckpointStore,
	Provider,
	Run,
	RunOptions,
	ThinkingConfig,
	ThinkingConfigFor,
} from './types';

/** Convert a plain string prompt into a Message array. */
function toMessages(prompt: string | Message[]): Message[] {
	if (Array.isArray(prompt)) return prompt;
	return [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
}

/**
 * Builder for creating AI agents with a fluent API.
 *
 * Usage:
 * ```typescript
 * const agent = new Agent('assistant')
 *   .model('anthropic', 'claude-sonnet-4')   // typed: Agent<'anthropic'>
 *   .credential('anthropic')
 *   .instructions('You are a helpful assistant.')
 *   .tool(searchTool);
 *
 * const run = agent.run('Hello!');
 * const result = await run.result;
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export class Agent<P extends Provider | undefined = undefined> {
	private name: string;

	private modelId?: string;

	private instructionsText?: string;

	private tools: BuiltTool[] = [];

	private providerTools: BuiltProviderTool[] = [];

	private memoryConfig?: BuiltMemory;

	// TODO: Guardrails are accepted by the builder API for forward
	// compatibility but not yet wired to the Mastra adapter.
	private inputGuardrails: BuiltGuardrail[] = [];

	private outputGuardrails: BuiltGuardrail[] = [];

	private agentEvals: BuiltEval[] = [];

	private outputSchema?: z.ZodType;

	private checkpointStore?: 'memory' | CheckpointStore;

	private thinkingConfig?: ThinkingConfig;

	private credentialName?: string;

	private _resolvedApiKey?: string;

	private _built?: BuiltAgent;

	constructor(name: string) {
		this.name = name;
	}

	/**
	 * Set the model with provider type information.
	 *
	 * @example
	 * ```typescript
	 * // Typed form — enables provider-specific config on .thinking() etc.
	 * agent.model('anthropic', 'claude-sonnet-4-5')
	 *
	 * // Untyped form — backwards compatible
	 * agent.model('anthropic/claude-sonnet-4-5')
	 * ```
	 */
	model<Prov extends Provider>(provider: Prov, modelName: string): Agent<Prov>;
	model(modelId: string): Agent;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	model(providerOrId: string, modelName?: string): Agent<any> {
		this.modelId = modelName ? `${providerOrId}/${modelName}` : providerOrId;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
		return this as any;
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

	/** Add an eval to run after each agent response. Accepts an Eval builder or BuiltEval. */
	eval(e: Eval | BuiltEval | { ensureBuilt(): BuiltEval }): this {
		const built = '_run' in e ? e : (e as Eval).ensureBuilt();
		this.agentEvals.push(built);
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

	/**
	 * Enable extended thinking / reasoning for the agent.
	 * The config type is inferred from the provider set via `.model()`.
	 *
	 * @example
	 * ```typescript
	 * // Anthropic — budgetTokens
	 * new Agent('thinker')
	 *   .model('anthropic', 'claude-sonnet-4-5')
	 *   .thinking({ budgetTokens: 10000 })
	 *
	 * // OpenAI — reasoningEffort
	 * new Agent('thinker')
	 *   .model('openai', 'o3-mini')
	 *   .thinking({ reasoningEffort: 'high' })
	 * ```
	 */
	thinking(config?: ThinkingConfigFor<P>): this {
		this.thinkingConfig = config ?? {};
		return this;
	}

	/** @internal Lazy-build the agent on first use. */
	private ensureBuilt(): BuiltAgent {
		this._built ??= this.build();
		return this._built;
	}

	/** Get the evals attached to this agent. */
	get evaluations(): BuiltEval[] {
		return [...this.agentEvals];
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
	async streamText(input: string | Message[], options?: RunOptions) {
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
			thinking: this.thinkingConfig,
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
						const textResponse = result.messages[0].content
							.map((c) => (c.type === 'text' ? (c as { text: string }).text : ''))
							.join('\n');
						return { response: textResponse };
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
