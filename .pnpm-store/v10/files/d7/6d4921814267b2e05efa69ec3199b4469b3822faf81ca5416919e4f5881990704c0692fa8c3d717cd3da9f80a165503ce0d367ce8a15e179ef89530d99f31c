"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateElementProps = generateElementProps;
const CompilerDOM = require("@vue/compiler-dom");
const shared_1 = require("@vue/shared");
const minimatch_1 = require("minimatch");
const muggle_string_1 = require("muggle-string");
const shared_2 = require("../../utils/shared");
const common_1 = require("../common");
const camelized_1 = require("./camelized");
const elementEvents_1 = require("./elementEvents");
const interpolation_1 = require("./interpolation");
const objectProperty_1 = require("./objectProperty");
const inlayHints_1 = require("../inlayHints");
function* generateElementProps(options, ctx, node, props, enableCodeFeatures, propsFailedExps) {
    const isComponent = node.tagType === CompilerDOM.ElementTypes.COMPONENT;
    for (const prop of props) {
        if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && prop.name === 'on') {
            if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                && !prop.arg.loc.source.startsWith('[')
                && !prop.arg.loc.source.endsWith(']')) {
                if (!isComponent) {
                    yield `...{ `;
                    yield* (0, elementEvents_1.generateEventArg)(ctx, prop.arg, true);
                    yield `: `;
                    yield* (0, elementEvents_1.generateEventExpression)(options, ctx, prop);
                    yield `}, `;
                }
                else {
                    yield `...{ '${(0, shared_1.camelize)('on-' + prop.arg.loc.source)}': {} as any }, `;
                }
            }
            else if (prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION
                && prop.arg.loc.source.startsWith('[')
                && prop.arg.loc.source.endsWith(']')) {
                propsFailedExps?.push({ node: prop.arg, prefix: '(', suffix: ')' });
                propsFailedExps?.push({ node: prop.exp, prefix: '() => {', suffix: '}' });
            }
            else if (!prop.arg
                && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
                propsFailedExps?.push({ node: prop.exp, prefix: '(', suffix: ')' });
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
                propName = getModelValuePropName(node, options.vueCompilerOptions.target, options.vueCompilerOptions);
            }
            if (propName === undefined
                || options.vueCompilerOptions.dataAttributes.some(pattern => (0, minimatch_1.minimatch)(propName, pattern))) {
                if (prop.exp && prop.exp.constType !== CompilerDOM.ConstantTypes.CAN_STRINGIFY) {
                    propsFailedExps?.push({ node: prop.exp, prefix: '(', suffix: ')' });
                }
                continue;
            }
            if (prop.modifiers.some(m => m.content === 'prop' || m.content === 'attr')) {
                propName = propName.substring(1);
            }
            const shouldSpread = propName === 'style' || propName === 'class';
            const shouldCamelize = isComponent
                && (!prop.arg || (prop.arg.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION && prop.arg.isStatic)) // isStatic
                && (0, shared_2.hyphenateAttr)(propName) === propName
                && !options.vueCompilerOptions.htmlAttributes.some(pattern => (0, minimatch_1.minimatch)(propName, pattern));
            if (shouldSpread) {
                yield `...{ `;
            }
            const codeInfo = ctx.codeFeatures.withoutHighlightAndCompletion;
            const codes = (0, common_1.wrapWith)(prop.loc.start.offset, prop.loc.end.offset, ctx.codeFeatures.verification, ...(prop.arg
                ? (0, objectProperty_1.generateObjectProperty)(options, ctx, propName, prop.arg.loc.start.offset, {
                    ...codeInfo,
                    verification: options.vueCompilerOptions.strictTemplates
                        ? codeInfo.verification
                        : {
                            shouldReport(_source, code) {
                                if (String(code) === '2353' || String(code) === '2561') {
                                    return false;
                                }
                                return typeof codeInfo.verification === 'object'
                                    ? codeInfo.verification.shouldReport?.(_source, code) ?? true
                                    : true;
                            },
                        },
                    navigation: codeInfo.navigation
                        ? {
                            resolveRenameNewName: shared_1.camelize,
                            resolveRenameEditText: shouldCamelize ? shared_2.hyphenateAttr : undefined,
                        }
                        : false,
                }, prop.loc.name_2 ?? (prop.loc.name_2 = {}), shouldCamelize)
                : (0, common_1.wrapWith)(prop.loc.start.offset, prop.loc.start.offset + 'v-model'.length, ctx.codeFeatures.verification, propName)), `: (`, ...generatePropExp(options, ctx, prop, prop.exp, ctx.codeFeatures.all, prop.arg?.loc.start.offset === prop.exp?.loc.start.offset, enableCodeFeatures), `)`);
            if (!enableCodeFeatures) {
                yield (0, muggle_string_1.toString)([...codes]);
            }
            else {
                yield* codes;
            }
            if (shouldSpread) {
                yield ` }`;
            }
            yield `, `;
        }
        else if (prop.type === CompilerDOM.NodeTypes.ATTRIBUTE) {
            if (options.vueCompilerOptions.dataAttributes.some(pattern => (0, minimatch_1.minimatch)(prop.name, pattern))
                // Vue 2 Transition doesn't support "persisted" property but `@vue/compiler-dom always adds it (#3881)
                || (options.vueCompilerOptions.target < 3
                    && prop.name === 'persisted'
                    && node.tag.toLowerCase() === 'transition')) {
                continue;
            }
            const shouldSpread = prop.name === 'style' || prop.name === 'class';
            const shouldCamelize = isComponent
                && (0, shared_2.hyphenateAttr)(prop.name) === prop.name
                && !options.vueCompilerOptions.htmlAttributes.some(pattern => (0, minimatch_1.minimatch)(prop.name, pattern));
            if (shouldSpread) {
                yield `...{ `;
            }
            const codeInfo = shouldCamelize
                ? {
                    ...ctx.codeFeatures.withoutHighlightAndCompletion,
                    navigation: ctx.codeFeatures.withoutHighlightAndCompletion.navigation
                        ? {
                            resolveRenameNewName: shared_1.camelize,
                            resolveRenameEditText: shared_2.hyphenateAttr,
                        }
                        : false,
                }
                : {
                    ...ctx.codeFeatures.withoutHighlightAndCompletion,
                };
            if (!options.vueCompilerOptions.strictTemplates) {
                const verification = codeInfo.verification;
                codeInfo.verification = {
                    shouldReport(_source, code) {
                        if (String(code) === '2353' || String(code) === '2561') {
                            return false;
                        }
                        return typeof verification === 'object'
                            ? verification.shouldReport?.(_source, code) ?? true
                            : true;
                    },
                };
            }
            const codes = (0, common_1.conditionWrapWith)(enableCodeFeatures, prop.loc.start.offset, prop.loc.end.offset, ctx.codeFeatures.verification, ...(0, objectProperty_1.generateObjectProperty)(options, ctx, prop.name, prop.loc.start.offset, codeInfo, prop.loc.name_1 ?? (prop.loc.name_1 = {}), shouldCamelize), `: (`, ...(prop.value
                ? generateAttrValue(prop.value, ctx.codeFeatures.all)
                : [`true`]), `)`);
            if (!enableCodeFeatures) {
                yield (0, muggle_string_1.toString)([...codes]);
            }
            else {
                yield* codes;
            }
            if (shouldSpread) {
                yield ` }`;
            }
            yield `, `;
        }
        else if (prop.type === CompilerDOM.NodeTypes.DIRECTIVE
            && prop.name === 'bind'
            && !prop.arg
            && prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
            const codes = (0, common_1.conditionWrapWith)(enableCodeFeatures, prop.exp.loc.start.offset, prop.exp.loc.end.offset, ctx.codeFeatures.verification, `...`, ...(0, interpolation_1.generateInterpolation)(options, ctx, prop.exp.content, prop.exp.loc, prop.exp.loc.start.offset, ctx.codeFeatures.all, '(', ')'));
            if (!enableCodeFeatures) {
                yield (0, muggle_string_1.toString)([...codes]);
            }
            else {
                yield* codes;
            }
            yield `, `;
        }
        else {
            // comment this line to avoid affecting comments in prop expressions
            // tsCodeGen.addText("/* " + [prop.type, prop.name, prop.arg?.loc.source, prop.exp?.loc.source, prop.loc.source].join(", ") + " */ ");
        }
    }
}
function* generatePropExp(options, ctx, prop, exp, features, isShorthand, enableCodeFeatures) {
    if (isShorthand && features.completion) {
        features = {
            ...features,
            completion: undefined,
        };
    }
    if (exp && exp.constType !== CompilerDOM.ConstantTypes.CAN_STRINGIFY) { // style='z-index: 2' will compile to {'z-index':'2'}
        if (!isShorthand) { // vue 3.4+
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, exp.loc.source, exp.loc, exp.loc.start.offset, features, '(', ')');
        }
        else {
            const propVariableName = (0, shared_1.camelize)(exp.loc.source);
            if (common_1.variableNameRegex.test(propVariableName)) {
                if (!ctx.hasLocalVariable(propVariableName)) {
                    ctx.accessExternalVariable(propVariableName, exp.loc.start.offset);
                    yield `__VLS_ctx.`;
                }
                yield* (0, camelized_1.generateCamelized)(exp.loc.source, exp.loc.start.offset, features);
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
    const char = attrNode.loc.source.startsWith("'") ? "'" : '"';
    yield char;
    let start = attrNode.loc.start.offset;
    let end = attrNode.loc.end.offset;
    let content = attrNode.loc.source;
    if ((content.startsWith('"') && content.endsWith('"'))
        || (content.startsWith("'") && content.endsWith("'"))) {
        start++;
        end--;
        content = content.slice(1, -1);
    }
    if (needToUnicode(content)) {
        yield* (0, common_1.wrapWith)(start, end, features, toUnicode(content));
    }
    else {
        yield [content, 'template', start, features];
    }
    yield char;
}
function needToUnicode(str) {
    return str.includes('\\') || str.includes('\n');
}
function toUnicode(str) {
    return str.split('').map(value => {
        const temp = value.charCodeAt(0).toString(16).padStart(4, '0');
        if (temp.length > 2) {
            return '\\u' + temp;
        }
        return value;
    }).join('');
}
function getModelValuePropName(node, vueVersion, vueCompilerOptions) {
    for (const modelName in vueCompilerOptions.experimentalModelPropName) {
        const tags = vueCompilerOptions.experimentalModelPropName[modelName];
        for (const tag in tags) {
            if (node.tag === tag || node.tag === (0, shared_2.hyphenateTag)(tag)) {
                const v = tags[tag];
                if (typeof v === 'object') {
                    const arr = Array.isArray(v) ? v : [v];
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
    return vueVersion < 3 ? 'value' : 'modelValue';
}
//# sourceMappingURL=elementProps.js.map