"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComponent = generateComponent;
exports.generateElement = generateElement;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("@vue/shared");
const scriptSetupRanges_1 = require("../../parsers/scriptSetupRanges");
const shared_2 = require("../../utils/shared");
const inlayHints_1 = require("../inlayHints");
const utils_1 = require("../utils");
const camelized_1 = require("../utils/camelized");
const elementChildren_1 = require("./elementChildren");
const elementDirectives_1 = require("./elementDirectives");
const elementEvents_1 = require("./elementEvents");
const elementProps_1 = require("./elementProps");
const interpolation_1 = require("./interpolation");
const objectProperty_1 = require("./objectProperty");
const propertyAccess_1 = require("./propertyAccess");
const templateChild_1 = require("./templateChild");
const colonReg = /:/g;
function* generateComponent(options, ctx, node) {
    const tagOffsets = [node.loc.start.offset + options.template.content.slice(node.loc.start.offset).indexOf(node.tag)];
    if (!node.isSelfClosing && options.template.lang === 'html') {
        const endTagOffset = node.loc.start.offset + node.loc.source.lastIndexOf(node.tag);
        if (endTagOffset > tagOffsets[0]) {
            tagOffsets.push(endTagOffset);
        }
    }
    const failedPropExps = [];
    const possibleOriginalNames = getPossibleOriginalComponentNames(node.tag, true);
    const matchImportName = possibleOriginalNames.find(name => options.scriptSetupImportComponentNames.has(name));
    const var_originalComponent = matchImportName ?? ctx.getInternalVariable();
    const var_functionalComponent = ctx.getInternalVariable();
    const var_componentInstance = ctx.getInternalVariable();
    const var_componentEmit = ctx.getInternalVariable();
    const var_componentEvents = ctx.getInternalVariable();
    const var_defineComponentCtx = ctx.getInternalVariable();
    const isComponentTag = node.tag.toLowerCase() === 'component';
    ctx.currentComponent = {
        node,
        ctxVar: var_defineComponentCtx,
        used: false
    };
    let props = node.props;
    let dynamicTagInfo;
    if (isComponentTag) {
        for (const prop of node.props) {
            if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
                && prop.name === 'bind'
                && prop.arg?.loc.source === 'is'
                && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                if (prop.arg.loc.end.offset === prop.exp.loc.end.offset) {
                    ctx.inlayHints.push((0, inlayHints_1.createVBindShorthandInlayHintInfo)(prop.exp.loc, 'is'));
                }
                dynamicTagInfo = {
                    tag: prop.exp.content,
                    offsets: [prop.exp.loc.start.offset],
                    astHolder: prop.exp.loc,
                };
                props = props.filter(p => p !== prop);
                break;
            }
        }
    }
    else if (node.tag.includes('.')) {
        // namespace tag
        dynamicTagInfo = {
            tag: node.tag,
            offsets: tagOffsets,
            astHolder: node.loc,
        };
    }
    if (matchImportName) {
        // hover, renaming / find references support
        yield `// @ts-ignore${utils_1.newLine}`; // #2304
        yield `/** @type { [`;
        for (const tagOffset of tagOffsets) {
            yield `typeof `;
            if (var_originalComponent === node.tag) {
                yield [
                    var_originalComponent,
                    'template',
                    tagOffset,
                    ctx.codeFeatures.withoutHighlightAndCompletion,
                ];
            }
            else {
                const shouldCapitalize = matchImportName[0].toUpperCase() === matchImportName[0];
                yield* (0, camelized_1.generateCamelized)(shouldCapitalize ? (0, shared_1.capitalize)(node.tag) : node.tag, tagOffset, {
                    ...ctx.codeFeatures.withoutHighlightAndCompletion,
                    navigation: {
                        resolveRenameNewName: camelizeComponentName,
                        resolveRenameEditText: getTagRenameApply(node.tag),
                    },
                });
            }
            yield `, `;
        }
        yield `] } */${utils_1.endOfLine}`;
    }
    else if (dynamicTagInfo) {
        yield `const ${var_originalComponent} = (`;
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', ctx.codeFeatures.all, dynamicTagInfo.tag, dynamicTagInfo.offsets[0], dynamicTagInfo.astHolder, '(', ')');
        if (dynamicTagInfo.offsets[1] !== undefined) {
            yield `,`;
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', {
                ...ctx.codeFeatures.all,
                completion: false,
            }, dynamicTagInfo.tag, dynamicTagInfo.offsets[1], dynamicTagInfo.astHolder, '(', ')');
        }
        yield `)${utils_1.endOfLine}`;
    }
    else if (!isComponentTag) {
        yield `const ${var_originalComponent} = ({} as __VLS_WithComponent<'${getCanonicalComponentName(node.tag)}', __VLS_LocalComponents, `;
        yield getPossibleOriginalComponentNames(node.tag, false)
            .map(name => `'${name}'`)
            .join(`, `);
        yield `>).`;
        yield* generateCanonicalComponentName(node.tag, tagOffsets[0], ctx.codeFeatures.withoutHighlightAndCompletionAndNavigation);
        yield `${utils_1.endOfLine}`;
        const camelizedTag = (0, shared_1.camelize)(node.tag);
        if (utils_1.variableNameRegex.test(camelizedTag)) {
            // renaming / find references support
            yield `/** @type { [`;
            for (const tagOffset of tagOffsets) {
                for (const shouldCapitalize of (node.tag[0] === node.tag[0].toUpperCase() ? [false] : [true, false])) {
                    const expectName = shouldCapitalize ? (0, shared_1.capitalize)(camelizedTag) : camelizedTag;
                    yield `typeof __VLS_components.`;
                    yield* (0, camelized_1.generateCamelized)(shouldCapitalize ? (0, shared_1.capitalize)(node.tag) : node.tag, tagOffset, {
                        navigation: {
                            resolveRenameNewName: node.tag !== expectName ? camelizeComponentName : undefined,
                            resolveRenameEditText: getTagRenameApply(node.tag),
                        },
                    });
                    yield `, `;
                }
            }
            yield `] } */${utils_1.endOfLine}`;
            // auto import support
            if (options.edited) {
                yield `// @ts-ignore${utils_1.newLine}`; // #2304
                yield* (0, camelized_1.generateCamelized)((0, shared_1.capitalize)(node.tag), tagOffsets[0], {
                    completion: {
                        isAdditional: true,
                        onlyImport: true,
                    },
                });
                yield `${utils_1.endOfLine}`;
            }
        }
    }
    else {
        yield `const ${var_originalComponent} = {} as any${utils_1.endOfLine}`;
    }
    yield `// @ts-ignore${utils_1.newLine}`;
    yield `const ${var_functionalComponent} = __VLS_asFunctionalComponent(${var_originalComponent}, new ${var_originalComponent}({${utils_1.newLine}`;
    yield* (0, elementProps_1.generateElementProps)(options, ctx, node, props, options.vueCompilerOptions.strictTemplates, false);
    yield `}))${utils_1.endOfLine}`;
    yield `const `;
    yield* (0, utils_1.wrapWith)(node.loc.start.offset, node.loc.end.offset, {
        verification: {
            shouldReport(_source, code) {
                return String(code) !== '6133';
            },
        }
    }, var_componentInstance);
    yield ` = ${var_functionalComponent}`;
    yield* generateComponentGeneric(ctx);
    yield `(`;
    yield* (0, utils_1.wrapWith)(tagOffsets[0], tagOffsets[0] + node.tag.length, ctx.codeFeatures.verification, `{${utils_1.newLine}`, ...(0, elementProps_1.generateElementProps)(options, ctx, node, props, options.vueCompilerOptions.strictTemplates, true, failedPropExps), `}`);
    yield `, ...__VLS_functionalComponentArgsRest(${var_functionalComponent}))${utils_1.endOfLine}`;
    yield* generateFailedPropExps(options, ctx, failedPropExps);
    const [refName, offset] = yield* generateVScope(options, ctx, node, props);
    const isRootNode = node === ctx.singleRootNode;
    if (refName || isRootNode) {
        const varName = ctx.getInternalVariable();
        ctx.currentComponent.used = true;
        yield `var ${varName} = {} as (Parameters<NonNullable<typeof ${var_defineComponentCtx}['expose']>>[0] | null)`;
        if (node.codegenNode?.type === CompilerDOM.NodeTypes.VNODE_CALL
            && node.codegenNode.props?.type === CompilerDOM.NodeTypes.JS_OBJECT_EXPRESSION
            && node.codegenNode.props.properties.some(({ key }) => key.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION && key.content === 'ref_for')) {
            yield `[]`;
        }
        yield `${utils_1.endOfLine}`;
        if (refName) {
            ctx.templateRefs.set(refName, [varName, offset]);
        }
        if (isRootNode) {
            ctx.singleRootElType = `NonNullable<typeof ${varName}>['$el']`;
        }
    }
    const usedComponentEventsVar = yield* (0, elementEvents_1.generateElementEvents)(options, ctx, node, var_functionalComponent, var_componentInstance, var_componentEvents);
    if (usedComponentEventsVar) {
        ctx.currentComponent.used = true;
        yield `let ${var_componentEmit}!: typeof ${var_defineComponentCtx}.emit${utils_1.endOfLine}`;
        yield `let ${var_componentEvents}!: __VLS_NormalizeEmits<typeof ${var_componentEmit}>${utils_1.endOfLine}`;
    }
    if (options.vueCompilerOptions.fallthroughAttributes
        && (node.props.some(prop => prop.type === CompilerDOM.NodeTypes.DIRECTIVE && prop.name === 'bind' && prop.exp?.loc.source === '$attrs')
            || node === ctx.singleRootNode)) {
        const varAttrs = ctx.getInternalVariable();
        ctx.inheritedAttrVars.add(varAttrs);
        yield `var ${varAttrs}!: Parameters<typeof ${var_functionalComponent}>[0];\n`;
    }
    const slotDir = node.props.find(p => p.type === CompilerDOM.NodeTypes.DIRECTIVE && p.name === 'slot');
    if (slotDir) {
        yield* generateComponentSlot(options, ctx, node, slotDir);
    }
    else {
        yield* (0, elementChildren_1.generateElementChildren)(options, ctx, node);
    }
    if (ctx.currentComponent.used) {
        yield `var ${var_defineComponentCtx}!: __VLS_PickFunctionalComponentCtx<typeof ${var_originalComponent}, typeof ${var_componentInstance}>${utils_1.endOfLine}`;
    }
}
function* generateElement(options, ctx, node, isVForChild) {
    const startTagOffset = node.loc.start.offset + options.template.content.slice(node.loc.start.offset).indexOf(node.tag);
    const endTagOffset = !node.isSelfClosing && options.template.lang === 'html'
        ? node.loc.start.offset + node.loc.source.lastIndexOf(node.tag)
        : undefined;
    const failedPropExps = [];
    yield `__VLS_elementAsFunction(__VLS_intrinsicElements`;
    yield* (0, propertyAccess_1.generatePropertyAccess)(options, ctx, node.tag, startTagOffset, ctx.codeFeatures.withoutHighlightAndCompletion);
    if (endTagOffset !== undefined) {
        yield `, __VLS_intrinsicElements`;
        yield* (0, propertyAccess_1.generatePropertyAccess)(options, ctx, node.tag, endTagOffset, ctx.codeFeatures.withoutHighlightAndCompletion);
    }
    yield `)(`;
    yield* (0, utils_1.wrapWith)(startTagOffset, startTagOffset + node.tag.length, ctx.codeFeatures.verification, `{${utils_1.newLine}`, ...(0, elementProps_1.generateElementProps)(options, ctx, node, node.props, options.vueCompilerOptions.strictTemplates, true, failedPropExps), `}`);
    yield `)${utils_1.endOfLine}`;
    yield* generateFailedPropExps(options, ctx, failedPropExps);
    const [refName, offset] = yield* generateVScope(options, ctx, node, node.props);
    if (refName) {
        let refValue = `__VLS_nativeElements['${node.tag}']`;
        if (isVForChild) {
            refValue = `[${refValue}]`;
        }
        ctx.templateRefs.set(refName, [refValue, offset]);
    }
    if (ctx.singleRootNode === node) {
        ctx.singleRootElType = `typeof __VLS_nativeElements['${node.tag}']`;
    }
    const slotDir = node.props.find(p => p.type === CompilerDOM.NodeTypes.DIRECTIVE && p.name === 'slot');
    if (slotDir && ctx.currentComponent) {
        yield* generateComponentSlot(options, ctx, node, slotDir);
    }
    else {
        yield* (0, elementChildren_1.generateElementChildren)(options, ctx, node);
    }
    if (options.vueCompilerOptions.fallthroughAttributes
        && (node.props.some(prop => prop.type === CompilerDOM.NodeTypes.DIRECTIVE && prop.name === 'bind' && prop.exp?.loc.source === '$attrs')
            || node === ctx.singleRootNode)) {
        ctx.inheritedAttrVars.add(`__VLS_intrinsicElements.${node.tag}`);
    }
}
function* generateFailedPropExps(options, ctx, failedPropExps) {
    for (const failedExp of failedPropExps) {
        yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', ctx.codeFeatures.all, failedExp.node.loc.source, failedExp.node.loc.start.offset, failedExp.node.loc, failedExp.prefix, failedExp.suffix);
        yield utils_1.endOfLine;
    }
}
function* generateVScope(options, ctx, node, props) {
    const vScope = props.find(prop => prop.type === CompilerDOM.NodeTypes.DIRECTIVE && (prop.name === 'scope' || prop.name === 'data'));
    let inScope = false;
    let originalConditionsNum = ctx.blockConditions.length;
    if (vScope?.type === CompilerDOM.NodeTypes.DIRECTIVE && vScope.exp) {
        const scopeVar = ctx.getInternalVariable();
        const condition = `__VLS_withScope(__VLS_ctx, ${scopeVar})`;
        yield `const ${scopeVar} = `;
        yield [
            vScope.exp.loc.source,
            'template',
            vScope.exp.loc.start.offset,
            ctx.codeFeatures.all,
        ];
        yield utils_1.endOfLine;
        yield `if (${condition}) {${utils_1.newLine}`;
        ctx.blockConditions.push(condition);
        inScope = true;
    }
    yield* (0, elementDirectives_1.generateElementDirectives)(options, ctx, node);
    const [refName, offset] = yield* generateReferencesForElements(options, ctx, node); // <el ref="foo" />
    yield* generateReferencesForScopedCssClasses(options, ctx, node);
    if (inScope) {
        yield `}${utils_1.newLine}`;
        ctx.blockConditions.length = originalConditionsNum;
    }
    return [refName, offset];
}
function getCanonicalComponentName(tagText) {
    return utils_1.variableNameRegex.test(tagText)
        ? tagText
        : (0, shared_1.capitalize)((0, shared_1.camelize)(tagText.replace(colonReg, '-')));
}
function getPossibleOriginalComponentNames(tagText, deduplicate) {
    const name1 = (0, shared_1.capitalize)((0, shared_1.camelize)(tagText));
    const name2 = (0, shared_1.camelize)(tagText);
    const name3 = tagText;
    const names = [name1];
    if (!deduplicate || name2 !== name1) {
        names.push(name2);
    }
    if (!deduplicate || name3 !== name2) {
        names.push(name3);
    }
    return names;
}
function* generateCanonicalComponentName(tagText, offset, features) {
    if (utils_1.variableNameRegex.test(tagText)) {
        yield [tagText, 'template', offset, features];
    }
    else {
        yield* (0, camelized_1.generateCamelized)((0, shared_1.capitalize)(tagText.replace(colonReg, '-')), offset, features);
    }
}
function* generateComponentGeneric(ctx) {
    if (ctx.lastGenericComment) {
        const { content, offset } = ctx.lastGenericComment;
        yield* (0, utils_1.wrapWith)(offset, offset + content.length, ctx.codeFeatures.verification, `<`, [
            content,
            'template',
            offset,
            ctx.codeFeatures.all
        ], `>`);
    }
    ctx.lastGenericComment = undefined;
}
function* generateComponentSlot(options, ctx, node, slotDir) {
    yield `{${utils_1.newLine}`;
    if (ctx.currentComponent) {
        ctx.currentComponent.used = true;
        ctx.hasSlotElements.add(ctx.currentComponent.node);
    }
    const slotBlockVars = [];
    yield `const {`;
    if (slotDir?.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION && slotDir.arg.content) {
        yield* (0, objectProperty_1.generateObjectProperty)(options, ctx, slotDir.arg.loc.source, slotDir.arg.loc.start.offset, slotDir.arg.isStatic ? ctx.codeFeatures.withoutHighlight : ctx.codeFeatures.all, slotDir.arg.loc, false, true);
    }
    else {
        yield* (0, utils_1.wrapWith)(slotDir.loc.start.offset, slotDir.loc.start.offset + (slotDir.rawName?.length ?? 0), ctx.codeFeatures.withoutHighlightAndCompletion, `default`);
    }
    yield `: __VLS_thisSlot } = ${ctx.currentComponent.ctxVar}.slots!${utils_1.endOfLine}`;
    if (slotDir?.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        const slotAst = (0, utils_1.createTsAst)(options.ts, slotDir, `(${slotDir.exp.content}) => {}`);
        (0, utils_1.collectVars)(options.ts, slotAst, slotAst, slotBlockVars);
        if (!slotDir.exp.content.includes(':')) {
            yield `const [`;
            yield [
                slotDir.exp.content,
                'template',
                slotDir.exp.loc.start.offset,
                ctx.codeFeatures.all,
            ];
            yield `] = __VLS_getSlotParams(__VLS_thisSlot)${utils_1.endOfLine}`;
        }
        else {
            yield `const `;
            yield [
                slotDir.exp.content,
                'template',
                slotDir.exp.loc.start.offset,
                ctx.codeFeatures.all,
            ];
            yield ` = __VLS_getSlotParam(__VLS_thisSlot)${utils_1.endOfLine}`;
        }
    }
    for (const varName of slotBlockVars) {
        ctx.addLocalVariable(varName);
    }
    yield* ctx.resetDirectiveComments('end of slot children start');
    let prev;
    for (const childNode of node.children) {
        yield* (0, templateChild_1.generateTemplateChild)(options, ctx, childNode, prev);
        prev = childNode;
    }
    for (const varName of slotBlockVars) {
        ctx.removeLocalVariable(varName);
    }
    let isStatic = true;
    if (slotDir?.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
        isStatic = slotDir.arg.isStatic;
    }
    if (isStatic && slotDir && !slotDir.arg) {
        yield `${ctx.currentComponent.ctxVar}.slots!['`;
        yield [
            '',
            'template',
            slotDir.loc.start.offset + (slotDir.loc.source.startsWith('#')
                ? '#'.length : slotDir.loc.source.startsWith('v-slot:')
                ? 'v-slot:'.length
                : 0),
            ctx.codeFeatures.completion,
        ];
        yield `'/* empty slot name completion */]${utils_1.newLine}`;
    }
    yield* ctx.generateAutoImportCompletion();
    yield `}${utils_1.newLine}`;
}
function* generateReferencesForElements(options, ctx, node) {
    for (const prop of node.props) {
        if (prop.type === CompilerDOM.NodeTypes.ATTRIBUTE
            && prop.name === 'ref'
            && prop.value) {
            const [content, startOffset] = normalizeAttributeValue(prop.value);
            yield `// @ts-ignore navigation for \`const ${content} = ref()\`${utils_1.newLine}`;
            yield `/** @type { typeof __VLS_ctx`;
            yield* (0, propertyAccess_1.generatePropertyAccess)(options, ctx, content, startOffset, ctx.codeFeatures.navigation, prop.value.loc);
            yield ` } */${utils_1.endOfLine}`;
            if (utils_1.variableNameRegex.test(content) && !options.templateRefNames.has(content)) {
                ctx.accessExternalVariable(content, startOffset);
            }
            return [content, startOffset];
        }
    }
    return [];
}
function* generateReferencesForScopedCssClasses(options, ctx, node) {
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
                const [content, startOffset] = normalizeAttributeValue(prop.value);
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
function camelizeComponentName(newName) {
    return (0, shared_1.camelize)('-' + newName);
}
function getTagRenameApply(oldName) {
    return oldName === (0, shared_2.hyphenateTag)(oldName) ? shared_2.hyphenateTag : undefined;
}
function normalizeAttributeValue(node) {
    let offset = node.loc.start.offset;
    let content = node.loc.source;
    if ((content.startsWith(`'`) && content.endsWith(`'`))
        || (content.startsWith(`"`) && content.endsWith(`"`))) {
        offset++;
        content = content.slice(1, -1);
    }
    return [content, offset];
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
//# sourceMappingURL=element.js.map