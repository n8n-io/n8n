"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinExpression = exports.splitExpression = exports.escapeCode = void 0;
const OPEN_BRACKET = /(?<brackets>\{\{)/;
const CLOSE_BRACKET = /(?<brackets>\}\})/;
const escapeCode = (text) => {
    return text.replace('\\}}', '}}');
};
exports.escapeCode = escapeCode;
const normalizeBackslashes = (text) => {
    return text.replace(/\\\\/g, '\\');
};
const splitExpression = (expression) => {
    var _a, _b, _c;
    const chunks = [];
    let searchingFor = 'open';
    let activeRegex = OPEN_BRACKET;
    let buffer = '';
    let index = 0;
    while (index < expression.length) {
        const expr = expression.slice(index);
        const res = activeRegex.exec(expr);
        if (!(res === null || res === void 0 ? void 0 : res.groups)) {
            buffer += expr;
            if (searchingFor === 'open') {
                chunks.push({
                    type: 'text',
                    text: buffer,
                });
            }
            else {
                chunks.push({
                    type: 'code',
                    text: (0, exports.escapeCode)(buffer),
                    hasClosingBrackets: false,
                });
            }
            break;
        }
        const beforeMatch = expr.slice(0, res.index);
        const backslashCount = (_c = (_b = (_a = beforeMatch.match(/\\*$/)) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0;
        const isEscaped = backslashCount % 2 === 1;
        if (isEscaped) {
            buffer += expr.slice(0, res.index + '{{'.length);
            index += res.index + '{{'.length;
        }
        else {
            buffer += expr.slice(0, res.index);
            if (searchingFor === 'open') {
                chunks.push({
                    type: 'text',
                    text: normalizeBackslashes(buffer),
                });
                searchingFor = 'close';
                activeRegex = CLOSE_BRACKET;
            }
            else {
                chunks.push({
                    type: 'code',
                    text: (0, exports.escapeCode)(buffer),
                    hasClosingBrackets: true,
                });
                searchingFor = 'open';
                activeRegex = OPEN_BRACKET;
            }
            index += res.index + 2;
            buffer = '';
        }
    }
    return chunks;
};
exports.splitExpression = splitExpression;
const escapeTmplExpression = (part) => {
    return part.replace('}}', '\\}}');
};
const joinExpression = (parts) => {
    return parts
        .map((chunk) => {
        if (chunk.type === 'code') {
            return `{{${escapeTmplExpression(chunk.text)}${chunk.hasClosingBrackets ? '}}' : ''}`;
        }
        return chunk.text;
    })
        .join('');
};
exports.joinExpression = joinExpression;
//# sourceMappingURL=ExpressionSplitter.js.map