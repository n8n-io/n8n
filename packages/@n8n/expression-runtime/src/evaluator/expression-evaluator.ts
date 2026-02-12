import type {
	IExpressionEvaluator,
	EvaluatorConfig,
	WorkflowData,
	EvaluateOptions,
} from '../types';

export class ExpressionEvaluator implements IExpressionEvaluator {
	private config: EvaluatorConfig;

	private disposed = false;

	private codeCache: Map<string, string> = new Map();

	constructor(config: EvaluatorConfig) {
		this.config = config;
	}

	async initialize(): Promise<void> {
		await this.config.bridge.initialize();
	}

	async evaluate(
		expression: string,
		data: WorkflowData,
		options?: EvaluateOptions,
	): Promise<unknown> {
		if (this.disposed) throw new Error('Evaluator disposed');

		const skipTransform = options?.skipTransform ?? false;
		const skipCodeCache = options?.skipCodeCache ?? false;

		// Get transformed code
		let code: string;
		if (skipTransform) {
			code = expression;
		} else if (!skipCodeCache && this.codeCache.has(expression)) {
			code = this.codeCache.get(expression)!;
		} else {
			// Transform with Tournament if available
			code = this.config.tournament ? this.config.tournament.transform(expression) : expression;

			if (!skipCodeCache) {
				this.codeCache.set(expression, code);
			}
		}

		// Execute with workflow data proxy (passed directly for Slice 1)
		try {
			const result = await this.config.bridge.execute(code, data);

			// Emit success metric
			if (this.config.observability) {
				this.config.observability.metrics.counter('expression.evaluation.success', 1);
			}

			return result;
		} catch (error) {
			// Emit error metric
			if (this.config.observability) {
				this.config.observability.metrics.counter('expression.evaluation.error', 1);
			}
			throw error;
		}
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
