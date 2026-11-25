import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Lf as markRaw, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, gf as resolveComponent, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { Cd as useWorkflowHistoryStore, Ik as deepCopy, JA as DialogHeader_default, KA as Dialog_default, LM as N8nCallout_default, SN as _plugin_vue_export_helper_default, WA as DialogBody_default, Wp as useWorkflowsListStore, Xw as normalizeMetricScore, Yw as averageNormalizedScore, _N as N8nText_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, ff as useEvaluationStore, hC as useTelemetry, jN as useI18n, kj as N8nSegmentControl_default, mM as N8nOption_default, nN as N8nBadge_default, pM as N8nSelect_default, qA as DialogTitle_default, vy as usePostHog, xN as N8nIcon_default, yN as N8nButton_default, yj as Tabs_default } from "./app-D5flEmb-.js";
import { C as getUserDefinedMetricNames, D as stringifyValue, a as countSettledRuns, f as formatMetricLabel, l as formatDeltaPercent, o as deriveRunsStatus, p as formatMetricPercent, r as computeDelta, s as extractAnswerText, t as buildScoreShapedMetricGroups, w as indexOfMax, x as getMetricDescriptionKey } from "./evaluation.utils-BLlHOReH.js";
import { t as WorkflowDiffView_default } from "./WorkflowDiffView-BDT5YKXW.js";
import { t as useEvaluationsLicense } from "./useEvaluationsLicense-TMlhIo0m.js";
import { t as require_omit } from "./omit-DpgS2zJe.js";
import { a as RunningIndicator_default, i as versionLetter, n as VersionAvatar_default, o as useEvalCollectionsStore, r as versionColorVar, t as GroupedMetricChart_default } from "./GroupedMetricChart--8jQxUhP.js";
import { t as require_orderBy } from "./orderBy-qvd4mxOh.js";
import { t as useEvalCollectionsFlag } from "./useEvalCollectionsFlag-CEl2un4l.js";
//#region src/features/ai/evaluation.ee/components/Compare/CompareHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var CompareHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CompareHeader",
	props: {
		collectionName: {},
		versions: {},
		bestVersionIndex: {},
		workflowId: {},
		collectionId: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const store = useEvalCollectionsStore();
		const status = computed(() => deriveRunsStatus(props.versions));
		const isRunning = computed(() => status.value === "running");
		const completedCount = computed(() => countSettledRuns(props.versions));
		const canRerun = computed(() => !isRunning.value && props.versions.length > 0);
		const rerunning = ref(false);
		async function onRerun() {
			if (rerunning.value || !canRerun.value) return;
			rerunning.value = true;
			try {
				await store.rerunCollection(props.workflowId, props.collectionId);
			} catch (error) {
				toast.showError(error, i18n.baseText("evaluation.compare.errors.rerunFailed"));
			} finally {
				rerunning.value = false;
			}
		}
		const statusBadge = computed(() => status.value === "error" ? {
			theme: "warning",
			label: i18n.baseText("evaluation.collections.card.failed")
		} : {
			theme: "success",
			label: i18n.baseText("evaluation.collections.card.done")
		});
		const legend = computed(() => props.versions.map((version) => ({
			...version,
			scorePercent: version.avgScore !== null ? Math.round(version.avgScore * 100) : null,
			isBest: version.index === props.bestVersionIndex,
			isRunning: version.status === "new" || version.status === "running"
		})));
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createElementBlock("header", {
				class: normalizeClass(_ctx.$style.header),
				"data-test-id": "compare-header"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleRow) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleGroup) }, [createVNode(unref(N8nText_default), {
					tag: "h2",
					size: "xlarge",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.collectionName), 1)]),
					_: 1
				}), isRunning.value ? (openBlock(), createBlock(RunningIndicator_default, {
					key: 0,
					completed: completedCount.value,
					total: __props.versions.length
				}, null, 8, ["completed", "total"])) : (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 1,
					variant: statusBadge.value.theme
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(statusBadge.value.label), 1)]),
					_: 1
				}, 8, ["variant"]))], 2), canRerun.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "outline",
					size: "small",
					icon: "refresh-cw",
					label: unref(i18n).baseText("evaluation.compare.rerun"),
					loading: rerunning.value,
					disabled: rerunning.value,
					"data-test-id": "compare-rerun",
					onClick: onRerun
				}, null, 8, [
					"label",
					"loading",
					"disabled"
				])) : createCommentVNode("", true)], 2),
				createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.collections.card.meta.versions", { adjustToNumber: __props.versions.length })), 1)]),
					_: 1
				}),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.legend) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(legend.value, (version) => {
					return openBlock(), createBlock(_component_RouterLink, {
						key: version.testRunId,
						to: {
							name: unref(VIEWS).EVALUATION_RUNS_DETAIL,
							params: {
								workflowId: __props.workflowId,
								runId: version.testRunId
							}
						},
						class: normalizeClass(_ctx.$style.chip),
						title: unref(i18n).baseText("evaluation.compare.versionsLegend.inspectRun"),
						"data-test-id": "compare-header-version"
					}, {
						default: withCtx(() => [
							createVNode(VersionAvatar_default, {
								index: version.index,
								variant: "square",
								size: "small"
							}, null, 8, ["index"]),
							createVNode(unref(N8nText_default), {
								size: "xsmall",
								color: "text-base"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(version.label), 1)]),
								_: 2
							}, 1024),
							version.isRunning ? (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 0,
								icon: "spinner",
								size: "xsmall",
								spin: "",
								title: unref(i18n).baseText("evaluation.compare.versionsLegend.running")
							}, null, 8, ["title"])) : version.scorePercent !== null ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 1,
								size: "xsmall",
								bold: ""
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(version.scorePercent) + "% ", 1)]),
								_: 2
							}, 1024)) : createCommentVNode("", true),
							version.isBest ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 2,
								size: "xsmall",
								bold: "",
								color: "success"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.versionsLegend.best")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						]),
						_: 2
					}, 1032, [
						"to",
						"class",
						"title"
					]);
				}), 128))], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_1hn21_1",
	titleRow: "_titleRow_1hn21_7",
	titleGroup: "_titleGroup_1hn21_14",
	legend: "_legend_1hn21_21",
	chip: "_chip_1hn21_28"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/MetricCriteria.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var PREVIEW_CHARS = 120;
