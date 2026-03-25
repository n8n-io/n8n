"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpressionCode = exports.getParsedExpression = void 0;
const recast_1 = require("recast");
const ast_types_1 = require("ast-types");
const VariablePolyfill_1 = require("./VariablePolyfill");
const ExpressionSplitter_1 = require("./ExpressionSplitter");
const Parser_1 = require("./Parser");
const v = ast_types_1.builders.identifier('v');
const shouldAlwaysWrapList = ['window', 'global', 'this'];
const shouldWrapInTry = (node) => {
    let shouldWrap = false;
    (0, recast_1.visit)(node, {
        visitMemberExpression() {
            shouldWrap = true;
            return false;
        },
        visitCallExpression() {
            shouldWrap = true;
            return false;
        },
        visitIdentifier(path) {
            if (shouldAlwaysWrapList.includes(path.node.name)) {
                shouldWrap = true;
                return false;
            }
            this.traverse(path);
            return;
        },
    });
    return shouldWrap;
};
const hasFunction = (node) => {
    let hasFn = false;
    (0, recast_1.visit)(node, {
        visitFunctionExpression() {
            hasFn = true;
            return false;
        },
        visitFunctionDeclaration() {
            hasFn = true;
            return false;
        },
        visitArrowFunctionExpression() {
            hasFn = true;
            return false;
        },
    });
    return hasFn;
};
const hasTemplateString = (node) => {
    let hasTemp = false;
    (0, recast_1.visit)(node, {
        visitTemplateLiteral(path) {
            if (path.node.expressions.length) {
                hasTemp = true;
                return false;
            }
            this.traverse(path);
            return;
        },
    });
    return hasTemp;
};
const wrapInErrorHandler = (node) => {
    return ast_types_1.builders.tryStatement(ast_types_1.builders.blockStatement([node]), ast_types_1.builders.catchClause(ast_types_1.builders.identifier('e'), null, ast_types_1.builders.blockStatement([
        ast_types_1.builders.expressionStatement(ast_types_1.builders.callExpression(ast_types_1.builders.identifier('E'), [ast_types_1.builders.identifier('e'), ast_types_1.builders.thisExpression()])),
    ])));
};
const maybeWrapExpr = (expr) => {
    if (expr.trimStart()[0] === '{') {
        return '(' + expr + ')';
    }
    return expr;
};
const buildFunctionBody = (expr) => {
    return ast_types_1.builders.blockStatement([
        ast_types_1.builders.expressionStatement(ast_types_1.builders.assignmentExpression('=', v, expr)),
        ast_types_1.builders.returnStatement(ast_types_1.builders.conditionalExpression(ast_types_1.builders.logicalExpression('||', ast_types_1.builders.logicalExpression('||', v, ast_types_1.builders.binaryExpression('===', v, ast_types_1.builders.literal(0))), ast_types_1.builders.binaryExpression('===', v, ast_types_1.builders.literal(false))), v, ast_types_1.builders.literal(''))),
    ]);
};
const fixStringNewLines = (node) => {
    const replace = (str) => {
        return str.replace(/\n/g, '\\n');
    };
    (0, recast_1.visit)(node, {
        visitTemplateElement(path) {
            this.traverse(path);
            const el = ast_types_1.builders.templateElement({
                cooked: path.node.value.cooked === null ? null : replace(path.node.value.cooked),
                raw: replace(path.node.value.raw),
            }, path.node.tail);
            path.replace(el);
        },
    });
    return node;
};
const getParsedExpression = (expr) => {
    return (0, ExpressionSplitter_1.splitExpression)(expr).map((chunk) => {
        if (chunk.type === 'code') {
            const code = maybeWrapExpr(chunk.text);
            const node = (0, recast_1.parse)(code, {
                parser: { parse: Parser_1.parseWithEsprimaNext },
            });
            return { ...chunk, parsed: node };
        }
        return chunk;
    });
};
exports.getParsedExpression = getParsedExpression;
const getExpressionCode = (expr, dataNodeName, hooks) => {
    var _a, _b;
    const chunks = (0, exports.getParsedExpression)(expr);
    const newProg = ast_types_1.builders.program([
        ast_types_1.builders.variableDeclaration('var', [ast_types_1.builders.variableDeclarator(VariablePolyfill_1.globalIdentifier, ast_types_1.builders.objectExpression([]))]),
    ]);
    let dataNode = ast_types_1.builders.thisExpression();
    const hasFn = chunks.filter((c) => c.type === 'code').some((c) => hasFunction(c.parsed));
    if (hasFn) {
        dataNode = ast_types_1.builders.identifier(dataNodeName);
        newProg.body.push(ast_types_1.builders.variableDeclaration('var', [ast_types_1.builders.variableDeclarator(dataNode, ast_types_1.builders.thisExpression())]));
    }
    const hasTempString = chunks.filter((c) => c.type === 'code').some((c) => hasTemplateString(c.parsed));
    if (chunks.length > 2 ||
        chunks[0].text !== '' ||
        (chunks[0].text === '' && chunks.length === 1)) {
        let parts = [];
        for (const chunk of chunks) {
            if (chunk.type === 'text') {
                parts.push(ast_types_1.builders.literal(chunk.text));
            }
            else {
                const fixed = fixStringNewLines(chunk.parsed);
                for (const hook of hooks.before) {
                    hook(fixed, dataNode);
                }
                const parsed = (_a = (0, VariablePolyfill_1.jsVariablePolyfill)(fixed, dataNode)) === null || _a === void 0 ? void 0 : _a[0];
                if (!parsed || parsed.type !== 'ExpressionStatement') {
                    throw new SyntaxError('Not a expression statement');
                }
                for (const hook of hooks.after) {
                    hook(parsed, dataNode);
                }
                const functionBody = buildFunctionBody(parsed.expression);
                if (shouldWrapInTry(parsed)) {
                    functionBody.body = [
                        wrapInErrorHandler(functionBody.body[0]),
                        ast_types_1.builders.expressionStatement(ast_types_1.builders.identifier('')),
                        functionBody.body[1],
                    ];
                }
                parts.push(ast_types_1.builders.callExpression(ast_types_1.builders.memberExpression(ast_types_1.builders.functionExpression(null, [v], functionBody), ast_types_1.builders.identifier('call')), [ast_types_1.builders.thisExpression()]));
            }
        }
        if (chunks.length < 2) {
            newProg.body.push(ast_types_1.builders.returnStatement(parts[0]));
        }
        else {
            parts = parts.filter((i) => !(i.type === 'Literal' && i.value === ''));
            newProg.body.push(ast_types_1.builders.returnStatement(ast_types_1.builders.callExpression(ast_types_1.builders.memberExpression(ast_types_1.builders.arrayExpression(parts), ast_types_1.builders.identifier('join')), [
                ast_types_1.builders.literal(''),
            ])));
        }
    }
    else {
        const fixed = fixStringNewLines(chunks[1].parsed);
        for (const hook of hooks.before) {
            hook(fixed, dataNode);
        }
        const parsed = (_b = (0, VariablePolyfill_1.jsVariablePolyfill)(fixed, dataNode)) === null || _b === void 0 ? void 0 : _b[0];
        if (!parsed || parsed.type !== 'ExpressionStatement') {
            throw new SyntaxError('Not a expression statement');
        }
        for (const hook of hooks.after) {
            hook(parsed, dataNode);
        }
        let retData = ast_types_1.builders.returnStatement(parsed.expression);
        if (shouldWrapInTry(parsed)) {
            retData = wrapInErrorHandler(retData);
        }
        newProg.body.push(retData);
    }
    return [(0, recast_1.print)(newProg).code, { has: { function: hasFn, templateString: hasTempString } }];
};
exports.getExpressionCode = getExpressionCode;
//# sourceMappingURL=ExpressionBuilder.js.map