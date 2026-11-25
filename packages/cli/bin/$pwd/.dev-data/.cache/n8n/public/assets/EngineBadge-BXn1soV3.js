import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Sp as toDisplayString, Vd as createCommentVNode, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, jN as useI18n, nN as N8nBadge_default, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/app/components/EngineBadge.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var EngineBadge_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EngineBadge",
	props: {
		engine: {},
		size: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const settingsStore = useSettingsStore();
		const label = computed(() => i18n.baseText("generic.engine", { interpolate: { engine: props.engine } }));
		return (_ctx, _cache) => {
			return unref(settingsStore).isEngineV2Enabled ? (openBlock(), createBlock(unref(N8nBadge_default), {
				key: 0,
				size: props.size,
				class: normalizeClass(_ctx.$style.badge)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(label.value), 1)]),
				_: 1
			}, 8, ["size", "class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": { badge: "_badge_r5fzu_1" } }]]);
//#endregion
export { EngineBadge_default as t };