var MetricCriteria_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MetricCriteria",
	props: {
		metricKey: {},
		prompt: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const isModalOpen = ref(false);
		const description = computed(() => {
			const key = getMetricDescriptionKey(props.metricKey);
			return key ? i18n.baseText(key) : "";
		});
		const isLong = computed(() => (props.prompt?.length ?? 0) > PREVIEW_CHARS);
		const previewText = computed(() => {
			if (!props.prompt) return "";
			if (!isLong.value) return props.prompt;
			return `${props.prompt.slice(0, PREVIEW_CHARS).trimEnd()}…`;
		});
		const modalTitle = computed(() => formatMetricLabel(props.metricKey));
		const promptParagraphs = computed(() => (props.prompt ?? "").split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph.length > 0));
		return (_ctx, _cache) => {
			return description.value || __props.prompt ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.wrap),
				"data-test-id": "metric-criteria"
			}, [
				description.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "xsmall",
					color: "text-light",
					class: normalizeClass(_ctx.$style.text)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(description.value), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true),
				__props.prompt ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "xsmall",
					color: "text-light",
					class: normalizeClass(_ctx.$style.text)
				}, {
					default: withCtx(() => [
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(unref(i18n).baseText("evaluation.metric.criteria.label")), 3),
						createTextVNode(" " + toDisplayString(previewText.value) + " ", 1),
						isLong.value ? (openBlock(), createElementBlock("button", {
							key: 0,
							type: "button",
							class: normalizeClass(_ctx.$style.toggle),
							"data-test-id": "metric-criteria-toggle",
							onClick: _cache[0] || (_cache[0] = withModifiers(($event) => isModalOpen.value = true, ["stop"]))
						}, toDisplayString(unref(i18n).baseText("evaluation.metric.criteria.showMore")), 3)) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true),
				createVNode(unref(Dialog_default), {
					open: isModalOpen.value,
					size: "large",
					"onUpdate:open": _cache[1] || (_cache[1] = (value) => isModalOpen.value = value)
				}, {
					default: withCtx(() => [createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(modalTitle.value), 1)]),
							_: 1
						})]),
						_: 1
					}), createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("div", {
							class: normalizeClass(_ctx.$style.modalBody),
							"data-test-id": "metric-criteria-modal"
						}, [description.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "text-base",
							class: normalizeClass(_ctx.$style.paragraph)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(description.value), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.criteria) }, [createVNode(unref(N8nText_default), {
							size: "xsmall",
							bold: "",
							color: "text-light",
							class: normalizeClass(_ctx.$style.criteriaLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.metric.criteria.label")), 1)]),
							_: 1
						}, 8, ["class"]), (openBlock(true), createElementBlock(Fragment, null, renderList(promptParagraphs.value, (paragraph, index) => {
							return openBlock(), createBlock(unref(N8nText_default), {
								key: index,
								tag: "p",
								size: "small",
								color: "text-base",
								class: normalizeClass(_ctx.$style.paragraph)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(paragraph), 1)]),
								_: 2
							}, 1032, ["class"]);
						}), 128))], 2)], 2)]),
						_: 1
					})]),
					_: 1
				}, 8, ["open"])
			], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	wrap: "_wrap_14cl7_1",
	text: "_text_14cl7_8",
	label: "_label_14cl7_12",
	toggle: "_toggle_14cl7_16",
	modalBody: "_modalBody_14cl7_26",
	criteria: "_criteria_14cl7_35",
	criteriaLabel: "_criteriaLabel_14cl7_41",
	paragraph: "_paragraph_14cl7_46"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/ScoreChart.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CRITICAL_THRESHOLD$1 = .6;
var ScoreChart_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ScoreChart",
	props: {
		metricGroups: {},
		versions: {},
		metricPrompts: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const mode = ref("average");
		const modeOptions = computed(() => [{
			label: i18n.baseText("evaluation.compare.scoreChart.toggle.average"),
			value: "average"
		}, {
			label: i18n.baseText("evaluation.compare.scoreChart.toggle.perCase"),
			value: "perCase",
			disabled: true
		}]);
		const letters = computed(() => props.versions.map((version) => version.letter));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": "compare-score-chart"
			}, [createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
				tag: "h3",
				size: "medium",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.scoreChart.heading")), 1)]),
				_: 1
			}), createVNode(unref(N8nTooltip_default), {
				placement: "top",
				content: unref(i18n).baseText("evaluation.compare.scoreChart.toggle.perCaseComingSoon")
			}, {
				default: withCtx(() => [createVNode(unref(N8nSegmentControl_default), {
					modelValue: mode.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => mode.value = $event),
					size: "small",
					options: modeOptions.value
				}, null, 8, ["modelValue", "options"])]),
				_: 1
			}, 8, ["content"])], 2), __props.metricGroups.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.panels)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.metricGroups, (group) => {
				return openBlock(), createElementBlock("div", {
					key: group.key,
					class: normalizeClass(_ctx.$style.panel),
					"data-test-id": "compare-score-chart-panel"
				}, [
					createVNode(unref(N8nText_default), {
						size: "small",
						bold: "",
						color: "text-base",
						class: normalizeClass(_ctx.$style.panelHeading)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(group.label), 1)]),
						_: 2
					}, 1032, ["class"]),
					createVNode(MetricCriteria_default, {
						"metric-key": group.key,
						prompt: __props.metricPrompts?.[group.key]
					}, null, 8, ["metric-key", "prompt"]),
					createVNode(GroupedMetricChart_default, {
						variant: "detailed",
						groups: [{
							label: group.label,
							values: group.values,
							letters: letters.value
						}],
						max: 1,
						"critical-threshold": CRITICAL_THRESHOLD$1
					}, null, 8, ["groups"])
				], 2);
			}), 128))], 2)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.empty)
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.scoreChart.empty")), 1)]),
				_: 1
			})], 2))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_1to52_1",
	header: "_header_1to52_11",
	panels: "_panels_1to52_18",
	panel: "_panel_1to52_18",
	panelHeading: "_panelHeading_1to52_30",
	empty: "_empty_1to52_37"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/AiInsightsCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AiInsightsCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AiInsightsCard",
	props: {
		workflowId: {},
		collectionId: {},
		ready: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const store = useEvalCollectionsStore();
		const license = useEvaluationsLicense();
		const errored = ref(false);
		const licenseChecked = ref(false);
		const insights = computed(() => store.getInsights(props.collectionId));
		const loading = computed(() => store.loadingInsights[props.collectionId] ?? false);
		const hidden = computed(() => !licenseChecked.value || !license.isLicensed.value);
		const showCard = computed(() => !hidden.value && (props.ready || !!insights.value || loading.value || errored.value));
		const generatedTime = computed(() => {
			const iso = insights.value?.generatedAt;
			if (!iso) return "";
			const date = new Date(iso);
			if (Number.isNaN(date.getTime())) return "";
			return date.toLocaleTimeString(void 0, {
				hour: "2-digit",
				minute: "2-digit"
			});
		});
		const primaryRegression = computed(() => insights.value?.insights.regressions[0] ?? null);
		async function load(forceRegenerate) {
			errored.value = false;
			try {
				await store.generateInsights(props.workflowId, props.collectionId, forceRegenerate);
			} catch {
				errored.value = true;
			}
		}
		async function maybeGenerate() {
			if (!licenseChecked.value || !license.isLicensed.value) return;
			if (!props.ready) return;
			if (store.getInsights(props.collectionId) || loading.value) return;
			await load(false);
		}
		onMounted(async () => {
			await license.ensureLicenseLoaded();
			licenseChecked.value = true;
			await maybeGenerate();
		});
		watch(() => props.ready, () => {
			maybeGenerate();
		});
		return (_ctx, _cache) => {
			return showCard.value ? (openBlock(), createElementBlock("section", {
				key: 0,
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": "compare-ai-insights"
			}, [createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.title) }, [
				createVNode(unref(N8nIcon_default), {
					icon: "wand-sparkles",
					size: "small"
				}),
				createVNode(unref(N8nText_default), {
					size: "medium",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.insights.title")), 1)]),
					_: 1
				}),
				generatedTime.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "xsmall",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.insights.generatedAt", { interpolate: { time: generatedTime.value } })), 1)]),
					_: 1
				})) : createCommentVNode("", true)
			], 2)], 2), loading.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.takeaways),
				"data-test-id": "compare-ai-insights-loading"
			}, [(openBlock(), createElementBlock(Fragment, null, renderList(3, (n) => {
				return createBaseVNode("div", {
					key: n,
					class: normalizeClass([_ctx.$style.takeaway, _ctx.$style.skeleton])
				}, null, 2);
			}), 64))], 2)) : errored.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.errorCard),
				"data-test-id": "compare-ai-insights-error"
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.insights.error")), 1)]),
				_: 1
			}), createVNode(unref(N8nButton_default), {
				variant: "outline",
				size: "small",
				label: unref(i18n).baseText("evaluation.compare.insights.retry"),
				onClick: _cache[0] || (_cache[0] = ($event) => load(true))
			}, null, 8, ["label"])], 2)) : insights.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.takeaways) }, [
				createBaseVNode("article", { class: normalizeClass([_ctx.$style.takeaway, _ctx.$style.winner]) }, [
					createBaseVNode("span", { class: normalizeClass([_ctx.$style.badge, _ctx.$style.badgeSuccess]) }, [createVNode(unref(N8nIcon_default), {
						icon: "circle-check",
						size: "small"
					})], 2),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						bold: "",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.insights.winner")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(insights.value.insights.winner.headline), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(insights.value.insights.winner.body), 1)]),
						_: 1
					})
				], 2),
				createBaseVNode("article", { class: normalizeClass([_ctx.$style.takeaway, primaryRegression.value ? _ctx.$style.regression : _ctx.$style.neutral]) }, [
					createBaseVNode("span", { class: normalizeClass([_ctx.$style.badge, primaryRegression.value ? _ctx.$style.badgeDanger : _ctx.$style.badgeSuccess]) }, [createVNode(unref(N8nIcon_default), {
						icon: primaryRegression.value ? "triangle-alert" : "circle-check",
						size: "small"
					}, null, 8, ["icon"])], 2),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						bold: "",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.insights.regression")), 1)]),
						_: 1
					}),
					primaryRegression.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nText_default), {
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(primaryRegression.value.headline), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(primaryRegression.value.body), 1)]),
						_: 1
					})], 64)) : (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						size: "small",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.insights.noRegressions")), 1)]),
						_: 1
					}))
				], 2),
				createBaseVNode("article", { class: normalizeClass([_ctx.$style.takeaway, _ctx.$style.next]) }, [
					createBaseVNode("span", { class: normalizeClass([_ctx.$style.badge, _ctx.$style.badgeInfo]) }, [createVNode(unref(N8nIcon_default), {
						icon: "arrow-right",
						size: "small"
					})], 2),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						bold: "",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.insights.suggestedNext")), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(insights.value.insights.suggestedNext.headline), 1)]),
						_: 1
					}),
					createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(insights.value.insights.suggestedNext.body), 1)]),
						_: 1
					})
				], 2)
			], 2), insights.value.status === "fallback" ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				size: "xsmall",
				color: "text-light",
				class: normalizeClass(_ctx.$style.fallbackNote)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.insights.fallbackNote")), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true)], 64)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_dactq_1",
	header: "_header_dactq_11",
	title: "_title_dactq_18",
	takeaways: "_takeaways_dactq_24",
	takeaway: "_takeaway_dactq_24",
	winner: "_winner_dactq_39",
	regression: "_regression_dactq_43",
	next: "_next_dactq_47",
	neutral: "_neutral_dactq_51",
	badge: "_badge_dactq_55",
	badgeSuccess: "_badgeSuccess_dactq_66",
	badgeDanger: "_badgeDanger_dactq_70",
	badgeInfo: "_badgeInfo_dactq_74",
	skeleton: "_skeleton_dactq_78",
	errorCard: "_errorCard_dactq_84",
	fallbackNote: "_fallbackNote_dactq_95"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/CasesTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$3 = ["aria-sort"];
