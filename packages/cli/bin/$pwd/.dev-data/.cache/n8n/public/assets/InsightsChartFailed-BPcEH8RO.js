import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Jd as defineComponent, Nf as init_reactivity_esm_bundler, Rd as computed, Xf as unref, ff as openBlock, ku as useCssVar } from "./vendor-Hx42-oQF.js";
import { jN as useI18n } from "./app-D5flEmb-.js";
import { t as GRANULARITY_DATE_FORMAT_MASK } from "./insights.constants-BJhHT2pG.js";
import { t as smartDecimal } from "./smart-decimal-EivKoUgC.js";
import { t as Bar } from "./dist-nd1xIsJf.js";
import { t as generateBarChartOptions } from "./chartjs.utils-Dtx35jdw.js";
//#region ../../modules/insights/frontend/src/components/charts/InsightsChartFailed.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region ../../modules/insights/frontend/src/components/charts/InsightsChartFailed.vue
var InsightsChartFailed_default = /* @__PURE__ */ defineComponent({
	__name: "InsightsChartFailed",
	props: {
		data: {},
		type: {},
		granularity: {},
		startDate: {},
		endDate: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const colorPrimary = useCssVar("--color--primary", document.body);
		const chartOptions = computed(() => generateBarChartOptions({ plugins: { tooltip: { callbacks: { label: (context) => {
			return `${context.dataset.label ?? ""} ${smartDecimal(context.parsed.y)}`;
		} } } } }));
		const chartData = computed(() => {
			const labels = [];
			const data = [];
			for (const entry of props.data) {
				labels.push(GRANULARITY_DATE_FORMAT_MASK[props.granularity](entry.date));
				data.push(entry.values.failed);
			}
			return {
				labels,
				datasets: [{
					label: i18n.baseText("insights.chart.failed"),
					data,
					backgroundColor: colorPrimary.value
				}]
			};
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Bar), {
				"data-test-id": "insights-chart-failed",
				data: chartData.value,
				options: chartOptions.value
			}, null, 8, ["data", "options"]);
		};
	}
});
//#endregion
export { InsightsChartFailed_default as default };
