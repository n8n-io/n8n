"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScriptSetupImports = generateScriptSetupImports;
exports.generateScriptSetup = generateScriptSetup;
const utils_1 = require("../utils");
const component_1 = require("./component");
const componentSelf_1 = require("./componentSelf");
const index_1 = require("./index");
const template_1 = require("./template");
function* generateScriptSetupImports(scriptSetup, scriptSetupRanges) {
    yield [
        scriptSetup.content.slice(0, Math.max(scriptSetupRanges.importSectionEndOffset, scriptSetupRanges.leadingCommentEndOffset)),
        'scriptSetup',
        0,
        index_1.codeFeatures.all,
    ];
}
function* generateScriptSetup(options, ctx, scriptSetup, scriptSetupRanges) {
    if (scriptSetup.generic) {
        if (!options.scriptRanges?.exportDefault) {
            if (options.sfc.scriptSetup) {
                // #4569
                yield [
                    '',
                    'scriptSetup',
                    options.sfc.scriptSetup.content.length,
                    index_1.codeFeatures.verification,
                ];
            }
            yield `export default `;
        }
        yield `(<`;
        yield [
            scriptSetup.generic,
            scriptSetup.name,
            scriptSetup.genericOffset,
            index_1.codeFeatures.all,
        ];
        if (!scriptSetup.generic.endsWith(`,`)) {
            yield `,`;
        }
        yield `>(${utils_1.newLine}`
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
            + `	props: ${ctx.localTypes.PrettifyLocal}<__VLS_OwnProps & __VLS_PublicProps & __VLS_TemplateResult['attrs']> & __VLS_BuiltInPublicProps,${utils_1.newLine}`
            + `	expose(exposed: import('${options.vueCompilerOptions.lib}').ShallowUnwrapRef<${scriptSetupRanges.defineExpose ? 'typeof __VLS_exposed' : '{}'}>): void,${utils_1.newLine}`
            + `	attrs: any,${utils_1.newLine}`
            + `	slots: __VLS_TemplateResult['slots'],${utils_1.newLine}`
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
    ctx.scriptSetupGeneratedOffset = options.getGeneratedLength() - scriptSetupRanges.importSectionEndOffset;
    let setupCodeModifies = [];
    if (scriptSetupRanges.defineProps) {
        const { name, statement, callExp, typeArg } = scriptSetupRanges.defineProps;
        setupCodeModifies.push(...generateDefineWithType(scriptSetup, statement, scriptSetupRanges.withDefaults?.callExp ?? callExp, typeArg, name, '__VLS_props', '__VLS_Props'));
    }
    if (scriptSetupRanges.defineEmits) {
        const { name, statement, callExp, typeArg } = scriptSetupRanges.defineEmits;
        setupCodeModifies.push(...generateDefineWithType(scriptSetup, statement, callExp, typeArg, name, '__VLS_emit', '__VLS_Emit'));
    }
    if (scriptSetupRanges.defineSlots) {
        const { name, callExp, isObjectBindingPattern } = scriptSetupRanges.defineSlots;
        if (isObjectBindingPattern) {
            setupCodeModifies.push([
                [`__VLS_slots;\nconst __VLS_slots = `],
                callExp.start,
                callExp.start,
            ]);
        }
        else if (!name) {
            setupCodeModifies.push([
                [`const __VLS_slots = `],
                callExp.start,
                callExp.start
            ]);
        }
    }
    if (scriptSetupRanges.defineExpose) {
        const { callExp, arg, typeArg } = scriptSetupRanges.defineExpose;
        if (typeArg) {
            setupCodeModifies.push([
                [
                    `let __VLS_exposed!: `,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, typeArg.start, typeArg.end, index_1.codeFeatures.navigation),
                    `${utils_1.endOfLine}`,
                ],
                callExp.start,
                callExp.start,
            ]);
        }
        else if (arg) {
            setupCodeModifies.push([
                [
                    `const __VLS_exposed = `,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, arg.start, arg.end, index_1.codeFeatures.navigation),
                    `${utils_1.endOfLine}`,
                ],
                callExp.start,
                callExp.start,
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
    // TODO: circular reference
    // for (const { callExp } of scriptSetupRanges.useAttrs) {
    // 	setupCodeModifies.push([
    // 		[`(`],
    // 		callExp.start,
    // 		callExp.start
    // 	], [
    // 		[` as __VLS_TemplateResult['attrs'] & Record<string, unknown>)`],
    // 		callExp.end,
    // 		callExp.end
    // 	]);
    // }
    for (const { callExp, exp, arg } of scriptSetupRanges.useCssModule) {
        setupCodeModifies.push([
            [`(`],
            callExp.start,
            callExp.start
        ], [
            arg ? [
                ` as Omit<__VLS_StyleModules, '$style'>[`,
                (0, utils_1.generateSfcBlockSection)(scriptSetup, arg.start, arg.end, index_1.codeFeatures.all),
                `])`
            ] : [
                ` as __VLS_StyleModules[`,
                ['', scriptSetup.name, exp.start, index_1.codeFeatures.verification],
                `'$style'`,
                ['', scriptSetup.name, exp.end, utils_1.combineLastMapping],
                `])`
            ],
            callExp.end,
            callExp.end
        ]);
        if (arg) {
            setupCodeModifies.push([
                [`(__VLS_placeholder)`],
                arg.start,
                arg.end
            ]);
        }
    }
    for (const { callExp } of scriptSetupRanges.useSlots) {
        setupCodeModifies.push([
            [`(`],
            callExp.start,
            callExp.start
        ], [
            [` as __VLS_TemplateResult['slots'])`],
            callExp.end,
            callExp.end
        ]);
    }
    const isTs = options.lang !== 'js' && options.lang !== 'jsx';
    for (const { callExp, exp, arg } of scriptSetupRanges.useTemplateRef) {
        const templateRefType = arg
            ? [
                `__VLS_TemplateResult['refs'][`,
                (0, utils_1.generateSfcBlockSection)(scriptSetup, arg.start, arg.end, index_1.codeFeatures.all),
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
                [`(__VLS_placeholder)`],
                arg.start,
                arg.end
            ]);
        }
    }
    setupCodeModifies = setupCodeModifies.sort((a, b) => a[1] - b[1]);
    let nextStart = Math.max(scriptSetupRanges.importSectionEndOffset, scriptSetupRanges.leadingCommentEndOffset);
    for (const [codes, start, end] of setupCodeModifies) {
        yield (0, utils_1.generateSfcBlockSection)(scriptSetup, nextStart, start, index_1.codeFeatures.all);
        for (const code of codes) {
            yield code;
        }
        nextStart = end;
    }
    yield (0, utils_1.generateSfcBlockSection)(scriptSetup, nextStart, scriptSetup.content.length, index_1.codeFeatures.all);
    yield* (0, index_1.generateScriptSectionPartiallyEnding)(scriptSetup.name, scriptSetup.content.length, '#3632/scriptSetup.vue');
    yield* generateMacros(options, ctx);
    yield* generateDefineProp(options);
    if (scriptSetupRanges.defineProps?.typeArg && scriptSetupRanges.withDefaults?.arg) {
        // fix https://github.com/vuejs/language-tools/issues/1187
        yield `const __VLS_withDefaultsArg = (function <T>(t: T) { return t })(`;
        yield (0, utils_1.generateSfcBlockSection)(scriptSetup, scriptSetupRanges.withDefaults.arg.start, scriptSetupRanges.withDefaults.arg.end, index_1.codeFeatures.navigation);
        yield `)${utils_1.endOfLine}`;
    }
    yield* generateComponentProps(options, ctx, scriptSetup, scriptSetupRanges);
    yield* generateModelEmit(scriptSetup, scriptSetupRanges);
    yield `function __VLS_template() {${utils_1.newLine}`;
    const templateCodegenCtx = yield* (0, template_1.generateTemplate)(options, ctx);
    yield `}${utils_1.endOfLine}`;
    yield* (0, componentSelf_1.generateComponentSelf)(options, ctx, templateCodegenCtx);
    yield `type __VLS_TemplateResult = ReturnType<typeof __VLS_template>${utils_1.endOfLine}`;
    if (syntax) {
        if (!options.vueCompilerOptions.skipTemplateCodegen && (options.templateCodegen?.hasSlot || scriptSetupRanges.defineSlots)) {
            yield `const __VLS_component = `;
            yield* (0, component_1.generateComponent)(options, ctx, scriptSetup, scriptSetupRanges);
            yield utils_1.endOfLine;
            yield `${syntax} `;
            yield `{} as ${ctx.localTypes.WithTemplateSlots}<typeof __VLS_component, __VLS_TemplateResult['slots']>${utils_1.endOfLine}`;
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
                (0, utils_1.generateSfcBlockSection)(scriptSetup, typeArg.start, typeArg.end, index_1.codeFeatures.all),
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
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, callExp.start, typeArg.start, index_1.codeFeatures.all)
                ], statement.start, typeArg.start];
            yield [[
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, typeArg.end, callExp.end, index_1.codeFeatures.all),
                    utils_1.endOfLine,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, statement.start, callExp.start, index_1.codeFeatures.all),
                    defaultName
                ], typeArg.end, callExp.end];
        }
        else {
            yield [[
                    `const ${defaultName} = `,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, callExp.start, callExp.end, index_1.codeFeatures.all),
                    utils_1.endOfLine,
                    (0, utils_1.generateSfcBlockSection)(scriptSetup, statement.start, callExp.start, index_1.codeFeatures.all),
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
            yield (0, utils_1.generateSfcBlockSection)(scriptSetup, scriptSetupRanges.defineProps.arg.start, scriptSetupRanges.defineProps.arg.end, index_1.codeFeatures.navigation);
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
            yield getRangeName(scriptSetup, defineProp.defaultValue);
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
        yield `${ctx.localTypes.PropsChildren}<typeof __VLS_slots>`;
    }
    if (scriptSetupRanges.defineProp.length) {
        if (ctx.generatedPropsType) {
            yield ` & `;
        }
        ctx.generatedPropsType = true;
        yield `{${utils_1.newLine}`;
        for (const defineProp of scriptSetupRanges.defineProp) {
            const [propName, localName] = getPropAndLocalName(scriptSetup, defineProp);
            if (defineProp.isModel && !defineProp.name) {
                yield propName;
            }
            else if (defineProp.name) {
                yield (0, utils_1.generateSfcBlockSection)(scriptSetup, defineProp.name.start, defineProp.name.end, index_1.codeFeatures.navigation);
            }
            else if (defineProp.localName) {
                yield (0, utils_1.generateSfcBlockSection)(scriptSetup, defineProp.localName.start, defineProp.localName.end, index_1.codeFeatures.navigation);
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
                const modifierType = getRangeName(scriptSetup, defineProp.modifierType);
                yield `'${modifierName}'?: Partial<Record<${modifierType}, true>>,${utils_1.newLine}`;
            }
        }
        yield `}`;
    }
    if (scriptSetupRanges.defineProps?.typeArg) {
        if (ctx.generatedPropsType) {
            yield ` & `;
        }
        ctx.generatedPropsType = true;
        yield `__VLS_Props`;
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
            yield `]${utils_1.endOfLine}`;
        }
        yield `}${utils_1.endOfLine}`;
        yield `const __VLS_modelEmit = defineEmits<__VLS_ModelEmit>()${utils_1.endOfLine}`;
    }
}
function* generateDefinePropType(scriptSetup, propName, localName, defineProp) {
    if (defineProp.type) {
        // Infer from defineProp<T>
        yield getRangeName(scriptSetup, defineProp.type);
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
        ? getRangeName(scriptSetup, defineProp.localName)
        : undefined;
    let propName = defineProp.name
        ? getRangeName(scriptSetup, defineProp.name)
        : defineProp.isModel
            ? 'modelValue'
            : localName;
    if (defineProp.name) {
        propName = propName.replace(/['"]+/g, '');
    }
    return [propName, localName];
}
function getRangeName(scriptSetup, range) {
    return scriptSetup.content.slice(range.start, range.end);
}
//# sourceMappingURL=scriptSetup.js.map