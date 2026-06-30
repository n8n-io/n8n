import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { JSONSchema7 } from 'json-schema';
import type { z } from 'zod';

import { getModelCost } from './catalog';
import type { Eval } from './eval';
import type { McpClient } from './mcp-client';
import { Memory, normalizeMemoryConfig, resolveMemoryConfigDefaults } from './memory';
import { Telemetry } from './telemetry';
import { wrapToolForApproval } from './tool';
import { AgentRuntime, type AgentRuntimeConfig } from '../runtime/loop/agent-runtime';
import { RECALL_MEMORY_TOOL_NAME } from '../runtime/memory/episodic-memory';
import type { ScopedMemoryTaskEvent } from '../runtime/memory/scoped-memory-task-runner';
import type { FetchFn } from '../runtime/model/model-factory';
import { AgentEventBus } from '../runtime/state/event-bus';
import { RunStateManager } from '../runtime/state/run-state';
import {
	LOAD_TOOL_TOOL_NAME,
	SEARCH_TOOLS_TOOL_NAME,
} from '../runtime/tools/deferred-tool-manager';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
	createDelegateSubAgentTool,
	failedDelegatedChildSuspendOutput,
	generateResultToDelegateSubAgentOutput,
	getInlineDelegateSubAgentToolOptions,
	renderDelegateSubAgentPrompt,
	type DelegateSubAgentRequest,
	type DelegateSubAgentToolOutput,
	type InlineSubAgentProviderToolsResolver,
	type SubAgentTaskDifficulty,
} from '../runtime/tools/delegate-sub-agent-tool';
import { isSdkOwnedBuiltInTool } from '../runtime/tools/sdk-owned-tool';
import { WRITE_TODOS_TOOL_NAME } from '../runtime/tools/write-todos-tool';
import {
	appendSkillCatalogToInstructions,
	createRuntimeSkillSource,
	createRuntimeSkillTools,
	RUNTIME_SKILL_TOOL_NAMES,
} from '../skills';
import type { RuntimeSkill, RuntimeSkillSource } from '../skills';
import type {
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
	StreamResult,
	ThinkingConfig,
	ThinkingConfigFor,
	ResumeOptions,
} from '../types';
import type { AgentEvent } from '../types/runtime/event';
import type { StreamChunk } from '../types/sdk/agent';
import type { AgentBuilder } from '../types/sdk/agent-builder';
import type { AgentMessage } from '../types/sdk/message';
import type { Workspace } from '../workspace/workspace';

type ToolParameter = BuiltTool | { build(): BuiltTool };

const SDK_INLINE_SUB_AGENT_BLOCKED_TOOL_NAMES = new Set([
	DELEGATE_SUB_AGENT_TOOL_NAME,
	RECALL_MEMORY_TOOL_NAME,
	WRITE_TODOS_TOOL_NAME,
]);

const SDK_RESERVED_BUILTIN_TOOL_NAMES = new Set([
	DELEGATE_SUB_AGENT_TOOL_NAME,
	WRITE_TODOS_TOOL_NAME,
]);

interface DeferredToolOptions {
	search?: {
		topK?: number;
	};
}

type ActiveRuntime = {
	runtime: AgentRuntime;
	bus: AgentEventBus;
};

/**
 * Lightweight read-only view of an agent's configured state.
 * Returned by `Agent.snapshot` for testing and debugging purposes.
 */
export interface AgentSnapshot {
	/** Agent name. */
	name: string;
	/** Parsed model identifier. Both fields are null if no model has been set. */
	model: { provider: string | null; name: string | null };
	/** Instruction text passed to `.instructions()`, or null if not set. */
	instructions: string | null;
	/** Minimal description of each directly registered tool. */
	tools: ReadonlyArray<{ name: string; description: string | undefined }>;
	/** True when `.memory()` has been configured. */
	hasMemory: boolean;
	/** True when observation-log memory has been configured on the memory builder. */
	hasObservationalMemory: boolean;
	/** True when episodic memory has been configured on the memory builder. */
	hasEpisodicMemory: boolean;
	/** The thinking config if set, otherwise null. */
	thinking: ThinkingConfig | null;
	/** Tool-call concurrency limit if set, otherwise null. */
	toolCallConcurrency: number | null;
}

