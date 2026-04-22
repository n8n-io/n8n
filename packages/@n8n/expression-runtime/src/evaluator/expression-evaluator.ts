import { Tournament } from '@n8n/tournament';
import type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
	RuntimeBridge,
} from '../types';
import { DEFAULT_BRIDGE_CONFIG } from '../types/bridge';
import { IsolateError } from '@n8n/errors';
import { IdleScalingPool } from '../pool/idle-scaling-pool';
import type { IPool } from '../pool/isolate-pool';
import { IsolatePool, PoolDisposedError, PoolExhaustedError } from '../pool/isolate-pool';
import { LruCache } from './lru-cache';

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

	private readonly createBridge: () => Promise<RuntimeBridge>;

	constructor(config: EvaluatorConfig) {
		this.config = config;
		this.codeCache = new LruCache<string, string>(config.maxCodeCacheSize, () => {
			this.config.observability?.metrics.counter('expression.code_cache.eviction', 1);
		});
		const logger = config.logger ?? DEFAULT_BRIDGE_CONFIG.logger;
		this.createBridge = async () => {
			const bridge = config.createBridge();
			await bridge.initialize();
			return bridge;
		};

		const onReplenishFailed = (error: unknown) => {
			logger.error('[IsolatePool] Failed to replenish bridge', { error });
			config.observability?.metrics.counter('expression.pool.replenish_failed', 1);
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

	async acquire(caller: object): Promise<void> {
		if (this.bridgesByCaller.has(caller)) return;
		let bridge: RuntimeBridge;
		try {
			bridge = this.pool.acquire();
		} catch (error) {
			if (error instanceof PoolDisposedError) throw error;
			if (!(error instanceof PoolExhaustedError)) throw error;
			bridge = await this.createBridge();
		}
		this.config.observability?.metrics.counter('expression.pool.acquired', 1);
		this.bridgesByCaller.set(caller, bridge);
	}

	evaluate(
		expression: string,
		data: WorkflowData,
		caller: object,
		options?: EvaluateOptions,
	): unknown {
		if (this.disposed) throw new IsolateError('Evaluator disposed');

		const bridge = this.getBridge(caller);

		// Transform template expression → sanitized JavaScript (cached)
		const transformedCode = this.getTransformedCode(expression);

		try {
			const result = bridge.execute(transformedCode, data, {
				timezone: options?.timezone,
			});

			if (this.config.observability) {
				this.config.observability.metrics.counter('expression.evaluation.success', 1);
			}

			return result;
		} catch (error) {
			if (this.config.observability) {
				this.config.observability.metrics.counter('expression.evaluation.error', 1);
			}
			throw error;
		}
	}

	private getBridge(caller: object): RuntimeBridge {
		const bridge = this.bridgesByCaller.get(caller);
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
			this.config.observability?.metrics.counter('expression.code_cache.hit', 1);
			return cached;
		}

		this.config.observability?.metrics.counter('expression.code_cache.miss', 1);

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
		this.config.observability?.metrics.gauge('expression.code_cache.size', this.codeCache.size);
		return transformedCode;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.codeCache.clear();
		this.config.observability?.metrics.gauge('expression.code_cache.size', 0);
		await this.pool.dispose();
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
