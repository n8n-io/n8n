import { getExpressionCode } from './ExpressionBuilder';
import type { ExpressionAnalysis } from './ExpressionBuilder';
import { getTmplDifference } from './Analysis';
import type { ExpressionEvaluator, ExpressionEvaluatorClass } from './Evaluator';
import { FunctionEvaluator } from './FunctionEvaluator';
import type { TournamentHooks } from './ast';

export type { TmplDifference } from './Analysis';
export type { ExpressionEvaluator, ExpressionEvaluatorClass } from './Evaluator';
export * from './ast';

const DATA_NODE_NAME = '___n8n_data';
export type ReturnValue = string | null | (() => unknown);

export class Tournament {
	private evaluator!: ExpressionEvaluator;

	constructor(
		public errorHandler: (error: Error) => void = () => {},
		private _dataNodeName: string = DATA_NODE_NAME,
		Evaluator: ExpressionEvaluatorClass = FunctionEvaluator,
		private readonly astHooks: TournamentHooks = { before: [], after: [] },
	) {
		this.setEvaluator(Evaluator);
	}

	setEvaluator(Evaluator: ExpressionEvaluatorClass) {
		this.evaluator = new Evaluator(this);
	}

	getExpressionCode(expr: string): [string, ExpressionAnalysis] {
		return getExpressionCode(expr, this._dataNodeName, this.astHooks);
	}

	tmplDiff(expr: string) {
		return getTmplDifference(expr, this._dataNodeName);
	}

	execute(expr: string, data: unknown): ReturnValue {
		// This is to match tmpl. This will only really happen if
		// an empty expression is passed in.
		if (!expr) {
			return expr;
		}
		return this.evaluator.evaluate(expr, data);
	}
}
