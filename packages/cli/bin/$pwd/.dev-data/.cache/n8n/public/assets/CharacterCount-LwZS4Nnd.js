import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, _N as N8nText_default, jN as useI18n } from "./app-D5flEmb-.js";
//#region src/app/components/CharacterCount.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CharacterCount_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CharacterCount",
	props: {
		value: {},
		max: {},
		showWhenEmpty: { type: Boolean }
	},
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return __props.value || __props.showWhenEmpty ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				size: "xsmall",
				color: "text-light",
				class: normalizeClass(_ctx.$style.characterCount)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.characterCount", { interpolate: {
					count: String(__props.value.length),
					max: String(__props.max)
				} })), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { characterCount: "_characterCount_alw37_1" } }]]);
//#endregion
export { CharacterCount_default as t };