/**
 * Builder for creating AI agents with a fluent API.
 *
 * Usage:
 * ```typescript
 * const agent = new Agent('assistant')
 *   .model('anthropic', 'claude-sonnet-4')
 *   .instructions('You are a helpful assistant.')
 *   .tool(searchTool);
 *
 * const result = await agent.generate('Hello!');
 * ```
 */

export class Agent implements BuiltAgent, AgentBuilder {
	readonly name: string;

	private modelConfig?: ModelConfig;

	private modelFetchValue?: FetchFn;

	private instructionProviderOpts?: ProviderOptions;

	private instructionsText?: string;

	private tools: BuiltTool[] = [];

	private deferredTools: BuiltTool[] = [];

	private deferredToolSearchTopK: number | undefined;

	private providerTools: BuiltProviderTool[] = [];

	private skillSource?: RuntimeSkillSource;

	private hasRuntimeSkillTool = false;

	private memoryConfig?: MemoryConfig;

	private onMemoryTaskEvent?: (event: ScopedMemoryTaskEvent) => void;

	// TODO: Guardrails are accepted by the builder API for forward
	// compatibility but not yet wired to the runtime.
	private inputGuardrails: BuiltGuardrail[] = [];

	private outputGuardrails: BuiltGuardrail[] = [];

	private agentEvals: BuiltEval[] = [];

	private outputSchema?: z.ZodType | JSONSchema7;

	private checkpointStore?: 'memory' | CheckpointStore;

	private thinkingConfig?: ThinkingConfig;

	private concurrencyValue?: number;

	private telemetryBuilder?: Telemetry;

	private telemetryConfig?: BuiltTelemetry;

	private middlewares: AgentMiddleware[] = [];

	private mcpClients: McpClient[] = [];

	private defaultExecutionOptions?: ExecutionOptions;

	private buildPromise: Promise<AgentRuntimeConfig> | undefined;

	private agentHandlers = new Map<AgentEvent, Set<AgentEventHandler>>();

	private activeRuntimes = new Set<ActiveRuntime>();

	private workspaceInstance?: Workspace;

	constructor(name: string) {
		this.name = name;
	}

	hasCheckpointStorage(): boolean {
		return this.checkpointStore !== undefined;
	}

