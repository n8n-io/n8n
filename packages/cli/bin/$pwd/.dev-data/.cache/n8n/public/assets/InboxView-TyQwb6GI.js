import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Bd as createBlock, Bu as useIntersectionObserver, Cf as useTemplateRef, Df as withCtx, Fl as AccordionRoot_default, Gd as createTextVNode, Hd as createElementBlock, If as isRef, Il as CollapsibleTrigger_default, Jd as defineComponent, Ju as useResizeObserver, Kd as createVNode, Ll as CollapsibleContent_default, Md as withKeys, Ml as AccordionHeader_default, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Nl as AccordionContent_default, Pd as Fragment, Pl as AccordionItem_default, Rd as computed, Rl as CollapsibleRoot_default, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, bd as I18nT, bf as useId, do as storeToRefs, ef as inject, ff as openBlock, gd as useTimeout, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, jl as AccordionTrigger_default, lf as onMounted, lo as defineStore, mf as renderList, nf as mergeModels, of as onBeforeUnmount, pf as provide, rf as mergeProps, vf as resolveDynamicComponent, xf as useModel, yp as normalizeStyle, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, B as ReviewDetailScrollContainerKey, Cm as useRBACStore, Ej as useResizablePanel, F as toError, Fw as makeRestApiRequest, GA as DialogDescription_default, HM as N8nAvatar_default, I as inboxItemLocation, JA as DialogHeader_default, K as PERSONAL_SELF_HEALING_CONFIGURATION_VIEW, KA as Dialog_default, L as isInboxRoute, LM as N8nCallout_default, Mw as ResponseError, N as formatActorName, NM as N8nCard_default, Nj as N8nPopover_default, P as formatUserDisplayName, Qj as N8nMarkdown_default, R as selectionFromRoute, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Tj as N8nResizeWrapper_default, U as INBOX_VIEW, UA as DialogFooter_default, V as ReviewLinkedWorkflowsKey, _C as useUsersStore, _N as N8nText_default, aN as N8nChatInput_default, a_ as tryUse, bC as useRootStore, bM as N8nExternalLink_default, cN as Input_default, dC as useToast, fC as VIEWS, fE as WORKFLOW_REVIEW_TEXT_MAX_LENGTH, fN as N8nTooltip_default, gj as N8nTimeAgo_default, hC as useTelemetry, hM as N8nLink_default, iN as AskAssistantAvatar_default, jN as useI18n, nN as N8nBadge_default, qA as DialogTitle_default, qd as useDocumentTitle, r_ as createSelfHealingChatHandoff, s_ as get, tN as N8nLoading_default, wy as TELEMETRY_EVENT, xM as N8nEmptyState_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default, yj as Tabs_default } from "./app-D5flEmb-.js";
import { n as getVersionLabel } from "./useWorkflowVersionLabel-cYv19BC7.js";
import { t as require_omit } from "./omit-DpgS2zJe.js";
import { t as useIntersectionObserver$1 } from "./useIntersectionObserver-BTGMngAL.js";
//#region ../../modules/inbox/frontend/src/inbox.api.ts
async function fetchInbox(context, query) {
	return await makeRestApiRequest(context, "GET", "/inbox", query);
}
async function fetchInboxSummary(context) {
	return await makeRestApiRequest(context, "GET", "/inbox/summary");
}
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/selfHealingResults.api.ts
function resultPath({ projectId, workflowId, id }) {
	return `/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(workflowId)}/self-healing-results/${encodeURIComponent(id)}`;
}
async function fetchSelfHealingResult(context, selection) {
	return await makeRestApiRequest(context, "GET", resultPath(selection));
}
async function reviewSelfHealingResult(context, selection, action, originalAction) {
	return await makeRestApiRequest(context, "POST", `${resultPath(selection)}/${action}`, { originalAction });
}
async function fetchResultWorkflow(context, workflowId) {
	return await makeRestApiRequest(context, "GET", `/workflows/${encodeURIComponent(workflowId)}`);
}
async function fetchSelfHealingStatus(context) {
	return await makeRestApiRequest(context, "GET", "/self-healing/status");
}
//#endregion
//#region ../../modules/inbox/frontend/src/inbox.store.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var sourceTypes = [
	"workflow_review",
	"self_healing_result",
	"promotion_review"
];
function isSourceType(value) {
	return value === "workflow_review" || value === "self_healing_result" || value === "promotion_review";
}
function disabledTypesFromError(error) {
	const types = error instanceof ResponseError ? error.meta?.disabledSources : void 0;
	return Array.isArray(types) ? types.filter(isSourceType) : [];
}
function createInboxListSlice(requestPage, onDisabledSources, onPage) {
	const state = reactive({
		items: [],
		nextCursor: null,
		hasMore: false,
		hasLoaded: false,
		loading: false,
		loadingMore: false,
		error: null,
		failedRequest: null,
		partial: false
	});
	let requestSeq = 0;
	let pageRequest = null;
	function applyResponse(page, append) {
		onPage?.(page, append);
		onDisabledSources(page.disabledSources);
		state.hasLoaded = true;
		state.items = append ? [...state.items, ...page.data] : page.data;
		state.nextCursor = page.nextCursor;
		state.hasMore = page.hasMore;
		state.partial = page.partial;
	}
	async function fetchList() {
		const seq = ++requestSeq;
		pageRequest = null;
		state.items = [];
		state.nextCursor = null;
		state.hasMore = false;
		state.loading = true;
		state.loadingMore = false;
		state.error = null;
		state.failedRequest = null;
		try {
			const page = await requestPage();
			if (seq === requestSeq) applyResponse(page, false);
		} catch (error) {
			if (seq !== requestSeq) return;
			onDisabledSources(disabledTypesFromError(error));
			state.error = toError(error);
			state.failedRequest = "list";
		} finally {
			if (seq === requestSeq) state.loading = false;
		}
	}
	async function loadPage(cursor) {
		const seq = ++requestSeq;
		state.loadingMore = true;
		state.error = null;
		state.failedRequest = null;
		try {
			const page = await requestPage(cursor);
			if (seq === requestSeq) applyResponse(page, true);
		} catch (error) {
			if (seq !== requestSeq) return;
			onDisabledSources(disabledTypesFromError(error));
			state.error = toError(error);
			state.failedRequest = "loadMore";
		} finally {
			if (seq === requestSeq) state.loadingMore = false;
		}
	}
	async function loadMore() {
		if (pageRequest) return await pageRequest;
		if (state.loading || !state.hasMore || !state.nextCursor) return;
		const request = loadPage(state.nextCursor);
		pageRequest = request;
		try {
			await request;
		} finally {
			if (pageRequest === request) pageRequest = null;
		}
	}
	function removeSources(types) {
		state.items = state.items.filter((item) => !types.includes(item.type));
	}
	function reset() {
		requestSeq++;
		pageRequest = null;
		state.items = [];
		state.hasLoaded = false;
		state.nextCursor = null;
		state.hasMore = false;
		state.loading = false;
		state.loadingMore = false;
		state.error = null;
		state.failedRequest = null;
		state.partial = false;
	}
	return Object.assign(state, {
		fetchList,
		loadMore,
		removeSources,
		reset,
		async retry() {
			if (state.failedRequest === "loadMore") await loadMore();
			else await fetchList();
		}
	});
}
var useInboxStore = defineStore("inbox", () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const activeTab = ref("open");
	const openCount = ref(null);
	const closedCount = ref(null);
	const disabledSources = ref([]);
	const enabled = computed(() => settingsStore.settings.inbox?.enabled === true);
	let summaryRequestSeq = 0;
	const selfHealingStatus = ref(null);
	const selfHealingStatusLoading = ref(false);
	let selfHealingStatusRequestSeq = 0;
	const showsSelfHealingEmptyState = computed(() => {
		const disabled = disabledSources.value;
		return disabled.includes("workflow_review") && disabled.includes("promotion_review") && !disabled.includes("self_healing_result");
	});
	function removeDisabledSources(types) {
		if (types.length === 0) return;
		disabledSources.value = [.../* @__PURE__ */ new Set([...disabledSources.value, ...types])];
		for (const list of Object.values(lists)) list.removeSources(types);
	}
	function reconcileSources(page, partialSourceSet) {
		if (partialSourceSet) {
			const returnedTypes = page.data.map((item) => item.type);
			disabledSources.value = disabledSources.value.filter((type) => page.disabledSources.includes(type) || !returnedTypes.includes(type));
			return;
		}
		const settings = settingsStore.settings.inbox;
		const knownTypes = /* @__PURE__ */ new Set([
			...settings?.availableTypes ?? [],
			...settings?.failedTypes ?? [],
			...page.data.map((item) => item.type)
		]);
		disabledSources.value = sourceTypes.filter((type) => !knownTypes.has(type) || page.disabledSources.includes(type) || disabledSources.value.includes(type) && page.failedSources.includes(type));
	}
	function requestPage(state, category) {
		return async (cursor) => await fetchInbox(rootStore.restApiContext, {
			state,
			category,
			limit: 15,
			cursor
		});
	}
	const lists = {
		waiting: createInboxListSlice(requestPage("open", "waiting"), removeDisabledSources, reconcileSources),
		authored: createInboxListSlice(requestPage("open", "authored"), removeDisabledSources, (page) => reconcileSources(page, true)),
		closed: createInboxListSlice(requestPage("closed"), removeDisabledSources, reconcileSources)
	};
	const activeSectionKeys = computed(() => activeTab.value === "closed" ? ["closed"] : ["waiting", "authored"]);
	const activeLists = computed(() => activeSectionKeys.value.map((key) => lists[key]));
	const hasItems = computed(() => activeLists.value.some((list) => list.items.length > 0));
	const loading = computed(() => activeLists.value.some((list) => list.loading));
	const initialLoadFailed = computed(() => activeLists.value.some((list) => list.failedRequest === "list"));
	const partial = computed(() => activeLists.value.some((list) => list.partial));
	const isEmpty = computed(() => activeLists.value.every((list) => list.hasLoaded && !list.loading && !list.error && !list.partial && !list.hasMore && list.items.length === 0));
	async function fetchSummary() {
		if (!enabled.value) return;
		const seq = ++summaryRequestSeq;
		try {
			const summary = await fetchInboxSummary(rootStore.restApiContext);
			if (seq !== summaryRequestSeq) return;
			removeDisabledSources(summary.disabledSources);
			openCount.value = summary.counts?.open ?? null;
			closedCount.value = summary.counts?.closed ?? null;
		} catch (error) {
			if (seq !== summaryRequestSeq) return;
			removeDisabledSources(disabledTypesFromError(error));
		}
	}
	async function loadSelfHealingStatus() {
		if (!enabled.value || !showsSelfHealingEmptyState.value) return;
		const seq = ++selfHealingStatusRequestSeq;
		selfHealingStatusLoading.value = true;
		try {
			const status = await fetchSelfHealingStatus(rootStore.restApiContext);
			if (seq === selfHealingStatusRequestSeq) selfHealingStatus.value = status;
		} catch {
			if (seq === selfHealingStatusRequestSeq) selfHealingStatus.value = null;
		} finally {
			if (seq === selfHealingStatusRequestSeq) selfHealingStatusLoading.value = false;
		}
	}
	/** Picks the empty state copy. The setup prompt shows on the Open tab only. */
	const emptyKind = computed(() => {
		if (!showsSelfHealingEmptyState.value) return disabledSources.value.includes("self_healing_result") ? "reviews" : "reviewsAndSelfHealing";
		const status = selfHealingStatus.value;
		return activeTab.value === "open" && status?.isReviewer === false && status.setupProjectId ? "selfHealingSetup" : "selfHealing";
	});
	const emptyKindPending = computed(() => activeTab.value === "open" && showsSelfHealingEmptyState.value && selfHealingStatusLoading.value);
	async function fetchActiveTab() {
		if (!enabled.value) return;
		await Promise.all(activeLists.value.map(async (list) => await list.fetchList()));
	}
	async function refreshListAndSummary() {
		await Promise.all([
			fetchActiveTab(),
			fetchSummary(),
			loadSelfHealingStatus()
		]);
	}
	function reconcileItemChange(change) {
		let previousState;
		for (const [key, list] of Object.entries(lists)) {
			const item = list.items.find((row) => row.type === change.type && row.id === change.id);
			if (!item) continue;
			previousState ??= item.state;
			if (change.state) item.state = change.state;
			if (change.updatedAt) item.updatedAt = change.updatedAt;
			if (item.type === "workflow_review" && change.decision) item.decision = change.decision;
			if (item.state !== (key === "closed" ? "closed" : "open")) list.items = list.items.filter((row) => row !== item);
		}
		if (change.state !== "closed") return;
		if (previousState === "open") {
			if (openCount.value !== null) openCount.value = Math.max(0, openCount.value - 1);
			if (closedCount.value !== null) closedCount.value++;
		} else if (!previousState) fetchSummary();
	}
	async function setActiveTab(tab) {
		if (activeTab.value === tab) return;
		activeTab.value = tab;
		await fetchActiveTab();
	}
	function reset() {
		summaryRequestSeq++;
		selfHealingStatusRequestSeq++;
		selfHealingStatus.value = null;
		selfHealingStatusLoading.value = false;
		for (const list of Object.values(lists)) list.reset();
		openCount.value = null;
		closedCount.value = null;
		const settings = settingsStore.settings.inbox;
		const available = [...settings?.availableTypes ?? [], ...settings?.failedTypes ?? []];
		disabledSources.value = sourceTypes.filter((type) => !available.includes(type));
	}
	return {
		lists,
		activeTab,
		activeSectionKeys,
		activeLists,
		hasItems,
		loading,
		initialLoadFailed,
		partial,
		isEmpty,
		enabled,
		openCount,
		closedCount,
		disabledSources,
		selfHealingStatus,
		emptyKind,
		emptyKindPending,
		fetchSummary,
		fetchActiveTab,
		refreshListAndSummary,
		reconcileItemChange,
		setActiveTab,
		reset
	};
});
//#endregion
//#region ../../modules/inbox/frontend/src/components/InboxEmptyState.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InboxEmptyState_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InboxEmptyState",
	setup(__props) {
		const store = useInboxStore();
		const { activeTab, hasItems, loading, initialLoadFailed, partial, isEmpty, openCount, closedCount, emptyKind, emptyKindPending, selfHealingStatus } = storeToRefs(store);
		const loadingFirstRows = computed(() => !hasItems.value && store.activeLists.some((list) => list.loadingMore));
		const i18n = useI18n();
		const router = useRouter();
		const alertIcon = {
			type: "icon",
			value: "circle-alert"
		};
		const inboxIcon = {
			type: "cards",
			center: "inbox",
			sides: [
				"file-diff",
				"git-branch",
				"circle-check",
				"list",
				"message-square"
			]
		};
		const openBodyKeys = {
			reviews: "inbox.empty.body.open",
			reviewsAndSelfHealing: "inbox.empty.reviewsAndSelfHealing.body.open",
			selfHealing: "inbox.empty.selfHealing.body.open"
		};
		const emptyCopy = computed(() => {
			const tab = activeTab.value;
			const kind = emptyKind.value;
			if (kind === "selfHealingSetup") return {
				heading: i18n.baseText("inbox.empty.setup.title"),
				description: i18n.baseText("inbox.empty.setup.body"),
				buttonText: i18n.baseText("inbox.empty.setup.button")
			};
			return {
				heading: i18n.baseText(`inbox.empty.${tab}`),
				description: i18n.baseText(tab === "closed" ? "inbox.empty.body.closed" : openBodyKeys[kind])
			};
		});
		function setUpSelfHealing() {
			const projectId = selfHealingStatus.value?.setupProjectId;
			if (!projectId) return;
			router.push({
				name: PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
				params: {
					projectId,
					configurationId: "new"
				}
			});
		}
		const noSelectionHeading = computed(() => {
			const count = activeTab.value === "closed" ? closedCount.value : openCount.value;
			if (count === null) return i18n.baseText(`inbox.items.${activeTab.value}`);
			return i18n.baseText(`inbox.noSelection.title.${activeTab.value}`, {
				adjustToNumber: count,
				interpolate: { count: String(count) }
			});
		});
		return (_ctx, _cache) => {
			return unref(loading) || loadingFirstRows.value || unref(isEmpty) && unref(emptyKindPending) ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				loading: true,
				rows: 3
			})) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.emptyStateWrapper)
			}, [unref(initialLoadFailed) && !unref(hasItems) ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.emptyState),
				icon: alertIcon,
				heading: unref(i18n).baseText("inbox.loadError"),
				"button-text": unref(i18n).baseText("generic.retry"),
				"onClick:button": _cache[0] || (_cache[0] = ($event) => unref(store).fetchActiveTab())
			}, null, 8, [
				"class",
				"heading",
				"button-text"
			])) : unref(partial) && !unref(hasItems) ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 1,
				class: normalizeClass(_ctx.$style.emptyState),
				icon: alertIcon,
				heading: unref(i18n).baseText("inbox.partial"),
				"button-text": unref(i18n).baseText("generic.retry"),
				"onClick:button": _cache[1] || (_cache[1] = ($event) => unref(store).refreshListAndSummary())
			}, null, 8, [
				"class",
				"heading",
				"button-text"
			])) : unref(isEmpty) ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 2,
				class: normalizeClass(_ctx.$style.emptyState),
				icon: inboxIcon,
				heading: emptyCopy.value.heading,
				description: emptyCopy.value.description,
				"button-text": emptyCopy.value.buttonText,
				"data-test-id": "inbox-empty",
				"onClick:button": setUpSelfHealing
			}, null, 8, [
				"class",
				"heading",
				"description",
				"button-text"
			])) : (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 3,
				class: normalizeClass(_ctx.$style.emptyState),
				icon: inboxIcon,
				heading: noSelectionHeading.value,
				description: unref(i18n).baseText("inbox.noSelection.body")
			}, null, 8, [
				"class",
				"heading",
				"description"
			]))], 2));
		};
	}
}), [["__cssModules", { "$style": {
	emptyStateWrapper: "_emptyStateWrapper_j3370_1",
	emptyState: "_emptyState_j3370_1"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/composables/useReviewInboxSectionCollapse.ts
init_reactivity_esm_bundler();
var DEFAULT_COLLAPSED = {
	waiting: false,
	authored: false
};
/**
* Which inbox sections are collapsed, persisted per user. Collapsing only hides
* rows — the store keeps the loaded items and their cursors, so re-expanding
* never refetches.
*/
var useReviewInboxSectionCollapse = () => {
	const userId = useUsersStore().currentUserId;
	const collapsedSections = userId ? useLocalStorage(`${userId}_N8N_WORKFLOW_REVIEW_INBOX_COLLAPSED_SECTIONS`, { ...DEFAULT_COLLAPSED }, { writeDefaults: false }) : ref({ ...DEFAULT_COLLAPSED });
	function isCollapsed(section) {
		return collapsedSections.value[section] ?? false;
	}
	function toggleSection(section) {
		collapsedSections.value = {
			...collapsedSections.value,
			[section]: !isCollapsed(section)
		};
	}
	return {
		collapsedSections,
		isCollapsed,
		toggleSection
	};
};
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/workflowReviewStatus.utils.ts
/**
* The one mapping from review state/decision to what users see — card badge,
* detail status card, and status dot all render from here so their labels and
* colors cannot drift apart. A closed review that never got a decision reads
* `No decision`, not `Waiting for review`: nobody is waiting anymore.
*/
function getWorkflowReviewStatusDisplay(i18n, state, decision) {
	const decisionKey = state === "closed" && decision === "pending" ? "workflowReviews.decision.noDecision" : `workflowReviews.decision.${decision}`;
	const decisionLabel = i18n.baseText(decisionKey);
	return {
		stateLabel: i18n.baseText(`workflowReviews.status.${state}`),
		decisionLabel,
		colorClass: state === "open" ? decision === "changes_requested" ? "changesRequested" : decision === "approved" ? "approved" : "pending" : decision === "approved" ? "approved" : "closed"
	};
}
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/WorkflowReviewStatusDot.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
var WorkflowReviewStatusDot_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewStatusDot",
	props: {
		state: {},
		decision: {},
		size: { default: "medium" },
		decorative: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const status = computed(() => getWorkflowReviewStatusDisplay(i18n, props.state, props.decision));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", mergeProps({
				class: [
					_ctx.$style.dot,
					_ctx.$style[status.value.colorClass],
					__props.size === "small" && _ctx.$style.small
				],
				"data-test-id": "workflow-review-request-status-dot"
			}, __props.decorative ? { "aria-hidden": "true" } : {
				role: "img",
				"aria-label": `${status.value.stateLabel} | ${status.value.decisionLabel}`
			}), null, 16);
		};
	}
}), [["__cssModules", { "$style": {
	dot: "_dot_1jjrv_1",
	small: "_small_1jjrv_8",
	pending: "_pending_1jjrv_13",
	changesRequested: "_changesRequested_1jjrv_17",
	approved: "_approved_1jjrv_21",
	closed: "_closed_1jjrv_25"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/components/InboxListItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$12 = ["aria-label"];
var _hoisted_2$4 = ["aria-label"];
var InboxListItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InboxListItem",
	props: {
		item: {},
		selected: { type: Boolean }
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const reviewTypeIcon = { gitlab: "gitlab" };
		function itemTitle(item) {
			switch (item.type) {
				case "workflow_review": return item.title;
				case "self_healing_result": return item.summary;
				case "promotion_review": return item.title ?? item.branchName ?? i18n.baseText("inbox.promotionReview.untitled");
			}
		}
		function outcomeLabel(item) {
			switch (item.outcome) {
				case "fix_ready": return i18n.baseText("inbox.outcome.fixReady");
				case "needs_you": return i18n.baseText("inbox.outcome.needsAttention");
				case "could_not_fix": return i18n.baseText("inbox.outcome.couldNotFix");
			}
		}
		/** The status dot shows only a color. The tooltip gives the status in words. */
		function statusTooltip(item) {
			switch (item.type) {
				case "workflow_review": return getWorkflowReviewStatusDisplay(i18n, item.state, item.decision).decisionLabel;
				case "self_healing_result": return item.state === "closed" ? i18n.baseText("inbox.tabs.closed") : outcomeLabel(item);
				case "promotion_review": return i18n.baseText(`inbox.promotionReview.state.${item.reviewState}`);
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass([_ctx.$style.card, { [_ctx.$style.selected]: __props.selected }]),
				role: "button",
				tabindex: "0",
				"aria-current": __props.selected ? "true" : void 0,
				"data-source": __props.item.type,
				"data-test-id": "inbox-row",
				onClick: _cache[0] || (_cache[0] = ($event) => emit("select")),
				onKeydown: [_cache[1] || (_cache[1] = withKeys(withModifiers(($event) => emit("select"), ["prevent"]), ["enter"])), _cache[2] || (_cache[2] = withKeys(withModifiers(($event) => emit("select"), ["prevent"]), ["space"]))]
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardContent) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [
					__props.item.type === "self_healing_result" ? (openBlock(), createBlock(unref(AskAssistantAvatar_default), {
						key: 0,
						size: "mini",
						class: normalizeClass(_ctx.$style.assistantAvatar),
						"data-test-id": "inbox-assistant-avatar"
					}, null, 8, ["class"])) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), {
						bold: "",
						tag: "h3",
						class: normalizeClass([_ctx.$style.cardTitle, { [_ctx.$style.assistantTitle]: __props.item.type === "self_healing_result" }])
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(itemTitle(__props.item)), 1)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(N8nTooltip_default), {
						content: statusTooltip(__props.item),
						"show-after": 300
					}, {
						default: withCtx(() => [__props.item.type === "workflow_review" ? (openBlock(), createBlock(WorkflowReviewStatusDot_default, {
							key: 0,
							state: __props.item.state,
							decision: __props.item.decision
						}, null, 8, ["state", "decision"])) : __props.item.type === "promotion_review" ? (openBlock(), createElementBlock("span", {
							key: 1,
							class: normalizeClass([_ctx.$style.statusDot, _ctx.$style[__props.item.reviewState]]),
							role: "img",
							"aria-label": unref(i18n).baseText(`inbox.promotionReview.state.${__props.item.reviewState}`),
							"data-test-id": "inbox-promotion-status"
						}, null, 10, _hoisted_1$12)) : (openBlock(), createElementBlock("span", {
							key: 2,
							class: normalizeClass([_ctx.$style.statusDot, __props.item.state === "closed" ? _ctx.$style.closed : __props.item.outcome === "fix_ready" ? _ctx.$style.fixReady : _ctx.$style.needsAttention]),
							role: "img",
							"aria-label": `${unref(i18n).baseText(__props.item.state === "open" ? "inbox.tabs.open" : "inbox.tabs.closed")} | ${outcomeLabel(__props.item)}`,
							"data-test-id": "inbox-assistant-status"
						}, null, 10, _hoisted_2$4))]),
						_: 1
					}, 8, ["content"])
				], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.meta) }, [__props.item.type === "promotion_review" ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 0,
					variant: "outline",
					"leading-icon": reviewTypeIcon[__props.item.reviewType],
					class: normalizeClass(_ctx.$style.workflowBadge)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.badge")), 1)]),
					_: 1
				}, 8, ["leading-icon", "class"])) : __props.item.workflowName ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 1,
					variant: "outline",
					"leading-icon": "workflow",
					class: normalizeClass(_ctx.$style.workflowBadge),
					title: __props.item.workflowName
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.item.workflowName), 1)]),
					_: 1
				}, 8, ["class", "title"])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.metaActions) }, [__props.item.type === "promotion_review" && __props.item.remoteError ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "xsmall",
					color: "warning"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`inbox.promotionReview.remoteError.${__props.item.remoteError}`)), 1)]),
					_: 1
				})) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.time),
					size: "xsmall",
					color: "text-light"
				}, {
					default: withCtx(() => [createVNode(unref(N8nTimeAgo_default), {
						date: __props.item.updatedAt,
						locale: unref(rootStore).defaultLocale
					}, null, 8, ["date", "locale"])]),
					_: 1
				}, 8, ["class"])], 2)], 2)], 2)]),
				_: 1
			}, 8, [
				"class",
				"aria-current",
				"data-source"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_vwrpj_1",
	selected: "_selected_vwrpj_8",
	cardContent: "_cardContent_vwrpj_22",
	cardHeader: "_cardHeader_vwrpj_31",
	cardTitle: "_cardTitle_vwrpj_40",
	assistantTitle: "_assistantTitle_vwrpj_48",
	assistantAvatar: "_assistantAvatar_vwrpj_52",
	meta: "_meta_vwrpj_56",
	workflowBadge: "_workflowBadge_vwrpj_65",
	metaActions: "_metaActions_vwrpj_77",
	time: "_time_vwrpj_85",
	statusDot: "_statusDot_vwrpj_89",
	fixReady: "_fixReady_vwrpj_98",
	needsAttention: "_needsAttention_vwrpj_102",
	closed: "_closed_vwrpj_106",
	open: "_open_vwrpj_110",
	changes_requested: "_changes_requested_vwrpj_114",
	merged: "_merged_vwrpj_118"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/components/InboxListSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$11 = ["data-section"];
var _hoisted_2$3 = [
	"id",
	"aria-expanded",
	"aria-controls"
];
var _hoisted_3$1 = [
	"id",
	"aria-labelledby",
	"aria-label"
];
var InboxListSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InboxListSection",
	props: {
		section: {},
		collapsed: { type: Boolean },
		selectedKey: {}
	},
	emits: [
		"select",
		"toggle",
		"loadMore",
		"retry",
		"refreshSection"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const usersStore = useUsersStore();
		function sectionTitle(key) {
			return key === "waiting" && usersStore.isAdminOrOwner ? i18n.baseText("workflowReviews.sidebar.section.waiting.titleAdmin") : i18n.baseText(`workflowReviews.sidebar.section.${key}.title`);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.section),
				"data-section": __props.section.key
			}, [
				__props.section.key !== "closed" ? (openBlock(), createElementBlock("button", {
					key: 0,
					id: `inbox-section-header-${__props.section.key}`,
					type: "button",
					class: normalizeClass(_ctx.$style.sectionHeader),
					"aria-expanded": !__props.collapsed,
					"aria-controls": `inbox-section-${__props.section.key}`,
					"data-test-id": "inbox-section-header",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("toggle", __props.section.key))
				}, [createVNode(unref(N8nIcon_default), {
					icon: "chevron-down",
					size: "small",
					class: normalizeClass([_ctx.$style.chevron, { [_ctx.$style.chevronCollapsed]: __props.collapsed }])
				}, null, 8, ["class"]), createVNode(unref(N8nText_default), {
					bold: "",
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(sectionTitle(__props.section.key)), 1)]),
					_: 1
				})], 10, _hoisted_2$3)) : createCommentVNode("", true),
				createBaseVNode("div", {
					id: `inbox-section-${__props.section.key}`,
					class: normalizeClass(_ctx.$style.group),
					role: "list",
					"aria-labelledby": __props.section.key !== "closed" ? `inbox-section-header-${__props.section.key}` : void 0,
					"aria-label": __props.section.key === "closed" ? unref(i18n).baseText("inbox.tabs.closed") : void 0
				}, [!__props.collapsed ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(__props.section.items, (item) => {
					return openBlock(), createElementBlock("div", {
						key: `${item.type}:${item.id}`,
						role: "listitem"
					}, [createVNode(InboxListItem_default, {
						item,
						selected: __props.selectedKey === `${item.type}:${item.id}`,
						onSelect: ($event) => emit("select", item)
					}, null, 8, [
						"item",
						"selected",
						"onSelect"
					])]);
				}), 128)) : createCommentVNode("", true)], 10, _hoisted_3$1),
				!__props.collapsed ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					__props.section.loadingMore ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.loadingMore)
					}, [createVNode(unref(N8nLoading_default), {
						loading: true,
						rows: 1
					})], 2)) : createCommentVNode("", true),
					__props.section.partial ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.notice),
						role: "status",
						"data-test-id": "inbox-partial"
					}, [createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.partial")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						size: "mini",
						variant: "outline",
						label: unref(i18n).baseText("generic.retry"),
						onClick: _cache[1] || (_cache[1] = ($event) => emit("refreshSection"))
					}, null, 8, ["label"])], 2)) : createCommentVNode("", true),
					__props.section.error ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.notice),
						role: "alert",
						"data-test-id": "inbox-list-error"
					}, [createVNode(unref(N8nText_default), {
						color: "danger",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.loadError")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						size: "mini",
						variant: "outline",
						label: unref(i18n).baseText("generic.retry"),
						onClick: _cache[2] || (_cache[2] = ($event) => emit("retry"))
					}, null, 8, ["label"])], 2)) : createCommentVNode("", true),
					__props.section.key !== "closed" && __props.section.hasMore ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 3,
						class: normalizeClass(_ctx.$style.loadMore),
						size: "small",
						variant: "outline",
						loading: __props.section.loadingMore,
						disabled: __props.section.loading,
						label: unref(i18n).baseText("inbox.loadMore"),
						"data-test-id": "inbox-load-more",
						onClick: _cache[3] || (_cache[3] = ($event) => emit("loadMore"))
					}, null, 8, [
						"class",
						"loading",
						"disabled",
						"label"
					])) : createCommentVNode("", true)
				], 64)) : createCommentVNode("", true)
			], 10, _hoisted_1$11);
		};
	}
}), [["__cssModules", { "$style": {
	section: "_section_4s8j7_1",
	group: "_group_4s8j7_2",
	sectionHeader: "_sectionHeader_4s8j7_9",
	chevron: "_chevron_4s8j7_30",
	chevronCollapsed: "_chevronCollapsed_4s8j7_35",
	notice: "_notice_4s8j7_39",
	loadMore: "_loadMore_4s8j7_47",
	loadingMore: "_loadingMore_4s8j7_51"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/components/InboxList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var InboxList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InboxList",
	props: {
		sections: {},
		activeTab: {},
		selectedKey: {},
		openCount: {},
		closedCount: {}
	},
	emits: [
		"select",
		"clear",
		"update:active-tab",
		"loadMore",
		"retry",
		"retryActiveTab",
		"refreshSection"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { isCollapsed, toggleSection } = useReviewInboxSectionCollapse();
		const loading = computed(() => props.sections.some((section) => section.loading));
		const hasUsableRows = computed(() => props.sections.some((section) => section.items.length > 0));
		const showInitialLoadError = computed(() => !hasUsableRows.value && props.sections.some((section) => section.failedRequest === "list") && !props.sections.some((section) => section.partial));
		const visibleSections = computed(() => props.sections.filter((section) => !loading.value && !showInitialLoadError.value && (section.error || section.partial || section.items.length > 0 || section.hasMore)));
		const listRef = useTemplateRef("list");
		const loadMoreSentinel = useTemplateRef("loadMoreSentinel");
		const canAutoLoad = computed(() => {
			const closed = props.sections.find((section) => section.key === "closed");
			return props.activeTab === "closed" && closed?.hasMore && !loading.value && !closed.loadingMore && !closed.error;
		});
		useIntersectionObserver(loadMoreSentinel, ([entry]) => {
			if (entry?.isIntersecting && canAutoLoad.value) emit("loadMore", "closed");
		}, {
			root: listRef,
			threshold: .01
		});
		const tabs = computed(() => [{
			value: "open",
			label: i18n.baseText("inbox.tabs.open"),
			tag: props.openCount === null ? void 0 : String(props.openCount)
		}, {
			value: "closed",
			label: i18n.baseText("inbox.tabs.closed"),
			tag: props.closedCount === null ? void 0 : String(props.closedCount)
		}]);
		function onTabChange(value) {
			if (value === "open" || value === "closed") emit("update:active-tab", value);
		}
		function onListBackgroundClick() {
			if (props.selectedKey) emit("clear");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				class: normalizeClass(_ctx.$style.sidebar),
				"data-test-id": "inbox-list"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.title) }, [createVNode(unref(N8nHeading_default), {
					bold: "",
					tag: "h2",
					size: "xlarge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.title")), 1)]),
					_: 1
				})], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(Tabs_default), {
					"model-value": __props.activeTab,
					options: tabs.value,
					variant: "modern",
					"data-test-id": "inbox-tabs",
					"onUpdate:modelValue": onTabChange
				}, null, 8, ["model-value", "options"])], 2),
				createBaseVNode("div", {
					ref: "list",
					class: normalizeClass(_ctx.$style.list),
					onClick: withModifiers(onListBackgroundClick, ["self"])
				}, [
					loading.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
						key: 0,
						loading: true,
						rows: 3,
						"data-test-id": "inbox-list-skeleton"
					})) : showInitialLoadError.value ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.sectionError),
						role: "alert",
						"data-test-id": "inbox-list-error"
					}, [createVNode(unref(N8nText_default), {
						color: "danger",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.loadError")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "mini",
						label: unref(i18n).baseText("generic.retry"),
						onClick: _cache[0] || (_cache[0] = ($event) => emit("retryActiveTab"))
					}, null, 8, ["label"])], 2)) : createCommentVNode("", true),
					(openBlock(true), createElementBlock(Fragment, null, renderList(visibleSections.value, (section) => {
						return openBlock(), createBlock(InboxListSection_default, {
							key: section.key,
							section,
							collapsed: section.key !== "closed" && unref(isCollapsed)(section.key),
							"selected-key": __props.selectedKey,
							onSelect: _cache[1] || (_cache[1] = ($event) => emit("select", $event)),
							onToggle: unref(toggleSection),
							onLoadMore: ($event) => emit("loadMore", section.key),
							onRetry: ($event) => emit("retry", section.key),
							onRefreshSection: ($event) => emit("refreshSection", section.key)
						}, null, 8, [
							"section",
							"collapsed",
							"selected-key",
							"onToggle",
							"onLoadMore",
							"onRetry",
							"onRefreshSection"
						]);
					}), 128)),
					canAutoLoad.value ? (openBlock(), createElementBlock("div", {
						key: 2,
						ref_key: "loadMoreSentinel",
						ref: loadMoreSentinel,
						class: normalizeClass(_ctx.$style.sentinel)
					}, null, 2)) : __props.activeTab === "closed" && !loading.value && !showInitialLoadError.value ? (openBlock(), createElementBlock("div", {
						key: 3,
						class: normalizeClass(_ctx.$style.sentinel)
					}, null, 2)) : createCommentVNode("", true)
				], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	sidebar: "_sidebar_1szp8_1",
	title: "_title_1szp8_10",
	header: "_header_1szp8_17",
	list: "_list_1szp8_29",
	sectionError: "_sectionError_1szp8_39",
	sentinel: "_sentinel_1szp8_47"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/workflowReviews.api.ts
