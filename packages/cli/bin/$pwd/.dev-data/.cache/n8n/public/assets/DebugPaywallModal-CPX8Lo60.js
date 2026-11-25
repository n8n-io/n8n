import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Sp as toDisplayString, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, _N as N8nText_default, hM as N8nLink_default, jN as useI18n, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as Modal_default } from "./Modal-99d4T-ue.js";
//#region src/features/execution/executions/components/DebugPaywallModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var DebugPaywallModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "DebugPaywallModal",
	props: {
		modalName: {},
		data: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Modal_default, {
				width: "500px",
				title: props.data.title,
				name: props.modalName
			}, {
				content: withCtx(() => [createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [
						createTextVNode(toDisplayString(unref(i18n).baseText("executionsList.debug.paywall.content")) + " ", 1),
						_cache[0] || (_cache[0] = createBaseVNode("br", null, null, -1)),
						_cache[1] || (_cache[1] = createBaseVNode("br", null, null, -1)),
						createTextVNode(" " + toDisplayString(unref(i18n).baseText("executionsList.debug.paywall.subContent")) + " ", 1),
						createVNode(unref(N8nLink_default), {
							to: unref(i18n).baseText("executionsList.debug.paywall.link.url"),
							"new-window": ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionsList.debug.paywall.link.text")), 1)]),
							_: 1
						}, 8, ["to"])
					]),
					_: 1
				})]),
				footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [createVNode(unref(N8nButton_default), { onClick: props.data.footerButtonAction }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.seePlans")), 1)]),
					_: 1
				}, 8, ["onClick"])], 2)]),
				_: 1
			}, 8, ["title", "name"]);
		};
	}
}), [["__cssModules", { "$style": { footer: "_footer_dpaca_1" } }]]);
//#endregion
export { DebugPaywallModal_default as default };
