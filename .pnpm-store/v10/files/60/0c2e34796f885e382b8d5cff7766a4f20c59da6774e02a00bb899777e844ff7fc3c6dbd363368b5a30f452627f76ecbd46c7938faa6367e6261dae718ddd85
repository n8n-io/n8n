"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tournament = void 0;
const ExpressionBuilder_1 = require("./ExpressionBuilder");
const Analysis_1 = require("./Analysis");
const FunctionEvaluator_1 = require("./FunctionEvaluator");
__exportStar(require("./ast"), exports);
const DATA_NODE_NAME = '___n8n_data';
class Tournament {
    constructor(errorHandler = () => { }, _dataNodeName = DATA_NODE_NAME, Evaluator = FunctionEvaluator_1.FunctionEvaluator, astHooks = { before: [], after: [] }) {
        this.errorHandler = errorHandler;
        this._dataNodeName = _dataNodeName;
        this.astHooks = astHooks;
        this.setEvaluator(Evaluator);
    }
    setEvaluator(Evaluator) {
        this.evaluator = new Evaluator(this);
    }
    getExpressionCode(expr) {
        return (0, ExpressionBuilder_1.getExpressionCode)(expr, this._dataNodeName, this.astHooks);
    }
    tmplDiff(expr) {
        return (0, Analysis_1.getTmplDifference)(expr, this._dataNodeName);
    }
    execute(expr, data) {
        if (!expr) {
            return expr;
        }
        return this.evaluator.evaluate(expr, data);
    }
}
exports.Tournament = Tournament;
//# sourceMappingURL=index.js.map