async function decideWorkflowReviewRequest(context, workflowReviewRequestId, payload) {
	return await makeRestApiRequest(context, "POST", `/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}/decision`, { ...payload });
}
async function fetchWorkflowReviewRequestDetail(context, workflowReviewRequestId) {
	return await makeRestApiRequest(context, "GET", `/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}`);
}
async function fetchWorkflowReviewActivity(context, workflowReviewRequestId, params) {
	return await makeRestApiRequest(context, "GET", `/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}/activity`, params);
}
async function createWorkflowReviewComment(context, workflowReviewRequestId, payload) {
	return await makeRestApiRequest(context, "POST", `/workflow-review-requests/${encodeURIComponent(workflowReviewRequestId)}/comments`, { ...payload });
}
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/reviewActivity.store.ts
init_reactivity_esm_bundler();
var DEFAULT_LIMIT = 25;
/**
* The activity feed of one review. `entries` is ascending by id: the backend pages
* backwards, so `loadMore` prepends older pages. Posted comments merge by id.
*/
var useReviewActivityStore = defineStore("workflowReviewActivity", () => {
	const rootStore = useRootStore();
	const currentReviewId = ref(null);
	const entries = ref([]);
	const nextCursor = ref(null);
	const hasMore = ref(false);
	const loading = ref(false);
	const loadingMore = ref(false);
	const posting = ref(false);
	const error = ref(null);
	const draft = ref("");
	const decisionNote = ref("");
	let feedRequestSeq = 0;
	let postSeq = 0;
	async function fetchFeed(reviewId) {
		const requestSeq = ++feedRequestSeq;
		const switchedReview = currentReviewId.value !== reviewId;
		currentReviewId.value = reviewId;
		nextCursor.value = null;
		hasMore.value = false;
		loadingMore.value = false;
		loading.value = true;
		error.value = null;
		if (switchedReview) {
			postSeq++;
			entries.value = [];
			posting.value = false;
			draft.value = "";
			decisionNote.value = "";
		}
		try {
			const response = await fetchWorkflowReviewActivity(rootStore.restApiContext, reviewId, { limit: DEFAULT_LIMIT });
			if (requestSeq !== feedRequestSeq) return;
			const newestInPage = Number(response.data.at(-1)?.id ?? 0);
			entries.value = [...response.data, ...entries.value.filter((entry) => Number(entry.id) > newestInPage)];
			nextCursor.value = response.nextCursor;
			hasMore.value = response.hasMore;
		} catch (e) {
			if (requestSeq !== feedRequestSeq) return;
			error.value = toError(e);
		} finally {
			if (requestSeq === feedRequestSeq) loading.value = false;
		}
	}
	async function loadMore() {
		const reviewId = currentReviewId.value;
		const cursor = nextCursor.value;
		if (!reviewId || !cursor || loading.value || loadingMore.value) return;
		const requestSeq = ++feedRequestSeq;
		loadingMore.value = true;
		error.value = null;
		try {
			const response = await fetchWorkflowReviewActivity(rootStore.restApiContext, reviewId, {
				limit: DEFAULT_LIMIT,
				cursor
			});
			if (requestSeq !== feedRequestSeq || currentReviewId.value !== reviewId) return;
			entries.value = [...response.data, ...entries.value];
			nextCursor.value = response.nextCursor;
			hasMore.value = response.hasMore && response.data.length > 0;
		} catch (e) {
			if (requestSeq !== feedRequestSeq || currentReviewId.value !== reviewId) return;
			error.value = toError(e);
		} finally {
			if (requestSeq === feedRequestSeq) loadingMore.value = false;
		}
	}
	/**
	* Resolves `false` after a selection change. The saved comment can still belong
	* in the current feed, but the caller must not clear a new draft.
	*/
	async function postComment(body) {
		const reviewId = currentReviewId.value;
		if (!reviewId) throw new Error("Cannot post a comment without a selected review");
		const requestSeq = ++postSeq;
		posting.value = true;
		try {
			const entry = await createWorkflowReviewComment(rootStore.restApiContext, reviewId, { body });
			if (currentReviewId.value !== reviewId) return false;
			entries.value = [...entries.value.filter((existing) => existing.id !== entry.id), entry].sort((a, b) => Number(a.id) - Number(b.id));
			return requestSeq === postSeq;
		} finally {
			if (requestSeq === postSeq) posting.value = false;
		}
	}
	/**
	* Clears the decision note, unless the viewer typed something else since the submit
	* `expected` came from — both callers await a request first.
	*/
	function clearDecisionNote(expected) {
		if (decisionNote.value.trim() === expected) decisionNote.value = "";
	}
	function reset() {
		feedRequestSeq += 1;
		postSeq++;
		currentReviewId.value = null;
		entries.value = [];
		nextCursor.value = null;
		hasMore.value = false;
		loading.value = false;
		loadingMore.value = false;
		posting.value = false;
		error.value = null;
		draft.value = "";
		decisionNote.value = "";
	}
	return {
		currentReviewId,
		entries,
		nextCursor,
		hasMore,
		loading,
		loadingMore,
		posting,
		error,
		draft,
		decisionNote,
		fetchFeed,
		loadMore,
		postComment,
		clearDecisionNote,
		reset
	};
});
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/activity-entries/WorkflowReviewActivityActorAvatar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewActivityActorAvatar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewActivityActorAvatar",
	props: { actor: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return __props.actor ? (openBlock(), createBlock(unref(N8nAvatar_default), {
				key: 0,
				size: "xxsmall",
				class: normalizeClass(_ctx.$style.avatar),
				"first-name": __props.actor.firstName,
				"last-name": __props.actor.lastName
			}, null, 8, [
				"class",
				"first-name",
				"last-name"
			])) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.deletedActor),
				"aria-hidden": "true",
				"data-test-id": "workflow-review-activity-deleted-actor"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "circle-user-round",
				size: 16,
				color: "text-light"
			})], 2));
		};
	}
}), [["__cssModules", { "$style": {
	avatar: "_avatar_70nmw_10",
	deletedActor: "_deletedActor_70nmw_16"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/activity-entries/WorkflowReviewActivityComment.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$10 = ["datetime"];
var WorkflowReviewActivityComment_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewActivityComment",
	props: { entry: {} },
	setup(__props) {
		const i18n = useI18n();
		const rootStore = useRootStore();
		function authorName(message) {
			return formatActorName(message.createdBy, i18n.baseText("workflowReviews.detail.activity.unknownAuthor"));
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.entry) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.entry.messages, (message) => {
				return openBlock(), createElementBlock("div", {
					key: message.id,
					class: normalizeClass(_ctx.$style.message)
				}, [createVNode(WorkflowReviewActivityActorAvatar_default, { actor: message.createdBy }, null, 8, ["actor"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-base",
					class: normalizeClass(_ctx.$style.line),
					"data-test-id": "workflow-review-activity-comment-author"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(authorName(message)), 1)]),
					_: 2
				}, 1032, ["class"]), createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-light"
				}, {
					default: withCtx(() => [createBaseVNode("time", {
						datetime: message.createdAt,
						"data-test-id": "workflow-review-activity-comment-time",
						class: normalizeClass(_ctx.$style.timeStamp)
					}, [createVNode(unref(N8nTimeAgo_default), {
						date: message.createdAt,
						locale: unref(rootStore).defaultLocale
					}, null, 8, ["date", "locale"])], 10, _hoisted_1$10)]),
					_: 2
				}, 1024)], 2), message.deletedAt ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.deleted),
					"data-test-id": "workflow-review-activity-comment-deleted"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.activity.comment.deleted")), 1)]),
					_: 1
				}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "medium",
					color: "text-dark",
					class: normalizeClass([_ctx.$style.body, _ctx.$style.line]),
					"data-test-id": "workflow-review-activity-comment-body"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(message.body), 1)]),
					_: 2
				}, 1032, ["class"]))], 2)], 2);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	entry: "_entry_rdsw0_11",
	message: "_message_rdsw0_21",
	content: "_content_rdsw0_27",
	header: "_header_rdsw0_34",
	line: "_line_rdsw0_41",
	timeStamp: "_timeStamp_rdsw0_45",
	body: "_body_rdsw0_49",
	deleted: "_deleted_rdsw0_54"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/activity-entries/WorkflowReviewActivityFallback.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewActivityFallback_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "WorkflowReviewActivityFallback",
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.entry) }, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.icon),
				"aria-hidden": "true"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "circle-help",
				size: 16,
				color: "text-light"
			})], 2), createVNode(unref(N8nText_default), {
				size: "medium",
				color: "text-light",
				class: normalizeClass(_ctx.$style.line),
				"data-test-id": "workflow-review-activity-unknown"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.activity.unknownEntry")), 1)]),
				_: 1
			}, 8, ["class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	entry: "_entry_ls3mo_10",
	icon: "_icon_ls3mo_16",
	line: "_line_ls3mo_26"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/activity-entries/WorkflowReviewActivityWorkflowLink.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewActivityWorkflowLink_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewActivityWorkflowLink",
	props: {
		workflowId: {},
		workflowName: {},
		version: {}
	},
	setup(__props) {
		const props = __props;
		const label = computed(() => props.version ? `${props.workflowName} ${props.version}` : props.workflowName);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nLink_default), {
				to: {
					name: unref(VIEWS).WORKFLOW,
					params: { workflowId: __props.workflowId }
				},
				theme: "text",
				size: "medium",
				"data-test-id": "workflow-review-activity-workflow-link"
			}, {
				default: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "workflow",
					size: "medium",
					class: normalizeClass(_ctx.$style.icon)
				}, null, 8, ["class"]), createTextVNode(toDisplayString(label.value), 1)]),
				_: 1
			}, 8, ["to"]);
		};
	}
}), [["__cssModules", { "$style": { icon: "_icon_1w4u3_1" } }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/activity-entries/WorkflowReviewActivityEventEntry.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$9 = ["datetime"];
var _hoisted_2$2 = ["datetime"];
var WorkflowReviewActivityEventEntry_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewActivityEventEntry",
	props: { entry: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const linkedWorkflows = inject(ReviewLinkedWorkflowsKey, computed(() => /* @__PURE__ */ new Map()));
		const closedReasonKeys = { "no-reviewable-workflows": "workflowReviews.detail.closedCallout.noReviewableWorkflows" };
		/**
		* A lifecycle close concludes the feed, so it renders as a callout rather than one more
		* sentence. The body is a keypath, and the stored reason, so there is nothing to fall back to.
		*/
		const closedCallout = computed(() => {
			const entry = props.entry;
			if (entry.type !== "review.closed" || !entry.data) return null;
			return {
				title: i18n.baseText("workflowReviews.detail.closedCallout.title"),
				bodyKey: closedReasonKeys[entry.data.reason]
			};
		});
		const causeKeys = {
			"workflow.archived": {
				user: "workflowReviews.detail.activity.workflowArchived.user",
				userNamed: "workflowReviews.detail.activity.workflowArchived.user.named",
				system: "workflowReviews.detail.activity.workflowArchived.system",
				systemNamed: "workflowReviews.detail.activity.workflowArchived.system.named",
				testId: "workflow-review-activity-workflow-archived"
			},
			"workflow.deleted": {
				user: "workflowReviews.detail.activity.workflowDeleted.user",
				userNamed: "workflowReviews.detail.activity.workflowDeleted.user.named",
				system: "workflowReviews.detail.activity.workflowDeleted.system",
				systemNamed: "workflowReviews.detail.activity.workflowDeleted.system.named",
				testId: "workflow-review-activity-workflow-deleted"
			},
			"workflow.moved": {
				user: "workflowReviews.detail.activity.workflowMoved.user",
				userNamed: "workflowReviews.detail.activity.workflowMoved.user.named",
				system: "workflowReviews.detail.activity.workflowMoved.system",
				systemNamed: "workflowReviews.detail.activity.workflowMoved.system.named",
				testId: "workflow-review-activity-workflow-moved"
			}
		};
		/**
		* The sentence for one entry: an i18n key plus its placeholder values, one case per type.
		* `null` means "no sentence" — `review.closed` renders as a callout instead, and a
		* `workflow.published` entry with an unreadable payload has nothing to say. Other types
		* survive a bad payload with a reduced sentence: a decision loses its note, a cause event
		* its actor.
		*
		* `workflow` is set only when the workflow still exists.
		*
		* `namesActor` comes from the entry itself, never from `createdBy` — that is also null for
		* deleted users, whose actions must still read as a person's.
		*/
		const content = computed(() => {
			const entry = props.entry;
			const workflowId = entry.data && "workflowId" in entry.data ? entry.data.workflowId : null;
			const linked = workflowId === null ? void 0 : linkedWorkflows.value.get(workflowId);
			const workflow = workflowId !== null && linked ? {
				id: workflowId,
				name: linked.workflowName
			} : void 0;
			switch (entry.type) {
				case "review.opened": return {
					key: "workflowReviews.detail.activity.opened",
					note: null,
					testId: "workflow-review-activity-opened",
					namesActor: true
				};
				case "review.changes_requested": return {
					key: "workflowReviews.detail.activity.changesRequested",
					note: entry.data?.note ?? null,
					testId: "workflow-review-activity-changes-requested",
					namesActor: true
				};
				case "review.approved": return {
					key: "workflowReviews.detail.activity.approved",
					note: entry.data?.note ?? null,
					testId: "workflow-review-activity-approved",
					namesActor: true
				};
				case "review.version_updated": return {
					key: workflow ? "workflowReviews.detail.activity.versionUpdated.named" : "workflowReviews.detail.activity.versionUpdated",
					workflow,
					note: null,
					testId: "workflow-review-activity-version-updated",
					namesActor: true
				};
				case "review.closed": return null;
				case "workflow.archived":
				case "workflow.deleted":
				case "workflow.moved": {
					const keys = causeKeys[entry.type];
					const namesActor = entry.data?.actorKind === "user";
					return {
						key: namesActor ? workflow ? keys.userNamed : keys.user : workflow ? keys.systemNamed : keys.system,
						workflow,
						note: null,
						testId: keys.testId,
						namesActor
					};
				}
				case "workflow.published": {
					if (!entry.data) return null;
					const versionName = linked?.pinnedVersionId === entry.data.workflowVersionId ? linked.pinnedVersionName : null;
					return {
						key: "workflowReviews.detail.activity.workflowPublished",
						workflow,
						version: getVersionLabel({ workflowHistory: {
							versionId: entry.data.workflowVersionId,
							name: versionName
						} }),
						note: null,
						testId: "workflow-review-activity-workflow-published",
						namesActor: true
					};
				}
			}
			return null;
		});
		const actorName = computed(() => formatActorName(props.entry.createdBy, i18n.baseText("workflowReviews.detail.activity.unknownAuthor")));
		return (_ctx, _cache) => {
			return closedCallout.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "secondary",
				class: normalizeClass(_ctx.$style.closedCallout),
				"data-test-id": "workflow-review-activity-closed"
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.closedCalloutContent) }, [createVNode(unref(N8nText_default), {
					bold: "",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(closedCallout.value.title), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), { size: "medium" }, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: closedCallout.value.bodyKey,
						scope: "global"
					}, {
						timestamp: withCtx(() => [createBaseVNode("time", { datetime: __props.entry.createdAt }, [createVNode(unref(N8nTimeAgo_default), {
							date: __props.entry.createdAt,
							locale: unref(rootStore).defaultLocale
						}, null, 8, ["date", "locale"])], 8, _hoisted_1$9)]),
						_: 1
					}, 8, ["keypath"])]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, ["class"])) : content.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass([_ctx.$style.entry, content.value.note && _ctx.$style.boxed])
			}, [content.value.namesActor ? (openBlock(), createBlock(WorkflowReviewActivityActorAvatar_default, {
				key: 0,
				actor: __props.entry.createdBy
			}, null, 8, ["actor"])) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.systemIcon),
				"aria-hidden": "true",
				"data-test-id": "workflow-review-activity-system-icon"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "info",
				size: 16,
				color: "text-light"
			})], 2)), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headline) }, [
				content.value.namesActor ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "medium",
					color: "text-dark",
					class: normalizeClass(_ctx.$style.line),
					"data-test-id": "workflow-review-activity-actor"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(actorName.value) + " ", 1), createBaseVNode("span", {
						"aria-hidden": "true",
						class: normalizeClass(_ctx.$style.separator)
					}, "|", 2)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true),
				createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-light",
					class: normalizeClass(_ctx.$style.line),
					"data-test-id": content.value.testId
				}, {
					default: withCtx(() => [createVNode(unref(I18nT), {
						keypath: content.value.key,
						scope: "global"
					}, createSlots({ _: 2 }, [content.value.workflow ? {
						name: "workflowName",
						fn: withCtx(() => [createVNode(WorkflowReviewActivityWorkflowLink_default, {
							"workflow-id": content.value.workflow.id,
							"workflow-name": content.value.workflow.name,
							version: content.value.version
						}, null, 8, [
							"workflow-id",
							"workflow-name",
							"version"
						])]),
						key: "0"
					} : content.value.version ? {
						name: "workflowName",
						fn: withCtx(() => [createBaseVNode("i", { class: normalizeClass(_ctx.$style.unknownWorkflow) }, toDisplayString(unref(i18n).baseText("workflowReviews.detail.activity.unknownWorkflow")), 3), createTextVNode(" " + toDisplayString(content.value.version), 1)]),
						key: "1"
					} : void 0]), 1032, ["keypath"])]),
					_: 1
				}, 8, ["class", "data-test-id"]),
				createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-light",
					class: normalizeClass(_ctx.$style.timeStamp)
				}, {
					default: withCtx(() => [createBaseVNode("time", { datetime: __props.entry.createdAt }, [createVNode(unref(N8nTimeAgo_default), {
						date: __props.entry.createdAt,
						locale: unref(rootStore).defaultLocale
					}, null, 8, ["date", "locale"])], 8, _hoisted_2$2)]),
					_: 1
				}, 8, ["class"])
			], 2), content.value.note ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				size: "medium",
				color: "text-dark",
				class: normalizeClass([_ctx.$style.body, _ctx.$style.line]),
				"data-test-id": "workflow-review-activity-note"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(content.value.note), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true)], 2)], 2)) : (openBlock(), createBlock(WorkflowReviewActivityFallback_default, { key: 2 }));
		};
	}
}), [["__cssModules", { "$style": {
	entry: "_entry_ov45x_10",
	systemIcon: "_systemIcon_ov45x_16",
	content: "_content_ov45x_26",
	headline: "_headline_ov45x_34",
	separator: "_separator_ov45x_41",
	unknownWorkflow: "_unknownWorkflow_ov45x_46",
	timeStamp: "_timeStamp_ov45x_50",
	boxed: "_boxed_ov45x_55",
	closedCallout: "_closedCallout_ov45x_63",
	closedCalloutContent: "_closedCalloutContent_ov45x_67",
	line: "_line_ov45x_74",
	body: "_body_ov45x_78"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/activityEntryRegistry.ts
var registry = {
	"comment.created": { 1: WorkflowReviewActivityComment_default },
	"review.opened": { 1: WorkflowReviewActivityEventEntry_default },
	"review.changes_requested": { 1: WorkflowReviewActivityEventEntry_default },
	"review.approved": { 1: WorkflowReviewActivityEventEntry_default },
	"review.version_updated": { 1: WorkflowReviewActivityEventEntry_default },
	"review.closed": { 1: WorkflowReviewActivityEventEntry_default },
	"workflow.archived": { 1: WorkflowReviewActivityEventEntry_default },
	"workflow.deleted": { 1: WorkflowReviewActivityEventEntry_default },
	"workflow.moved": { 1: WorkflowReviewActivityEventEntry_default },
	"workflow.published": { 1: WorkflowReviewActivityEventEntry_default }
};
function resolveActivityComponent(entry) {
	return registry[entry.type]?.[entry.typeVersion] ?? WorkflowReviewActivityFallback_default;
}
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/WorkflowReviewActivityFeed.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$8 = ["aria-label"];
var WorkflowReviewActivityFeed_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewActivityFeed",
	setup(__props) {
		const i18n = useI18n();
		const store = useReviewActivityStore();
		const { entries, loading, loadingMore, hasMore, error } = storeToRefs(store);
		const scrollContainer = inject(ReviewDetailScrollContainerKey, ref(null));
		const feed = ref(null);
		const list = ref(null);
		const sentinel = ref(null);
		const composer = ref(null);
		const initialScrollApplied = ref(false);
		let prependAnchor = null;
		const enteringIds = ref(/* @__PURE__ */ new Set());
		function scrollToBottom() {
			const container = scrollContainer.value;
			if (container) container.scrollTop = container.scrollHeight;
		}
		const { observe } = useIntersectionObserver$1({
			root: scrollContainer,
			threshold: .01,
			onIntersect: () => {
				const element = list.value?.firstElementChild ?? null;
				prependAnchor = element ? {
					element,
					top: element.getBoundingClientRect().top
				} : null;
				store.loadMore();
			}
		});
		watch([
			sentinel,
			hasMore,
			loadingMore,
			() => entries.value.length
		], ([sentinelElement, moreToLoad, isLoadingMore]) => {
			if (sentinelElement && moreToLoad && !isLoadingMore) observe(sentinelElement);
		}, {
			immediate: true,
			flush: "post"
		});
		watch(entries, (next, previous) => {
			const anchor = prependAnchor?.element.isConnected === true ? prependAnchor : null;
			prependAnchor = null;
			if (next.length === 0) return;
			if (!previous || previous.length === 0) {
				scrollToBottom();
				return;
			}
			if (next[0]?.id !== previous[0]?.id) {
				const container = scrollContainer.value;
				if (!container || !anchor) {
					scrollToBottom();
					return;
				}
				container.scrollTop += anchor.element.getBoundingClientRect().top - anchor.top;
				return;
			}
			if (next.at(-1)?.id !== previous.at(-1)?.id) scrollToBottom();
		}, { flush: "post" });
		watch(entries, (next, previous) => {
			if (next.length === 0) {
				enteringIds.value = /* @__PURE__ */ new Set();
				return;
			}
			const lastShown = previous?.at(-1);
			if (!lastShown) return;
			const newer = next.filter((entry) => Number(entry.id) > Number(lastShown.id));
			if (newer.length > 0) enteringIds.value = new Set(newer.map((entry) => entry.id));
		}, { flush: "post" });
		let composerHeight = 0;
		useResizeObserver(composer, ([entry]) => {
			const height = entry?.borderBoxSize[0]?.blockSize ?? 0;
			const growth = height - composerHeight;
			composerHeight = height;
			feed.value?.style.setProperty("--review-activity--composer-height", `${height}px`);
			const container = scrollContainer.value;
			if (!container || growth <= 0) return;
			if (container.scrollHeight - container.clientHeight - container.scrollTop <= growth + 1) scrollToBottom();
		});
		function retry() {
			if (!store.nextCursor) {
				if (store.currentReviewId) store.fetchFeed(store.currentReviewId);
				return;
			}
			store.loadMore();
		}
		onMounted(() => {
			if (entries.value.length > 0) scrollToBottom();
			initialScrollApplied.value = true;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "feed",
				ref: feed,
				class: normalizeClass([_ctx.$style.feed, { [_ctx.$style.feedWithComposer]: _ctx.$slots.composer }]),
				"data-test-id": "workflow-review-activity-feed"
			}, [
				_ctx.$slots.header ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.header)
				}, [renderSlot(_ctx.$slots, "header")], 2)) : createCommentVNode("", true),
				unref(loading) && unref(entries).length === 0 ? (openBlock(), createBlock(unref(N8nLoading_default), {
					key: 1,
					loading: true,
					rows: 3
				})) : unref(error) && unref(entries).length === 0 ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.errorRow),
					"data-test-id": "workflow-review-activity-error"
				}, [createVNode(unref(N8nText_default), {
					color: "danger",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.activity.error.load")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					size: "mini",
					variant: "outline",
					"data-test-id": "workflow-review-activity-retry",
					onClick: _cache[0] || (_cache[0] = ($event) => retry())
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				})], 2)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
					initialScrollApplied.value && unref(hasMore) && !unref(error) ? (openBlock(), createElementBlock("div", {
						key: 0,
						ref_key: "sentinel",
						ref: sentinel,
						class: normalizeClass(_ctx.$style.sentinel),
						"data-test-id": "workflow-review-activity-load-more-sentinel"
					}, null, 2)) : createCommentVNode("", true),
					unref(loadingMore) || unref(loading) ? (openBlock(), createBlock(unref(N8nLoading_default), {
						key: 1,
						loading: true,
						rows: 1
					})) : createCommentVNode("", true),
					unref(error) ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.errorRow)
					}, [createVNode(unref(N8nText_default), {
						color: "danger",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.activity.error.load")), 1)]),
						_: 1
					}), createVNode(unref(N8nButton_default), {
						size: "mini",
						variant: "outline",
						"data-test-id": "workflow-review-activity-load-more-retry",
						onClick: _cache[1] || (_cache[1] = ($event) => retry())
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true),
					createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-light",
						size: "medium",
						class: normalizeClass(_ctx.$style.header)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.tabs.activity")), 1)]),
						_: 1
					}, 8, ["class"]),
					createBaseVNode("div", {
						ref_key: "list",
						ref: list,
						role: "list",
						"aria-label": unref(i18n).baseText("workflowReviews.detail.activity.listLabel"),
						class: normalizeClass(_ctx.$style.list)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(entries), (entry) => {
						return openBlock(), createElementBlock("div", {
							key: entry.id,
							role: "listitem",
							class: normalizeClass([_ctx.$style.item, { [_ctx.$style.itemEntering]: enteringIds.value.has(entry.id) }]),
							"data-test-id": "workflow-review-activity-entry"
						}, [(openBlock(), createBlock(resolveDynamicComponent(unref(resolveActivityComponent)(entry)), { entry }, null, 8, ["entry"]))], 2);
					}), 128)), _ctx.$slots.footer ? (openBlock(), createElementBlock("div", {
						key: 0,
						role: "listitem",
						class: normalizeClass(_ctx.$style.item)
					}, [renderSlot(_ctx.$slots, "footer")], 2)) : createCommentVNode("", true)], 10, _hoisted_1$8)
				], 64)),
				_ctx.$slots.composer ? (openBlock(), createElementBlock("div", {
					key: 4,
					ref_key: "composer",
					ref: composer,
					class: normalizeClass(_ctx.$style.composer)
				}, [renderSlot(_ctx.$slots, "composer")], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	feed: "_feed_klsxi_450",
	header: "_header_klsxi_464",
	list: "_list_klsxi_469",
	item: "_item_klsxi_477",
	itemEntering: "_itemEntering_klsxi_487",
	fadeInUp: "_fadeInUp_klsxi_1",
	feedWithComposer: "_feedWithComposer_klsxi_513",
	composer: "_composer_klsxi_518",
	errorRow: "_errorRow_klsxi_529",
	sentinel: "_sentinel_klsxi_536",
	shimmer: "_shimmer_klsxi_1",
	spin: "_spin_klsxi_1",
	"skeleton-pulse": "_skeleton-pulse_klsxi_1",
	opacityPulse: "_opacityPulse_klsxi_1",
	popoverIn: "_popoverIn_klsxi_1",
	fadeIn: "_fadeIn_klsxi_1",
	collapsibleSlideDown: "_collapsibleSlideDown_klsxi_1",
	collapsibleSlideUp: "_collapsibleSlideUp_klsxi_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_klsxi_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_klsxi_1",
	blurSwapIn: "_blurSwapIn_klsxi_1",
	blurSwapOut: "_blurSwapOut_klsxi_1",
	pulse: "_pulse_klsxi_1",
	pulseGlow: "_pulseGlow_klsxi_1",
	pulseGlowDelayed: "_pulseGlowDelayed_klsxi_1",
	fade: "_fade_klsxi_1",
	fadeInDown: "_fadeInDown_klsxi_1",
	fadeInLeft: "_fadeInLeft_klsxi_1",
	fadeInRight: "_fadeInRight_klsxi_1",
	fadeOut: "_fadeOut_klsxi_1",
	fadeOutDown: "_fadeOutDown_klsxi_1",
	fadeOutUp: "_fadeOutUp_klsxi_1",
	fadeOutLeft: "_fadeOutLeft_klsxi_1",
	fadeOutRight: "_fadeOutRight_klsxi_1",
	ping: "_ping_klsxi_1",
	blinkBackground: "_blinkBackground_klsxi_1",
	typingBlink: "_typingBlink_klsxi_1"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/WorkflowReviewChangesSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var import_omit = /* @__PURE__ */ __toESM(require_omit(), 1);
var WorkflowReviewChangesSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewChangesSection",
	props: {
		workflow: {},
		state: {},
		decision: {}
	},
	setup(__props) {
		const WorkflowDiffView = computed(() => get("workflow-diff"));
		const props = __props;
		const i18n = useI18n();
		const isApproved = computed(() => props.state === "closed" && props.decision === "approved");
		const isClosedWithoutApproval = computed(() => props.state === "closed" && props.decision !== "approved");
		/**
		* Label each side the way version history does, falling back to a short id.
		* Falsy rather than nullish: the publish endpoints accept `name: ""`.
		*/
		const versionLabel = (snapshot) => getVersionLabel({ workflowHistory: snapshot });
		/**
		* A snapshot minus its identity and metadata — i.e. everything the diff renders.
		* Derived by omission rather than an explicit field list to avoid drift; renaming
		* a version must not read as a change.
		*/
		function contentOf(snapshot) {
			return (0, import_omit.default)(snapshot, [
				"versionId",
				"name",
				"createdAt"
			]);
		}
		const hasChanges = computed(() => {
			const { pinnedVersion, baselineVersion } = props.workflow;
			if (!pinnedVersion) return false;
			if (!baselineVersion) return true;
			if (pinnedVersion.versionId === baselineVersion.versionId) return false;
			return !(0, import_isEqual.default)(contentOf(baselineVersion), contentOf(pinnedVersion));
		});
		const sourceDotClass = computed(() => isApproved.value ? "statusDotSuperseded" : "statusDotPublished");
		const targetDotClass = computed(() => isApproved.value ? "statusDotPublished" : "statusDotInReview");
		const noChangesText = computed(() => i18n.baseText(isApproved.value ? "workflowReviews.changes.closed.noChanges" : "workflowReviews.changes.noChanges"));
		const sourceEmptyText = computed(() => i18n.baseText(isApproved.value ? "workflowReviews.changes.closed.firstPublish.sourceEmpty" : "workflowReviews.changes.firstPublish.sourceEmpty"));
		const sourceLabel = computed(() => props.workflow.baselineVersion ? i18n.baseText(isApproved.value ? "workflowReviews.changes.closed.sourceLabel" : "workflowReviews.changes.sourceLabel", { interpolate: { version: versionLabel(props.workflow.baselineVersion) } }) : void 0);
		const targetLabel = computed(() => props.workflow.pinnedVersion ? i18n.baseText(isApproved.value ? "workflowReviews.changes.closed.targetLabel" : "workflowReviews.changes.targetLabel", { interpolate: { version: versionLabel(props.workflow.pinnedVersion) } }) : void 0);
		return (_ctx, _cache) => {
			return isClosedWithoutApproval.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "info",
				class: normalizeClass(_ctx.$style.callout),
				"data-test-id": "workflow-review-changes-closed-without-approval"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.changes.closedWithoutApproval")), 1)]),
				_: 1
			}, 8, ["class"])) : !__props.workflow.pinnedVersion ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 1,
				theme: "warning",
				class: normalizeClass(_ctx.$style.callout),
				"data-test-id": "workflow-review-changes-version-unavailable"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.changes.versionUnavailable.body")), 1)]),
				_: 1
			}, 8, ["class"])) : !hasChanges.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 2,
				theme: "info",
				class: normalizeClass(_ctx.$style.callout),
				"data-test-id": "workflow-review-changes-no-changes"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(noChangesText.value), 1)]),
				_: 1
			}, 8, ["class"])) : (openBlock(), createElementBlock("div", {
				key: 3,
				class: normalizeClass(_ctx.$style.diff),
				"data-review-diff": "",
				"data-test-id": "workflow-review-changes-diff"
			}, [(openBlock(), createBlock(resolveDynamicComponent(WorkflowDiffView.value), {
				"source-snapshot": __props.workflow.baselineVersion ?? void 0,
				"workflow-id": __props.workflow.workflowId,
				"workflow-name": __props.workflow.workflowName,
				"target-snapshot": __props.workflow.pinnedVersion ?? void 0,
				"source-label": sourceLabel.value,
				"target-label": targetLabel.value,
				"canvas-id-prefix": __props.workflow.workflowId,
				"show-fullscreen-button": "",
				"hide-title": ""
			}, createSlots({
				targetLabel: withCtx(() => [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.versionBadge),
					"data-test-id": "workflow-review-changes-target-label"
				}, [createBaseVNode("span", { class: normalizeClass([_ctx.$style.statusDot, _ctx.$style[targetDotClass.value]]) }, null, 2), createVNode(unref(N8nText_default), {
					color: "text-dark",
					size: "small",
					compact: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(targetLabel.value), 1)]),
					_: 1
				})], 2)]),
				sourceEmptyText: withCtx(() => [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(sourceEmptyText.value), 1)]),
					_: 1
				})]),
				_: 2
			}, [__props.workflow.baselineVersion ? {
				name: "sourceLabel",
				fn: withCtx(() => [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.versionBadge),
					"data-test-id": "workflow-review-changes-source-label"
				}, [createBaseVNode("span", { class: normalizeClass([_ctx.$style.statusDot, _ctx.$style[sourceDotClass.value]]) }, null, 2), createVNode(unref(N8nText_default), {
					color: "text-dark",
					size: "small",
					compact: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(sourceLabel.value), 1)]),
					_: 1
				})], 2)]),
				key: "0"
			} : void 0]), 1032, [
				"source-snapshot",
				"workflow-id",
				"workflow-name",
				"target-snapshot",
				"source-label",
				"target-label",
				"canvas-id-prefix"
			]))], 2));
		};
	}
}), [["__cssModules", { "$style": {
	callout: "_callout_19xza_1",
	versionBadge: "_versionBadge_19xza_6",
	statusDot: "_statusDot_19xza_27",
	statusDotPublished: "_statusDotPublished_19xza_35",
	statusDotInReview: "_statusDotInReview_19xza_39",
	statusDotSuperseded: "_statusDotSuperseded_19xza_43",
	diff: "_diff_19xza_47"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/WorkflowReviewChangesList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewChangesList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewChangesList",
	props: /*@__PURE__*/ mergeModels({
		workflows: {},
		state: {},
		decision: {}
	}, {
		"expanded": {},
		"expandedModifiers": {}
	}),
	emits: ["update:expanded"],
	setup(__props) {
		/** The open workflow's id. The parent owns it, so it survives a tab switch. */
		const expanded = useModel(__props, "expanded");
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(AccordionRoot_default), {
				modelValue: expanded.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => expanded.value = $event),
				type: "single",
				collapsible: "",
				"unmount-on-hide": "",
				class: normalizeClass(_ctx.$style.list)
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.workflows, (workflow) => {
					return openBlock(), createBlock(unref(AccordionItem_default), {
						key: workflow.workflowId,
						value: workflow.workflowId,
						class: normalizeClass(_ctx.$style.item),
						"data-test-id": "workflow-review-changes-item"
					}, {
						default: withCtx(() => [createVNode(unref(AccordionHeader_default), { class: normalizeClass(_ctx.$style.header) }, {
							default: withCtx(() => [createVNode(unref(AccordionTrigger_default), {
								class: normalizeClass(_ctx.$style.trigger),
								"data-test-id": "workflow-review-changes-item-trigger"
							}, {
								default: withCtx(() => [
									createVNode(unref(N8nIcon_default), {
										icon: "chevron-down",
										size: "small",
										class: normalizeClass(_ctx.$style.chevron)
									}, null, 8, ["class"]),
									createVNode(unref(N8nText_default), {
										bold: "",
										size: "medium",
										color: "text-dark",
										class: normalizeClass(_ctx.$style.name)
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(workflow.workflowName), 1)]),
										_: 2
									}, 1032, ["class"]),
									workflow.pinnedVersion ? (openBlock(), createBlock(unref(N8nText_default), {
										key: 0,
										size: "small",
										color: "text-light",
										class: normalizeClass(_ctx.$style.version),
										"data-test-id": "workflow-review-changes-item-version"
									}, {
										default: withCtx(() => [createTextVNode(toDisplayString(unref(getVersionLabel)({ workflowHistory: workflow.pinnedVersion })), 1)]),
										_: 2
									}, 1032, ["class"])) : createCommentVNode("", true)
								]),
								_: 2
							}, 1032, ["class"])]),
							_: 2
						}, 1032, ["class"]), createVNode(unref(AccordionContent_default), { class: normalizeClass(_ctx.$style.content) }, {
							default: withCtx(() => [createVNode(WorkflowReviewChangesSection_default, {
								workflow,
								state: __props.state,
								decision: __props.decision
							}, null, 8, [
								"workflow",
								"state",
								"decision"
							])]),
							_: 2
						}, 1032, ["class"])]),
						_: 2
					}, 1032, ["value", "class"]);
				}), 128))]),
				_: 1
			}, 8, ["modelValue", "class"]);
		};
	}
}), [["__cssModules", { "$style": {
	list: "_list_16lzz_1",
	item: "_item_16lzz_9",
	header: "_header_16lzz_23",
	trigger: "_trigger_16lzz_27",
	chevron: "_chevron_16lzz_46",
	name: "_name_16lzz_55",
	version: "_version_16lzz_56",
	content: "_content_16lzz_67"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/WorkflowReviewCommentComposer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewCommentComposer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewCommentComposer",
	props: { canComment: { type: Boolean } },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const { showError } = useToast();
		const store = useReviewActivityStore();
		const { posting, draft } = storeToRefs(store);
		const submitDisabled = computed(() => posting.value || draft.value.trim().length === 0 || draft.value.length > 1e4 || !props.canComment);
		async function onSubmit() {
			const submitted = draft.value;
			const body = submitted.trim();
			if (!body) return;
			try {
				if (await store.postComment(body) && draft.value === submitted) draft.value = "";
			} catch (error) {
				showError(error, i18n.baseText("workflowReviews.detail.activity.error.post"));
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("label", { class: normalizeClass(_ctx.$style.composer) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.srOnly) }, toDisplayString(unref(i18n).baseText("workflowReviews.detail.activity.composer.label")), 3), createVNode(unref(N8nChatInput_default), {
				modelValue: unref(draft),
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(draft) ? draft.value = $event : null),
				layout: "adaptive",
				"max-length": unref(WORKFLOW_REVIEW_TEXT_MAX_LENGTH),
				placeholder: unref(i18n).baseText("workflowReviews.detail.activity.composer.placeholder"),
				"refocus-after-send": "",
				disabled: !__props.canComment,
				"disabled-tooltip": unref(i18n).baseText("workflowReviews.detail.activity.composer.notAllowed"),
				"submit-disabled": submitDisabled.value,
				"data-test-id": "workflow-review-comment-composer",
				onSubmit
			}, null, 8, [
				"modelValue",
				"max-length",
				"placeholder",
				"disabled",
				"disabled-tooltip",
				"submit-disabled"
			])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	composer: "_composer_1g329_1",
	srOnly: "_srOnly_1g329_5"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/WorkflowReviewDecisionPopover.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$7 = { key: 0 };
var WorkflowReviewDecisionPopover_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewDecisionPopover",
	props: {
		deciding: { type: Boolean },
		viewerCanDecide: { type: Boolean },
		viewerCanComment: { type: Boolean },
		ineligibilityHint: {}
	},
	emits: ["decide", "comment-posted"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { showError } = useToast();
		const store = useReviewActivityStore();
		const { posting, decisionNote } = storeToRefs(store);
		const isOpen = ref(false);
		const noteInputId = useId();
		const note = computed(() => decisionNote.value.trim());
		const commentDisabled = computed(() => posting.value || props.deciding || note.value.length === 0 || !props.viewerCanComment);
		const decisionDisabled = computed(() => props.deciding || posting.value);
		function submitDecision(input) {
			isOpen.value = false;
			emit("decide", input);
		}
		function onRequestChanges() {
			submitDecision({
				decision: "changes_requested",
				note: note.value
			});
		}
		function onApprove() {
			submitDecision(note.value ? {
				decision: "approved",
				note: note.value
			} : { decision: "approved" });
		}
		async function onComment() {
			const body = note.value;
			isOpen.value = false;
			try {
				if (!await store.postComment(body)) return;
				store.clearDecisionNote(body);
				emit("comment-posted");
			} catch (error) {
				showError(error, i18n.baseText("workflowReviews.detail.activity.error.post"));
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				open: isOpen.value,
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => isOpen.value = $event),
				side: "bottom",
				align: "end",
				width: "480px",
				"enable-scrolling": false,
				"content-class": _ctx.$style.popover
			}, {
				trigger: withCtx(() => [__props.ineligibilityHint ? (openBlock(), createElementBlock("span", _hoisted_1$7, [createVNode(unref(N8nTooltip_default), {
					content: __props.ineligibilityHint,
					"show-after": 300
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						size: "small",
						disabled: __props.deciding || !__props.viewerCanDecide,
						"data-test-id": "workflow-review-decision-trigger"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.decision.trigger")) + " ", 1), createVNode(unref(N8nIcon_default), { icon: "chevron-down" })]),
						_: 1
					}, 8, ["disabled"])]),
					_: 1
				}, 8, ["content"])])) : (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					size: "small",
					disabled: __props.deciding || !__props.viewerCanDecide,
					"data-test-id": "workflow-review-decision-trigger"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.decision.trigger")) + " ", 1), createVNode(unref(N8nIcon_default), { icon: "chevron-down" })]),
					_: 1
				}, 8, ["disabled"]))]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.content),
					"data-test-id": "workflow-review-decision-popover"
				}, [createVNode(unref(Input_default), {
					id: unref(noteInputId),
					modelValue: unref(decisionNote),
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(decisionNote) ? decisionNote.value = $event : null),
					"aria-label": unref(i18n).baseText("workflowReviews.detail.decision.note.label"),
					type: "textarea",
					rows: 3,
					maxlength: unref(WORKFLOW_REVIEW_TEXT_MAX_LENGTH),
					placeholder: unref(i18n).baseText("workflowReviews.detail.activity.composer.placeholder"),
					class: normalizeClass(_ctx.$style.input),
					"data-test-id": "workflow-review-decision-note"
				}, null, 8, [
					"id",
					"modelValue",
					"aria-label",
					"maxlength",
					"placeholder",
					"class"
				]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [
					createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						disabled: commentDisabled.value,
						"data-test-id": "workflow-review-decision-comment-button",
						onClick: onComment
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "message-square" })]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("workflowReviews.detail.decision.comment")), 1)]),
						_: 1
					}, 8, ["disabled"]),
					createVNode(unref(N8nTooltip_default), {
						disabled: !!note.value,
						content: unref(i18n).baseText("workflowReviews.detail.decision.note.required"),
						"show-after": 300
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "small",
							disabled: !note.value || decisionDisabled.value,
							"data-test-id": "workflow-review-decision-request-changes-button",
							onClick: onRequestChanges
						}, {
							icon: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "refresh-cw" })]),
							default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("workflowReviews.detail.decision.requestChanges")), 1)]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					}, 8, ["disabled", "content"]),
					createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						disabled: decisionDisabled.value,
						"data-test-id": "workflow-review-decision-approve-button",
						onClick: onApprove
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "check" })]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("workflowReviews.detail.decision.approveAndPublish")), 1)]),
						_: 1
					}, 8, ["disabled"])
				], 2)], 2)]),
				_: 1
			}, 8, ["open", "content-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	popover: "_popover_v2y1m_1",
	content: "_content_v2y1m_5",
	input: "_input_v2y1m_11",
	actions: "_actions_v2y1m_15"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/WorkflowReviewDetailMetadata.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewDetailMetadata_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewDetailMetadata",
	props: { review: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const detail = computed(() => "workflows" in props.review ? props.review : null);
		const otherAuthors = computed(() => props.review.authors.filter((author) => author.id !== props.review.requester?.id));
		const statusSummary = computed(() => getWorkflowReviewStatusDisplay(i18n, props.review.state, props.review.decision));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				class: normalizeClass(_ctx.$style.metadata),
				"data-test-id": "workflow-review-detail-metadata"
			}, [
				createVNode(unref(N8nCard_default), {
					class: normalizeClass(_ctx.$style.card),
					"data-test-id": "workflow-review-detail-status-card"
				}, {
					header: withCtx(() => [createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-light",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.metadata.status")), 1)]),
						_: 1
					})]),
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.status) }, [createVNode(WorkflowReviewStatusDot_default, {
						state: __props.review.state,
						decision: __props.review.decision,
						decorative: ""
					}, null, 8, ["state", "decision"]), createVNode(unref(N8nText_default), { size: "medium" }, {
						default: withCtx(() => [
							createTextVNode(toDisplayString(statusSummary.value.stateLabel) + " ", 1),
							createBaseVNode("span", {
								"aria-hidden": "true",
								class: normalizeClass(_ctx.$style.statusSeparator)
							}, "|", 2),
							createTextVNode(" " + toDisplayString(statusSummary.value.decisionLabel), 1)
						]),
						_: 1
					})], 2)]),
					_: 1
				}, 8, ["class"]),
				createVNode(unref(N8nCard_default), {
					class: normalizeClass([_ctx.$style.card, _ctx.$style.peopleCard]),
					"data-test-id": "workflow-review-detail-people-card"
				}, {
					default: withCtx(() => [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nText_default), {
							bold: "",
							color: "text-light",
							size: "medium"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.metadata.requestedBy")), 1)]),
							_: 1
						}), __props.review.requester ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.person)
						}, [createVNode(unref(N8nAvatar_default), {
							"first-name": __props.review.requester.firstName,
							"last-name": __props.review.requester.lastName,
							size: "xsmall"
						}, null, 8, ["first-name", "last-name"]), createVNode(unref(N8nText_default), { size: "medium" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(formatUserDisplayName)(__props.review.requester)), 1)]),
							_: 1
						})], 2)) : (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							color: "text-light",
							size: "medium",
							"data-test-id": "workflow-review-detail-requester-deleted"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.metadata.requesterDeleted")), 1)]),
							_: 1
						}))], 2),
						otherAuthors.value.length > 0 ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.section),
							"data-test-id": "workflow-review-detail-other-authors"
						}, [createVNode(unref(N8nText_default), {
							bold: "",
							color: "text-light",
							size: "medium"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.metadata.otherAuthors")), 1)]),
							_: 1
						}), (openBlock(true), createElementBlock(Fragment, null, renderList(otherAuthors.value, (author) => {
							return openBlock(), createElementBlock("div", {
								key: author.id,
								class: normalizeClass(_ctx.$style.person)
							}, [createVNode(unref(N8nAvatar_default), {
								"first-name": author.firstName,
								"last-name": author.lastName,
								size: "xsmall"
							}, null, 8, ["first-name", "last-name"]), createVNode(unref(N8nText_default), { size: "medium" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(formatUserDisplayName)(author)), 1)]),
								_: 2
							}, 1024)], 2);
						}), 128))], 2)) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [
							createVNode(unref(N8nText_default), {
								bold: "",
								color: "text-light",
								size: "medium"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.metadata.reviewers")), 1)]),
								_: 1
							}),
							(openBlock(true), createElementBlock(Fragment, null, renderList(__props.review.reviewers, (reviewer) => {
								return openBlock(), createElementBlock("div", {
									key: reviewer.id,
									class: normalizeClass(_ctx.$style.person)
								}, [createVNode(unref(N8nAvatar_default), {
									"first-name": reviewer.firstName,
									"last-name": reviewer.lastName,
									size: "xsmall"
								}, null, 8, ["first-name", "last-name"]), createVNode(unref(N8nText_default), { size: "medium" }, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(formatUserDisplayName)(reviewer)), 1)]),
									_: 2
								}, 1024)], 2);
							}), 128)),
							__props.review.reviewers.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								color: "text-light",
								size: "medium",
								"data-test-id": "workflow-review-detail-no-reviewers"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.metadata.noReviewers")), 1)]),
								_: 1
							})) : createCommentVNode("", true)
						], 2)
					]),
					_: 1
				}, 8, ["class"]),
				detail.value?.workflows.length ? (openBlock(), createBlock(unref(N8nCard_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.card),
					"data-test-id": "workflow-review-detail-changes-card"
				}, {
					header: withCtx(() => [createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-light",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.metadata.workflow", { adjustToNumber: detail.value.workflows.length })), 1)]),
						_: 1
					})]),
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.workflows) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(detail.value.workflows, (workflow) => {
						return openBlock(), createBlock(unref(N8nLink_default), {
							key: workflow.workflowId,
							to: {
								name: unref(VIEWS).WORKFLOW,
								params: { workflowId: workflow.workflowId }
							},
							theme: "text",
							size: "medium",
							class: normalizeClass(_ctx.$style.workflow),
							"data-test-id": "workflow-review-detail-workflow-link"
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "workflow",
								size: "medium",
								class: normalizeClass(_ctx.$style.workflowIcon)
							}, null, 8, ["class"]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.workflowName) }, toDisplayString(workflow.workflowName), 3)]),
							_: 2
						}, 1032, ["to", "class"]);
					}), 128))], 2)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	metadata: "_metadata_ferqb_1",
	card: "_card_ferqb_13",
	status: "_status_ferqb_24",
	section: "_section_ferqb_30",
	workflows: "_workflows_ferqb_31",
	statusSeparator: "_statusSeparator_ferqb_38",
	peopleCard: "_peopleCard_ferqb_43",
	person: "_person_ferqb_47",
	workflow: "_workflow_ferqb_31",
	workflowName: "_workflowName_ferqb_69",
	workflowIcon: "_workflowIcon_ferqb_76"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/components/WorkflowReviewDetailTabs.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var WorkflowReviewDetailTabs_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewDetailTabs",
	props: {
		review: {},
		tab: {},
		deciding: { type: Boolean }
	},
	emits: ["update:tab", "decide"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		provide(ReviewDetailScrollContainerKey, useTemplateRef("detailBody"));
		const detail = computed(() => "workflows" in props.review ? props.review : null);
		const expandedWorkflowId = ref();
		let expandedReviewId;
		watch(detail, (value) => {
			if (!value?.workflows.length) return;
			const open = expandedWorkflowId.value;
			const isListed = value.workflows.some(({ workflowId }) => workflowId === open);
			if (value.id === expandedReviewId && (open === void 0 || isListed)) return;
			expandedReviewId = value.id;
			expandedWorkflowId.value = value.workflows[0].workflowId;
		}, { immediate: true });
		const viewerCanDecide = computed(() => detail.value?.viewerCanDecide ?? false);
		const viewerCanComment = computed(() => detail.value?.viewerCanComment ?? false);
		provide(ReviewLinkedWorkflowsKey, computed(() => new Map((detail.value?.workflows ?? []).map((workflow) => [workflow.workflowId, {
			workflowName: workflow.workflowName,
			pinnedVersionId: workflow.workflowVersionId,
			pinnedVersionName: workflow.pinnedVersion?.name ?? null
		}]))));
		const ineligibilityHint = computed(() => {
			if (!detail.value || detail.value.viewerCanDecide) return "";
			return detail.value.viewerDecisionIneligibilityReason === "author" ? i18n.baseText("workflowReviews.detail.decision.ineligible.author") : i18n.baseText("generic.missing.permissions");
		});
		/**
		* Whether to append the approved-and-published summary below the feed. Derived at read
		* time from the live published pointer, not from a `workflow.published` entry: an entry
		* can sit on an unfetched feed page, and it would keep the summary up after a newer
		* version replaced this one. The pointer cannot claim a publication that isn't live —
		* a failed publish either left the pin unpublished (no summary) or never touched a pin
		* that was already live (summary true) — and it is the signal the canvas banner trusts,
		* so the two cannot disagree. A lifecycle close needs no summary here: its
		* `review.closed` entry renders as a callout.
		*/
		const showApprovedAndPublished = computed(() => {
			const review = detail.value;
			if (review?.state !== "closed" || review.decision !== "approved") return false;
			return review.workflows.length > 0 && review.workflows.every((workflow) => workflow.workflowVersionId !== null && workflow.publishedVersionId === workflow.workflowVersionId);
		});
		const tabOptions = computed(() => [{
			label: i18n.baseText("workflowReviews.detail.tabs.activity"),
			value: "activity"
		}, {
			label: i18n.baseText("workflowReviews.detail.tabs.changes"),
			value: "changes"
		}]);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "workflow-review-detail-tabs"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tabRow) }, [createVNode(unref(Tabs_default), {
				"model-value": __props.tab,
				options: tabOptions.value,
				variant: "modern",
				"data-test-id": "workflow-review-detail-tab-bar",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:tab", $event))
			}, null, 8, ["model-value", "options"]), detail.value?.state === "open" ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.decisionActions)
			}, [createVNode(WorkflowReviewDecisionPopover_default, {
				deciding: __props.deciding,
				"viewer-can-decide": viewerCanDecide.value,
				"viewer-can-comment": viewerCanComment.value,
				"ineligibility-hint": ineligibilityHint.value,
				onDecide: _cache[1] || (_cache[1] = ($event) => emit("decide", $event)),
				onCommentPosted: _cache[2] || (_cache[2] = ($event) => emit("update:tab", "activity"))
			}, null, 8, [
				"deciding",
				"viewer-can-decide",
				"viewer-can-comment",
				"ineligibility-hint"
			])], 2)) : createCommentVNode("", true)], 2), (openBlock(), createElementBlock("div", {
				key: `${__props.review.id}:${__props.tab}`,
				ref: "detailBody",
				class: normalizeClass(_ctx.$style.detailBody)
			}, [__props.tab === "activity" ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.activityPanel),
				"data-test-id": "workflow-review-activity-panel"
			}, [(openBlock(), createBlock(WorkflowReviewActivityFeed_default, { key: __props.review.id }, createSlots({
				header: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.descriptionCard) }, [createVNode(unref(N8nText_default), {
					tag: "h3",
					bold: "",
					color: "text-light",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.activity.description")), 1)]),
					_: 1
				}), detail.value?.description ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-base",
					size: "medium",
					class: normalizeClass(_ctx.$style.description),
					"data-test-id": "workflow-review-description"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(detail.value.description), 1)]),
					_: 1
				}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					color: "text-light",
					size: "medium",
					"data-test-id": "workflow-review-no-description"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.activity.noDescription")), 1)]),
					_: 1
				}))], 2)]),
				_: 2
			}, [showApprovedAndPublished.value ? {
				name: "footer",
				fn: withCtx(() => [createVNode(unref(N8nCallout_default), {
					theme: "success",
					class: normalizeClass(_ctx.$style.closedCallout),
					"data-test-id": "workflow-review-closed-callout"
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.closedCalloutContent) }, [createVNode(unref(N8nText_default), {
						bold: "",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.closedCallout.title")), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), { size: "medium" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.detail.closedCallout.approvedAndPublished")), 1)]),
						_: 1
					})], 2)]),
					_: 1
				}, 8, ["class"])]),
				key: "0"
			} : void 0, __props.review.state === "open" ? {
				name: "composer",
				fn: withCtx(() => [createVNode(WorkflowReviewCommentComposer_default, { "can-comment": viewerCanComment.value }, null, 8, ["can-comment"])]),
				key: "1"
			} : void 0]), 1024))], 2)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.panel),
				"data-test-id": "workflow-review-changes-panel"
			}, [!detail.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "warning",
				class: normalizeClass(_ctx.$style.callout),
				"data-test-id": "workflow-review-changes-unavailable"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.changes.unavailable")), 1)]),
				_: 1
			}, 8, ["class"])) : detail.value.workflows.length > 0 ? (openBlock(), createBlock(WorkflowReviewChangesList_default, {
				key: 1,
				expanded: expandedWorkflowId.value,
				"onUpdate:expanded": _cache[3] || (_cache[3] = ($event) => expandedWorkflowId.value = $event),
				workflows: detail.value.workflows,
				state: detail.value.state,
				decision: detail.value.decision
			}, null, 8, [
				"expanded",
				"workflows",
				"state",
				"decision"
			])) : (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 2,
				theme: "warning",
				class: normalizeClass(_ctx.$style.callout),
				"data-test-id": "workflow-review-changes-workflow-unavailable"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflowReviews.changes.workflowUnavailable")), 1)]),
				_: 1
			}, 8, ["class"]))], 2)), createVNode(WorkflowReviewDetailMetadata_default, { review: __props.review }, null, 8, ["review"])], 2))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1utw9_10",
	tabRow: "_tabRow_1utw9_19",
	detailBody: "_detailBody_1utw9_33",
	panel: "_panel_1utw9_43",
	activityPanel: "_activityPanel_1utw9_48",
	descriptionCard: "_descriptionCard_1utw9_55",
	callout: "_callout_1utw9_65",
	closedCallout: "_closedCallout_1utw9_70",
	closedCalloutContent: "_closedCalloutContent_1utw9_74",
	description: "_description_1utw9_55",
	decisionActions: "_decisionActions_1utw9_87"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/reviewDetail.store.ts