var _hoisted_2$1 = ["aria-sort"];
var _hoisted_3 = ["aria-sort"];
var _hoisted_4 = ["onClick", "onKeydown"];
var _hoisted_5 = ["title"];
var _hoisted_6 = { key: 0 };
var CRITICAL_THRESHOLD = .6;
var CasesTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CasesTable",
	props: {
		versions: {},
		caseRows: {},
		isRunning: { type: Boolean }
	},
	emits: ["drilldown"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const sort = ref({
			key: "spread",
			dir: "desc"
		});
		function toggleSort(key) {
			if (sort.value.key === key) sort.value = {
				key,
				dir: sort.value.dir === "asc" ? "desc" : "asc"
			};
			else sort.value = {
				key,
				dir: key === "index" ? "asc" : "desc"
			};
		}
		function ariaSort(key) {
			if (sort.value.key !== key) return "none";
			return sort.value.dir === "asc" ? "ascending" : "descending";
		}
		function bestScore(row) {
			if (row.bestVersionIndex === null) return null;
			return row.cells[row.bestVersionIndex].score;
		}
		function scoreSpread(row) {
			const scores = row.cells.map((cell) => cell.score).filter((s) => s !== null);
			if (scores.length < 2) return 0;
			return Math.max(...scores) - Math.min(...scores);
		}
		const sortedRows = computed(() => {
			const rows = [...props.caseRows];
			const dir = sort.value.dir === "asc" ? 1 : -1;
			const value = (row) => {
				if (sort.value.key === "index") return row.index;
				if (sort.value.key === "best") return bestScore(row) ?? -1;
				return scoreSpread(row);
			};
			return rows.sort((a, b) => (value(a) - value(b)) * dir);
		});
		function isCritical(score) {
			return score !== null && score < CRITICAL_THRESHOLD;
		}
		function scoreLabel(cell) {
			if (cell.score !== null) return formatMetricPercent(cell.score);
			return cell.testCaseId !== null ? "–" : "⊘";
		}
		function deltas(row) {
			const best = bestScore(row);
			if (best === null || row.bestVersionIndex === null) return [];
			return row.cells.filter((cell) => cell.versionIndex !== row.bestVersionIndex && cell.score !== null).map((cell) => ({
				versionIndex: cell.versionIndex,
				letter: props.versions[cell.versionIndex]?.letter ?? "",
				delta: formatDeltaPercent(computeDelta(cell.score ?? void 0, best))
			}));
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("table", {
				class: normalizeClass(_ctx.$style.table),
				"data-test-id": "compare-cases-table"
			}, [createBaseVNode("thead", null, [createBaseVNode("tr", null, [
				createBaseVNode("th", {
					class: normalizeClass(_ctx.$style.num),
					role: "button",
					tabindex: "0",
					"aria-sort": ariaSort("index"),
					onClick: _cache[0] || (_cache[0] = ($event) => toggleSort("index")),
					onKeydown: [_cache[1] || (_cache[1] = withKeys(($event) => toggleSort("index"), ["enter"])), _cache[2] || (_cache[2] = withKeys(withModifiers(($event) => toggleSort("index"), ["prevent"]), ["space"]))]
				}, toDisplayString(unref(i18n).baseText("evaluation.compare.cases.col.index")), 43, _hoisted_1$3),
				createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("evaluation.compare.cases.col.input")), 1),
				(openBlock(true), createElementBlock(Fragment, null, renderList(__props.versions, (version) => {
					return openBlock(), createElementBlock("th", {
						key: version.testRunId,
						class: normalizeClass(_ctx.$style.score)
					}, toDisplayString(version.letter), 3);
				}), 128)),
				createBaseVNode("th", {
					role: "button",
					tabindex: "0",
					"aria-sort": ariaSort("best"),
					onClick: _cache[3] || (_cache[3] = ($event) => toggleSort("best")),
					onKeydown: [_cache[4] || (_cache[4] = withKeys(($event) => toggleSort("best"), ["enter"])), _cache[5] || (_cache[5] = withKeys(withModifiers(($event) => toggleSort("best"), ["prevent"]), ["space"]))]
				}, toDisplayString(unref(i18n).baseText("evaluation.compare.cases.col.best")), 41, _hoisted_2$1),
				createBaseVNode("th", {
					role: "button",
					tabindex: "0",
					"aria-sort": ariaSort("spread"),
					onClick: _cache[6] || (_cache[6] = ($event) => toggleSort("spread")),
					onKeydown: [_cache[7] || (_cache[7] = withKeys(($event) => toggleSort("spread"), ["enter"])), _cache[8] || (_cache[8] = withKeys(withModifiers(($event) => toggleSort("spread"), ["prevent"]), ["space"]))]
				}, toDisplayString(unref(i18n).baseText("evaluation.compare.cases.col.deltaVsBest")), 41, _hoisted_3),
				createBaseVNode("th", { class: normalizeClass(_ctx.$style.chevronCol) }, null, 2)
			])]), createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(sortedRows.value, (row) => {
				return openBlock(), createElementBlock("tr", {
					key: row.index,
					class: normalizeClass(_ctx.$style.row),
					tabindex: "0",
					"data-test-id": "compare-cases-row",
					onClick: ($event) => emit("drilldown", row.index),
					onKeydown: withKeys(($event) => emit("drilldown", row.index), ["enter"])
				}, [
					createBaseVNode("td", { class: normalizeClass(_ctx.$style.num) }, toDisplayString(row.displayIndex), 3),
					createBaseVNode("td", {
						class: normalizeClass(_ctx.$style.input),
						title: row.inputPreview
					}, [row.inputPreview ? (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(row.inputPreview), 1)) : __props.isRunning ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style.inputSkeleton),
						"data-test-id": "compare-cases-input-skeleton",
						"aria-hidden": "true"
					}, null, 2)) : createCommentVNode("", true)], 10, _hoisted_5),
					(openBlock(true), createElementBlock(Fragment, null, renderList(row.cells, (cell) => {
						return openBlock(), createElementBlock("td", {
							key: cell.versionIndex,
							class: normalizeClass(_ctx.$style.score)
						}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.chip) }, [createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.dot),
							style: normalizeStyle({ background: unref(versionColorVar)(cell.versionIndex) })
						}, null, 6), createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: isCritical(cell.score) ? "danger" : "text-base",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(scoreLabel(cell)), 1)]),
							_: 2
						}, 1032, ["color"])], 2)], 2);
					}), 128)),
					createBaseVNode("td", null, [row.bestVersionIndex !== null ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.bestPill)
					}, [createVNode(unref(N8nText_default), {
						size: "xsmall",
						color: "success",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.cases.bestPill", { interpolate: { letter: __props.versions[row.bestVersionIndex]?.letter ?? "" } })), 1)]),
						_: 2
					}, 1024)], 2)) : createCommentVNode("", true)]),
					createBaseVNode("td", null, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.deltas) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(deltas(row), (d) => {
						return openBlock(), createBlock(unref(N8nText_default), {
							key: d.versionIndex,
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(d.letter) + " " + toDisplayString(d.delta), 1)]),
							_: 2
						}, 1024);
					}), 128))], 2)]),
					createBaseVNode("td", { class: normalizeClass(_ctx.$style.chevronCol) }, [createVNode(unref(N8nIcon_default), {
						icon: "chevron-right",
						size: "small",
						color: "text-light"
					})], 2)
				], 42, _hoisted_4);
			}), 128))])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	table: "_table_14ovq_450",
	row: "_row_14ovq_473",
	num: "_num_14ovq_480",
	input: "_input_14ovq_485",
	inputSkeleton: "_inputSkeleton_14ovq_492",
	"skeleton-pulse": "_skeleton-pulse_14ovq_1",
	score: "_score_14ovq_508",
	chip: "_chip_14ovq_513",
	dot: "_dot_14ovq_519",
	bestPill: "_bestPill_14ovq_526",
	deltas: "_deltas_14ovq_535",
	chevronCol: "_chevronCol_14ovq_541",
	shimmer: "_shimmer_14ovq_1",
	spin: "_spin_14ovq_1",
	opacityPulse: "_opacityPulse_14ovq_1",
	popoverIn: "_popoverIn_14ovq_1",
	fadeIn: "_fadeIn_14ovq_1",
	collapsibleSlideDown: "_collapsibleSlideDown_14ovq_1",
	collapsibleSlideUp: "_collapsibleSlideUp_14ovq_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_14ovq_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_14ovq_1",
	blurSwapIn: "_blurSwapIn_14ovq_1",
	blurSwapOut: "_blurSwapOut_14ovq_1",
	pulse: "_pulse_14ovq_1",
	pulseGlow: "_pulseGlow_14ovq_1",
	pulseGlowDelayed: "_pulseGlowDelayed_14ovq_1",
	fade: "_fade_14ovq_1",
	fadeInUp: "_fadeInUp_14ovq_1",
	fadeInDown: "_fadeInDown_14ovq_1",
	fadeInLeft: "_fadeInLeft_14ovq_1",
	fadeInRight: "_fadeInRight_14ovq_1",
	fadeOut: "_fadeOut_14ovq_1",
	fadeOutDown: "_fadeOutDown_14ovq_1",
	fadeOutUp: "_fadeOutUp_14ovq_1",
	fadeOutLeft: "_fadeOutLeft_14ovq_1",
	fadeOutRight: "_fadeOutRight_14ovq_1",
	ping: "_ping_14ovq_1",
	blinkBackground: "_blinkBackground_14ovq_1",
	typingBlink: "_typingBlink_14ovq_1"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/OutputsTab.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = ["onClick"];
