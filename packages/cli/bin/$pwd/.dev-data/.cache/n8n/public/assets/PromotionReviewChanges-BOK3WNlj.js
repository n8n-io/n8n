import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Tf as watch, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xf as unref, _p as normalizeClass, ff as openBlock, ip as init_shared_esm_bundler, mf as renderList, pf as provide, yp as normalizeStyle, zd as createBaseVNode, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { Ej as useResizablePanel, LM as N8nCallout_default, SN as _plugin_vue_export_helper_default, Tj as N8nResizeWrapper_default, bC as useRootStore, jN as useI18n, tN as N8nLoading_default, xM as N8nEmptyState_default } from "./app-D5flEmb-.js";
import { E as getPromotionReviewDetails, T as getPromotionReviewChanges, h as cardOrder, m as buildPreviewTree, p as totalChangeCount, r as buildSelectionGraph } from "./promotionPreview.selection-D6KzwuTA.js";
import { n as defaultActiveWorkflow, o as PromotionAbsentSideLabelsKey, r as hasWorkflowDiff } from "./PromotionWorkflowSideLabel-B4SmfFXl.js";
import { f as usePromotionResourceDetails, n as PromotionChangeCards_default, o as indexBlockers, t as PromotionResourceTree_default } from "./PromotionResourceTree-uM9syxVb.js";
import { t as httpUrl } from "./promotionResult-CXJqKPa0.js";
//#region ../../modules/promotions/frontend/src/components/review/PromotionReviewChanges.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
var PromotionReviewChanges_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionReviewChanges",
	props: { reviewId: {} },
	emits: ["state"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const noInclusion = {
			included: /* @__PURE__ */ new Set(),
			reasons: /* @__PURE__ */ new Map()
		};
		const noKeys = /* @__PURE__ */ new Set();
		const noBlockers = indexBlockers([]);
		provide(PromotionAbsentSideLabelsKey, {
			before: i18n.baseText("promotions.review.side.added"),
			after: i18n.baseText("promotions.review.side.removed")
		});
		const state = ref("loading");
		const errorMessage = ref();
		const changes = shallowRef(null);
		let generation = 0;
		async function load() {
			const current = ++generation;
			state.value = "loading";
			changes.value = null;
			emit("state", { status: "loading" });
			try {
				const result = await getPromotionReviewChanges(rootStore.restApiContext, props.reviewId);
				if (current !== generation) return;
				changes.value = result;
				state.value = "ready";
				emit("state", result.warnings.length > 0 ? { status: "unavailable" } : {
					status: "ready",
					headCommitSha: result.headCommitSha
				});
			} catch (error) {
				if (current !== generation) return;
				errorMessage.value = error instanceof Error ? error.message : void 0;
				state.value = "error";
				emit("state", { status: "unavailable" });
			}
		}
		const outcome = computed(() => changes.value?.warnings.includes("commitsUnavailable") ? changes.value.outcome : null);
		function toDisplayDate(value) {
			const sameYear = new Date(value).getFullYear() === (/* @__PURE__ */ new Date()).getFullYear();
			return (0, import_dateformat.default)(value, sameYear ? "mmm d" : "mmm d, yyyy");
		}
		const outcomeDescription = computed(() => {
			if (!outcome.value) return void 0;
			const { state, at, by } = outcome.value;
			const date = at ? toDisplayDate(at) : null;
			if (by && date) return i18n.baseText(`promotions.review.outcome.${state}.description`, { interpolate: {
				user: by,
				date
			} });
			if (date) return i18n.baseText(`promotions.review.outcome.${state}.descriptionNoUser`, { interpolate: { date } });
			if (by) return i18n.baseText(`promotions.review.outcome.${state}.descriptionNoDate`, { interpolate: { user: by } });
			return i18n.baseText("promotions.review.outcome.description.unknown");
		});
		function openOnHost() {
			const url = httpUrl(outcome.value?.webUrl);
			if (url) window.open(url, "_blank", "noopener,noreferrer");
		}
		const inspectedKey = ref();
		watch(() => props.reviewId, async () => {
			inspectedKey.value = void 0;
			await load();
		}, { immediate: true });
		const graph = computed(() => changes.value ? buildSelectionGraph(changes.value, "promote") : null);
		const tree = computed(() => changes.value ? buildPreviewTree(changes.value, {
			workflows: i18n.baseText("promotions.preview.tree.section.workflows"),
			group: (group) => i18n.baseText(`promotions.preview.tree.group.${group}`)
		}) : []);
		const order = computed(() => graph.value ? cardOrder(tree.value, graph.value.resources) : []);
		const totalChanges = computed(() => graph.value ? totalChangeCount(graph.value) : 0);
		const activeWorkflowKey = ref();
		watch(order, (keys) => {
			if (activeWorkflowKey.value && keys.includes(activeWorkflowKey.value)) return;
			activeWorkflowKey.value = graph.value ? defaultActiveWorkflow(keys, graph.value.resources, inspectedKey.value) : void 0;
		});
		const details = usePromotionResourceDetails(async (keys) => {
			const { baselineCommitSha, headCommitSha } = changes.value ?? {};
			if (!baselineCommitSha || !headCommitSha) return {
				details: [],
				missingKeys: keys
			};
			return await getPromotionReviewDetails(rootStore.restApiContext, props.reviewId, {
				baselineCommitSha,
				headCommitSha,
				keys
			});
		}, changes, graph, activeWorkflowKey);
		const cards = ref();
		async function inspect(key) {
			const resource = graph.value?.resources.get(key);
			if (resource && hasWorkflowDiff(resource)) activeWorkflowKey.value = key;
			if (key === inspectedKey.value) await cards.value?.scrollToCard(key);
			else inspectedKey.value = key;
		}
		const panes = ref(null);
		const treeResizer = useResizablePanel({
			container: panes,
			width: {
				localStorageKey: "N8N_PROMOTION_REVIEW_TREE_WIDTH",
				defaultSize: (size) => Math.min(Math.max(size * .28, 240), 360),
				minSize: 200,
				maxSize: (size) => Math.min(size * .5, 640),
				snap: true
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.changes),
				"data-test-id": "promotion-review-changes"
			}, [state.value === "loading" ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.state),
				"data-test-id": "promotion-review-loading"
			}, [createVNode(unref(N8nLoading_default), { rows: 6 })], 2)) : state.value === "error" ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 1,
				class: normalizeClass(_ctx.$style.state),
				icon: {
					type: "icon",
					value: "circle-alert"
				},
				heading: unref(i18n).baseText("promotions.review.state.error"),
				description: errorMessage.value,
				"button-text": unref(i18n).baseText("promotions.preview.state.retry"),
				"data-test-id": "promotion-review-error",
				"onClick:button": load
			}, null, 8, [
				"class",
				"heading",
				"description",
				"button-text"
			])) : changes.value && graph.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [outcome.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.state),
				icon: {
					type: "icon",
					value: outcome.value.state === "merged" ? "check" : "circle-check"
				},
				heading: unref(i18n).baseText(`promotions.review.outcome.${outcome.value.state}.title`),
				description: outcomeDescription.value,
				"button-text": unref(i18n).baseText("promotions.review.outcome.openOnHost"),
				"button-variant": "outline",
				"data-test-id": "promotion-review-outcome",
				"onClick:button": openOnHost
			}, {
				description: withCtx(() => [createTextVNode(toDisplayString(outcomeDescription.value), 1)]),
				_: 1
			}, 8, [
				"class",
				"icon",
				"heading",
				"description",
				"button-text"
			])) : changes.value.warnings.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.notices)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(changes.value.warnings, (warning) => {
				return openBlock(), createBlock(unref(N8nCallout_default), {
					key: warning,
					theme: "warning",
					slim: "",
					"data-test-id": "promotion-review-warning"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`promotions.review.warning.${warning}`)), 1)]),
					_: 2
				}, 1024);
			}), 128))], 2)) : totalChanges.value === 0 ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 2,
				class: normalizeClass(_ctx.$style.state),
				icon: {
					type: "icon",
					value: "check"
				},
				heading: unref(i18n).baseText("promotions.review.state.empty.title"),
				description: unref(i18n).baseText("promotions.review.state.empty.description"),
				"data-test-id": "promotion-review-empty"
			}, null, 8, [
				"class",
				"heading",
				"description"
			])) : (openBlock(), createElementBlock("div", {
				key: 3,
				ref_key: "panes",
				ref: panes,
				class: normalizeClass(_ctx.$style.panes)
			}, [createVNode(unref(N8nResizeWrapper_default), {
				class: normalizeClass(_ctx.$style.tree),
				style: normalizeStyle({ width: `${unref(treeResizer).width.value}px` }),
				resizer: unref(treeResizer),
				"supported-directions": ["right"]
			}, {
				default: withCtx(() => [createVNode(PromotionResourceTree_default, {
					tree: tree.value,
					graph: graph.value,
					selected: unref(noKeys),
					inclusion: noInclusion,
					"included-changes": 0,
					"total-changes": totalChanges.value,
					"inspected-key": inspectedKey.value,
					disabled: unref(noKeys),
					locked: true,
					direction: "promote",
					blockers: unref(noBlockers),
					selectable: false,
					onInspect: inspect
				}, null, 8, [
					"tree",
					"graph",
					"selected",
					"total-changes",
					"inspected-key",
					"disabled",
					"blockers"
				])]),
				_: 1
			}, 8, [
				"class",
				"style",
				"resizer"
			]), createBaseVNode("section", { class: normalizeClass(_ctx.$style.cards) }, [createVNode(PromotionChangeCards_default, {
				ref_key: "cards",
				ref: cards,
				"active-workflow": activeWorkflowKey.value,
				"onUpdate:activeWorkflow": _cache[0] || (_cache[0] = ($event) => activeWorkflowKey.value = $event),
				order: order.value,
				graph: graph.value,
				direction: "promote",
				inclusion: noInclusion,
				selected: unref(noKeys),
				disabled: unref(noKeys),
				locked: true,
				entries: unref(details).entries.value,
				"inspected-key": inspectedKey.value,
				blockers: unref(noBlockers),
				selectable: false,
				onRetry: unref(details).retry,
				onRefresh: load,
				onInspect: inspect
			}, null, 8, [
				"active-workflow",
				"order",
				"graph",
				"selected",
				"disabled",
				"entries",
				"inspected-key",
				"blockers",
				"onRetry"
			])], 2)], 2))], 64)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	changes: "_changes_2d6bz_1",
	state: "_state_2d6bz_8",
	notices: "_notices_2d6bz_14",
	panes: "_panes_2d6bz_21",
	tree: "_tree_2d6bz_27",
	cards: "_cards_2d6bz_35"
} }]]);
//#endregion
export { PromotionReviewChanges_default as default };