init_reactivity_esm_bundler();
var useReviewDetailStore = defineStore("workflowReviewDetail", () => {
	const rootStore = useRootStore();
	const detail = ref(null);
	const detailLoading = ref(false);
	const detailNotFound = ref(false);
	const deciding = ref(false);
	const selectionRevision = ref(0);
	let requestSeq = 0;
	async function fetchDetail(id) {
		const seq = ++requestSeq;
		if (detail.value?.id !== id) {
			detail.value = null;
			detailLoading.value = true;
			detailNotFound.value = false;
		}
		try {
			const response = await fetchWorkflowReviewRequestDetail(rootStore.restApiContext, id);
			if (seq !== requestSeq) return;
			detail.value = response;
			detailNotFound.value = false;
		} catch (error) {
			if (seq !== requestSeq) return;
			if (error instanceof ResponseError && error.httpStatusCode === 404) {
				detailNotFound.value = true;
				return;
			}
			throw error;
		} finally {
			if (seq === requestSeq) detailLoading.value = false;
		}
	}
	async function decideOnReview(id, input) {
		const response = await decideWorkflowReviewRequest(rootStore.restApiContext, id, input);
		if (detail.value?.id === id) {
			detail.value.decision = response.decision;
			detail.value.state = response.state;
			detail.value.updatedAt = response.updatedAt;
		}
		return response;
	}
	function clearDetail() {
		requestSeq++;
		selectionRevision.value++;
		detail.value = null;
		detailLoading.value = false;
		detailNotFound.value = false;
	}
	return {
		detail,
		detailLoading,
		detailNotFound,
		deciding,
		selectionRevision,
		fetchDetail,
		decideOnReview,
		clearDetail
	};
});
//#endregion
//#region ../../modules/inbox/frontend/src/reviews/WorkflowReviewDetail.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowReviewDetail_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowReviewDetail",
	props: {
		reviewId: {},
		listItem: {},
		tab: { default: "activity" },
		onItemChange: {},
		isActive: {},
		isSelected: {}
	},
	emits: ["update:tab"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const reviewStore = useReviewDetailStore();
		const activityStore = useReviewActivityStore();
		const { detail, detailLoading, detailNotFound, deciding } = storeToRefs(reviewStore);
		const i18n = useI18n();
		const { showError, showMessage } = useToast();
		const alertIcon = {
			type: "icon",
			value: "circle-alert"
		};
		const review = computed(() => {
			if (detail.value?.id === props.reviewId) return detail.value;
			return props.listItem?.id === props.reviewId ? props.listItem : null;
		});
		let isMounted = false;
		let selectionRevision = 0;
		function ownsSelection(id, revision = selectionRevision) {
			return isMounted && props.reviewId === id && revision === selectionRevision && revision === reviewStore.selectionRevision;
		}
		async function loadDetail(id, revision) {
			try {
				await reviewStore.fetchDetail(id);
			} catch (error) {
				if (props.isActive() && props.isSelected(id) && revision === reviewStore.selectionRevision) showError(error, i18n.baseText("workflowReviews.error.load"));
			}
		}
		watch(() => props.reviewId, (id) => {
			reviewStore.clearDetail();
			activityStore.reset();
			selectionRevision = reviewStore.selectionRevision;
			loadDetail(id, selectionRevision);
			activityStore.fetchFeed(id);
		}, { immediate: true });
		function asSentence(message) {
			const trimmed = message.trim();
			return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
		}
		async function onDecide(input) {
			const id = props.reviewId;
			const revision = selectionRevision;
			if (!ownsSelection(id, revision) || deciding.value) return;
			const onItemChange = props.onItemChange;
			const isActive = props.isActive;
			const isSelected = props.isSelected;
			deciding.value = true;
			try {
				const { autoPublish, state, decision, updatedAt } = await reviewStore.decideOnReview(id, input);
				onItemChange({
					type: "workflow_review",
					id,
					state,
					decision,
					updatedAt
				});
				if (ownsSelection(id, revision)) activityStore.clearDecisionNote(input.note ?? "");
				if (isSelected(id)) {
					activityStore.fetchFeed(id);
					if (state === "closed" || detail.value?.id !== id) loadDetail(id, reviewStore.selectionRevision);
				}
				if (!isActive()) return;
				if (autoPublish?.status === "published") showMessage({
					type: "success",
					title: i18n.baseText("workflowReviews.decision.approved.published.title"),
					message: i18n.baseText("workflowReviews.decision.approved.published.message")
				});
				else if (autoPublish?.status === "failed") showMessage({
					type: "warning",
					duration: 0,
					title: i18n.baseText("workflowReviews.decision.approved.publishFailed.title"),
					message: i18n.baseText("workflowReviews.decision.approved.publishFailed.message", { interpolate: { message: asSentence(autoPublish.message) } })
				});
			} catch (error) {
				onItemChange({
					type: "workflow_review",
					id
				});
				if (!isActive()) return;
				showError(error, i18n.baseText("workflowReviews.decision.error.title"));
				const selectedId = activityStore.currentReviewId;
				if (selectedId && isSelected(selectedId)) await Promise.all([loadDetail(selectedId, reviewStore.selectionRevision), selectedId === id ? activityStore.fetchFeed(id) : void 0]);
			} finally {
				deciding.value = false;
			}
		}
		onMounted(() => {
			isMounted = true;
		});
		onBeforeUnmount(() => {
			isMounted = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.detail),
				"data-test-id": "workflow-review-detail"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnTitle) }, [review.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.reviewTitle),
				"data-test-id": "workflow-review-request-title-row"
			}, [createVNode(WorkflowReviewStatusDot_default, {
				state: review.value.state,
				decision: review.value.decision
			}, null, 8, ["state", "decision"]), createVNode(unref(N8nHeading_default), {
				bold: "",
				tag: "h2",
				size: "xlarge",
				"data-test-id": "workflow-review-request-title"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(review.value.title), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.mainBody) }, [unref(detailNotFound) ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.emptyStateWrapper),
				"data-test-id": "workflow-review-detail-not-found"
			}, [createVNode(unref(N8nEmptyState_default), {
				class: normalizeClass(_ctx.$style.emptyState),
				icon: alertIcon,
				heading: unref(i18n).baseText("workflowReviews.detail.notFound.title"),
				description: unref(i18n).baseText("workflowReviews.detail.notFound.body")
			}, null, 8, [
				"class",
				"heading",
				"description"
			])], 2)) : unref(detailLoading) ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.detailSkeleton)
			}, [createVNode(unref(N8nLoading_default), {
				loading: true,
				rows: 3
			})], 2)) : review.value ? (openBlock(), createBlock(WorkflowReviewDetailTabs_default, {
				key: 2,
				review: review.value,
				tab: __props.tab,
				deciding: unref(deciding),
				"onUpdate:tab": _cache[0] || (_cache[0] = ($event) => emit("update:tab", $event)),
				onDecide
			}, null, 8, [
				"review",
				"tab",
				"deciding"
			])) : renderSlot(_ctx.$slots, "default", { key: 3 })], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	detail: "_detail_6qj8w_1",
	columnTitle: "_columnTitle_6qj8w_8",
	reviewTitle: "_reviewTitle_6qj8w_15",
	mainBody: "_mainBody_6qj8w_22",
	detailSkeleton: "_detailSkeleton_6qj8w_28",
	emptyStateWrapper: "_emptyStateWrapper_6qj8w_32",
	emptyState: "_emptyState_6qj8w_32"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/promotions/promotionReviews.api.ts
