import z from 'zod';

import { Config, Env } from '../decorators';

const expressionEngineSchema = z.enum(['legacy', 'vm']);

@Config
export class ExpressionEngineConfig {
	/**
	 * Which expression engine to use.
	 * - `legacy` runs expressions without isolation.
	 * - `vm` runs expressions in a V8 isolate.
	 *
	 * `vm` is currently **experimental**. Use at your own risk.
	 */
	@Env('N8N_EXPRESSION_ENGINE', expressionEngineSchema)
	engine: 'legacy' | 'vm' = 'legacy';

	/** Number of V8 isolates ready in the pool. */
	@Env('N8N_EXPRESSION_ENGINE_POOL_SIZE')
	poolSize: number = 1;

	/** Max number of AST-transformed expressions to cache. */
	@Env('N8N_EXPRESSION_ENGINE_MAX_CODE_CACHE_SIZE')
	maxCodeCacheSize: number = 1024;

	/**
	 * Execution timeout in milliseconds for each expression evaluation in the VM bridge.
	 */
	@Env('N8N_EXPRESSION_ENGINE_TIMEOUT')
	bridgeTimeout: number = 5000;

	/** Memory limit in MB for the V8 isolate used by the VM bridge. */
	@Env('N8N_EXPRESSION_ENGINE_MEMORY_LIMIT')
	bridgeMemoryLimit: number = 128;

	/**
	 * Whether to emit observability signals (metrics, traces, logs) for the VM evaluator.
	 * Only takes effect when `engine === 'vm'`; legacy mode never emits expression metrics
	 * regardless of this setting.
	 */
	@Env('N8N_EXPRESSION_ENGINE_OBSERVABILITY_ENABLED')
	observabilityEnabled: boolean = true;

	/**
	 * Whether to emit OpenTelemetry spans for expression evaluation.
	 * Slow evaluations (>slowEvaluationThresholdMs) and errors always emit a span.
	 * Healthy-path evaluations are sampled at tracesSampleRate.
	 */
	@Env('N8N_EXPRESSION_ENGINE_TRACES_ENABLED')
	tracesEnabled: boolean = true;

	/** Threshold in ms above which an evaluation is considered "slow" and gets a span. */
	@Env('N8N_EXPRESSION_ENGINE_SLOW_EVAL_THRESHOLD_MS', z.number({ coerce: true }).positive())
	slowEvaluationThresholdMs: number = 50;

	/** Head-based sampling rate (0.0–1.0) for healthy-path spans. Slow and erroring expressions always emit. */
	@Env('N8N_EXPRESSION_ENGINE_TRACES_SAMPLE_RATE', z.number({ coerce: true }).min(0).max(1))
	tracesSampleRate: number = 0.0;

	/** If set, scale the pool to 0 warm isolates after this many seconds with no acquire. */
	@Env('N8N_EXPRESSION_ENGINE_IDLE_TIMEOUT')
	idleTimeout?: number;
}