	hasMemory(): boolean {
		return this.memoryConfig !== undefined;
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
			this.modelConfig = modelName ? `${providerOrIdOrConfig}/${modelName}` : providerOrIdOrConfig;
		} else {
			this.modelConfig = providerOrIdOrConfig;
		}
		return this;
	}

	/**
	 * Provide a proxy-aware `fetch` for the agent's model calls. When unset, model
	 * construction falls back to the ambient HTTP_PROXY resolver.
	 */
	modelFetch(fetch: FetchFn): this {
		this.modelFetchValue = fetch;
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
		const tools = Array.isArray(t) ? t : [t];
		const builtTools = tools.map((tool) => ('build' in tool ? tool.build() : tool));
		for (const built of builtTools) {
			this.assertToolRegistrationAllowed(built);
		}
		this.tools.push(...builtTools);
		return this;
	}

	/** Add tools that are searchable through `search_tools` and activated on demand with `load_tool`. */
	deferredTool(t: ToolParameter | ToolParameter[], options?: DeferredToolOptions): this {
		const tools = Array.isArray(t) ? t : [t];
		for (const tool of tools) {
			const built = 'build' in tool ? tool.build() : tool;
			this.assertReservedSdkBuiltInToolName(built);
			this.deferredTools.push(built);
		}
		if (options?.search?.topK !== undefined) {
			this.deferredToolSearchTopK = options.search.topK;
		}
		return this;
	}

	/**
	 * Add runtime-loadable skills to the agent. The model sees only a compact
	 * name/description catalog in the system prompt, then calls `load_skill`
	 * to retrieve the full instructions for a relevant skill.
	 */
	skills(sourceOrSkills: RuntimeSkillSource | RuntimeSkill[]): this {
		const source = Array.isArray(sourceOrSkills)
			? createRuntimeSkillSource(sourceOrSkills)
			: sourceOrSkills;

		this.removeRuntimeSkillTools();
		this.skillSource = source;
		if (source.registry.skills.length === 0) return this;

		const reservedTool = this.tools.find((tool) => RUNTIME_SKILL_TOOL_NAMES.has(tool.name));
		if (reservedTool) {
			throw new Error(`Tool name "${reservedTool.name}" is reserved for runtime skills`);
		}

		this.tools.push(...createRuntimeSkillTools(source));
		this.hasRuntimeSkillTool = true;
		return this;
	}

	/** Add a provider-defined tool (e.g. Anthropic web search, OpenAI code interpreter). */
	providerTool(builtProviderTool: BuiltProviderTool): this {
		this.providerTools.push(builtProviderTool);
		return this;
	}

	/** Read the declared tools. Lists only tools added via tool() */
	get declaredTools(): BuiltTool[] {
		return this.tools;
	}

	/** Set the memory configuration. Accepts a MemoryConfig, Memory builder, or bare BuiltMemory. */
	memory(m: MemoryConfig | Memory | BuiltMemory): this {
		if (m instanceof Memory) {
			// Memory builder — call build()
			this.memoryConfig = m.build();
		} else if ('memory' in m) {
			// MemoryConfig — validate the same invariants as the builder path
			this.memoryConfig = normalizeMemoryConfig(m);
		} else if (
			typeof m === 'object' &&
			m !== null &&
			typeof m.getMessages === 'function' &&
			typeof m.saveMessages === 'function'
		) {
			// Bare BuiltMemory — wrap in minimal config
			this.memoryConfig = { memory: m };
		} else {
			throw new Error(
				'Invalid memory configuration. Use: new Memory() for in-process memory, ' +
					'or new Memory().storage(myBuiltMemoryBackend) for a persistent backend. ' +
					'See the Memory class documentation for all options.',
			);
		}
		return this;
	}

	/** Observe observational-memory background task lifecycle (observer/reflector). */
	memoryTaskObserver(observer: (event: ScopedMemoryTaskEvent) => void): this {
		this.onMemoryTaskEvent = observer;
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
	 * Set a structured output schema. When set, the agent's response will be
	 * parsed into a typed object matching the schema, available as `result.output`.
	 *
	 * Accepts either a Zod schema or a raw JSON Schema. JSON Schema is useful
	 * when the schema is supplied dynamically (e.g. entered in a workflow node)
	 * and there is no Zod type to compile against.
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
	structuredOutput(schema: z.ZodType | JSONSchema7): this {
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
	 *   .thinking('anthropic', { budgetTokens: 5000 })
	 *
	 * // OpenAI — reasoningEffort
	 * new Agent('thinker')
	 *   .model('openai', 'o3-mini')
	 *   .thinking('openai', { reasoningEffort: 'high' })
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
			this.buildPromise = undefined;
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

	/**
	 * Set default execution options for all `generate()` and `stream()` calls.
	 * Options passed directly to those methods take precedence over these defaults.
	 *
	 * @example
	 * ```typescript
	 * const agent = new Agent('assistant')
	 *   .model('anthropic/claude-sonnet-4-5')
	 *   .instructions('You are a helpful assistant.')
	 *   .configuration({ maxIterations: 5 });
	 *
	 * // Uses maxIterations: 5 from defaults
	 * await agent.generate('Hello');
	 *
	 * // Overrides maxIterations to 10 for this call only
	 * await agent.generate('Hello', { maxIterations: 10 });
	 * ```
	 */
	configuration(options: ExecutionOptions): this {
		this.defaultExecutionOptions = options;
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
		let handlers = this.agentHandlers.get(event);
		if (!handlers) {
			handlers = new Set();
			this.agentHandlers.set(event, handlers);
		}
		handlers.add(handler);
		for (const { bus } of this.activeRuntimes) {
			bus.on(event, handler);
		}
	}

	/**
	 * Remove a previously registered event handler. Pair with `on()` so
	 * per-request subscribers (e.g. the cli's ExecutionRecorder) can detach
	 * cleanly between turns instead of accumulating on a long-lived agent.
	 */
	off(event: AgentEvent, handler: AgentEventHandler): void {
		const handlers = this.agentHandlers.get(event);
		if (!handlers) return;
		handlers.delete(handler);
		if (handlers.size === 0) {
			this.agentHandlers.delete(event);
		}
		for (const { bus } of this.activeRuntimes) {
			bus.off(event, handler);
		}
	}

	/**
	 * Return a lightweight read-only snapshot of the agent's configured state.
	 * Useful for testing and debugging — does not trigger a build.
	 */
	get snapshot(): AgentSnapshot {
		let model: AgentSnapshot['model'];
		const rawModelId =
			typeof this.modelConfig === 'string'
				? this.modelConfig
				: this.modelConfig && typeof this.modelConfig === 'object' && 'id' in this.modelConfig
					? this.modelConfig.id
					: undefined;

		if (rawModelId) {
			const slashIdx = rawModelId.indexOf('/');
			if (slashIdx === -1) {
				model = { provider: null, name: rawModelId };
			} else {
				model = {
					provider: rawModelId.slice(0, slashIdx),
					name: rawModelId.slice(slashIdx + 1),
				};
			}
		} else {
			model = { provider: null, name: null };
		}

		return {
			name: this.name,
			model,
			instructions: this.instructionsText ?? null,
			tools: this.tools.map((t) => ({ name: t.name, description: t.description })),
			hasMemory: this.memoryConfig !== undefined,
			hasObservationalMemory: this.memoryConfig?.observationalMemory !== undefined,
			hasEpisodicMemory: this.memoryConfig?.episodicMemory !== undefined,
			thinking: this.thinkingConfig ?? null,
			toolCallConcurrency: this.concurrencyValue ?? null,
		};
	}

	/**
	 * Cancel the currently running agent.
	 * Synchronous — sets an abort flag; the agentic loop checks it asynchronously.
	 */
	abort(): void {
		for (const { bus } of this.activeRuntimes) {
			bus.abort();
		}
	}

	/**
	 * Close the agent and release all held resources.
	 *
	 * - Waits for any in-flight background tasks (title generation, observer
	 *   cycles) to settle via the runtime's `dispose()`.
	 * - Disconnects every MCP client attached via `.mcp()`. Errors from
	 *   individual client disconnects are swallowed so a single misbehaving
	 *   server does not prevent the others from closing.
	 *
	 * Safe to call multiple times.
	 */
	async close(): Promise<void> {
		const tasks: Array<Promise<unknown>> = [];
		for (const active of this.activeRuntimes) {
			active.bus.abort();
			tasks.push(this.cleanupRuntime(active));
		}
		tasks.push(...this.mcpClients.map(async (c) => await c.close()));
		await Promise.allSettled(tasks);
	}

	/** Generate a response (non-streaming). Lazy-builds on first call. */
	async generate(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<GenerateResult> {
		const config = await this.ensureBuilt();
		const active = this.createRuntime(config);
		const mergedOptions = this.mergeWithDefaults(options);
		try {
			return await active.runtime.generate(this.toMessages(input), mergedOptions);
		} finally {
			await this.cleanupRuntime(active);
		}
	}

	/** Stream a response. Lazy-builds on first call. */
	async stream(
		input: AgentMessage[] | string,
		options?: RunOptions & ExecutionOptions,
	): Promise<StreamResult> {
		const config = await this.ensureBuilt();
		const active = this.createRuntime(config);
		const mergedOptions = this.mergeWithDefaults(options);
		try {
			const result = await active.runtime.stream(this.toMessages(input), mergedOptions);
			return { ...result, stream: this.trackStreamRuntime(result.stream, active) };
		} catch (error) {
			await this.cleanupRuntime(active);
			throw error;
		}
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
		const config = await this.ensureBuilt();
		if (method === 'generate') {
			const active = this.createRuntime(config, options.runId);
			try {
				return await active.runtime.resume('generate', data, options);
			} finally {
				await this.cleanupRuntime(active);
			}
		}
		const active = this.createRuntime(config, options.runId);
		try {
			const result = await active.runtime.resume('stream', data, options);
			return { ...result, stream: this.trackStreamRuntime(result.stream, active) };
		} catch (error) {
			await this.cleanupRuntime(active);
			throw error;
		}
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

	private mergeWithDefaults(
		options?: RunOptions & ExecutionOptions,
	): (RunOptions & ExecutionOptions) | undefined {
		if (!this.defaultExecutionOptions) return options;
		return { ...this.defaultExecutionOptions, ...options };
	}

	/**
	 * @internal Lazy-build the agent on first use. Stores the promise so
	 * concurrent callers share one build operation. On error the promise is
	 * cleared so the caller can retry.
	 */
	private async ensureBuilt(): Promise<AgentRuntimeConfig> {
		if (!this.buildPromise) {
			const p = this.build();
			this.buildPromise = p;
			p.catch(() => {
				if (this.buildPromise === p) this.buildPromise = undefined;
			});
		}
		return await this.buildPromise;
	}

	private createRuntime(config: AgentRuntimeConfig, runId?: string): ActiveRuntime {
		const bus = new AgentEventBus();
		for (const [event, handlers] of this.agentHandlers) {
			for (const handler of handlers) {
				bus.on(event, handler);
			}
		}
		const runtime = new AgentRuntime({ ...config, eventBus: bus, runId });
		const active = { runtime, bus };
		this.activeRuntimes.add(active);
		return active;
	}

	private trackStreamRuntime(
		stream: ReadableStream<StreamChunk>,
		active: ActiveRuntime,
	): ReadableStream<StreamChunk> {
		const reader = stream.getReader();
		let cleanupPromise: Promise<void> | undefined;
		const cleanup = async () => {
			const doCleanup = async () => {
				try {
					reader.releaseLock();
				} catch {
					// The lock may already be released after cancellation/error cleanup.
				}
				await this.cleanupRuntime(active);
			};
			cleanupPromise ??= doCleanup();
			return await cleanupPromise;
		};

		return new ReadableStream<StreamChunk>({
			async pull(controller) {
				try {
					const { done, value } = await reader.read();
					if (done) {
						controller.close();
						await cleanup();
						return;
					}
					controller.enqueue(value);
				} catch (error) {
					controller.error(error);
					await cleanup();
				}
			},
			async cancel(reason) {
				try {
					await reader.cancel(reason);
				} finally {
					await cleanup();
				}
			},
		});
	}

	private async cleanupRuntime(active: ActiveRuntime): Promise<void> {
		if (!this.activeRuntimes.delete(active)) return;
		active.bus.dispose();
		await active.runtime.dispose();
	}

	private toMessages(input: string | AgentMessage[]): AgentMessage[] {
		if (Array.isArray(input)) return input;
		return [{ role: 'user', content: [{ type: 'text', text: input }] }];
	}

	/** @internal Validate configuration and produce an AgentRuntime. Overridden by the execution engine. */
	protected async build(): Promise<AgentRuntimeConfig> {
		if (!this.modelConfig) {
			throw new Error(`Agent "${this.name}" requires a model`);
		}
		if (!this.instructionsText) {
			throw new Error(`Agent "${this.name}" requires instructions`);
		}

		const finalTools = [...this.tools];
		const configuredDeferredTools = [...this.deferredTools];

		if (this.workspaceInstance) {
			const wsTools = this.workspaceInstance.getTools();
			finalTools.push(...wsTools);
		}

		const finalStaticTools = finalTools;
		const finalDeferredTools = configuredDeferredTools;

		// Validate checkpoint requirement from static tools and known MCP approval config
		// before attempting any network connections (allows fast failure).
		const staticNeedsCheckpoint =
			finalStaticTools.some((t) => t.suspendSchema) ||
			finalDeferredTools.some((t) => t.suspendSchema);
		const mcpNeedsCheckpoint = this.mcpClients.some((c) => c.declaresApproval());
		if ((staticNeedsCheckpoint || mcpNeedsCheckpoint) && !this.checkpointStore) {
			throw new Error(
				`Agent "${this.name}" has tools requiring approval or suspend/resume but no checkpoint storage. ` +
					"Add .checkpoint('memory') for in-process storage, " +
					'or pass a persistent store (e.g. LibSQLStore, PgStore).',
			);
		}

		// Resolve tools from all MCP clients.
		const mcpToolLists = await Promise.all(this.mcpClients.map(async (c) => await c.listTools()));
		const mcpTools = mcpToolLists.flat();

		// Detect collisions between direct, deferred, and MCP tools.
		const staticCollisions = findDuplicateToolNames(finalStaticTools);
		if (staticCollisions.length > 0) {
			throw new Error(
				`Static tool name collision — the following tool names resolve to duplicates: ${staticCollisions.join(', ')}`,
			);
		}

		const staticNames = new Set(finalStaticTools.map((t) => t.name));
		const reservedDeferredToolNames = new Set([
			SEARCH_TOOLS_TOOL_NAME,
			LOAD_TOOL_TOOL_NAME,
			...RUNTIME_SKILL_TOOL_NAMES,
		]);
		const deferredNames = new Set<string>();
		const deferredCollisions: string[] = [];
		for (const tool of finalDeferredTools) {
			if (
				staticNames.has(tool.name) ||
				reservedDeferredToolNames.has(tool.name) ||
				deferredNames.has(tool.name)
			) {
				deferredCollisions.push(tool.name);
			}
			deferredNames.add(tool.name);
		}
		if (deferredCollisions.length > 0) {
			throw new Error(
				`Deferred tool name collision — the following tool names resolve to duplicates or reserved tools: ${deferredCollisions.join(', ')}`,
			);
		}

		const collisions = mcpTools
			.filter((t) => staticNames.has(t.name) || deferredNames.has(t.name))
			.map((t) => t.name);
		if (collisions.length > 0) {
			throw new Error(
				`MCP tool name collision — the following tool names resolve to duplicates: ${collisions.join(', ')}`,
			);
		}

		let allTools = [...finalStaticTools, ...mcpTools];

		// Validate checkpoint again after discovering actual MCP tools
		// (catches the case where MCP tools have suspendSchema after listing).
		const allNeedCheckpoint =
			allTools.some((t) => t.suspendSchema) || finalDeferredTools.some((t) => t.suspendSchema);
		if (allNeedCheckpoint && !this.checkpointStore) {
			throw new Error(
				`Agent "${this.name}" has tools requiring approval or suspend/resume but no checkpoint storage. ` +
					"Add .checkpoint('memory') for in-process storage, " +
					'or pass a persistent store (e.g. LibSQLStore, PgStore).',
			);
		}

		const modelConfig: ModelConfig = this.modelConfig;
		const memoryConfig = this.memoryConfig
			? resolveMemoryConfigDefaults(this.memoryConfig, { defaultModel: modelConfig })
			: undefined;

		let instructions = this.instructionsText;
		if (this.skillSource) {
			await this.skillSource.prepare?.();
			instructions = appendSkillCatalogToInstructions(instructions, this.skillSource.registry);
		}
		if (this.workspaceInstance) {
			const wsInstructions = this.workspaceInstance.getInstructions();
			if (wsInstructions) {
				instructions = `${instructions}\n\n${wsInstructions}`;
			}
		}
		const telemetry = this.telemetryConfig ?? (await this.telemetryBuilder?.build());
		const toolSearch =
			finalDeferredTools.length > 0 && this.deferredToolSearchTopK !== undefined
				? { topK: this.deferredToolSearchTopK }
				: undefined;

		allTools = this.completeInlineDelegateTools(allTools, {
			deferredTools: finalDeferredTools,
			modelConfig,
			...(telemetry !== undefined ? { telemetry } : {}),
			...(this.concurrencyValue !== undefined
				? { toolCallConcurrency: this.concurrencyValue }
				: {}),
			...(toolSearch !== undefined ? { toolSearch } : {}),
		});

		let modelCost: Awaited<ReturnType<typeof getModelCost>> | undefined;
		try {
			const modelId =
				typeof modelConfig === 'string'
					? modelConfig
					: 'id' in modelConfig && typeof modelConfig.id === 'string'
						? modelConfig.id
						: undefined;
			modelCost = modelId ? await getModelCost(modelId) : undefined;
		} catch {
			modelCost = undefined;
		}

		const runState = new RunStateManager(this.checkpointStore);

		return {
			name: this.name,
			model: modelConfig,
			...(this.modelFetchValue !== undefined ? { modelFetch: this.modelFetchValue } : {}),
			instructions,
			tools: allTools.length > 0 ? allTools : undefined,
			deferredTools: finalDeferredTools.length > 0 ? finalDeferredTools : undefined,
			toolSearch,
			instructionProviderOptions: this.instructionProviderOpts,
			providerTools: this.providerTools.length > 0 ? this.providerTools : undefined,
			memory: memoryConfig?.memory,
			observationLog: memoryConfig?.observationLog,
			observationalMemory: memoryConfig?.observationalMemory,
			episodicMemory: memoryConfig?.episodicMemory,
			structuredOutput: this.outputSchema,
			checkpointStorage: this.checkpointStore,
			thinking: this.thinkingConfig,
			toolCallConcurrency: this.concurrencyValue,
			titleGeneration: memoryConfig?.titleGeneration,
			telemetry: this.telemetryConfig ?? (await this.telemetryBuilder?.build()),
			modelCost,
			runState,
			...(this.onMemoryTaskEvent ? { onMemoryTaskEvent: this.onMemoryTaskEvent } : {}),
		};
	}

	private completeInlineDelegateTools(
		tools: BuiltTool[],
		options: {
			deferredTools: BuiltTool[];
			modelConfig: ModelConfig;
			telemetry?: BuiltTelemetry;
			toolCallConcurrency?: number;
			toolSearch?: { topK?: number };
		},
	): BuiltTool[] {
		return tools.map((tool) => {
			const delegateOptions = getInlineDelegateSubAgentToolOptions(tool);
			if (!delegateOptions) return tool;

			const runInlineSubAgent = this.createInlineSubAgentRunner({
				...options,
				tools,
				inlineSubAgentBlockedTools: delegateOptions.inlineSubAgentBlockedTools,
				inlineSubAgentModelsByDifficulty: delegateOptions.inlineSubAgentModelsByDifficulty,
				resolveInlineSubAgentProviderTools: delegateOptions.resolveInlineSubAgentProviderTools,
			});
			const hostRunner = delegateOptions.runSubAgent;
			const completedTool = createDelegateSubAgentTool({
				...delegateOptions,
				runSubAgent: async (request, _helpersFromHandler) => {
					const helpers = { runInlineSubAgent };
					if (hostRunner) {
						return await hostRunner(request, helpers);
					}
					if (request.subAgentId === INLINE_SUB_AGENT_ID) {
						return await runInlineSubAgent(request);
					}
					return {
						status: 'failed',
						taskPath: request.taskPath,
						answer: '',
						error: `No configured subagent matched "${request.subAgentId}". Use "inline" for an inline sub-agent, or pass one of the configured subagent IDs.`,
					};
				},
			});

			if (tool.approval?.required === true) {
				return wrapToolForApproval(completedTool, { requireApproval: true });
			}
			return completedTool;
		});
	}

	private createInlineSubAgentRunner(options: {
		deferredTools: BuiltTool[];
		modelConfig: ModelConfig;
		telemetry?: BuiltTelemetry;
		toolCallConcurrency?: number;
		toolSearch?: { topK?: number };
		tools: BuiltTool[];
		inlineSubAgentBlockedTools?: string[];
		inlineSubAgentModelsByDifficulty?: Partial<Record<SubAgentTaskDifficulty, ModelConfig>>;
		resolveInlineSubAgentProviderTools?: InlineSubAgentProviderToolsResolver;
	}): (request: DelegateSubAgentRequest) => Promise<DelegateSubAgentToolOutput> {
		return async (request) => {
			const tools = filterInlineSubAgentTools(options.tools, options.inlineSubAgentBlockedTools);
			const deferredTools = filterInlineSubAgentTools(
				options.deferredTools,
				options.inlineSubAgentBlockedTools,
			);
			const childModelConfig = resolveInlineSubAgentModelConfig(request, options);
			const providerTools = options.resolveInlineSubAgentProviderTools
				? filterInlineSubAgentTools(
						await options.resolveInlineSubAgentProviderTools(childModelConfig),
						options.inlineSubAgentBlockedTools,
					)
				: [];
			const childModelId = modelConfigToId(childModelConfig);
			const childThinkingConfig = shouldInheritThinking(options.modelConfig, childModelConfig)
				? this.thinkingConfig
				: undefined;
			const childRuntime = new AgentRuntime({
				name: `${this.name}:${request.taskName}`,
				model: childModelConfig,
				instructions:
					'You are a focused subagent working on a specific delegated task. Complete the delegated task independently and return a concise, self-contained summary to your parent agent.',
				tools: tools.length > 0 ? tools : undefined,
				deferredTools: deferredTools.length > 0 ? deferredTools : undefined,
				toolSearch: deferredTools.length > 0 ? options.toolSearch : undefined,
				providerTools: providerTools.length > 0 ? providerTools : undefined,
				instructionProviderOptions: this.instructionProviderOpts,
				checkpointStorage: this.checkpointStore,
				...(childThinkingConfig !== undefined ? { thinking: childThinkingConfig } : {}),
				...(options.telemetry !== undefined ? { telemetry: options.telemetry } : {}),
				...(options.toolCallConcurrency !== undefined
					? { toolCallConcurrency: options.toolCallConcurrency }
					: {}),
			});

			try {
				const result = await childRuntime.generate(renderDelegateSubAgentPrompt(request), {
					...(request.parentAbortSignal !== undefined
						? { abortSignal: request.parentAbortSignal }
						: {}),
					...(options.telemetry !== undefined ? { telemetry: options.telemetry } : {}),
					...(request.parentExecutionCounter !== undefined
						? { executionCounter: request.parentExecutionCounter }
						: {}),
				});
				if (result.pendingSuspend !== undefined && result.pendingSuspend.length > 0) {
					return failedDelegatedChildSuspendOutput(request.taskPath, result.model ?? childModelId);
				}
				const resultWithModel =
					result.model === undefined && childModelId !== undefined
						? { ...result, model: childModelId }
						: result;
				return generateResultToDelegateSubAgentOutput(request.taskPath, resultWithModel);
			} finally {
				await childRuntime.dispose();
			}
		};
	}

	private assertToolRegistrationAllowed(tool: BuiltTool): void {
		this.assertToolNameAvailable(tool.name);
		this.assertReservedSdkBuiltInToolName(tool);
	}

	private assertToolNameAvailable(toolName: string): void {
		if (!this.hasRuntimeSkillTool || !RUNTIME_SKILL_TOOL_NAMES.has(toolName)) return;

		throw new Error(`Tool name "${toolName}" is reserved for runtime skills`);
	}

	private assertReservedSdkBuiltInToolName(tool: BuiltTool): void {
		if (!SDK_RESERVED_BUILTIN_TOOL_NAMES.has(tool.name)) return;
		if (isSdkOwnedBuiltInTool(tool)) return;

		throw new Error(`Tool name "${tool.name}" is reserved for SDK built-in tools`);
	}

	private removeRuntimeSkillTools(): void {
		if (!this.hasRuntimeSkillTool) return;

		this.tools = this.tools.filter((tool) => !RUNTIME_SKILL_TOOL_NAMES.has(tool.name));
		this.hasRuntimeSkillTool = false;
	}
}

function resolveInlineSubAgentModelConfig(
	request: DelegateSubAgentRequest,
	options: {
		modelConfig: ModelConfig;
		inlineSubAgentModelsByDifficulty?: Partial<Record<SubAgentTaskDifficulty, ModelConfig>>;
	},
): ModelConfig {
	if (request.difficulty === undefined) {
		return options.modelConfig;
	}

	const mappedModel = options.inlineSubAgentModelsByDifficulty?.[request.difficulty];
	return mappedModel ?? options.modelConfig;
}

function modelConfigToId(modelConfig: ModelConfig): string | undefined {
	if (typeof modelConfig === 'string') return modelConfig;
	if (typeof modelConfig === 'object' && modelConfig !== null && 'id' in modelConfig) {
		return typeof modelConfig.id === 'string' ? modelConfig.id : undefined;
	}
	if (
		typeof modelConfig === 'object' &&
		modelConfig !== null &&
		'provider' in modelConfig &&
		'modelId' in modelConfig
	) {
		const provider = typeof modelConfig.provider === 'string' ? modelConfig.provider : undefined;
		const modelId = typeof modelConfig.modelId === 'string' ? modelConfig.modelId : undefined;
		return provider && modelId ? `${provider}/${modelId}` : undefined;
	}
	return undefined;
}

function modelConfigProvider(modelConfig: ModelConfig): string | undefined {
	const modelId = modelConfigToId(modelConfig);
	if (!modelId) return undefined;
	const slashIndex = modelId.indexOf('/');
	return slashIndex > 0 ? modelId.slice(0, slashIndex) : undefined;
}

function shouldInheritThinking(
	parentModelConfig: ModelConfig,
	childModelConfig: ModelConfig,
): boolean {
	const parentProvider = modelConfigProvider(parentModelConfig);
	const childProvider = modelConfigProvider(childModelConfig);
	return parentProvider !== undefined && parentProvider === childProvider;
}

export function buildInlineSubAgentBlockedToolNames(hostBlockedTools?: string[]): Set<string> {
	return new Set([...SDK_INLINE_SUB_AGENT_BLOCKED_TOOL_NAMES, ...(hostBlockedTools ?? [])]);
}

export function filterInlineSubAgentTools<T extends { readonly name: string }>(
	tools: T[],
	hostBlockedTools?: string[],
): T[] {
	const blocked = buildInlineSubAgentBlockedToolNames(hostBlockedTools);
	return tools.filter((tool) => !blocked.has(tool.name));
}

function findDuplicateToolNames(tools: BuiltTool[]): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const tool of tools) {
		if (seen.has(tool.name)) {
			duplicates.add(tool.name);
		}
		seen.add(tool.name);
	}
	return [...duplicates].sort();
}