async function approvePromotionReview(context, reviewId, payload) {
	return await makeRestApiRequest(context, "POST", `/promotions/reviews/${encodeURIComponent(reviewId)}/approve`, { ...payload });
}
async function closePromotionReview(context, reviewId) {
	return await makeRestApiRequest(context, "POST", `/promotions/reviews/${encodeURIComponent(reviewId)}/close`);
}
//#endregion
//#region ../../modules/inbox/frontend/src/promotions/PromotionReviewDetail.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$6 = ["id"];
var PromotionReviewDetail_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PromotionReviewDetail",
	props: {
		item: {},
		onItemChange: { type: Function }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const { showError } = useToast();
		const rootStore = useRootStore();
		const rbacStore = useRBACStore();
		const disabledReasonId = useId();
		const newCommitsId = useId();
		const stateBadge = {
			open: "info",
			changes_requested: "warning",
			merged: "success",
			closed: "subtle"
		};
		const PromotionChanges = computed(() => get("promotion-changes"));
		const tabOptions = computed(() => [{
			label: i18n.baseText("inbox.promotionReview.detail.tabs.changes"),
			value: "changes"
		}]);
		const changes = ref({ status: "loading" });
		watch(() => props.item.id, () => changes.value = { status: "loading" });
		const hasNewCommits = computed(() => changes.value.status === "ready" && !!props.item.headCommitSha && changes.value.headCommitSha !== props.item.headCommitSha);
		const withoutEnvironment = computed(() => props.item.remoteError === "no_connection");
		const endedAs = computed(() => props.item.reviewState === "merged" ? "merged" : "closed");
		const changesKey = ref(0);
		/** What the admin confirms. A later change of the selected row does not change it. */
		const pendingApproval = ref(null);
		const approving = ref(false);
		const disabledReason = computed(() => {
			const { item } = props;
			if (item.reviewState === "changes_requested") return i18n.baseText("inbox.promotionReview.approve.disabled.changesRequested");
			if (item.hasConflicts) return i18n.baseText("inbox.promotionReview.approve.disabled.conflicts");
			if (item.remoteError) return i18n.baseText(`inbox.promotionReview.remoteError.${item.remoteError}`);
			if (!item.headCommitSha) return i18n.baseText("inbox.promotionReview.approve.disabled.noHeadCommit");
			if (changes.value.status === "unavailable") return i18n.baseText("inbox.promotionReview.approve.disabled.changesUnavailable");
			return null;
		});
		const approveDisabled = computed(() => !!disabledReason.value || hasNewCommits.value || changes.value.status !== "ready");
		const approveDescribedBy = computed(() => {
			if (disabledReason.value) return disabledReasonId;
			return hasNewCommits.value ? newCommitsId : void 0;
		});
		const canClose = computed(() => rbacStore.hasScope("promotions:approveReviews"));
		/** The review the user confirms. A later change of the selected row does not change it. */
		const pendingClose = ref(null);
		const closing = ref(false);
		const closeDisabled = computed(() => changes.value.status === "loading" && !withoutEnvironment.value && !!PromotionChanges.value || approving.value);
		function dismissClose() {
			if (!closing.value) pendingClose.value = null;
		}
		async function onClose() {
			if (!pendingClose.value || closing.value) return;
			const { id } = pendingClose.value;
			const onItemChange = props.onItemChange;
			closing.value = true;
			try {
				const { state, updatedAt } = await closePromotionReview(rootStore.restApiContext, id);
				onItemChange({
					type: "promotion_review",
					id,
					state,
					updatedAt
				});
			} catch (error) {
				showError(toError(error), i18n.baseText("inbox.promotionReview.close.error.title"));
				onItemChange({
					type: "promotion_review",
					id
				});
			} finally {
				closing.value = false;
				pendingClose.value = null;
			}
		}
		function openClose() {
			const { id, title } = props.item;
			pendingClose.value = {
				id,
				title
			};
		}
		function openApproval() {
			if (changes.value.status !== "ready") return;
			pendingApproval.value = {
				id: props.item.id,
				headCommitSha: changes.value.headCommitSha
			};
		}
		function closeApproval() {
			if (!approving.value) pendingApproval.value = null;
		}
		async function onApprove() {
			if (!pendingApproval.value || approving.value) return;
			const { id, headCommitSha } = pendingApproval.value;
			const onItemChange = props.onItemChange;
			approving.value = true;
			try {
				const { state, updatedAt } = await approvePromotionReview(rootStore.restApiContext, id, { headCommitSha });
				onItemChange({
					type: "promotion_review",
					id,
					state,
					updatedAt
				});
			} catch (error) {
				showError(toError(error), i18n.baseText("inbox.promotionReview.approve.error.title"));
				onItemChange({
					type: "promotion_review",
					id
				});
			} finally {
				approving.value = false;
				pendingApproval.value = null;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.detail),
				"data-test-id": "inbox-promotion-review-detail"
			}, [
				createBaseVNode("header", { class: normalizeClass([_ctx.$style.header, _ctx.$style.gutter]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleRow) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.title) }, [createVNode(unref(N8nHeading_default), {
					tag: "h2",
					size: "xlarge",
					bold: "",
					class: normalizeClass(_ctx.$style.titleText)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.item.title ?? __props.item.branchName ?? unref(i18n).baseText("inbox.promotionReview.untitled")), 1)]),
					_: 1
				}, 8, ["class"]), createVNode(unref(N8nBadge_default), {
					variant: stateBadge[__props.item.reviewState],
					size: "xxsmall",
					class: normalizeClass(_ctx.$style.stateBadge)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`inbox.promotionReview.state.${__props.item.reviewState}`)), 1)]),
					_: 1
				}, 8, ["variant", "class"])], 2), __props.item.webUrl ? (openBlock(), createBlock(unref(N8nExternalLink_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.gitlabLink),
					href: __props.item.webUrl,
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.detail.openInGitLab")), 1)]),
					_: 1
				}, 8, ["class", "href"])) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.meta) }, [
					__props.item.environmentName ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.metaItem)
					}, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.detail.promoteTo")), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						size: "small",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.item.environmentName), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true),
					__props.item.approver ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style.metaItem)
					}, [
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.detail.reviewer")), 1)]),
							_: 1
						}),
						createVNode(unref(N8nAvatar_default), {
							"first-name": __props.item.approver.firstName,
							"last-name": __props.item.approver.lastName,
							size: "xsmall"
						}, null, 8, ["first-name", "last-name"]),
						createVNode(unref(N8nText_default), { size: "small" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(formatUserDisplayName)(__props.item.approver)), 1)]),
							_: 1
						})
					], 2)) : createCommentVNode("", true),
					__props.item.requester ? (openBlock(), createElementBlock("span", {
						key: 2,
						class: normalizeClass(_ctx.$style.metaItem)
					}, [
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.detail.requestedBy")), 1)]),
							_: 1
						}),
						createVNode(unref(N8nAvatar_default), {
							"first-name": __props.item.requester.firstName,
							"last-name": __props.item.requester.lastName,
							size: "xsmall"
						}, null, 8, ["first-name", "last-name"]),
						createVNode(unref(N8nText_default), { size: "small" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(formatUserDisplayName)(__props.item.requester)), 1)]),
							_: 1
						})
					], 2)) : createCommentVNode("", true)
				], 2)], 2),
				__props.item.remoteError && !withoutEnvironment.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.gutter),
					theme: "warning",
					"data-test-id": "inbox-promotion-review-remote-error"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`inbox.promotionReview.detail.remoteError.${__props.item.remoteError}`)), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass([_ctx.$style.tabRow, _ctx.$style.gutter]) }, [createVNode(unref(Tabs_default), {
					"model-value": "changes",
					options: tabOptions.value,
					variant: "modern",
					"data-test-id": "inbox-promotion-review-tab-bar"
				}, null, 8, ["options"]), __props.item.state === "open" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.approve)
				}, [
					disabledReason.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						id: unref(disabledReasonId),
						size: "small",
						color: "text-light",
						"data-test-id": "inbox-promotion-review-approve-reason"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(disabledReason.value), 1)]),
						_: 1
					}, 8, ["id"])) : createCommentVNode("", true),
					canClose.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 1,
						variant: "outline",
						size: "small",
						disabled: closeDisabled.value,
						loading: closing.value,
						"data-test-id": "inbox-promotion-review-close",
						onClick: openClose
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.close.button")), 1)]),
						_: 1
					}, 8, ["disabled", "loading"])) : createCommentVNode("", true),
					createVNode(unref(N8nButton_default), {
						size: "small",
						disabled: approveDisabled.value || closing.value,
						loading: approving.value,
						"aria-describedby": approveDescribedBy.value,
						"data-test-id": "inbox-promotion-review-approve",
						onClick: openApproval
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.approve.button")), 1)]),
						_: 1
					}, 8, [
						"disabled",
						"loading",
						"aria-describedby"
					])
				], 2)) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.changesArea) }, [hasNewCommits.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 0,
					theme: "warning",
					slim: "",
					class: normalizeClass([_ctx.$style.newCommits, _ctx.$style.gutter]),
					"data-test-id": "inbox-promotion-review-new-commits"
				}, {
					trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						"data-test-id": "inbox-promotion-review-reload-changes",
						onClick: _cache[0] || (_cache[0] = ($event) => changesKey.value++)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.changes.reload")), 1)]),
						_: 1
					})]),
					default: withCtx(() => [createBaseVNode("span", { id: unref(newCommitsId) }, toDisplayString(unref(i18n).baseText("inbox.promotionReview.changes.newCommits")), 9, _hoisted_1$6)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), withoutEnvironment.value ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
					key: 1,
					class: normalizeClass(_ctx.$style.changes),
					icon: {
						type: "icon",
						value: endedAs.value === "merged" ? "check" : "circle-check"
					},
					heading: unref(i18n).baseText(`promotions.review.outcome.${endedAs.value}.title`),
					description: unref(i18n).baseText("inbox.promotionReview.changes.withoutEnvironment"),
					"data-test-id": "inbox-promotion-review-without-environment"
				}, null, 8, [
					"class",
					"icon",
					"heading",
					"description"
				])) : (openBlock(), createBlock(resolveDynamicComponent(PromotionChanges.value), {
					key: changesKey.value,
					class: normalizeClass(_ctx.$style.changes),
					"review-id": __props.item.id,
					onState: _cache[1] || (_cache[1] = ($event) => changes.value = $event)
				}, null, 40, ["class", "review-id"]))], 2),
				createVNode(unref(Dialog_default), {
					open: !!pendingApproval.value,
					size: "small",
					"show-close-button": false,
					"close-on-overlay-click": !approving.value,
					"close-on-escape": !approving.value,
					"onUpdate:open": closeApproval
				}, {
					default: withCtx(() => [createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.approve.confirm.title")), 1)]),
							_: 1
						}), createVNode(unref(DialogDescription_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.approve.confirm.description")), 1)]),
							_: 1
						})]),
						_: 1
					}), createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							label: unref(i18n).baseText("generic.cancel"),
							disabled: approving.value,
							onClick: closeApproval
						}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
							label: unref(i18n).baseText("inbox.promotionReview.approve.button"),
							loading: approving.value,
							onClick: onApprove
						}, null, 8, ["label", "loading"])]),
						_: 1
					})]),
					_: 1
				}, 8, [
					"open",
					"close-on-overlay-click",
					"close-on-escape"
				]),
				createVNode(unref(Dialog_default), {
					open: !!pendingClose.value,
					size: "small",
					"show-close-button": false,
					"close-on-overlay-click": !closing.value,
					"close-on-escape": !closing.value,
					"onUpdate:open": dismissClose
				}, {
					default: withCtx(() => [createVNode(unref(DialogHeader_default), null, {
						default: withCtx(() => [createVNode(unref(DialogTitle_default), { "data-test-id": "inbox-promotion-review-close-title" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(pendingClose.value?.title ? unref(i18n).baseText("inbox.promotionReview.close.confirm.titleNamed", { interpolate: { title: pendingClose.value.title } }) : unref(i18n).baseText("inbox.promotionReview.close.confirm.title")), 1)]),
							_: 1
						}), createVNode(unref(DialogDescription_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.promotionReview.close.confirm.description")), 1)]),
							_: 1
						})]),
						_: 1
					}), createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							label: unref(i18n).baseText("generic.cancel"),
							disabled: closing.value,
							"data-test-id": "inbox-promotion-review-close-cancel",
							onClick: dismissClose
						}, null, 8, ["label", "disabled"]), createVNode(unref(N8nButton_default), {
							variant: "destructive",
							label: unref(i18n).baseText("inbox.promotionReview.close.button"),
							loading: closing.value,
							"data-test-id": "inbox-promotion-review-close-confirm",
							onClick: onClose
						}, null, 8, ["label", "loading"])]),
						_: 1
					})]),
					_: 1
				}, 8, [
					"open",
					"close-on-overlay-click",
					"close-on-escape"
				])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	detail: "_detail_ax3lo_1",
	tabRow: "_tabRow_ax3lo_9",
	changesArea: "_changesArea_ax3lo_22",
	newCommits: "_newCommits_ax3lo_31",
	changes: "_changes_ax3lo_22",
	gutter: "_gutter_ax3lo_42",
	header: "_header_ax3lo_46",
	titleRow: "_titleRow_ax3lo_52",
	title: "_title_ax3lo_52",
	titleText: "_titleText_ax3lo_69",
	stateBadge: "_stateBadge_ax3lo_73",
	approve: "_approve_ax3lo_78",
	gitlabLink: "_gitlabLink_ax3lo_85",
	meta: "_meta_ax3lo_91",
	metaItem: "_metaItem_ax3lo_97"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/SelfHealingResultActivity.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$5 = ["data-action"];
