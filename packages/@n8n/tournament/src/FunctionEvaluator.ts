import type { ExpressionEvaluator, ReturnValue, Tournament } from '.';

export class FunctionEvaluator implements ExpressionEvaluator {
	private _codeCache: Record<string, Function> = {};

	constructor(private instance: Tournament) {}

	private getFunction(expr: string): Function {
		if (expr in this._codeCache) {
			return this._codeCache[expr];
		}
		const [code] = this.instance.getExpressionCode(expr);
		const func = new Function('E', code + ';');
		this._codeCache[expr] = func;
		return func;
	}

	evaluate(expr: string, data: unknown): ReturnValue {
		const fn = this.getFunction(expr);
		return fn.call(data, this.instance.errorHandler);
	}
}
