import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, hf as renderSlot, ip as init_shared_esm_bundler, rf as mergeProps, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $j as N8nLogo_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, cM as N8nFormBox_default, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/features/core/auth/views/AuthView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AuthView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AuthView",
	props: {
		form: { default: void 0 },
		formLoading: {
			type: Boolean,
			default: false
		},
		subtitle: { default: void 0 }
	},
	emits: [
		"update",
		"submit",
		"secondaryClick"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const onUpdate = (e) => {
			emit("update", e);
		};
		const onSubmit = (data) => {
			emit("submit", data);
		};
		const onSecondaryClick = () => {
			emit("secondaryClick");
		};
		const { settings: { releaseChannel } } = useSettingsStore();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				createVNode(unref(N8nLogo_default), {
					size: "large",
					"release-channel": unref(releaseChannel)
				}, null, 8, ["release-channel"]),
				__props.subtitle ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.textContainer)
				}, [createVNode(unref(N8nText_default), { size: "large" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.subtitle), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.formContainer) }, [renderSlot(_ctx.$slots, "default", {}, () => [__props.form ? (openBlock(), createBlock(unref(N8nFormBox_default), mergeProps({ key: 0 }, __props.form, {
					"data-test-id": "auth-form",
					"button-loading": __props.formLoading,
					"submit-button-variant": "brand",
					onSecondaryClick,
					onSubmit,
					onUpdate
				}), null, 16, ["button-loading"])) : createCommentVNode("", true)])], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1l1y2_5",
	textContainer: "_textContainer_1l1y2_15",
	formContainer: "_formContainer_1l1y2_19"
} }]]);
//#endregion
export { AuthView_default as t };
