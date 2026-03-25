"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStyleScopedClassReferences = generateStyleScopedClassReferences;
exports.collectStyleScopedClassReferences = collectStyleScopedClassReferences;
const CompilerDOM = require("@vue/compiler-dom");
const scriptSetupRanges_1 = require("../../parsers/scriptSetupRanges");
const utils_1 = require("../utils");
const escaped_1 = require("../utils/escaped");
const wrapWith_1 = require("../utils/wrapWith");
const classNameEscapeRegex = /([\\'])/;
function* generateStyleScopedClassReferences(ctx, withDot = false) {
    for (const offset of ctx.emptyClassOffsets) {
        yield `/** @type {__VLS_StyleScopedClasses['`;
        yield [
            '',
            'template',
            offset,
            ctx.codeFeatures.additionalCompletion,
        ];
        yield `']} */${utils_1.endOfLine}`;
    }
    for (const { source, className, offset } of ctx.scopedClasses) {
        yield `/** @type {__VLS_StyleScopedClasses[`;
        yield* (0, wrapWith_1.wrapWith)(offset - (withDot ? 1 : 0), offset + className.length, source, ctx.codeFeatures.navigation, `'`, ...(0, escaped_1.generateEscaped)(className, source, offset, ctx.codeFeatures.navigationAndAdditionalCompletion, classNameEscapeRegex), `'`);
        yield `]} */${utils_1.endOfLine}`;
    }
}
function collectStyleScopedClassReferences(options, ctx, node) {
    for (const prop of node.props) {
        if (prop.type === CompilerDOM.NodeTypes.ATTRIBUTE
            && prop.name === 'class'
            && prop.value) {
            if (options.template.lang === 'pug') {
                const getClassOffset = Reflect.get(prop.value.loc.start, 'getClassOffset');
                const content = prop.value.loc.source.slice(1, -1);
                let startOffset = 1;
                for (const className of content.split(' ')) {
                    if (className) {
                        ctx.scopedClasses.push({
                            source: 'template',
                            className,
                            offset: getClassOffset(startOffset),
                        });
                    }
                    startOffset += className.length + 1;
                }
            }
            else {
                let isWrapped = false;
                const [content, startOffset] = (0, utils_1.normalizeAttributeValue)(prop.value);
                if (content) {
                    const classes = collectClasses(content, startOffset + (isWrapped ? 1 : 0));
                    ctx.scopedClasses.push(...classes);
                }
                else {
                    ctx.emptyClassOffsets.push(startOffset);
                }
            }
        }
        else if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
            && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
            && prop.arg.content === 'class') {
            const content = '`${' + prop.exp.content + '}`';
            const startOffset = prop.exp.loc.start.offset - 3;
            const { ts } = options;
            const ast = ts.createSourceFile('', content, 99);
            const literals = [];
            ts.forEachChild(ast, node => {
                if (!ts.isExpressionStatement(node) ||
                    !isTemplateExpression(node.expression)) {
                    return;
                }
                const expression = node.expression.templateSpans[0].expression;
                if (ts.isStringLiteralLike(expression)) {
                    literals.push(expression);
                }
                if (ts.isArrayLiteralExpression(expression)) {
                    walkArrayLiteral(expression);
                }
                if (ts.isObjectLiteralExpression(expression)) {
                    walkObjectLiteral(expression);
                }
            });
            for (const literal of literals) {
                if (literal.text) {
                    const classes = collectClasses(literal.text, literal.end - literal.text.length - 1 + startOffset);
                    ctx.scopedClasses.push(...classes);
                }
                else {
                    ctx.emptyClassOffsets.push(literal.end - 1 + startOffset);
                }
            }
            function walkArrayLiteral(node) {
                const { elements } = node;
                for (const element of elements) {
                    if (ts.isStringLiteralLike(element)) {
                        literals.push(element);
                    }
                    else if (ts.isObjectLiteralExpression(element)) {
                        walkObjectLiteral(element);
                    }
                }
            }
            function walkObjectLiteral(node) {
                const { properties } = node;
                for (const property of properties) {
                    if (ts.isPropertyAssignment(property)) {
                        const { name } = property;
                        if (ts.isIdentifier(name)) {
                            walkIdentifier(name);
                        }
                        else if (ts.isStringLiteral(name)) {
                            literals.push(name);
                        }
                        else if (ts.isComputedPropertyName(name)) {
                            const { expression } = name;
                            if (ts.isStringLiteralLike(expression)) {
                                literals.push(expression);
                            }
                        }
                    }
                    else if (ts.isShorthandPropertyAssignment(property)) {
                        walkIdentifier(property.name);
                    }
                }
            }
            function walkIdentifier(node) {
                const text = (0, scriptSetupRanges_1.getNodeText)(ts, node, ast);
                ctx.scopedClasses.push({
                    source: 'template',
                    className: text,
                    offset: node.end - text.length + startOffset
                });
            }
        }
    }
}
function collectClasses(content, startOffset = 0) {
    const classes = [];
    let currentClassName = '';
    let offset = 0;
    for (const char of (content + ' ')) {
        if (char.trim() === '') {
            if (currentClassName !== '') {
                classes.push({
                    source: 'template',
                    className: currentClassName,
                    offset: offset + startOffset
                });
                offset += currentClassName.length;
                currentClassName = '';
            }
            offset += char.length;
        }
        else {
            currentClassName += char;
        }
    }
    return classes;
}
// isTemplateExpression is missing in tsc
function isTemplateExpression(node) {
    return node.kind === 228;
}
//# sourceMappingURL=styleScopedClasses.js.map