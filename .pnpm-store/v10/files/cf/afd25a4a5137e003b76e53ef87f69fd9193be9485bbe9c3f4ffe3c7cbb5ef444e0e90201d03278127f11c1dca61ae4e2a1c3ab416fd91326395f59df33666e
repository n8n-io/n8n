"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVFor = generateVFor;
exports.parseVForNode = parseVForNode;
const CompilerDOM = require("@vue/compiler-dom");
const common_1 = require("../common");
const interpolation_1 = require("./interpolation");
const templateChild_1 = require("./templateChild");
function* generateVFor(options, ctx, node, currentComponent, componentCtxVar) {
    const { source } = node.parseResult;
    const { leftExpressionRange, leftExpressionText } = parseVForNode(node);
    const forBlockVars = [];
    yield `for (const [`;
    if (leftExpressionRange && leftExpressionText) {
        const collectAst = (0, common_1.createTsAst)(options.ts, node.parseResult, `const [${leftExpressionText}]`);
        (0, common_1.collectVars)(options.ts, collectAst, collectAst, forBlockVars);
        yield [
            leftExpressionText,
            'template',
            leftExpressionRange.start,
            ctx.codeFeatures.all,
        ];
    }
    yield `] of `;
    if (source.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        yield `__VLS_getVForSourceType(`;
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, source.content, source.loc, source.loc.start.offset, ctx.codeFeatures.all, '(', ')');
        yield `!)`; // #3102
    }
    else {
        yield `{} as any`;
    }
    yield `) {${common_1.newLine}`;
    for (const varName of forBlockVars) {
        ctx.addLocalVariable(varName);
    }
    let isFragment = true;
    for (const argument of node.codegenNode?.children.arguments ?? []) {
        if (argument.type === CompilerDOM.NodeTypes.JS_FUNCTION_EXPRESSION
            && argument.returns?.type === CompilerDOM.NodeTypes.VNODE_CALL
            && argument.returns?.props?.type === CompilerDOM.NodeTypes.JS_OBJECT_EXPRESSION) {
            if (argument.returns.tag !== CompilerDOM.FRAGMENT) {
                isFragment = false;
                continue;
            }
            for (const prop of argument.returns.props.properties) {
                if (prop.value.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                    && !prop.value.isStatic) {
                    yield* (0, interpolation_1.generateInterpolation)(options, ctx, prop.value.content, prop.value.loc, prop.value.loc.start.offset, ctx.codeFeatures.all, '(', ')');
                    yield common_1.endOfLine;
                }
            }
        }
    }
    if (isFragment) {
        yield* ctx.resetDirectiveComments('end of v-for start');
    }
    let prev;
    for (const childNode of node.children) {
        yield* (0, templateChild_1.generateTemplateChild)(options, ctx, childNode, currentComponent, prev, componentCtxVar, true);
        prev = childNode;
    }
    for (const varName of forBlockVars) {
        ctx.removeLocalVariable(varName);
    }
    yield* ctx.generateAutoImportCompletion();
    yield `}${common_1.newLine}`;
}
function parseVForNode(node) {
    const { value, key, index } = node.parseResult;
    const leftExpressionRange = (value || key || index)
        ? {
            start: (value ?? key ?? index).loc.start.offset,
            end: (index ?? key ?? value).loc.end.offset,
        }
        : undefined;
    const leftExpressionText = leftExpressionRange
        ? node.loc.source.substring(leftExpressionRange.start - node.loc.start.offset, leftExpressionRange.end - node.loc.start.offset)
        : undefined;
    return {
        leftExpressionRange,
        leftExpressionText,
    };
}
//# sourceMappingURL=vFor.js.map