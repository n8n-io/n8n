import { Tournament } from '@n8n/tournament';
import type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
	ObservabilityProvider,
	RuntimeBridge,
} from '../types';
import { DEFAULT_BRIDGE_CONFIG } from '../types/bridge';
import { IsolateError } from '@n8n/errors';
import { IdleScalingPool } from '../pool/idle-scaling-pool';
import type { IPool } from '../pool/isolate-pool';
import { IsolatePool, PoolDisposedError, PoolExhaustedError } from '../pool/isolate-pool';
import { EXPRESSION_METRICS } from '../observability/metrics';
import { classifyExpressionError } from './error-classification';
import { LruCache } from './lru-cache';

function recordOutcome(
	observability: ObservabilityProvider | undefined,
	start: number,
	status: 'success' | 'error',
	error?: unknown,
): void {
	if (!observability) return;
	const durationSeconds = (performance.now() - start) / 1000;
	const errorType = error !== undefined ? classifyExpressionError(error) : undefined;
	observability.metrics.histogram(EXPRESSION_METRICS.evaluationDuration.name, durationSeconds, {
		status,
		type: errorType ?? 'none',
	});
}

export class ExpressionEvaluator implements IExpressionEvaluator {
	private config: EvaluatorConfig;

	private disposed = false;

	// Lazy-initialized tournament instance (expensive to create, reused across evaluations)
	private tournament?: Tournament;

	// Cache: template expression → tournament-transformed JavaScript code
	// Cache hit rate in production: ~99.9% (same expressions repeat within a workflow)
	private codeCache: LruCache<string, string>;

	private pool: IPool;

	private bridgesByCaller = new WeakMap<object, RuntimeBridge>();

	/**
	 * Callers with an open lazy scope (lazyAcquire mode): acquired, but no
	 * bridge created yet. The bridge is created on the first evaluate() that
	 * reaches the engine and then lives in bridgesByCaller as usual.
	 */
	private lazyScopes = new WeakSet<object>();

	/**
	 * Depth of the evaluation chain currently in progress, and when it started.
	 * An expression can evaluate another one (`$evaluateExpression`), which
	 * re-enters `evaluate()` through a synchronous host callback; the whole
	 * chain runs on the time budget the outermost call started with.
	 *
	 * This is correct only while the whole path stays synchronous. Both fields
	 * belong to the instance, so two chains that overlap would corrupt them. If
	 * a host callback or `bridge.execute()` becomes async, pass the budget in
	 * the call arguments instead.
	 */
	private chainDepth = 0;

	private chainStart = 0;

	private readonly createBridge: () => Promise<RuntimeBridge>;

	constructor(config: EvaluatorConfig) {
		this.config = config;
		this.codeCache = new LruCache<string, string>(config.maxCodeCacheSize, () => {
			this.config.observability?.metrics.counter(EXPRESSION_METRICS.codeCacheEviction.name, 1);
		});
		const logger = config.logger ?? DEFAULT_BRIDGE_CONFIG.logger;
		this.createBridge = async () => {
			const bridge = config.createBridge();
			await bridge.initialize();
			return bridge;
		};

		const onReplenishFailed = (error: unknown) => {
			logger.error('[IsolatePool] Failed to replenish bridge', { error });
			config.observability?.metrics.counter(EXPRESSION_METRICS.poolReplenishFailed.name, 1);
		};

		this.pool =
			config.idleTimeoutMs === undefined
				? new IsolatePool(this.createBridge, config.poolSize ?? 1, onReplenishFailed, logger)
				: new IdleScalingPool(
						this.createBridge,
						config.poolSize ?? 1,
						config.idleTimeoutMs,
						onReplenishFailed,
						logger,
						config.observability,
					);
	}

	async initialize(): Promise<void> {
		await this.pool.initialize();
	}

	/**
	 * Acquire a bridge for the caller. Returns whether a bridge was newly
	 * acquired: `false` means the caller already held one, so the current
	 * scope must not release it (release is not reference-counted and would
	 * return the caller's bridge to the pool mid-use).
	 *
	 * Under `lazyAcquire`, this only opens a scope: the bridge is created on
	 * the first evaluate() that needs the engine, so a scope whose expressions
	 * never reach the engine costs nothing. The return value then means "scope
	 * newly opened" and keeps the same do-not-double-release contract.
	 */
	async acquire(caller: object): Promise<boolean> {
		// The pool throws this for eager acquisition; the lazy branch would
		// otherwise happily open scopes whose every evaluation then fails.
		if (this.disposed) throw new PoolDisposedError();
		if (this.bridgesByCaller.has(caller)) return false;
		if (this.config.lazyAcquire) {
			if (this.lazyScopes.has(caller)) return false;
			this.lazyScopes.add(caller);
			return true;
		}
		let bridge: RuntimeBridge;
		try {
			bridge = this.pool.acquire();
		} catch (error) {
			if (error instanceof PoolDisposedError) throw error;
			if (!(error instanceof PoolExhaustedError)) throw error;
			bridge = await this.createBridge();
		}
		this.config.observability?.metrics.counter(EXPRESSION_METRICS.poolAcquired.name, 1);
		this.bridgesByCaller.set(caller, bridge);
		return true;
	}

