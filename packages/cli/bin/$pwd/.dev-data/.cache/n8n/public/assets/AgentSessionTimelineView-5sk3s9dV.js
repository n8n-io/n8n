import { $d as init_runtime_core_esm_bundler, Au as useDocumentVisibility, Bd as createBlock, Cd as TransitionGroup, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Il as CollapsibleTrigger_default, Jd as defineComponent, Jf as toValue, Ju as useResizeObserver, Kd as createVNode, Ll as CollapsibleContent_default, Md as withKeys, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Of as withDirectives, Pd as Fragment, Rd as computed, Rf as onScopeDispose, Rl as CollapsibleRoot_default, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Xf as unref, Xo as useRouter, Yo as useRoute, _p as normalizeClass, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, rf as mergeProps, vf as resolveDynamicComponent, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, Fn as toDayMonth, Kr as useAgentPermissions, LM as N8nCallout_default, Mh as AGENT_SESSION_DETAIL_VIEW, Mn as convertToDisplayDate, Oj as N8nRecycleScroller_default, Ph as PROJECT_AGENTS, Qj as N8nMarkdown_default, Rc as useAgentTelemetry, Rk as jsonParse, SN as _plugin_vue_export_helper_default, Vr as useClipboard, WM as CodeBlock_default, Xc as usePushConnectionStore, ZA as isRecord, _N as N8nText_default, aM as N8nHoverCard_default, bC as useRootStore, bN as N8nSpinner_default, cN as Input_default, co as getAgent, dC as useToast, dj as AiActivityStepResultSection_default, dx as MODAL_CONFIRM, fC as VIEWS, fN as N8nTooltip_default, hM as N8nLink_default, hj as AiActivityStepButton_default, hu as NodeIcon_default, jN as useI18n, jh as AGENT_SESSIONS_LIST_VIEW, kh as AGENT_BUILDER_VIEW, mN as truncate, mj as AiActivityStepChevron_default, nN as N8nBadge_default, no as deleteAgentMemoryCapture, pj as AnimatedCollapsibleContent_default, ro as deleteAgentMemoryEntry, tj as N8nBreadcrumbs_default, uf as useNodeTypesStore, vN as N8nIconButton_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
import { t as useKeybindings } from "./useKeybindings-DShLgy_J.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
import { n as vElementSize } from "./components-DckIqgpT.js";
import { i as resolveToolNameForDisplay, n as getToolNameTranslationKey, t as formatToolNameForDisplay } from "./toolDisplayName-C5txb6dB.js";
import { t as useAgentProjectBreadcrumb } from "./useAgentProjectBreadcrumb-VTuNETiM.js";
import { t as useAgentConfig } from "./useAgentConfig-BZ4ZXuth.js";
import { t as useAgentConfirmationModal } from "./useAgentConfirmationModal-3kW3PApn.js";
import { C as convertDbMessages, H as isDelegateSubAgentTool, K as resolveSubAgentName, a as useSubAgentNames, d as backgroundJobTimelineLabelKey, f as useAgentExecutionUpdates, g as isBudgetStopCode, h as increasedBudgetConfig, i as getToolOutputAttachments, j as parseApprovalInput, n as useAgentBackgroundJobs, o as AgentChatMessageAttachments_default, r as AgentBudgetNoticeCard_default, t as ToolApprovalCard_default, u as backgroundJobResultLabel } from "./ToolApprovalCard-Dt5UQ-1j.js";
import { i as defaultAgentSessionFilters, n as useThreadTitle, r as useAgentSessionsStore, t as useAgentSessionStop } from "./useAgentSessionStop-CtqFqela.js";
import { t as useAgentFolderBreadcrumb } from "./useAgentFolderBreadcrumb-BeD-Ouo7.js";
import { r as useAgentSessionLangSmithExport, t as useAgentSessionUsage } from "./useAgentSessionUsage-dxTyKbg6.js";
//#region src/features/agents/components/AgentSessionTimelineHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$4 = { key: 0 };
var AgentSessionTimelineHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSessionTimelineHeader",
	props: {
		breadcrumbItems: {},
		projectIcon: {},
		sessionTitle: {},
		sessionOptions: {},
		showLangsmithExport: { type: Boolean },
		langsmithExportLoading: { type: Boolean },
		metadata: {},
		hasSession: { type: Boolean },
		canDeleteSession: { type: Boolean },
		isDeletingSession: { type: Boolean },
		showStop: { type: Boolean },
		stopLoading: { type: Boolean }
	},
	emits: [
		"breadcrumb-select",
		"session-select",
		"langsmith-export",
		"copy-link",
		"delete-session",
		"stop",
		"close"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const menuItems = computed(() => [
			{
				id: "copy-link",
				label: i18n.baseText("agents.builder.preview.more.copyLink"),
				icon: {
					type: "icon",
					value: "link"
				},
				disabled: !props.hasSession
			},
			...props.showLangsmithExport ? [{
				id: "export-session",
				label: i18n.baseText("agentSessions.langsmithExport.button"),
				icon: {
					type: "icon",
					value: "bug"
				},
				disabled: !props.hasSession || props.langsmithExportLoading
			}] : [],
			...props.canDeleteSession ? [{
				id: "delete-session",
				label: i18n.baseText("agentSessions.delete"),
				icon: {
					type: "icon",
					value: "trash-2"
				},
				divided: true,
				destructive: true,
				disabled: !props.hasSession || props.isDeletingSession
			}] : []
		]);
		function onMenuSelect(action) {
			if (!props.hasSession) return;
			if (action === "copy-link") emit("copy-link");
			if (action === "export-session" && props.showLangsmithExport && !props.langsmithExportLoading) emit("langsmith-export");
			if (action === "delete-session" && props.canDeleteSession && !props.isDeletingSession) emit("delete-session");
		}
		const tokenFormatter = new Intl.NumberFormat("en-US", {
			notation: "compact",
			maximumFractionDigits: 1
		});
		const costFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.topBar) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.topBarLeft) }, [createVNode(unref(N8nBreadcrumbs_default), {
				items: __props.breadcrumbItems,
				theme: "medium",
				onItemSelected: _cache[1] || (_cache[1] = ($event) => emit("breadcrumb-select", $event))
			}, {
				prepend: withCtx(() => [createVNode(ProjectIcon_default, {
					icon: props.projectIcon,
					size: "mini"
				}, null, 8, ["icon"])]),
				append: withCtx(() => [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.crumbSeparator),
					"aria-hidden": "true"
				}, "/", 2), createVNode(unref(DropdownMenu_default), {
					items: props.sessionOptions,
					placement: "bottom-start",
					"extra-popper-class": _ctx.$style.sessionDropdownMenu,
					"data-testid": "session-header-switcher",
					onSelect: _cache[0] || (_cache[0] = ($event) => emit("session-select", $event))
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "small",
						class: normalizeClass(_ctx.$style.switcherButton),
						"aria-label": unref(i18n).baseText("agentSessions.sessionName")
					}, {
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.switcherLabel) }, toDisplayString(props.sessionTitle), 3), createVNode(unref(N8nIcon_default), {
							icon: "chevron-down",
							size: 12
						})]),
						_: 1
					}, 8, ["class", "aria-label"])]),
					"item-label": withCtx(({ item }) => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.sessionDropdownName) }, toDisplayString(item.label), 3)]),
					"item-trailing": withCtx(({ item }) => [item.data?.date ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.sessionDropdownDate)
					}, toDisplayString(item.data.date), 3)) : createCommentVNode("", true)]),
					_: 1
				}, 8, ["items", "extra-popper-class"])]),
				_: 1
			}, 8, ["items"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.topBarRight) }, [
				__props.metadata ? (openBlock(), createElementBlock("ul", {
					key: 0,
					class: normalizeClass(_ctx.$style.descriptionList),
					"data-testid": "agent-session-timeline-metadata"
				}, [
					__props.metadata.trigger.label ? (openBlock(), createElementBlock("li", _hoisted_1$4, [createVNode(unref(N8nIcon_default), {
						color: "text-light",
						icon: __props.metadata.trigger.icon
					}, null, 8, ["icon"]), createVNode(unref(N8nText_default), {
						step: "xs",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.metadata.trigger.label), 1)]),
						_: 1
					})])) : createCommentVNode("", true),
					createBaseVNode("li", { class: normalizeClass(_ctx.$style.numericMetadata) }, [createVNode(unref(N8nIcon_default), {
						color: "text-light",
						icon: "hash"
					}), createVNode(unref(N8nText_default), {
						step: "xs",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(tokenFormatter).format(__props.metadata.totalTokens).toUpperCase()) + " ", 1), __props.metadata.totalCost !== null ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.innerLabel)
						}, "($" + toDisplayString(unref(costFormatter).format(__props.metadata.totalCost)) + ")", 3)) : createCommentVNode("", true)]),
						_: 1
					})], 2),
					createBaseVNode("li", { class: normalizeClass(_ctx.$style.numericMetadata) }, [createVNode(unref(N8nIcon_default), {
						color: "text-light",
						icon: "clock"
					}), createVNode(unref(N8nText_default), {
						step: "xs",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.metadata.durationLabel), 1)]),
						_: 1
					})], 2)
				], 2)) : createCommentVNode("", true),
				createVNode(unref(N8nTooltip_default), {
					placement: "bottom",
					content: unref(i18n).baseText("agentSessions.actions")
				}, {
					default: withCtx(() => [createVNode(unref(DropdownMenu_default), {
						items: menuItems.value,
						placement: "bottom-end",
						"data-testid": "agent-session-timeline-more-menu",
						onSelect: onMenuSelect
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "ellipsis",
							variant: "ghost",
							size: "small",
							"icon-size": "large",
							"aria-label": unref(i18n).baseText("agentSessions.actions"),
							"data-testid": "agent-session-timeline-more-btn"
						}, null, 8, ["aria-label"])]),
						_: 1
					}, 8, ["items"])]),
					_: 1
				}, 8, ["content"]),
				props.showStop ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					content: unref(i18n).baseText("agentSessions.stop"),
					disabled: props.stopLoading
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						size: "medium",
						icon: "square",
						class: normalizeClass(_ctx.$style.stopButton),
						"aria-label": unref(i18n).baseText("agentSessions.stop"),
						loading: props.stopLoading,
						"data-testid": "agent-session-stop",
						onClick: _cache[2] || (_cache[2] = ($event) => emit("stop"))
					}, null, 8, [
						"class",
						"aria-label",
						"loading"
					])]),
					_: 1
				}, 8, ["content", "disabled"])) : createCommentVNode("", true),
				createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("generic.close") }, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						variant: "ghost",
						icon: "x",
						size: "medium",
						"aria-label": unref(i18n).baseText("generic.close"),
						"data-testid": "agent-session-timeline-close",
						"data-test-id": "agent-session-timeline-close",
						onClick: _cache[3] || (_cache[3] = ($event) => emit("close"))
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["content"])
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	topBar: "_topBar_s7bjg_1",
	topBarLeft: "_topBarLeft_s7bjg_13",
	topBarRight: "_topBarRight_s7bjg_40",
	stopButton: "_stopButton_s7bjg_54",
	crumbSeparator: "_crumbSeparator_s7bjg_58",
	switcherButton: "_switcherButton_s7bjg_65",
	switcherLabel: "_switcherLabel_s7bjg_71",
	sessionDropdownMenu: "_sessionDropdownMenu_s7bjg_79",
	sessionDropdownName: "_sessionDropdownName_s7bjg_90",
	sessionDropdownDate: "_sessionDropdownDate_s7bjg_98",
	numericMetadata: "_numericMetadata_s7bjg_106",
	descriptionList: "_descriptionList_s7bjg_110",
	innerLabel: "_innerLabel_s7bjg_116"
} }]]);
//#endregion
//#region src/features/agents/composables/useBackOrFallback.ts
init_reactivity_esm_bundler();
/**
* Back within the app when there is somewhere to go back to; otherwise
* navigates to `fallback`. A direct visit (no matched previous route) has
* nowhere to go back to, so it falls through to `fallback` instead.
*/
function useBackOrFallback(fallback) {
	const router = useRouter();
	return function goBackOrFallback() {
		const previousRoute = router.options.history.state.back;
		if ((typeof previousRoute === "string" ? router.resolve(previousRoute) : null)?.matched.length) {
			router.back();
			return;
		}
		router.push(toValue(fallback));
	};
}
//#endregion
//#region src/features/agents/utils/background-task-timeline.ts
var backgroundTaskPresentation = {
	running: {
		icon: void 0,
		labelKey: "agentSessions.timeline.taskRunning",
		activity: "running"
	},
	suspended: {
		icon: "hourglass",
		labelKey: "agentSessions.timeline.taskSuspended",
		activity: "waiting"
	},
	paused: {
		icon: "circle-pause",
		labelKey: "agentSessions.timeline.taskPaused",
		activity: "waiting"
	},
	completed: {
		icon: "circle-check",
		labelKey: "agentSessions.timeline.taskCompleted",
		activity: "completed"
	},
	failed: {
		icon: "circle-x",
		labelKey: "agentSessions.timeline.taskFailed",
		activity: "failed"
	},
	cancelled: {
		icon: "circle-x",
		labelKey: "agentSessions.timeline.taskCancelled",
		activity: "interrupted"
	}
};
/**
* Preserve execution order. Insert tasks before the first later execution timestamp.
* Keep equal task timestamps stable. Append tasks without a finite timestamp.
*/
function insertBackgroundTaskTimelineItems(executionItems, taskItems) {
	const sortedTasks = [...taskItems].sort((a, b) => {
		const aTime = Number.isFinite(a.timestamp) ? a.timestamp : Infinity;
		const bTime = Number.isFinite(b.timestamp) ? b.timestamp : Infinity;
		return aTime === bTime ? 0 : aTime - bTime;
	});
	const items = [];
	let taskIndex = 0;
	for (const item of executionItems) {
		while (Number.isFinite(item.timestamp) && taskIndex < sortedTasks.length && Number.isFinite(sortedTasks[taskIndex].timestamp) && sortedTasks[taskIndex].timestamp < item.timestamp) items.push(sortedTasks[taskIndex++]);
		items.push(item);
	}
	items.push(...sortedTasks.slice(taskIndex));
	return items;
}
/** Keep one item per task in the current group. */
function backgroundTasksToTimelineItems(tasks) {
	return tasks.map((task) => ({
		kind: "background-task",
		executionId: `background-task:${task.id}`,
		timestamp: Date.parse(task.startedAt),
		endTimestamp: task.settledAt ? Date.parse(task.settledAt) : void 0,
		activityStatus: backgroundTaskPresentation[task.status].activity,
		content: task.title,
		backgroundTask: task
	}));
}
//#endregion
//#region src/features/agents/session-timeline.utils.ts
var LOAD_SKILL_TOOL_NAME = "load_skill";
var MEMORY_ACTIONS = {
	recall_memory: "recall",
	flag_memory: "flag"
};
var GUARDRAIL_STOP_MESSAGE_KEYS = {
	"budget.session": "agentSessions.timeline.guardrailStop.session",
	"budget.monthly": "agentSessions.timeline.guardrailStop.monthly",
	"budget.credits": "agentSessions.timeline.guardrailStop.credits",
	"budget.freeCredits": "agentSessions.timeline.guardrailStop.freeCredits"
};
function endTimestampOf(item) {
	return item.endTimestamp ?? item.timestamp;
}
/** A `delegate_subagent` tool call — rendered as a sub-agent (bot icon) rather than a plain tool. */
function isSubAgentTimelineItem(item) {
	return item.kind === "tool" && isDelegateSubAgentTool(item.toolName);
}
function errorTextFromValue(value) {
	if (typeof value === "string" && value.length > 0) return value;
	if (isRecord(value) && typeof value.message === "string" && value.message.length > 0) return value.message;
	return "";
}
/** MCP CallToolResult stores the message in structuredContent.error or text content. */
function mcpErrorMessage(output) {
	if (isRecord(output.structuredContent)) {
		const fromStructured = errorTextFromValue(output.structuredContent.error);
		if (fromStructured) return fromStructured;
	}
	if (!Array.isArray(output.content)) return "";
	for (const block of output.content) {
		if (!isRecord(block) || block.type !== "text" || typeof block.text !== "string") continue;
		const text = block.text.trim();
		if (!text) continue;
		try {
			const parsed = JSON.parse(text);
			if (typeof parsed === "string" && parsed.length > 0) return parsed;
			if (isRecord(parsed)) {
				const fromJson = errorTextFromValue(parsed.error);
				if (fromJson) return fromJson;
			}
		} catch {
			return text;
		}
	}
	return "";
}
/**
* A tool/workflow/node call is failed when the runtime recorded an error
* outcome, or when a built-in tool returned a soft-failure payload instead
* of throwing. In-flight calls without output are not failed.
*/
function isErroredToolCallTimelineItem(item) {
	if (item.kind !== "tool" && item.kind !== "skill" && item.kind !== "workflow" && item.kind !== "node") return false;
	if (item.toolOutcome === "error") return true;
	if (item.toolOutcome === void 0 && item.toolSuccess === false) return true;
	if (!isRecord(item.toolOutput)) return false;
	const { error, status, success, ok, isError } = item.toolOutput;
	return typeof error === "string" && error.length > 0 || isRecord(error) && typeof error.message === "string" && error.message.length > 0 || status === "error" || status === "failed" || success === false || ok === false || isError === true;
}
function isErroredTimelineItem(item) {
	return item.kind === "execution-error" || item.backgroundTask?.status === "failed" || isErroredToolCallTimelineItem(item);
}
/** Extracts a human-readable error message from a failed item's tool output. */
function timelineItemErrorMessage(item) {
	if (!isErroredToolCallTimelineItem(item)) return "";
	const output = item.toolOutput;
	if (!isRecord(output)) return "";
	return errorTextFromValue(output.error) || mcpErrorMessage(output);
}
var HITL_REQUEST_LABEL_KEYS = {
	approval: "agentSessions.timeline.approvalRequested",
	interaction: "agentSessions.timeline.hitlRequested",
	wait: "agentSessions.timeline.waitRequested"
};
/** Search/filter keys resolved by the label maps in the timeline panel and table. */
var HITL_REQUEST_FILTER_KEYS = {
	approval: "approval-requested",
	interaction: "hitl-requested",
	wait: "wait-requested"
};
/** Label for a suspension row. Legacy items with no request type read as an interaction. */
function hitlRequestLabelKey(requestType) {
	return HITL_REQUEST_LABEL_KEYS[requestType ?? "interaction"];
}
function hitlTimelineNameKey(item) {
	if (item.hitlRequestType !== "approval") return void 0;
	if (item.kind === "suspension") return "agentSessions.timeline.approvalRequestForTool";
	if (item.kind === "hitl-response") return "agentSessions.timeline.approvalResponseForTool";
}
function backgroundJobSignalSummary(item, i18n) {
	const labels = (item.backgroundJobSignal?.tasks ?? []).map((job) => backgroundJobResultLabel(job, i18n));
	return new Intl.ListFormat(i18n.locale, {
		style: "long",
		type: "conjunction"
	}).format(labels);
}
/** Row name of a memory item: what the run recalled or flagged. */
function memoryTimelineName(item, i18n) {
	return i18n.baseText(item.memoryAction === "flag" ? "agentSessions.timeline.memory.flagged" : "agentSessions.timeline.memory.recalled");
}
function executionErrorLabel(item, i18n) {
	if (item.guardrailCode) return i18n.baseText("agentSessions.timeline.guardrailStop.label");
	return i18n.baseText(item.executionStatus === "interrupted" ? "agentSessions.timeline.executionInterrupted" : "agentSessions.timeline.executionFailed");
}
function executionErrorMessage(item, i18n) {
	if (item.guardrailCode) return i18n.baseText(GUARDRAIL_STOP_MESSAGE_KEYS[item.guardrailCode] ?? "agentSessions.timeline.guardrailStop.fallback");
	if (item.content) return item.content;
	return i18n.baseText(item.executionStatus === "interrupted" ? "agentSessions.timeline.executionInterruptedFallback" : "agentSessions.timeline.executionFailedFallback");
}
function linkedToolDisplayName(item, i18n) {
	return item.hitlToolDisplayName ?? item.workflowName ?? item.nodeDisplayName ?? resolveToolNameForDisplay(item.toolName, i18n, item.toolOutput);
}
function hitlTimelineName(item, i18n) {
	const toolName = linkedToolDisplayName(item, i18n);
	const nameKey = hitlTimelineNameKey(item);
	return nameKey ? i18n.baseText(nameKey, { interpolate: { toolName } }) : toolName;
}
function timelineItemStatus(item) {
	if (item.backgroundTask) return {
		kind: "background-task",
		labelKey: backgroundTaskPresentation[item.backgroundTask.status].labelKey,
		theme: item.backgroundTask.status === "failed" ? "danger" : item.backgroundTask.status === "completed" ? "success" : "outline"
	};
	if (item.kind === "hitl-response") {
		if (item.hitlResponseStatus === "approved") return {
			kind: "hitl-response",
			labelKey: "agentSessions.timeline.approved",
			theme: "success"
		};
		return {
			kind: "hitl-response",
			labelKey: item.hitlResponseStatus === "declined" ? "agentSessions.timeline.declined" : "agentSessions.timeline.responseReceived",
			theme: "outline"
		};
	}
	if (isErroredTimelineItem(item)) return {
		kind: "tool-error",
		labelKey: "agentSessions.timeline.error",
		theme: "danger"
	};
}
function itemFilterKey(item) {
	return item.kind;
}
function itemStatusFilterKey(item) {
	if (isErroredTimelineItem(item)) return "error";
	if (item.kind === "hitl-response" && (item.hitlResponseStatus === "approved" || item.hitlResponseStatus === "declined")) return item.hitlResponseStatus;
}
function matchesTimelineFilters(item, selectedFilters) {
	if (selectedFilters.size === 0 || selectedFilters.has(itemFilterKey(item))) return true;
	const statusKey = itemStatusFilterKey(item);
	return statusKey !== void 0 && selectedFilters.has(statusKey);
}
function searchableValueText(value) {
	if (value === void 0) return void 0;
	if (value === null) return "null";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}