var _hoisted_2$1 = ["datetime"];
var SelfHealingResultActivity_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SelfHealingResultActivity",
	props: { detail: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const entries = computed(() => {
			const result = props.detail;
			let activity;
			const [suggestion] = result.suggestions;
			if (suggestion) activity = [...suggestion.activity];
			else activity = [{
				id: `${result.resultId}:completed`,
				action: "completed",
				author: "assistant",
				actorId: null,
				createdAt: result.completedAt
			}];
			if (result.reviewState === "closed") activity.push({
				id: `${result.resultId}:closed`,
				action: "closed",
				author: "system",
				actorId: null,
				createdAt: result.completedAt
			});
			if (!suggestion && result.reviewState === "dismissed") activity.push({
				id: `${result.resultId}:dismissed`,
				action: "dismissed",
				author: "human",
				actorId: null,
				createdAt: result.updatedAt
			});
			return activity.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
		});
		function actorLabel(author) {
			if (author === "assistant") return i18n.baseText("inbox.selfHealing.metadata.assistant");
			if (author === "system") return i18n.baseText("inbox.selfHealing.activity.system");
			return i18n.baseText("inbox.selfHealing.activity.user");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.activity) }, [createVNode(unref(N8nText_default), {
				tag: "h3",
				bold: "",
				size: "medium",
				color: "text-light",
				class: normalizeClass(_ctx.$style.heading)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.tabs.activity")), 1)]),
				_: 1
			}, 8, ["class"]), createBaseVNode("ol", {
				class: normalizeClass(_ctx.$style.entries),
				"data-test-id": "self-healing-activity"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(entries.value, (entry) => {
				return openBlock(), createElementBlock("li", {
					key: entry.id,
					class: normalizeClass(_ctx.$style.entry),
					"data-action": entry.action,
					"data-test-id": "self-healing-activity-entry"
				}, [entry.author === "assistant" ? (openBlock(), createBlock(unref(AskAssistantAvatar_default), {
					key: 0,
					size: "mini"
				})) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: entry.author === "human" ? "user" : "info",
					size: "large",
					color: "text-light",
					"aria-hidden": "true"
				}, null, 8, ["icon"])), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headline) }, [
					createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-dark"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(actorLabel(entry.author)), 1)]),
						_: 2
					}, 1024),
					createBaseVNode("span", {
						"aria-hidden": "true",
						class: normalizeClass(_ctx.$style.separator)
					}, "|", 2),
					createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`inbox.selfHealing.activity.${entry.action}`)), 1)]),
						_: 2
					}, 1024),
					createVNode(unref(N8nText_default), {
						size: "medium",
						color: "text-light"
					}, {
						default: withCtx(() => [createBaseVNode("time", { datetime: entry.createdAt }, [createVNode(unref(N8nTimeAgo_default), {
							date: entry.createdAt,
							locale: unref(rootStore).defaultLocale
						}, null, 8, ["date", "locale"])], 8, _hoisted_2$1)]),
						_: 2
					}, 1024)
				], 2)], 10, _hoisted_1$5);
			}), 128))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	activity: "_activity_1sa11_10",
	heading: "_heading_1sa11_17",
	entries: "_entries_1sa11_22",
	entry: "_entry_1sa11_31",
	headline: "_headline_1sa11_52",
	separator: "_separator_1sa11_64"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/SelfHealingWorkflowLinks.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = ["onClick"];
