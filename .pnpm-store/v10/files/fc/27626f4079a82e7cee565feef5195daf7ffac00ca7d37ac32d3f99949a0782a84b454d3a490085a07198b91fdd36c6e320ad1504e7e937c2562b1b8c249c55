"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementProps = generateElementProps;
exports.generatePropExp = generatePropExp;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("@vue/shared");
const minimatch_1 = require("minimatch");
const muggle_string_1 = require("muggle-string");
const shared_2 = require("../../utils/shared");
const codeFeatures_1 = require("../codeFeatures");
const inlayHints_1 = require("../inlayHints");
const utils_1 = require("../utils");
const camelized_1 = require("../utils/camelized");
const unicode_1 = require("../utils/unicode");
const wrapWith_1 = require("../utils/wrapWith");
const elementDirectives_1 = require("./elementDirectives");
const elementEvents_1 = require("./elementEvents");
const interpolation_1 = require("./interpolation");
const objectProperty_1 = require("./objectProperty");
function* generateElementProps(options, ctx, node, props, strictPropsCheck, enableCodeFeatures, failedPropExps) {
    const isComponent = node.tagType === CompilerDOM.ElementTypes.COMPONENT;
    for (const prop of props) {
        if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && prop.name === 'on') {
            if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                && !prop.arg.loc.source.startsWith('[')
                && !prop.arg.loc.source.endsWith(']')) {
                if (!isComponent) {
                    yield `...{ `;
                    yield* (0, elementEvents_1.generateEventArg)(ctx, prop.arg.loc.source, prop.arg.loc.start.offset);
                    yield `: `;
                    yield* (0, elementEvents_1.generateEventExpression)(options, ctx, prop);
                    yield `},`;
                }
                else {
                    yield `...{ '${(0, shared_1.camelize)('on-' + prop.arg.loc.source)}': {} as any },`;
                }
                yield utils_1.newLine;
            }
            else if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                && prop.arg.loc.source.startsWith('[')
                && prop.arg.loc.source.endsWith(']')) {
                failedPropExps?.push({ node: prop.arg, prefix: `(`, suffix: `)` });
                failedPropExps?.push({ node: prop.exp, prefix: `() => {`, suffix: `}` });
            }
            else if (!prop.arg
                && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                failedPropExps?.push({ node: prop.exp, prefix: `(`, suffix: `)` });
            }
        }
    }
    for (const prop of props) {
        if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && ((prop.name === 'bind' && prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION)
                || prop.name === 'model')
            && (!prop.exp || prop.exp.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION)) {
            let propName;
            if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                propName = prop.arg.constType === CompilerDOM.ConstantTypes.CAN_STRINGIFY
                    ? prop.arg.content
                    : prop.arg.loc.source;
            }
            else {
                propName = getModelPropName(node, options.vueCompilerOptions);
            }
            if (propName === undefined
                || options.vueCompilerOptions.dataAttributes.some(pattern => (0, minimatch_1.minimatch)(propName, pattern))) {
                if (prop.exp && prop.exp.constType !== CompilerDOM.ConstantTypes.CAN_STRINGIFY) {
                    failedPropExps?.push({ node: prop.exp, prefix: `(`, suffix: `)` });
                }
                continue;
            }
            if (prop.name === 'bind'
                && prop.modifiers.some(m => m.content === 'prop' || m.content === 'attr')) {
                propName = propName.slice(1);
            }
            const shouldSpread = propName === 'style' || propName === 'class';
            const shouldCamelize = isComponent && getShouldCamelize(options, prop, propName);
            const codeInfo = getPropsCodeInfo(ctx, strictPropsCheck, shouldCamelize);
            if (shouldSpread) {
                yield `...{ `;
            }
            const codes = [...(0, wrapWith_1.wrapWith)(prop.loc.start.offset, prop.loc.end.offset, ctx.codeFeatures.verification, ...(prop.arg
                    ? (0, objectProperty_1.generateObjectProperty)(options, ctx, propName, prop.arg.loc.start.offset, codeInfo, prop.loc.name_2 ??= {}, shouldCamelize)
                    : (0, wrapWith_1.wrapWith)(prop.loc.start.offset, prop.loc.start.offset + 'v-model'.length, ctx.codeFeatures.withoutHighlightAndCompletion, propName)), `: `, ...generatePropExp(options, ctx, prop, prop.exp, ctx.codeFeatures.all, enableCodeFeatures))];
            if (enableCodeFeatures) {
                yield* codes;
            }
            else {
                yield (0, muggle_string_1.toString)(codes);
            }
            if (shouldSpread) {
                yield ` }`;
            }
            yield `,${utils_1.newLine}`;
            if (isComponent && prop.name === 'model' && prop.modifiers.length) {
                const propertyName = prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                    ? !prop.arg.isStatic
                        ? `[__VLS_tryAsConstant(\`$\{${prop.arg.content}\}Modifiers\`)]`
                        : (0, shared_1.camelize)(propName) + `Modifiers`
                    : `modelModifiers`;
                const codes = [...(0, elementDirectives_1.generateModifiers)(options, ctx, prop, propertyName)];
                if (enableCodeFeatures) {
                    yield* codes;
                }
                else {
                    yield (0, muggle_string_1.toString)(codes);
                }
                yield utils_1.newLine;
            }
        }
        else if (prop.type === CompilerDOM.NodeTypes.ATTRIBUTE) {
            if (options.vueCompilerOptions.dataAttributes.some(pattern => (0, minimatch_1.minimatch)(prop.name, pattern))
                // Vue 2 Transition doesn't support "persisted" property but `@vue/compiler-dom` always adds it (#3881)
                || (options.vueCompilerOptions.target < 3
                    && prop.name === 'persisted'
                    && node.tag.toLowerCase() === 'transition')) {
                continue;
            }
            const shouldSpread = prop.name === 'style' || prop.name === 'class';
            const shouldCamelize = isComponent && getShouldCamelize(options, prop, prop.name);
            const codeInfo = getPropsCodeInfo(ctx, strictPropsCheck, true);
            if (shouldSpread) {
                yield `...{ `;
            }
            const codes = [...(0, wrapWith_1.wrapWith)(prop.loc.start.offset, prop.loc.end.offset, ctx.codeFeatures.verification, ...(0, objectProperty_1.generateObjectProperty)(options, ctx, prop.name, prop.loc.start.offset, codeInfo, prop.loc.name_1 ??= {}, shouldCamelize), `: `, ...(prop.value
                    ? generateAttrValue(prop.value, ctx.codeFeatures.withoutNavigation)
                    : [`true`]))];
            if (enableCodeFeatures) {
                yield* codes;
            }
            else {
                yield (0, muggle_string_1.toString)(codes);
            }
            if (shouldSpread) {
                yield ` }`;
            }
            yield `,${utils_1.newLine}`;
        }
        else if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && prop.name === 'bind'
            && !prop.arg
            && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
            if (prop.exp.loc.source === '$attrs') {
                if (enableCodeFeatures) {
                    ctx.bindingAttrLocs.push(prop.exp.loc);
                }
            }
            else {
                const codes = [...(0, wrapWith_1.wrapWith)(prop.exp.loc.start.offset, prop.exp.loc.end.offset, ctx.codeFeatures.verification, `...`, ...generatePropExp(options, ctx, prop, prop.exp, ctx.codeFeatures.all, enableCodeFeatures))];
                if (enableCodeFeatures) {
                    yield* codes;
                }
                else {
                    yield (0, muggle_string_1.toString)(codes);
                }
                yield `,${utils_1.newLine}`;
            }
        }
    }
}
function* generatePropExp(options, ctx, prop, exp, features, enableCodeFeatures = true) {
    const isShorthand = prop.arg?.loc.start.offset === prop.exp?.loc.start.offset;
    if (isShorthand && features.completion) {
        features = {
            ...features,
            completion: undefined,
        };
    }
    if (exp && exp.constType !== CompilerDOM.ConstantTypes.CAN_STRINGIFY) { // style='z-index: 2' will compile to {'z-index':'2'}
        if (!isShorthand) { // vue 3.4+
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, 'template', features, exp.loc.source, exp.loc.start.offset, exp.loc, `(`, `)`);
        }
        else {
            const propVariableName = (0, shared_1.camelize)(exp.loc.source);
            if (utils_1.identifierRegex.test(propVariableName)) {
                const isDestructuredProp = options.destructuredPropNames?.has(propVariableName) ?? false;
                const isTemplateRef = options.templateRefNames?.has(propVariableName) ?? false;
                const codes = (0, camelized_1.generateCamelized)(exp.loc.source, 'template', exp.loc.start.offset, features);
                if (ctx.hasLocalVariable(propVariableName) || isDestructuredProp) {
                    yield* codes;
                }
                else {
                    ctx.accessExternalVariable(propVariableName, exp.loc.start.offset);
                    if (isTemplateRef) {
                        yield `__VLS_unref(`;
                        yield* codes;
                        yield `)`;
                    }
                    else {
                        yield `__VLS_ctx.`;
                        yield* codes;
                    }
                }
                if (enableCodeFeatures) {
                    ctx.inlayHints.push((0, inlayHints_1.createVBindShorthandInlayHintInfo)(prop.loc, propVariableName));
                }
            }
        }
    }
    else {
        yield `{}`;
    }
}
function* generateAttrValue(attrNode, features) {
    const quote = attrNode.loc.source.startsWith("'") ? "'" : '"';
    yield quote;
    let start = attrNode.loc.start.offset;
    let content = attrNode.loc.source;
    if ((content.startsWith('"') && content.endsWith('"'))
        || (content.startsWith("'") && content.endsWith("'"))) {
        start++;
        content = content.slice(1, -1);
    }
    yield* (0, unicode_1.generateUnicode)(content, start, features);
    yield quote;
}
function getShouldCamelize(options, prop, propName) {
    return (prop.type !== CompilerDOM.NodeTypes.DIRECTIVE
        || !prop.arg
        || (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION && prop.arg.isStatic))
        && (0, shared_2.hyphenateAttr)(propName) === propName
        && !options.vueCompilerOptions.htmlAttributes.some(pattern => (0, minimatch_1.minimatch)(propName, pattern));
}
function getPropsCodeInfo(ctx, strictPropsCheck, shouldCamelize) {
    return ctx.resolveCodeFeatures({
        ...codeFeatures_1.codeFeatures.withoutHighlightAndCompletion,
        navigation: {
            resolveRenameNewName: shared_1.camelize,
            resolveRenameEditText: shouldCamelize ? shared_2.hyphenateAttr : undefined,
        },
        verification: strictPropsCheck || {
            shouldReport(_source, code) {
                // https://typescript.tv/errors/#ts2353
                // https://typescript.tv/errors/#ts2561
                if (String(code) === '2353' || String(code) === '2561') {
                    return false;
                }
                return true;
            },
        },
    });
}
function getModelPropName(node, vueCompilerOptions) {
    for (const modelName in vueCompilerOptions.experimentalModelPropName) {
        const tags = vueCompilerOptions.experimentalModelPropName[modelName];
        for (const tag in tags) {
            if (node.tag === tag || node.tag === (0, shared_2.hyphenateTag)(tag)) {
                const val = tags[tag];
                if (typeof val === 'object') {
                    const arr = Array.isArray(val) ? val : [val];
                    for (const attrs of arr) {
                        let failed = false;
                        for (const attr in attrs) {
                            const attrNode = node.props.find(prop => prop.type === CompilerDOM.NodeTypes.ATTRIBUTE && prop.name === attr);
                            if (!attrNode || attrNode.value?.content !== attrs[attr]) {
                                failed = true;
                                break;
                            }
                        }
                        if (!failed) {
                            // all match
                            return modelName || undefined;
                        }
                    }
                }
            }
        }
    }
    for (const modelName in vueCompilerOptions.experimentalModelPropName) {
        const tags = vueCompilerOptions.experimentalModelPropName[modelName];
        for (const tag in tags) {
            if (node.tag === tag || node.tag === (0, shared_2.hyphenateTag)(tag)) {
                const attrs = tags[tag];
                if (attrs === true) {
                    return modelName || undefined;
                }
            }
        }
    }
    return vueCompilerOptions.target < 3 ? 'value' : 'modelValue';
}
//# sourceMappingURL=elementProps.js.map