function timelineItemSearchText(item, labelForKey) {
	const parts = [];
	parts.push(labelForKey(itemFilterKey(item)));
	if (item.kind === "execution-error" && item.executionStatus === "interrupted") parts.push(labelForKey("execution-interrupted"));
	if (item.kind === "suspension") parts.push(labelForKey(HITL_REQUEST_FILTER_KEYS[item.hitlRequestType ?? "interaction"]));
	if (item.kind === "hitl-response") parts.push(labelForKey("hitl-response"));
	if (item.hitlResponseStatus) parts.push(labelForKey(item.hitlResponseStatus));
	if (isErroredTimelineItem(item)) parts.push(labelForKey("error"));
	if (item.backgroundTask) parts.push(item.backgroundTask.title, labelForKey(`background-task-current-${item.backgroundTask.status}`));
	for (const job of item.backgroundJobSignal?.tasks ?? []) parts.push(job.title, labelForKey(`background-task-${job.status}`));
	parts.push(item.content, item.toolName, item.workflowName, item.nodeDisplayName, item.skillName, item.subAgentName, searchableValueText(item.toolInput), searchableValueText(item.toolOutput), searchableValueText(item.hitlRequest), searchableValueText(item.hitlResponse));
	if (item.toolName) parts.push(formatToolNameForDisplay(item.toolName));
	const toolKey = builtinToolLabelKey(item.toolName, item.toolOutput);
	if (toolKey) parts.push(labelForKey(toolKey));
	return parts.filter((part) => typeof part === "string").join(" ").toLowerCase();
}
function matchesSearch(item, query, labelForKey) {
	if (!query) return true;
	return timelineItemSearchText(item, labelForKey).includes(query.toLowerCase());
}
function filteredTimelineItemIndexes(items, visibleKinds, searchQuery, labelForKey) {
	return items.map((item, index) => ({
		item,
		index
	})).filter(({ item }) => matchesTimelineFilters(item, visibleKinds) && matchesSearch(item, searchQuery.trim(), labelForKey)).map(({ index }) => index);
}
function sessionBounds(items) {
	if (items.length === 0) return {
		start: 0,
		end: 1
	};
	let start = Infinity;
	let end = -Infinity;
	for (const item of items) {
		if (item.timestamp < start) start = item.timestamp;
		const e = endTimestampOf(item);
		if (e > end) end = e;
	}
	if (end <= start) end = start + 1;
	return {
		start,
		end
	};
}
function builtinToolLabelKey(toolName, output) {
	return getToolNameTranslationKey(toolName, output) ?? null;
}
function formatDuration(ms) {
	if (!ms || ms <= 0) return "";
	if (ms < 1e3) return `${ms}ms`;
	if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
	const minutes = Math.floor(ms / 6e4);
	const seconds = Math.floor(ms % 6e4 / 1e3);
	if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remMinutes = minutes % 60;
	return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}
