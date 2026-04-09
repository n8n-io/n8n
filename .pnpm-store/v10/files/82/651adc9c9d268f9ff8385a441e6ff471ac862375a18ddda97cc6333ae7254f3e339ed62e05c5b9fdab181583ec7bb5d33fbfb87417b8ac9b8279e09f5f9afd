"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lintExpression = lintExpression;
const parser = require('./abnf-parser');
function lintExpression(expression) {
    try {
        return parser.parse(expression);
    }
    catch (_error) {
        throw new Error(`Runtime expression is not valid: ${expression}`);
    }
}
//# sourceMappingURL=lint.js.map