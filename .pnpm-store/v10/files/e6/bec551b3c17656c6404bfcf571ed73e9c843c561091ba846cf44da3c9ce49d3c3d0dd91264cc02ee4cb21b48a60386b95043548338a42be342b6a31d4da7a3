"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComponent = generateComponent;
exports.generateComponentSetupReturns = generateComponentSetupReturns;
exports.generateEmitsOption = generateEmitsOption;
exports.generatePropsOption = generatePropsOption;
const common_1 = require("../common");
const index_1 = require("./index");
function* generateComponent(options, ctx, scriptSetup, scriptSetupRanges) {
    if (options.sfc.script && options.scriptRanges?.exportDefault && options.scriptRanges.exportDefault.expression.start !== options.scriptRanges.exportDefault.args.start) {
        // use defineComponent() from user space code if it exist
        yield (0, common_1.generateSfcBlockSection)(options.sfc.script, options.scriptRanges.exportDefault.expression.start, options.scriptRanges.exportDefault.args.start, index_1.codeFeatures.all);
        yield `{${common_1.newLine}`;
    }
    else {
        yield `(await import('${options.vueCompilerOptions.lib}')).defineComponent({${common_1.newLine}`;
    }
    yield `setup() {${common_1.newLine}`;
    yield `return {${common_1.newLine}`;
    if (ctx.bypassDefineComponent) {
        yield* generateComponentSetupReturns(scriptSetupRanges);
    }
    if (scriptSetupRanges.expose.define) {
        yield `...__VLS_exposed,${common_1.newLine}`;
    }
    yield `}${common_1.endOfLine}`;
    yield `},${common_1.newLine}`;
    if (!ctx.bypassDefineComponent) {
        const emitOptionCodes = [...generateEmitsOption(options, scriptSetupRanges)];
        for (const code of emitOptionCodes) {
            yield code;
        }
        yield* generatePropsOption(options, ctx, scriptSetup, scriptSetupRanges, !!emitOptionCodes.length, true);
    }
    if (options.sfc.script && options.scriptRanges?.exportDefault?.args) {
        const { args } = options.scriptRanges.exportDefault;
        yield (0, common_1.generateSfcBlockSection)(options.sfc.script, args.start + 1, args.end - 1, index_1.codeFeatures.all);
    }
    if (options.vueCompilerOptions.target >= 3.5 && scriptSetupRanges.templateRefs.length) {
        yield `__typeRefs: {} as __VLS_TemplateResult['refs'],${common_1.newLine}`;
    }
    if (options.vueCompilerOptions.target >= 3.5 && options.templateCodegen?.singleRootElType) {
        yield `__typeEl: {} as __VLS_TemplateResult['rootEl'],${common_1.newLine}`;
    }
    yield `})`;
}
function* generateComponentSetupReturns(scriptSetupRanges) {
    // fill $props
    if (scriptSetupRanges.props.define) {
        // NOTE: defineProps is inaccurate for $props
        yield `$props: __VLS_makeOptional(${scriptSetupRanges.props.name ?? `__VLS_props`}),${common_1.newLine}`;
        yield `...${scriptSetupRanges.props.name ?? `__VLS_props`},${common_1.newLine}`;
    }
    // fill $emit
    if (scriptSetupRanges.emits.define) {
        yield `$emit: ${scriptSetupRanges.emits.name ?? '__VLS_emit'},${common_1.newLine}`;
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
    if (scriptSetupRanges.emits.define) {
        const { typeArg, hasUnionTypeArg } = scriptSetupRanges.emits.define;
        codes.push({
            optionExp: `{} as __VLS_NormalizeEmits<typeof ${scriptSetupRanges.emits.name ?? '__VLS_emit'}>`,
            typeOptionType: typeArg && !hasUnionTypeArg
                ? `__VLS_Emit`
                : undefined,
        });
    }
    if (options.vueCompilerOptions.target >= 3.5 && codes.every(code => code.typeOptionType)) {
        if (codes.length === 1) {
            yield `__typeEmits: {} as `;
            yield codes[0].typeOptionType;
            yield `,${common_1.newLine}`;
        }
        else if (codes.length >= 2) {
            yield `__typeEmits: {} as `;
            yield codes[0].typeOptionType;
            for (let i = 1; i < codes.length; i++) {
                yield ` & `;
                yield codes[i].typeOptionType;
            }
            yield `,${common_1.newLine}`;
        }
    }
    else if (codes.every(code => code.optionExp)) {
        if (codes.length === 1) {
            yield `emits: `;
            yield codes[0].optionExp;
            yield `,${common_1.newLine}`;
        }
        else if (codes.length >= 2) {
            yield `emits: {${common_1.newLine}`;
            for (const code of codes) {
                yield `...`;
                yield code.optionExp;
                yield `,${common_1.newLine}`;
            }
            yield `},${common_1.newLine}`;
        }
    }
}
function* generatePropsOption(options, ctx, scriptSetup, scriptSetupRanges, hasEmitsOption, inheritAttrs) {
    const codes = [];
    if (ctx.generatedPropsType) {
        codes.push({
            optionExp: [
                `{} as `,
                scriptSetupRanges.props.withDefaults?.arg ? `${ctx.localTypes.WithDefaults}<` : '',
                `${ctx.localTypes.TypePropsToOption}<__VLS_PublicProps>`,
                scriptSetupRanges.props.withDefaults?.arg ? `, typeof __VLS_withDefaultsArg>` : '',
            ].join(''),
            typeOptionExp: `{} as __VLS_PublicProps`,
        });
    }
    if (scriptSetupRanges.props.define?.arg) {
        const { arg } = scriptSetupRanges.props.define;
        codes.push({
            optionExp: (0, common_1.generateSfcBlockSection)(scriptSetup, arg.start, arg.end, index_1.codeFeatures.navigation),
            typeOptionExp: undefined,
        });
    }
    if (inheritAttrs && options.templateCodegen?.inheritedAttrVars.size) {
        let attrsType = `__VLS_TemplateResult['attrs']`;
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
    const useOption = !useTypeOption || scriptSetupRanges.props.withDefaults;
    if (useTypeOption) {
        if (codes.length === 1) {
            yield `__typeProps: `;
            yield codes[0].typeOptionExp;
            yield `,${common_1.newLine}`;
        }
        else if (codes.length >= 2) {
            yield `__typeProps: {${common_1.newLine}`;
            for (const { typeOptionExp } of codes) {
                yield `...`;
                yield typeOptionExp;
                yield `,${common_1.newLine}`;
            }
            yield `},${common_1.newLine}`;
        }
    }
    if (useOption) {
        if (codes.length === 1) {
            yield `props: `;
            yield codes[0].optionExp;
            yield `,${common_1.newLine}`;
        }
        else if (codes.length >= 2) {
            yield `props: {${common_1.newLine}`;
            for (const { optionExp } of codes) {
                yield `...`;
                yield optionExp;
                yield `,${common_1.newLine}`;
            }
            yield `},${common_1.newLine}`;
        }
    }
}
//# sourceMappingURL=component.js.map