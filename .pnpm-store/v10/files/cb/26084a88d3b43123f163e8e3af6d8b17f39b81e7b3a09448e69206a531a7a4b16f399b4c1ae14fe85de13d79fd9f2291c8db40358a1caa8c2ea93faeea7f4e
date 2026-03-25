"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionEvaluator = void 0;
class FunctionEvaluator {
    constructor(instance) {
        this.instance = instance;
        this._codeCache = {};
    }
    getFunction(expr) {
        if (expr in this._codeCache) {
            return this._codeCache[expr];
        }
        const [code] = this.instance.getExpressionCode(expr);
        const func = new Function('E', code + ';');
        this._codeCache[expr] = func;
        return func;
    }
    evaluate(expr, data) {
        const fn = this.getFunction(expr);
        return fn.call(data, this.instance.errorHandler);
    }
}
exports.FunctionEvaluator = FunctionEvaluator;
//# sourceMappingURL=FunctionEvaluator.js.map