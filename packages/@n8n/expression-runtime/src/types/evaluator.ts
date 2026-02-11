import type { RuntimeBridge } from './bridge';

/**
 * Configuration for ExpressionEvaluator.
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
	 * Tournament instance for AST transformation and security validation.
	 */
	tournament?: TournamentInstance;

	/**
	 * Enable caching of transformed code (not evaluation results).
	 * Caches the output of Tournament transformation to avoid re-transforming
	 * the same expression multiple times.
	 * Default: true
	 */
	enableCodeCache?: boolean;

	/**
	 * Maximum number of transformed code entries to cache.
	 * Default: 1000
	 */
	maxCodeCacheSize?: number;
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
	 */
	evaluate(expression: string, data: WorkflowData, options?: EvaluateOptions): Promise<unknown>;

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
 * Workflow data passed to evaluate().
 */
export interface WorkflowData {
	/**
	 * Current item data.
	 */
	json: Record<string, unknown>;

	/**
	 * All items in current run.
	 */
	items?: Array<{ json: Record<string, unknown> }>;

	/**
	 * Workflow metadata.
	 */
	workflow?: {
		id: string;
		name: string;
	};

	/**
	 * Node metadata.
	 */
	node?: {
		id: string;
		name: string;
		type: string;
	};

	/**
	 * Execution metadata.
	 */
	execution?: {
		id: string;
		mode: string;
	};
}

/**
 * Options for evaluate().
 */
export interface EvaluateOptions {
	/**
	 * Skip Tournament transformation and security validation.
	 * Default: false
	 * WARNING: Only use for trusted code!
	 */
	skipTransform?: boolean;

	/**
	 * Skip code cache lookup and storage for this evaluation.
	 * Forces re-transformation even if the code is cached.
	 * Default: false
	 */
	skipCodeCache?: boolean;

	/**
	 * Custom timeout for this evaluation (in milliseconds).
	 * Overrides the bridge's default timeout.
	 */
	timeout?: number;
}

/**
 * Tournament instance for AST transformation.
 */
export interface TournamentInstance {
	/**
	 * Transform expression AST for security and compatibility.
	 */
	transform(expression: string): string;

	/**
	 * Validate expression for security violations.
	 */
	validate(expression: string): ValidationResult;
}

/**
 * Tournament validation result.
 */
export interface ValidationResult {
	valid: boolean;
	errors?: string[];
}

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
