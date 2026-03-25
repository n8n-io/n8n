"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScriptSetupImports = generateScriptSetupImports;
exports.generateScriptSetup = generateScriptSetup;
const shared_1 = require("@vue/shared");
const codeFeatures_1 = require("../codeFeatures");
const utils_1 = require("../utils");
const camelized_1 = require("../utils/camelized");
const wrapWith_1 = require("../utils/wrapWith");
const component_1 = require("./component");
const componentSelf_1 = require("./componentSelf");
const index_1 = require("./index");
const template_1 = require("./template");
function* generateScriptSetupImports(scriptSetup, scriptSetupRanges) {
    yield [
        scriptSetup.content.slice(0, Math.max(scriptSetupRanges.importSectionEndOffset, scriptSetupRanges.leadingCommentEndOffset)),
        'scriptSetup',
        0,
        codeFeatures_1.codeFeatures.all,
    ];
}
function* generateScriptSetup(options, ctx, scriptSetup, scriptSetupRanges) {
    if (scriptSetup.generic) {
        if (!options.scriptRanges?.exportDefault) {
            // #4569
            yield ['', 'scriptSetup', 0, codeFeatures_1.codeFeatures.verification];
            yield `export default `;
        }
        yield `(`;
        if (typeof scriptSetup.generic === 'object') {
            yield `<`;
            yield [
                scriptSetup.generic.text,
                'main',
                scriptSetup.generic.offset,
                codeFeatures_1.codeFeatures.all,
            ];
            if (!scriptSetup.generic.text.endsWith(`,`)) {
                yield `,`;
            }
            yield `>`;
        }
        yield `(${utils_1.newLine}`
            + `	__VLS_props: NonNullable<Awaited<typeof __VLS_setup>>['props'],${utils_1.newLine}`
            + `	__VLS_ctx?: ${ctx.localTypes.PrettifyLocal}<Pick<NonNullable<Awaited<typeof __VLS_setup>>, 'attrs' | 'emit' | 'slots'>>,${utils_1.newLine}` // use __VLS_Prettify for less dts code
            + `	__VLS_expose?: NonNullable<Awaited<typeof __VLS_setup>>['expose'],${utils_1.newLine}`
            + `	__VLS_setup = (async () => {${utils_1.newLine}`;
        yield* generateSetupFunction(options, ctx, scriptSetup, scriptSetupRanges, undefined);
        const emitTypes = [];
        if (scriptSetupRanges.defineEmits) {
            emitTypes.push(`typeof ${scriptSetupRanges.defineEmits.name ?? '__VLS_emit'}`);
        }
        if (scriptSetupRanges.defineProp.some(p => p.isModel)) {
            emitTypes.push(`typeof __VLS_modelEmit`);
        }
        yield `return {} as {${utils_1.newLine}`
            + `	props: ${ctx.localTypes.PrettifyLocal}<__VLS_OwnProps & __VLS_PublicProps & Partial<__VLS_InheritedAttrs>> & __VLS_BuiltInPublicProps,${utils_1.newLine}`
            + `	expose(exposed: import('${options.vueCompilerOptions.lib}').ShallowUnwrapRef<${scriptSetupRanges.defineExpose ? 'typeof __VLS_exposed' : '{}'}>): void,${utils_1.newLine}`
            + `	attrs: any,${utils_1.newLine}`
            + `	slots: __VLS_Slots,${utils_1.newLine}`
            + `	emit: ${emitTypes.length ? emitTypes.join(' & ') : `{}`},${utils_1.newLine}`
            + `}${utils_1.endOfLine}`;
        yield `})(),${utils_1.newLine}`; // __VLS_setup = (async () => {
        yield `) => ({} as import('${options.vueCompilerOptions.lib}').VNode & { __ctx?: Awaited<typeof __VLS_setup> }))`;
    }
    else if (!options.sfc.script) {
        // no script block, generate script setup code at root
        yield* generateSetupFunction(options, ctx, scriptSetup, scriptSetupRanges, 'export default');
    }
    else {
        if (!options.scriptRanges?.exportDefault) {
            yield `export default `;
        }
        yield `await (async () => {${utils_1.newLine}`;
        yield* generateSetupFunction(options, ctx, scriptSetup, scriptSetupRanges, 'return');
        yield `})()`;
    }
}
function* generateSetupFunction(options, ctx, scriptSetup, scriptSetupRanges, syntax) {
    let setupCodeModifies = [];
    for (const { comments } of scriptSetupRanges.defineProp) {
        if (comments) {
            setupCodeModifies.push([
                [``],
                comments.start,
                comments.end,
            ]);
        }
    }
    if (scriptSetupRanges.defineProps) {
        const { name, statement, callExp, typeArg } = scriptSetupRanges.defineProps;
        setupCodeModifies.push(...generateDefineWithType(scriptSetup, statement, scriptSetupRanges.withDefaults?.callExp ?? callExp, typeArg, name, `__VLS_props`, `__VLS_Props`));
    }
    if (scriptSetupRanges.defineEmits) {
        const { name, statement, callExp, typeArg } = scriptSetupRanges.defineEmits;
        setupCodeModifies.push(...generateDefineWithType(scriptSetup, statement, callExp, typeArg, name, `__VLS_emit`, `__VLS_Emit`));
    }
    if (scriptSetupRanges.defineSlots) {
        const { name, statement, callExp, typeArg } = scriptSetupRanges.defineSlots;
        setupCodeModifies.push(...generateDefineWithType(scriptSetup, statement, callExp, typeArg, name, `__VLS_slots`, `__VLS_Slots`));
    }
    if (scriptSetupRanges.defineExpose) {
        const { callExp, arg, typeArg } = scriptSetupRanges.defineExpose;
        if (typeArg) {
            setupCodeModifies.push([
                [
                    `let __VLS_exposed!: `,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, typeArg.start, typeArg.end, codeFeatures_1.codeFeatures.all),
                    `${utils_1.endOfLine}`,
                ],
                callExp.start,
                callExp.start,
            ], [
                [`typeof __VLS_exposed`],
                typeArg.start,
                typeArg.end,
            ]);
        }
        else if (arg) {
            setupCodeModifies.push([
                [
                    `const __VLS_exposed = `,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, arg.start, arg.end, codeFeatures_1.codeFeatures.all),
                    `${utils_1.endOfLine}`,
                ],
                callExp.start,
                callExp.start,
            ], [
                [`__VLS_exposed`],
                arg.start,
                arg.end,
            ]);
        }
        else {
            setupCodeModifies.push([
                [`const __VLS_exposed = {}${utils_1.endOfLine}`],
                callExp.start,
                callExp.start,
            ]);
        }
    }
    if (options.vueCompilerOptions.inferTemplateDollarAttrs) {
        for (const { callExp } of scriptSetupRanges.useAttrs) {
            setupCodeModifies.push([
                [`(`],
                callExp.start,
                callExp.start
            ], [
                [` as typeof __VLS_dollars.$attrs)`],
                callExp.end,
                callExp.end
            ]);
        }
    }
    for (const { callExp, exp, arg } of scriptSetupRanges.useCssModule) {
        setupCodeModifies.push([
            [`(`],
            callExp.start,
            callExp.start
        ], [
            arg ? [
                ` as Omit<__VLS_StyleModules, '$style'>[`,
                (0, utils_1.generateSfcBlockSection)(scriptSetup, arg.start, arg.end, codeFeatures_1.codeFeatures.all),
                `])`
            ] : [
                ` as __VLS_StyleModules[`,
                ...(0, wrapWith_1.wrapWith)(exp.start, exp.end, scriptSetup.name, codeFeatures_1.codeFeatures.verification, `'$style'`),
                `])`
            ],
            callExp.end,
            callExp.end
        ]);
        if (arg) {
            setupCodeModifies.push([
                [`__VLS_placeholder`],
                arg.start,
                arg.end
            ]);
        }
    }
    if (options.vueCompilerOptions.inferTemplateDollarSlots) {
        for (const { callExp } of scriptSetupRanges.useSlots) {
            setupCodeModifies.push([
                [`(`],
                callExp.start,
                callExp.start
            ], [
                [` as typeof __VLS_dollars.$slots)`],
                callExp.end,
                callExp.end
            ]);
        }
    }
    const isTs = options.lang !== 'js' && options.lang !== 'jsx';
    for (const { callExp, exp, arg } of scriptSetupRanges.useTemplateRef) {
        const templateRefType = arg
            ? [
                `__VLS_TemplateRefs[`,
                (0, utils_1.generateSfcBlockSection)(scriptSetup, arg.start, arg.end, codeFeatures_1.codeFeatures.all),
                `]`
            ]
            : [`unknown`];
        if (isTs) {
            setupCodeModifies.push([
                [
                    `<`,
                    ...templateRefType,
                    `>`
                ],
                exp.end,
                exp.end
            ]);
        }
        else {
            setupCodeModifies.push([
                [`(`],
                callExp.start,
                callExp.start
            ], [
                [
                    ` as __VLS_UseTemplateRef<`,
                    ...templateRefType,
                    `>)`
                ],
                callExp.end,
                callExp.end
            ]);
        }
        if (arg) {
            setupCodeModifies.push([
                [`__VLS_placeholder`],
                arg.start,
                arg.end
            ]);
        }
    }
    setupCodeModifies = setupCodeModifies.sort((a, b) => a[1] - b[1]);
    let nextStart = Math.max(scriptSetupRanges.importSectionEndOffset, scriptSetupRanges.leadingCommentEndOffset);
    for (const [codes, start, end] of setupCodeModifies) {
        yield (0, utils_1.generateSfcBlockSection)(scriptSetup, nextStart, start, codeFeatures_1.codeFeatures.all);
        yield* codes;
        nextStart = end;
    }
    yield (0, utils_1.generateSfcBlockSection)(scriptSetup, nextStart, scriptSetup.content.length, codeFeatures_1.codeFeatures.all);
    yield* (0, index_1.generateScriptSectionPartiallyEnding)(scriptSetup.name, scriptSetup.content.length, '#3632/scriptSetup.vue');
    yield* generateMacros(options, ctx);
    yield* generateDefineProp(options);
    if (scriptSetupRanges.defineProps?.typeArg && scriptSetupRanges.withDefaults?.arg) {
        // fix https://github.com/vuejs/language-tools/issues/1187
        yield `const __VLS_withDefaultsArg = (function <T>(t: T) { return t })(`;
        yield (0, utils_1.generateSfcBlockSection)(scriptSetup, scriptSetupRanges.withDefaults.arg.start, scriptSetupRanges.withDefaults.arg.end, codeFeatures_1.codeFeatures.navigation);
        yield `)${utils_1.endOfLine}`;
    }
    yield* generateComponentProps(options, ctx, scriptSetup, scriptSetupRanges);
    yield* generateModelEmit(scriptSetup, scriptSetupRanges);
    const templateCodegenCtx = yield* (0, template_1.generateTemplate)(options, ctx);
    yield* (0, componentSelf_1.generateComponentSelf)(options, ctx, templateCodegenCtx);
    if (syntax) {
        if (!options.vueCompilerOptions.skipTemplateCodegen
            && (scriptSetupRanges.defineSlots
                || options.templateCodegen?.slots.length
                || options.templateCodegen?.dynamicSlots.length)) {
            yield `const __VLS_component = `;
            yield* (0, component_1.generateComponent)(options, ctx, scriptSetup, scriptSetupRanges);
            yield utils_1.endOfLine;
            yield `${syntax} `;
            yield `{} as ${ctx.localTypes.WithSlots}<typeof __VLS_component, __VLS_Slots>${utils_1.endOfLine}`;
        }
        else {
            yield `${syntax} `;
            yield* (0, component_1.generateComponent)(options, ctx, scriptSetup, scriptSetupRanges);
            yield utils_1.endOfLine;
        }
    }
}
function* generateMacros(options, ctx) {
    if (options.vueCompilerOptions.target >= 3.3) {
        yield `// @ts-ignore${utils_1.newLine}`;
        yield `declare const { `;
        for (const macro of Object.keys(options.vueCompilerOptions.macros)) {
            if (!ctx.bindingNames.has(macro)) {
                yield `${macro}, `;
            }
        }
        yield `}: typeof import('${options.vueCompilerOptions.lib}')${utils_1.endOfLine}`;
    }
}
function* generateDefineProp(options) {
    const definePropProposalA = options.vueCompilerOptions.experimentalDefinePropProposal === 'kevinEdition';
    const definePropProposalB = options.vueCompilerOptions.experimentalDefinePropProposal === 'johnsonEdition';
    if (definePropProposalA || definePropProposalB) {
        yield `type __VLS_PropOptions<T> = Exclude<import('${options.vueCompilerOptions.lib}').Prop<T>, import('${options.vueCompilerOptions.lib}').PropType<T>>${utils_1.endOfLine}`;
        if (definePropProposalA) {
            yield `declare function defineProp<T>(name: string, options: ({ required: true } | { default: T }) & __VLS_PropOptions<T>): import('${options.vueCompilerOptions.lib}').ComputedRef<T>${utils_1.endOfLine}`;
            yield `declare function defineProp<T>(name?: string, options?: __VLS_PropOptions<T>): import('${options.vueCompilerOptions.lib}').ComputedRef<T | undefined>${utils_1.endOfLine}`;
        }
        if (definePropProposalB) {
            yield `declare function defineProp<T>(value: T | (() => T), required?: boolean, options?: __VLS_PropOptions<T>): import('${options.vueCompilerOptions.lib}').ComputedRef<T>${utils_1.endOfLine}`;
            yield `declare function defineProp<T>(value: T | (() => T) | undefined, required: true, options?: __VLS_PropOptions<T>): import('${options.vueCompilerOptions.lib}').ComputedRef<T>${utils_1.endOfLine}`;
            yield `declare function defineProp<T>(value?: T | (() => T), required?: boolean, options?: __VLS_PropOptions<T>): import('${options.vueCompilerOptions.lib}').ComputedRef<T | undefined>${utils_1.endOfLine}`;
        }
    }
}
function* generateDefineWithType(scriptSetup, statement, callExp, typeArg, name, defaultName, typeName) {
    if (typeArg) {
        yield [[
                `type ${typeName} = `,
                (0, utils_1.generateSfcBlockSection)(scriptSetup, typeArg.start, typeArg.end, codeFeatures_1.codeFeatures.all),
                utils_1.endOfLine,
            ], statement.start, statement.start];
        yield [[typeName], typeArg.start, typeArg.end];
    }
    if (!name) {
        if (statement.start === callExp.start && statement.end === callExp.end) {
            yield [[`const ${defaultName} = `], callExp.start, callExp.start];
        }
        else if (typeArg) {
            yield [[
                    `const ${defaultName} = `,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, callExp.start, typeArg.start, codeFeatures_1.codeFeatures.all)
                ], statement.start, typeArg.start];
            yield [[
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, typeArg.end, callExp.end, codeFeatures_1.codeFeatures.all),
                    utils_1.endOfLine,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, statement.start, callExp.start, codeFeatures_1.codeFeatures.all),
                    defaultName
                ], typeArg.end, callExp.end];
        }
        else {
            yield [[
                    `const ${defaultName} = `,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, callExp.start, callExp.end, codeFeatures_1.codeFeatures.all),
                    utils_1.endOfLine,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, statement.start, callExp.start, codeFeatures_1.codeFeatures.all),
                    defaultName
                ], statement.start, callExp.end];
        }
    }
}
function* generateComponentProps(options, ctx, scriptSetup, scriptSetupRanges) {
    if (scriptSetup.generic) {
        yield `const __VLS_fnComponent = (await import('${options.vueCompilerOptions.lib}')).defineComponent({${utils_1.newLine}`;
        if (scriptSetupRanges.defineProps?.arg) {
            yield `props: `;
            yield (0, utils_1.generateSfcBlockSection)(scriptSetup, scriptSetupRanges.defineProps.arg.start, scriptSetupRanges.defineProps.arg.end, codeFeatures_1.codeFeatures.navigation);
            yield `,${utils_1.newLine}`;
        }
        yield* (0, component_1.generateEmitsOption)(options, scriptSetupRanges);
        yield `})${utils_1.endOfLine}`;
        yield `type __VLS_BuiltInPublicProps = ${options.vueCompilerOptions.target >= 3.4
            ? `import('${options.vueCompilerOptions.lib}').PublicProps`
            : options.vueCompilerOptions.target >= 3.0
                ? `import('${options.vueCompilerOptions.lib}').VNodeProps`
                    + ` & import('${options.vueCompilerOptions.lib}').AllowedComponentProps`
                    + ` & import('${options.vueCompilerOptions.lib}').ComponentCustomProps`
                : `globalThis.JSX.IntrinsicAttributes`}`;
        yield utils_1.endOfLine;
        yield `type __VLS_OwnProps = `;
        yield `${ctx.localTypes.OmitKeepDiscriminatedUnion}<InstanceType<typeof __VLS_fnComponent>['$props'], keyof __VLS_BuiltInPublicProps>`;
        yield utils_1.endOfLine;
    }
    if (scriptSetupRanges.defineProp.length) {
        yield `const __VLS_defaults = {${utils_1.newLine}`;
        for (const defineProp of scriptSetupRanges.defineProp) {
            if (!defineProp.defaultValue) {
                continue;
            }
            const [propName, localName] = getPropAndLocalName(scriptSetup, defineProp);
            if (defineProp.name || defineProp.isModel) {
                yield `'${propName}'`;
            }
            else if (defineProp.localName) {
                yield localName;
            }
            else {
                continue;
            }
            yield `: `;
            yield getRangeText(scriptSetup, defineProp.defaultValue);
            yield `,${utils_1.newLine}`;
        }
        yield `}${utils_1.endOfLine}`;
    }
    yield `type __VLS_PublicProps = `;
    if (scriptSetupRanges.defineSlots && options.vueCompilerOptions.jsxSlots) {
        if (ctx.generatedPropsType) {
            yield ` & `;
        }
        ctx.generatedPropsType = true;
        yield `${ctx.localTypes.PropsChildren}<__VLS_Slots>`;
    }
    if (scriptSetupRanges.defineProps?.typeArg) {
        if (ctx.generatedPropsType) {
            yield ` & `;
        }
        ctx.generatedPropsType = true;
        yield `__VLS_Props`;
    }
    if (scriptSetupRanges.defineProp.length) {
        if (ctx.generatedPropsType) {
            yield ` & `;
        }
        ctx.generatedPropsType = true;
        yield `{${utils_1.newLine}`;
        for (const defineProp of scriptSetupRanges.defineProp) {
            const [propName, localName] = getPropAndLocalName(scriptSetup, defineProp);
            if (defineProp.comments) {
                yield (0, utils_1.generateSfcBlockSection)(scriptSetup, defineProp.comments.start, defineProp.comments.end, codeFeatures_1.codeFeatures.all);
                yield utils_1.newLine;
            }
            if (defineProp.isModel && !defineProp.name) {
                yield propName;
            }
            else if (defineProp.name) {
                yield* (0, camelized_1.generateCamelized)(getRangeText(scriptSetup, defineProp.name), scriptSetup.name, defineProp.name.start, codeFeatures_1.codeFeatures.navigation);
            }
            else if (defineProp.localName) {
                yield (0, utils_1.generateSfcBlockSection)(scriptSetup, defineProp.localName.start, defineProp.localName.end, codeFeatures_1.codeFeatures.navigation);
            }
            else {
                continue;
            }
            yield defineProp.required
                ? `: `
                : `?: `;
            yield* generateDefinePropType(scriptSetup, propName, localName, defineProp);
            yield `,${utils_1.newLine}`;
            if (defineProp.modifierType) {
                const modifierName = `${defineProp.name ? propName : 'model'}Modifiers`;
                const modifierType = getRangeText(scriptSetup, defineProp.modifierType);
                yield `'${modifierName}'?: Partial<Record<${modifierType}, true>>,${utils_1.newLine}`;
            }
        }
        yield `}`;
    }
    if (!ctx.generatedPropsType) {
        yield `{}`;
    }
    yield utils_1.endOfLine;
}
function* generateModelEmit(scriptSetup, scriptSetupRanges) {
    const defineModels = scriptSetupRanges.defineProp.filter(p => p.isModel);
    if (defineModels.length) {
        yield `type __VLS_ModelEmit = {${utils_1.newLine}`;
        for (const defineModel of defineModels) {
            const [propName, localName] = getPropAndLocalName(scriptSetup, defineModel);
            yield `'update:${propName}': [value: `;
            yield* generateDefinePropType(scriptSetup, propName, localName, defineModel);
            if (!defineModel.required && !defineModel.defaultValue) {
                yield ` | undefined`;
            }
            yield `]${utils_1.endOfLine}`;
        }
        yield `}${utils_1.endOfLine}`;
        yield `const __VLS_modelEmit = defineEmits<__VLS_ModelEmit>()${utils_1.endOfLine}`;
    }
}
function* generateDefinePropType(scriptSetup, propName, localName, defineProp) {
    if (defineProp.type) {
        // Infer from defineProp<T>
        yield getRangeText(scriptSetup, defineProp.type);
    }
    else if (defineProp.runtimeType && localName) {
        // Infer from actual prop declaration code 
        yield `typeof ${localName}['value']`;
    }
    else if (defineProp.defaultValue && propName) {
        // Infer from defineProp({default: T})
        yield `typeof __VLS_defaults['${propName}']`;
    }
    else {
        yield `any`;
    }
}
function getPropAndLocalName(scriptSetup, defineProp) {
    const localName = defineProp.localName
        ? getRangeText(scriptSetup, defineProp.localName)
        : undefined;
    const propName = defineProp.name
        ? (0, shared_1.camelize)(getRangeText(scriptSetup, defineProp.name).slice(1, -1))
        : defineProp.isModel
            ? 'modelValue'
            : localName;
    return [propName, localName];
}
function getRangeText(scriptSetup, range) {
    return scriptSetup.content.slice(range.start, range.end);
}
//# sourceMappingURL=scriptSetup.js.map