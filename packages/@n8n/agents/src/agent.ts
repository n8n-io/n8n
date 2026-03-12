import { z } from 'zod';

import type { Eval } from './eval';
import type { AgentMessage } from './message';
import { AgentRuntime } from './runtime/agent-runtime';
import { AgentEventBus } from './runtime/event-bus';
import { Tool } from './tool';
import type {
	AgentEvent,
	AgentEventHandler,
	AgentMiddleware,
	BuiltAgent,
	BuiltEval,
	BuiltGuardrail,
	BuiltMemory,
	BuiltProviderTool,
	BuiltTool,
	CheckpointStore,
	GenerateResult,
	Provider,
	RunOptions,
	SerializableAgentState,
	StreamResult,
	ThinkingConfig,
	ThinkingConfigFor,
} from './types';

const DEFAULT_LAST_MESSAGES = 10;

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
 * const result = await agent.generate('Hello!');
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export class Agent<P extends Provider | undefined = undefined> implements BuiltAgent {
	readonly name: string;

	private modelId?: string;

	private instructionsText?: string;

	private tools: BuiltTool[] = [];

	private providerTools: BuiltProviderTool[] = [];

	private memoryConfig?: { memory: BuiltMemory; lastMessages: number };

	// TODO: Guardrails are accepted by the builder API for forward
	// compatibility but not yet wired to the runtime.
	private inputGuardrails: BuiltGuardrail[] = [];

	private outputGuardrails: BuiltGuardrail[] = [];

	private agentEvals: BuiltEval[] = [];

	private outputSchema?: z.ZodType;

	private checkpointStore?: 'memory' | CheckpointStore;

	private thinkingConfig?: ThinkingConfig;

	private credentialName?: string;

	private resolvedKey?: string;

	private runtime?: AgentRuntime;

	private middlewares: AgentMiddleware[] = [];

	private eventBus = new AgentEventBus();

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
		const built = 'build' in t ? t.build() : t;
		this.tools.push(built);
		return this;
	}

	/** Add a provider-defined tool (e.g. Anthropic web search, OpenAI code interpreter). */
	providerTool(builtProviderTool: BuiltProviderTool): this {
		this.providerTools.push(builtProviderTool);
		return this;
	}

	/** Set the memory configuration for the agent. Accepts a built memory or a Memory builder. */
	memory(m: BuiltMemory | { build(): BuiltMemory; lastMessageCount?: number }): this {
		if ('build' in m && typeof m.build === 'function') {
			const lastMessages = m.lastMessageCount ?? DEFAULT_LAST_MESSAGES;
			this.memoryConfig = { memory: m.build(), lastMessages };
		} else {
			this.memoryConfig = { memory: m as BuiltMemory, lastMessages: DEFAULT_LAST_MESSAGES };
		}
		return this;
	}

	/** Add a middleware. */
	middleware(m: AgentMiddleware): this {
		this.middlewares.push(m);
		return this;
	}

	// TODO: guardrails can be a middleware internally
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
	 * Set the checkpoint storage for tool suspend/resume (human-in-the-loop).
	 * Required when any tool uses `.suspend()` / `.resume()`.
	 *
	 * - `'memory'` — in-process storage (lost on restart, fine for dev)
	 * - A storage provider instance (e.g. `new LibSQLStore(...)`, `new PgStore(...)`)
	 *
	 * @example
	 * ```typescript
	 * const agent = new Agent('assistant')
	 *   .model('anthropic/claude-sonnet-4-5')
	 *   .instructions('...')
	 *   .tool(dangerousTool) // has .suspend() / .resume()
	 *   .checkpoint('memory');
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
		this.resolvedKey = key;
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
	 *   }));
	 *
	 * const result = await agent.generate('...');
	 * console.log(result.structuredOutput); // { code: '...', explanation: '...' }
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

	/** Get the evals attached to this agent. */
	get evaluations(): BuiltEval[] {
		return [...this.agentEvals];
	}

	/**
	 * Register a handler for an agent lifecycle event.
	 * Handlers are called synchronously during the agentic loop.
	 */
	on(event: AgentEvent, handler: AgentEventHandler): void {
		this.eventBus.on(event, handler);
	}

	/**
	 * Wrap this agent as a tool for use in multi-agent composition.
	 * The tool sends a text prompt to this agent and returns the text of the response.
	 *
	 * @example
	 * ```typescript
	 * const coordinatorAgent = new Agent('coordinator')
	 *   .model('anthropic/claude-sonnet-4-5')
	 *   .instructions('Route tasks to specialist agents.')
	 *   .tool(writerAgent.asTool('Write content given a topic'));
	 * ```
	 */
	asTool(description: string): BuiltTool {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const agent = this;
		const tool = new Tool(this.name)
			.description(description)
			.input(
				z.object({
					input: z.string().describe('The input to send to the agent'),
				}),
			)
			.output(
				z.object({
					result: z.string().describe('The result of the agent'),
				}),
			)
			.handler(async (rawInput) => {
				const { input } = rawInput as { input: string };
				const result = await agent.generate(input);
				const text = result.messages
					.filter((m) => 'role' in m && m.role === 'assistant')
					.flatMap((m) => ('content' in m ? m.content : []))
					.filter((c) => c.type === 'text')
					.map((c) => ('text' in c ? c.text : ''))
					.join('');
				return { result: text };
			});
		return tool.build();
	}

	/** Return the latest state snapshot of the agent. Returns `{ status: 'idle' }` before first run. */
	getState(): SerializableAgentState {
		if (!this.runtime) {
			return {
				resourceId: '',
				threadId: '',
				status: 'idle',
				messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				pendingToolCalls: {},
			};
		}
		return this.runtime.getState();
	}

	/**
	 * Cancel the currently running agent.
	 * Synchronous — sets an abort flag; the agentic loop checks it asynchronously.
	 */
	abort(): void {
		this.eventBus.abort();
	}

	/** Generate a response (non-streaming). Lazy-builds on first call. */
	async generate(input: AgentMessage[] | string, options?: RunOptions): Promise<GenerateResult> {
		return await this.ensureBuilt().generate(this.toMessages(input), options);
	}

	/** Stream a response. Lazy-builds on first call. */
	async stream(input: AgentMessage[] | string, options?: RunOptions): Promise<StreamResult> {
		return await this.ensureBuilt().stream(this.toMessages(input), options);
	}

	/** Resume a suspended tool call with data. Lazy-builds on first call. */
	async resume(
		method: 'generate',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<GenerateResult>;
	async resume(
		method: 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<StreamResult>;
	async resume(
		method: 'generate' | 'stream',
		data: unknown,
		options: { runId: string; toolCallId: string },
	): Promise<GenerateResult | StreamResult> {
		const runtime = this.ensureBuilt();
		if (method === 'generate') {
			return await runtime.resume('generate', data, options);
		}
		return await runtime.resume('stream', data, options);
	}

	/** @internal Lazy-build the agent on first use. */
	private ensureBuilt(): AgentRuntime {
		this.runtime ??= this.build();
		return this.runtime;
	}

	private toMessages(input: string | AgentMessage[]): AgentMessage[] {
		if (Array.isArray(input)) return input;
		return [{ role: 'user', content: [{ type: 'text', text: input }] }];
	}

	/** @internal Validate configuration and produce an AgentRuntime. Overridden by the execution engine. */
	protected build(): AgentRuntime {
		if (!this.modelId) {
			throw new Error(`Agent "${this.name}" requires a model`);
		}
		if (!this.instructionsText) {
			throw new Error(`Agent "${this.name}" requires instructions`);
		}

		const hasInterruptibleTools = this.tools.some((t) => t.suspendSchema);
		if (hasInterruptibleTools && !this.checkpointStore) {
			throw new Error(
				`Agent "${this.name}" has tools with .suspend()/.resume() but no checkpoint storage. ` +
					"Add .checkpoint('memory') for in-process storage, " +
					'or pass a persistent store (e.g. LibSQLStore, PgStore).',
			);
		}

		const modelConfig = this.resolvedKey
			? { id: this.modelId, apiKey: this.resolvedKey }
			: this.modelId;

		return new AgentRuntime({
			name: this.name,
			model: modelConfig,
			instructions: this.instructionsText,
			tools: this.tools.length > 0 ? this.tools : undefined,
			providerTools: this.providerTools.length > 0 ? this.providerTools : undefined,
			memory: this.memoryConfig?.memory,
			lastMessages: this.memoryConfig?.lastMessages,
			structuredOutput: this.outputSchema,
			checkpointStorage: this.checkpointStore,
			thinking: this.thinkingConfig,
			eventBus: this.eventBus,
		});
	}
}
