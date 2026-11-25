import { $d as init_runtime_core_esm_bundler, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, jN as useI18n, xN as N8nIcon_default } from "./app-D5flEmb-.js";
//#region src/app/components/GoBackButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["textContent"];
var GoBackButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "GoBackButton",
	setup(__props) {
		const router = useRouter();
		const i18n = useI18n();
		const navigateTo = () => {
			router.back();
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.wrapper),
				onClick: navigateTo
			}, [createVNode(unref(N8nIcon_default), {
				class: normalizeClass(_ctx.$style.icon),
				icon: "arrow-left"
			}, null, 8, ["class"]), createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.text),
				textContent: toDisplayString(unref(i18n).baseText("template.buttons.goBackButton"))
			}, null, 10, _hoisted_1)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_1vvl9_1",
	icon: "_icon_1vvl9_6",
	text: "_text_1vvl9_7"
} }]]);
//#endregion
//#region src/features/workflows/templates/views/TemplatesView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var TemplatesView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TemplatesView",
	props: {
		goBackEnabled: {
			type: Boolean,
			default: false
		},
		fullWidth: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.template, { [_ctx.$style.fullWidth]: __props.fullWidth }]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [__props.goBackEnabled ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.header)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.goBack) }, [createVNode(GoBackButton_default)], 2), renderSlot(_ctx.$slots, "header")], 2)) : createCommentVNode("", true), createBaseVNode("div", null, [renderSlot(_ctx.$slots, "content")])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	template: "_template_12t5v_1",
	fullWidth: "_fullWidth_12t5v_13",
	container: "_container_12t5v_18",
	header: "_header_12t5v_22",
	goBack: "_goBack_12t5v_28"
} }]]);
//#endregion
export { TemplatesView_default as t };
