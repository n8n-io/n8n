import type { RuntimeBridge } from './bridge';

// ============================================================================
// Phase 1.1: Core Evaluation Interfaces (MVP)
// These are the minimal interfaces needed to evaluate expressions.
// ============================================================================

// TournamentHooks is imported from '@n8n/tournament' once that dependency is
// added (PR 4). Defined locally here so the type surface is complete from PR 1.
// See: packages/@n8n/expression-runtime/src/evaluator/expression-evaluator.ts
export interface TournamentHooks {
	before?: Array<(ast: unknown) => unknown>;
	after?: Array<(ast: unknown) => unknown>;
}

/**
 * Configuration for ExpressionEvaluator.
 *
 * Note: Slice 1 keeps this minimal. Tournament integration and code caching
 * will be added in later slices.
 */
export interface EvaluatorConfig {
	/**
	 * Runtime bridge implementation.
	 */
	bridge: RuntimeBridge;

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
	 * @param options - Evaluation options
	 * @returns Result of the expression
	 *
	 * Note: Synchronous for Slice 1 (Node.js vm module).
	 *       Will be async for Slice 2 (isolated-vm).
	 */
	evaluate(expression: string, data: WorkflowData, options?: EvaluateOptions): unknown;

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
 * Workflow data proxy from WorkflowDataProxy.getDataProxy().
 *
 * For Slice 1: We pass this directly via VM context (simple pass-through).
 * Later: Will implement deep lazy proxy for field-level data fetching.
 */
export type WorkflowData = Record<string, unknown>;

/**
 * Options for evaluate().
 */
/**
 * Options for evaluate().
 *
 * Note: Slice 1 is minimal. Tournament options will be added later.
 */
export interface EvaluateOptions {
	/**
	 * Custom timeout for this evaluation (in milliseconds).
	 * Overrides the bridge's default timeout.
	 */
	timeout?: number;
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
