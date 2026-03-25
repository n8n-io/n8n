"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTemplate = generateTemplate;
exports.generateTemplateDirectives = generateTemplateDirectives;
exports.getTemplateUsageVars = getTemplateUsageVars;
const shared_1 = require("../../utils/shared");
const codeFeatures_1 = require("../codeFeatures");
const modules_1 = require("../style/modules");
const scopedClasses_1 = require("../style/scopedClasses");
const context_1 = require("../template/context");
const interpolation_1 = require("../template/interpolation");
const styleScopedClasses_1 = require("../template/styleScopedClasses");
const utils_1 = require("../utils");
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
            codeFeatures_1.codeFeatures.navigation,
        ];
        yield utils_1.endOfLine;
        types.push(`typeof __VLS_componentsOption`);
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
            codeFeatures_1.codeFeatures.navigation,
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
    yield* (0, scopedClasses_1.generateStyleScopedClasses)(options, templateCodegenCtx);
    yield* (0, styleScopedClasses_1.generateStyleScopedClassReferences)(templateCodegenCtx, true);
    yield* (0, modules_1.generateStyleModules)(options);
    yield* generateCssVars(options, templateCodegenCtx);
    if (options.templateCodegen) {
        yield* options.templateCodegen.codes;
    }
    else {
        yield `// no template${utils_1.newLine}`;
        if (!options.scriptSetupRanges?.defineSlots) {
            yield `type __VLS_Slots = {}${utils_1.endOfLine}`;
        }
        yield `type __VLS_InheritedAttrs = {}${utils_1.endOfLine}`;
        yield `type __VLS_TemplateRefs = {}${utils_1.endOfLine}`;
        yield `type __VLS_RootEl = any${utils_1.endOfLine}`;
    }
}
function* generateCssVars(options, ctx) {
    if (!options.sfc.styles.length) {
        return;
    }
    yield `// CSS variable injection ${utils_1.newLine}`;
    for (const style of options.sfc.styles) {
        for (const cssBind of style.cssVars) {
            yield* (0, interpolation_1.generateInterpolation)(options, ctx, style.name, codeFeatures_1.codeFeatures.all, cssBind.text, cssBind.offset);
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