/**
* Cast the loose API timeline shape (`Record<string, unknown> & { type }`)
* into the discriminated union used by the renderer. The backend writes
* the same producer schema both layers expect; the API type is loose so
* `useAgentThreadsApi.ts` doesn't have to import the renderer's types.
*/
function timelineEvents(exec) {
	return exec.timeline ?? [];
}
function isDeclinedToolOutput(output) {
	return isRecord(output) && output.declined === true;
}
function isApprovalRequest(value) {
	return isRecord(value) && value.type === "approval";
}
function isIntegrationActionRequest(value) {
	return isRecord(value) && value.type === "integration_action";
}
function isWaitRequest(value) {
	return isRecord(value) && value.type === "workflow_wait";
}
function toolCallOutcome(event) {
	if (event.endTime === 0) return void 0;
	return event.success ? "success" : "error";
}
function toolActivityStatus(event, exec) {
	if (event.endTime !== 0) return event.success ? "completed" : "failed";
	return exec.status === "running" ? "running" : "interrupted";
}
function isSkillToolCall(event) {
	return event.kind === "skill" || event.name === LOAD_SKILL_TOOL_NAME;
}
/** Only a completed, successful memory call becomes a memory row; others stay tool rows. */
function memoryActionOf(event) {
	if (toolCallOutcome(event) !== "success") return void 0;
	return MEMORY_ACTIONS[event.name];
}
function toolCallKind(event) {
	if (event.kind === "workflow") return "workflow";
	if (event.kind === "node") return "node";
	if (isSkillToolCall(event)) return "skill";
	if (memoryActionOf(event)) return "memory";
	return "tool";
}
function skillNameFromText(value) {
	const name = /^\[Skill: ([^\]]+)\]/m.exec(value)?.[1];
	if (!name) return void 0;
	if (!name.startsWith("\"")) return name;
	if (!name.endsWith("\"")) return name.slice(1);
	try {
		const parsed = JSON.parse(name);
		return typeof parsed === "string" ? parsed : name;
	} catch {
		return name.slice(1, -1);
	}
}
function skillNameFromOutput(output) {
	if (!isRecord(output)) return void 0;
	if (typeof output.name === "string" && output.name.length > 0) return output.name;
	if (!Array.isArray(output.value)) return void 0;
	for (const part of output.value) {
		if (!isRecord(part) || typeof part.text !== "string") continue;
		const name = skillNameFromText(part.text);
		if (name) return name;
	}
}
function skillNameFromEvent(event) {
	const outputName = skillNameFromOutput(event.output);
	if (outputName) return outputName;
	if (!isRecord(event.input)) return void 0;
	if (typeof event.input.name === "string" && event.input.name.length > 0) return event.input.name;
	return typeof event.input.skillId === "string" && event.input.skillId.length > 0 ? event.input.skillId : void 0;
}
function inferHitlRequestType(event, toolCall, legacyApprovalToolCallIds) {
	if (isApprovalRequest(event.suspendPayload)) return "approval";
	if (legacyApprovalToolCallIds.has(event.toolCallId)) return "approval";
	if (isWaitRequest(event.suspendPayload)) return "wait";
	if (event.suspendPayload !== void 0) return "interaction";
	return toolCall?.kind === "node" || toolCall?.kind === "workflow" ? "approval" : "interaction";
}
function collectLegacyApprovalToolCallIds(executions) {
	const toolCallIds = /* @__PURE__ */ new Set();
	for (const exec of executions) for (const event of timelineEvents(exec)) if (event.type === "tool-call" && isDeclinedToolOutput(event.output)) toolCallIds.add(event.toolCallId);
	return toolCallIds;
}
function hitlRequestPayload(event, toolCall, requestType) {
	if (requestType === "approval") return event.suspendPayload ?? {
		type: "approval",
		toolName: event.toolName,
		args: event.input ?? toolCall?.input
	};
	if (event.suspendPayload !== void 0 && !isIntegrationActionRequest(event.suspendPayload)) return event.suspendPayload;
	return event.input ?? toolCall?.input ?? event.suspendPayload;
}
function approvalDisplayName(payload) {
	if (!isRecord(payload) || typeof payload.displayName !== "string") return void 0;
	return payload.displayName;
}
function hitlResponseStatus(requestType, response, isLegacyResponse = false) {
	if (requestType === "approval" && isRecord(response) && typeof response.approved === "boolean") return response.approved ? "approved" : "declined";
	if (isDeclinedToolOutput(response)) return "declined";
	if (isLegacyResponse && requestType === "approval") return "approved";
	return "responded";
}
function mergeResumedToolResult(item, event, exec) {
	if (!item) return;
	item.activityStatus = toolActivityStatus(event, exec);
	item.endTimestamp = event.endTime || void 0;
	if (isDeclinedToolOutput(event.output)) return;
	item.toolOutput = event.output;
	item.toolOutcome = toolCallOutcome(event);
	item.toolSuccess = event.endTime === 0 ? void 0 : event.success;
	if (item.kind === "workflow") item.workflowExecutionId = event.workflowExecutionId;
}
function hitlResponseItem(context, executionId, response, timestamp, isLegacyResponse = false) {
	return {
		kind: "hitl-response",
		executionId,
		toolName: context.toolName,
		toolCallId: context.toolCallId,
		hitlRequestType: context.requestType,
		hitlResponse: response,
		hitlResponseStatus: hitlResponseStatus(context.requestType, response, isLegacyResponse),
		hitlToolDisplayName: context.toolDisplayName,
		timestamp,
		endTimestamp: timestamp,
		workflowName: context.toolCall?.workflowName,
		nodeDisplayName: context.toolCall?.nodeDisplayName
	};
}
function inputTimelineItem(input, executionId, timestamp) {
	const [message] = convertDbMessages([input]);
	if (!message) return void 0;
	return {
		kind: "user",
		executionId,
		id: `${executionId}:user:${input.id}`,
		content: message.content,
		timestamp,
		...input.author && { authorName: input.author.name },
		attachments: message.attachments?.flatMap(({ fileId, fileName, mimeType, sizeBytes }) => fileId ? [{
			id: fileId,
			fileName,
			mimeType,
			sizeBytes: sizeBytes ?? 0
		}] : [])
	};
}
function flattenExecutionsToTimelineItems(executions) {
	const items = [];
	const initialToolCalls = /* @__PURE__ */ new Map();
	const initialToolItems = /* @__PURE__ */ new Map();
	const hitlContexts = /* @__PURE__ */ new Map();
	const legacyApprovalToolCallIds = collectLegacyApprovalToolCallIds(executions);
	for (const exec of executions) {
		const isResumed = exec.hitlStatus === "resumed";
		let resumedTagUsed = false;
		const events = timelineEvents(exec);
		const timestamp = exec.startedAt ? new Date(exec.startedAt).getTime() : 0;
		let thinkingSegments = [];
		let thinkingItemIndex = items.length;
		const appendAgentItem = (event, insertAt = items.length) => {
			const showResumed = isResumed && !resumedTagUsed;
			if (showResumed) resumedTagUsed = true;
			const startTs = event.timestamp ?? 0;
			items.splice(insertAt, 0, {
				kind: "agent",
				executionId: exec.id,
				content: event.content,
				timestamp: startTs,
				endTimestamp: event.endTime && event.endTime > startTs ? event.endTime : void 0,
				resumed: showResumed,
				...thinkingSegments.length > 0 && { thinkingSegments }
			});
			thinkingSegments = [];
		};
		const flushThinking = () => {
			if (!thinkingSegments.length) return;
			appendAgentItem({
				type: "text",
				content: "",
				timestamp: thinkingSegments[0].startTime ?? timestamp,
				endTime: thinkingSegments.at(-1)?.endTime
			}, thinkingItemIndex);
		};
		if (exec.inputMessages !== void 0) {
			const steeredIds = new Set(events.filter((event) => event.type === "input").map((event) => event.messageId));
			for (const input of exec.inputMessages) {
				if (steeredIds.has(input.id)) continue;
				const item = inputTimelineItem(input, exec.id, timestamp);
				if (item) items.push(item);
			}
		} else if (exec.userMessage || exec.attachments?.length) items.push({
			kind: "user",
			executionId: exec.id,
			content: exec.userMessage ?? "",
			timestamp,
			...exec.author && { authorName: exec.author.name },
			...exec.attachments?.length && { attachments: exec.attachments }
		});
		for (const [eventIndex, event] of events.entries()) if (event.type === "background-task-signal") items.push({
			kind: "background-task-signal",
			executionId: exec.id,
			timestamp: event.timestamp,
			backgroundJobSignal: event.signal
		});
		else if (event.type === "input") {
			flushThinking();
			const input = exec.inputMessages?.find(({ id }) => id === event.messageId);
			if (!input) continue;
			const item = inputTimelineItem(input, exec.id, event.timestamp);
			if (item) items.push(item);
		} else if (event.type === "reasoning") {
			if (!event.content.trim()) continue;
			if (!thinkingSegments.length) thinkingItemIndex = items.length;
			thinkingSegments.push({
				id: `${exec.id}:reasoning:${eventIndex}`,
				content: event.content,
				startTime: event.timestamp,
				endTime: event.endTime
			});
		} else if (event.type === "text") appendAgentItem(event);
		else if (event.type === "tool-call") {
			const hitlContext = hitlContexts.get(event.toolCallId);
			if (hitlContext) {
				mergeResumedToolResult(hitlContext.toolItem, event, exec);
				if (!hitlContext.hasExplicitResponse) items.push(hitlResponseItem(hitlContext, exec.id, event.output, event.startTime, true));
				hitlContexts.delete(event.toolCallId);
				continue;
			}
			const isWorkflow = event.kind === "workflow";
			const isNode = event.kind === "node";
			const kind = toolCallKind(event);
			if (event.toolCallId) initialToolCalls.set(event.toolCallId, event);
			const item = {
				kind,
				executionId: exec.id,
				toolName: event.name,
				skillName: kind === "skill" ? skillNameFromEvent(event) : void 0,
				memoryAction: kind === "memory" ? memoryActionOf(event) : void 0,
				toolCallId: event.toolCallId,
				toolInput: event.input,
				toolOutput: event.output,
				toolOutcome: toolCallOutcome(event),
				toolSuccess: event.endTime === 0 ? void 0 : event.success,
				activityStatus: toolActivityStatus(event, exec),
				timestamp: event.startTime,
				endTimestamp: event.endTime || void 0,
				workflowId: isWorkflow ? event.workflowId : void 0,
				workflowName: isWorkflow ? event.workflowName : void 0,
				workflowExecutionId: isWorkflow ? event.workflowExecutionId : void 0,
				workflowTriggerType: isWorkflow ? event.triggerType : void 0,
				nodeType: isNode ? event.nodeType : void 0,
				nodeTypeVersion: isNode ? event.nodeTypeVersion : void 0,
				nodeDisplayName: isNode ? event.nodeDisplayName : void 0,
				nodeParameters: isNode ? event.nodeParameters : void 0
			};
			items.push(item);
			if (event.toolCallId) initialToolItems.set(event.toolCallId, item);
		} else if (event.type === "suspension") {
			const toolCall = initialToolCalls.get(event.toolCallId);
			const requestType = inferHitlRequestType(event, toolCall, legacyApprovalToolCallIds);
			const request = hitlRequestPayload(event, toolCall, requestType);
			const toolDisplayName = approvalDisplayName(request);
			if (event.toolCallId) {
				const toolItem = initialToolItems.get(event.toolCallId);
				if (toolItem) toolItem.activityStatus = exec.status === "error" || exec.status === "cancelled" || exec.status === "interrupted" ? "interrupted" : "waiting";
				hitlContexts.set(event.toolCallId, {
					requestType,
					toolName: event.toolName || toolCall?.name || "",
					toolCallId: event.toolCallId,
					toolCall,
					toolItem: initialToolItems.get(event.toolCallId),
					toolDisplayName,
					hasExplicitResponse: false
				});
			}
			items.push({
				kind: "suspension",
				executionId: exec.id,
				toolName: event.toolName,
				toolCallId: event.toolCallId,
				timestamp: event.timestamp ?? 0,
				hitlRequestType: requestType,
				hitlRequest: request,
				hitlToolDisplayName: toolDisplayName,
				workflowName: toolCall?.workflowName,
				nodeDisplayName: toolCall?.nodeDisplayName
			});
		} else if (event.type === "hitl-response") {
			const hitlContext = hitlContexts.get(event.toolCallId);
			if (!hitlContext) continue;
			hitlContext.hasExplicitResponse = true;
			if (hitlContext.toolItem) {
				if (hitlResponseStatus(hitlContext.requestType, event.response) === "declined") hitlContext.toolItem.activityStatus = "completed";
				else hitlContext.toolItem.activityStatus = exec.status === "running" ? "running" : "interrupted";
			}
			items.push(hitlResponseItem(hitlContext, exec.id, event.response, event.timestamp ?? 0));
		} else if (event.type === "guardrail") items.push({
			kind: "execution-error",
			executionId: exec.id,
			guardrailCode: event.code,
			timestamp: event.timestamp ?? 0
		});
		flushThinking();
		if (exec.status === "error" || exec.status === "interrupted") {
			const terminalTimestamp = exec.stoppedAt ?? exec.startedAt ?? exec.createdAt;
			items.push({
				kind: "execution-error",
				executionId: exec.id,
				executionStatus: exec.status,
				content: exec.error ?? void 0,
				timestamp: terminalTimestamp ? new Date(terminalTimestamp).getTime() : 0
			});
		}
	}
	/** Count equal identities before task merging and sorting. Content can change during streaming. */
	const occurrences = /* @__PURE__ */ new Map();
	for (const item of items) {
		const key = `${item.executionId}:${item.kind}:${item.toolCallId ?? item.timestamp}`;
		const occurrence = occurrences.get(key) ?? 0;
		occurrences.set(key, occurrence + 1);
		item.id ??= `${key}:${occurrence}`;
	}
	return items;
}
/** Use the same identity for selection, row state, and size measurements. */
function timelineItemKey(item) {
	if (item.backgroundTask) return `background-task-${item.backgroundTask.id}`;
	return item.id ?? `${item.executionId}:${item.kind}:${item.toolCallId ?? item.timestamp}`;
}
//#endregion
//#region src/features/agents/session-timeline.styles.ts
var COLOR_FAMILIES = {
	user: "blue",
	agent: "purple",
	skill: "orange",
	memory: "yellow",
	tool: "green",
	node: "neutral",
	workflow: "pink",
	"execution-error": "red",
	suspension: "purple",
	"hitl-response": "blue",
	"background-task-signal": "mint",
	"background-task": "mint",
	idle: "yellow",
	subagent: "mint",
	approved: "green",
	declined: "neutral",
	error: "red"
};
/** Event swatches use chart colors. Status swatches keep their status colors. */
function timelineColors(kind) {
	const family = COLOR_FAMILIES[kind];
	const isError = kind === "execution-error" || kind === "error";
	return {
		chart: `var(--color--${kind === "user" || kind === "agent" || kind === "subagent" || kind === "approved" || isError ? family : "neutral"}-600)`,
		pill: {
			backgroundColor: `var(--color--${family}-${isError ? "150" : "200"})`,
			color: isError ? "var(--text-color--danger)" : `var(--color--${family}-950)`
		}
	};
}
function chartBlockStyleForItem(item) {
	return { "--session-timeline-chart-block-color": timelineColors(isErroredTimelineItem(item) ? "execution-error" : isSubAgentTimelineItem(item) ? "subagent" : item.kind).chart };
}
//#endregion
//#region src/features/agents/components/SessionEventFilter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var RESET_ID = "__reset__";
var EVENTS_HEADER_ID = "__events__";
var STATUS_HEADER_ID = "__status__";
var SessionEventFilter_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionEventFilter",
	props: {
		available: {},
		selected: {}
	},
	emits: ["update"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const menuItems = computed(() => {
			const eventOptions = props.available.filter((option) => option.presentation === "swatch");
			const statusOptions = props.available.filter((option) => option.presentation === "badge");
			const items = [];
			if (eventOptions.length > 0) {
				items.push({
					id: EVENTS_HEADER_ID,
					label: i18n.baseText("agentSessions.timeline.events"),
					header: true
				});
				items.push(...eventOptions.map(toMenuItem));
			}
			if (statusOptions.length > 0) {
				items.push({
					id: STATUS_HEADER_ID,
					label: i18n.baseText("agentSessions.timeline.status"),
					header: true
				});
				items.push(...statusOptions.map(toMenuItem));
			}
			items.push({
				id: RESET_ID,
				label: i18n.baseText("generic.reset"),
				divided: true,
				disabled: props.selected.size === 0,
				testId: "filter-clear"
			});
			return items;
		});
		function toMenuItem(option) {
			return {
				id: option.key,
				label: option.label,
				checked: props.selected.has(option.key),
				keepOpen: true,
				testId: `filter-option-${option.key}`,
				data: { option }
			};
		}
		function optionColor(option) {
			if (option.presentation === "swatch") return option.color;
			return timelineColors(option.key === "approved" || option.key === "error" ? option.key : "declined").chart;
		}
		function handleSelect(key) {
			if (key === RESET_ID) {
				emit("update", /* @__PURE__ */ new Set());
				return;
			}
			const next = new Set(props.selected);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			emit("update", next);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				items: menuItems.value,
				placement: "bottom-end",
				onSelect: handleSelect
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nTooltip_default), {
					"as-child": "",
					content: unref(i18n).baseText("agentSessions.timeline.events"),
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						icon: "funnel",
						size: "large",
						"icon-only": "",
						"aria-label": unref(i18n).baseText("agentSessions.timeline.events"),
						class: normalizeClass(_ctx.$style.trigger),
						"data-test-id": "filter-trigger"
					}, {
						default: withCtx(() => [props.selected.size > 0 ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.activeIndicator),
							"aria-hidden": "true"
						}, null, 2)) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["aria-label", "class"])]),
					_: 1
				}, 8, ["content"])]),
				"item-leading": withCtx(({ item, ui }) => [item.data?.option ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass([_ctx.$style.swatch, ui.class]),
					style: normalizeStyle({ backgroundColor: optionColor(item.data.option) })
				}, null, 6)) : createCommentVNode("", true)]),
				"item-label": withCtx(({ item, ui }) => [createBaseVNode("span", { class: normalizeClass(ui.class) }, [createTextVNode(toDisplayString(item.label) + " ", 1), item.data?.option ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.count)
				}, toDisplayString(item.data.option.count), 3)) : createCommentVNode("", true)], 2)]),
				_: 1
			}, 8, ["items"]);
		};
	}
}), [["__cssModules", { "$style": {
	trigger: "_trigger_ek02j_1",
	activeIndicator: "_activeIndicator_ek02j_6",
	swatch: "_swatch_ek02j_18",
	count: "_count_ek02j_24"
} }]]);
//#endregion
//#region src/features/agents/utils/timeline-time.ts
function formatTimelineTime(timestamp) {
	if (!timestamp) return "";
	return convertToDisplayDate(new Date(timestamp).toISOString()).time;
}
//#endregion
//#region src/features/agents/components/timeline-items/SessionBackgroundTaskItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$3 = ["aria-label"];
var SessionBackgroundTaskItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionBackgroundTaskItem",
	props: {
		item: {},
		respondToApproval: { type: Function },
		approvalPending: { type: Boolean },
		selected: { type: Boolean },
		searchQuery: {},
		projectId: {},
		agentId: {},
		agentName: {},
		personalisation: {},
		tools: {},
		threadId: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const task = computed(() => props.item.backgroundTask);
		const presentation = computed(() => task.value && backgroundTaskPresentation[task.value.status]);
		const statusLabel = computed(() => presentation.value && i18n.baseText(presentation.value.labelKey));
		const label = computed(() => {
			if (!task.value) return "";
			if (task.value.status === "running") return task.value.title;
			return i18n.baseText("agentSessions.timeline.backgroundTaskStatus", { interpolate: {
				title: task.value.title,
				status: statusLabel.value ?? ""
			} });
		});
		const time = computed(() => formatTimelineTime(props.item.timestamp));
		const approvalInput = computed(() => {
			if (task.value?.status !== "suspended" || !task.value.approval || !props.respondToApproval) return;
			return parseApprovalInput(task.value.approval.suspendPayload);
		});
		function submitApproval(resumeData) {
			const approval = task.value?.approval;
			if (!approval || !approvalInput.value || props.approvalPending) return;
			props.respondToApproval?.({
				runId: approval.runId,
				toolCallId: approval.toolCallId,
				resumeData
			});
		}
		return (_ctx, _cache) => {
			return task.value && presentation.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				"data-test-id": "session-background-task-item",
				class: normalizeClass([
					_ctx.$style.row,
					task.value.status === "failed" && _ctx.$style.failed,
					task.value.status === "cancelled" && _ctx.$style.cancelled
				])
			}, [approvalInput.value && task.value.approval ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.approvalTimelineItem),
				onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"])),
				onKeydown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
			}, [
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.approvalRail),
					"aria-hidden": "true"
				}, null, 2),
				(openBlock(), createBlock(ToolApprovalCard_default, {
					key: `${task.value.approval.runId}:${task.value.approval.toolCallId}`,
					input: approvalInput.value,
					"agent-name": __props.agentName,
					tools: __props.tools,
					disabled: __props.approvalPending,
					"auto-focus": false,
					"use-key-shortcuts": false,
					onSubmit: submitApproval
				}, null, 8, [
					"input",
					"agent-name",
					"tools",
					"disabled"
				])),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.approvalRail),
					"aria-hidden": "true"
				}, null, 2)
			], 34)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.header)
			}, [createVNode(TransitionGroup, {
				tag: "div",
				class: normalizeClass(_ctx.$style.stateTransition),
				"enter-active-class": _ctx.$style.stateEnterActive,
				"leave-active-class": _ctx.$style.stateLeaveActive,
				"enter-from-class": _ctx.$style.stateEnterFrom,
				"leave-to-class": _ctx.$style.stateLeaveTo
			}, {
				default: withCtx(() => [(openBlock(), createElementBlock("div", {
					key: `${task.value.id}:${task.value.status}`,
					class: normalizeClass(_ctx.$style.stateContent)
				}, [createVNode(unref(AiActivityStepButton_default), {
					class: normalizeClass(_ctx.$style.activityButton),
					size: "small",
					loading: task.value.status === "running",
					interactive: false,
					"full-width": "",
					tabindex: -1
				}, {
					prefix: withCtx(() => [createBaseVNode("span", {
						role: "img",
						"aria-label": statusLabel.value,
						class: normalizeClass(_ctx.$style.icon)
					}, [task.value.status === "running" ? (openBlock(), createBlock(unref(N8nSpinner_default), {
						key: 0,
						type: "grid",
						size: "medium"
					})) : presentation.value.icon ? (openBlock(), createBlock(unref(N8nIcon_default), {
						key: 1,
						icon: presentation.value.icon,
						size: "medium",
						class: normalizeClass(task.value.status === "cancelled" && _ctx.$style.cancelledIcon)
					}, null, 8, ["icon", "class"])) : createCommentVNode("", true)], 10, _hoisted_1$3)]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(label.value), 1)]),
					_: 1
				}, 8, ["class", "loading"])], 2))]),
				_: 1
			}, 8, [
				"class",
				"enter-active-class",
				"leave-active-class",
				"enter-from-class",
				"leave-to-class"
			]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nText_default), {
				step: "xs",
				color: "text-light",
				bold: "",
				class: normalizeClass(_ctx.$style.time)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(time.value), 1)]),
				_: 1
			}, 8, ["class"])], 2)], 2)), task.value.files?.length && __props.projectId && __props.agentId ? (openBlock(), createBlock(AgentChatMessageAttachments_default, {
				key: 2,
				class: normalizeClass(_ctx.$style.files),
				attachments: task.value.files,
				"project-id": __props.projectId,
				"agent-id": __props.agentId,
				"thread-id": __props.threadId,
				"data-test-id": "session-background-task-files"
			}, null, 8, [
				"class",
				"attachments",
				"project-id",
				"agent-id",
				"thread-id"
			])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_1rnhq_450",
	activityButton: "_activityButton_1rnhq_450",
	header: "_header_1rnhq_463",
	stateTransition: "_stateTransition_1rnhq_472",
	stateContent: "_stateContent_1rnhq_478",
	stateEnterActive: "_stateEnterActive_1rnhq_484",
	stateLeaveActive: "_stateLeaveActive_1rnhq_485",
	stateEnterFrom: "_stateEnterFrom_1rnhq_496",
	stateLeaveTo: "_stateLeaveTo_1rnhq_497",
	files: "_files_1rnhq_509",
	failed: "_failed_1rnhq_513",
	cancelled: "_cancelled_1rnhq_517",
	cancelledIcon: "_cancelledIcon_1rnhq_521",
	icon: "_icon_1rnhq_525",
	actions: "_actions_1rnhq_534",
	time: "_time_1rnhq_541",
	approvalTimelineItem: "_approvalTimelineItem_1rnhq_547",
	approvalRail: "_approvalRail_1rnhq_552",
	shimmer: "_shimmer_1rnhq_1",
	spin: "_spin_1rnhq_1",
	"skeleton-pulse": "_skeleton-pulse_1rnhq_1",
	opacityPulse: "_opacityPulse_1rnhq_1",
	popoverIn: "_popoverIn_1rnhq_1",
	fadeIn: "_fadeIn_1rnhq_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1rnhq_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1rnhq_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1rnhq_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1rnhq_1",
	blurSwapIn: "_blurSwapIn_1rnhq_1",
	blurSwapOut: "_blurSwapOut_1rnhq_1",
	pulse: "_pulse_1rnhq_1",
	pulseGlow: "_pulseGlow_1rnhq_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1rnhq_1",
	fade: "_fade_1rnhq_1",
	fadeInUp: "_fadeInUp_1rnhq_1",
	fadeInDown: "_fadeInDown_1rnhq_1",
	fadeInLeft: "_fadeInLeft_1rnhq_1",
	fadeInRight: "_fadeInRight_1rnhq_1",
	fadeOut: "_fadeOut_1rnhq_1",
	fadeOutDown: "_fadeOutDown_1rnhq_1",
	fadeOutUp: "_fadeOutUp_1rnhq_1",
	fadeOutLeft: "_fadeOutLeft_1rnhq_1",
	fadeOutRight: "_fadeOutRight_1rnhq_1",
	ping: "_ping_1rnhq_1",
	blinkBackground: "_blinkBackground_1rnhq_1",
	typingBlink: "_typingBlink_1rnhq_1"
} }]]);
//#endregion
//#region src/features/agents/composables/useTimelineItemExpansion.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function useTimelineItemExpansion(options) {
	const isOpen = ref(false);
	watch([() => toValue(options.searchQuery), () => toValue(options.canExpand)], function onSearchQueryChange([query, expandable]) {
		const normalized = query?.trim().toLowerCase();
		if (!expandable || !normalized) {
			isOpen.value = false;
			return;
		}
		/** Keep manual expansion when a non-empty search does not match. */
		if (toValue(options.searchableText).toLowerCase().includes(normalized)) isOpen.value = true;
	}, { immediate: true });
	return { isOpen };
}
//#endregion
//#region src/features/agents/components/SessionTimelinePill.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var SessionTimelinePill_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionTimelinePill",
	props: {
		kind: {},
		toolName: {},
		label: { default: "" },
		showLabel: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const icon = computed(() => {
			switch (props.kind) {
				case "background-task": return "list-checks";
				case "background-task-signal": return "list-checks";
				case "user": return "user";
				case "agent":
				case "subagent": return "bot";
				case "skill": return "book-open";
				case "memory": return "brain";
				case "tool": return props.toolName === "do_not_respond" ? "message-circle-off" : "wrench";
				case "workflow": return "workflow";
				case "node": return "box";
				case "execution-error": return "circle-x";
				case "suspension":
				case "idle": return "clock";
				case "hitl-response": return "message-square";
				default: return "info";
			}
		});
		return (_ctx, _cache) => {
			return __props.showLabel && __props.label ? (openBlock(), createBlock(unref(N8nBadge_default), {
				key: 0,
				"leading-icon": icon.value,
				variant: "filled",
				size: "xxsmall"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.label), 1)]),
				_: 1
			}, 8, ["leading-icon"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
				key: 1,
				"aria-label": __props.label,
				"aria-hidden": icon.value !== "message-circle-off",
				icon: icon.value,
				size: "medium"
			}, null, 8, [
				"aria-label",
				"aria-hidden",
				"icon"
			]));
		};
	}
}), [["__cssModules", { "$style": { withLabel: "_withLabel_1vkqn_1" } }]]);
//#endregion
//#region src/features/agents/components/timeline-items/SessionBackgroundJobItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SessionBackgroundJobItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionBackgroundJobItem",
	props: {
		item: {},
		selected: { type: Boolean },
		searchQuery: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const tasks = computed(function getTasks() {
			return props.item.backgroundJobSignal?.tasks ?? [];
		});
		const label = computed(function getLabel() {
			return backgroundJobSignalSummary(props.item, i18n) || i18n.baseText("agents.chat.backgroundTasks.resultsReceived");
		});
		const canExpand = computed(function getCanExpand() {
			return tasks.value.length > 0;
		});
		const time = computed(() => formatTimelineTime(props.item.timestamp));
		const { isOpen } = useTimelineItemExpansion({
			searchQuery: () => props.searchQuery,
			canExpand,
			searchableText: label
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				"data-test-id": "session-background-job-item",
				class: normalizeClass(_ctx.$style.step)
			}, [createVNode(unref(CollapsibleRoot_default), {
				open: canExpand.value && unref(isOpen),
				disabled: !canExpand.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isOpen.value = canExpand.value && $event)
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(CollapsibleTrigger_default), { "as-child": "" }, {
					default: withCtx(() => [createVNode(unref(AiActivityStepButton_default), {
						class: normalizeClass(_ctx.$style.activityButton),
						size: "small",
						interactive: canExpand.value,
						tabindex: canExpand.value ? void 0 : -1,
						"aria-disabled": !canExpand.value || void 0
					}, createSlots({
						prefix: withCtx(() => [createVNode(unref(N8nTooltip_default), {
							content: unref(i18n).baseText("agents.chat.backgroundTasks.resultsReceived"),
							placement: "top"
						}, {
							default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.iconContainer) }, [createVNode(SessionTimelinePill_default, {
								kind: __props.item.kind,
								label: label.value
							}, null, 8, ["kind", "label"])], 2)]),
							_: 1
						}, 8, ["content"])]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(label.value) + " ", 1)]),
						_: 2
					}, [canExpand.value ? {
						name: "suffix",
						fn: withCtx(() => [createVNode(unref(AiActivityStepChevron_default), { open: unref(isOpen) }, null, 8, ["open"])]),
						key: "0"
					} : void 0]), 1032, [
						"class",
						"interactive",
						"tabindex",
						"aria-disabled"
					])]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					step: "xs",
					color: "text-light",
					bold: "",
					class: normalizeClass(_ctx.$style.time)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(time.value), 1)]),
					_: 1
				}, 8, ["class"])], 2), canExpand.value ? (openBlock(), createBlock(unref(AnimatedCollapsibleContent_default), { key: 0 }, {
					default: withCtx(() => [createVNode(unref(AiActivityStepResultSection_default), { class: normalizeClass(_ctx.$style.section) }, {
						default: withCtx(() => [createBaseVNode("ul", {
							"data-test-id": "background-job-signal-details",
							class: normalizeClass(_ctx.$style.tasks)
						}, [(openBlock(true), createElementBlock(Fragment, null, renderList(tasks.value, (job) => {
							return openBlock(), createElementBlock("li", { key: job.id }, toDisplayString(unref(backgroundJobResultLabel)(job, unref(i18n))), 1);
						}), 128))], 2)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["open", "disabled"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	step: "_step_1wtbl_1",
	activityButton: "_activityButton_1wtbl_1",
	header: "_header_1wtbl_12",
	iconContainer: "_iconContainer_1wtbl_28",
	time: "_time_1wtbl_38",
	section: "_section_1wtbl_43",
	tasks: "_tasks_1wtbl_54"
} }]]);
//#endregion
//#region src/features/agents/components/timeline-items/SessionCapabilityItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = ["data-status"];
var SessionCapabilityItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionCapabilityItem",
	props: {
		item: {},
		selected: { type: Boolean },
		searchQuery: {},
		projectId: {},
		agentId: {},
		threadId: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const nodeTypesStore = useNodeTypesStore();
		const router = useRouter();
		const fullExecutionHref = computed(() => {
			const item = props.item;
			if (item.kind !== "workflow" || !item.workflowId || !item.workflowExecutionId) return "";
			return router.resolve({
				name: VIEWS.EXECUTION_PREVIEW,
				params: {
					workflowId: item.workflowId,
					executionId: item.workflowExecutionId
				}
			}).href;
		});
		const nodeType = computed(() => {
			if (props.item.kind !== "node" || !props.item.nodeType) return null;
			return nodeTypesStore.getNodeType(props.item.nodeType, props.item.nodeTypeVersion) ?? null;
		});
		const label = computed(() => {
			if (props.item.kind === "skill") return props.item.skillName ?? resolveToolNameForDisplay(props.item.toolName, i18n, props.item.toolOutput);
			if (props.item.kind === "workflow") return props.item.workflowName ?? formatToolNameForDisplay(props.item.toolName);
			if (props.item.kind === "node") return props.item.nodeDisplayName ?? formatToolNameForDisplay(props.item.toolName);
			return resolveToolNameForDisplay(props.item.toolName, i18n, props.item.toolOutput);
		});
		const isRunning = computed(() => props.item.activityStatus === "running");
		const isInterrupted = computed(() => props.item.activityStatus === "interrupted");
		const canExpand = computed(() => !isRunning.value && !isInterrupted.value);
		const error = computed(() => {
			if (props.item.activityStatus === "waiting" || isRunning.value || isInterrupted.value) return;
			if (props.item.activityStatus !== "failed" && !isErroredToolCallTimelineItem(props.item)) return;
			return timelineItemErrorMessage(props.item) || i18n.baseText("agentSessions.timeline.toolError");
		});
		const errorTooltip = computed(() => error.value ? truncate(error.value, 160) : "");
		const time = computed(() => formatTimelineTime(props.item.timestamp));
		function stringifyJson(value) {
			if (typeof value === "string") try {
				return JSON.stringify(JSON.parse(value), null, 2);
			} catch {
				return value;
			}
			return JSON.stringify(value, null, 2) ?? String(value);
		}
		const outputFiles = computed(() => {
			const output = props.item.toolOutput;
			return getToolOutputAttachments(typeof output === "string" ? jsonParse(output, { fallbackValue: output }) : output);
		});
		const { isOpen } = useTimelineItemExpansion({
			searchQuery: () => props.searchQuery,
			canExpand,
			searchableText: computed(() => {
				return [
					label.value,
					props.item.toolInput !== void 0 ? stringifyJson(props.item.toolInput) : "",
					props.item.toolOutput !== void 0 ? stringifyJson(props.item.toolOutput) : ""
				].join("\n");
			})
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				"data-test-id": "session-capability-item",
				"data-status": __props.item.activityStatus,
				class: normalizeClass([_ctx.$style.step, {
					[_ctx.$style.failed]: error.value,
					[_ctx.$style.interrupted]: isInterrupted.value
				}])
			}, [createVNode(unref(CollapsibleRoot_default), {
				open: canExpand.value && unref(isOpen),
				disabled: !canExpand.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isOpen.value = canExpand.value && $event)
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(CollapsibleTrigger_default), { "as-child": "" }, {
					default: withCtx(() => [createVNode(unref(AiActivityStepButton_default), {
						class: normalizeClass(_ctx.$style.activityButton),
						size: "small",
						loading: isRunning.value,
						interactive: canExpand.value,
						tabindex: canExpand.value ? void 0 : -1,
						"aria-disabled": !canExpand.value || void 0
					}, createSlots({
						prefix: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.iconContainer) }, [_cache[1] || (_cache[1] = createBaseVNode("span", { role: "status" }, null, -1)), isRunning.value ? (openBlock(), createBlock(unref(N8nSpinner_default), {
							key: 0,
							type: "grid",
							size: "medium"
						})) : isInterrupted.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 1,
							icon: "circle-x",
							size: "medium",
							class: normalizeClass(_ctx.$style.interruptedIcon)
						}, null, 8, ["class"])) : error.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 2,
							placement: "top"
						}, {
							content: withCtx(() => [createTextVNode(toDisplayString(errorTooltip.value), 1)]),
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "circle-alert",
								color: "danger",
								size: "medium"
							})]),
							_: 1
						})) : nodeType.value ? (openBlock(), createBlock(NodeIcon_default, {
							key: 3,
							"node-type": nodeType.value,
							size: 20
						}, null, 8, ["node-type"])) : (openBlock(), createBlock(SessionTimelinePill_default, {
							key: 4,
							kind: __props.item.kind,
							"tool-name": __props.item.toolName,
							label: label.value
						}, null, 8, [
							"kind",
							"tool-name",
							"label"
						]))], 2)]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(label.value) + " ", 1)]),
						_: 2
					}, [canExpand.value ? {
						name: "suffix",
						fn: withCtx(() => [createVNode(unref(AiActivityStepChevron_default), { open: unref(isOpen) }, null, 8, ["open"])]),
						key: "0"
					} : void 0]), 1032, [
						"class",
						"loading",
						"interactive",
						"tabindex",
						"aria-disabled"
					])]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					step: "xs",
					color: "text-light",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(time.value), 1)]),
					_: 1
				})], 2), canExpand.value ? (openBlock(), createBlock(unref(AnimatedCollapsibleContent_default), { key: 0 }, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
						__props.item.toolInput !== void 0 ? (openBlock(), createBlock(unref(AiActivityStepResultSection_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.toolSection)
						}, {
							default: withCtx(() => [createVNode(unref(N8nText_default), {
								step: "xs",
								color: "text-light",
								bold: "",
								class: normalizeClass(_ctx.$style.toolTitle)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentSessions.timeline.input")), 1)]),
								_: 1
							}, 8, ["class"]), createVNode(unref(CodeBlock_default), {
								"data-test-id": "timeline-tool-input",
								code: stringifyJson(__props.item.toolInput),
								language: "json",
								class: normalizeClass(_ctx.$style.toolCode)
							}, null, 8, ["code", "class"])]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						error.value ? (openBlock(), createBlock(unref(AiActivityStepResultSection_default), {
							key: 1,
							class: normalizeClass(_ctx.$style.toolSection)
						}, {
							default: withCtx(() => [createVNode(unref(N8nCallout_default), {
								theme: "danger",
								class: normalizeClass(_ctx.$style.errorCallout)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(error.value), 1)]),
								_: 1
							}, 8, ["class"])]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						__props.item.toolOutput !== void 0 && !error.value ? (openBlock(), createBlock(unref(AiActivityStepResultSection_default), {
							key: 2,
							class: normalizeClass(_ctx.$style.toolSection)
						}, {
							default: withCtx(() => [createVNode(unref(N8nText_default), {
								step: "xs",
								color: "text-light",
								bold: "",
								class: normalizeClass(_ctx.$style.toolTitle)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentSessions.timeline.output")), 1)]),
								_: 1
							}, 8, ["class"]), createVNode(unref(CodeBlock_default), {
								"data-test-id": "timeline-tool-output",
								code: stringifyJson(__props.item.toolOutput),
								language: "json",
								class: normalizeClass(_ctx.$style.toolCode)
							}, null, 8, ["code", "class"])]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						fullExecutionHref.value ? (openBlock(), createBlock(unref(AiActivityStepResultSection_default), {
							key: 3,
							class: normalizeClass(_ctx.$style.toolSection)
						}, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.executionButton) }, [createVNode(unref(N8nButton_default), {
								variant: "outline",
								size: "small",
								label: unref(i18n).baseText("agentSessions.workflowLog.openFull"),
								href: fullExecutionHref.value,
								target: "_blank",
								rel: "noopener noreferrer",
								"data-test-id": "open-full-execution"
							}, null, 8, ["label", "href"])], 2)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)
					], 2)]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["open", "disabled"]), outputFiles.value.length > 0 && __props.projectId && __props.agentId ? (openBlock(), createBlock(AgentChatMessageAttachments_default, {
				key: 0,
				class: normalizeClass(_ctx.$style.outputFiles),
				attachments: outputFiles.value,
				"project-id": __props.projectId,
				"agent-id": __props.agentId,
				"thread-id": __props.threadId,
				"data-test-id": "timeline-tool-output-files"
			}, null, 8, [
				"class",
				"attachments",
				"project-id",
				"agent-id",
				"thread-id"
			])) : createCommentVNode("", true)], 10, _hoisted_1$2);
		};
	}
}), [["__cssModules", { "$style": {
	step: "_step_5p2l0_1",
	activityButton: "_activityButton_5p2l0_1",
	failed: "_failed_5p2l0_12",
	interrupted: "_interrupted_5p2l0_16",
	interruptedIcon: "_interruptedIcon_5p2l0_23",
	iconContainer: "_iconContainer_5p2l0_27",
	header: "_header_5p2l0_37",
	outputFiles: "_outputFiles_5p2l0_50",
	content: "_content_5p2l0_54",
	toolTitle: "_toolTitle_5p2l0_59",
	toolSection: "_toolSection_5p2l0_63",
	executionButton: "_executionButton_5p2l0_77",
	toolCode: "_toolCode_5p2l0_81",
	errorCallout: "_errorCallout_5p2l0_85"
} }]]);
//#endregion
//#region src/features/agents/components/timeline-items/SessionExecutionErrorItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SessionExecutionErrorItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionExecutionErrorItem",
	props: {
		item: {},
		selected: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const time = computed(() => formatTimelineTime(props.item.timestamp));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.row) }, [
				createBaseVNode("span", { class: normalizeClass(_ctx.$style.iconContainer) }, [createVNode(unref(N8nIcon_default), {
					icon: "circle-alert",
					color: "danger",
					size: "medium"
				})], 2),
				createVNode(unref(N8nText_default), {
					step: "xs",
					bold: "",
					color: "danger"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(executionErrorLabel)(__props.item, unref(i18n))) + ": " + toDisplayString(unref(executionErrorMessage)(__props.item, unref(i18n))), 1)]),
					_: 1
				}),
				createVNode(unref(N8nText_default), {
					step: "xs",
					color: "text-light",
					bold: "",
					class: normalizeClass(_ctx.$style.timestamp)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(time.value), 1)]),
					_: 1
				}, 8, ["class"])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_p6mth_1",
	iconContainer: "_iconContainer_p6mth_11",
	timestamp: "_timestamp_p6mth_21"
} }]]);
//#endregion
//#region src/features/agents/components/timeline-items/SessionHitlItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SessionHitlItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionHitlItem",
	props: {
		item: {},
		selected: { type: Boolean },
		searchQuery: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const label = computed(function getLabel() {
			return hitlTimelineName(props.item, i18n);
		});
		const status = computed(function getStatus() {
			return timelineItemStatus(props.item) ?? {
				labelKey: hitlRequestLabelKey(props.item.hitlRequestType),
				theme: "outline"
			};
		});
		const time = computed(() => formatTimelineTime(props.item.timestamp));
		function parseContent(value) {
			if (typeof value !== "string") return value;
			try {
				return JSON.parse(value);
			} catch {
				return value;
			}
		}
		const content = computed(function getContent() {
			if (props.item.kind === "hitl-response") return parseContent(props.item.hitlResponse);
			const request = parseContent(props.item.hitlRequest);
			if (props.item.hitlRequestType === "approval" && request !== null && typeof request === "object" && "args" in request) return request.args;
			return request;
		});
		const contentCode = computed(function getContentCode() {
			return typeof content.value === "string" ? content.value : JSON.stringify(content.value, null, 2) ?? String(content.value);
		});
		const canExpand = computed(function getCanExpand() {
			return content.value !== void 0;
		});
		const { isOpen } = useTimelineItemExpansion({
			searchQuery: () => props.searchQuery,
			canExpand,
			searchableText: () => `${label.value}\n${contentCode.value}`
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				"data-test-id": "session-hitl-item",
				class: normalizeClass(_ctx.$style.step)
			}, [createVNode(unref(CollapsibleRoot_default), {
				open: canExpand.value && unref(isOpen),
				disabled: !canExpand.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isOpen.value = canExpand.value && $event)
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(CollapsibleTrigger_default), { "as-child": "" }, {
					default: withCtx(() => [createVNode(unref(AiActivityStepButton_default), {
						class: normalizeClass(_ctx.$style.activityButton),
						size: "small",
						interactive: canExpand.value,
						tabindex: canExpand.value ? void 0 : -1,
						"aria-disabled": !canExpand.value || void 0
					}, createSlots({
						prefix: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.iconContainer) }, [createVNode(SessionTimelinePill_default, {
							kind: __props.item.kind,
							label: label.value
						}, null, 8, ["kind", "label"])], 2)]),
						default: withCtx(() => [createTextVNode(" " + toDisplayString(label.value) + " ", 1)]),
						_: 2
					}, [canExpand.value ? {
						name: "suffix",
						fn: withCtx(() => [createVNode(unref(AiActivityStepChevron_default), { open: unref(isOpen) }, null, 8, ["open"])]),
						key: "0"
					} : void 0]), 1032, [
						"class",
						"interactive",
						"tabindex",
						"aria-disabled"
					])]),
					_: 1
				}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.meta) }, [createVNode(unref(N8nBadge_default), {
					variant: status.value.theme,
					size: "xxsmall",
					"data-test-id": __props.item.kind === "hitl-response" ? "timeline-hitl-response-badge" : "timeline-hitl-request-badge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(status.value.labelKey)), 1)]),
					_: 1
				}, 8, ["variant", "data-test-id"]), createVNode(unref(N8nText_default), {
					step: "xs",
					color: "text-light",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(time.value), 1)]),
					_: 1
				})], 2)], 2), canExpand.value ? (openBlock(), createBlock(unref(AnimatedCollapsibleContent_default), { key: 0 }, {
					default: withCtx(() => [createVNode(unref(AiActivityStepResultSection_default), { class: normalizeClass(_ctx.$style.section) }, {
						default: withCtx(() => [createVNode(unref(N8nText_default), {
							step: "xs",
							color: "text-light",
							bold: "",
							class: normalizeClass(_ctx.$style.title)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(__props.item.kind === "hitl-response" ? "agentSessions.timeline.response" : "agentSessions.timeline.requestDetails")), 1)]),
							_: 1
						}, 8, ["class"]), createVNode(unref(CodeBlock_default), {
							code: contentCode.value,
							language: "json",
							class: normalizeClass(_ctx.$style.code)
						}, null, 8, ["code", "class"])]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				})) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["open", "disabled"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	step: "_step_1cfz3_1",
	activityButton: "_activityButton_1cfz3_1",
	header: "_header_1cfz3_12",
	iconContainer: "_iconContainer_1cfz3_29",
	meta: "_meta_1cfz3_39",
	section: "_section_1cfz3_49",
	title: "_title_1cfz3_64",
	code: "_code_1cfz3_68"
} }]]);
//#endregion
//#region src/features/agents/utils/sessionMemoryCards.ts
var RECALL_MODEL_PREFIX = "Prior/historical entry: ";
function stringField(value, key) {
	if (!isRecord(value)) return void 0;
	const field = value[key];
	return typeof field === "string" ? field : void 0;
}
function recallOrigin(recalled, threadId) {
	const origin = recalled.origin;
	if (!origin) return void 0;
	if (origin.threadId === threadId) return {
		kind: "this-session",
		createdAt: origin.createdAt
	};
	return {
		kind: "previous-session",
		createdAt: origin.createdAt,
		...origin.canOpen && { threadId: origin.threadId }
	};
}
function recalledCard(recalled, threadId) {
	return {
		key: recalled.entryId,
		content: recalled.content,
		evidence: recalled.origin?.evidence,
		origin: recallOrigin(recalled, threadId),
		status: recalled.status,
		...recalled.status === "active" && { deleteTarget: {
			type: "entry",
			id: recalled.entryId
		} }
	};
}
function flaggedCard(flagged) {
	const deletable = flagged.status === "pending" || flagged.status === "stored";
	return {
		key: flagged.captureId,
		content: flagged.content,
		evidence: flagged.evidence,
		origin: { kind: "this-run" },
		status: flagged.status,
		...deletable && { deleteTarget: {
			type: "capture",
			id: flagged.captureId
		} }
	};
}
/** Traces recorded before memory ids were traced keep only the model-facing text. */
function legacyRecallCards(output) {
	if (!isRecord(output) || !Array.isArray(output.entries)) return [];
	return output.entries.flatMap((entry, index) => {
		const content = stringField(entry, "content");
		if (!content) return [];
		return [{
			key: `legacy-${index}`,
			content: content.replace(RECALL_MODEL_PREFIX, "")
		}];
	});
}
function legacyFlagCards(input) {
	const content = stringField(input, "content");
	if (!content) return [];
	return [{
		key: "legacy",
		content,
		evidence: stringField(input, "evidence"),
		origin: { kind: "this-run" }
	}];
}
/** The memory cards of one recall_memory or flag_memory row of a session trace. */
function sessionMemoryCards(item, memory, threadId) {
	const toolCallId = item.toolCallId ?? "";
	if (item.memoryAction === "flag") {
		const flagged = memory?.flags[toolCallId];
		return flagged ? [flaggedCard(flagged)] : legacyFlagCards(item.toolInput);
	}
	const recalled = memory?.recalls[toolCallId];
	if (!recalled) return legacyRecallCards(item.toolOutput);
	return recalled.map((entry) => recalledCard(entry, threadId));
}
//#endregion
//#region src/features/agents/components/SessionMemoryDetail.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SessionMemoryDetail_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionMemoryDetail",
	props: {
		item: {},
		memory: {},
		projectId: {},
		agentId: {},
		threadId: {}
	},
	emits: ["deleted"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const rootStore = useRootStore();
		const { showError, showMessage } = useToast();
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const { canUpdate } = useAgentPermissions(() => props.projectId);
		const BADGE_STATUSES = /* @__PURE__ */ new Set([
			"pending",
			"replaced",
			"failed",
			"deleted"
		]);
		const deletingKey = ref(null);
		const cards = computed(() => sessionMemoryCards(props.item, props.memory, props.threadId));
		function originText(origin) {
			if (origin.kind === "this-run") return i18n.baseText("agentSessions.timeline.memory.origin.thisRun");
			const key = origin.kind === "this-session" ? "agentSessions.timeline.memory.origin.thisSession" : "agentSessions.timeline.memory.origin.previousSession";
			return i18n.baseText(key, { interpolate: { date: toDayMonth(origin.createdAt) } });
		}
		function originHref(origin) {
			if (origin.kind !== "previous-session" || !origin.threadId) return void 0;
			return router.resolve({
				name: AGENT_SESSION_DETAIL_VIEW,
				params: {
					projectId: props.projectId,
					agentId: props.agentId,
					threadId: origin.threadId
				}
			}).href;
		}
		function statusText(status) {
			return i18n.baseText(`agentSessions.timeline.memory.status.${status}`);
		}
		async function confirmDelete(target) {
			const prefix = target.type === "entry" ? "agents.builder.memory.entries.deleteModal" : "agentSessions.timeline.memory.deleteFlagModal";
			return await openAgentConfirmationModal({
				title: i18n.baseText(`${prefix}.title`),
				description: i18n.baseText(`${prefix}.description`),
				confirmButtonText: i18n.baseText("agents.builder.memory.entries.deleteModal.button.delete"),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) === MODAL_CONFIRM;
		}
		async function onDelete(card) {
			const target = card.deleteTarget;
			if (!target || deletingKey.value !== null) return;
			if (!await confirmDelete(target)) return;
			const remove = target.type === "entry" ? deleteAgentMemoryEntry : deleteAgentMemoryCapture;
			deletingKey.value = card.key;
			try {
				await remove(rootStore.restApiContext, props.projectId, props.agentId, target.id);
				showMessage({
					title: i18n.baseText("agents.builder.memory.entries.deleted"),
					type: "success"
				});
				emit("deleted");
			} catch (error) {
				showError(error, i18n.baseText("agents.builder.memory.entries.deleteError"));
			} finally {
				deletingKey.value = null;
			}
		}
		return (_ctx, _cache) => {
			return cards.value.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				size: "small",
				color: "text-light",
				"data-test-id": "session-memory-empty"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agentSessions.timeline.memory.empty")), 1)]),
				_: 1
			})) : (openBlock(), createElementBlock("ul", {
				key: 1,
				class: normalizeClass(_ctx.$style.list)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(cards.value, (card) => {
				return openBlock(), createElementBlock("li", {
					key: card.key,
					class: normalizeClass([_ctx.$style.card, { [_ctx.$style.deleted]: card.status === "deleted" }]),
					"data-test-id": "session-memory-card"
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.copy) }, [
					createVNode(unref(N8nText_default), { class: normalizeClass(_ctx.$style.content) }, {
						default: withCtx(() => [createTextVNode(toDisplayString(card.content), 1)]),
						_: 2
					}, 1032, ["class"]),
					card.evidence || card.origin ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-light",
						class: normalizeClass(_ctx.$style.evidence)
					}, {
						default: withCtx(() => [card.evidence ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode("“" + toDisplayString(card.evidence) + "”", 1)], 64)) : createCommentVNode("", true), card.origin ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [_cache[0] || (_cache[0] = createTextVNode(" — ", -1)), originHref(card.origin) ? (openBlock(), createBlock(unref(N8nLink_default), {
							key: 0,
							to: originHref(card.origin),
							"new-window": "",
							rel: "noopener",
							size: "small",
							"data-test-id": "session-memory-origin-link"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(originText(card.origin)), 1)]),
							_: 2
						}, 1032, ["to"])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(originText(card.origin)), 1)], 64))], 64)) : createCommentVNode("", true)]),
						_: 2
					}, 1032, ["class"])) : createCommentVNode("", true),
					card.status && unref(BADGE_STATUSES).has(card.status) ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 1,
						variant: "outline",
						size: "xsmall",
						"data-test-id": "session-memory-status"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(statusText(card.status)), 1)]),
						_: 2
					}, 1024)) : createCommentVNode("", true)
				], 2), unref(canUpdate) && card.deleteTarget ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					icon: "trash-2",
					variant: "ghost",
					size: "small",
					disabled: deletingKey.value !== null,
					"aria-label": unref(i18n).baseText("agents.builder.memory.entries.delete"),
					"data-test-id": "session-memory-delete",
					onClick: ($event) => onDelete(card)
				}, null, 8, [
					"disabled",
					"aria-label",
					"onClick"
				])) : createCommentVNode("", true)], 2);
			}), 128))], 2));
		};
	}
}), [["__cssModules", { "$style": {
	list: "_list_9cxck_1",
	card: "_card_9cxck_10",
	deleted: "_deleted_9cxck_20",
	copy: "_copy_9cxck_24",
	content: "_content_9cxck_33",
	evidence: "_evidence_9cxck_37"
} }]]);
//#endregion
//#region src/features/agents/components/timeline-items/SessionMemoryItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var SessionMemoryItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionMemoryItem",
	props: {
		item: {},
		selected: { type: Boolean },
		searchQuery: {},
		memory: {},
		projectId: {},
		agentId: {},
		threadId: {},
		onDeleted: { type: Function }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const label = computed(() => memoryTimelineName(props.item, i18n));
		const time = computed(() => formatTimelineTime(props.item.timestamp));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				"data-test-id": "session-memory-item",
				class: normalizeClass(_ctx.$style.item)
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(AiActivityStepButton_default), {
				class: normalizeClass(_ctx.$style.activityButton),
				size: "small",
				interactive: false,
				tabindex: "-1"
			}, {
				prefix: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.iconContainer) }, [createVNode(SessionTimelinePill_default, {
					kind: __props.item.kind,
					label: label.value
				}, null, 8, ["kind", "label"])], 2)]),
				default: withCtx(() => [createTextVNode(" " + toDisplayString(label.value), 1)]),
				_: 1
			}, 8, ["class"]), createVNode(unref(N8nText_default), {
				step: "xs",
				color: "text-light",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(time.value), 1)]),
				_: 1
			})], 2), __props.projectId && __props.agentId && __props.threadId ? (openBlock(), createBlock(SessionMemoryDetail_default, {
				key: 0,
				item: __props.item,
				memory: __props.memory,
				"project-id": __props.projectId,
				"agent-id": __props.agentId,
				"thread-id": __props.threadId,
				onDeleted: _cache[0] || (_cache[0] = ($event) => __props.onDeleted?.())
			}, null, 8, [
				"item",
				"memory",
				"project-id",
				"agent-id",
				"thread-id"
			])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	item: "_item_146y8_1",
	activityButton: "_activityButton_146y8_10",
	iconContainer: "_iconContainer_146y8_14",
	header: "_header_146y8_24"
} }]]);
//#endregion
//#region src/features/agents/components/timeline-items/SessionMessageItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var COLLAPSED_MAX_HEIGHT = 256;
var SessionMessageItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionMessageItem",
	props: {
		item: {},
		projectId: {},
		agentId: {},
		threadId: {},
		senderName: {},
		messageMarkdown: {},
		personalisation: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const attachments = computed(() => {
			if (props.item.kind !== "user") return [];
			return (props.item.attachments ?? []).map(({ id, fileName, mimeType, sizeBytes }) => ({
				fileId: id,
				fileName,
				mimeType,
				sizeBytes
			}));
		});
		const expanded = ref(false);
		const isCollapsible = ref(false);
		const messageContent = useTemplateRef("messageContent");
		const expandButtonLabel = computed(() => i18n.baseText(expanded.value ? "generic.collapse" : "generic.expand"));
		function measureContent() {
			isCollapsible.value = (messageContent.value?.getBoundingClientRect().height ?? 0) > COLLAPSED_MAX_HEIGHT;
		}
		useResizeObserver(messageContent, measureContent);
		watch(() => props.messageMarkdown, measureContent, { flush: "post" });
		watch([
			() => props.item.kind,
			() => props.item.executionId,
			() => props.item.timestamp
		], () => {
			expanded.value = false;
		});
		const time = computed(() => formatTimelineTime(props.item.timestamp));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", { class: normalizeClass(_ctx.$style.panelContainer) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.panelHeader) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.panelHeaderIdentity) }, [props.item.kind === "user" ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.iconContainer)
			}, [createVNode(unref(N8nIcon_default), {
				icon: "user",
				size: "medium"
			})], 2)) : (openBlock(), createBlock(AgentPersonalisationIcon_default, {
				key: 1,
				personalisation: props.personalisation,
				size: 20
			}, null, 8, ["personalisation"])), createVNode(unref(N8nText_default), {
				step: "sm",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(props.senderName), 1)]),
				_: 1
			})], 2), createVNode(unref(N8nText_default), {
				step: "xs",
				color: "text-light",
				class: normalizeClass(_ctx.$style.time),
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(time.value), 1)]),
				_: 1
			}, 8, ["class"])], 2), createVNode(unref(CollapsibleRoot_default), {
				open: expanded.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => expanded.value = $event),
				class: normalizeClass([_ctx.$style.panelContent, { [_ctx.$style.isCollapsed]: isCollapsible.value && !expanded.value }])
			}, {
				default: withCtx(() => [createVNode(unref(CollapsibleContent_default), {
					"force-mount": "",
					class: normalizeClass(_ctx.$style.messageViewport),
					style: normalizeStyle({ maxHeight: isCollapsible.value && !expanded.value ? `${COLLAPSED_MAX_HEIGHT}px` : void 0 })
				}, {
					default: withCtx(() => [createBaseVNode("div", {
						ref_key: "messageContent",
						ref: messageContent,
						class: normalizeClass(_ctx.$style.messageContent)
					}, [attachments.value.length > 0 && __props.projectId && __props.agentId ? (openBlock(), createBlock(AgentChatMessageAttachments_default, {
						key: 0,
						attachments: attachments.value,
						"project-id": __props.projectId,
						"agent-id": __props.agentId,
						"thread-id": __props.threadId
					}, null, 8, [
						"attachments",
						"project-id",
						"agent-id",
						"thread-id"
					])) : createCommentVNode("", true), createVNode(unref(N8nMarkdown_default), { content: props.messageMarkdown }, null, 8, ["content"])], 2)]),
					_: 1
				}, 8, ["class", "style"]), isCollapsible.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.expandButtonContainer)
				}, [createVNode(unref(N8nTooltip_default), { content: expandButtonLabel.value }, {
					default: withCtx(() => [createVNode(unref(CollapsibleTrigger_default), { "as-child": "" }, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							size: "small",
							icon: expanded.value ? "arrow-up" : "arrow-down",
							"icon-only": "",
							"icon-size": "medium",
							variant: "outline",
							class: normalizeClass(_ctx.$style.expandButton),
							"aria-label": expandButtonLabel.value
						}, null, 8, [
							"icon",
							"class",
							"aria-label"
						])]),
						_: 1
					})]),
					_: 1
				}, 8, ["content"])], 2)) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["open", "class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panelContainer: "_panelContainer_1l845_122",
	panelHeader: "_panelHeader_1l845_132",
	panelHeaderIdentity: "_panelHeaderIdentity_1l845_141",
	iconContainer: "_iconContainer_1l845_146",
	panelContent: "_panelContent_1l845_159",
	isCollapsed: "_isCollapsed_1l845_163",
	messageViewport: "_messageViewport_1l845_168",
	messageContent: "_messageContent_1l845_172",
	expandButtonContainer: "_expandButtonContainer_1l845_176",
	expandButton: "_expandButton_1l845_176",
	time: "_time_1l845_198"
} }]]);
//#endregion
//#region src/features/agents/components/SessionTimelineRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/agents/components/SessionTimelineRow.vue
var SessionTimelineRow_default = /* @__PURE__ */ defineComponent({
	__name: "SessionTimelineRow",
	props: {
		item: {},
		respondToApproval: { type: Function },
		pendingApprovalRunIds: {},
		selected: { type: Boolean },
		searchQuery: {},
		agentName: {},
		projectId: {},
		agentId: {},
		threadId: {},
		personalisation: {},
		tools: {},
		memory: {},
		onMemoryDeleted: { type: Function }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const componentByKind = {
			user: SessionMessageItem_default,
			agent: SessionMessageItem_default,
			skill: SessionCapabilityItem_default,
			memory: SessionMemoryItem_default,
			tool: SessionCapabilityItem_default,
			node: SessionCapabilityItem_default,
			workflow: SessionCapabilityItem_default,
			"execution-error": SessionExecutionErrorItem_default,
			suspension: SessionHitlItem_default,
			"hitl-response": SessionHitlItem_default,
			"background-task-signal": SessionBackgroundJobItem_default,
			"background-task": SessionBackgroundTaskItem_default
		};
		const timelineItemComponent = computed(function getTimelineItemComponent() {
			return componentByKind[props.item.kind];
		});
		const timelineItemProps = computed(function getTimelineItemProps() {
			const kind = props.item.kind;
			const baseProps = {
				item: props.item,
				selected: props.selected
			};
			if (kind === "background-task") {
				const runId = props.item.backgroundTask?.approval?.runId;
				return {
					respondToApproval: props.respondToApproval,
					agentName: props.agentName,
					tools: props.tools,
					personalisation: props.personalisation,
					approvalPending: runId ? props.pendingApprovalRunIds?.has(runId) : false,
					...baseProps,
					projectId: props.projectId,
					agentId: props.agentId,
					threadId: props.threadId
				};
			}
			if (kind === "memory") return {
				...baseProps,
				memory: props.memory,
				projectId: props.projectId,
				agentId: props.agentId,
				threadId: props.threadId,
				onDeleted: props.onMemoryDeleted
			};
			if (kind === "user" || kind === "agent") {
				const fallbackSenderName = kind === "user" ? i18n.baseText("agentSessions.timeline.user") : props.agentName ?? i18n.baseText("agentSessions.timeline.agent");
				return {
					...baseProps,
					projectId: props.projectId,
					agentId: props.agentId,
					senderName: props.item.authorName ?? fallbackSenderName,
					threadId: props.threadId,
					messageMarkdown: props.item.content ?? "",
					personalisation: props.personalisation
				};
			}
			if (componentByKind[kind] === SessionCapabilityItem_default) return {
				...baseProps,
				projectId: props.projectId,
				agentId: props.agentId,
				threadId: props.threadId
			};
			return baseProps;
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(timelineItemComponent.value), mergeProps(timelineItemProps.value, { "search-query": __props.searchQuery }), null, 16, ["search-query"]);
		};
	}
});
//#endregion
//#region src/features/agents/components/SessionTimelineTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$1 = ["aria-label"];
var _hoisted_2$1 = [
	"data-timeline-row-id",
	"aria-selected",
	"tabindex",
	"onClick",
	"onKeydown"
];
var _hoisted_3 = { role: "gridcell" };
var _hoisted_4 = { role: "gridcell" };
var _hoisted_5 = [
	"data-timeline-row-id",
	"aria-selected",
	"tabindex",
	"onClick",
	"onKeydown"
];
var _hoisted_6 = { role: "gridcell" };
var _hoisted_7 = {
	key: 0,
	"data-test-id": "timeline-notice-row",
	role: "gridcell"
};
var ROW_HEIGHT = 40;
var VIRTUALIZE_AFTER_ROWS = 100;
var SessionTimelineTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionTimelineTable",
	props: {
		items: {},
		respondToApproval: { type: Function },
		pendingApprovalRunIds: {},
		agentName: {},
		projectId: {},
		agentId: {},
		threadId: {},
		personalisation: {},
		tools: {},
		memory: {},
		onMemoryDeleted: { type: Function },
		selectedIndex: {},
		visibleKinds: {},
		searchQuery: {},
		noticeIndex: {},
		approvalItem: {},
		approval: {},
		approvalDisabled: { type: Boolean }
	},
	emits: ["select", "approve"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const tableRef = ref(null);
		const scrollerRef = ref(null);
		const canScrollUp = ref(false);
		const canScrollDown = ref(false);
		let scrollContainer = null;
		function labelForKey(key) {
			const backgroundJobKey = backgroundJobTimelineLabelKey(key);
			if (backgroundJobKey) return i18n.baseText(backgroundJobKey);
			switch (key) {
				case "user": return i18n.baseText("agentSessions.timeline.user");
				case "agent": return i18n.baseText("agentSessions.timeline.agent");
				case "skill": return i18n.baseText("agentSessions.timeline.skill");
				case "memory": return i18n.baseText("agentSessions.timeline.memory");
				case "tool": return i18n.baseText("agentSessions.timeline.tool");
				case "workflow": return i18n.baseText("agentSessions.timeline.workflow");
				case "node": return i18n.baseText("agentSessions.timeline.node");
				case "execution-error": return i18n.baseText("agentSessions.timeline.executionFailed");
				case "execution-interrupted": return i18n.baseText("agentSessions.timeline.executionInterrupted");
				case "suspension": return i18n.baseText("agentSessions.timeline.hitlRequest");
				case "hitl-response": return i18n.baseText("agentSessions.timeline.hitlResponse");
				case "approval-requested": return i18n.baseText("agentSessions.timeline.approvalRequested");
				case "hitl-requested": return i18n.baseText("agentSessions.timeline.hitlRequested");
				case "wait-requested": return i18n.baseText("agentSessions.timeline.waitRequested");
				case "approved": return i18n.baseText("agentSessions.timeline.approved");
				case "responded": return i18n.baseText("agentSessions.timeline.responseReceived");
				case "declined": return i18n.baseText("agentSessions.timeline.declined");
				case "error": return i18n.baseText("agentSessions.timeline.error");
				default: return key;
			}
		}
		const rows = computed(function getRows() {
			return filteredTimelineItemIndexes(props.items, props.visibleKinds, props.searchQuery ?? "", labelForKey).map(function toEventRow(index) {
				const item = props.items[index];
				return {
					id: timelineItemKey(item),
					kind: "event",
					item,
					index,
					sortKey: item.timestamp
				};
			}).sort(function sortRows(a, b) {
				return a.sortKey - b.sortKey;
			});
		});
		const shouldVirtualizeRows = computed(function shouldVirtualize() {
			return rows.value.length > VIRTUALIZE_AFTER_ROWS;
		});
		function showsApprovalRow(row) {
			return props.approval !== void 0 && props.approvalItem?.executionId === row.item.executionId && props.approvalItem?.toolCallId === row.item.toolCallId;
		}
		const tabbableEventIndex = computed(function getTabbableEventIndex() {
			return rows.value.find((row) => row.index === props.selectedIndex)?.index ?? rows.value[0]?.index;
		});
		function onRowClick(event, index) {
			if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [role=\"button\"], [contenteditable=\"true\"]")) return;
			emit("select", index);
		}
		function onRowKeydown(event) {
			if (event.target !== event.currentTarget) return;
			if (event.key === "Escape") {
				if (props.selectedIndex === null) return;
				event.preventDefault();
				emit("select", null);
				return;
			}
			if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
			if (event.ctrlKey || event.altKey || event.shiftKey) return;
			event.preventDefault();
			const direction = event.key === "ArrowDown" ? 1 : -1;
			const currentIndex = rows.value.findIndex((row) => row.index === props.selectedIndex);
			const nextIndex = event.metaKey ? direction === 1 ? rows.value.length - 1 : 0 : currentIndex < 0 ? direction === 1 ? 0 : rows.value.length - 1 : Math.max(0, Math.min(rows.value.length - 1, currentIndex + direction));
			const row = rows.value[nextIndex];
			if (row) emit("select", row.index);
		}
		function updateScrollMask() {
			if (!scrollContainer) {
				canScrollUp.value = false;
				canScrollDown.value = false;
				return;
			}
			canScrollUp.value = scrollContainer.scrollTop > 0;
			canScrollDown.value = scrollContainer.scrollTop + scrollContainer.clientHeight < scrollContainer.scrollHeight - 1;
		}
		function bindScrollContainer() {
			const nextScrollContainer = tableRef.value?.querySelector("[data-timeline-scroll-container]") ?? tableRef.value?.querySelector(".recycle-scroller-wrapper");
			if (nextScrollContainer === scrollContainer) return;
			scrollContainer?.removeEventListener("scroll", updateScrollMask);
			scrollContainer = nextScrollContainer ?? null;
			scrollContainer?.addEventListener("scroll", updateScrollMask, { passive: true });
			updateScrollMask();
		}
		function scrollSelectedIntoView() {
			const selectedIndex = props.selectedIndex;
			if (selectedIndex === null) return;
			const rowId = rows.value.find((row) => row.index === selectedIndex)?.id;
			if (!rowId) return;
			const behavior = shouldVirtualizeRows.value || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
			bindScrollContainer();
			const row = tableRef.value?.querySelector(`[data-timeline-row-id="${rowId}"]`);
			if (shouldVirtualizeRows.value && !row) {
				/** Row measurements can change the target offset during a smooth scroll. */
				scrollerRef.value?.scrollToKey(rowId, "auto");
				return;
			}
			if (!row || !scrollContainer) return;
			const rowBounds = row.getBoundingClientRect();
			const containerBounds = scrollContainer.getBoundingClientRect();
			if (rowBounds.top < containerBounds.top) scrollContainer.scrollTo({
				top: scrollContainer.scrollTop + rowBounds.top - containerBounds.top,
				behavior
			});
			else if (rowBounds.bottom > containerBounds.bottom) scrollContainer.scrollTo({
				top: scrollContainer.scrollTop + rowBounds.bottom - containerBounds.bottom,
				behavior
			});
			updateScrollMask();
		}
		__expose({ scrollSelectedIntoView });
		watch(() => props.selectedIndex, () => {
			const activeElement = document.activeElement;
			const shouldMoveFocus = activeElement instanceof HTMLElement && tableRef.value?.contains(activeElement) === true && activeElement.matches("[data-timeline-row-id]");
			nextTick(async () => {
				scrollSelectedIntoView();
				if (!shouldMoveFocus) return;
				await nextTick();
				const rowId = rows.value.find((row) => row.index === props.selectedIndex)?.id;
				if (!rowId) return;
				tableRef.value?.querySelector(`[data-timeline-row-id="${rowId}"]`)?.focus({ preventScroll: true });
			});
		});
		watch(() => rows.value.length, () => {
			nextTick(() => {
				bindScrollContainer();
				updateScrollMask();
			});
		});
		onMounted(() => {
			nextTick(bindScrollContainer);
		});
		onBeforeUnmount(() => {
			scrollContainer?.removeEventListener("scroll", updateScrollMask);
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "tableRef",
				ref: tableRef,
				class: normalizeClass([
					_ctx.$style.table,
					canScrollUp.value && _ctx.$style.canScrollUp,
					canScrollDown.value && _ctx.$style.canScrollDown
				]),
				role: "grid",
				"aria-label": unref(i18n).baseText("agentSessions.timeline.events")
			}, [rows.value.length > 0 && !shouldVirtualizeRows.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.directRows),
				"data-timeline-scroll-container": "",
				role: "rowgroup"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(rows.value, (row, rowIndex) => {
				return openBlock(), createElementBlock(Fragment, { key: row.id }, [createBaseVNode("div", {
					"data-test-id": "timeline-row",
					"data-timeline-row-id": row.id,
					class: normalizeClass(_ctx.$style.rowWrapper),
					role: "row",
					"aria-selected": props.selectedIndex === row.index,
					tabindex: tabbableEventIndex.value === row.index ? 0 : -1,
					onClick: ($event) => onRowClick($event, row.index),
					onKeydown: [
						onRowKeydown,
						withKeys(withModifiers(($event) => emit("select", row.index), ["self", "prevent"]), ["enter"]),
						withKeys(withModifiers(($event) => emit("select", row.index), ["self", "prevent"]), ["space"])
					]
				}, [
					createBaseVNode("div", _hoisted_3, [createVNode(SessionTimelineRow_default, {
						"project-id": props.projectId,
						"agent-id": props.agentId,
						"thread-id": props.threadId,
						item: row.item,
						"respond-to-approval": props.respondToApproval,
						"pending-approval-run-ids": props.pendingApprovalRunIds,
						"agent-name": props.agentName,
						tools: props.tools,
						memory: props.memory,
						"on-memory-deleted": props.onMemoryDeleted,
						selected: props.selectedIndex === row.index,
						"search-query": props.searchQuery,
						personalisation: props.personalisation
					}, null, 8, [
						"project-id",
						"agent-id",
						"thread-id",
						"item",
						"respond-to-approval",
						"pending-approval-run-ids",
						"agent-name",
						"tools",
						"memory",
						"on-memory-deleted",
						"selected",
						"search-query",
						"personalisation"
					])]),
					props.approval && showsApprovalRow(row) ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.approvalRow),
						"data-test-id": "timeline-approval-row",
						role: "gridcell",
						onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"])),
						onKeydown: _cache[2] || (_cache[2] = withModifiers(() => {}, ["stop"]))
					}, [createVNode(ToolApprovalCard_default, {
						input: props.approval,
						"agent-name": props.agentName,
						tools: props.tools,
						disabled: props.approvalDisabled,
						"auto-focus": false,
						"use-key-shortcuts": false,
						onSubmit: _cache[0] || (_cache[0] = ($event) => emit("approve", $event))
					}, null, 8, [
						"input",
						"agent-name",
						"tools",
						"disabled"
					])], 34)) : createCommentVNode("", true),
					rowIndex < rows.value.length - 1 ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.divider)
					}, [..._cache[6] || (_cache[6] = [createBaseVNode("span", null, null, -1)])], 2)) : createCommentVNode("", true)
				], 42, _hoisted_2$1), _ctx.$slots.notice && row.index === props.noticeIndex ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.rowWrapper),
					"data-test-id": "timeline-notice-row",
					role: "row"
				}, [createBaseVNode("div", _hoisted_4, [renderSlot(_ctx.$slots, "notice")])], 2)) : createCommentVNode("", true)], 64);
			}), 128))], 2)) : rows.value.length > 0 ? (openBlock(), createBlock(unref(N8nRecycleScroller_default), {
				key: 1,
				ref_key: "scrollerRef",
				ref: scrollerRef,
				items: rows.value,
				"item-size": ROW_HEIGHT,
				"item-key": "id",
				role: "rowgroup"
			}, {
				default: withCtx(({ item: row, updateItemSize }) => [withDirectives((openBlock(), createElementBlock("div", {
					"data-test-id": "timeline-row",
					"data-timeline-row-id": row.id,
					class: normalizeClass(_ctx.$style.rowWrapper),
					role: "row",
					"aria-selected": props.selectedIndex === row.index,
					tabindex: tabbableEventIndex.value === row.index ? 0 : -1,
					onClick: ($event) => onRowClick($event, row.index),
					onKeydown: [
						onRowKeydown,
						withKeys(withModifiers(($event) => emit("select", row.index), ["self", "prevent"]), ["enter"]),
						withKeys(withModifiers(($event) => emit("select", row.index), ["self", "prevent"]), ["space"])
					]
				}, [
					createBaseVNode("div", _hoisted_6, [createVNode(SessionTimelineRow_default, {
						"project-id": props.projectId,
						"agent-id": props.agentId,
						"thread-id": props.threadId,
						item: row.item,
						"respond-to-approval": props.respondToApproval,
						"pending-approval-run-ids": props.pendingApprovalRunIds,
						"agent-name": props.agentName,
						tools: props.tools,
						memory: props.memory,
						"on-memory-deleted": props.onMemoryDeleted,
						selected: props.selectedIndex === row.index,
						"search-query": props.searchQuery,
						personalisation: props.personalisation
					}, null, 8, [
						"project-id",
						"agent-id",
						"thread-id",
						"item",
						"respond-to-approval",
						"pending-approval-run-ids",
						"agent-name",
						"tools",
						"memory",
						"on-memory-deleted",
						"selected",
						"search-query",
						"personalisation"
					])]),
					_ctx.$slots.notice && row.index === props.noticeIndex ? (openBlock(), createElementBlock("div", _hoisted_7, [renderSlot(_ctx.$slots, "notice")])) : createCommentVNode("", true),
					props.approval && showsApprovalRow(row) ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.approvalRow),
						"data-test-id": "timeline-approval-row",
						role: "gridcell",
						onClick: _cache[4] || (_cache[4] = withModifiers(() => {}, ["stop"])),
						onKeydown: _cache[5] || (_cache[5] = withModifiers(() => {}, ["stop"]))
					}, [createVNode(ToolApprovalCard_default, {
						input: props.approval,
						"agent-name": props.agentName,
						tools: props.tools,
						disabled: props.approvalDisabled,
						"auto-focus": false,
						"use-key-shortcuts": false,
						onSubmit: _cache[3] || (_cache[3] = ($event) => emit("approve", $event))
					}, null, 8, [
						"input",
						"agent-name",
						"tools",
						"disabled"
					])], 34)) : createCommentVNode("", true),
					row.id !== rows.value[rows.value.length - 1].id ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.divider)
					}, [..._cache[7] || (_cache[7] = [createBaseVNode("span", null, null, -1)])], 2)) : createCommentVNode("", true)
				], 42, _hoisted_5)), [[unref(vElementSize), () => updateItemSize({ id: row.id })]])]),
				_: 3
			}, 8, ["items"])) : (openBlock(), createElementBlock("div", {
				key: 2,
				"data-test-id": "timeline-empty",
				class: normalizeClass(_ctx.$style.empty)
			}, toDisplayString(unref(i18n).baseText("executionsLandingPage.noResults")), 3))], 10, _hoisted_1$1);
		};
	}
}), [["__cssModules", { "$style": {
	table: "_table_1js48_1",
	rowWrapper: "_rowWrapper_1js48_9",
	approvalRow: "_approvalRow_1js48_17",
	empty: "_empty_1js48_22",
	directRows: "_directRows_1js48_39",
	canScrollDown: "_canScrollDown_1js48_51",
	canScrollUp: "_canScrollUp_1js48_55",
	divider: "_divider_1js48_75"
} }]]);
//#endregion
//#region src/features/agents/components/SessionTimelineChart.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1 = ["data-error"];
var _hoisted_2 = [
	"data-timeline-index",
	"data-error",
	"aria-label",
	"onMouseenter",
	"onFocus",
	"onClick"
];
var SCROLL_PADDING = 48;
var INSTANT_MS = 100;
var POPOVER_SHOW_DELAY_MS = 300;
var POPOVER_HIDE_DELAY_MS = 100;
var SessionTimelineChart_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SessionTimelineChart",
	props: {
		items: {},
		sessionStart: {},
		sessionEnd: {},
		visibleKinds: {},
		selectedIndex: {}
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const carouselRef = ref(null);
		const chartRef = ref(null);
		const hasOverflow = ref(false);
		const canScrollLeft = ref(false);
		const canScrollRight = ref(false);
		const activePopover = ref(null);
		const popoverOpen = ref(false);
		const activePopoverStatus = computed(() => {
			const segment = activePopover.value?.segment;
			return segment?.kind === "event" ? timelineItemStatus(segment.item) : void 0;
		});
		let showPopoverTimer = null;
		let hidePopoverTimer = null;
		let resizeObserver = null;
		let hoveredPopover = null;
		let focusedPopover = null;
		const segments = computed(() => {
			const out = [];
			for (let i = 0; i < props.items.length; i++) {
				const item = props.items[i];
				const duration = item.endTimestamp ? item.endTimestamp - item.timestamp : INSTANT_MS;
				out.push({
					kind: "event",
					item,
					index: i,
					duration
				});
			}
			return out;
		});
		function isDimmed(item) {
			return !matchesTimelineFilters(item, props.visibleKinds);
		}
		function cellStyle(seg) {
			return { flex: `${Math.max(seg.duration, 1)} 1 0` };
		}
		function eventStyle(item) {
			const style = chartBlockStyleForItem(item);
			if (isDimmed(item)) {
				style.opacity = "0.15";
				style.pointerEvents = "none";
			}
			return style;
		}
		function popoverPillKind(item) {
			return isSubAgentTimelineItem(item) ? "subagent" : item.kind;
		}
		function popoverLabel(item) {
			if (isSubAgentTimelineItem(item)) return i18n.baseText("agentSessions.timeline.subAgent");
			switch (item.kind) {
				case "background-task": return i18n.baseText("agentSessions.timeline.backgroundTask");
				case "background-task-signal": return i18n.baseText("agents.chat.backgroundTasks.resultsReceived");
				case "user": return i18n.baseText("agentSessions.timeline.user");
				case "agent": return i18n.baseText("agentSessions.timeline.agent");
				case "skill": return i18n.baseText("agentSessions.timeline.skill");
				case "memory": return i18n.baseText("agentSessions.timeline.memory");
				case "tool": return i18n.baseText("agentSessions.timeline.tool");
				case "workflow": return i18n.baseText("agentSessions.timeline.workflow");
				case "node": return i18n.baseText("agentSessions.timeline.node");
				case "execution-error": return executionErrorLabel(item, i18n);
				case "suspension": return i18n.baseText(hitlRequestLabelKey(item.hitlRequestType));
				case "hitl-response": return i18n.baseText("agentSessions.timeline.hitlResponse");
				default: return "";
			}
		}
		function popoverName(item) {
			if (isSubAgentTimelineItem(item)) return item.subAgentName ?? formatToolNameForDisplay(item.toolName);
			switch (item.kind) {
				case "background-task": return item.backgroundTask?.title ?? "";
				case "background-task-signal": return backgroundJobSignalSummary(item, i18n);
				case "user":
				case "agent": return truncate(item.content ?? "", 80);
				case "skill": return item.skillName ?? resolveToolNameForDisplay(item.toolName, i18n, item.toolOutput);
				case "memory": return memoryTimelineName(item, i18n);
				case "tool": return resolveToolNameForDisplay(item.toolName, i18n, item.toolOutput);
				case "workflow": return item.workflowName ?? formatToolNameForDisplay(item.toolName);
				case "node": return item.nodeDisplayName ?? formatToolNameForDisplay(item.toolName);
				case "execution-error": return executionErrorMessage(item, i18n);
				case "suspension":
				case "hitl-response": return hitlTimelineName(item, i18n);
				default: return "";
			}
		}
		function statusLabel(item) {
			const status = timelineItemStatus(item);
			return status ? i18n.baseText(status.labelKey) : void 0;
		}
		/**
		* Real-event duration for the popover. Returns empty when the item has no
		* `endTimestamp` greater than `timestamp` — point events (user/agent text,
		* memory, suspension) and incomplete tool calls. The chart's `seg.duration`
		* applies a synthetic `INSTANT_MS` floor so point events get a visible block;
		* we deliberately don't use that here, otherwise every popover would read
		* "100ms".
		*/
		function popoverDuration(item) {
			if (!item.endTimestamp || item.endTimestamp <= item.timestamp) return "";
			return formatDuration(item.endTimestamp - item.timestamp);
		}
		function popoverTime(item) {
			if (!item.timestamp) return "";
			return convertToDisplayDate(new Date(item.timestamp).toISOString()).time;
		}
		function blockAriaLabel(item) {
			return [
				popoverLabel(item),
				popoverName(item),
				statusLabel(item)
			].filter((part) => Boolean(part)).join(", ");
		}
		function onClick(index, item) {
			if (isDimmed(item)) return;
			emit("select", index);
		}
		function showPopover(segment, event) {
			if (!(event.currentTarget instanceof HTMLElement)) return;
			const target = {
				segment,
				reference: event.currentTarget
			};
			if (event.type === "focus") focusedPopover = target;
			else hoveredPopover = target;
			clearShowPopoverTimer();
			clearHidePopoverTimer();
			if (popoverOpen.value) {
				activePopover.value = target;
				return;
			}
			showPopoverTimer = setTimeout(() => {
				activePopover.value = target;
				popoverOpen.value = true;
			}, POPOVER_SHOW_DELAY_MS);
		}
		function clearShowPopoverTimer() {
			if (!showPopoverTimer) return;
			clearTimeout(showPopoverTimer);
			showPopoverTimer = null;
		}
		function clearHidePopoverTimer() {
			if (!hidePopoverTimer) return;
			clearTimeout(hidePopoverTimer);
			hidePopoverTimer = null;
		}
		function scrollSelectedIntoView() {
			const selectedIndex = props.selectedIndex;
			const chart = chartRef.value;
			if (selectedIndex === null || !chart) return;
			const selectedBlock = chart.querySelector(`[data-timeline-index="${selectedIndex}"]`);
			if (!selectedBlock) return;
			const blockLeft = selectedBlock.offsetLeft;
			const blockRight = blockLeft + selectedBlock.offsetWidth;
			const viewportLeft = chart.scrollLeft;
			const viewportRight = viewportLeft + chart.clientWidth;
			if (blockLeft - SCROLL_PADDING < viewportLeft) chart.scrollLeft = Math.max(0, blockLeft - SCROLL_PADDING);
			else if (blockRight + SCROLL_PADDING > viewportRight) chart.scrollLeft = blockRight + SCROLL_PADDING - chart.clientWidth;
		}
		function updateScrollState() {
			const chart = chartRef.value;
			if (!chart) {
				hasOverflow.value = false;
				canScrollLeft.value = false;
				canScrollRight.value = false;
				return;
			}
			const availableWidth = carouselRef.value?.clientWidth ?? chart.clientWidth;
			const maxScrollLeft = Math.max(0, chart.scrollWidth - chart.clientWidth);
			hasOverflow.value = chart.scrollWidth - availableWidth > 1;
			canScrollLeft.value = hasOverflow.value && chart.scrollLeft > 1;
			canScrollRight.value = hasOverflow.value && chart.scrollLeft < maxScrollLeft - 1;
		}
		function scrollChart(direction) {
			const chart = chartRef.value;
			if (!chart) return;
			const distance = Math.max(chart.clientWidth - SCROLL_PADDING, SCROLL_PADDING);
			const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
			chart.scrollBy({
				left: direction * distance,
				top: 0,
				behavior
			});
		}
		function hidePopover(event) {
			if (event.type === "blur") focusedPopover = null;
			else hoveredPopover = null;
			clearShowPopoverTimer();
			clearHidePopoverTimer();
			const remainingTarget = focusedPopover ?? hoveredPopover;
			if (remainingTarget) {
				activePopover.value = remainingTarget;
				popoverOpen.value = true;
				return;
			}
			/** Keep the card open while the pointer crosses a gap between cells. */
			hidePopoverTimer = setTimeout(() => {
				popoverOpen.value = false;
				activePopover.value = null;
				hidePopoverTimer = null;
			}, POPOVER_HIDE_DELAY_MS);
		}
		watch(() => props.selectedIndex, () => {
			nextTick(scrollSelectedIntoView);
		});
		watch(segments, () => {
			nextTick(updateScrollState);
		});
		onMounted(() => {
			const chart = chartRef.value;
			if (!chart) return;
			chart.addEventListener("scroll", updateScrollState, { passive: true });
			resizeObserver = new ResizeObserver(updateScrollState);
			resizeObserver.observe(chart);
			if (carouselRef.value) resizeObserver.observe(carouselRef.value);
			updateScrollState();
		});
		onBeforeUnmount(() => {
			clearShowPopoverTimer();
			clearHidePopoverTimer();
			chartRef.value?.removeEventListener("scroll", updateScrollState);
			resizeObserver?.disconnect();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "carouselRef",
				ref: carouselRef,
				class: normalizeClass(_ctx.$style.carousel)
			}, [
				hasOverflow.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					icon: "chevron-left",
					variant: "ghost",
					size: "small",
					"aria-label": unref(i18n).baseText("agentSessions.timeline.scrollBackward"),
					disabled: !canScrollLeft.value,
					onClick: _cache[0] || (_cache[0] = ($event) => scrollChart(-1))
				}, null, 8, ["aria-label", "disabled"])) : createCommentVNode("", true),
				createBaseVNode("div", {
					ref_key: "chartRef",
					ref: chartRef,
					class: normalizeClass(_ctx.$style.chart)
				}, [createVNode(unref(N8nHoverCard_default), {
					open: popoverOpen.value,
					"hide-trigger": "",
					reference: activePopover.value?.reference,
					side: "top",
					align: "center",
					"side-offset": 8,
					"close-delay": 0,
					"max-width": "none",
					"content-class": _ctx.$style.hoverCardContent
				}, {
					content: withCtx(() => [activePopover.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.popoverInner)
					}, [
						createVNode(SessionTimelinePill_default, {
							kind: popoverPillKind(activePopover.value.segment.item),
							"tool-name": activePopover.value.segment.item.toolName,
							label: popoverLabel(activePopover.value.segment.item)
						}, null, 8, [
							"kind",
							"tool-name",
							"label"
						]),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.popoverName) }, toDisplayString(popoverName(activePopover.value.segment.item)), 3),
						activePopoverStatus.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
							key: 0,
							variant: activePopoverStatus.value.theme,
							size: "xxsmall",
							"data-test-id": activePopoverStatus.value.kind === "hitl-response" ? "timeline-popover-hitl-response-badge" : activePopover.value.segment.item.kind === "execution-error" ? "timeline-popover-execution-error-badge" : "timeline-popover-tool-error-badge"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(activePopoverStatus.value.labelKey)), 1)]),
							_: 1
						}, 8, ["variant", "data-test-id"])) : createCommentVNode("", true),
						popoverDuration(activePopover.value.segment.item) ? (openBlock(), createElementBlock("span", {
							key: 1,
							class: normalizeClass(_ctx.$style.popoverMeta)
						}, toDisplayString(popoverDuration(activePopover.value.segment.item)), 3)) : createCommentVNode("", true),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.popoverMeta) }, toDisplayString(popoverTime(activePopover.value.segment.item)), 3)
					], 2)) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"open",
					"reference",
					"content-class"
				]), (openBlock(true), createElementBlock(Fragment, null, renderList(segments.value, (seg, segIdx) => {
					return openBlock(), createElementBlock("div", {
						key: segIdx,
						"data-test-id": "timeline-cell",
						"data-error": seg.kind === "event" && unref(isErroredTimelineItem)(seg.item) ? "true" : void 0,
						class: normalizeClass(_ctx.$style.cell),
						style: normalizeStyle(cellStyle(seg))
					}, [createBaseVNode("button", {
						type: "button",
						"data-test-id": "timeline-block",
						"data-timeline-index": seg.index,
						"data-error": unref(isErroredTimelineItem)(seg.item) ? "true" : void 0,
						"aria-label": blockAriaLabel(seg.item),
						class: normalizeClass(_ctx.$style.block),
						style: normalizeStyle(eventStyle(seg.item)),
						onMouseenter: ($event) => showPopover(seg, $event),
						onMouseleave: _cache[1] || (_cache[1] = ($event) => hidePopover($event)),
						onFocus: ($event) => showPopover(seg, $event),
						onBlur: _cache[2] || (_cache[2] = ($event) => hidePopover($event)),
						onClick: ($event) => onClick(seg.index, seg.item)
					}, null, 46, _hoisted_2)], 14, _hoisted_1);
				}), 128))], 2),
				hasOverflow.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 1,
					icon: "chevron-right",
					variant: "ghost",
					size: "small",
					"aria-label": unref(i18n).baseText("agentSessions.timeline.scrollForward"),
					disabled: !canScrollRight.value,
					onClick: _cache[3] || (_cache[3] = ($event) => scrollChart(1))
				}, null, 8, ["aria-label", "disabled"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	carousel: "_carousel_lnuse_2",
	chart: "_chart_lnuse_15",
	cell: "_cell_lnuse_32",
	block: "_block_lnuse_45",
	hoverCardContent: "_hoverCardContent_lnuse_85",
	popoverInner: "_popoverInner_lnuse_98",
	popoverName: "_popoverName_lnuse_106",
	popoverMeta: "_popoverMeta_lnuse_112"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSessionTimelinePanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentSessionTimelinePanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSessionTimelinePanel",
	props: {
		projectId: {},
		agentId: {},
		agentName: {},
		threadId: {},
		increaseBudget: { type: Function },
		personalisation: {}
	},
	emits: ["loaded"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const agentTelemetry = useAgentTelemetry();
		const sessionsStore = useAgentSessionsStore();
		const pushStore = usePushConnectionStore();
		const documentVisibility = useDocumentVisibility();
		const projectId = computed(() => props.projectId);
		const executions = ref([]);
		const memory = ref();
		const loading = ref(true);
		const selectedIndex = ref(null);
		const highlightedIndex = ref(null);
		const timelineTableRef = useTemplateRef("timelineTable");
		const selectedFilters = ref(/* @__PURE__ */ new Set());
		const searchQuery = ref("");
		let threadDetailRequestId = 0;
		let refreshPending = false;
		let removePushListener;
		let activeRequest;
		const pendingApprovalRunIds = ref(/* @__PURE__ */ new Set());
		let disposed = false;
		const { allJobs, respondToApproval } = useAgentBackgroundJobs({
			projectId: () => props.projectId,
			agentId: () => props.agentId,
			threadId: () => props.threadId,
			active: true
		});
		async function respondToBackgroundApproval(payload) {
			if (!allJobs.value.find((job) => job.status === "suspended" && job.approval?.runId === payload.runId && job.approval.toolCallId === payload.toolCallId) || pendingApprovalRunIds.value.has(payload.runId)) return;
			const identity = threadIdentity();
			const pending = pendingApprovalRunIds.value;
			pending.add(payload.runId);
			try {
				await respondToApproval(payload);
			} catch (error) {
				if (!disposed && identity === threadIdentity()) toast.showError(error, i18n.baseText("agents.chat.backgroundTasks.approvalError"));
			} finally {
				pending.delete(payload.runId);
			}
		}
		const baseItems = computed(() => insertBackgroundTaskTimelineItems(flattenExecutionsToTimelineItems(executions.value), backgroundTasksToTimelineItems(allJobs.value)));
		/** Keep selection on the same item when task data arrives after execution data. */
		watch(baseItems, (next, previous) => {
			if (selectedIndex.value === null) return;
			const selected = previous[selectedIndex.value];
			if (!selected) return;
			const key = timelineItemKey(selected);
			const index = next.findIndex((item) => timelineItemKey(item) === key);
			selectTimelineItem(index >= 0 ? index : null);
		}, { flush: "sync" });
		const { subAgentNameById } = useSubAgentNames(projectId, () => baseItems.value.some(isSubAgentTimelineItem));
		const items = computed(() => baseItems.value.map((item) => {
			if (!isSubAgentTimelineItem(item)) return item;
			const name = resolveSubAgentName(item.toolInput, subAgentNameById.value);
			return name ? {
				...item,
				subAgentName: name
			} : item;
		}));
		const resolvedBudgetStopExecutionId = ref(null);
		const budgetIncreasePending = ref(false);
		const budgetStop = computed(() => {
			const lastExecutionId = executions.value.at(-1)?.id;
			if (!lastExecutionId || lastExecutionId === resolvedBudgetStopExecutionId.value) return null;
			for (let index = items.value.length - 1; index >= 0; index--) {
				const item = items.value[index];
				if (item.executionId !== lastExecutionId || item.kind !== "execution-error") continue;
				if (item.guardrailCode && isBudgetStopCode(item.guardrailCode)) return {
					index,
					executionId: lastExecutionId,
					code: item.guardrailCode
				};
			}
			return null;
		});
		async function onIncreaseBudget(payload) {
			const stopExecutionId = budgetStop.value?.executionId;
			if (!props.increaseBudget || !stopExecutionId || budgetIncreasePending.value) return;
			const identity = threadIdentity();
			budgetIncreasePending.value = true;
			try {
				if (await props.increaseBudget(payload) && identity === threadIdentity()) resolvedBudgetStopExecutionId.value = stopExecutionId;
			} finally {
				budgetIncreasePending.value = false;
			}
		}
		const bounds = computed(() => sessionBounds(items.value));
		function labelForKey(key) {
			const backgroundJobKey = backgroundJobTimelineLabelKey(key);
			if (backgroundJobKey) return i18n.baseText(backgroundJobKey);
			switch (key) {
				case "user": return i18n.baseText("agentSessions.timeline.user");
				case "agent": return i18n.baseText("agentSessions.timeline.agent");
				case "skill": return i18n.baseText("agentSessions.timeline.skill");
				case "memory": return i18n.baseText("agentSessions.timeline.memory");
				case "tool": return i18n.baseText("agentSessions.timeline.tool");
				case "workflow": return i18n.baseText("agentSessions.timeline.workflow");
				case "node": return i18n.baseText("agentSessions.timeline.node");
				case "execution-error": return i18n.baseText("agentSessions.timeline.executionFailed");
				case "execution-interrupted": return i18n.baseText("agentSessions.timeline.executionInterrupted");
				case "suspension": return i18n.baseText("agentSessions.timeline.hitlRequest");
				case "hitl-response": return i18n.baseText("agentSessions.timeline.hitlResponse");
				case "approval-requested": return i18n.baseText("agentSessions.timeline.approvalRequested");
				case "hitl-requested": return i18n.baseText("agentSessions.timeline.hitlRequested");
				case "wait-requested": return i18n.baseText("agentSessions.timeline.waitRequested");
				case "approved": return i18n.baseText("agentSessions.timeline.approved");
				case "responded": return i18n.baseText("agentSessions.timeline.responseReceived");
				case "declined": return i18n.baseText("agentSessions.timeline.declined");
				case "error": return i18n.baseText("agentSessions.timeline.error");
				default: return key;
			}
		}
		const STATUS_FILTER_OPTIONS = [
			{
				key: "approved",
				badgeTheme: "success"
			},
			{
				key: "declined",
				badgeTheme: "outline"
			},
			{
				key: "error",
				badgeTheme: "danger"
			}
		];
		const filterOptions = computed(() => {
			const kindCounts = /* @__PURE__ */ new Map();
			const statusCounts = /* @__PURE__ */ new Map();
			for (const item of items.value) {
				if (item.kind !== "execution-error") kindCounts.set(item.kind, (kindCounts.get(item.kind) ?? 0) + 1);
				const statusKey = itemStatusFilterKey(item);
				if (statusKey) statusCounts.set(statusKey, (statusCounts.get(statusKey) ?? 0) + 1);
			}
			return [...Array.from(kindCounts.entries()).map(([key, count]) => ({
				key,
				label: labelForKey(key),
				presentation: "swatch",
				color: timelineColors(key).chart,
				count
			})), ...STATUS_FILTER_OPTIONS.flatMap(({ key, badgeTheme }) => {
				const count = statusCounts.get(key);
				if (!count) return [];
				return [{
					key,
					label: labelForKey(key),
					presentation: "badge",
					badgeTheme,
					count
				}];
			})];
		});
		const selectedItem = computed(() => selectedIndex.value !== null ? items.value[selectedIndex.value] ?? null : null);
		const pendingApprovalIdentity = ref(null);
		const approvalDisabled = computed(() => pendingApprovalIdentity.value === threadIdentity());
		const openApprovalItem = computed(() => {
			const latest = executions.value.at(-1);
			if (!latest || latest.status !== "awaiting") return null;
			return items.value.find((item) => item.executionId === latest.id && item.kind === "suspension" && item.hitlRequestType === "approval") ?? null;
		});
		const sessionApproval = computed(() => {
			const item = openApprovalItem.value;
			if (!item) return void 0;
			return parseApprovalInput(item.hitlRequest);
		});
		function releasePendingApproval(identity) {
			if (pendingApprovalIdentity.value === identity) pendingApprovalIdentity.value = null;
		}
		async function submitSessionApproval(resumeData) {
			const toolCallId = openApprovalItem.value?.toolCallId;
			const identity = threadIdentity();
			const { projectId, agentId, threadId } = props;
			if (!toolCallId || pendingApprovalIdentity.value === identity) return;
			pendingApprovalIdentity.value = identity;
			try {
				await sessionsStore.resumeTaskApproval(projectId, agentId, threadId, {
					toolCallId,
					resumeData
				});
			} catch (error) {
				releasePendingApproval(identity);
				if (threadIdentity() !== identity) return;
				toast.showError(error, i18n.baseText("agentSessions.approval.failed"));
				return;
			}
			if (threadIdentity() !== identity) return;
			refreshThreadDetail();
		}
		function selectTimelineItem(index) {
			selectedIndex.value = index;
			highlightedIndex.value = index;
		}
		function onTimelineItemSelect(index) {
			selectTimelineItem(index);
			const item = index === null ? void 0 : items.value[index];
			if (item) agentTelemetry.trackClickedTraceItem({
				agentId: props.agentId,
				itemType: item.kind
			});
		}
		function onChartSelect(index) {
			onTimelineItemSelect(index);
			nextTick(() => timelineTableRef.value?.scrollSelectedIntoView());
		}
		function loadThreadDetail() {
			resolvedBudgetStopExecutionId.value = null;
			pendingApprovalRunIds.value = /* @__PURE__ */ new Set();
			executions.value = [];
			memory.value = void 0;
			selectedFilters.value = /* @__PURE__ */ new Set();
			searchQuery.value = "";
			selectTimelineItem(null);
			loading.value = true;
			emit("loaded", null);
			refreshPending = false;
			startThreadDetailRequest(true);
		}
		function threadIdentity() {
			return `${props.projectId}:${props.agentId}:${props.threadId}`;
		}
		async function fetchThreadDetail(initial) {
			const currentProjectId = props.projectId;
			const currentAgentId = props.agentId;
			const currentThreadId = props.threadId;
			const identity = threadIdentity();
			const requestId = ++threadDetailRequestId;
			try {
				const result = await sessionsStore.getThreadDetail(currentProjectId, currentAgentId, currentThreadId);
				if (requestId !== threadDetailRequestId || identity !== threadIdentity()) return;
				const selectedKey = !initial && selectedItem.value ? timelineItemKey(selectedItem.value) : null;
				executions.value = result.executions;
				memory.value = result.memory;
				if (pendingApprovalIdentity.value === identity && result.executions.at(-1)?.status !== "awaiting") pendingApprovalIdentity.value = null;
				if (selectedKey) {
					const nextIndex = items.value.findIndex((item) => timelineItemKey(item) === selectedKey);
					selectTimelineItem(nextIndex >= 0 ? nextIndex : null);
				}
				emit("loaded", result);
			} catch (error) {
				if (requestId !== threadDetailRequestId) return;
				if (initial) toast.showError(error, i18n.baseText("agentSessions.showError.load"));
			} finally {
				if (initial && requestId === threadDetailRequestId) loading.value = false;
			}
		}
		function startThreadDetailRequest(initial) {
			const identity = threadIdentity();
			const request = {
				identity,
				promise: fetchThreadDetail(initial)
			};
			activeRequest = request;
			request.promise.finally(() => {
				if (activeRequest !== request) return;
				activeRequest = void 0;
				if (refreshPending && identity === threadIdentity()) {
					refreshPending = false;
					refreshThreadDetail();
				}
			});
		}
		function refreshThreadDetail() {
			if (activeRequest?.identity === threadIdentity()) {
				refreshPending = true;
				return;
			}
			startThreadDetailRequest(false);
		}
		function onPushMessage(event) {
			if (event.type === "agentExecutionUpdated" && event.data.projectId === props.projectId && event.data.agentId === props.agentId && event.data.threadId === props.threadId) refreshThreadDetail();
		}
		watch(documentVisibility, (visibility) => {
			if (visibility === "visible") refreshThreadDetail();
		});
		watch(() => pushStore.isConnected, (isConnected, wasConnected) => {
			if (isConnected && !wasConnected) refreshThreadDetail();
		});
		onMounted(() => {
			pushStore.pushConnect();
			removePushListener = pushStore.addEventListener(onPushMessage);
		});
		onBeforeUnmount(() => {
			disposed = true;
			threadDetailRequestId++;
			refreshPending = false;
			removePushListener?.();
			pushStore.pushDisconnect();
		});
		watch([
			() => props.projectId,
			() => props.agentId,
			() => props.threadId
		], loadThreadDetail, { immediate: true });
		const searchInput = useTemplateRef("searchInput");
		useKeybindings({ "/": {
			disabled: () => searchInput.value?.disabled ?? false,
			run: () => {
				if (searchInput.value) searchInput.value.focus();
			}
		} });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.panel) }, [
				!loading.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.subHeader)
				}, [createVNode(unref(Input_default), {
					ref_key: "searchInput",
					ref: searchInput,
					modelValue: searchQuery.value,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => searchQuery.value = $event),
					size: "large",
					class: normalizeClass(_ctx.$style.searchInput),
					placeholder: unref(i18n).baseText("agentSessions.timeline.searchPlaceholder"),
					clearable: ""
				}, {
					prefix: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "search",
						size: 12
					})]),
					_: 1
				}, 8, [
					"modelValue",
					"class",
					"placeholder"
				]), createVNode(SessionEventFilter_default, {
					available: filterOptions.value,
					selected: selectedFilters.value,
					onUpdate: _cache[1] || (_cache[1] = (next) => selectedFilters.value = next)
				}, null, 8, ["available", "selected"])], 2)) : createCommentVNode("", true),
				!loading.value ? (openBlock(), createBlock(SessionTimelineChart_default, {
					key: 1,
					items: items.value,
					"session-start": bounds.value.start,
					"session-end": bounds.value.end,
					"visible-kinds": selectedFilters.value,
					"selected-index": highlightedIndex.value,
					onSelect: onChartSelect
				}, null, 8, [
					"items",
					"session-start",
					"session-end",
					"visible-kinds",
					"selected-index"
				])) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [loading.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.loading)
				}, toDisplayString(unref(i18n).baseText("generic.loadingEllipsis")), 3)) : createCommentVNode("", true), !loading.value ? (openBlock(), createBlock(SessionTimelineTable_default, {
					key: 1,
					ref: "timelineTable",
					"project-id": props.projectId,
					"agent-id": props.agentId,
					"thread-id": props.threadId,
					items: items.value,
					"agent-name": props.agentName,
					personalisation: props.personalisation,
					"selected-index": highlightedIndex.value,
					"visible-kinds": selectedFilters.value,
					"search-query": searchQuery.value,
					"notice-index": budgetStop.value?.index,
					"respond-to-approval": respondToBackgroundApproval,
					"pending-approval-run-ids": pendingApprovalRunIds.value,
					memory: memory.value,
					"on-memory-deleted": refreshThreadDetail,
					"approval-item": openApprovalItem.value,
					approval: sessionApproval.value,
					"approval-disabled": approvalDisabled.value,
					onSelect: onTimelineItemSelect,
					onApprove: submitSessionApproval
				}, createSlots({ _: 2 }, [budgetStop.value ? {
					name: "notice",
					fn: withCtx(() => [createVNode(AgentBudgetNoticeCard_default, {
						code: budgetStop.value.code,
						"can-increase": props.increaseBudget !== void 0,
						pending: budgetIncreasePending.value,
						onIncrease: onIncreaseBudget
					}, null, 8, [
						"code",
						"can-increase",
						"pending"
					])]),
					key: "0"
				} : void 0]), 1032, [
					"project-id",
					"agent-id",
					"thread-id",
					"items",
					"agent-name",
					"personalisation",
					"selected-index",
					"visible-kinds",
					"search-query",
					"notice-index",
					"pending-approval-run-ids",
					"memory",
					"approval-item",
					"approval",
					"approval-disabled"
				])) : createCommentVNode("", true)], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_5zbqm_1",
	subHeader: "_subHeader_5zbqm_12",
	search: "_search_5zbqm_23",
	searchInput: "_searchInput_5zbqm_28",
	section: "_section_5zbqm_32",
	loading: "_loading_5zbqm_39"
} }]]);
//#endregion
//#region src/features/agents/views/AgentSessionTimelineView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentSessionTimelineView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSessionTimelineView",
	setup(__props) {
		const i18n = useI18n();
		const threadTitleOf = useThreadTitle();
		const route = useRoute();
		const router = useRouter();
		const sessionsStore = useAgentSessionsStore();
		const { isEnabled: isLangSmithExportEnabled, isExporting, sendSession } = useAgentSessionLangSmithExport();
		const { config: localConfig, fetchConfig, updateConfig } = useAgentConfig();
		const projectId = computed(() => route.params.projectId);
		const agentId = computed(() => route.params.agentId);
		const threadId = computed(() => route.params.threadId);
		const clipboard = useClipboard();
		const toast = useToast();
		const { canUpdate, canUpdate: canDeleteSession } = useAgentPermissions(projectId);
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const isDeletingSession = ref(false);
		let isDisposed = false;
		onScopeDispose(() => {
			isDisposed = true;
		});
		async function copySessionLink() {
			if (!hasLoadedThread.value) return;
			try {
				const { href } = router.resolve({
					name: AGENT_SESSION_DETAIL_VIEW,
					params: {
						projectId: projectId.value,
						agentId: agentId.value,
						threadId: threadId.value
					}
				});
				await clipboard.copy(new URL(href, window.location.origin).href);
				toast.showMessage({
					title: i18n.baseText("agents.builder.preview.more.linkCopied"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.preview.more.copyLinkError"));
			}
		}
		async function deleteSession() {
			if (!hasLoadedThread.value || !canDeleteSession.value || isDeletingSession.value) return;
			const target = {
				projectId: projectId.value,
				agentId: agentId.value,
				threadId: threadId.value
			};
			const isCurrentSession = () => !isDisposed && projectId.value === target.projectId && agentId.value === target.agentId && threadId.value === target.threadId;
			isDeletingSession.value = true;
			try {
				if (await openAgentConfirmationModal({
					title: i18n.baseText("agentSessions.deleteConfirm.headline"),
					description: i18n.baseText("agentSessions.deleteConfirm.message"),
					confirmButtonText: i18n.baseText("agentSessions.deleteConfirm.confirmButtonText"),
					cancelButtonText: i18n.baseText("generic.cancel")
				}) !== "confirm" || !isCurrentSession() || !canDeleteSession.value) return;
				await sessionsStore.deleteThread(target.projectId, target.agentId, target.threadId);
				toast.showMessage({
					title: i18n.baseText("agentSessions.showMessage.deleted"),
					type: "success"
				});
				if (isCurrentSession()) await router.push({
					name: AGENT_SESSIONS_LIST_VIEW,
					params: {
						projectId: target.projectId,
						agentId: target.agentId
					}
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("agentSessions.showError.delete"));
			} finally {
				isDeletingSession.value = false;
			}
		}
		const thread = ref(null);
		const executions = ref([]);
		const triggerSource = computed(() => {
			if (executions.value.length === 0) return null;
			return executions.value[0].source ?? "chat";
		});
		const triggerIcon = computed(() => {
			const source = triggerSource.value;
			if (!source) return "bolt-filled";
			switch (source) {
				case "slack": return "slack";
				case "instance-ai": return "sparkles";
				case "n8n_chat_production": return "message-square";
				case "webhook":
				case "public_api": return "plug";
				default: return "bolt-filled";
			}
		});
		const triggerLabel = computed(() => {
			const source = triggerSource.value;
			if (!source) return "";
			if (source === "chat" || source === "n8n_chat") return i18n.baseText("agentSessions.origin.preview");
			if (source === "instance-ai") return i18n.baseText("agentSessions.origin.instanceAi");
			if (source === "n8n_chat_production") return i18n.baseText("agentSessions.origin.n8nChat");
			if (source === "webhook") return i18n.baseText("agentSessions.origin.webhook");
			if (source === "public_api") return i18n.baseText("agentSessions.origin.publicApi");
			return source.charAt(0).toUpperCase() + source.slice(1);
		});
		const sessionTitle = computed(() => {
			if (!thread.value) return "";
			return truncate(threadTitleOf(thread.value), 64);
		});
		const { projectName, projectIcon } = useAgentProjectBreadcrumb(projectId);
		const projectRoute = computed(() => ({
			name: PROJECT_AGENTS,
			params: { projectId: projectId.value }
		}));
		const agentRoute = computed(() => ({
			name: AGENT_BUILDER_VIEW,
			params: {
				projectId: projectId.value,
				agentId: agentId.value
			}
		}));
		const parentFolderId = ref(null);
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();
		const folderBreadcrumbs = useAgentFolderBreadcrumb(projectId, parentFolderId);
		watch([
			projectId,
			agentId,
			() => settingsStore.isFoldersFeatureEnabled
		], async ([project, agent, foldersEnabled], _, onCleanup) => {
			let current = true;
			onCleanup(() => {
				current = false;
			});
			parentFolderId.value = null;
			if (!foldersEnabled) return;
			try {
				const resource = await getAgent(rootStore.restApiContext, project, agent);
				if (current) parentFolderId.value = resource.parentFolderId ?? null;
			} catch {}
		}, { immediate: true });
		const breadcrumbItems = computed(() => [
			{
				id: projectId.value,
				label: projectName.value ?? i18n.baseText("agents.builder.header.projectFallback"),
				href: router.resolve(projectRoute.value).href
			},
			...folderBreadcrumbs.value,
			{
				id: agentId.value,
				label: thread.value?.agentName ?? "…",
				href: router.resolve(agentRoute.value).href
			}
		]);
		const sessionOptions = computed(() => {
			const sessions = sessionsStore.threads;
			if (sessions.length === 0) return [{
				id: "__empty__",
				label: i18n.baseText("agentSessions.empty"),
				disabled: true
			}];
			return sessions.map((session) => ({
				id: session.id,
				label: truncate(threadTitleOf(session), 64),
				class: session.id === threadId.value ? "session-dropdown-item-active" : void 0,
				data: {
					date: formatDate(session.updatedAt),
					active: session.id === threadId.value
				}
			}));
		});
		const { usage: sessionUsage, duration, onExecutionUpdated } = useAgentSessionUsage(() => thread.value ? {
			thread: thread.value,
			executions: executions.value
		} : null, () => ({}));
		useAgentExecutionUpdates({
			projectId,
			agentId,
			threadId
		}, () => {}, onExecutionUpdated);
		const totalTokens = computed(() => sessionUsage.value.totalTokens);
		const hasLoadedThread = computed(() => thread.value?.id === threadId.value);
		const { canStop, stoppingSessionIds, stop: stopSession } = useAgentSessionStop(projectId, agentId);
		const canStopSession = computed(() => hasLoadedThread.value && canStop.value && executions.value.some(({ status }) => status === "running"));
		function onStopSession() {
			if (canStopSession.value) stopSession(threadId.value);
		}
		const totalCost = computed(() => sessionUsage.value.cost);
		const durationLabel = computed(() => formatDuration(duration.value));
		const sessionMetadata = computed(() => ({
			trigger: {
				source: triggerSource.value,
				icon: triggerIcon.value,
				label: triggerLabel.value
			},
			totalTokens: totalTokens.value,
			totalCost: totalCost.value,
			durationLabel: durationLabel.value
		}));
		function onPanelLoaded(detail) {
			thread.value = detail?.thread ?? null;
			executions.value = detail?.executions ?? [];
		}
		watch([projectId, agentId], async ([nextProjectId, nextAgentId]) => {
			await Promise.all([fetchConfig(nextProjectId, nextAgentId), sessionsStore.fetchThreads(nextProjectId, nextAgentId, { filters: defaultAgentSessionFilters() })]);
		}, { immediate: true });
		function formatDuration(ms) {
			if (!Number.isFinite(ms) || ms <= 0) return "";
			if (ms < 1e3) return `${ms}ms`;
			return `${(ms / 1e3).toFixed(1)}s`;
		}
		function formatDate(fullDate) {
			if (!fullDate) return "";
			const { date, time } = convertToDisplayDate(fullDate);
			return `${date} ${time}`;
		}
		const closeTimeline = useBackOrFallback(() => ({
			name: AGENT_SESSIONS_LIST_VIEW,
			params: {
				projectId: projectId.value,
				agentId: agentId.value
			}
		}));
		function onBreadcrumbSelect(item) {
			if (item.id === projectId.value) router.push(projectRoute.value);
			else if (item.id === agentId.value) router.push(agentRoute.value);
			else router.push({
				name: PROJECT_AGENTS,
				params: { projectId: projectId.value },
				query: { folderId: item.id }
			});
		}
		function onSessionSelect(nextThreadId) {
			if (nextThreadId === "__empty__" || nextThreadId === threadId.value) return;
			router.push({
				name: AGENT_SESSION_DETAIL_VIEW,
				params: {
					projectId: projectId.value,
					agentId: agentId.value,
					threadId: nextThreadId
				}
			});
		}
		/**
		* Raises a budget cap from the timeline's budget notice. Only a persisted cap
		* counts: a stale or failed save would stop the next run against the old cap.
		*/
		async function onIncreaseBudget(payload) {
			const current = localConfig.value;
			if (!canUpdate.value || !current) return false;
			const update = increasedBudgetConfig(current, payload.field, payload.amount);
			if (!update) return false;
			try {
				const result = await updateConfig(projectId.value, agentId.value, {
					...current,
					...update
				});
				if (result.stale) return false;
				localConfig.value = result.config;
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("agentSessions.showError.budget"));
				return false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.view) }, [createVNode(AgentSessionTimelineHeader_default, {
				"breadcrumb-items": breadcrumbItems.value,
				"project-icon": unref(projectIcon),
				"session-title": sessionTitle.value,
				"session-options": sessionOptions.value,
				"show-langsmith-export": unref(isLangSmithExportEnabled) && hasLoadedThread.value,
				"langsmith-export-loading": unref(isExporting),
				metadata: hasLoadedThread.value ? sessionMetadata.value : void 0,
				"has-session": hasLoadedThread.value,
				"can-delete-session": unref(canDeleteSession),
				"is-deleting-session": isDeletingSession.value,
				"show-stop": canStopSession.value,
				"stop-loading": unref(stoppingSessionIds).has(threadId.value),
				onCopyLink: copySessionLink,
				onDeleteSession: deleteSession,
				onBreadcrumbSelect,
				onSessionSelect,
				onLangsmithExport: _cache[0] || (_cache[0] = ($event) => unref(sendSession)({
					projectId: projectId.value,
					agentId: agentId.value,
					threadId: threadId.value
				})),
				onStop: onStopSession,
				onClose: unref(closeTimeline)
			}, null, 8, [
				"breadcrumb-items",
				"project-icon",
				"session-title",
				"session-options",
				"show-langsmith-export",
				"langsmith-export-loading",
				"metadata",
				"has-session",
				"can-delete-session",
				"is-deleting-session",
				"show-stop",
				"stop-loading",
				"onClose"
			]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(AgentSessionTimelinePanel_default, {
				"project-id": projectId.value,
				"agent-id": agentId.value,
				"thread-id": threadId.value,
				"increase-budget": unref(canUpdate) ? onIncreaseBudget : void 0,
				"agent-name": thread.value?.agentName,
				personalisation: unref(localConfig)?.personalisation,
				tools: unref(localConfig)?.tools,
				onLoaded: onPanelLoaded
			}, null, 8, [
				"project-id",
				"agent-id",
				"thread-id",
				"increase-budget",
				"agent-name",
				"personalisation",
				"tools"
			])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	view: "_view_1afvf_1",
	content: "_content_1afvf_8"
} }]]);
//#endregion
export { AgentSessionTimelineView_default as default };
