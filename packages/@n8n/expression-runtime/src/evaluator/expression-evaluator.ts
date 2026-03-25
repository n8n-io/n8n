import { Tournament } from '@n8n/tournament';
import type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateContext,
	RuntimeBridge,
} from '../types';
import { IsolatePool } from '../pool/isolate-pool';
import { LruCache } from './lru-cache';

type ExecutionId = string;

export class ExpressionEvaluator implements IExpressionEvaluator {
	private config: EvaluatorConfig;

	private disposed = false;

	// Lazy-initialized tournament instance (expensive to create, reused across evaluations)
	private tournament?: Tournament;

	// Cache: template expression → tournament-transformed JavaScript code
	// Cache hit rate in production: ~99.9% (same expressions repeat within a workflow)
	private codeCache: LruCache<string, string>;

	private pool: IsolatePool;

	private bridges = new Map<ExecutionId, RuntimeBridge>();

	constructor(config: EvaluatorConfig) {
		this.config = config;
		this.codeCache = new LruCache<string, string>(config.maxCodeCacheSize, () => {
			this.config.observability?.metrics.counter('expression.code_cache.eviction', 1);
		});
		const createBridge = async () => {
			const bridge = config.createBridge();
			await bridge.initialize();
			return bridge;
		};
		this.pool = new IsolatePool(
			createBridge,
			config.isolatePoolSize,
			config.acquireTimeoutMs,
			(error) => {
				console.error('[IsolatePool] Failed to replenish bridge:', error);
				config.observability?.metrics.counter('expression.pool.replenish_failed', 1);
			},
		);
	}

	async initialize(): Promise<void> {
		await this.pool.initialize();
	}

	async acquireForExecution(executionId: string): Promise<void> {
		const metrics = this.config.observability?.metrics;

		// Try synchronous acquire first
		const immediate = this.pool.tryAcquire();
		if (immediate) {
			metrics?.counter('expression.pool.acquired', 1);
			this.bridges.set(executionId, immediate);
			return;
		}

		// Pool exhausted — wait in queue
		metrics?.counter('expression.pool.wait', 1);
		const waitStart = performance.now();

		try {
			const bridge = await this.pool.acquire();
			metrics?.histogram('expression.pool.wait_time_ms', performance.now() - waitStart);
			metrics?.counter('expression.pool.acquired', 1);
			this.bridges.set(executionId, bridge);
		} catch (error) {
			metrics?.counter('expression.pool.timeout', 1);
			throw error;
		}
	}

	evaluate(expression: string, data: WorkflowData, ctx?: EvaluateContext): unknown {
		if (this.disposed) throw new Error('Evaluator disposed');

		const executionId = ctx?.executionId;
		const bridge = this.getBridge(executionId);

		// Transform template expression → sanitized JavaScript (cached)
		const transformedCode = this.getTransformedCode(expression);

		try {
			const result = bridge.execute(transformedCode, data, {
				timezone: ctx?.timezone,
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
		} finally {
			if (!executionId) this.pool.returnToPool(bridge);
		}
	}

	private getBridge(executionId?: string): RuntimeBridge {
		if (!executionId) {
			const bridge = this.pool.tryAcquire();
			if (!bridge) throw new Error('No isolate bridge available in pool');
			return bridge;
		}

		const bridge = this.bridges.get(executionId);
		if (!bridge) {
			throw new Error(
				`No bridge acquired for execution ${executionId}. Call acquireForExecution() first.`,
			);
		}

		// If the isolate died mid-execution (e.g. OOM), all remaining expressions
		// in this execution are expected to fail. Recovery is per-execution, not per-expression.
		if (bridge.isDisposed()) {
			throw new Error(`Isolate for execution ${executionId} is no longer available`);
		}

		return bridge;
	}

	async releaseIsolate(executionId: string): Promise<void> {
		const bridge = this.bridges.get(executionId);
		if (!bridge) return;
		this.bridges.delete(executionId);
		await this.pool.release(bridge);
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

		await Promise.all([...this.bridges.values()].map((b) => b.dispose()));
		this.bridges.clear();

		await this.pool.dispose();
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
