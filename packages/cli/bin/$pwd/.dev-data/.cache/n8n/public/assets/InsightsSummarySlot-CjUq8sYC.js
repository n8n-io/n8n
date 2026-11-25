import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Vd as createCommentVNode, Xf as unref, ff as openBlock, lf as onMounted } from "./vendor-Hx42-oQF.js";
import { t as useInsightsStore } from "./insights.store-DnugpkOH.js";
import { t as InsightsSummary_default } from "./InsightsSummary-di7i8i9y.js";
import "./src-DnjiQGBn.js";
//#region src/features/collaboration/projects/components/InsightsSummarySlot.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/collaboration/projects/components/InsightsSummarySlot.vue
var InsightsSummarySlot_default = /* @__PURE__ */ defineComponent({
	__name: "InsightsSummarySlot",
	setup(__props) {
		const insightsStore = useInsightsStore();
		onMounted(() => {
			if (insightsStore.isSummaryEnabled) insightsStore.weeklySummary.execute();
		});
		return (_ctx, _cache) => {
			return unref(insightsStore).isSummaryEnabled ? (openBlock(), createBlock(unref(InsightsSummary_default), {
				key: 0,
				loading: unref(insightsStore).weeklySummary.isLoading,
				summary: unref(insightsStore).weeklySummary.state,
				"time-range": "week"
			}, null, 8, ["loading", "summary"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
export { InsightsSummarySlot_default as default };
