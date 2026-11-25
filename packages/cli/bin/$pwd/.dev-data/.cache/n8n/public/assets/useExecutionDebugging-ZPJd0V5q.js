import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Ad as vModelText, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Eu as useActiveElement, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Jf as toValue, Kd as createVNode, Kf as toRef, Lf as markRaw, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Oa as v4, Of as withDirectives, Ou as useClipboard, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Ru as useFileDialog, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Wf as shallowRef, Xd as guardReactiveProps, Xf as unref, Xo as useRouter, Yo as useRoute, Zd as h, _f as resolveDirective, _p as normalizeClass, bd as I18nT, ef as inject, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, jd as vShow, jr as require_upperFirst, lf as onMounted, mf as renderList, of as onBeforeUnmount, pf as provide, qf as toRefs, rf as mergeProps, td as useTimestamp, uf as onUnmounted, vf as resolveDynamicComponent, vp as normalizeProps, wd as createApp, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $d as injectWorkflowDocumentStore, $u as canvasEventBus, Al as MessageComponentKey, BA as sanitizeHtml, Bd as injectWorkflowExecutionStateStore, C_ as DEBUG_PAYWALL_MODAL_KEY, Cl as chatEventBus, Dg as isFullExecutionResponse, Dl as ChatOptionsSymbol, Ej as useResizablePanel, El as shouldBlockUserInput, Fl as useOptions, GS as EnterpriseEditionFeature, Il as useChat, Jg as useUIStore, Kd as useDocumentTitle, Kp as injectNDVStore, LA as getScrollbarWidth, Mh as AGENT_SESSION_DETAIL_VIEW, Ml as MarkdownRenderer_default, Nl as Button_default, OM as PopOutWindowKey, Od as useWorkflowsStore, Ol as ChatSymbol, On as RunData_default, PA as useMessage, Pl as useI18n$1, Rd as waitingNodeTooltip, Rn as RedactedDataState_default, Ru as usePageRedirectionHelper, SN as _plugin_vue_export_helper_default, Sl as LOG_DETAILS_PANEL_STATE, Tj as N8nResizeWrapper_default, Tl as parseBotChatMessageContent, Ur as useInjectWorkflowId, Vd as useWorkflowExecutionStateStore, Vu as ndvEventBus, Wc as useRunWorkflow, XM as N8nActionDropdown_default, Xc as usePushConnectionStore, Xd as createWorkflowDocumentId, Zl as useAiSimulatedDataGuard, _N as N8nText_default, _l as useLogsStore, bC as useRootStore, bl as LOCAL_STORAGE_PANEL_WIDTH, bm as useSourceControlStore, dC as useToast, dl as useExperimentalNdvStore, fC as VIEWS, fN as N8nTooltip_default, gN as useProvideTooltipAppendTo, hC as useTelemetry, hM as N8nLink_default, hl as isChatNode, hu as NodeIcon_default, jN as useI18n, jl as MessageWithButtons_default, kj as N8nSegmentControl_default, kl as localStorageSessionIdKey, kn as RunDataItemCount_default, lS as LogsPanelHostKey, lk as displayParameter, ln as KeyboardShortcutTooltip_default, mM as N8nOption_default, pM as N8nSelect_default, pk as getNodeParameters, tr as NDVEmptyState_default, uf as useNodeTypesStore, vN as N8nIconButton_default, vl as LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH, wl as constructChatWebsocketUrl, xN as N8nIcon_default, xl as LOGS_PANEL_STATE, yC as useSettingsStore, yN as N8nButton_default, yd as useCanvasStore, yl as LOCAL_STORAGE_PANEL_HEIGHT, zO as isTrimmedNodeExecutionData, zn as useExecutionRedaction } from "./app-D5flEmb-.js";
import { t as useKeybindings } from "./useKeybindings-DShLgy_J.js";
import { _ as restoreChatHistory, a as LogsViewConsumedTokenCountText_default, c as findLogEntryRec, d as getDepth, f as getEntryAtRelativeIndex, g as isSubNodeLog, h as isPlaceholderLog, i as LogsViewNodeName_default, l as findSelectedLogEntry, m as getTotalConsumedTokens, n as useLogsExecutionData, p as getSubtreeTotalConsumedTokens, r as LogsOverviewRows_default, t as useLogsTreeExpand, v as isGroupLog, y as isNodeLog } from "./useLogsTreeExpand-U8P-Iosx.js";
import { t as ChatFile_default } from "./ChatFile-IZLktBVs.js";
import { r as getRespondingModelName } from "./utils-BURAX59V.js";
//#region src/features/execution/logs/composables/useChatState.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useChatState(isReadOnly, sessionId) {
	const locale = useI18n();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowExecutionState = injectWorkflowExecutionStateStore();
	const rootStore = useRootStore();
	const logsStore = useLogsStore();
	const router = useRouter();
	const nodeTypesStore = useNodeTypesStore();
	const pushConnectionStore = usePushConnectionStore();
	const { runWorkflow } = useRunWorkflow({ router });
	const webhookRegistered = ref(false);
	const isRegistering = ref(false);
	const messages = computed(() => logsStore.chatSessionMessages);
	const currentSessionId = computed(() => logsStore.chatSessionId);
	const effectiveSessionId = computed(() => toValue(sessionId) ?? currentSessionId.value);
	const previousChatMessages = computed(() => workflowExecutionState.value.getPastChatMessages);
	const chatTriggerNode = computed(() => workflowDocumentStore.value.allNodes.find(isChatNode) ?? null);
	const getOptionsValue = (parameterName) => {
		const node = chatTriggerNode.value;
		const nodeType = node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
		if (!node || !nodeType) return;
		const resolvedParams = getNodeParameters(nodeType.properties, node.parameters, true, false, node, nodeType) ?? {};
		const optionsValues = resolvedParams.options ?? {};
		if (parameterName in optionsValues) return optionsValues[parameterName];
		const optionsParam = nodeType.properties.find((prop) => prop.name === "options" && prop.type === "collection" && displayParameter(resolvedParams, prop, node, nodeType));
		for (const opt of optionsParam?.options ?? []) {
			if (opt.name !== parameterName || !("default" in opt)) continue;
			if (displayParameter(optionsValues, opt, node, nodeType, resolvedParams)) return opt.default;
		}
	};
	const isStreamingEnabled = computed(() => getOptionsValue("responseMode") === "streaming");
	const isFileUploadsAllowed = computed(() => getOptionsValue("allowFileUploads") === true);
	const allowedFilesMimeTypesComputed = computed(() => getOptionsValue("allowedFilesMimeTypes"));
	const isWorkflowReadyForChat = computed(() => {
		if (!chatTriggerNode.value) return false;
		if (!workflowsStore.workflowId && !workflowsStore.isNewWorkflow) return false;
		return true;
	});
	const webhookUrl = computed(() => {
		if (!chatTriggerNode.value) return "";
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) return "";
		return `${rootStore.webhookTestUrl}/${workflowId}/${effectiveSessionId.value}`;
	});
	async function registerChatWebhook() {
		if (isRegistering.value || !chatTriggerNode.value) return;
		isRegistering.value = true;
		try {
			if (!pushConnectionStore.isConnected) await new Promise((resolve, reject) => {
				let stop = () => {};
				const timeout = setTimeout(() => {
					stop();
					reject(/* @__PURE__ */ new Error("Push connection timeout"));
				}, 1e4);
				stop = watch(() => pushConnectionStore.isConnected, (connected) => {
					if (connected) {
						clearTimeout(timeout);
						stop();
						resolve();
					}
				}, { immediate: true });
			});
			workflowExecutionState.value.setWorkflowExecutionData(null);
			workflowExecutionState.value.setActiveExecutionId(void 0);
			const runWorkflowOptions = {
				triggerNode: chatTriggerNode.value.name,
				source: "RunData.ManualChatTrigger",
				sessionId: effectiveSessionId.value
			};
			if (workflowExecutionState.value.chatPartialExecutionDestinationNode) {
				runWorkflowOptions.destinationNode = {
					nodeName: workflowExecutionState.value.chatPartialExecutionDestinationNode,
					mode: "inclusive"
				};
				workflowExecutionState.value.setChatPartialExecutionDestinationNode(null);
			}
			if (!await runWorkflow(runWorkflowOptions)) throw new Error("Failed to register chat webhook");
			webhookRegistered.value = true;
		} finally {
			isRegistering.value = false;
		}
	}
	const chatOptionsComputed = computed(() => {
		return {
			webhookUrl: webhookUrl.value,
			webhookConfig: {
				method: "POST",
				headers: { "Content-Type": "application/json" }
			},
			mode: "fullscreen",
			showWindowCloseButton: false,
			showWelcomeScreen: false,
			sessionId: effectiveSessionId.value,
			enableStreaming: isStreamingEnabled.value,
			enableMessageActions: true,
			allowFileUploads: isFileUploadsAllowed.value,
			allowedFilesMimeTypes: allowedFilesMimeTypesComputed.value,
			chatInputKey: "chatInput",
			chatSessionKey: "sessionId",
			defaultLanguage: "en",
			messageComponents: { [MessageComponentKey.WITH_BUTTONS]: MessageWithButtons_default },
			messageHistory: isReadOnly ? restoredChatMessages.value : messages.value,
			disabled: ref(isReadOnly),
			i18n: { en: {
				title: locale.baseText("chat.window.title") || "Chat",
				repostButton: locale.baseText("chat.window.chat.chatMessageOptions.repostMessage") || "Repost message",
				reuseButton: locale.baseText("chat.window.chat.chatMessageOptions.reuseMessage") || "Reuse message",
				subtitle: "",
				footer: "",
				getStarted: "",
				inputPlaceholder: locale.baseText("chat.window.chat.placeholder") || "Type your message...",
				closeButtonTooltip: ""
			} },
			beforeMessageSent: async (message) => {
				if (!isReadOnly) {
					await registerChatWebhook();
					logsStore.addChatMessage({
						id: v4(),
						text: message,
						sender: "user"
					});
				}
			},
			afterMessageSent: (_message, response) => {
				if (isReadOnly || !response) return;
				if (response.hasReceivedChunks) {
					const message = response.message;
					if (message && typeof message === "object" && "text" in message) logsStore.addChatMessage({
						id: message.id,
						text: message.text,
						sender: "bot"
					});
					return;
				}
				const botMessage = response.output ?? response.text ?? response.message;
				logsStore.addChatMessage({
					id: v4(),
					text: typeof botMessage === "string" ? botMessage : JSON.stringify(response),
					sender: "bot"
				});
			}
		};
	});
	const restoredChatMessages = computed(() => restoreChatHistory(workflowExecutionState.value.activeExecution, locale.baseText("chat.window.chat.response.empty"), locale.baseText("chat.window.chat.response.redacted")));
	function refreshSession() {
		workflowExecutionState.value.setWorkflowExecutionData(null);
		logsStore.resetChatSessionId();
		logsStore.resetMessages();
		workflowExecutionState.value.setChatPartialExecutionDestinationNode(null);
		if (logsStore.isOpen) chatEventBus.emit("focusInput");
	}
	function displayExecution(executionId) {
		const route = router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: {
				workflowId: workflowsStore.workflowId,
				executionId
			}
		});
		window.open(route.href, "_blank");
	}
	watch(() => workflowsStore.workflowId, (_newWorkflowId, prevWorkflowId) => {
		if (!prevWorkflowId) return;
		refreshSession();
	});
	return {
		currentSessionId: computed(() => logsStore.chatSessionId),
		previousChatMessages,
		refreshSession,
		displayExecution,
		chatTriggerNode,
		isStreamingEnabled,
		isFileUploadsAllowed,
		allowedFilesMimeTypes: allowedFilesMimeTypesComputed,
		isWorkflowReadyForChat,
		webhookUrl,
		chatOptions: chatOptionsComputed,
		registerChatWebhook,
		webhookRegistered,
		isRegistering
	};
}
//#endregion
//#region src/features/execution/logs/components/LogsPanelHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var LogsPanelHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LogsPanelHeader",
	props: {
		title: {},
		isClickable: { type: Boolean }
	},
	emits: ["click"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		function handleClick() {
			if (__props.isClickable) emit("click");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("header", {
				class: normalizeClass([_ctx.$style.container, { [_ctx.$style.clickable]: __props.isClickable }]),
				onClick: handleClick
			}, [createVNode(unref(N8nText_default), {
				class: normalizeClass(_ctx.$style.title),
				bold: true,
				size: "small"
			}, {
				default: withCtx(() => [renderSlot(_ctx.$slots, "title", {}, () => [createTextVNode(toDisplayString(__props.title), 1)])]),
				_: 3
			}, 8, ["class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [renderSlot(_ctx.$slots, "actions")], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1ro3h_1",
	clickable: "_clickable_1ro3h_14",
	title: "_title_1ro3h_22",
	actions: "_actions_1ro3h_30"
} }]]);
//#endregion
//#region src/features/execution/logs/components/LogsViewExecutionSummary.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var import_upperFirst = /* @__PURE__ */ __toESM(require_upperFirst(), 1);
var LogsViewExecutionSummary_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LogsViewExecutionSummary",
	props: {
		status: {},
		consumedTokens: {},
		startTime: {},
		timeTook: {},
		respondingModel: {}
	},
	setup(__props) {
		const locale = useI18n();
		const now = useTimestamp({ interval: 1e3 });
		const executionStatusText = computed(() => __props.status === "running" || __props.status === "waiting" ? locale.baseText("logs.overview.body.summaryText.for", { interpolate: {
			status: (0, import_upperFirst.default)(__props.status),
			time: locale.displayTimer(Math.floor((now.value - __props.startTime) / 1e3) * 1e3, true)
		} }) : __props.timeTook === void 0 ? (0, import_upperFirst.default)(__props.status) : locale.baseText("logs.overview.body.summaryText.in", { interpolate: {
			status: (0, import_upperFirst.default)(__props.status),
			time: locale.displayTimer(__props.timeTook, true)
		} }));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nText_default), {
				tag: "div",
				color: "text-light",
				size: "small",
				class: normalizeClass(_ctx.$style.container)
			}, {
				default: withCtx(() => [
					createBaseVNode("span", null, toDisplayString(executionStatusText.value), 1),
					__props.consumedTokens.totalTokens > 0 ? (openBlock(), createBlock(LogsViewConsumedTokenCountText_default, {
						key: 0,
						"consumed-tokens": __props.consumedTokens
					}, null, 8, ["consumed-tokens"])) : createCommentVNode("", true),
					__props.respondingModel ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						enterable: false
					}, {
						content: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("runData.aiContentBlock.model.tooltip")), 1)]),
						default: withCtx(() => [createBaseVNode("span", null, toDisplayString(unref(locale).baseText("runData.aiContentBlock.model", { interpolate: { model: __props.respondingModel } })), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_30d9e_1" } }]]);
//#endregion
//#region src/features/execution/logs/composables/useClearExecutionButtonVisible.ts
init_runtime_core_esm_bundler();
function useClearExecutionButtonVisible() {
	const route = useRoute();
	const sourceControlStore = useSourceControlStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();
	const workflowExecutionData = computed(() => workflowExecutionStateStore.value.activeExecution);
	const isWorkflowRunning = computed(() => workflowExecutionStateStore.value.isWorkflowRunning);
	const isReadOnlyRoute = computed(() => !!route?.meta?.readOnlyCanvas);
	const nodeTypesStore = useNodeTypesStore();
	const isReadOnlyEnvironment = computed(() => sourceControlStore.preferences.branchReadOnly);
	const allTriggerNodesDisabled = computed(() => workflowDocumentStore.value.allNodes.filter((node) => nodeTypesStore.isTriggerNode(node.type)).every((node) => node.disabled));
	return computed(() => !isReadOnlyRoute.value && !isReadOnlyEnvironment.value && !isWorkflowRunning.value && !allTriggerNodesDisabled.value && !!workflowExecutionData.value);
}
//#endregion
//#region src/features/execution/logs/components/LogsOverviewPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var LogsOverviewPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LogsOverviewPanel",
	props: {
		isOpen: { type: Boolean },
		selected: {},
		isReadOnly: { type: Boolean },
		isCompact: { type: Boolean },
		execution: {},
		entries: {},
		flatLogEntries: {},
		latestNodeInfo: {},
		isHeaderClickable: { type: Boolean }
	},
	emits: [
		"clickHeader",
		"select",
		"clearExecutionData",
		"openNdv",
		"toggleExpanded"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const locale = useI18n();
		const isClearExecutionButtonVisible = useClearExecutionButtonVisible();
		const isEmpty = computed(() => __props.flatLogEntries.length === 0 || __props.execution === void 0);
		const switchViewOptions = computed(() => [{
			label: locale.baseText("logs.overview.header.switch.overview"),
			value: "overview"
		}, {
			label: locale.baseText("logs.overview.header.switch.details"),
			value: "details"
		}]);
		const hasStaticScrollbar = getScrollbarWidth() > 0;
		const consumedTokens = computed(() => getTotalConsumedTokens(...__props.entries.map((entry) => getSubtreeTotalConsumedTokens(entry, false))));
		const timeTook = computed(() => __props.execution?.startedAt && __props.execution.stoppedAt ? +new Date(__props.execution.stoppedAt) - +new Date(__props.execution.startedAt) : void 0);
		const shouldShowTokenCountColumn = computed(() => consumedTokens.value.totalTokens > 0 || __props.entries.some((entry) => getSubtreeTotalConsumedTokens(entry, true).totalTokens > 0));
		function handleSwitchView(value) {
			emit("select", value === "overview" ? void 0 : __props.flatLogEntries[0]);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass([_ctx.$style.container, hasStaticScrollbar ? _ctx.$style.staticScrollBar : ""]),
				"data-test-id": "logs-overview"
			}, [createVNode(LogsPanelHeader_default, {
				title: unref(locale).baseText("logs.overview.header.title"),
				"data-test-id": "logs-overview-header",
				"is-clickable": __props.isHeaderClickable,
				onClick: _cache[1] || (_cache[1] = ($event) => emit("clickHeader"))
			}, {
				actions: withCtx(() => [unref(isClearExecutionButtonVisible) ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: unref(locale).baseText("logs.overview.header.actions.clearExecution.tooltip")
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "xsmall",
						icon: "trash-2",
						"icon-size": "medium",
						"data-test-id": "clear-execution-data-button",
						class: normalizeClass(_ctx.$style.clearButton),
						onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("clearExecutionData"), ["stop"]))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("logs.overview.header.actions.clearExecution")), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true), renderSlot(_ctx.$slots, "actions")]),
				_: 3
			}, 8, ["title", "is-clickable"]), __props.isOpen ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass([_ctx.$style.content, isEmpty.value ? _ctx.$style.empty : ""]),
				"data-test-id": "logs-overview-body"
			}, [isEmpty.value || __props.execution === void 0 ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				tag: "p",
				size: "medium",
				color: "text-base",
				class: normalizeClass(_ctx.$style.emptyText),
				"data-test-id": "logs-overview-empty"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText(__props.execution?.dataTooLargeToDisplay ? "logs.overview.body.dataTooLarge.message" : "logs.overview.body.empty.message")), 1)]),
				_: 1
			}, 8, ["class"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.summary) }, [createVNode(LogsViewExecutionSummary_default, {
				"data-test-id": "logs-overview-status",
				status: __props.execution.status,
				"consumed-tokens": consumedTokens.value,
				"start-time": +new Date(__props.execution.startedAt),
				"time-took": timeTook.value
			}, null, 8, [
				"status",
				"consumed-tokens",
				"start-time",
				"time-took"
			]), createVNode(unref(N8nSegmentControl_default), {
				size: "small",
				class: normalizeClass(_ctx.$style.switchViewButtons),
				"model-value": __props.selected ? "details" : "overview",
				options: switchViewOptions.value,
				"onUpdate:modelValue": handleSwitchView
			}, null, 8, [
				"class",
				"model-value",
				"options"
			])], 2), createVNode(LogsOverviewRows_default, {
				"is-read-only": __props.isReadOnly,
				selected: __props.selected,
				"is-compact": __props.isCompact,
				"should-show-token-count-column": shouldShowTokenCountColumn.value,
				"latest-node-info": __props.latestNodeInfo,
				"flat-log-entries": __props.flatLogEntries,
				"can-open-ndv": true,
				execution: __props.execution,
				onToggleExpanded: _cache[2] || (_cache[2] = ($event) => emit("toggleExpanded", $event)),
				onOpenNdv: _cache[3] || (_cache[3] = ($event) => emit("openNdv", $event)),
				onSelect: _cache[4] || (_cache[4] = ($event) => emit("select", $event))
			}, null, 8, [
				"is-read-only",
				"selected",
				"is-compact",
				"should-show-token-count-column",
				"latest-node-info",
				"flat-log-entries",
				"execution"
			])], 64))], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1rwaz_1",
	clearButton: "_clearButton_1rwaz_11",
	content: "_content_1rwaz_16",
	empty: "_empty_1rwaz_26",
	emptyText: "_emptyText_1rwaz_31",
	summary: "_summary_1rwaz_36",
	switchViewButtons: "_switchViewButtons_1rwaz_46"
} }]]);
//#endregion
//#region ~icons/mdi/close
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var _hoisted_1$13 = {
	viewBox: "0 0 24 24",
	width: "1.2em",
	height: "1.2em"
};
function render$4(_ctx, _cache) {
	return openBlock(), createElementBlock("svg", _hoisted_1$13, [..._cache[0] || (_cache[0] = [createBaseVNode("path", {
		fill: "currentColor",
		d: "M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"
	}, null, -1)])]);
}
var close_default = markRaw({
	name: "mdi-close",
	render: render$4
});
//#endregion
//#region ../@n8n/chat/src/components/GetStarted.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$12 = { class: "chat-get-started" };
//#endregion
//#region ../@n8n/chat/src/components/GetStarted.vue
var GetStarted_default = /* @__PURE__ */ defineComponent({
	__name: "GetStarted",
	setup(__props) {
		const { t } = useI18n$1();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$12, [createVNode(Button_default, { onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("click:button")) }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(t)("getStarted")), 1)]),
				_: 1
			})]);
		};
	}
});
//#endregion
//#region ../@n8n/chat/src/components/PoweredBy.vue
init_runtime_core_esm_bundler();
var _sfc_main = {};
var _hoisted_1$11 = { class: "chat-powered-by" };
function _sfc_render(_ctx, _cache) {
	return openBlock(), createElementBlock("div", _hoisted_1$11, [..._cache[0] || (_cache[0] = [createTextVNode(" Powered by ", -1), createBaseVNode("a", { href: "https://n8n.io?utm_source=n8n-external&utm_medium=widget-powered-by" }, "n8n", -1)])]);
}
var PoweredBy_default = /*#__PURE__*/ _plugin_vue_export_helper_default(_sfc_main, [["render", _sfc_render]]);
//#endregion
//#region ../@n8n/chat/src/components/GetStartedFooter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$10 = { class: "chat-get-started-footer" };
var _hoisted_2$5 = { key: 0 };
//#endregion
//#region ../@n8n/chat/src/components/GetStartedFooter.vue
var GetStartedFooter_default = /* @__PURE__ */ defineComponent({
	__name: "GetStartedFooter",
	setup(__props) {
		const { t, te } = useI18n$1();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", _hoisted_1$10, [unref(te)("footer") ? (openBlock(), createElementBlock("div", _hoisted_2$5, toDisplayString(unref(t)("footer")), 1)) : createCommentVNode("", true), createVNode(PoweredBy_default)]);
		};
	}
});
//#endregion
//#region ~icons/mdi/paperclip
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var _hoisted_1$9 = {
	viewBox: "0 0 24 24",
	width: "1.2em",
	height: "1.2em"
};
function render$3(_ctx, _cache) {
	return openBlock(), createElementBlock("svg", _hoisted_1$9, [..._cache[0] || (_cache[0] = [createBaseVNode("path", {
		fill: "currentColor",
		d: "M16.5 6v11.5a4 4 0 0 1-4 4a4 4 0 0 1-4-4V5A2.5 2.5 0 0 1 11 2.5A2.5 2.5 0 0 1 13.5 5v10.5a1 1 0 0 1-1 1a1 1 0 0 1-1-1V6H10v9.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5V5a4 4 0 0 0-4-4a4 4 0 0 0-4 4v12.5a5.5 5.5 0 0 0 5.5 5.5a5.5 5.5 0 0 0 5.5-5.5V6z"
	}, null, -1)])]);
}
var paperclip_default = markRaw({
	name: "mdi-paperclip",
	render: render$3
});
//#endregion
//#region ~icons/mdi/send
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var _hoisted_1$8 = {
	viewBox: "0 0 24 24",
	width: "1.2em",
	height: "1.2em"
};
function render$2(_ctx, _cache) {
	return openBlock(), createElementBlock("svg", _hoisted_1$8, [..._cache[0] || (_cache[0] = [createBaseVNode("path", {
		fill: "currentColor",
		d: "m2 21l21-9L2 3v7l15 2l-15 2z"
	}, null, -1)])]);
}
var send_default = markRaw({
	name: "mdi-send",
	render: render$2
});
//#endregion
//#region ../@n8n/chat/src/components/Input.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$7 = { class: "chat-inputs" };
var _hoisted_2$4 = {
	key: 0,
	class: "chat-input-left-panel"
};
var _hoisted_3$3 = ["disabled", "placeholder"];
var _hoisted_4 = { class: "chat-inputs-controls" };
var _hoisted_5 = ["disabled"];
var _hoisted_6 = ["disabled"];
var _hoisted_7 = {
	key: 0,
	class: "chat-files"
};
//#endregion
//#region ../@n8n/chat/src/components/Input.vue
var Input_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "Input",
	props: { placeholder: { default: "inputPlaceholder" } },
	emits: ["arrowKeyDown"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const { t } = useI18n$1();
		const emit = __emit;
		const { options } = useOptions();
		const chatStore = useChat();
		const { waitingForResponse, credentialStatus } = chatStore;
		const files = ref(null);
		const chatTextArea = ref(null);
		const input = ref("");
		const isSubmitting = ref(false);
		const resizeObserver = ref(null);
		const waitingForChatResponse = ref(false);
		const isCredentialGateActive = computed(() => {
			const status = credentialStatus.value;
			return status !== null && !status.testMode && !status.ready;
		});
		const isSubmitDisabled = computed(() => {
			if (chatStore.blockUserInput.value) return true;
			if (isCredentialGateActive.value) return true;
			if (waitingForChatResponse.value) return false;
			return input.value === "" || unref(waitingForResponse) || options.disabled?.value === true;
		});
		const isInputDisabled = computed(() => options.disabled?.value === true || isCredentialGateActive.value);
		const isFileUploadDisabled = computed(() => isFileUploadAllowed.value && unref(waitingForResponse) && !options.disabled?.value);
		const isFileUploadAllowed = computed(() => unref(options.allowFileUploads) === true);
		const allowedFileTypes = computed(() => unref(options.allowedFilesMimeTypes));
		const styleVars = computed(() => {
			return { "--controls-count": isFileUploadAllowed.value ? 2 : 1 };
		});
		const { open: openFileDialog, reset: resetFileDialog, onChange } = useFileDialog({
			multiple: true,
			reset: false
		});
		onChange((newFiles) => {
			if (!newFiles) return;
			const newFilesDT = new DataTransfer();
			if (files.value) for (let i = 0; i < files.value.length; i++) newFilesDT.items.add(files.value[i]);
			for (let i = 0; i < newFiles.length; i++) newFilesDT.items.add(newFiles[i]);
			files.value = newFilesDT.files;
		});
		function handleSetupWebsocket(payload) {
			if (typeof payload === "string") {
				setupWebsocketConnection(payload);
				return;
			}
			setupWebsocketConnection(payload.executionId, payload.resumeToken);
		}
		onMounted(() => {
			chatEventBus.on("focusInput", focusChatInput);
			chatEventBus.on("blurInput", blurChatInput);
			chatEventBus.on("setInputValue", setInputValue);
			chatEventBus.on("setupWebsocket", handleSetupWebsocket);
			if (chatTextArea.value) {
				resizeObserver.value = new ResizeObserver((entries) => {
					for (const entry of entries) if (entry.target === chatTextArea.value) adjustTextAreaHeight();
				});
				resizeObserver.value.observe(chatTextArea.value);
			}
		});
		onUnmounted(() => {
			chatEventBus.off("focusInput", focusChatInput);
			chatEventBus.off("blurInput", blurChatInput);
			chatEventBus.off("setInputValue", setInputValue);
			chatEventBus.off("setupWebsocket", handleSetupWebsocket);
			if (resizeObserver.value) {
				resizeObserver.value.disconnect();
				resizeObserver.value = null;
			}
		});
		function blurChatInput() {
			if (chatTextArea.value) chatTextArea.value.blur();
		}
		function focusChatInput() {
			if (chatTextArea.value) chatTextArea.value.focus();
		}
		function setInputValue(value) {
			input.value = value;
			focusChatInput();
		}
		function attachFiles() {
			if (files.value) {
				const filesToAttach = Array.from(files.value);
				resetFileDialog();
				files.value = null;
				return filesToAttach;
			}
			return [];
		}
		function setupWebsocketConnection(executionId, resumeToken) {
			if (options.webhookUrl && chatStore.currentSessionId.value) try {
				const wsUrl = constructChatWebsocketUrl(options.webhookUrl, executionId, chatStore.currentSessionId.value, true, resumeToken);
				chatStore.ws = new WebSocket(wsUrl);
				chatStore.waitingForResponse.value = true;
				let jsonProtocol;
				chatStore.ws.onmessage = (e) => {
					const data = e.data;
					const isLegacy = data === "n8n|heartbeat" || data === "n8n|continue";
					let frameType;
					if (isLegacy) frameType = data === "n8n|heartbeat" ? "heartbeat" : "continue";
					else try {
						frameType = JSON.parse(data).type;
					} catch {
						frameType = void 0;
					}
					const matchesProtocol = isLegacy ? jsonProtocol !== true : jsonProtocol !== false;
					if (frameType === "heartbeat" && matchesProtocol) {
						jsonProtocol = !isLegacy;
						chatStore.ws?.send(isLegacy ? "n8n|heartbeat-ack" : JSON.stringify({ type: "heartbeat-ack" }));
						return;
					}
					if (frameType === "continue" && matchesProtocol) {
						waitingForChatResponse.value = false;
						chatStore.waitingForResponse.value = true;
						return;
					}
					const newMessage = parseBotChatMessageContent(data);
					chatStore.messages.value.push(newMessage);
					waitingForChatResponse.value = true;
					chatStore.waitingForResponse.value = false;
					chatStore.blockUserInput.value = shouldBlockUserInput(newMessage);
				};
				chatStore.ws.onclose = () => {
					chatStore.ws = null;
					waitingForChatResponse.value = false;
					chatStore.waitingForResponse.value = false;
					chatStore.blockUserInput.value = false;
				};
			} catch (error) {
				console.error("Error setting up websocket connection", error);
			}
		}
		async function processFiles(data) {
			if (!data || data.length === 0) return [];
			const filePromises = data.map(async (file) => {
				return new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve({
						name: file.name,
						type: file.type,
						data: reader.result
					});
					reader.onerror = () => reject(/* @__PURE__ */ new Error(`Error reading file: ${reader.error?.message ?? "Unknown error"}`));
					reader.readAsDataURL(file);
				});
			});
			return await Promise.all(filePromises);
		}
		async function respondToChatNode(ws, messageText) {
			const sentMessage = {
				id: v4(),
				text: messageText,
				sender: "user",
				files: files.value ? attachFiles() : void 0
			};
			chatStore.messages.value.push(sentMessage);
			ws.send(JSON.stringify({
				sessionId: chatStore.currentSessionId.value,
				action: "sendMessage",
				chatInput: messageText,
				files: await processFiles(sentMessage.files)
			}));
			chatStore.waitingForResponse.value = true;
			waitingForChatResponse.value = false;
		}
		async function onSubmit(event) {
			event.preventDefault();
			if (isSubmitDisabled.value) return;
			const messageText = input.value;
			input.value = "";
			isSubmitting.value = true;
			if (chatStore.ws && waitingForChatResponse.value) {
				await respondToChatNode(chatStore.ws, messageText);
				chatEventBus.emit("messageSent");
				return;
			}
			const response = await chatStore.sendMessage(messageText, attachFiles());
			if (response?.executionId) setupWebsocketConnection(response.executionId, response.resumeToken);
			chatEventBus.emit("messageSent");
			isSubmitting.value = false;
		}
		async function onSubmitKeydown(event) {
			if (event.shiftKey || event.isComposing) return;
			await onSubmit(event);
			adjustTextAreaHeight();
		}
		function onFileRemove(file) {
			if (!files.value) return;
			const dt = new DataTransfer();
			for (let i = 0; i < files.value.length; i++) {
				const currentFile = files.value[i];
				if (file.name !== currentFile.name) dt.items.add(currentFile);
			}
			resetFileDialog();
			files.value = dt.files;
		}
		function onKeyDown(event) {
			if (event.key === "ArrowUp" || event.key === "ArrowDown") {
				event.preventDefault();
				emit("arrowKeyDown", {
					key: event.key,
					currentInputValue: input.value
				});
			}
		}
		function onOpenFileDialog() {
			if (isFileUploadDisabled.value) return;
			openFileDialog({ accept: unref(allowedFileTypes) });
		}
		function adjustTextAreaHeight() {
			const textarea = chatTextArea.value;
			if (!textarea) return;
			textarea.style.height = "var(--chat--textarea--height)";
			const newHeight = Math.min(textarea.scrollHeight, 480);
			textarea.style.height = `${newHeight}px`;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: "chat-input",
				style: normalizeStyle(styleVars.value)
			}, [createBaseVNode("div", _hoisted_1$7, [
				_ctx.$slots.leftPanel ? (openBlock(), createElementBlock("div", _hoisted_2$4, [renderSlot(_ctx.$slots, "leftPanel", {}, void 0, true)])) : createCommentVNode("", true),
				withDirectives(createBaseVNode("textarea", {
					ref_key: "chatTextArea",
					ref: chatTextArea,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => input.value = $event),
					"data-test-id": "chat-input",
					disabled: isInputDisabled.value,
					placeholder: unref(t)(props.placeholder),
					onKeydown: [withKeys(onSubmitKeydown, ["enter"]), onKeyDown],
					onInput: adjustTextAreaHeight,
					onMousedown: adjustTextAreaHeight,
					onFocus: adjustTextAreaHeight
				}, null, 40, _hoisted_3$3), [[vModelText, input.value]]),
				createBaseVNode("div", _hoisted_4, [isFileUploadAllowed.value ? (openBlock(), createElementBlock("button", {
					key: 0,
					disabled: isFileUploadDisabled.value,
					class: "chat-input-file-button",
					"data-test-id": "chat-attach-file-button",
					onClick: onOpenFileDialog
				}, [createVNode(unref(paperclip_default), {
					height: "24",
					width: "24"
				})], 8, _hoisted_5)) : createCommentVNode("", true), createBaseVNode("button", {
					disabled: isSubmitDisabled.value,
					class: "chat-input-send-button",
					onClick: onSubmit
				}, [createVNode(unref(send_default), {
					height: "24",
					width: "24"
				})], 8, _hoisted_6)])
			]), files.value?.length && (!isSubmitting.value || waitingForChatResponse.value) ? (openBlock(), createElementBlock("div", _hoisted_7, [(openBlock(true), createElementBlock(Fragment, null, renderList(files.value, (file) => {
				return openBlock(), createBlock(ChatFile_default, {
					key: file.name,
					file,
					"is-removable": true,
					"is-previewable": true,
					onRemove: onFileRemove
				}, null, 8, ["file"]);
			}), 128))])) : createCommentVNode("", true)], 4);
		};
	}
}), [["__scopeId", "data-v-6dc5cc3a"]]);
//#endregion
//#region ../@n8n/chat/src/components/Layout.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$6 = { class: "chat-layout" };
var _hoisted_2$3 = {
	key: 0,
	class: "chat-header"
};
var _hoisted_3$2 = {
	key: 2,
	class: "chat-footer"
};
//#endregion
//#region ../@n8n/chat/src/components/Layout.vue
var Layout_default = /* @__PURE__ */ defineComponent({
	__name: "Layout",
	setup(__props) {
		const chatBodyRef = ref(null);
		function scrollToBottom() {
			const element = chatBodyRef.value;
			if (element) element.scrollTop = element.scrollHeight;
		}
		onMounted(() => {
			chatEventBus.on("scrollToBottom", scrollToBottom);
			window.addEventListener("resize", scrollToBottom);
		});
		onBeforeUnmount(() => {
			chatEventBus.off("scrollToBottom", scrollToBottom);
			window.removeEventListener("resize", scrollToBottom);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("main", _hoisted_1$6, [
				_ctx.$slots.header ? (openBlock(), createElementBlock("div", _hoisted_2$3, [renderSlot(_ctx.$slots, "header")])) : createCommentVNode("", true),
				_ctx.$slots.default ? (openBlock(), createElementBlock("div", {
					key: 1,
					ref_key: "chatBodyRef",
					ref: chatBodyRef,
					class: "chat-body"
				}, [renderSlot(_ctx.$slots, "default")], 512)) : createCommentVNode("", true),
				_ctx.$slots.footer ? (openBlock(), createElementBlock("div", _hoisted_3$2, [renderSlot(_ctx.$slots, "footer")])) : createCommentVNode("", true)
			]);
		};
	}
});
//#endregion
//#region ../@n8n/chat/src/components/MessageActions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$5 = {
	key: 0,
	class: "message-actions"
};
//#endregion
//#region ../@n8n/chat/src/components/MessageActions.vue
var MessageActions_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "MessageActions",
	props: { message: {} },
	setup(__props) {
		const props = __props;
		const { options } = useOptions();
		const chatStore = useChat();
		const { t } = useI18n$1();
		async function repostMessage() {
			if (props.message.sender === "user") {
				const messageText = "text" in props.message && typeof props.message.text === "string" ? props.message.text : "";
				if (messageText.trim()) {
					const response = await chatStore.sendMessage(messageText, props.message.files ? Array.from(props.message.files) : []);
					if (response?.executionStarted && response.executionId) {
						const payload = {
							executionId: response.executionId,
							resumeToken: response.resumeToken
						};
						chatEventBus.emit("setupWebsocket", payload);
					}
				}
			}
		}
		function copyToInput() {
			const messageText = "text" in props.message && typeof props.message?.text === "string" ? props.message?.text : "";
			if (messageText.trim()) chatEventBus.emit("setInputValue", messageText);
		}
		return (_ctx, _cache) => {
			return unref(options).enableMessageActions ? (openBlock(), createElementBlock("div", _hoisted_1$5, [__props.message.sender === "user" ? (openBlock(), createBlock(unref(N8nTooltip_default), { key: 0 }, {
				content: withCtx(() => [createTextVNode(toDisplayString(unref(t)("repostButton")), 1)]),
				default: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "redo-2",
					size: "medium",
					class: "icon",
					onClick: repostMessage
				})]),
				_: 1
			})) : createCommentVNode("", true), __props.message.sender === "user" ? (openBlock(), createBlock(unref(N8nTooltip_default), { key: 1 }, {
				content: withCtx(() => [createTextVNode(toDisplayString(unref(t)("reuseButton")), 1)]),
				default: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "files",
					size: "medium",
					class: "icon",
					onClick: copyToInput
				})]),
				_: 1
			})) : createCommentVNode("", true)])) : createCommentVNode("", true);
		};
	}
}), [["__scopeId", "data-v-10d9c124"]]);
//#endregion
//#region ../@n8n/chat/src/components/Message.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = {
	key: 0,
	class: "chat-message-actions"
};
var _hoisted_2$2 = {
	key: 2,
	class: "chat-message-files"
};
//#endregion
//#region ../@n8n/chat/src/components/Message.vue
var Message_default = /* @__PURE__ */ defineComponent({
	__name: "Message",
	props: { message: {} },
	setup(__props, { expose: __expose }) {
		const { message } = toRefs(__props);
		const { options } = useOptions();
		const messageContainer = ref(null);
		const fileSources = ref({});
		const messageText = computed(() => {
			return message.value.text || "&lt;Empty response&gt;";
		});
		const classes = computed(() => {
			return {
				"chat-message-from-user": message.value.sender === "user",
				"chat-message-from-bot": message.value.sender === "bot",
				"chat-message-transparent": message.value.transparent === true
			};
		});
		const scrollToView = () => {
			if (messageContainer.value?.scrollIntoView) messageContainer.value.scrollIntoView({ block: "start" });
		};
		const messageComponents = { ...options?.messageComponents ?? {} };
		__expose({ scrollToView });
		const readFileAsDataURL = async (file) => await new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
		onMounted(async () => {
			if (message.value.files) for (const file of message.value.files) try {
				const dataURL = await readFileAsDataURL(file);
				fileSources.value[file.name] = dataURL;
			} catch (error) {
				console.error("Error reading file:", error);
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "messageContainer",
				ref: messageContainer,
				class: normalizeClass(["chat-message", classes.value])
			}, [!!_ctx.$slots.beforeMessage || unref(options)?.enableMessageActions ? (openBlock(), createElementBlock("div", _hoisted_1$4, [renderSlot(_ctx.$slots, "beforeMessage", normalizeProps(guardReactiveProps({ message: unref(message) }))), createVNode(MessageActions_default, { message: unref(message) }, null, 8, ["message"])])) : createCommentVNode("", true), renderSlot(_ctx.$slots, "default", {}, () => [unref(message).type === "component" && messageComponents[unref(message).key] ? (openBlock(), createBlock(resolveDynamicComponent(messageComponents[unref(message).key]), normalizeProps(mergeProps({ key: 0 }, unref(message).arguments)), null, 16)) : (openBlock(), createBlock(MarkdownRenderer_default, {
				key: 1,
				text: messageText.value
			}, null, 8, ["text"])), (unref(message).files ?? []).length > 0 ? (openBlock(), createElementBlock("div", _hoisted_2$2, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(message).files ?? [], (file) => {
				return openBlock(), createElementBlock("div", {
					key: file.name,
					class: "chat-message-file"
				}, [createVNode(ChatFile_default, {
					file,
					"is-removable": false,
					"is-previewable": true
				}, null, 8, ["file"])]);
			}), 128))])) : createCommentVNode("", true)])], 2);
		};
	}
});
//#endregion
//#region ~icons/mdi/chat
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var _hoisted_1$3 = {
	viewBox: "0 0 24 24",
	width: "1.2em",
	height: "1.2em"
};
function render$1(_ctx, _cache) {
	return openBlock(), createElementBlock("svg", _hoisted_1$3, [..._cache[0] || (_cache[0] = [createBaseVNode("path", {
		fill: "currentColor",
		d: "M12 3c5.5 0 10 3.58 10 8s-4.5 8-10 8c-1.24 0-2.43-.18-3.53-.5C5.55 21 2 21 2 21c2.33-2.33 2.7-3.9 2.75-4.5C3.05 15.07 2 13.13 2 11c0-4.42 4.5-8 10-8"
	}, null, -1)])]);
}
markRaw({
	name: "mdi-chat",
	render: render$1
});
//#endregion
//#region ~icons/mdi/chevron-down
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var _hoisted_1$2 = {
	viewBox: "0 0 24 24",
	width: "1.2em",
	height: "1.2em"
};
function render(_ctx, _cache) {
	return openBlock(), createElementBlock("svg", _hoisted_1$2, [..._cache[0] || (_cache[0] = [createBaseVNode("path", {
		fill: "currentColor",
		d: "M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6z"
	}, null, -1)])]);
}
markRaw({
	name: "mdi-chevron-down",
	render
});
//#endregion
//#region ../@n8n/chat/src/components/MessageTyping.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region ../@n8n/chat/src/components/MessageTyping.vue
var MessageTyping_default = /* @__PURE__ */ defineComponent({
	__name: "MessageTyping",
	props: { animation: { default: "bouncing" } },
	setup(__props) {
		const props = __props;
		const message = {
			id: "typing",
			text: "",
			sender: "bot"
		};
		const messageContainer = ref();
		const classes = computed(() => {
			return {
				"chat-message-typing": true,
				[`chat-message-typing-animation-${props.animation}`]: true
			};
		});
		onMounted(() => {
			messageContainer.value?.scrollToView();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Message_default), {
				ref_key: "messageContainer",
				ref: messageContainer,
				class: normalizeClass(classes.value),
				message,
				"data-test-id": "chat-message-typing"
			}, {
				default: withCtx(() => [..._cache[0] || (_cache[0] = [createBaseVNode("div", { class: "chat-message-typing-body" }, [
					createBaseVNode("span", { class: "chat-message-typing-circle" }),
					createBaseVNode("span", { class: "chat-message-typing-circle" }),
					createBaseVNode("span", { class: "chat-message-typing-circle" })
				], -1)])]),
				_: 1
			}, 8, ["class"]);
		};
	}
});
//#endregion
//#region ../@n8n/chat/src/components/MessagesList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = {
	key: 0,
	class: "empty-container"
};
var _hoisted_2$1 = {
	class: "empty",
	"data-test-id": "chat-messages-empty"
};
var _hoisted_3$1 = {
	key: 1,
	class: "chat-messages-list"
};
//#endregion
//#region ../@n8n/chat/src/components/MessagesList.vue
var MessagesList_default = /* @__PURE__ */ defineComponent({
	__name: "MessagesList",
	props: {
		messages: {},
		emptyText: {}
	},
	setup(__props) {
		const chatStore = useChat();
		const messageComponents = ref([]);
		const { initialMessages, waitingForResponse } = chatStore;
		watch(() => messageComponents.value.length, () => {
			const lastMessageComponent = messageComponents.value[messageComponents.value.length - 1];
			if (lastMessageComponent) lastMessageComponent.scrollToView();
		});
		return (_ctx, _cache) => {
			return __props.emptyText && unref(initialMessages).length === 0 && __props.messages.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_1$1, [createBaseVNode("div", _hoisted_2$1, [createVNode(unref(N8nIcon_default), {
				icon: "message-circle",
				size: "large",
				class: "emptyIcon"
			}), createVNode(unref(N8nText_default), {
				tag: "p",
				size: "medium",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.emptyText), 1)]),
				_: 1
			})])])) : (openBlock(), createElementBlock("div", _hoisted_3$1, [
				(openBlock(true), createElementBlock(Fragment, null, renderList(unref(initialMessages), (initialMessage) => {
					return openBlock(), createBlock(Message_default, {
						key: initialMessage.id,
						message: initialMessage
					}, null, 8, ["message"]);
				}), 128)),
				(openBlock(true), createElementBlock(Fragment, null, renderList(__props.messages, (message) => {
					return openBlock(), createBlock(Message_default, {
						key: message.id,
						ref_for: true,
						ref_key: "messageComponents",
						ref: messageComponents,
						message
					}, {
						beforeMessage: withCtx(({ message }) => [renderSlot(_ctx.$slots, "beforeMessage", mergeProps({ ref_for: true }, { message }))]),
						_: 2
					}, 1032, ["message"]);
				}), 128)),
				unref(waitingForResponse) ? (openBlock(), createBlock(MessageTyping_default, { key: 0 })) : createCommentVNode("", true)
			]));
		};
	}
});
function isCredentialStatusMessageData(data) {
	if (typeof data !== "object" || data === null) return false;
	const candidate = data;
	return candidate.type === "n8n-chat:credential-status" && typeof candidate.ready === "boolean" && (candidate.missingCount === void 0 || typeof candidate.missingCount === "number" && Number.isFinite(candidate.missingCount) && Number.isInteger(candidate.missingCount) && candidate.missingCount >= 0) && (candidate.testMode === void 0 || typeof candidate.testMode === "boolean");
}
/**
* Listens for the hosted chat page's credential-readiness signal and forwards
* parsed updates to `onStatus`. Returns a function that stops listening.
*
* The widget may run inside a sandboxed, opaque-origin iframe (the hosted
* chat shell), so `event.origin` can't be checked against an allowlist -
* instead only messages sent by our own parent frame are accepted. This also
* makes the listener a no-op when `@n8n/chat` is embedded directly on a
* third-party page: with no surrounding frame, `window.parent === window`,
* so no message from the page itself is ever mistaken for the host's signal.
*/
function listenForCredentialStatus(onStatus) {
	function handleMessage(event) {
		if (window.parent === window || event.source !== window.parent) return;
		if (!isCredentialStatusMessageData(event.data)) return;
		onStatus({
			ready: event.data.ready,
			missingCount: event.data.missingCount ?? 0,
			testMode: event.data.testMode ?? false
		});
	}
	window.addEventListener("message", handleMessage);
	return () => {
		window.removeEventListener("message", handleMessage);
	};
}
//#endregion
//#region ../@n8n/chat/src/components/Chat.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = { class: "chat-heading" };
var _hoisted_2 = ["title"];
var _hoisted_3 = { key: 0 };
//#endregion
//#region ../@n8n/chat/src/components/Chat.vue
var Chat_default = /* @__PURE__ */ defineComponent({
	__name: "Chat",
	setup(__props) {
		const { t } = useI18n$1();
		const chatStore = useChat();
		const { messages, currentSessionId, credentialStatus } = chatStore;
		const { options } = useOptions();
		const showCloseButton = computed(() => options.mode === "window" && options.showWindowCloseButton);
		const messageHistoryIndex = ref(-1);
		const currentInputBuffer = ref("");
		const userMessages = computed(() => messages.value.filter((m) => m.sender === "user").map((m) => "text" in m && typeof m.text === "string" ? m.text : ""));
		function getStarted() {
			if (!chatStore.startNewSession) return;
			chatStore.startNewSession();
			nextTick(() => {
				chatEventBus.emit("scrollToBottom");
			});
		}
		async function initialize() {
			if (!chatStore.loadPreviousSession) return;
			await chatStore.loadPreviousSession();
			nextTick(() => {
				chatEventBus.emit("scrollToBottom");
			});
		}
		function closeChat() {
			chatEventBus.emit("close");
		}
		function onArrowKeyDown(payload) {
			const userMessagesList = userMessages.value;
			if (userMessagesList.length === 0) return;
			if (messageHistoryIndex.value === -1 && payload.currentInputValue.length > 0) currentInputBuffer.value = payload.currentInputValue;
			if (payload.key === "ArrowUp") {
				chatEventBus.emit("blurInput");
				if (messageHistoryIndex.value < userMessagesList.length - 1) {
					messageHistoryIndex.value++;
					const messageText = userMessagesList[userMessagesList.length - 1 - messageHistoryIndex.value];
					chatEventBus.emit("setInputValue", messageText);
				}
				chatEventBus.emit("focusInput");
			} else if (payload.key === "ArrowDown") {
				if (messageHistoryIndex.value === -1) return;
				chatEventBus.emit("blurInput");
				if (messageHistoryIndex.value > 0) {
					messageHistoryIndex.value--;
					const messageText = userMessagesList[userMessagesList.length - 1 - messageHistoryIndex.value];
					chatEventBus.emit("setInputValue", messageText);
				} else if (messageHistoryIndex.value === 0) {
					messageHistoryIndex.value = -1;
					chatEventBus.emit("setInputValue", currentInputBuffer.value);
					currentInputBuffer.value = "";
				}
				chatEventBus.emit("focusInput");
			}
		}
		let clearOnMessageSent;
		let stopListeningForCredentialStatus;
		onMounted(async () => {
			stopListeningForCredentialStatus = listenForCredentialStatus((status) => {
				credentialStatus.value = status;
			});
			if (!messages.value.length && options.messageHistory) messages.value = options.messageHistory.map((m) => ({ ...m }));
			await initialize();
			if (!options.showWelcomeScreen && !currentSessionId.value) getStarted();
			clearOnMessageSent = chatEventBus.on("messageSent", () => {
				messageHistoryIndex.value = -1;
				currentInputBuffer.value = "";
			});
		});
		onUnmounted(() => {
			if (clearOnMessageSent) clearOnMessageSent();
			if (stopListeningForCredentialStatus) stopListeningForCredentialStatus();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Layout_default, { class: "chat-wrapper" }, {
				header: withCtx(() => [createBaseVNode("div", _hoisted_1, [createBaseVNode("h1", null, toDisplayString(unref(t)("title")), 1), showCloseButton.value ? (openBlock(), createElementBlock("button", {
					key: 0,
					class: "chat-close-button",
					title: unref(t)("closeButtonTooltip"),
					onClick: closeChat
				}, [createVNode(unref(close_default), {
					height: "18",
					width: "18"
				})], 8, _hoisted_2)) : createCommentVNode("", true)]), unref(t)("subtitle") ? (openBlock(), createElementBlock("p", _hoisted_3, toDisplayString(unref(t)("subtitle")), 1)) : createCommentVNode("", true)]),
				footer: withCtx(() => [unref(currentSessionId) ? (openBlock(), createBlock(Input_default, {
					key: 0,
					onArrowKeyDown
				})) : (openBlock(), createBlock(GetStartedFooter_default, { key: 1 }))]),
				default: withCtx(() => [!unref(currentSessionId) && unref(options).showWelcomeScreen ? (openBlock(), createBlock(GetStarted_default, {
					key: 0,
					"onClick:button": getStarted
				})) : (openBlock(), createBlock(MessagesList_default, {
					key: 1,
					messages: unref(messages)
				}, null, 8, ["messages"]))]),
				_: 1
			});
		};
	}
});
//#endregion
//#region ../@n8n/chat/src/api/generic.ts
async function getAccessToken() {
	return "";
}
async function authenticatedFetch(...args) {
	const accessToken = await getAccessToken();
	const body = args[1]?.body;
	const headers = {
		...accessToken ? { authorization: `Bearer ${accessToken}` } : {},
		...args[1]?.headers
	};
	if (body instanceof FormData) delete headers["Content-Type"];
	else headers["Content-Type"] = "application/json";
	const response = await fetch(args[0], {
		...args[1],
		mode: "cors",
		cache: "no-cache",
		headers
	});
	let responseData;
	try {
		responseData = await response.clone().json();
	} catch (error) {
		responseData = await response.text();
	}
	return responseData;
}
async function get(url, query = {}, options = {}) {
	let resolvedUrl = url;
	if (Object.keys(query).length > 0) resolvedUrl = `${resolvedUrl}?${new URLSearchParams(query).toString()}`;
	return await authenticatedFetch(resolvedUrl, {
		...options,
		method: "GET"
	});
}
async function post(url, body = {}, options = {}) {
	return await authenticatedFetch(url, {
		...options,
		method: "POST",
		body: JSON.stringify(body)
	});
}
async function postWithFiles(url, body = {}, files = [], options = {}) {
	const formData = new FormData();
	for (const key in body) {
		const value = body[key];
		if (typeof value === "object" && value !== null) formData.append(key, JSON.stringify(value));
		else formData.append(key, value);
	}
	for (const file of files) formData.append("files", file);
	return await authenticatedFetch(url, {
		...options,
		method: "POST",
		body: formData
	});
}
//#endregion
//#region ../@n8n/chat/src/api/message.ts
async function loadPreviousSession(sessionId, options) {
	return await (options.webhookConfig?.method === "POST" ? post : get)(`${options.webhookUrl}`, {
		action: "loadPreviousSession",
		[options.chatSessionKey]: sessionId,
		...options.metadata ? { metadata: options.metadata } : {}
	}, { headers: options.webhookConfig?.headers });
}
async function sendMessage(message, files, sessionId, options) {
	let response;
	if (files.length > 0) response = await postWithFiles(`${options.webhookUrl}`, {
		action: "sendMessage",
		[options.chatSessionKey]: sessionId,
		[options.chatInputKey]: message,
		...options.metadata ? { metadata: options.metadata } : {}
	}, files, { headers: options.webhookConfig?.headers });
	else response = await (options.webhookConfig?.method === "POST" ? post : get)(`${options.webhookUrl}`, {
		action: "sendMessage",
		[options.chatSessionKey]: sessionId,
		[options.chatInputKey]: message,
		...options.metadata ? { metadata: options.metadata } : {}
	}, { headers: options.webhookConfig?.headers });
	return response;
}
var PROXY_TIMEOUT_ERROR_MESSAGE = "A proxy timeout occurred while waiting for the response. The workflow may still be running — check the execution list for results.";
function isProxyErrorHtml(line) {
	return line.includes("<!DOCTYPE") || line.includes("<html") || line.includes("</html>");
}
function createLineParser() {
	let buffer = "";
	let insideHtmlError = false;
	let htmlErrorEmitted = false;
	const decoder = new TextDecoder();
	return new TransformStream({
		transform(chunk, controller) {
			buffer += decoder.decode(chunk, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";
			for (const line of lines) if (line.trim()) try {
				const parsed = JSON.parse(line);
				insideHtmlError = false;
				controller.enqueue(parsed);
			} catch (error) {
				if (isProxyErrorHtml(line)) insideHtmlError = true;
				if (insideHtmlError) {
					if (!htmlErrorEmitted) {
						htmlErrorEmitted = true;
						controller.enqueue({
							type: "error",
							content: PROXY_TIMEOUT_ERROR_MESSAGE
						});
					}
					continue;
				}
				controller.enqueue({
					type: "item",
					content: line
				});
			}
		},
		flush(controller) {
			if (buffer.trim() && !insideHtmlError) try {
				const parsed = JSON.parse(buffer);
				controller.enqueue(parsed);
			} catch (error) {
				if (isProxyErrorHtml(buffer)) {
					if (!htmlErrorEmitted) controller.enqueue({
						type: "error",
						content: PROXY_TIMEOUT_ERROR_MESSAGE
					});
					return;
				}
				controller.enqueue({
					type: "item",
					content: buffer
				});
			}
		}
	});
}
async function sendMessageStreaming(message, files, sessionId, options, handlers) {
	const response = await (files.length > 0 ? sendWithFiles(message, files, sessionId, options) : sendTextOnly(message, sessionId, options));
	if (!response.ok) {
		const errorText = await response.text();
		console.error("HTTP error response:", response.status, errorText);
		throw new Error(`Error while sending message. Error: ${errorText}`);
	}
	if (!response.body) throw new Error("Response body is not readable");
	const reader = response.body.pipeThrough(createLineParser()).getReader();
	let hasReceivedChunks = false;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			const nodeId = value.metadata?.nodeId || "unknown";
			const runIndex = value.metadata?.runIndex;
			switch (value.type) {
				case "begin":
					handlers.onBeginMessage(nodeId, runIndex);
					break;
				case "item":
					hasReceivedChunks = true;
					handlers.onChunk(value.content ?? "", nodeId, runIndex);
					break;
				case "end":
					await handlers.onEndMessage(nodeId, runIndex);
					break;
				case "error":
					hasReceivedChunks = true;
					handlers.onChunk(`Error: ${value.content ?? "Unknown error"}`, nodeId, runIndex);
					await handlers.onEndMessage(nodeId, runIndex);
			}
		}
	} finally {
		reader.releaseLock();
	}
	return { hasReceivedChunks };
}
async function sendWithFiles(message, files, sessionId, options) {
	const formData = new FormData();
	formData.append("action", "sendMessage");
	formData.append(options.chatSessionKey, sessionId);
	formData.append(options.chatInputKey, message);
	if (options.metadata) formData.append("metadata", JSON.stringify(options.metadata));
	for (const file of files) formData.append("files", file);
	const headers = {
		Accept: "text/plain",
		...options.webhookConfig?.headers
	};
	delete headers["Content-Type"];
	return await fetch(options.webhookUrl, {
		method: "POST",
		headers,
		body: formData
	});
}
async function sendTextOnly(message, sessionId, options) {
	const body = {
		action: "sendMessage",
		[options.chatSessionKey]: sessionId,
		[options.chatInputKey]: message,
		...options.metadata ? { metadata: options.metadata } : {}
	};
	return await fetch(options.webhookUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "text/plain",
			...options.webhookConfig?.headers
		},
		body: JSON.stringify(body)
	});
}
//#endregion
//#region ../@n8n/chat/src/utils/streaming.ts
/**
* Manages the state of streaming messages for nodes.
* This class is responsible for tracking the state of each run of nodes,
* including the content of each chunk, whether it's complete, and the message
* object that represents the run of a given node.
*/
var StreamingMessageManager = class {
	nodeRuns = /* @__PURE__ */ new Map();
	runOrder = [];
	activeRuns = /* @__PURE__ */ new Set();
	/**
	* Current turn within each node run. An agent resumed after a tool call keeps its
	* original runIndex, so text it emitted before the tool call and the answer it
	* produces afterwards would otherwise accumulate into a single message.
	*/
	runSegments = /* @__PURE__ */ new Map();
	constructor() {}
	getBaseKey(nodeId, runIndex) {
		if (runIndex !== void 0) return `${nodeId}-${runIndex}`;
		return nodeId;
	}
	getRunKey(nodeId, runIndex) {
		const baseKey = this.getBaseKey(nodeId, runIndex);
		const segment = this.runSegments.get(baseKey);
		return segment === void 0 ? baseKey : `${baseKey}#${segment}`;
	}
	initializeRun(nodeId, runIndex) {
		const runKey = this.getRunKey(nodeId, runIndex);
		if (!this.nodeRuns.has(runKey)) {
			const message = createBotMessage();
			this.nodeRuns.set(runKey, {
				content: "",
				isComplete: false,
				message
			});
			this.runOrder.push(runKey);
			return message;
		}
		return this.nodeRuns.get(runKey).message;
	}
	registerRunStart(nodeId, runIndex) {
		const baseKey = this.getBaseKey(nodeId, runIndex);
		const currentSegment = this.runSegments.get(baseKey);
		this.runSegments.set(baseKey, currentSegment === void 0 ? 0 : currentSegment + 1);
		this.activeRuns.add(this.getRunKey(nodeId, runIndex));
	}
	addRunToActive(nodeId, runIndex) {
		const runKey = this.getRunKey(nodeId, runIndex);
		this.activeRuns.add(runKey);
		return this.initializeRun(nodeId, runIndex);
	}
	removeRunFromActive(nodeId, runIndex) {
		const runKey = this.getRunKey(nodeId, runIndex);
		this.activeRuns.delete(runKey);
		const runData = this.nodeRuns.get(runKey);
		if (runData) runData.isComplete = true;
	}
	addChunkToRun(nodeId, chunk, runIndex) {
		const runKey = this.getRunKey(nodeId, runIndex);
		const runData = this.nodeRuns.get(runKey);
		if (runData) {
			runData.content += chunk;
			const updatedMessage = {
				...runData.message,
				text: runData.content
			};
			runData.message = updatedMessage;
			return updatedMessage;
		}
		return null;
	}
	getRunMessage(nodeId, runIndex) {
		const runKey = this.getRunKey(nodeId, runIndex);
		return this.nodeRuns.get(runKey)?.message ?? null;
	}
	areAllRunsComplete() {
		return Array.from(this.nodeRuns.values()).every((data) => data.isComplete);
	}
	getRunCount() {
		return this.runOrder.length;
	}
	getActiveRunCount() {
		return this.activeRuns.size;
	}
	getAllMessages() {
		return this.runOrder.map((key) => this.nodeRuns.get(key)?.message).filter((message) => message !== void 0);
	}
	reset() {
		this.nodeRuns.clear();
		this.runOrder = [];
		this.activeRuns.clear();
		this.runSegments.clear();
	}
};
function createBotMessage(id) {
	return {
		id: id ?? v4(),
		type: "text",
		text: "",
		sender: "bot"
	};
}
function updateMessageInArray(messages, messageId, updatedMessage) {
	const messageIndex = messages.findIndex((msg) => msg.id === messageId);
	if (messageIndex === -1) throw new Error(`Can't update message. No message with id ${messageId} found`);
	messages[messageIndex] = updatedMessage;
}
//#endregion
//#region ../@n8n/chat/src/utils/streamingHandlers.ts
init_runtime_core_esm_bundler();
function handleStreamingChunk(chunk, nodeId, streamingManager, receivedMessage, messages, runIndex) {
	try {
		if (chunk === "") return;
		if (!nodeId) {
			if (!receivedMessage.value) {
				receivedMessage.value = createBotMessage();
				messages.value.push(receivedMessage.value);
			}
			const updatedMessage = {
				...receivedMessage.value,
				text: receivedMessage.value.text + chunk
			};
			updateMessageInArray(messages.value, receivedMessage.value.id, updatedMessage);
			receivedMessage.value = updatedMessage;
		} else {
			let runMessage = streamingManager.getRunMessage(nodeId, runIndex);
			if (!runMessage) {
				runMessage = streamingManager.addRunToActive(nodeId, runIndex);
				messages.value.push(runMessage);
			}
			const updatedMessage = streamingManager.addChunkToRun(nodeId, chunk, runIndex);
			if (updatedMessage) updateMessageInArray(messages.value, updatedMessage.id, updatedMessage);
		}
		nextTick(() => {
			chatEventBus.emit("scrollToBottom");
		});
	} catch (error) {
		console.error("Error handling stream chunk:", error);
	}
}
function handleNodeStart(nodeId, streamingManager, runIndex) {
	try {
		streamingManager.registerRunStart(nodeId, runIndex);
	} catch (error) {
		console.error("Error handling node start:", error);
	}
}
async function handleNodeComplete(nodeId, streamingManager, runIndex, userMessage, options, messages) {
	try {
		const completedMessage = streamingManager.getRunMessage(nodeId, runIndex);
		streamingManager.removeRunFromActive(nodeId, runIndex);
		if (completedMessage && "text" in completedMessage) {
			const parsed = parseBotChatMessageContent(completedMessage.text);
			if (parsed.type === "component") {
				const index = messages.value.findIndex((m) => m.id === completedMessage.id);
				if (index !== -1) {
					parsed.id = completedMessage.id;
					messages.value[index] = parsed;
				}
				return shouldBlockUserInput(parsed);
			}
		}
		if (options.afterMessageSent && completedMessage) await options.afterMessageSent(userMessage, {
			message: completedMessage,
			hasReceivedChunks: true
		});
	} catch (error) {
		console.error("Error handling node complete:", error);
	}
	return false;
}
//#endregion
//#region ../@n8n/chat/src/plugins/chat.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Creates a new user message object with a unique ID
* @param text - The message text content
* @param files - Optional array of files attached to the message
* @returns A ChatMessage object representing the user's message
*/
function createUserMessage(text, files = []) {
	return {
		id: v4(),
		text,
		sender: "user",
		files
	};
}
/**
* Extracts text content from a message response
* Falls back to JSON stringification if no text is found but the response object has data
* @param response - The response object from the API
* @returns The extracted text message or stringified response
*/
function processMessageResponse(response) {
	let textMessage = response.output ?? response.text ?? response.message ?? "";
	if (typeof textMessage === "object" && textMessage.type && textMessage.type === "text") return textMessage.text;
	if (textMessage === "" && Object.keys(response).length > 0) try {
		textMessage = JSON.stringify(response, null, 2);
	} catch (e) {}
	return textMessage;
}
/**
* Handles the case when a streaming response returns no chunks
* Creates an error message explaining the likely cause
* @param config - Configuration object containing message refs
*/
function handleEmptyStreamResponse(config) {
	const { receivedMessage, messages } = config;
	if (!receivedMessage.value) {
		receivedMessage.value = createBotMessage();
		messages.value.push(receivedMessage.value);
	} else if (!messages.value.some((msg) => msg.sender === "bot" && "text" in msg && msg.text.trim().length > 0)) {
		receivedMessage.value = createBotMessage();
		messages.value.push(receivedMessage.value);
	}
	receivedMessage.value.text = "[No response received. This could happen if streaming is enabled in the trigger but disabled in agent node(s)]";
}
/**
* Handles errors that occur during message sending
* Creates an error message for the user and logs the error to console
* @param config - Configuration object containing error and message refs
*/
function handleMessageError(config) {
	const { error, receivedMessage, messages } = config;
	receivedMessage.value ??= createBotMessage();
	receivedMessage.value.text = "Error: Failed to receive response";
	if (!messages.value.includes(receivedMessage.value)) messages.value.push(receivedMessage.value);
	console.error("Chat API error:", error);
}
/**
* Handles sending messages with streaming enabled
* Sets up streaming event handlers and processes the response chunks
* @param config - Configuration object for streaming message handling
*/
async function handleStreamingMessage(config) {
	const { text, files, sessionId, options, messages, receivedMessage, streamingManager, blockUserInput } = config;
	const { hasReceivedChunks } = await sendMessageStreaming(text, files, sessionId, options, {
		onChunk: (chunk, nodeId, runIndex) => {
			handleStreamingChunk(chunk, nodeId, streamingManager, receivedMessage, messages, runIndex);
		},
		onBeginMessage: (nodeId, runIndex) => {
			handleNodeStart(nodeId, streamingManager, runIndex);
		},
		onEndMessage: async (nodeId, runIndex) => {
			if (await handleNodeComplete(nodeId, streamingManager, runIndex, text, options, messages)) blockUserInput.value = true;
		}
	});
	if (!hasReceivedChunks) handleEmptyStreamResponse({
		receivedMessage,
		messages
	});
	return hasReceivedChunks;
}
/**
* Handles sending messages without streaming
* Sends the message and processes the complete response
* @param config - Configuration object for non-streaming message handling
* @returns The API response or a bot message
*/
async function handleNonStreamingMessage(config) {
	const { text, files, sessionId, options } = config;
	const sendMessageResponse = await sendMessage(text, files, sessionId, options);
	if (sendMessageResponse?.executionStarted) return { response: sendMessageResponse };
	const receivedMessage = createBotMessage();
	receivedMessage.text = processMessageResponse(sendMessageResponse);
	return {
		response: sendMessageResponse,
		botMessage: receivedMessage
	};
}
var ChatPlugin = { install(app, options) {
	app.provide(ChatOptionsSymbol, options);
	const messages = ref([]);
	const currentSessionId = ref(null);
	const waitingForResponse = ref(false);
	const blockUserInput = ref(false);
	const credentialStatus = ref(null);
	const initialMessages = computed(() => (options.initialMessages ?? []).map((text) => ({
		id: v4(),
		text,
		sender: "bot"
	})));
	async function sendMessage(text, files = []) {
		const sentMessage = createUserMessage(text, files);
		messages.value.push(sentMessage);
		waitingForResponse.value = true;
		nextTick(() => {
			chatEventBus.emit("scrollToBottom");
		});
		const receivedMessage = ref(null);
		const streamingManager = new StreamingMessageManager();
		try {
			if (options.beforeMessageSent) await options.beforeMessageSent(text);
			if (options?.enableStreaming) {
				const hasReceivedChunks = await handleStreamingMessage({
					text,
					files,
					sessionId: currentSessionId.value,
					options,
					messages,
					receivedMessage,
					streamingManager,
					blockUserInput
				});
				if (options.afterMessageSent) await options.afterMessageSent(text, {
					hasReceivedChunks,
					message: receivedMessage.value ?? ""
				});
			} else {
				const result = await handleNonStreamingMessage({
					text,
					files,
					sessionId: currentSessionId.value,
					options
				});
				if (result.response?.executionStarted) {
					waitingForResponse.value = false;
					return result.response;
				}
				if (result.botMessage) {
					receivedMessage.value = result.botMessage;
					messages.value.push(result.botMessage);
				}
				if (options.afterMessageSent) await options.afterMessageSent(text, result.response);
			}
		} catch (error) {
			handleMessageError({
				error,
				receivedMessage,
				messages
			});
		} finally {
			waitingForResponse.value = false;
		}
		nextTick(() => {
			chatEventBus.emit("scrollToBottom");
		});
		return null;
	}
	async function loadPreviousSession$1() {
		if (!options.loadPreviousSession) return;
		let sessionId = options.sessionId ?? localStorage.getItem("n8n-chat/sessionId");
		if (!sessionId) {
			sessionId = v4();
			localStorage.setItem(localStorageSessionIdKey, sessionId);
		}
		const previousMessagesResponse = await loadPreviousSession(sessionId, options);
		messages.value = (previousMessagesResponse?.data || []).map((message, index) => ({
			id: `${index}`,
			text: message.kwargs.content,
			sender: message.id.includes("HumanMessage") ? "user" : "bot"
		}));
		currentSessionId.value = sessionId;
		localStorage.setItem(localStorageSessionIdKey, sessionId);
		return sessionId;
	}
	async function startNewSession() {
		const existingSessionId = localStorage.getItem(localStorageSessionIdKey);
		if (existingSessionId && options.loadPreviousSession && !options.sessionId) currentSessionId.value = existingSessionId;
		else {
			currentSessionId.value = options.sessionId ?? v4();
			localStorage.setItem(localStorageSessionIdKey, currentSessionId.value);
		}
	}
	const chatStore = {
		initialMessages,
		messages,
		currentSessionId,
		waitingForResponse,
		blockUserInput,
		credentialStatus,
		loadPreviousSession: loadPreviousSession$1,
		startNewSession,
		sendMessage
	};
	app.provide(ChatSymbol, chatStore);
	app.config.globalProperties.$chat = chatStore;
} };
//#endregion
//#region src/features/execution/logs/components/ChatMessagesPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var ChatMessagesPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatMessagesPanel",
	props: {
		sessionId: {},
		showCloseButton: { type: Boolean },
		isOpen: {
			type: Boolean,
			default: true
		},
		isReadOnly: {
			type: Boolean,
			default: false
		},
		isHeaderClickable: { type: Boolean }
	},
	emits: [
		"displayExecution",
		"refreshSession",
		"close",
		"clickHeader",
		"hideChatPanel"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const locale = useI18n();
		const clipboard = useClipboard();
		const workflowId = useInjectWorkflowId();
		const toast = useToast();
		const chatContainer = useTemplateRef("chatContainer");
		const { chatTriggerNode, isStreamingEnabled, isFileUploadsAllowed, allowedFilesMimeTypes, isWorkflowReadyForChat, chatOptions } = useChatState(props.isReadOnly, () => props.sessionId);
		let chatApp = null;
		const sessionIdText = computed(() => locale.baseText("chat.window.session.id", { interpolate: { id: `${props.sessionId.slice(0, 5)}...` } }));
		async function copySessionId() {
			await clipboard.copy(props.sessionId);
			toast.showMessage({
				title: locale.baseText("generic.copiedToClipboard"),
				message: "",
				type: "success"
			});
		}
		function initializeChat() {
			if (!isWorkflowReadyForChat.value) return;
			if (!chatContainer.value) return;
			if (chatApp) return;
			chatApp = createApp(Chat_default);
			chatApp.use(ChatPlugin, chatOptions.value);
			chatApp.mount(chatContainer.value);
		}
		function destroyChat() {
			if (chatApp && chatContainer.value) {
				chatApp.unmount();
				chatApp = null;
				chatContainer.value.innerHTML = "";
			}
		}
		watch(() => props.isOpen, async (newIsOpen) => {
			if (newIsOpen && !chatApp) {
				destroyChat();
				initializeChat();
			}
		});
		watch(() => chatTriggerNode.value, async (newChatTrigger, oldChatTrigger) => {
			if (props.isOpen) {
				if (newChatTrigger && !oldChatTrigger) {
					await nextTick();
					initializeChat();
				} else if (!newChatTrigger && oldChatTrigger) {
					destroyChat();
					emit("hideChatPanel");
				}
			}
		});
		watch(() => chatContainer.value, async (newContainer) => {
			if (newContainer && props.isOpen && isWorkflowReadyForChat.value) initializeChat();
		});
		watch(workflowId, async (newWorkflowId, oldWorkflowId) => {
			if (props.isOpen && isWorkflowReadyForChat.value && newWorkflowId !== oldWorkflowId) {
				destroyChat();
				initializeChat();
			}
		});
		watch(() => isStreamingEnabled.value, async (newStreaming, oldStreaming) => {
			if (props.isOpen && isWorkflowReadyForChat.value && chatApp && newStreaming !== oldStreaming) {
				destroyChat();
				initializeChat();
			}
		});
		watch(() => [isFileUploadsAllowed.value, allowedFilesMimeTypes.value], async (newConfig, oldConfig) => {
			if (props.isOpen && isWorkflowReadyForChat.value && chatApp && JSON.stringify(newConfig) !== JSON.stringify(oldConfig)) {
				destroyChat();
				initializeChat();
			}
		});
		onMounted(async () => {
			if (props.isOpen) {
				await nextTick();
				initializeChat();
			}
		});
		onUnmounted(() => {
			destroyChat();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass([_ctx.$style.chat, "ignore-key-press-canvas"]),
				"data-test-id": "workflow-lm-chat-dialog",
				tabindex: "0"
			}, [createVNode(LogsPanelHeader_default, {
				"data-test-id": "chat-header",
				title: unref(locale).baseText("chat.window.title"),
				"is-clickable": __props.isHeaderClickable,
				onClick: _cache[1] || (_cache[1] = ($event) => emit("clickHeader"))
			}, {
				actions: withCtx(() => [!__props.isReadOnly ? (openBlock(), createBlock(unref(N8nTooltip_default), { key: 0 }, {
					content: withCtx(() => [
						createTextVNode(toDisplayString(__props.sessionId) + " ", 1),
						_cache[2] || (_cache[2] = createBaseVNode("br", null, null, -1)),
						createTextVNode(" " + toDisplayString(unref(locale).baseText("chat.window.session.id.copy")), 1)
					]),
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						"data-test-id": "chat-session-id",
						size: "xsmall",
						class: normalizeClass(_ctx.$style.newHeaderButton),
						onClick: withModifiers(copySessionId, ["stop"])
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(sessionIdText.value), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				})) : createCommentVNode("", true), !__props.isReadOnly ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					content: unref(locale).baseText("chat.window.session.resetSession")
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						class: normalizeClass(_ctx.$style.newHeaderButton),
						"data-test-id": "refresh-session-button",
						size: "xsmall",
						"icon-size": "medium",
						icon: "undo-2",
						title: unref(locale).baseText("chat.window.session.reset"),
						onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("refreshSession"), ["stop"]))
					}, null, 8, ["class", "title"])]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["title", "is-clickable"]), withDirectives(createBaseVNode("main", {
				class: normalizeClass(_ctx.$style.chatSdkContainer),
				"data-test-id": "canvas-chat-body"
			}, [createBaseVNode("div", {
				ref_key: "chatContainer",
				ref: chatContainer,
				class: normalizeClass(_ctx.$style.chatContainer)
			}, null, 2)], 2), [[vShow, __props.isOpen && unref(chatTriggerNode)]])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	chat: "_chat_wrzt4_1",
	headerButton: "_headerButton_wrzt4_61",
	newHeaderButton: "_newHeaderButton_wrzt4_66",
	chatSdkContainer: "_chatSdkContainer_wrzt4_71",
	chatContainer: "_chatContainer_wrzt4_80"
} }]]);
//#endregion
//#region src/features/execution/logs/components/LogsViewRunData.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var LogsViewRunData_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LogsViewRunData",
	props: {
		title: {},
		paneType: {},
		logEntry: {},
		collapsingTableColumnName: {},
		searchShortcut: {},
		showRedactedOverlay: {
			type: Boolean,
			default: true
		},
		sourceIndex: { default: 0 },
		overrideOutputs: {}
	},
	emits: ["collapsingTableColumnChanged"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const locale = useI18n();
		const ndvStore = injectNDVStore();
		const uiStore = useUIStore();
		const { canReveal, reason, revealData, credentialToShare, openCredentialSharing } = useExecutionRedaction();
		const popOutWindow = inject(PopOutWindowKey, ref());
		const displayMode = ref(__props.paneType === "input" ? "schema" : "table");
		const isMultipleInput = computed(() => __props.paneType === "input" && (__props.logEntry.runData?.source.length ?? 0) > 1);
		const runDataProps = computed(() => {
			if (isSubNodeLog(__props.logEntry) || __props.paneType === "output") return {
				node: __props.logEntry.node,
				runIndex: __props.logEntry.runIndex,
				overrideOutputs: __props.overrideOutputs
			};
			const source = __props.logEntry.runData?.source[__props.sourceIndex];
			const node = source && __props.logEntry.workflow.getNode(source.previousNode);
			if (!source || !node) return;
			return {
				node: {
					...node,
					disabled: false
				},
				runIndex: source.previousNodeRun ?? 0,
				overrideOutputs: [source.previousNodeOutput ?? 0]
			};
		});
		const isExecuting = computed(() => __props.paneType === "output" && (__props.logEntry.runData?.executionStatus === "running" || __props.logEntry.runData?.executionStatus === "waiting"));
		function handleClickOpenNdv() {
			ndvStore.value.setActiveNodeName(__props.logEntry.node.name, "logs_view");
		}
		function handleChangeDisplayMode(value) {
			displayMode.value = value;
		}
		return (_ctx, _cache) => {
			const _directive_n8n_html = resolveDirective("n8n-html");
			return runDataProps.value ? (openBlock(), createBlock(RunData_default, mergeProps({ key: 0 }, runDataProps.value, {
				key: `run-data${unref(popOutWindow) ? "-pop-out" : ""}`,
				class: _ctx.$style.component,
				"workflow-object": __props.logEntry.workflow,
				"workflow-execution": __props.logEntry.execution,
				"no-data-in-branch-message": unref(locale).baseText("ndv.output.noOutputDataInBranch"),
				"executing-message": unref(locale).baseText("ndv.output.executing"),
				"pane-type": __props.paneType,
				"disable-run-index-selection": true,
				compact: true,
				"show-actions-on-hover": true,
				"disable-pin": true,
				"disable-edit": true,
				"disable-hover-highlight": true,
				"disable-settings-hint": true,
				"display-mode": displayMode.value,
				"disable-ai-content": !unref(isSubNodeLog)(__props.logEntry),
				"is-executing": isExecuting.value,
				"table-header-bg-color": "light",
				"collapsing-table-column-name": __props.collapsingTableColumnName,
				"search-shortcut": __props.searchShortcut,
				onDisplayModeChange: handleChangeDisplayMode,
				onCollapsingTableColumnChanged: _cache[1] || (_cache[1] = ($event) => emit("collapsingTableColumnChanged", $event))
			}), createSlots({
				header: withCtx(() => [createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.title),
					bold: true,
					color: "text-light",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.title), 1)]),
					_: 1
				}, 8, ["class"])]),
				"header-end": withCtx((itemCountProps) => [createVNode(RunDataItemCount_default, mergeProps(itemCountProps, { search: displayMode.value === "schema" ? "" : itemCountProps.search }), null, 16, ["search"])]),
				"no-output-data": withCtx(() => [createVNode(NDVEmptyState_default, { title: unref(locale).baseText("ndv.output.noOutputData.title") }, null, 8, ["title"])]),
				"node-waiting": withCtx(() => [createVNode(NDVEmptyState_default, {
					title: unref(locale).baseText("ndv.output.waitNodeWaiting.title"),
					wide: ""
				}, {
					default: withCtx(() => [withDirectives(createBaseVNode("span", null, null, 512), [[_directive_n8n_html, unref(waitingNodeTooltip)(__props.logEntry.node, __props.logEntry.workflow, __props.logEntry.runData?.metadata)]])]),
					_: 1
				}, 8, ["title"])]),
				_: 2
			}, [
				__props.showRedactedOverlay ? {
					name: "data-redacted",
					fn: withCtx(() => [createVNode(RedactedDataState_default, {
						title: unref(locale).baseText(__props.paneType === "output" ? "ndv.output.redacted.title" : "ndv.input.redacted.title"),
						reason: unref(reason),
						"can-reveal": unref(canReveal),
						"credential-to-share": unref(credentialToShare),
						onShareCredential: unref(openCredentialSharing),
						onOpenSettings: _cache[0] || (_cache[0] = ($event) => unref(uiStore).openModal(unref("settings"))),
						onReveal: unref(revealData)
					}, null, 8, [
						"title",
						"reason",
						"can-reveal",
						"credential-to-share",
						"onShareCredential",
						"onReveal"
					])]),
					key: "0"
				} : void 0,
				isMultipleInput.value ? {
					name: "content",
					fn: withCtx(() => []),
					key: "1"
				} : void 0,
				isMultipleInput.value ? {
					name: "callout-message",
					fn: withCtx(() => [createVNode(unref(I18nT), {
						keypath: "logs.details.body.multipleInputs",
						scope: "global"
					}, {
						button: withCtx(() => [createVNode(unref(N8nLink_default), {
							size: "small",
							onClick: handleClickOpenNdv
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("logs.details.body.multipleInputs.openingTheNode")), 1)]),
							_: 1
						})]),
						_: 1
					})]),
					key: "2"
				} : void 0
			]), 1040, [
				"class",
				"workflow-object",
				"workflow-execution",
				"no-data-in-branch-message",
				"executing-message",
				"pane-type",
				"display-mode",
				"disable-ai-content",
				"is-executing",
				"collapsing-table-column-name",
				"search-shortcut"
			])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	component: "_component_tdzh5_1",
	title: "_title_tdzh5_5"
} }]]);
//#endregion
//#region src/features/agents/composables/useMessageAgentSessionLink.ts
init_runtime_core_esm_bundler();
function isMessageAgentSession(value) {
	if (!value || typeof value !== "object") return false;
	const v = value;
	return typeof v.agentId === "string" && typeof v.projectId === "string" && typeof v.sessionId === "string" && v.agentId !== "" && v.projectId !== "" && v.sessionId !== "";
}
function extractSession(logEntry) {
	if (!logEntry || !isNodeLog(logEntry)) return null;
	if (logEntry.node.type !== "n8n-nodes-base.messageAnAgent") return null;
	const main = logEntry.runData?.data?.main;
	if (!Array.isArray(main)) return null;
	for (const branch of main) {
		if (!Array.isArray(branch)) continue;
		for (const item of branch) {
			const session = (item?.json)?.session;
			if (isMessageAgentSession(session)) return session;
		}
	}
	return null;
}
/**
* Given a log entry, expose a resolved session URL + opener for MessageAnAgent
* runs that emitted a `session` block in their output JSON. Returns `null` for
* any other node-type or runs missing the expected payload, so the caller can
* `v-if` straight off `link`.
*
* Opens in a new tab (matching n8n's other deep links from execution log) so
* the workflow execution view stays in place — and so the link still works
* when the logs panel is popped out into its own window.
*/
function useMessageAgentSessionLink(logEntry) {
	const router = useRouter();
	return { link: computed(() => {
		const session = extractSession(logEntry.value);
		if (!session) return null;
		let href;
		try {
			href = router.resolve({
				name: AGENT_SESSION_DETAIL_VIEW,
				params: {
					projectId: session.projectId,
					agentId: session.agentId,
					threadId: session.threadId ?? session.sessionId
				}
			}).href;
		} catch {
			return null;
		}
		return {
			href,
			open: () => {
				window.open(href, "_blank", "noopener");
			}
		};
	}) };
}
//#endregion
//#region src/features/execution/logs/components/LogDetailsPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var LogDetailsPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LogDetailsPanel",
	props: {
		isOpen: { type: Boolean },
		logEntry: {},
		window: {},
		latestInfo: {},
		panels: {},
		collapsingInputTableColumnName: {},
		collapsingOutputTableColumnName: {},
		isHeaderClickable: { type: Boolean }
	},
	emits: [
		"clickHeader",
		"toggleInputOpen",
		"toggleOutputOpen",
		"collapsingInputTableColumnChanged",
		"collapsingOutputTableColumnChanged"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const locale = useI18n();
		const nodeTypeStore = useNodeTypesStore();
		const ndvStore = injectNDVStore();
		const experimentalNdvStore = useExperimentalNdvStore();
		const uiStore = useUIStore();
		const { isRedacted, canReveal, reason, revealData, credentialToShare, openCredentialSharing } = useExecutionRedaction();
		const nodeEntry = computed(() => isNodeLog(__props.logEntry) ? __props.logEntry : void 0);
		const groupEntry = computed(() => isGroupLog(__props.logEntry) ? __props.logEntry : void 0);
		const displayName = computed(() => groupEntry.value ? groupEntry.value.group.name : __props.latestInfo?.name ?? nodeEntry.value?.node.name ?? "");
		const type = computed(() => nodeEntry.value ? nodeTypeStore.getNodeType(nodeEntry.value.node.type) : null);
		const selectedInputIndex = ref(0);
		const selectedOutputIndex = ref(0);
		watch(() => __props.logEntry.id, () => {
			selectedInputIndex.value = 0;
			selectedOutputIndex.value = 0;
		});
		const groupInput = computed(() => groupEntry.value?.boundaries.inputs[selectedInputIndex.value]);
		const groupOutput = computed(() => groupEntry.value?.boundaries.outputs[selectedOutputIndex.value]);
		const consumedTokens = computed(() => getSubtreeTotalConsumedTokens(__props.logEntry, false));
		const respondingModel = computed(() => getRespondingModelName(Object.values(nodeEntry.value?.runData?.data ?? {}).flat().flat()));
		const isTriggerNode = computed(() => type.value?.group.includes("trigger"));
		const { link: messageAgentSessionLink } = useMessageAgentSessionLink(computed(() => __props.logEntry));
		const container = useTemplateRef("container");
		const resizer = useResizablePanel({
			container,
			width: {
				localStorageKey: "N8N_LOGS_INPUT_PANEL_WIDTH",
				defaultSize: function getDefaultWidth(size) {
					return size / 2;
				},
				minSize: 200,
				maxSize: function getMaxWidth(size) {
					return size - 200;
				},
				allowCollapse: true,
				allowFullSize: true,
				snap: true
			}
		});
		const shouldResize = computed(() => __props.panels === LOG_DETAILS_PANEL_STATE.BOTH);
		const searchShortcutPriorityPanel = computed(() => ndvStore.value.isNDVOpen || experimentalNdvStore.isMapperOpen ? void 0 : __props.panels === LOG_DETAILS_PANEL_STATE.INPUT ? "input" : "output");
		function handleResizeEnd() {
			if (resizer.isCollapsed.value) emit("toggleInputOpen", false);
			if (resizer.isFullSize.value) emit("toggleOutputOpen", false);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "container",
				ref: container,
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "log-details"
			}, [createVNode(LogsPanelHeader_default, {
				"data-test-id": "log-details-header",
				"is-clickable": __props.isHeaderClickable,
				onClick: _cache[3] || (_cache[3] = ($event) => emit("clickHeader"))
			}, {
				title: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.title) }, [
					!groupEntry.value ? (openBlock(), createBlock(NodeIcon_default, {
						key: 0,
						"node-type": type.value,
						size: 16,
						class: normalizeClass(_ctx.$style.icon)
					}, null, 8, ["node-type", "class"])) : createCommentVNode("", true),
					createVNode(LogsViewNodeName_default, {
						name: displayName.value,
						"is-deleted": __props.latestInfo?.deleted ?? false
					}, null, 8, ["name", "is-deleted"]),
					__props.isOpen && nodeEntry.value?.runData !== void 0 ? (openBlock(), createBlock(LogsViewExecutionSummary_default, {
						key: 1,
						class: normalizeClass(_ctx.$style.executionSummary),
						status: nodeEntry.value.runData.executionStatus ?? "unknown",
						"consumed-tokens": consumedTokens.value,
						"start-time": nodeEntry.value.runData.startTime,
						"time-took": nodeEntry.value.runData.executionTime,
						"responding-model": respondingModel.value
					}, null, 8, [
						"class",
						"status",
						"consumed-tokens",
						"start-time",
						"time-took",
						"responding-model"
					])) : createCommentVNode("", true)
				], 2)]),
				actions: withCtx(() => [__props.isOpen && !isTriggerNode.value && !unref(isPlaceholderLog)(__props.logEntry) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.actions)
				}, [
					unref(messageAgentSessionLink) ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "outline",
						size: "xsmall",
						"data-test-id": "log-details-view-agent-session",
						onClick: _cache[0] || (_cache[0] = withModifiers(($event) => unref(messageAgentSessionLink).open(), ["stop"]))
					}, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "external-link",
							class: normalizeClass(_ctx.$style.viewSessionIcon)
						}, null, 8, ["class"]), createTextVNode(" " + toDisplayString(unref(locale).baseText("logs.details.header.actions.viewAgentSession")), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(KeyboardShortcutTooltip_default, {
						label: unref(locale).baseText("generic.shortcutHint"),
						shortcut: { keys: ["i"] }
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "xsmall",
							class: normalizeClass(__props.panels === unref(LOG_DETAILS_PANEL_STATE).OUTPUT ? "" : _ctx.$style.pressed),
							onClick: _cache[1] || (_cache[1] = withModifiers(($event) => emit("toggleInputOpen"), ["stop"]))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("logs.details.header.actions.input")), 1)]),
							_: 1
						}, 8, ["class"])]),
						_: 1
					}, 8, ["label"]),
					createVNode(KeyboardShortcutTooltip_default, {
						label: unref(locale).baseText("generic.shortcutHint"),
						shortcut: { keys: ["o"] }
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "xsmall",
							class: normalizeClass(__props.panels === unref(LOG_DETAILS_PANEL_STATE).INPUT ? "" : _ctx.$style.pressed),
							onClick: _cache[2] || (_cache[2] = withModifiers(($event) => emit("toggleOutputOpen"), ["stop"]))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("logs.details.header.actions.output")), 1)]),
							_: 1
						}, 8, ["class"])]),
						_: 1
					}, 8, ["label"])
				], 2)) : createCommentVNode("", true), renderSlot(_ctx.$slots, "actions")]),
				_: 3
			}, 8, ["is-clickable"]), __props.isOpen ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.content),
				"data-test-id": "logs-details-body"
			}, [unref(isPlaceholderLog)(__props.logEntry) ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.placeholder)
			}, [createVNode(unref(N8nText_default), { color: "text-base" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("ndv.output.runNodeHint")), 1)]),
				_: 1
			})], 2)) : nodeEntry.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
				!isTriggerNode.value && __props.panels !== unref(LOG_DETAILS_PANEL_STATE).OUTPUT ? (openBlock(), createBlock(unref(N8nResizeWrapper_default), {
					key: 0,
					class: normalizeClass({
						[_ctx.$style.inputResizer]: true,
						[_ctx.$style.collapsed]: unref(resizer).isCollapsed.value,
						[_ctx.$style.full]: unref(resizer).isFullSize.value
					}),
					resizer: unref(resizer),
					style: normalizeStyle(shouldResize.value ? { width: `${unref(resizer).width.value ?? 0}px` } : void 0),
					"supported-directions": ["right"],
					"is-resizing-enabled": shouldResize.value,
					window: __props.window,
					onResizeend: handleResizeEnd
				}, {
					default: withCtx(() => [createVNode(LogsViewRunData_default, {
						"data-test-id": "log-details-input",
						"pane-type": "input",
						title: unref(locale).baseText("logs.details.header.actions.input"),
						"log-entry": nodeEntry.value,
						"collapsing-table-column-name": __props.collapsingInputTableColumnName,
						"search-shortcut": searchShortcutPriorityPanel.value === "input" ? "ctrl+f" : void 0,
						"show-redacted-overlay": __props.panels !== unref(LOG_DETAILS_PANEL_STATE).BOTH,
						onCollapsingTableColumnChanged: _cache[4] || (_cache[4] = ($event) => emit("collapsingInputTableColumnChanged", $event))
					}, null, 8, [
						"title",
						"log-entry",
						"collapsing-table-column-name",
						"search-shortcut",
						"show-redacted-overlay"
					])]),
					_: 1
				}, 8, [
					"class",
					"resizer",
					"style",
					"is-resizing-enabled",
					"window"
				])) : createCommentVNode("", true),
				isTriggerNode.value || __props.panels !== unref(LOG_DETAILS_PANEL_STATE).INPUT ? (openBlock(), createBlock(LogsViewRunData_default, {
					key: 1,
					"data-test-id": "log-details-output",
					"pane-type": "output",
					class: normalizeClass(_ctx.$style.outputPanel),
					title: unref(locale).baseText("logs.details.header.actions.output"),
					"log-entry": nodeEntry.value,
					"collapsing-table-column-name": __props.collapsingOutputTableColumnName,
					"search-shortcut": searchShortcutPriorityPanel.value === "output" ? "ctrl+f" : void 0,
					"show-redacted-overlay": __props.panels !== unref(LOG_DETAILS_PANEL_STATE).BOTH,
					onCollapsingTableColumnChanged: _cache[5] || (_cache[5] = ($event) => emit("collapsingOutputTableColumnChanged", $event))
				}, null, 8, [
					"class",
					"title",
					"log-entry",
					"collapsing-table-column-name",
					"search-shortcut",
					"show-redacted-overlay"
				])) : createCommentVNode("", true),
				unref(isRedacted) && __props.panels === unref(LOG_DETAILS_PANEL_STATE).BOTH ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.redactedOverlay)
				}, [createVNode(RedactedDataState_default, {
					title: unref(locale).baseText("ndv.output.redacted.title"),
					reason: unref(reason),
					"can-reveal": unref(canReveal),
					"credential-to-share": unref(credentialToShare),
					onShareCredential: unref(openCredentialSharing),
					wide: "",
					onOpenSettings: _cache[6] || (_cache[6] = ($event) => unref(uiStore).openModal(unref("settings"))),
					onReveal: unref(revealData)
				}, null, 8, [
					"title",
					"reason",
					"can-reveal",
					"credential-to-share",
					"onShareCredential",
					"onReveal"
				])], 2)) : createCommentVNode("", true)
			], 64)) : groupEntry.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
				groupInput.value && __props.panels !== unref(LOG_DETAILS_PANEL_STATE).OUTPUT ? (openBlock(), createBlock(unref(N8nResizeWrapper_default), {
					key: 0,
					class: normalizeClass({
						[_ctx.$style.inputResizer]: true,
						[_ctx.$style.collapsed]: unref(resizer).isCollapsed.value,
						[_ctx.$style.full]: unref(resizer).isFullSize.value
					}),
					resizer: unref(resizer),
					style: normalizeStyle(shouldResize.value ? { width: `${unref(resizer).width.value ?? 0}px` } : void 0),
					"supported-directions": ["right"],
					"is-resizing-enabled": shouldResize.value,
					window: __props.window,
					onResizeend: handleResizeEnd
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.groupPane) }, [groupEntry.value.boundaries.inputs.length > 1 ? (openBlock(), createBlock(unref(N8nSelect_default), {
						key: 0,
						modelValue: selectedInputIndex.value,
						"onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => selectedInputIndex.value = $event),
						class: normalizeClass(_ctx.$style.boundarySelect),
						size: "small",
						"data-test-id": "log-details-group-input-select"
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(groupEntry.value.boundaries.inputs, (boundary, index) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: boundary.id,
								value: index,
								label: boundary.label
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, ["modelValue", "class"])) : createCommentVNode("", true), createVNode(LogsViewRunData_default, {
						"data-test-id": "log-details-input",
						"pane-type": "input",
						class: normalizeClass(_ctx.$style.groupRunData),
						title: unref(locale).baseText("logs.details.header.actions.input"),
						"log-entry": groupInput.value.entry,
						"source-index": groupInput.value.sourceIndex,
						"collapsing-table-column-name": null,
						"search-shortcut": searchShortcutPriorityPanel.value === "input" ? "ctrl+f" : void 0,
						"show-redacted-overlay": __props.panels !== unref(LOG_DETAILS_PANEL_STATE).BOTH
					}, null, 8, [
						"class",
						"title",
						"log-entry",
						"source-index",
						"search-shortcut",
						"show-redacted-overlay"
					])], 2)]),
					_: 1
				}, 8, [
					"class",
					"resizer",
					"style",
					"is-resizing-enabled",
					"window"
				])) : createCommentVNode("", true),
				groupOutput.value && __props.panels !== unref(LOG_DETAILS_PANEL_STATE).INPUT ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass([_ctx.$style.outputPanel, _ctx.$style.groupPane])
				}, [groupEntry.value.boundaries.outputs.length > 1 ? (openBlock(), createBlock(unref(N8nSelect_default), {
					key: 0,
					modelValue: selectedOutputIndex.value,
					"onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => selectedOutputIndex.value = $event),
					class: normalizeClass(_ctx.$style.boundarySelect),
					size: "small",
					"data-test-id": "log-details-group-output-select"
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(groupEntry.value.boundaries.outputs, (boundary, index) => {
						return openBlock(), createBlock(unref(N8nOption_default), {
							key: boundary.id,
							value: index,
							label: boundary.label
						}, null, 8, ["value", "label"]);
					}), 128))]),
					_: 1
				}, 8, ["modelValue", "class"])) : createCommentVNode("", true), createVNode(LogsViewRunData_default, {
					"data-test-id": "log-details-output",
					"pane-type": "output",
					class: normalizeClass(_ctx.$style.groupRunData),
					title: unref(locale).baseText("logs.details.header.actions.output"),
					"log-entry": groupOutput.value.entry,
					"override-outputs": groupOutput.value.overrideOutputs,
					"collapsing-table-column-name": null,
					"search-shortcut": searchShortcutPriorityPanel.value === "output" ? "ctrl+f" : void 0,
					"show-redacted-overlay": __props.panels !== unref(LOG_DETAILS_PANEL_STATE).BOTH
				}, null, 8, [
					"class",
					"title",
					"log-entry",
					"override-outputs",
					"search-shortcut",
					"show-redacted-overlay"
				])], 2)) : createCommentVNode("", true),
				unref(isRedacted) && __props.panels === unref(LOG_DETAILS_PANEL_STATE).BOTH ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.redactedOverlay)
				}, [createVNode(RedactedDataState_default, {
					title: unref(locale).baseText("ndv.output.redacted.title"),
					reason: unref(reason),
					"can-reveal": unref(canReveal),
					"credential-to-share": unref(credentialToShare),
					onShareCredential: unref(openCredentialSharing),
					wide: "",
					onOpenSettings: _cache[9] || (_cache[9] = ($event) => unref(uiStore).openModal(unref("settings"))),
					onReveal: unref(revealData)
				}, null, 8, [
					"title",
					"reason",
					"can-reveal",
					"credential-to-share",
					"onShareCredential",
					"onReveal"
				])], 2)) : createCommentVNode("", true)
			], 64)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1n7ez_1",
	actions: "_actions_1n7ez_10",
	pressed: "_pressed_1n7ez_15",
	title: "_title_1n7ez_19",
	icon: "_icon_1n7ez_25",
	viewSessionIcon: "_viewSessionIcon_1n7ez_29",
	executionSummary: "_executionSummary_1n7ez_33",
	content: "_content_1n7ez_37",
	outputPanel: "_outputPanel_1n7ez_46",
	redactedOverlay: "_redactedOverlay_1n7ez_51",
	inputResizer: "_inputResizer_1n7ez_64",
	collapsed: "_collapsed_1n7ez_68",
	full: "_full_1n7ez_68",
	placeholder: "_placeholder_1n7ez_72",
	groupPane: "_groupPane_1n7ez_79",
	boundarySelect: "_boundarySelect_1n7ez_88",
	groupRunData: "_groupRunData_1n7ez_93"
} }]]);
//#endregion
//#region src/features/execution/logs/components/LogsPanelActions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var LogsPanelActions_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LogsPanelActions",
	props: {
		isOpen: { type: Boolean },
		isSyncSelectionEnabled: { type: Boolean },
		showToggleButton: { type: Boolean },
		showPopOutButton: { type: Boolean }
	},
	emits: [
		"popOut",
		"toggleOpen",
		"toggleSyncSelection"
	],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const locales = useI18n();
		const popOutWindow = inject(PopOutWindowKey, ref());
		const isInPopOut = computed(() => !!popOutWindow.value);
		const popOutButtonText = computed(() => locales.baseText("runData.panel.actions.popOut"));
		const toggleButtonText = computed(() => locales.baseText(__props.isOpen ? "runData.panel.actions.collapse" : "runData.panel.actions.open"));
		const menuItems = computed(() => [{
			id: "toggleSyncSelection",
			label: locales.baseText("runData.panel.actions.sync"),
			checked: __props.isSyncSelectionEnabled
		}, ...__props.showPopOutButton ? [{
			id: "popOut",
			label: popOutButtonText.value
		}] : []]);
		function handleSelectMenuItem(selected) {
			switch (selected) {
				case "popOut":
					emit(selected);
					return;
				case "toggleSyncSelection":
					emit(selected);
					return;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [
				!__props.isOpen && __props.showPopOutButton ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: popOutButtonText.value
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "pop-out",
						size: "xsmall",
						"icon-size": "medium",
						"aria-label": popOutButtonText.value,
						onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("popOut"), ["stop"]))
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true),
				__props.isOpen ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
					key: 1,
					"data-test-id": "logs-panel-actions",
					"icon-size": "small",
					"activator-icon": "ellipsis",
					"activator-size": "xsmall",
					"activator-icon-size": "medium",
					items: menuItems.value,
					teleported: false,
					modal: !isInPopOut.value,
					onSelect: handleSelectMenuItem,
					onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
				}, null, 8, ["items", "modal"])) : createCommentVNode("", true),
				__props.showToggleButton ? (openBlock(), createBlock(KeyboardShortcutTooltip_default, {
					key: `tooltip-${__props.isOpen}`,
					label: unref(locales).baseText("generic.shortcutHint"),
					shortcut: { keys: ["l"] }
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						size: "xsmall",
						"icon-size": "medium",
						icon: __props.isOpen ? "chevron-down" : "chevron-up",
						"aria-label": toggleButtonText.value,
						onClick: _cache[2] || (_cache[2] = withModifiers(($event) => emit("toggleOpen"), ["stop"]))
					}, null, 8, ["icon", "aria-label"])]),
					_: 1
				}, 8, ["label"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_1vx4a_1" } }]]);
//#endregion
//#region src/features/execution/logs/composables/useLogsSelection.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function useLogsSelection(execution, tree, flatLogEntries, toggleExpand) {
	const telemetry = useTelemetry();
	const manualLogEntrySelection = shallowRef({ type: "initial" });
	const nodeIdToSelect = shallowRef();
	const isExecutionStopped = computed(() => execution.value?.stoppedAt !== void 0);
	const selected = computed(() => findSelectedLogEntry(manualLogEntrySelection.value, tree.value, !isExecutionStopped.value));
	const logsStore = useLogsStore();
	const uiStore = useUIStore();
	const canvasStore = useCanvasStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	function syncSelectionToCanvasIfEnabled(value) {
		if (!logsStore.isLogSelectionSyncedWithCanvas) return;
		if (isGroupLog(value)) {
			canvasEventBus.emit("nodes:select", {
				ids: value.group.nodeIds,
				panIntoView: true
			});
			return;
		}
		canvasEventBus.emit("nodes:select", {
			ids: [value.node.id],
			panIntoView: true
		});
	}
	function select(value) {
		manualLogEntrySelection.value = value === void 0 ? { type: "none" } : {
			type: "selected",
			entry: value
		};
		if (value) {
			syncSelectionToCanvasIfEnabled(value);
			if (isNodeLog(value)) telemetry.track("User selected node in log view", {
				node_type: value.node.type,
				node_id: value.node.id,
				execution_id: execution.value?.id,
				workflow_id: execution.value?.workflowData.id,
				subworkflow_depth: getDepth(value)
			});
			else if (isGroupLog(value)) telemetry.track("User selected canvas group in log view", {
				group_id: value.group.id,
				node_count: value.group.nodeIds.length,
				execution_id: execution.value?.id,
				workflow_id: execution.value?.workflowData.id,
				subworkflow_depth: getDepth(value)
			});
		}
	}
	function selectPrev() {
		const entries = flatLogEntries.value;
		if (entries.length === 0) return;
		const prevEntry = selected.value ? getEntryAtRelativeIndex(entries, selected.value.id, -1) ?? entries[0] : entries[entries.length - 1];
		manualLogEntrySelection.value = {
			type: "selected",
			entry: prevEntry
		};
		syncSelectionToCanvasIfEnabled(prevEntry);
	}
	function selectNext() {
		const entries = flatLogEntries.value;
		if (entries.length === 0) return;
		const nextEntry = selected.value ? getEntryAtRelativeIndex(entries, selected.value.id, 1) ?? entries[entries.length - 1] : entries[0];
		manualLogEntrySelection.value = {
			type: "selected",
			entry: nextEntry
		};
		syncSelectionToCanvasIfEnabled(nextEntry);
	}
	watch(selected, (sel) => {
		if (sel) logsStore.setSubNodeSelected(isSubNodeLog(sel));
	}, { immediate: true });
	watch([() => uiStore.lastSelectedNode, () => logsStore.isLogSelectionSyncedWithCanvas], ([selectedOnCanvas, shouldSync]) => {
		const selectedNodeId = selectedOnCanvas ? workflowDocumentStore.value.nodesByName[selectedOnCanvas]?.id : void 0;
		const selectedEntry = selected.value;
		const selectedEntryNodeId = selectedEntry && isNodeLog(selectedEntry) ? selectedEntry.node.id : void 0;
		const isMemberOfSelectedGroup = selectedEntry !== void 0 && isGroupLog(selectedEntry) && selectedNodeId !== void 0 && selectedEntry.group.nodeIds.includes(selectedNodeId);
		nodeIdToSelect.value = shouldSync && !canvasStore.hasRangeSelection && !isMemberOfSelectedGroup && selectedEntryNodeId !== selectedNodeId ? selectedNodeId : void 0;
	}, { immediate: true });
	watch([tree, nodeIdToSelect], ([latestTree, id]) => {
		if (id === void 0) return;
		const entry = findLogEntryRec((e) => isNodeLog(e) && e.node.id === id, latestTree);
		if (!entry) return;
		nodeIdToSelect.value = void 0;
		manualLogEntrySelection.value = {
			type: "selected",
			entry
		};
		let parent = entry.parent;
		while (parent !== void 0) {
			toggleExpand(parent, true);
			parent = parent.parent;
		}
	}, { immediate: true });
	watch([
		tree,
		() => canvasStore.selectedGroupId,
		() => logsStore.isLogSelectionSyncedWithCanvas
	], ([latestTree, groupId, shouldSync]) => {
		if (!shouldSync || !groupId) return;
		if (selected.value && isGroupLog(selected.value) && selected.value.group.id === groupId) return;
		const groupEntry = findLogEntryRec((entry) => isGroupLog(entry) && entry.group.id === groupId, latestTree);
		if (!groupEntry || !isGroupLog(groupEntry)) return;
		if (selected.value && isNodeLog(selected.value) && groupEntry.group.nodeIds.includes(selected.value.node.id)) return;
		manualLogEntrySelection.value = {
			type: "selected",
			entry: groupEntry
		};
	}, { immediate: true });
	const erroredEntry = computed(() => isExecutionStopped.value ? findLogEntryRec((e) => isNodeLog(e) && !!e.runData?.error, tree.value) : void 0);
	watch(() => erroredEntry.value ? execution.value?.id : void 0, (executionId) => {
		if (!executionId || !erroredEntry.value) return;
		manualLogEntrySelection.value = { type: "initial" };
		for (let parent = erroredEntry.value.parent; parent !== void 0; parent = parent.parent) toggleExpand(parent, true);
	});
	return {
		selected,
		select,
		selectPrev,
		selectNext
	};
}
//#endregion
//#region src/features/execution/logs/composables/usePopOutWindow.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function isStyle(node) {
	return node instanceof HTMLStyleElement || node instanceof HTMLLinkElement && node.rel === "stylesheet";
}
function syncStyleMutations(destination, mutations) {
	const currentStyles = destination.document.head.querySelectorAll("style, link[rel=\"stylesheet\"]");
	for (const mutation of mutations) {
		for (const node of mutation.addedNodes) if (isStyle(node)) destination.document.head.appendChild(node.cloneNode(true));
		for (const node of mutation.removedNodes) if (isStyle(node)) {
			for (const found of currentStyles) if (found.isEqualNode(node)) found.remove();
		}
	}
}
function copyFavicon(source, target) {
	const iconUrl = source.document.querySelector("link[rel=icon]")?.getAttribute("href");
	if (iconUrl) {
		const link = target.document.createElement("link");
		link.setAttribute("rel", "icon");
		link.setAttribute("href", iconUrl);
		target.document.head.appendChild(link);
	}
}
/**
* A composable that allows to pop out given content in child window
*/
function usePopOutWindow({ title, container, content, initialHeight, initialWidth, shouldPopOut, onRequestClose }) {
	const popOutWindow = ref();
	const isUnmounting = ref(false);
	const canPopOut = computed(() => window.parent === window);
	const isPoppedOut = computed(() => !!popOutWindow.value);
	const tooltipContainer = computed(() => isPoppedOut.value ? content.value ?? void 0 : void 0);
	const observer = new MutationObserver((mutations) => {
		if (popOutWindow.value) syncStyleMutations(popOutWindow.value, mutations);
	});
	const documentTitle = useDocumentTitle(popOutWindow);
	observer.observe(document.head, {
		childList: true,
		subtree: true
	});
	const themeObserver = new MutationObserver(() => {
		if (popOutWindow.value) {
			const theme = document.body.getAttribute("data-theme");
			if (theme) popOutWindow.value.document.body.setAttribute("data-theme", theme);
			else popOutWindow.value.document.body.removeAttribute("data-theme");
			popOutWindow.value.document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
		}
	});
	themeObserver.observe(document.body, {
		attributes: true,
		attributeFilter: ["data-theme"]
	});
	provide(PopOutWindowKey, popOutWindow);
	useProvideTooltipAppendTo(tooltipContainer);
	async function showPopOut() {
		if (!content.value) return;
		if (!popOutWindow.value) {
			const options = `popup=yes,width=${initialWidth},height=${initialHeight},left=100,top=100,toolbar=no,menubar=no,scrollbars=yes,resizable=yes`;
			popOutWindow.value = window.open("", "_blank", options) ?? void 0;
		}
		if (!popOutWindow.value) return;
		copyFavicon(window, popOutWindow.value);
		for (const styleSheet of [...document.styleSheets]) try {
			const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
			const style = document.createElement("style");
			style.textContent = cssRules;
			popOutWindow.value.document.head.appendChild(style);
		} catch (e) {
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.type = styleSheet.type;
			link.media = styleSheet.media;
			link.href = styleSheet.href;
			popOutWindow.value.document.head.appendChild(link);
		}
		const theme = document.body.getAttribute("data-theme");
		if (theme) popOutWindow.value.document.body.setAttribute("data-theme", theme);
		popOutWindow.value.document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
		popOutWindow.value.document.body.append(content.value);
		popOutWindow.value.addEventListener("pagehide", () => !isUnmounting.value && onRequestClose());
	}
	function hidePopOut() {
		if (content.value && container.value?.isConnected) container.value.appendChild(content.value);
		popOutWindow.value?.close();
		popOutWindow.value = void 0;
	}
	watch(shouldPopOut, (value) => value ? requestAnimationFrame(showPopOut) : hidePopOut(), { immediate: true });
	watch([title, popOutWindow], ([newTitle, win]) => {
		if (win) documentTitle.set(newTitle);
	}, { immediate: true });
	onScopeDispose(() => {
		observer.disconnect();
		themeObserver.disconnect();
	});
	onBeforeUnmount(() => {
		isUnmounting.value = true;
		if (popOutWindow.value) {
			popOutWindow.value.close();
			onRequestClose();
		}
	});
	return {
		canPopOut,
		isPoppedOut,
		popOutWindow
	};
}
//#endregion
//#region src/features/execution/logs/composables/useLogsPanelLayout.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var INITIAL_POPUP_HEIGHT = 400;
var COLLAPSED_PANEL_HEIGHT = 32;
function useLogsPanelLayout(workflowName, popOutContainer, popOutContent, container, logsContainer) {
	const logsStore = useLogsStore();
	const telemetry = useTelemetry();
	const host = inject(LogsPanelHostKey, {
		context: "editor",
		heightStorageKey: LOCAL_STORAGE_PANEL_HEIGHT
	});
	const resizer = useResizablePanel({
		container: () => toValue(host.heightContainer) ?? document.body,
		height: {
			localStorageKey: host.heightStorageKey,
			defaultSize: function getDefaultHeight(size) {
				return size * .3;
			},
			minSize: 160,
			maxSize: function getMaxHeight(size) {
				return size * .75;
			},
			allowCollapse: true
		}
	});
	const chatPanelResizer = useResizablePanel({
		container,
		width: {
			localStorageKey: LOCAL_STORAGE_PANEL_WIDTH,
			defaultSize: function getDefaultWidth(size) {
				return Math.min(800, size * .3);
			},
			minSize: 240,
			maxSize: function getMaxWidth(size) {
				return size * .8;
			},
			snap: true
		}
	});
	const overviewPanelResizer = useResizablePanel({
		container: logsContainer,
		width: {
			localStorageKey: LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH,
			defaultSize: function getDefaultWidth(size) {
				return Math.min(400, size * .3, size - 400);
			},
			minSize: 80,
			maxSize: 500,
			allowFullSize: true,
			snap: true
		}
	});
	const isOpen = computed(() => logsStore.isOpen ? !resizer.isCollapsed.value : resizer.isResizing.value && resizer.height.value > 0);
	const isCollapsingDetailsPanel = computed(() => overviewPanelResizer.isFullSize.value);
	const popOutWindowTitle = computed(() => `Logs - ${workflowName.value}`);
	const shouldPopOut = computed(() => logsStore.state === LOGS_PANEL_STATE.FLOATING);
	function trackToggle(newState) {
		telemetry.track("User toggled log view", {
			new_state: newState,
			source: "user",
			context: host.context
		});
	}
	const { canPopOut, isPoppedOut, popOutWindow } = usePopOutWindow({
		title: popOutWindowTitle,
		initialHeight: INITIAL_POPUP_HEIGHT,
		initialWidth: window.document.body.offsetWidth * .8,
		container: popOutContainer,
		content: popOutContent,
		shouldPopOut,
		onRequestClose: () => {
			if (!isOpen.value) return;
			trackToggle("attached");
			logsStore.setPreferPoppedOut(false);
		}
	});
	function handleToggleOpen(open) {
		const wasOpen = logsStore.isOpen;
		if (open === wasOpen) return;
		logsStore.toggleOpen(open);
		trackToggle(wasOpen ? "collapsed" : "attached");
	}
	function handlePopOut() {
		trackToggle("floating");
		logsStore.toggleOpen(true);
		logsStore.setPreferPoppedOut(true);
	}
	function handleResizeEnd() {
		if (!resizer.isResizing.value) return;
		if (!logsStore.isOpen && !resizer.isCollapsed.value) handleToggleOpen(true);
		if (resizer.isCollapsed.value) handleToggleOpen(false);
	}
	watch([
		() => logsStore.state,
		resizer.height,
		isPoppedOut
	], ([state, height]) => {
		const updatedHeight = state === LOGS_PANEL_STATE.FLOATING ? 0 : state === LOGS_PANEL_STATE.ATTACHED ? height : COLLAPSED_PANEL_HEIGHT;
		if (state === LOGS_PANEL_STATE.FLOATING) popOutWindow?.value?.document.documentElement.style.setProperty("--logs-panel--height", "100vh");
		else document.documentElement.style.setProperty("--logs-panel--height", `${updatedHeight}px`);
		logsStore.setHeight(updatedHeight);
	}, { immediate: true });
	onBeforeUnmount(() => logsStore.setHeight(0));
	return {
		height: resizer.height,
		chatPanelWidth: chatPanelResizer.width,
		overviewPanelWidth: overviewPanelResizer.width,
		canPopOut,
		isOpen,
		isCollapsingDetailsPanel,
		isPoppedOut,
		isOverviewPanelFullWidth: overviewPanelResizer.isFullSize,
		popOutWindow,
		onToggleOpen: handleToggleOpen,
		onPopOut: handlePopOut,
		resizer,
		chatPanelResizer,
		overviewPanelResizer,
		onResizeEnd: handleResizeEnd
	};
}
//#endregion
//#region src/features/execution/logs/components/LogsViewKeyboardEventListener.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/execution/logs/components/LogsViewKeyboardEventListener.vue
var LogsViewKeyboardEventListener_default = /* @__PURE__ */ defineComponent({
	__name: "LogsViewKeyboardEventListener",
	props: {
		keyMap: {},
		container: {}
	},
	setup(__props) {
		const popOutWindow = inject(PopOutWindowKey, ref());
		const activeElement = useActiveElement({ window: popOutWindow?.value });
		const isBlurred = computed(() => {
			if (popOutWindow?.value) return popOutWindow.value.document.activeElement === null;
			return !activeElement.value || !__props.container || !__props.container.contains(activeElement.value) && __props.container !== activeElement.value;
		});
		useKeybindings(toRef(() => __props.keyMap), { disabled: isBlurred });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div");
		};
	}
});
//#endregion
//#region src/features/execution/logs/components/LogsPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var LogsPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "LogsPanel",
	props: { isReadOnly: {
		type: Boolean,
		default: false
	} },
	setup(__props) {
		const props = __props;
		const container = useTemplateRef("container");
		const logsContainer = useTemplateRef("logsContainer");
		const popOutContainer = useTemplateRef("popOutContainer");
		const popOutContent = useTemplateRef("popOutContent");
		const logsStore = useLogsStore();
		const ndvStore = injectNDVStore();
		const workflowDocumentStore = injectWorkflowDocumentStore();
		const { height, chatPanelWidth, overviewPanelWidth, canPopOut, isOpen, isPoppedOut, isCollapsingDetailsPanel, isOverviewPanelFullWidth, popOutWindow, resizer, chatPanelResizer, overviewPanelResizer, onResizeEnd, onToggleOpen, onPopOut } = useLogsPanelLayout(computed(() => workflowDocumentStore.value.name), popOutContainer, popOutContent, container, logsContainer);
		const { currentSessionId, chatOptions, refreshSession, displayExecution } = useChatState(props.isReadOnly);
		const { entries, execution, hasChat, latestNodeNameById, resetExecutionData, loadSubExecution } = useLogsExecutionData({ isEnabled: isOpen });
		const { flatLogEntries, toggleExpanded } = useLogsTreeExpand(entries, loadSubExecution);
		const { selected, select, selectNext, selectPrev } = useLogsSelection(execution, entries, flatLogEntries, toggleExpanded);
		const inputTableColumnCollapsing = ref();
		const outputTableColumnCollapsing = ref();
		const selectedNode = computed(() => selected.value && isNodeLog(selected.value) ? selected.value : void 0);
		const isLogDetailsOpen = computed(() => isOpen.value && selected.value !== void 0);
		const isLogDetailsVisuallyOpen = computed(() => isLogDetailsOpen.value && !isCollapsingDetailsPanel.value);
		const logsPanelActionsProps = computed(() => ({
			isOpen: isOpen.value,
			isSyncSelectionEnabled: logsStore.isLogSelectionSyncedWithCanvas,
			showToggleButton: !isPoppedOut.value,
			showPopOutButton: canPopOut.value && !isPoppedOut.value,
			onPopOut,
			onToggleOpen,
			onToggleSyncSelection: logsStore.toggleLogSelectionSync
		}));
		const inputCollapsingColumnName = computed(() => inputTableColumnCollapsing.value?.nodeName === selectedNode.value?.node.name ? inputTableColumnCollapsing.value?.columnName ?? null : null);
		const outputCollapsingColumnName = computed(() => outputTableColumnCollapsing.value?.nodeName === selectedNode.value?.node.name ? outputTableColumnCollapsing.value?.columnName ?? null : null);
		const keyMap = computed(() => ({
			j: selectNext,
			k: selectPrev,
			Escape: () => select(void 0),
			ArrowDown: selectNext,
			ArrowUp: selectPrev,
			Space: () => selected.value && toggleExpanded(selected.value),
			Enter: () => selected.value && handleOpenNdv(selected.value),
			...isPoppedOut.value ? {
				i: () => logsStore.toggleInputOpen(),
				o: () => logsStore.toggleOutputOpen()
			} : {}
		}));
		function handleArrowNavigation(event) {
			if (event.key === "ArrowDown") selectNext();
			else if (event.key === "ArrowUp") selectPrev();
			else return;
			event.preventDefault();
			event.stopPropagation();
		}
		function handleResizeOverviewPanelEnd() {
			if (isOverviewPanelFullWidth.value) select(void 0);
		}
		function handleOpenNdv(treeNode) {
			if (!isNodeLog(treeNode)) return;
			ndvStore.value.setActiveNodeName(treeNode.node.name, "logs_view");
			nextTick(() => {
				const source = treeNode.runData?.source[0];
				const inputBranch = source?.previousNodeOutput ?? 0;
				ndvEventBus.emit("updateInputNodeName", source?.previousNode);
				ndvEventBus.emit("setInputBranchIndex", inputBranch);
				ndvStore.value.setOutputRunIndex(treeNode.runIndex);
			});
		}
		function handleChangeInputTableColumnCollapsing(columnName) {
			inputTableColumnCollapsing.value = columnName && selectedNode.value ? {
				nodeName: selectedNode.value.node.name,
				columnName
			} : void 0;
		}
		function handleChangeOutputTableColumnCollapsing(columnName) {
			outputTableColumnCollapsing.value = columnName && selectedNode.value ? {
				nodeName: selectedNode.value.node.name,
				columnName
			} : void 0;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "popOutContainer",
				ref: popOutContainer,
				"data-test-id": "logs-panel"
			}, [(openBlock(), createBlock(LogsViewKeyboardEventListener_default, {
				key: String(!!unref(popOutWindow)),
				"key-map": keyMap.value,
				container: container.value
			}, null, 8, ["key-map", "container"])), createBaseVNode("div", {
				ref_key: "popOutContent",
				ref: popOutContent,
				class: normalizeClass([_ctx.$style.popOutContent, unref(isPoppedOut) ? _ctx.$style.poppedOut : ""])
			}, [createVNode(unref(N8nResizeWrapper_default), {
				resizer: unref(resizer),
				"supported-directions": ["top"],
				"is-resizing-enabled": !unref(isPoppedOut),
				class: normalizeClass(_ctx.$style.resizeWrapper),
				style: normalizeStyle({ height: unref(isOpen) && !unref(isPoppedOut) ? `${unref(height)}px` : "auto" }),
				onResizeend: unref(onResizeEnd)
			}, {
				default: withCtx(() => [createBaseVNode("div", {
					ref_key: "container",
					ref: container,
					class: normalizeClass(_ctx.$style.container),
					tabindex: "-1"
				}, [unref(hasChat) && (!props.isReadOnly || (unref(chatOptions).messageHistory ?? []).length > 0) ? (openBlock(), createBlock(unref(N8nResizeWrapper_default), {
					key: 0,
					"supported-directions": ["right"],
					"is-resizing-enabled": unref(isOpen),
					resizer: unref(chatPanelResizer),
					style: normalizeStyle({ width: `${unref(chatPanelWidth)}px` }),
					class: normalizeClass(_ctx.$style.chat),
					window: unref(popOutWindow)
				}, {
					default: withCtx(() => [(openBlock(), createBlock(ChatMessagesPanel_default, {
						key: `canvas-chat-${unref(currentSessionId)}-${__props.isReadOnly ? unref(execution)?.id ?? "none" : "live"}${unref(isPoppedOut) ? "-pop-out" : ""}`,
						"data-test-id": "canvas-chat",
						"is-open": unref(isOpen),
						"is-read-only": __props.isReadOnly,
						"session-id": unref(currentSessionId),
						"show-close-button": false,
						"is-new-logs-enabled": true,
						"is-header-clickable": !unref(isPoppedOut),
						onClose: unref(onToggleOpen),
						onRefreshSession: unref(refreshSession),
						onDisplayExecution: unref(displayExecution),
						onClickHeader: unref(onToggleOpen)
					}, null, 8, [
						"is-open",
						"is-read-only",
						"session-id",
						"is-header-clickable",
						"onClose",
						"onRefreshSession",
						"onDisplayExecution",
						"onClickHeader"
					]))]),
					_: 1
				}, 8, [
					"is-resizing-enabled",
					"resizer",
					"style",
					"class",
					"window"
				])) : createCommentVNode("", true), createBaseVNode("div", {
					ref_key: "logsContainer",
					ref: logsContainer,
					class: normalizeClass(_ctx.$style.logsContainer)
				}, [createVNode(unref(N8nResizeWrapper_default), {
					class: normalizeClass(_ctx.$style.overviewResizer),
					resizer: unref(overviewPanelResizer),
					style: normalizeStyle({ width: isLogDetailsVisuallyOpen.value ? `${unref(overviewPanelWidth)}px` : "" }),
					"supported-directions": ["right"],
					"is-resizing-enabled": isLogDetailsOpen.value,
					window: unref(popOutWindow),
					onResizeend: handleResizeOverviewPanelEnd
				}, {
					default: withCtx(() => [createVNode(LogsOverviewPanel_default, {
						class: normalizeClass(_ctx.$style.logsOverview),
						"is-open": unref(isOpen),
						"is-read-only": __props.isReadOnly,
						"is-compact": isLogDetailsVisuallyOpen.value,
						selected: unref(selected),
						execution: unref(execution),
						entries: unref(entries),
						"latest-node-info": unref(latestNodeNameById),
						"flat-log-entries": unref(flatLogEntries),
						"is-header-clickable": !unref(isPoppedOut),
						onKeydown: handleArrowNavigation,
						onClickHeader: unref(onToggleOpen),
						onSelect: unref(select),
						onClearExecutionData: unref(resetExecutionData),
						onToggleExpanded: unref(toggleExpanded),
						onOpenNdv: handleOpenNdv
					}, {
						actions: withCtx(() => [!isLogDetailsVisuallyOpen.value ? (openBlock(), createBlock(LogsPanelActions_default, normalizeProps(mergeProps({ key: 0 }, logsPanelActionsProps.value)), null, 16)) : createCommentVNode("", true)]),
						_: 1
					}, 8, [
						"class",
						"is-open",
						"is-read-only",
						"is-compact",
						"selected",
						"execution",
						"entries",
						"latest-node-info",
						"flat-log-entries",
						"is-header-clickable",
						"onClickHeader",
						"onSelect",
						"onClearExecutionData",
						"onToggleExpanded"
					])]),
					_: 1
				}, 8, [
					"class",
					"resizer",
					"style",
					"is-resizing-enabled",
					"window"
				]), isLogDetailsVisuallyOpen.value && unref(selected) ? (openBlock(), createBlock(LogDetailsPanel_default, {
					key: 0,
					class: normalizeClass(_ctx.$style.logDetails),
					"is-open": unref(isOpen),
					"log-entry": unref(selected),
					window: unref(popOutWindow),
					"latest-info": selectedNode.value ? unref(latestNodeNameById)[selectedNode.value.node.id] : void 0,
					panels: unref(logsStore).detailsState,
					"collapsing-input-table-column-name": inputCollapsingColumnName.value,
					"collapsing-output-table-column-name": outputCollapsingColumnName.value,
					"is-header-clickable": !unref(isPoppedOut),
					onClickHeader: unref(onToggleOpen),
					onToggleInputOpen: unref(logsStore).toggleInputOpen,
					onToggleOutputOpen: unref(logsStore).toggleOutputOpen,
					onCollapsingInputTableColumnChanged: handleChangeInputTableColumnCollapsing,
					onCollapsingOutputTableColumnChanged: handleChangeOutputTableColumnCollapsing
				}, {
					actions: withCtx(() => [isLogDetailsVisuallyOpen.value ? (openBlock(), createBlock(LogsPanelActions_default, normalizeProps(mergeProps({ key: 0 }, logsPanelActionsProps.value)), null, 16)) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"class",
					"is-open",
					"log-entry",
					"window",
					"latest-info",
					"panels",
					"collapsing-input-table-column-name",
					"collapsing-output-table-column-name",
					"is-header-clickable",
					"onClickHeader",
					"onToggleInputOpen",
					"onToggleOutputOpen"
				])) : createCommentVNode("", true)], 2)], 2)]),
				_: 1
			}, 8, [
				"resizer",
				"is-resizing-enabled",
				"class",
				"style",
				"onResizeend"
			])], 2)], 512);
		};
	}
}), [["__cssModules", { "$style": {
	popOutContent: "_popOutContent_1vunr_1",
	resizeWrapper: "_resizeWrapper_1vunr_7",
	poppedOut: "_poppedOut_1vunr_14",
	container: "_container_1vunr_18",
	chat: "_chat_1vunr_28",
	logsContainer: "_logsContainer_1vunr_32",
	overviewResizer: "_overviewResizer_1vunr_42",
	logsOverview: "_logsOverview_1vunr_50",
	logsDetails: "_logsDetails_1vunr_54"
} }]]);
//#endregion
//#region src/features/execution/executions/composables/useExecutionDebugging.ts
init_runtime_core_esm_bundler();
var useExecutionDebugging = () => {
	const telemetry = useTelemetry();
	const router = useRouter();
	const i18n = useI18n();
	const message = useMessage();
	const aiSimulatedDataGuard = useAiSimulatedDataGuard();
	const toast = useToast();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const settingsStore = useSettingsStore();
	const uiStore = useUIStore();
	const { markStateDirty } = uiStore;
	const pageRedirectionHelper = usePageRedirectionHelper();
	const isDebugEnabled = computed(() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.DebugInEditor]);
	const applyExecutionData = async (executionId) => {
		let execution = await workflowsStore.getExecution(executionId);
		const redactionInfo = execution?.data?.redactionInfo;
		if (redactionInfo?.isRedacted) {
			if (!redactionInfo.canReveal) {
				toast.showToast({
					title: i18n.baseText("nodeView.showMessage.debug.redacted.title"),
					message: i18n.baseText("executionsList.debug.button.redacted.tooltip"),
					type: "warning"
				});
				await router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: {
						workflowId: workflowDocumentStore.value.workflowId,
						executionId
					}
				});
				return;
			}
			const unredacted = await workflowsStore.fetchExecutionDataById(executionId, { redactExecutionData: false });
			if (unredacted?.data) execution = unredacted;
		}
		const workflowNodes = workflowDocumentStore.value.allNodes;
		if (!execution?.data?.resultData) return;
		const { runData, pinData = {} } = execution.data.resultData;
		const executionNodeNames = Object.keys(runData);
		const missingNodeNames = executionNodeNames.filter((name) => !workflowNodes.some((node) => node.name === name));
		const workflowPinnedNodeNames = Object.keys(workflowDocumentStore.value.pinnedDataByNodeName);
		const matchingPinnedNodeNames = [.../* @__PURE__ */ new Set([...executionNodeNames, ...Object.keys(pinData)])].filter((name) => workflowPinnedNodeNames.includes(name));
		if (matchingPinnedNodeNames.length > 0) {
			const confirmMessage = h("p", [i18n.baseText("nodeView.confirmMessage.debug.message"), h("ul", { class: "mt-l ml-l" }, matchingPinnedNodeNames.map((name) => h("li", sanitizeHtml(name))))]);
			if (await message.confirm(confirmMessage, i18n.baseText("nodeView.confirmMessage.debug.headline"), {
				type: "warning",
				confirmButtonText: i18n.baseText("nodeView.confirmMessage.debug.confirmButtonText"),
				cancelButtonText: i18n.baseText("nodeView.confirmMessage.debug.cancelButtonText"),
				customClass: "matching-pinned-nodes-confirmation"
			}) === "confirm") matchingPinnedNodeNames.forEach((name) => {
				workflowDocumentStore.value.unpinNodeData(name);
			});
			else {
				await router.push({
					name: VIEWS.EXECUTION_PREVIEW,
					params: {
						workflowId: workflowDocumentStore.value.workflowId,
						executionId
					}
				});
				return;
			}
		}
		workflowDocumentStore.value.resetAllNodesIssues();
		useWorkflowExecutionStateStore(workflowDocumentStore.value.documentId).setWorkflowExecutionData(execution);
		let pinnableNodes = workflowNodes.filter((node) => !workflowDocumentStore.value.getParentNodes(node.name).length);
		const simulatedPinnableNodes = pinnableNodes.filter((node) => aiSimulatedDataGuard.isSimulatedNodeOutput(executionId, node.name));
		if (simulatedPinnableNodes.length > 0 && !await aiSimulatedDataGuard.confirmAdoption()) {
			const simulatedNames = new Set(simulatedPinnableNodes.map((node) => node.name));
			pinnableNodes = pinnableNodes.filter((node) => !simulatedNames.has(node.name));
		}
		let pinnings = 0;
		pinnableNodes.forEach((node) => {
			const taskData = runData[node.name]?.[0];
			if (taskData?.data?.main) {
				const nodeData = taskData.data.main.find((output) => output && output.length > 0);
				if (nodeData) {
					if (isTrimmedNodeExecutionData(nodeData)) return;
					pinnings++;
					workflowDocumentStore.value.pinNodeData(node.name, nodeData);
					workflowDocumentStore.value.clearPinnedDataTimestamps(node.name);
				}
			}
		});
		if (pinnings > 0 || matchingPinnedNodeNames.length > 0) markStateDirty();
		toast.showToast({
			title: i18n.baseText("nodeView.showMessage.debug.title"),
			message: i18n.baseText("nodeView.showMessage.debug.content"),
			type: "info"
		});
		if (missingNodeNames.length) toast.showToast({
			title: i18n.baseText("nodeView.showMessage.debug.missingNodes.title"),
			message: i18n.baseText("nodeView.showMessage.debug.missingNodes.content", { interpolate: { nodeNames: missingNodeNames.join(", ") } }),
			type: "warning"
		});
		telemetry.track("User clicked debug execution button", {
			instance_id: useRootStore().instanceId,
			exec_status: isFullExecutionResponse(execution) ? execution.status : "",
			override_pinned_data: pinnableNodes.length === pinnings,
			all_exec_data_imported: missingNodeNames.length === 0
		});
	};
	const handleDebugLinkClick = (event) => {
		if (!isDebugEnabled.value) {
			uiStore.openModalWithData({
				name: DEBUG_PAYWALL_MODAL_KEY,
				data: {
					title: i18n.baseText("executionsList.debug.paywall.title"),
					footerButtonAction: () => {
						uiStore.closeModal(DEBUG_PAYWALL_MODAL_KEY);
						pageRedirectionHelper.goToUpgrade("debug", "upgrade-debug");
					}
				}
			});
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowsStore.workflowId)).setIsInDebugMode(false);
	};
	return {
		applyExecutionData,
		handleDebugLinkClick
	};
};
//#endregion
export { LogsPanel_default as n, usePopOutWindow as r, useExecutionDebugging as t };
