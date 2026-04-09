"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementEvents = generateElementEvents;
exports.generateEventArg = generateEventArg;
exports.generateEventExpression = generateEventExpression;
exports.isCompoundExpression = isCompoundExpression;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("@vue/shared");
const utils_1 = require("../utils");
const camelized_1 = require("../utils/camelized");
const wrapWith_1 = require("../utils/wrapWith");
const interpolation_1 = require("./interpolation");
function* generateElementEvents(options, ctx, node, componentFunctionalVar, componentVNodeVar, componentCtxVar) {
    let emitVar;
    let eventsVar;
    let propsVar;
    for (const prop of node.props) {
        if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && prop.name === 'on'
            && prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
            && prop.arg.isStatic) {
            ctx.currentComponent.used = true;
            if (!emitVar) {
                emitVar = ctx.getInternalVariable();
                eventsVar = ctx.getInternalVariable();
                propsVar = ctx.getInternalVariable();
                yield `let ${emitVar}!: typeof ${componentCtxVar}.emit${utils_1.endOfLine}`;
                yield `let ${eventsVar}!: __VLS_NormalizeEmits<typeof ${emitVar}>${utils_1.endOfLine}`;
                yield `let ${propsVar}!: __VLS_FunctionalComponentProps<typeof ${componentFunctionalVar}, typeof ${componentVNodeVar}>${utils_1.endOfLine}`;
            }
            let source = prop.arg.loc.source;
            let start = prop.arg.loc.start.offset;
            let propPrefix = 'on';
            let emitPrefix = '';
            if (source.startsWith('vue:')) {
                source = source.slice('vue:'.length);
                start = start + 'vue:'.length;
                propPrefix = 'onVnode';
                emitPrefix = 'vnode-';
            }
            yield `const ${ctx.getInternalVariable()}: __VLS_NormalizeComponentEvent<typeof ${propsVar}, typeof ${eventsVar}, '${(0, shared_1.camelize)(propPrefix + '-' + source)}', '${emitPrefix}${source}', '${(0, shared_1.camelize)(emitPrefix + source)}'> = {${utils_1.newLine}`;
            yield* generateEventArg(ctx, source, start, propPrefix);
            yield `: `;
            yield* generateEventExpression(options, ctx, prop);
            yield `}${utils_1.endOfLine}`;
        }
    }
}
function* generateEventArg(ctx, name, start, directive = 'on') {
    const features = {
        ...ctx.codeFeatures.withoutHighlightAndCompletion,
        ...ctx.codeFeatures.navigationWithoutRename,
    };
    if (utils_1.identifierRegex.test((0, shared_1.camelize)(name))) {
        yield ['', 'template', start, features];
        yield directive;
        yield* (0, camelized_1.generateCamelized)((0, shared_1.capitalize)(name), 'template', start, utils_1.combineLastMapping);
    }
    else {
        yield* (0, wrapWith_1.wrapWith)(start, start + name.length, features, `'`, directive, ...(0, camelized_1.generateCamelized)((0, shared_1.capitalize)(name), 'template', start, utils_1.combineLastMapping), `'`);
    }
}
function* generateEventExpression(options, ctx, prop) {
    if (prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        let prefix = `(`;
        let suffix = `)`;
        let isFirstMapping = true;
        const ast = (0, utils_1.createTsAst)(options.ts, prop.exp, prop.exp.content);
        const _isCompoundExpression = isCompoundExpression(options.ts, ast);
        if (_isCompoundExpression) {
            yield `(...[$event]) => {${utils_1.newLine}`;
            ctx.addLocalVariable('$event');
            yield* ctx.generateConditionGuards();
            prefix = ``;
            suffix = ``;
        }
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', offset => {
            if (_isCompoundExpression && isFirstMapping) {
                isFirstMapping = false;
                ctx.inlayHints.push({
                    blockName: 'template',
                    offset,
                    setting: 'vue.inlayHints.inlineHandlerLeading',
                    label: '$event =>',
                    paddingRight: true,
                    tooltip: [
                        '`$event` is a hidden parameter, you can use it in this callback.',
                        'To hide this hint, set `vue.inlayHints.inlineHandlerLeading` to `false` in IDE settings.',
                        '[More info](https://github.com/vuejs/language-tools/issues/2445#issuecomment-1444771420)',
                    ].join('\n\n'),
                });
            }
            return ctx.codeFeatures.all;
        }, prop.exp.content, prop.exp.loc.start.offset, prop.exp.loc, prefix, suffix);
        if (_isCompoundExpression) {
            ctx.removeLocalVariable('$event');
            yield utils_1.endOfLine;
            yield* ctx.generateAutoImportCompletion();
            yield `}`;
        }
    }
    else {
        yield `() => {}`;
    }
}
function isCompoundExpression(ts, ast) {
    let result = true;
    if (ast.statements.length === 0) {
        result = false;
    }
    else if (ast.statements.length === 1) {
        ts.forEachChild(ast, child_1 => {
            if (ts.isExpressionStatement(child_1)) {
                ts.forEachChild(child_1, child_2 => {
                    if (ts.isArrowFunction(child_2)) {
                        result = false;
                    }
                    else if (isPropertyAccessOrId(ts, child_2)) {
                        result = false;
                    }
                });
            }
            else if (ts.isFunctionDeclaration(child_1)) {
                result = false;
            }
        });
    }
    return result;
}
function isPropertyAccessOrId(ts, node) {
    if (ts.isIdentifier(node)) {
        return true;
    }
    if (ts.isPropertyAccessExpression(node)) {
        return isPropertyAccessOrId(ts, node.expression);
    }
    return false;
}
//# sourceMappingURL=elementEvents.js.map