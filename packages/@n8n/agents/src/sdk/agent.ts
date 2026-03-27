import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { z } from 'zod';

import type { Eval } from './eval';
import type { McpClient } from './mcp-client';
import { Memory } from './memory';
import { Telemetry } from './telemetry';
import { Tool, wrapToolForApproval } from './tool';
import { AgentRuntime } from '../runtime/agent-runtime';
import { AgentEventBus } from '../runtime/event-bus';
import { createAgentToolResult } from '../runtime/tool-adapter';
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
	BuiltTelemetry,
	CheckpointStore,
	ExecutionOptions,
	GenerateResult,
	MemoryConfig,
	ModelConfig,
	Provider,
	RunOptions,
	SerializableAgentState,
	StreamResult,
	SubAgentUsage,
	ThinkingConfig,
	ThinkingConfigFor,
	ResumeOptions,
} from '../types';
import type { AgentMessage } from '../types/sdk/message';
import type { Workspace } from '../workspace/workspace';

const DEFAULT_LAST_MESSAGES = 10;

type ToolParameter = BuiltTool | { build(): BuiltTool };

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

export class Agent implements BuiltAgent {
	readonly name: string;

	private modelId?: string;

	private modelConfigObj?: ModelConfig;

	private instructionProviderOpts?: ProviderOptions;

	private instructionsText?: string;

	private tools: BuiltTool[] = [];

	private providerTools: BuiltProviderTool[] = [];

	private memoryConfig?: MemoryConfig;

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

	private concurrencyValue?: number;

	private telemetryBuilder?: Telemetry;

	private telemetryConfig?: BuiltTelemetry;

	private middlewares: AgentMiddleware[] = [];

	private requireToolApprovalValue = false;

	private mcpClients: McpClient[] = [];

	private buildPromise: Promise<AgentRuntime> | undefined;

	private eventBus = new AgentEventBus();

	private workspaceInstance?: Workspace;

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
	model(providerOrIdOrConfig: string | ModelConfig, modelName?: string): this {
		if (typeof providerOrIdOrConfig === 'string') {
			this.modelId = modelName ? `${providerOrIdOrConfig}/${modelName}` : providerOrIdOrConfig;
			this.modelConfigObj = undefined;
		} else {
			this.modelConfigObj = providerOrIdOrConfig;
			this.modelId = undefined;
		}
		return this;
	}

	/** Set the system instructions for the agent. Required before building. */
	instructions(text: string, options?: { providerOptions?: ProviderOptions }): this {
		this.instructionsText = text;
		this.instructionProviderOpts = options?.providerOptions;
		return this;
	}

	/** Add a tool to the agent's capabilities. Accepts a built tool or a Tool builder (which will be built automatically). Can also accept an array of tools. */
	tool(t: ToolParameter | ToolParameter[]): this {
		if (Array.isArray(t)) {
			for (const tool of t) {
				this.tool(tool);
			}
			return this;
		}
		const built = 'build' in t ? t.build() : t;
		this.tools.push(built);
		return this;
	}

	/** Add a provider-defined tool (e.g. Anthropic web search, OpenAI code interpreter). */
	providerTool(builtProviderTool: BuiltProviderTool): this {
		this.providerTools.push(builtProviderTool);
		return this;
	}

