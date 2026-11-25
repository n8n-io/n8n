import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { NM as N8nCard_default, SN as _plugin_vue_export_helper_default, Ur as useInjectWorkflowId, Xw as normalizeMetricScore, _N as N8nText_default, bN as N8nSpinner_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, ff as useEvaluationStore, hC as useTelemetry, jN as useI18n, sj as N8nScrollArea_default, tN as N8nLoading_default, xN as N8nIcon_default, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { C as getUserDefinedMetricNames, E as normalizeMetricValue, T as isUnscaledCustomMetric, d as formatMetricDelta, f as formatMetricLabel, g as formatMetricValue, h as formatMetricRawScoreSum, i as computeDurationMs, m as formatMetricRawScore, u as formatDuration, v as formatTokens, y as getDeltaTone } from "./evaluation.utils-BLlHOReH.js";
import { t as useWorkflowEvaluationState } from "./useWorkflowEvaluationState-C2nc66cR.js";
import { l as getErrorBaseKey } from "./evaluation.constants-DxyMe5Zh.js";
import { t as require_orderBy } from "./orderBy-qvd4mxOh.js";
//#region src/features/ai/evaluation.ee/components/RunDetail/TrendDeltaBadge.vue?vue&type=script&setup=true&lang.ts
var import_orderBy = /* @__PURE__ */ __toESM(require_orderBy(), 1);
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var TrendDeltaBadge_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TrendDeltaBadge",
	props: {
		delta: {},
		name: {},
		category: {},
		scale: {}
	},
	setup(__props) {
		const props = __props;
		const tone = computed(() => getDeltaTone(props.delta));
		const label = computed(() => formatMetricDelta(props.delta, {
			key: props.name,
			category: props.category,
			scale: props.scale
		}));
		const icon = computed(() => tone.value === "negative" ? "trending-down" : "trending-up");
		return (_ctx, _cache) => {
			return tone.value !== "default" ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass([_ctx.$style.badge, _ctx.$style[tone.value]]),
				"data-test-id": "trend-delta-badge"
			}, [createVNode(unref(N8nIcon_default), {
				icon: icon.value,
				size: "large"
			}, null, 8, ["icon"]), createVNode(unref(N8nText_default), {
				size: "small",
				class: normalizeClass(_ctx.$style.label)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(label.value), 1)]),
				_: 1
			}, 8, ["class"])], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	badge: "_badge_17hn1_1",
	label: "_label_17hn1_11",
	positive: "_positive_17hn1_15",
	negative: "_negative_17hn1_20"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/RunDetail/MetricSummaryCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var MetricSummaryCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MetricSummaryCard",
	props: {
		name: {},
		currentValue: {},
		delta: {},
		deltaScale: {},
		category: {},
		scale: {},
		sourceNodeName: {},
		caseValues: {}
	},
	setup(__props) {
		const props = __props;
		const tone = computed(() => getDeltaTone(props.delta));
		const formattedValue = computed(() => formatMetricValue(props.currentValue, {
			key: props.name,
			category: props.category,
			scale: props.scale
		}));
		const formattedLabel = computed(() => formatMetricLabel(props.name));
		const formattedSumScore = computed(() => !isUnscaledCustomMetric({
			key: props.name,
			category: props.category,
			scale: props.scale
		}) ? formatMetricRawScoreSum(props.caseValues ?? [], {
			category: props.category,
			scale: props.scale
		}) : "");
		const valueTooltip = computed(() => formattedSumScore.value ? `${formattedValue.value} • ${formattedSumScore.value}` : "");
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": "metric-summary-card"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleRow) }, [createVNode(unref(N8nTooltip_default), {
				content: __props.sourceNodeName ? `${__props.name} · ${__props.sourceNodeName}` : __props.name,
				placement: "top",
				"as-child": ""
			}, {
				default: withCtx(() => [createVNode(unref(N8nText_default), {
					size: "small",
					class: normalizeClass(_ctx.$style.title)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(formattedLabel.value), 1)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["content"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.valueRow) }, [valueTooltip.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				content: valueTooltip.value,
				placement: "top",
				"show-after": 0
			}, {
				default: withCtx(() => [createBaseVNode("span", { class: normalizeClass([_ctx.$style.value, _ctx.$style[`tone-${tone.value}`]]) }, toDisplayString(formattedValue.value), 3)]),
				_: 1
			}, 8, ["content"])) : (openBlock(), createElementBlock("span", {
				key: 1,
				class: normalizeClass([_ctx.$style.value, _ctx.$style[`tone-${tone.value}`]])
			}, toDisplayString(formattedValue.value), 3)), createVNode(TrendDeltaBadge_default, {
				delta: __props.delta,
				name: __props.name,
				category: __props.category,
				scale: __props.deltaScale
			}, null, 8, [
				"delta",
				"name",
				"category",
				"scale"
			])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_oo4sg_1",
	titleRow: "_titleRow_oo4sg_16",
	title: "_title_oo4sg_16",
	valueRow: "_valueRow_oo4sg_32",
	value: "_value_oo4sg_32",
	"tone-default": "_tone-default_oo4sg_46",
	"tone-positive": "_tone-positive_oo4sg_50",
	"tone-negative": "_tone-negative_oo4sg_54"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/RunDetail/MetricSummaryStrip.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var MetricSummaryStrip_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MetricSummaryStrip",
	props: {
		currentMetrics: {},
		previousMetrics: {},
		metricSources: {},
		metricScales: {},
		previousMetricScales: {},
		caseValuesByKey: {}
	},
	setup(__props) {
		const props = __props;
		const metricNames = computed(() => getUserDefinedMetricNames(props.currentMetrics));
		function metricDelta(name, category) {
			const current = normalizeMetricValue(props.currentMetrics?.[name]);
			const previous = normalizeMetricValue(props.previousMetrics?.[name]);
			if (current === void 0 || previous === void 0) return { value: void 0 };
			const currentScale = props.metricScales?.[name];
			const previousScale = props.previousMetricScales?.[name];
			const currentIsUnscaled = isUnscaledCustomMetric({
				key: name,
				category,
				scale: currentScale
			});
			if (currentIsUnscaled !== isUnscaledCustomMetric({
				key: name,
				category,
				scale: previousScale
			})) return { value: void 0 };
			if (currentIsUnscaled) return { value: current - previous };
			const currentScore = normalizeMetricScore(name, current, currentScale);
			const previousScore = normalizeMetricScore(name, previous, previousScale);
			if (currentScore === null || previousScore === null) return { value: void 0 };
			return {
				value: currentScore - previousScore,
				scale: "unit"
			};
		}
		const cards = computed(() => metricNames.value.map((name) => {
			const source = props.metricSources?.[name];
			const delta = metricDelta(name, source?.category);
			return {
				name,
				currentValue: normalizeMetricValue(props.currentMetrics?.[name]),
				delta: delta.value,
				deltaScale: delta.scale,
				category: source?.category,
				scale: props.metricScales?.[name],
				sourceNodeName: source?.nodeName,
				caseValues: props.caseValuesByKey?.[name] ?? []
			};
		}));
		return (_ctx, _cache) => {
			return cards.value.length > 0 ? (openBlock(), createBlock(unref(N8nScrollArea_default), {
				key: 0,
				type: "always",
				"enable-horizontal-scroll": "",
				"enable-vertical-scroll": false,
				class: normalizeClass(_ctx.$style.scroll),
				"data-test-id": "metric-summary-strip"
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.row) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(cards.value, (card) => {
					return openBlock(), createBlock(MetricSummaryCard_default, {
						key: card.name,
						name: card.name,
						"current-value": card.currentValue,
						delta: card.delta,
						"delta-scale": card.deltaScale,
						category: card.category,
						scale: card.scale,
						"source-node-name": card.sourceNodeName,
						"case-values": card.caseValues
					}, null, 8, [
						"name",
						"current-value",
						"delta",
						"delta-scale",
						"category",
						"scale",
						"source-node-name",
						"case-values"
					]);
				}), 128))], 2)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	scroll: "_scroll_qulrg_1",
	row: "_row_qulrg_7"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/RunDetail/RunStatusPill.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RunStatusPill_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "RunStatusPill",
	props: { status: {} },
	setup(__props) {
		const props = __props;
		const locale = useI18n();
		const tone = computed(() => {
			switch (props.status) {
				case "new":
				case "running": return "running";
				case "completed":
				case "success": return "done";
				case "error":
				case "warning": return "failed";
				case "cancelled": return "cancelled";
				default: return "failed";
			}
		});
		const labelKey = computed(() => {
			switch (tone.value) {
				case "running": return "evaluation.runDetail.runStatus.running";
				case "done": return "evaluation.runDetail.runStatus.done";
				case "failed": return "evaluation.runDetail.runStatus.failed";
				case "cancelled": return "evaluation.runDetail.runStatus.cancelled";
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", {
				class: normalizeClass([_ctx.$style.pill, _ctx.$style[tone.value]]),
				"data-test-id": "run-status-pill"
			}, [tone.value === "running" ? (openBlock(), createBlock(unref(N8nSpinner_default), {
				key: 0,
				size: "small"
			})) : tone.value === "done" ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 1,
				icon: "circle-check",
				size: "small"
			})) : tone.value === "failed" ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 2,
				icon: "triangle-alert",
				size: "small"
			})) : tone.value === "cancelled" ? (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 3,
				icon: "status-canceled",
				size: "small"
			})) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
				size: "small",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(labelKey.value)), 1)]),
				_: 1
			})], 2);
		};
	}
}), [["__cssModules", { "$style": {
	pill: "_pill_1crkk_1",
	running: "_running_1crkk_12",
	done: "_done_1crkk_16",
	failed: "_failed_1crkk_21",
	cancelled: "_cancelled_1crkk_26"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/composables/useCyclingVerb.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Pool of i18n keys for the progress verbs we cycle through while a test
* case is running. The composable returns a key (not the translated value)
* so the render site translates at use time and respects the active locale.
* Lifted from the TRUST-70 spec so the running state feels alive instead of
* just showing a static "Running…".
*/
var PROGRESS_VERB_KEYS = [
	"evaluation.runDetail.testCase.progress.accomplishing",
	"evaluation.runDetail.testCase.progress.actioning",
	"evaluation.runDetail.testCase.progress.actualizing",
	"evaluation.runDetail.testCase.progress.architecting",
	"evaluation.runDetail.testCase.progress.baking",
	"evaluation.runDetail.testCase.progress.beaming",
	"evaluation.runDetail.testCase.progress.beboppin",
	"evaluation.runDetail.testCase.progress.befuddling",
	"evaluation.runDetail.testCase.progress.billowing",
	"evaluation.runDetail.testCase.progress.blanching",
	"evaluation.runDetail.testCase.progress.bloviating",
	"evaluation.runDetail.testCase.progress.boogieing",
	"evaluation.runDetail.testCase.progress.boondoggling",
	"evaluation.runDetail.testCase.progress.booping",
	"evaluation.runDetail.testCase.progress.bootstrapping",
	"evaluation.runDetail.testCase.progress.brewing",
	"evaluation.runDetail.testCase.progress.bunning",
	"evaluation.runDetail.testCase.progress.burrowing",
	"evaluation.runDetail.testCase.progress.calculating",
	"evaluation.runDetail.testCase.progress.canoodling",
	"evaluation.runDetail.testCase.progress.caramelizing",
	"evaluation.runDetail.testCase.progress.cascading",
	"evaluation.runDetail.testCase.progress.catapulting",
	"evaluation.runDetail.testCase.progress.cerebrating",
	"evaluation.runDetail.testCase.progress.channeling",
	"evaluation.runDetail.testCase.progress.choreographing",
	"evaluation.runDetail.testCase.progress.churning",
	"evaluation.runDetail.testCase.progress.clauding",
	"evaluation.runDetail.testCase.progress.coalescing",
	"evaluation.runDetail.testCase.progress.cogitating",
	"evaluation.runDetail.testCase.progress.combobulating",
	"evaluation.runDetail.testCase.progress.composing",
	"evaluation.runDetail.testCase.progress.computing",
	"evaluation.runDetail.testCase.progress.concocting",
	"evaluation.runDetail.testCase.progress.considering",
	"evaluation.runDetail.testCase.progress.contemplating",
	"evaluation.runDetail.testCase.progress.cooking",
	"evaluation.runDetail.testCase.progress.crafting",
	"evaluation.runDetail.testCase.progress.creating",
	"evaluation.runDetail.testCase.progress.crunching",
	"evaluation.runDetail.testCase.progress.crystallizing",
	"evaluation.runDetail.testCase.progress.cultivating",
	"evaluation.runDetail.testCase.progress.deciphering",
	"evaluation.runDetail.testCase.progress.deliberating",
	"evaluation.runDetail.testCase.progress.determining",
	"evaluation.runDetail.testCase.progress.dillyDallying",
	"evaluation.runDetail.testCase.progress.discombobulating",
	"evaluation.runDetail.testCase.progress.doing",
	"evaluation.runDetail.testCase.progress.doodling"
];
var DEFAULT_INTERVAL_MS = 2500;
/**
* Picks a fresh progress-verb i18n key every `intervalMs` while `enabled` is
* truthy and returns it as a reactive ref. The render site is responsible
* for translating the key (via `useI18n().baseText(...)`), so locale
* changes take effect without re-mounting the composable. The first key is
* randomized so two cards starting at the same time aren't synced. The
* interval is paused while `enabled` is false to avoid burning timers on
* idle headers.
*/
function useCyclingVerb(enabled, intervalMs = DEFAULT_INTERVAL_MS) {
	const pickRandom = () => PROGRESS_VERB_KEYS[Math.floor(Math.random() * PROGRESS_VERB_KEYS.length)];
	const verbKey = ref(pickRandom());
	let timer = null;
	const stop = () => {
		if (timer !== null) {
			clearInterval(timer);
			timer = null;
		}
	};
	const start = () => {
		if (timer !== null) return;
		verbKey.value = pickRandom();
		timer = setInterval(() => {
			verbKey.value = pickRandom();
		}, intervalMs);
	};
	watch(enabled, (value) => {
		if (value) start();
		else stop();
	}, { immediate: true });
	onBeforeUnmount(stop);
	return verbKey;
}
//#endregion
//#region src/features/ai/evaluation.ee/components/RunDetail/TestCaseHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["aria-label"];
var TestCaseHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TestCaseHeader",
	props: {
		index: {},
		status: {},
		tokens: {},
		durationMs: {},
		executionId: {},
		cancelDisabled: { type: Boolean }
	},
	emits: [
		"view",
		"cancel",
		"rerun"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const locale = useI18n();
		const tokensLabel = computed(() => formatTokens(props.tokens));
		const durationLabel = computed(() => formatDuration(props.durationMs));
		const isFinished = computed(() => props.status === "success" || props.status === "error" || props.status === "warning");
		const isPending = computed(() => props.status === "new");
		const isRunning = computed(() => props.status === "running" || props.status === "evaluation_running");
		const isCancelled = computed(() => props.status === "cancelled");
		const isFailed = computed(() => props.status === "error" || props.status === "warning");
		const hasMetadata = computed(() => isFinished.value && (props.tokens !== void 0 || props.durationMs !== void 0));
		const cyclingVerbKey = useCyclingVerb(isRunning);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.header),
				"data-test-id": "test-case-header"
			}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.leftGroup, { [_ctx.$style.shimmering]: isRunning.value }]) }, [
				isRunning.value ? (openBlock(), createBlock(unref(N8nSpinner_default), {
					key: 0,
					size: "small",
					class: normalizeClass(_ctx.$style.leadingSpinner)
				}, null, 8, ["class"])) : createCommentVNode("", true),
				createVNode(unref(N8nText_default), {
					size: "medium",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluation.runDetail.testCase.title", { interpolate: { index: __props.index } })), 1)]),
					_: 1
				}),
				hasMetadata.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					__props.tokens !== void 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						class: normalizeClass(_ctx.$style.meta)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(tokensLabel.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					__props.tokens !== void 0 && __props.durationMs !== void 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						size: "small",
						class: normalizeClass(_ctx.$style.dot)
					}, {
						default: withCtx(() => [..._cache[3] || (_cache[3] = [createTextVNode(" · ", -1)])]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					__props.durationMs !== void 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 2,
						size: "small",
						class: normalizeClass(_ctx.$style.meta)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(durationLabel.value), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)
				], 64)) : createCommentVNode("", true)
			], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.rightGroup) }, [isPending.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nIcon_default), {
				icon: "circle",
				size: "small",
				class: normalizeClass(_ctx.$style.pendingIcon)
			}, null, 8, ["class"]), createVNode(unref(N8nButton_default), {
				variant: "ghost",
				size: "mini",
				label: unref(locale).baseText("evaluation.runDetail.testCase.cancel"),
				disabled: __props.cancelDisabled,
				"data-test-id": "test-case-cancel-button",
				onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("cancel"), ["stop"]))
			}, null, 8, ["label", "disabled"])], 64)) : isRunning.value ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 1,
				size: "small",
				class: normalizeClass(_ctx.$style.runningVerb)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(unref(cyclingVerbKey))) + "… ", 1)]),
				_: 1
			}, 8, ["class"])) : isCancelled.value ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 2,
				size: "small",
				class: normalizeClass(_ctx.$style.meta)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluation.runDetail.testCase.cancelled")), 1)]),
				_: 1
			}, 8, ["class"])) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [__props.executionId ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				content: unref(locale).baseText("evaluation.runDetail.testCase.viewLink"),
				placement: "top"
			}, {
				default: withCtx(() => [createBaseVNode("button", {
					type: "button",
					class: normalizeClass(["open-execution-link", _ctx.$style.viewIcon]),
					"data-test-id": "test-case-view-link",
					"aria-label": unref(locale).baseText("evaluation.runDetail.testCase.viewLink"),
					onClick: _cache[1] || (_cache[1] = withModifiers(($event) => emit("view"), ["stop"]))
				}, [createVNode(unref(N8nIcon_default), {
					icon: "external-link",
					size: "small"
				})], 10, _hoisted_1)]),
				_: 1
			}, 8, ["content"])) : createCommentVNode("", true), isFailed.value ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 1,
				variant: "outline",
				size: "mini",
				label: unref(locale).baseText("evaluation.runDetail.testCase.rerun"),
				"data-test-id": "test-case-rerun-button",
				onClick: _cache[2] || (_cache[2] = withModifiers(($event) => emit("rerun"), ["stop"]))
			}, null, 8, ["label"])) : createCommentVNode("", true)], 64))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_18ib8_450",
	leftGroup: "_leftGroup_18ib8_460",
	shimmering: "_shimmering_18ib8_467",
	shimmer: "_shimmer_18ib8_467",
	leadingSpinner: "_leadingSpinner_18ib8_481",
	rightGroup: "_rightGroup_18ib8_485",
	meta: "_meta_18ib8_492",
	dot: "_dot_18ib8_496",
	pendingIcon: "_pendingIcon_18ib8_500",
	runningVerb: "_runningVerb_18ib8_504",
	viewIcon: "_viewIcon_18ib8_518",
	spin: "_spin_18ib8_1",
	"skeleton-pulse": "_skeleton-pulse_18ib8_1",
	opacityPulse: "_opacityPulse_18ib8_1",
	popoverIn: "_popoverIn_18ib8_1",
	fadeIn: "_fadeIn_18ib8_1",
	collapsibleSlideDown: "_collapsibleSlideDown_18ib8_1",
	collapsibleSlideUp: "_collapsibleSlideUp_18ib8_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_18ib8_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_18ib8_1",
	blurSwapIn: "_blurSwapIn_18ib8_1",
	blurSwapOut: "_blurSwapOut_18ib8_1",
	pulse: "_pulse_18ib8_1",
	pulseGlow: "_pulseGlow_18ib8_1",
	pulseGlowDelayed: "_pulseGlowDelayed_18ib8_1",
	fade: "_fade_18ib8_1",
	fadeInUp: "_fadeInUp_18ib8_1",
	fadeInDown: "_fadeInDown_18ib8_1",
	fadeInLeft: "_fadeInLeft_18ib8_1",
	fadeInRight: "_fadeInRight_18ib8_1",
	fadeOut: "_fadeOut_18ib8_1",
	fadeOutDown: "_fadeOutDown_18ib8_1",
	fadeOutUp: "_fadeOutUp_18ib8_1",
	fadeOutLeft: "_fadeOutLeft_18ib8_1",
	fadeOutRight: "_fadeOutRight_18ib8_1",
	ping: "_ping_18ib8_1",
	blinkBackground: "_blinkBackground_18ib8_1",
	typingBlink: "_typingBlink_18ib8_1"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/RunDetail/TestCaseMetricRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var TestCaseMetricRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TestCaseMetricRow",
	props: {
		name: {},
		value: {},
		category: {},
		scale: {},
		sourceNodeName: {},
		errored: { type: Boolean },
		errorMessage: {}
	},
	setup(__props) {
		const props = __props;
		const locale = useI18n();
		const formattedLabel = computed(() => formatMetricLabel(props.name));
		const formattedValue = computed(() => formatMetricValue(props.value, {
			key: props.name,
			category: props.category,
			scale: props.scale
		}));
		const formattedRawScore = computed(() => formatMetricRawScore(props.value, {
			category: props.category,
			scale: props.scale
		}));
		const tooltipContent = computed(() => formattedRawScore.value ? `${formattedValue.value} • ${formattedRawScore.value}` : "");
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.row),
				"data-test-id": "test-case-metric-row"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.leading) }, [
				createVNode(unref(N8nIcon_default), {
					icon: __props.errored ? "circle-x" : "circle-check",
					size: "small",
					class: normalizeClass(__props.errored ? _ctx.$style.errorIcon : _ctx.$style.successIcon)
				}, null, 8, ["icon", "class"]),
				createVNode(unref(N8nText_default), {
					size: "medium",
					bold: "",
					class: normalizeClass(_ctx.$style.name)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(formattedLabel.value), 1)]),
					_: 1
				}, 8, ["class"]),
				__props.sourceNodeName ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					class: normalizeClass(_ctx.$style.subtitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.sourceNodeName), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)
			], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.trailing) }, [__props.errored ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				size: "small",
				class: normalizeClass(_ctx.$style.errorMessage)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.errorMessage ?? unref(locale).baseText("evaluation.runDetail.testCase.failed")), 1)]),
				_: 1
			}, 8, ["class"])) : tooltipContent.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 1,
				content: tooltipContent.value,
				placement: "top"
			}, {
				default: withCtx(() => [createVNode(unref(N8nText_default), {
					size: "medium",
					class: normalizeClass(_ctx.$style.value)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(formattedValue.value), 1)]),
					_: 1
				}, 8, ["class"])]),
				_: 1
			}, 8, ["content"])) : (openBlock(), createBlock(unref(N8nText_default), {
				key: 2,
				size: "medium",
				class: normalizeClass(_ctx.$style.value)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(formattedValue.value), 1)]),
				_: 1
			}, 8, ["class"]))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_1szgf_1",
	leading: "_leading_1szgf_10",
	trailing: "_trailing_1szgf_18",
	successIcon: "_successIcon_1szgf_24",
	errorIcon: "_errorIcon_1szgf_28",
	name: "_name_1szgf_32",
	subtitle: "_subtitle_1szgf_39",
	value: "_value_1szgf_43",
	errorMessage: "_errorMessage_1szgf_49"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/components/RunDetail/TestCaseCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler(), init_reactivity_esm_bundler();
var TestCaseCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TestCaseCard",
	props: {
		testCase: {},
		index: {},
		metricSources: {},
		metricScales: {}
	},
	emits: [
		"view",
		"cancel",
		"rerun"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const locale = useI18n();
		const status = computed(() => props.testCase.status);
		const tokens = computed(() => {
			const value = props.testCase.metrics?.totalTokens;
			return typeof value === "number" ? value : void 0;
		});
		const durationMs = computed(() => {
			const fromMetric = props.testCase.metrics?.executionTime;
			if (typeof fromMetric === "number") return fromMetric;
			return computeDurationMs(props.testCase.runAt ?? void 0, props.testCase.updatedAt);
		});
		const isOpaque = computed(() => status.value === "new" || status.value === "cancelled");
		const isErrored = computed(() => status.value === "error" || status.value === "warning");
		const showRows = computed(() => status.value === "success" || isErrored.value);
		const errorMessage = computed(() => {
			const code = props.testCase.errorCode;
			const key = code ? getErrorBaseKey(code) : "";
			if (key) return locale.baseText(key);
			return locale.baseText("evaluation.runDetail.error.unknownError");
		});
		const errorTitle = computed(() => locale.baseText("evaluation.runDetail.testCase.failed"));
		const rows = computed(() => {
			if (status.value !== "success") return [];
			return getUserDefinedMetricNames(props.testCase.metrics).map((name) => {
				const source = props.metricSources?.[name];
				return {
					name,
					value: normalizeMetricValue(props.testCase.metrics?.[name]),
					category: source?.category,
					scale: props.metricScales?.[name],
					sourceNodeName: source?.nodeName
				};
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass([_ctx.$style.card, { [_ctx.$style.opaque]: isOpaque.value }]),
				style: { "--card--padding": "var(--spacing--md)" },
				"data-test-id": "test-case-card",
				"data-status": status.value
			}, {
				header: withCtx(() => [createVNode(TestCaseHeader_default, {
					index: __props.index,
					status: status.value,
					tokens: tokens.value,
					"duration-ms": durationMs.value,
					"execution-id": __props.testCase.executionId,
					onView: _cache[0] || (_cache[0] = ($event) => emit("view", __props.testCase)),
					onCancel: _cache[1] || (_cache[1] = ($event) => emit("cancel", __props.testCase)),
					onRerun: _cache[2] || (_cache[2] = ($event) => emit("rerun", __props.testCase))
				}, null, 8, [
					"index",
					"status",
					"tokens",
					"duration-ms",
					"execution-id"
				])]),
				default: withCtx(() => [createVNode(Transition, {
					name: "tc-rows-fade-in",
					appear: ""
				}, {
					default: withCtx(() => [showRows.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.rowList)
					}, [isErrored.value ? (openBlock(), createBlock(TestCaseMetricRow_default, {
						key: "__error__",
						name: errorTitle.value,
						value: void 0,
						errored: "",
						"error-message": errorMessage.value
					}, null, 8, ["name", "error-message"])) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(rows.value, (row) => {
						return openBlock(), createBlock(TestCaseMetricRow_default, {
							key: row.name,
							name: row.name,
							value: row.value,
							category: row.category,
							scale: row.scale,
							"source-node-name": row.sourceNodeName
						}, null, 8, [
							"name",
							"value",
							"category",
							"scale",
							"source-node-name"
						]);
					}), 128))], 2)) : createCommentVNode("", true)]),
					_: 1
				})]),
				_: 1
			}, 8, ["class", "data-status"]);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_1yw87_1",
	opaque: "_opaque_1yw87_8",
	rowList: "_rowList_1yw87_12",
	"tc-rows-fade-in": "_tc-rows-fade-in_1yw87_18"
} }]]);
//#endregion
//#region src/features/ai/evaluation.ee/views/TestRunDetailView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var TestRunDetailView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TestRunDetailView",
	setup(__props) {
		const router = useRouter();
		const toast = useToast();
		const evaluationStore = useEvaluationStore();
		const evaluationState = useWorkflowEvaluationState();
		const locale = useI18n();
		const telemetry = useTelemetry();
		const isLoading = ref(true);
		const testCases = computed(() => Object.values(evaluationStore.testCaseExecutionsById).filter((record) => record.testRunId === runId.value));
		const runId = computed(() => router.currentRoute.value.params.runId);
		const workflowId = useInjectWorkflowId();
		const run = computed(() => evaluationStore.testRunsById[runId.value]);
		const orderedRuns = computed(() => (0, import_orderBy.default)(Object.values(evaluationStore.testRunsById).filter((record) => record.workflowId === workflowId.value), (record) => new Date(record.runAt), ["asc"]));
		const testRunIndex = computed(() => orderedRuns.value.findIndex((record) => record.id === runId.value));
		const previousRun = computed(() => {
			const index = testRunIndex.value;
			if (index <= 0) return null;
			for (let i = index - 1; i >= 0; i--) {
				const candidate = orderedRuns.value[i];
				if (candidate?.status === "completed") return candidate;
			}
			return null;
		});
		const orderedTestCases = computed(() => (0, import_orderBy.default)(testCases.value, [(record) => record.runIndex ?? Number.MAX_SAFE_INTEGER, (record) => record.runAt ?? ""], ["asc", "asc"]));
		const metricSources = computed(() => evaluationState.metricSourceByKey.value);
		const caseValuesByKey = computed(() => {
			const result = {};
			for (const name of getUserDefinedMetricNames(run.value?.metrics)) result[name] = orderedTestCases.value.map((testCase) => testCase.metrics?.[name]);
			return result;
		});
		const rerunRun = async () => {
			if (!workflowId.value) return;
			try {
				const configId = run.value?.evaluationConfigId;
				const options = configId ? {
					evaluationConfigId: configId,
					compileFromConfig: true
				} : void 0;
				const { testRunId } = await evaluationStore.startTestRun(workflowId.value, options);
				telemetry.track("User ran evaluation", {
					workflow_id: workflowId.value,
					run_id: testRunId,
					run_type: configId ? "config" : "direct"
				});
				await evaluationStore.fetchTestRuns(workflowId.value);
				await router.push({
					name: VIEWS.EVALUATION_RUNS_DETAIL,
					params: {
						workflowId: workflowId.value,
						runId: testRunId
					}
				});
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.error.cantStartTestRun"));
			}
		};
		const cancelPendingCase = async (testCase) => {
			if (!workflowId.value) return;
			try {
				await evaluationStore.cancelTestCase({
					workflowId: workflowId.value,
					runId: runId.value,
					caseId: testCase.id
				});
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.runDetail.testCase.cancelError"));
			}
		};
		const openRelatedExecution = (testCase) => {
			const executionId = testCase.executionId;
			if (!executionId) return;
			telemetry.track("User opened execution from run detail", {
				run_id: runId.value,
				workflow_id: workflowId.value,
				test_case_id: testCase.id
			});
			const { href } = router.resolve({
				name: VIEWS.EXECUTION_PREVIEW,
				params: {
					workflowId: workflowId.value,
					executionId
				}
			});
			window.open(href, "_blank");
		};
		const fetchExecutionTestCases = async () => {
			if (!runId.value || !workflowId.value) return false;
			isLoading.value = true;
			try {
				const testRun = await evaluationStore.getTestRun({
					workflowId: workflowId.value,
					runId: runId.value
				});
				await evaluationStore.fetchTestCaseExecutions({
					workflowId: workflowId.value,
					runId: testRun.id
				});
				await evaluationStore.fetchTestRuns(run.value.workflowId);
				return true;
			} catch (error) {
				toast.showError(error, locale.baseText("evaluation.listRuns.toast.error.fetchTestCases"));
				return false;
			} finally {
				isLoading.value = false;
			}
		};
		const trackViewedRunDetail = () => {
			telemetry.track("User viewed run detail", {
				run_id: runId.value,
				workflow_id: workflowId.value,
				has_previous_run: previousRun.value !== null,
				metric_count: getUserDefinedMetricNames(run.value?.metrics).length,
				test_case_count: testCases.value.length,
				failed_test_case_count: testCases.value.filter((c) => c.status === "error").length
			});
		};
		const navigateBackToRuns = async () => {
			if (!workflowId.value) return;
			await router.push({
				name: VIEWS.EVALUATION_EDIT,
				params: { workflowId: workflowId.value }
			});
		};
		onMounted(async () => await fetchExecutionTestCases() && trackViewedRunDetail());
		onBeforeUnmount(() => evaluationStore.cleanupPolling());
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "test-definition-run-detail"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("button", {
					class: normalizeClass(_ctx.$style.backButton),
					onClick: navigateBackToRuns
				}, [createVNode(unref(N8nIcon_default), {
					icon: "arrow-left",
					size: "small"
				}), createVNode(unref(N8nText_default), { size: "medium" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("evaluation.runDetail.backToRuns")), 1)]),
					_: 1
				})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headingRow) }, [createBaseVNode("h1", { class: normalizeClass(_ctx.$style.runHeading) }, toDisplayString(unref(locale).baseText("evaluation.listRuns.testCasesListHeader", { interpolate: { index: testRunIndex.value + 1 } })), 3), run.value ? (openBlock(), createBlock(RunStatusPill_default, {
					key: 0,
					status: run.value.status
				}, null, 8, ["status"])) : createCommentVNode("", true)], 2)], 2),
				createVNode(MetricSummaryStrip_default, {
					"current-metrics": run.value?.metrics,
					"previous-metrics": previousRun.value?.metrics,
					"metric-sources": metricSources.value,
					"metric-scales": run.value?.metricScales,
					"previous-metric-scales": previousRun.value?.metricScales,
					"case-values-by-key": caseValuesByKey.value,
					class: "mb-m"
				}, null, 8, [
					"current-metrics",
					"previous-metrics",
					"metric-sources",
					"metric-scales",
					"previous-metric-scales",
					"case-values-by-key"
				]),
				isLoading.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.loading)
				}, [createVNode(unref(N8nLoading_default), {
					loading: true,
					rows: 5
				})], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.caseList)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(orderedTestCases.value, (testCase, index) => {
					return openBlock(), createBlock(TestCaseCard_default, {
						key: testCase.id,
						"test-case": testCase,
						index: index + 1,
						"metric-sources": metricSources.value,
						"metric-scales": run.value?.metricScales,
						onView: openRelatedExecution,
						onCancel: cancelPendingCase,
						onRerun: rerunRun
					}, null, 8, [
						"test-case",
						"index",
						"metric-sources",
						"metric-scales"
					]);
				}), 128))], 2))
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1y2s2_1",
	header: "_header_1y2s2_8",
	headingRow: "_headingRow_1y2s2_15",
	backButton: "_backButton_1y2s2_22",
	runHeading: "_runHeading_1y2s2_38",
	capitalized: "_capitalized_1y2s2_47",
	loading: "_loading_1y2s2_55",
	caseList: "_caseList_1y2s2_62"
} }]]);
//#endregion
export { TestRunDetailView_default as default };