var SelfHealingWorkflowLinks_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SelfHealingWorkflowLinks",
	props: { workflows: {} },
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const parts = computed(() => {
			const names = new Map(props.workflows.map(({ workflowId, name }) => [workflowId, name]));
			return new Intl.ListFormat(i18n.locale, {
				style: "long",
				type: "conjunction"
			}).formatToParts(props.workflows.map(({ workflowId }) => workflowId)).map((part) => part.type === "element" ? {
				workflowId: part.value,
				text: names.get(part.value) ?? part.value
			} : { text: part.value });
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(parts.value, (part, index) => {
				return openBlock(), createElementBlock(Fragment, { key: index }, [part.workflowId ? (openBlock(), createElementBlock("button", {
					key: 0,
					type: "button",
					class: normalizeClass(_ctx.$style.link),
					"data-test-id": "self-healing-changes-workflow-link",
					onClick: ($event) => part.workflowId && emit("select", part.workflowId)
				}, toDisplayString(part.text), 11, _hoisted_1$4)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(part.text), 1)], 64))], 64);
			}), 128))]);
		};
	}
}), [["__cssModules", { "$style": { link: "_link_19ok3_1" } }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/selfHealingWorkflowTree.ts
/**
* The workflows of a fix, top to bottom. Each workflow appears once, below its nearest caller.
* Other callers, also the callers that close a cycle, are only in `callerIds`.
*/
function buildWorkflowTree(detail) {
	const suggestions = new Map(detail.suggestions.map((item) => [item.workflowId, item]));
	const listed = new Set([...detail.workflows, ...detail.suggestions].map(({ workflowId }) => workflowId));
	const calledIds = /* @__PURE__ */ new Map();
	const callerIds = /* @__PURE__ */ new Map();
	for (const { callerWorkflowId: caller, calledWorkflowId: called } of detail.calls) {
		if (caller === called || !listed.has(caller) || !listed.has(called)) continue;
		calledIds.set(caller, [...calledIds.get(caller) ?? [], called]);
		callerIds.set(called, [...callerIds.get(called) ?? [], caller]);
	}
	const roots = [];
	const children = /* @__PURE__ */ new Map();
	const placed = /* @__PURE__ */ new Set();
	for (const root of listed) {
		if (placed.has(root)) continue;
		roots.push(root);
		placed.add(root);
		const queue = [root];
		for (const caller of queue) for (const called of calledIds.get(caller) ?? []) {
			if (placed.has(called)) continue;
			placed.add(called);
			children.set(caller, [...children.get(caller) ?? [], called]);
			queue.push(called);
		}
	}
	const rows = (workflowId, indent) => [{
		workflowId,
		suggestion: suggestions.get(workflowId),
		indent,
		callerIds: callerIds.get(workflowId) ?? []
	}, ...(children.get(workflowId) ?? []).flatMap((child) => rows(child, indent + 1))];
	return roots.flatMap((root) => rows(root, 0));
}
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/SelfHealingResultChanges.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = ["aria-label"];
var _hoisted_2 = ["title"];
var _hoisted_3 = [
	"title",
	"aria-current",
	"onClick"
];
var _hoisted_4 = ["data-entry-id"];
var SCROLL_SETTLE_MS = 150;
var SelfHealingResultChanges_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SelfHealingResultChanges",
	props: {
		detail: {},
		workflowNames: {},
		projectName: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const router = useRouter();
		const WorkflowDiffView = computed(() => get("workflow-diff"));
		const nameOf = (workflowId) => props.workflowNames.get(workflowId) ?? workflowId;
		const entries = computed(() => buildWorkflowTree(props.detail).map(({ workflowId, suggestion, indent, callerIds }) => {
			const isFailing = workflowId === props.detail.workflowId;
			return {
				workflowId,
				suggestion,
				indent: props.projectName ? indent + 1 : indent,
				name: nameOf(workflowId),
				callers: callerIds.map((callerId) => ({
					workflowId: callerId,
					name: nameOf(callerId)
				})),
				href: router.resolve({
					name: VIEWS.WORKFLOW,
					params: { workflowId }
				}).href,
				role: i18n.baseText(isFailing ? "inbox.selfHealing.changes.failingWorkflow" : "inbox.selfHealing.changes.subWorkflow")
			};
		}));
		const isMultiple = computed(() => entries.value.length > 1);
		const hasSuggestion = computed(() => props.detail.suggestions.length > 0);
		const collapsedIds = ref(/* @__PURE__ */ new Set());
		function setOpen(workflowId, open) {
			if (open) collapsedIds.value.delete(workflowId);
			else collapsedIds.value.add(workflowId);
		}
		const panes = ref(null);
		const treeResizer = useResizablePanel({
			container: panes,
			width: {
				localStorageKey: "N8N_SELF_HEALING_CHANGES_NAV_WIDTH",
				defaultSize: (size) => Math.min(Math.max(size * .28, 240), 360),
				minSize: 200,
				maxSize: (size) => Math.min(size * .5, 640),
				snap: true
			}
		});
		const list = ref(null);
		const cardElements = ref([]);
		const activeId = ref();
		const visibleIds = ref(/* @__PURE__ */ new Set());
		const { isPending: scrollingToCard, start: holdActiveCard } = useTimeout(SCROLL_SETTLE_MS, {
			controls: true,
			immediate: false
		});
		const { isSupported: canObserve } = useIntersectionObserver(cardElements, (records) => {
			const next = new Set(visibleIds.value);
			for (const record of records) {
				const id = record.target.getAttribute("data-entry-id");
				if (!id) continue;
				if (record.isIntersecting) next.add(id);
				else next.delete(id);
			}
			visibleIds.value = next;
		}, {
			root: list,
			rootMargin: "50% 0px"
		});
		function cardsOf(container) {
			return [...container.querySelectorAll("[data-entry-id]")];
		}
		function syncActive() {
			if (scrollingToCard.value) {
				holdActiveCard();
				return;
			}
			const container = list.value;
			if (!container) return;
			const cards = cardsOf(container);
			if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
				activeId.value = cards.at(-1)?.dataset.entryId;
				return;
			}
			const probe = container.getBoundingClientRect().top + container.clientHeight / 3;
			const current = cards.filter((card) => card.getBoundingClientRect().top <= probe).at(-1);
			activeId.value = (current ?? cards[0])?.dataset.entryId;
		}
		async function select(workflowId) {
			activeId.value = workflowId;
			if (collapsedIds.value.has(workflowId)) {
				setOpen(workflowId, true);
				await nextTick();
			}
			const container = list.value;
			if (!container) return;
			const card = cardsOf(container).find((item) => item.dataset.entryId === workflowId);
			holdActiveCard();
			card?.scrollIntoView({ block: "start" });
		}
		const workflowIds = computed(() => entries.value.map(({ workflowId }) => workflowId));
		watch(() => workflowIds.value.join(), () => {
			activeId.value = workflowIds.value[0];
			collapsedIds.value = /* @__PURE__ */ new Set();
		}, { immediate: true });
		return (_ctx, _cache) => {
			return !WorkflowDiffView.value || !hasSuggestion.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "warning"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.changes.unavailable")), 1)]),
				_: 1
			})) : (openBlock(), createElementBlock("div", {
				key: 1,
				ref_key: "panes",
				ref: panes,
				class: normalizeClass(_ctx.$style.panes),
				"data-test-id": "self-healing-changes-list"
			}, [isMultiple.value ? (openBlock(), createBlock(unref(N8nResizeWrapper_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.treePane),
				style: normalizeStyle({ width: `${unref(treeResizer).width.value}px` }),
				resizer: unref(treeResizer),
				"supported-directions": ["right"]
			}, {
				default: withCtx(() => [createBaseVNode("nav", {
					class: normalizeClass(_ctx.$style.tree),
					"aria-label": unref(i18n).baseText("inbox.selfHealing.changes.navigation")
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.heading) }, [createVNode(unref(N8nText_default), {
					step: "2xs",
					bold: "",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.changes.workflows")), 1)]),
					_: 1
				})], 2), createBaseVNode("ul", {
					class: normalizeClass(_ctx.$style.list),
					role: "list"
				}, [__props.projectName ? (openBlock(), createElementBlock("li", {
					key: 0,
					class: normalizeClass([_ctx.$style.row, _ctx.$style.project]),
					"data-test-id": "self-healing-changes-project"
				}, [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.name),
					title: __props.projectName
				}, [createVNode(unref(N8nIcon_default), {
					icon: "layers",
					size: "small",
					class: normalizeClass(_ctx.$style.icon)
				}, null, 8, ["class"]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.text) }, [createVNode(unref(N8nText_default), {
					step: "xs",
					color: "text-dark",
					class: normalizeClass(_ctx.$style.label)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.projectName), 1)]),
					_: 1
				}, 8, ["class"])], 2)], 10, _hoisted_2)], 2)) : createCommentVNode("", true), (openBlock(true), createElementBlock(Fragment, null, renderList(entries.value, (entry) => {
					return openBlock(), createElementBlock("li", {
						key: entry.workflowId,
						class: normalizeClass([_ctx.$style.row, { [_ctx.$style.inspected]: activeId.value === entry.workflowId }])
					}, [createBaseVNode("button", {
						type: "button",
						class: normalizeClass([_ctx.$style.name, _ctx.$style.select]),
						style: normalizeStyle({ "--changes-tree--indent": entry.indent }),
						title: entry.name,
						"aria-current": activeId.value === entry.workflowId ? "true" : void 0,
						"data-test-id": "self-healing-changes-nav-item",
						onClick: ($event) => select(entry.workflowId)
					}, [createVNode(unref(N8nIcon_default), {
						icon: "workflow",
						size: "small",
						class: normalizeClass(_ctx.$style.icon)
					}, null, 8, ["class"]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.text) }, [createVNode(unref(N8nText_default), {
						step: "xs",
						color: "text-dark",
						class: normalizeClass(_ctx.$style.label)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(entry.name), 1)]),
						_: 2
					}, 1032, ["class"]), !entry.suggestion ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						step: "2xs",
						color: "text-light",
						class: normalizeClass(_ctx.$style.meta)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.changes.unchanged")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)], 2)], 14, _hoisted_3)], 2);
				}), 128))], 2)], 10, _hoisted_1$3)]),
				_: 1
			}, 8, [
				"class",
				"style",
				"resizer"
			])) : createCommentVNode("", true), createBaseVNode("div", {
				ref_key: "list",
				ref: list,
				class: normalizeClass([_ctx.$style.cards, { [_ctx.$style.single]: !isMultiple.value }]),
				onScrollPassive: syncActive
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(entries.value, (entry) => {
				return openBlock(), createBlock(unref(CollapsibleRoot_default), {
					key: entry.workflowId,
					open: !collapsedIds.value.has(entry.workflowId),
					"as-child": "",
					"onUpdate:open": ($event) => setOpen(entry.workflowId, $event)
				}, {
					default: withCtx(() => [createBaseVNode("article", {
						ref_for: true,
						ref_key: "cardElements",
						ref: cardElements,
						class: normalizeClass([_ctx.$style.card, { [_ctx.$style.inspected]: isMultiple.value && activeId.value === entry.workflowId }]),
						"data-entry-id": entry.workflowId,
						"data-test-id": "self-healing-changes-card"
					}, [createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
						tag: "h3",
						size: "medium",
						class: normalizeClass(_ctx.$style.headingLevel)
					}, {
						default: withCtx(() => [(openBlock(), createBlock(resolveDynamicComponent(isMultiple.value ? unref(CollapsibleTrigger_default) : "span"), {
							class: normalizeClass([_ctx.$style.trigger, { [_ctx.$style.toggle]: isMultiple.value }]),
							"data-test-id": "self-healing-changes-card-toggle"
						}, {
							default: withCtx(() => [
								createVNode(unref(N8nIcon_default), {
									icon: "workflow",
									size: "small",
									class: normalizeClass(_ctx.$style.icon)
								}, null, 8, ["class"]),
								createBaseVNode("span", { class: normalizeClass(_ctx.$style.cardHeading) }, [createVNode(unref(N8nText_default), {
									bold: "",
									size: "medium",
									color: "text-dark",
									title: entry.name,
									class: normalizeClass(_ctx.$style.label)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(entry.name), 1)]),
									_: 2
								}, 1032, ["title", "class"]), createVNode(unref(N8nText_default), {
									step: "xs",
									color: "text-light",
									class: normalizeClass(_ctx.$style.meta)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(entry.role), 1)]),
									_: 2
								}, 1032, ["class"])], 2),
								isMultiple.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
									key: 0,
									icon: "chevron-down",
									size: "small",
									class: normalizeClass(_ctx.$style.chevron)
								}, null, 8, ["class"])) : createCommentVNode("", true)
							]),
							_: 2
						}, 1032, ["class"]))]),
						_: 2
					}, 1032, ["class"]), createVNode(unref(N8nLink_default), {
						to: entry.href,
						"aria-label": unref(i18n).baseText("inbox.selfHealing.changes.openWorkflowLabel", { interpolate: { name: entry.name } }),
						"new-window": "",
						theme: "text",
						size: "small",
						underline: false,
						class: normalizeClass(_ctx.$style.openLink)
					}, {
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.openLinkText) }, [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.changes.openWorkflow")) + " ", 1), createVNode(unref(N8nIcon_default), {
							icon: "external-link",
							size: "small"
						})], 2)]),
						_: 1
					}, 8, [
						"to",
						"aria-label",
						"class"
					])], 2), createVNode(unref(CollapsibleContent_default), { class: normalizeClass(_ctx.$style.body) }, {
						default: withCtx(() => [entry.suggestion ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.diff)
						}, [!unref(canObserve) || visibleIds.value.has(entry.workflowId) ? (openBlock(), createBlock(resolveDynamicComponent(WorkflowDiffView.value), {
							key: 0,
							"source-snapshot": entry.suggestion.payload.original,
							"target-snapshot": entry.suggestion.payload.proposed,
							"workflow-id": entry.workflowId,
							"workflow-name": entry.name,
							"source-label": unref(i18n).baseText("inbox.selfHealing.changes.original"),
							"target-label": unref(i18n).baseText("inbox.selfHealing.changes.proposed"),
							"canvas-id-prefix": entry.suggestion.suggestionId,
							"require-canvas-focus": isMultiple.value,
							"hide-title": "",
							"show-fullscreen-button": ""
						}, null, 8, [
							"source-snapshot",
							"target-snapshot",
							"workflow-id",
							"workflow-name",
							"source-label",
							"target-label",
							"canvas-id-prefix",
							"require-canvas-focus"
						])) : createCommentVNode("", true)], 2)) : (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							tag: "div",
							step: "xs",
							color: "text-light",
							class: normalizeClass(_ctx.$style.padded),
							"data-test-id": "self-healing-changes-card-unchanged"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.changes.noChanges")), 1)]),
							_: 1
						}, 8, ["class"])), entry.callers.length > 0 ? (openBlock(), createElementBlock("footer", {
							key: 2,
							class: normalizeClass(_ctx.$style.footer)
						}, [createVNode(unref(N8nText_default), {
							step: "2xs",
							color: "text-light",
							"data-test-id": "self-healing-changes-card-callers"
						}, {
							default: withCtx(() => [createVNode(unref(I18nT), {
								keypath: "inbox.selfHealing.changes.calledBy",
								scope: "global"
							}, {
								names: withCtx(() => [createVNode(SelfHealingWorkflowLinks_default, {
									workflows: entry.callers,
									onSelect: select
								}, null, 8, ["workflows"])]),
								_: 2
							}, 1024)]),
							_: 2
						}, 1024)], 2)) : createCommentVNode("", true)]),
						_: 2
					}, 1032, ["class"])], 10, _hoisted_4)]),
					_: 2
				}, 1032, ["open", "onUpdate:open"]);
			}), 128))], 34)], 2));
		};
	}
}), [["__cssModules", { "$style": {
	panes: "_panes_p7wsa_450",
	treePane: "_treePane_p7wsa_458",
	tree: "_tree_p7wsa_458",
	list: "_list_p7wsa_475",
	heading: "_heading_p7wsa_481",
	row: "_row_p7wsa_488",
	project: "_project_p7wsa_496",
	inspected: "_inspected_p7wsa_500",
	name: "_name_p7wsa_505",
	select: "_select_p7wsa_515",
	icon: "_icon_p7wsa_528",
	text: "_text_p7wsa_533",
	label: "_label_p7wsa_540",
	meta: "_meta_p7wsa_547",
	cards: "_cards_p7wsa_552",
	card: "_card_p7wsa_552",
	header: "_header_p7wsa_584",
	headingLevel: "_headingLevel_p7wsa_595",
	trigger: "_trigger_p7wsa_603",
	toggle: "_toggle_p7wsa_611",
	cardHeading: "_cardHeading_p7wsa_623",
	chevron: "_chevron_p7wsa_630",
	openLink: "_openLink_p7wsa_645",
	openLinkText: "_openLinkText_p7wsa_649",
	body: "_body_p7wsa_655",
	diff: "_diff_p7wsa_660",
	padded: "_padded_p7wsa_664",
	footer: "_footer_p7wsa_668",
	single: "_single_p7wsa_673",
	shimmer: "_shimmer_p7wsa_1",
	spin: "_spin_p7wsa_1",
	"skeleton-pulse": "_skeleton-pulse_p7wsa_1",
	opacityPulse: "_opacityPulse_p7wsa_1",
	popoverIn: "_popoverIn_p7wsa_1",
	fadeIn: "_fadeIn_p7wsa_1",
	collapsibleSlideDown: "_collapsibleSlideDown_p7wsa_1",
	collapsibleSlideUp: "_collapsibleSlideUp_p7wsa_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_p7wsa_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_p7wsa_1",
	blurSwapIn: "_blurSwapIn_p7wsa_1",
	blurSwapOut: "_blurSwapOut_p7wsa_1",
	pulse: "_pulse_p7wsa_1",
	pulseGlow: "_pulseGlow_p7wsa_1",
	pulseGlowDelayed: "_pulseGlowDelayed_p7wsa_1",
	fade: "_fade_p7wsa_1",
	fadeInUp: "_fadeInUp_p7wsa_1",
	fadeInDown: "_fadeInDown_p7wsa_1",
	fadeInLeft: "_fadeInLeft_p7wsa_1",
	fadeInRight: "_fadeInRight_p7wsa_1",
	fadeOut: "_fadeOut_p7wsa_1",
	fadeOutDown: "_fadeOutDown_p7wsa_1",
	fadeOutUp: "_fadeOutUp_p7wsa_1",
	fadeOutLeft: "_fadeOutLeft_p7wsa_1",
	fadeOutRight: "_fadeOutRight_p7wsa_1",
	ping: "_ping_p7wsa_1",
	blinkBackground: "_blinkBackground_p7wsa_1",
	typingBlink: "_typingBlink_p7wsa_1"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/SelfHealingResultMetadata.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = ["data-test-id"];
var SelfHealingResultMetadata_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SelfHealingResultMetadata",
	props: {
		detail: {},
		workflowNames: {},
		statusLabel: {},
		statusClass: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const workflowName = computed(() => props.workflowNames.get(props.detail.workflowId) ?? props.detail.workflowId);
		const subWorkflows = computed(() => props.detail.suggestions.filter(({ workflowId }) => workflowId !== props.detail.workflowId).map(({ workflowId }) => ({
			id: workflowId,
			name: props.workflowNames.get(workflowId) ?? workflowId
		})));
		const usageRows = computed(() => {
			const usage = props.detail.usage;
			const rows = ("credits" in usage ? [{
				key: "credits",
				label: i18n.baseText("inbox.selfHealing.usage.credits"),
				value: usage.credits
			}] : [
				{
					key: "promptTokens",
					label: i18n.baseText("inbox.selfHealing.usage.promptTokens"),
					value: usage.promptTokens
				},
				{
					key: "completionTokens",
					label: i18n.baseText("inbox.selfHealing.usage.completionTokens"),
					value: usage.completionTokens
				},
				{
					key: "totalTokens",
					label: i18n.baseText("inbox.selfHealing.usage.totalTokens"),
					value: usage.totalTokens
				}
			]).flatMap((row) => {
				if (row.value === null) return [];
				return [{
					...row,
					value: row.value.toLocaleString(rootStore.defaultLocale)
				}];
			});
			if (usage.durationSeconds !== null) rows.push({
				key: "duration",
				label: i18n.baseText("inbox.selfHealing.usage.duration"),
				value: i18n.baseText("inbox.selfHealing.usage.durationValue", { interpolate: {
					minutes: String(Math.floor(usage.durationSeconds / 60)),
					seconds: String(Math.floor(usage.durationSeconds % 60))
				} })
			});
			return rows;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				class: normalizeClass(_ctx.$style.metadata),
				"data-test-id": "self-healing-metadata"
			}, [
				createVNode(unref(N8nCard_default), {
					class: normalizeClass(_ctx.$style.card),
					"data-test-id": "self-healing-status-card"
				}, {
					header: withCtx(() => [createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-light",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.metadata.status")), 1)]),
						_: 1
					})]),
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.status) }, [createBaseVNode("span", {
						class: normalizeClass([_ctx.$style.statusDot, _ctx.$style[__props.statusClass]]),
						"aria-hidden": "true"
					}, null, 2), createVNode(unref(N8nText_default), { size: "medium" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.statusLabel), 1)]),
						_: 1
					})], 2)]),
					_: 1
				}, 8, ["class"]),
				createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.card) }, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-light",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.metadata.createdBy")), 1)]),
						_: 1
					}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.person) }, [createVNode(unref(AskAssistantAvatar_default), { size: "small" }), createVNode(unref(N8nText_default), { size: "medium" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.metadata.assistant")), 1)]),
						_: 1
					})], 2)], 2)]),
					_: 1
				}, 8, ["class"]),
				createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.card) }, {
					header: withCtx(() => [createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-light",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.metadata.workflow")), 1)]),
						_: 1
					})]),
					default: withCtx(() => [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nLink_default), {
							to: {
								name: unref(VIEWS).WORKFLOW,
								params: { workflowId: __props.detail.workflowId }
							},
							theme: "text",
							size: "medium",
							underline: false,
							class: normalizeClass(_ctx.$style.plainLink),
							"data-test-id": "self-healing-workflow-link"
						}, {
							default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.link) }, [createVNode(unref(N8nIcon_default), {
								icon: "workflow",
								size: "medium",
								class: normalizeClass(_ctx.$style.linkIcon)
							}, null, 8, ["class"]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.linkLabel) }, toDisplayString(workflowName.value), 3)], 2)]),
							_: 1
						}, 8, ["to", "class"])], 2),
						subWorkflows.value.length > 0 ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.section)
						}, [createVNode(unref(N8nText_default), {
							bold: "",
							color: "text-light",
							size: "medium"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.metadata.subWorkflows")), 1)]),
							_: 1
						}), (openBlock(true), createElementBlock(Fragment, null, renderList(subWorkflows.value, (subWorkflow) => {
							return openBlock(), createBlock(unref(N8nLink_default), {
								key: subWorkflow.id,
								to: {
									name: unref(VIEWS).WORKFLOW,
									params: { workflowId: subWorkflow.id }
								},
								theme: "text",
								size: "medium",
								underline: false,
								class: normalizeClass(_ctx.$style.plainLink),
								"data-test-id": "self-healing-sub-workflow-link"
							}, {
								default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.link) }, [createVNode(unref(N8nIcon_default), {
									icon: "workflow",
									size: "medium",
									class: normalizeClass(_ctx.$style.linkIcon)
								}, null, 8, ["class"]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.linkLabel) }, toDisplayString(subWorkflow.name), 3)], 2)]),
								_: 2
							}, 1032, ["to", "class"]);
						}), 128))], 2)) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nText_default), {
							bold: "",
							color: "text-light",
							size: "medium"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.metadata.execution")), 1)]),
							_: 1
						}), __props.detail.execution.status === "available" ? (openBlock(), createBlock(unref(N8nLink_default), {
							key: 0,
							to: {
								name: unref(VIEWS).EXECUTION_PREVIEW,
								params: {
									workflowId: __props.detail.workflowId,
									executionId: __props.detail.execution.id
								}
							},
							theme: "text",
							size: "medium",
							underline: false,
							class: normalizeClass(_ctx.$style.plainLink),
							"data-test-id": "self-healing-execution-link"
						}, {
							default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.link) }, [createVNode(unref(N8nIcon_default), {
								icon: "flag-hole",
								size: "medium",
								class: normalizeClass(_ctx.$style.linkIcon)
							}, null, 8, ["class"]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.linkLabel) }, toDisplayString(unref(i18n).baseText("inbox.selfHealing.metadata.executionLink", { interpolate: { id: __props.detail.execution.id } })), 3)], 2)]),
							_: 1
						}, 8, ["to", "class"])) : (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "medium",
							class: normalizeClass(_ctx.$style.link),
							"data-test-id": "self-healing-execution-unavailable"
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "flag-hole",
								size: "medium",
								class: normalizeClass(_ctx.$style.linkIcon)
							}, null, 8, ["class"]), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("inbox.selfHealing.metadata.executionUnavailable")), 1)]),
							_: 1
						}, 8, ["class"]))], 2)
					]),
					_: 1
				}, 8, ["class"]),
				usageRows.value.length ? (openBlock(), createBlock(unref(N8nCard_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.card),
					"data-test-id": "self-healing-usage"
				}, {
					header: withCtx(() => [createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-light",
						size: "medium"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.usage.title")), 1)]),
						_: 1
					})]),
					default: withCtx(() => [createBaseVNode("dl", { class: normalizeClass(_ctx.$style.usage) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(usageRows.value, (row) => {
						return openBlock(), createElementBlock("div", {
							key: row.key,
							class: normalizeClass(_ctx.$style.measurement),
							"data-test-id": `self-healing-usage-${row.key}`
						}, [createVNode(unref(N8nText_default), {
							tag: "dt",
							size: "medium"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(row.label), 1)]),
							_: 2
						}, 1024), createVNode(unref(N8nText_default), {
							tag: "dd",
							size: "medium"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(row.value), 1)]),
							_: 2
						}, 1024)], 10, _hoisted_1$2);
					}), 128))], 2)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	metadata: "_metadata_1s9tj_1",
	card: "_card_1s9tj_12",
	status: "_status_1s9tj_25",
	statusDot: "_statusDot_1s9tj_31",
	fixReady: "_fixReady_1s9tj_38",
	needsAttention: "_needsAttention_1s9tj_42",
	closed: "_closed_1s9tj_46",
	section: "_section_1s9tj_50",
	person: "_person_1s9tj_62",
	link: "_link_1s9tj_63",
	plainLink: "_plainLink_1s9tj_76",
	linkIcon: "_linkIcon_1s9tj_85",
	linkLabel: "_linkLabel_1s9tj_91",
	usage: "_usage_1s9tj_96",
	measurement: "_measurement_1s9tj_103"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/SelfHealingResultContent.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$1 = ["aria-label"];
