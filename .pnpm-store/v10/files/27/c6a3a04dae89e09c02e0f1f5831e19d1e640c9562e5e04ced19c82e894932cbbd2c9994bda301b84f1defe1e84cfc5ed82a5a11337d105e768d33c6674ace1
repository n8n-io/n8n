"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTemplateDirectives = generateTemplateDirectives;
exports.generateTemplate = generateTemplate;
exports.generateCssClassProperty = generateCssClassProperty;
exports.getTemplateUsageVars = getTemplateUsageVars;
const path = require("path-browserify");
const shared_1 = require("../../utils/shared");
const common_1 = require("../common");
const context_1 = require("../template/context");
const interpolation_1 = require("../template/interpolation");
const styleScopedClasses_1 = require("../template/styleScopedClasses");
const index_1 = require("./index");
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
        yield `${common_1.endOfLine}`;
    }
    else {
        yield `{${common_1.newLine}`;
        for (const exp of exps) {
            yield `...`;
            yield exp;
            yield `,${common_1.newLine}`;
        }
        yield `}${common_1.endOfLine}`;
    }
}
function* generateTemplateComponents(options) {
    const exps = [];
    if (options.sfc.script && options.scriptRanges?.exportDefault?.componentsOption) {
        const { componentsOption } = options.scriptRanges.exportDefault;
        exps.push([
            options.sfc.script.content.substring(componentsOption.start, componentsOption.end),
            'script',
            componentsOption.start,
            index_1.codeFeatures.navigation,
        ]);
    }
    let nameType;
    if (options.sfc.script && options.scriptRanges?.exportDefault?.nameOption) {
        const { nameOption } = options.scriptRanges.exportDefault;
        nameType = options.sfc.script.content.substring(nameOption.start, nameOption.end);
    }
    else if (options.sfc.scriptSetup) {
        const baseName = path.basename(options.fileName);
        nameType = `'${options.scriptSetupRanges?.options.name ?? baseName.substring(0, baseName.lastIndexOf('.'))}'`;
    }
    if (nameType) {
        exps.push(`{} as {
			[K in ${nameType}]: typeof __VLS_self
				& (new () => {
					${(0, shared_1.getSlotsPropertyName)(options.vueCompilerOptions.target)}: typeof ${options.scriptSetupRanges?.slots?.name ?? '__VLS_slots'}
				})
		}`);
    }
    exps.push(`{} as NonNullable<typeof __VLS_self extends { components: infer C } ? C : {}>`);
    exps.push(`__VLS_ctx`);
    yield `const __VLS_localComponents = {${common_1.newLine}`;
    for (const type of exps) {
        yield `...`;
        yield type;
        yield `,${common_1.newLine}`;
    }
    yield `}${common_1.endOfLine}`;
    yield `let __VLS_components!: typeof __VLS_localComponents & __VLS_GlobalComponents${common_1.endOfLine}`;
}
function* generateTemplateDirectives(options) {
    const exps = [];
    if (options.sfc.script && options.scriptRanges?.exportDefault?.directivesOption) {
        const { directivesOption } = options.scriptRanges.exportDefault;
        exps.push([
            options.sfc.script.content.substring(directivesOption.start, directivesOption.end),
            'script',
            directivesOption.start,
            index_1.codeFeatures.navigation,
        ]);
    }
    exps.push(`{} as NonNullable<typeof __VLS_self extends { directives: infer D } ? D : {}>`);
    exps.push(`__VLS_ctx`);
    yield `const __VLS_localDirectives = {${common_1.newLine}`;
    for (const type of exps) {
        yield `...`;
        yield type;
        yield `,${common_1.newLine}`;
    }
    yield `}${common_1.endOfLine}`;
    yield `let __VLS_directives!: typeof __VLS_localDirectives & __VLS_GlobalDirectives${common_1.endOfLine}`;
}
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
function* generateTemplateBody(options, templateCodegenCtx) {
    const firstClasses = new Set();
    yield `let __VLS_styleScopedClasses!: {}`;
    for (let i = 0; i < options.sfc.styles.length; i++) {
        const style = options.sfc.styles[i];
        const option = options.vueCompilerOptions.experimentalResolveStyleCssClasses;
        if (option === 'always' || (option === 'scoped' && style.scoped)) {
            for (const className of style.classNames) {
                if (firstClasses.has(className.text)) {
                    templateCodegenCtx.scopedClasses.push({
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
    yield common_1.endOfLine;
    yield* (0, styleScopedClasses_1.generateStyleScopedClasses)(templateCodegenCtx, true);
    yield* generateCssVars(options, templateCodegenCtx);
    if (options.templateCodegen) {
        for (const code of options.templateCodegen.codes) {
            yield code;
        }
    }
    else {
        yield `// no template${common_1.newLine}`;
        if (!options.scriptSetupRanges?.slots.define) {
            yield `const __VLS_slots = {}${common_1.endOfLine}`;
        }
        yield `const __VLS_inheritedAttrs = {}${common_1.endOfLine}`;
        yield `const $refs = {}${common_1.endOfLine}`;
        yield `const $el = {} as any${common_1.endOfLine}`;
    }
    yield `return {${common_1.newLine}`;
    yield `	attrs: {} as Partial<typeof __VLS_inheritedAttrs>,${common_1.newLine}`;
    yield `	slots: ${options.scriptSetupRanges?.slots.name ?? '__VLS_slots'},${common_1.newLine}`;
    yield `	refs: $refs,${common_1.newLine}`;
    yield `	rootEl: $el,${common_1.newLine}`;
    yield `}${common_1.endOfLine}`;
}
function* generateCssClassProperty(styleIndex, classNameWithDot, offset, propertyType, optional) {
    yield `${common_1.newLine} & { `;
    yield [
        '',
        'style_' + styleIndex,
        offset,
        index_1.codeFeatures.navigation,
    ];
    yield `'`;
    yield [
        classNameWithDot.substring(1),
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
    yield `// CSS variable injection ${common_1.newLine}`;
    for (const style of options.sfc.styles) {
        for (const cssBind of style.cssVars) {
            for (const [segment, offset, onlyError] of (0, interpolation_1.forEachInterpolationSegment)(options.ts, undefined, undefined, ctx, cssBind.text, cssBind.offset, options.ts.createSourceFile('/a.txt', cssBind.text, 99))) {
                if (offset === undefined) {
                    yield segment;
                }
                else {
                    yield [
                        segment,
                        style.name,
                        cssBind.offset + offset,
                        onlyError
                            ? index_1.codeFeatures.navigation
                            : index_1.codeFeatures.all,
                    ];
                }
            }
            yield common_1.endOfLine;
        }
    }
    yield `// CSS variable injection end ${common_1.newLine}`;
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
            if (component.indexOf('.') >= 0) {
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