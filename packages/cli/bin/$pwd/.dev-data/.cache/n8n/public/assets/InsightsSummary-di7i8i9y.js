import { $d as init_runtime_core_esm_bundler, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Vd as createCommentVNode, Xf as unref, Yo as useRoute, _p as normalizeClass, bd as I18nT, ff as openBlock, gf as resolveComponent, ip as init_shared_esm_bundler, mf as renderList, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { SN as _plugin_vue_export_helper_default, fC as VIEWS, fN as N8nTooltip_default, hC as useTelemetry, jN as useI18n, xN as N8nIcon_default } from "./app-D5flEmb-.js";
import { i as INSIGHTS_UNIT_IMPACT_MAPPING, o as INSIGHT_IMPACT_TYPES } from "./insights.constants-BJhHT2pG.js";
import { i as getTimeRangeLabels, r as getMatchingPreset, t as formatDateRange } from "./insights.utils-nGksygvH.js";
import { t as smartDecimal } from "./smart-decimal-EivKoUgC.js";
//#region ../../modules/insights/frontend/src/components/InsightsSummary.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { "data-test-id": "insights-summary-tabs" };
var _hoisted_2 = ["data-test-id"];
var _hoisted_3 = ["href"];
var _hoisted_4 = { key: 1 };
var InsightsSummary_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InsightsSummary",
	props: {
		summary: {},
		startDate: {},
		endDate: {},
		loading: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const route = useRoute();
		const $style = useCssModule();
		const telemetry = useTelemetry();
		const timeRangeLabels = getTimeRangeLabels();
		const displayDateRangeLabel = computed(() => {
			const timeRangeKey = getMatchingPreset({
				start: props.startDate,
				end: props.endDate
			});
			if (timeRangeKey) return timeRangeLabels[timeRangeKey];
			return formatDateRange({
				start: props.startDate,
				end: props.endDate
			});
		});
		const summaryTitles = computed(() => ({
			total: i18n.baseText("insights.banner.title.total"),
			failed: i18n.baseText("insights.banner.title.failed"),
			failureRate: i18n.baseText("insights.banner.title.failureRate"),
			timeSaved: i18n.baseText("insights.banner.title.timeSaved"),
			averageRunTime: i18n.baseText("insights.banner.title.averageRunTime")
		}));
		const summaryHasNoData = computed(() => {
			const summaryValues = Object.values(props.summary);
			return summaryValues.length > 0 && summaryValues.every((summary) => !summary.value);
		});
		const summaryWithRouteLocations = computed(() => props.summary.map((s) => ({
			...s,
			to: {
				name: VIEWS.INSIGHTS,
				params: { insightType: s.id },
				query: route.query
			}
		})));
		const getImpactStyle = (id, value) => {
			const impact = INSIGHTS_UNIT_IMPACT_MAPPING[id];
			if (value === 0 || impact === INSIGHT_IMPACT_TYPES.NEUTRAL) return $style.neutral;
			if (impact === INSIGHT_IMPACT_TYPES.POSITIVE) return value > 0 ? $style.positive : $style.negative;
			if (impact === INSIGHT_IMPACT_TYPES.NEGATIVE) return value < 0 ? $style.positive : $style.negative;
			return $style.neutral;
		};
		const trackTabClick = (insightType) => {
			telemetry.track(`User clicked ${summaryTitles.value[insightType]}`, { referrer: route.name === VIEWS.INSIGHTS ? "Dashboard" : "Overview" });
		};
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createElementBlock("div", { class: normalizeClass(unref($style).insightsWrapper) }, [createBaseVNode("div", { class: normalizeClass(unref($style).insights) }, [createBaseVNode("ul", _hoisted_1, [(openBlock(true), createElementBlock(Fragment, null, renderList(summaryWithRouteLocations.value, ({ id, value, deviation, deviationUnit, unit, to }) => {
				return openBlock(), createElementBlock("li", {
					key: id,
					"data-test-id": `insights-summary-tab-${id}`
				}, [createVNode(unref(N8nTooltip_default), {
					placement: unref(route).name === unref(VIEWS).INSIGHTS ? "bottom" : "top",
					disabled: !(summaryHasNoData.value && id === "total"),
					"show-after": 500
				}, {
					content: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "insights.banner.noData.tooltip",
						scope: "global"
					}, {
						link: withCtx(() => [createBaseVNode("a", {
							href: unref(i18n).baseText("insights.banner.noData.tooltip.link.url"),
							target: "_blank"
						}, toDisplayString(unref(i18n).baseText("insights.banner.noData.tooltip.link")), 9, _hoisted_3)]),
						_: 1
					})]),
					default: withCtx(() => [createVNode(_component_RouterLink, {
						to,
						"exact-active-class": unref($style).activeTab,
						onClick: ($event) => trackTabClick(id)
					}, {
						default: withCtx(() => [
							createBaseVNode("strong", null, [createVNode(unref(N8nTooltip_default), {
								placement: "bottom",
								disabled: id !== "timeSaved"
							}, {
								content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("insights.banner.title.timeSaved.tooltip")), 1)]),
								default: withCtx(() => [createTextVNode(" " + toDisplayString(summaryTitles.value[id]), 1)]),
								_: 2
							}, 1032, ["disabled"])]),
							createBaseVNode("small", { class: normalizeClass(unref($style).days) }, toDisplayString(displayDateRangeLabel.value), 3),
							value === 0 && id === "timeSaved" ? (openBlock(), createElementBlock("span", {
								key: 0,
								class: normalizeClass(unref($style).empty)
							}, [_cache[0] || (_cache[0] = createBaseVNode("em", null, "--", -1)), createBaseVNode("small", null, [createVNode(unref(N8nTooltip_default), { placement: "bottom" }, {
								content: withCtx(() => [createVNode(unref(I18nT), {
									keypath: "insights.banner.timeSaved.tooltip",
									scope: "global"
								}, {
									link: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("insights.banner.timeSaved.tooltip.link.text")), 1)]),
									_: 1
								})]),
								default: withCtx(() => [createVNode(unref(N8nIcon_default), {
									icon: "info",
									size: "medium"
								})]),
								_: 1
							})])], 2)) : (openBlock(), createElementBlock("span", _hoisted_4, [createBaseVNode("em", null, [createTextVNode(toDisplayString(unref(smartDecimal)(value).toLocaleString("en-US")) + " ", 1), createBaseVNode("i", null, toDisplayString(unit), 1)]), deviation !== null ? (openBlock(), createElementBlock("small", {
								key: 0,
								class: normalizeClass(getImpactStyle(id, deviation))
							}, [createVNode(unref(N8nIcon_default), {
								class: normalizeClass([unref($style).icon, getImpactStyle(id, deviation)]),
								size: 12,
								icon: deviation === 0 ? "chevron-right" : deviation > 0 ? "chevron-up" : "chevron-down"
							}, null, 8, ["class", "icon"]), createVNode(unref(N8nTooltip_default), {
								placement: "bottom",
								disabled: id !== "failureRate"
							}, {
								content: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("insights.banner.failureRate.deviation.tooltip")), 1)]),
								default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(smartDecimal)(Math.abs(deviation)).toLocaleString("en-US")) + toDisplayString(deviationUnit), 1)]),
								_: 2
							}, 1032, ["disabled"])], 2)) : createCommentVNode("", true)]))
						]),
						_: 2
					}, 1032, [
						"to",
						"exact-active-class",
						"onClick"
					])]),
					_: 2
				}, 1032, ["placement", "disabled"])], 8, _hoisted_2);
			}), 128))])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	insightsWrapper: "_insightsWrapper_13964_1",
	insights: "_insights_13964_1",
	activeTab: "_activeTab_13964_49",
	days: "_days_13964_62",
	empty: "_empty_13964_73",
	noData: "_noData_13964_111",
	positive: "_positive_13964_116",
	negative: "_negative_13964_120",
	neutral: "_neutral_13964_124",
	icon: "_icon_13964_127",
	loading: "_loading_13964_139",
	queueModeWarning: "_queueModeWarning_13964_150",
	underlined: "_underlined_13964_156"
} }]]);
//#endregion
export { InsightsSummary_default as t };
