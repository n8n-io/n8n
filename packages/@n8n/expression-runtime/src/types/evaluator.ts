import type { TournamentHooks } from '@n8n/tournament';

import type { Logger } from './bridge';
import type { RuntimeBridge } from './bridge';

// ============================================================================
// Phase 1.1: Core Evaluation Interfaces (MVP)
// These are the minimal interfaces needed to evaluate expressions.
// ============================================================================

/**
 * Configuration for ExpressionEvaluator.
 *
 * Note: Slice 1 keeps this minimal. Tournament integration and code caching
 * will be added in later slices.
 */
export interface EvaluatorConfig {
	/** Factory function to create a bridge instance. */
	createBridge: () => RuntimeBridge;

	/**
	 * Observability provider for metrics, traces, and logs.
	 */
	observability?: ObservabilityProvider;

	/**
	 * AST security hooks for tournament expression transformation.
	 * Provided by the caller (e.g., workflow package's expression-sandboxing.ts).
	 * If omitted, expressions are transformed with no security hooks (dev/testing use).
	 */
	hooks?: TournamentHooks;

	/**
	 * Maximum number of tournament-transformed expressions to cache (LRU).
	 */
	maxCodeCacheSize: number;

	/**
	 * Number of bridges to pre-warm in the pool. Defaults to 1 if not provided.
	 * Can be set to the execution concurrency limit (N8N_EXPRESSION_ENGINE_POOL_SIZE)
	 * to give each concurrent execution a pre-warmed bridge.
	 */
	poolSize?: number;

	/** If set, scale the pool to 0 warm bridges after this many ms with no isolate acquire. */
	idleTimeoutMs?: number;

	/** Optional logger. Passed through to pool. Falls back to no-op. */
	logger?: Logger;
}

/**
 * Expression evaluator - main public API.
 *
 * This is the primary interface used by the workflow package.
 */
export interface IExpressionEvaluator {
	/**
	 * Initialize the evaluator and bridge.
	 * Must be called before evaluate().
	 */
	initialize(): Promise<void>;

	/**
	 * Evaluate an expression string against workflow data.
	 *
	 * @param expression - Expression string (e.g., "{{ $json.email }}")
	 * @param data - Workflow data context
	 * @param caller - Owner object that acquired the bridge (same object passed to acquire())
	 * @param options - Optional evaluation options (e.g. timezone)
	 * @returns Result of the expression
	 */
	evaluate(
		expression: string,
		data: WorkflowData,
		caller: object,
		options?: EvaluateOptions,
	): unknown;

	/**
	 * Acquire a bridge for an owner object (e.g. an Expression instance).
	 * Must be called before evaluate(). The same object must be passed as
	 * the caller argument to evaluate().
	 */
	acquire(owner: object): Promise<void>;

	/**
	 * Release the bridge held for an owner object.
	 */
	release(owner: object): Promise<void>;

	/**
	 * Dispose of the evaluator and free resources.
	 */
	dispose(): Promise<void>;

	/**
	 * Check if the evaluator has been disposed.
	 */
	isDisposed(): boolean;
}

/**
 * The methods on the per-node accessor returned by `data.$('NodeName')`.
 * Mirrors the host-side `WorkflowDataProxy` `$()` return shape, restricted
 * to the operations the typed-RPC handlers dispatch into. All optional —
 * the underlying proxy is dynamic and the handlers tolerate missing
 * methods via optional chaining at the call site.
 */
export interface NodeProxy {
	first?: (branchIndex?: number, runIndex?: number) => unknown;
	last?: (branchIndex?: number, runIndex?: number) => unknown;
	all?: (branchIndex?: number, runIndex?: number) => unknown;
}

/**
 * The methods on `data.$input` that typed-RPC handlers dispatch into.
 * Mirrors the host-side `ProxyInput` shape (`packages/workflow/src/interfaces.ts`),
 * restricted to the no-arg method forms the host enforces (`$input.first()`,
 * `.last()`, `.all()` throw on any arguments). Properties like `.item`,
 * `.context`, `.params` stay on `getValueAtPath` and aren't part of this
 * type.
 *
 * Return types are `unknown` rather than `INodeExecutionData` / `[]`:
 * results cross the isolate boundary via `applySync({ result: { copy: true } })`,
 * which structured-clones the value and erases nominal types. The handlers
 * pass the clone through verbatim, so a precise return type would be
 * misleading. Matches the `NodeProxy` return type for the same reason.
 */
