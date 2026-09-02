import z from 'zod';

import { Config, Env } from '../decorators';

const expressionEngineSchema = z.enum(['legacy', 'vm', 'quickjs']);

@Config
export class ExpressionEngineConfig {
	/**
	 * Which expression engine to use.
	 * - `vm` (default) runs expressions in a V8 isolate (isolated-vm).
	 * - `legacy` runs expressions without isolation. Less secure and soon to be deprecated.
	 * - `quickjs` runs expressions in a QuickJS WASM sandbox. Experimental.
	 */
	@Env('N8N_EXPRESSION_ENGINE', expressionEngineSchema)
	engine: 'legacy' | 'vm' | 'quickjs' = 'vm';

	/** Number of V8 isolates ready in the pool. */
	@Env('N8N_EXPRESSION_ENGINE_POOL_SIZE')
	poolSize: number = 1;

	/** Max number of AST-transformed expressions to cache. */
	@Env('N8N_EXPRESSION_ENGINE_MAX_CODE_CACHE_SIZE')
	maxCodeCacheSize: number = 1024;

	/**
	 * Execution timeout in milliseconds for each expression evaluation in the VM bridge.
	 * The isolate accepts only a positive 32-bit integer: it rejects a fractional value
	 * outright, and leaves the evaluation effectively unbounded for zero or a negative one.
	 */
	@Env('N8N_EXPRESSION_ENGINE_TIMEOUT', z.number({ coerce: true }).int().positive())
	bridgeTimeout: number = 5000;

	/**
	 * Memory limit in MB for the V8 isolate used by the VM bridge.
	 * The isolate requires at least 8MB, and a negative value leaves it without a limit.
	 * It tolerates a fractional value by truncating it, but whole megabytes are the only
	 * meaningful unit here, so this rejects a fraction rather than silently truncating.
	 */
	@Env('N8N_EXPRESSION_ENGINE_MEMORY_LIMIT', z.number({ coerce: true }).int().min(8))
	bridgeMemoryLimit: number = 128;

	/**
	 * Whether to emit observability signals (metrics, traces, logs) for the VM evaluator.
	 * Only takes effect when `engine === 'vm'` or `engine === 'quickjs'`; legacy mode never
	 * emits expression metrics regardless of this setting.
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

	/**
	 * Whether a production webhook request may skip acquiring an isolate when its
	 * trigger provably evaluates no expression during the webhook phase. Off
	 * acquires one for every request.
	 */
	@Env('N8N_EXPRESSION_ENGINE_ALLOW_WEBHOOK_ISOLATE_SKIP')
	allowWebhookIsolateSkip: boolean = true;

	/**
	 * Lazy isolate acquisition (experimental): acquire calls only open a scope,
	 * and an isolate is created on the first expression that actually needs the
	 * engine. Scopes that evaluate nothing (or only expressions the native fast
	 * path handles) never consume an isolate.
	 */
	@Env('N8N_EXPRESSION_ENGINE_LAZY_ACQUIRE')
	lazyAcquire: boolean = false;
}
