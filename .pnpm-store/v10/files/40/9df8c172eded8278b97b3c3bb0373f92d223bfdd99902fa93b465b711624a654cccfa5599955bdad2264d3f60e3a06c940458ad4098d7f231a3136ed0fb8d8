"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalTypesGenerator = getLocalTypesGenerator;
const shared_1 = require("../utils/shared");
const common_1 = require("./common");
function getLocalTypesGenerator(compilerOptions, vueCompilerOptions) {
    const used = new Set();
    const OmitKeepDiscriminatedUnion = defineHelper(`__VLS_OmitKeepDiscriminatedUnion`, () => `
type __VLS_OmitKeepDiscriminatedUnion<T, K extends keyof any> = T extends any
	? Pick<T, Exclude<keyof T, K>>
	: never;
`.trimStart());
    const WithDefaults = defineHelper(`__VLS_WithDefaults`, () => `
type __VLS_WithDefaults<P, D> = {
	[K in keyof Pick<P, keyof P>]: K extends keyof D
		? ${PrettifyLocal.name}<P[K] & { default: D[K]}>
		: P[K]
};
`.trimStart());
    const PrettifyLocal = defineHelper(`__VLS_PrettifyLocal`, () => `type __VLS_PrettifyLocal<T> = { [K in keyof T]: T[K]; } & {}${common_1.endOfLine}`);
    const WithTemplateSlots = defineHelper(`__VLS_WithTemplateSlots`, () => `
type __VLS_WithTemplateSlots<T, S> = T & {
	new(): {
		${(0, shared_1.getSlotsPropertyName)(vueCompilerOptions.target)}: S;
		${vueCompilerOptions.jsxSlots ? `$props: ${PropsChildren.name}<S>;` : ''}
	}
};
`.trimStart());
    const PropsChildren = defineHelper(`__VLS_PropsChildren`, () => `
type __VLS_PropsChildren<S> = {
	[K in keyof (
		boolean extends (
			// @ts-ignore
			JSX.ElementChildrenAttribute extends never
				? true
				: false
		)
			? never
			// @ts-ignore
			: JSX.ElementChildrenAttribute
	)]?: S;
};
`.trimStart());
    const TypePropsToOption = defineHelper(`__VLS_TypePropsToOption`, () => compilerOptions.exactOptionalPropertyTypes ?
        `
type __VLS_TypePropsToOption<T> = {
	[K in keyof T]-?: {} extends Pick<T, K>
		? { type: import('${vueCompilerOptions.lib}').PropType<T[K]> }
		: { type: import('${vueCompilerOptions.lib}').PropType<T[K]>, required: true }
};
`.trimStart() :
        `
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToOption<T> = {
	[K in keyof T]-?: {} extends Pick<T, K>
		? { type: import('${vueCompilerOptions.lib}').PropType<__VLS_NonUndefinedable<T[K]>> }
		: { type: import('${vueCompilerOptions.lib}').PropType<T[K]>, required: true }
};
`.trimStart());
    const OmitIndexSignature = defineHelper(`__VLS_OmitIndexSignature`, () => `type __VLS_OmitIndexSignature<T> = { [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K]; }${common_1.endOfLine}`);
    const helpers = {
        [PrettifyLocal.name]: PrettifyLocal,
        [OmitKeepDiscriminatedUnion.name]: OmitKeepDiscriminatedUnion,
        [WithDefaults.name]: WithDefaults,
        [WithTemplateSlots.name]: WithTemplateSlots,
        [PropsChildren.name]: PropsChildren,
        [TypePropsToOption.name]: TypePropsToOption,
        [OmitIndexSignature.name]: OmitIndexSignature,
    };
    used.clear();
    return {
        generate,
        getUsedNames() {
            return used;
        },
        get PrettifyLocal() { return PrettifyLocal.name; },
        get OmitKeepDiscriminatedUnion() { return OmitKeepDiscriminatedUnion.name; },
        get WithDefaults() { return WithDefaults.name; },
        get WithTemplateSlots() { return WithTemplateSlots.name; },
        get PropsChildren() { return PropsChildren.name; },
        get TypePropsToOption() { return TypePropsToOption.name; },
        get OmitIndexSignature() { return OmitIndexSignature.name; },
    };
    function* generate(names) {
        const generated = new Set();
        while (names.length) {
            used.clear();
            for (const name of names) {
                if (generated.has(name)) {
                    continue;
                }
                const helper = helpers[name];
                yield helper.generate();
                generated.add(name);
            }
            names = [...used].filter(name => !generated.has(name));
        }
    }
    function defineHelper(name, generate) {
        return {
            get name() {
                used.add(name);
                return name;
            },
            generate,
        };
    }
}
//# sourceMappingURL=localTypes.js.map