import type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
} from '../types';

/**
 * Expression evaluator for Slice 1.
 *
 * Simple implementation that passes expressions directly to the bridge.
 * Tournament integration and code caching will be added in later slices.
 */
export class ExpressionEvaluator implements IExpressionEvaluator {
	private config: EvaluatorConfig;

	private disposed = false;

	constructor(config: EvaluatorConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		await this.config.bridge.initialize();
	}

	async evaluate(
		expression: string,
		data: WorkflowData,
		_options?: EvaluateOptions,
	): Promise<unknown> {
		if (this.disposed) throw new Error('Evaluator disposed');

		// Slice 1: Pass expression directly to bridge (no transformation yet)
		try {
			const result = await this.config.bridge.execute(expression, data);

			// Emit success metric if observability is configured
			if (this.config.observability) {
				this.config.observability.metrics.counter('expression.evaluation.success', 1);
			}

			return result;
		} catch (error) {
			// Emit error metric if observability is configured
			if (this.config.observability) {
				this.config.observability.metrics.counter('expression.evaluation.error', 1);
			}
			throw error;
		}
	}

	async dispose(): Promise<void> {
		this.disposed = true;
		await this.config.bridge.dispose();
	}

	isDisposed(): boolean {
		return this.disposed;
	}
}