var SelfHealingResultContent_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SelfHealingResultContent",
	props: {
		detail: {},
		workflowNames: {},
		projectName: {},
		tab: {},
		pendingAction: {},
		publishAccess: {},
		canChat: { type: Boolean }
	},
	emits: ["action", "update:tab"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const reportOptions = {
			markdown: {
				html: false,
				linkify: true,
				breaks: true
			},
			linkAttributes: { attrs: {
				target: "_blank",
				rel: "noopener noreferrer"
			} },
			tasklists: { enabled: false },
			youtube: {}
		};
		const isOpen = computed(() => props.detail.reviewState === "open");
		const isFixReady = computed(() => props.detail.outcome === "fix_ready");
		const hasSuggestion = computed(() => props.detail.suggestions.length > 0);
		const isMultiWorkflow = computed(() => props.detail.suggestions.length > 1);
		const outdatedBody = computed(() => i18n.baseText(isMultiWorkflow.value ? "inbox.selfHealing.state.outdated.bodyMultiple" : "inbox.selfHealing.state.outdated.body"));
		const activeTab = computed(() => props.tab === "changes" && hasSuggestion.value ? "changes" : "activity");
		const pending = computed(() => props.pendingAction !== null);
		const continuing = computed(() => pending.value && props.pendingAction !== "dismiss");
		const outcomeLabel = computed(() => {
			switch (props.detail.outcome) {
				case "fix_ready": return i18n.baseText("inbox.outcome.fixReady");
				case "needs_you": return i18n.baseText("inbox.outcome.needsAttention");
				case "could_not_fix": return i18n.baseText("inbox.outcome.couldNotFix");
			}
		});
		const statusLabel = computed(() => {
			const state = props.detail.reviewState;
			if (state === "open" || state === "closed") return outcomeLabel.value;
			return i18n.baseText(`inbox.selfHealing.state.${state}`);
		});
		const statusClass = computed(() => {
			if (!isOpen.value) return "closed";
			return isFixReady.value ? "fixReady" : "needsAttention";
		});
		const tabOptions = computed(() => [{
			label: i18n.baseText("inbox.selfHealing.tabs.activity"),
			value: "activity"
		}, ...hasSuggestion.value ? [{
			label: i18n.baseText("inbox.selfHealing.tabs.changes"),
			value: "changes",
			...isMultiWorkflow.value ? { tag: String(props.detail.suggestions.length) } : {}
		}] : []]);
		const menuItems = computed(() => {
			const continuation = [{
				id: "chat",
				label: i18n.baseText("inbox.selfHealing.action.continueWithAssistant"),
				icon: {
					type: "icon",
					value: "message-circle-plus"
				},
				disabled: !props.canChat,
				divided: isFixReady.value
			}, {
				id: "editor",
				label: i18n.baseText("inbox.selfHealing.action.continueWithEditor"),
				icon: {
					type: "icon",
					value: "square-pen"
				}
			}];
			if (!isFixReady.value) return continuation;
			return [{
				id: "approve-and-publish",
				label: i18n.baseText("inbox.selfHealing.action.applyAndPublish"),
				icon: {
					type: "icon",
					value: "check"
				},
				disabled: props.publishAccess !== "allowed"
			}, ...continuation];
		});
		const menuNotes = computed(() => [
			...hasSuggestion.value ? [i18n.baseText("inbox.selfHealing.action.continueSavesDraft")] : [],
			...isFixReady.value && props.publishAccess === "denied" ? [i18n.baseText("inbox.selfHealing.action.publishUnavailable")] : [],
			...props.canChat ? [] : [i18n.baseText("inbox.selfHealing.action.chatUnavailable")]
		]);
		function onTabChange(tab) {
			if (tab === "activity" || tab === "changes") emit("update:tab", tab);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.detail),
				"data-test-id": "self-healing-result-content"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnTitle) }, [createBaseVNode("span", {
					class: normalizeClass([_ctx.$style.statusDot, _ctx.$style[statusClass.value]]),
					role: "img",
					"aria-label": statusLabel.value
				}, null, 10, _hoisted_1$1), createVNode(unref(N8nHeading_default), {
					bold: "",
					tag: "h2",
					size: "xlarge",
					"data-test-id": "self-healing-result-title"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.detail.summary), 1)]),
					_: 1
				})], 2),
				renderSlot(_ctx.$slots, "notice"),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.container) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.tabRow) }, [createVNode(unref(Tabs_default), {
					"model-value": activeTab.value,
					options: tabOptions.value,
					variant: "modern",
					"data-test-id": "self-healing-result-tabs",
					"onUpdate:modelValue": onTabChange
				}, null, 8, ["model-value", "options"]), isOpen.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.actions)
				}, [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					label: unref(i18n).baseText("inbox.selfHealing.action.discardAndClose"),
					disabled: pending.value,
					loading: __props.pendingAction === "dismiss",
					"data-test-id": "self-healing-discard",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("action", "dismiss"))
				}, null, 8, [
					"label",
					"disabled",
					"loading"
				]), createVNode(unref(DropdownMenu_default), {
					items: menuItems.value,
					placement: "bottom-end",
					disabled: pending.value,
					"content-test-id": "self-healing-review-menu",
					onSelect: _cache[1] || (_cache[1] = ($event) => emit("action", $event))
				}, createSlots({
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						size: "small",
						disabled: pending.value,
						"data-test-id": "self-healing-review-trigger"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(isFixReady.value ? "inbox.selfHealing.action.review" : "inbox.selfHealing.action.continueIn")) + " ", 1), createVNode(unref(N8nIcon_default), {
							icon: continuing.value ? "loader" : "chevron-down",
							spin: continuing.value
						}, null, 8, ["icon", "spin"])]),
						_: 1
					}, 8, ["disabled"])]),
					_: 2
				}, [menuNotes.value.length ? {
					name: "footer",
					fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.menuNotes) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(menuNotes.value, (note) => {
						return openBlock(), createBlock(unref(N8nText_default), {
							key: note,
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(note), 1)]),
							_: 2
						}, 1024);
					}), 128))], 2)]),
					key: "0"
				} : void 0]), 1032, ["items", "disabled"])], 2)) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass([_ctx.$style.detailBody, { [_ctx.$style.flush]: activeTab.value === "changes" }]) }, [activeTab.value === "activity" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.activityPanel),
					"data-test-id": "self-healing-activity-panel"
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.reportCard) }, [
						createVNode(unref(N8nText_default), {
							tag: "h3",
							bold: "",
							color: "text-light",
							size: "medium"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.report")), 1)]),
							_: 1
						}),
						__props.detail.outcome === "could_not_fix" ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "danger",
							"data-test-id": "self-healing-outcome-notice"
						}, {
							default: withCtx(() => [createBaseVNode("strong", { class: normalizeClass(_ctx.$style.noticeTitle) }, toDisplayString(outcomeLabel.value), 3), createTextVNode(" " + toDisplayString(unref(i18n).baseText("inbox.selfHealing.couldNotFix.body")), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						createVNode(unref(N8nMarkdown_default), {
							content: __props.detail.report,
							options: reportOptions,
							class: normalizeClass(_ctx.$style.report),
							"data-test-id": "self-healing-report"
						}, null, 8, ["content", "class"])
					], 2),
					createVNode(SelfHealingResultActivity_default, { detail: __props.detail }, null, 8, ["detail"]),
					__props.detail.reviewState === "outdated" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "warning",
						"data-test-id": "self-healing-outdated-notice"
					}, {
						default: withCtx(() => [createBaseVNode("strong", { class: normalizeClass(_ctx.$style.noticeTitle) }, toDisplayString(unref(i18n).baseText("inbox.selfHealing.state.outdated")), 3), createTextVNode(" " + toDisplayString(outdatedBody.value), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					isOpen.value && __props.detail.outcome === "needs_you" ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "warning",
						"data-test-id": "self-healing-outcome-notice"
					}, {
						default: withCtx(() => [createBaseVNode("strong", { class: normalizeClass(_ctx.$style.noticeTitle) }, toDisplayString(unref(i18n).baseText("inbox.selfHealing.needsAttention.title")), 3), createTextVNode(" " + toDisplayString(unref(i18n).baseText("inbox.selfHealing.needsAttention.body")), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.changesPanel),
					"data-test-id": "self-healing-changes-panel"
				}, [__props.detail.reviewState === "outdated" ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 0,
					theme: "warning",
					slim: "",
					class: normalizeClass(_ctx.$style.changesNotice),
					"data-test-id": "self-healing-changes-outdated-notice"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(outdatedBody.value), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true), createVNode(SelfHealingResultChanges_default, {
					detail: __props.detail,
					"workflow-names": __props.workflowNames,
					"project-name": __props.projectName
				}, null, 8, [
					"detail",
					"workflow-names",
					"project-name"
				])], 2)), activeTab.value === "activity" ? (openBlock(), createBlock(SelfHealingResultMetadata_default, {
					key: 2,
					detail: __props.detail,
					"workflow-names": __props.workflowNames,
					"status-label": statusLabel.value,
					"status-class": statusClass.value
				}, null, 8, [
					"detail",
					"workflow-names",
					"status-label",
					"status-class"
				])) : createCommentVNode("", true)], 2)], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	detail: "_detail_g7x4i_1",
	container: "_container_g7x4i_2",
	columnTitle: "_columnTitle_g7x4i_15",
	statusDot: "_statusDot_g7x4i_24",
	fixReady: "_fixReady_g7x4i_31",
	needsAttention: "_needsAttention_g7x4i_35",
	closed: "_closed_g7x4i_39",
	tabRow: "_tabRow_g7x4i_44",
	actions: "_actions_g7x4i_56",
	menuNotes: "_menuNotes_g7x4i_63",
	detailBody: "_detailBody_g7x4i_71",
	flush: "_flush_g7x4i_80",
	changesNotice: "_changesNotice_g7x4i_85",
	activityPanel: "_activityPanel_g7x4i_89",
	reportCard: "_reportCard_g7x4i_99",
	noticeTitle: "_noticeTitle_g7x4i_109",
	report: "_report_g7x4i_99",
	changesPanel: "_changesPanel_g7x4i_132"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/selfHealingResult.store.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function resultKey({ projectId, workflowId, id }) {
	return `${projectId}/${workflowId}/${id}`;
}
var useSelfHealingResultStore = defineStore("selfHealingResultDetail", () => {
	const rootStore = useRootStore();
	const selection = ref(null);
	const detail = ref(null);
	const workflows = ref(/* @__PURE__ */ new Map());
	const loading = ref(false);
	const error = ref(null);
	const workflowError = ref(null);
	const pendingActions = ref(/* @__PURE__ */ new Map());
	const pendingAction = computed(() => selection.value ? pendingActions.value.get(resultKey(selection.value)) ?? null : null);
	let detailRequestSequence = 0;
	let workflowRequestSequence = 0;
	function isSelected(target) {
		return selection.value?.id === target.id && selection.value.projectId === target.projectId && selection.value.workflowId === target.workflowId;
	}
	function setError(target, cause) {
		if (!isSelected(target)) return;
		detailRequestSequence++;
		detail.value = null;
		error.value = cause;
		loading.value = false;
	}
	function acceptResult(result) {
		if (selection.value?.id !== result.resultId || selection.value.workflowId !== result.workflowId || selection.value.projectId !== result.projectId) return;
		detailRequestSequence++;
		detail.value = result;
		error.value = null;
		loading.value = false;
	}
	async function refreshDetail(beforeShow) {
		const target = selection.value;
		if (!target) return;
		const requestSequence = ++detailRequestSequence;
		loading.value = true;
		error.value = null;
		try {
			const result = await fetchSelfHealingResult(rootStore.restApiContext, target);
			if (requestSequence === detailRequestSequence) await beforeShow?.(result);
			if (requestSequence === detailRequestSequence) {
				detail.value = result;
				return result;
			}
		} catch (cause) {
			if (requestSequence === detailRequestSequence) {
				detail.value = null;
				error.value = cause;
			}
		} finally {
			if (requestSequence === detailRequestSequence) loading.value = false;
		}
	}
	const workflowIds = computed(() => {
		if (!selection.value) return [];
		const suggestionIds = detail.value?.suggestions.map(({ workflowId }) => workflowId) ?? [];
		return [.../* @__PURE__ */ new Set([selection.value.workflowId, ...suggestionIds])];
	});
	async function refreshWorkflows({ onlyMissing = false } = {}) {
		if (!selection.value) return;
		const ids = workflowIds.value.filter((id) => !onlyMissing || !workflows.value.has(id));
		if (ids.length === 0) return;
		const requestSequence = ++workflowRequestSequence;
		const responses = await Promise.allSettled(ids.map(async (id) => await fetchResultWorkflow(rootStore.restApiContext, id)));
		if (requestSequence !== workflowRequestSequence) return;
		const next = new Map(onlyMissing ? workflows.value : []);
		let failure = null;
		responses.forEach((response, index) => {
			if (response.status === "fulfilled") next.set(ids[index], response.value);
			else failure ??= response.reason;
		});
		workflows.value = next;
		workflowError.value = failure;
	}
	function beginAction(target, action) {
		const key = resultKey(target);
		if (pendingActions.value.has(key)) return false;
		pendingActions.value.set(key, action);
		return true;
	}
	function endAction(target) {
		pendingActions.value.delete(resultKey(target));
	}
	async function refreshSubWorkflows(target) {
		if (isSelected(target) && detail.value && !workflowError.value) await refreshWorkflows({ onlyMissing: true });
	}
	async function select(target) {
		detailRequestSequence++;
		workflowRequestSequence++;
		selection.value = { ...target };
		detail.value = null;
		workflows.value = /* @__PURE__ */ new Map();
		error.value = null;
		workflowError.value = null;
		await Promise.all([refreshDetail(), refreshWorkflows()]);
		await refreshSubWorkflows(target);
	}
	async function retryDetail(beforeShow) {
		const target = selection.value;
		if (target && await refreshDetail(beforeShow)) await refreshSubWorkflows(target);
	}
	return {
		detail,
		workflows,
		workflowIds,
		loading,
		error,
		workflowError,
		pendingAction,
		select,
		retryDetail,
		refreshWorkflows,
		acceptResult,
		beginAction,
		endAction,
		setError,
		isSelected
	};
});
//#endregion
//#region ../../modules/inbox/frontend/src/self-healing/SelfHealingResultDetail.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-result-id"];
var SelfHealingResultDetail_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SelfHealingResultDetail",
	props: {
		selection: {},
		tab: {},
		onItemChange: { type: Function },
		isSelected: { type: Function }
	},
	emits: ["update:tab"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const store = useSelfHealingResultStore();
		const { detail, workflows, workflowIds, loading, error, workflowError, pendingAction } = storeToRefs(store);
		const rootStore = useRootStore();
		const router = useRouter();
		const i18n = useI18n();
		const { showError, showMessage } = useToast();
		const telemetry = useTelemetry();
		const chat = tryUse(createSelfHealingChatHandoff)?.();
		const canChat = computed(() => chat?.canStart(props.selection.projectId) ?? false);
		const chatRetry = ref(null);
		let reconcileOnRetry = null;
		let viewTracked = false;
		/** Telemetry names for the buttons. */
		const ORIGINAL_ACTIONS = {
			"approve-and-publish": "publish",
			chat: "continue",
			editor: "open_editor",
			dismiss: "dismiss"
		};
		function resultTelemetry(result) {
			return {
				result_id: result.resultId,
				workflow_id: result.workflowId,
				project_id: result.projectId,
				result_kind: result.outcome
			};
		}
		const workflowNames = computed(() => {
			const listed = detail.value?.workflows ?? [];
			const ids = /* @__PURE__ */ new Set([...workflowIds.value, ...listed.map(({ workflowId }) => workflowId)]);
			return new Map([...ids].map((id) => [id, workflows.value.get(id)?.name ?? listed.find(({ workflowId }) => workflowId === id)?.name ?? detail.value?.suggestions.find(({ workflowId }) => workflowId === id)?.payload.original.name ?? id]));
		});
		const projectName = computed(() => {
			const project = detail.value && workflows.value.get(detail.value.workflowId)?.homeProject;
			if (!project) return void 0;
			return project.type === "personal" ? i18n.baseText("projects.menu.personal") : project.name ?? void 0;
		});
		const publishAccess = computed(() => {
			const metadata = (detail.value?.suggestions ?? []).map(({ workflowId }) => workflows.value.get(workflowId));
			if (metadata.some((workflow) => workflow && !workflow.scopes.includes("workflow:publish"))) return "denied";
			return metadata.every(Boolean) ? "allowed" : "unknown";
		});
		const errorKind = computed(() => {
			if (error.value instanceof ResponseError) {
				if (error.value.httpStatusCode === 404) return "notFound";
				if (error.value.httpStatusCode === 403) return "forbidden";
			}
			return "loadError";
		});
		watch([
			() => props.selection.id,
			() => props.selection.projectId,
			() => props.selection.workflowId
		], () => {
			reconcileOnRetry = null;
			chatRetry.value = null;
			viewTracked = false;
			store.select(props.selection);
		}, { immediate: true });
		watch(detail, (shown) => {
			if (!shown || viewTracked || shown.resultId !== props.selection.id) return;
			viewTracked = true;
			if (shown.outcome === "could_not_fix") return;
			telemetry.track(TELEMETRY_EVENT.SELF_HEALING.USER_VIEWED_SELF_HEALING_RESULT, {
				...resultTelemetry(shown),
				current_state: shown.reviewState
			});
		}, { flush: "post" });
		/** A client error status means the server rejected the action, so nothing was saved. */
		function isRejected(cause) {
			return cause instanceof ResponseError && cause.httpStatusCode !== void 0 && cause.httpStatusCode < 500;
		}
		function notifyResultClosed(before, after, onItemChange, advance = false) {
			if (before.reviewState === "open" && after.reviewState !== "open") onItemChange({
				type: "self_healing_result",
				id: after.resultId,
				state: "closed",
				updatedAt: after.updatedAt,
				advance
			});
		}
		function showPublished(result) {
			const { href } = router.resolve({
				name: VIEWS.WORKFLOW,
				params: { workflowId: result.workflowId }
			});
			showMessage({
				type: "success",
				title: i18n.baseText("inbox.selfHealing.action.published.title", {
					adjustToNumber: result.suggestions.length,
					interpolate: { count: String(result.suggestions.length) }
				}),
				message: i18n.baseText("inbox.selfHealing.action.published.message", { interpolate: { url: href } })
			});
		}
		async function openEditor(workflowId) {
			try {
				const failure = await router.push({
					name: VIEWS.WORKFLOW,
					params: { workflowId }
				});
				if (failure) throw failure;
			} catch (cause) {
				showError(cause, i18n.baseText("inbox.selfHealing.action.openEditorError"));
			}
		}
		async function startChat(request) {
			let outcome;
			try {
				outcome = await chat?.start(request.projectId, request.result) ?? "unavailable";
			} catch (cause) {
				outcome = "failed";
				if (store.isSelected(request.target)) showError(cause, i18n.baseText("inbox.selfHealing.action.chatError"));
			}
			if (!store.isSelected(request.target)) return;
			chatRetry.value = outcome === "started" ? null : {
				...request,
				reason: outcome
			};
		}
		async function retryChat() {
			const retry = chatRetry.value;
			if (!retry || !canChat.value || !store.isSelected(retry.target)) return;
			if (!store.beginAction(retry.target, "chat")) return;
			try {
				await startChat(retry);
			} finally {
				store.endAction(retry.target);
			}
		}
		async function retryDetail() {
			if (pendingAction.value) return;
			const reconcile = reconcileOnRetry;
			await store.retryDetail(async (result) => {
				if (!reconcile || reconcileOnRetry !== reconcile) return;
				reconcileOnRetry = null;
				await reconcile(result);
			});
		}
		async function onAction(action) {
			const before = detail.value;
			if (before?.reviewState !== "open" || pendingAction.value || !store.isSelected(props.selection)) return;
			if (action === "approve-and-publish" && (publishAccess.value !== "allowed" || before.outcome !== "fix_ready")) return;
			if (action === "chat" && !canChat.value) return;
			const target = { ...props.selection };
			if (!store.beginAction(target, action)) return;
			telemetry.track(TELEMETRY_EVENT.SELF_HEALING.USER_CLICKED_SELF_HEALING_ACTION, {
				...resultTelemetry(before),
				original_action: ORIGINAL_ACTIONS[action]
			});
			const isSelected = props.isSelected;
			const onItemChange = props.onItemChange;
			const isContinuation = action === "chat" || action === "editor";
			let reviewAction;
			if (isContinuation) reviewAction = before.suggestions.length > 0 ? "apply" : "dismiss";
			else reviewAction = action;
			const closedState = reviewAction === "dismiss" ? "dismissed" : "applied";
			/**
			* Without a response, the saved state does not show which request closed the result.
			* So the chat waits for an explicit start, and publication stays unconfirmed.
			*/
			async function continueAfterClose(result, responseLost) {
				const closed = result.reviewState === closedState;
				if (!isSelected(target.id) || !closed) return {
					continued: false,
					advance: false
				};
				let advance = false;
				if (action === "dismiss") advance = !responseLost;
				else if (action === "chat") {
					const request = {
						target,
						projectId: target.projectId,
						result
					};
					if (responseLost) chatRetry.value = {
						...request,
						reason: "unconfirmed"
					};
					else await startChat(request);
				} else if (!responseLost && action === "approve-and-publish" && result.publishError === void 0) {
					showPublished(result);
					advance = true;
				} else {
					if (responseLost && action === "approve-and-publish") showMessage({
						type: "warning",
						duration: 0,
						title: i18n.baseText("inbox.selfHealing.action.publishUnconfirmed.title"),
						message: i18n.baseText("inbox.selfHealing.action.publishUnconfirmed.message")
					});
					else if (result.publishError !== void 0) {
						showMessage({
							type: "warning",
							duration: 0,
							title: i18n.baseText(result.suggestions.length > 1 ? "inbox.selfHealing.action.publishErrorMultiple" : "inbox.selfHealing.action.publishError"),
							message: result.publishError
						});
						if (result.restorationError) showMessage({
							type: "error",
							duration: 0,
							title: i18n.baseText("inbox.selfHealing.action.restorationError", { interpolate: { workflow: workflowNames.value.get(result.restorationError.workflowId) ?? result.restorationError.workflowId } }),
							message: result.restorationError.error
						});
					}
					await openEditor(result.workflowId);
				}
				return {
					continued: true,
					advance
				};
			}
			try {
				const result = await reviewSelfHealingResult(rootStore.restApiContext, target, reviewAction, ORIGINAL_ACTIONS[action]);
				const { advance } = await continueAfterClose(result, false);
				store.acceptResult(result);
				notifyResultClosed(before, result, onItemChange, advance);
			} catch (cause) {
				const reconcile = async (current) => {
					const continued = !isRejected(cause) && (await continueAfterClose(current, true)).continued;
					notifyResultClosed(before, current, onItemChange);
					return continued;
				};
				try {
					const current = await fetchSelfHealingResult(rootStore.restApiContext, target);
					const continued = await reconcile(current);
					store.acceptResult(current);
					if (isSelected(target.id)) store.refreshWorkflows();
					if (continued) return;
				} catch (readError) {
					store.setError(target, readError);
					if (isSelected(target.id)) reconcileOnRetry = reconcile;
				}
				if (isSelected(target.id)) showError(cause, i18n.baseText("inbox.selfHealing.action.error"));
			} finally {
				store.endAction(target);
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.detail),
				"data-test-id": "inbox-self-healing-detail",
				"data-result-id": __props.selection.id
			}, [unref(loading) || unref(error) || !unref(detail) ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnTitle) }, null, 2), unref(loading) ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				loading: true,
				rows: 3
			})) : unref(error) ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.error),
				"data-test-id": "self-healing-detail-error"
			}, [createVNode(unref(N8nEmptyState_default), {
				heading: unref(i18n).baseText(`inbox.selfHealing.detail.${errorKind.value}.title`),
				description: unref(i18n).baseText(`inbox.selfHealing.detail.${errorKind.value}.body`)
			}, null, 8, ["heading", "description"]), createVNode(unref(N8nButton_default), {
				loading: unref(pendingAction) !== null,
				onClick: _cache[0] || (_cache[0] = ($event) => retryDetail())
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
				_: 1
			}, 8, ["loading"])], 2)) : createCommentVNode("", true)], 64)) : (openBlock(), createBlock(SelfHealingResultContent_default, {
				key: 1,
				detail: unref(detail),
				"workflow-names": workflowNames.value,
				"project-name": projectName.value,
				tab: __props.tab,
				"pending-action": unref(pendingAction),
				"publish-access": publishAccess.value,
				"can-chat": canChat.value,
				"onUpdate:tab": _cache[3] || (_cache[3] = ($event) => emit("update:tab", $event)),
				onAction
			}, createSlots({ _: 2 }, [unref(workflowError) || chatRetry.value ? {
				name: "notice",
				fn: withCtx(() => [unref(workflowError) ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 0,
					theme: "warning"
				}, {
					trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						onClick: _cache[1] || (_cache[1] = ($event) => unref(store).refreshWorkflows())
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
						_: 1
					})]),
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.detail.metadataError")) + " ", 1)]),
					_: 1
				})) : createCommentVNode("", true), chatRetry.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 1,
					theme: chatRetry.value.reason === "unconfirmed" ? "info" : "warning",
					"data-test-id": "self-healing-chat-retry"
				}, {
					trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						disabled: !canChat.value,
						loading: unref(pendingAction) === "chat",
						"data-test-id": "self-healing-chat-retry-button",
						onClick: _cache[2] || (_cache[2] = ($event) => retryChat())
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("inbox.selfHealing.action.continueWithAssistant")), 1)]),
						_: 1
					}, 8, ["disabled", "loading"])]),
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(`inbox.selfHealing.chatRetry.${chatRetry.value.reason}`)) + " ", 1)]),
					_: 1
				}, 8, ["theme"])) : createCommentVNode("", true)]),
				key: "0"
			} : void 0]), 1032, [
				"detail",
				"workflow-names",
				"project-name",
				"tab",
				"pending-action",
				"publish-access",
				"can-chat"
			]))], 10, _hoisted_1);
		};
	}
}), [["__cssModules", { "$style": {
	detail: "_detail_10r1m_1",
	columnTitle: "_columnTitle_10r1m_8",
	error: "_error_10r1m_13"
} }]]);
//#endregion
//#region ../../modules/inbox/frontend/src/views/InboxView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InboxView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InboxView",
	setup(__props) {
		const store = useInboxStore();
		const settingsStore = useSettingsStore();
		const { activeTab, openCount, closedCount } = storeToRefs(store);
		const sections = computed(() => store.activeSectionKeys.map((key) => ({
			key,
			...store.lists[key]
		})));
		const activeItems = computed(() => sections.value.flatMap((section) => section.items));
		const route = useRoute();
		const router = useRouter();
		const i18n = useI18n();
		useDocumentTitle({ releaseChannel: settingsStore.settings.releaseChannel }).set(i18n.baseText("inbox.title"));
		const contentRef = ref(null);
		const sidebarResizer = useResizablePanel({
			container: contentRef,
			width: {
				localStorageKey: "N8N_WORKFLOW_REVIEW_SIDEBAR_WIDTH",
				defaultSize: (size) => Math.min(Math.max(size * .25, 240), 400),
				minSize: 240,
				maxSize: (size) => Math.min(size * .5, 640),
				snap: true
			}
		});
		const sidebarWidth = sidebarResizer.width;
		const selection = computed(() => selectionFromRoute(route));
		const selectedKey = computed(() => selection.value ? `${selection.value.type}:${selection.value.id}` : null);
		const selectedListItem = computed(() => Object.values(store.lists).flatMap((list) => list.items).find((item) => `${item.type}:${item.id}` === selectedKey.value));
		const selectedReviewItem = computed(() => selectedListItem.value?.type === "workflow_review" ? selectedListItem.value : void 0);
		const selectedPromotionItem = computed(() => selectedListItem.value?.type === "promotion_review" ? selectedListItem.value : void 0);
		const detailTab = computed(() => route.query.tab === "changes" ? "changes" : "activity");
		let isMounted = false;
		function isOnInbox() {
			return isInboxRoute(router.currentRoute.value);
		}
		function isActive() {
			return isMounted && isOnInbox();
		}
		function isSelectedReview(id) {
			const selected = selectionFromRoute(router.currentRoute.value);
			return selected?.type === "workflow_review" && selected.id === id;
		}
		function isSelectedResult(id) {
			const selected = selectionFromRoute(router.currentRoute.value);
			return selected?.type === "self_healing_result" && selected.id === id;
		}
		store.reset();
		store.activeTab = route.query.state === "closed" ? "closed" : "open";
		watch(() => route.query.state, (state) => {
			if (isOnInbox()) store.setActiveTab(state === "closed" ? "closed" : "open");
		});
		watch([selection, () => store.disabledSources], ([item, types]) => {
			if (item && types.includes(item.type)) onClearSelection();
		}, { immediate: true });
		let autoSelectTab = activeTab.value;
		const activeTabLoaded = computed(() => !store.loading && !store.initialLoadFailed && store.activeLists.every((list) => list.hasLoaded));
		watch([activeTabLoaded, activeTab], ([loaded, tab]) => {
			if (!loaded || autoSelectTab !== tab || !isOnInbox()) return;
			autoSelectTab = null;
			if (!selection.value && activeItems.value[0]) onSelect(activeItems.value[0]);
		}, { flush: "post" });
		function onSelect(item) {
			router.replace(inboxItemLocation(item, route));
		}
		function onClearSelection() {
			if (!isOnInbox()) return;
			const query = { ...route.query };
			for (const key of ["projectId", "workflowId"]) delete query[key];
			router.replace({
				name: INBOX_VIEW,
				query
			});
		}
		function onUserClearSelection() {
			autoSelectTab = null;
			nextPageSelection++;
			onClearSelection();
		}
		function onActiveTabChange(tab) {
			autoSelectTab = tab;
			const query = { ...route.query };
			if (tab === "closed") query.state = tab;
			else delete query.state;
			router.replace({ query });
		}
		function onDetailTabChange(tab) {
			if (!isOnInbox()) return;
			const query = { ...route.query };
			if (tab === "changes") query.tab = tab;
			else delete query.tab;
			router.replace({ query });
		}
		function nextItemAfter(change) {
			const items = activeItems.value;
			const index = items.findIndex(({ type, id }) => type === change.type && id === change.id);
			if (index === -1) return items[0];
			return items[index + 1] ?? items[index - 1];
		}
		function onItemChange(change) {
			if (!change.state && !isActive()) return;
			const next = change.advance ? nextItemAfter(change) : void 0;
			store.reconcileItemChange(change);
			if (!isOnInbox()) return;
			if (!change.state || change.state === "closed" && activeTab.value === "closed") store.fetchActiveTab();
			const currentRoute = router.currentRoute.value;
			const selected = selectionFromRoute(currentRoute);
			if (!(change.state === "closed" && activeTab.value !== "closed" && selected?.type === change.type && selected.id === change.id)) return;
			if (!change.advance) router.replace({ query: {
				...currentRoute.query,
				state: "closed"
			} });
			else if (store.lists.waiting.items.length === 0 && store.lists.waiting.hasMore) {
				onClearSelection();
				selectFromNextWaitingPage(change, next);
			} else if (next) onSelect(next);
			else onClearSelection();
		}
		let nextPageSelection = 0;
		async function selectFromNextWaitingPage(closed, fallback) {
			const { waiting } = store.lists;
			const request = ++nextPageSelection;
			await waiting.loadMore();
			if (request !== nextPageSelection || !isActive() || activeTab.value !== "open") return;
			const selected = selectionFromRoute(router.currentRoute.value);
			if (selected && (selected.type !== closed.type || selected.id !== closed.id)) return;
			const next = waiting.items[0] ?? fallback;
			if (next) onSelect(next);
		}
		watch(() => store.enabled, (enabled) => {
			if (!enabled && isMounted && isOnInbox()) router.replace({ name: VIEWS.HOMEPAGE });
		});
		onMounted(() => {
			isMounted = true;
			store.refreshListAndSummary();
		});
		onBeforeUnmount(() => {
			isMounted = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.layout),
				"data-test-id": "inbox-view"
			}, [createBaseVNode("main", {
				ref_key: "contentRef",
				ref: contentRef,
				class: normalizeClass(_ctx.$style.content)
			}, [createVNode(unref(N8nResizeWrapper_default), {
				class: normalizeClass(_ctx.$style.sidebarResizer),
				style: normalizeStyle({ width: `${unref(sidebarWidth)}px` }),
				resizer: unref(sidebarResizer),
				"supported-directions": ["right"]
			}, {
				default: withCtx(() => [createVNode(InboxList_default, {
					class: normalizeClass(_ctx.$style.sidebar),
					sections: sections.value,
					"active-tab": unref(activeTab),
					"selected-key": selectedKey.value,
					"open-count": unref(openCount),
					"closed-count": unref(closedCount),
					onSelect,
					onClear: onUserClearSelection,
					"onUpdate:activeTab": onActiveTabChange,
					onLoadMore: _cache[0] || (_cache[0] = (section) => unref(store).lists[section].loadMore()),
					onRetry: _cache[1] || (_cache[1] = (section) => unref(store).lists[section].retry()),
					onRefreshSection: _cache[2] || (_cache[2] = (section) => unref(store).lists[section].fetchList()),
					onRetryActiveTab: _cache[3] || (_cache[3] = ($event) => unref(store).fetchActiveTab())
				}, null, 8, [
					"class",
					"sections",
					"active-tab",
					"selected-key",
					"open-count",
					"closed-count"
				])]),
				_: 1
			}, 8, [
				"class",
				"style",
				"resizer"
			]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.main) }, [selection.value?.type === "workflow_review" && !unref(store).disabledSources.includes(selection.value.type) ? (openBlock(), createBlock(WorkflowReviewDetail_default, {
				key: 0,
				"review-id": selection.value.id,
				"list-item": selectedReviewItem.value,
				tab: detailTab.value,
				"on-item-change": onItemChange,
				"is-active": isActive,
				"is-selected": isSelectedReview,
				"onUpdate:tab": onDetailTabChange
			}, {
				default: withCtx(() => [createVNode(InboxEmptyState_default)]),
				_: 1
			}, 8, [
				"review-id",
				"list-item",
				"tab"
			])) : selectedPromotionItem.value && !unref(store).disabledSources.includes("promotion_review") ? (openBlock(), createBlock(PromotionReviewDetail_default, {
				key: 1,
				item: selectedPromotionItem.value,
				"on-item-change": onItemChange
			}, null, 8, ["item"])) : selection.value?.type === "self_healing_result" && !unref(store).disabledSources.includes(selection.value.type) ? (openBlock(), createBlock(SelfHealingResultDetail_default, {
				key: 2,
				selection: selection.value,
				tab: detailTab.value,
				"on-item-change": onItemChange,
				"is-selected": isSelectedResult,
				"onUpdate:tab": onDetailTabChange
			}, null, 8, ["selection", "tab"])) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.columnTitle) }, null, 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.mainBody) }, [createVNode(InboxEmptyState_default)], 2)], 64))], 2)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	layout: "_layout_v3l1d_113",
	content: "_content_v3l1d_122",
	sidebarResizer: "_sidebarResizer_v3l1d_134",
	main: "_main_v3l1d_138",
	sidebar: "_sidebar_v3l1d_134",
	columnTitle: "_columnTitle_v3l1d_159",
	mainBody: "_mainBody_v3l1d_164"
} }]]);
//#endregion
export { InboxView_default as default };
