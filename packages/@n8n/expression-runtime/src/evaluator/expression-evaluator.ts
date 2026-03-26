import { Tournament } from '@n8n/tournament';
import type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
} from '../types';
import { LruCache } from './lru-cache';

export class ExpressionEvaluator implements IExpressionEvaluator {
	private config: EvaluatorConfig;

	private disposed = false;

	// Lazy-initialized tournament instance (expensive to create, reused across evaluations)
	private tournament?: Tournament;

	// Cache: template expression → tournament-transformed JavaScript code
	// Cache hit rate in production: ~99.9% (same expressions repeat within a workflow)
	private codeCache: LruCache<string, string>;

	constructor(config: EvaluatorConfig) {
		this.config = config;
		this.codeCache = new LruCache<string, string>(config.maxCodeCacheSize, () => {
			this.config.observability?.metrics.counter('expression.code_cache.eviction', 1);
		});
	}

	async initialize(): Promise<void> {
		await this.config.bridge.initialize();
	}

	evaluate(expression: string, data: WorkflowData, options?: EvaluateOptions): unknown {
		if (this.disposed) throw new Error('Evaluator disposed');

		// Transform template expression → sanitized JavaScript (cached)
		const transformedCode = this.getTransformedCode(expression);

		try {
			const result = this.config.bridge.execute(transformedCode, data, {
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
		await this.config.bridge.dispose();
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