var _hoisted_2 = ["onClick"];
var OutputsTab_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "OutputsTab",
	props: {
		versions: {},
		caseRows: {},
		selectedIndex: {},
		workflowId: {},
		metricScales: {}
	},
	emits: ["update:selectedIndex"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const router = useRouter();
		function openExecution(executionId) {
			if (!executionId) return;
			const { href } = router.resolve({
				name: VIEWS.EXECUTION_PREVIEW,
				params: {
					workflowId: props.workflowId,
					executionId
				}
			});
			window.open(href, "_blank");
		}
		const emit = __emit;
		const i18n = useI18n();
		const selectedRow = computed(() => props.caseRows.find((row) => row.index === props.selectedIndex) ?? props.caseRows[0]);
		function metricEntries(metrics, scales) {
			if (!metrics) return [];
			return getUserDefinedMetricNames(metrics).map((key) => {
				const normalized = normalizeMetricScore(key, metrics[key], scales?.[key]);
				return {
					key,
					label: formatMetricLabel(key),
					value: formatMetricPercent(normalized ?? void 0)
				};
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.outputs),
				"data-test-id": "compare-outputs-tab"
			}, [createBaseVNode("aside", { class: normalizeClass(_ctx.$style.sidebar) }, [createVNode(unref(N8nText_default), {
				size: "xsmall",
				bold: "",
				color: "text-light",
				class: normalizeClass(_ctx.$style.sidebarTitle)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.outputs.casesSidebarTitle")), 1)]),
				_: 1
			}, 8, ["class"]), (openBlock(true), createElementBlock(Fragment, null, renderList(__props.caseRows, (row) => {
				return openBlock(), createElementBlock("button", {
					key: row.index,
					type: "button",
					class: normalizeClass([_ctx.$style.caseItem, { [_ctx.$style.caseItemActive]: row.index === selectedRow.value?.index }]),
					"data-test-id": "compare-outputs-case",
					onClick: ($event) => emit("update:selectedIndex", row.index)
				}, [createVNode(unref(N8nText_default), {
					size: "xsmall",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode("#" + toDisplayString(row.displayIndex), 1)]),
					_: 2
				}, 1024), createVNode(unref(N8nText_default), {
					size: "xsmall",
					color: "text-light",
					class: normalizeClass(_ctx.$style.caseItemInput)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(row.inputPreview), 1)]),
					_: 2
				}, 1032, ["class"])], 10, _hoisted_1$2);
			}), 128))], 2), selectedRow.value ? (openBlock(), createElementBlock("section", {
				key: 0,
				class: normalizeClass(_ctx.$style.main)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.inputRow) }, [createVNode(unref(N8nText_default), {
				size: "xsmall",
				bold: "",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.outputs.input")), 1)]),
				_: 1
			}), createVNode(unref(N8nText_default), { size: "small" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(selectedRow.value.inputPreview), 1)]),
				_: 1
			})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.columns) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(selectedRow.value.cells, (cell) => {
				return openBlock(), createElementBlock("article", {
					key: cell.versionIndex,
					class: normalizeClass(_ctx.$style.column),
					"data-test-id": "compare-outputs-column"
				}, [
					createBaseVNode("header", { class: normalizeClass(_ctx.$style.columnHeader) }, [
						createVNode(VersionAvatar_default, {
							index: cell.versionIndex,
							variant: "square",
							size: "small"
						}, null, 8, ["index"]),
						createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(__props.versions[cell.versionIndex]?.label), 1)]),
							_: 2
						}, 1024),
						cell.executionId ? (openBlock(), createElementBlock("button", {
							key: 0,
							type: "button",
							class: normalizeClass(_ctx.$style.inspect),
							"data-test-id": "compare-outputs-inspect",
							onClick: ($event) => openExecution(cell.executionId)
						}, [createVNode(unref(N8nText_default), { size: "xsmall" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.outputs.inspectRun")), 1)]),
							_: 1
						}), createVNode(unref(N8nIcon_default), {
							icon: "external-link",
							size: "xsmall"
						})], 10, _hoisted_2)) : createCommentVNode("", true)
					], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.answer) }, [cell.outputs !== void 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(extractAnswerText)(cell.outputs)), 1)]),
						_: 2
					}, 1024)) : (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.outputs.noOutput")), 1)]),
						_: 1
					}))], 2),
					createBaseVNode("footer", { class: normalizeClass(_ctx.$style.metrics) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(metricEntries(cell.metrics, __props.versions[cell.versionIndex]?.metricScales ?? __props.metricScales), (metric) => {
						return openBlock(), createElementBlock("span", {
							key: metric.key,
							class: normalizeClass(_ctx.$style.metric)
						}, [createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(metric.label), 1)]),
							_: 2
						}, 1024), createVNode(unref(N8nText_default), {
							size: "xsmall",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(metric.value), 1)]),
							_: 2
						}, 1024)], 2);
					}), 128))], 2)
				], 2);
			}), 128))], 2)], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	outputs: "_outputs_13a9t_1",
	sidebar: "_sidebar_13a9t_7",
	sidebarTitle: "_sidebarTitle_13a9t_17",
	caseItem: "_caseItem_13a9t_21",
	caseItemActive: "_caseItemActive_13a9t_37",
	caseItemInput: "_caseItemInput_13a9t_43",
	main: "_main_13a9t_50",
	inputRow: "_inputRow_13a9t_58",
	columns: "_columns_13a9t_67",
	column: "_column_13a9t_67",
	columnHeader: "_columnHeader_13a9t_84",
	inspect: "_inspect_13a9t_90",
	answer: "_answer_13a9t_106",
	metrics: "_metrics_13a9t_113",
	metric: "_metric_13a9t_113"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/MetricsTab.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "compare-metrics-tab" };
