import { $d as init_runtime_core_esm_bundler, Hd as createElementBlock, Jd as defineComponent, Rd as computed, ff as openBlock, hf as renderSlot } from "./vendor-Hx42-oQF.js";
import { yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/app/components/EnterpriseEdition.ee.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/app/components/EnterpriseEdition.ee.vue
var EnterpriseEdition_ee_default = /* @__PURE__ */ defineComponent({
	__name: "EnterpriseEdition.ee",
	props: { features: { default: () => [] } },
	setup(__props) {
		const props = __props;
		const settingsStore = useSettingsStore();
		const canAccess = computed(() => props.features.reduce((acc, feature) => acc && !!settingsStore.isEnterpriseFeatureEnabled[feature], true));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", null, [canAccess.value ? renderSlot(_ctx.$slots, "default", { key: 0 }) : renderSlot(_ctx.$slots, "fallback", { key: 1 })]);
		};
	}
});
//#endregion
export { EnterpriseEdition_ee_default as t };
