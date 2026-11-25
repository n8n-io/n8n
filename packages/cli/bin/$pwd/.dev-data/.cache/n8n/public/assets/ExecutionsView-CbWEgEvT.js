import "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Bu as useIntersectionObserver, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Od as useCssModule, Pd as Fragment, Rd as computed, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, af as onBeforeMount, bd as I18nT, do as storeToRefs, ff as openBlock, gf as resolveComponent, hf as renderSlot, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, nu as ElSkeletonItem, of as onBeforeUnmount, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, $d as injectWorkflowDocumentStore, GS as EnterpriseEditionFeature, Hl as useExecutionsStore, Kd as useDocumentTitle, Mn as convertToDisplayDate, Nd as getExecutionEngine, PA as useMessage, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, Wj as N8nSelectedItemsInfo_default, Wp as useWorkflowsListStore, _M as Checkbox_default, dC as useToast, fA as isIndefiniteWait, fC as VIEWS, fN as N8nTooltip_default, hC as useTelemetry, hM as N8nLink_default, jN as useI18n, jd as executionRetryMessage, jn as useExecutionHelpers, nD as getResourcePermissions, vN as N8nIconButton_default, vd as useExternalHooks, wM as TableBase_default, xN as N8nIcon_default, xg as checkExhaustive, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as PageViewLayout_default } from "./PageViewLayout-BBSbPiAB.js";
import { t as ResourcesListEmptyState_default } from "./ResourcesListEmptyState-CgwRE9Zu.js";
import { t as useProjectPages } from "./useProjectPages-OdpLVExv.js";
import { r as ResourcesListLoadingState_default, t as useWorkflowsEmptyState } from "./useWorkflowsEmptyState-BMc3tLV9.js";
import { t as ProjectHeader_default } from "./ProjectHeader-D25_B2LW.js";
import { t as PrivateCredentialIcon_default } from "./PrivateCredentialIcon-LztlyFmz.js";
import { t as useInsightsStore } from "./insights.store-DnugpkOH.js";
import { t as InsightsSummary_default } from "./InsightsSummary-di7i8i9y.js";
import "./src-DnjiQGBn.js";
import { i as ConcurrentExecutionsHeader_default, n as ExecutionStopAllText_default, r as ExecutionsFilter_default, t as ExecutionsTime_default } from "./ExecutionsTime-D0g_MsOS.js";
import { t as EngineBadge_default } from "./EngineBadge-BXn1soV3.js";
//#region src/features/execution/executions/components/global/GlobalExecutionsListItemQueuedTooltip.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var GlobalExecutionsListItemQueuedTooltip_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "GlobalExecutionsListItemQueuedTooltip",
	props: {
		status: {},
		concurrencyCap: {},
		isCloudDeployment: { type: Boolean }
	},
	emits: ["goToUpgrade"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), { placement: "top" }, {
				content: withCtx(() => [props.status === "waiting" ? (openBlock(), createBlock(unref(I18nT), {
					key: 0,
					keypath: "executionsList.statusTooltipText.theWorkflowIsWaitingIndefinitely",
					scope: "global"
				})) : createCommentVNode("", true), props.status === "new" ? (openBlock(), createBlock(unref(I18nT), {
					key: 1,
					keypath: "executionsList.statusTooltipText.waitingForConcurrencyCapacity",
					scope: "global"
				}, {
					instance: withCtx(() => [props.isCloudDeployment ? (openBlock(), createBlock(unref(I18nT), {
						key: 0,
						keypath: "executionsList.statusTooltipText.waitingForConcurrencyCapacity.cloud",
						scope: "global"
					}, {
						concurrencyCap: withCtx(() => [createTextVNode(toDisplayString(props.concurrencyCap), 1)]),
						link: withCtx(() => [createVNode(unref(N8nLink_default), {
							bold: "",
							size: "small",
							class: normalizeClass(_ctx.$style.link),
							onClick: _cache[0] || (_cache[0] = ($event) => emit("goToUpgrade"))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.upgradeNow")), 1)]),
							_: 1
						}, 8, ["class"])]),
						_: 1
					})) : (openBlock(), createBlock(unref(I18nT), {
						key: 1,
						keypath: "executionsList.statusTooltipText.waitingForConcurrencyCapacity.self",
						scope: "global"
					}, {
						concurrencyCap: withCtx(() => [createTextVNode(toDisplayString(props.concurrencyCap), 1)]),
						link: withCtx(() => [createVNode(unref(N8nLink_default), {
							class: normalizeClass(_ctx.$style.link),
							href: unref(i18n).baseText("executions.concurrency.docsLink"),
							target: "_blank"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.viewDocs")), 1)]),
							_: 1
						}, 8, ["class", "href"])]),
						_: 1
					}))]),
					_: 1
				})) : createCommentVNode("", true)]),
				default: withCtx(() => [renderSlot(_ctx.$slots, "default")]),
				_: 3
			});
		};
	}
}), [["__cssModules", { "$style": { link: "_link_1uojm_1" } }]]);
//#endregion
//#region src/features/execution/executions/components/global/GlobalExecutionsListItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "execution-status" };
var _hoisted_2$1 = { "data-test-id": "execution-time" };
var _hoisted_3$1 = { "data-test-id": "execution-id" };
var _hoisted_4$1 = { key: 1 };
var _hoisted_5$1 = { key: 2 };
var _hoisted_6$1 = { key: 3 };
var GlobalExecutionsListItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "GlobalExecutionsListItem",
	props: {
		execution: {},
		selected: {
			type: Boolean,
			default: false
		},
		workflowName: { default: "" },
		workflowPermissions: {},
		executionPermissions: { default: () => ({}) },
		concurrencyCap: {},
		isCloudDeployment: { type: Boolean }
	},
	emits: [
		"stop",
		"select",
		"retrySaved",
		"retryOriginal",
		"delete",
		"goToUpgrade"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const props = __props;
		const style = useCssModule();
		const locale = useI18n();
		const executionHelpers = useExecutionHelpers();
		const settingsStore = useSettingsStore();
		const engine = computed(() => getExecutionEngine(props.execution.id));
		const engineTooltip = computed(() => locale.baseText("executionsList.engine.tooltip", { interpolate: { engine: engine.value } }));
		const isStopping = ref(false);
		const isRunning = computed(() => props.execution.status === "running");
		const isWaitTillIndefinite = computed(() => {
			if (!props.execution.waitTill) return false;
			return isIndefiniteWait(new Date(props.execution.waitTill));
		});
		const isRetriable = computed(() => executionHelpers.isExecutionRetriable(props.execution));
		const actionItems = computed(() => {
			const items = [];
			if (isRetriable.value) items.push({
				id: "retrySaved",
				label: locale.baseText("executionsList.retryWithCurrentlySavedWorkflow"),
				disabled: !props.workflowPermissions.execute,
				testId: "execution-retry-saved-dropdown-item"
			}, {
				id: "retryOriginal",
				label: locale.baseText("executionsList.retryWithOriginalWorkflow"),
				disabled: !props.workflowPermissions.execute,
				testId: "execution-retry-original-dropdown-item"
			});
			items.push({
				id: "delete",
				label: locale.baseText("generic.delete"),
				disabled: !props.executionPermissions.delete,
				testId: "execution-delete-dropdown-item",
				destructive: true
			});
			return items;
		});
		const EXECUTION_STATUS = {
			CRASHED: "crashed",
			ERROR: "error",
			WAITING: "waiting",
			SUCCESS: "success",
			NEW: "new",
			RUNNING: "running",
			UNKNOWN: "unknown",
			CANCELED: "canceled"
		};
		const executionIconStatusDictionary = {
			[EXECUTION_STATUS.CRASHED]: {
				icon: "x-circle-filled",
				color: "danger"
			},
			[EXECUTION_STATUS.ERROR]: {
				icon: "x-circle-filled",
				color: "danger"
			},
			[EXECUTION_STATUS.WAITING]: {
				icon: "hourglass-filled",
				color: "secondary"
			},
			[EXECUTION_STATUS.SUCCESS]: {
				icon: "check-circle-filled",
				color: "success"
			},
			[EXECUTION_STATUS.NEW]: {
				icon: "circle-dashed-filled",
				color: "foreground-xdark"
			},
			[EXECUTION_STATUS.RUNNING]: {
				icon: "spinner-filled",
				color: "secondary"
			},
			[EXECUTION_STATUS.UNKNOWN]: {
				icon: "question-circle-filled",
				color: "foreground-xdark"
			},
			[EXECUTION_STATUS.CANCELED]: {
				icon: "slash-circle-filled",
				color: "foreground-xdark"
			}
		};
		const errorStatuses = [EXECUTION_STATUS.ERROR, EXECUTION_STATUS.CRASHED];
		const classes = computed(() => {
			return { [style.dangerBg]: errorStatuses.includes(props.execution.status) };
		});
		const formattedStartedAtDate = computed(() => {
			return props.execution.startedAt ? formatDate(props.execution.startedAt) : locale.baseText("executionsList.startingSoon");
		});
		const formattedWaitTillDate = computed(() => {
			return props.execution.waitTill ? formatDate(props.execution.waitTill) : "";
		});
		const formattedStoppedAtDate = computed(() => {
			return props.execution.stoppedAt ? locale.displayTimer(new Date(props.execution.stoppedAt).getTime() - new Date(props.execution.startedAt ?? props.execution.createdAt).getTime(), true) : "";
		});
		function getStatusLabel(status) {
			if (status === EXECUTION_STATUS.CRASHED) return locale.baseText("executionsList.error");
			return locale.baseText(`executionsList.${status}`);
		}
		const statusRender = computed(() => {
			return {
				...executionIconStatusDictionary[props.execution.status],
				label: getStatusLabel(props.execution.status)
			};
		});
		function formatDate(fullDate) {
			const { date, time } = convertToDisplayDate(fullDate);
			return locale.baseText("executionsList.started", { interpolate: {
				time,
				date
			} });
		}
		function onStopExecution() {
			isStopping.value = true;
			emit("stop", props.execution);
		}
		function onSelect() {
			emit("select", props.execution);
		}
		async function handleActionItemClick(commandData) {
			switch (commandData) {
				case "retrySaved":
					emit("retrySaved", props.execution);
					break;
				case "retryOriginal":
					emit("retryOriginal", props.execution);
					break;
				case "delete":
					emit("delete", props.execution);
					break;
				default: checkExhaustive(commandData);
			}
		}
		return (_ctx, _cache) => {
			const _component_RouterLink = resolveComponent("RouterLink");
			return openBlock(), createElementBlock("tr", { class: normalizeClass(classes.value) }, [
				createBaseVNode("td", null, [createVNode(unref(Checkbox_default), {
					"model-value": __props.selected,
					"data-test-id": "select-execution-checkbox",
					disabled: !Boolean(__props.execution.id && __props.execution.stoppedAt),
					class: "mb-0",
					style: { marginTop: "-3px" },
					"onUpdate:modelValue": onSelect
				}, null, 8, ["model-value", "disabled"])]),
				createBaseVNode("td", null, [createVNode(unref(N8nTooltip_default), {
					content: __props.execution.workflowName || __props.workflowName,
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(_component_RouterLink, {
						to: {
							name: unref(VIEWS).EXECUTION_PREVIEW,
							params: {
								workflowId: __props.execution.workflowId,
								executionId: __props.execution.id
							}
						},
						class: normalizeClass(_ctx.$style.workflowName),
						target: "_blank"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.execution.workflowName || __props.workflowName), 1)]),
						_: 1
					}, 8, ["to", "class"])]),
					_: 1
				}, 8, ["content"])]),
				createBaseVNode("td", _hoisted_1$1, [isWaitTillIndefinite.value || __props.execution.status === EXECUTION_STATUS.NEW ? (openBlock(), createBlock(GlobalExecutionsListItemQueuedTooltip_default, {
					key: 0,
					status: props.execution.status,
					"concurrency-cap": props.concurrencyCap,
					"is-cloud-deployment": props.isCloudDeployment,
					onGoToUpgrade: _cache[0] || (_cache[0] = ($event) => emit("goToUpgrade"))
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.status) }, [createVNode(unref(N8nIcon_default), {
						size: "medium",
						icon: statusRender.value.icon,
						color: statusRender.value.color
					}, null, 8, ["icon", "color"]), createTextVNode(" " + toDisplayString(statusRender.value.label), 1)], 2)]),
					_: 1
				}, 8, [
					"status",
					"concurrency-cap",
					"is-cloud-deployment"
				])) : (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					disabled: __props.execution.status !== EXECUTION_STATUS.WAITING,
					content: unref(locale).baseText("executionsList.statusWaiting", { interpolate: {
						status: __props.execution.status,
						time: formattedWaitTillDate.value
					} })
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.status) }, [createVNode(unref(N8nIcon_default), {
						size: "medium",
						icon: statusRender.value.icon,
						color: statusRender.value.color,
						spin: isRunning.value
					}, null, 8, [
						"icon",
						"color",
						"spin"
					]), createTextVNode(" " + toDisplayString(statusRender.value.label), 1)], 2)]),
					_: 1
				}, 8, ["disabled", "content"]))]),
				createBaseVNode("td", null, toDisplayString(formattedStartedAtDate.value), 1),
				createBaseVNode("td", _hoisted_2$1, [formattedStoppedAtDate.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(formattedStoppedAtDate.value), 1)], 64)) : (openBlock(), createBlock(ExecutionsTime_default, {
					key: 1,
					"start-time": __props.execution.startedAt ?? __props.execution.createdAt
				}, null, 8, ["start-time"]))]),
				createBaseVNode("td", null, [__props.execution.id && unref(settingsStore).isEngineV2Enabled ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(EngineBadge_default, {
					engine: engine.value,
					class: "mr-3xs",
					"data-test-id": "execution-engine-badge"
				}, null, 8, ["engine"]), createVNode(unref(N8nTooltip_default), {
					content: engineTooltip.value,
					placement: "top"
				}, {
					default: withCtx(() => [createBaseVNode("span", _hoisted_3$1, toDisplayString(__props.execution.id), 1)]),
					_: 1
				}, 8, ["content"])], 64)) : __props.execution.id ? (openBlock(), createElementBlock("span", _hoisted_4$1, toDisplayString(__props.execution.id), 1)) : createCommentVNode("", true), __props.execution.retryOf ? (openBlock(), createElementBlock("span", _hoisted_5$1, [_cache[2] || (_cache[2] = createBaseVNode("br", null, null, -1)), createBaseVNode("small", null, " (" + toDisplayString(unref(locale).baseText("executionsList.retryOf")) + " " + toDisplayString(__props.execution.retryOf) + ") ", 1)])) : __props.execution.retrySuccessId ? (openBlock(), createElementBlock("span", _hoisted_6$1, [_cache[3] || (_cache[3] = createBaseVNode("br", null, null, -1)), createBaseVNode("small", null, " (" + toDisplayString(unref(locale).baseText("executionsList.successRetry")) + " " + toDisplayString(__props.execution.retrySuccessId) + ") ", 1)])) : createCommentVNode("", true)]),
				createBaseVNode("td", { class: normalizeClass(_ctx.$style.modeCell) }, [__props.execution.mode === "manual" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: unref(locale).baseText("executionsList.manualExecution"),
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "flask-conical" })]),
					_: 1
				}, 8, ["content"])) : __props.execution.mode === "chat" ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					content: unref(locale).baseText("executionsList.chatExecution"),
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "messages-square" })]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true), __props.execution.usedPrivateCredentials ? (openBlock(), createBlock(PrivateCredentialIcon_default, {
					key: 2,
					"data-test-id": "global-execution-private-credential",
					"tooltip-text": unref(locale).baseText("executions.privateCredential.tooltip")
				}, null, 8, ["tooltip-text"])) : createCommentVNode("", true)], 2),
				createBaseVNode("td", null, [!__props.execution.stoppedAt || __props.execution.waitTill ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "ghost",
					"data-test-id": "stop-execution-button",
					loading: isStopping.value,
					disabled: isStopping.value,
					onClick: withModifiers(onStopExecution, ["stop"])
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("executionsList.stop")), 1)]),
					_: 1
				}, 8, ["loading", "disabled"])) : createCommentVNode("", true)]),
				createBaseVNode("td", null, [!isRunning.value ? (openBlock(), createBlock(unref(DropdownMenu_default), {
					key: 0,
					items: actionItems.value,
					placement: "bottom-end",
					onSelect: handleActionItemClick
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "outline",
						icon: "ellipsis",
						"data-test-id": "execution-actions-menu",
						onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
					})]),
					_: 1
				}, 8, ["items"])) : createCommentVNode("", true)])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	modeCell: "_modeCell_13m38_1",
	status: "_status_13m38_13",
	dangerBg: "_dangerBg_13m38_19",
	workflowName: "_workflowName_13m38_23"
} }]]);
//#endregion
//#region src/features/execution/executions/components/global/GlobalExecutionsList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { key: 0 };
var _hoisted_2 = { style: { "width": "50px" } };
var _hoisted_3 = { colspan: "8" };
var _hoisted_4 = { style: { "width": "50px" } };
var _hoisted_5 = {
	colspan: "9",
	style: { "text-align": "center" }
};
var _hoisted_6 = {
	key: 0,
	"data-test-id": "execution-list-empty"
};
var GlobalExecutionsList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "GlobalExecutionsList",
	props: {
		executions: {},
		filters: {},
		total: { default: 0 },
		concurrentTotal: { default: 0 }
	},
	emits: ["update:filters", "execution:stop"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const workflowsListStore = useWorkflowsListStore();
		const executionsStore = useExecutionsStore();
		const settingsStore = useSettingsStore();
		const pageRedirectionHelper = usePageRedirectionHelper();
		const autoRefresh = computed({
			get: () => executionsStore.autoRefresh,
			set: (value) => {
				executionsStore.autoRefresh = value;
			}
		});
		const allVisibleSelected = ref(false);
		const allExistingSelected = ref(false);
		const selectedItems = ref({});
		const isInitialLoad = ref(true);
		const message = useMessage();
		const toast = useToast();
		const selectedCount = computed(() => {
			if (allExistingSelected.value) return props.total;
			return Object.keys(selectedItems.value).length;
		});
		const workflows = computed(() => {
			return [{
				id: "all",
				name: i18n.baseText("executionsList.allWorkflows")
			}, ...workflowsListStore.allWorkflows];
		});
		const isAnnotationEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters]);
		const showConcurrencyHeader = computed(() => settingsStore.isConcurrencyEnabled && !settingsStore.isQueueModeEnabled);
		watch(() => props.executions, () => {
			if (props.executions.length === 0) handleClearSelection();
			adjustSelectionAfterMoreItemsLoaded();
		});
		watch(() => executionsStore.loading, (isLoading, wasLoading) => {
			if (wasLoading && !isLoading) isInitialLoad.value = false;
		});
		function handleCheckAllExistingChange() {
			allExistingSelected.value = !allExistingSelected.value;
			allVisibleSelected.value = !allExistingSelected.value;
			handleCheckAllVisibleChange();
		}
		function handleCheckAllVisibleChange() {
			allVisibleSelected.value = !allVisibleSelected.value;
			if (!allVisibleSelected.value) {
				allExistingSelected.value = false;
				selectedItems.value = {};
			} else selectAllVisibleExecutions();
		}
		function toggleSelectExecution(execution) {
			const executionId = execution.id;
			if (selectedItems.value[executionId]) {
				const { [executionId]: removedSelectedItem, ...rest } = selectedItems.value;
				selectedItems.value = rest;
			} else selectedItems.value = {
				...selectedItems.value,
				[executionId]: true
			};
			allVisibleSelected.value = Object.keys(selectedItems.value).length === props.executions.length;
			allExistingSelected.value = Object.keys(selectedItems.value).length === props.total;
		}
		async function handleDeleteSelected() {
			const confirmationText = [isAnnotationEnabled.value && i18n.baseText("executionsList.confirmMessage.annotationsNote"), i18n.baseText("executionsList.confirmMessage.message", { interpolate: { count: selectedCount.value.toString() } })].filter(Boolean).join(" ");
			if (await message.confirm(confirmationText, i18n.baseText("executionsList.confirmMessage.headline"), {
				type: "warning",
				confirmButtonText: i18n.baseText("executionsList.confirmMessage.confirmButtonText"),
				cancelButtonText: i18n.baseText("executionsList.confirmMessage.cancelButtonText")
			}) !== "confirm") return;
			try {
				await executionsStore.deleteExecutions({
					filters: executionsStore.executionsFilters,
					...allExistingSelected.value ? { deleteBefore: /* @__PURE__ */ new Date() } : { ids: Object.keys(selectedItems.value) }
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.handleDeleteSelected.title"));
				return;
			}
			toast.showMessage({
				title: i18n.baseText("executionsList.showMessage.handleDeleteSelected.title"),
				type: "success"
			});
			handleClearSelection();
		}
		function handleClearSelection() {
			allVisibleSelected.value = false;
			allExistingSelected.value = false;
			selectedItems.value = {};
		}
		async function onFilterChanged(filters) {
			emit("update:filters", filters);
			handleClearSelection();
		}
		function getExecutionWorkflowName(execution) {
			return getWorkflowName(execution.workflowId ?? "") ?? i18n.baseText("executionsList.unsavedWorkflow");
		}
		function getExecutionWorkflowPermissions(execution) {
			return getResourcePermissions(execution.scopes).workflow;
		}
		function getExecutionPermissions(execution) {
			return getResourcePermissions(execution.scopes).execution;
		}
		function getWorkflowName(workflowId) {
			return workflows.value.find((data) => data.id === workflowId)?.name;
		}
		const loadMoreRef = useTemplateRef("loadMoreButton");
		useIntersectionObserver(loadMoreRef, ([entry]) => {
			if (!entry?.isIntersecting) return;
			if (executionsStore.loading) return;
			loadMore();
		});
		async function loadMore() {
			if (executionsStore.filters.status === "running") return;
			try {
				await executionsStore.loadMoreExecutions();
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.loadMore.title"));
			}
		}
		function selectAllVisibleExecutions() {
			props.executions.forEach((execution) => {
				selectedItems.value[execution.id] = true;
			});
		}
		function adjustSelectionAfterMoreItemsLoaded() {
			if (allExistingSelected.value) {
				allVisibleSelected.value = true;
				selectAllVisibleExecutions();
			}
		}
		async function retrySavedExecution(execution) {
			await retryExecution(execution, true);
		}
		async function retryOriginalExecution(execution) {
			await retryExecution(execution, false);
		}
		async function retryExecution(execution, loadWorkflow) {
			try {
				const retriedExecution = await executionsStore.retryExecution(execution.id, loadWorkflow);
				const retryMessage = executionRetryMessage(retriedExecution.status);
				if (retryMessage) toast.showMessage(retryMessage);
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.retryExecution.title"));
			}
			telemetry.track("User clicked retry execution button", {
				workflow_id: "",
				execution_id: execution.id,
				retry_type: loadWorkflow ? "current" : "original"
			});
		}
		async function stopExecution(execution) {
			try {
				await executionsStore.stopCurrentExecution(execution.id);
				toast.showMessage({
					title: i18n.baseText("executionsList.showMessage.stopExecution.title"),
					message: i18n.baseText("executionsList.showMessage.stopExecution.message", { interpolate: { activeExecutionId: execution.id } }),
					type: "success"
				});
				emit("execution:stop");
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.stopExecution.title"));
			}
		}
		async function deleteExecution(execution) {
			if (!!execution.annotation && (execution.annotation.vote || execution.annotation.tags.length > 0)) {
				if (await message.confirm(i18n.baseText("executionsList.confirmMessage.annotatedExecutionMessage"), i18n.baseText("executionDetails.confirmMessage.headline"), {
					type: "warning",
					confirmButtonText: i18n.baseText("executionDetails.confirmMessage.confirmButtonText"),
					cancelButtonText: ""
				}) !== "confirm") return;
			}
			try {
				await executionsStore.deleteExecutions({ ids: [execution.id] });
				if (allVisibleSelected.value) {
					const { [execution.id]: _, ...rest } = selectedItems.value;
					selectedItems.value = rest;
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.handleDeleteSelected.title"));
			}
		}
		async function onAutoRefreshToggle(value) {
			if (value) await executionsStore.startAutoRefreshInterval();
			else executionsStore.stopAutoRefreshInterval();
		}
		const goToUpgrade = () => {
			pageRedirectionHelper.goToUpgrade("concurrency", "upgrade-concurrency");
		};
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.execListWrapper) }, [
				renderSlot(_ctx.$slots, "default"),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.execListHeaderControls) }, [showConcurrencyHeader.value ? (openBlock(), createBlock(ConcurrentExecutionsHeader_default, {
					key: 0,
					"running-executions-count": __props.concurrentTotal,
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
				])) : (openBlock(), createBlock(unref(Checkbox_default), {
					key: 1,
					modelValue: autoRefresh.value,
					"onUpdate:modelValue": [_cache[0] || (_cache[0] = ($event) => autoRefresh.value = $event), onAutoRefreshToggle],
					"data-test-id": "execution-auto-refresh-checkbox",
					label: unref(i18n).baseText("executionsList.autoRefresh")
				}, null, 8, ["modelValue", "label"])), createBaseVNode("div", { class: normalizeClass(_ctx.$style.execHeaderRight) }, [createVNode(ExecutionStopAllText_default, { executions: props.executions }, null, 8, ["executions"]), createVNode(ExecutionsFilter_default, {
					"initial-filters": props.filters,
					workflows: workflows.value,
					class: "execFilter",
					onFilterChanged
				}, null, 8, ["initial-filters", "workflows"])], 2)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.execList) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.execTable) }, [createVNode(unref(TableBase_default), null, {
					default: withCtx(() => [createBaseVNode("thead", null, [allVisibleSelected.value && __props.total > 0 ? (openBlock(), createElementBlock("tr", _hoisted_1, [createBaseVNode("th", _hoisted_2, [createVNode(unref(Checkbox_default), {
						"model-value": allExistingSelected.value,
						"data-test-id": "select-all-executions-checkbox",
						class: "mb-0",
						"onUpdate:modelValue": handleCheckAllExistingChange
					}, null, 8, ["model-value"])]), createBaseVNode("th", _hoisted_3, toDisplayString(unref(i18n).baseText("executionsList.selectAll", {
						adjustToNumber: __props.total,
						interpolate: { count: `${__props.total}` }
					})), 1)])) : createCommentVNode("", true), createBaseVNode("tr", null, [
						createBaseVNode("th", _hoisted_4, [createVNode(unref(Checkbox_default), {
							"model-value": allVisibleSelected.value,
							disabled: __props.total < 1,
							"data-test-id": "select-visible-executions-checkbox",
							class: "mb-0",
							"onUpdate:modelValue": handleCheckAllVisibleChange
						}, null, 8, ["model-value", "disabled"])]),
						createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("generic.workflow")), 1),
						createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("executionsList.status")), 1),
						createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("executionsList.startedAt")), 1),
						createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("executionsList.runTime")), 1),
						createBaseVNode("th", null, toDisplayString(unref(i18n).baseText("executionsList.id")), 1),
						_cache[2] || (_cache[2] = createBaseVNode("th", null, null, -1)),
						_cache[3] || (_cache[3] = createBaseVNode("th", { style: { "width": "69px" } }, null, -1)),
						_cache[4] || (_cache[4] = createBaseVNode("th", { style: { "width": "50px" } }, null, -1))
					])]), createBaseVNode("tbody", null, [
						(openBlock(true), createElementBlock(Fragment, null, renderList(__props.executions, (execution) => {
							return openBlock(), createBlock(GlobalExecutionsListItem_default, {
								key: execution.id,
								execution,
								"workflow-name": getExecutionWorkflowName(execution),
								"workflow-permissions": getExecutionWorkflowPermissions(execution),
								"execution-permissions": getExecutionPermissions(execution),
								selected: selectedItems.value[execution.id] || allExistingSelected.value,
								"concurrency-cap": unref(settingsStore).concurrency,
								"is-cloud-deployment": unref(settingsStore).isCloudDeployment,
								"data-test-id": "global-execution-list-item",
								onStop: stopExecution,
								onDelete: deleteExecution,
								onSelect: toggleSelectExecution,
								onRetrySaved: retrySavedExecution,
								onRetryOriginal: retryOriginalExecution,
								onGoToUpgrade: goToUpgrade
							}, null, 8, [
								"execution",
								"workflow-name",
								"workflow-permissions",
								"execution-permissions",
								"selected",
								"concurrency-cap",
								"is-cloud-deployment"
							]);
						}), 128)),
						isInitialLoad.value && unref(executionsStore).loading && !__props.executions.length ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(unref(executionsStore).itemsPerPage, (item) => {
							return openBlock(), createElementBlock("tr", { key: item }, [(openBlock(), createElementBlock(Fragment, null, renderList(9, (col) => {
								return createBaseVNode("td", { key: col }, [createVNode(unref(ElSkeletonItem))]);
							}), 64))]);
						}), 128)) : createCommentVNode("", true),
						createBaseVNode("tr", null, [createBaseVNode("td", _hoisted_5, [!__props.executions.length ? (openBlock(), createElementBlock("span", _hoisted_6, toDisplayString(unref(i18n).baseText("executionsList.empty")), 1)) : unref(executionsStore).hasMoreExecutions ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 1,
							ref: "loadMoreButton",
							icon: "refresh-cw",
							title: unref(i18n).baseText("executionsList.loadMore"),
							label: unref(i18n).baseText("executionsList.loadMore"),
							loading: unref(executionsStore).loading,
							"data-test-id": "load-more-button",
							onClick: _cache[1] || (_cache[1] = ($event) => loadMore())
						}, null, 8, [
							"title",
							"label",
							"loading"
						])) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [createTextVNode(toDisplayString(unref(i18n).baseText("executionsList.loadedAll")), 1)], 64))])])
					])]),
					_: 1
				})], 2), createVNode(unref(N8nSelectedItemsInfo_default), {
					"selected-count": selectedCount.value,
					onDeleteSelected: handleDeleteSelected,
					onClearSelection: handleClearSelection
				}, null, 8, ["selected-count"])], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	execListWrapper: "_execListWrapper_9tell_113",
	execList: "_execList_9tell_113",
	execListHeaderControls: "_execListHeaderControls_9tell_133",
	execTable: "_execTable_9tell_140",
	execHeaderRight: "_execHeaderRight_9tell_145"
} }]]);
//#endregion
//#region src/features/execution/executions/views/ExecutionsView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/execution/executions/views/ExecutionsView.vue
var ExecutionsView_default = /* @__PURE__ */ defineComponent({
	__name: "ExecutionsView",
	setup(__props) {
		const route = useRoute();
		const router = useRouter();
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const externalHooks = useExternalHooks();
		const workflowsListStore = useWorkflowsListStore();
		const executionsStore = useExecutionsStore();
		const insightsStore = useInsightsStore();
		const documentTitle = useDocumentTitle();
		const toast = useToast();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const overview = useProjectPages();
		const { readOnlyEnv, projectPermissions } = useWorkflowsEmptyState();
		const { executionsCount, concurrentExecutionsCount, filters, allExecutions } = storeToRefs(executionsStore);
		const workflowsFetchSettled = ref(false);
		const projectId = computed(() => {
			const value = route.params?.projectId;
			return typeof value === "string" ? value : void 0;
		});
		const filtersKey = computed(() => `project:${projectId.value ?? "overview"}`);
		executionsStore.restoreFilters(filtersKey.value);
		const workflowCount = computed(() => workflowsListStore.allWorkflows.length);
		const hasFetchedWorkflowsForProject = computed(() => workflowsListStore.hasFetchedAllWorkflows(projectId.value));
		const hasNoWorkflows = computed(() => hasFetchedWorkflowsForProject.value && workflowCount.value === 0);
		const resolvingWorkflowsEmptiness = computed(() => !workflowsFetchSettled.value && !hasFetchedWorkflowsForProject.value);
		const goToCreateWorkflow = () => {
			router.push({
				name: VIEWS.NEW_WORKFLOW,
				query: { projectId: projectId.value }
			});
		};
		async function loadWorkflowsForCurrentProject() {
			workflowsFetchSettled.value = false;
			try {
				await loadWorkflows();
			} finally {
				workflowsFetchSettled.value = true;
			}
		}
		onBeforeMount(async () => {
			await loadWorkflowsForCurrentProject();
			externalHooks.run("executionsList.openDialog");
			telemetry.track("User opened Executions log", { workflow_id: workflowDocumentStore.value.workflowId });
		});
		watch(projectId, async () => {
			executionsStore.reset();
			executionsStore.restoreFilters(filtersKey.value);
			await Promise.all([executionsStore.initialize(), loadWorkflowsForCurrentProject()]);
		});
		onMounted(async () => {
			documentTitle.set(i18n.baseText("executionsList.workflowExecutions"));
			document.addEventListener("visibilitychange", onDocumentVisibilityChange);
			await executionsStore.initialize();
		});
		onBeforeUnmount(() => {
			executionsStore.reset();
			document.removeEventListener("visibilitychange", onDocumentVisibilityChange);
		});
		async function loadWorkflows() {
			try {
				await workflowsListStore.fetchAllWorkflows(projectId.value);
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.loadWorkflows.title"));
			}
		}
		function onDocumentVisibilityChange() {
			if (document.visibilityState === "hidden") executionsStore.stopAutoRefreshInterval();
			else executionsStore.startAutoRefreshInterval();
		}
		async function onRefreshData() {
			try {
				await executionsStore.refreshExecutions();
			} catch (error) {
				toast.showError(error, i18n.baseText("executionsList.showError.refreshData.title"));
			}
		}
		async function onUpdateFilters(newFilters) {
			executionsStore.reset();
			executionsStore.setFilters(newFilters);
			executionsStore.saveFilters(filtersKey.value);
			await executionsStore.initialize();
		}
		async function onExecutionStop() {
			await onRefreshData();
		}
		return (_ctx, _cache) => {
			return resolvingWorkflowsEmptiness.value ? (openBlock(), createBlock(ResourcesListLoadingState_default, {
				key: 0,
				"data-test-id": "executions-loading-state"
			})) : hasNoWorkflows.value ? (openBlock(), createBlock(PageViewLayout_default, { key: 1 }, {
				header: withCtx(() => [createVNode(ProjectHeader_default, null, {
					default: withCtx(() => [unref(overview).isOverviewSubPage && unref(insightsStore).isSummaryEnabled ? (openBlock(), createBlock(unref(InsightsSummary_default), {
						key: 0,
						loading: unref(insightsStore).weeklySummary.isLoading,
						summary: unref(insightsStore).weeklySummary.state,
						"time-range": "week"
					}, null, 8, ["loading", "summary"])) : createCommentVNode("", true)]),
					_: 1
				})]),
				default: withCtx(() => [createBaseVNode("div", null, [createVNode(ResourcesListEmptyState_default, {
					"resource-key": "executions",
					"button-disabled": unref(readOnlyEnv) || !unref(projectPermissions).workflow.create,
					"disabled-tooltip-text": unref(readOnlyEnv) ? unref(i18n).baseText("readOnlyEnv.cantAdd.workflow") : void 0,
					"onClick:button": goToCreateWorkflow
				}, null, 8, ["button-disabled", "disabled-tooltip-text"])])]),
				_: 1
			})) : (openBlock(), createBlock(GlobalExecutionsList_default, {
				key: filtersKey.value,
				executions: unref(allExecutions),
				filters: unref(filters),
				total: unref(executionsCount),
				"concurrent-total": unref(concurrentExecutionsCount),
				"onExecution:stop": onExecutionStop,
				"onUpdate:filters": onUpdateFilters
			}, {
				default: withCtx(() => [createVNode(ProjectHeader_default, null, {
					default: withCtx(() => [unref(overview).isOverviewSubPage && unref(insightsStore).isSummaryEnabled ? (openBlock(), createBlock(unref(InsightsSummary_default), {
						key: 0,
						loading: unref(insightsStore).weeklySummary.isLoading,
						summary: unref(insightsStore).weeklySummary.state,
						"time-range": "week"
					}, null, 8, ["loading", "summary"])) : createCommentVNode("", true)]),
					_: 1
				})]),
				_: 1
			}, 8, [
				"executions",
				"filters",
				"total",
				"concurrent-total"
			]));
		};
	}
});
//#endregion
export { ExecutionsView_default as default };