var MetricsTab_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MetricsTab",
	props: {
		versions: {},
		metricGroups: {},
		metricPrompts: {}
	},
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$1, [__props.metricGroups.length > 0 ? (openBlock(), createElementBlock("table", {
				key: 0,
				class: normalizeClass(_ctx.$style.table)
			}, [createBaseVNode("thead", null, [createBaseVNode("tr", null, [createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("evaluation.compare.metrics.col.metric")), 1), (openBlock(true), createElementBlock(Fragment, null, renderList(__props.versions, (version) => {
				return openBlock(), createElementBlock("th", {
					key: version.testRunId,
					class: normalizeClass(_ctx.$style.value)
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.head) }, [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.dot),
					style: normalizeStyle({ background: unref(versionColorVar)(version.index) })
				}, null, 6), createTextVNode(" " + toDisplayString(version.letter), 1)], 2)], 2);
			}), 128))])]), createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.metricGroups, (group) => {
				return openBlock(), createElementBlock("tr", {
					key: group.key,
					"data-test-id": "compare-metrics-row"
				}, [createBaseVNode("td", null, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.metric) }, [createVNode(unref(N8nText_default), { size: "xsmall" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(group.label), 1)]),
					_: 2
				}, 1024), createVNode(MetricCriteria_default, {
					"metric-key": group.key,
					prompt: __props.metricPrompts?.[group.key]
				}, null, 8, ["metric-key", "prompt"])], 2)]), (openBlock(true), createElementBlock(Fragment, null, renderList(group.values, (value, versionIndex) => {
					return openBlock(), createElementBlock("td", {
						key: versionIndex,
						class: normalizeClass(_ctx.$style.value)
					}, [createVNode(unref(N8nText_default), {
						size: "xsmall",
						bold: versionIndex === group.bestIndex
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(formatMetricPercent)(value ?? void 0)), 1)]),
						_: 2
					}, 1032, ["bold"])], 2);
				}), 128))]);
			}), 128))])], 2)) : (openBlock(), createBlock(unref(N8nText_default), {
				key: 1,
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.metrics.empty")), 1)]),
				_: 1
			}))]);
		};
	}
}), [["__cssModules", { "$style": {
	table: "_table_ruwc8_1",
	value: "_value_ruwc8_17",
	metric: "_metric_ruwc8_22",
	head: "_head_ruwc8_29",
	dot: "_dot_ruwc8_35"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/WorkflowDiffTab.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var import_omit = /* @__PURE__ */ __toESM(require_omit(), 1);
var _hoisted_1 = { "data-test-id": "compare-workflow-diff-tab" };
var WorkflowDiffTab_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowDiffTab",
	props: {
		versions: {},
		workflowId: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const workflowsListStore = useWorkflowsListStore();
		const workflowHistoryStore = useWorkflowHistoryStore();
		const sourceIndex = ref(props.versions[0]?.index ?? 0);
		const targetIndex = ref(props.versions[1]?.index ?? props.versions[0]?.index ?? 0);
		const sourceWorkflow = ref();
		const targetWorkflow = ref();
		const isLoading = ref(false);
		const canDiff = computed(() => props.versions.length >= 2);
		const versionOptions = computed(() => props.versions.map((version) => ({
			value: version.index,
			label: `${version.letter} · ${version.label}`
		})));
		const versionByIndex = (index) => props.versions.find((version) => version.index === index);
		const labelFor = (index) => {
			const version = versionByIndex(index);
			return version ? `${version.letter} · ${version.label}` : "";
		};
		let loadRequestId = 0;
		const detach = (workflow) => markRaw(deepCopy(workflow));
		const resolveWorkflow = async (base, version) => {
			const bare = (0, import_omit.default)(base, "pinData");
			if (version.workflowVersionId === null) return bare;
			const snapshot = await workflowHistoryStore.getWorkflowVersion(props.workflowId, version.workflowVersionId);
			return {
				...bare,
				versionId: snapshot.versionId,
				nodes: snapshot.nodes,
				connections: snapshot.connections,
				nodeGroups: snapshot.nodeGroups ?? []
			};
		};
		const load = async () => {
			if (!canDiff.value) return;
			const source = versionByIndex(sourceIndex.value);
			const target = versionByIndex(targetIndex.value);
			if (!source || !target) return;
			const requestId = ++loadRequestId;
			isLoading.value = true;
			try {
				const base = await workflowsListStore.fetchWorkflow(props.workflowId);
				const [resolvedSource, resolvedTarget] = await Promise.all([resolveWorkflow(base, source), resolveWorkflow(base, target)]);
				if (requestId !== loadRequestId) return;
				sourceWorkflow.value = detach(resolvedSource);
				targetWorkflow.value = detach(resolvedTarget);
			} catch (error) {
				toast.showError(error, i18n.baseText("evaluation.compare.workflowDiff.loadError"));
			} finally {
				if (requestId === loadRequestId) isLoading.value = false;
			}
		};
		const onSourceChange = (next) => {
			if (next === targetIndex.value) targetIndex.value = sourceIndex.value;
			sourceIndex.value = next;
		};
		const onTargetChange = (next) => {
			if (next === sourceIndex.value) sourceIndex.value = targetIndex.value;
			targetIndex.value = next;
		};
		watch([sourceIndex, targetIndex], load, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1, [!canDiff.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.placeholder)
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.workflowDiff.needTwo")), 1)]),
				_: 1
			})], 2)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.controls) }, [createBaseVNode("label", { class: normalizeClass(_ctx.$style.control) }, [createVNode(unref(N8nText_default), {
				size: "xsmall",
				color: "text-light",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.workflowDiff.base")), 1)]),
				_: 1
			}), createVNode(unref(N8nSelect_default), {
				"model-value": sourceIndex.value,
				size: "small",
				"data-test-id": "workflow-diff-source-select",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => onSourceChange(Number($event)))
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(versionOptions.value, (opt) => {
					return openBlock(), createBlock(unref(N8nOption_default), {
						key: opt.value,
						value: opt.value,
						label: opt.label
					}, null, 8, ["value", "label"]);
				}), 128))]),
				_: 1
			}, 8, ["model-value"])], 2), createBaseVNode("label", { class: normalizeClass(_ctx.$style.control) }, [createVNode(unref(N8nText_default), {
				size: "xsmall",
				color: "text-light",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.workflowDiff.compare")), 1)]),
				_: 1
			}), createVNode(unref(N8nSelect_default), {
				"model-value": targetIndex.value,
				size: "small",
				"data-test-id": "workflow-diff-target-select",
				"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => onTargetChange(Number($event)))
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(versionOptions.value, (opt) => {
					return openBlock(), createBlock(unref(N8nOption_default), {
						key: opt.value,
						value: opt.value,
						label: opt.label
					}, null, 8, ["value", "label"]);
				}), 128))]),
				_: 1
			}, 8, ["model-value"])], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.diff) }, [isLoading.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.state)
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.loading")), 1)]),
				_: 1
			})], 2)) : sourceWorkflow.value && targetWorkflow.value ? (openBlock(), createBlock(WorkflowDiffView_default, {
				key: 1,
				"source-workflow": sourceWorkflow.value,
				"target-workflow": targetWorkflow.value,
				"source-label": labelFor(sourceIndex.value),
				"target-label": labelFor(targetIndex.value)
			}, null, 8, [
				"source-workflow",
				"target-workflow",
				"source-label",
				"target-label"
			])) : createCommentVNode("", true)], 2)], 64))]);
		};
	}
}), [["__cssModules", { "$style": {
	placeholder: "_placeholder_aqt1p_1",
	controls: "_controls_aqt1p_10",
	control: "_control_aqt1p_10",
	diff: "_diff_aqt1p_23",
	state: "_state_aqt1p_31"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/CompareTabs.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CompareTabs_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CompareTabs",
	props: {
		versions: {},
		metricGroups: {},
		caseRows: {},
		casesLoading: { type: Boolean },
		casesError: { type: Boolean },
		workflowId: {},
		metricPrompts: {},
		metricScales: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const activeTab = ref("cases");
		const selectedCaseIndex = ref(0);
		const tabs = computed(() => [
			{
				value: "cases",
				label: i18n.baseText("evaluation.compare.tabs.cases")
			},
			{
				value: "outputs",
				label: i18n.baseText("evaluation.compare.tabs.outputs")
			},
			{
				value: "metrics",
				label: i18n.baseText("evaluation.compare.tabs.metrics")
			},
			{
				value: "workflowDiff",
				label: i18n.baseText("evaluation.compare.tabs.workflowDiff")
			}
		]);
		const hasCases = computed(() => props.caseRows.length > 0);
		const isRunning = computed(() => deriveRunsStatus(props.versions) === "running");
		function onDrilldown(caseIndex) {
			selectedCaseIndex.value = caseIndex;
			activeTab.value = "outputs";
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.tabs),
				"data-test-id": "compare-tabs"
			}, [
				createVNode(unref(Tabs_default), {
					modelValue: activeTab.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => activeTab.value = $event),
					options: tabs.value
				}, null, 8, ["modelValue", "options"]),
				__props.casesError ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "xsmall",
					color: "danger",
					"data-test-id": "compare-cases-error"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.cases.loadError")), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.panel) }, [activeTab.value === "cases" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [__props.casesLoading ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.cases.loading")), 1)]),
					_: 1
				})) : !hasCases.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.cases.empty")), 1)]),
					_: 1
				})) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [isRunning.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "xsmall",
					color: "text-light",
					class: normalizeClass(_ctx.$style.runningNote),
					"data-test-id": "compare-cases-running"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.cases.running")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), createVNode(CasesTable_default, {
					versions: __props.versions,
					"case-rows": __props.caseRows,
					"is-running": isRunning.value,
					onDrilldown
				}, null, 8, [
					"versions",
					"case-rows",
					"is-running"
				])], 64))], 64)) : activeTab.value === "outputs" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [__props.casesLoading ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.cases.loading")), 1)]),
					_: 1
				})) : (openBlock(), createBlock(OutputsTab_default, {
					key: 1,
					versions: __props.versions,
					"case-rows": __props.caseRows,
					"selected-index": selectedCaseIndex.value,
					"workflow-id": __props.workflowId,
					"metric-scales": __props.metricScales,
					"onUpdate:selectedIndex": _cache[1] || (_cache[1] = ($event) => selectedCaseIndex.value = $event)
				}, null, 8, [
					"versions",
					"case-rows",
					"selected-index",
					"workflow-id",
					"metric-scales"
				]))], 64)) : activeTab.value === "metrics" ? (openBlock(), createBlock(MetricsTab_default, {
					key: 2,
					versions: __props.versions,
					"metric-groups": __props.metricGroups,
					"metric-prompts": __props.metricPrompts
				}, null, 8, [
					"versions",
					"metric-groups",
					"metric-prompts"
				])) : (openBlock(), createBlock(WorkflowDiffTab_default, {
					key: 3,
					versions: __props.versions,
					"workflow-id": __props.workflowId
				}, null, 8, ["versions", "workflow-id"]))], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	tabs: "_tabs_p69iv_1",
	panel: "_panel_p69iv_7",
	runningNote: "_runningNote_p69iv_11"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/DatasetMismatchBanner.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/ai/evaluation.ee/components/Compare/DatasetMismatchBanner.vue
