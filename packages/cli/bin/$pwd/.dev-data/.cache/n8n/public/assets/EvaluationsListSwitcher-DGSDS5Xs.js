const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/EvalCollectionsListView-DBBfDx6Y.js","assets/vendor-Hx42-oQF.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-CB64RKTG.css","assets/app-D5flEmb-.js","assets/app-jHnVG3bN.css","assets/evaluation.utils-BLlHOReH.js","assets/useIntersectionObserver-BTGMngAL.js","assets/useIntersectionObserver-CVH8U9lD.js","assets/GroupedMetricChart--8jQxUhP.js","assets/GroupedMetricChart-Cl-PnhZi.css","assets/EvalCollectionsListView-DEApbtOp.css"])))=>i.map(i=>d[i]);
import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, $l as ElTable, Aa as require_isEqual, Bd as createBlock, Df as withCtx, Ef as watchEffect, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xf as unref, Xo as useRouter, _p as normalizeClass, bd as I18nT, eu as ElTableColumn, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, ku as useCssVar, lf as onMounted, lo as defineStore, mf as renderList, nf as mergeModels, qd as defineAsyncComponent, rf as mergeProps, xf as useModel, zd as createBaseVNode, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { DN as __vitePreload, Mn as convertToDisplayDate, Nj as N8nPopover_default, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, TM as N8nPagination_default, _N as N8nText_default, bj as N8nSlider_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, ff as useEvaluationStore, hC as useTelemetry, jN as useI18n, mM as N8nOption_default, pM as N8nSelect_default, qx as LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW, vN as N8nIconButton_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as AnimatedSpinner_default } from "./AnimatedSpinner-tg41dWUW.js";
import "./evaluation.utils-BLlHOReH.js";
import { f as resolveCompilationFailureReason, l as getErrorBaseKey, p as statusDictionary } from "./evaluation.constants-DxyMe5Zh.js";
import { t as require_orderBy } from "./orderBy-qvd4mxOh.js";
import { t as useEvalCollectionsFlag } from "./useEvalCollectionsFlag-CEl2un4l.js";
import { r as Line } from "./dist-nd1xIsJf.js";
//#region src/features/ai/evaluation.ee/components/ConcurrencySlider/ConcurrencySlider.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/ai/evaluation.ee/components/ConcurrencySlider/index.ts
var ConcurrencySlider_default = /* @__PURE__ */ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ConcurrencySlider",
	props: {
		modelValue: {},
		min: { default: 0 },
		max: { default: 100 },
		step: { default: 1 },
		disabled: {
			type: Boolean,
			default: false
		},
		showStops: {
			type: Boolean,
			default: false
		},
		label: {}
	},
	emits: ["update:modelValue", "change"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		function onUpdate([value]) {
			emit("update:modelValue", value);
		}
		function onCommit([value]) {
			emit("change", value);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nSlider_default), {
				"model-value": __props.modelValue === void 0 ? void 0 : [__props.modelValue],
				"min-value": __props.min,
				"max-value": __props.max,
				step: __props.step,
				disabled: __props.disabled,
				"show-step-markers": false,
				"aria-label": __props.label,
				"hide-value": "",
				size: "small",
				class: normalizeClass(_ctx.$style.slider),
				"onUpdate:modelValue": onUpdate,
				onValueCommit: onCommit
			}, null, 8, [
				"model-value",
				"min-value",
				"max-value",
				"step",
				"disabled",
				"aria-label",
				"class"
			]);
		};
	}
}), [["__cssModules", { "$style": { slider: "_slider_b347p_1" } }]]);
//#endregion
//#region src/features/ai/evaluation.ee/composables/useMetricsChart.ts
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
function useMetricsChart() {
	const colors = {
		primary: useCssVar("--color--primary", document.body).value ?? "",
		textBase: useCssVar("--color--text", document.body).value ?? "",
		backgroundXLight: useCssVar("--color--background--light-3", document.body).value ?? "",
		foregroundLight: useCssVar("--color--foreground--tint-1", document.body).value ?? "",
		foregroundBase: useCssVar("--color--foreground", document.body).value ?? "",
		foregroundDark: useCssVar("--color--foreground--shade-1", document.body).value ?? ""
	};
	function generateChartData(runs, metric) {
		return { datasets: [{
			data: runs,
			parsing: {
				xAxisKey: "id",
				yAxisKey: `metrics.${metric}`
			},
			borderColor: colors.primary,
			backgroundColor: colors.backgroundXLight,
			borderWidth: 1,
			pointRadius: 2,
			pointHoverRadius: 4,
			pointBackgroundColor: colors.backgroundXLight,
			pointHoverBackgroundColor: colors.backgroundXLight
		}] };
	}
	function generateChartOptions({ metric, data }) {
		return {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			devicePixelRatio: 2,
			interaction: {
				mode: "index",
				intersect: false
			},
			scales: {
				y: {
					border: { display: false },
					grid: { color: colors.foregroundBase },
					ticks: {
						padding: 8,
						color: colors.textBase
					}
				},
				x: {
					border: { display: false },
					grid: { display: false },
					ticks: {
						color: colors.textBase,
						callback(_tickValue, index) {
							return `#${data[index].index}`;
						}
					}
				}
			},
			plugins: {
				tooltip: {
					backgroundColor: colors.backgroundXLight,
					titleColor: colors.textBase,
					titleFont: { weight: "600" },
					bodyColor: colors.textBase,
					bodySpacing: 4,
					padding: 12,
					borderColor: colors.foregroundBase,
					borderWidth: 1,
					displayColors: true,
					callbacks: {
						title: (tooltipItems) => {
							return (0, import_dateformat.default)(tooltipItems[0].raw.runAt, "yyyy-mm-dd HH:MM");
						},
						label: (context) => `${metric}: ${context.parsed.y.toFixed(2)}`,
						labelColor() {
							return {
								borderColor: "rgba(29, 21, 21, 0)",
								backgroundColor: colors.primary,
								borderWidth: 0,
								borderRadius: 5
							};
						}
					}
				},
				legend: { display: false }
			}
		};
	}
	return {
		generateChartData,
		generateChartOptions
	};
}
//#endregion
//#region src/features/ai/evaluation.ee/components/ListRuns/MetricsChart.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var MetricsChart_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MetricsChart",
	props: {
		selectedMetric: {},
		runs: {}
	},
	emits: ["update:selectedMetric"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const props = __props;
		const metricsChart = useMetricsChart();
		const locale = useI18n();
		const availableMetrics = computed(() => {
			return props.runs.reduce((acc, run) => {
				const metricKeys = Object.keys(run.metrics ?? {});
				return [.../* @__PURE__ */ new Set([...acc, ...metricKeys])];
			}, []);
		});
		const filteredRuns = computed(() => props.runs.filter((run) => run.metrics?.[props.selectedMetric] !== void 0));
		const chartData = computed(() => metricsChart.generateChartData(filteredRuns.value, props.selectedMetric));
		const chartOptions = computed(() => metricsChart.generateChartOptions({
			metric: props.selectedMetric,
			data: filteredRuns.value
		}));
		watchEffect(() => {
			if (props.runs.length > 0 && !props.selectedMetric) emit("update:selectedMetric", availableMetrics.value[0]);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.metricsChartContainer) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.chartHeader) }, [createVNode(unref(N8nSelect_default), {
				"model-value": __props.selectedMetric,
				class: normalizeClass(_ctx.$style.metricSelect),
				placeholder: unref(locale).baseText("evaluation.listRuns.selectMetric"),
				size: "small",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:selectedMetric", $event))
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(availableMetrics.value, (metric) => {
					return openBlock(), createBlock(unref(N8nOption_default), {
						key: metric,
						label: metric,
						value: metric
					}, null, 8, ["label", "value"]);
				}), 128))]),
				_: 1
			}, 8, [
				"model-value",
				"class",
				"placeholder"
			])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.chartWrapper) }, [(openBlock(), createBlock(unref(Line), {
				key: __props.selectedMetric,
				data: chartData.value,
				options: chartOptions.value,
				class: normalizeClass(_ctx.$style.metricsChart)
			}, null, 8, [
				"data",
				"options",
				"class"
			]))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	metricsChartContainer: "_metricsChartContainer_junu2_1",
	chartHeader: "_chartHeader_junu2_6",
	metricSelect: "_metricSelect_junu2_9",
	chartWrapper: "_chartWrapper_junu2_12"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/shared/TestTableBase.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var TestTableBase_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TestTableBase",
	props: {
		data: {},
		columns: {},
		showControls: { type: Boolean },
		defaultSort: { default: () => ({
			prop: "date",
			order: "descending"
		}) },
		selectable: {
			type: Boolean,
			default: false
		},
		selectableFilter: {
			type: Function,
			default: () => true
		},
		expandedRows: { default: () => /* @__PURE__ */ new Set() }
	},
	emits: ["rowClick", "selectionChange"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const $style = useCssModule();
		const tableRef = ref();
		const selectedRows = ref([]);
		const localData = ref([]);
		const emit = __emit;
		watch(() => props.data, async (newData) => {
			if (!(0, import_isEqual.default)(localData.value, newData)) {
				const currentSelectionIds = selectedRows.value.map((row) => row.id);
				localData.value = newData;
				await nextTick();
				tableRef.value?.sort(props.defaultSort.prop, props.defaultSort.order);
				currentSelectionIds.forEach((id) => {
					const row = localData.value.find((r) => r.id === id);
					if (row) tableRef.value?.toggleRowSelection(row, true);
				});
			}
		}, {
			immediate: true,
			deep: true
		});
		const handleSelectionChange = (rows) => {
			selectedRows.value = rows;
			emit("selectionChange", rows);
		};
		const handleColumnResize = (newWidth, _oldWidth, column) => {
			if (column.minWidth && newWidth < column.minWidth) column.width = column.minWidth;
		};
		const getCellClassName = ({ row }) => {
			return `${props.expandedRows?.has(row.id) ? $style.expandedCell : $style.baseCell}`;
		};
		const getRowClassName = ({ row }) => {
			return `${"status" in row && row?.status === "error" ? $style.customDisabledRow : $style.customRow} ${props.expandedRows?.has(row.id) ? $style.expandedRow : ""}`;
		};
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ElTable), {
				ref_key: "tableRef",
				ref: tableRef,
				class: normalizeClass(unref($style).table),
				"default-sort": __props.defaultSort,
				data: localData.value,
				border: true,
				"cell-class-name": getCellClassName,
				"row-class-name": getRowClassName,
				"scrollbar-always-on": "",
				onSelectionChange: handleSelectionChange,
				onHeaderDragend: handleColumnResize,
				onRowClick: _cache[0] || (_cache[0] = (row) => _ctx.$emit("rowClick", row))
			}, {
				default: withCtx(() => [__props.selectable ? (openBlock(), createBlock(unref(ElTableColumn), {
					key: 0,
					type: "selection",
					selectable: __props.selectableFilter,
					"data-test-id": "table-column-select",
					width: "46",
					fixed: "",
					align: "center"
				}, null, 8, ["selectable"])) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(__props.columns, (column) => {
					return openBlock(), createBlock(unref(ElTableColumn), mergeProps({ key: column.prop }, { ref_for: true }, column, {
						resizable: true,
						"data-test-id": "table-column",
						"min-width": column.minWidth ?? unref(125)
					}), {
						header: withCtx((headerProps) => [createVNode(unref(N8nTooltip_default), {
							content: headerProps.column.label,
							placement: "top",
							disabled: !column.showHeaderTooltip
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(unref($style).customHeaderCell) }, [createBaseVNode("div", { class: normalizeClass(unref($style).customHeaderCellLabel) }, toDisplayString(headerProps.column.label), 3), headerProps.column.sortable && headerProps.column.order ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(unref($style).customHeaderCellSort)
							}, [createVNode(unref(N8nIcon_default), {
								icon: headerProps.column.order === "descending" ? "arrow-up" : "arrow-down",
								size: "small"
							}, null, 8, ["icon"])], 2)) : createCommentVNode("", true)], 2)]),
							_: 2
						}, 1032, ["content", "disabled"])]),
						default: withCtx(({ row }) => [
							column.prop === "id" ? renderSlot(_ctx.$slots, "id", mergeProps({
								key: 0,
								ref_for: true
							}, { row })) : createCommentVNode("", true),
							column.prop === "index" ? renderSlot(_ctx.$slots, "index", mergeProps({
								key: 1,
								ref_for: true
							}, { row })) : createCommentVNode("", true),
							column.prop === "status" ? renderSlot(_ctx.$slots, "status", mergeProps({
								key: 2,
								ref_for: true
							}, { row })) : createCommentVNode("", true)
						]),
						_: 2
					}, 1040, ["min-width"]);
				}), 128))]),
				_: 3
			}, 8, [
				"class",
				"default-sort",
				"data"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	baseCell: "_baseCell_19ne7_1",
	expandedCell: "_expandedCell_19ne7_12",
	customRow: "_customRow_19ne7_22",
	customDisabledRow: "_customDisabledRow_19ne7_27",
	customHeaderCell: "_customHeaderCell_19ne7_32",
	customHeaderCellLabel: "_customHeaderCellLabel_19ne7_37",
	customHeaderCellSort: "_customHeaderCellSort_19ne7_46",
	table: "_table_19ne7_51"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/ListRuns/TestRunsTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { style: {
	"display": "inline-flex",
	"gap": "12px",
	"text-transform": "capitalize",
	"align-items": "center"
} };
var TestRunsTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TestRunsTable",
	props: {
		runs: {},
		columns: {}
	},
	emits: ["rowClick"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const props = __props;
		const locale = useI18n();
		const styledColumns = computed(() => {
			return props.columns.map((column) => {
				if (column.prop === "id") return {
					...column,
					width: 100
				};
				if (column.prop === "runAt") return {
					...column,
					width: 150
				};
				return column;
			});
		});
		const runSummaries = computed(() => {
			return props.runs.map(({ status, finalResult, errorDetails, ...run }) => {
				if (status === "completed" && finalResult && ["error", "warning"].includes(finalResult)) status = "warning";
				return {
					...run,
					status,
					finalResult,
					errorDetails
				};
			});
		});
		function errorDescription(row) {
			const reason = resolveCompilationFailureReason(row.errorCode, row.errorDetails);
			if (reason) return reason;
			const descriptionKey = `${getErrorBaseKey(row.errorCode)}.description`;
			return locale.exists(descriptionKey) ? locale.baseText(descriptionKey) : void 0;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createVNode(unref(N8nHeading_default), {
				size: "large",
				bold: true,
				class: normalizeClass(_ctx.$style.runsTableHeading),
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluation.listRuns.pastRuns.total", { adjustToNumber: __props.runs.length })) + " (" + toDisplayString(__props.runs.length) + ") ", 1)]),
				_: 1
			}, 8, ["class"]), createVNode(TestTableBase_default, {
				data: runSummaries.value,
				columns: styledColumns.value,
				"default-sort": {
					prop: "runAt",
					order: "descending"
				},
				onRowClick: _cache[0] || (_cache[0] = (row) => row.status !== "error" ? emit("rowClick", row) : void 0)
			}, {
				id: withCtx(({ row }) => [createTextVNode("#" + toDisplayString(row.index), 1)]),
				status: withCtx(({ row }) => [createBaseVNode("div", _hoisted_1, [row.status === "running" ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "secondary"
				}, {
					default: withCtx(() => [createVNode(AnimatedSpinner_default)]),
					_: 1
				})) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: unref(statusDictionary)[row.status].icon,
					color: unref(statusDictionary)[row.status].color
				}, null, 8, ["icon", "color"])), row.status === "warning" ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					color: "warning",
					class: normalizeClass([_ctx.$style.alertText, _ctx.$style.warningText])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(`evaluation.runDetail.error.partialCasesFailed`)), 1)]),
					_: 1
				}, 8, ["class"])) : row.status === "error" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 3,
					placement: "top",
					"show-after": 300
				}, {
					content: withCtx(() => [createVNode(unref(I18nT), {
						keypath: `${unref(getErrorBaseKey)(row.errorCode)}`,
						scope: "global"
					}, createSlots({ _: 2 }, [errorDescription(row) !== void 0 ? {
						name: "description",
						fn: withCtx(() => [createTextVNode(toDisplayString(errorDescription(row) && ". ") + " " + toDisplayString(errorDescription(row)), 1)]),
						key: "0"
					} : void 0]), 1032, ["keypath"])]),
					default: withCtx(() => [createVNode(unref(N8nText_default), { class: normalizeClass([_ctx.$style.alertText, _ctx.$style.errorText]) }, {
						default: withCtx(() => [createVNode(unref(I18nT), {
							keypath: `${unref(getErrorBaseKey)(row.errorCode)}`,
							scope: "global"
						}, createSlots({ _: 2 }, [errorDescription(row) !== void 0 ? {
							name: "description",
							fn: withCtx(() => [createBaseVNode("p", { class: normalizeClass(_ctx.$style.grayText) }, toDisplayString(errorDescription(row)), 3)]),
							key: "0"
						} : void 0]), 1032, ["keypath"])]),
						_: 2
					}, 1032, ["class"])]),
					_: 2
				}, 1024)) : (openBlock(), createElementBlock(Fragment, { key: 4 }, [createTextVNode(toDisplayString(row.status), 1)], 64))])]),
				_: 1
			}, 8, ["data", "columns"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1m2i0_1",
	grayText: "_grayText_1m2i0_7",
	alertText: "_alertText_1m2i0_11",
	warningText: "_warningText_1m2i0_29",
	errorText: "_errorText_1m2i0_33"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/ListRuns/RunsSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var RunsSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RunsSection",
	props: /*@__PURE__*/ mergeModels({
		runs: {},
		workflowId: {},
		pageSize: {}
	}, {
		"selectedMetric": { required: true },
		"selectedMetricModifiers": {}
	}),
	emits: ["update:selectedMetric"],
	setup(__props) {
		const props = __props;
		const locale = useI18n();
		const router = useRouter();
		const selectedMetric = useModel(__props, "selectedMetric");
		const currentPage = ref(1);
		const showPagination = computed(() => !!props.pageSize && props.runs.length > props.pageSize);
		const runsNewestFirst = computed(() => [...props.runs].sort((a, b) => {
			const byDate = new Date(b.runAt).getTime() - new Date(a.runAt).getTime();
			return byDate !== 0 ? byDate : b.index - a.index;
		}));
		const pagedRuns = computed(() => {
			if (!props.pageSize) return props.runs;
			const start = (currentPage.value - 1) * props.pageSize;
			return runsNewestFirst.value.slice(start, start + props.pageSize);
		});
		watch(() => props.runs.length, () => {
			const maxPage = props.pageSize ? Math.max(1, Math.ceil(props.runs.length / props.pageSize)) : 1;
			if (currentPage.value > maxPage) currentPage.value = maxPage;
		});
		const metrics = computed(() => {
			return [...props.runs.reduce((acc, run) => {
				Object.keys(run.metrics ?? {}).forEach((metric) => acc.add(metric));
				return acc;
			}, /* @__PURE__ */ new Set())];
		});
		const metricColumns = computed(() => metrics.value.map((metric) => ({
			prop: `metrics.${metric}`,
			label: metric,
			sortable: true,
			showHeaderTooltip: true,
			sortMethod: (a, b) => (a.metrics?.[metric] ?? 0) - (b.metrics?.[metric] ?? 0),
			formatter: (row) => row.metrics?.[metric] !== void 0 ? (row.metrics?.[metric]).toFixed(2) : ""
		})));
		const columns = computed(() => [
			{
				prop: "id",
				label: locale.baseText("evaluation.listRuns.runNumber"),
				showOverflowTooltip: true
			},
			{
				prop: "runAt",
				label: locale.baseText("evaluation.listRuns.runAt"),
				sortable: true,
				showOverflowTooltip: true,
				formatter: (row) => {
					const { date, time } = convertToDisplayDate(row.runAt);
					return [date, time].join(", ");
				},
				sortMethod: (a, b) => new Date(a.runAt ?? a.createdAt).getTime() - new Date(b.runAt ?? b.createdAt).getTime()
			},
			{
				prop: "status",
				label: locale.baseText("evaluation.listRuns.status"),
				sortable: true
			},
			...metricColumns.value
		]);
		const handleRowClick = (row) => {
			router.push({
				name: VIEWS.EVALUATION_RUNS_DETAIL,
				params: { runId: row.id }
			});
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.runs, __props.pageSize ? _ctx.$style.paged : null]) }, [
				createVNode(MetricsChart_default, {
					"selected-metric": selectedMetric.value,
					"onUpdate:selectedMetric": _cache[0] || (_cache[0] = ($event) => selectedMetric.value = $event),
					runs: __props.runs
				}, null, 8, ["selected-metric", "runs"]),
				createVNode(TestRunsTable_default, {
					class: normalizeClass(_ctx.$style.runsTable),
					runs: pagedRuns.value,
					columns: columns.value,
					selectable: true,
					"data-test-id": "past-runs-table",
					onRowClick: handleRowClick
				}, null, 8, [
					"class",
					"runs",
					"columns"
				]),
				showPagination.value ? (openBlock(), createBlock(unref(N8nPagination_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.pagination),
					page: currentPage.value,
					"onUpdate:page": _cache[1] || (_cache[1] = ($event) => currentPage.value = $event),
					"items-per-page": __props.pageSize,
					total: __props.runs.length,
					"show-total": false,
					"show-sizes": false
				}, null, 8, [
					"class",
					"page",
					"items-per-page",
					"total"
				])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	runs: "_runs_18ahb_1",
	paged: "_paged_18ahb_10",
	pagination: "_pagination_18ahb_16"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/parallelEval.store.ts
init_runtime_core_esm_bundler();
var NEW_WORKFLOW_SENTINEL = "new";
var SLIDER_HARD_MAX = 10;
var buildDefaultState = () => ({
	parallelEnabled: true,
	concurrencyValue: 3
});
/**
* Per-workflow UI state for the parallel-execution feature.
*
* Visibility is derived from `maxConcurrency`: when the effective evaluation
* concurrency limit resolves to 1 (Community/Pro tier, or an explicit
* `N8N_CONCURRENCY_EVALUATION_LIMIT=1` override), `isConcurrencyAvailable`
* is `false` and the surrounding UI must hide every control — the header
* collapses to a plain Run Test button, byte-identical to the legacy flow.
*
* State shape: `{ [workflowId]: { parallelEnabled, concurrencyValue } }`.
* Workflow id `'new'` is a sentinel for unsaved workflows; the entry becomes
* orphaned in localStorage once the workflow gets a real id, but it's
* harmless and self-cleaning across sessions.
*/
var useParallelEvalStore = defineStore("parallelEval", () => {
	const settingsStore = useSettingsStore();
	const storage = useLocalStorage(LOCAL_STORAGE_PARALLEL_EVAL_BY_WORKFLOW, {}, {
		deep: true,
		flush: "sync"
	});
	const maxConcurrency = computed(() => {
		const limit = settingsStore.settings?.evaluationConcurrencyLimit;
		return typeof limit === "number" && limit > 0 ? Math.min(SLIDER_HARD_MAX, Math.floor(limit)) : SLIDER_HARD_MAX;
	});
	const isConcurrencyAvailable = computed(() => maxConcurrency.value > 1);
	const resolveKey = (workflowId) => workflowId && workflowId.length > 0 ? workflowId : NEW_WORKFLOW_SENTINEL;
	const ensureEntry = (key) => {
		if (!storage.value[key]) storage.value[key] = buildDefaultState();
		return storage.value[key];
	};
	const isParallel = (workflowId) => ensureEntry(resolveKey(workflowId)).parallelEnabled;
	const concurrencyValue = (workflowId) => Math.min(ensureEntry(resolveKey(workflowId)).concurrencyValue, maxConcurrency.value);
	const setParallel = (workflowId, value) => {
		ensureEntry(resolveKey(workflowId)).parallelEnabled = value;
	};
	const setConcurrencyValue = (workflowId, value) => {
		const safe = Number.isFinite(value) ? value : 3;
		const clamped = Math.max(1, Math.min(maxConcurrency.value, Math.floor(safe)));
		ensureEntry(resolveKey(workflowId)).concurrencyValue = clamped;
	};
	/**
	* The numeric concurrency the FE should send for a run. Returns `1` when
	* the parallel toggle is off (sequential) or when concurrency is not
	* available on this instance, the slider value otherwise.
	*/
	const effectiveConcurrency = (workflowId) => {
		if (!isConcurrencyAvailable.value) return 1;
		const state = ensureEntry(resolveKey(workflowId));
		return state.parallelEnabled ? Math.min(state.concurrencyValue, maxConcurrency.value) : 1;
	};
	return {
		isConcurrencyAvailable,
		maxConcurrency,
		isParallel,
		concurrencyValue,
		setParallel,
		setConcurrencyValue,
		effectiveConcurrency
	};
});
//#endregion
//#region src/features/ai/evaluation.ee/views/EvaluationsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var import_orderBy = /* @__PURE__ */ __toESM(require_orderBy(), 1);
var EvaluationsView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EvaluationsView",
	props: {
		workflowId: {},
		runsPageSize: {}
	},
	setup(__props) {
		const props = __props;
		const locale = useI18n();
		const toast = useToast();
		const telemetry = useTelemetry();
		const evaluationStore = useEvaluationStore();
		const parallelEvalStore = useParallelEvalStore();
		const selectedMetric = ref("");
		const cancellingTestRun = ref(false);
		const popoverOpen = ref(false);
		const configsLoading = ref(true);
		const activeConfigId = computed(() => {
			return evaluationStore.evaluationConfigsByWorkflowId[props.workflowId]?.[0]?.id ?? null;
		});
		const showRunPopover = computed(() => parallelEvalStore.isConcurrencyAvailable || activeConfigId.value !== null);
		const runningTestRun = computed(() => runs.value.find((run) => run.status === "running"));
		const concurrencyModel = computed({
			get: () => parallelEvalStore.concurrencyValue(props.workflowId),
			set: (value) => parallelEvalStore.setConcurrencyValue(props.workflowId, value)
		});
		const valuePillLabel = computed(() => locale.baseText("evaluation.runInParallel.popover.valuePill", { interpolate: {
			count: String(concurrencyModel.value),
			max: String(parallelEvalStore.maxConcurrency)
		} }));
		onMounted(async () => {
			try {
				await evaluationStore.fetchEvaluationConfigs(props.workflowId);
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantFetchConfigs"));
			} finally {
				configsLoading.value = false;
			}
		});
		async function runTest(runType = "config") {
			try {
				const configId = runType === "config" ? activeConfigId.value : null;
				const concurrencyOptions = parallelEvalStore.isConcurrencyAvailable ? { concurrency: concurrencyModel.value } : void 0;
				const options = configId !== null ? {
					...concurrencyOptions,
					evaluationConfigId: configId,
					compileFromConfig: true
				} : concurrencyOptions;
				await evaluationStore.startTestRun(props.workflowId, options);
				telemetry.track("User ran evaluation", {
					workflow_id: props.workflowId,
					run_type: configId !== null ? "config" : "direct"
				});
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantStartTestRun"));
			}
			try {
				await evaluationStore.fetchTestRuns(props.workflowId);
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantFetchTestRuns"));
			}
		}
		async function stopTest() {
			if (!runningTestRun.value) return;
			try {
				cancellingTestRun.value = true;
				await evaluationStore.cancelTestRun(runningTestRun.value.workflowId, runningTestRun.value.id);
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantStopTestRun"));
				cancellingTestRun.value = false;
			}
		}
		const runs = computed(() => {
			const testRuns = Object.values(evaluationStore.testRunsById ?? {}).filter(({ workflowId }) => workflowId === props.workflowId);
			return (0, import_orderBy.default)(testRuns, (record) => new Date(record.runAt), ["asc"]).map((record, index) => ({
				...record,
				index: index + 1
			}));
		});
		watch(runningTestRun, (run) => {
			if (!run) cancellingTestRun.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.evaluationsView) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerInner) }, [runningTestRun.value ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 0,
				variant: "outline",
				disabled: cancellingTestRun.value,
				class: normalizeClass(_ctx.$style.runOrStopTestButton),
				size: "small",
				"data-test-id": "stop-test-button",
				label: unref(locale).baseText("evaluation.stopTest"),
				onClick: stopTest
			}, null, 8, [
				"disabled",
				"class",
				"label"
			])) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.runTestGroup)
			}, [createVNode(unref(N8nButton_default), {
				variant: "solid",
				size: "small",
				loading: configsLoading.value,
				class: normalizeClass([_ctx.$style.runTestButton, showRunPopover.value ? _ctx.$style.runTestButtonWithCaret : null]),
				"data-test-id": "run-test-button",
				label: unref(locale).baseText("evaluation.runTest"),
				onClick: _cache[0] || (_cache[0] = ($event) => runTest())
			}, null, 8, [
				"loading",
				"class",
				"label"
			]), showRunPopover.value ? (openBlock(), createBlock(unref(N8nPopover_default), {
				key: 0,
				open: popoverOpen.value,
				"onUpdate:open": _cache[3] || (_cache[3] = ($event) => popoverOpen.value = $event),
				side: "bottom",
				align: "end",
				"side-offset": 6,
				"enable-scrolling": false
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					variant: "solid",
					size: "small",
					icon: "chevron-down",
					"icon-size": "xsmall",
					class: normalizeClass([_ctx.$style.caretButton, popoverOpen.value ? _ctx.$style.caretButtonOpen : null]),
					"aria-label": unref(locale).baseText("evaluation.runInParallel.popover.ariaLabel"),
					"aria-expanded": popoverOpen.value,
					"data-test-id": "parallel-eval-toggle"
				}, null, 8, [
					"class",
					"aria-label",
					"aria-expanded"
				])]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.popoverBody),
					"data-test-id": "parallel-eval-controls"
				}, [activeConfigId.value !== null ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					label: unref(locale).baseText("evaluation.runWorkflow"),
					"data-test-id": "run-workflow-direct-button",
					onClick: _cache[1] || (_cache[1] = ($event) => {
						runTest("direct");
						popoverOpen.value = false;
					})
				}, null, 8, ["label"]), unref(parallelEvalStore).isConcurrencyAvailable ? (openBlock(), createElementBlock("hr", {
					key: 0,
					class: normalizeClass(_ctx.$style.popoverDivider)
				}, null, 2)) : createCommentVNode("", true)], 64)) : createCommentVNode("", true), unref(parallelEvalStore).isConcurrencyAvailable ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.popoverHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.popoverTitle) }, toDisplayString(unref(locale).baseText("evaluation.runInParallel.popover.title")), 3), createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.valuePill),
						"data-test-id": "run-in-parallel-mode-label"
					}, toDisplayString(valuePillLabel.value), 3)], 2),
					createVNode(unref(ConcurrencySlider_default), {
						modelValue: concurrencyModel.value,
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => concurrencyModel.value = $event),
						min: 1,
						max: unref(parallelEvalStore).maxConcurrency,
						step: 1,
						"show-stops": "",
						label: unref(locale).baseText("evaluation.runInParallel.popover.title"),
						class: normalizeClass(_ctx.$style.concurrencySlider),
						"data-test-id": "run-in-parallel-concurrency"
					}, null, 8, [
						"modelValue",
						"max",
						"label",
						"class"
					]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.scaleLabels) }, [createBaseVNode("span", null, toDisplayString(unref(locale).baseText("evaluation.runInParallel.popover.scaleSequential")), 1), createBaseVNode("span", null, toDisplayString(unref(locale).baseText("evaluation.runInParallel.popover.scaleFaster")), 1)], 2),
					createBaseVNode("p", { class: normalizeClass(_ctx.$style.popoverHelper) }, toDisplayString(unref(locale).baseText("evaluation.runInParallel.popover.helper")), 3)
				], 64)) : createCommentVNode("", true)], 2)]),
				_: 1
			}, 8, ["open"])) : createCommentVNode("", true)], 2))], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.wrapper) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(RunsSection_default, {
				"selected-metric": selectedMetric.value,
				"onUpdate:selectedMetric": _cache[4] || (_cache[4] = ($event) => selectedMetric.value = $event),
				class: normalizeClass(_ctx.$style.runs),
				runs: runs.value,
				"workflow-id": props.workflowId,
				"page-size": __props.runsPageSize
			}, null, 8, [
				"selected-metric",
				"class",
				"runs",
				"workflow-id",
				"page-size"
			])], 2)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	evaluationsView: "_evaluationsView_wtc89_1",
	content: "_content_wtc89_5",
	header: "_header_wtc89_12",
	headerInner: "_headerInner_wtc89_25",
	runOrStopTestButton: "_runOrStopTestButton_wtc89_32",
	runTestGroup: "_runTestGroup_wtc89_37",
	runTestButton: "_runTestButton_wtc89_43",
	runTestButtonWithCaret: "_runTestButtonWithCaret_wtc89_47",
	caretButton: "_caretButton_wtc89_52",
	caretButtonOpen: "_caretButtonOpen_wtc89_60",
	popoverBody: "_popoverBody_wtc89_64",
	popoverDivider: "_popoverDivider_wtc89_75",
	popoverHeader: "_popoverHeader_wtc89_81",
	popoverTitle: "_popoverTitle_wtc89_87",
	valuePill: "_valuePill_wtc89_93",
	concurrencySlider: "_concurrencySlider_wtc89_105",
	scaleLabels: "_scaleLabels_wtc89_109",
	popoverHelper: "_popoverHelper_wtc89_117",
	wrapper: "_wrapper_wtc89_124",
	runs: "_runs_wtc89_129"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/views/EvaluationsListSwitcher.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var STACKED_PAGE_SIZE = 5;
var EvaluationsListSwitcher_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EvaluationsListSwitcher",
	props: { workflowId: {} },
	setup(__props) {
		const EvalCollectionsListView = defineAsyncComponent(async () => await __vitePreload(() => import("./EvalCollectionsListView-DBBfDx6Y.js"), __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11])));
		const isCollectionsEnabled = useEvalCollectionsFlag();
		return (_ctx, _cache) => {
			return !unref(isCollectionsEnabled) ? (openBlock(), createBlock(EvaluationsView_default, {
				key: 0,
				"workflow-id": __props.workflowId
			}, null, 8, ["workflow-id"])) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.stack)
			}, [createVNode(EvaluationsView_default, {
				"workflow-id": __props.workflowId,
				"runs-page-size": STACKED_PAGE_SIZE
			}, null, 8, ["workflow-id"]), createVNode(unref(EvalCollectionsListView), {
				"workflow-id": __props.workflowId,
				"page-size": STACKED_PAGE_SIZE
			}, null, 8, ["workflow-id"])], 2));
		};
	}
}), [["__cssModules", { "$style": { stack: "_stack_1h7ue_1" } }]]);
//#endregion
export { EvaluationsListSwitcher_default as default };
