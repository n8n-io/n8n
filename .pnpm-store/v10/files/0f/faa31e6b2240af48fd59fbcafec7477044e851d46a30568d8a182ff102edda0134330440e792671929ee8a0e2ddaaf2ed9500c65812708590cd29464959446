"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementEvents = generateElementEvents;
exports.generateEventArg = generateEventArg;
exports.generateEventExpression = generateEventExpression;
exports.isCompoundExpression = isCompoundExpression;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("@vue/shared");
const shared_2 = require("../../utils/shared");
const common_1 = require("../common");
const camelized_1 = require("./camelized");
const interpolation_1 = require("./interpolation");
function* generateElementEvents(options, ctx, node, componentVar, componentInstanceVar, emitVar, eventsVar) {
    let usedComponentEventsVar = false;
    let propsVar;
    for (const prop of node.props) {
        if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && prop.name === 'on'
            && prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
            && !prop.arg.loc.source.startsWith('[')
            && !prop.arg.loc.source.endsWith(']')) {
            usedComponentEventsVar = true;
            if (!propsVar) {
                propsVar = ctx.getInternalVariable();
                yield `let ${propsVar}!: __VLS_FunctionalComponentProps<typeof ${componentVar}, typeof ${componentInstanceVar}>${common_1.endOfLine}`;
            }
            const originalPropName = (0, shared_1.camelize)('on-' + prop.arg.loc.source);
            const originalPropNameObjectKey = common_1.variableNameRegex.test(originalPropName)
                ? originalPropName
                : `'${originalPropName}'`;
            yield `const ${ctx.getInternalVariable()}: `;
            if (!options.vueCompilerOptions.strictTemplates) {
                yield `Record<string, unknown> & `;
            }
            yield `(${common_1.newLine}`;
            yield `__VLS_IsFunction<typeof ${propsVar}, '${originalPropName}'> extends true${common_1.newLine}`;
            yield `? typeof ${propsVar}${common_1.newLine}`;
            yield `: __VLS_IsFunction<typeof ${eventsVar}, '${prop.arg.loc.source}'> extends true${common_1.newLine}`;
            yield `? {${common_1.newLine}`;
            yield `/**__VLS_emit,${emitVar},${prop.arg.loc.source}*/${common_1.newLine}`;
            yield `${originalPropNameObjectKey}?: typeof ${eventsVar}['${prop.arg.loc.source}']${common_1.newLine}`;
            yield `}${common_1.newLine}`;
            if (prop.arg.loc.source !== (0, shared_1.camelize)(prop.arg.loc.source)) {
                yield `: __VLS_IsFunction<typeof ${eventsVar}, '${(0, shared_1.camelize)(prop.arg.loc.source)}'> extends true${common_1.newLine}`;
                yield `? {${common_1.newLine}`;
                yield `/**__VLS_emit,${emitVar},${(0, shared_1.camelize)(prop.arg.loc.source)}*/${common_1.newLine}`;
                yield `${originalPropNameObjectKey}?: typeof ${eventsVar}['${(0, shared_1.camelize)(prop.arg.loc.source)}']${common_1.newLine}`;
                yield `}${common_1.newLine}`;
            }
            yield `: typeof ${propsVar}${common_1.newLine}`;
            yield `) = {${common_1.newLine}`;
            yield* generateEventArg(ctx, prop.arg, true);
            yield `: `;
            yield* generateEventExpression(options, ctx, prop);
            yield `}${common_1.endOfLine}`;
        }
    }
    return usedComponentEventsVar;
}
const eventArgFeatures = {
    navigation: {
        // @click-outside -> onClickOutside
        resolveRenameNewName(newName) {
            return (0, shared_1.camelize)('on-' + newName);
        },
        // onClickOutside -> @click-outside
        resolveRenameEditText(newName) {
            const hName = (0, shared_2.hyphenateAttr)(newName);
            if ((0, shared_2.hyphenateAttr)(newName).startsWith('on-')) {
                return (0, shared_1.camelize)(hName.slice('on-'.length));
            }
            return newName;
        },
    },
};
function* generateEventArg(ctx, arg, enableHover) {
    const features = enableHover
        ? {
            ...ctx.codeFeatures.withoutHighlightAndCompletion,
            ...eventArgFeatures,
        }
        : eventArgFeatures;
    if (common_1.variableNameRegex.test((0, shared_1.camelize)(arg.loc.source))) {
        yield ['', 'template', arg.loc.start.offset, features];
        yield `on`;
        yield* (0, camelized_1.generateCamelized)((0, shared_1.capitalize)(arg.loc.source), arg.loc.start.offset, common_1.combineLastMapping);
    }
    else {
        yield* (0, common_1.wrapWith)(arg.loc.start.offset, arg.loc.end.offset, features, `'`, ['', 'template', arg.loc.start.offset, common_1.combineLastMapping], 'on', ...(0, camelized_1.generateCamelized)((0, shared_1.capitalize)(arg.loc.source), arg.loc.start.offset, common_1.combineLastMapping), `'`);
    }
}
function* generateEventExpression(options, ctx, prop) {
    if (prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        let prefix = '(';
        let suffix = ')';
        let isFirstMapping = true;
        const ast = (0, common_1.createTsAst)(options.ts, prop.exp, prop.exp.content);
        const _isCompoundExpression = isCompoundExpression(options.ts, ast);
        if (_isCompoundExpression) {
            yield `(...[$event]) => {${common_1.newLine}`;
            ctx.addLocalVariable('$event');
            prefix = '';
            suffix = '';
            for (const blockCondition of ctx.blockConditions) {
                prefix += `if (!(${blockCondition})) return${common_1.endOfLine}`;
            }
        }
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, prop.exp.content, prop.exp.loc, prop.exp.loc.start.offset, offset => {
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
        }, prefix, suffix);
        if (_isCompoundExpression) {
            ctx.removeLocalVariable('$event');
            yield common_1.endOfLine;
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