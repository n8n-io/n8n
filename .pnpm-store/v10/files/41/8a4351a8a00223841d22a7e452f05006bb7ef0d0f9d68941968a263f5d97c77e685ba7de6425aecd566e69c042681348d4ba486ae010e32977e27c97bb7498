"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComponent = generateComponent;
exports.generateComponentSetupReturns = generateComponentSetupReturns;
exports.generateEmitsOption = generateEmitsOption;
exports.generatePropsOption = generatePropsOption;
const codeFeatures_1 = require("../codeFeatures");
const utils_1 = require("../utils");
function* generateComponent(options, ctx, scriptSetup, scriptSetupRanges) {
    if (options.sfc.script && options.scriptRanges?.exportDefault && options.scriptRanges.exportDefault.expression.start !== options.scriptRanges.exportDefault.args.start) {
        // use defineComponent() from user space code if it exist
        yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, options.scriptRanges.exportDefault.expression.start, options.scriptRanges.exportDefault.args.start, codeFeatures_1.codeFeatures.all);
        yield `{${utils_1.newLine}`;
    }
    else {
        yield `(await import('${options.vueCompilerOptions.lib}')).defineComponent({${utils_1.newLine}`;
    }
    yield `setup() {${utils_1.newLine}`;
    yield `return {${utils_1.newLine}`;
    if (ctx.bypassDefineComponent) {
        yield* generateComponentSetupReturns(scriptSetupRanges);
    }
    if (scriptSetupRanges.defineExpose) {
        yield `...__VLS_exposed,${utils_1.newLine}`;
    }
    yield `}${utils_1.endOfLine}`;
    yield `},${utils_1.newLine}`;
    if (!ctx.bypassDefineComponent) {
        const emitOptionCodes = [...generateEmitsOption(options, scriptSetupRanges)];
        yield* emitOptionCodes;
        yield* generatePropsOption(options, ctx, scriptSetup, scriptSetupRanges, !!emitOptionCodes.length, true);
    }
    if (options.vueCompilerOptions.target >= 3.5
        && options.vueCompilerOptions.inferComponentDollarRefs
        && options.templateCodegen?.templateRefs.size) {
        yield `__typeRefs: {} as __VLS_TemplateRefs,${utils_1.newLine}`;
    }
    if (options.vueCompilerOptions.target >= 3.5
        && options.vueCompilerOptions.inferComponentDollarEl
        && options.templateCodegen?.singleRootElTypes.length) {
        yield `__typeEl: {} as __VLS_RootEl,${utils_1.newLine}`;
    }
    if (options.sfc.script && options.scriptRanges?.exportDefault?.args) {
        const { args } = options.scriptRanges.exportDefault;
        yield (0, utils_1.generateSfcBlockSection)(options.sfc.script, args.start + 1, args.end - 1, codeFeatures_1.codeFeatures.all);
    }
    yield `})`;
}
function* generateComponentSetupReturns(scriptSetupRanges) {
    // fill $props
    if (scriptSetupRanges.defineProps) {
        // NOTE: defineProps is inaccurate for $props
        yield `$props: __VLS_makeOptional(${scriptSetupRanges.defineProps.name ?? `__VLS_props`}),${utils_1.newLine}`;
        yield `...${scriptSetupRanges.defineProps.name ?? `__VLS_props`},${utils_1.newLine}`;
    }
    // fill $emit
    if (scriptSetupRanges.defineEmits) {
        yield `$emit: ${scriptSetupRanges.defineEmits.name ?? '__VLS_emit'},${utils_1.newLine}`;
    }
}
function* generateEmitsOption(options, scriptSetupRanges) {
    const codes = [];
    if (scriptSetupRanges.defineProp.some(p => p.isModel)) {
        codes.push({
            optionExp: `{} as __VLS_NormalizeEmits<typeof __VLS_modelEmit>`,
            typeOptionType: `__VLS_ModelEmit`,
        });
    }
    if (scriptSetupRanges.defineEmits) {
        const { name, typeArg, hasUnionTypeArg } = scriptSetupRanges.defineEmits;
        codes.push({
            optionExp: `{} as __VLS_NormalizeEmits<typeof ${name ?? '__VLS_emit'}>`,
            typeOptionType: typeArg && !hasUnionTypeArg
                ? `__VLS_Emit`
                : undefined,
        });
    }
    if (options.vueCompilerOptions.target >= 3.5 && codes.every(code => code.typeOptionType)) {
        if (codes.length === 1) {
            yield `__typeEmits: {} as `;
            yield codes[0].typeOptionType;
            yield `,${utils_1.newLine}`;
        }
        else if (codes.length >= 2) {
            yield `__typeEmits: {} as `;
            yield codes[0].typeOptionType;
            for (let i = 1; i < codes.length; i++) {
                yield ` & `;
                yield codes[i].typeOptionType;
            }
            yield `,${utils_1.newLine}`;
        }
    }
    else if (codes.every(code => code.optionExp)) {
        if (codes.length === 1) {
            yield `emits: `;
            yield codes[0].optionExp;
            yield `,${utils_1.newLine}`;
        }
        else if (codes.length >= 2) {
            yield `emits: {${utils_1.newLine}`;
            for (const code of codes) {
                yield `...`;
                yield code.optionExp;
                yield `,${utils_1.newLine}`;
            }
            yield `},${utils_1.newLine}`;
        }
    }
}
function* generatePropsOption(options, ctx, scriptSetup, scriptSetupRanges, hasEmitsOption, inheritAttrs) {
    const codes = [];
    if (ctx.generatedPropsType) {
        codes.push({
            optionExp: [
                `{} as `,
                scriptSetupRanges.withDefaults?.arg ? `${ctx.localTypes.WithDefaults}<` : '',
                `${ctx.localTypes.TypePropsToOption}<__VLS_PublicProps>`,
                scriptSetupRanges.withDefaults?.arg ? `, typeof __VLS_withDefaultsArg>` : '',
            ].join(''),
            typeOptionExp: `{} as __VLS_PublicProps`,
        });
    }
    if (scriptSetupRanges.defineProps?.arg) {
        const { arg } = scriptSetupRanges.defineProps;
        codes.push({
            optionExp: (0, utils_1.generateSfcBlockSection)(scriptSetup, arg.start, arg.end, codeFeatures_1.codeFeatures.navigation),
            typeOptionExp: undefined,
        });
    }
    if (inheritAttrs && options.templateCodegen?.inheritedAttrVars.size) {
        let attrsType = `Partial<__VLS_InheritedAttrs>`;
        if (hasEmitsOption) {
            attrsType = `Omit<${attrsType}, \`on\${string}\`>`;
        }
        const propsType = `__VLS_PickNotAny<${ctx.localTypes.OmitIndexSignature}<${attrsType}>, {}>`;
        const optionType = `${ctx.localTypes.TypePropsToOption}<${propsType}>`;
        codes.unshift({
            optionExp: codes.length
                ? `{} as ${optionType}`
                // workaround for https://github.com/vuejs/core/pull/7419
                : `{} as keyof ${propsType} extends never ? never: ${optionType}`,
            typeOptionExp: `{} as ${attrsType}`,
        });
    }
    const useTypeOption = options.vueCompilerOptions.target >= 3.5 && codes.every(code => code.typeOptionExp);
    const useOption = !useTypeOption || scriptSetupRanges.withDefaults;
    if (useTypeOption) {
        if (codes.length === 1) {
            yield `__typeProps: `;
            yield codes[0].typeOptionExp;
            yield `,${utils_1.newLine}`;
        }
        else if (codes.length >= 2) {
            yield `__typeProps: {${utils_1.newLine}`;
            for (const { typeOptionExp } of codes) {
                yield `...`;
                yield typeOptionExp;
                yield `,${utils_1.newLine}`;
            }
            yield `},${utils_1.newLine}`;
        }
    }
    if (useOption) {
        if (codes.length === 1) {
            yield `props: `;
            yield codes[0].optionExp;
            yield `,${utils_1.newLine}`;
        }
        else if (codes.length >= 2) {
            yield `props: {${utils_1.newLine}`;
            for (const { optionExp } of codes) {
                yield `...`;
                yield optionExp;
                yield `,${utils_1.newLine}`;
            }
            yield `},${utils_1.newLine}`;
        }
    }
}
//# sourceMappingURL=component.js.map