import { Tournament } from '@n8n/tournament';
import type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
} from '../types';

export class ExpressionEvaluator implements IExpressionEvaluator {
	private config: EvaluatorConfig;

	private disposed = false;

	// Lazy-initialized tournament instance (expensive to create, reused across evaluations)
	private tournament?: Tournament;

	// Cache: template expression → tournament-transformed JavaScript code
	// Cache hit rate in production: ~99.9% (same expressions repeat within a workflow)
	private codeCache = new Map<string, string>();

	constructor(config: EvaluatorConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		await this.config.bridge.initialize();
	}

	evaluate(expression: string, data: WorkflowData, _options?: EvaluateOptions): unknown {
		if (this.disposed) throw new Error('Evaluator disposed');

		// Transform template expression → sanitized JavaScript (cached)
		const transformedCode = this.getTransformedCode(expression);

		try {
			const result = this.config.bridge.execute(transformedCode, data);

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
			return cached;
		}

		if (!this.tournament) {
			const errorHandler = () => {};
			this.tournament = new Tournament(errorHandler, undefined, undefined, {
				before: this.config.hooks?.before ?? [],
				after: this.config.hooks?.after ?? [],
			});
		}

		const [transformedCode] = this.tournament.getExpressionCode(expression);
		this.codeCache.set(expression, transformedCode);
		return transformedCode;
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		this.codeCache.clear();
		await this.config.bridge.dispose();
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