var DatasetMismatchBanner_default = /* @__PURE__ */ defineComponent({
	__name: "DatasetMismatchBanner",
	props: { mismatch: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const countsLabel = computed(() => props.mismatch.counts.join(", "));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCallout_default), {
				theme: "warning",
				icon: "triangle-alert",
				"data-test-id": "compare-dataset-mismatch"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.datasetMismatch", { interpolate: { counts: countsLabel.value } })), 1)]),
				_: 1
			});
		};
	}
});
//#endregion
//#region src/features/ai/evaluation.ee/composables/useCompareData.ts
init_runtime_core_esm_bundler();
/**
* Shapes a collection's aggregate detail into the compare view's model: one
* `CompareVersion` per run and one `CompareMetricGroup` per score-shaped metric.
* Only aggregate per-version metrics are read here — per-case data is fetched
* separately by the Cases/Outputs components.
*/
function useCompareData(detail) {
	const i18n = useI18n();
	const versions = computed(() => {
		return (detail.value?.runs ?? []).map((run, index) => ({
			index,
			testRunId: run.testRunId,
			workflowVersionId: run.workflowVersionId,
			letter: versionLetter(index),
			label: run.workflowVersionId === null ? i18n.baseText("evaluation.collections.card.currentDraft") : run.workflowVersionId.slice(0, 7),
			status: run.status,
			avgScore: run.avgScore,
			metricScales: run.metricScales
		}));
	});
	const metricGroups = computed(() => buildScoreShapedMetricGroups(detail.value?.runs ?? [], detail.value?.metricScales).map(({ key, values }) => ({
		key,
		label: formatMetricLabel(key),
		values,
		bestIndex: indexOfMax(values)
	})));
	const bestVersionIndex = computed(() => indexOfMax(versions.value.map((version) => version.avgScore)));
	return { compareData: computed(() => detail.value === null ? null : {
		versions: versions.value,
		metricGroups: metricGroups.value,
		bestVersionIndex: bestVersionIndex.value
	}) };
}
//#endregion
//#region src/features/ai/evaluation.ee/composables/useCompareCases.ts
var import_orderBy = /* @__PURE__ */ __toESM(require_orderBy(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function inputPreview(inputs) {
	if (!inputs) return "";
	return Object.values(inputs).map((value) => stringifyValue(value)).filter((text) => text.length > 0).join(" · ");
}
/**
* Loads per-case executions for every run and aligns them into one row per test
* case. Cells align by `runIndex` (the seeded per-case sequence), not list
* position, so a version missing a case leaves a null cell instead of shifting
* later cases into the wrong row; divergent counts surface as a `mismatch`.
*/
function useCompareCases(detail, workflowId) {
	const evaluationStore = useEvaluationStore();
	const loading = ref(false);
	const casesLoaded = ref(false);
	const casesError = ref(false);
	let loadToken = 0;
	async function load({ silent = false, runs } = {}) {
		const allRuns = detail.value?.runs ?? [];
		const runsToFetch = runs ?? allRuns;
		const token = ++loadToken;
		if (allRuns.length === 0) {
			if (!silent) {
				loading.value = false;
				casesError.value = false;
				casesLoaded.value = true;
			}
			return;
		}
		if (!silent) {
			loading.value = true;
			casesLoaded.value = false;
			casesError.value = false;
		}
		if (runsToFetch.length === 0) return;
		try {
			const results = await Promise.allSettled(runsToFetch.map(async (run) => await evaluationStore.fetchTestCaseExecutions({
				workflowId: workflowId.value,
				runId: run.testRunId
			})));
			if (token !== loadToken) return;
			if (!silent) casesError.value = results.some((result) => result.status === "rejected");
			casesLoaded.value = true;
		} finally {
			if (token === loadToken && !silent) loading.value = false;
		}
	}
	const casesByVersion = computed(() => {
		const runs = detail.value?.runs ?? [];
		const byRunId = new Map(runs.map((run) => [run.testRunId, []]));
		for (const record of Object.values(evaluationStore.testCaseExecutionsById)) {
			const bucket = record.testRunId ? byRunId.get(record.testRunId) : void 0;
			if (bucket) bucket.push(record);
		}
		return runs.map((run) => (0, import_orderBy.default)(byRunId.get(run.testRunId) ?? [], [(record) => record.runIndex ?? Number.MAX_SAFE_INTEGER, (record) => record.runAt ?? ""], ["asc", "asc"]));
	});
	const mismatch = computed(() => {
		const runs = detail.value?.runs ?? [];
		const counts = casesByVersion.value.filter((_cases, index) => runs[index]?.status === "completed").map((cases) => cases.length);
		const maxCount = counts.length ? Math.max(...counts) : 0;
		return {
			counts,
			maxCount,
			hasMismatch: counts.some((count) => count !== maxCount)
		};
	});
	const caseRows = computed(() => {
		const byIndex = casesByVersion.value.map((cases) => {
			const map = /* @__PURE__ */ new Map();
			cases.forEach((record, position) => map.set(record.runIndex ?? position, record));
			return map;
		});
		return [...new Set(byIndex.flatMap((map) => [...map.keys()]))].sort((a, b) => a - b).map((runIndex, rowIndex) => {
			const cells = byIndex.map((map, versionIndex) => {
				const record = map.get(runIndex);
				return {
					versionIndex,
					testCaseId: record?.id ?? null,
					executionId: record?.executionId ?? null,
					inputs: record?.inputs,
					outputs: record?.outputs,
					metrics: record?.metrics,
					score: averageNormalizedScore(record?.metrics, detail.value?.runs[versionIndex]?.metricScales ?? detail.value?.metricScales)
				};
			});
			const firstWithInputs = cells.find((cell) => cell.inputs !== void 0);
			return {
				index: rowIndex,
				displayIndex: rowIndex + 1,
				inputPreview: inputPreview(firstWithInputs?.inputs),
				cells,
				bestVersionIndex: indexOfMax(cells.map((cell) => cell.score))
			};
		});
	});
	const isInFlight = (status) => status === "new" || status === "running";
	let wasRunning = false;
	const terminalFetched = /* @__PURE__ */ new Set();
	watch(() => detail.value ? (detail.value.runs ?? []).map((run) => run.testRunId).join(",") : null, async (key) => {
		if (key === null) return;
		terminalFetched.clear();
		await load();
		for (const run of detail.value?.runs ?? []) if (!isInFlight(run.status)) terminalFetched.add(run.testRunId);
		wasRunning = (detail.value?.runs ?? []).some((run) => isInFlight(run.status));
	}, { immediate: true });
	watch(() => detail.value, async () => {
		if (!casesLoaded.value) return;
		const runs = detail.value?.runs ?? [];
		const running = runs.some((run) => isInFlight(run.status));
		if (!running && !wasRunning) return;
		wasRunning = running;
		const toFetch = runs.filter((run) => isInFlight(run.status) || !terminalFetched.has(run.testRunId));
		if (toFetch.length === 0) return;
		await load({
			silent: true,
			runs: toFetch
		});
		for (const run of toFetch) if (!isInFlight(run.status)) terminalFetched.add(run.testRunId);
	});
	return {
		caseRows,
		mismatch,
		loading,
		casesLoaded,
		casesError,
		load
	};
}
//#endregion
//#region src/features/ai/evaluation.ee/views/CompareCollectionView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var CompareCollectionView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "CompareCollectionView",
	props: {
		workflowId: {},
		collectionId: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const toast = useToast();
		const telemetry = useTelemetry();
		const store = useEvalCollectionsStore();
		const evaluationStore = useEvaluationStore();
		const postHog = usePostHog();
		const isEvalCollectionsEnabled = useEvalCollectionsFlag();
		const detail = computed(() => store.getDetail(props.collectionId));
		const metricPrompts = computed(() => {
			const configId = detail.value?.evaluationConfigId;
			if (!configId) return {};
			const config = (evaluationStore.evaluationConfigsByWorkflowId[props.workflowId] ?? []).find((candidate) => candidate.id === configId);
			if (!config) return {};
			const prompts = {};
			for (const metric of config.metrics) if (metric.type === "llm_judge" && metric.config.prompt) prompts[metric.name] = metric.config.prompt;
			return prompts;
		});
		const { compareData } = useCompareData(detail);
		const { caseRows, mismatch, loading: casesLoading, casesLoaded, casesError } = useCompareCases(detail, computed(() => props.workflowId));
		const tracked = ref(false);
		watch(() => compareData.value !== null && casesLoaded.value, (ready) => {
			if (!ready || tracked.value) return;
			tracked.value = true;
			telemetry.track("Eval collection compared opened", {
				workflow_id: props.workflowId,
				collection_id: props.collectionId,
				version_count: compareData.value?.versions.length ?? 0,
				case_count: mismatch.value.maxCount
			});
		}, { immediate: true });
		const insightsReady = computed(() => {
			const versions = compareData.value?.versions ?? [];
			if (deriveRunsStatus(versions) === "running") return false;
			return versions.filter((version) => version.status === "completed").length >= 2;
		});
		const loading = computed(() => store.loadingDetail[props.collectionId] ?? false);
		const notFound = ref(false);
		const isEmpty = computed(() => notFound.value || !loading.value && compareData.value === null);
		function isNotFoundError(error) {
			return typeof error === "object" && error !== null && "httpStatusCode" in error && error.httpStatusCode === 404;
		}
		let unmounted = false;
		async function load(workflowId, collectionId) {
			notFound.value = false;
			try {
				await store.fetchCollectionDetail(workflowId, collectionId);
				await evaluationStore.fetchEvaluationConfigs(workflowId).catch(() => null);
				if (unmounted || collectionId !== props.collectionId) store.stopPolling(collectionId);
			} catch (error) {
				if (isNotFoundError(error)) notFound.value = true;
				else toast.showError(error, i18n.baseText("evaluation.compare.errors.loadFailed"));
			}
		}
		function backToList() {
			router.push({
				name: VIEWS.EVALUATION_EDIT,
				params: { workflowId: props.workflowId }
			});
		}
		onMounted(async () => {
			await postHog.waitForFeatureFlags();
			if (!isEvalCollectionsEnabled.value) {
				router.replace({
					name: VIEWS.EVALUATION_EDIT,
					params: { workflowId: props.workflowId }
				});
				return;
			}
			await load(props.workflowId, props.collectionId);
		});
		watch([() => props.workflowId, () => props.collectionId], ([, collectionId], [, prevCollectionId]) => {
			store.stopPolling(prevCollectionId);
			tracked.value = false;
			load(props.workflowId, collectionId);
		});
		onBeforeUnmount(() => {
			unmounted = true;
			store.stopPolling(props.collectionId);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.view),
				"data-test-id": "compare-collection-view"
			}, [createVNode(unref(N8nButton_default), {
				variant: "ghost",
				size: "small",
				icon: "arrow-left",
				label: unref(i18n).baseText("evaluation.compare.backToList"),
				"data-test-id": "compare-back",
				onClick: backToList
			}, null, 8, ["label"]), loading.value && unref(compareData) === null ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.skeleton),
				"data-test-id": "compare-loading"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.skelHeader) }, null, 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.skelChart) }, null, 2)], 2)) : isEmpty.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.empty),
				"data-test-id": "compare-empty"
			}, [createVNode(unref(N8nText_default), {
				size: "medium",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("evaluation.compare.errors.notFound")), 1)]),
				_: 1
			})], 2)) : unref(compareData) ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
				unref(casesLoaded) && !unref(casesError) && unref(mismatch).hasMismatch ? (openBlock(), createBlock(DatasetMismatchBanner_default, {
					key: 0,
					mismatch: unref(mismatch)
				}, null, 8, ["mismatch"])) : createCommentVNode("", true),
				createVNode(CompareHeader_default, {
					"collection-name": detail.value?.name ?? "",
					versions: unref(compareData).versions,
					"best-version-index": unref(compareData).bestVersionIndex,
					"workflow-id": __props.workflowId,
					"collection-id": __props.collectionId
				}, null, 8, [
					"collection-name",
					"versions",
					"best-version-index",
					"workflow-id",
					"collection-id"
				]),
				createVNode(ScoreChart_default, {
					"metric-groups": unref(compareData).metricGroups,
					versions: unref(compareData).versions,
					"metric-prompts": metricPrompts.value
				}, null, 8, [
					"metric-groups",
					"versions",
					"metric-prompts"
				]),
				(openBlock(), createBlock(AiInsightsCard_default, {
					key: __props.collectionId,
					"workflow-id": __props.workflowId,
					"collection-id": __props.collectionId,
					ready: insightsReady.value
				}, null, 8, [
					"workflow-id",
					"collection-id",
					"ready"
				])),
				createVNode(CompareTabs_default, {
					versions: unref(compareData).versions,
					"metric-groups": unref(compareData).metricGroups,
					"case-rows": unref(caseRows),
					"cases-loading": unref(casesLoading),
					"cases-error": unref(casesError),
					"workflow-id": __props.workflowId,
					"metric-prompts": metricPrompts.value,
					"metric-scales": detail.value?.metricScales
				}, null, 8, [
					"versions",
					"metric-groups",
					"case-rows",
					"cases-loading",
					"cases-error",
					"workflow-id",
					"metric-prompts",
					"metric-scales"
				])
			], 64)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	view: "_view_da66c_1",
	skeleton: "_skeleton_da66c_11",
	skelHeader: "_skelHeader_da66c_17",
	skelChart: "_skelChart_da66c_23",
	empty: "_empty_da66c_29"
} }]]);
//#endregion
export { CompareCollectionView_default as default };
