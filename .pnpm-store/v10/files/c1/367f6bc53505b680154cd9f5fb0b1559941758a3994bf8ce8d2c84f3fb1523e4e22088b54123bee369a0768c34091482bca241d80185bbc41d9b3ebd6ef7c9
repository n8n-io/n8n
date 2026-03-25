"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTemplate = generateTemplate;
exports.generateTemplateDirectives = generateTemplateDirectives;
exports.generateCssClassProperty = generateCssClassProperty;
exports.getTemplateUsageVars = getTemplateUsageVars;
const path = require("path-browserify");
const shared_1 = require("../../utils/shared");
const context_1 = require("../template/context");
const interpolation_1 = require("../template/interpolation");
const styleScopedClasses_1 = require("../template/styleScopedClasses");
const utils_1 = require("../utils");
const index_1 = require("./index");
function* generateTemplate(options, ctx) {
    ctx.generatedTemplate = true;
    const templateCodegenCtx = (0, context_1.createTemplateCodegenContext)({
        scriptSetupBindingNames: new Set(),
        edited: options.edited,
    });
    yield* generateTemplateCtx(options);
    yield* generateTemplateComponents(options);
    yield* generateTemplateDirectives(options);
    yield* generateTemplateBody(options, templateCodegenCtx);
    return templateCodegenCtx;
}
function* generateTemplateCtx(options) {
    const exps = [];
    exps.push(`{} as InstanceType<__VLS_PickNotAny<typeof __VLS_self, new () => {}>>`);
    if (options.vueCompilerOptions.petiteVueExtensions.some(ext => options.fileName.endsWith(ext))) {
        exps.push(`globalThis`);
    }
    if (options.sfc.styles.some(style => style.module)) {
        exps.push(`{} as __VLS_StyleModules`);
    }
    yield `const __VLS_ctx = `;
    if (exps.length === 1) {
        yield exps[0];
        yield `${utils_1.endOfLine}`;
    }
    else {
        yield `{${utils_1.newLine}`;
        for (const exp of exps) {
            yield `...`;
            yield exp;
            yield `,${utils_1.newLine}`;
        }
        yield `}${utils_1.endOfLine}`;
    }
}
function* generateTemplateComponents(options) {
    const types = [];
    if (options.sfc.script && options.scriptRanges?.exportDefault?.componentsOption) {
        const { componentsOption } = options.scriptRanges.exportDefault;
        yield `const __VLS_componentsOption = `;
        yield [
            options.sfc.script.content.slice(componentsOption.start, componentsOption.end),
            'script',
            componentsOption.start,
            index_1.codeFeatures.navigation,
        ];
        yield utils_1.endOfLine;
        types.push(`typeof __VLS_componentsOption`);
    }
    let nameType;
    if (options.sfc.script && options.scriptRanges?.exportDefault?.nameOption) {
        const { nameOption } = options.scriptRanges.exportDefault;
        nameType = options.sfc.script.content.slice(nameOption.start, nameOption.end);
    }
    else if (options.sfc.scriptSetup) {
        const baseName = path.basename(options.fileName);
        nameType = `'${options.scriptSetupRanges?.defineOptions?.name ?? baseName.slice(0, baseName.lastIndexOf('.'))}'`;
    }
    if (nameType) {
        types.push(`{ [K in ${nameType}]: typeof __VLS_self & (new () => { `
            + (0, shared_1.getSlotsPropertyName)(options.vueCompilerOptions.target)
            + `: typeof ${options.scriptSetupRanges?.defineSlots?.name ?? `__VLS_slots`} }) }`);
    }
    types.push(`typeof __VLS_ctx`);
    yield `type __VLS_LocalComponents =`;
    for (const type of types) {
        yield ` & `;
        yield type;
    }
    yield utils_1.endOfLine;
    yield `let __VLS_components!: __VLS_LocalComponents & __VLS_GlobalComponents${utils_1.endOfLine}`;
}
function* generateTemplateDirectives(options) {
    const types = [];
    if (options.sfc.script && options.scriptRanges?.exportDefault?.directivesOption) {
        const { directivesOption } = options.scriptRanges.exportDefault;
        yield `const __VLS_directivesOption = `;
        yield [
            options.sfc.script.content.slice(directivesOption.start, directivesOption.end),
            'script',
            directivesOption.start,
            index_1.codeFeatures.navigation,
        ];
        yield utils_1.endOfLine;
        types.push(`typeof __VLS_directivesOption`);
    }
    types.push(`typeof __VLS_ctx`);
    yield `type __VLS_LocalDirectives =`;
    for (const type of types) {
        yield ` & `;
        yield type;
    }
    yield utils_1.endOfLine;
    yield `let __VLS_directives!: __VLS_LocalDirectives & __VLS_GlobalDirectives${utils_1.endOfLine}`;
}
function* generateTemplateBody(options, templateCodegenCtx) {
    yield* generateStyleScopedClasses(options, templateCodegenCtx);
    yield* (0, styleScopedClasses_1.generateStyleScopedClassReferences)(templateCodegenCtx, true);
    yield* generateCssVars(options, templateCodegenCtx);
    if (options.templateCodegen) {
        for (const code of options.templateCodegen.codes) {
            yield code;
        }
    }
    else {
        yield `// no template${utils_1.newLine}`;
        if (!options.scriptSetupRanges?.defineSlots) {
            yield `const __VLS_slots = {}${utils_1.endOfLine}`;
        }
        yield `const __VLS_inheritedAttrs = {}${utils_1.endOfLine}`;
        yield `const $refs = {}${utils_1.endOfLine}`;
        yield `const $el = {} as any${utils_1.endOfLine}`;
    }
    yield `return {${utils_1.newLine}`;
    yield `	attrs: {} as Partial<typeof __VLS_inheritedAttrs>,${utils_1.newLine}`;
    yield `	slots: ${options.scriptSetupRanges?.defineSlots?.name ?? '__VLS_slots'},${utils_1.newLine}`;
    yield `	refs: $refs,${utils_1.newLine}`;
    yield `	rootEl: $el,${utils_1.newLine}`;
    yield `}${utils_1.endOfLine}`;
}
function* generateStyleScopedClasses(options, ctx) {
    const firstClasses = new Set();
    yield `type __VLS_StyleScopedClasses = {}`;
    for (let i = 0; i < options.sfc.styles.length; i++) {
        const style = options.sfc.styles[i];
        const option = options.vueCompilerOptions.experimentalResolveStyleCssClasses;
        if (option === 'always' || (option === 'scoped' && style.scoped)) {
            for (const className of style.classNames) {
                if (firstClasses.has(className.text)) {
                    ctx.scopedClasses.push({
                        source: 'style_' + i,
                        className: className.text.slice(1),
                        offset: className.offset + 1
                    });
                    continue;
                }
                firstClasses.add(className.text);
                yield* generateCssClassProperty(i, className.text, className.offset, 'boolean', true);
            }
        }
    }
    yield utils_1.endOfLine;
}
function* generateCssClassProperty(styleIndex, classNameWithDot, offset, propertyType, optional) {
    yield `${utils_1.newLine} & { `;
    yield [
        '',
        'style_' + styleIndex,
        offset,
        index_1.codeFeatures.navigation,
    ];
    yield `'`;
    yield [
        classNameWithDot.slice(1),
        'style_' + styleIndex,
        offset + 1,
        index_1.codeFeatures.navigation,
    ];
    yield `'`;
    yield [
        '',
        'style_' + styleIndex,
        offset + classNameWithDot.length,
        index_1.codeFeatures.navigationWithoutRename,
    ];
    yield `${optional ? '?' : ''}: ${propertyType}`;
    yield ` }`;
}
function* generateCssVars(options, ctx) {
    if (!options.sfc.styles.length) {
        return;
    }
    yield `// CSS variable injection ${utils_1.newLine}`;
    for (const style of options.sfc.styles) {
        for (const cssBind of style.cssVars) {
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, style.name, index_1.codeFeatures.all, cssBind.text, cssBind.offset);
            yield utils_1.endOfLine;
        }
    }
    yield `// CSS variable injection end ${utils_1.newLine}`;
}
function getTemplateUsageVars(options, ctx) {
    const usageVars = new Set();
    const components = new Set(options.sfc.template?.ast?.components);
    if (options.templateCodegen) {
        // fix import components unused report
        for (const varName of ctx.bindingNames) {
            if (components.has(varName) || components.has((0, shared_1.hyphenateTag)(varName))) {
                usageVars.add(varName);
            }
        }
        for (const component of components) {
            if (component.includes('.')) {
                usageVars.add(component.split('.')[0]);
            }
        }
        for (const [varName] of options.templateCodegen.accessExternalVariables) {
            usageVars.add(varName);
        }
    }
    return usageVars;
}
//# sourceMappingURL=template.js.map