	/** Set the memory configuration. Accepts a MemoryConfig, Memory builder, or bare BuiltMemory. */
	memory(m: MemoryConfig | Memory | BuiltMemory): this {
		if (m instanceof Memory) {
			// Memory builder — call build()
			this.memoryConfig = m.build();
		} else if ('memory' in m && 'lastMessages' in m) {
			// MemoryConfig — use directly
			this.memoryConfig = m;
		} else {
			// Bare BuiltMemory — wrap in minimal config
			this.memoryConfig = { memory: m, lastMessages: DEFAULT_LAST_MESSAGES };
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
	thinking<P extends Provider>(_provider: P, config?: ThinkingConfigFor<P>): this {
		this.thinkingConfig = config ?? {};
		return this;
	}

	/** Set telemetry configuration for this agent. Accepts a Telemetry builder or pre-built config. */
	telemetry(t: Telemetry | BuiltTelemetry): this {
		if (t instanceof Telemetry) {
			this.telemetryBuilder = t;
			this.telemetryConfig = undefined;
		} else {
			this.telemetryBuilder = undefined;
			this.telemetryConfig = t;
		}
		return this;
	}

	/** @internal Read the declared telemetry builder (used by the execution engine to resolve credentials). */
	protected get declaredTelemetry(): Telemetry | undefined {
		return this.telemetryBuilder;
	}

	/**
	 * Set the number of tool calls to execute concurrently within a single LLM turn.
	 *
	 * - `1` (default) — sequential execution, fully backward-compatible.
	 * - `Infinity` — unlimited parallelism (all tool calls start at once).
	 * - Any number in between — bounded concurrency (e.g. `5` = at most 5 tools run simultaneously).
	 */
	toolCallConcurrency(n: number): this {
		if ((n !== Infinity && !Number.isInteger(n)) || n < 1) {
			throw new Error('toolCallConcurrency must be a positive integer or Infinity');
		}
		this.concurrencyValue = n;
		return this;
	}

	/**
	 * Require human approval before any tool executes.
	 * Tools that already have .suspend()/.resume() (suspendSchema) are skipped.
	 * Requires .checkpoint() to be set.
	 */
	requireToolApproval(): this {
		this.requireToolApprovalValue = true;
		return this;
	}

	/**
	 * Attach a workspace to this agent. Workspace tools and instructions
	 * are injected at build time.
	 */
	workspace(ws: Workspace): this {
		this.workspaceInstance = ws;
		return this;
	}

	/**
	 * Add an MCP client as a tool source for this agent.
	 * Tools from all servers in the client become available to the agent.
	 * Multiple clients can be added; tools are merged across all of them.
	 *
	 * @example
	 * ```typescript
	 * const client = new McpClient([
	 *   { name: 'browser', url: 'http://localhost:9222/mcp', transport: 'streamableHttp' },
	 *   { name: 'fs', command: 'npx', args: ['@anthropic/mcp-fs', '/tmp'] },
	 * ]);
	 *
	 * const agent = new Agent('assistant')
	 *   .model('anthropic', 'claude-sonnet-4')
	 *   .mcp(client)
	 *   .instructions('You are a helpful assistant.');
	 * ```
	 */
	mcp(client: McpClient): this {
		this.mcpClients.push(client);
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
			.handler(async (rawInput, ctx) => {
				const { input } = rawInput as { input: string };
				const result = await agent.generate(input, {
					telemetry: ctx.parentTelemetry,
				} as RunOptions & ExecutionOptions);

				const text = result.messages
					.filter((m) => 'role' in m && m.role === 'assistant')
					.flatMap((m) => ('content' in m ? m.content : []))
					.filter((c) => c.type === 'text')
					.map((c) => ('text' in c ? c.text : ''))
					.join('');

				// Collect sub-agent usage: this agent's own + any nested sub-agents
				const subAgentUsage: SubAgentUsage[] = [];
				if (result.usage) {
					subAgentUsage.push({ agent: agent.name, model: result.model, usage: result.usage });
				}
				if (result.subAgentUsage) {
					subAgentUsage.push(...result.subAgentUsage);
				}

				// Return branded result — the runtime unwraps it to extract sub-agent usage.
				// createAgentToolResult returns `never`, same pattern as ctx.suspend().
				if (subAgentUsage.length > 0) {
					return createAgentToolResult({ result: text }, subAgentUsage);
				}
				return { result: text };
			});

		return tool.build();
	}

	/** Return the latest state snapshot of the agent. Returns `{ status: 'idle' }` before first run. */
	getState(): SerializableAgentState {
		if (!this.runtime) {
			return {
				persistence: undefined,
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
	async generate(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<GenerateResult> {
		const runtime = await this.ensureBuilt();
		return await runtime.generate(this.toMessages(input), options);
	}

	/** Stream a response. Lazy-builds on first call. */
	async stream(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<StreamResult> {
		const runtime = await this.ensureBuilt();
		return await runtime.stream(this.toMessages(input), options);
	}

	/** Resume a suspended tool call with data. Lazy-builds on first call. */
	async resume(
		method: 'generate',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult>;
	async resume(
		method: 'stream',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<StreamResult>;
	async resume(
		method: 'generate' | 'stream',
		data: unknown,
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult | StreamResult> {
		const runtime = await this.ensureBuilt();
		if (method === 'generate') {
			return await runtime.resume('generate', data, options);
		}
		return await runtime.resume('stream', data, options);
	}

	approve(method: 'generate', options: ResumeOptions & ExecutionOptions): Promise<GenerateResult>;
	approve(method: 'stream', options: ResumeOptions & ExecutionOptions): Promise<StreamResult>;
	async approve(
		method: 'generate' | 'stream',
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult | StreamResult> {
		if (method === 'generate') {
			return await this.resume('generate', { approved: true }, options);
		}
		return await this.resume('stream', { approved: true }, options);
	}

	deny(method: 'generate', options: ResumeOptions & ExecutionOptions): Promise<GenerateResult>;
	deny(method: 'stream', options: ResumeOptions & ExecutionOptions): Promise<StreamResult>;
	async deny(
		method: 'generate' | 'stream',
		options: ResumeOptions & ExecutionOptions,
	): Promise<GenerateResult | StreamResult> {
		if (method === 'generate') {
			return await this.resume('generate', { approved: false }, options);
		}
		return await this.resume('stream', { approved: false }, options);
	}

	/**
	 * @internal Lazy-build the agent on first use. Stores the promise so
	 * concurrent callers share one build operation. On error the promise is
	 * cleared so the caller can retry.
	 */
	private async ensureBuilt(): Promise<AgentRuntime> {
		if (!this.buildPromise) {
			const p = this.build();
			this.buildPromise = p;
			p.catch(() => {
				if (this.buildPromise === p) this.buildPromise = undefined;
			});
		}
		return await this.buildPromise;
	}

	private toMessages(input: string | AgentMessage[]): AgentMessage[] {
		if (Array.isArray(input)) return input;
		return [{ role: 'user', content: [{ type: 'text', text: input }] }];
	}

	/** @internal Validate configuration and produce an AgentRuntime. Overridden by the execution engine. */
	protected async build(): Promise<AgentRuntime> {
		const hasModel = this.modelId ?? this.modelConfigObj;
		if (!hasModel) {
			throw new Error(`Agent "${this.name}" requires a model`);
		}
		if (!this.instructionsText) {
			throw new Error(`Agent "${this.name}" requires instructions`);
		}

		const finalTools = [...this.tools];

		if (this.workspaceInstance) {
			const wsTools = this.workspaceInstance.getTools();
			finalTools.push(...wsTools);
		}

		let finalStaticTools = finalTools;
		if (this.requireToolApprovalValue) {
			finalStaticTools = finalTools.map((t) =>
				t.suspendSchema ? t : wrapToolForApproval(t, { requireApproval: true }),
			);
		}

		// Validate checkpoint requirement from static tools and known MCP approval config
		// before attempting any network connections (allows fast failure).
		const staticNeedsCheckpoint = finalStaticTools.some((t) => t.suspendSchema);
		const mcpNeedsCheckpoint =
			(this.requireToolApprovalValue && this.mcpClients.length > 0) ||
			this.mcpClients.some((c) => c.declaresApproval());
		if ((staticNeedsCheckpoint || mcpNeedsCheckpoint) && !this.checkpointStore) {
			throw new Error(
				`Agent "${this.name}" has tools requiring approval or suspend/resume but no checkpoint storage. ` +
					"Add .checkpoint('memory') for in-process storage, " +
					'or pass a persistent store (e.g. LibSQLStore, PgStore).',
			);
		}

		// Resolve tools from all MCP clients.
		const mcpToolLists = await Promise.all(this.mcpClients.map(async (c) => await c.listTools()));
		let mcpTools = mcpToolLists.flat();

		// Apply global requireToolApproval to MCP tools (per-server approval is already
		// handled inside McpClient/McpConnection.listTools()).
		if (this.requireToolApprovalValue) {
			mcpTools = mcpTools.map((t) =>
				t.suspendSchema ? t : wrapToolForApproval(t, { requireApproval: true }),
			);
		}

		// Detect collisions between MCP tools and static tools.
		const staticNames = new Set(finalStaticTools.map((t) => t.name));
		const collisions = mcpTools.filter((t) => staticNames.has(t.name)).map((t) => t.name);
		if (collisions.length > 0) {
			throw new Error(
				`MCP tool name collision — the following tool names resolve to duplicates: ${collisions.join(', ')}`,
			);
		}

		const allTools = [...finalStaticTools, ...mcpTools];

		// Validate checkpoint again after discovering actual MCP tools
		// (catches the case where MCP tools have suspendSchema after listing).
		const allNeedCheckpoint = allTools.some((t) => t.suspendSchema);
		if (allNeedCheckpoint && !this.checkpointStore) {
			throw new Error(
				`Agent "${this.name}" has tools requiring approval or suspend/resume but no checkpoint storage. ` +
					"Add .checkpoint('memory') for in-process storage, " +
					'or pass a persistent store (e.g. LibSQLStore, PgStore).',
			);
		}

		let modelConfig: ModelConfig;
		if (this.modelConfigObj) {
			if (
				this.resolvedKey &&
				typeof this.modelConfigObj === 'object' &&
				'id' in this.modelConfigObj
			) {
				modelConfig = { ...this.modelConfigObj, apiKey: this.resolvedKey };
			} else {
				modelConfig = this.modelConfigObj;
			}
		} else if (this.resolvedKey) {
			modelConfig = { id: this.modelId!, apiKey: this.resolvedKey };
		} else {
			modelConfig = this.modelId!;
		}

		let instructions = this.instructionsText;
		if (this.workspaceInstance) {
			const wsInstructions = this.workspaceInstance.getInstructions();
			if (wsInstructions) {
				instructions = `${instructions}\n\n${wsInstructions}`;
			}
		}

		this.runtime = new AgentRuntime({
			name: this.name,
			model: modelConfig,
			instructions,
			tools: allTools.length > 0 ? allTools : undefined,
			instructionProviderOptions: this.instructionProviderOpts,
			providerTools: this.providerTools.length > 0 ? this.providerTools : undefined,
			memory: this.memoryConfig?.memory,
			lastMessages: this.memoryConfig?.lastMessages,
			workingMemory: this.memoryConfig?.workingMemory,
			semanticRecall: this.memoryConfig?.semanticRecall,
			structuredOutput: this.outputSchema,
			checkpointStorage: this.checkpointStore,
			thinking: this.thinkingConfig,
			eventBus: this.eventBus,
			toolCallConcurrency: this.concurrencyValue,
			titleGeneration: this.memoryConfig?.titleGeneration,
			telemetry: this.telemetryConfig ?? (await this.telemetryBuilder?.build()),
		});

		return this.runtime;
	}
}
