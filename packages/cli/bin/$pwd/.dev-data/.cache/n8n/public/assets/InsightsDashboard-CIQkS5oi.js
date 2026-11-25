const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/InsightsPaywall-CG187G0g.js","assets/vendor-Hx42-oQF.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-CB64RKTG.css","assets/app-D5flEmb-.js","assets/app-jHnVG3bN.css","assets/InsightsPaywall-BwoPTXBi.css","assets/InsightsChartTotal-krbC5klO.js","assets/insights.constants-BJhHT2pG.js","assets/dist-nd1xIsJf.js","assets/chartjs.utils-Dtx35jdw.js","assets/smart-decimal-EivKoUgC.js","assets/InsightsChartFailed-BPcEH8RO.js","assets/InsightsChartFailureRate-CORgy2ve.js","assets/insights.utils-nGksygvH.js","assets/InsightsChartTimeSaved-Dl-FXqUg.js","assets/InsightsChartAverageRuntime-CAvJHPls.js","assets/InsightsTableWorkflows-CqP97B0q.js","assets/InsightsTableWorkflows-B3RqXBmf.css"])))=>i.map(i=>d[i]);
import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jl as $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3, Kd as createVNode, Kl as $14e0f24ef4ac5c92$export$629b0a497aa65267, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Ul as $fae977aafc393c5c$export$6b862160d295c8e, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, Yo as useRoute, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, qd as defineAsyncComponent, ql as $14e0f24ef4ac5c92$export$aa8b41735afcabd2, su as ElDialog, vf as resolveDynamicComponent, xf as useModel, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { DN as __vitePreload, GM as Alert_default, Mw as ResponseError, QA as DateRangePicker_default, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, _N as N8nText_default, bN as N8nSpinner_default, dC as useToast, hC as useTelemetry, jN as useI18n, oC as useBasePageRedirectionHelper, qd as useDocumentTitle, s_ as get, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as useInsightsStore } from "./insights.store-DnugpkOH.js";
import { s as INSIGHT_TYPES } from "./insights.constants-BJhHT2pG.js";
import { a as timeRangeMappings, i as getTimeRangeLabels, n as getAdjustedDateRange, t as formatDateRange } from "./insights.utils-nGksygvH.js";
import { t as InsightsSummary_default } from "./InsightsSummary-di7i8i9y.js";
//#region ../../modules/insights/frontend/src/components/InsightsUpgradeModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { class: "perks-list" };
var _hoisted_2 = { class: "insight-modal-button-container" };
//#endregion
//#region ../../modules/insights/frontend/src/components/InsightsUpgradeModal.vue
var InsightsUpgradeModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InsightsUpgradeModal",
	props: {
		"modelValue": { type: Boolean },
		"modelModifiers": {}
	},
	emits: ["update:modelValue"],
	setup(__props) {
		const model = useModel(__props, "modelValue");
		const i18n = useI18n();
		function goToUpgrade() {
			model.value = false;
			useBasePageRedirectionHelper().goToUpgrade("insights", "upgrade-insights");
		}
		const perks = computed(() => [...Array(3).keys()].map((index) => i18n.baseText(`insights.upgradeModal.perks.${index}`)));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ElDialog), {
				modelValue: model.value,
				"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => model.value = $event),
				title: unref(i18n).baseText("insights.upgradeModal.title"),
				width: "500"
			}, {
				footer: withCtx(() => [createBaseVNode("div", _hoisted_2, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					onClick: _cache[0] || (_cache[0] = ($event) => model.value = false)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("insights.upgradeModal.button.dismiss")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "solid",
					onClick: goToUpgrade
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgrade")), 1)]),
					_: 1
				})])]),
				default: withCtx(() => [createBaseVNode("div", null, [createVNode(unref(N8nText_default), {
					tag: "p",
					class: "mb-s"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("insights.upgradeModal.content")), 1)]),
					_: 1
				}), createBaseVNode("ul", _hoisted_1$1, [(openBlock(true), createElementBlock(Fragment, null, renderList(perks.value, (perk) => {
					return openBlock(), createBlock(unref(N8nText_default), {
						key: perk,
						color: "text-dark",
						tag: "li"
					}, {
						default: withCtx(() => [_cache[2] || (_cache[2] = createBaseVNode("svg", {
							xmlns: "http://www.w3.org/2000/svg",
							viewBox: "0 0 16 16",
							width: "16px",
							height: "16px"
						}, [createBaseVNode("path", {
							d: "M 16 8 C 16 12.418 12.418 16 8 16 C 3.582 16 0 12.418 0 8 C 0 3.582 3.582 0 8 0 C 12.418 0 16 3.582 16 8 Z M 3.97 9.03 L 5.97 11.03 L 6.5 11.561 L 7.03 11.03 L 12.53 5.53 L 11.47 4.47 L 6.5 9.439 L 5.03 7.97 L 3.97 9.03 Z",
							fill: "currentColor"
						})], -1)), createTextVNode(" " + toDisplayString(perk), 1)]),
						_: 2
					}, 1024);
				}), 128))])])]),
				_: 1
			}, 8, ["modelValue", "title"]);
		};
	}
}), [["__scopeId", "data-v-dcac31eb"]]);
//#endregion
//#region ../../modules/insights/frontend/src/components/InsightsDataRangePicker.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var InsightsDataRangePicker_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InsightsDataRangePicker",
	props: {
		maxValue: {},
		minValue: {},
		modelValue: {},
		presets: {}
	},
	emits: [
		"update:modelValue",
		"update:placeholder",
		"update:startValue",
		"update:open"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const telemetry = useTelemetry();
		const upgradeModal = ref(false);
		function showUpgradeModal() {
			upgradeModal.value = true;
		}
		const actionType = ref("custom");
		function getDaysDiff({ start, end }) {
			if (!start) return 0;
			if (!end) return 0;
			return end.compare(start);
		}
		function isBeforeOrSame(dateToCompare, referenceDate) {
			return dateToCompare.compare(referenceDate) <= 0;
		}
		function isAfterOrSame(dateToCompare, referenceDate) {
			return dateToCompare.compare(referenceDate) >= 0;
		}
		function isEqual(dateToCompare, referenceDate) {
			if (!dateToCompare || !referenceDate) return false;
			return dateToCompare.compare(referenceDate) === 0;
		}
		function isValidDateRange({ start, end }) {
			if (!start) return false;
			if (!end) return false;
			return isBeforeOrSame(end, props.maxValue) && isAfterOrSame(start, props.minValue);
		}
		const range = shallowRef({
			start: props.modelValue.start?.copy(),
			end: props.modelValue.end?.copy()
		});
		function syncWithParentValue() {
			if (!isEqual(range.value?.start, props.modelValue.start) || !isEqual(range.value?.end, props.modelValue.end)) range.value = {
				start: props.modelValue.start?.copy(),
				end: props.modelValue.end?.copy()
			};
		}
		let lastSyncedRange = null;
		function syncData(isOpen) {
			if (isOpen) {
				syncWithParentValue();
				return;
			}
			const normalizedRange = {
				start: range.value?.start?.copy(),
				end: range.value?.end?.copy() ?? range.value?.start?.copy()
			};
			if (!isValidDateRange(normalizedRange)) {
				console.error("Invalid date range selected", normalizedRange);
				syncWithParentValue();
				return;
			}
			if (lastSyncedRange && isEqual(normalizedRange.start, lastSyncedRange.start) && isEqual(normalizedRange.end, lastSyncedRange.end)) return;
			if (isEqual(normalizedRange.start, props.modelValue.start) && isEqual(normalizedRange.end, props.modelValue.end)) return;
			lastSyncedRange = normalizedRange;
			emit("update:modelValue", normalizedRange);
			const { startDate, endDate } = getAdjustedDateRange(normalizedRange);
			const trackData = {
				start_date: startDate.toISOString(),
				end_date: endDate.toISOString(),
				range_length_days: getDaysDiff(normalizedRange),
				type: actionType.value
			};
			telemetry.track("User updated insights time range", trackData);
		}
		const open = ref(false);
		watch(open, (opened) => {
			if (opened) actionType.value = "custom";
			syncData(opened);
		});
		function setPresetRange(days) {
			range.value = {
				start: props.maxValue.copy().subtract({ days }),
				end: props.maxValue.copy()
			};
			actionType.value = "preset";
			open.value = false;
		}
		const formattedRange = computed(() => {
			const { start, end } = props.modelValue;
			if (!start) return "Select range";
			return formatDateRange({
				start,
				end
			});
		});
		function isActiveRange(presetValue) {
			if (!$14e0f24ef4ac5c92$export$629b0a497aa65267(props.modelValue.end, $14e0f24ef4ac5c92$export$aa8b41735afcabd2())) return false;
			return props.modelValue.end.compare(props.modelValue.start) === presetValue;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createVNode(unref(DateRangePicker_default), {
				modelValue: range.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => range.value = $event),
				open: open.value,
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => open.value = $event),
				"max-value": __props.maxValue,
				"min-value": __props.minValue
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					icon: "calendar"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(formattedRange.value), 1)]),
					_: 1
				})]),
				presets: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.presets, (preset) => {
					return openBlock(), createBlock(unref(N8nButton_default), {
						key: preset.value,
						class: normalizeClass(_ctx.$style.PresetButton),
						variant: isActiveRange(preset.value) ? "solid" : "outline",
						size: "small",
						onClick: ($event) => preset.disabled ? showUpgradeModal() : setPresetRange(preset.value)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(preset.label) + " ", 1), preset.disabled ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: "lock",
							class: normalizeClass(_ctx.$style.LockIcon)
						}, null, 8, ["class"])) : createCommentVNode("", true)]),
						_: 2
					}, 1032, [
						"class",
						"variant",
						"onClick"
					]);
				}), 128))]),
				_: 1
			}, 8, [
				"modelValue",
				"open",
				"max-value",
				"min-value"
			]), createVNode(InsightsUpgradeModal_default, {
				modelValue: upgradeModal.value,
				"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => upgradeModal.value = $event)
			}, null, 8, ["modelValue"])], 64);
		};
	}
}), [["__cssModules", { "$style": {
	PresetButton: "_PresetButton_1waws_2",
	LockIcon: "_LockIcon_1waws_7"
} }]]);
//#endregion
//#region ../../modules/insights/frontend/src/components/InsightsDateRangeAlert.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region ../../modules/insights/frontend/src/components/InsightsDateRangeAlert.vue
var InsightsDateRangeAlert_default = /* @__PURE__ */ defineComponent({
	__name: "InsightsDateRangeAlert",
	props: {
		earliestDataDate: {},
		rangeStart: {},
		rangeEnd: {}
	},
	emits: ["dismiss"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const isDismissed = ref(false);
		const alertInfo = computed(() => {
			if (!props.earliestDataDate) return null;
			const earliestCalendarDate = $fae977aafc393c5c$export$6b862160d295c8e(props.earliestDataDate.substring(0, 10));
			if (props.rangeStart.compare(earliestCalendarDate) >= 0) return null;
			if (props.rangeEnd.compare(earliestCalendarDate) < 0) return {
				earliestCalendarDate,
				daysWithoutData: 0,
				noData: true
			};
			return {
				earliestCalendarDate,
				daysWithoutData: earliestCalendarDate.compare(props.rangeStart),
				noData: false
			};
		});
		const formattedDate = computed(() => {
			if (!alertInfo.value) return "";
			const d = alertInfo.value.earliestCalendarDate.toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
			return new Intl.DateTimeFormat(void 0, {
				day: "numeric",
				month: "short",
				year: "numeric"
			}).format(d);
		});
		function dismiss() {
			isDismissed.value = true;
			emit("dismiss");
		}
		return (_ctx, _cache) => {
			return alertInfo.value && !isDismissed.value ? (openBlock(), createBlock(unref(Alert_default), {
				key: 0,
				type: "info",
				"show-icon": false,
				"data-test-id": "insights-date-range-alert"
			}, {
				icon: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-dark" }, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "info" })]),
					_: 1
				})]),
				title: withCtx(() => [createVNode(unref(N8nText_default), {
					color: "text-dark",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("insights.dashboard.dataRangeAlert.title")), 1)]),
					_: 1
				})]),
				aside: withCtx(() => [createVNode(unref(N8nButton_default), {
					size: "small",
					variant: "outline",
					label: unref(i18n).baseText("insights.dashboard.dataRangeAlert.dismiss"),
					"data-test-id": "insights-date-range-alert-dismiss",
					onClick: dismiss
				}, null, 8, ["label"])]),
				default: withCtx(() => [createVNode(unref(N8nText_default), { color: "text-dark" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(alertInfo.value.noData ? unref(i18n).baseText("insights.dashboard.dataRangeAlert.descriptionNoData", { interpolate: { date: formattedDate.value } }) : unref(i18n).baseText("insights.dashboard.dataRangeAlert.description", {
						interpolate: {
							date: formattedDate.value,
							days: alertInfo.value.daysWithoutData
						},
						adjustToNumber: alertInfo.value.daysWithoutData
					})), 1)]),
					_: 1
				})]),
				_: 1
			})) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region ../../modules/insights/frontend/src/components/InsightsDashboard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = {
	class: "mt-s",
	style: {
		"display": "flex",
		"gap": "12px",
		"align-items": "center"
	}
};
var InsightsDashboard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InsightsDashboard",
	props: { insightType: {} },
	setup(__props) {
		const InsightsPaywall = defineAsyncComponent(async () => await __vitePreload(() => import("./InsightsPaywall-CG187G0g.js"), __vite__mapDeps([0,1,2,3,4,5,6])));
		const InsightsChartTotal = defineAsyncComponent(async () => await __vitePreload(() => import("./InsightsChartTotal-krbC5klO.js"), __vite__mapDeps([7,1,2,3,4,5,8,9,10,11])));
		const InsightsChartFailed = defineAsyncComponent(async () => await __vitePreload(() => import("./InsightsChartFailed-BPcEH8RO.js"), __vite__mapDeps([12,1,2,3,4,5,8,11,9,10])));
		const InsightsChartFailureRate = defineAsyncComponent(async () => await __vitePreload(() => import("./InsightsChartFailureRate-CORgy2ve.js"), __vite__mapDeps([13,1,2,3,4,5,8,14,11,9,10])));
		const InsightsChartTimeSaved = defineAsyncComponent(async () => await __vitePreload(() => import("./InsightsChartTimeSaved-Dl-FXqUg.js"), __vite__mapDeps([15,1,2,3,4,5,8,14,9,10,11])));
		const InsightsChartAverageRuntime = defineAsyncComponent(async () => await __vitePreload(() => import("./InsightsChartAverageRuntime-CAvJHPls.js"), __vite__mapDeps([16,1,2,3,4,5,8,14,11,9,10])));
		const InsightsTableWorkflows = defineAsyncComponent(async () => await __vitePreload(() => import("./InsightsTableWorkflows-CqP97B0q.js"), __vite__mapDeps([17,1,2,3,4,5,8,14,11,18])));
		const props = __props;
		const route = useRoute();
		const i18n = useI18n();
		const toast = useToast();
		const insightsStore = useInsightsStore();
		const projectFilter = computed(() => get("project-filter"));
		const isTimeSavedRoute = computed(() => route.params.insightType === INSIGHT_TYPES.TIME_SAVED);
		const chartComponents = computed(() => ({
			total: InsightsChartTotal,
			failed: InsightsChartFailed,
			failureRate: InsightsChartFailureRate,
			timeSaved: InsightsChartTimeSaved,
			averageRunTime: InsightsChartAverageRuntime
		}));
		const transformFilter = ({ id, desc }) => {
			return `${id}:${desc ? "desc" : "asc"}`;
		};
		const sortTableBy = ref([{
			id: props.insightType,
			desc: true
		}]);
		const granularity = computed(() => {
			const { start, end } = range.value;
			if (!start || !end) return "day";
			const comparison = end.compare(start);
			if (comparison <= 0) return "hour";
			if (comparison <= 30) return "day";
			return "week";
		});
		const selectedProject = ref(null);
		const maxDate = $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
		const maxLicensedDate = insightsStore.dateRanges.toReversed().find((dateRange) => dateRange.licensed)?.key ?? "week";
		const timeRangeLabels = getTimeRangeLabels();
		const presets = computed(() => insightsStore.dateRanges.map((item) => {
			return {
				value: timeRangeMappings[item.key],
				label: timeRangeLabels[item.key],
				disabled: !item.licensed
			};
		}));
		const maximumValue = shallowRef(maxDate.copy());
		const minimumValue = shallowRef(maxDate.copy().subtract({ days: timeRangeMappings[maxLicensedDate] }));
		function getDefaultRangeStart() {
			const sevenDaysAgo = maxDate.copy().subtract({ days: 7 });
			if (insightsStore.earliestDataDate) {
				const earliestDate = $fae977aafc393c5c$export$6b862160d295c8e(insightsStore.earliestDataDate.substring(0, 10));
				return earliestDate.compare(sevenDaysAgo) > 0 ? earliestDate : sevenDaysAgo;
			}
			return sevenDaysAgo;
		}
		const range = shallowRef({
			start: getDefaultRangeStart(),
			end: maxDate.copy()
		});
		/**
		* Converts the range to adjusted Date objects for API calls
		*/
		const getFilteredRange = () => {
			return getAdjustedDateRange(range.value);
		};
		const fetchPaginatedTableData = ({ page = 0, itemsPerPage = 25, sortBy, projectId = selectedProject.value?.id }) => {
			const skip = page * itemsPerPage;
			const take = itemsPerPage;
			const sortKey = sortBy.length ? transformFilter(sortBy[0]) : void 0;
			const { startDate, endDate } = getFilteredRange();
			insightsStore.table.execute(0, {
				skip,
				take,
				sortBy: sortKey,
				startDate,
				endDate,
				projectId
			});
		};
		let latestFetchId = 0;
		watch(() => [
			props.insightType,
			selectedProject.value,
			range.value
		], async () => {
			const fetchId = ++latestFetchId;
			sortTableBy.value = [{
				id: props.insightType,
				desc: true
			}];
			const { startDate, endDate } = getFilteredRange();
			const projectId = selectedProject.value?.id;
			if (insightsStore.isSummaryEnabled) insightsStore.summary.execute(0, {
				startDate,
				endDate,
				projectId
			});
			const chartsPromise = insightsStore.charts.execute(0, {
				startDate,
				endDate,
				projectId
			});
			if (insightsStore.isDashboardEnabled) fetchPaginatedTableData({
				sortBy: sortTableBy.value,
				projectId
			});
			await chartsPromise;
			if (fetchId !== latestFetchId) return;
			const chartsError = insightsStore.charts.error;
			if (projectId && chartsError instanceof ResponseError && chartsError.httpStatusCode === 403) {
				toast.showError(chartsError, i18n.baseText("insights.dashboard.error.forbidden.title"), { message: i18n.baseText("insights.dashboard.error.forbidden.message") });
				selectedProject.value = null;
			}
		}, { immediate: true });
		onMounted(() => {
			useDocumentTitle().set(i18n.baseText("insights.heading"));
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.insightsView) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.insightsContainer) }, [
				createVNode(unref(N8nHeading_default), {
					bold: "",
					tag: "h2",
					size: "xlarge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("insights.dashboard.title")), 1)]),
					_: 1
				}),
				createBaseVNode("div", _hoisted_1, [projectFilter.value ? (openBlock(), createBlock(resolveDynamicComponent(projectFilter.value), {
					key: 0,
					modelValue: selectedProject.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedProject.value = $event),
					placeholder: unref(i18n).baseText("insights.dashboard.search.placeholder"),
					size: "mini",
					class: normalizeClass(_ctx.$style.projectSelect)
				}, null, 8, [
					"modelValue",
					"placeholder",
					"class"
				])) : createCommentVNode("", true), createVNode(InsightsDataRangePicker_default, {
					modelValue: range.value,
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => range.value = $event),
					"max-value": maximumValue.value,
					"min-value": minimumValue.value,
					presets: presets.value
				}, null, 8, [
					"modelValue",
					"max-value",
					"min-value",
					"presets"
				])]),
				(openBlock(), createBlock(InsightsDateRangeAlert_default, {
					key: range.value.start.toString(),
					class: "mt-s",
					"earliest-data-date": unref(insightsStore).earliestDataDate,
					"range-start": range.value.start,
					"range-end": range.value.end
				}, null, 8, [
					"earliest-data-date",
					"range-start",
					"range-end"
				])),
				unref(insightsStore).isSummaryEnabled ? (openBlock(), createBlock(InsightsSummary_default, {
					key: 0,
					summary: unref(insightsStore).summary.state,
					loading: unref(insightsStore).summary.isLoading,
					"start-date": range.value.start,
					"end-date": range.value.end,
					class: normalizeClass(_ctx.$style.insightsBanner)
				}, null, 8, [
					"summary",
					"loading",
					"start-date",
					"end-date",
					"class"
				])) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.insightsContent) }, [unref(insightsStore).isDashboardEnabled || isTimeSavedRoute.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.insightsContentWrapper)
				}, [
					createBaseVNode("div", { class: normalizeClass([_ctx.$style.dataLoader, { [_ctx.$style.isDataLoading]: unref(insightsStore).charts.isLoading || unref(insightsStore).table.isLoading }]) }, [createVNode(unref(N8nSpinner_default)), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("insights.chart.loading")), 1)], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.insightsChartWrapper) }, [createVNode(unref(N8nHeading_default), {
						bold: "",
						tag: "h3",
						size: "medium",
						class: "mb-s"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("insights.dashboard.chart.title", { interpolate: { granularity: granularity.value } })), 1)]),
						_: 1
					}), (openBlock(), createBlock(resolveDynamicComponent(chartComponents.value[props.insightType]), {
						type: props.insightType,
						data: unref(insightsStore).charts.state,
						granularity: granularity.value,
						"start-date": range.value.start.toString(),
						"end-date": range.value.end.toString()
					}, null, 8, [
						"type",
						"data",
						"granularity",
						"start-date",
						"end-date"
					]))], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.insightsTableWrapper) }, [createVNode(unref(InsightsTableWorkflows), {
						"sort-by": sortTableBy.value,
						"onUpdate:sortBy": _cache[2] || (_cache[2] = ($event) => sortTableBy.value = $event),
						data: unref(insightsStore).table.state,
						loading: unref(insightsStore).table.isLoading,
						"is-dashboard-enabled": unref(insightsStore).isDashboardEnabled,
						"onUpdate:options": fetchPaginatedTableData
					}, null, 8, [
						"sort-by",
						"data",
						"loading",
						"is-dashboard-enabled"
					])], 2)
				], 2)) : (openBlock(), createBlock(unref(InsightsPaywall), { key: 1 }))], 2)
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	insightsView: "_insightsView_1xu2k_1",
	insightsContainer: "_insightsContainer_1xu2k_9",
	insightsBanner: "_insightsBanner_1xu2k_16",
	insightsContent: "_insightsContent_1xu2k_24",
	insightsContentWrapper: "_insightsContentWrapper_1xu2k_33",
	insightsChartWrapper: "_insightsChartWrapper_1xu2k_38",
	insightsTableWrapper: "_insightsTableWrapper_1xu2k_45",
	dataLoader: "_dataLoader_1xu2k_51",
	isDataLoading: "_isDataLoading_1xu2k_64",
	projectSelect: "_projectSelect_1xu2k_86",
	PresetButton: "_PresetButton_1xu2k_93"
} }]]);
//#endregion
export { InsightsDashboard_default as default };