	/**
	 * Pop a warm bridge from the pool, cold-starting one when it is empty.
	 * Runs inside the synchronous evaluate() path (lazy acquisition), so the
	 * cold start uses the bridge's synchronous initializer.
	 */
	private acquireBridgeSync(): RuntimeBridge {
		let bridge: RuntimeBridge;
		try {
			bridge = this.pool.acquire();
		} catch (error) {
			if (error instanceof PoolDisposedError) throw error;
			if (!(error instanceof PoolExhaustedError)) throw error;
			bridge = this.config.createBridge();
			// A failed cold start must not leak the bridge: it is not yet
			// recorded anywhere, so dispose it here before rethrowing.
			const coldStartStart = performance.now();
			try {
				if (typeof bridge.initializeSync !== 'function') {
					throw new IsolateError(
						'Isolate pool exhausted and the bridge has no synchronous initializer for a lazy cold start',
					);
				}
				bridge.initializeSync();
			} catch (initError) {
				void bridge.dispose();
				throw initError;
			}
			this.config.observability?.metrics.counter(EXPRESSION_METRICS.poolColdStartSync.name, 1);
			this.config.observability?.metrics.histogram(
				EXPRESSION_METRICS.poolColdStartSyncDuration.name,
				(performance.now() - coldStartStart) / 1000,
			);
		}
		this.config.observability?.metrics.counter(EXPRESSION_METRICS.poolAcquired.name, 1);
		return bridge;
	}

	evaluate(
		expression: string,
		data: WorkflowData,
		caller: object,
		options?: EvaluateOptions,
	): unknown {
		if (this.disposed) throw new IsolateError('Evaluator disposed');

		const bridge = this.getBridge(caller);

		// Anchor the chain's clock before transformation, so that parsing an
		// uncached expression counts against the shared budget instead of
		// escaping it. Transformation runs inside the try to keep the depth
		// counter balanced if it throws.
		const nested = this.chainDepth > 0;
		if (!nested) this.chainStart = performance.now();
		this.chainDepth++;

		try {
			// Transform template expression → sanitized JavaScript (cached)
			const transformedCode = this.getTransformedCode(expression);

			const { observability } = this.config;
			const start = performance.now();

			try {
				const result = bridge.execute(transformedCode, data, {
					timezone: options?.timezone,
					elapsedMs: nested ? start - this.chainStart : undefined,
				});
				recordOutcome(observability, start, 'success');
				return result;
			} catch (error) {
				recordOutcome(observability, start, 'error', error);
				throw error;
			}
		} finally {
			this.chainDepth--;
		}
	}

	private getBridge(caller: object): RuntimeBridge {
		let bridge = this.bridgesByCaller.get(caller);
		if (!bridge && this.lazyScopes.has(caller)) {
			// Lazy acquisition: first engine-needing evaluation in this scope.
			bridge = this.acquireBridgeSync();
			this.bridgesByCaller.set(caller, bridge);
		}
		if (!bridge) {
			throw new IsolateError('No bridge acquired for this context. Call acquire() first.');
		}

		// If the isolate died mid-execution (e.g. OOM), all remaining expressions
		// in this execution are expected to fail. Recovery is per-execution, not per-expression.
		if (bridge.isDisposed()) {
			throw new IsolateError('Isolate for this caller is no longer available');
		}

		return bridge;
	}

	async release(caller: object): Promise<void> {
		this.lazyScopes.delete(caller);
		const bridge = this.bridgesByCaller.get(caller);
		if (!bridge) return;
		this.bridgesByCaller.delete(caller);
		await this.pool.release(bridge);
	}

	async waitForReplenishment(): Promise<void> {
		await this.pool.waitForReplenishment();
	}

	/**
	 * Transform a template expression to executable JavaScript via tournament.
	 *
	 * Input:  "{{ $json.email }}"
	 * Output: JavaScript string with tournament security transforms applied
	 *         ($json → this.$json, computed access wrapped in this.__sanitize(), etc.)
	 *
	 * Result is cached by expression string (tournament AST parsing is expensive).
	 */
	private getTransformedCode(expression: string): string {
		const cached = this.codeCache.get(expression);
		if (cached !== undefined) {
			this.config.observability?.metrics.counter(EXPRESSION_METRICS.codeCacheHit.name, 1);
			return cached;
		}

		this.config.observability?.metrics.counter(EXPRESSION_METRICS.codeCacheMiss.name, 1);

		if (!this.tournament) {
			// Tournament requires an errorHandler but we only use getExpressionCode()
			// for AST transformation — we never call tournament.execute(), so this
			// handler is never invoked. Runtime errors are handled by the bridge's
			// own E() injection in injectErrorHandler().
			const errorHandler = () => {};
			this.tournament = new Tournament(errorHandler, undefined, undefined, {
				before: this.config.hooks?.before ?? [],
				after: this.config.hooks?.after ?? [],
			});
		}

		const [transformedCode] = this.tournament.getExpressionCode(expression);
		this.codeCache.set(expression, transformedCode);
		this.config.observability?.metrics.gauge(
			EXPRESSION_METRICS.codeCacheSize.name,
			this.codeCache.size,
		);
		return transformedCode;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.codeCache.clear();
		this.config.observability?.metrics.gauge(EXPRESSION_METRICS.codeCacheSize.name, 0);
		await this.pool.dispose();
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
