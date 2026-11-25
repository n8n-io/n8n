import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cd as TransitionGroup, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, gf as resolveComponent, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, qo as onBeforeRouteLeave, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, Cg as isComponentPublicInstance, Fn as toDayMonth, GS as EnterpriseEditionFeature, Gb as MAIN_HEADER_TABS, Hl as useExecutionsStore, In as toTime, Ju as useWorkflowSaving, Nd as getExecutionEngine, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Ur as useInjectWorkflowId, Wp as useWorkflowsListStore, XM as N8nActionDropdown_default, _M as Checkbox_default, _N as N8nText_default, _j as N8nTags_default, bN as N8nSpinner_default, by as useDebounce, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, hC as useTelemetry, jN as useI18n, jd as executionRetryMessage, jn as useExecutionHelpers, lg as getNodeViewTab, nD as getResourcePermissions, tN as N8nLoading_default, xN as N8nIcon_default, yC as useSettingsStore } from "./app-D5flEmb-.js";
import { t as PrivateCredentialIcon_default } from "./PrivateCredentialIcon-LztlyFmz.js";
import { t as useIntersectionObserver } from "./useIntersectionObserver-BTGMngAL.js";
import "./useIntersectionObserver-CVH8U9lD.js";
import { t as WorkflowExecutionsInfoAccordion_default } from "./WorkflowExecutionsInfoAccordion-Co8ayULk.js";
import { i as ConcurrentExecutionsHeader_default, n as ExecutionStopAllText_default, r as ExecutionsFilter_default, t as ExecutionsTime_default } from "./ExecutionsTime-D0g_MsOS.js";
import { t as EngineBadge_default } from "./EngineBadge-BXn1soV3.js";
//#region src/features/execution/executions/components/workflow/WorkflowExecutionsCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = { key: 2 };
var WorkflowExecutionsCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowExecutionsCard",
	props: {
		execution: {},
		highlight: { type: Boolean },
		showGap: { type: Boolean },
		workflowPermissions: {}
	},
	emits: ["retryExecution", "mounted"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const route = useRoute();
		const locale = useI18n();
		const executionHelpers = useExecutionHelpers();
		const settingsStore = useSettingsStore();
		const isAdvancedExecutionFilterEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters]);
		const isAnnotationEnabled = computed(() => isAdvancedExecutionFilterEnabled.value);
		const workflowId = useInjectWorkflowId();
		const hasPrivateCredentials = computed(() => props.execution.usedPrivateCredentials === true);
		const retryExecutionActions = computed(() => [{
			id: "current-workflow",
			label: locale.baseText("executionsList.retryWithCurrentVersion"),
			description: locale.baseText("executionsList.retryWithCurrentVersionDescription")
		}, {
			id: "original-workflow",
			label: locale.baseText("executionsList.retryWithOriginalVersion"),
			description: locale.baseText("executionsList.retryWithOriginalVersionDescription")
		}]);
		const executionUIDetails = computed(() => executionHelpers.getUIDetails(props.execution));
		const isActive = computed(() => props.execution.id === route.params.executionId);
		const isRetriable = computed(() => executionHelpers.isExecutionRetriable(props.execution));
		onMounted(() => {
			emit("mounted", props.execution.id);
		});
		function onRetryMenuItemSelect(action) {
			emit("retryExecution", {
				execution: props.execution,
				command: action
			});
		}
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createElementBlock("div", { class: normalizeClass({
				["execution-card"]: true,
				[_ctx.$style.WorkflowExecutionsCard]: true,
				[_ctx.$style.active]: isActive.value,
				[_ctx.$style[executionUIDetails.value.name]]: true,
				[_ctx.$style.highlight]: __props.highlight,
				[_ctx.$style.showGap]: __props.showGap
			}) }, [createVNode(_component_RouterLink, {
				class: normalizeClass(_ctx.$style.executionLink),
				to: {
					name: unref(VIEWS).EXECUTION_PREVIEW,
					params: {
						workflowId: unref(workflowId),
						executionId: __props.execution.id
					},
					query: unref(route).query
				},
				"data-test-execution-status": executionUIDetails.value.name
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.description) }, [
					executionUIDetails.value.name === "new" ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-dark",
						bold: true,
						size: "medium",
						"data-test-id": "execution-time"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(toDayMonth)(executionUIDetails.value.createdAt)) + " - " + toDisplayString(unref(locale).baseText("executionDetails.startingSoon")), 1)]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-dark",
						bold: true,
						size: "medium",
						"data-test-id": "execution-time"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(executionUIDetails.value.startTime), 1)]),
						_: 1
					})),
					createVNode(EngineBadge_default, {
						engine: unref(getExecutionEngine)(__props.execution.id),
						class: "ml-3xs",
						"data-test-id": "execution-engine-badge"
					}, null, 8, ["engine"]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.executionStatus) }, [
						executionUIDetails.value.name === "running" ? (openBlock(), createBlock(unref(N8nSpinner_default), {
							key: 0,
							size: "small",
							class: normalizeClass([_ctx.$style.spinner, "mr-4xs"])
						}, null, 8, ["class"])) : createCommentVNode("", true),
						createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.statusLabel),
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(executionUIDetails.value.label), 1)]),
							_: 1
						}, 8, ["class"]),
						_cache[0] || (_cache[0] = createTextVNode(" " + toDisplayString(" ") + " ", -1)),
						executionUIDetails.value.name === "running" && !__props.execution.stoppedAt ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							color: isActive.value ? "text-dark" : "text-base",
							size: "small",
							"data-test-id": "execution-time-in-status"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionDetails.runningTimeRunning")) + " ", 1), createVNode(ExecutionsTime_default, { "start-time": __props.execution.startedAt ?? __props.execution.createdAt }, null, 8, ["start-time"])]),
							_: 1
						}, 8, ["color"])) : createCommentVNode("", true),
						executionUIDetails.value.name === "new" && __props.execution.createdAt ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 2,
							color: isActive.value ? "text-dark" : "text-base",
							size: "small"
						}, {
							default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(locale).baseText("executionDetails.at")) + " " + toDisplayString(unref(toTime)(__props.execution.createdAt)), 1)]),
							_: 1
						}, 8, ["color"])) : executionUIDetails.value.runningTime !== "" ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 3,
							color: isActive.value ? "text-dark" : "text-base",
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionDetails.runningTimeFinished", { interpolate: { time: executionUIDetails.value?.runningTime } })), 1)]),
							_: 1
						}, 8, ["color"])) : createCommentVNode("", true)
					], 2),
					__props.execution.mode === "retry" ? (openBlock(), createElementBlock("div", _hoisted_1$1, [createVNode(unref(N8nText_default), {
						color: isActive.value ? "text-dark" : "text-base",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionDetails.retry")) + " #" + toDisplayString(__props.execution.retryOf), 1)]),
						_: 1
					}, 8, ["color"])])) : createCommentVNode("", true),
					isAnnotationEnabled.value ? (openBlock(), createElementBlock("div", {
						key: 3,
						class: normalizeClass(_ctx.$style.annotation)
					}, [__props.execution.annotation?.vote ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.ratingIcon)
					}, [__props.execution.annotation.vote == "up" ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 0,
						class: normalizeClass(_ctx.$style.up),
						icon: "thumbs-up"
					}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						class: normalizeClass(_ctx.$style.down),
						icon: "thumbs-down"
					}, null, 8, ["class"]))], 2)) : createCommentVNode("", true), executionUIDetails.value.tags.length > 0 ? (openBlock(), createBlock(unref(N8nTags_default), {
						key: 1,
						tags: executionUIDetails.value.tags,
						clickable: false
					}, null, 8, ["tags"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)
				], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.icons) }, [
					isRetriable.value ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
						key: 0,
						class: normalizeClass([_ctx.$style.icon, _ctx.$style.retry]),
						items: retryExecutionActions.value,
						disabled: !__props.workflowPermissions.execute,
						"activator-icon": "redo-2",
						placement: "bottom-end",
						"data-test-id": "retry-execution-button",
						onSelect: onRetryMenuItemSelect
					}, {
						menuItem: withCtx((item) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.retryMenuItem) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-dark",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(item.label), 1)]),
							_: 2
						}, 1024), createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(item.description), 1)]),
							_: 2
						}, 1024)], 2)]),
						_: 1
					}, 8, [
						"class",
						"items",
						"disabled"
					])) : createCommentVNode("", true),
					hasPrivateCredentials.value ? (openBlock(), createBlock(PrivateCredentialIcon_default, {
						key: 1,
						class: normalizeClass(_ctx.$style.icon),
						"tooltip-text": unref(locale).baseText("executions.privateCredential.tooltip"),
						"data-test-id": "execution-card-private-credential"
					}, null, 8, ["class", "tooltip-text"])) : createCommentVNode("", true),
					__props.execution.mode === "manual" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 2,
						placement: "top"
					}, {
						content: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(locale).baseText("executionsList.test")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							class: normalizeClass([_ctx.$style.icon, _ctx.$style.manual]),
							icon: "flask-conical"
						}, null, 8, ["class"])]),
						_: 1
					})) : createCommentVNode("", true),
					__props.execution.mode === "evaluation" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 3,
						placement: "top"
					}, {
						content: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(locale).baseText("executionsList.evaluation")), 1)]),
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							class: normalizeClass([_ctx.$style.icon, _ctx.$style.evaluation]),
							icon: "check-check"
						}, null, 8, ["class"])]),
						_: 1
					})) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, [
				"class",
				"to",
				"data-test-execution-status"
			])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	WorkflowExecutionsCard: "_WorkflowExecutionsCard_1utj2_1",
	active: "_active_1utj2_8",
	executionStatus: "_executionStatus_1utj2_11",
	executionLink: "_executionLink_1utj2_14",
	"new": "_new_1utj2_17",
	spinner: "_spinner_1utj2_17",
	running: "_running_1utj2_17",
	statusLabel: "_statusLabel_1utj2_24",
	success: "_success_1utj2_29",
	waiting: "_waiting_1utj2_38",
	error: "_error_1utj2_44",
	unknown: "_unknown_1utj2_50",
	annotation: "_annotation_1utj2_53",
	ratingIcon: "_ratingIcon_1utj2_60",
	up: "_up_1utj2_60",
	down: "_down_1utj2_63",
	icon: "_icon_1utj2_80",
	description: "_description_1utj2_85",
	icons: "_icons_1utj2_89",
	retry: "_retry_1utj2_106",
	manual: "_manual_1utj2_112",
	retryMenuItem: "_retryMenuItem_1utj2_117",
	showGap: "_showGap_1utj2_123"
} }]]);
//#endregion
//#region src/features/execution/executions/components/workflow/WorkflowExecutionsSidebar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = {
	key: 0,
	class: "mr-l"
};
var _hoisted_2 = {
	key: 4,
	class: "mr-m"
};
var WorkflowExecutionsSidebar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowExecutionsSidebar",
	props: {
		workflow: {},
		executions: {},
		loading: { type: Boolean },
		loadingMore: { type: Boolean },
		hasMore: { type: Boolean },
		temporaryExecution: {}
	},
	emits: [
		"retryExecution",
		"loadMore",
		"filterUpdated",
		"update:autoRefresh",
		"execution:stopMany"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const route = useRoute();
		const router = useRouter();
		const i18n = useI18n();
		const executionsStore = useExecutionsStore();
		const settingsStore = useSettingsStore();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const autoScrollDeps = ref({
			activeExecutionSet: false,
			cardsMounted: false,
			scroll: true
		});
		const currentWorkflowExecutionsCardRefs = ref({});
		const executionListRef = ref(null);
		const loadMoreSentinel = ref(null);
		const { observe: observeForLoadMore } = useIntersectionObserver({
			root: executionListRef,
			threshold: .01,
			onIntersect: () => emit("loadMore", 20)
		});
		watch([
			loadMoreSentinel,
			() => props.hasMore,
			() => props.loadingMore,
			() => props.executions.length
		], ([sentinel, hasMore, loadingMore]) => {
			if (sentinel && hasMore && !loadingMore) observeForLoadMore(sentinel);
		}, {
			immediate: true,
			flush: "post"
		});
		const workflowPermissions = computed(() => getResourcePermissions(props.workflow?.scopes).workflow);
		const showConcurrencyHeader = computed(() => settingsStore.isConcurrencyEnabled && !settingsStore.isQueueModeEnabled);
		watch(() => route, (to, from) => {
			if (from.name === VIEWS.EXECUTION_PREVIEW && to.name === VIEWS.EXECUTION_HOME) router.go(-1);
		});
		watch(() => executionsStore.activeExecution, (newValue, oldValue) => {
			if (newValue && newValue.id !== oldValue?.id) autoScrollDeps.value.activeExecutionSet = true;
		});
		watch(autoScrollDeps, (updatedDeps) => {
			if (Object.values(updatedDeps).every(Boolean)) scrollToActiveCard();
		}, { deep: true });
		function addCurrentWorkflowExecutionsCardRef(comp, id) {
			if (comp && isComponentPublicInstance(comp) && id) currentWorkflowExecutionsCardRefs.value[id] = comp;
		}
		function onItemMounted(id) {
			if (executionsStore.activeExecution?.id === id) {
				autoScrollDeps.value.activeExecutionSet = true;
				autoScrollDeps.value.cardsMounted = true;
			}
		}
		function onRetryExecution(payload) {
			emit("retryExecution", payload);
		}
		function onFilterChanged(filter) {
			autoScrollDeps.value.activeExecutionSet = false;
			autoScrollDeps.value.cardsMounted = false;
			autoScrollDeps.value.scroll = true;
			emit("filterUpdated", filter);
		}
		function onAutoRefreshChange(enabled) {
			emit("update:autoRefresh", enabled);
		}
		function scrollToActiveCard() {
			if (executionListRef.value && executionsStore.activeExecution && currentWorkflowExecutionsCardRefs.value[executionsStore.activeExecution.id]) {
				const cardRect = currentWorkflowExecutionsCardRefs.value[executionsStore.activeExecution.id].$el.getBoundingClientRect();
				const LIST_HEADER_OFFSET = 200;
				if (cardRect.top > executionListRef.value.offsetHeight) {
					autoScrollDeps.value.scroll = false;
					executionListRef.value.scrollTo({
						top: cardRect.top - LIST_HEADER_OFFSET,
						behavior: "smooth"
					});
				}
			}
		}
		const goToUpgrade = () => {
			pageRedirectionHelper.goToUpgrade("concurrency", "upgrade-concurrency");
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(["executions-sidebar", _ctx.$style.container]),
				"data-test-id": "executions-sidebar"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.heading) }, [
					createVNode(unref(N8nHeading_default), {
						tag: "h2",
						size: "medium",
						color: "text-dark"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.executions")), 1)]),
						_: 1
					}),
					showConcurrencyHeader.value ? (openBlock(), createBlock(ConcurrentExecutionsHeader_default, {
						key: 0,
						"running-executions-count": unref(executionsStore).concurrentExecutionsCount,
						"concurrency-cap": unref(settingsStore).concurrency,
						"is-cloud-deployment": unref(settingsStore).isCloudDeployment,
						executions: props.executions,
						"is-initial-load": !unref(executionsStore).initialLoadComplete,
						onGoToUpgrade: goToUpgrade
					}, null, 8, [
						"running-executions-count",
						"concurrency-cap",
						"is-cloud-deployment",
						"executions",
						"is-initial-load"
					])) : createCommentVNode("", true),
					createVNode(ExecutionStopAllText_default, { executions: props.executions }, null, 8, ["executions"])
				], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.controls) }, [createVNode(unref(Checkbox_default), {
					modelValue: unref(executionsStore).autoRefresh,
					"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => unref(executionsStore).autoRefresh = $event), onAutoRefreshChange],
					"data-test-id": "auto-refresh-checkbox",
					label: unref(i18n).baseText("executionsList.autoRefresh")
				}, null, 8, ["modelValue", "label"]), createVNode(ExecutionsFilter_default, {
					"initial-filters": unref(executionsStore).filters,
					"popover-side": "right",
					"popover-align": "start",
					"workflow-id": props.workflow?.id,
					onFilterChanged
				}, null, 8, ["initial-filters", "workflow-id"])], 2),
				createBaseVNode("div", {
					ref_key: "executionListRef",
					ref: executionListRef,
					class: normalizeClass(_ctx.$style.executionList),
					"data-test-id": "current-executions-list"
				}, [
					__props.loading ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(N8nLoading_default), { variant: "rect" })])) : createCommentVNode("", true),
					!__props.loading && __props.executions.length === 0 ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.noResultsContainer),
						"data-test-id": "execution-list-empty"
					}, [createVNode(unref(N8nText_default), {
						color: "text-base",
						size: "medium",
						align: "center"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("executionsLandingPage.noResults")), 1)]),
						_: 1
					})], 2)) : __props.temporaryExecution ? (openBlock(), createBlock(WorkflowExecutionsCard_default, {
						key: 2,
						ref: (el) => addCurrentWorkflowExecutionsCardRef(el, __props.temporaryExecution?.id),
						execution: __props.temporaryExecution,
						"data-test-id": `execution-details-${__props.temporaryExecution.id}`,
						"show-gap": true,
						"workflow-permissions": workflowPermissions.value,
						onRetryExecution
					}, null, 8, [
						"execution",
						"data-test-id",
						"workflow-permissions"
					])) : createCommentVNode("", true),
					createVNode(TransitionGroup, { name: "executions-list" }, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.executions, (execution) => {
							return openBlock(), createBlock(WorkflowExecutionsCard_default, {
								key: execution.id,
								ref_for: true,
								ref: (el) => addCurrentWorkflowExecutionsCardRef(el, execution.id),
								execution,
								"workflow-permissions": workflowPermissions.value,
								"data-test-id": `execution-details-${execution.id}`,
								onRetryExecution,
								onMounted: onItemMounted
							}, null, 8, [
								"execution",
								"workflow-permissions",
								"data-test-id"
							]);
						}), 128))]),
						_: 1
					}),
					__props.executions.length && __props.hasMore ? (openBlock(), createElementBlock("div", {
						key: 3,
						ref_key: "loadMoreSentinel",
						ref: loadMoreSentinel,
						class: normalizeClass(_ctx.$style.loadMoreSentinel),
						"aria-hidden": "true",
						"data-test-id": "executions-load-more-sentinel"
					}, null, 2)) : createCommentVNode("", true),
					__props.loadingMore ? (openBlock(), createElementBlock("div", _hoisted_2, [createVNode(unref(N8nLoading_default), {
						variant: "p",
						rows: 1
					})])) : createCommentVNode("", true)
				], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.infoAccordion) }, [createVNode(WorkflowExecutionsInfoAccordion_default, { "initially-expanded": false })], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_ofzba_1",
	heading: "_heading_ofzba_13",
	controls: "_controls_ofzba_20",
	executionList: "_executionList_ofzba_28",
	noResultsContainer: "_noResultsContainer_ofzba_42",
	infoAccordion: "_infoAccordion_ofzba_46",
	loadMoreSentinel: "_loadMoreSentinel_ofzba_68"
} }], ["__scopeId", "data-v-b6749bc6"]]);
//#endregion
//#region src/features/execution/executions/components/workflow/WorkflowExecutionsList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var WorkflowExecutionsList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowExecutionsList",
	props: {
		loading: {
			type: Boolean,
			default: false
		},
		workflow: {},
		executions: { default: () => [] },
		execution: {},
		loadingMore: {
			type: Boolean,
			default: false
		},
		hasMore: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"execution:delete",
		"execution:stop",
		"execution:retry",
		"update:auto-refresh",
		"update:filters",
		"load-more",
		"reload"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const router = useRouter();
		const { promptSaveUnsavedWorkflowChanges } = useWorkflowSaving({ router });
		const temporaryExecution = computed(() => props.executions.find((execution) => execution.id === props.execution?.id) ? void 0 : props.execution ?? void 0);
		const hidePreview = computed(() => {
			return props.loading || !props.execution && props.executions.length;
		});
		const onDeleteCurrentExecution = () => {
			if (!props.execution?.id) return;
			emit("execution:delete", props.execution.id);
		};
		const onStopExecution = () => {
			if (!props.execution?.id) return;
			emit("execution:stop", props.execution.id);
		};
		const onRetryExecution = (payload) => {
			const loadWorkflow = payload.command === "current-workflow";
			emit("execution:retry", {
				id: payload.execution.id,
				loadWorkflow
			});
		};
		onBeforeRouteLeave(async (to, _, next) => {
			if (getNodeViewTab(to) === MAIN_HEADER_TABS.WORKFLOW) {
				next();
				return;
			}
			await promptSaveUnsavedWorkflowChanges(next);
		});
		return (_ctx, _cache) => {
			const _component_RouterView = resolveComponent("RouterView");
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createVNode(WorkflowExecutionsSidebar_default, {
				executions: __props.executions,
				loading: __props.loading && !__props.executions.length,
				"loading-more": __props.loadingMore,
				"has-more": __props.hasMore,
				"temporary-execution": temporaryExecution.value,
				workflow: __props.workflow,
				"onUpdate:autoRefresh": _cache[0] || (_cache[0] = ($event) => emit("update:auto-refresh", $event)),
				onReloadExecutions: _cache[1] || (_cache[1] = ($event) => emit("reload")),
				onFilterUpdated: _cache[2] || (_cache[2] = ($event) => emit("update:filters", $event)),
				onLoadMore: _cache[3] || (_cache[3] = ($event) => emit("load-more")),
				onRetryExecution
			}, null, 8, [
				"executions",
				"loading",
				"loading-more",
				"has-more",
				"temporary-execution",
				"workflow"
			]), !hidePreview.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.content)
			}, [createVNode(_component_RouterView, {
				name: "executionPreview",
				execution: __props.execution,
				onDeleteCurrentExecution,
				onRetryExecution,
				onStopExecution
			}, null, 8, ["execution"])], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_dkwwa_113",
	content: "_content_dkwwa_119"
} }]]);
//#endregion
//#region src/features/execution/executions/views/WorkflowExecutionsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/execution/executions/views/WorkflowExecutionsView.vue
var WorkflowExecutionsView_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowExecutionsView",
	setup(__props) {
		const executionsStore = useExecutionsStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const workflowsListStore = useWorkflowsListStore();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const route = useRoute();
		const router = useRouter();
		const toast = useToast();
		const { callDebounced } = useDebounce();
		const loading = ref(false);
		const loadingMore = ref(false);
		const workflow = ref();
		const workflowId = useInjectWorkflowId();
		const filtersKey = computed(() => `workflow:${workflowId.value}`);
		executionsStore.restoreFilters(filtersKey.value);
		const executionId = computed(() => {
			const id = route.params.executionId;
			return typeof id === "string" ? id : void 0;
		});
		const executions = computed(() => workflowId.value ? [...executionsStore.currentExecutionsByWorkflowId[workflowId.value] ?? [], ...executionsStore.executionsByWorkflowId[workflowId.value] ?? []] : []);
		const execution = computed(() => {
			const fromList = executions.value.find((e) => e.id === executionId.value);
			const current = currentExecution.value;
			if (!fromList) return current;
			if (current?.id === fromList.id && current.workflowVersionId) return {
				...fromList,
				workflowVersionId: current.workflowVersionId
			};
			return fromList;
		});
		const currentExecution = ref();
		const isNewWorkflowRoute = computed(() => {
			return route.query.new === "true";
		});
		watch(() => workflowId.value, () => {
			fetchWorkflow();
		});
		watch(() => executionId.value, async () => {
			await fetchExecution();
		});
		onMounted(async () => {
			fetchWorkflow();
			if (workflowId.value) await Promise.all([executionsStore.initialize(workflowId.value), fetchExecution()]);
			await initializeRoute();
			document.addEventListener("visibilitychange", onDocumentVisibilityChange);
		});
		onBeforeUnmount(() => {
			executionsStore.reset();
			document.removeEventListener("visibilitychange", onDocumentVisibilityChange);
		});
		async function fetchExecution() {
			if (!executionId.value) return;
			try {
				currentExecution.value = await executionsStore.fetchExecution(executionId.value);
				executionsStore.activeExecution = currentExecution.value;
			} catch (error) {
				toast.showError(error, i18n.baseText("nodeView.showError.openExecution.title"));
				return;
			}
			if (!currentExecution.value) {
				toast.showMessage({
					type: "error",
					title: i18n.baseText("openExecution.missingExeuctionId.title"),
					message: i18n.baseText("openExecution.missingExeuctionId.message")
				});
				return;
			}
		}
		function onDocumentVisibilityChange() {
			if (document.visibilityState === "hidden") executionsStore.stopAutoRefreshInterval();
			else executionsStore.startAutoRefreshInterval(workflowId.value);
		}
		async function initializeRoute() {
			if (route.name === VIEWS.EXECUTION_HOME && executions.value.length > 0 && workflow.value) await router.replace({
				name: VIEWS.EXECUTION_PREVIEW,
				params: {
					workflowId: workflow.value.id,
					executionId: executions.value[0].id
				},
				query: route.query
			}).catch(() => {});
		}
		function fetchWorkflow() {
			if (isNewWorkflowRoute.value || !workflowId.value) {
				workflow.value = workflowDocumentStore.value.getSnapshot();
				return;
			}
			workflow.value = workflowsListStore.workflowsById[workflowId.value] ?? workflowDocumentStore.value.getSnapshot();
		}
		async function onAutoRefreshToggle(value) {
			if (value) await executionsStore.startAutoRefreshInterval(workflowId.value);
			else executionsStore.stopAutoRefreshInterval();
		}
		async function onRefreshData() {
			if (!workflowId.value) return;
			try {
				await executionsStore.refreshExecutions({
					...executionsStore.executionsFilters,
					workflowId: workflowId.value
				});
			} catch (error) {
				if (error.errorCode === 999) toast.showMessage({
					title: i18n.baseText("executionsList.showError.refreshData.title"),
					message: error.message,
					type: "error",
					duration: 3500
				}, false);
				else toast.showError(error, i18n.baseText("executionsList.showError.refreshData.title"));
			}
		}
		async function onUpdateFilters(newFilters) {
			executionsStore.reset();
			executionsStore.setFilters(newFilters);
			executionsStore.saveFilters(filtersKey.value);
			await executionsStore.initialize(workflowId.value);
		}
		async function onExecutionStop(id) {
			if (!id) return;
			try {
				await executionsStore.stopCurrentExecution(id);
				toast.showMessage({
					title: i18n.baseText("executionsList.showMessage.stopExecution.title"),
					message: i18n.baseText("executionsList.showMessage.stopExecution.message", { interpolate: { activeExecutionId: id } }),
					type: "success"
				});
				await onRefreshData();
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.stopExecution.title"));
			}
		}
		async function onExecutionDelete(id) {
			if (!id) return;
			loading.value = true;
			try {
				const executionIndex = executions.value.findIndex((e) => e.id === id);
				const nextExecution = executions.value[executionIndex + 1] || executions.value[executionIndex - 1] || executions.value[0];
				await executionsStore.deleteExecutions({ ids: [id] });
				if (workflow.value) {
					if (executions.value.length > 0) await router.replace({
						name: VIEWS.EXECUTION_PREVIEW,
						params: {
							workflowId: workflow.value.id,
							executionId: nextExecution.id
						}
					}).catch(() => {});
					else await router.replace({
						name: VIEWS.EXECUTION_HOME,
						params: { workflowId: workflow.value.id }
					});
				}
			} catch (error) {
				loading.value = false;
				toast.showError(error, i18n.baseText("executionsList.showError.handleDeleteSelected.title"));
				return;
			}
			loading.value = false;
			toast.showMessage({
				title: i18n.baseText("executionsList.showMessage.handleDeleteSelected.title"),
				type: "success"
			});
		}
		async function onExecutionRetry(payload) {
			toast.showMessage({
				title: i18n.baseText("executionDetails.runningMessage"),
				type: "info",
				duration: 2e3
			});
			await retryExecution(payload);
			await onRefreshData();
			telemetry.track("User clicked retry execution button", {
				workflow_id: workflow.value?.id,
				execution_id: payload.id,
				retry_type: payload.loadWorkflow ? "current" : "original"
			});
		}
		async function retryExecution(payload) {
			try {
				const retriedExecution = await executionsStore.retryExecution(payload.id, payload.loadWorkflow);
				const retryMessage = executionRetryMessage(retriedExecution.status);
				if (retryMessage) toast.showMessage(retryMessage);
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.retryExecution.title"));
			}
		}
		async function onLoadMore() {
			if (!loadingMore.value) await callDebounced(loadMore, { debounceTime: 1e3 });
		}
		const hasMore = computed(() => !executionsStore.executionsFilters.status?.includes("running") && executionsStore.hasMoreExecutions);
		async function loadMore() {
			if (!hasMore.value) return;
			loadingMore.value = true;
			try {
				await executionsStore.loadMoreExecutions();
			} catch (error) {
				loadingMore.value = false;
				toast.showError(error, i18n.baseText("executionsList.showError.loadMore.title"));
				return;
			}
			loadingMore.value = false;
		}
		return (_ctx, _cache) => {
			return workflow.value ? (openBlock(), createBlock(WorkflowExecutionsList_default, {
				key: 0,
				executions: executions.value,
				execution: execution.value,
				workflow: workflow.value,
				loading: loading.value,
				"loading-more": loadingMore.value,
				"has-more": hasMore.value,
				"onExecution:stop": onExecutionStop,
				"onExecution:delete": onExecutionDelete,
				"onExecution:retry": onExecutionRetry,
				"onUpdate:filters": onUpdateFilters,
				"onUpdate:autoRefresh": onAutoRefreshToggle,
				onLoadMore,
				onReload: onRefreshData
			}, null, 8, [
				"executions",
				"execution",
				"workflow",
				"loading",
				"loading-more",
				"has-more"
			])) : createCommentVNode("", true);
		};
	}
});
//#endregion
export { WorkflowExecutionsView_default as default };