export interface InputProxy {
	first?: () => unknown;
	last?: () => unknown;
	all?: () => unknown;
}

/**
 * Workflow data proxy from `WorkflowDataProxy.getDataProxy()`.
 *
 * `$`, `$input`, and `$items` are typed-RPC accessors (`$('NodeName').first()`,
 * `$input.first()`, `$items(...)`, etc.) and are called directly from
 * typed-RPC handlers. Everything else flows through the generic data-access
 * primitives (`getValueAtPath`, `getArrayElement`), which read paths off
 * the index signature without needing per-key types.
 */
export interface WorkflowData {
	$?: (nodeName: string) => NodeProxy | null | undefined;
	$input?: InputProxy;
	$items?: (nodeName?: string, outputIndex?: number, runIndex?: number) => unknown;
	[key: string]: unknown;
}

/**
 * Options for evaluate().
 *
 * Note: Slice 1 is minimal. Tournament options will be added later.
 */
export interface EvaluateOptions {
	/**
	 * IANA timezone for this evaluation (e.g., 'America/New_York').
	 * Sets luxon Settings.defaultZone inside the isolate before execution.
	 */
	timezone?: string;
}

// ============================================================================
// Phase 0.2 / Phase 1+: Observability Interfaces (OPTIONAL FOR MVP)
//
// These can be stubbed with NoOpProvider initially.
// Full implementation comes in Phase 0.2 (observability infrastructure).
//
// Frontend developers: You can ignore this section for Phase 1.
// CLI/Backend developers: Use NoOpProvider initially, real providers later.
// ============================================================================

/**
 * Observability provider interface.
 *
 * Implementations: NoOpProvider, OpenTelemetryProvider, PostHogProvider
 */
export interface ObservabilityProvider {
	/**
	 * Metrics API.
	 */
	metrics: MetricsAPI;

	/**
	 * Traces API.
	 */
	traces: TracesAPI;

	/**
	 * Logs API.
	 */
	logs: LogsAPI;
}

/**
 * Metrics API.
 */
export interface MetricsAPI {
	/**
	 * Increment a counter.
	 */
	counter(name: string, value: number, tags?: Record<string, string>): void;

	/**
	 * Set a gauge value.
	 */
	gauge(name: string, value: number, tags?: Record<string, string>): void;

	/**
	 * Record a histogram value.
	 */
	histogram(name: string, value: number, tags?: Record<string, string>): void;
}

/**
 * Traces API.
 */
export interface TracesAPI {
	/**
	 * Start a new span.
	 */
	startSpan(name: string, attributes?: Record<string, unknown>): Span;
}

/**
 * Span interface.
 */
export interface Span {
	/**
	 * Set span status.
	 */
	setStatus(status: 'ok' | 'error'): void;

	/**
	 * Set span attribute.
	 */
	setAttribute(key: string, value: unknown): void;

	/**
	 * Record an exception.
	 */
	recordException(error: Error): void;

	/**
	 * End the span.
	 */
	end(): void;
}

/**
 * Logs API.
 */
export interface LogsAPI {
	/**
	 * Log an error.
	 */
	error(message: string, error?: Error, context?: Record<string, unknown>): void;

	/**
	 * Log a warning.
	 */
	warn(message: string, context?: Record<string, unknown>): void;

	/**
	 * Log info.
	 */
	info(message: string, context?: Record<string, unknown>): void;

	/**
	 * Log debug.
	 */
	debug(message: string, context?: Record<string, unknown>): void;
}

// ============================================================================
// Phase 1.4: Error Handling (IMPLEMENT WITH EVALUATOR)
//
// These error types provide structured error information.
// Start with basic Error, add these types in Phase 1.4.
// ============================================================================

/**
 * Expression evaluation error.
 */
export class ExpressionError extends Error {
	constructor(
		message: string,
		public context: {
			expression?: string;
			workflowId?: string;
			nodeId?: string;
			[key: string]: unknown;
		},
	) {
		super(message);
		this.name = 'ExpressionError';
	}
}

/**
 * Specific error types.
 */
export class MemoryLimitError extends ExpressionError {}
export class TimeoutError extends ExpressionError {}
export class SecurityViolationError extends ExpressionError {}
export class SyntaxError extends ExpressionError {}
