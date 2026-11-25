import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $d as init_runtime_core_esm_bundler, Aa as require_isEqual, Bd as createBlock, Bf as readonly, Br as require_unset, Cf as useTemplateRef, Cs as TabsRoot_default, Df as withCtx, Eo as require_get, Fd as KeepAlive, Gd as createTextVNode, Hd as createElementBlock, Hf as shallowReactive, Hr as require_set, Il as CollapsibleTrigger_default, Iu as useEventListener, Jd as defineComponent, Jf as toValue, Kd as createVNode, Ku as usePreferredReducedMotion, Md as withKeys, Mf as getCurrentScope, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Oa as v4, Of as withDirectives, Ol as FocusScope_default, Pd as Fragment, Pu as useElementSize, Rd as computed, Rf as onScopeDispose, Rl as CollapsibleRoot_default, Sd as Transition, Si as require_cloneDeep, Sp as toDisplayString, Ss as TabsList_default, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Va as arrayType, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Wf as shallowRef, Xf as unref, Xo as useRouter, Yc as ContextMenuTrigger_default, Yo as useRoute, _d as useTimeoutFn, _p as normalizeClass, al as ContextMenuContent_default, ef as inject, ff as openBlock, hf as renderSlot, if as nextTick, il as ContextMenuItem_default, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, lo as defineStore, mf as renderList, of as onBeforeUnmount, ol as ContextMenuRoot_default, pd as useDebounceFn, pf as provide, qd as defineAsyncComponent, rd as useWindowSize, rf as mergeProps, tl as ContextMenuPortal_default, uf as onUnmounted, xr as require_FileSaver_min, xs as TabsTrigger_default, xu as onClickOutside, yp as normalizeStyle, zd as createBaseVNode, zf as reactive } from "./vendor-Hx42-oQF.js";
import { $M as DropdownMenu_default, $i as clearAssistantAgentLaunch, $r as firstMessageTitle, $u as canvasEventBus, $w as parseMessageBlocks, AE as TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE, AN as i18n, Ai as useInstanceAiSettingsStore, Ar as hasOAuthTokenData, Ay as BUILTIN_CREDENTIALS_DOCS_URL, BE as instanceAiElementAttachmentSchema, BM as SetupPanel_default, BO as isTerminalExecutionStatus, Bi as persistPendingAgent, Bx as LOCAL_STORAGE_INSTANCE_AI_ARTIFACT_LOGS_PANEL_HEIGHT, Cc as INSTANCE_AI_PENDING_AGENT_METADATA_KEY, Ci as getLatestWorkflowSetupResult, Cr as useAiGateway, Ct as consumePendingFirstMessage, DM as CopyInput_default, Dr as useQuickConnect, Dt as getPendingComposerDraft, ED as WORKFLOW_BUILDER_TOOL_NAMES, EE as GENERIC_AUTH_CREDENTIAL_TYPES, Ec as INSTANCE_AI_SETTINGS_VIEW, Ed as findPlaceholderDetails, Ei as isAgentEditingWorkflow, Fi as fetchThread, Fw as makeRestApiRequest, G as useOpenWorkflowInAssistantStore, GE as shouldAutoResolveCredential, Gc as useRunWorkflowApi, Gp as disposeNDVStore, Gx as LOCAL_STORAGE_INSTANCE_AI_SETUP_ITEMS, HE as instanceAiNodesAttachmentSchema, Hc as CredentialIcon_default, Hi as updateThreadMetadata, Ho as listAgentsPage, Ii as fetchThreadDebugRuns, Ik as deepCopy, Ir as InstanceAiEditorCapabilityKey, JA as DialogHeader_default, Jg as useUIStore, Jp as useNDVStore, Jr as useInstanceAiStore, KA as Dialog_default, Kd as useDocumentTitle, Ki as postCloudBrowserReturnControl, Ks as listApps, LM as N8nCallout_default, Li as fetchThreadMessages, Ll as useNodeCreatorStore, Mp as useCredentialsStore, Mw as ResponseError, ND as resolveBuilderToolName, NM as N8nCard_default, Nj as N8nPopover_default, Od as useWorkflowsStore, Or as useCredentialOAuth, Ot as getPendingHandoffContext, Pi as fetchRunDebug, Po as getSystemAgentThread, Qd as disposeWorkflowDocumentStore, Qi as ASSISTANT_AGENT_THREAD_ID, Ql as useAiSimulatedExecutionsStore, Qr as mergeNodeSets, Qw as parseInputExtras, RE as instanceAiAttachmentSchema, Ri as fetchThreadTabs, Rm as getAppNameFromCredType, Rs as loadAppView, SE as AI_GATEWAY_MANAGED_TAG, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Si as getLatestSkillArtifactResult, Sn as ParameterInputList_default, St as consumePendingDraftAttachment, TD as SHARED_BUILDER_TOOL_NAMES, Ti as isAgentEditingAgent, Tj as N8nResizeWrapper_default, Tk as nodeIssuesToString, UA as DialogFooter_default, Ux as LOCAL_STORAGE_INSTANCE_AI_SETUP_COACHMARK_SEEN, VA as isIconOrEmoji, Vd as useWorkflowExecutionStateStore, Vi as saveThreadTabs, Vr as useClipboard, Vx as LOCAL_STORAGE_INSTANCE_AI_CHAT_PANEL_WIDTH_RATIO, WA as DialogBody_default, Wi as fetchCloudBrowserLiveView, Wp as useWorkflowsListStore, Wx as LOCAL_STORAGE_INSTANCE_AI_SETUP_DISMISSED, XM as N8nActionDropdown_default, XS as HOVER_DELAY, Xc as usePushConnectionStore, Xd as createWorkflowDocumentId, Xh as injectStrict, Xi as ASSISTANT_AGENT_ID, YS as CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL, Yi as ASSISTANT_AGENT_ACCEPTED_MIME_TYPES, Yr as useThread, ZA as isRecord$1, Zd as deriveHomeProject, Zi as ASSISTANT_AGENT_PROJECT_ID, Zr as countAttachedNodes, Zw as formatDebugJson, _C as useUsersStore, _N as N8nText_default, _l as useLogsStore, _n as getNodeCredentialTypes, aM as N8nHoverCard_default, aS as CompactParameterHintsKey, aT as parseSystemPromptForDisplay, aa as lookUpAssistantThreadRuntime, ai as getThreadDisplayTitle, bC as useRootStore, bN as N8nSpinner_default, bc as INSTANCE_AI_APP_ID_QUERY, bi as getLatestDataTableResult, bm as useSourceControlStore, br as NodeCredentials_default, c as fetchAssistantAgentThreadTabs, cN as Input_default, cS as ExpressionLocalResolveContextSymbol, cT as summarizeJsonValue, dC as useToast, dS as ResourceLocatorDropdownTeleportedKey, dT as readPendingInstanceAiSetupCredentialSelections, dd as useNodeHelpers, di as createDisplayedExecutionReader, dn as useCredentialTestInBackground, eC as DEBOUNCE_TIME, eT as parseOutputDisplayBlocks, ea as consumePendingAssistantAgentMessage, ei as getAgentBuilderTargetFromThreadMetadata, fN as N8nTooltip_default, fi as turnHasArtifact, gS as WorkflowIdKey, gi as getLatestAgentArtifactResult, hC as useTelemetry, hM as N8nLink_default, hS as WorkflowDocumentStoreKey, hg as createExecutionDataId, hi as getExecutionResultsByWorkflow, hl as isChatNode, ht as buildInstanceAiCredentialHandoffContext, hu as NodeIcon_default, iT as parseStepSummary, ia as knownAssistantThreadRuntime, ii as getPendingAgentTargetFromThreadMetadata, jN as useI18n, jc as INSTANCE_AI_VIEW, ji as useInstanceAiSetupPanelExperiment, jm as fetchDataTablesApi, jp as listenForCredentialChanges, jr as isOAuthCredentialConnected, kN as addCredentialTranslation, kj as N8nSegmentControl_default, kt as getPendingWorkflowAttachment, l as saveAssistantAgentThreadTabs, lO as DOMAIN_RESTRICTION_FIELDS, lS as LogsPanelHostKey, lT as instanceAiSetupCredentialAppliedKey, lf as useEnvFeatureFlag, lk as displayParameter, mb as AI_GATEWAY_UNSUPPORTED_NODE_TYPES, mk as getNodeParametersIssues$1, mt as buildInstanceAiArtifactCredentialQuestion, nD as getResourcePermissions, nT as parseStepCacheBreaks, na as getAssistantAgentLaunch, nd as useWorkflowSaveStore, nf as useWorkflowDocumentStore, ni as getAgentPreviewViewFromThreadMetadata, o as useAssistantAgentThreadsStore, oS as EditorEnabledFeaturesKey, oT as parseUsageSummary, om as setParameterValue, oy as getWorkflow, pj as AnimatedCollapsibleContent_default, pk as getNodeParameters, ps as useRecentWorkflowsStore, pt as buildInstanceAiAgentPreviewHandoffContext, qA as DialogTitle_default, qi as postCloudBrowserTakeOver, qr as provideThread, rT as parseStepConfig, ri as getAppTargetsFromThreadMetadata, sS as EmbeddedCanvasElementKey, sT as stepInstructions, si as threadTargetsAgent, sk as getBrowserId, tN as N8nLoading_default, tT as parseOutputExtras, tf as useExistingWorkflowDocumentStore, ti as getAgentPreviewSessionFromThreadMetadata, uT as instanceAiSetupCredentialSelectionKey, uf as useNodeTypesStore, ui as buildThreadArtifactsContext, vN as N8nIconButton_default, vc as INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY, vd as useExternalHooks, vg as useExecutionDataStore, vi as getLatestAppArtifactResult, vm as useProjectsStore, vn as getNodeParametersIssues, vt as clearPendingComposerDraft, wD as REMOVED_BUILDER_TOOL_NAMES, wi as getLatestWorkflowUpdateResult, wy as TELEMETRY_EVENT, xN as N8nIcon_default, xi as getLatestDeletedDataTableIds, xr as useAiGatewayTopUp, xt as clearPendingWorkflowAttachment, xu as useDataTableStore, yC as useSettingsStore, yN as N8nButton_default, yd as useCanvasStore, yi as getLatestBuildResult, yt as clearPendingHandoffContext, yu as TimeAgo_default, yy as getDebounceTime, zM as SetupConnection_default, zd as disposeWorkflowExecutionStateStore, zi as fetchThreads, zm as getAppNameFromNodeName } from "./app-D5flEmb-.js";
import { t as ProjectIcon_default } from "./ProjectIcon-Dl4TMfdP.js";
import { t as useSidebarLayout } from "./useSidebarLayout-B-invoq-.js";
import { n as LogsPanel_default } from "./useExecutionDebugging-ZPJd0V5q.js";
import { t as useWorkflowInitialization } from "./useWorkflowInitialization-D5r3-lqz.js";
import { i as useArtifactLinks } from "./ChatMarkdown-CnSVNFpG.js";
import { t as MainHeader_default } from "./MainHeader-CtuSDWhH.js";
import { u as useAgentCapabilitySummary } from "./useWorkflowDocumentRenderData-CrajykLm.js";
import { t as CredentialsDropdown_default } from "./CredentialsDropdown-nSv7g1B1.js";
import { n as isSkillNameTakenError } from "./agentSkill-Czni3bZ7.js";
import { t as useAgentReturnContextStore } from "./agentReturnContext.store-CD3vSmxg.js";
import { t as EntityNotFound_default } from "./EntityNotFound-Bf3AHm-k.js";
import { t as EntityUnAuthorised_default } from "./EntityUnAuthorised-gKwm1qc7.js";
import { t as NodeView_default } from "./NodeView-7CG1OaAA.js";
import { t as AgentSkillModal_default } from "./AgentSkillModal-TWvwmeDW.js";
import { t as AgentChatPanel_default } from "./AgentChatPanel-D1FZE16O.js";
import { t as useN8nAssistantIdentity } from "./useN8nAssistantIdentity-DseCiekY.js";
import { A as readVerdictReasoning, C as useApplyAgentEvalSuggestions, D as resolveCaseColumns, E as useAgentEvalsStore, M as toAvatarKind, N as createDeferredPromise, O as readAgentAnswer, S as toDisplayToolCalls, T as useAgentEvalsFlag, _ as AgentEvalExamplesSlider_default, a as agentPreviewContextIcon, b as AgentEvalSuggestionCard_default, c as handoffContextKey, d as useAssistantArtifactThread, f as useAssistantAgentTurnTelemetry, g as useArtifactThread, h as provideArtifactThread, i as useIsAgentWorking, j as readVerdictSuggestion, k as readErrorMessage, l as useBuildingArtifactIds, m as assistantConfirmationExtension, n as AgentBuildingIndicator_default, o as formatAgentPreviewContextLabel, p as useAssistantAgentMessageTelemetry, r as InstanceAiConversation_default, s as getDismissedContextKeys, t as AgentBuilderView_default, u as useAgentMutationRefresh, v as AgentEvalTryRow_default, w as useTestAgentPreviewFlag, x as AgentAvatar_default, y as EvalInitialSample_default } from "./AgentBuilderView-Bt6x4YU7.js";
import { E as useAssistantAgentSetupSavedTelemetry, T as ASSISTANT_AGENT_SETUP_SAVED, d as ConfirmationFooter_default } from "./InstanceAiWorkflowSetup-DBV6NWQo.js";
import { a as CloudBrowserTasksKey, c as NodesAttachmentChips_default, i as InstanceAiInputMenu_default, l as elementAttachmentLabel, o as useCloudBrowserTasks, p as InstanceAiViewHeader_default } from "./LimitedModeNotice-Ct2kcHcR.js";
import { i as deriveServiceName, s as listPlaceholderTitles } from "./templatedAuth.utils-BSmmAPGQ.js";
import { n as ApprovalModeSelector_default, t as useIsAssistantAtMentionsEnabled } from "./useIsAssistantAtMentionsEnabled-9isH3a4_.js";
import { n as DataTableLoadingIndicator_default, t as DataTableTable_default } from "./DataTableTable-BcZqrc1G.js";
import { i as getProtectedInstanceTooltip } from "./sourceControl.utils-wyA1x_2k.js";
import { t as useSkillsStore } from "./skills.store-DN2vnurm.js";
import { t as require_chunk } from "./chunk-DalcE5hN.js";
import { t as assistantAutoApprovalExtension } from "./assistantAutoApproval-C0osa_A0.js";
import { t as assistantHostEventExtensions } from "./assistantHostEvents-CVB8sHqW.js";
import { n as useCredentialForm, t as TemplatedAuthSimpleView_default } from "./TemplatedAuthSimpleView-B-xmsE0e.js";
import { t as CredentialInputs_default } from "./CredentialInputs-DxL-Pnkh.js";
//#region src/app/plugins/telemetry/trackOnPageHide.ts
/**
* Sends a telemetry event that must survive the page hiding or closing. The
* telemetry SDK loses requests that start then, so the backend emits the event
* (see `PAGE_HIDE_EVENTS` in `@n8n/telemetry`). The request uses `fetch` with
* `keepalive`, because the browser lets it finish after the page is gone, and a
* beacon cannot send the `browser-id` header that authentication needs.
*
* The backend sets `user_id` from the session. Telemetry must never fail the
* page, so errors are ignored.
*/
function trackOnPageHide(context, event, properties) {
	fetch(`${context.baseUrl}/telemetry/page-hide`, {
		method: "POST",
		keepalive: true,
		credentials: "include",
		headers: {
			"browser-id": getBrowserId(),
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			event: event.name,
			properties
		})
	}).catch(() => {});
}
//#endregion
//#region src/features/ai/instanceAi/composables/useAssistantAwayTelemetry.ts
init_runtime_core_esm_bundler();
var { INSTANCE_AI } = TELEMETRY_EVENT;
/** Threads the user left with an active run, with the time they left. Outlives the thread view. */
var leftThreads = /* @__PURE__ */ new Map();
/**
* Tracks the user leaving and returning while an Assistant run is active: first
* the thread (another thread or page), then the browser tab (another tab or
* app, or closing the tab). A run is active from its start to its end, so it
* includes a run paused until the user answers. `is_awaiting_user` tells the
* two apart. Every event also reports the current turn and whether it has an
* artifact. The leave events report these as the user leaves, and the return
* events report them as the user returns.
*
* `visibilitychange` fires before a tab closes, so it covers both tab cases.
* The telemetry SDK loses requests that start while a tab closes, so "left n8n"
* goes through `trackOnPageHide`, and the backend emits it.
*/
function useAssistantAwayTelemetry(options) {
	const telemetry = useTelemetry();
	const router = useRouter();
	const rootStore = useRootStore();
	let tabHiddenAt;
	let beforeUnmount;
	onMounted(() => {
		trackReturnToThread();
		document.addEventListener("visibilitychange", onVisibilityChange);
	});
	onBeforeUnmount(() => {
		beforeUnmount = {
			isRunning: options.isRunning(),
			isAwaitingUser: options.isAwaitingUser(),
			turn: options.turn()
		};
	});
	onUnmounted(() => {
		document.removeEventListener("visibilitychange", onVisibilityChange);
		const threadId = options.threadId();
		if (router.currentRoute.value.params.threadId === threadId) return;
		if (!beforeUnmount?.isRunning) return;
		leftThreads.set(threadId, Date.now());
		telemetry.track(INSTANCE_AI.USER_LEFT_AI_ASSISTANT_THREAD_WITH_ACTIVE_RUN, {
			thread_id: threadId,
			is_awaiting_user: beforeUnmount.isAwaitingUser,
			...beforeUnmount.turn
		});
	});
	/**
	* The thread state is empty on return, because leaving a thread disposes its
	* runtime. Wait until it has loaded, so `is_awaiting_user` is the true state.
	*/
	function trackReturnToThread() {
		const threadId = options.threadId();
		const leftAt = leftThreads.get(threadId);
		if (leftAt === void 0) return;
		const returnedAt = Date.now();
		watch(options.isReady, (ready) => {
			if (!ready || leftThreads.get(threadId) !== leftAt) return;
			leftThreads.delete(threadId);
			telemetry.track(INSTANCE_AI.USER_RETURNED_TO_AI_ASSISTANT_THREAD, {
				thread_id: threadId,
				is_awaiting_user: options.isAwaitingUser(),
				...options.turn(),
				time_away_ms: returnedAt - leftAt
			});
		}, { immediate: true });
	}
	function onTabHidden() {
		if (!options.isRunning()) return;
		tabHiddenAt = Date.now();
		trackOnPageHide(rootStore.restApiContext, INSTANCE_AI.USER_LEFT_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN, {
			thread_id: options.threadId(),
			is_awaiting_user: options.isAwaitingUser(),
			...options.turn()
		});
	}
	function onTabVisible() {
		if (tabHiddenAt === void 0) return;
		const timeAway = Date.now() - tabHiddenAt;
		tabHiddenAt = void 0;
		telemetry.track(INSTANCE_AI.USER_RETURNED_TO_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN, {
			thread_id: options.threadId(),
			is_awaiting_user: options.isAwaitingUser(),
			...options.turn(),
			time_away_ms: timeAway
		});
	}
	function onVisibilityChange() {
		if (document.hidden) onTabHidden();
		else onTabVisible();
	}
}
//#endregion
//#region src/features/ai/instanceAi/assistantTurn.ts
/**
* The current turn is the latest user message and the agent work after it.
* Both runtimes map their thread to `ArtifactTurn`, so this reads either.
*/
function getCurrentTurn(turns) {
	const lastUserIndex = turns.findLastIndex((turn) => turn.role === "user");
	return {
		turn_number: turns.filter((turn) => turn.role === "user").length,
		turn_has_artifact: turns.slice(lastUserIndex + 1).some(turnHasArtifact)
	};
}
//#endregion
//#region src/features/ai/instanceAi/artifactAgentTargets.ts
init_runtime_core_esm_bundler();
var ArtifactAgentTargetsKey = Symbol("ArtifactAgentTargets");
function provideArtifactAgentTargets(targets) {
	provide(ArtifactAgentTargetsKey, targets);
}
/** The provided agent bindings, else the ones of the thread runtime. */
function useArtifactAgentTargets() {
	return inject(ArtifactAgentTargetsKey, null) ?? useThreadRuntimeAgentTargets();
}
/** The agent bindings in the thread metadata of the current runtime. */
function useThreadRuntimeAgentTargets() {
	const thread = useThread();
	const instanceAiStore = useInstanceAiStore();
	const rootStore = useRootStore();
	return {
		bind: async (target) => {
			const metadata = instanceAiStore.getThreadMetadata(thread.id);
			const bound = getAgentBuilderTargetFromThreadMetadata(metadata);
			const pending = getPendingAgentTargetFromThreadMetadata(metadata);
			if (bound?.agentId === target.agentId && bound.projectId === target.projectId && bound.name === target.name && !pending) return;
			await instanceAiStore.updateThreadMetadata(thread.id, {
				[INSTANCE_AI_PENDING_AGENT_METADATA_KEY]: null,
				[INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY]: { ...target }
			});
		},
		persistPendingAgent: async (request) => {
			const { agent, thread: updatedThread } = await persistPendingAgent(rootStore.restApiContext, thread.id, request);
			return {
				agent,
				commit: () => instanceAiStore.setThreadMetadata(thread.id, updatedThread.metadata)
			};
		}
	};
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiAgentPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var InstanceAiAgentPreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiAgentPreview",
	props: {
		projectId: {},
		agentId: {},
		previewSessionId: {},
		previewOpen: { type: Boolean },
		previewChatTarget: {},
		pending: { type: Boolean }
	},
	emits: ["preview-open-change", "assistant-handoff"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const thread = useArtifactThread();
		const agentTargets = useArtifactAgentTargets();
		/**
		* Props of an unmounted instance keep their last values, so a target comparison
		* alone cannot tell "still showing this artifact" from "torn down while the
		* request was in flight". Both must be false before a response touches shared
		* thread state.
		*/
		let mounted = true;
		onBeforeUnmount(() => {
			mounted = false;
		});
		const isAgentBuilding = computed(() => isAgentEditingAgent(thread.artifactTurns, props.agentId));
		const showBuildingIndicator = computed(() => isAgentBuilding.value || thread.activeArtifactId === props.agentId && (thread.isSendingMessage || thread.isStreaming));
		async function syncAgentTarget(name) {
			await agentTargets.bind({
				agentId: props.agentId,
				projectId: props.projectId,
				name
			});
		}
		/**
		* Persist the pending artifact: one request creates (or adopts, when the chat
		* already created it under the same id) the agent and replaces this thread's
		* pending marker with the bound target. The builder treats resolution as the
		* acknowledgement, so the binding is durable before it stops drafting.
		*/
		async function persistAgent(target) {
			const { agent, commit } = await agentTargets.persistPendingAgent(target);
			if (mounted && props.projectId === target.projectId && props.agentId === target.agentId) commit();
			return agent;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.root) }, [createVNode(Transition, { name: "agent-building-indicator" }, {
				default: withCtx(() => [showBuildingIndicator.value ? (openBlock(), createBlock(AgentBuildingIndicator_default, { key: 0 })) : createCommentVNode("", true)]),
				_: 1
			}), createVNode(AgentBuilderView_default, {
				"artifact-mode": "",
				"artifact-project-id": props.projectId,
				"artifact-agent-id": props.agentId,
				"artifact-preview-session-id": props.previewSessionId,
				"artifact-preview-open": props.previewOpen,
				"artifact-preview-chat-target": props.previewChatTarget,
				"artifact-agent-pending": props.pending,
				"artifact-editing-locked": isAgentBuilding.value,
				"artifact-persist-agent": persistAgent,
				onPreviewOpenChange: _cache[0] || (_cache[0] = ($event) => emit("preview-open-change", $event)),
				onAssistantHandoff: _cache[1] || (_cache[1] = ($event) => emit("assistant-handoff", $event)),
				onNameSaved: syncAgentTarget
			}, null, 8, [
				"artifact-project-id",
				"artifact-agent-id",
				"artifact-preview-session-id",
				"artifact-preview-open",
				"artifact-preview-chat-target",
				"artifact-agent-pending",
				"artifact-editing-locked"
			])], 2);
		};
	}
}), [["__cssModules", { "$style": { root: "_root_1tkty_1" } }]]);
//#endregion
//#region src/features/ai/instanceAi/composables/useCloudBrowserLiveViews.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var CloudBrowserLiveViewsKey = Symbol("CloudBrowserLiveViews");
/**
* Fetches a task's live view again. Taking over and giving control back do not change the
* session key, so the view only shows who has control after this.
*/
var CloudBrowserLiveViewRefreshKey = Symbol("CloudBrowserLiveViewRefresh");
/** Set on every live view iframe, with the task id, so a message from the frame leads to its task. */
var FRAME_TASK_ATTRIBUTE = "data-cloud-browser-task-id";
/** Set on every live view iframe, with the id of the window it shows. */
var FRAME_WINDOW_ATTRIBUTE = "data-cloud-browser-window-id";
/** What Browserbase's live view posts to its parent when its session ends or its connection drops. */
var DISCONNECTED_MESSAGE = "browserbase-disconnected";
/** The task and window whose live view iframe sent the message, if it came from one of them. */
function frameOfMessage(event) {
	for (const frame of document.querySelectorAll(`iframe[${FRAME_TASK_ATTRIBUTE}]`)) {
		if (frame.contentWindow !== event.source) continue;
		if (new URL(frame.src).origin !== event.origin) return void 0;
		const taskId = frame.getAttribute(FRAME_TASK_ATTRIBUTE);
		if (!taskId) return void 0;
		return {
			taskId,
			windowId: frame.getAttribute(FRAME_WINDOW_ATTRIBUTE) ?? void 0
		};
	}
}
/**
* The next view of a session the client already shows. The same window keeps its link, so its
* frame does not reload. A new window keeps the current one loaded behind it. Going back to the
* window behind uses that loaded frame.
*/
function nextViewInSession(current, next) {
	if (next.status !== "live" || current?.status !== "live") return next;
	if (next.windowId === current.windowId) return {
		...next,
		liveViewUrl: current.liveViewUrl,
		background: current.background
	};
	if (next.windowId === current.background?.windowId) return {
		...next,
		liveViewUrl: current.background.liveViewUrl
	};
	return {
		...next,
		background: {
			windowId: current.windowId,
			liveViewUrl: current.liveViewUrl
		}
	};
}
/** The session part of a task's session key. The rest counts the session's window changes. */
function sessionOfKey(sessionKey) {
	return sessionKey.split(":")[0];
}
/**
* The live view for embedding. Without `navbar`, Browserbase's own bar (address and
* navigation buttons) is hidden.
*/
function embeddedLiveViewUrl(href, { navbar = false } = {}) {
	try {
		const url = new URL(href);
		if (navbar) url.searchParams.delete("navbar");
		else url.searchParams.set("navbar", "false");
		return url.toString();
	} catch {
		return href;
	}
}
/**
* The live view of each running cloud browser task, by task id. Fetched when the agent opens a
* session, every few seconds until the browser is live, and again for each new session, since the
* link shows the session's tab whatever page it is on. Create it once per thread view and provide
* it.
*/
function useCloudBrowserLiveViews(tasks, threadId) {
	const rootStore = useRootStore();
	const views = reactive(/* @__PURE__ */ new Map());
	const fetchedKeys = /* @__PURE__ */ new Map();
	const retryTimers = /* @__PURE__ */ new Map();
	const inFlightRefreshRequests = /* @__PURE__ */ new Map();
	function clearRetry(taskId) {
		clearTimeout(retryTimers.get(taskId));
		retryTimers.delete(taskId);
	}
	/** `sameSession` when the task still runs the session the client shows. */
	async function refresh(taskId, { sameSession = false } = {}) {
		const sessionKey = fetchedKeys.get(taskId);
		if (!sessionKey) return;
		clearRetry(taskId);
		const request = fetchCloudBrowserLiveView(rootStore.restApiContext, threadId(), taskId).catch(() => ({ status: "starting" }));
		inFlightRefreshRequests.set(taskId, request);
		const next = await request;
		if (inFlightRefreshRequests.get(taskId) !== request) return;
		inFlightRefreshRequests.delete(taskId);
		if (fetchedKeys.get(taskId) !== sessionKey) return;
		views.set(taskId, sameSession ? nextViewInSession(views.get(taskId), next) : next);
		if (next.status !== "live" && next.status !== "not-found") retryTimers.set(taskId, setTimeout(() => {
			refresh(taskId);
		}, CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL));
	}
	watch(tasks, (current) => {
		const running = new Set(current.map((task) => task.taskId));
		for (const taskId of [...fetchedKeys.keys()]) {
			if (running.has(taskId)) continue;
			clearRetry(taskId);
			fetchedKeys.delete(taskId);
			inFlightRefreshRequests.delete(taskId);
			views.delete(taskId);
		}
		for (const task of current) {
			if (!task.sessionKey) continue;
			const fetchedKey = fetchedKeys.get(task.taskId);
			if (fetchedKey === task.sessionKey) continue;
			fetchedKeys.set(task.taskId, task.sessionKey);
			if (!views.has(task.taskId)) views.set(task.taskId, { status: "loading" });
			const sameSession = fetchedKey !== void 0 && sessionOfKey(fetchedKey) === sessionOfKey(task.sessionKey);
			refresh(task.taskId, { sameSession });
		}
	}, { immediate: true });
	useEventListener(window, "message", (event) => {
		if (event.data !== DISCONNECTED_MESSAGE) return;
		const frame = frameOfMessage(event);
		if (!frame || !fetchedKeys.has(frame.taskId)) return;
		const { taskId, windowId } = frame;
		const view = views.get(taskId);
		if (view?.status === "live" && windowId !== view.windowId) {
			if (windowId === view.background?.windowId) views.set(taskId, {
				...view,
				background: void 0
			});
			return;
		}
		if (view?.status === "live" && view.background) {
			views.set(taskId, {
				...view,
				...view.background,
				background: void 0
			});
			refresh(taskId, { sameSession: true });
			return;
		}
		views.set(taskId, { status: "loading" });
		refresh(taskId);
	});
	onScopeDispose(() => {
		for (const taskId of [...retryTimers.keys()]) clearRetry(taskId);
		fetchedKeys.clear();
	});
	return {
		views,
		refresh: (taskId) => {
			refresh(taskId, { sameSession: true });
		}
	};
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiCloudBrowsersCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$14 = ["title"];
var _hoisted_2$6 = [
	"src",
	"data-cloud-browser-task-id",
	"data-cloud-browser-window-id"
];
var _hoisted_3$3 = ["onClick"];
var InstanceAiCloudBrowsersCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiCloudBrowsersCard",
	setup(__props) {
		/**
		* The Browsers card in the sidebar: one row per running cloud browser task, with a small
		* read-only live view that opens the browser tab, and a stop button. A finished task stays, with
		* no browser, until its result reaches the assistant.
		*/
		const i18n = useI18n();
		const tasks = inject(CloudBrowserTasksKey, void 0);
		const thread = tasks ? useThread() : void 0;
		const liveViews = inject(CloudBrowserLiveViewsKey, void 0);
		const openCloudBrowserTab = inject("openCloudBrowserTab", void 0);
		const stateIcons = {
			running: {
				icon: "spinner",
				spin: true,
				className: "runningIcon"
			},
			done: {
				icon: "circle-check",
				spin: false,
				className: "doneIcon"
			},
			failed: {
				icon: "circle-x",
				spin: false,
				className: "failedIcon"
			}
		};
		const rows = computed(() => (tasks?.value ?? []).filter((task) => task.state !== "running" || liveViews?.get(task.taskId)?.status !== "not-found").map((task) => {
			const view = liveViews?.get(task.taskId);
			return {
				task,
				stateIcon: stateIcons[task.state],
				subtitle: subtitleOf(task),
				liveViewUrl: task.state === "running" && view?.status === "live" ? embeddedLiveViewUrl(view.liveViewUrl) : void 0,
				windowId: view?.status === "live" ? view.windowId : void 0
			};
		}));
		function subtitleOf(task) {
			if (task.state === "done") return i18n.baseText("instanceAi.cloudBrowser.doneWaitingToSend");
			if (task.state === "failed") return i18n.baseText("instanceAi.cloudBrowser.failedWaitingToSend");
			const view = liveViews?.get(task.taskId);
			if (view?.status === "live" && view.userHasTakenOver) return i18n.baseText("instanceAi.cloudBrowser.youHaveControl");
			if (task.userAction) return i18n.baseText("instanceAi.cloudBrowser.needsYou");
			if (view?.status === "live") return i18n.baseText("instanceAi.cloudBrowser.working");
			if (view?.status === "disconnected") return i18n.baseText("instanceAi.cloudBrowser.disconnected");
			return i18n.baseText("instanceAi.cloudBrowser.opening");
		}
		return (_ctx, _cache) => {
			return rows.value.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.group),
				"data-test-id": "instance-ai-cloud-browsers"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [createVNode(unref(N8nHeading_default), {
				tag: "h3",
				size: "small",
				class: normalizeClass(_ctx.$style.sectionTitle)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.cardTitle")), 1)]),
				_: 1
			}, 8, ["class"])], 2), (openBlock(true), createElementBlock(Fragment, null, renderList(rows.value, ({ task, stateIcon, subtitle, liveViewUrl, windowId }) => {
				return openBlock(), createElementBlock("div", {
					key: task.taskId,
					class: normalizeClass(_ctx.$style.row),
					"data-test-id": "instance-ai-cloud-browser-row"
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [
					createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.titleLine),
						"aria-hidden": "true"
					}, [createVNode(unref(N8nIcon_default), {
						icon: stateIcon.icon,
						spin: stateIcon.spin,
						class: normalizeClass(_ctx.$style[stateIcon.className]),
						size: "small"
					}, null, 8, [
						"icon",
						"spin",
						"class"
					])], 2),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.text) }, [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.name),
						title: task.title
					}, toDisplayString(task.title), 11, _hoisted_1$14), createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.subtitle),
						"data-test-id": "instance-ai-cloud-browser-status"
					}, toDisplayString(subtitle), 3)], 2),
					task.state === "running" ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.titleLine)
					}, [createVNode(unref(N8nIconButton_default), {
						icon: "filled-square",
						variant: "ghost",
						size: "xsmall",
						"aria-label": unref(i18n).baseText("instanceAi.cloudBrowser.stop"),
						title: unref(i18n).baseText("instanceAi.cloudBrowser.stop"),
						"data-test-id": "instance-ai-cloud-browser-stop",
						onClick: ($event) => unref(thread)?.cancelBackgroundTask(task.taskId)
					}, null, 8, [
						"aria-label",
						"title",
						"onClick"
					])], 2)) : createCommentVNode("", true)
				], 2), task.state === "running" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.thumbnail),
					"data-test-id": "instance-ai-cloud-browser-live-view"
				}, [liveViewUrl ? (openBlock(), createElementBlock("iframe", {
					key: 0,
					src: liveViewUrl,
					class: normalizeClass(_ctx.$style.thumbnailFrame),
					"data-cloud-browser-task-id": task.taskId,
					"data-cloud-browser-window-id": windowId,
					tabindex: "-1",
					"aria-hidden": "true",
					sandbox: "allow-same-origin allow-scripts"
				}, null, 10, _hoisted_2$6)) : createCommentVNode("", true), createBaseVNode("button", {
					type: "button",
					class: normalizeClass(_ctx.$style.thumbnailOverlay),
					"data-test-id": "instance-ai-cloud-browser-open",
					onClick: ($event) => unref(openCloudBrowserTab)?.(task.taskId)
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.openButton) }, toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.openBrowser")), 3)], 10, _hoisted_3$3)], 2)) : createCommentVNode("", true)], 2);
			}), 128))], 2)], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	group: "_group_1clap_1",
	section: "_section_1clap_10",
	sectionHeader: "_sectionHeader_1clap_17",
	sectionTitle: "_sectionTitle_1clap_22",
	row: "_row_1clap_26",
	header: "_header_1clap_33",
	titleLine: "_titleLine_1clap_43",
	runningIcon: "_runningIcon_1clap_50",
	doneIcon: "_doneIcon_1clap_54",
	failedIcon: "_failedIcon_1clap_58",
	text: "_text_1clap_62",
	name: "_name_1clap_69",
	subtitle: "_subtitle_1clap_78",
	thumbnail: "_thumbnail_1clap_85",
	thumbnailFrame: "_thumbnailFrame_1clap_95",
	thumbnailOverlay: "_thumbnailOverlay_1clap_104",
	openButton: "_openButton_1clap_122"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiArtifactsPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$13 = [
	"href",
	"title",
	"aria-label",
	"onClick"
];
var _hoisted_2$5 = ["title"];
var InstanceAiArtifactsPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiArtifactsPanel",
	setup(__props) {
		const projectsStore = useProjectsStore();
		const store = useInstanceAiStore();
		const i18n = useI18n();
		const { artifactHref: resolveArtifactHref } = useArtifactLinks();
		const thread = useArtifactThread();
		const project = computed(() => {
			if (!thread.projectId && thread.hydrationStatus !== "ready") return void 0;
			const match = projectsStore.myProjects.find((p) => p.id === thread.projectId);
			if (!match) return {
				name: i18n.baseText("instanceAi.artifactsPanel.unknownProject"),
				icon: {
					type: "icon",
					value: "circle-help"
				}
			};
			const isPersonal = match.type === "personal";
			const icon = isIconOrEmoji(match.icon) ? match.icon : {
				type: "icon",
				value: "layers"
			};
			return {
				name: isPersonal ? i18n.baseText("instanceAi.artifactsPanel.personalSpace") : match.name,
				icon: isPersonal ? {
					type: "icon",
					value: "user"
				} : icon
			};
		});
		const openPreview = inject("openWorkflowPreview", void 0);
		const openDataTablePreview = inject("openDataTablePreview", void 0);
		const openAgentPreview = inject("openAgentPreview", void 0);
		const openSkillPreview = inject("openSkillPreview", void 0);
		const openAppPreview = inject("openAppPreview", void 0);
		const pendingComposerContext = inject("pendingComposerContext", void 0);
		const dismissPendingComposerContext = inject("dismissPendingComposerContext", void 0);
		function handleArtifactClick(artifact, e) {
			if (artifact.type === "agent" && artifact.pending) e.preventDefault();
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			if (artifact.type === "workflow" && artifact.id) {
				if (!openPreview) return;
				e.preventDefault();
				openPreview(artifact.id);
			} else if (artifact.type === "data-table" && artifact.id) {
				if (!artifact.projectId || !openDataTablePreview) return;
				e.preventDefault();
				openDataTablePreview(artifact.id, artifact.projectId);
			} else if (artifact.type === "agent" && artifact.id) {
				if (!artifact.projectId || !openAgentPreview) return;
				e.preventDefault();
				openAgentPreview(artifact.id, artifact.projectId);
			} else if (artifact.type === "skill" && artifact.id) {
				if (!openSkillPreview) return;
				e.preventDefault();
				openSkillPreview(artifact.id);
			} else if (artifact.type === "app" && artifact.id) {
				if (!openAppPreview) return;
				e.preventDefault();
				openAppPreview(artifact.id);
			}
		}
		const tasks = computed(() => thread.currentTasks);
		const visibleTasks = computed(() => tasks.value?.tasks ?? []);
		const hasTasks = computed(() => visibleTasks.value.length > 0);
		const statusIconMap = {
			todo: {
				icon: "circle",
				spin: false,
				className: "todoIcon"
			},
			in_progress: {
				icon: "spinner",
				spin: true,
				className: "inProgressIcon"
			},
			done: {
				icon: "check",
				spin: false,
				className: "doneIcon"
			},
			failed: {
				icon: "circle-x",
				spin: false,
				className: "failedIcon"
			},
			cancelled: {
				icon: "ban",
				spin: false,
				className: "cancelledIcon"
			}
		};
		const buildingArtifactIds = useBuildingArtifactIds();
		const artifacts = computed(() => {
			const result = [];
			for (const entry of thread.producedArtifacts.values()) if (entry.type === "workflow" || entry.type === "data-table" || entry.type === "agent" || entry.type === "skill" || entry.type === "app") result.push(entry);
			return result;
		});
		const artifactIconMap = {
			workflow: "workflow",
			"data-table": "table",
			agent: "robot",
			skill: "book-open",
			app: "layout-template"
		};
		function artifactHref(artifact) {
			if (artifact.type === "agent" && artifact.pending) return "#";
			return resolveArtifactHref(artifact.type, artifact.id, artifact.projectId) ?? "#";
		}
		function openArtifactLabel(name) {
			return i18n.baseText("instanceAi.artifactsPanel.openArtifact", { interpolate: { name } });
		}
		function contextEntryFor(context) {
			const key = handoffContextKey(context);
			if (context.source === "setup-panel-execute") return void 0;
			if (context.source === "migration-report") return void 0;
			if (context.source === "agent-preview") return {
				key,
				icon: agentPreviewContextIcon(context.agentIcon),
				name: formatAgentPreviewContextLabel(context, (textKey, options) => i18n.baseText(textKey, options), thread.producedArtifacts.get(context.agentId)?.name),
				subtitle: i18n.baseText("instanceAi.artifactsPanel.context.addedToContext")
			};
			return {
				key,
				icon: "key-round",
				name: context.credential.displayName,
				subtitle: i18n.baseText("instanceAi.artifactsPanel.context.credentialModal")
			};
		}
		const contextEntries = computed(() => {
			const entries = [];
			const seen = /* @__PURE__ */ new Set();
			const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
			const pending = pendingComposerContext?.value;
			const pendingEntry = pending ? contextEntryFor(pending) : void 0;
			if (pendingEntry) {
				seen.add(pendingEntry.key);
				entries.push(pendingEntry);
			}
			for (const turn of [...thread.artifactTurns].reverse()) {
				if (turn.role !== "user" || !turn.context) continue;
				const key = handoffContextKey(turn.context);
				if (seen.has(key) || dismissedKeys.has(key)) continue;
				const entry = contextEntryFor(turn.context);
				if (!entry) continue;
				seen.add(key);
				entries.push(entry);
			}
			return entries;
		});
		async function dismissContext(key) {
			const pending = pendingComposerContext?.value;
			if (pending && handoffContextKey(pending) === key) {
				dismissPendingComposerContext?.(key);
				return;
			}
			const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
			dismissedKeys.add(key);
			await store.updateThreadMetadata(thread.id, { dismissedContextKeys: [...dismissedKeys] });
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				class: normalizeClass(_ctx.$style.panel),
				"data-test-id": "instance-ai-artifacts-sidebar"
			}, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.group),
				"data-test-id": "instance-ai-artifacts-sidebar-group"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [createVNode(unref(N8nHeading_default), {
					tag: "h3",
					size: "small",
					class: normalizeClass(_ctx.$style.sectionTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.artifactsPanel.project")), 1)]),
					_: 1
				}, 8, ["class"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.artifactList) }, [project.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.artifactRow])
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.artifactIconWrap) }, [createVNode(ProjectIcon_default, {
					icon: project.value.icon,
					size: "small",
					"border-less": ""
				}, null, 8, ["icon"])], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.artifactName) }, toDisplayString(project.value.name), 3)], 2)) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.artifactRow),
					"data-test-id": "instance-ai-artifacts-project-loading"
				}, [createBaseVNode("span", { class: normalizeClass([_ctx.$style.artifactIconWrap, _ctx.$style.iconSkeleton]) }, [createVNode(unref(N8nLoading_default), { variant: "custom" })], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.nameSkeleton) }, [createVNode(unref(N8nLoading_default), { variant: "custom" })], 2)], 2))], 2)], 2),
				contextEntries.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.section)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [createVNode(unref(N8nHeading_default), {
					tag: "h3",
					size: "small",
					class: normalizeClass(_ctx.$style.sectionTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.artifactsPanel.context.title")), 1)]),
					_: 1
				}, 8, ["class"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.contextList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(contextEntries.value, (entry) => {
					return openBlock(), createElementBlock("div", {
						key: entry.key,
						class: normalizeClass(_ctx.$style.contextRow),
						"data-test-id": "instance-ai-context-row"
					}, [
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.artifactIconWrap) }, [createVNode(unref(N8nIcon_default), {
							icon: entry.icon,
							size: "large",
							class: normalizeClass(_ctx.$style.artifactIcon)
						}, null, 8, ["icon", "class"])], 2),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.contextText) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.contextName) }, toDisplayString(entry.name), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.contextSubtitle) }, toDisplayString(entry.subtitle), 3)], 2),
						createVNode(unref(N8nIconButton_default), {
							icon: "x",
							variant: "ghost",
							size: "xsmall",
							class: normalizeClass(_ctx.$style.contextDismiss),
							"aria-label": unref(i18n).baseText("instanceAi.artifactsPanel.context.dismiss"),
							title: unref(i18n).baseText("instanceAi.artifactsPanel.context.dismiss"),
							"data-test-id": "instance-ai-context-dismiss",
							onClick: ($event) => dismissContext(entry.key)
						}, null, 8, [
							"class",
							"aria-label",
							"title",
							"onClick"
						])
					], 2);
				}), 128))], 2)], 2)) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [createVNode(unref(N8nHeading_default), {
					tag: "h3",
					size: "small",
					class: normalizeClass(_ctx.$style.sectionTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.artifactsPanel.title")), 1)]),
					_: 1
				}, 8, ["class"])], 2), artifacts.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.artifactList)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(artifacts.value, (artifact) => {
					return openBlock(), createElementBlock("a", {
						key: artifact.id,
						href: artifactHref(artifact),
						class: normalizeClass([_ctx.$style.artifactRow, artifact.archived && _ctx.$style.artifactRowArchived]),
						title: artifact.name,
						"aria-label": openArtifactLabel(artifact.name),
						onClick: ($event) => handleArtifactClick(artifact, $event)
					}, [
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.artifactIconWrap) }, [unref(buildingArtifactIds).has(artifact.id) ? (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 0,
							icon: "spinner",
							spin: "",
							size: "large",
							class: normalizeClass(_ctx.$style.artifactIcon),
							"data-test-id": "instance-ai-artifact-building-spinner"
						}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
							key: 1,
							icon: artifactIconMap[artifact.type] ?? "file",
							size: "large",
							class: normalizeClass(_ctx.$style.artifactIcon)
						}, null, 8, ["icon", "class"]))], 2),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.artifactName) }, toDisplayString(artifact.name), 3),
						artifact.archived ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.archivedBadge)
						}, toDisplayString(unref(i18n).baseText("instanceAi.artifactsPanel.archived")), 3)) : createCommentVNode("", true)
					], 10, _hoisted_1$13);
				}), 128))], 2)) : unref(thread).hydrationStatus !== "ready" ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.artifactList),
					"data-test-id": "instance-ai-artifacts-list-loading"
				}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.artifactRow, _ctx.$style.artifactRowSkeleton]) }, [createBaseVNode("span", { class: normalizeClass([_ctx.$style.artifactIconWrap, _ctx.$style.artifactIconSkeleton]) }, [createVNode(unref(N8nLoading_default), { variant: "custom" })], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.nameSkeleton) }, [createVNode(unref(N8nLoading_default), { variant: "custom" })], 2)], 2)], 2)) : (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.emptyState)
				}, [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("instanceAi.artifactsPanel.noArtifacts")), 1)], 2))], 2),
				hasTasks.value ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.section)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [createVNode(unref(N8nHeading_default), {
					tag: "h3",
					size: "small",
					class: normalizeClass(_ctx.$style.sectionTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.artifactsPanel.tasks")), 1)]),
					_: 1
				}, 8, ["class"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.taskList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(visibleTasks.value, (task) => {
					return openBlock(), createElementBlock("div", {
						key: task.id,
						class: normalizeClass([
							_ctx.$style.task,
							task.status === "done" ? _ctx.$style.doneTask : "",
							task.status === "failed" ? _ctx.$style.failedTask : "",
							task.status === "cancelled" ? _ctx.$style.cancelledTask : ""
						])
					}, [createVNode(unref(N8nIcon_default), {
						icon: statusIconMap[task.status].icon,
						class: normalizeClass(_ctx.$style[statusIconMap[task.status].className]),
						spin: statusIconMap[task.status].spin,
						size: "medium"
					}, null, 8, [
						"icon",
						"class",
						"spin"
					]), createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.taskDescription),
						title: task.description
					}, toDisplayString(task.description), 11, _hoisted_2$5)], 2);
				}), 128))], 2)], 2)) : createCommentVNode("", true)
			], 2), createVNode(InstanceAiCloudBrowsersCard_default)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_1plbn_1",
	group: "_group_1plbn_11",
	section: "_section_1plbn_19",
	sectionHeader: "_sectionHeader_1plbn_40",
	sectionTitle: "_sectionTitle_1plbn_49",
	artifactList: "_artifactList_1plbn_54",
	contextList: "_contextList_1plbn_59",
	contextRow: "_contextRow_1plbn_64",
	contextText: "_contextText_1plbn_71",
	contextName: "_contextName_1plbn_78",
	contextSubtitle: "_contextSubtitle_1plbn_87",
	contextDismiss: "_contextDismiss_1plbn_96",
	artifactRow: "_artifactRow_1plbn_101",
	artifactIconWrap: "_artifactIconWrap_1plbn_123",
	artifactIcon: "_artifactIcon_1plbn_123",
	artifactName: "_artifactName_1plbn_134",
	iconSkeleton: "_iconSkeleton_1plbn_146",
	nameSkeleton: "_nameSkeleton_1plbn_151",
	artifactRowSkeleton: "_artifactRowSkeleton_1plbn_158",
	artifactIconSkeleton: "_artifactIconSkeleton_1plbn_162",
	artifactRowArchived: "_artifactRowArchived_1plbn_167",
	archivedBadge: "_archivedBadge_1plbn_174",
	emptyState: "_emptyState_1plbn_184",
	taskList: "_taskList_1plbn_195",
	task: "_task_1plbn_195",
	doneTask: "_doneTask_1plbn_210",
	failedTask: "_failedTask_1plbn_215",
	cancelledTask: "_cancelledTask_1plbn_219",
	taskDescription: "_taskDescription_1plbn_223",
	todoIcon: "_todoIcon_1plbn_232",
	inProgressIcon: "_inProgressIcon_1plbn_236",
	doneIcon: "_doneIcon_1plbn_240",
	failedIcon: "_failedIcon_1plbn_247",
	cancelledIcon: "_cancelledIcon_1plbn_251"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiAppPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiAppPreview.vue
var InstanceAiAppPreview_default = /* @__PURE__ */ defineComponent({
	__name: "InstanceAiAppPreview",
	props: {
		projectId: {},
		appId: {},
		refreshKey: {}
	},
	emits: ["deleted"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const store = useInstanceAiStore();
		const AppView = defineAsyncComponent(loadAppView);
		const appView = useTemplateRef("appView");
		watch(() => props.refreshKey, async () => await appView.value?.refresh());
		function addElementToChat(element) {
			store.stageElement({
				type: "element",
				appId: props.appId,
				...element
			});
			store.requestComposerFocus();
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(AppView), {
				ref_key: "appView",
				ref: appView,
				key: __props.appId,
				"project-id": __props.projectId,
				"app-id": __props.appId,
				inspectable: "",
				"element-selected": unref(store).hasComposerElementFor(__props.appId),
				"data-test-id": "instance-ai-app-preview",
				onDeleted: _cache[0] || (_cache[0] = ($event) => emit("deleted", $event)),
				onElementSelected: addElementToChat
			}, null, 8, [
				"project-id",
				"app-id",
				"element-selected"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiDataTablePreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$12 = ["aria-busy"];
var _hoisted_2$4 = [
	"aria-hidden",
	"inert",
	"data-table-id"
];
var InstanceAiDataTablePreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiDataTablePreview",
	props: {
		dataTableId: {},
		projectId: {},
		refreshKey: { default: 0 }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const dataTableStore = useDataTableStore();
		const sourceControlStore = useSourceControlStore();
		const tableSlots = shallowRef({
			displayed: null,
			pending: null
		});
		const tables = computed(() => [tableSlots.value.displayed, tableSlots.value.pending].filter((table) => table !== null));
		const isLoading = ref(false);
		const fetchError = ref(null);
		const requestKey = ref(0);
		const isAgentWorking = useIsAgentWorking();
		const isSchemaReadOnly = computed(() => sourceControlStore.preferences.branchReadOnly);
		const schemaReadOnlyTooltip = computed(() => isSchemaReadOnly.value ? getProtectedInstanceTooltip() : void 0);
		function showTable(key) {
			const { pending } = tableSlots.value;
			if (pending?.key !== key) return;
			tableSlots.value = {
				displayed: pending,
				pending: null
			};
			isLoading.value = false;
		}
		function onLoadError(key) {
			if (tableSlots.value.pending?.key !== key) return;
			tableSlots.value = {
				displayed: null,
				pending: null
			};
			isLoading.value = false;
			fetchError.value = i18n.baseText("instanceAi.dataTablePreview.fetchError");
		}
		watch(() => [
			props.dataTableId,
			props.projectId,
			props.refreshKey
		], async ([id, projectId], _previous, onCleanup) => {
			let cancelled = false;
			onCleanup(() => {
				cancelled = true;
			});
			tableSlots.value = {
				displayed: tableSlots.value.displayed,
				pending: null
			};
			fetchError.value = null;
			isLoading.value = !!id && !!projectId;
			if (!id || !projectId) {
				tableSlots.value = {
					displayed: null,
					pending: null
				};
				return;
			}
			const key = ++requestKey.value;
			const result = await dataTableStore.fetchDataTableDetails(id, projectId).catch(() => null);
			if (cancelled) return;
			if (result) tableSlots.value = {
				displayed: tableSlots.value.displayed,
				pending: {
					key,
					dataTable: result
				}
			};
			else {
				tableSlots.value = {
					displayed: null,
					pending: null
				};
				isLoading.value = false;
				fetchError.value = i18n.baseText("instanceAi.dataTablePreview.fetchError");
			}
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.content),
				"aria-busy": isLoading.value
			}, [
				fetchError.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.centerState)
				}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(fetchError.value), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true),
				(openBlock(true), createElementBlock(Fragment, null, renderList(tables.value, (table) => {
					return openBlock(), createElementBlock("div", {
						key: table.key,
						class: normalizeClass([_ctx.$style.tableSlot, { [_ctx.$style.pendingTable]: table.key !== tableSlots.value.displayed?.key }]),
						"aria-hidden": table.key !== tableSlots.value.displayed?.key,
						inert: isLoading.value || void 0,
						"data-table-id": table.dataTable.id,
						"data-test-id": "instance-ai-data-table-grid"
					}, [createVNode(DataTableTable_default, {
						"data-table": table.dataTable,
						"read-only": unref(isAgentWorking) || isLoading.value && table.key === tableSlots.value.displayed?.key,
						"schema-read-only": isSchemaReadOnly.value,
						"schema-read-only-tooltip": schemaReadOnlyTooltip.value,
						onReady: ($event) => showTable(table.key),
						onLoadError: ($event) => onLoadError(table.key)
					}, null, 8, [
						"data-table",
						"read-only",
						"schema-read-only",
						"schema-read-only-tooltip",
						"onReady",
						"onLoadError"
					])], 10, _hoisted_2$4);
				}), 128)),
				isLoading.value && tableSlots.value.displayed ? (openBlock(), createBlock(DataTableLoadingIndicator_default, { key: requestKey.value })) : createCommentVNode("", true),
				isLoading.value && !tableSlots.value.displayed ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.centerState),
					"data-test-id": "instance-ai-data-table-loading"
				}, [createVNode(unref(N8nIcon_default), {
					icon: "loader-circle",
					size: 80,
					spin: ""
				})], 2)) : createCommentVNode("", true)
			], 10, _hoisted_1$12);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_fxer4_1",
	tableSlot: "_tableSlot_fxer4_8",
	pendingTable: "_pendingTable_fxer4_13",
	centerState: "_centerState_fxer4_19"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiFixWithAiPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiFixWithAiPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiFixWithAiPanel",
	props: {
		nodeName: {},
		errorMessage: {},
		failedCount: { default: 1 }
	},
	emits: ["fix-with-ai", "dismiss"],
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const isErrorDetailsOpen = ref(false);
		const title = computed(() => props.failedCount > 1 ? i18n.baseText("instanceAi.fixWithAi.notice.title.multiple", { interpolate: { count: props.failedCount } }) : i18n.baseText("instanceAi.fixWithAi.notice.title.single", { interpolate: { nodeName: props.nodeName } }));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass(_ctx.$style.root),
				role: "alert",
				"data-test-id": "instance-ai-fix-with-ai-panel"
			}, {
				default: withCtx(() => [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nIcon_default), {
						icon: "circle-x",
						size: "medium",
						class: normalizeClass(_ctx.$style.headerIcon)
					}, null, 8, ["class"]), createVNode(unref(N8nText_default), {
						bold: "",
						tag: "span",
						class: normalizeClass(_ctx.$style.title)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(title.value), 1)]),
						_: 1
					}, 8, ["class"])], 2),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [createVNode(unref(CollapsibleRoot_default), {
						open: isErrorDetailsOpen.value,
						"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isErrorDetailsOpen.value = $event)
					}, {
						default: withCtx(() => [createVNode(unref(CollapsibleTrigger_default), { "as-child": "" }, {
							default: withCtx(() => [createBaseVNode("button", {
								type: "button",
								class: normalizeClass(_ctx.$style.toggle),
								"data-test-id": "instance-ai-fix-with-ai-error-toggle"
							}, [createVNode(unref(N8nIcon_default), {
								icon: isErrorDetailsOpen.value ? "chevron-down" : "chevron-right",
								size: "small"
							}, null, 8, ["icon"]), createVNode(unref(N8nText_default), { size: "small" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.fixWithAi.errorDetails")), 1)]),
								_: 1
							})], 2)]),
							_: 1
						}), createVNode(unref(AnimatedCollapsibleContent_default), null, {
							default: withCtx(() => [createBaseVNode("pre", { class: normalizeClass(_ctx.$style.codeBlock) }, [createBaseVNode("code", null, toDisplayString(__props.errorMessage), 1)], 2)]),
							_: 1
						})]),
						_: 1
					}, 8, ["open"])], 2),
					createVNode(ConfirmationFooter_default, {
						layout: "row-end",
						bordered: ""
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "medium",
							"data-test-id": "instance-ai-fix-with-ai-dismiss",
							onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("dismiss"))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.fixWithAi.notice.dismiss")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), {
							variant: "solid",
							size: "medium",
							icon: "sparkles",
							"data-test-id": "instance-ai-fix-with-ai-button",
							onClick: _cache[2] || (_cache[2] = ($event) => _ctx.$emit("fix-with-ai"))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.fixWithAi.button")), 1)]),
							_: 1
						})]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_3mzgc_1",
	header: "_header_3mzgc_12",
	headerIcon: "_headerIcon_3mzgc_20",
	title: "_title_3mzgc_25",
	body: "_body_3mzgc_30",
	toggle: "_toggle_3mzgc_34",
	codeBlock: "_codeBlock_3mzgc_50"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/composables/useOpenArtifactTabs.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var ARTIFACT_TAB_ICONS = {
	workflow: "workflow",
	"data-table": "table",
	agent: "robot",
	skill: "book-open",
	app: "layout-template"
};
function tabKey(tab) {
	return `${tab.type}:${tab.id}`;
}
/**
* Close the leftmost tabs over the stored limit, but never a tab in `keepKeys`.
* A state over the limit fails to save, and the tabs would be lost on reload.
*/
function fitWithinTabLimit(layout, keepKeys) {
	if (layout.tabs.length <= 100) return layout;
	const tabs = [...layout.tabs];
	const dropped = [];
	for (let i = 0; i < tabs.length && tabs.length > 100;) {
		if (keepKeys.has(tabKey(tabs[i]))) {
			i++;
			continue;
		}
		const [tab] = tabs.splice(i, 1);
		dropped.push({
			type: tab.type,
			id: tab.id
		});
	}
	const droppedKeys = new Set(dropped.map(tabKey));
	return {
		tabs,
		closedTabs: [...layout.closedTabs.filter((closed) => !droppedKeys.has(tabKey(closed))), ...dropped].slice(-500)
	};
}
function toStoredTab(tab) {
	return {
		type: tab.type,
		id: tab.id,
		name: tab.name,
		...tab.projectId ? { projectId: tab.projectId } : {}
	};
}
function fromStoredTab(tab) {
	return {
		...tab,
		icon: ARTIFACT_TAB_ICONS[tab.type]
	};
}
/**
* The tabs a user has open in a thread, on top of the artifacts the thread
* produced. Until the thread has stored tabs, every artifact is open. After
* that, the stored layout keeps its order and its closed tabs, and artifacts
* that are new since then open at the end. The server stores the tabs when the
* agent changes an artifact.
*/
function useOpenArtifactTabs({ artifactTabs, storage, previewOpen }) {
	const layout = shallowRef(null);
	const storedActiveTab = ref(null);
	const storedPreviewOpen = ref();
	const isLoaded = ref(!storage);
	let hasNoStoredTabs = false;
	const openTabs = computed(() => {
		const artifacts = artifactTabs();
		const current = layout.value;
		if (!current) return artifacts;
		const artifactsByKey = new Map(artifacts.map((tab) => [tabKey(tab), tab]));
		const closedKeys = new Set(current.closedTabs.map(tabKey));
		const seenKeys = /* @__PURE__ */ new Set();
		const result = [];
		for (const tab of current.tabs) {
			const key = tabKey(tab);
			if (seenKeys.has(key)) continue;
			seenKeys.add(key);
			result.push(artifactsByKey.get(key) ?? fromStoredTab(tab));
		}
		for (const tab of artifacts) {
			const key = tabKey(tab);
			if (seenKeys.has(key) || closedKeys.has(key)) continue;
			seenKeys.add(key);
			result.push(tab);
		}
		return result;
	});
	function currentLayout() {
		return layout.value ?? {
			tabs: openTabs.value.map(toStoredTab),
			closedTabs: []
		};
	}
	function findTab(tabId) {
		return openTabs.value.find((tab) => tab.id === tabId) ?? artifactTabs().find((tab) => tab.id === tabId);
	}
	function hasTab(tabId) {
		return findTab(tabId) !== void 0;
	}
	/**
	* Close a tab. Returns the id of the tab to show instead: the next tab, or
	* the previous one when the closed tab was the last.
	*/
	function closeTab(tabId) {
		const tabs = openTabs.value;
		const index = tabs.findIndex((tab) => tab.id === tabId);
		if (index === -1) return void 0;
		const closed = tabs[index];
		const closedKey = tabKey(closed);
		const { closedTabs } = currentLayout();
		layout.value = {
			tabs: tabs.filter((_, i) => i !== index).map(toStoredTab),
			closedTabs: [...closedTabs.filter((tab) => tabKey(tab) !== closedKey), {
				type: closed.type,
				id: closed.id
			}].slice(-500)
		};
		return (tabs[index + 1] ?? tabs[index - 1])?.id;
	}
	/** Open a closed artifact again, at the end. Returns true when the tabs changed. */
	function reopenTab(tabId) {
		const current = layout.value;
		if (!current) return false;
		const tab = findTab(tabId);
		if (!tab) return false;
		const key = tabKey(tab);
		const isClosed = current.closedTabs.some((closed) => tabKey(closed) === key);
		const isInLayout = current.tabs.some((open) => tabKey(open) === key);
		if (!isClosed && isInLayout) return false;
		const shown = openTabs.value.map(toStoredTab);
		layout.value = {
			tabs: isClosed ? [...shown, toStoredTab(tab)] : shown,
			closedTabs: current.closedTabs.filter((closed) => tabKey(closed) !== key)
		};
		return true;
	}
	/**
	* Open a tab for any resource, for example one picked from the project.
	* The tab opens at the end, or stays where it is when it is open already.
	*/
	function openTab(tab) {
		const current = currentLayout();
		const key = tabKey(tab);
		const isOpen = openTabs.value.some((open) => tabKey(open) === key);
		layout.value = fitWithinTabLimit({
			tabs: isOpen ? current.tabs : [...openTabs.value.map(toStoredTab), toStoredTab(tab)],
			closedTabs: current.closedTabs.filter((closed) => tabKey(closed) !== key)
		}, /* @__PURE__ */ new Set([key]));
	}
	/** Move an open tab to a new position in the tab order. */
	function moveTab(tabId, toIndex) {
		const tabs = [...openTabs.value];
		const fromIndex = tabs.findIndex((tab) => tab.id === tabId);
		if (fromIndex === -1) return;
		const target = Math.max(0, Math.min(toIndex, tabs.length - 1));
		if (target === fromIndex) return;
		const [moved] = tabs.splice(fromIndex, 1);
		tabs.splice(target, 0, moved);
		layout.value = {
			tabs: tabs.map(toStoredTab),
			closedTabs: currentLayout().closedTabs
		};
	}
	let saveTimer;
	let pendingActiveTabId;
	function buildState(activeTabId) {
		const active = openTabs.value.find((tab) => tab.id === activeTabId);
		const current = {
			tabs: openTabs.value.map(toStoredTab),
			closedTabs: currentLayout().closedTabs
		};
		const fitted = fitWithinTabLimit(current, new Set(active ? [tabKey(active)] : []));
		if (fitted !== current) layout.value = fitted;
		const isPreviewOpen = previewOpen?.();
		return {
			tabs: fitted.tabs,
			closedTabs: fitted.closedTabs,
			activeTab: active ? {
				type: active.type,
				id: active.id
			} : null,
			...isPreviewOpen !== void 0 ? { previewOpen: isPreviewOpen } : {}
		};
	}
	function flushSave() {
		if (saveTimer === void 0) return;
		clearTimeout(saveTimer);
		saveTimer = void 0;
		storage?.save(buildState(pendingActiveTabId)).catch(() => {});
	}
	/**
	* Save the tabs after a short delay. The save stores the active tab and the
	* preview state too, so call it only for changes the user makes.
	*/
	function saveTabs(activeTabId) {
		if (!storage) return;
		layout.value ??= currentLayout();
		pendingActiveTabId = activeTabId;
		if (saveTimer !== void 0) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			if (!isLoaded.value) return;
			flushSave();
		}, getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE));
	}
	/**
	* Store the tabs of a thread that has no stored tabs yet. The server adds the
	* artifacts the agent changes next after them, also when no browser shows the
	* thread. Stores no active tab and no preview state, because the user did not
	* pick them.
	*/
	function storeDefaultTabs() {
		if (!storage || !hasNoStoredTabs || layout.value || openTabs.value.length === 0) return;
		const fitted = fitWithinTabLimit(currentLayout(), /* @__PURE__ */ new Set());
		layout.value = fitted;
		storage.save({
			...fitted,
			activeTab: null
		}).catch(() => {});
	}
	async function loadTabs() {
		if (!storage) return;
		try {
			const state = await storage.load();
			hasNoStoredTabs = state === null;
			if (state && !layout.value) {
				layout.value = {
					tabs: state.tabs,
					closedTabs: state.closedTabs
				};
				storedActiveTab.value = state.activeTab;
				storedPreviewOpen.value = state.previewOpen;
			}
		} catch {} finally {
			isLoaded.value = true;
			if (saveTimer !== void 0) flushSave();
		}
	}
	loadTabs();
	onScopeDispose(() => {
		if (isLoaded.value) flushSave();
	});
	return {
		openTabs,
		isLoaded,
		storedActiveTab,
		storedPreviewOpen,
		hasTab,
		closeTab,
		reopenTab,
		openTab,
		moveTab,
		saveTabs,
		storeDefaultTabs
	};
}
//#endregion
//#region src/features/ai/instanceAi/useCanvasPreview.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function isArtifactTab(tab) {
	return tab.type !== "browser";
}
var BROWSER_TAB_PREFIX = "browser:";
function isBrowserTabId(tabId) {
	return tabId?.startsWith(BROWSER_TAB_PREFIX) === true;
}
/**
* The artifact a message attachment refers to, if any. A nodes attachment refers
* to its parent workflow only when it carries the workflow name, which marks that
* workflow as a thread artifact.
*/
function getAttachedArtifactId(attachment) {
	if (attachment.type === "workflow" || attachment.type === "agent") return attachment.id;
	if (attachment.type === "nodes" && attachment.workflowName) return attachment.workflowId;
}
function useCanvasPreview({ thread, initialAgentId, initialAppId, tabsStorage, cloudBrowserTasks: getCloudBrowserTasks }) {
	const i18n = useI18n();
	const recentWorkflowsStore = useRecentWorkflowsStore();
	const skillsStore = useSkillsStore();
	const activeTabId = ref();
	const isPreviewOpen = ref(false);
	const linkedAgentTarget = ref();
	function setPreviewOpen(open, persist = true) {
		if (isPreviewOpen.value === open) return;
		isPreviewOpen.value = open;
		if (persist) tabs.saveTabs(activeTabId.value);
	}
	const buildingArtifactIds = useBuildingArtifactIds(thread);
	const isAgentWorking = useIsAgentWorking(thread);
	const userTabId = ref();
	watch(isAgentWorking, (working) => {
		if (!working) userTabId.value = void 0;
	});
	const artifactTabs = computed(() => {
		const result = [];
		const linkedAgent = linkedAgentTarget.value;
		for (const entry of thread.producedArtifacts.values()) if (entry.type === "workflow" || entry.type === "data-table" || entry.type === "agent" || entry.type === "skill" || entry.type === "app") result.push({
			id: entry.id,
			type: entry.type,
			name: entry.name,
			icon: ARTIFACT_TAB_ICONS[entry.type],
			projectId: entry.projectId ?? (entry.type === "agent" && linkedAgent?.agentId === entry.id ? linkedAgent.projectId : void 0),
			pending: entry.pending,
			building: buildingArtifactIds.value.has(entry.id)
		});
		if (linkedAgent && !result.some((tab) => tab.id === linkedAgent.agentId)) {
			const indexedAgent = [...thread.resourceNameIndex.values()].find((entry) => entry.type === "agent" && entry.id === linkedAgent.agentId);
			result.push({
				id: linkedAgent.agentId,
				type: "agent",
				name: indexedAgent?.name ?? linkedAgent.agentId,
				icon: ARTIFACT_TAB_ICONS.agent,
				projectId: indexedAgent?.projectId ?? linkedAgent.projectId,
				building: buildingArtifactIds.value.has(linkedAgent.agentId)
			});
		}
		return result;
	});
	const tabs = useOpenArtifactTabs({
		artifactTabs: () => artifactTabs.value,
		storage: tabsStorage,
		previewOpen: () => isPreviewOpen.value
	});
	const cloudBrowserTasks = computed(() => getCloudBrowserTasks?.() ?? []);
	const closedBrowserTaskIds = ref(/* @__PURE__ */ new Set());
	const browserTabs = computed(() => cloudBrowserTasks.value.filter((task) => task.state === "running" && !closedBrowserTaskIds.value.has(task.taskId)).map((task) => ({
		id: `${BROWSER_TAB_PREFIX}${task.taskId}`,
		type: "browser",
		name: task.title || i18n.baseText("instanceAi.cloudBrowser.tabName"),
		icon: "globe",
		taskId: task.taskId,
		userAction: task.userAction
	})));
	const tabPositions = ref(/* @__PURE__ */ new Map());
	const openTabs = computed(() => {
		const result = [...tabs.openTabs.value];
		const positionOf = (tab) => tabPositions.value.get(tab.id) ?? result.length;
		for (const tab of [...browserTabs.value].sort((a, b) => positionOf(a) - positionOf(b))) result.splice(positionOf(tab), 0, tab);
		return result;
	});
	const activeBrowserTab = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "browser" ? tab : null;
	});
	const viewedBrowserTabIds = ref(/* @__PURE__ */ new Set());
	watch(activeBrowserTab, (tab) => {
		if (tab) viewedBrowserTabIds.value.add(tab.id);
	});
	const viewedBrowserTabs = computed(() => browserTabs.value.filter((tab) => viewedBrowserTabIds.value.has(tab.id)));
	watch(browserTabs, (current) => {
		const activeId = activeTabId.value;
		if (!isBrowserTabId(activeId) || current.some((tab) => tab.id === activeId)) return;
		activeTabId.value = openTabs.value[0]?.id;
		if (userTabId.value === activeId) userTabId.value = void 0;
		if (activeTabId.value === void 0) setPreviewOpen(false, false);
	});
	const activeWorkflowId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "workflow" ? tab.id : null;
	});
	const activeDataTableId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "data-table" ? tab.id : null;
	});
	const activeDataTableProjectId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "data-table" ? tab.projectId ?? null : null;
	});
	const activeAgentId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "agent" ? tab.id : null;
	});
	const activeAgentProjectId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "agent" ? tab.projectId ?? null : null;
	});
	const activeAgentPending = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "agent" && tab.pending === true;
	});
	const activeSkillId = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "skill" ? tab.id : null;
	});
	const activeApp = computed(() => {
		const tab = openTabs.value.find((t) => t.id === activeTabId.value);
		return tab?.type === "app" && tab.projectId ? {
			id: tab.id,
			projectId: tab.projectId
		} : null;
	});
	const executionResultsByWorkflow = computed(() => getExecutionResultsByWorkflow(thread.artifactTurns));
	const activeWorkflowExecutionResult = computed(() => {
		const workflowId = activeWorkflowId.value;
		return workflowId ? executionResultsByWorkflow.value.get(workflowId) : void 0;
	});
	const dataTableRefreshKey = ref(0);
	const skillRefreshKeys = ref(/* @__PURE__ */ new Map());
	const skillRefreshKey = computed(() => skillRefreshKeys.value.get(activeSkillId.value ?? "") ?? 0);
	const appRefreshKey = ref(0);
	const isPreviewVisible = computed(() => isPreviewOpen.value && activeTabId.value !== void 0 && openTabs.value.some((tab) => tab.id === activeTabId.value));
	const firstAttachedArtifactId = computed(() => {
		const tabIds = new Set(openTabs.value.map(({ id }) => id));
		for (const turn of thread.artifactTurns) for (const attachment of turn.attachments ?? []) {
			const artifactId = getAttachedArtifactId(attachment);
			if (artifactId && tabIds.has(artifactId)) return artifactId;
		}
	});
	const pendingAgentTabId = computed(() => artifactTabs.value.find((tab) => tab.pending)?.id);
	const initialAgentTabId = computed(() => {
		const agentId = initialAgentId?.();
		if (!agentId) return void 0;
		return artifactTabs.value.find((tab) => tab.type === "agent" && tab.id === agentId)?.id;
	});
	const initialArtifactId = computed(() => firstAttachedArtifactId.value ?? pendingAgentTabId.value ?? initialAgentTabId.value ?? initialAppId?.() ?? thread.pendingWorkflowAttachment?.id);
	watch([initialArtifactId, tabs.isLoaded], ([id, isLoaded]) => {
		if (!id || !isLoaded || activeTabId.value !== void 0) return;
		activeTabId.value = id;
		if (tabs.storedPreviewOpen.value !== false) setPreviewOpen(true, false);
	}, { immediate: true });
	watch([
		isPreviewOpen,
		openTabs,
		() => thread.isHydratingThread,
		initialArtifactId,
		tabs.isLoaded
	], ([open, currentTabs, isHydrating, initialId, isLoaded]) => {
		if (isHydrating || !isLoaded) return;
		if (open === true && activeTabId.value === void 0 && currentTabs[0]) activeTabId.value = currentTabs.some((tab) => tab.id === initialId) ? initialId : currentTabs[0].id;
	}, { immediate: true });
	watch([
		tabs.isLoaded,
		() => thread.isHydratingThread,
		() => artifactTabs.value.length
	], ([isLoaded, isHydrating, artifactCount]) => {
		if (isLoaded && !isHydrating && artifactCount > 0) tabs.storeDefaultTabs();
	}, { immediate: true });
	watch(tabs.isLoaded, (isLoaded) => {
		if (!isLoaded) return;
		const stored = tabs.storedActiveTab.value;
		if (stored && openTabs.value.some((tab) => tab.id === stored.id)) activeTabId.value = stored.id;
		const storedPreviewOpen = tabs.storedPreviewOpen.value;
		if (storedPreviewOpen !== void 0 && storedPreviewOpen !== isPreviewOpen.value) setPreviewOpen(storedPreviewOpen, false);
	});
	function recordWorkflowOpen(workflowId) {
		const tab = openTabs.value.filter(isArtifactTab).find(({ id }) => id === workflowId);
		recentWorkflowsStore.registerWorkflowOpen(workflowId, tab?.projectId ?? thread.projectId);
	}
	/** Show a tab the user picked. Agent changes use `showAgentArtifact` instead. */
	function selectTab(tabId) {
		if (isBrowserTabId(tabId)) {
			activeTabId.value = tabId;
			userTabId.value = isAgentWorking.value ? tabId : void 0;
			setPreviewOpen(true, false);
			return;
		}
		tabs.reopenTab(tabId);
		if (openTabs.value.find(({ id }) => id === tabId)?.type === "workflow") recordWorkflowOpen(tabId);
		activeTabId.value = tabId;
		userTabId.value = isAgentWorking.value ? tabId : void 0;
		setPreviewOpen(true);
		tabs.saveTabs(tabId);
	}
	/** Open a tab for a resource the user picked, and show it. */
	function openTab(tab) {
		tabs.openTab(tab);
		selectTab(tab.id);
	}
	function reorderTab(tabId, toIndex) {
		const order = openTabs.value.map((tab) => tab.id);
		order.splice(order.indexOf(tabId), 1);
		order.splice(toIndex, 0, tabId);
		tabPositions.value = new Map(order.map((id, index) => [id, index]));
		if (isBrowserTabId(tabId)) return;
		tabs.moveTab(tabId, order.filter((id) => !isBrowserTabId(id)).indexOf(tabId));
		tabs.saveTabs(activeTabId.value);
	}
	function closeTab(tabId) {
		if (isBrowserTabId(tabId)) {
			const taskId = tabId.slice(8);
			closedBrowserTaskIds.value.add(taskId);
			viewedBrowserTabIds.value.delete(tabId);
			if (activeTabId.value === tabId) {
				activeTabId.value = openTabs.value.find((tab) => tab.id !== tabId)?.id;
				if (userTabId.value === tabId) userTabId.value = void 0;
				if (activeTabId.value === void 0) setPreviewOpen(false, false);
			}
			return;
		}
		const nextTabId = tabs.closeTab(tabId);
		if (activeTabId.value === tabId) {
			activeTabId.value = nextTabId;
			if (userTabId.value === tabId) userTabId.value = void 0;
			if (nextTabId === void 0) setPreviewOpen(false);
		}
		tabs.saveTabs(activeTabId.value);
	}
	function closePreview() {
		userTabId.value = void 0;
		setPreviewOpen(false);
		tabs.saveTabs(activeTabId.value);
	}
	function showAgentArtifact(tabId) {
		const reopened = tabs.reopenTab(tabId);
		if (!(userTabId.value !== void 0 && userTabId.value === activeTabId.value)) activeTabId.value = tabId;
		setPreviewOpen(true);
		if (reopened) tabs.saveTabs(activeTabId.value);
	}
	/** Show a running cloud browser task in its tab. */
	function openCloudBrowserTab(taskId) {
		if (!cloudBrowserTasks.value.some((task) => task.taskId === taskId && task.state === "running")) return;
		closedBrowserTaskIds.value.delete(taskId);
		selectTab(`${BROWSER_TAB_PREFIX}${taskId}`);
	}
	/**
	* Open or switch the preview to a workflow.
	* Returns true if the preview tab changed; false if the tab was already
	* active (so the caller can fall back to opening in a new tab instead).
	*/
	function openWorkflowPreview(workflowId) {
		if (activeTabId.value === workflowId && isPreviewOpen.value) {
			recordWorkflowOpen(workflowId);
			return false;
		}
		selectTab(workflowId);
		return true;
	}
	/**
	* Show a workflow that a message the user just sent mentions. Its tab
	* arrives with the message, so this only brings it into view.
	*/
	function showMentionedWorkflow(workflowId) {
		if (!tabs.hasTab(workflowId)) return false;
		showAgentArtifact(workflowId);
		recordWorkflowOpen(workflowId);
		return true;
	}
	/**
	* Open or switch the preview to a data table.
	* Returns true if the preview tab changed; false if the tab was already
	* active (so the caller can fall back to opening in a new tab instead).
	*/
	function openDataTablePreview(dataTableId, _projectId) {
		if (activeTabId.value === dataTableId && isPreviewOpen.value) return false;
		selectTab(dataTableId);
		return true;
	}
	/**
	* Open or switch the preview to an agent.
	* Returns true if the preview tab changed; false if the tab was already
	* active (so the caller can fall back to opening in a new tab instead).
	*/
	function openAgentPreview(agentId, projectId) {
		linkedAgentTarget.value = {
			agentId,
			projectId
		};
		if (activeTabId.value === agentId && isPreviewOpen.value) return false;
		selectTab(agentId);
		return true;
	}
	/**
	* Open or switch the preview to a skill or an app.
	* Returns true if the preview tab changed; false if the tab was already
	* active or does not exist (so the caller can fall back to opening in a new tab instead).
	*/
	function openArtifactPreview(artifactId) {
		if (!tabs.hasTab(artifactId)) return false;
		if (activeTabId.value === artifactId && isPreviewOpen.value) return false;
		selectTab(artifactId);
		return true;
	}
	watch(openTabs, (currentTabs) => {
		if (activeTabId.value === void 0 || currentTabs.length === 0) return;
		if (!currentTabs.some((t) => t.id === activeTabId.value)) activeTabId.value = currentTabs[0].id;
	});
	const workflowRefreshKey = ref(0);
	const latestBuildResult = computed(() => getLatestBuildResult(thread.artifactTurns) ?? null);
	watch(() => latestBuildResult.value?.toolCallId, (toolCallId) => {
		if (!toolCallId || !latestBuildResult.value) return;
		if (thread.isHydratingThread) return;
		const targetId = latestBuildResult.value.workflowId;
		showAgentArtifact(targetId);
		if (activeTabId.value === targetId) workflowRefreshKey.value++;
	}, { flush: "sync" });
	const latestAgentArtifactResult = computed(() => getLatestAgentArtifactResult(thread.artifactTurns) ?? null);
	watch(() => latestAgentArtifactResult.value?.toolCallId, (toolCallId) => {
		if (!toolCallId || !latestAgentArtifactResult.value) return;
		if (thread.isHydratingThread) return;
		showAgentArtifact(latestAgentArtifactResult.value.agentId);
	}, { flush: "sync" });
	const latestSetupResult = computed(() => getLatestWorkflowSetupResult(thread.artifactTurns) ?? null);
	watch(() => latestSetupResult.value?.toolCallId, (toolCallId) => {
		if (!toolCallId || !latestSetupResult.value) return;
		const targetId = latestSetupResult.value.workflowId;
		if (activeTabId.value === targetId) workflowRefreshKey.value++;
	});
	const latestUpdateResult = computed(() => getLatestWorkflowUpdateResult(thread.artifactTurns) ?? null);
	watch(() => latestUpdateResult.value?.toolCallId, (toolCallId) => {
		if (!toolCallId || !latestUpdateResult.value) return;
		if (thread.isHydratingThread) return;
		const targetId = latestUpdateResult.value.workflowId;
		showAgentArtifact(targetId);
		if (activeTabId.value === targetId) workflowRefreshKey.value++;
	}, { flush: "sync" });
	const latestDataTableResult = computed(() => getLatestDataTableResult(thread.artifactTurns) ?? null);
	watch(() => latestDataTableResult.value?.toolCallId, (toolCallId) => {
		if (!toolCallId || !latestDataTableResult.value) return;
		if (thread.isHydratingThread) return;
		const targetId = latestDataTableResult.value.dataTableId;
		showAgentArtifact(targetId);
		if (activeTabId.value === targetId) dataTableRefreshKey.value++;
	}, { flush: "sync" });
	function showLatestToolArtifact(getLatest, artifactId, refresh) {
		const latest = computed(() => getLatest(thread.artifactTurns) ?? null);
		watch(() => latest.value?.toolCallId, (toolCallId) => {
			if (!toolCallId || !latest.value) return;
			if (thread.isHydratingThread) return;
			const targetId = artifactId(latest.value);
			showAgentArtifact(targetId);
			refresh(targetId, latest.value);
		}, { flush: "sync" });
	}
	showLatestToolArtifact(getLatestSkillArtifactResult, (result) => result.skillId, (id, result) => {
		if (result.name) skillsStore.updateSkillName(id, result.name);
		skillRefreshKeys.value.set(id, (skillRefreshKeys.value.get(id) ?? 0) + 1);
	});
	showLatestToolArtifact(getLatestAppArtifactResult, (result) => result.appId, (id) => {
		if (activeTabId.value === id) appRefreshKey.value++;
	});
	const latestDeletedDataTablesKey = computed(() => getLatestDeletedDataTableIds(thread.artifactTurns).join());
	watch(latestDeletedDataTablesKey, () => {
		const deletedIds = getLatestDeletedDataTableIds(thread.artifactTurns);
		const deletedId = activeTabId.value;
		if (deletedId && deletedIds.includes(deletedId)) {
			const remaining = openTabs.value.filter((t) => t.id !== deletedId);
			activeTabId.value = remaining.length > 0 ? remaining[0].id : void 0;
			if (!activeTabId.value) setPreviewOpen(false);
		}
	});
	useAgentMutationRefresh(thread);
	return {
		activeTabId,
		openTabs,
		/** False until the stored tabs of the thread load. */
		tabsLoaded: tabs.isLoaded,
		activeWorkflowId,
		activeDataTableId,
		activeDataTableProjectId,
		activeAgentId,
		activeAgentProjectId,
		activeAgentPending,
		activeBrowserTab,
		browserTabs,
		viewedBrowserTabs,
		cloudBrowserTasks,
		activeSkillId,
		activeApp,
		activeWorkflowExecutionResult,
		dataTableRefreshKey,
		skillRefreshKey,
		appRefreshKey,
		isPreviewVisible,
		workflowRefreshKey,
		selectTab,
		openTab,
		reorderTab,
		closeTab,
		closePreview,
		openWorkflowPreview,
		showMentionedWorkflow,
		openDataTablePreview,
		openAgentPreview,
		openCloudBrowserTab,
		openSkillPreview: openArtifactPreview,
		openAppPreview: openArtifactPreview
	};
}
//#endregion
//#region src/features/ai/instanceAi/useArtifactTabSummaries.ts
var import_chunk = /* @__PURE__ */ __toESM(require_chunk(), 1);
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var MAX_IDS_PER_REQUEST = 50;
var WORKFLOW_SUMMARY_FIELDS = [
	"id",
	"name",
	"updatedAt",
	"activeVersionId"
];
/** Tells if the hover card of a tab shows loaded details. */
function hasTabSummary(tab) {
	return (tab.type === "workflow" || tab.type === "data-table") && !tab.pending;
}
function summaryKey(type, id) {
	return `${type}:${id}`;
}
/**
* Keeps the edited time and a status of the workflows and data tables open as
* tabs. Uses list endpoints, so the responses have no nodes and no rows.
*/
function useArtifactTabSummaries(tabs) {
	const rootStore = useRootStore();
	const workflowsListStore = useWorkflowsListStore();
	const summaries = reactive(/* @__PURE__ */ new Map());
	async function loadWorkflows(ids) {
		const workflows = await workflowsListStore.searchWorkflows({
			ids,
			select: WORKFLOW_SUMMARY_FIELDS,
			options: { includeScopes: false }
		});
		return new Map(workflows.map((workflow) => [workflow.id, {
			type: "workflow",
			name: workflow.name,
			updatedAt: String(workflow.updatedAt),
			published: !!workflow.activeVersionId
		}]));
	}
	async function loadDataTables(ids) {
		const { data } = await fetchDataTablesApi(rootStore.restApiContext, "", {
			skip: 0,
			take: ids.length
		}, { id: ids });
		return new Map(data.map((dataTable) => [dataTable.id, {
			type: "data-table",
			name: dataTable.name,
			updatedAt: dataTable.updatedAt,
			columnCount: dataTable.columns.length + 1
		}]));
	}
	const loaders = {
		workflow: loadWorkflows,
		"data-table": loadDataTables
	};
	const latestRequest = /* @__PURE__ */ new Map();
	let requestSeq = 0;
	async function refreshType(type, ids) {
		await Promise.all((0, import_chunk.default)([...new Set(ids)], MAX_IDS_PER_REQUEST).map(async (batch) => {
			const seq = ++requestSeq;
			for (const id of batch) latestRequest.set(summaryKey(type, id), seq);
			const currentKeys = () => batch.map((id) => ({
				id,
				key: summaryKey(type, id)
			})).filter(({ key }) => latestRequest.get(key) === seq);
			try {
				const loaded = await loaders[type](batch);
				for (const { id, key } of currentKeys()) summaries.set(key, loaded.get(id) ?? null);
			} catch {
				for (const { key } of currentKeys()) if (!summaries.has(key)) summaries.set(key, null);
			}
		}));
	}
	async function refresh(tabsToRefresh) {
		const summarized = tabsToRefresh.filter(hasTabSummary);
		await Promise.all(["workflow", "data-table"].map(async (type) => {
			const ids = summarized.filter((tab) => tab.type === type).map((tab) => tab.id);
			if (ids.length > 0) await refreshType(type, ids);
		}));
	}
	function getSummary(tab) {
		return hasTabSummary(tab) ? summaries.get(summaryKey(tab.type, tab.id)) : void 0;
	}
	const summarizedTabs = () => tabs().filter(hasTabSummary);
	const requestedKeys = /* @__PURE__ */ new Set();
	watch(summarizedTabs, (currentTabs) => {
		const newTabs = currentTabs.filter((tab) => !requestedKeys.has(summaryKey(tab.type, tab.id)));
		if (newTabs.length === 0) return;
		for (const tab of newTabs) requestedKeys.add(summaryKey(tab.type, tab.id));
		refresh(newTabs);
	}, { immediate: true });
	watch(() => summarizedTabs().filter((tab) => tab.building), (buildingTabs, previousBuildingTabs) => {
		const finishedTabs = previousBuildingTabs.filter((previous) => !buildingTabs.some((tab) => tab.id === previous.id));
		if (finishedTabs.length > 0) refresh(finishedTabs);
	});
	const seenNames = /* @__PURE__ */ new Map();
	const renamedKeys = reactive(/* @__PURE__ */ new Set());
	watch(() => summarizedTabs().map((tab) => `${summaryKey(tab.type, tab.id)}\n${tab.name}`), () => {
		const renamed = [];
		for (const tab of summarizedTabs()) {
			const key = summaryKey(tab.type, tab.id);
			const previousName = seenNames.get(key);
			seenNames.set(key, tab.name);
			if (previousName === void 0 || previousName === tab.name) continue;
			renamedKeys.add(key);
			renamed.push(tab);
		}
		if (renamed.length > 0) refresh(renamed);
	}, { immediate: true });
	/** The name to show for a tab. */
	function displayName(tab) {
		if (!hasTabSummary(tab) || renamedKeys.has(summaryKey(tab.type, tab.id))) return tab.name;
		return getSummary(tab)?.name ?? tab.name;
	}
	return {
		getSummary,
		displayName,
		refresh
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useTabDragReorder.ts
init_reactivity_esm_bundler();
var DRAG_THRESHOLD_PX = 4;
var SLIDE_TRANSITION = "transform 150ms ease";
/** Marks an element inside a tab, such as the close button, that does not start a drag. */
var TAB_DRAG_IGNORE_ATTRIBUTE = "data-tab-drag-ignore";
var center = (box) => box.left + box.width / 2;
/**
* Drag tabs sideways to reorder them, like browser tabs. The dragged tab
* follows the pointer and the other tabs move aside. The new order applies
* when the pointer is released.
*
* The tab positions are written to the element styles once per frame, not
* through reactive state, so a drag does not render the tab bar again.
*/
function useTabDragReorder({ getTabElements, onReorder, onDragStart }) {
	const draggedTabId = ref();
	let state = null;
	let frame;
	let pendingDeltaX = 0;
	function measure() {
		return getTabElements().map((element) => {
			const rect = element.getBoundingClientRect();
			return {
				element,
				id: element.dataset.tabItemId ?? "",
				left: rect.left,
				width: rect.width
			};
		});
	}
	function update(deltaX) {
		if (!state) return;
		const { boxes, fromIndex } = state;
		const dragged = boxes[fromIndex];
		const first = boxes[0];
		const last = boxes[boxes.length - 1];
		const minDelta = first.left - dragged.left;
		const maxDelta = last.left + last.width - (dragged.left + dragged.width);
		const delta = Math.max(minDelta, Math.min(deltaX, maxDelta));
		const draggedLeft = dragged.left + delta;
		const draggedRight = draggedLeft + dragged.width;
		let targetIndex = fromIndex;
		for (let i = fromIndex + 1; i < boxes.length; i++) if (draggedRight > center(boxes[i])) targetIndex = i;
		for (let i = fromIndex - 1; i >= 0; i--) if (draggedLeft < center(boxes[i])) targetIndex = i;
		state.targetIndex = targetIndex;
		const gap = boxes.length > 1 ? boxes[1].left - (boxes[0].left + boxes[0].width) : 0;
		const step = dragged.width + gap;
		boxes.forEach((box, i) => {
			let offset = 0;
			if (i === fromIndex) offset = delta;
			else if (i > fromIndex && i <= targetIndex) offset = -step;
			else if (i < fromIndex && i >= targetIndex) offset = step;
			box.element.style.transform = offset ? `translateX(${offset}px)` : "";
		});
	}
	function startDrag() {
		if (!state) return;
		draggedTabId.value = state.tabId;
		state.boxes.forEach((box, i) => {
			box.element.style.transition = i === state?.fromIndex ? "none" : SLIDE_TRANSITION;
			box.element.style.willChange = "transform";
		});
		onDragStart?.();
	}
	function onPointerMove(event) {
		if (!state || event.pointerId !== state.pointerId) return;
		const deltaX = event.clientX - state.startX;
		if (draggedTabId.value === void 0) {
			if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
			startDrag();
		}
		event.preventDefault();
		pendingDeltaX = deltaX;
		frame ??= requestAnimationFrame(() => {
			frame = void 0;
			update(pendingDeltaX);
		});
	}
	function stop(commit) {
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", onPointerUp);
		window.removeEventListener("pointercancel", onPointerCancel);
		window.removeEventListener("keydown", onKeyDown, true);
		if (frame !== void 0) {
			cancelAnimationFrame(frame);
			frame = void 0;
		}
		const finished = state;
		const wasDragging = draggedTabId.value !== void 0;
		state = null;
		draggedTabId.value = void 0;
		finished?.boxes.forEach(({ element }) => {
			element.style.transform = "";
			element.style.transition = "";
			element.style.willChange = "";
		});
		if (commit && wasDragging && finished && finished.targetIndex !== finished.fromIndex) commitDrop(finished);
	}
	function commitDrop({ tabId, boxes, targetIndex }) {
		const currentIds = getTabElements().map((element) => element.dataset.tabItemId);
		const toIndex = currentIds.indexOf(boxes[targetIndex].id);
		const fromIndex = currentIds.indexOf(tabId);
		if (toIndex === -1 || fromIndex === -1 || toIndex === fromIndex) return;
		onReorder(tabId, toIndex);
	}
	function onPointerUp(event) {
		if (!state || event.pointerId !== state.pointerId) return;
		if (frame !== void 0) update(pendingDeltaX);
		stop(true);
	}
	function onPointerCancel(event) {
		if (state && event.pointerId === state.pointerId) stop(false);
	}
	function onKeyDown(event) {
		if (event.key !== "Escape" || draggedTabId.value === void 0) return;
		event.preventDefault();
		event.stopPropagation();
		stop(false);
	}
	function onPointerDown(tabId, event) {
		if (event.button !== 0 || event.pointerType === "touch" || state) return;
		if (event.target instanceof Element && event.target.closest(`[data-tab-drag-ignore]`)) return;
		const boxes = measure();
		const fromIndex = boxes.findIndex((box) => box.id === tabId);
		if (fromIndex === -1 || boxes.length < 2) return;
		state = {
			tabId,
			pointerId: event.pointerId,
			startX: event.clientX,
			boxes,
			fromIndex,
			targetIndex: fromIndex
		};
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerCancel);
		window.addEventListener("keydown", onKeyDown, true);
	}
	onScopeDispose(() => stop(false));
	return {
		draggedTabId,
		onPointerDown
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useProjectResourceSearch.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var RESULTS_PER_TYPE = 10;
function resourceKey(resource) {
	return `${resource.type}:${resource.id}`;
}
/**
* Searches the workflows, data tables, agents, and apps of one project, newest edit
* first. Each type is a separate request, so a type the user cannot list
* comes back empty without hiding the others.
*/
function useProjectResourceSearch({ projectId, excludedTabs }) {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const workflowsListStore = useWorkflowsListStore();
	const resources = shallowRef([]);
	const isLoading = ref(false);
	let generation = 0;
	const results = computed(() => {
		const excludedKeys = new Set(excludedTabs().map(resourceKey));
		const visible = resources.value.filter((resource) => !excludedKeys.has(resourceKey(resource)));
		const counts = {
			workflow: 0,
			"data-table": 0,
			agent: 0,
			skill: 0,
			app: 0
		};
		return visible.filter((resource) => ++counts[resource.type] <= RESULTS_PER_TYPE).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map(({ updatedAt: _updatedAt, ...tab }) => tab);
	});
	function takeFor(type) {
		return RESULTS_PER_TYPE + excludedTabs().filter((tab) => tab.type === type).length;
	}
	async function searchWorkflows(project, query) {
		return (await workflowsListStore.searchWorkflows({
			projectId: project,
			query: query || void 0,
			isArchived: false,
			select: [
				"id",
				"name",
				"updatedAt"
			],
			options: {
				take: takeFor("workflow"),
				sortBy: "updatedAt:desc",
				includeScopes: false
			}
		})).map((workflow) => ({
			type: "workflow",
			id: workflow.id,
			name: workflow.name,
			icon: ARTIFACT_TAB_ICONS.workflow,
			projectId: project,
			updatedAt: String(workflow.updatedAt)
		}));
	}
	async function searchDataTables(project, query) {
		const { data } = await fetchDataTablesApi(rootStore.restApiContext, project, {
			skip: 0,
			take: takeFor("data-table")
		}, query ? { name: query } : void 0, "updatedAt:desc");
		return data.map((dataTable) => ({
			type: "data-table",
			id: dataTable.id,
			name: dataTable.name,
			icon: ARTIFACT_TAB_ICONS["data-table"],
			projectId: project,
			updatedAt: dataTable.updatedAt
		}));
	}
	async function searchAgents(project, query) {
		const { data } = await listAgentsPage(rootStore.restApiContext, project, {
			limit: takeFor("agent"),
			sortBy: "updatedAt:desc",
			filter: query ? { query } : void 0
		});
		return data.map((agent) => ({
			type: "agent",
			id: agent.id,
			name: agent.name,
			icon: ARTIFACT_TAB_ICONS.agent,
			projectId: project,
			updatedAt: agent.updatedAt
		}));
	}
	async function searchApps(project, query) {
		const { data } = await listApps(rootStore.restApiContext, project, {
			skip: 0,
			take: takeFor("app"),
			sortBy: "updatedAt:desc",
			name: query || void 0
		});
		return data.map((app) => ({
			type: "app",
			id: app.id,
			name: app.name,
			icon: ARTIFACT_TAB_ICONS.app,
			projectId: project,
			updatedAt: app.updatedAt
		}));
	}
	async function search(query = "") {
		const project = projectId();
		if (!project) {
			generation++;
			resources.value = [];
			isLoading.value = false;
			return;
		}
		const current = ++generation;
		isLoading.value = true;
		const trimmed = query.trim();
		const searches = [
			searchWorkflows(project, trimmed),
			searchDataTables(project, trimmed),
			searchAgents(project, trimmed)
		];
		if (settingsStore.isAppsEnabled) searches.push(searchApps(project, trimmed));
		const settled = await Promise.allSettled(searches);
		if (current !== generation) return;
		resources.value = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
		isLoading.value = false;
	}
	return {
		results,
		isLoading,
		search
	};
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiResourcePicker.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var InstanceAiResourcePicker_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiResourcePicker",
	props: {
		projectId: {},
		excludedTabs: {},
		placement: { default: "bottom-start" },
		contentTestId: { default: "instance-ai-tab-picker" }
	},
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const isOpen = ref(false);
		const resourceSearch = useProjectResourceSearch({
			projectId: () => props.projectId,
			excludedTabs: () => props.excludedTabs
		});
		const items = computed(() => resourceSearch.results.value.map((resource) => ({
			id: `${resource.type}:${resource.id}`,
			label: resource.name,
			icon: {
				type: "icon",
				value: resource.icon
			}
		})));
		function handleOpenChange(open) {
			isOpen.value = open;
			if (open) resourceSearch.search();
		}
		function handleSelect(itemId) {
			const resource = resourceSearch.results.value.find((result) => `${result.type}:${result.id}` === itemId);
			if (resource) emit("select", resource);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				"model-value": isOpen.value,
				items: items.value,
				loading: unref(resourceSearch).isLoading.value && items.value.length === 0,
				"search-placeholder": unref(i18n).baseText("instanceAi.previewTabBar.searchResources"),
				"search-debounce": unref(getDebounceTime)(unref(DEBOUNCE_TIME).INPUT.SEARCH),
				"empty-text": unref(i18n).baseText("instanceAi.previewTabBar.noResources"),
				"extra-popper-class": _ctx.$style.picker,
				"max-height": "320px",
				placement: __props.placement,
				"content-test-id": __props.contentTestId,
				searchable: "",
				"onUpdate:modelValue": handleOpenChange,
				onSearch: unref(resourceSearch).search,
				onSelect: handleSelect
			}, {
				trigger: withCtx(() => [renderSlot(_ctx.$slots, "trigger", { isOpen: isOpen.value })]),
				_: 3
			}, 8, [
				"model-value",
				"items",
				"loading",
				"search-placeholder",
				"search-debounce",
				"empty-text",
				"extra-popper-class",
				"placement",
				"content-test-id",
				"onSearch"
			]);
		};
	}
}), [["__cssModules", { "$style": { picker: "_picker_t0zvx_1" } }]]);
//#endregion
//#region src/experiments/openWorkflowInAssistant/components/ManualEditorButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/experiments/openWorkflowInAssistant/components/ManualEditorButton.vue
var ManualEditorButton_default = /* @__PURE__ */ defineComponent({
	__name: "ManualEditorButton",
	props: {
		tabs: {},
		activeTabId: {}
	},
	setup(__props) {
		const props = __props;
		const store = useOpenWorkflowInAssistantStore();
		const i18n = useI18n();
		const route = useRoute();
		const router = useRouter();
		const workflowId = computed(() => {
			const tab = props.tabs.find((t) => t.id === props.activeTabId);
			return tab?.type === "workflow" ? tab.id : null;
		});
		async function handleClick() {
			if (workflowId.value === null) return;
			store.trackManualEditorOpened(workflowId.value, typeof route.params.threadId === "string" ? route.params.threadId : void 0);
			await router.push(`/workflow/${workflowId.value}`);
		}
		return (_ctx, _cache) => {
			return unref(store).isTreatment && workflowId.value !== null ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 0,
				variant: "outline",
				size: "small",
				label: unref(i18n).baseText("experiments.openWorkflowInAssistant.manualEditor"),
				"data-test-id": "instance-ai-manual-editor-button",
				onClick: handleClick
			}, null, 8, ["label"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiPreviewTabBar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$11 = [
	"data-tab-item-id",
	"onPointerdown",
	"onMouseenter",
	"onAuxclick"
];
var _hoisted_2$3 = ["aria-label"];
var InstanceAiPreviewTabBar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiPreviewTabBar",
	props: {
		tabs: {},
		activeTabId: {},
		isExpanded: {
			type: Boolean,
			default: false
		},
		isExpandDisabled: {
			type: Boolean,
			default: false
		},
		previewToggleLabel: { default: void 0 },
		projectId: { default: void 0 }
	},
	emits: [
		"togglePreview",
		"toggleExpanded",
		"closeTab",
		"openTab",
		"reorderTab"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const clipboard = useClipboard();
		const { artifactHref, artifactUrl, openArtifactInNewTab } = useArtifactLinks();
		const toast = useToast();
		const skillsStore = useSkillsStore();
		const tabListRef = ref(null);
		const sizeToggleLabel = computed(() => i18n.baseText(props.isExpanded ? "instanceAi.previewTabBar.collapse" : "instanceAi.previewTabBar.expand"));
		function handleToggleExpanded() {
			if (props.isExpandDisabled) return;
			emit("toggleExpanded");
		}
		function getTabListElement() {
			const tabList = tabListRef.value;
			if (tabList instanceof HTMLElement) return tabList;
			return tabList?.$el ?? null;
		}
		function scrollTabIntoView(tabId) {
			const tabList = getTabListElement();
			if (!tabList) return;
			const activeTab = Array.from(tabList.querySelectorAll("[data-tab-item-id]")).find((tab) => tab.dataset.tabItemId === tabId);
			if (!activeTab) return;
			const tabLeft = activeTab.offsetLeft;
			const tabRight = tabLeft + activeTab.offsetWidth;
			const visibleLeft = tabList.scrollLeft;
			const visibleRight = visibleLeft + tabList.clientWidth;
			const nextScrollLeft = tabLeft < visibleLeft ? tabLeft : tabRight > visibleRight ? tabRight - tabList.clientWidth : void 0;
			if (nextScrollLeft === void 0) return;
			if (typeof tabList.scrollTo === "function") tabList.scrollTo({
				left: nextScrollLeft,
				behavior: "smooth"
			});
			else tabList.scrollLeft = nextScrollLeft;
		}
		watch(() => props.activeTabId, (tabId) => {
			if (!tabId) return;
			nextTick(() => {
				scrollTabIntoView(tabId);
			});
		});
		/** A browser tab has no page of its own, so it has no link. */
		function tabHref(tab) {
			return isArtifactTab(tab) ? artifactHref(tab.type, tab.id, tab.projectId) : void 0;
		}
		function handleOpenInEditor(tab) {
			if (!isArtifactTab(tab)) return;
			openArtifactInNewTab(tab.type, tab.id, tab.projectId);
		}
		const { getSummary: getArtifactSummary, displayName, refresh: refreshSummaries } = useArtifactTabSummaries(() => props.tabs.filter(isArtifactTab));
		const getSummary = (tab) => isArtifactTab(tab) ? getArtifactSummary(tab) : void 0;
		function tabName(tab) {
			if (!isArtifactTab(tab)) return tab.name;
			return tab.type === "skill" ? skillsStore.skillNames.get(tab.id) ?? tab.name : displayName(tab);
		}
		const hoverTarget = shallowRef(null);
		const hoveredTab = computed(() => {
			const target = hoverTarget.value;
			const tab = target && props.tabs.find(({ id }) => id === target.tabId);
			return tab ? {
				tab,
				reference: target.reference
			} : null;
		});
		const hoveredSummary = computed(() => hoveredTab.value ? getSummary(hoveredTab.value.tab) : void 0);
		const isHoveredSummaryLoading = computed(() => !!hoveredTab.value && isArtifactTab(hoveredTab.value.tab) && hasTabSummary(hoveredTab.value.tab) && hoveredSummary.value === void 0);
		const hoveredStatus = computed(() => {
			const summary = hoveredSummary.value;
			if (!summary) return void 0;
			if (summary.type === "workflow") return {
				label: i18n.baseText(summary.published ? "workflows.published" : "instanceAi.previewTabBar.draft"),
				published: summary.published
			};
			return {
				label: i18n.baseText("dataTable.card.column.count", {
					adjustToNumber: summary.columnCount,
					interpolate: { count: summary.columnCount }
				}),
				published: false
			};
		});
		function setHoveredTab(target) {
			hoverTarget.value = target;
			if (!hoveredTab.value) {
				hoverTarget.value = null;
				return;
			}
			if (isArtifactTab(hoveredTab.value.tab)) refreshSummaries([hoveredTab.value.tab]);
		}
		const { start: startOpenTimer, stop: stopOpenTimer } = useTimeoutFn(setHoveredTab, HOVER_DELAY.SHOW, { immediate: false });
		const { start: startCloseTimer, stop: stopCloseTimer } = useTimeoutFn(() => {
			hoverTarget.value = null;
		}, HOVER_DELAY.LEAVE, { immediate: false });
		function showTabHoverCard(tab, event) {
			if (!(event.currentTarget instanceof HTMLElement)) return;
			if (tabDrag.draggedTabId.value !== void 0) return;
			const target = {
				tabId: tab.id,
				reference: event.currentTarget
			};
			stopCloseTimer();
			if (hoveredTab.value) setHoveredTab(target);
			else startOpenTimer(target);
		}
		function scheduleHideTabHoverCard() {
			stopOpenTimer();
			if (hoveredTab.value) startCloseTimer();
		}
		function hideTabHoverCard() {
			stopOpenTimer();
			stopCloseTimer();
			hoverTarget.value = null;
		}
		watch(hoveredTab, (tab) => {
			if (!tab && hoverTarget.value) hideTabHoverCard();
		});
		function handleHoverCardOpenChange(open) {
			if (!open) hideTabHoverCard();
		}
		const tabDrag = useTabDragReorder({
			getTabElements: () => {
				const tabList = getTabListElement();
				return tabList ? Array.from(tabList.querySelectorAll("[data-tab-item-id]")) : [];
			},
			onReorder: (tabId, toIndex) => emit("reorderTab", tabId, toIndex),
			onDragStart: () => hideTabHoverCard()
		});
		async function handleCopyLink(tab) {
			if (!isArtifactTab(tab)) return;
			const url = artifactUrl(tab.type, tab.id, tab.projectId);
			if (!url) return;
			await clipboard.copy(url);
			toast.showMessage({
				title: i18n.baseText("generic.copiedToClipboard"),
				type: "success"
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.header) }, [
				__props.previewToggleLabel ? (openBlock(), createBlock(unref(N8nIconButton_default), {
					key: 0,
					icon: "panel-right",
					variant: "ghost",
					size: "medium",
					"aria-label": __props.previewToggleLabel,
					title: __props.previewToggleLabel,
					"aria-pressed": true,
					"data-test-id": "instance-ai-artifacts-preview-toggle",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("togglePreview"))
				}, null, 8, ["aria-label", "title"])) : createCommentVNode("", true),
				createVNode(unref(TabsList_default), {
					ref_key: "tabListRef",
					ref: tabListRef,
					"aria-label": unref(i18n).baseText("instanceAi.artifactsPanel.title"),
					class: normalizeClass(_ctx.$style.tabList)
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.tabs, (tab) => {
						return openBlock(), createBlock(unref(ContextMenuRoot_default), { key: tab.id }, {
							default: withCtx(() => [createVNode(unref(ContextMenuTrigger_default), { "as-child": "" }, {
								default: withCtx(() => [createBaseVNode("div", {
									class: normalizeClass([_ctx.$style.tab, {
										[_ctx.$style.tabActive]: tab.id === __props.activeTabId,
										[_ctx.$style.tabDragging]: tab.id === unref(tabDrag).draggedTabId.value
									}]),
									"data-tab-item-id": tab.id,
									onPointerdown: ($event) => unref(tabDrag).onPointerDown(tab.id, $event),
									onMouseenter: ($event) => showTabHoverCard(tab, $event),
									onMouseleave: scheduleHideTabHoverCard,
									onContextmenu: hideTabHoverCard,
									onMousedown: _cache[1] || (_cache[1] = withModifiers(() => {}, ["middle", "prevent"])),
									onAuxclick: withModifiers(($event) => emit("closeTab", tab.id), ["middle", "prevent"])
								}, [createVNode(unref(TabsTrigger_default), {
									value: tab.id,
									"data-tab-id": tab.id,
									class: normalizeClass(_ctx.$style.tabTrigger),
									onKeydown: withKeys(withModifiers(($event) => emit("closeTab", tab.id), ["prevent"]), ["delete"])
								}, {
									default: withCtx(() => [
										unref(isArtifactTab)(tab) && tab.building ? (openBlock(), createBlock(unref(N8nIcon_default), {
											key: 0,
											icon: "spinner",
											size: "large",
											spin: "",
											class: normalizeClass(_ctx.$style.icon),
											"data-test-id": "instance-ai-tab-building-spinner"
										}, null, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
											key: 1,
											icon: tab.icon,
											size: "large",
											class: normalizeClass(_ctx.$style.icon)
										}, null, 8, ["icon", "class"])),
										createBaseVNode("span", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(tabName(tab)), 3),
										tab.type === "browser" && tab.userAction ? (openBlock(), createElementBlock("span", {
											key: 2,
											class: normalizeClass(_ctx.$style.waitingDot),
											role: "img",
											"aria-label": unref(i18n).baseText("instanceAi.cloudBrowser.needsYou"),
											"data-test-id": "instance-ai-tab-waiting"
										}, null, 10, _hoisted_2$3)) : createCommentVNode("", true)
									]),
									_: 2
								}, 1032, [
									"value",
									"data-tab-id",
									"class",
									"onKeydown"
								]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.closeSlot) }, [createVNode(unref(N8nIconButton_default), mergeProps({
									icon: "x",
									variant: "ghost",
									size: "xsmall",
									class: _ctx.$style.closeButton
								}, { ref_for: true }, { [unref(TAB_DRAG_IGNORE_ATTRIBUTE)]: "" }, {
									"aria-label": unref(i18n).baseText("instanceAi.previewTabBar.closeTab", { interpolate: { name: tabName(tab) } }),
									"data-test-id": "instance-ai-tab-close",
									onClick: withModifiers(($event) => emit("closeTab", tab.id), ["stop"])
								}), null, 16, [
									"class",
									"aria-label",
									"onClick"
								])], 2)], 42, _hoisted_1$11)]),
								_: 2
							}, 1024), createVNode(unref(ContextMenuPortal_default), null, {
								default: withCtx(() => [createVNode(unref(ContextMenuContent_default), { class: normalizeClass(_ctx.$style.contextMenu) }, {
									default: withCtx(() => [createVNode(unref(ContextMenuItem_default), {
										class: normalizeClass(_ctx.$style.contextMenuItem),
										disabled: !tabHref(tab),
										onSelect: ($event) => handleOpenInEditor(tab)
									}, {
										default: withCtx(() => [createVNode(unref(N8nIcon_default), {
											icon: "external-link",
											size: "small"
										}), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText(tab.type === "skill" ? "instanceAi.previewTabBar.openInSkillHub" : "instanceAi.previewTabBar.openInEditor")), 1)]),
										_: 2
									}, 1032, [
										"class",
										"disabled",
										"onSelect"
									]), createVNode(unref(ContextMenuItem_default), {
										class: normalizeClass(_ctx.$style.contextMenuItem),
										disabled: !tabHref(tab),
										onSelect: ($event) => handleCopyLink(tab)
									}, {
										default: withCtx(() => [createVNode(unref(N8nIcon_default), {
											icon: "link",
											size: "small"
										}), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("instanceAi.previewTabBar.copyLink")), 1)]),
										_: 1
									}, 8, [
										"class",
										"disabled",
										"onSelect"
									])]),
									_: 2
								}, 1032, ["class"])]),
								_: 2
							}, 1024)]),
							_: 2
						}, 1024);
					}), 128)), __props.projectId ? (openBlock(), createBlock(InstanceAiResourcePicker_default, {
						key: 0,
						"project-id": __props.projectId,
						"excluded-tabs": __props.tabs.filter(unref(isArtifactTab)),
						onSelect: _cache[2] || (_cache[2] = ($event) => emit("openTab", $event))
					}, {
						trigger: withCtx(({ isOpen }) => [createVNode(unref(N8nIconButton_default), {
							icon: "plus",
							variant: "ghost",
							size: "small",
							class: normalizeClass([_ctx.$style.newTabButton, { [_ctx.$style.newTabButtonOpen]: isOpen }]),
							"aria-label": unref(i18n).baseText("instanceAi.previewTabBar.newTab"),
							"data-test-id": "instance-ai-new-tab-button"
						}, null, 8, ["class", "aria-label"])]),
						_: 1
					}, 8, ["project-id", "excluded-tabs"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, ["aria-label", "class"]),
				createVNode(unref(N8nHoverCard_default), {
					open: !!hoveredTab.value,
					"hide-trigger": "",
					reference: hoveredTab.value?.reference,
					side: "bottom",
					align: "center",
					"side-offset": 4,
					"open-delay": 0,
					"close-delay": 0,
					"content-class": _ctx.$style.hoverCard,
					"onUpdate:open": handleHoverCardOpenChange
				}, {
					content: withCtx(() => [hoveredTab.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.hoverCardBody),
						"data-test-id": "instance-ai-tab-hover-card"
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.hoverCardText) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.hoverCardName) }, toDisplayString(tabName(hoveredTab.value.tab)), 3), hoveredSummary.value ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.hoverCardMeta)
					}, [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.previewTabBar.edited")) + " ", 1), createVNode(TimeAgo_default, { date: hoveredSummary.value.updatedAt }, null, 8, ["date"])], 2)) : isHoveredSummaryLoading.value ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass([
							_ctx.$style.hoverCardMeta,
							_ctx.$style.placeholder,
							_ctx.$style.placeholderMeta
						]),
						"data-test-id": "instance-ai-tab-hover-card-placeholder"
					}, [createVNode(unref(N8nLoading_default), {
						variant: "custom",
						class: normalizeClass(_ctx.$style.placeholderSkeleton)
					}, null, 8, ["class"])], 2)) : createCommentVNode("", true)], 2), isHoveredSummaryLoading.value ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass([
							_ctx.$style.statusTag,
							_ctx.$style.placeholder,
							_ctx.$style.placeholderTag
						])
					}, [createVNode(unref(N8nLoading_default), {
						variant: "custom",
						class: normalizeClass(_ctx.$style.placeholderSkeleton)
					}, null, 8, ["class"])], 2)) : hoveredStatus.value ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass([_ctx.$style.statusTag, { [_ctx.$style.statusTagPublished]: hoveredStatus.value.published }]),
						"data-test-id": "instance-ai-tab-hover-card-status"
					}, toDisplayString(hoveredStatus.value.label), 3)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"open",
					"reference",
					"content-class"
				]),
				createVNode(ManualEditorButton_default, {
					tabs: __props.tabs.filter(unref(isArtifactTab)),
					"active-tab-id": __props.activeTabId
				}, null, 8, ["tabs", "active-tab-id"]),
				createVNode(unref(N8nIconButton_default), {
					icon: __props.isExpanded ? "minimize-2" : "maximize-2",
					variant: "ghost",
					size: "medium",
					disabled: __props.isExpandDisabled,
					"aria-label": sizeToggleLabel.value,
					title: __props.isExpandDisabled ? void 0 : sizeToggleLabel.value,
					"data-test-id": "instance-ai-preview-expand-toggle",
					onClick: handleToggleExpanded
				}, null, 8, [
					"icon",
					"disabled",
					"aria-label",
					"title"
				])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	waitingDot: "_waitingDot_1anoy_2",
	"waiting-pulse": "_waiting-pulse_1anoy_1",
	header: "_header_1anoy_39",
	tabList: "_tabList_1anoy_50",
	scrollfade: "_scrollfade_1anoy_1",
	tab: "_tab_1anoy_50",
	tabActive: "_tabActive_1anoy_85",
	tabDragging: "_tabDragging_1anoy_88",
	closeSlot: "_closeSlot_1anoy_92",
	closeButton: "_closeButton_1anoy_96",
	tabTrigger: "_tabTrigger_1anoy_101",
	label: "_label_1anoy_120",
	labelfade: "_labelfade_1anoy_1",
	icon: "_icon_1anoy_166",
	hoverCard: "_hoverCard_1anoy_170",
	hoverCardBody: "_hoverCardBody_1anoy_179",
	hoverCardText: "_hoverCardText_1anoy_186",
	hoverCardName: "_hoverCardName_1anoy_195",
	hoverCardMeta: "_hoverCardMeta_1anoy_201",
	placeholder: "_placeholder_1anoy_206",
	statusTag: "_statusTag_1anoy_212",
	placeholderSkeleton: "_placeholderSkeleton_1anoy_216",
	placeholderMeta: "_placeholderMeta_1anoy_221",
	placeholderTag: "_placeholderTag_1anoy_225",
	statusTagPublished: "_statusTagPublished_1anoy_240",
	newTabButton: "_newTabButton_1anoy_245",
	newTabButtonOpen: "_newTabButtonOpen_1anoy_249",
	contextMenu: "_contextMenu_1anoy_253",
	contextMenuItem: "_contextMenuItem_1anoy_263"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiSkillPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$10 = ["aria-busy"];
var InstanceAiSkillPreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiSkillPreview",
	props: {
		skillId: {},
		refreshKey: { default: 0 }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const skillsStore = useSkillsStore();
		const { showError } = useToast();
		const detail = shallowRef(null);
		const isLoading = ref(false);
		const fetchError = ref(false);
		watch(() => [props.skillId, props.refreshKey], async ([skillId], previous, onCleanup) => {
			let cancelled = false;
			onCleanup(() => {
				cancelled = true;
			});
			if (!(previous?.[0] === skillId)) detail.value = null;
			isLoading.value = true;
			fetchError.value = false;
			const result = await skillsStore.fetchSkill(skillId).catch(() => null);
			if (cancelled) return;
			isLoading.value = false;
			if (!result) {
				detail.value = null;
				fetchError.value = true;
				return;
			}
			detail.value = result;
		}, { immediate: true });
		async function saveSkill({ skill }) {
			const current = detail.value;
			if (!current?.canEdit || isLoading.value) return { saved: false };
			try {
				const saved = await skillsStore.saveSkill(current.id, {
					name: skill.name,
					description: skill.description,
					instructions: skill.instructions,
					references: skill.references ?? [],
					baseSkillHash: current.skillHash
				});
				if (detail.value !== current) return { saved: false };
				detail.value = {
					...current,
					name: saved.skill.name,
					description: saved.skill.description,
					skill: saved.skill,
					skillHash: saved.skillHash,
					latestVersion: saved.version
				};
			} catch (error) {
				if (isSkillNameTakenError(error)) return {
					saved: false,
					nameError: i18n.baseText("settings.context.skills.error.nameTaken")
				};
				showError(error, i18n.baseText("settings.context.skills.error.save"));
				return { saved: false };
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.content),
				"aria-busy": isLoading.value,
				"data-test-id": "instance-ai-skill-preview"
			}, [fetchError.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.centerState)
			}, [createVNode(unref(N8nText_default), { color: "text-light" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.skillPreview.fetchError")), 1)]),
				_: 1
			})], 2)) : isLoading.value && !detail.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.centerState),
				"data-test-id": "instance-ai-skill-preview-loading"
			}, [createVNode(unref(N8nIcon_default), {
				icon: "loader-circle",
				size: 80,
				spin: ""
			})], 2)) : detail.value ? (openBlock(), createBlock(AgentSkillModal_default, {
				key: __props.skillId,
				inline: "",
				data: {
					skillId: detail.value.id,
					skill: detail.value.skill,
					readOnly: !detail.value.canEdit || isLoading.value,
					syncedFrom: detail.value.syncedFrom ?? void 0,
					onConfirm: saveSkill
				}
			}, null, 8, ["data"])) : createCommentVNode("", true)], 10, _hoisted_1$10);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_1g0f9_1",
	centerState: "_centerState_1g0f9_9"
} }]]);
//#endregion
//#region src/app/components/WorkflowCanvasHostBody.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var WorkflowCanvasHostBody_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "WorkflowCanvasHostBody",
	props: {
		workflowId: {},
		refreshKey: {},
		initialWorkflow: {},
		initialExecution: {}
	},
	emits: ["ready", "workflow-loaded"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const currentWorkflowDocumentStore = injectStrict(WorkflowDocumentStoreKey);
		provide(EmbeddedCanvasElementKey, useTemplateRef("canvas"));
		const canvasStore = useCanvasStore();
		const nodeCreatorStore = useNodeCreatorStore();
		const workflowSaveStore = useWorkflowSaveStore();
		const loadError = ref();
		const { isLoading, initializeData, initializeWorkflow, openWorkflow, cleanup } = useWorkflowInitialization({ onLoadError: (error, workflowId) => {
			if (workflowId !== props.workflowId) return;
			loadError.value = error instanceof ResponseError && error.httpStatusCode === 403 ? "unauthorized" : "notFound";
		} });
		/**
		* Display-only counterpart of the editor's debug-mode execution loading: shows
		* the hand-off execution snapshot on the canvas. Seeds its per-execution store
		* and marks it the displayed execution — no fetch, since the editor already had
		* the run data and handed it over. A live or pending run always wins — it owns
		* `activeExecutionId`, which we never touch here. Unlike the editor's
		* `applyExecutionData` it has no debug side effects (node matching, pin-data).
		*/
		function showInitialExecution() {
			if (!props.initialExecution) return;
			const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId(props.workflowId));
			if (executionState.activeExecutionId !== void 0) return;
			const { id } = props.initialExecution;
			useExecutionDataStore(createExecutionDataId(id)).setExecution(props.initialExecution);
			executionState.setDisplayedExecutionId(id);
		}
		async function loadWorkflow(force) {
			loadError.value = void 0;
			if (!force && props.initialWorkflow) {
				await openWorkflow(props.initialWorkflow);
				isLoading.value = false;
			} else await initializeWorkflow(force);
			if (!loadError.value && currentWorkflowDocumentStore.value) emit("workflow-loaded", props.workflowId);
		}
		onMounted(async () => {
			await initializeData();
			await loadWorkflow(false);
			showInitialExecution();
			emit("ready");
		});
		watch(() => [props.workflowId, props.refreshKey], async () => {
			await loadWorkflow(true);
		});
		onBeforeUnmount(() => {
			cleanup();
			nodeCreatorStore.isCreateNodeActive = false;
			canvasStore.setHasRangeSelection(false);
			canvasStore.newNodeInsertPosition = null;
			workflowSaveStore.reset();
		});
		function requestFitView() {
			canvasEventBus.emit("fitView");
		}
		__expose({ requestFitView });
		const isReady = computed(() => !isLoading.value && !!currentWorkflowDocumentStore.value);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.host),
				"data-test-id": "workflow-canvas-host"
			}, [loadError.value === "unauthorized" ? (openBlock(), createBlock(EntityUnAuthorised_default, {
				key: 0,
				"entity-type": "workflow",
				class: normalizeClass(_ctx.$style.centerState),
				"data-test-id": "workflow-canvas-host-error"
			}, null, 8, ["class"])) : loadError.value === "notFound" ? (openBlock(), createBlock(EntityNotFound_default, {
				key: 1,
				"entity-type": "workflow",
				"hide-action": "",
				class: normalizeClass(_ctx.$style.centerState),
				"data-test-id": "workflow-canvas-host-error"
			}, null, 8, ["class"])) : isReady.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
				createVNode(MainHeader_default, { class: normalizeClass(_ctx.$style.header) }, null, 8, ["class"]),
				createBaseVNode("div", {
					ref: "canvas",
					class: normalizeClass(_ctx.$style.canvas)
				}, [createVNode(NodeView_default)], 2),
				createVNode(LogsPanel_default, { class: normalizeClass(_ctx.$style.logs) }, null, 8, ["class"])
			], 64)) : (openBlock(), createElementBlock("div", {
				key: 3,
				class: normalizeClass(_ctx.$style.centerState)
			}, [createVNode(unref(N8nIcon_default), {
				icon: "loader-circle",
				size: 80,
				spin: ""
			})], 2))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	host: "_host_8mfox_1",
	header: "_header_8mfox_10",
	canvas: "_canvas_8mfox_14",
	logs: "_logs_8mfox_20",
	centerState: "_centerState_8mfox_24"
} }]]);
//#endregion
//#region src/app/components/WorkflowCanvasHost.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/app/components/WorkflowCanvasHost.vue
var WorkflowCanvasHost_default = /* @__PURE__ */ defineComponent({
	__name: "WorkflowCanvasHost",
	props: {
		workflowId: {},
		refreshKey: { default: 0 },
		initialWorkflow: { default: void 0 },
		initialExecution: { default: void 0 }
	},
	emits: ["ready", "workflow-loaded"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const localWorkflowId = computed(() => props.workflowId);
		provide(WorkflowIdKey, localWorkflowId);
		const currentWorkflowDocumentStore = shallowRef(null);
		provide(WorkflowDocumentStoreKey, currentWorkflowDocumentStore);
		const bodyRef = shallowRef(null);
		function requestFitView() {
			bodyRef.value?.requestFitView();
		}
		__expose({ requestFitView });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(WorkflowCanvasHostBody_default, {
				ref_key: "bodyRef",
				ref: bodyRef,
				"workflow-id": __props.workflowId,
				"refresh-key": __props.refreshKey,
				"initial-workflow": __props.initialWorkflow,
				"initial-execution": __props.initialExecution,
				onReady: _cache[0] || (_cache[0] = ($event) => emit("ready")),
				onWorkflowLoaded: _cache[1] || (_cache[1] = (id) => emit("workflow-loaded", id))
			}, null, 8, [
				"workflow-id",
				"refresh-key",
				"initial-workflow",
				"initial-execution"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/composables/useInstanceAiWorkflowPreviewExecution.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var LOGS_AUTO_OPEN_MIN_PANE_WIDTH = 650;
var LOGS_AUTO_OPEN_MIN_PANE_HEIGHT = 600;
function hasPinData(pinData) {
	return pinData !== void 0 && Object.keys(pinData).length > 0;
}
function normalizeExecutionPinData(execution) {
	const data = execution.data;
	const resultData = data?.resultData;
	const workflowPinData = execution.workflowData.pinData;
	if (!data || !resultData || !hasPinData(workflowPinData) || hasPinData(resultData.pinData)) return execution;
	return {
		...execution,
		data: {
			...data,
			resultData: {
				...resultData,
				pinData: workflowPinData
			}
		}
	};
}
function useInstanceAiWorkflowPreviewExecution(options) {
	const pushStore = usePushConnectionStore();
	const workflowsStore = useWorkflowsStore();
	const logsStore = useLogsStore();
	const aiSimulatedExecutionsStore = useAiSimulatedExecutionsStore();
	const thread = useArtifactThread();
	const telemetry = useTelemetry();
	const latestAgentExecution = shallowRef();
	const supersededAgentExecutionId = shallowRef(null);
	let latestExecutionLoadRequest = 0;
	let isTogglingLogsAutomatically = false;
	const logsPanelMemory = thread.logsPanelMemory;
	function isPaneLargeEnoughForLogs() {
		const rect = options.paneElement()?.getBoundingClientRect();
		return rect !== void 0 && rect.width >= LOGS_AUTO_OPEN_MIN_PANE_WIDTH && rect.height >= LOGS_AUTO_OPEN_MIN_PANE_HEIGHT;
	}
	function isPaneVisible() {
		const pane = options.paneElement();
		return pane !== null && getComputedStyle(pane).visibility !== "hidden";
	}
	function openLogsAutomatically() {
		isTogglingLogsAutomatically = true;
		logsStore.toggleOpen(true);
		isTogglingLogsAutomatically = false;
		telemetry.track("User toggled log view", {
			new_state: "attached",
			source: "auto",
			context: "artifact"
		});
	}
	function openLogsForFailedRun(executionId) {
		if (!isPaneVisible()) return;
		if (executionId !== logsPanelMemory.latestStartedExecutionIds.get(options.workflowId())) return;
		if (logsStore.isOpen || logsPanelMemory.collapsedByUser) return;
		if (!isPaneLargeEnoughForLogs()) return;
		openLogsAutomatically();
	}
	watch(() => logsStore.isOpen, (isOpen) => {
		if (isTogglingLogsAutomatically) return;
		if (!isOpen) logsPanelMemory.collapsedByUser = true;
	}, { flush: "sync" });
	function applyExecution(execution) {
		const workflowId = options.workflowId();
		if (execution.workflowId !== workflowId) return false;
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId));
		const activeExecutionId = executionState.activeExecutionId;
		if (activeExecutionId === null) return false;
		if (typeof activeExecutionId === "string" && activeExecutionId !== execution.id) return false;
		executionState.setWorkflowExecutionData(normalizeExecutionPinData(execution));
		return true;
	}
	function hasManualExecution() {
		return thread.getRememberedManualExecution(options.workflowId()) !== void 0;
	}
	async function fetchPreviewExecution(executionId) {
		const request = ++latestExecutionLoadRequest;
		let execution;
		try {
			execution = await workflowsStore.fetchExecutionDataById(executionId);
		} catch {
			return;
		}
		if (request !== latestExecutionLoadRequest) return;
		if (!execution || execution.workflowId !== options.workflowId()) return;
		return normalizeExecutionPinData(execution);
	}
	function restoreLatestAgentExecution() {
		if (hasManualExecution()) return;
		const execution = latestAgentExecution.value;
		if (!execution) return;
		if (supersededAgentExecutionId.value === execution.id) return;
		applyExecution(execution);
	}
	async function showExecutionResult(executionResult) {
		if (!executionResult) return;
		if (executionResult.simulatedNodeNames?.length) aiSimulatedExecutionsStore.markSimulatedNodes(executionResult.executionId, executionResult.simulatedNodeNames);
		if (hasManualExecution()) return;
		if (supersededAgentExecutionId.value === executionResult.executionId) return;
		if (latestAgentExecution.value?.id === executionResult.executionId) {
			applyExecution(latestAgentExecution.value);
			return;
		}
		const execution = await fetchPreviewExecution(executionResult.executionId);
		if (!execution) return;
		latestAgentExecution.value = execution;
		if (supersededAgentExecutionId.value !== execution.id) applyExecution(execution);
	}
	async function restoreManualExecution(executionId) {
		const execution = await fetchPreviewExecution(executionId);
		if (execution) applyExecution(execution);
	}
	function restoreExecutionResult() {
		const manual = thread.getRememberedManualExecution(options.workflowId());
		if (manual && options.executionResult()?.executionId === manual.agentExecutionId) {
			restoreManualExecution(manual.executionId);
			return;
		}
		if (manual) thread.forgetManualExecution(options.workflowId());
		showExecutionResult(options.executionResult());
	}
	const removeExecutionStartedListener = pushStore.addEventListener((event) => {
		if (event.type !== "executionStarted") return;
		if (event.data.workflowId !== options.workflowId()) return;
		logsPanelMemory.latestStartedExecutionIds.set(options.workflowId(), event.data.executionId);
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId(options.workflowId()));
		if (event.data.source !== "instance_ai") {
			thread.rememberManualExecution(options.workflowId(), event.data.executionId, options.executionResult()?.executionId);
			supersededAgentExecutionId.value = options.executionResult()?.executionId ?? null;
			return;
		}
		thread.forgetManualExecution(options.workflowId());
		if (typeof executionState.activeExecutionId === "string" && executionState.activeExecutionId !== event.data.executionId) return;
		executionState.setActiveExecutionId(null);
	});
	const removeExecutionFinishedListener = pushStore.addEventListener((event) => {
		if (event.type !== "executionFinished") return;
		if (event.data.workflowId !== options.workflowId()) return;
		if (event.data.status === "success") {
			options.reportWorkflowSuccess?.(event.data.workflowId);
			return;
		}
		if (event.data.status !== "error" && event.data.status !== "crashed") return;
		openLogsForFailedRun(event.data.executionId);
		if (event.data.source === "instance_ai") return;
		options.reportWorkflowFailures(event.data.executionId, event.data.workflowId);
	});
	watch(() => [options.workflowId(), options.executionResult()?.executionId], () => {
		showExecutionResult(options.executionResult());
	}, { immediate: true });
	watch(() => {
		const workflowId = options.workflowId();
		return [workflowId, useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId)).activeExecutionId];
	}, () => {
		restoreLatestAgentExecution();
	});
	onBeforeUnmount(() => {
		removeExecutionStartedListener();
		removeExecutionFinishedListener();
	});
	return { restoreExecutionResult };
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiWorkflowPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiWorkflowPreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiWorkflowPreview",
	props: {
		workflowId: {},
		initialNodeId: { default: void 0 },
		refreshKey: { default: 0 },
		executionResult: { default: void 0 }
	},
	emits: [
		"initial-node-id-consumed",
		"workflow-failures",
		"workflow-succeeded"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const hostRef = useTemplateRef("host");
		const paneElement = useTemplateRef("pane");
		function requestFitView() {
			hostRef.value?.requestFitView();
		}
		__expose({ requestFitView });
		function collectNodeErrors(runData) {
			const errors = [];
			for (const [nodeName, tasks] of Object.entries(runData ?? {})) {
				const error = tasks?.at(-1)?.error;
				if (!error) continue;
				const description = error.description ? ` (${error.description})` : "";
				errors.push({
					nodeName,
					errorMessage: `${error.message ?? "Unknown error"}${description}`
				});
			}
			return errors;
		}
		function collectValidationIssues(workflowId) {
			const docStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			const errors = [];
			for (const node of docStore.allNodes) {
				if (!node.issues) continue;
				const messages = nodeIssuesToString(node.issues, node);
				if (messages.length === 0) continue;
				errors.push({
					nodeName: node.name,
					errorMessage: messages.join(" ")
				});
			}
			return errors;
		}
		function reportWorkflowFailures(executionId, workflowId) {
			let errors = collectNodeErrors(useExecutionDataStore(createExecutionDataId(executionId)).executionRunData);
			if (errors.length === 0) errors = collectValidationIssues(workflowId);
			if (errors.length === 0) return;
			emit("workflow-failures", {
				workflowId,
				executionId,
				errors
			});
		}
		const { restoreExecutionResult } = useInstanceAiWorkflowPreviewExecution({
			workflowId: () => props.workflowId,
			executionResult: () => props.executionResult,
			reportWorkflowFailures,
			reportWorkflowSuccess: (workflowId) => emit("workflow-succeeded", workflowId),
			paneElement: () => paneElement.value
		});
		let pendingInitialNodeId = props.initialNodeId;
		function handleWorkflowLoaded(workflowId) {
			restoreExecutionResult();
			const nodeId = pendingInitialNodeId;
			pendingInitialNodeId = void 0;
			if (!nodeId) return;
			emit("initial-node-id-consumed");
			const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
			const node = documentStore.getNodeById(nodeId);
			if (!node) return;
			useNDVStore(documentStore.documentId).setActiveNodeName(node.name, "other");
		}
		const thread = useArtifactThread();
		const isAgentWorking = useIsAgentWorking();
		const settingsStore = useInstanceAiSettingsStore();
		const handoff = thread.consumePendingHandoff(props.workflowId);
		const initialWorkflow = handoff?.workflow;
		const initialExecution = handoff?.execution;
		const isAgentEditingThisWorkflow = computed(() => isAgentEditingWorkflow(thread.artifactTurns, props.workflowId));
		const enabledFeatures = computed(() => ({
			aiAssistant: false,
			aiBuilder: false,
			askAi: false,
			readOnly: isAgentWorking.value || isAgentEditingThisWorkflow.value,
			executionSuccessToasts: false,
			executionErrorToasts: false,
			executionButtonType: "secondary",
			credentialSetupWarnings: settingsStore.isInstanceAiSetupPanelEnabled
		}));
		provide(EditorEnabledFeaturesKey, enabledFeatures);
		provide(LogsPanelHostKey, {
			context: "artifact",
			heightStorageKey: LOCAL_STORAGE_INSTANCE_AI_ARTIFACT_LOGS_PANEL_HEIGHT,
			heightContainer: () => paneElement.value
		});
		const rootStore = useRootStore();
		provide(InstanceAiEditorCapabilityKey, { openCredential: async (credential) => {
			thread.sendMessage(buildInstanceAiArtifactCredentialQuestion(credential), {
				authorship: {
					kind: "prefill",
					prefillType: "handoff_credential_setup"
				},
				pushRef: rootStore.pushRef,
				handoffContext: buildInstanceAiCredentialHandoffContext(credential)
			});
			return true;
		} });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref: "pane",
				class: normalizeClass(_ctx.$style.content)
			}, [createVNode(WorkflowCanvasHost_default, {
				ref: "host",
				"workflow-id": __props.workflowId,
				"refresh-key": __props.refreshKey,
				"initial-workflow": unref(initialWorkflow),
				"initial-execution": unref(initialExecution),
				onWorkflowLoaded: handleWorkflowLoaded
			}, null, 8, [
				"workflow-id",
				"refresh-key",
				"initial-workflow",
				"initial-execution"
			])], 2);
		};
	}
}), [["__cssModules", { "$style": { content: "_content_x1wv5_1" } }]]);
//#endregion
//#region src/features/ai/instanceAi/composables/useArtifactsLayout.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var MIN_SPLIT_PANEL_WIDTH = 400;
var DEFAULT_CHAT_PANEL_CONTENT_WIDTH = 800;
/**
* A wide view keeps the artifacts panel beside the chat until the user hides it.
* A narrow view shows it over the chat only when the user asks for it.
*/
function useArtifactsPanelToggle(options) {
	const i18n = useI18n();
	const isDismissedInLayout = ref(false);
	const isRevealed = ref(false);
	const showArtifactsPanel = computed(() => options.canShow() && !options.isHidden?.() && !options.isPreviewVisible() && (options.isInLayout() ? !isDismissedInLayout.value : isRevealed.value));
	const artifactsPanelToggleLabel = computed(() => i18n.baseText(showArtifactsPanel.value ? "instanceAi.artifactsPanel.hidePanel" : "instanceAi.artifactsPanel.showPanel"));
	function toggleArtifactsPanel() {
		if (!options.canShow() || options.isPreviewVisible()) return;
		if (options.isInLayout()) isDismissedInLayout.value = showArtifactsPanel.value;
		else isRevealed.value = !showArtifactsPanel.value;
	}
	watch(options.isInLayout, (isInLayout) => {
		isRevealed.value = false;
		if (isInLayout) isDismissedInLayout.value = false;
	});
	watch(options.canShow, (canShow) => {
		if (canShow) return;
		isRevealed.value = false;
		isDismissedInLayout.value = false;
	});
	watch(options.isPreviewVisible, (visible) => {
		if (visible) isRevealed.value = false;
	}, { flush: "sync" });
	onClickOutside(options.panelSlot, () => {
		if (options.isInLayout()) return;
		isRevealed.value = false;
	}, { ignore: [options.toggleSelector, ".n8n-tooltip"] });
	return {
		showArtifactsPanel,
		artifactsPanelToggleLabel,
		toggleArtifactsPanel
	};
}
/**
* The width of the preview beside the chat. The split is stored as the chat's
* share of the thread area, so it survives window and sidebar resizes.
*/
function usePreviewPanelWidth(options) {
	const { threadAreaWidth } = options;
	const chatPanelWidthRatio = useLocalStorage(LOCAL_STORAGE_INSTANCE_AI_CHAT_PANEL_WIDTH_RATIO, -1, { writeDefaults: false });
	const halfThreadAreaWidth = computed(() => Math.round(threadAreaWidth.value / 2));
	const previewMinWidth = computed(() => Math.min(MIN_SPLIT_PANEL_WIDTH, halfThreadAreaWidth.value));
	const previewMaxWidth = computed(() => Math.max(threadAreaWidth.value - MIN_SPLIT_PANEL_WIDTH, halfThreadAreaWidth.value));
	const previewPanelWidth = computed(() => {
		const ratio = chatPanelWidthRatio.value;
		const chatPanelWidth = ratio >= 0 && ratio <= 1 ? threadAreaWidth.value * ratio : DEFAULT_CHAT_PANEL_CONTENT_WIDTH;
		return Math.round(Math.min(Math.max(threadAreaWidth.value - chatPanelWidth, previewMinWidth.value), previewMaxWidth.value));
	});
	const isPreviewResizeEnabled = computed(() => !options.isExpanded() && previewMinWidth.value < previewMaxWidth.value);
	function handlePreviewResize({ width }) {
		if (Math.round(width) === previewPanelWidth.value) return;
		chatPanelWidthRatio.value = (threadAreaWidth.value - width) / threadAreaWidth.value;
	}
	return {
		previewMinWidth,
		previewMaxWidth,
		previewPanelWidth,
		isPreviewResizeEnabled,
		handlePreviewResize
	};
}
/** Closes the preview, or opens it on the selected tab, else the first open tab. */
function usePreviewToggle(preview) {
	const i18n = useI18n();
	const previewToggleLabel = computed(() => i18n.baseText(preview.isPreviewVisible.value ? "instanceAi.artifactsPanel.hidePreview" : "instanceAi.artifactsPanel.showPreview"));
	function togglePreview() {
		if (preview.isPreviewVisible.value) {
			preview.closePreview();
			return;
		}
		const tab = preview.openTabs.value.find(({ id }) => id === preview.activeTabId.value) ?? preview.openTabs.value[0];
		if (tab) preview.selectTab(tab.id);
	}
	return {
		previewToggleLabel,
		togglePreview
	};
}
//#endregion
//#region src/features/ai/instanceAi/fixWithAi.ts
function buildFixWithAiPrompt(context) {
	const i18n = useI18n();
	if (context.errors.length === 1) {
		const { nodeName, errorMessage } = context.errors[0];
		if (context.workflowName) return i18n.baseText("instanceAi.fixWithAi.prompt.singleInWorkflow", { interpolate: {
			nodeName,
			errorMessage,
			workflowName: context.workflowName
		} });
		return i18n.baseText("instanceAi.fixWithAi.prompt.single", { interpolate: {
			nodeName,
			errorMessage
		} });
	}
	const errorList = context.errors.map(({ nodeName, errorMessage }) => i18n.baseText("instanceAi.fixWithAi.prompt.errorLine", { interpolate: {
		nodeName,
		errorMessage
	} })).join("\n");
	if (context.workflowName) return i18n.baseText("instanceAi.fixWithAi.prompt.multipleInWorkflow", { interpolate: {
		errorList,
		workflowName: context.workflowName
	} });
	return i18n.baseText("instanceAi.fixWithAi.prompt.multiple", { interpolate: { errorList } });
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/assistantAgentPreviewHandoff.ts
var AGENT_PREVIEW_CHIP_ID = "agent-preview-session";
/**
* The composer chip of an agent test chat that the user hands off to the
* Assistant. The hand-off context goes with the next message, like the
* context of a hand-off to a new thread.
*/
function toAgentPreviewComposerAttachment(context, label) {
	return {
		chip: {
			id: AGENT_PREVIEW_CHIP_ID,
			label,
			icon: "bot"
		},
		clientContextPatch: { context }
	};
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/assistantElementAttachments.ts
var ELEMENT_CHIP_ID = "element";
function toElementComposerAttachment(attachment) {
	return {
		chip: {
			id: ELEMENT_CHIP_ID,
			label: elementAttachmentLabel(attachment),
			icon: "mouse-pointer"
		},
		clientContextPatch: { attachments: [attachment] }
	};
}
function stagedElementAppId(staged) {
	const attachments = staged.find(({ chip }) => chip.id === ELEMENT_CHIP_ID)?.clientContextPatch?.attachments;
	const parsed = instanceAiElementAttachmentSchema.safeParse(Array.isArray(attachments) ? attachments[0] : void 0);
	return parsed.success ? parsed.data.appId : null;
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/assistantNodeAttachments.ts
/**
* Canvas nodes that the user adds to the Assistant agent chat. The composer
* shows one chip for each workflow, and the chip sends the nodes as an
* attachment in the client context of the next message.
*/
var NODES_CHIP_PREFIX = "nodes:";
/** The nodes attachment that a composer chip stages, if the chip is one. */
function readNodesAttachment(attachment) {
	if (!attachment?.chip.id.startsWith(NODES_CHIP_PREFIX)) return void 0;
	const staged = attachment.clientContextPatch?.attachments;
	const parsed = instanceAiNodesAttachmentSchema.safeParse(Array.isArray(staged) ? staged[0] : void 0);
	return parsed.success ? parsed.data : void 0;
}
/**
* The composer chip for the nodes of one workflow. Nodes that the chip of the
* workflow already stages stay, so adding more nodes joins them.
*/
function toNodesComposerAttachment(attachment, staged) {
	const id = `${NODES_CHIP_PREFIX}${attachment.workflowId}`;
	const existing = readNodesAttachment(staged.find(({ chip }) => chip.id === id));
	const merged = existing ? {
		...existing,
		sets: mergeNodeSets(existing.sets, attachment.sets)
	} : attachment;
	return {
		chip: {
			id,
			label: i18n.baseText("instanceAi.nodeContext.nodesBundle", { interpolate: { count: countAttachedNodes([merged]) } }),
			icon: "layers"
		},
		clientContextPatch: { attachments: [merged] }
	};
}
/** The number of canvas nodes that a sent message attached. */
function countSentNodes(clientContext) {
	const parsed = arrayType(instanceAiAttachmentSchema).safeParse(clientContext?.attachments);
	return parsed.success ? countAttachedNodes(parsed.data) : 0;
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/assistantAgentTargets.api.ts
async function fetchAssistantAgentTargets(context, threadId) {
	return await makeRestApiRequest(context, "GET", `/assistant/threads/${threadId}/agent-targets`);
}
async function bindAssistantAgentTarget(context, threadId, target) {
	return await makeRestApiRequest(context, "PUT", `/assistant/threads/${threadId}/agent-target`, target);
}
/** Saves the pending agent of the thread under its minted id and binds it in the same request. */
async function persistAssistantPendingAgent(context, threadId, request) {
	return await makeRestApiRequest(context, "POST", `/assistant/threads/${threadId}/agent`, request);
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/useAssistantAgentTargets.ts
init_reactivity_esm_bundler();
/**
* The agent bindings of an Assistant agent thread, from the metadata of its
* Agents thread. The turns change them on the server, so the view refreshes
* them after each turn.
*/
function useAssistantAgentTargets(options) {
	const rootStore = useRootStore();
	const state = shallowRef(null);
	let generation = 0;
	let deferredBind;
	function apply(targets) {
		generation += 1;
		state.value = targets;
	}
	async function refresh() {
		if (!options.canLoad()) return;
		const current = ++generation;
		try {
			const { targets } = await fetchAssistantAgentTargets(rootStore.restApiContext, options.threadId);
			if (current === generation) state.value = targets;
		} catch (error) {
			console.warn("Failed to load the agents of the Assistant thread", error);
		}
		const deferred = deferredBind;
		deferredBind = void 0;
		if (deferred) await agentTargets.bind(deferred).catch((error) => {
			console.warn("Failed to bind the agent of the Assistant thread", error);
		});
	}
	const agentTargets = {
		bind: async (target) => {
			if (!options.canLoad()) {
				deferredBind = target;
				return;
			}
			const { bound, pending } = state.value ?? {};
			if (bound?.agentId === target.agentId && bound.projectId === target.projectId && bound.name === target.name && !pending) return;
			const { targets } = await bindAssistantAgentTarget(rootStore.restApiContext, options.threadId, target);
			apply(targets);
		},
		persistPendingAgent: async (request) => {
			const { agent, targets } = await persistAssistantPendingAgent(rootStore.restApiContext, options.threadId, request);
			return {
				agent,
				commit: () => apply(targets)
			};
		}
	};
	return {
		state: readonly(state),
		refresh,
		agentTargets
	};
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/assistantAgentTrace.ts
var import_FileSaver_min = /* @__PURE__ */ __toESM(require_FileSaver_min(), 1);
/** The same limit as the event buffer of the current Assistant debug panel. */
var MAX_TRACE_EVENTS = 1e3;
function isDeltaEvent(event) {
	return event.type === "text-delta" || event.type === "reasoning-delta" || event.type === "tool-input-delta";
}
function deltaKey(event) {
	return `${event.type}:${event.type === "tool-input-delta" ? event.toolCallId : event.id}`;
}
/**
* Adds an event to the trace. A delta for the same part as the last event joins
* it, so the limit counts whole parts and not each streamed fragment. Past the
* limit, the oldest events go.
*/
function appendTraceEvent(events, event, limit = MAX_TRACE_EVENTS) {
	const last = events.at(-1);
	if (last && isDeltaEvent(event) && isDeltaEvent(last.event) && deltaKey(last.event) === deltaKey(event)) {
		events[events.length - 1] = {
			receivedAt: last.receivedAt,
			event: {
				...last.event,
				delta: last.event.delta + event.delta
			}
		};
		return;
	}
	events.push({
		receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
		event
	});
	if (events.length > limit) events.splice(0, events.length - limit);
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/useAssistantAgentTrace.ts
/**
* Lets a tester export what the browser received for an Assistant agent thread.
* It shows for the same debug flag as the debug button of the current Assistant.
*/
function useAssistantAgentTrace({ threadId, messages }) {
	const i18n = useI18n();
	const clipboard = useClipboard();
	const { showMessage, showError } = useToast();
	const isEnabled = localStorage.getItem("instanceAi.debugMode") === "true";
	const events = [];
	/** Keeps the event only with the flag on, so other users keep no extra data. */
	function recordEvent(event) {
		if (isEnabled) appendTraceEvent(events, event);
	}
	const menuItems = [{
		id: "copy",
		label: i18n.baseText("instanceAi.assistantAgent.trace.copy"),
		icon: "copy"
	}, {
		id: "download",
		label: i18n.baseText("instanceAi.assistantAgent.trace.download"),
		icon: "download"
	}];
	function serialize() {
		const trace = {
			threadId,
			agentId: ASSISTANT_AGENT_ID,
			exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
			messages: messages(),
			events
		};
		return JSON.stringify(trace, null, 2);
	}
	async function copy() {
		try {
			await clipboard.copy(serialize());
			showMessage({
				title: i18n.baseText("instanceAi.assistantAgent.trace.copied"),
				type: "success"
			});
		} catch (error) {
			showError(error, i18n.baseText("instanceAi.assistantAgent.trace.copyError"));
		}
	}
	function download() {
		const blob = new Blob([serialize()], { type: "application/json" });
		(0, import_FileSaver_min.saveAs)(blob, `assistant-trace-${threadId}.json`);
	}
	async function runAction(action) {
		if (action === "copy") await copy();
		else download();
	}
	return {
		isEnabled,
		menuItems,
		recordEvent,
		runAction
	};
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/AssistantAgentThreadView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$9 = ["inert", "aria-hidden"];
var AssistantAgentThreadView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AssistantAgentThreadView",
	props: {
		threadId: {},
		projectId: {}
	},
	setup(__props) {
		const props = __props;
		provide(ASSISTANT_AGENT_THREAD_ID, props.threadId);
		useAssistantAwayTelemetry({
			threadId: () => props.threadId,
			isRunning: () => (panel.value?.isStreaming || panel.value?.isSubmitting) ?? false,
			isAwaitingUser: () => panel.value?.isAwaitingUserAnswer ?? false,
			isReady: () => panel.value?.isLoadingHistory === false,
			turn: () => getCurrentTurn(thread.artifactTurns)
		});
		provide(ASSISTANT_AGENT_PROJECT_ID, props.projectId);
		const telemetry = useTelemetry();
		const i18n = useI18n();
		const router = useRouter();
		const route = useRoute();
		const rootStore = useRootStore();
		const settingsStore = useInstanceAiSettingsStore();
		const identity = useN8nAssistantIdentity();
		const threadsStore = useAssistantAgentThreadsStore();
		const toast = useToast();
		const messageTelemetry = useAssistantAgentMessageTelemetry(props.threadId);
		const launch = getAssistantAgentLaunch(props.threadId);
		const handoff = readPendingHandoff();
		const isNewThread = launch !== void 0 || handoff.firstMessage !== void 0;
		const isNewSession = ref(isNewThread);
		let pendingReferences = handoff.references;
		let pendingHandoffContext = handoff.context;
		if (!isNewThread) {
			threadsStore.loadThread(props.threadId);
			threadsStore.loadThreadCredits(props.threadId);
		}
		/** The first message to send, from the empty view or from a hand-off. */
		function firstMessageOf(fromEmptyView, fromHandoff) {
			if (fromEmptyView) return fromEmptyView;
			if (fromHandoff) return {
				text: fromHandoff.message,
				files: [],
				references: fromHandoff.attachments ?? [],
				authorship: fromHandoff.authorship
			};
		}
		function readPendingHandoff() {
			const fromEmptyView = consumePendingAssistantAgentMessage(props.threadId);
			const fromHandoff = consumePendingFirstMessage(props.threadId);
			const firstMessage = firstMessageOf(fromEmptyView, fromHandoff);
			const workflow = getPendingWorkflowAttachment(props.threadId);
			const draft = getPendingComposerDraft(props.threadId);
			const nodes = consumePendingDraftAttachment(props.threadId);
			const context = fromHandoff?.context ?? getPendingHandoffContext(props.threadId) ?? void 0;
			const references = [...firstMessage?.references ?? [], ...workflow ? [workflow] : []];
			return {
				firstMessage,
				draft,
				nodes,
				context,
				references,
				workflow: references.find((reference) => reference.type === "workflow")
			};
		}
		const agentConfig = computed(() => ({
			name: identity.name.value,
			model: "",
			instructions: ""
		}));
		/** The Assistant reads the same request fields as from its current runtime. */
		function clientContext() {
			return {
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				...rootStore.pushRef ? { pushRef: rootStore.pushRef } : {},
				browserUseAvailable: settingsStore.isBrowserUseAvailable,
				...pendingReferences.length > 0 ? { attachments: pendingReferences } : {},
				...pendingHandoffContext ? { context: pendingHandoffContext } : {},
				...launch?.subject && isNewSession.value ? { subject: launch.subject } : {},
				...threadArtifactsContext()
			};
		}
		/**
		* The agent sees the open tabs, not every artifact the thread produced. Until the
		* stored tabs load, the default tabs can still hold closed ones, so send none.
		*/
		function threadArtifactsContext() {
			if (!preview.tabsLoaded.value) return {};
			const activeId = preview.isPreviewVisible.value ? preview.activeTabId.value : void 0;
			const threadArtifacts = buildThreadArtifactsContext(thread.producedArtifacts.values(), activeId, preview.openTabs.value.filter(isArtifactTab), createDisplayedExecutionReader(thread.artifactTurns, thread.getRememberedManualExecution));
			return threadArtifacts ? { threadArtifacts } : {};
		}
		/** The references go with the first message, so a retry of a refused send keeps them. */
		function onMessageAccepted({ clientContext }) {
			const nodeCount = countSentNodes(clientContext);
			if (nodeCount > 0) telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
				node_count: nodeCount,
				runtime: "agents"
			});
			pendingReferences = [];
			pendingHandoffContext = void 0;
		}
		const interactionExtensions = [
			assistantConfirmationExtension,
			assistantAutoApprovalExtension,
			...assistantHostEventExtensions
		];
		const panel = useTemplateRef("panel");
		const trace = useAssistantAgentTrace({
			threadId: props.threadId,
			messages: () => panel.value?.messages ?? []
		});
		const turnTelemetry = useAssistantAgentTurnTelemetry({
			threadId: props.threadId,
			isStreaming: () => panel.value?.isStreaming ?? false,
			isStreamAttached: () => panel.value?.isStreamAttached ?? false,
			isSubmitting: () => panel.value?.isSubmitting ?? false,
			hasOpenInteraction: () => panel.value?.hasOpenInteraction ?? false
		});
		function onMessageSending(message) {
			turnTelemetry.trackSubmit(messageTelemetry.trackSend(message));
		}
		function onStreamEvent(event) {
			trace.recordEvent(event);
			turnTelemetry.handleStreamEvent(event);
		}
		const setupSavedTelemetry = useAssistantAgentSetupSavedTelemetry({
			threadId: props.threadId,
			messages: () => panel.value?.messages ?? []
		});
		provide(ASSISTANT_AGENT_SETUP_SAVED, setupSavedTelemetry.expectResult);
		watch(panel, (current) => {
			if (!current) return;
			if (handoff.firstMessage) {
				messageTelemetry.expectHostSend(handoff.firstMessage);
				current.sendMessageFromOutside(handoff.firstMessage.text, handoff.firstMessage.files);
			} else if (handoff.draft) {
				messageTelemetry.setPrefill(handoff.draft);
				current.setDraft(handoff.draft.text);
			}
		});
		/** The server has the thread now, so drop what only a new thread needs. */
		function finishLaunch() {
			clearPendingWorkflowAttachment(props.threadId);
			clearPendingComposerDraft(props.threadId);
			clearPendingHandoffContext(props.threadId);
			clearAssistantAgentLaunch(props.threadId);
		}
		function onSessionCreated() {
			isNewSession.value = false;
			finishLaunch();
			threadsStore.loadThread(props.threadId);
			agentTargets.refresh();
		}
		let wasStreaming = false;
		function onStreamingChange(streaming) {
			if (wasStreaming && !streaming) {
				threadsStore.fetchRecent();
				agentTargets.refresh();
			}
			wasStreaming = streaming;
		}
		const agentTargets = useAssistantAgentTargets({
			threadId: props.threadId,
			canLoad: () => !isNewSession.value
		});
		agentTargets.refresh();
		provideArtifactAgentTargets(agentTargets.agentTargets);
		const activeArtifactId = ref();
		const launchSubject = launch?.subject?.pending ? void 0 : launch?.subject;
		const projectAndName = ({ projectId, name }) => ({
			projectId,
			...name ? { name } : {}
		});
		const launchAgentTargets = launchSubject?.type === "agent" ? {
			bound: {
				agentId: launchSubject.id,
				...projectAndName(launchSubject)
			},
			pending: null,
			targets: [],
			previewSession: null
		} : null;
		const appTargets = computed(() => {
			const targets = getAppTargetsFromThreadMetadata(threadsStore.threadsById.get(props.threadId)?.metadata);
			if (launchSubject?.type !== "app") return targets;
			if (targets.some(({ appId }) => appId === launchSubject.id)) return targets;
			return [...targets, {
				appId: launchSubject.id,
				...projectAndName(launchSubject)
			}];
		});
		const requestedAppId = computed(() => {
			const appId = route.query[INSTANCE_AI_APP_ID_QUERY];
			return typeof appId === "string" && appTargets.value.some((target) => target.appId === appId) ? appId : void 0;
		});
		const thread = useAssistantArtifactThread({
			threadId: props.threadId,
			projectId: props.projectId,
			messages: () => panel.value?.messages ?? [],
			isStreaming: () => panel.value?.isStreaming ?? false,
			isLoadingHistory: () => panel.value?.isLoadingHistory ?? true,
			sendMessage: (text, authorship, handoffContext) => {
				messageTelemetry.expectHostSend({
					text,
					authorship
				});
				panel.value?.sendMessageFromOutside(text, [], handoffContext ? { context: handoffContext } : void 0);
			},
			pendingWorkflowAttachment: handoff.workflow,
			agentTargets: () => agentTargets.state.value ?? launchAgentTargets,
			appTargets: () => appTargets.value,
			activeArtifactId: () => activeArtifactId.value
		});
		provideArtifactThread(thread);
		const preview = useCanvasPreview({
			thread,
			threadId: () => props.threadId,
			initialAgentId: () => launchAgentTargets?.bound?.agentId,
			initialAppId: () => requestedAppId.value ?? appTargets.value[0]?.appId,
			tabsStorage: {
				load: async () => isNewThread ? null : (await fetchAssistantAgentThreadTabs(rootStore.restApiContext, props.threadId)).state,
				save: async (state) => {
					await saveAssistantAgentThreadTabs(rootStore.restApiContext, props.threadId, state);
				}
			}
		});
		provide("openWorkflowPreview", preview.openWorkflowPreview);
		provide("openDataTablePreview", preview.openDataTablePreview);
		provide("openAppPreview", preview.openAppPreview);
		provide("openSkillPreview", preview.openSkillPreview);
		provide("openAgentPreview", preview.openAgentPreview);
		provide("openAgentChatPreview", openAgentChatPreview);
		watch([requestedAppId, () => preview.tabsLoaded.value], ([appId, tabsLoaded]) => {
			if (appId && tabsLoaded) preview.openAppPreview(appId);
		}, { immediate: true });
		const openSkillTabs = computed(() => preview.openTabs.value.filter((tab) => tab.type === "skill"));
		watch([() => preview.activeTabId.value, () => preview.isPreviewVisible.value], ([tabId, previewVisible]) => {
			activeArtifactId.value = previewVisible ? tabId : void 0;
		}, { immediate: true });
		const failedRun = ref(null);
		const dismissedExecutionId = ref(null);
		const activeFixWithAiOffer = computed(() => {
			const run = failedRun.value;
			if (!run || run.executionId === dismissedExecutionId.value) return null;
			if (panel.value?.isBusy) return null;
			return {
				...run,
				workflowName: thread.producedArtifacts.get(run.workflowId)?.name
			};
		});
		function handleWorkflowFailures(report) {
			failedRun.value = report;
		}
		function handleWorkflowSucceeded(workflowId) {
			if (failedRun.value?.workflowId === workflowId) failedRun.value = null;
		}
		function dismissFixWithAiOffer() {
			const offer = activeFixWithAiOffer.value;
			if (offer) dismissedExecutionId.value = offer.executionId;
		}
		async function handleFixWithAiFromOffer() {
			const offer = activeFixWithAiOffer.value;
			if (!offer || !panel.value) return;
			dismissedExecutionId.value = offer.executionId;
			const text = buildFixWithAiPrompt({
				workflowName: offer.workflowName,
				errors: offer.errors
			});
			messageTelemetry.expectHostSend({
				text,
				authorship: {
					kind: "prefill",
					prefillType: "handoff_fix_with_ai"
				}
			});
			if (await panel.value.sendHostMessage(text, { attachments: [{
				type: "workflow",
				id: offer.workflowId,
				...offer.workflowName ? { name: offer.workflowName } : {},
				executionId: offer.executionId
			}] }) !== "sent" && dismissedExecutionId.value === offer.executionId) dismissedExecutionId.value = null;
		}
		const isAgentTestDockOpen = ref(false);
		const agentPreviewChatTarget = useTemplateRef("agentPreviewChatTarget");
		function openAgentChatPreview(agentId, projectId) {
			preview.openAgentPreview(agentId, projectId);
			isAgentTestDockOpen.value = true;
			return true;
		}
		watch([() => preview.activeTabId.value, () => preview.isPreviewVisible.value], ([tabId, visible], [previousTabId]) => {
			if (tabId !== previousTabId || !visible) isAgentTestDockOpen.value = false;
		}, { flush: "sync" });
		function handleAgentTestDockOpenChange(open) {
			const wasOpen = isAgentTestDockOpen.value;
			isAgentTestDockOpen.value = open;
			if (open) isPreviewExpanded.value = false;
			else if (wasOpen) panel.value?.focusInput();
		}
		const lastHandoffSession = ref();
		/** The test chat session that the preview shows: the last hand-off, else the stored one. */
		const activeAgentPreviewSessionId = computed(() => {
			const agentId = preview.activeAgentId.value;
			return [lastHandoffSession.value, agentTargets.state.value?.previewSession].find((session) => session?.agentId === agentId)?.threadId;
		});
		/** The user asks the Assistant about a test chat of the agent preview. */
		function handleAgentPreviewAssistantHandoff(params) {
			if (params.agentId !== preview.activeAgentId.value || params.projectId !== preview.activeAgentProjectId.value) return;
			const current = panel.value;
			if (!current) return;
			if (current.isDirty()) {
				toast.showMessage({
					title: i18n.baseText("instanceAi.input.finishDraftBeforeHandoff.title"),
					message: i18n.baseText("instanceAi.input.finishDraftBeforeHandoff.message"),
					type: "warning"
				});
				return;
			}
			isAgentTestDockOpen.value = false;
			const context = buildInstanceAiAgentPreviewHandoffContext(params);
			if (context.source !== "agent-preview") return;
			const label = formatAgentPreviewContextLabel(context, (key, options) => i18n.baseText(key, options), thread.producedArtifacts.get(context.agentId)?.name);
			lastHandoffSession.value = {
				agentId: context.agentId,
				threadId: context.threadId
			};
			const { chip, clientContextPatch } = toAgentPreviewComposerAttachment(context, label);
			current.addComposerAttachment(chip, clientContextPatch);
			if (params.initialDraft) {
				messageTelemetry.setPrefill(params.initialDraft);
				current.setDraft(params.initialDraft.text);
			}
			current.focusInput();
			params.onAccepted?.();
		}
		const { previewToggleLabel, togglePreview } = usePreviewToggle(preview);
		const threadTitle = computed(() => {
			const title = threadsStore.threadsById.get(props.threadId)?.title;
			if (title) return title;
			const firstUserMessage = panel.value?.messages.find((message) => message.role === "user");
			return firstUserMessage?.content ? firstMessageTitle(firstUserMessage.content) : void 0;
		});
		function startNewThread() {
			router.push({ name: INSTANCE_AI_VIEW });
		}
		const threadArea = useTemplateRef("threadArea");
		const { width: threadAreaWidth } = useElementSize(threadArea);
		const isPreviewExpanded = ref(false);
		function togglePreviewExpanded() {
			isPreviewExpanded.value = !isPreviewExpanded.value;
			if (isPreviewExpanded.value) isAgentTestDockOpen.value = false;
		}
		const isArtifactsPanelInLayout = computed(() => threadAreaWidth.value >= 900);
		const canShowArtifactsPanel = computed(() => thread.artifactTurns.length > 0 || preview.openTabs.value.length > 0 || thread.isHydratingThread);
		const { showArtifactsPanel, artifactsPanelToggleLabel, toggleArtifactsPanel } = useArtifactsPanelToggle({
			isInLayout: () => isArtifactsPanelInLayout.value,
			canShow: () => canShowArtifactsPanel.value,
			isPreviewVisible: () => preview.isPreviewVisible.value,
			panelSlot: useTemplateRef("artifactsPanelSlot"),
			toggleSelector: "[data-test-id=\"assistant-agent-artifacts-panel-toggle\"]"
		});
		const { previewMinWidth, previewMaxWidth, previewPanelWidth, isPreviewResizeEnabled, handlePreviewResize } = usePreviewPanelWidth({
			threadAreaWidth,
			isExpanded: () => isPreviewExpanded.value
		});
		const instanceAiStore = useInstanceAiStore();
		if (handoff.nodes) instanceAiStore.stageNodeSets(handoff.nodes.workflowId, handoff.nodes.sets);
		watch([panel, () => instanceAiStore.pendingComposerAttachments], ([current, pending]) => {
			if (!current || pending.length === 0) return;
			for (const attachment of instanceAiStore.consumePendingAttachments()) {
				if (attachment.type === "element") {
					const { chip, clientContextPatch } = toElementComposerAttachment(attachment);
					current.addComposerAttachment(chip, clientContextPatch);
					continue;
				}
				if (attachment.type !== "nodes") continue;
				const { chip, clientContextPatch } = toNodesComposerAttachment(attachment, current.composerAttachments);
				current.addComposerAttachment(chip, clientContextPatch);
			}
		}, { immediate: true });
		watch(() => stagedElementAppId(panel.value?.composerAttachments ?? []), (appId) => instanceAiStore.setComposerElementAppId(appId), { immediate: true });
		onBeforeUnmount(() => instanceAiStore.setComposerElementAppId(null));
		watch(() => instanceAiStore.composerFocusRequest, () => {
			isPreviewExpanded.value = false;
			panel.value?.focusInput();
		});
		const stagedNodes = computed(() => (panel.value?.composerAttachments ?? []).flatMap((staged) => {
			const attachment = readNodesAttachment(staged);
			return attachment ? [{
				id: staged.chip.id,
				attachment
			}] : [];
		}));
		/** The user removed some of the nodes from a chip. */
		function updateStagedNodes(attachment) {
			const { chip, clientContextPatch } = toNodesComposerAttachment(attachment, []);
			panel.value?.addComposerAttachment(chip, clientContextPatch);
		}
		function removeStagedNodes(chipId) {
			panel.value?.removeComposerAttachment(chipId);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "threadArea",
				ref: threadArea,
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "assistant-agent-thread-view"
			}, [createBaseVNode("div", {
				ref_key: "agentPreviewChatTarget",
				ref: agentPreviewChatTarget,
				class: normalizeClass(_ctx.$style.chatArea)
			}, [createVNode(InstanceAiViewHeader_default, {
				title: threadTitle.value,
				"thread-id": props.threadId,
				"thread-credits-used": unref(threadsStore).threadCreditsUsed(props.threadId),
				inert: isAgentTestDockOpen.value || void 0,
				"aria-hidden": isAgentTestDockOpen.value || void 0
			}, {
				actions: withCtx(() => [
					createVNode(unref(N8nTooltip_default), {
						content: unref(i18n).baseText("instanceAi.thread.new"),
						placement: "bottom",
						"show-after": unref(500)
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "message-circle-plus",
							variant: "ghost",
							size: "small",
							"icon-size": "large",
							"aria-label": unref(i18n).baseText("instanceAi.thread.new"),
							"data-test-id": "assistant-agent-new-thread",
							onClick: startNewThread
						}, null, 8, ["aria-label"])]),
						_: 1
					}, 8, ["content", "show-after"]),
					unref(trace).isEnabled ? (openBlock(), createBlock(unref(N8nActionDropdown_default), {
						key: 0,
						items: unref(trace).menuItems,
						placement: "bottom-end",
						"data-test-id": "assistant-agent-trace-menu",
						onSelect: unref(trace).runAction
					}, {
						activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "bug",
							variant: "ghost",
							size: "small",
							"icon-size": "large",
							"aria-label": unref(i18n).baseText("instanceAi.debug.title"),
							"data-test-id": "assistant-agent-trace-button"
						}, null, 8, ["aria-label"])]),
						_: 1
					}, 8, ["items", "onSelect"])) : createCommentVNode("", true),
					canShowArtifactsPanel.value && !unref(preview).isPreviewVisible.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						content: unref(artifactsPanelToggleLabel),
						placement: "bottom",
						"show-after": unref(500)
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "list",
							variant: "ghost",
							size: "small",
							"icon-size": "large",
							"data-test-id": "assistant-agent-artifacts-panel-toggle",
							"aria-label": unref(artifactsPanelToggleLabel),
							"aria-pressed": unref(showArtifactsPanel),
							onClick: unref(toggleArtifactsPanel)
						}, null, 8, [
							"aria-label",
							"aria-pressed",
							"onClick"
						])]),
						_: 1
					}, 8, ["content", "show-after"])) : createCommentVNode("", true),
					!unref(thread).isHydratingThread && !unref(preview).isPreviewVisible.value && unref(preview).openTabs.value.length === 0 ? (openBlock(), createBlock(InstanceAiResourcePicker_default, {
						key: 2,
						"project-id": props.projectId,
						"excluded-tabs": unref(preview).openTabs.value.filter(unref(isArtifactTab)),
						placement: "bottom-end",
						"content-test-id": "assistant-agent-open-resource-picker",
						onSelect: unref(preview).openTab
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nTooltip_default), {
							content: unref(i18n).baseText("instanceAi.artifactsPanel.openResource"),
							placement: "bottom",
							"show-after": unref(500),
							"as-child": ""
						}, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								icon: "square-plus",
								variant: "ghost",
								size: "small",
								"icon-size": "large",
								"data-test-id": "assistant-agent-open-resource",
								"aria-label": unref(i18n).baseText("instanceAi.artifactsPanel.openResource")
							}, null, 8, ["aria-label"])]),
							_: 1
						}, 8, ["content", "show-after"])]),
						_: 1
					}, 8, [
						"project-id",
						"excluded-tabs",
						"onSelect"
					])) : !unref(preview).isPreviewVisible.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 3,
						content: unref(previewToggleLabel),
						placement: "bottom",
						"show-after": unref(500)
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "panel-right",
							variant: "ghost",
							size: "small",
							"icon-size": "large",
							"data-test-id": "assistant-agent-preview-toggle",
							"aria-label": unref(previewToggleLabel),
							"aria-pressed": false,
							disabled: unref(preview).openTabs.value.length === 0,
							onClick: unref(togglePreview)
						}, null, 8, [
							"aria-label",
							"disabled",
							"onClick"
						])]),
						_: 1
					}, 8, ["content", "show-after"])) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, [
				"title",
				"thread-id",
				"thread-credits-used",
				"inert",
				"aria-hidden"
			]), createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.contentArea),
				inert: isAgentTestDockOpen.value || void 0,
				"aria-hidden": isAgentTestDockOpen.value || void 0
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.chatColumn) }, [createVNode(AgentChatPanel_default, {
				ref_key: "panel",
				ref: panel,
				"project-id": props.projectId,
				"agent-id": unref(ASSISTANT_AGENT_ID),
				mode: "inline",
				"continue-session-id": props.threadId,
				"new-session": isNewSession.value,
				"agent-config": agentConfig.value,
				"empty-state-icon": "n8n-assistant",
				"accepted-mime-types": unref(ASSISTANT_AGENT_ACCEPTED_MIME_TYPES),
				"agent-status": "production",
				"connected-triggers": [],
				channel: "system",
				"client-context": clientContext,
				"interaction-extensions": interactionExtensions,
				"show-attach-button": false,
				onStreamEvent,
				onSessionCreated,
				onMessageSending,
				onDraftCleared: _cache[1] || (_cache[1] = ($event) => unref(messageTelemetry).setPrefill(null)),
				onMessageAccepted,
				"onUpdate:streaming": onStreamingChange
			}, createSlots({
				"footer-start": withCtx(({ disabled }) => [createVNode(InstanceAiInputMenu_default, {
					disabled,
					"project-id": props.projectId,
					onAttachFiles: _cache[0] || (_cache[0] = ($event) => panel.value?.openFilePicker())
				}, null, 8, ["disabled", "project-id"]), !unref(threadTargetsAgent)(unref(threadsStore).threadsById.get(props.threadId)?.metadata) ? (openBlock(), createBlock(ApprovalModeSelector_default, {
					key: 0,
					"thread-id": props.threadId
				}, null, 8, ["thread-id"])) : createCommentVNode("", true)]),
				_: 2
			}, [activeFixWithAiOffer.value ? {
				name: "inline-offers",
				fn: withCtx(() => [createVNode(InstanceAiFixWithAiPanel_default, {
					"node-name": activeFixWithAiOffer.value.errors[0].nodeName,
					"error-message": activeFixWithAiOffer.value.errors[0].errorMessage,
					"failed-count": activeFixWithAiOffer.value.errors.length,
					onFixWithAi: handleFixWithAiFromOffer,
					onDismiss: dismissFixWithAiOffer
				}, null, 8, [
					"node-name",
					"error-message",
					"failed-count"
				])]),
				key: "0"
			} : void 0, stagedNodes.value.length > 0 ? {
				name: "composer-attachments",
				fn: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(stagedNodes.value, ({ id, attachment }) => {
					return openBlock(), createBlock(NodesAttachmentChips_default, {
						key: id,
						attachment,
						"is-removable": "",
						"onUpdate:attachment": updateStagedNodes,
						onRemoveAll: ($event) => removeStagedNodes(id)
					}, null, 8, ["attachment", "onRemoveAll"]);
				}), 128))]),
				key: "1"
			} : void 0]), 1032, [
				"project-id",
				"agent-id",
				"continue-session-id",
				"new-session",
				"agent-config",
				"accepted-mime-types"
			])], 2), unref(showArtifactsPanel) ? (openBlock(), createElementBlock("div", {
				key: 0,
				ref: "artifactsPanelSlot",
				class: normalizeClass([_ctx.$style.artifactsPanelSlot, { [_ctx.$style.artifactsPanelSlotOverlay]: !isArtifactsPanelInLayout.value }]),
				"data-test-id": "assistant-agent-artifacts-panel"
			}, [createVNode(InstanceAiArtifactsPanel_default)], 2)) : createCommentVNode("", true)], 10, _hoisted_1$9)], 2), withDirectives(createBaseVNode("div", {
				class: normalizeClass([_ctx.$style.canvasArea, { [_ctx.$style.canvasAreaExpanded]: isPreviewExpanded.value }]),
				style: normalizeStyle(isPreviewExpanded.value ? void 0 : { width: `${unref(previewPanelWidth)}px` }),
				"data-test-id": "assistant-agent-preview-panel"
			}, [createVNode(unref(N8nResizeWrapper_default), {
				width: unref(previewPanelWidth),
				"min-width": unref(previewMinWidth),
				"max-width": unref(previewMaxWidth),
				"supported-directions": ["left"],
				"is-resizing-enabled": unref(isPreviewResizeEnabled),
				"grid-size": 8,
				onResize: unref(handlePreviewResize)
			}, {
				default: withCtx(() => [createVNode(unref(TabsRoot_default), {
					"model-value": unref(preview).activeTabId.value,
					orientation: "horizontal",
					class: normalizeClass(_ctx.$style.previewPanel),
					"onUpdate:modelValue": unref(preview).selectTab
				}, {
					default: withCtx(() => [createVNode(InstanceAiPreviewTabBar_default, {
						tabs: unref(preview).openTabs.value,
						"active-tab-id": unref(preview).activeTabId.value,
						"is-expanded": isPreviewExpanded.value,
						"preview-toggle-label": unref(previewToggleLabel),
						"project-id": props.projectId,
						onTogglePreview: unref(togglePreview),
						onToggleExpanded: togglePreviewExpanded,
						onCloseTab: unref(preview).closeTab,
						onOpenTab: unref(preview).openTab,
						onReorderTab: unref(preview).reorderTab
					}, null, 8, [
						"tabs",
						"active-tab-id",
						"is-expanded",
						"preview-toggle-label",
						"project-id",
						"onTogglePreview",
						"onCloseTab",
						"onOpenTab",
						"onReorderTab"
					]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.previewContent) }, [
						unref(preview).isPreviewVisible.value && unref(preview).activeWorkflowId.value ? (openBlock(), createBlock(InstanceAiWorkflowPreview_default, {
							key: unref(preview).activeWorkflowId.value,
							class: normalizeClass(_ctx.$style.previewSlot),
							"workflow-id": unref(preview).activeWorkflowId.value,
							"refresh-key": unref(preview).workflowRefreshKey.value,
							"execution-result": unref(preview).activeWorkflowExecutionResult.value,
							onWorkflowFailures: handleWorkflowFailures,
							onWorkflowSucceeded: handleWorkflowSucceeded
						}, null, 8, [
							"class",
							"workflow-id",
							"refresh-key",
							"execution-result"
						])) : createCommentVNode("", true),
						unref(preview).isPreviewVisible.value && unref(preview).activeDataTableId.value ? (openBlock(), createBlock(InstanceAiDataTablePreview_default, {
							key: 1,
							class: normalizeClass(_ctx.$style.previewSlot),
							"data-table-id": unref(preview).activeDataTableId.value,
							"project-id": unref(preview).activeDataTableProjectId.value,
							"refresh-key": unref(preview).dataTableRefreshKey.value
						}, null, 8, [
							"class",
							"data-table-id",
							"project-id",
							"refresh-key"
						])) : createCommentVNode("", true),
						unref(preview).isPreviewVisible.value && unref(preview).activeApp.value ? (openBlock(), createBlock(InstanceAiAppPreview_default, {
							key: 2,
							class: normalizeClass(_ctx.$style.previewSlot),
							"project-id": unref(preview).activeApp.value.projectId,
							"app-id": unref(preview).activeApp.value.id,
							"refresh-key": unref(preview).appRefreshKey.value,
							onDeleted: unref(preview).closeTab
						}, null, 8, [
							"class",
							"project-id",
							"app-id",
							"refresh-key",
							"onDeleted"
						])) : createCommentVNode("", true),
						unref(preview).isPreviewVisible.value && unref(preview).activeAgentId.value && unref(preview).activeAgentProjectId.value ? (openBlock(), createBlock(InstanceAiAgentPreview_default, {
							key: 3,
							class: normalizeClass(_ctx.$style.previewSlot),
							"agent-id": unref(preview).activeAgentId.value,
							"project-id": unref(preview).activeAgentProjectId.value,
							"preview-session-id": activeAgentPreviewSessionId.value,
							"preview-open": isAgentTestDockOpen.value,
							"preview-chat-target": agentPreviewChatTarget.value,
							pending: unref(preview).activeAgentPending.value,
							onPreviewOpenChange: handleAgentTestDockOpenChange,
							onAssistantHandoff: handleAgentPreviewAssistantHandoff
						}, null, 8, [
							"class",
							"agent-id",
							"project-id",
							"preview-session-id",
							"preview-open",
							"preview-chat-target",
							"pending"
						])) : createCommentVNode("", true),
						(openBlock(true), createElementBlock(Fragment, null, renderList(openSkillTabs.value, (tab) => {
							return openBlock(), createBlock(KeepAlive, { key: tab.id }, [unref(preview).isPreviewVisible.value && unref(preview).activeSkillId.value === tab.id ? (openBlock(), createBlock(InstanceAiSkillPreview_default, {
								key: 0,
								class: normalizeClass(_ctx.$style.previewSlot),
								"skill-id": tab.id,
								"refresh-key": unref(preview).skillRefreshKey.value
							}, null, 8, [
								"class",
								"skill-id",
								"refresh-key"
							])) : createCommentVNode("", true)], 1024);
						}), 128))
					], 2)]),
					_: 1
				}, 8, [
					"model-value",
					"class",
					"onUpdate:modelValue"
				])]),
				_: 1
			}, 8, [
				"width",
				"min-width",
				"max-width",
				"is-resizing-enabled",
				"onResize"
			])], 6), [[vShow, unref(preview).isPreviewVisible.value]])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1fb3v_1",
	chatArea: "_chatArea_1fb3v_10",
	contentArea: "_contentArea_1fb3v_19",
	chatColumn: "_chatColumn_1fb3v_26",
	artifactsPanelSlot: "_artifactsPanelSlot_1fb3v_34",
	artifactsPanelSlotOverlay: "_artifactsPanelSlotOverlay_1fb3v_40",
	canvasArea: "_canvasArea_1fb3v_48",
	canvasAreaExpanded: "_canvasAreaExpanded_1fb3v_54",
	previewPanel: "_previewPanel_1fb3v_62",
	previewContent: "_previewContent_1fb3v_68",
	previewSlot: "_previewSlot_1fb3v_74"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/useTransitionGate.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useTransitionGate(options = {}) {
	const isEnabled = ref(false);
	let renderToken = 0;
	function enableAfterStableRender() {
		const currentRenderToken = ++renderToken;
		nextTick(() => {
			nextTick(() => {
				if (currentRenderToken === renderToken && !(options.isBlocked?.() ?? false)) isEnabled.value = true;
			});
		});
	}
	function suppress() {
		renderToken += 1;
		isEnabled.value = false;
	}
	function suppressUntilStableRender() {
		isEnabled.value = false;
		enableAfterStableRender();
	}
	return {
		isEnabled,
		enableAfterStableRender,
		suppress,
		suppressUntilStableRender
	};
}
//#endregion
//#region src/features/ai/instanceAi/instanceAiDebug.store.ts
init_reactivity_esm_bundler();
var useInstanceAiDebugStore = defineStore("instanceAiDebug", () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();
	const threads = ref([]);
	const selectedThreadId = ref(null);
	const threadMessages = ref([]);
	const isLoadingThreads = ref(false);
	const isLoadingMessages = ref(false);
	const selectedRunId = ref(null);
	const runDebug = ref(null);
	const threadDebugRuns = ref([]);
	const isLoadingRunDebug = ref(false);
	const isLoadingThreadDebugRuns = ref(false);
	async function loadThreads() {
		isLoadingThreads.value = true;
		try {
			const result = await fetchThreads(rootStore.restApiContext);
			threads.value = result.threads;
		} catch {
			toast.showError(new Error(i18n.baseText("instanceAi.debug.threads.fetchError")), "Thread Inspector");
		} finally {
			isLoadingThreads.value = false;
		}
	}
	async function selectThread(threadId) {
		selectedThreadId.value = threadId;
		await loadMessages();
	}
	async function loadMessages(page) {
		if (!selectedThreadId.value) return;
		isLoadingMessages.value = true;
		try {
			const result = await fetchThreadMessages(rootStore.restApiContext, selectedThreadId.value, 50, page);
			threadMessages.value = result.messages;
		} catch {
			toast.showError(new Error(i18n.baseText("instanceAi.debug.threads.fetchError")), "Thread Inspector");
		} finally {
			isLoadingMessages.value = false;
		}
	}
	async function loadThreadDebugRuns(threadId) {
		isLoadingThreadDebugRuns.value = true;
		try {
			const result = await fetchThreadDebugRuns(rootStore.restApiContext, threadId);
			threadDebugRuns.value = result.runs;
		} catch {
			toast.showError(new Error(i18n.baseText("instanceAi.debug.runDebug.fetchError")), "Run Debug");
		} finally {
			isLoadingThreadDebugRuns.value = false;
		}
	}
	async function loadRunDebug(runId) {
		selectedRunId.value = runId;
		isLoadingRunDebug.value = true;
		try {
			runDebug.value = await fetchRunDebug(rootStore.restApiContext, runId);
		} catch {
			runDebug.value = null;
			toast.showError(new Error(i18n.baseText("instanceAi.debug.runDebug.fetchError")), "Run Debug");
		} finally {
			isLoadingRunDebug.value = false;
		}
	}
	async function refreshRunDebug(threadId, preferredRunId) {
		await loadThreadDebugRuns(threadId);
		const selectedRunIdForThread = threadDebugRuns.value.some((run) => run.runId === selectedRunId.value) ? selectedRunId.value : null;
		const runId = preferredRunId ?? selectedRunIdForThread ?? threadDebugRuns.value.at(-1)?.runId ?? null;
		if (runId) await loadRunDebug(runId);
		else {
			selectedRunId.value = null;
			runDebug.value = null;
		}
	}
	function reset() {
		threads.value = [];
		selectedThreadId.value = null;
		threadMessages.value = [];
		isLoadingThreads.value = false;
		isLoadingMessages.value = false;
		selectedRunId.value = null;
		runDebug.value = null;
		threadDebugRuns.value = [];
		isLoadingRunDebug.value = false;
		isLoadingThreadDebugRuns.value = false;
	}
	return {
		threads,
		selectedThreadId,
		threadMessages,
		isLoadingThreads,
		isLoadingMessages,
		selectedRunId,
		runDebug,
		threadDebugRuns,
		isLoadingRunDebug,
		isLoadingThreadDebugRuns,
		loadThreads,
		selectThread,
		loadMessages,
		loadRunDebug,
		refreshRunDebug,
		reset
	};
});
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiDebugJsonPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$8 = ["open"];
var InstanceAiDebugJsonPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiDebugJsonPanel",
	props: {
		value: {},
		label: {},
		defaultOpen: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const preview = computed(() => summarizeJsonValue(props.value));
		const formatted = computed(() => formatDebugJson(props.value));
		const summaryLabel = computed(() => props.label ?? i18n.baseText("instanceAi.debug.runDebug.json"));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("details", {
				class: normalizeClass(_ctx.$style.root),
				open: __props.defaultOpen
			}, [createBaseVNode("summary", { class: normalizeClass(_ctx.$style.summary) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.summaryLabel) }, toDisplayString(summaryLabel.value), 3), createBaseVNode("code", { class: normalizeClass(_ctx.$style.preview) }, toDisplayString(preview.value), 3)], 2), createBaseVNode("pre", { class: normalizeClass(_ctx.$style.json) }, toDisplayString(formatted.value), 3)], 10, _hoisted_1$8);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_nwc9j_2",
	summary: "_summary_nwc9j_9",
	summaryLabel: "_summaryLabel_nwc9j_32",
	preview: "_preview_nwc9j_39",
	json: "_json_nwc9j_51"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiDebugWorkflowCodeSnapshot.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$7 = ["open"];
var InstanceAiDebugWorkflowCodeSnapshot_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiDebugWorkflowCodeSnapshot",
	props: {
		snapshot: {},
		variant: { default: "card" },
		defaultOpen: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const summaryPreview = computed(() => {
			const parts = [
				formatStatus(props.snapshot.success),
				props.snapshot.source,
				formatCharCount(props.snapshot.code.length)
			];
			if (props.snapshot.workflowId) parts.push(props.snapshot.workflowId);
			return parts.join(" · ");
		});
		function formatTimestamp(ms) {
			try {
				return new Date(ms).toLocaleTimeString("en-US", {
					hour12: false,
					fractionalSecondDigits: 3
				});
			} catch {
				return String(ms);
			}
		}
		function formatCharCount(count) {
			return i18n.baseText("instanceAi.debug.runDebug.charCount", { interpolate: { count: count.toLocaleString() } });
		}
		function formatStatus(success) {
			return success ? i18n.baseText("instanceAi.debug.runDebug.success") : i18n.baseText("instanceAi.debug.runDebug.failed");
		}
		return (_ctx, _cache) => {
			return __props.variant === "inline" ? (openBlock(), createElementBlock("details", {
				key: 0,
				class: normalizeClass(_ctx.$style.root),
				open: __props.defaultOpen
			}, [createBaseVNode("summary", { class: normalizeClass(_ctx.$style.summary) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.summaryLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.tab.workflowCode")), 3), createBaseVNode("code", { class: normalizeClass(_ctx.$style.preview) }, toDisplayString(summaryPreview.value), 3)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.metaBlock) }, [
					createBaseVNode("span", { class: normalizeClass([_ctx.$style.statusChip, __props.snapshot.success ? _ctx.$style.statusSuccess : _ctx.$style.statusFailed]) }, toDisplayString(formatStatus(__props.snapshot.success)), 3),
					__props.snapshot.source ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.metaLabel)
					}, toDisplayString(__props.snapshot.source), 3)) : createCommentVNode("", true),
					__props.snapshot.workflowId ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style.metaLabel)
					}, toDisplayString(__props.snapshot.workflowId), 3)) : createCommentVNode("", true),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.metaLabel) }, toDisplayString(formatCharCount(__props.snapshot.code.length)), 3),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.metaLabel) }, toDisplayString(formatTimestamp(__props.snapshot.capturedAt)), 3)
				], 2),
				__props.snapshot.errors?.length ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
					key: 0,
					value: __props.snapshot.errors,
					label: unref(i18n).baseText("instanceAi.debug.runDebug.failed")
				}, null, 8, ["value", "label"])) : createCommentVNode("", true),
				__props.snapshot.patches ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
					key: 1,
					value: __props.snapshot.patches,
					label: unref(i18n).baseText("instanceAi.debug.runDebug.metadata")
				}, null, 8, ["value", "label"])) : createCommentVNode("", true),
				createBaseVNode("pre", { class: normalizeClass(_ctx.$style.code) }, toDisplayString(__props.snapshot.code), 3)
			], 2)], 10, _hoisted_1$7)) : (openBlock(), createBlock(unref(N8nCard_default), {
				key: 1,
				class: normalizeClass(_ctx.$style.cardRoot)
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardLayout) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.metaBlock) }, [
						createBaseVNode("span", { class: normalizeClass([_ctx.$style.statusChip, __props.snapshot.success ? _ctx.$style.statusSuccess : _ctx.$style.statusFailed]) }, toDisplayString(formatStatus(__props.snapshot.success)), 3),
						__props.snapshot.source ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.metaLabel)
						}, toDisplayString(__props.snapshot.source), 3)) : createCommentVNode("", true),
						__props.snapshot.workflowId ? (openBlock(), createElementBlock("span", {
							key: 1,
							class: normalizeClass(_ctx.$style.metaLabel)
						}, toDisplayString(__props.snapshot.workflowId), 3)) : createCommentVNode("", true),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.metaLabel) }, toDisplayString(formatCharCount(__props.snapshot.code.length)), 3),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.metaLabel) }, toDisplayString(formatTimestamp(__props.snapshot.capturedAt)), 3)
					], 2),
					__props.snapshot.errors?.length ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
						key: 0,
						value: __props.snapshot.errors,
						label: unref(i18n).baseText("instanceAi.debug.runDebug.failed")
					}, null, 8, ["value", "label"])) : createCommentVNode("", true),
					__props.snapshot.patches ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
						key: 1,
						value: __props.snapshot.patches,
						label: unref(i18n).baseText("instanceAi.debug.runDebug.metadata")
					}, null, 8, ["value", "label"])) : createCommentVNode("", true),
					createBaseVNode("pre", { class: normalizeClass(_ctx.$style.code) }, toDisplayString(__props.snapshot.code), 3)
				], 2)]),
				_: 1
			}, 8, ["class"]));
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_1faeq_2",
	summary: "_summary_1faeq_9",
	summaryLabel: "_summaryLabel_1faeq_32",
	preview: "_preview_1faeq_39",
	body: "_body_1faeq_51",
	cardRoot: "_cardRoot_1faeq_60",
	cardLayout: "_cardLayout_1faeq_68",
	metaBlock: "_metaBlock_1faeq_74",
	metaLabel: "_metaLabel_1faeq_81",
	statusChip: "_statusChip_1faeq_87",
	statusSuccess: "_statusSuccess_1faeq_94",
	statusFailed: "_statusFailed_1faeq_99",
	code: "_code_1faeq_104"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/utils/cache-break.ts
var CAUSE_KEYS = {
	tools: "instanceAi.debug.runDebug.cacheBreakCause.tools",
	system: "instanceAi.debug.runDebug.cacheBreakCause.system",
	settings: "instanceAi.debug.runDebug.cacheBreakCause.settings",
	expired: "instanceAi.debug.runDebug.cacheBreakCause.expired",
	messages: "instanceAi.debug.runDebug.cacheBreakCause.messages"
};
function describeCacheBreak(i18n, cacheBreak) {
	return i18n.baseText("instanceAi.debug.runDebug.cacheBreakDetail", { interpolate: {
		lost: cacheBreak.lostTokens.toLocaleString(),
		expected: cacheBreak.expectedReadTokens.toLocaleString(),
		cause: i18n.baseText(CAUSE_KEYS[cacheBreak.cause], { interpolate: { minutes: String(cacheBreak.cacheTtlMinutes ?? "") } })
	} });
}
//#endregion
//#region src/features/ai/instanceAi/utils/workflow-code-match.ts
var WORKFLOW_CODE_TOOL_NAMES = /* @__PURE__ */ new Set([WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW]);
function isWorkflowCodeToolName(name) {
	return name !== void 0 && WORKFLOW_CODE_TOOL_NAMES.has(resolveBuilderToolName(name));
}
function extractBuildWorkflowToolCallIds(output) {
	if (!output || !Array.isArray(output.toolResults)) return [];
	const ids = [];
	for (const toolResult of output.toolResults) {
		if (!isRecord$1(toolResult)) continue;
		if (!isWorkflowCodeToolName(typeof toolResult.toolName === "string" && toolResult.toolName || typeof toolResult.name === "string" && toolResult.name || void 0)) continue;
		if (typeof toolResult.toolCallId === "string") ids.push(toolResult.toolCallId);
	}
	return ids;
}
function mapWorkflowSnapshotsByToolCallId(steps, workflowCode) {
	const map = /* @__PURE__ */ new Map();
	for (const snapshot of workflowCode) if (snapshot.toolCallId) map.set(snapshot.toolCallId, snapshot);
	const orderedToolCallIds = steps.slice().sort((left, right) => left.stepNumber - right.stepNumber).flatMap((step) => extractBuildWorkflowToolCallIds(step.output));
	let snapshotIndex = 0;
	for (const toolCallId of orderedToolCallIds) {
		if (map.has(toolCallId)) continue;
		while (snapshotIndex < workflowCode.length && workflowCode[snapshotIndex]?.toolCallId && map.has(workflowCode[snapshotIndex]?.toolCallId ?? "")) snapshotIndex++;
		const snapshot = workflowCode[snapshotIndex];
		if (!snapshot) break;
		map.set(toolCallId, snapshot);
		snapshotIndex++;
	}
	return map;
}
function getToolCallIdFromMetadata(metadata) {
	if (!isRecord$1(metadata) || typeof metadata.toolCallId !== "string") return;
	return metadata.toolCallId;
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiDebugMessageBody.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var InstanceAiDebugMessageBody_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiDebugMessageBody",
	props: {
		segments: {},
		workflowSnapshotsByToolCallId: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		function getWorkflowSnapshot(segment) {
			if (!isWorkflowCodeToolName(segment.name) || !props.workflowSnapshotsByToolCallId) return;
			const toolCallId = getToolCallIdFromMetadata(segment.metadata);
			if (!toolCallId) return;
			return props.workflowSnapshotsByToolCallId.get(toolCallId);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.root) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.segments, (segment, index) => {
				return openBlock(), createElementBlock(Fragment, { key: `${segment.type}-${index}` }, [segment.type === "text" ? (openBlock(), createElementBlock("p", {
					key: 0,
					class: normalizeClass(_ctx.$style.text)
				}, toDisplayString(segment.text), 3)) : segment.type === "reasoning" ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.inlineBlock)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.inlineHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.kindLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.reasoning")), 3)], 2), createBaseVNode("p", { class: normalizeClass(_ctx.$style.text) }, toDisplayString(segment.text), 3)], 2)) : segment.type === "tool-call" ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.inlineBlock)
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.inlineHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.kindLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.toolCall")), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.nameLabel) }, toDisplayString(segment.name), 3)], 2),
					segment.payload !== void 0 ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
						key: 0,
						value: segment.payload,
						label: unref(i18n).baseText("instanceAi.debug.runDebug.toolInput")
					}, null, 8, ["value", "label"])) : createCommentVNode("", true),
					segment.metadata ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
						key: 1,
						value: segment.metadata,
						label: unref(i18n).baseText("instanceAi.debug.runDebug.metadata")
					}, null, 8, ["value", "label"])) : createCommentVNode("", true)
				], 2)) : segment.type === "tool-result" ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.inlineBlock)
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.inlineHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.kindLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.toolResult")), 3), segment.name ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.nameLabel)
					}, toDisplayString(segment.name), 3)) : createCommentVNode("", true)], 2),
					segment.payload !== void 0 ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
						key: 0,
						value: segment.payload,
						label: unref(i18n).baseText("instanceAi.debug.runDebug.toolOutput")
					}, null, 8, ["value", "label"])) : createCommentVNode("", true),
					getWorkflowSnapshot(segment) ? (openBlock(), createBlock(InstanceAiDebugWorkflowCodeSnapshot_default, {
						key: 1,
						variant: "inline",
						snapshot: getWorkflowSnapshot(segment)
					}, null, 8, ["snapshot"])) : createCommentVNode("", true),
					segment.metadata ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
						key: 2,
						value: segment.metadata,
						label: unref(i18n).baseText("instanceAi.debug.runDebug.metadata")
					}, null, 8, ["value", "label"])) : createCommentVNode("", true)
				], 2)) : (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
					key: 4,
					value: segment.payload,
					label: segment.label ?? unref(i18n).baseText("instanceAi.debug.runDebug.json")
				}, null, 8, ["value", "label"]))], 64);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_ga0gj_1",
	text: "_text_ga0gj_7",
	inlineBlock: "_inlineBlock_ga0gj_16",
	inlineHeader: "_inlineHeader_ga0gj_22",
	kindLabel: "_kindLabel_ga0gj_28",
	nameLabel: "_nameLabel_ga0gj_33"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiDebugStepConfig.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$6 = ["title"];
var InstanceAiDebugStepConfig_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiDebugStepConfig",
	props: { config: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toolsBySize = computed(() => [...props.config.tools].sort((a, b) => b.estimatedTokens - a.estimatedTokens));
		const largestToolTokens = computed(() => toolsBySize.value[0]?.estimatedTokens ?? 0);
		function formatTokens(tokens) {
			return tokens < 1e3 ? tokens.toString() : `${(tokens / 1e3).toFixed(1)}k`;
		}
		function estimatedTokensLabel(tokens) {
			return i18n.baseText("instanceAi.debug.runDebug.estimatedTokens", { interpolate: { count: formatTokens(tokens) } });
		}
		function barWidth(tokens) {
			return largestToolTokens.value > 0 ? `${tokens / largestToolTokens.value * 100}%` : "0%";
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("article", {
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": "instance-ai-llm-step-config"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.roleLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.inputSettings")), 3)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardBody) }, [__props.config.settings.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.settings)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.config.settings, (setting) => {
				return openBlock(), createElementBlock("span", {
					key: setting.label,
					class: normalizeClass(_ctx.$style.settingChip),
					title: `${setting.label}: ${setting.value}`
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.settingLabel) }, toDisplayString(setting.label), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.settingValue) }, toDisplayString(setting.value), 3)], 10, _hoisted_1$6);
			}), 128))], 2)) : createCommentVNode("", true), __props.config.tools.length > 0 ? (openBlock(), createElementBlock("details", {
				key: 1,
				class: normalizeClass(_ctx.$style.tools)
			}, [createBaseVNode("summary", { class: normalizeClass(_ctx.$style.toolsSummary) }, [createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.toolCount", { interpolate: { count: __props.config.tools.length.toString() } })), 1), createBaseVNode("span", { class: normalizeClass(_ctx.$style.toolsTotal) }, toDisplayString(estimatedTokensLabel(__props.config.toolsEstimatedTokens)), 3)], 2), createBaseVNode("ul", { class: normalizeClass(_ctx.$style.toolList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(toolsBySize.value, (tool) => {
				return openBlock(), createElementBlock("li", { key: tool.name }, [createBaseVNode("details", { class: normalizeClass(_ctx.$style.tool) }, [createBaseVNode("summary", { class: normalizeClass(_ctx.$style.toolSummary) }, [
					createBaseVNode("code", { class: normalizeClass(_ctx.$style.toolName) }, toDisplayString(tool.name), 3),
					createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.toolBar),
						"aria-hidden": "true"
					}, [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.toolBarFill),
						style: normalizeStyle({ width: barWidth(tool.estimatedTokens) })
					}, null, 6)], 2),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.toolTokens) }, toDisplayString(estimatedTokensLabel(tool.estimatedTokens)), 3)
				], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.toolBody) }, [tool.description ? (openBlock(), createElementBlock("p", {
					key: 0,
					class: normalizeClass(_ctx.$style.description)
				}, toDisplayString(tool.description), 3)) : createCommentVNode("", true), tool.inputSchema ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
					key: 1,
					value: tool.inputSchema,
					label: unref(i18n).baseText("instanceAi.debug.runDebug.toolInputSchema")
				}, null, 8, ["value", "label"])) : createCommentVNode("", true)], 2)], 2)]);
			}), 128))], 2)], 2)) : createCommentVNode("", true)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_8ohae_2",
	cardHeader: "_cardHeader_8ohae_10",
	roleLabel: "_roleLabel_8ohae_17",
	cardBody: "_cardBody_8ohae_24",
	settings: "_settings_8ohae_31",
	settingChip: "_settingChip_8ohae_37",
	settingLabel: "_settingLabel_8ohae_47",
	settingValue: "_settingValue_8ohae_52",
	tools: "_tools_8ohae_61",
	toolsSummary: "_toolsSummary_8ohae_67",
	toolSummary: "_toolSummary_8ohae_68",
	toolsTotal: "_toolsTotal_8ohae_97",
	tool: "_tool_8ohae_61",
	toolList: "_toolList_8ohae_108",
	toolName: "_toolName_8ohae_120",
	toolBar: "_toolBar_8ohae_130",
	toolBarFill: "_toolBarFill_8ohae_139",
	toolTokens: "_toolTokens_8ohae_146",
	toolBody: "_toolBody_8ohae_154",
	description: "_description_8ohae_161"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiDebugUsage.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiDebugUsage_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiDebugUsage",
	props: {
		usage: {},
		cacheBreak: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const cacheBreakDescription = computed(() => props.cacheBreak ? describeCacheBreak(i18n, props.cacheBreak) : void 0);
		function formatTokens(tokens) {
			return tokens.toLocaleString();
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("article", {
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": "instance-ai-llm-step-usage"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.roleLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.usage")), 3)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardBody) }, [
				cacheBreakDescription.value ? (openBlock(), createElementBlock("p", {
					key: 0,
					class: normalizeClass(_ctx.$style.cacheBreak),
					"data-test-id": "instance-ai-llm-step-cache-break-detail"
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.cacheBreakLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.cacheBreak")), 3), createTextVNode(" " + toDisplayString(cacheBreakDescription.value), 1)], 2)) : createCommentVNode("", true),
				__props.usage.rows.length > 0 ? (openBlock(), createElementBlock("table", {
					key: 1,
					class: normalizeClass(_ctx.$style.table)
				}, [createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.usage.rows, (row) => {
					return openBlock(), createElementBlock("tr", { key: row.label }, [
						createBaseVNode("th", {
							class: normalizeClass(_ctx.$style.rowLabel),
							scope: "row"
						}, toDisplayString(row.label), 3),
						createBaseVNode("td", { class: normalizeClass(_ctx.$style.tokens) }, toDisplayString(formatTokens(row.tokens)), 3),
						createBaseVNode("td", { class: normalizeClass(_ctx.$style.details) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(row.details, (detail) => {
							return openBlock(), createElementBlock("span", {
								key: detail.label,
								class: normalizeClass(_ctx.$style.detail)
							}, [createTextVNode(toDisplayString(detail.label) + " ", 1), createBaseVNode("span", { class: normalizeClass(_ctx.$style.detailTokens) }, toDisplayString(formatTokens(detail.tokens)), 3)], 2);
						}), 128))], 2)
					]);
				}), 128))])], 2)) : createCommentVNode("", true),
				__props.usage.settings.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.settings)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.usage.settings, (setting) => {
					return openBlock(), createElementBlock("span", {
						key: setting.label,
						class: normalizeClass(_ctx.$style.settingChip)
					}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.settingLabel) }, toDisplayString(setting.label), 3), createTextVNode(" " + toDisplayString(setting.value), 1)], 2);
				}), 128))], 2)) : createCommentVNode("", true),
				createVNode(InstanceAiDebugJsonPanel_default, {
					value: __props.usage.metadata,
					label: unref(i18n).baseText("instanceAi.debug.runDebug.usageRaw")
				}, null, 8, ["value", "label"])
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_1egek_2",
	cardHeader: "_cardHeader_1egek_10",
	roleLabel: "_roleLabel_1egek_17",
	cardBody: "_cardBody_1egek_24",
	cacheBreak: "_cacheBreak_1egek_31",
	cacheBreakLabel: "_cacheBreakLabel_1egek_42",
	table: "_table_1egek_48",
	rowLabel: "_rowLabel_1egek_58",
	tokens: "_tokens_1egek_65",
	details: "_details_1egek_73",
	detail: "_detail_1egek_73",
	detailTokens: "_detailTokens_1egek_84",
	settings: "_settings_1egek_90",
	settingChip: "_settingChip_1egek_96",
	settingLabel: "_settingLabel_1egek_106"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiLlmStepDetail.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiLlmStepDetail_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiLlmStepDetail",
	props: {
		input: {},
		output: {},
		runSteps: {},
		workflowCode: {},
		cacheBreak: {}
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const i18n = useI18n();
		const outputSectionRef = ref(null);
		const parsedSystemPrompt = computed(() => parseSystemPromptForDisplay(stepInstructions(props.input)));
		const systemBlocks = computed(() => parsedSystemPrompt.value.systemBlocks);
		const systemObservations = computed(() => parsedSystemPrompt.value.observations);
		const messageBlocks = computed(() => parseMessageBlocks(props.input?.messages));
		const inputExtras = computed(() => parseInputExtras(props.input));
		const stepConfig = computed(() => parseStepConfig(props.input));
		const outputDisplayBlocks = computed(() => parseOutputDisplayBlocks(props.output));
		const usageSummary = computed(() => parseUsageSummary(props.output?.usage));
		const outputExtras = computed(() => parseOutputExtras(props.output));
		const workflowSnapshotsByToolCallId = computed(() => mapWorkflowSnapshotsByToolCallId(props.runSteps ?? [], props.workflowCode ?? []));
		const finishReason = computed(() => typeof props.output?.finishReason === "string" ? props.output.finishReason : void 0);
		const systemCharCount = computed(() => systemBlocks.value.reduce((total, block) => total + block.content.length, 0));
		const hasInputContent = computed(() => systemBlocks.value.length > 0 || Boolean(systemObservations.value) || messageBlocks.value.length > 0 || Boolean(stepConfig.value) || Boolean(inputExtras.value));
		const hasOutputContent = computed(() => outputDisplayBlocks.value.length > 0 || Boolean(outputExtras.value) || Boolean(usageSummary.value));
		const showSystemDetails = computed(() => systemBlocks.value.length > 0);
		function getCardClass(role) {
			const normalized = role.toLowerCase();
			if (normalized.includes("system")) return "cardSystem";
			if (normalized === "reasoning") return "cardMuted";
			if (normalized === "user") return "cardUser";
			if (normalized === "assistant") return "cardAssistant";
			if (normalized === "tool") return "cardTool";
			return "cardMuted";
		}
		function formatCharCount(count) {
			return i18n.baseText("instanceAi.debug.runDebug.charCount", { interpolate: { count: count.toLocaleString() } });
		}
		function scrollToOutput(container) {
			if (!outputSectionRef.value) {
				container.scrollTo({
					top: 0,
					behavior: "smooth"
				});
				return;
			}
			const containerTop = container.getBoundingClientRect().top;
			const sectionTop = outputSectionRef.value.getBoundingClientRect().top;
			container.scrollTo({
				top: container.scrollTop + (sectionTop - containerTop),
				behavior: "smooth"
			});
		}
		__expose({ scrollToOutput });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.root) }, [
				__props.input ? (openBlock(), createElementBlock("section", {
					key: 0,
					class: normalizeClass(_ctx.$style.section)
				}, [createVNode(unref(N8nText_default), {
					tag: "h3",
					size: "small",
					bold: "",
					color: "text-dark",
					class: normalizeClass(_ctx.$style.sectionTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.input")), 1)]),
					_: 1
				}, 8, ["class"]), hasInputContent.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.stack)
				}, [
					showSystemDetails.value ? (openBlock(), createElementBlock("details", {
						key: 0,
						class: normalizeClass([
							_ctx.$style.card,
							_ctx.$style.cardSystem,
							_ctx.$style.expandableCard
						])
					}, [createBaseVNode("summary", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.roleLabel) }, "system", 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.headerMeta) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.metaLabel) }, toDisplayString(formatCharCount(systemCharCount.value)), 3)], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardBody) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(systemBlocks.value, (block, index) => {
						return openBlock(), createElementBlock(Fragment, { key: `system-${index}` }, [block.segments?.length ? (openBlock(), createBlock(InstanceAiDebugMessageBody_default, {
							key: 0,
							segments: block.segments,
							"workflow-snapshots-by-tool-call-id": workflowSnapshotsByToolCallId.value
						}, null, 8, ["segments", "workflow-snapshots-by-tool-call-id"])) : (openBlock(), createElementBlock("p", {
							key: 1,
							class: normalizeClass(_ctx.$style.text)
						}, toDisplayString(block.content), 3)), block.metadata ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
							key: 2,
							value: block.metadata,
							label: unref(i18n).baseText("instanceAi.debug.runDebug.metadata")
						}, null, 8, ["value", "label"])) : createCommentVNode("", true)], 64);
					}), 128))], 2)], 2)) : createCommentVNode("", true),
					systemObservations.value ? (openBlock(), createElementBlock("article", {
						key: 1,
						class: normalizeClass([_ctx.$style.card, _ctx.$style.cardObservations])
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.roleLabel) }, "observations", 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardBody) }, [createBaseVNode("p", { class: normalizeClass(_ctx.$style.text) }, toDisplayString(systemObservations.value), 3)], 2)], 2)) : createCommentVNode("", true),
					messageBlocks.value.length > 0 ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-light",
						class: normalizeClass(_ctx.$style.stackLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.messages")), 1)]),
						_: 1
					}, 8, ["class"]), (openBlock(true), createElementBlock(Fragment, null, renderList(messageBlocks.value, (block, index) => {
						return openBlock(), createElementBlock("article", {
							key: `message-${index}`,
							class: normalizeClass([_ctx.$style.card, _ctx.$style[getCardClass(block.role)]])
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.roleLabel) }, toDisplayString(block.role), 3)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardBody) }, [block.segments?.length ? (openBlock(), createBlock(InstanceAiDebugMessageBody_default, {
							key: 0,
							segments: block.segments,
							"workflow-snapshots-by-tool-call-id": workflowSnapshotsByToolCallId.value
						}, null, 8, ["segments", "workflow-snapshots-by-tool-call-id"])) : (openBlock(), createElementBlock("p", {
							key: 1,
							class: normalizeClass(_ctx.$style.text)
						}, toDisplayString(block.content), 3)), block.metadata ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
							key: 2,
							value: block.metadata,
							label: unref(i18n).baseText("instanceAi.debug.runDebug.metadata")
						}, null, 8, ["value", "label"])) : createCommentVNode("", true)], 2)], 2);
					}), 128))], 64)) : createCommentVNode("", true),
					stepConfig.value ? (openBlock(), createBlock(InstanceAiDebugStepConfig_default, {
						key: 3,
						config: stepConfig.value
					}, null, 8, ["config"])) : createCommentVNode("", true),
					inputExtras.value ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
						key: 4,
						value: inputExtras.value,
						label: unref(i18n).baseText("instanceAi.debug.runDebug.inputExtras")
					}, null, 8, ["value", "label"])) : createCommentVNode("", true)
				], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
				__props.output ? (openBlock(), createElementBlock("section", {
					key: 1,
					ref_key: "outputSectionRef",
					ref: outputSectionRef,
					"data-test-id": "instance-ai-llm-step-output",
					class: normalizeClass(_ctx.$style.section)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sectionHeader) }, [createVNode(unref(N8nText_default), {
					tag: "h3",
					size: "small",
					bold: "",
					color: "text-dark",
					class: normalizeClass(_ctx.$style.sectionTitle)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.output")), 1)]),
					_: 1
				}, 8, ["class"]), finishReason.value || usageSummary.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.statsBar)
				}, [finishReason.value ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(_ctx.$style.statChip)
				}, toDisplayString(finishReason.value), 3)) : createCommentVNode("", true), usageSummary.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(usageSummary.value.label), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 2), hasOutputContent.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.stack)
				}, [
					(openBlock(true), createElementBlock(Fragment, null, renderList(outputDisplayBlocks.value, (block, index) => {
						return openBlock(), createElementBlock("article", {
							key: `output-${index}`,
							class: normalizeClass([_ctx.$style.card, _ctx.$style[getCardClass(block.role)]])
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.roleLabel) }, toDisplayString(block.role), 3)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardBody) }, [block.segments?.length ? (openBlock(), createBlock(InstanceAiDebugMessageBody_default, {
							key: 0,
							segments: block.segments,
							"workflow-snapshots-by-tool-call-id": workflowSnapshotsByToolCallId.value
						}, null, 8, ["segments", "workflow-snapshots-by-tool-call-id"])) : (openBlock(), createElementBlock("p", {
							key: 1,
							class: normalizeClass(_ctx.$style.text)
						}, toDisplayString(block.content), 3)), block.metadata ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
							key: 2,
							value: block.metadata,
							label: unref(i18n).baseText("instanceAi.debug.runDebug.metadata")
						}, null, 8, ["value", "label"])) : createCommentVNode("", true)], 2)], 2);
					}), 128)),
					usageSummary.value ? (openBlock(), createBlock(InstanceAiDebugUsage_default, {
						key: 0,
						usage: usageSummary.value,
						"cache-break": __props.cacheBreak
					}, null, 8, ["usage", "cache-break"])) : createCommentVNode("", true),
					outputExtras.value ? (openBlock(), createBlock(InstanceAiDebugJsonPanel_default, {
						key: 1,
						value: outputExtras.value,
						label: unref(i18n).baseText("instanceAi.debug.runDebug.outputMetadata")
					}, null, 8, ["value", "label"])) : createCommentVNode("", true)
				], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
				!__props.input && !__props.output ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.emptyState)
				}, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.noStepDetail")), 3)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_xknaj_2",
	section: "_section_xknaj_8",
	sectionHeader: "_sectionHeader_xknaj_19",
	sectionTitle: "_sectionTitle_xknaj_27",
	statsBar: "_statsBar_xknaj_31",
	statChip: "_statChip_xknaj_38",
	stack: "_stack_xknaj_46",
	stackLabel: "_stackLabel_xknaj_52",
	card: "_card_xknaj_56",
	expandableCard: "_expandableCard_xknaj_63",
	cardHeader: "_cardHeader_xknaj_63",
	headerMeta: "_headerMeta_xknaj_70",
	cardSystem: "_cardSystem_xknaj_80",
	cardObservations: "_cardObservations_xknaj_84",
	cardUser: "_cardUser_xknaj_88",
	cardAssistant: "_cardAssistant_xknaj_92",
	cardTool: "_cardTool_xknaj_96",
	cardMuted: "_cardMuted_xknaj_100",
	cardBody: "_cardBody_xknaj_118",
	roleLabel: "_roleLabel_xknaj_125",
	metaLabel: "_metaLabel_xknaj_132",
	text: "_text_xknaj_137",
	emptyState: "_emptyState_xknaj_146"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiRunWorkflowCodeSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiRunWorkflowCodeSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiRunWorkflowCodeSection",
	props: {
		snapshots: {},
		showDivider: { type: Boolean }
	},
	setup(__props) {
		const i18n = useI18n();
		function formatCharCount(count) {
			return i18n.baseText("instanceAi.debug.runDebug.charCount", { interpolate: { count: count.toLocaleString() } });
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", { class: normalizeClass([_ctx.$style.section, __props.showDivider && _ctx.$style.sectionDivider]) }, [createVNode(unref(N8nText_default), {
				tag: "h3",
				size: "small",
				bold: "",
				color: "text-dark",
				class: normalizeClass(_ctx.$style.sectionTitle)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.debug.tab.workflowCode")), 1)]),
				_: 1
			}, 8, ["class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.stack) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.snapshots, (snapshot, index) => {
				return openBlock(), createElementBlock("details", {
					key: `${snapshot.capturedAt}-${index}`,
					class: normalizeClass([
						_ctx.$style.card,
						_ctx.$style.cardWorkflow,
						_ctx.$style.expandableCard
					]),
					"data-test-id": "instance-ai-run-workflow-code-snapshot"
				}, [createBaseVNode("summary", { class: normalizeClass(_ctx.$style.cardHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.roleLabel) }, toDisplayString(snapshot.source), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.headerMeta) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.metaLabel) }, toDisplayString(formatCharCount(snapshot.code.length)), 3)], 2)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.cardBody) }, [createVNode(InstanceAiDebugWorkflowCodeSnapshot_default, { snapshot }, null, 8, ["snapshot"])], 2)], 2);
			}), 128))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	section: "_section_aaqs2_2",
	sectionDivider: "_sectionDivider_aaqs2_8",
	sectionTitle: "_sectionTitle_aaqs2_13",
	stack: "_stack_aaqs2_17",
	card: "_card_aaqs2_23",
	expandableCard: "_expandableCard_aaqs2_30",
	cardHeader: "_cardHeader_aaqs2_30",
	headerMeta: "_headerMeta_aaqs2_37",
	cardWorkflow: "_cardWorkflow_aaqs2_47",
	cardBody: "_cardBody_aaqs2_68",
	roleLabel: "_roleLabel_aaqs2_72",
	metaLabel: "_metaLabel_aaqs2_79"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiLlmStepsModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$5 = ["onClick"];
var _hoisted_2$2 = ["onClick"];
var _hoisted_3$2 = ["title"];
var InstanceAiLlmStepsModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiLlmStepsModal",
	props: { open: { type: Boolean } },
	emits: ["update:open"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const debugStore = useInstanceAiDebugStore();
		const currentThread = useThread();
		const selectedStepNumber = ref(null);
		const detailPaneRef = ref(null);
		const stepDetailRef = ref(null);
		const steps = computed(() => debugStore.runDebug?.steps ?? []);
		const runWorkflowCode = computed(() => debugStore.runDebug?.workflowCode ?? []);
		const selectedRunId = computed(() => debugStore.selectedRunId);
		const selectedStep = computed(() => {
			if (selectedStepNumber.value === null) return void 0;
			return steps.value.find((step) => step.stepNumber === selectedStepNumber.value);
		});
		const cacheBreaks = computed(() => parseStepCacheBreaks(steps.value));
		const stepSummaries = computed(() => steps.value.map((step, index) => {
			const cacheBreak = cacheBreaks.value[index];
			return {
				stepNumber: step.stepNumber,
				summary: parseStepSummary(step.input, step.output),
				cacheBreak,
				cacheBreakDescription: cacheBreak ? describeCacheBreak(i18n, cacheBreak) : void 0
			};
		}));
		const selectedCacheBreak = computed(() => {
			const index = steps.value.findIndex((step) => step.stepNumber === selectedStepNumber.value);
			return index >= 0 ? cacheBreaks.value[index] : void 0;
		});
		watch(() => props.open, (isOpen) => {
			if (!isOpen) {
				selectedStepNumber.value = null;
				return;
			}
			selectedStepNumber.value = steps.value[0]?.stepNumber ?? null;
		});
		watch(() => steps.value, (nextSteps) => {
			if (!props.open || nextSteps.length === 0) {
				selectedStepNumber.value = null;
				return;
			}
			if (selectedStepNumber.value === null || !nextSteps.some((step) => step.stepNumber === selectedStepNumber.value)) selectedStepNumber.value = nextSteps[0]?.stepNumber ?? null;
		});
		function handleOpenChange(open) {
			emit("update:open", open);
		}
		function selectStep(stepNumber) {
			selectedStepNumber.value = stepNumber;
		}
		async function scrollDetailToOutput() {
			await nextTick();
			if (!detailPaneRef.value || !stepDetailRef.value) return;
			stepDetailRef.value.scrollToOutput(detailPaneRef.value);
		}
		watch([selectedStep, () => debugStore.isLoadingRunDebug], ([step, isLoading]) => {
			if (!props.open || !step || isLoading) return;
			scrollDetailToOutput();
		});
		async function selectRun(runId) {
			if (runId === selectedRunId.value) return;
			await debugStore.loadRunDebug(runId);
			selectedStepNumber.value = debugStore.runDebug?.steps[0]?.stepNumber ?? null;
		}
		function formatTimestamp(ms) {
			try {
				return new Date(ms).toLocaleTimeString("en-US", {
					hour12: false,
					fractionalSecondDigits: 3
				});
			} catch {
				return String(ms);
			}
		}
		function formatCompactTokens(tokens) {
			return tokens < 1e3 ? tokens.toString() : `${(tokens / 1e3).toFixed(1)}k`;
		}
		function formatStepCount(count) {
			return i18n.baseText("instanceAi.debug.runDebug.stepCount", { interpolate: { count: String(count) } });
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: __props.open,
				size: "cover",
				"data-test-id": "instance-ai-llm-steps-modal",
				"onUpdate:open": handleOpenChange
			}, {
				default: withCtx(() => [
					createVNode(unref(DialogHeader_default), { class: normalizeClass(_ctx.$style.header) }, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerMain) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerTitleRow) }, [createVNode(unref(DialogTitle_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.stepsModalTitle")), 1)]),
							_: 1
						}), steps.value.length > 0 ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.stepCount)
						}, toDisplayString(formatStepCount(steps.value.length)), 3)) : createCommentVNode("", true)], 2), selectedRunId.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "text-light",
							class: normalizeClass(_ctx.$style.runId)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(selectedRunId.value), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)], 2)]),
						_: 1
					}, 8, ["class"]),
					createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.shell) }, [unref(debugStore).threadDebugRuns.length === 0 ? (openBlock(), createElementBlock("div", {
							key: 0,
							class: normalizeClass(_ctx.$style.emptyState)
						}, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.noRuns")), 3)) : (openBlock(), createElementBlock("div", {
							key: 1,
							class: normalizeClass(_ctx.$style.layout)
						}, [
							createBaseVNode("aside", { class: normalizeClass([_ctx.$style.sidebar, _ctx.$style.runsSidebar]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sidebarHeader) }, [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.runs")) + " ", 1), createBaseVNode("span", { class: normalizeClass(_ctx.$style.sidebarCount) }, toDisplayString(unref(debugStore).threadDebugRuns.length), 3)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.runList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(debugStore).threadDebugRuns, (run, index) => {
								return openBlock(), createElementBlock("button", {
									key: run.runId,
									type: "button",
									class: normalizeClass([_ctx.$style.runButton, selectedRunId.value === run.runId && _ctx.$style.runButtonSelected]),
									"data-test-id": "instance-ai-llm-steps-modal-run",
									onClick: ($event) => selectRun(run.runId)
								}, [
									createBaseVNode("div", { class: normalizeClass(_ctx.$style.runTopRow) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.runNumber) }, toDisplayString(index + 1), 3), createBaseVNode("div", { class: normalizeClass(_ctx.$style.runTopRowRight) }, [run.runId === unref(currentThread).activeRunId ? (openBlock(), createElementBlock("span", {
										key: 0,
										class: normalizeClass(_ctx.$style.currentBadge)
									}, toDisplayString(unref(i18n).baseText("instanceAi.debug.threads.current")), 3)) : createCommentVNode("", true), createBaseVNode("span", { class: normalizeClass(_ctx.$style.runIdShort) }, toDisplayString(run.runId.slice(0, 12)), 3)], 2)], 2),
									run.label ? (openBlock(), createElementBlock("span", {
										key: 0,
										class: normalizeClass(_ctx.$style.runLabel)
									}, toDisplayString(run.label), 3)) : createCommentVNode("", true),
									createBaseVNode("span", { class: normalizeClass(_ctx.$style.runMeta) }, toDisplayString(formatStepCount(run.stepCount)) + " · " + toDisplayString(formatTimestamp(run.startedAt)), 3)
								], 10, _hoisted_1$5);
							}), 128))], 2)], 2),
							createBaseVNode("aside", { class: normalizeClass([_ctx.$style.sidebar, _ctx.$style.stepsSidebar]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sidebarHeader) }, [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.debug.tab.llmSteps")) + " ", 1), createBaseVNode("span", { class: normalizeClass(_ctx.$style.sidebarCount) }, toDisplayString(steps.value.length), 3)], 2), steps.value.length === 0 ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(_ctx.$style.sidebarEmpty)
							}, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.noSteps")), 3)) : (openBlock(), createElementBlock("div", {
								key: 1,
								class: normalizeClass(_ctx.$style.stepList)
							}, [(openBlock(true), createElementBlock(Fragment, null, renderList(stepSummaries.value, ({ stepNumber, summary, cacheBreak, cacheBreakDescription }) => {
								return openBlock(), createElementBlock("button", {
									key: stepNumber,
									type: "button",
									class: normalizeClass([
										_ctx.$style.stepButton,
										cacheBreak && _ctx.$style.stepButtonCacheBreak,
										selectedStepNumber.value === stepNumber && _ctx.$style.stepButtonSelected
									]),
									onClick: ($event) => selectStep(stepNumber)
								}, [
									createBaseVNode("div", { class: normalizeClass(_ctx.$style.stepTopRow) }, [
										createBaseVNode("span", { class: normalizeClass([_ctx.$style.stepNumber, cacheBreak && _ctx.$style.stepNumberCacheBreak]) }, toDisplayString(stepNumber + 1), 3),
										summary.finishReason ? (openBlock(), createElementBlock("span", {
											key: 0,
											class: normalizeClass(_ctx.$style.finishReason)
										}, toDisplayString(summary.finishReason), 3)) : createCommentVNode("", true),
										cacheBreak ? (openBlock(), createElementBlock("span", {
											key: 1,
											class: normalizeClass(_ctx.$style.cacheBreakBadge),
											title: cacheBreakDescription,
											"data-test-id": "instance-ai-llm-step-cache-break"
										}, [
											createVNode(unref(N8nIcon_default), { icon: "triangle-alert" }),
											createTextVNode(" " + toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.cacheBreak")) + " ", 1),
											createBaseVNode("span", { class: normalizeClass(_ctx.$style.cacheBreakTokens) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.cacheBreakLostTokens", { interpolate: { count: formatCompactTokens(cacheBreak.lostTokens) } })), 3)
										], 10, _hoisted_3$2)) : createCommentVNode("", true)
									], 2),
									summary.toolNames.length > 0 ? (openBlock(), createElementBlock("span", {
										key: 0,
										class: normalizeClass(_ctx.$style.stepTools)
									}, toDisplayString(summary.toolNames.join(", ")), 3)) : summary.messagePreview ? (openBlock(), createElementBlock("span", {
										key: 1,
										class: normalizeClass(_ctx.$style.stepPreview)
									}, toDisplayString(summary.messagePreview), 3)) : createCommentVNode("", true),
									summary.usageLabel ? (openBlock(), createElementBlock("span", {
										key: 2,
										class: normalizeClass(_ctx.$style.stepUsage)
									}, toDisplayString(summary.usageLabel), 3)) : createCommentVNode("", true)
								], 10, _hoisted_2$2);
							}), 128))], 2))], 2),
							createBaseVNode("div", {
								ref_key: "detailPaneRef",
								ref: detailPaneRef,
								class: normalizeClass(_ctx.$style.detail)
							}, [unref(debugStore).isLoadingRunDebug ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(_ctx.$style.loadingState)
							}, [createVNode(unref(N8nIcon_default), {
								icon: "spinner",
								color: "primary",
								spin: "",
								size: "small"
							})], 2)) : selectedStep.value || runWorkflowCode.value.length > 0 ? (openBlock(), createElementBlock("div", {
								key: 1,
								class: normalizeClass(_ctx.$style.detailContent)
							}, [selectedStep.value ? (openBlock(), createBlock(InstanceAiLlmStepDetail_default, {
								key: 0,
								ref_key: "stepDetailRef",
								ref: stepDetailRef,
								input: selectedStep.value.input,
								output: selectedStep.value.output,
								"run-steps": steps.value,
								"workflow-code": runWorkflowCode.value,
								"cache-break": selectedCacheBreak.value
							}, null, 8, [
								"input",
								"output",
								"run-steps",
								"workflow-code",
								"cache-break"
							])) : createCommentVNode("", true), runWorkflowCode.value.length > 0 ? (openBlock(), createBlock(InstanceAiRunWorkflowCodeSection_default, {
								key: 1,
								snapshots: runWorkflowCode.value,
								"show-divider": Boolean(selectedStep.value)
							}, null, 8, ["snapshots", "show-divider"])) : createCommentVNode("", true)], 2)) : (openBlock(), createElementBlock("div", {
								key: 2,
								class: normalizeClass(_ctx.$style.emptyState)
							}, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.noStepDetail")), 3))], 2)
						], 2))], 2)]),
						_: 1
					}),
					createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "medium",
							onClick: _cache[0] || (_cache[0] = ($event) => handleOpenChange(false))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.close")), 1)]),
							_: 1
						})]),
						_: 1
					})
				]),
				_: 1
			}, 8, ["open"]);
		};
	}
}), [["__cssModules", { "$style": {
	shell: "_shell_15fqn_1",
	header: "_header_15fqn_11",
	headerMain: "_headerMain_15fqn_16",
	headerTitleRow: "_headerTitleRow_15fqn_20",
	runId: "_runId_15fqn_27",
	stepCount: "_stepCount_15fqn_33",
	layout: "_layout_15fqn_39",
	sidebar: "_sidebar_15fqn_49",
	sidebarHeader: "_sidebarHeader_15fqn_59",
	sidebarCount: "_sidebarCount_15fqn_71",
	runList: "_runList_15fqn_76",
	stepList: "_stepList_15fqn_77",
	sidebarEmpty: "_sidebarEmpty_15fqn_86",
	runButton: "_runButton_15fqn_92",
	stepButton: "_stepButton_15fqn_93",
	runButtonSelected: "_runButtonSelected_15fqn_113",
	stepButtonSelected: "_stepButtonSelected_15fqn_114",
	runTopRow: "_runTopRow_15fqn_124",
	stepTopRow: "_stepTopRow_15fqn_125",
	runTopRowRight: "_runTopRowRight_15fqn_133",
	runNumber: "_runNumber_15fqn_141",
	stepNumber: "_stepNumber_15fqn_142",
	stepButtonCacheBreak: "_stepButtonCacheBreak_15fqn_160",
	cacheBreakBadge: "_cacheBreakBadge_15fqn_168",
	cacheBreakTokens: "_cacheBreakTokens_15fqn_184",
	stepNumberCacheBreak: "_stepNumberCacheBreak_15fqn_189",
	currentBadge: "_currentBadge_15fqn_194",
	runIdShort: "_runIdShort_15fqn_202",
	runLabel: "_runLabel_15fqn_211",
	runMeta: "_runMeta_15fqn_221",
	finishReason: "_finishReason_15fqn_222",
	stepTools: "_stepTools_15fqn_223",
	stepPreview: "_stepPreview_15fqn_224",
	stepUsage: "_stepUsage_15fqn_225",
	detail: "_detail_15fqn_237",
	detailContent: "_detailContent_15fqn_248",
	loadingState: "_loadingState_15fqn_254",
	emptyState: "_emptyState_15fqn_262"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiDebugPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = ["data-state"];
var _hoisted_2$1 = ["onClick"];
var _hoisted_3$1 = ["onClick"];
var _hoisted_4$1 = ["onClick"];
var _hoisted_5 = ["onClick"];
var InstanceAiDebugPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiDebugPanel",
	emits: ["close"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		const settingsStore = useSettingsStore();
		const currentThread = useThread();
		const debugStore = useInstanceAiDebugStore();
		const isRunDebugEnabled = computed(() => settingsStore.moduleSettings["instance-ai"]?.runDebugEnabled === true);
		const activeTab = ref("events");
		const expandedIndex = ref(null);
		const showLlmStepsModal = ref(false);
		const eventListRef = useTemplateRef("eventList");
		const events = computed(() => currentThread.debugEvents);
		const expandedMessageIndex = ref(null);
		function toggleEvent(index) {
			expandedIndex.value = expandedIndex.value === index ? null : index;
		}
		function toggleMessage(index) {
			expandedMessageIndex.value = expandedMessageIndex.value === index ? null : index;
		}
		async function handleSelectDebugRun(runId) {
			if (activeTab.value === "llmSteps") {
				await debugStore.loadRunDebug(runId);
				if (debugStore.runDebug?.runId === runId) showLlmStepsModal.value = true;
				return;
			}
			debugStore.loadRunDebug(runId);
		}
		function getTypeBadgeClass(type) {
			if (type.includes("error")) return "error";
			if (type.includes("finish")) return "finish";
			if (type.includes("start") || type.includes("spawn")) return "start";
			if (type.includes("tool")) return "tool";
			if (type.includes("text") || type.includes("reasoning")) return "text";
			if (type.includes("confirmation")) return "confirm";
			return "default";
		}
		function getRoleBadgeClass(role) {
			if (role === "user") return "start";
			if (role === "assistant") return "tool";
			if (role === "system") return "confirm";
			return "default";
		}
		function formatTime(iso) {
			try {
				return new Date(iso).toLocaleTimeString("en-US", {
					hour12: false,
					fractionalSecondDigits: 3
				});
			} catch {
				return iso;
			}
		}
		function formatTimestamp(ms) {
			try {
				return new Date(ms).toLocaleTimeString("en-US", {
					hour12: false,
					fractionalSecondDigits: 3
				});
			} catch {
				return String(ms);
			}
		}
		function formatDateTime(iso) {
			try {
				const d = new Date(iso);
				return `${d.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric"
				})} ${d.toLocaleTimeString("en-US", {
					hour12: false,
					hour: "2-digit",
					minute: "2-digit"
				})}`;
			} catch {
				return iso;
			}
		}
		async function refreshRunDebugData() {
			await debugStore.refreshRunDebug(currentThread.id, currentThread.activeRunId);
		}
		function contentPreview(content) {
			if (typeof content === "string") return content.length > 100 ? content.slice(0, 100) + "..." : content;
			const str = JSON.stringify(content);
			return str.length > 100 ? str.slice(0, 100) + "..." : str;
		}
		async function handleCopyTrace() {
			const trace = currentThread.copyFullTrace();
			await navigator.clipboard.writeText(trace);
		}
		watch(() => events.value.length, () => {
			nextTick(() => {
				if (eventListRef.value) eventListRef.value.scrollTop = eventListRef.value.scrollHeight;
			});
		});
		watch(activeTab, (tab) => {
			if (tab === "threads" && debugStore.threads.length === 0) debugStore.loadThreads();
			if (isRunDebugEnabled.value && (tab === "llmSteps" || tab === "workflowCode")) refreshRunDebugData();
		});
		watch(isRunDebugEnabled, (enabled) => {
			if (!enabled && (activeTab.value === "llmSteps" || activeTab.value === "workflowCode")) {
				activeTab.value = "events";
				showLlmStepsModal.value = false;
			}
		});
		watch(() => currentThread.isStreaming, (isStreaming, wasStreaming) => {
			if (isRunDebugEnabled.value && wasStreaming && !isStreaming && (activeTab.value === "llmSteps" || activeTab.value === "workflowCode")) refreshRunDebugData();
		});
		function handleSelectThread(threadId) {
			expandedMessageIndex.value = null;
			debugStore.selectThread(threadId);
		}
		function handleRefreshThreads() {
			debugStore.loadThreads();
		}
		const toolCallTimings = computed(() => {
			const timings = [];
			for (const msg of currentThread.messages) {
				if (!msg.agentTree) continue;
				const nodes = [msg.agentTree, ...msg.agentTree.children];
				for (const node of nodes) for (const tc of node.toolCalls) if (tc.startedAt && tc.completedAt) {
					const ms = new Date(tc.completedAt).getTime() - new Date(tc.startedAt).getTime();
					timings.push({
						name: tc.toolName,
						duration: ms < 1e3 ? `${ms}ms` : `${(ms / 1e3).toFixed(1)}s`,
						toolCallId: tc.toolCallId
					});
				}
			}
			return timings;
		});
		onMounted(() => {
			if (activeTab.value === "threads") debugStore.loadThreads();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.panel) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerTitle) }, [createVNode(unref(N8nIcon_default), {
					icon: "bug",
					size: "small"
				}), createBaseVNode("span", null, toDisplayString(unref(i18n).baseText("instanceAi.debug.title")), 1)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerActions) }, [activeTab.value === "events" ? (openBlock(), createElementBlock("button", {
					key: 0,
					class: normalizeClass(_ctx.$style.copyButton),
					onClick: handleCopyTrace
				}, toDisplayString(unref(i18n).baseText("instanceAi.debug.copyTrace")), 3)) : createCommentVNode("", true), createVNode(unref(N8nIconButton_default), {
					icon: "x",
					variant: "ghost",
					size: "small",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
				})], 2)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.tabBar) }, [
					createBaseVNode("button", {
						class: normalizeClass([_ctx.$style.tab, activeTab.value === "events" && _ctx.$style.tabActive]),
						onClick: _cache[1] || (_cache[1] = ($event) => activeTab.value = "events")
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.tab.events")), 3),
					createBaseVNode("button", {
						class: normalizeClass([_ctx.$style.tab, activeTab.value === "threads" && _ctx.$style.tabActive]),
						onClick: _cache[2] || (_cache[2] = ($event) => activeTab.value = "threads")
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.tab.threads")), 3),
					isRunDebugEnabled.value ? (openBlock(), createElementBlock("button", {
						key: 0,
						class: normalizeClass([_ctx.$style.tab, activeTab.value === "llmSteps" && _ctx.$style.tabActive]),
						onClick: _cache[3] || (_cache[3] = ($event) => activeTab.value = "llmSteps")
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.tab.llmSteps")), 3)) : createCommentVNode("", true),
					isRunDebugEnabled.value ? (openBlock(), createElementBlock("button", {
						key: 1,
						class: normalizeClass([_ctx.$style.tab, activeTab.value === "workflowCode" && _ctx.$style.tabActive]),
						onClick: _cache[4] || (_cache[4] = ($event) => activeTab.value = "workflowCode")
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.tab.workflowCode")), 3)) : createCommentVNode("", true)
				], 2),
				activeTab.value === "events" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.statusBar) }, [
						createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.statusDot),
							"data-state": unref(currentThread).sseState
						}, null, 10, _hoisted_1$4),
						createBaseVNode("span", null, "SSE: " + toDisplayString(unref(currentThread).sseState), 1),
						createBaseVNode("span", { class: normalizeClass(_ctx.$style.eventCount) }, toDisplayString(events.value.length) + " events", 3)
					], 2),
					toolCallTimings.value.length > 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.timingSection)
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.timingTitle) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.timing")), 3), (openBlock(true), createElementBlock(Fragment, null, renderList(toolCallTimings.value, (timing) => {
						return openBlock(), createElementBlock("div", {
							key: timing.toolCallId,
							class: normalizeClass(_ctx.$style.timingRow)
						}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.timingName) }, toDisplayString(timing.name), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.timingDuration) }, toDisplayString(timing.duration), 3)], 2);
					}), 128))], 2)) : createCommentVNode("", true),
					createBaseVNode("div", {
						ref: "eventList",
						class: normalizeClass(_ctx.$style.eventList)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(events.value, (entry, index) => {
						return openBlock(), createElementBlock("div", {
							key: index,
							class: normalizeClass(_ctx.$style.eventRow),
							onClick: ($event) => toggleEvent(index)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.eventHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.eventTime) }, toDisplayString(formatTime(entry.timestamp)), 3), createBaseVNode("span", { class: normalizeClass([_ctx.$style.eventType, _ctx.$style[getTypeBadgeClass(entry.event.type)]]) }, toDisplayString(entry.event.type), 3)], 2), expandedIndex.value === index ? (openBlock(), createElementBlock("pre", {
							key: 0,
							class: normalizeClass(_ctx.$style.eventPayload)
						}, toDisplayString(unref(formatDebugJson)(entry.event)), 3)) : createCommentVNode("", true)], 10, _hoisted_2$1);
					}), 128))], 2)
				], 64)) : createCommentVNode("", true),
				activeTab.value === "threads" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.threadListHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.sectionLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.threads.title")), 3), createBaseVNode("button", {
						class: normalizeClass(_ctx.$style.copyButton),
						onClick: handleRefreshThreads
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.threads.refresh")), 3)], 2),
					unref(debugStore).isLoadingThreads ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.loadingState)
					}, [createVNode(unref(N8nIcon_default), {
						icon: "spinner",
						color: "primary",
						spin: "",
						size: "small"
					})], 2)) : unref(debugStore).threads.length === 0 ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.emptyState)
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.threads.noThreads")), 3)) : (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.threadList)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(debugStore).threads, (thread) => {
						return openBlock(), createElementBlock("div", {
							key: thread.id,
							class: normalizeClass([_ctx.$style.threadRow, unref(debugStore).selectedThreadId === thread.id && _ctx.$style.threadRowSelected]),
							onClick: ($event) => handleSelectThread(thread.id)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.threadRowMain) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.threadTitle) }, toDisplayString(thread.title || thread.id.slice(0, 8)), 3), thread.id === unref(currentThread).id ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.currentBadge)
						}, toDisplayString(unref(i18n).baseText("instanceAi.debug.threads.current")), 3)) : createCommentVNode("", true)], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.threadTime) }, toDisplayString(formatDateTime(thread.updatedAt)), 3)], 10, _hoisted_3$1);
					}), 128))], 2)),
					unref(debugStore).selectedThreadId ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.threadDetailHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.sectionLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.threads.messages")), 3)], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.threadDetailContent) }, [unref(debugStore).isLoadingMessages ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.loadingState)
					}, [createVNode(unref(N8nIcon_default), {
						icon: "spinner",
						color: "primary",
						spin: "",
						size: "small"
					})], 2)) : unref(debugStore).threadMessages.length === 0 ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.emptyState)
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.threads.noMessages")), 3)) : (openBlock(true), createElementBlock(Fragment, { key: 2 }, renderList(unref(debugStore).threadMessages, (msg, mIdx) => {
						return openBlock(), createElementBlock("div", {
							key: msg.id,
							class: normalizeClass(_ctx.$style.messageRow),
							onClick: ($event) => toggleMessage(mIdx)
						}, [
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.messageHeader) }, [createBaseVNode("span", { class: normalizeClass([_ctx.$style.eventType, _ctx.$style[getRoleBadgeClass(msg.role)]]) }, toDisplayString(msg.role), 3), createBaseVNode("span", { class: normalizeClass(_ctx.$style.eventTime) }, toDisplayString(formatTime(msg.createdAt)), 3)], 2),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.messagePreview) }, toDisplayString(contentPreview(msg.content)), 3),
							expandedMessageIndex.value === mIdx ? (openBlock(), createElementBlock("pre", {
								key: 0,
								class: normalizeClass(_ctx.$style.eventPayload)
							}, toDisplayString(unref(formatDebugJson)(msg.content)), 3)) : createCommentVNode("", true)
						], 10, _hoisted_4$1);
					}), 128))], 2)], 64)) : createCommentVNode("", true)
				], 64)) : createCommentVNode("", true),
				isRunDebugEnabled.value && (activeTab.value === "llmSteps" || activeTab.value === "workflowCode") ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.threadListHeader) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.sectionLabel) }, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.selectRun")), 3), createBaseVNode("button", {
						class: normalizeClass(_ctx.$style.copyButton),
						onClick: refreshRunDebugData
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.refresh")), 3)], 2),
					unref(debugStore).isLoadingThreadDebugRuns ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.loadingState)
					}, [createVNode(unref(N8nIcon_default), {
						icon: "spinner",
						color: "primary",
						spin: "",
						size: "small"
					})], 2)) : unref(debugStore).threadDebugRuns.length === 0 ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.emptyState)
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.noRuns")), 3)) : (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.threadList)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(debugStore).threadDebugRuns, (run) => {
						return openBlock(), createElementBlock("div", {
							key: run.runId,
							class: normalizeClass([_ctx.$style.threadRow, unref(debugStore).selectedRunId === run.runId && _ctx.$style.threadRowSelected]),
							"data-test-id": "instance-ai-debug-run-row",
							onClick: ($event) => handleSelectDebugRun(run.runId)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.threadRowMain) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.runMeta) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.threadTitle) }, toDisplayString(run.runId.slice(0, 12)), 3), run.label ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.runLabel)
						}, toDisplayString(run.label), 3)) : createCommentVNode("", true)], 2), run.runId === unref(currentThread).activeRunId ? (openBlock(), createElementBlock("span", {
							key: 0,
							class: normalizeClass(_ctx.$style.currentBadge)
						}, toDisplayString(unref(i18n).baseText("instanceAi.debug.threads.current")), 3)) : createCommentVNode("", true)], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.threadTime) }, toDisplayString(formatTimestamp(run.startedAt)), 3)], 10, _hoisted_5);
					}), 128))], 2)),
					unref(debugStore).isLoadingRunDebug && activeTab.value === "llmSteps" ? (openBlock(), createElementBlock("div", {
						key: 3,
						class: normalizeClass(_ctx.$style.loadingState)
					}, [createVNode(unref(N8nIcon_default), {
						icon: "spinner",
						color: "primary",
						spin: "",
						size: "small"
					})], 2)) : createCommentVNode("", true),
					unref(debugStore).isLoadingRunDebug && activeTab.value === "workflowCode" ? (openBlock(), createElementBlock("div", {
						key: 4,
						class: normalizeClass(_ctx.$style.loadingState)
					}, [createVNode(unref(N8nIcon_default), {
						icon: "spinner",
						color: "primary",
						spin: "",
						size: "small"
					})], 2)) : unref(debugStore).runDebug && activeTab.value === "workflowCode" ? (openBlock(), createElementBlock(Fragment, { key: 5 }, [unref(debugStore).runDebug.workflowCode.length === 0 ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.emptyState)
					}, toDisplayString(unref(i18n).baseText("instanceAi.debug.runDebug.noWorkflowCode")), 3)) : (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass([_ctx.$style.threadDetailContent, _ctx.$style.workflowSnapshotList])
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(debugStore).runDebug.workflowCode, (snapshot, wIdx) => {
						return openBlock(), createBlock(InstanceAiDebugWorkflowCodeSnapshot_default, {
							key: `${snapshot.capturedAt}-${wIdx}`,
							snapshot,
							variant: "inline"
						}, null, 8, ["snapshot"]);
					}), 128))], 2))], 64)) : createCommentVNode("", true)
				], 64)) : createCommentVNode("", true),
				isRunDebugEnabled.value ? (openBlock(), createBlock(InstanceAiLlmStepsModal_default, {
					key: 3,
					open: showLlmStepsModal.value,
					"onUpdate:open": _cache[5] || (_cache[5] = ($event) => showLlmStepsModal.value = $event)
				}, null, 8, ["open"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_4fp9e_1",
	header: "_header_4fp9e_14",
	headerTitle: "_headerTitle_4fp9e_22",
	headerActions: "_headerActions_4fp9e_30",
	copyButton: "_copyButton_4fp9e_36",
	tabBar: "_tabBar_4fp9e_50",
	tab: "_tab_4fp9e_50",
	tabActive: "_tabActive_4fp9e_72",
	statusBar: "_statusBar_4fp9e_78",
	statusDot: "_statusDot_4fp9e_88",
	eventCount: "_eventCount_4fp9e_101",
	timingSection: "_timingSection_4fp9e_105",
	timingTitle: "_timingTitle_4fp9e_110",
	timingRow: "_timingRow_4fp9e_119",
	timingName: "_timingName_4fp9e_126",
	timingDuration: "_timingDuration_4fp9e_131",
	eventList: "_eventList_4fp9e_136",
	eventRow: "_eventRow_4fp9e_142",
	eventHeader: "_eventHeader_4fp9e_151",
	eventTime: "_eventTime_4fp9e_157",
	eventType: "_eventType_4fp9e_162",
	error: "_error_4fp9e_169",
	finish: "_finish_4fp9e_174",
	start: "_start_4fp9e_179",
	tool: "_tool_4fp9e_184",
	text: "_text_4fp9e_189",
	confirm: "_confirm_4fp9e_194",
	"default": "_default_4fp9e_199",
	eventPayload: "_eventPayload_4fp9e_204",
	threadListHeader: "_threadListHeader_4fp9e_220",
	sectionLabel: "_sectionLabel_4fp9e_228",
	loadingState: "_loadingState_4fp9e_236",
	emptyState: "_emptyState_4fp9e_244",
	threadList: "_threadList_4fp9e_220",
	threadRow: "_threadRow_4fp9e_257",
	threadRowSelected: "_threadRowSelected_4fp9e_266",
	threadRowMain: "_threadRowMain_4fp9e_273",
	runMeta: "_runMeta_4fp9e_280",
	runLabel: "_runLabel_4fp9e_288",
	threadTitle: "_threadTitle_4fp9e_296",
	currentBadge: "_currentBadge_4fp9e_305",
	threadTime: "_threadTime_4fp9e_313",
	threadDetailHeader: "_threadDetailHeader_4fp9e_318",
	threadDetailContent: "_threadDetailContent_4fp9e_323",
	workflowSnapshotList: "_workflowSnapshotList_4fp9e_329",
	messageRow: "_messageRow_4fp9e_336",
	messageHeader: "_messageHeader_4fp9e_345",
	messagePreview: "_messagePreview_4fp9e_352"
} }]]);
//#endregion
//#region src/features/setupPanel/composables/useWorkflowSetupItems.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* A legacy credential name must be replaced with a stored credential reference.
*/
function isBoundCredential(assigned) {
	return typeof assigned !== "string" && (Boolean(assigned?.id) || assigned?.__aiGatewayManaged === true);
}
/**
* Derives service-keyed setup items (`InstanceAiSetupItem`) for a workflow.
* Unlike `useWorkflowSetupState` (the canvas setup wizard), it takes an
* explicit workflowId instead of the editor's injected document store, holds
* no UI state, and derives done-ness on demand so out-of-band changes — e.g.
* a credential created from the credentials page — reflect immediately.
*
* Node state comes from the live document store while a canvas host has one
* hydrated, and from the saved workflow (fetched here) otherwise, so the
* derivation also works on a refreshed thread with no canvas mounted. Pass
* `paused` while the agent is editing to defer workflow reads. Credential
* reads continue so connections can start during the build.
*/
function useWorkflowSetupItems(workflowId, options = {}) {
	const nodeTypesStore = useNodeTypesStore();
	const credentialsStore = useCredentialsStore();
	const oauth = useCredentialOAuth();
	const oauthConnections = shallowReactive(/* @__PURE__ */ new Map());
	const checkedCredentialIds = shallowReactive(/* @__PURE__ */ new Set());
	watch(() => toValue(workflowId), () => checkedCredentialIds.clear());
	const workflowsListStore = useWorkflowsListStore();
	const workflowsStore = useWorkflowsStore();
	const credentialsLoadedForWorkflow = ref();
	const credentialsAvailable = computed(() => {
		const id = toValue(workflowId);
		return id !== void 0 && credentialsLoadedForWorkflow.value === id && credentialsStore.hasUsableCredentialsForScope({ workflowId: id });
	});
	/**
	* The canvas host's live document store, if any. Resolved fresh so a host
	* dispose+recreate cycle reactively swaps this to the live instance instead
	* of pinning a disposed one. Never instantiates the (heavyweight) store.
	*/
	const documentStore = computed(() => {
		const id = toValue(workflowId);
		return id ? useExistingWorkflowDocumentStore(createWorkflowDocumentId(id)) : void 0;
	});
	/**
	* The saved workflow as fetched by this composable. Deliberately not read
	* back from `workflowsById`: list pages seed that cache with `nodes: []`
	* placeholders, which would read as an empty (but "available") workflow.
	*/
	const fetchedWorkflow = ref();
	const isRefreshingWorkflow = ref(false);
	let workflowFetchVersion = 0;
	onScopeDispose(() => {
		workflowFetchVersion++;
		oauthConnections.clear();
	});
	async function refreshWorkflow({ force = false } = {}) {
		const id = toValue(workflowId);
		if (!id || !force && (toValue(options.paused) || documentStore.value?.hydrated)) return;
		const requestVersion = ++workflowFetchVersion;
		const isCurrentRequest = () => requestVersion === workflowFetchVersion && toValue(workflowId) === id && (force || !toValue(options.paused) && !documentStore.value?.hydrated);
		if (!isCurrentRequest()) return;
		isRefreshingWorkflow.value = true;
		try {
			for (let attempt = 0; attempt < 2 && isCurrentRequest(); attempt++) try {
				const workflow = await workflowsListStore.fetchWorkflow(id);
				if (isCurrentRequest()) fetchedWorkflow.value = workflow;
				return;
			} catch {}
		} finally {
			if (requestVersion === workflowFetchVersion) isRefreshingWorkflow.value = false;
		}
	}
	const workflowProjectId = computed(() => {
		if (documentStore.value?.hydrated) return documentStore.value.homeProject?.id;
		const workflow = fetchedWorkflow.value;
		return workflow?.id === toValue(workflowId) && workflow ? deriveHomeProject(workflow)?.id : void 0;
	});
	watch(() => [
		toValue(workflowId),
		toValue(options.paused) === true,
		documentStore.value?.hydrated === true
	], ([id, paused, hydrated]) => {
		if (!id) return;
		nodeTypesStore.loadNodeTypesIfNotLoaded().catch(() => {});
		refreshUsableSlice();
		if (!paused && !hydrated) refreshWorkflow();
	}, { immediate: true });
	function refreshUsableSlice() {
		const id = toValue(workflowId);
		if (id) credentialsStore.fetchUsableCredentials({ workflowId: id }).then(() => {
			if (toValue(workflowId) === id) credentialsLoadedForWorkflow.value = id;
		}).catch(() => {});
	}
	listenForCredentialChanges({
		store: credentialsStore,
		onCredentialCreated: refreshUsableSlice,
		onCredentialUpdated: refreshUsableSlice,
		onCredentialDeleted: refreshUsableSlice
	});
	workflowsStore.$onAction(({ name, args, after }) => {
		if (name !== "updateWorkflow" || args[0] !== toValue(workflowId)) return;
		after((saved) => {
			if (saved.id !== toValue(workflowId)) return;
			workflowFetchVersion++;
			fetchedWorkflow.value = saved;
			isRefreshingWorkflow.value = false;
		});
	});
	/** Live canvas nodes when a host hydrated a document store, else the fetched save's. */
	const workflowNodes = computed(() => {
		const docStore = documentStore.value;
		const id = toValue(workflowId);
		if (toValue(options.paused) && fetchedWorkflow.value?.id === id) return fetchedWorkflow.value?.nodes;
		if (docStore?.hydrated) return docStore.allNodes;
		return id && fetchedWorkflow.value?.id === id ? fetchedWorkflow.value.nodes : void 0;
	});
	const boundCredentialIds = computed(() => new Set((workflowNodes.value ?? []).flatMap((node) => Object.values(node.credentials ?? {}).map((credential) => credential.id))));
	watch(boundCredentialIds, (ids) => {
		for (const id of checkedCredentialIds) if (ids.has(id)) checkedCredentialIds.delete(id);
	});
	const boundOAuthCredentials = computed(() => {
		return [.../* @__PURE__ */ new Set([...boundCredentialIds.value, ...checkedCredentialIds])].flatMap((id) => {
			const credential = getBoundCredential(id);
			return credential && !credential.isResolvable && oauth.isOAuthCredentialType(credential.type) ? [{
				id: credential.id,
				key: JSON.stringify([
					toValue(workflowId),
					credential.type,
					credential.updatedAt,
					[...credential.scopes ?? []].sort()
				])
			}] : [];
		});
	});
	const isCheckingOAuthCredentials = computed(() => boundOAuthCredentials.value.some(({ id, key }) => {
		const connection = oauthConnections.get(id);
		return connection?.key !== key || connection.status === "loading";
	}));
	watch(boundOAuthCredentials, async (credentials) => {
		const ids = new Set(credentials.map(({ id }) => id));
		for (const id of oauthConnections.keys()) if (!ids.has(id)) oauthConnections.delete(id);
		await Promise.all(credentials.map(async ({ id, key }) => {
			const cached = oauthConnections.get(id);
			if (cached?.key === key && cached.status !== "error") return;
			const connection = {
				key,
				status: "loading"
			};
			oauthConnections.set(id, connection);
			const permissions = getResourcePermissions(getBoundCredential(id)?.scopes).credential;
			let status = permissions.read && !permissions.update ? "unknown" : "error";
			try {
				const loaded = await credentialsStore.getCredentialData({ id });
				const data = loaded?.data;
				if (data && typeof data === "object") status = Boolean(data.grantType && !["authorizationCode", "pkce"].includes(String(data.grantType))) || hasOAuthTokenData(loaded) ? "connected" : "disconnected";
			} catch {}
			if (oauthConnections.get(id) === connection) oauthConnections.set(id, {
				key,
				status
			});
		}));
	}, { immediate: true });
	/**
	* Node state is available from a hydrated canvas store or the fetched
	* workflow. Node types must be in too: deriving without them drops
	* type-defined credentials and reads parameters as issue-free, so items
	* would falsely show as done.
	*/
	const isWorkflowAvailable = computed(() => nodeTypesStore.allNodeTypes.length > 0 && workflowNodes.value !== void 0);
	const nodesByName = computed(() => {
		const byName = /* @__PURE__ */ new Map();
		for (const node of workflowNodes.value ?? []) byName.set(node.name, node);
		return byName;
	});
	function getPendingParameterNames(node) {
		const names = new Set(Object.keys(getNodeParametersIssues(nodeTypesStore, node)));
		for (const [name, value] of Object.entries(node.parameters)) if (findPlaceholderDetails(value).length > 0) names.add(name);
		return names;
	}
	const nodesRequiringSetup = computed(() => {
		return (workflowNodes.value ?? []).filter((node) => !node.disabled).map((node) => ({
			node,
			credentialTypes: getNodeCredentialTypes(nodeTypesStore, node),
			parameterNames: getPendingParameterNames(node)
		})).filter(({ credentialTypes, parameterNames }) => credentialTypes.length > 0 || parameterNames.size > 0);
	});
	/**
	* Parameter rows this composable has seen raise issues, kept so resolving
	* them renders a checked row instead of dropping it (credential rows get
	* this for free — they derive from workflow structure, not issue state).
	* Session-scoped memory, cleared when the target workflow changes.
	*/
	const settledParameterItems = /* @__PURE__ */ new Map();
	watch(() => toValue(workflowId), () => settledParameterItems.clear());
	/**
	* Items keyed like the agent's durable `setup-items` events
	* (`${workflowId}:${kind}:${key}`), so event rows and derived rows
	* reconcile to the same identity. Credential items are per credential
	* type, fanned out to the nodes using it via `nodeBindings` — except
	* generic auth types, where one credential of the type serves many
	* services so nodes can't share a row (or a done state): those are one
	* item per node, with the node name in the id.
	*/
	const derivedCredentialItems = computed(() => {
		const id = toValue(workflowId);
		if (!id || !isWorkflowAvailable.value) return [];
		const items = [];
		const bindingsByCredentialType = /* @__PURE__ */ new Map();
		for (const { node, credentialTypes } of nodesRequiringSetup.value) for (const credentialType of credentialTypes) {
			const bindings = bindingsByCredentialType.get(credentialType) ?? [];
			bindings.push({ nodeName: node.name });
			bindingsByCredentialType.set(credentialType, bindings);
		}
		for (const [credentialType, nodeBindings] of bindingsByCredentialType) {
			const appDisplayName = credentialsStore.getCredentialTypeByName(credentialType)?.displayName;
			if (GENERIC_AUTH_CREDENTIAL_TYPES.has(credentialType)) {
				for (const binding of nodeBindings) items.push({
					id: `${id}:credential:${credentialType}:${binding.nodeName}`,
					kind: "credential",
					credentialType,
					appDisplayName,
					nodeBindings: [binding]
				});
				continue;
			}
			items.push({
				id: `${id}:credential:${credentialType}`,
				kind: "credential",
				credentialType,
				appDisplayName,
				nodeBindings
			});
		}
		return items;
	});
	const derivedItems = computed(() => {
		const id = toValue(workflowId);
		if (!id || !isWorkflowAvailable.value) return [];
		const items = [...derivedCredentialItems.value];
		for (const { node, parameterNames: pendingNames } of nodesRequiringSetup.value) {
			const parameterNames = [...pendingNames];
			if (parameterNames.length === 0) continue;
			const item = {
				id: `${id}:parameters:${node.name}`,
				kind: "parameters",
				nodeName: node.name,
				parameterNames
			};
			settledParameterItems.set(item.id, item);
			items.push(item);
		}
		for (const item of settledParameterItems.values()) {
			if (items.some((existing) => existing.id === item.id)) continue;
			const node = nodesByName.value.get(item.nodeName);
			if (!node || node.disabled) continue;
			items.push(item);
		}
		return items;
	});
	function getBoundCredential(credentialId) {
		const id = toValue(workflowId);
		return credentialId ? (id && credentialsStore.hasUsableCredentialsForScope({ workflowId: id }) ? credentialsStore.getUsableCredentialById(credentialId) : void 0) ?? credentialsStore.getCredentialById(credentialId) : void 0;
	}
	function isCredentialConfigured(assigned) {
		if (!isBoundCredential(assigned)) return false;
		const credential = getBoundCredential(typeof assigned !== "string" ? assigned?.id : void 0);
		if (credential && !credential.isResolvable && oauth.isOAuthCredentialType(credential.type)) {
			if (!boundCredentialIds.value.has(credential.id)) checkedCredentialIds.add(credential.id);
			const status = oauthConnections.get(credential.id)?.status;
			return status === "connected" || status === "unknown";
		}
		return !credential?.isResolvable || credential.connectedByMe !== false;
	}
	/** Completion requires a binding on every node, not merely an available account. */
	function isItemDone(item, readNode = getNodeByName) {
		if (item.kind === "credential") {
			const nodeNames = (item.nodeBindings ?? []).map((binding) => binding.nodeName);
			return nodeNames.length > 0 && nodeNames.every((nodeName) => isCredentialConfigured(readNode(nodeName)?.credentials?.[item.credentialType]));
		}
		const node = readNode(item.nodeName);
		if (!node) return false;
		const pendingNames = getPendingParameterNames(node);
		return item.parameterNames.every((parameterName) => {
			const root = parameterName.split(/[.[\]]/)[0] ?? parameterName;
			return !pendingNames.has(root);
		});
	}
	/** The workflow node behind an item, for detail views that host node inputs. */
	function getNodeByName(nodeName) {
		return nodesByName.value.get(nodeName);
	}
	return {
		credentialsAvailable,
		workflowNodes,
		savedWorkflowChecksum: computed(() => fetchedWorkflow.value?.checksum),
		isCheckingOAuthCredentials,
		isWorkflowAvailable,
		hasWorkflowNodes: computed(() => (workflowNodes.value?.length ?? 0) > 0),
		workflowProjectId,
		derivedItems,
		derivedCredentialItems,
		isItemDone,
		isCredentialConfigured,
		isRefreshingWorkflow,
		getNodeByName,
		refreshWorkflow
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useSetupPanelState.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function completeCredentialContext(item, fallback) {
	if (item.kind !== "credential" || fallback?.kind !== "credential" || item.id !== fallback.id || item.credentialType !== fallback.credentialType) return item;
	return {
		...item,
		nodeBindings: item.nodeBindings?.length ? item.nodeBindings : fallback.nodeBindings,
		setupHint: item.setupHint ?? fallback.setupHint,
		reason: item.reason ?? fallback.reason,
		preferNew: item.preferNew ?? fallback.preferNew,
		appDisplayName: item.appDisplayName ?? fallback.appDisplayName
	};
}
/**
* Row state for the Instance AI setup panel: merges the thread's durable
* `setup-items` events with the derivation from the workflow document into a
* single row list, reconciling which feed is authoritative.
*/
function useSetupPanelState(options) {
	const { thread } = options;
	/**
	* Detects an in-flight agent edit of this workflow. Blocks nothing — it
	* only picks the row source (agent events over deriving from a mid-mutation
	* workflow) and pauses the derivation's refetches until the edit settles.
	*/
	const isAgentBuilding = computed(() => {
		const id = toValue(options.workflowId);
		if (!id) return false;
		return isAgentEditingWorkflow(thread.artifactTurns, id);
	});
	const derivation = useWorkflowSetupItems(options.workflowId, { paused: () => isAgentBuilding.value });
	const eventItems = computed(() => {
		const id = toValue(options.workflowId);
		if (!id || !Object.hasOwn(thread.setupItemsByWorkflowId, id)) return [];
		return thread.setupItemsByWorkflowId[id];
	});
	const isAwaitingFirstBuild = computed(() => {
		const id = toValue(options.workflowId);
		let pending = false;
		let latestCompletedAt;
		function visit(node) {
			for (const call of node.toolCalls) {
				if (!isRecord$1(call.result) || call.result.success !== true || call.result.workflowId !== id) continue;
				const earlySetup = resolveBuilderToolName(call.toolName, call.args.action) === SHARED_BUILDER_TOOL_NAMES.SETUP_CREDENTIALS && call.result.preBuild === true;
				if (!earlySetup && call.toolName !== WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW && call.toolName !== REMOVED_BUILDER_TOOL_NAMES.SUBMIT_WORKFLOW) continue;
				if (latestCompletedAt && call.completedAt && call.completedAt < latestCompletedAt) continue;
				pending = earlySetup;
				latestCompletedAt = call.completedAt;
			}
			for (const child of node.children) visit(child);
		}
		for (const message of thread.messages) if (message.agentTree) visit(message.agentTree);
		return pending;
	});
	const credentialContext = shallowReactive(/* @__PURE__ */ new Map());
	watch([() => toValue(options.workflowId), eventItems], ([id, items], [previousId]) => {
		if (id !== previousId) credentialContext.clear();
		for (const item of items) if (item.kind === "credential") credentialContext.set(item.id, completeCredentialContext(item, credentialContext.get(item.id)));
	}, {
		immediate: true,
		flush: "sync"
	});
	watch([eventItems, isAgentBuilding], ([items, building]) => {
		if (building && items.length > 0) derivation.refreshWorkflow({ force: true });
	}, {
		immediate: true,
		flush: "sync"
	});
	/**
	* Reconciliation: while the agent edits the workflow, its events are the
	* row source (the workflow document lags behind the agent's changes); at
	* rest the derivation is ground truth — from the live canvas store when a
	* host has one hydrated, else from the saved workflow the derivation
	* fetches itself. Events still cover that fetch being in flight, e.g.
	* right after a thread refresh.
	*/
	const rowSource = computed(() => !isAgentBuilding.value && derivation.isWorkflowAvailable.value && (!isAwaitingFirstBuild.value || derivation.hasWorkflowNodes.value || eventItems.value.length === 0) ? "derived" : "events");
	const rows = computed(() => {
		if (rowSource.value === "events") {
			const derivedById = new Map(derivation.derivedCredentialItems.value.map((item) => [item.id, item]));
			const announcedIds = new Set(eventItems.value.map((item) => item.id));
			const stillRequired = derivation.derivedCredentialItems.value.filter((item) => credentialContext.has(item.id) && !announcedIds.has(item.id));
			return [...eventItems.value, ...stillRequired].map((event) => {
				const item = completeCredentialContext(completeCredentialContext(event, derivedById.get(event.id)), credentialContext.get(event.id));
				return {
					item,
					isDone: derivation.isItemDone(item)
				};
			});
		}
		const derived = derivation.derivedItems.value;
		const derivedIds = new Set(derived.map((item) => item.id));
		const settledEventItems = eventItems.value.filter((item) => item.kind === "parameters" && !derivedIds.has(item.id) && derivation.isItemDone(item));
		return [...derived, ...settledEventItems].map((derivedItem) => {
			const item = completeCredentialContext(derivedItem, credentialContext.get(derivedItem.id));
			return {
				item,
				isDone: derivation.isItemDone(item)
			};
		});
	});
	return {
		credentialsAvailable: derivation.credentialsAvailable,
		workflowNodes: derivation.workflowNodes,
		savedWorkflowChecksum: derivation.savedWorkflowChecksum,
		isCheckingOAuthCredentials: derivation.isCheckingOAuthCredentials,
		isRefreshingWorkflow: derivation.isRefreshingWorkflow,
		rows,
		rowSource,
		isAgentBuilding,
		isAwaitingFirstBuild,
		getNodeByName: derivation.getNodeByName,
		workflowProjectId: derivation.workflowProjectId,
		refreshWorkflow: derivation.refreshWorkflow,
		isItemDone: derivation.isItemDone,
		isCredentialConfigured: derivation.isCredentialConfigured
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useSetupPanelExecution.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useSetupPanelExecution(options) {
	const rootStore = useRootStore();
	const { getTelemetryPayload } = useInstanceAiSetupPanelExperiment();
	const workflowsStore = useWorkflowsStore();
	const { runWorkflowApi } = useRunWorkflowApi();
	const nodeTypesStore = useNodeTypesStore();
	const pushStore = usePushConnectionStore();
	const logsStore = useLogsStore();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const runningWorkflows = reactive(/* @__PURE__ */ new Set());
	const isRunning = computed(() => runningWorkflows.has(toValue(options.workflowId) ?? ""));
	let disposed = false;
	const cancelWaits = /* @__PURE__ */ new Map();
	if (getCurrentScope()) onScopeDispose(() => {
		disposed = true;
		for (const cancelWait of cancelWaits.values()) cancelWait();
	});
	async function executeWorkflow() {
		const workflowId = toValue(options.workflowId);
		if (!workflowId || runningWorkflows.has(workflowId) || disposed) return;
		if (!pushStore.isConnected) throw new Error(i18n.baseText("workflowRun.noActiveConnectionToTheServer"));
		const executionState = useWorkflowExecutionStateStore(createWorkflowDocumentId(workflowId));
		if (executionState.isWorkflowRunning) return;
		runningWorkflows.add(workflowId);
		let cleanup = () => {};
		try {
			const workflow = await getWorkflow(rootStore.restApiContext, workflowId);
			await nodeTypesStore.loadNodeTypesIfNotLoaded();
			if (disposed || toValue(options.workflowId) !== workflowId || executionState.isWorkflowRunning) return;
			const triggers = workflow.nodes.filter((node) => !node.disabled && nodeTypesStore.isTriggerNode(node.type));
			const trigger = triggers.find((node) => node.name === executionState.selectedTriggerNodeName) ?? triggers[0];
			if (!trigger) throw new Error(i18n.baseText("nodeView.canvasAddButton.addATriggerNodeBeforeExecuting"));
			logsStore.toggleOpen(true);
			if (isChatNode(trigger)) {
				toast.showMessage({
					title: i18n.baseText("aiAssistant.builder.toast.title"),
					message: i18n.baseText("aiAssistant.builder.toast.description"),
					type: "info"
				});
				return;
			}
			const testContext = {
				...getTelemetryPayload(),
				test_request_id: v4(),
				session_id: rootStore.pushRef,
				source: "instance_ai_setup_panel",
				workflow_id: workflowId,
				thread_id: options.thread.id
			};
			const agentExecutionId = getExecutionResultsByWorkflow(options.thread.artifactTurns).get(workflowId)?.executionId;
			const completed = createDeferredPromise();
			const finished = /* @__PURE__ */ new Map();
			let executionId;
			let startedId;
			let waitingForWebhook = false;
			let settled = false;
			const finish = (id, status) => {
				if (settled) return;
				settled = true;
				telemetry.track(TELEMETRY_EVENT.WORKFLOW.SETUP_TEST_FINISHED, {
					...testContext,
					execution_id: id,
					status
				});
				completed.resolve(id ? {
					workflowId,
					executionId: id,
					status
				} : void 0);
			};
			const observeId = (id) => {
				executionId = id;
				if (executionState.activeExecutionId === null) executionState.setActiveExecutionId(id);
				options.thread.rememberManualExecution(workflowId, id, agentExecutionId);
				const status = finished.get(id);
				if (status) finish(id, status);
			};
			const readStatus = async () => {
				if (!executionId || settled || disposed) return;
				try {
					const execution = await workflowsStore.fetchExecutionDataById(executionId);
					if (disposed || execution?.workflowId !== workflowId || execution.id !== executionId) return;
					if (execution && isTerminalExecutionStatus(execution.status)) finish(execution.id, execution.status);
				} catch {}
			};
			const removeListener = pushStore.addEventListener((event) => {
				if (event.type === "testWebhookDeleted" && event.data.workflowId === workflowId && !event.data.executionId && waitingForWebhook && !executionId) {
					finish(void 0, "canceled");
					return;
				}
				if (event.type === "testWebhookReceived" && event.data.workflowId === workflowId) {
					startedId = event.data.executionId;
					if (waitingForWebhook && !executionId) observeId(startedId);
				}
				if (event.type === "executionStarted" && event.data.workflowId === workflowId && event.data.source !== "instance_ai") {
					startedId = event.data.executionId;
					if (waitingForWebhook && !executionId) observeId(startedId);
				}
				if (event.type !== "executionFinished" || event.data.workflowId !== workflowId || !isTerminalExecutionStatus(event.data.status)) return;
				finished.set(event.data.executionId, event.data.status);
				if (event.data.executionId === executionId) finish(executionId, event.data.status);
			});
			const stopReconnectWatch = watch(() => pushStore.isConnected, (connected) => {
				if (connected) readStatus();
			});
			cleanup = () => {
				removeListener();
				stopReconnectWatch();
			};
			cancelWaits.set(workflowId, () => {
				cleanup();
				completed.resolve(void 0);
			});
			telemetry.track(TELEMETRY_EVENT.WORKFLOW.USER_REQUESTED_WORKFLOW_TEST, testContext);
			const response = await runWorkflowApi({
				workflowId,
				triggerToStartFrom: { name: trigger.name }
			}, executionState.documentId).catch((error) => {
				telemetry.track(TELEMETRY_EVENT.WORKFLOW.SETUP_TEST_FINISHED, {
					...testContext,
					status: "request_failed"
				});
				throw error;
			});
			if (disposed) {
				if (executionState.activeExecutionId === null) {
					executionState.setActiveExecutionId(void 0);
					executionState.setExecutionWaitingForWebhook(false);
				}
				return;
			}
			waitingForWebhook = response.waitingForWebhook === true;
			executionState.setExecutionWaitingForWebhook(waitingForWebhook);
			if (response.executionId) observeId(response.executionId);
			else if (waitingForWebhook && startedId) observeId(startedId);
			else if (!waitingForWebhook) throw new Error(i18n.baseText("instanceAi.setupPanel.executeError"));
			readStatus();
			const result = await completed.promise;
			cleanup();
			if (!result && executionState.activeExecutionId === null || result && !useExistingWorkflowDocumentStore(executionState.documentId)?.hydrated && executionState.activeExecutionId === result.executionId) executionState.setActiveExecutionId(void 0);
			executionState.setExecutionWaitingForWebhook(false);
			if (disposed) return;
			if (!result) return;
			const notified = await options.thread.sendMessage(i18n.baseText("instanceAi.setupPanel.executedMessage", { interpolate: { executionId: result.executionId } }), {
				authorship: {
					kind: "prefill",
					prefillType: "handoff_setup_panel_execute"
				},
				pushRef: rootStore.pushRef
			});
			return {
				...result,
				notified
			};
		} finally {
			cleanup();
			cancelWaits.delete(workflowId);
			runningWorkflows.delete(workflowId);
		}
	}
	return {
		executeWorkflow,
		isRunning
	};
}
//#endregion
//#region src/features/ai/instanceAi/setupPanelGroups.ts
/** Group service fields with their credential and collect unrelated fields in Details. */
function groupSetupPanelRows(rows, options) {
	const groups = rows.filter((row) => row.item.kind === "credential").map((credential) => ({
		id: credential.item.id,
		credential,
		parameters: []
	}));
	const details = {
		id: `${options.workflowId}:details`,
		parameters: []
	};
	for (const row of rows.filter((entry) => entry.item.kind === "parameters")) {
		const service = groups.find((group) => group.credential?.item.nodeBindings?.some((binding) => binding.nodeName === row.item.nodeName));
		if (service) {
			service.parameters.push(row);
			continue;
		}
		const node = options.getNodeByName(row.item.nodeName);
		const categories = (node ? options.getNodeType(node) : null)?.codex?.categories;
		const isRss = node?.type === "n8n-nodes-base.rssFeedRead" || node?.type === `n8n-nodes-base.rssFeedReadTrigger`;
		if (node && (isRss || categories?.length && !categories.includes("Core Nodes"))) groups.push({
			id: row.item.id,
			node,
			parameters: [row]
		});
		else details.parameters.push(row);
	}
	if (details.parameters.length) groups.push(details);
	return groups;
}
//#endregion
//#region src/features/ai/instanceAi/setupPanelParameterChanges.ts
var import_get = /* @__PURE__ */ __toESM(require_get(), 1);
var import_cloneDeep = /* @__PURE__ */ __toESM(require_cloneDeep(), 1);
var import_isEqual = /* @__PURE__ */ __toESM(require_isEqual(), 1);
var import_set = /* @__PURE__ */ __toESM(require_set(), 1);
var import_unset = /* @__PURE__ */ __toESM(require_unset(), 1);
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Keep assignment targets stable if an agent reorders the collection. */
function resolvePath(parameters, path) {
	const resolved = [];
	for (const part of path) {
		if (typeof part === "string") {
			resolved.push(part);
			continue;
		}
		const collection = (0, import_get.default)(parameters, resolved);
		if (!Array.isArray(collection)) return void 0;
		const index = collection.findIndex((entry) => isRecord(entry) && entry.id === part.id);
		if (index === -1) return void 0;
		resolved.push(String(index));
	}
	return resolved;
}
function getSetupParameterValue(parameters, path) {
	const resolved = resolvePath(parameters, path);
	return resolved ? (0, import_get.default)(parameters, resolved) : void 0;
}
/** Compare the edited values with their baseline before a write can be queued. */
function getSetupParameterChanges(before, after, path = []) {
	if ((0, import_isEqual.default)(before, after)) return [];
	if (isRecord(before) && isRecord(after)) return [.../* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) => getSetupParameterChanges(before[key], after[key], [...path, key]));
	if (Array.isArray(before) && Array.isArray(after) && before.length === after.length) {
		if (before.every((entry, index) => {
			const next = after[index];
			return !isRecord(entry) || !isRecord(next) || entry.id === next.id;
		})) return before.flatMap((entry, index) => {
			const part = isRecord(entry) && typeof entry.id === "string" ? { id: entry.id } : String(index);
			return getSetupParameterChanges(entry, after[index], [...path, part]);
		});
	}
	return [{
		path,
		value: (0, import_cloneDeep.default)(after)
	}];
}
function applySetupParameterChanges(parameters, changes) {
	const updated = deepCopy(parameters);
	for (const change of changes) {
		const path = resolvePath(updated, change.path);
		if (!path?.length) continue;
		if (change.value === void 0) (0, import_unset.default)(updated, path);
		else (0, import_set.default)(updated, path, deepCopy(change.value));
	}
	return updated;
}
/** A newer parent edit replaces all older edits below it. */
function mergeSetupParameterChanges(previous, latest) {
	return [...previous.filter((previousChange) => !latest.some((change) => change.path.every((part, index) => (0, import_isEqual.default)(part, previousChange.path[index])))), ...latest];
}
//#endregion
//#region src/features/ai/instanceAi/composables/useSetupPanelActions.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function resolveSetupCredentialItem(item, nodes, nodeTypeProvider) {
	if (!item.nodeBindings?.length && GENERIC_AUTH_CREDENTIAL_TYPES.has(item.credentialType)) return item;
	return {
		...item,
		nodeBindings: nodes.filter((node) => !node.disabled && (!item.nodeBindings?.length || item.nodeBindings.some(({ nodeName }) => nodeName === node.name)) && getNodeCredentialTypes(nodeTypeProvider, node).includes(item.credentialType)).map((node) => ({ nodeName: node.name }))
	};
}
/**
* Re-applies the delta onto freshly fetched nodes. Mutates the given array's
* nodes in place (the caller owns a per-request fetch result).
*/
function applyDeltaToNodes(nodes, delta) {
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	let changed = false;
	let sawTarget = false;
	for (const { item, credential } of delta.credentialBinds) for (const binding of item.nodeBindings ?? []) {
		const node = nodesByName.get(binding.nodeName);
		if (!node) continue;
		sawTarget = true;
		const current = node.credentials?.[item.credentialType];
		if (typeof current !== "string" && current?.id === credential.id && current?.__aiGatewayManaged === true === (credential.__aiGatewayManaged === true)) continue;
		node.credentials = {
			...node.credentials,
			[item.credentialType]: { ...credential }
		};
		changed = true;
	}
	for (const { nodeName, changes } of delta.parameterApplies) {
		if (changes.length === 0) continue;
		const node = nodesByName.get(nodeName);
		if (!node) continue;
		sawTarget = true;
		const parameters = applySetupParameterChanges(node.parameters, changes);
		if ((0, import_isEqual.default)(parameters, node.parameters)) continue;
		node.parameters = parameters;
		changed = true;
	}
	if (changed) return "changed";
	return sawTarget ? "noop" : "dropped";
}
/** Save credential choices before applying setup values through a guarded workflow PATCH. */
function useSetupPanelActions(options) {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const nodeHelpers = useNodeHelpers();
	const instanceAiStore = useInstanceAiStore();
	const credentialsStore = useCredentialsStore();
	const activeApplyCount = ref(0);
	const isApplying = computed(() => activeApplyCount.value > 0);
	const pendingCredentialBinds = shallowReactive(/* @__PURE__ */ new Map());
	const credentialSaves = /* @__PURE__ */ new Map();
	const pendingParameterApplies = shallowReactive(/* @__PURE__ */ new Map());
	const applyingDeltas = shallowReactive(/* @__PURE__ */ new Map());
	const savedCredentialBinds = computed(() => {
		const workflowId = toValue(options.workflowId);
		if (!workflowId) return [];
		return readPendingInstanceAiSetupCredentialSelections(instanceAiStore.getThreadMetadata(options.threadId), workflowId).map(({ itemId, selection }) => {
			const cached = pendingCredentialBinds.get(itemId);
			if (cached?.selectionId === selection.selectionId) return cached;
			const credential = credentialsStore.getUsableCredentialById(selection.credentialId) ?? credentialsStore.getCredentialById(selection.credentialId);
			return {
				item: {
					id: itemId,
					kind: "credential",
					credentialType: selection.credentialType,
					nodeBindings: selection.nodeNames?.map((nodeName) => ({ nodeName }))
				},
				credential: selection.credentialId === "__AI_GATEWAY_MANAGED__" ? {
					id: null,
					name: "",
					__aiGatewayManaged: true
				} : {
					id: selection.credentialId,
					name: credential?.name ?? ""
				},
				selectionId: selection.selectionId
			};
		});
	});
	async function persistMetadata(metadata) {
		await updateThreadMetadata(rootStore.restApiContext, options.threadId, metadata);
		instanceAiStore.setThreadMetadata(options.threadId, {
			...instanceAiStore.getThreadMetadata(options.threadId),
			...metadata
		});
	}
	async function markCredentialsApplied(delta) {
		if (delta.credentialBinds.length === 0) return;
		await persistMetadata(Object.fromEntries(delta.credentialBinds.map(({ item, selectionId }) => [instanceAiSetupCredentialAppliedKey(item.id, selectionId), true])));
		for (const { item, selectionId } of delta.credentialBinds) if (pendingCredentialBinds.get(item.id)?.selectionId === selectionId) pendingCredentialBinds.delete(item.id);
	}
	/** Parameter drafts belong to the workflow that queued them. */
	let queuedWorkflowId;
	function resolveCredentialBinds(binds, nodes) {
		return binds.map((bind) => ({
			...bind,
			item: resolveSetupCredentialItem(bind.item, nodes, nodeTypesStore)
		})).filter(({ item }) => item.nodeBindings?.length);
	}
	/** Choices for absent services stay saved without blocking the current workflow. */
	const pendingApplyCount = computed(() => {
		const nodes = toValue(options.workflowNodes);
		const binds = savedCredentialBinds.value;
		return (nodes ? resolveCredentialBinds(binds, nodes).length : binds.length) + pendingParameterApplies.size;
	});
	function getPendingCredential(itemId, nodeName) {
		const workflowId = toValue(options.workflowId);
		const scopedId = nodeName ? `${itemId}:${nodeName}` : itemId;
		const queued = savedCredentialBinds.value.find(({ item }) => item.id === scopedId) ?? savedCredentialBinds.value.find(({ item }) => item.id === itemId);
		if (queued) return queued.credential;
		for (const [delta, targetId] of [...applyingDeltas].reverse()) {
			if (targetId !== workflowId) continue;
			const bind = delta.credentialBinds.find(({ item }) => item.id === scopedId) ?? delta.credentialBinds.find(({ item }) => item.id === itemId);
			if (bind) return bind.credential;
		}
	}
	function getPendingParameterChanges(nodeName) {
		const workflowId = toValue(options.workflowId);
		const queued = pendingParameterApplies.get(nodeName) ?? [];
		let changes = [];
		for (const [delta, targetId] of applyingDeltas) {
			if (targetId !== workflowId) continue;
			for (const apply of delta.parameterApplies) if (apply.nodeName === nodeName) changes = mergeSetupParameterChanges(changes, apply.changes);
		}
		return mergeSetupParameterChanges(changes, queuedWorkflowId === workflowId ? queued : []);
	}
	/** Puts a delta back into the queues, keeping any newer entries queued meanwhile. */
	function requeueDelta(workflowId, delta) {
		if (toValue(options.workflowId) !== workflowId) return;
		queuedWorkflowId = workflowId;
		for (const bind of delta.credentialBinds) if (!pendingCredentialBinds.has(bind.item.id)) pendingCredentialBinds.set(bind.item.id, bind);
		for (const { nodeName, changes } of delta.parameterApplies) {
			const existing = pendingParameterApplies.get(nodeName) ?? [];
			pendingParameterApplies.set(nodeName, mergeSetupParameterChanges(changes, existing));
		}
	}
	/**
	* Mirrors an applied delta into a live canvas document, if a host has one
	* hydrated: the derivation reads the document's nodes while it exists, and
	* the document's next save would otherwise clobber the bind (its nodes) or
	* version-conflict (its stale versionId/checksum).
	*
	* The delta merges into the document's own nodes (not the server copy) so
	* unsaved local edits survive. That includes the field the delta itself
	* wrote: a document value that already diverged from the pre-PATCH server
	* value is a newer local edit — it stays, and wins on the document's next
	* save. Mirror writes carry already-saved state, so they do not mark the
	* editor dirty, and the touched nodes' issues are recomputed so stale
	* warnings clear right away.
	*/
	function syncHydratedDocument(workflowId, delta, baseline, updated) {
		const documentStore = useExistingWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		if (!documentStore?.hydrated) return;
		const updatedNodeNames = new Set(updated.nodes.map((node) => node.name));
		const touchedNodeNames = /* @__PURE__ */ new Set();
		for (const { item, credential } of delta.credentialBinds) for (const binding of item.nodeBindings ?? []) {
			if (!updatedNodeNames.has(binding.nodeName)) continue;
			const docNode = documentStore.getNodeByName(binding.nodeName);
			if (!docNode) continue;
			const base = baseline.get(binding.nodeName);
			const current = docNode.credentials?.[item.credentialType];
			if (!(0, import_isEqual.default)(current, base?.credentials?.[item.credentialType])) continue;
			documentStore.updateNodeProperties({
				name: binding.nodeName,
				properties: { credentials: {
					...docNode.credentials,
					[item.credentialType]: { ...credential }
				} }
			}, { markDirty: false });
			touchedNodeNames.add(binding.nodeName);
		}
		for (const { nodeName, changes } of delta.parameterApplies) {
			if (!updatedNodeNames.has(nodeName)) continue;
			const docNode = documentStore.getNodeByName(nodeName);
			if (!docNode) continue;
			const base = baseline.get(nodeName);
			const mirrorChanges = changes.filter((change) => (0, import_isEqual.default)(getSetupParameterValue(docNode.parameters, change.path), getSetupParameterValue(base?.parameters ?? {}, change.path)));
			if (mirrorChanges.length === 0) continue;
			documentStore.updateNodeProperties({
				name: nodeName,
				properties: { parameters: applySetupParameterChanges(docNode.parameters, mirrorChanges) }
			}, { markDirty: false });
			touchedNodeNames.add(nodeName);
		}
		for (const nodeName of touchedNodeNames) {
			const node = documentStore.getNodeByName(nodeName);
			if (!node) continue;
			documentStore.setNodeIssue({
				node: nodeName,
				type: "credentials",
				value: nodeHelpers.getNodeCredentialIssues(node)?.credentials ?? null
			});
			const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
			if (!nodeType) continue;
			documentStore.setNodeIssue({
				node: nodeName,
				type: "parameters",
				value: getNodeParametersIssues$1(nodeType.properties, node, nodeType)?.parameters ?? null
			});
			const workflowObject = documentStore.getWorkflowObjectAccessorSnapshot();
			documentStore.setNodeIssue({
				node: nodeName,
				type: "input",
				value: nodeHelpers.getNodeInputIssues(workflowObject, node, nodeType)?.input ?? null
			});
		}
		documentStore.setVersionData({
			versionId: updated.versionId,
			name: documentStore.versionData?.name ?? null,
			description: documentStore.versionData?.description ?? null
		});
		if (updated.checksum) documentStore.setChecksum(updated.checksum);
	}
	/**
	* The guarded write: fetch the saved workflow, re-apply the delta onto its
	* nodes, PATCH with the fetched versionId + checksum. A version conflict
	* (another writer landed in between) refetches, re-applies and retries
	* once; a second conflict gives up.
	*/
	async function patchWorkflowNodes(workflowId, delta) {
		activeApplyCount.value++;
		applyingDeltas.set(delta, workflowId);
		try {
			if (delta.credentialBinds.length > 0) {
				const before = instanceAiStore.getThreadMetadata(options.threadId);
				const { thread } = await fetchThread(rootStore.restApiContext, options.threadId);
				const current = instanceAiStore.getThreadMetadata(options.threadId);
				instanceAiStore.setThreadMetadata(options.threadId, {
					...current,
					...Object.fromEntries(Object.entries(thread.metadata ?? {}).filter(([key]) => (0, import_isEqual.default)(before?.[key], current?.[key])))
				});
				const pendingIds = new Set(readPendingInstanceAiSetupCredentialSelections(instanceAiStore.getThreadMetadata(options.threadId), workflowId).map(({ selection }) => selection.selectionId));
				delta.credentialBinds = delta.credentialBinds.filter(({ selectionId }) => pendingIds.has(selectionId));
				if (delta.credentialBinds.length === 0 && delta.parameterApplies.length === 0) return "noop";
			}
			for (let attempt = 0; attempt < 2; attempt++) {
				let fresh;
				try {
					fresh = await getWorkflow(rootStore.restApiContext, workflowId);
				} catch {
					return "error";
				}
				if (!fresh.checksum) return "error";
				const nodes = fresh.nodes;
				if (nodes.length === 0 && delta.credentialBinds.length > 0) return "queued";
				if (delta.credentialBinds.length > 0) try {
					await nodeTypesStore.loadNodeTypesIfNotLoaded();
				} catch {
					return "error";
				}
				const resolvedDelta = {
					...delta,
					credentialBinds: resolveCredentialBinds(delta.credentialBinds, nodes)
				};
				const baseline = new Map(nodes.map((node) => [node.name, {
					credentials: { ...node.credentials },
					parameters: { ...node.parameters }
				}]));
				const outcome = applyDeltaToNodes(nodes, resolvedDelta);
				if (toValue(options.workflowId) !== workflowId) return "dropped";
				if (toValue(options.isAgentBuilding)) {
					requeueDelta(workflowId, delta);
					return "queued";
				}
				if (outcome !== "changed") {
					if (outcome === "noop") options.onSaved?.(fresh);
					await markCredentialsApplied(resolvedDelta);
					return outcome;
				}
				try {
					const updated = await workflowsStore.updateWorkflow(workflowId, {
						nodes,
						versionId: fresh.versionId,
						expectedChecksum: fresh.checksum
					});
					syncHydratedDocument(workflowId, resolvedDelta, baseline, updated);
					options.onSaved?.(updated);
					await markCredentialsApplied(resolvedDelta);
					return "applied";
				} catch (error) {
					if (!(error instanceof ResponseError && error.httpStatusCode === 409)) return "error";
				}
			}
			return "conflict";
		} catch {
			return "error";
		} finally {
			applyingDeltas.delete(delta);
			activeApplyCount.value--;
		}
	}
	/**
	* Binds a credential to every node the item covers. While the agent builds,
	* the bind queues instead (latest wins per item) — this is also the
	* mid-build create path: creating a credential registers its bind here and
	* the flush lands it once the lock releases.
	*/
	async function bindCredential(item, credential) {
		const workflowId = toValue(options.workflowId);
		if (!workflowId || !item.id.startsWith(`${workflowId}:credential:`)) return "error";
		const selection = {
			selectionId: crypto.randomUUID(),
			credentialType: item.credentialType,
			credentialId: credential.__aiGatewayManaged ? AI_GATEWAY_MANAGED_TAG : credential.id ?? "",
			nodeNames: item.nodeBindings?.length ? item.nodeBindings.map(({ nodeName }) => nodeName) : void 0
		};
		if (!selection.credentialId) return "error";
		const save = (credentialSaves.get(item.id) ?? Promise.resolve()).catch(() => {}).then(async () => await persistMetadata({ [instanceAiSetupCredentialSelectionKey(item.id)]: selection }));
		credentialSaves.set(item.id, save);
		try {
			await save;
		} catch {
			return "error";
		} finally {
			if (credentialSaves.get(item.id) === save) credentialSaves.delete(item.id);
		}
		const bind = {
			item,
			credential,
			selectionId: selection.selectionId
		};
		pendingCredentialBinds.set(item.id, bind);
		if (toValue(options.workflowId) !== workflowId) return "queued";
		if (toValue(options.isAgentBuilding)) return "queued";
		return await patchWorkflowNodes(workflowId, {
			credentialBinds: [bind],
			parameterApplies: []
		});
	}
	/** Use a baseline to preserve unedited fields inside each submitted root. */
	async function applyParameterValues(nodeName, values, baseline = {}) {
		return await applyParameterBatch([{
			nodeName,
			values,
			baseline
		}]);
	}
	/** Confirm all visible node fields in one guarded workflow update. */
	async function applyParameterBatch(submissions) {
		const parameterApplies = submissions.map(({ nodeName, values, baseline }) => ({
			nodeName,
			changes: getSetupParameterChanges(baseline, {
				...baseline,
				...values
			})
		}));
		if (toValue(options.isAgentBuilding)) {
			queuedWorkflowId = toValue(options.workflowId);
			for (const { nodeName, changes } of parameterApplies) {
				const existing = pendingParameterApplies.get(nodeName) ?? [];
				pendingParameterApplies.set(nodeName, mergeSetupParameterChanges(existing, changes));
			}
			return "queued";
		}
		const workflowId = toValue(options.workflowId);
		if (!workflowId) return "error";
		return await patchWorkflowNodes(workflowId, {
			credentialBinds: [],
			parameterApplies
		});
	}
	/** Apply queued values after the agent finishes. Failed credential choices stay saved. */
	async function flushPendingApplies() {
		if (toValue(options.isAgentBuilding)) return void 0;
		if (savedCredentialBinds.value.length === 0 && pendingParameterApplies.size === 0) return void 0;
		const workflowId = toValue(options.workflowId);
		if (!workflowId || [...applyingDeltas.values()].includes(workflowId)) return void 0;
		if (workflowId !== queuedWorkflowId) pendingParameterApplies.clear();
		const delta = {
			credentialBinds: savedCredentialBinds.value,
			parameterApplies: [...pendingParameterApplies.entries()].map(([nodeName, changes]) => ({
				nodeName,
				changes
			}))
		};
		pendingParameterApplies.clear();
		return await patchWorkflowNodes(workflowId, delta);
	}
	watch([
		() => toValue(options.workflowId),
		() => toValue(options.isAgentBuilding),
		() => toValue(options.savedWorkflowChecksum)
	], ([workflowId, building]) => {
		if (!building && workflowId) flushPendingApplies().then((result) => {
			if (result) options.onFlushResult?.(result, workflowId);
		});
	}, { immediate: true });
	watch(() => toValue(options.workflowId), () => {
		pendingCredentialBinds.clear();
		pendingParameterApplies.clear();
	});
	return {
		bindCredential,
		applyParameterValues,
		applyParameterBatch,
		flushPendingApplies,
		pendingApplyCount,
		getPendingCredential,
		getPendingParameterChanges,
		isApplying
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useSetupPanelTelemetry.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function createTelemetryState() {
	return {
		owners: shallowReactive(/* @__PURE__ */ new Set()),
		shownRows: /* @__PURE__ */ new Set(),
		snapshots: /* @__PURE__ */ new Map(),
		connectionAttempts: /* @__PURE__ */ new Map(),
		visibleWorkflowId: ref()
	};
}
var states = /* @__PURE__ */ new WeakMap();
function useSetupPanelTelemetry(options) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();
	const { getTelemetryPayload } = useInstanceAiSetupPanelExperiment();
	const state = states.get(options.thread) ?? createTelemetryState();
	states.set(options.thread, state);
	const owner = Symbol();
	state.owners.add(owner);
	const isOwner = () => [...state.owners].at(-1) === owner;
	const { shownRows, snapshots, connectionAttempts } = state;
	const context = () => ({
		...getTelemetryPayload(),
		session_id: rootStore.pushRef,
		workflow_id: toValue(options.workflowId),
		thread_id: options.thread.id
	});
	function getItems(setupItems, readNode = options.getNodeByName) {
		return setupItems.flatMap((item) => {
			if (item.kind === "credential") return (item.nodeBindings ?? []).flatMap((binding) => {
				const node = readNode(binding.nodeName);
				return node ? [{
					node_id: node.id,
					node_type: node.type,
					kind: "credential",
					credential_type: item.credentialType,
					completed: options.isItemDone({
						...item,
						nodeBindings: [binding]
					}, readNode)
				}] : [];
			});
			const node = readNode(item.nodeName);
			return node ? item.parameterNames.map((name) => ({
				node_id: node.id,
				node_type: node.type,
				kind: "parameter",
				parameter_name: name,
				completed: options.isItemDone({
					...item,
					parameterNames: [name]
				}, readNode)
			})) : [];
		});
	}
	function trackSaved(workflow) {
		if (!state.owners.has(owner) || workflow.id !== toValue(options.workflowId)) return;
		const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
		const announced = Object.hasOwn(options.thread.setupItemsByWorkflowId, workflow.id) ? options.thread.setupItemsByWorkflowId[workflow.id] : [];
		const savedRequirements = [...new Map([...announced.map((item) => [item.id, item]), ...toValue(options.rows).map(({ item }) => [item.id, item])]).values()].map((item) => item.kind === "credential" ? resolveSetupCredentialItem(item, workflow.nodes, nodeTypesStore) : item);
		const readNode = (name) => nodes.get(name);
		const items = getItems(savedRequirements, readNode);
		if (items.length === 0) return;
		telemetry.track(TELEMETRY_EVENT.WORKFLOW.SETUP_SAVED, {
			...context(),
			instance_id: rootStore.instanceId,
			source: "instance_ai_setup_panel",
			items,
			setup_complete: !toValue(options.isAgentBuilding) && items.every((item) => item.completed)
		});
	}
	function getChatTelemetryContext() {
		const groups = toValue(options.groups);
		if (!isOwner() || !toValue(options.ready) || groups.length === 0) return void 0;
		return {
			...context(),
			pending_credential_count: groups.filter((group) => group.credential && !group.credential.isDone).length,
			pending_parameter_count: groups.reduce((count, group) => count + group.parameters.reduce((total, row) => total + (row.isDone ? 0 : row.item.parameterNames.length), 0), 0)
		};
	}
	function trackDismissed(reason) {
		if (!state.visibleWorkflowId.value) return;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_DISMISSED, {
			...context(),
			workflow_id: state.visibleWorkflowId.value,
			reason
		});
		state.visibleWorkflowId.value = void 0;
	}
	watch(() => [
		toValue(options.workflowId),
		toValue(options.rows),
		toValue(options.groups),
		toValue(options.ready),
		[...toValue(options.shownItemIds)],
		isOwner()
	], ([workflowId, rows, groups, ready, shownItemIds, ownsTracking]) => {
		if (!ownsTracking) return;
		if (state.visibleWorkflowId.value && state.visibleWorkflowId.value !== workflowId) trackDismissed("navigation");
		if (!ready) return;
		const key = JSON.stringify(rows.map((row) => ({
			id: row.item.id,
			done: row.isDone,
			shown: shownItemIds.includes(row.item.id),
			parameters: row.item.kind === "parameters" ? [...row.item.parameterNames].sort() : void 0
		})).sort((a, b) => a.id.localeCompare(b.id)));
		if (snapshots.get(workflowId) !== key) {
			snapshots.set(workflowId, key);
			const credentials = rows.filter((row) => row.item.kind === "credential");
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_STATE_OBSERVED, {
				...context(),
				credential_count: credentials.length,
				pending_credential_count: credentials.filter((row) => !row.isDone).length,
				pending_parameter_count: rows.reduce((count, row) => count + (row.item.kind === "parameters" && !row.isDone ? row.item.parameterNames.length : 0), 0),
				already_connected_count: credentials.filter((row) => row.isDone && !shownItemIds.includes(row.item.id)).length
			});
		}
		if (groups.length) state.visibleWorkflowId.value = workflowId;
		else trackDismissed("items_removed");
		for (const group of groups) {
			const rowKey = `${workflowId}:${group.id}`;
			if (shownRows.has(rowKey)) continue;
			shownRows.add(rowKey);
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.SETUP_PANEL_ITEM_SHOWN, {
				...context(),
				kind: group.credential ? "credential" : group.node ? "parameters" : "details",
				credential_type: group.credential?.item.credentialType,
				parameter_count: group.parameters.reduce((count, row) => count + row.item.parameterNames.length, 0),
				items: getItems([...group.credential ? [group.credential.item] : [], ...group.parameters.map(({ item }) => item)]).map(({ completed, ...item }) => item)
			});
		}
	}, { immediate: true });
	function trackConnectionStarted(item, method) {
		if (!isOwner()) return;
		connectionAttempts.set(item.id, {
			method,
			workflowId: toValue(options.workflowId)
		});
		telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_STARTED_CREDENTIAL_CONNECTION, {
			...context(),
			source: "instance_ai_setup_panel",
			credential_type: item.credentialType,
			method
		});
	}
	function trackConnectionCompleted(item, credentialId, result) {
		const attempt = connectionAttempts.get(item.id);
		if (!attempt || result !== "applied" && result !== "noop" && result !== "queued") return;
		connectionAttempts.delete(item.id);
		telemetry.track(TELEMETRY_EVENT.CREDENTIALS.USER_COMPLETED_CREDENTIAL_CONNECTION, {
			...context(),
			workflow_id: attempt.workflowId,
			source: "instance_ai_setup_panel",
			credential_type: item.credentialType,
			credential_id: credentialId,
			method: attempt.method,
			binding_state: result
		});
	}
	onScopeDispose(() => {
		state.owners.delete(owner);
		if (state.owners.size === 0) {
			trackDismissed("navigation");
			states.delete(options.thread);
		}
	});
	return {
		trackConnectionStarted,
		trackConnectionCompleted,
		trackDismissed,
		trackSaved,
		getChatTelemetryContext
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useSetupPanelDocument.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/** Give existing credential and parameter controls a disposable local document. */
function useSetupPanelDocument(options) {
	const documentId = computed(() => createWorkflowDocumentId(toValue(options.workflowId) ?? "instance-ai-setup-panel", toValue(options.itemId)));
	const document = computed(() => useWorkflowDocumentStore(documentId.value));
	watch([documentId, () => toValue(options.node)], ([_id, node]) => document.value.setNodes(node ? [deepCopy(node)] : []), {
		immediate: true,
		deep: true
	});
	function dispose(id) {
		disposeNDVStore(useNDVStore(id));
		disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(id));
		disposeWorkflowDocumentStore(useWorkflowDocumentStore(id));
	}
	watch(documentId, (_id, previous) => dispose(previous));
	onScopeDispose(() => dispose(documentId.value));
	const expressionContext = computed(() => {
		const node = toValue(options.node);
		return node ? {
			localResolve: true,
			nodeName: node.name,
			additionalKeys: {}
		} : void 0;
	});
	provide(ExpressionLocalResolveContextSymbol, expressionContext);
	provide(WorkflowDocumentStoreKey, document);
}
//#endregion
//#region src/features/ai/instanceAi/components/setupPanel/InstanceAiSetupPanelDetail.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var InstanceAiSetupPanelDetail_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiSetupPanelDetail",
	props: {
		item: {},
		node: {},
		workflowId: {},
		projectId: {},
		pendingChanges: {}
	},
	emits: ["update:hasChanges"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const nodeTypesStore = useNodeTypesStore();
		provide(CompactParameterHintsKey, true);
		const parametersItem = computed(() => props.item);
		const parameterChanges = ref([...props.pendingChanges ?? []]);
		const touchedParameters = ref(/* @__PURE__ */ new Set());
		onScopeDispose(() => emit("update:hasChanges", false));
		const displayParameters = computed(() => applySetupParameterChanges(props.node.parameters, mergeSetupParameterChanges(props.pendingChanges ?? [], parameterChanges.value)));
		const hasChanges = computed(() => !(0, import_isEqual.default)(applySetupParameterChanges(props.node.parameters, props.pendingChanges ?? []), displayParameters.value));
		watch(hasChanges, (value) => emit("update:hasChanges", value));
		const parameterRoots = computed(() => /* @__PURE__ */ new Set([...(parametersItem.value?.parameterNames ?? []).map((name) => name.split(/[.[\]]/)[0] ?? name), ...parameterChanges.value.map((change) => change.path[0])]));
		watch(() => props.node.parameters, (saved) => {
			parameterChanges.value = parameterChanges.value.filter((change) => !(0, import_isEqual.default)(getSetupParameterValue(saved, change.path), change.value));
		}, { deep: true });
		function onParameterValueChanged(update) {
			if (!parametersItem.value) return;
			const parameterName = update.name.replace(/^parameters\./, "");
			if (!parameterRoots.value.has(parameterName.split(/[.[\]]/)[0])) return;
			const next = deepCopy(displayParameters.value);
			setParameterValue(next, parameterName, update.value);
			parameterChanges.value = mergeSetupParameterChanges(parameterChanges.value, getSetupParameterChanges(displayParameters.value, next));
		}
		function getSubmission() {
			for (const parameter of parameterDefinitions.value) touchedParameters.value.add(parameter.name);
			const item = parametersItem.value;
			if (!item || !hasChanges.value) return;
			const values = {};
			for (const change of parameterChanges.value) {
				const root = change.path[0];
				if (typeof root === "string") values[root] = displayParameters.value[root];
			}
			return {
				nodeName: item.nodeName,
				values,
				baseline: applySetupParameterChanges(props.node.parameters, props.pendingChanges ?? [])
			};
		}
		__expose({ getSubmission });
		const nodeType = computed(() => nodeTypesStore.getNodeType(props.node.type, props.node.typeVersion));
		const parameterDefinitions = computed(() => {
			if (!parametersItem.value || !nodeType.value) return [];
			return nodeType.value.properties.filter((property) => parameterRoots.value.has(property.name));
		});
		const hiddenIssuesInputs = computed(() => parameterDefinitions.value.filter((parameter) => !touchedParameters.value.has(parameter.name)).map((parameter) => parameter.name));
		const assignmentCollectionEditableValueIndices = computed(() => {
			const result = {};
			for (const parameter of nodeType.value?.properties ?? []) {
				if (parameter.type !== "assignmentCollection") continue;
				const indices = /* @__PURE__ */ new Set();
				for (const detail of findPlaceholderDetails(props.node.parameters[parameter.name])) {
					if (detail.path[0] !== "assignments" || detail.path[2] !== "value") continue;
					const match = /^\[(\d+)\]$/.exec(detail.path[1] ?? "");
					if (match?.[1]) indices.add(Number.parseInt(match[1], 10));
				}
				const value = displayParameters.value[parameter.name];
				if (value && typeof value === "object" && "assignments" in value && Array.isArray(value.assignments)) for (const change of parameterChanges.value) {
					if (change.path[0] !== parameter.name || change.path[1] !== "assignments") continue;
					const target = change.path[2];
					const index = typeof target === "object" ? value.assignments.findIndex((assignment) => assignment !== null && typeof assignment === "object" && "id" in assignment && assignment.id === target.id) : Number(target);
					if (Number.isInteger(index) && index >= 0) indices.add(index);
				}
				result[parameter.name] = [...indices];
			}
			return result;
		});
		const displayNode = computed(() => ({
			...props.node,
			parameters: nodeType.value ? getNodeParameters(nodeType.value.properties, displayParameters.value, true, true, props.node, nodeType.value) ?? displayParameters.value : displayParameters.value
		}));
		useSetupPanelDocument({
			workflowId: () => props.workflowId,
			itemId: () => props.item.id,
			node: displayNode
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.body),
				"data-test-id": "instance-ai-setup-panel-detail"
			}, [parametersItem.value ? (openBlock(), createBlock(ParameterInputList_default, {
				key: 0,
				parameters: parameterDefinitions.value,
				"node-values": { parameters: displayNode.value.parameters },
				node: displayNode.value,
				path: "parameters",
				"hide-delete": true,
				"remove-first-parameter-margin": true,
				"remove-last-parameter-margin": true,
				"options-overrides": {
					hideExpressionSelector: true,
					hideFocusPanelButton: true
				},
				"hidden-issues-inputs": hiddenIssuesInputs.value,
				"assignment-collection-editable-value-indices": assignmentCollectionEditableValueIndices.value,
				onValueChanged: onParameterValueChanged,
				onParameterBlur: _cache[0] || (_cache[0] = ($event) => touchedParameters.value.add($event))
			}, null, 8, [
				"parameters",
				"node-values",
				"node",
				"hidden-issues-inputs",
				"assignment-collection-editable-value-indices"
			])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": { body: "_body_1790x_1" } }]]);
//#endregion
//#region src/features/credentials/credentialSetupFields.ts
var OAUTH_ADVANCED_FIELDS = [
	"sendAdditionalBodyProperties",
	"additionalBodyProperties",
	"authQueryParameters",
	"tokenExpiredStatusCode",
	"jweEnabled",
	"inlineJwks"
];
var CERTIFICATE_OVERRIDE_TYPES = /* @__PURE__ */ new Set([
	"dfirIrisApi",
	"elasticsearchApi",
	"erpNextApi",
	"gotifyApi",
	"imap",
	"kafka",
	"ldap",
	"mattermostApi",
	"microsoftSql",
	"mispApi",
	"oAuth2Api",
	"postgres",
	"redis",
	"s3",
	"splunkApi",
	"theHiveApi",
	"theHiveProjectApi",
	"timescaleDb",
	"wordpressApi",
	"zammadBasicAuthApi",
	"zammadTokenAuthApi"
]);
var CERTIFICATE_OVERRIDE_FIELDS = /* @__PURE__ */ new Set([
	"allowUnauthorizedCerts",
	"ignoreSSLIssues",
	"skipSslCertificateValidation",
	"disableTlsVerification"
]);
var ADVANCED_FIELDS_BY_TYPE = {
	anthropicApi: ["url", "header"],
	aws: ["customEndpoints"],
	awsAssumeRole: ["customEndpoints", "roleSessionName"],
	azureEntraCognitiveServicesOAuth2Api: ["apiVersion", "endpoint"],
	azureOpenAiApi: ["apiVersion", "endpoint"],
	boxOAuth2Api: ["signingKeySecondary"],
	chromaCloudApi: [
		"tenant",
		"database",
		"baseUrl"
	],
	githubApi: ["server"],
	githubAppApi: ["server"],
	githubOAuth2Api: ["server"],
	googlePalmApi: ["host"],
	ldap: ["timeout"],
	mcpOAuth2Api: ["resourceUrl"],
	microsoftSql: [
		"connectTimeout",
		"requestTimeout",
		"tdsVersion"
	],
	mqtt: ["clean", "clientId"],
	mySql: ["connectTimeout"],
	openAiApi: [
		"url",
		"organizationId",
		"header"
	],
	oracleDBApi: [
		"privilege",
		"sslServerDNMatch",
		"sslAllowWeakDNMatch",
		"poolMin",
		"poolMax",
		"poolIncrement",
		"maxLifetimeSession",
		"poolTimeout",
		"connectionClass",
		"connectTimeout",
		"transportConnectTimeout",
		"expireTime"
	],
	postgres: ["maxConnections"],
	qualysApi: ["requestedWith"],
	smtp: ["disableStartTls", "hostName"],
	snowflake: ["clientSessionKeepAlive"],
	snowflakeOAuth2Api: ["clientSessionKeepAlive"],
	telegramApi: ["baseUrl"],
	totpApi: ["label"],
	vercelAiGatewayApi: ["url"],
	wooCommerceApi: ["includeCredentialsInQuery"]
};
function groupCredentialSetupFields(credentialType, parentTypes, fields) {
	const types = [credentialType, ...parentTypes];
	const advancedNames = /* @__PURE__ */ new Set([...DOMAIN_RESTRICTION_FIELDS.map(({ name }) => name), ...types.flatMap((type) => ADVANCED_FIELDS_BY_TYPE[type] ?? [])]);
	if (types.includes("oAuth2Api")) {
		for (const name of OAUTH_ADVANCED_FIELDS) advancedNames.add(name);
		if (!types.includes("snowflakeOAuth2Api")) advancedNames.add("customScopes");
	}
	if (types.some((type) => CERTIFICATE_OVERRIDE_TYPES.has(type))) {
		for (const field of fields) if (CERTIFICATE_OVERRIDE_FIELDS.has(field.name) && field.type === "boolean" && field.default === false) advancedNames.add(field.name);
	}
	const inline = [];
	const advanced = [];
	for (const field of fields) {
		const followsAdvancedControl = Object.entries(field.displayOptions?.show ?? {}).some(([name, values]) => advancedNames.has(name) && values?.includes(true));
		(advancedNames.has(field.name) || followsAdvancedControl ? advanced : inline).push(field);
	}
	return {
		inline,
		advanced
	};
}
//#endregion
//#region src/features/ai/instanceAi/components/setupPanel/InstanceAiSetupCredential.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$3 = ["tabindex"];
var InstanceAiSetupCredential_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiSetupCredential",
	props: {
		item: {},
		node: {},
		pendingCredential: {},
		nodes: {},
		workflowId: {},
		projectId: {},
		helpDisabled: { type: Boolean },
		allowPerNode: { type: Boolean }
	},
	emits: [
		"bindCredential",
		"connectStarted",
		"askForHelp",
		"setCredentialsPerNode",
		"update:busy",
		"update:hasChanges"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const uiStore = useUIStore();
		const toast = useToast();
		const telemetry = useTelemetry();
		const externalHooks = useExternalHooks();
		const credentialsStore = useCredentialsStore();
		const { check: envFeatureFlag } = useEnvFeatureFlag();
		const oauth = useCredentialOAuth();
		const quickConnect = useQuickConnect();
		const gateway = useAiGateway();
		const { openTopUp } = useAiGatewayTopUp();
		const initialized = ref(false);
		const initializationFailed = ref(false);
		const busy = ref(false);
		const reopenAuthorization = ref();
		const createNew = ref(Boolean(props.item.preferNew && !props.pendingCredential && !props.node?.credentials?.[props.item.credentialType]));
		const hasDraft = ref(false);
		watch(busy, (value) => emit("update:busy", value));
		watch(() => hasDraft.value || createNew.value, (value) => emit("update:hasChanges", value));
		const chooseExisting = ref(false);
		const oauthConnection = ref();
		const oauthMode = ref("unknown");
		const loadingOAuth = ref(false);
		const mode = ref("credits");
		const modeChanged = ref(false);
		let active = true;
		useSetupPanelDocument({
			workflowId: () => props.workflowId,
			itemId: () => props.item.id,
			node: () => props.node
		});
		const form = useCredentialForm({
			mode: "new",
			activeId: () => props.item.credentialType,
			contextNode: () => props.node ?? null,
			projectId: () => props.projectId,
			setupHint: () => props.item.setupHint
		});
		form.setCredentialPropertyDefaults();
		const isOAuth = form.isOAuthType;
		const isTemplated = computed(() => props.item.credentialType === TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE);
		const canQuickConnect = computed(() => isOAuth.value && oauth.canOAuthCredentialQuickConnect(props.item.credentialType) || Boolean(!oauth.isOAuthCredentialType(props.item.credentialType) && props.node && quickConnect.getQuickConnectOption(props.item.credentialType, props.node.type)));
		const serviceName = computed(() => deriveServiceName(props.item.setupHint) ?? getAppNameFromNodeName(getAppNameFromCredType(props.item.appDisplayName ?? form.credentialType.value?.displayName ?? props.item.credentialType)));
		const binding = computed(() => {
			if (props.pendingCredential) return props.pendingCredential;
			const value = props.node?.credentials?.[props.item.credentialType];
			return value && typeof value !== "string" ? value : void 0;
		});
		const connected = computed(() => !createNew.value && !hasDraft.value && Boolean(binding.value?.id || binding.value?.__aiGatewayManaged) && !loadingOAuth.value && !needsAuthorization.value);
		const usableCredentials = computed(() => credentialsStore.hasUsableCredentialsForScope({
			workflowId: props.workflowId,
			forAssistant: true
		}) ? credentialsStore.getUsableCredentialByType(props.item.credentialType) : []);
		const storedCredential = computed(() => binding.value?.id ? usableCredentials.value.find(({ id }) => id === binding.value?.id) ?? credentialsStore.getCredentialById(binding.value.id) : void 0);
		const usesCustomOAuth = computed(() => oauthMode.value === "custom");
		const selectedOAuthId = computed(() => !createNew.value && !hasDraft.value && isOAuth.value ? binding.value?.id : void 0);
		watch([
			selectedOAuthId,
			() => storedCredential.value?.updatedAt,
			() => storedCredential.value?.connectedByMe,
			() => storedCredential.value?.scopes?.join(",")
		], async ([id], _previous, onCleanup) => {
			let stale = false;
			onCleanup(() => {
				stale = true;
			});
			oauthConnection.value = isOAuthCredentialConnected(storedCredential.value);
			oauthMode.value = "unknown";
			loadingOAuth.value = Boolean(id);
			if (!id) return;
			try {
				const credential = await credentialsStore.getCredentialData({ id });
				if (stale) return;
				oauthConnection.value = isOAuthCredentialConnected(storedCredential.value, credential);
				const data = credential?.data;
				if (data && typeof data === "object") {
					const isCustomClient = !data.useDynamicClientRegistration && Boolean(data.clientId && data.clientSecret || data.consumerKey && data.consumerSecret);
					oauthMode.value = isCustomClient || !form.managedOAuthAvailable.value ? "custom" : "managed";
				}
			} catch {} finally {
				if (!stale) loadingOAuth.value = false;
			}
		}, { immediate: true });
		const needsAuthorization = computed(() => Boolean(selectedOAuthId.value) && oauthConnection.value === false);
		const showExistingPicker = computed(() => chooseExisting.value || storedCredential.value?.isResolvable || !connected.value && !needsAuthorization.value && !createNew.value && !hasDraft.value && usableCredentials.value.length > 0);
		const gatewayAvailable = computed(() => gateway.isEnabled.value && gateway.isCredentialTypeSupported(props.item.credentialType) && props.nodes.length > 0 && props.nodes.every((node) => {
			const { operation, resource } = node.parameters;
			return !AI_GATEWAY_UNSUPPORTED_NODE_TYPES.includes(node.type) && gateway.isNodeTypeVersionSupported(node.type, node.typeVersion) && (typeof operation !== "string" || !operation || gateway.isActionSupported(node.type, typeof resource === "string" ? resource : void 0, operation));
		}));
		watch([
			gatewayAvailable,
			gateway.balance,
			usableCredentials
		], ([available, balance, credentials]) => {
			if (available && !modeChanged.value && !connected.value) mode.value = !props.item.preferNew && ((balance ?? 0) > 0 || credentials.length === 0) ? "credits" : "own";
		}, { immediate: true });
		const credentialFields = computed(() => groupCredentialSetupFields(props.item.credentialType, form.parentTypes.value, form.credentialProperties.value.filter((property) => !property.envFeatureFlag || envFeatureFlag.value(property.envFeatureFlag))));
		const helpFields = computed(() => credentialFields.value.inline.filter((property) => property.type !== "notice" && !property.typeOptions?.copyButton));
		const fieldTitles = computed(() => isTemplated.value ? listPlaceholderTitles(form.credentialData.value) : helpFields.value.map((property) => property.displayName));
		const useAdvancedForm = computed(() => !canQuickConnect.value && (isTemplated.value ? fieldTitles.value.length === 0 : credentialFields.value.inline.length === 0));
		const advancedIsPrimary = computed(() => isTemplated.value && useAdvancedForm.value);
		const valueLabel = computed(() => binding.value?.__aiGatewayManaged ? i18n.baseText("instanceAi.setupPanel.connectedWith") : isOAuth.value ? i18n.baseText("instanceAi.setupPanel.account") : i18n.baseText("instanceAi.setupPanel.credential"));
		const balanceLabel = computed(() => gateway.balance.value === void 0 ? "" : gateway.balance.value <= 0 ? i18n.baseText("aiGateway.wallet.noCredits") : i18n.baseText("aiGateway.wallet.balanceRemaining", { interpolate: { balance: `$${Number(gateway.balance.value).toFixed(2)}` } }));
		const value = computed(() => binding.value?.__aiGatewayManaged ? [i18n.baseText("generic.n8nCredits"), balanceLabel.value].filter(Boolean).join(" · ") : isOAuth.value ? storedCredential.value?.connectedAccountIdentifier ?? storedCredential.value?.name ?? binding.value?.name : storedCredential.value?.name ?? binding.value?.name);
		const useCredits = computed(() => gatewayAvailable.value && mode.value === "credits");
		const actionLabel = computed(() => needsAuthorization.value ? i18n.baseText("credentialEdit.oAuthButton.connectMyAccount") : useCredits.value ? i18n.baseText("instanceAi.setupPanel.useCredits") : advancedIsPrimary.value ? i18n.baseText("instanceAi.setupPanel.advancedSetup") : canQuickConnect.value || useAdvancedForm.value ? i18n.baseText("instanceAi.setupPanel.connect") : isOAuth.value ? i18n.baseText("instanceAi.setupPanel.saveAndSignIn") : i18n.baseText("generic.save"));
		const actionDisabled = computed(() => !initialized.value || loadingOAuth.value);
		const redirectUrl = computed(() => {
			const urls = rootStore.OAuthCallbackUrls;
			if (form.parentTypes.value.includes("oAuth1Api") || props.item.credentialType === "oAuth1Api") return "oauth1" in urls && typeof urls.oauth1 === "string" ? urls.oauth1 : "";
			return "oauth2" in urls && typeof urls.oauth2 === "string" ? urls.oauth2 : "";
		});
		const documentationUrl = computed(() => {
			const url = props.item.setupHint?.docsUrl ?? form.credentialType.value?.documentationUrl;
			if (!url) return "";
			return /^https?:\/\//.test(url) ? url : `${BUILTIN_CREDENTIALS_DOCS_URL}${url}/`;
		});
		const modeOptions = computed(() => [{
			value: "credits",
			label: i18n.baseText("generic.n8nCredits")
		}, {
			value: "own",
			label: i18n.baseText("instanceAi.setupPanel.useOwnKey")
		}]);
		const perNodeActions = computed(() => props.allowPerNode && connected.value ? [{
			id: "per-node",
			label: i18n.baseText("instanceAi.setupPanel.setCredentialsPerNode")
		}] : []);
		const actions = computed(() => {
			const existing = usableCredentials.value.some((credential) => !connected.value || credential.id !== binding.value?.id) ? [{
				id: "existing",
				label: i18n.baseText("instanceAi.setupPanel.useExisting")
			}] : [];
			if (!connected.value && useCredits.value) return existing;
			if (needsAuthorization.value) return [{
				id: "edit",
				label: i18n.baseText("instanceAi.setupPanel.editCredential")
			}, ...existing];
			if (connected.value && binding.value?.__aiGatewayManaged) return [
				{
					id: "replace",
					label: i18n.baseText("instanceAi.setupPanel.useOwnKey")
				},
				{
					id: "manage",
					label: i18n.baseText("instanceAi.setupPanel.manageCredits")
				},
				...perNodeActions.value
			];
			return [
				...connected.value ? [{
					id: "replace",
					label: i18n.baseText(isOAuth.value ? usesCustomOAuth.value ? "instanceAi.setupPanel.connectWithOAuth" : "instanceAi.setupPanel.switchAccount" : "instanceAi.setupPanel.replaceKey")
				}, {
					id: "edit",
					label: i18n.baseText("instanceAi.setupPanel.editCredential")
				}] : advancedIsPrimary.value ? [] : [{
					id: "advanced",
					label: i18n.baseText("instanceAi.setupPanel.advancedSetup")
				}],
				...existing,
				...perNodeActions.value
			];
		});
		const helpLabel = computed(() => {
			const fieldName = helpFields.value.length === 1 ? helpFields.value[0].name : void 0;
			return i18n.baseText(fieldName === "apiKey" ? "instanceAi.setupPanel.helpFindApiKey" : fieldName === "accessToken" ? "instanceAi.setupPanel.helpFindAccessToken" : "instanceAi.setupPanel.helpSetUp");
		});
		function askForHelp() {
			if (props.helpDisabled || busy.value) return;
			const selectedMode = selectedOAuthId.value ? oauthMode.value : form.isManagedOAuthMode.value ? "managed" : "custom";
			const selectedConnection = selectedOAuthId.value ? oauthConnection.value : false;
			emit("askForHelp", {
				id: binding.value?.id ?? void 0,
				credentialType: props.item.credentialType,
				displayName: serviceName.value,
				nodeName: props.node?.name,
				nodeType: props.node?.type,
				placeholderTitles: isOAuth.value ? void 0 : fieldTitles.value,
				documentationUrl: documentationUrl.value || void 0,
				oauthRedirectUrl: isOAuth.value ? redirectUrl.value : void 0,
				setupContext: isOAuth.value ? [
					i18n.baseText("instanceAi.setupPanel.helpOAuthState", { interpolate: {
						mode: selectedMode,
						state: selectedConnection === void 0 ? "unknown" : selectedConnection ? "connected" : "disconnected"
					} }),
					!needsAuthorization.value && fieldTitles.value.length ? i18n.baseText("instanceAi.setupPanel.helpVisibleFields", { interpolate: { fields: fieldTitles.value.join(", ") } }) : "",
					i18n.baseText(canQuickConnect.value ? "instanceAi.setupPanel.helpManagedOAuthAvailable" : "instanceAi.setupPanel.helpManagedOAuthUnavailable")
				].filter(Boolean).join(" ") : void 0
			});
		}
		function emitBinding(id, submittedData) {
			if (!active) return;
			createNew.value = false;
			hasDraft.value = submittedData !== void 0 && !(0, import_isEqual.default)(formData(), submittedData);
			chooseExisting.value = false;
			emit("bindCredential", props.item, id);
		}
		function onCredentialSelected(update) {
			const credential = update.properties.credentials?.[props.item.credentialType];
			if (!credential || typeof credential === "string") return;
			emit("connectStarted", "existing");
			if (credential.__aiGatewayManaged) emitBinding(AI_GATEWAY_MANAGED_TAG);
			else if (credential.id) emitBinding(credential.id);
		}
		function formData() {
			const data = { ...form.credentialData.value };
			delete data.homeProject;
			delete data.sharedWithProjects;
			return data;
		}
		function onDataChange(update) {
			if (!form.onDataChange(update)) return;
			hasDraft.value = true;
			if (reopenAuthorization.value) {
				reopenAuthorization.value = void 0;
				oauth.cancelAuthorize();
			}
		}
		async function saveKey() {
			const workflowId = props.workflowId;
			const details = {
				id: "",
				name: form.credentialName.value,
				type: props.item.credentialType,
				data: deepCopy(formData())
			};
			const credential = await credentialsStore.createNewCredential(details, props.projectId, void 0, { skipStoreUpdate: true });
			await externalHooks.run("credential.saved", {
				credential_type: credential.type,
				credential_id: credential.id,
				is_new: true
			});
			telemetry.track("User created credentials", {
				credential_type: credential.type,
				credential_id: credential.id,
				workflow_id: props.workflowId
			});
			if (form.isCredentialTestable.value) {
				await form.testCredential({
					...details,
					id: credential.id
				});
				if (!form.testedSuccessfully.value) {
					await credentialsStore.deleteCredential({ id: credential.id });
					return;
				}
			}
			credentialsStore.upsertCredential(credential);
			if (!active || props.workflowId !== workflowId) return;
			await credentialsStore.fetchUsableCredentials({
				workflowId,
				forAssistant: true
			}).catch(() => {});
			emitBinding(credential.id, details.data);
		}
		async function connect() {
			if (reopenAuthorization.value) {
				reopenAuthorization.value();
				return;
			}
			if (busy.value || actionDisabled.value) return;
			if (!needsAuthorization.value && !useCredits.value && !canQuickConnect.value && !useAdvancedForm.value) {
				form.showValidationWarning.value = true;
				if (!form.requiredPropertiesFilled.value) return;
			}
			busy.value = true;
			form.authError.value = "";
			try {
				if (needsAuthorization.value && storedCredential.value) {
					emit("connectStarted", "oauth");
					const credential = await oauth.authorizeExistingCredential(storedCredential.value, {
						workflowId: props.workflowId,
						onAuthorizationStarted: (reopen) => {
							reopenAuthorization.value = reopen;
						}
					});
					if (credential) {
						oauthConnection.value = true;
						emitBinding(credential.id);
					}
				} else if (useCredits.value) {
					emit("connectStarted", "gateway");
					emitBinding(AI_GATEWAY_MANAGED_TAG);
				} else if (useAdvancedForm.value) onMenuAction("advanced");
				else if (isOAuth.value) {
					emit("connectStarted", "oauth");
					const submittedData = canQuickConnect.value ? void 0 : deepCopy(formData());
					const credential = await oauth.createAndAuthorize(props.item.credentialType, props.node?.type, {
						projectId: props.projectId,
						workflowId: props.workflowId,
						data: submittedData,
						name: form.credentialName.value || void 0,
						onAuthorizationStarted: (reopen) => {
							reopenAuthorization.value = reopen;
						}
					});
					if (credential) emitBinding(credential.id, submittedData);
				} else if (canQuickConnect.value && props.node) {
					emit("connectStarted", "api_key");
					const credential = await quickConnect.connect({
						credentialTypeName: props.item.credentialType,
						nodeType: props.node.type,
						serviceName: serviceName.value,
						source: "credential_type",
						projectId: props.projectId,
						workflowId: props.workflowId
					});
					if (credential) emitBinding(credential.id);
				} else {
					emit("connectStarted", "api_key");
					await saveKey();
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("instanceAi.setupPanel.connectionError"));
			} finally {
				reopenAuthorization.value = void 0;
				busy.value = false;
			}
		}
		function onMenuAction(id) {
			if (id === "per-node") {
				emit("setCredentialsPerNode");
				return;
			}
			if (id === "existing") {
				chooseExisting.value = true;
				return;
			}
			if (id === "manage") {
				openTopUp({
					source: "credential_selector",
					credentialType: props.item.credentialType
				});
				return;
			}
			if (id === "edit" && binding.value?.id) {
				uiStore.openExistingCredential(binding.value.id, { workflowId: props.workflowId });
				return;
			}
			if (id === "replace") {
				mode.value = "own";
				modeChanged.value = true;
				if (isOAuth.value && canQuickConnect.value) connect();
				else {
					createNew.value = true;
					if (!hasDraft.value) {
						initialized.value = false;
						initialize();
					}
				}
				return;
			}
			emit("connectStarted", "advanced");
			uiStore.openNewCredential(props.item.credentialType, false, true, props.projectId, void 0, props.node?.name, props.node, {
				closeOnSave: true,
				credentialSetupHint: props.item.setupHint,
				workflowId: props.workflowId,
				onCredentialCreated: (credential) => emitBinding(credential.id)
			});
		}
		async function initialize() {
			initializationFailed.value = false;
			try {
				uiStore.activeCredentialType = props.item.credentialType;
				const initialization = form.initialize();
				const type = props.item.credentialType;
				const locale = rootStore.defaultLocale;
				if (locale !== "en" && !i18n.exists(`n8n-nodes-base.credentials.${type}`)) {
					const translation = await credentialsStore.getCredentialTranslation(type).catch(() => void 0);
					if (translation) addCredentialTranslation({ [type]: translation }, locale);
				}
				await initialization;
				initialized.value = true;
			} catch (error) {
				initializationFailed.value = true;
				if (active) toast.showError(error, i18n.baseText("instanceAi.setupPanel.connectionError"));
			}
		}
		if (binding.value?.id || binding.value?.__aiGatewayManaged) initialized.value = true;
		else initialize();
		watch(() => props.item.setupHint, (hint) => {
			if (hint && !connected.value) initialize();
		});
		onMounted(() => {
			Promise.all([gateway.fetchConfig(), gateway.fetchWallet()]).catch(() => {});
		});
		onScopeDispose(() => {
			active = false;
			emit("update:busy", false);
			emit("update:hasChanges", false);
			oauth.cancelAuthorize();
			quickConnect.cancelConnect();
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.form) }, [
				showExistingPicker.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [__props.node ? (openBlock(), createBlock(NodeCredentials_default, {
					key: 0,
					class: normalizeClass(_ctx.$style.existing),
					node: __props.node,
					"override-cred-type": __props.item.credentialType,
					"project-id": __props.projectId,
					"workflow-id": __props.workflowId,
					"credential-setup-hint": __props.item.setupHint,
					"credentials-field-label": unref(i18n).baseText("instanceAi.setupPanel.credential"),
					credentials: usableCredentials.value,
					standalone: "",
					"for-assistant": "",
					"hide-issues": "",
					"skip-auto-select": "",
					onCredentialSelected,
					onConnectionStarted: _cache[0] || (_cache[0] = ($event) => emit("connectStarted", "oauth")),
					onConnectionCompleted: _cache[1] || (_cache[1] = ($event) => emitBinding($event))
				}, createSlots({ _: 2 }, [perNodeActions.value.length ? {
					name: "label-postfix",
					fn: withCtx(() => [createVNode(unref(DropdownMenu_default), {
						items: perNodeActions.value,
						modal: false,
						placement: "bottom-end",
						onSelect: onMenuAction
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							size: "xsmall",
							"icon-only": "",
							disabled: busy.value,
							"aria-label": unref(i18n).baseText("node.moreActions")
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "pencil",
								size: "small"
							})]),
							_: 1
						}, 8, ["disabled", "aria-label"])]),
						_: 1
					}, 8, ["items"])]),
					key: "0"
				} : void 0]), 1032, [
					"class",
					"node",
					"override-cred-type",
					"project-id",
					"workflow-id",
					"credential-setup-hint",
					"credentials-field-label",
					"credentials"
				])) : (openBlock(), createBlock(CredentialsDropdown_default, {
					key: 1,
					teleported: "",
					"credential-options": usableCredentials.value.map(({ id, name, homeProject }) => ({
						id,
						name,
						homeProject,
						typeDisplayName: unref(form).credentialType.value?.displayName
					})),
					"selected-credential-id": null,
					permissions: unref(form).credentialPermissions.value,
					onCredentialSelected: _cache[2] || (_cache[2] = ($event) => {
						emit("connectStarted", "existing");
						emitBinding($event);
					}),
					onNewCredential: _cache[3] || (_cache[3] = ($event) => onMenuAction("advanced"))
				}, null, 8, ["credential-options", "permissions"])), chooseExisting.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 2,
					variant: "ghost",
					size: "small",
					onClick: _cache[4] || (_cache[4] = ($event) => chooseExisting.value = false)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 64)) : (openBlock(), createBlock(unref(SetupConnection_default), {
					key: 1,
					connected: connected.value && !reopenAuthorization.value,
					"value-label": valueLabel.value,
					value: value.value,
					"action-label": actionLabel.value,
					actions: reopenAuthorization.value ? [] : actions.value,
					"action-disabled": actionDisabled.value,
					loading: loadingOAuth.value || busy.value && !reopenAuthorization.value,
					onAction: connect,
					onSelect: onMenuAction
				}, {
					"action-leading": withCtx(() => [useCredits.value && balanceLabel.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						step: "xs"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(balanceLabel.value), 1)]),
						_: 1
					})) : !useCredits.value ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 1,
						"as-child": "",
						disabled: !__props.helpDisabled,
						content: unref(i18n).baseText("instanceAi.setupPanel.helpUnavailableWhileBuilding")
					}, {
						default: withCtx(() => [createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.helpTrigger),
							tabindex: __props.helpDisabled ? 0 : void 0
						}, [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							size: "small",
							class: normalizeClass(_ctx.$style.help),
							disabled: __props.helpDisabled || busy.value,
							onClick: askForHelp
						}, {
							default: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "sparkles",
								size: "small"
							}), createTextVNode(" " + toDisplayString(helpLabel.value), 1)]),
							_: 1
						}, 8, ["class", "disabled"])], 10, _hoisted_1$3)]),
						_: 1
					}, 8, ["disabled", "content"])) : createCommentVNode("", true)]),
					default: withCtx(() => [
						gatewayAvailable.value ? (openBlock(), createBlock(unref(N8nSegmentControl_default), {
							key: 0,
							"model-value": mode.value,
							options: modeOptions.value,
							"onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => {
								mode.value = $event;
								modeChanged.value = true;
							})
						}, null, 8, ["model-value", "options"])) : createCommentVNode("", true),
						useCredits.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							class: normalizeClass(_ctx.$style.hint)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.setupPanel.creditsDescription")), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						needsAuthorization.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 2,
							size: "small"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(value.value), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						!loadingOAuth.value && !needsAuthorization.value && !useCredits.value && !canQuickConnect.value && !useAdvancedForm.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [unref(isOAuth) && redirectUrl.value ? (openBlock(), createElementBlock("label", {
							key: 0,
							class: normalizeClass(_ctx.$style.redirect)
						}, [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.setupPanel.redirectUrl")) + " ", 1), createVNode(unref(CopyInput_default), {
							class: normalizeClass(_ctx.$style.redirectInput),
							value: redirectUrl.value,
							label: unref(i18n).baseText("instanceAi.setupPanel.redirectUrl"),
							"copy-label": unref(i18n).baseText("instanceAi.setupPanel.copyRedirectUrl"),
							size: "small"
						}, null, 8, [
							"class",
							"value",
							"label",
							"copy-label"
						])], 2)) : createCommentVNode("", true), isTemplated.value ? (openBlock(), createBlock(TemplatedAuthSimpleView_default, {
							key: 1,
							compact: "",
							"credential-data": unref(form).credentialData.value,
							"show-validation-warnings": unref(form).showValidationWarning.value,
							onUpdate: onDataChange
						}, null, 8, ["credential-data", "show-validation-warnings"])) : (openBlock(), createBlock(CredentialInputs_default, {
							key: 2,
							compact: "",
							"credential-type": __props.item.credentialType,
							"credential-properties": credentialFields.value.inline,
							"credential-data": unref(form).credentialData.value,
							"documentation-url": documentationUrl.value,
							"show-validation-warnings": unref(form).showValidationWarning.value,
							onUpdate: onDataChange
						}, null, 8, [
							"credential-type",
							"credential-properties",
							"credential-data",
							"documentation-url",
							"show-validation-warnings"
						]))], 64)) : createCommentVNode("", true)
					]),
					_: 1
				}, 8, [
					"connected",
					"value-label",
					"value",
					"action-label",
					"actions",
					"action-disabled",
					"loading"
				])),
				unref(form).authError.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
					key: 2,
					theme: "danger"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(form).authError.value), 1)]),
					_: 1
				})) : createCommentVNode("", true),
				initializationFailed.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 3,
					variant: "ghost",
					size: "small",
					onClick: initialize
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				})) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	form: "_form_171gv_1",
	redirect: "_redirect_171gv_7",
	hint: "_hint_171gv_15",
	helpTrigger: "_helpTrigger_171gv_19",
	help: "_help_171gv_19",
	existing: "_existing_171gv_29",
	redirectInput: "_redirectInput_171gv_33"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/setupPanel/InstanceAiSetupPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiSetupPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiSetupPanel",
	props: {
		workflowId: {},
		projectId: {}
	},
	emits: ["update:overlapHeight"],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		provide(ResourceLocatorDropdownTeleportedKey, true);
		const i18n = useI18n();
		const toast = useToast();
		const thread = useThread();
		const credentialsStore = useCredentialsStore();
		const nodeTypesStore = useNodeTypesStore();
		const projectsStore = useProjectsStore();
		const usersStore = useUsersStore();
		const rootStore = useRootStore();
		const oauth = useCredentialOAuth();
		const connectingItemId = ref();
		const reopenAuthorization = ref();
		let active = true;
		onScopeDispose(() => {
			active = false;
			oauth.cancelAuthorize();
		});
		const { testCredentialInBackground } = useCredentialTestInBackground();
		const { rows, rowSource, credentialsAvailable, workflowNodes, savedWorkflowChecksum, isRefreshingWorkflow, isCheckingOAuthCredentials, isAgentBuilding, isAwaitingFirstBuild, getNodeByName: getSavedNodeByName, refreshWorkflow, workflowProjectId, isItemDone, isCredentialConfigured } = useSetupPanelState({
			thread,
			workflowId: () => props.workflowId
		});
		const fetchedProject = ref();
		const credentialProjectId = computed(() => workflowProjectId.value ?? props.projectId ?? (fetchedProject.value?.workflowId === props.workflowId ? fetchedProject.value.projectId : void 0));
		watch(() => workflowProjectId.value || props.projectId ? void 0 : props.workflowId, async (id) => {
			if (!id || fetchedProject.value?.workflowId === id) return;
			try {
				const workflow = await getWorkflow(rootStore.restApiContext, id);
				if (props.workflowId === id) fetchedProject.value = {
					workflowId: id,
					projectId: deriveHomeProject(workflow)?.id
				};
			} catch {}
		}, { immediate: true });
		const isCredentialProjectReady = computed(() => projectsStore.myProjects.some((project) => project.id === credentialProjectId.value));
		watch(credentialProjectId, async (id) => {
			if (id && !isCredentialProjectReady.value) await projectsStore.getMyProjects().catch(() => {});
		}, { immediate: true });
		const actions = useSetupPanelActions({
			threadId: thread.id,
			workflowId: () => props.workflowId,
			workflowNodes,
			isAgentBuilding,
			savedWorkflowChecksum,
			onFlushResult: notifyApplyResult,
			onSaved: (workflow) => panelTelemetry.trackSaved(workflow)
		});
		function getNodeByName(name, includePendingParameters = true) {
			const node = getSavedNodeByName(name);
			if (!node) return void 0;
			let credentials = node.credentials;
			for (const { item } of rows.value) {
				if (item.kind !== "credential" || !item.nodeBindings?.some((binding) => binding.nodeName === name)) continue;
				const pending = actions.getPendingCredential(item.id, name);
				if (pending) credentials = {
					...credentials,
					[item.credentialType]: pending
				};
			}
			const changes = includePendingParameters ? actions.getPendingParameterChanges(name) : [];
			if (credentials === node.credentials && changes.length === 0) return node;
			return {
				...node,
				credentials,
				parameters: changes.length ? applySetupParameterChanges(node.parameters, changes) : node.parameters
			};
		}
		const displayedRows = computed(() => rows.value.map((row) => {
			if (row.item.kind === "credential") {
				const pending = actions.getPendingCredential(row.item.id);
				if (pending && !row.item.nodeBindings?.length) return {
					...row,
					isDone: isCredentialConfigured(pending)
				};
				return pending || row.item.nodeBindings?.some(({ nodeName }) => actions.getPendingCredential(row.item.id, nodeName)) ? {
					...row,
					isDone: isItemDone(row.item, getNodeByName)
				} : row;
			}
			return actions.getPendingParameterChanges(row.item.nodeName).length ? {
				...row,
				isDone: isItemDone(row.item, getNodeByName)
			} : row;
		}));
		const execution = useSetupPanelExecution({
			thread,
			workflowId: () => props.workflowId
		});
		const selectedItemId = ref();
		const setupDismissedKey = computed(() => LOCAL_STORAGE_INSTANCE_AI_SETUP_DISMISSED(usersStore.currentUserId ?? "", thread.id, props.workflowId));
		const setupDismissed = useLocalStorage(setupDismissedKey, false, { writeDefaults: false });
		watch(() => props.workflowId, () => {
			selectedItemId.value = void 0;
			oauth.cancelAuthorize();
			clearDetailState();
			lastDetailId = void 0;
		});
		function nodeType(node) {
			return nodeTypesStore.getNodeType(node.type, node.typeVersion);
		}
		const shownItemIds = useLocalStorage(() => LOCAL_STORAGE_INSTANCE_AI_SETUP_ITEMS(usersStore.currentUserId ?? "", thread.id, props.workflowId), [], {
			writeDefaults: false,
			flush: "sync"
		});
		const credentialsReady = computed(() => credentialsAvailable.value && !isRefreshingWorkflow.value && !isCheckingOAuthCredentials.value);
		const selectingExisting = ref(/* @__PURE__ */ new Set());
		watch([
			rows,
			credentialsReady,
			() => credentialsStore.usableCredentials
		], async ([currentRows, ready]) => {
			if (!ready) return;
			const workflowId = props.workflowId;
			const selections = currentRows.flatMap(({ item }) => {
				if (item.kind !== "credential" || item.nodeBindings?.length || item.preferNew || actions.getPendingCredential(item.id) || selectingExisting.value.has(item.id)) return [];
				const credentials = credentialsStore.getUsableCredentialByType(item.credentialType);
				return shouldAutoResolveCredential(item.credentialType, credentials.length) ? [{
					item,
					credential: credentials[0]
				}] : [];
			});
			if (!selections.length) return;
			selectingExisting.value = /* @__PURE__ */ new Set([...selectingExisting.value, ...selections.map(({ item }) => item.id)]);
			for (const { item, credential } of selections) try {
				if (props.workflowId === workflowId) await actions.bindCredential(item, {
					id: credential.id,
					name: credential.name
				});
			} finally {
				selectingExisting.value.delete(item.id);
			}
		}, {
			immediate: true,
			flush: "sync"
		});
		function needsInitialAction(row) {
			return !row.isDone && (row.item.kind === "parameters" || credentialsReady.value && !selectingExisting.value.has(row.item.id));
		}
		watch(() => displayedRows.value.filter(needsInitialAction), (currentRows) => {
			const added = currentRows.filter((row) => !shownItemIds.value.includes(row.item.id));
			if (added.length) shownItemIds.value = [...shownItemIds.value, ...added.map((row) => row.item.id)];
		}, {
			immediate: true,
			flush: "sync"
		});
		const groups = computed(() => groupSetupPanelRows(displayedRows.value, {
			workflowId: props.workflowId,
			getNodeByName,
			getNodeType: nodeType
		}).filter((group) => {
			const items = [...group.credential ? [group.credential] : [], ...group.parameters];
			return group.id === selectedItemId.value || items.some((row) => shownItemIds.value.includes(row.item.id)) || items.some(needsInitialAction);
		}));
		const panelTelemetry = useSetupPanelTelemetry({
			workflowId: () => props.workflowId,
			thread,
			rows,
			groups,
			shownItemIds,
			getNodeByName: getSavedNodeByName,
			isItemDone,
			isAgentBuilding,
			ready: () => !setupDismissed.value && credentialsReady.value && (rowSource.value === "derived" || rows.value.length > 0)
		});
		__expose({ getChatTelemetryContext: panelTelemetry.getChatTelemetryContext });
		const selectedGroup = computed(() => groups.value.find((group) => group.id === selectedItemId.value));
		const selectedNodes = computed(() => (selectedGroup.value?.credential?.item.nodeBindings ?? []).flatMap((binding) => {
			const node = getNodeByName(binding.nodeName);
			return node ? [node] : [];
		}));
		function groupById(id) {
			return groups.value.find((group) => group.id === id);
		}
		function groupNodeType(id) {
			const node = groupById(id)?.node;
			return node ? nodeType(node) : null;
		}
		function groupName(group) {
			const item = group.credential?.item;
			if (item) return deriveServiceName(item.setupHint) ?? getAppNameFromNodeName(getAppNameFromCredType(item.appDisplayName ?? credentialsStore.getCredentialTypeByName(item.credentialType)?.displayName ?? item.credentialType));
			return group.node ? getAppNameFromNodeName(nodeType(group.node)?.displayName ?? group.node.name) : i18n.baseText("instanceAi.setupPanel.details");
		}
		const panelItems = computed(() => groups.value.map((group) => {
			const pending = [];
			if (group.credential && !group.credential.isDone) pending.push(i18n.baseText("instanceAi.setupPanel.connection"));
			for (const row of group.parameters) {
				if (row.isDone) continue;
				const node = getNodeByName(row.item.nodeName);
				const properties = node ? nodeType(node)?.properties : void 0;
				for (const name of row.item.parameterNames) {
					const root = name.split(/[.[\]]/)[0];
					pending.push(properties?.find((property) => property.name === root)?.displayName ?? name);
				}
			}
			return {
				id: group.id,
				title: groupName(group),
				hasAction: Boolean(group.credential && !group.credential.isDone && oauth.isOAuthCredentialType(group.credential.item.credentialType) && oauth.canOAuthCredentialQuickConnect(group.credential.item.credentialType) && (connectingItemId.value === group.id || credentialsStore.getUsableCredentialByType(group.credential.item.credentialType).length === 0)),
				completed: (!group.credential || group.credential.isDone) && group.parameters.every((row) => row.isDone),
				subtitle: pending.length ? i18n.baseText("instanceAi.setupPanel.needs", { interpolate: { items: [...new Set(pending)].join(", ") } }) : void 0,
				disabled: group.credential ? !isCredentialProjectReady.value || !credentialsAvailable.value || !credentialsStore.getCredentialTypeByName(group.credential.item.credentialType) : !group.parameters.some((row) => getNodeByName(row.item.nodeName))
			};
		}));
		watch(() => selectedItemId.value && panelItems.value.find((item) => item.id === selectedItemId.value && !item.disabled), (item) => {
			if (selectedItemId.value && !item) {
				selectedItemId.value = void 0;
				clearDetailState();
			}
		});
		const parameterEditors = computed(() => (selectedGroup.value?.parameters ?? []).flatMap((row) => {
			const node = getNodeByName(row.item.nodeName, false);
			return node ? [{
				item: row.item,
				node,
				pendingChanges: actions.getPendingParameterChanges(row.item.nodeName)
			}] : [];
		}));
		const perNodeGroups = shallowReactive(/* @__PURE__ */ new Set());
		const perNodeCredentials = computed(() => {
			const group = selectedGroup.value;
			if (!group?.credential || selectedNodes.value.length < 2) return false;
			if (perNodeGroups.has(group.id)) return true;
			const type = group.credential.item.credentialType;
			return new Set(selectedNodes.value.map((node) => {
				const credential = node.credentials?.[type];
				return credential?.__aiGatewayManaged ? AI_GATEWAY_MANAGED_TAG : credential?.id;
			})).size > 1;
		});
		const detailSections = computed(() => {
			const group = selectedGroup.value;
			if (!group) return [];
			const credential = group.credential?.item;
			const editors = parameterEditors.value.filter(({ item, node }) => {
				const type = nodeType(node);
				if (!type) return false;
				const values = getNodeParameters(type.properties, node.parameters, true, true, node, type) ?? node.parameters;
				return type.properties.some((property) => property.type !== "hidden" && item.parameterNames.some((name) => name.split(/[.[\]]/)[0] === property.name) && displayParameter(values, property, node, type));
			});
			const nodes = credential ? selectedNodes.value : editors.map((editor) => editor.node);
			return [...credential && !perNodeCredentials.value ? [{
				id: group.id,
				title: void 0,
				credential,
				nodes: selectedNodes.value,
				editors: [],
				showParameters: false
			}] : [], ...nodes.filter((node) => perNodeCredentials.value || editors.some((editor) => editor.node.name === node.name)).map((node) => ({
				id: `node:${node.name}`,
				title: nodes.length > 1 ? node.name : void 0,
				credential: credential && perNodeCredentials.value ? {
					...credential,
					id: `${credential.id}:${node.name}`,
					nodeBindings: [{ nodeName: node.name }]
				} : void 0,
				nodes: [node],
				editors: editors.filter((editor) => editor.node.name === node.name),
				showParameters: credential && perNodeCredentials.value ? isCredentialConfigured(node.credentials?.[credential.credentialType]) : !group.credential || group.credential.isDone
			}))].filter((section) => section.credential || section.showParameters && section.editors.length > 0);
		});
		const parameterEditorComponents = useTemplateRef("parameterEditorComponents");
		const showParameterConfirm = computed(() => detailSections.value.some((section) => section.showParameters && section.editors.length > 0));
		const isApplying = ref(false);
		const busyCredentials = shallowReactive(/* @__PURE__ */ new Set());
		const dirtyCredentials = shallowReactive(/* @__PURE__ */ new Set());
		const credentialBusy = computed(() => busyCredentials.size > 0);
		const credentialHasChanges = computed(() => dirtyCredentials.size > 0);
		const dirtyParameters = shallowReactive(/* @__PURE__ */ new Set());
		const requestingExecution = execution.isRunning;
		const isChatBusy = computed(() => thread.isStreaming || thread.isSendingMessage || thread.isAwaitingConfirmation);
		const setupPanel = useTemplateRef("setupPanel");
		const setupCoachmarkSeen = useLocalStorage(() => LOCAL_STORAGE_INSTANCE_AI_SETUP_COACHMARK_SEEN(usersStore.currentUserId ?? ""), false, { writeDefaults: false });
		const showSetupCoachmark = ref(false);
		const canShowSetupCoachmark = computed(() => Boolean(usersStore.currentUserId && setupPanel.value) && (isAgentBuilding.value || isAwaitingFirstBuild.value && thread.isStreaming) && !setupDismissed.value && !selectedItemId.value && panelItems.value.some((item) => !item.completed && !item.disabled));
		watch([
			canShowSetupCoachmark,
			() => usersStore.currentUserId,
			() => props.workflowId
		], ([available]) => {
			showSetupCoachmark.value = available && !setupCoachmarkSeen.value;
			if (showSetupCoachmark.value) setupCoachmarkSeen.value = true;
		}, {
			immediate: true,
			flush: "post"
		});
		async function onAskForHelp(credential) {
			if (isChatBusy.value) return;
			await thread.sendMessage(buildInstanceAiArtifactCredentialQuestion(credential), {
				authorship: {
					kind: "prefill",
					prefillType: "handoff_credential_setup"
				},
				pushRef: rootStore.pushRef,
				handoffContext: buildInstanceAiCredentialHandoffContext(credential)
			});
		}
		const allRowsDone = computed(() => rows.value.length > 0 && rows.value.every((row) => row.isDone));
		const hasChanges = computed(() => credentialHasChanges.value || dirtyParameters.size > 0);
		const activeGroupComplete = computed(() => {
			const group = selectedGroup.value;
			return Boolean(group && (!group.credential || group.credential.isDone) && group.parameters.every((row) => row.isDone));
		});
		const canAutoClose = ref(false);
		const reducedMotion = usePreferredReducedMotion();
		let selectionVersion = 0;
		let lastDetailId;
		const readyToReturn = computed(() => canAutoClose.value && activeGroupComplete.value && !hasChanges.value && !isApplying.value && !actions.isApplying.value && !credentialBusy.value && !isRefreshingWorkflow.value && !connectingItemId.value);
		const { start: scheduleReturn, stop: cancelReturn } = useTimeoutFn(() => {
			if (readyToReturn.value) selectedItemId.value = void 0;
		}, computed(() => reducedMotion.value === "reduce" ? 0 : 650), { immediate: false });
		function clearDetailState() {
			busyCredentials.clear();
			dirtyCredentials.clear();
			dirtyParameters.clear();
		}
		function onDetailClosed() {
			if (selectedItemId.value) return;
			clearDetailState();
			lastDetailId = void 0;
		}
		watch(selectedItemId, (id) => {
			selectionVersion++;
			cancelReturn();
			canAutoClose.value = Boolean(id && !activeGroupComplete.value);
			if (id && id !== lastDetailId) {
				clearDetailState();
				lastDetailId = id;
			}
		}, { flush: "sync" });
		watch(readyToReturn, (ready) => {
			cancelReturn();
			if (ready) scheduleReturn();
		});
		function finishSubmission(result, version, workflowId) {
			if (active && props.workflowId === workflowId && version === selectionVersion && (result === "applied" || result === "noop" || result === "queued")) canAutoClose.value = true;
		}
		const terminalStatus = computed(() => {
			if (!allRowsDone.value || hasChanges.value) return "incomplete";
			if (requestingExecution.value) return "executing";
			if (isAgentBuilding.value || isAwaitingFirstBuild.value) return "incomplete";
			if (rowSource.value !== "derived" || !credentialsReady.value || isApplying.value || actions.isApplying.value || actions.pendingApplyCount.value > 0 || credentialBusy.value || connectingItemId.value) return "validating";
			return "complete";
		});
		watch([
			() => rows.value.some((row) => !row.isDone),
			hasChanges,
			rowSource,
			credentialsReady,
			isAgentBuilding
		], ([pending, dirty, source, ready, building]) => {
			if (dirty || pending && (source === "derived" && ready || building)) setupDismissed.value = false;
		}, { immediate: true });
		async function onExecute() {
			if (terminalStatus.value !== "complete" || isChatBusy.value || requestingExecution.value) return;
			const workflowId = props.workflowId;
			const dismissedKey = setupDismissedKey.value;
			try {
				const result = await execution.executeWorkflow();
				if (!active || !result?.notified) return;
				if (props.workflowId !== workflowId) {
					localStorage.setItem(dismissedKey, "true");
					return;
				}
				if (allRowsDone.value && !isAgentBuilding.value && !hasChanges.value && !actions.isApplying.value && actions.pendingApplyCount.value === 0) {
					setupDismissed.value = true;
					panelTelemetry.trackDismissed("execution_finished");
				}
			} catch (error) {
				toast.showError(error, i18n.baseText("instanceAi.setupPanel.executeError"));
			}
		}
		async function connectFromRow(id) {
			if (connectingItemId.value === id && reopenAuthorization.value) {
				reopenAuthorization.value();
				return;
			}
			const group = groupById(id);
			const item = group?.credential?.item;
			const projectId = credentialProjectId.value;
			if (!group || !item || !projectId || connectingItemId.value) return;
			const workflowId = props.workflowId;
			const nodeName = item.nodeBindings?.find((binding) => getNodeByName(binding.nodeName))?.nodeName;
			const node = nodeName ? getNodeByName(nodeName) : void 0;
			const bind = async (credentialId) => {
				if (!active || props.workflowId !== workflowId) return;
				await onBindCredential(item, credentialId);
				if (active && props.workflowId === workflowId && groupById(id)?.parameters.some((row) => !row.isDone)) selectedItemId.value = id;
			};
			panelTelemetry.trackConnectionStarted(item, "oauth");
			connectingItemId.value = id;
			try {
				const credential = await oauth.createAndAuthorize(item.credentialType, node?.type, {
					projectId,
					workflowId,
					onAuthorizationStarted: (reopen) => {
						reopenAuthorization.value = reopen;
					}
				});
				if (credential) await bind(credential.id);
			} catch (error) {
				if (active) toast.showError(error, i18n.baseText("instanceAi.setupPanel.connectionError"));
			} finally {
				reopenAuthorization.value = void 0;
				connectingItemId.value = void 0;
			}
		}
		async function notifyApplyResult(result, workflowId) {
			if (!active || props.workflowId !== workflowId) return;
			if (result === "error" || result === "conflict") toast.showMessage({
				title: i18n.baseText("instanceAi.setupPanel.applyError"),
				type: "error"
			});
			if (result === "applied" || result === "noop" || result === "dropped" || result === "conflict") await refreshWorkflow();
		}
		async function onBindCredential(item, credentialId) {
			const workflowId = props.workflowId;
			const version = selectedGroup.value?.credential?.item.credentialType === item.credentialType ? selectionVersion : void 0;
			if (credentialId === "__AI_GATEWAY_MANAGED__") {
				const result = await actions.bindCredential(item, {
					id: null,
					name: "",
					__aiGatewayManaged: true
				});
				await notifyApplyResult(result, workflowId);
				panelTelemetry.trackConnectionCompleted(item, null, result);
				finishSubmission(result, version, workflowId);
				return;
			}
			const credential = (credentialsStore.hasUsableCredentialsForScope({
				workflowId,
				forAssistant: true
			}) ? credentialsStore.getUsableCredentialById(credentialId) : void 0) ?? credentialsStore.getCredentialById(credentialId);
			if (!credential) return;
			testCredentialInBackground(credential.id, credential.name, item.credentialType);
			const result = await actions.bindCredential(item, {
				id: credential.id,
				name: credential.name
			});
			await notifyApplyResult(result, workflowId);
			panelTelemetry.trackConnectionCompleted(item, credential.id, result);
			finishSubmission(result, version, workflowId);
		}
		async function onConfirmParameters() {
			if (isApplying.value || credentialBusy.value) return;
			const submissions = (parameterEditorComponents.value ?? []).flatMap((editor) => {
				const submission = editor.getSubmission();
				return submission ? [submission] : [];
			});
			if (!submissions.length) return;
			const workflowId = props.workflowId;
			const version = selectionVersion;
			isApplying.value = true;
			try {
				const result = await actions.applyParameterBatch(submissions);
				await notifyApplyResult(result, workflowId);
				finishSubmission(result, version, workflowId);
			} finally {
				isApplying.value = false;
			}
		}
		return (_ctx, _cache) => {
			return !unref(setupDismissed) && panelItems.value.length ? (openBlock(), createElementBlock("div", {
				key: 0,
				ref_key: "setupPanel",
				ref: setupPanel
			}, [(openBlock(), createBlock(unref(SetupPanel_default), {
				key: __props.workflowId,
				"active-item-id": selectedItemId.value,
				"onUpdate:activeItemId": _cache[0] || (_cache[0] = ($event) => selectedItemId.value = $event),
				items: panelItems.value,
				status: terminalStatus.value,
				"execute-disabled": isChatBusy.value || unref(requestingExecution),
				"data-test-id": "instance-ai-setup-panel",
				onExecute,
				onDetailClosed,
				"onUpdate:overlapHeight": _cache[1] || (_cache[1] = ($event) => emit("update:overlapHeight", $event))
			}, {
				action: withCtx(({ item }) => [createVNode(unref(N8nButton_default), {
					size: "small",
					variant: "outline",
					disabled: item.disabled || Boolean(connectingItemId.value && (connectingItemId.value !== item.id || !reopenAuthorization.value)),
					loading: connectingItemId.value === item.id && !reopenAuthorization.value,
					onClick: ($event) => connectFromRow(item.id)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.setupPanel.connect")), 1)]),
					_: 1
				}, 8, [
					"disabled",
					"loading",
					"onClick"
				])]),
				icon: withCtx(({ item }) => [groupById(item.id)?.credential ? (openBlock(), createBlock(CredentialIcon_default, {
					key: 0,
					"credential-type-name": groupById(item.id)?.credential?.item.credentialType ?? "",
					size: 16
				}, null, 8, ["credential-type-name"])) : groupById(item.id)?.node ? (openBlock(), createBlock(NodeIcon_default, {
					key: 1,
					"node-type": groupNodeType(item.id),
					size: 16
				}, null, 8, ["node-type"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 2,
					icon: "sliders-horizontal",
					size: "small"
				}))]),
				detail: withCtx(({ item }) => [selectedGroup.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.detail)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(detailSections.value, (section) => {
					return openBlock(), createElementBlock("section", {
						key: section.id,
						class: normalizeClass([_ctx.$style.section, { [_ctx.$style.divided]: section.title }])
					}, [
						section.title ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							tag: "h3",
							size: "medium",
							bold: "",
							class: normalizeClass(_ctx.$style.sectionTitle)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(section.title), 1)]),
							_: 2
						}, 1032, ["class"])) : createCommentVNode("", true),
						section.credential && credentialProjectId.value ? (openBlock(), createBlock(InstanceAiSetupCredential_default, {
							key: section.credential.id,
							item: section.credential,
							node: section.nodes[0],
							"pending-credential": unref(actions).getPendingCredential(section.credential.id),
							nodes: section.nodes,
							"workflow-id": __props.workflowId,
							"project-id": credentialProjectId.value,
							"help-disabled": isChatBusy.value,
							"allow-per-node": !perNodeCredentials.value && selectedNodes.value.length > 1,
							onSetCredentialsPerNode: ($event) => unref(perNodeGroups).add(item.id),
							onAskForHelp,
							onBindCredential: (credential, id) => selectedItemId.value === item.id && onBindCredential(credential, id),
							"onUpdate:busy": ($event) => (selectedItemId.value === item.id || !selectedItemId.value && !$event) && ($event ? unref(busyCredentials).add(section.id) : unref(busyCredentials).delete(section.id)),
							"onUpdate:hasChanges": ($event) => (selectedItemId.value === item.id || !selectedItemId.value && !$event) && ($event ? unref(dirtyCredentials).add(section.id) : unref(dirtyCredentials).delete(section.id)),
							onConnectStarted: ($event) => selectedItemId.value === item.id && unref(panelTelemetry).trackConnectionStarted(section.credential, $event)
						}, null, 8, [
							"item",
							"node",
							"pending-credential",
							"nodes",
							"workflow-id",
							"project-id",
							"help-disabled",
							"allow-per-node",
							"onSetCredentialsPerNode",
							"onBindCredential",
							"onUpdate:busy",
							"onUpdate:hasChanges",
							"onConnectStarted"
						])) : createCommentVNode("", true),
						section.showParameters ? (openBlock(true), createElementBlock(Fragment, { key: 2 }, renderList(section.editors, (editor) => {
							return openBlock(), createElementBlock("div", { key: editor.item.id }, [createVNode(InstanceAiSetupPanelDetail_default, {
								ref_for: true,
								ref_key: "parameterEditorComponents",
								ref: parameterEditorComponents,
								item: editor.item,
								node: editor.node,
								"workflow-id": __props.workflowId,
								"project-id": credentialProjectId.value,
								"pending-changes": editor.pendingChanges,
								"onUpdate:hasChanges": ($event) => (selectedItemId.value === item.id || !selectedItemId.value && !$event) && ($event ? unref(dirtyParameters).add(editor.item.id) : unref(dirtyParameters).delete(editor.item.id))
							}, null, 8, [
								"item",
								"node",
								"workflow-id",
								"project-id",
								"pending-changes",
								"onUpdate:hasChanges"
							])]);
						}), 128)) : createCommentVNode("", true)
					], 2);
				}), 128)), showParameterConfirm.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.footer)
				}, [createVNode(unref(N8nButton_default), {
					size: "small",
					disabled: unref(dirtyParameters).size === 0 || isApplying.value || credentialBusy.value,
					loading: isApplying.value,
					"data-test-id": "instance-ai-setup-panel-confirm",
					onClick: onConfirmParameters
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(activeGroupComplete.value ? "generic.update" : "generic.confirm")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)]),
				_: 1
			}, 8, [
				"active-item-id",
				"items",
				"status",
				"execute-disabled"
			])), createVNode(unref(N8nPopover_default), {
				open: showSetupCoachmark.value,
				reference: setupPanel.value ?? void 0,
				side: "top",
				align: "start",
				"show-arrow": "",
				"enable-scrolling": false,
				"suppress-auto-focus": "",
				width: "calc(var(--spacing--5xl) + var(--spacing--3xl))",
				"onUpdate:open": _cache[3] || (_cache[3] = ($event) => showSetupCoachmark.value = $event && showSetupCoachmark.value)
			}, {
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.coachmark),
					"data-test-id": "instance-ai-setup-coachmark"
				}, [createVNode(unref(N8nText_default), {
					tag: "p",
					size: "small",
					role: "status"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.setupPanel.earlySetupCoachmark")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					size: "small",
					onClick: _cache[2] || (_cache[2] = ($event) => showSetupCoachmark.value = false)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.setupPanel.dismissCoachmark")), 1)]),
					_: 1
				})], 2)]),
				_: 1
			}, 8, ["open", "reference"])], 512)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	detail: "_detail_1v659_1",
	section: "_section_1v659_2",
	divided: "_divided_1v659_8",
	sectionTitle: "_sectionTitle_1v659_13",
	footer: "_footer_1v659_17",
	coachmark: "_coachmark_1v659_22"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiTestAgentPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiTestAgentPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiTestAgentPanel",
	emits: ["generate", "dismiss"],
	setup(__props) {
		/**
		* Post-setup suggestion to test the agent that was just built. Suggests rather
		* than imposes: the dismiss action is a peer of the CTA, not a close affordance
		* tucked in a corner.
		*/
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.root),
				"data-test-id": "instance-ai-test-agent-panel"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.head) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.iconWrap) }, [createVNode(unref(N8nIcon_default), {
					icon: "sparkles",
					size: "medium"
				})], 2), createVNode(unref(N8nText_default), {
					bold: "",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgent.title")), 1)]),
					_: 1
				})], 2),
				createVNode(unref(N8nText_default), {
					step: "xs",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgent.description")), 1)]),
					_: 1
				}),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.options) }, [createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "small",
					"data-test-id": "instance-ai-test-agent-generate",
					onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("generate"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgent.generate")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					"data-test-id": "instance-ai-test-agent-dismiss",
					onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("dismiss"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgent.dismiss")), 1)]),
					_: 1
				})], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_1j9b6_4",
	head: "_head_1j9b6_19",
	iconWrap: "_iconWrap_1j9b6_25",
	options: "_options_1j9b6_32"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiTestAgentExamplesPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiTestAgentExamplesPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiTestAgentExamplesPanel",
	props: {
		previewInput: {},
		previewOutput: {},
		previewScenario: {},
		previewStatus: {},
		previewReasoning: {},
		projectId: {},
		examples: {},
		addingExample: { type: Boolean },
		caseRuns: {},
		startingRun: { type: Boolean },
		stoppingRun: { type: Boolean },
		runFailed: { type: Boolean },
		applyingSuggestionIds: {}
	},
	emits: [
		"add-example",
		"check-agent",
		"stop-run",
		"retry-run",
		"try-agent",
		"open-case",
		"apply-suggestion",
		"apply-suggestions"
	],
	setup(__props, { emit: __emit }) {
		/**
		* Shown after "Looks good" on the preview popup: the confirmed try, plus a
		* slider-controlled batch of additional generated examples the user can trim,
		* extend with their own, and hand off to a real check via "Check your agent".
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const summaryExpanded = ref(false);
		const waitingCount = computed(() => props.caseRuns?.filter((run) => run.status === "waiting").length ?? 0);
		const passedCount = computed(() => props.caseRuns?.filter((run) => run.status === "pass").length ?? 0);
		const needsWorkCount = computed(() => (props.caseRuns?.length ?? 0) - passedCount.value - waitingCount.value);
		const runSettled = computed(() => props.caseRuns !== null && waitingCount.value === 0);
		const allPassed = computed(() => runSettled.value && needsWorkCount.value === 0 && passedCount.value > 0);
		const dismissedSuggestions = ref([]);
		const suggestionKey = (run) => `${run.rowId}:${run.fixSuggestion}`;
		function suggestionFor(run) {
			if (run.status !== "work" || !run.resultId || !run.fixSuggestion?.trim()) return null;
			return dismissedSuggestions.value.includes(suggestionKey(run)) ? null : run.fixSuggestion;
		}
		const applyingAny = computed(() => (props.applyingSuggestionIds?.length ?? 0) > 0);
		const applicableSuggestionIds = computed(() => (props.caseRuns ?? []).filter((run) => suggestionFor(run) !== null).flatMap((run) => run.resultId ? [run.resultId] : []));
		const applyingAll = ref(false);
		watch(applyingAny, (applying) => {
			if (!applying) applyingAll.value = false;
		});
		function onApplyAllSuggestions() {
			applyingAll.value = true;
			emit("apply-suggestions", applicableSuggestionIds.value);
		}
		watch(() => runSettled.value && needsWorkCount.value > 0, (needsAttention) => {
			if (needsAttention) summaryExpanded.value = true;
		}, { immediate: true });
		function toggleSummaryExpanded() {
			summaryExpanded.value = !summaryExpanded.value;
		}
		function onStopRun() {
			emit("stop-run");
		}
		const examplesSlider = ref(null);
		function onCheckYourAgent() {
			emit("check-agent", examplesSlider.value?.sliderValue ?? 1);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.root) }, [!__props.caseRuns ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
				createVNode(AgentEvalTryRow_default, {
					status: __props.previewStatus ?? "pass",
					input: __props.previewInput,
					output: __props.previewOutput,
					"error-message": __props.previewReasoning,
					label: __props.previewScenario ?? unref(i18n).baseText("instanceAi.testAgentPreview.yourTry"),
					"hide-revise": "",
					"test-id": "instance-ai-test-agent-examples-try",
					onOpen: _cache[0] || (_cache[0] = ($event) => emit("open-case", null))
				}, null, 8, [
					"status",
					"input",
					"output",
					"error-message",
					"label"
				]),
				createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.savedAsFirstCheck")), 1)]),
					_: 1
				}),
				createBaseVNode("hr", { class: normalizeClass(_ctx.$style.divider) }, null, 2),
				createVNode(unref(N8nText_default), {
					color: "text-dark",
					class: normalizeClass(_ctx.$style.checkMoreExamplesHint)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.checkMoreExamples")), 1)]),
					_: 1
				}, 8, ["class"]),
				createVNode(AgentEvalExamplesSlider_default, {
					ref_key: "examplesSlider",
					ref: examplesSlider,
					examples: __props.examples,
					onAddExample: _cache[1] || (_cache[1] = ($event) => emit("add-example", $event))
				}, null, 8, ["examples"]),
				createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "small",
					loading: __props.startingRun,
					"data-test-id": "instance-ai-test-agent-examples-check-agent",
					onClick: onCheckYourAgent
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.checkYourAgent")), 1)]),
					_: 1
				}, 8, ["loading"])
			], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
				__props.runFailed ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-dark",
					class: normalizeClass(_ctx.$style.runStatus),
					"data-test-id": "instance-ai-test-agent-examples-run-failed"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.runProgressUnavailable")), 1)]),
					_: 1
				}, 8, ["class"])) : !runSettled.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					color: "text-dark",
					class: normalizeClass(_ctx.$style.runStatus)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.checkingLeft", { interpolate: { count: String(waitingCount.value) } })), 1)]),
					_: 1
				}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					color: "text-dark",
					class: normalizeClass(_ctx.$style.runStatus),
					"data-test-id": "instance-ai-test-agent-examples-run-summary"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.wentWellNeedWork", { interpolate: {
						passed: String(passedCount.value),
						total: String(__props.caseRuns?.length ?? 0),
						needsWork: String(needsWorkCount.value)
					} })), 1)]),
					_: 1
				}, 8, ["class"])),
				runSettled.value ? (openBlock(), createElementBlock("button", {
					key: 3,
					type: "button",
					class: normalizeClass(_ctx.$style.summaryPill),
					"data-test-id": "instance-ai-test-agent-examples-summary-toggle",
					onClick: toggleSummaryExpanded
				}, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.summaryAvatars) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.caseRuns, (run) => {
						return openBlock(), createBlock(AgentAvatar_default, {
							key: run.rowId,
							kind: run.status,
							label: run.label,
							size: "row",
							class: normalizeClass(_ctx.$style.summaryAvatar)
						}, null, 8, [
							"kind",
							"label",
							"class"
						]);
					}), 128))], 2),
					createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-dark"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.savedChecks", {
							adjustToNumber: __props.caseRuns?.length ?? 0,
							interpolate: { count: String(__props.caseRuns?.length ?? 0) }
						})), 1)]),
						_: 1
					}),
					createVNode(unref(N8nIcon_default), {
						icon: summaryExpanded.value ? "chevron-up" : "chevron-down",
						size: "small",
						class: normalizeClass(_ctx.$style.summaryChevron)
					}, null, 8, ["icon", "class"])
				], 2)) : createCommentVNode("", true),
				!runSettled.value || summaryExpanded.value ? (openBlock(), createElementBlock("div", {
					key: 4,
					class: normalizeClass(_ctx.$style.exampleList)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.caseRuns, (run) => {
					return openBlock(), createElementBlock("div", {
						key: run.rowId,
						class: normalizeClass(_ctx.$style.exampleItem)
					}, [createVNode(AgentEvalTryRow_default, {
						status: run.status,
						input: run.input,
						output: run.output,
						label: run.label,
						"error-message": run.errorMessage,
						"tool-calls": run.toolCalls,
						"project-id": __props.projectId,
						"test-id": `instance-ai-test-agent-examples-case-${run.rowId}`,
						onOpen: ($event) => emit("open-case", run.resultId)
					}, null, 8, [
						"status",
						"input",
						"output",
						"label",
						"error-message",
						"tool-calls",
						"project-id",
						"test-id",
						"onOpen"
					]), suggestionFor(run) && run.resultId ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [run.errorMessage ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						color: "text-base",
						size: "small",
						"data-test-id": `instance-ai-test-agent-examples-case-${run.rowId}-verdict`
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(run.errorMessage), 1)]),
						_: 2
					}, 1032, ["data-test-id"])) : createCommentVNode("", true), createVNode(AgentEvalSuggestionCard_default, {
						suggestion: suggestionFor(run) ?? "",
						applying: __props.applyingSuggestionIds?.includes(run.resultId),
						disabled: applyingAny.value,
						"test-id": `instance-ai-test-agent-examples-case-${run.rowId}-suggestion`,
						onApply: ($event) => emit("apply-suggestion", run.resultId),
						onDismiss: ($event) => dismissedSuggestions.value.push(suggestionKey(run))
					}, null, 8, [
						"suggestion",
						"applying",
						"disabled",
						"test-id",
						"onApply",
						"onDismiss"
					])], 64)) : createCommentVNode("", true)], 2);
				}), 128))], 2)) : createCommentVNode("", true),
				runSettled.value && summaryExpanded.value && applicableSuggestionIds.value.length > 1 ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 5,
					variant: "solid",
					size: "small",
					disabled: applyingAny.value,
					loading: applyingAll.value,
					"data-test-id": "instance-ai-test-agent-examples-apply-all-suggestions",
					onClick: onApplyAllSuggestions
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.suggestion.applyAll")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])) : createCommentVNode("", true),
				__props.runFailed ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 6,
					variant: "solid",
					size: "small",
					loading: __props.startingRun,
					"data-test-id": "instance-ai-test-agent-examples-retry-run",
					onClick: _cache[2] || (_cache[2] = ($event) => emit("retry-run"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.retryRun")), 1)]),
					_: 1
				}, 8, ["loading"])) : !runSettled.value && !applyingAny.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 7,
					variant: "ghost",
					size: "small",
					loading: __props.stoppingRun,
					"data-test-id": "instance-ai-test-agent-examples-stop",
					onClick: onStopRun
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.run.cancel")), 1)]),
					_: 1
				}, 8, ["loading"])) : createCommentVNode("", true),
				allPassed.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 8,
					variant: "solid",
					size: "small",
					"data-test-id": "instance-ai-test-agent-examples-try-agent",
					onClick: _cache[3] || (_cache[3] = ($event) => emit("try-agent"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.tryAgentYourself")), 1)]),
					_: 1
				})) : createCommentVNode("", true)
			], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_mid0p_1",
	tryCard: "_tryCard_mid0p_9",
	checkMoreExamplesHint: "_checkMoreExamplesHint_mid0p_13",
	runStatus: "_runStatus_mid0p_17",
	summaryPill: "_summaryPill_mid0p_21",
	summaryAvatars: "_summaryAvatars_mid0p_34",
	summaryAvatar: "_summaryAvatar_mid0p_34",
	summaryChevron: "_summaryChevron_mid0p_43",
	divider: "_divider_mid0p_48",
	exampleList: "_exampleList_mid0p_55",
	exampleItem: "_exampleItem_mid0p_68"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiTestAgentPreviewPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$2 = ["data-passed"];
var InstanceAiTestAgentPreviewPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiTestAgentPreviewPanel",
	props: { target: {} },
	emits: [
		"confirm",
		"dismiss",
		"open-evals",
		"try-agent"
	],
	setup(__props, { emit: __emit }) {
		/**
		* Runs and judges the first check with mocked tools before offering a full suite.
		* The preview is not persisted until the user saves the checks.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const store = useAgentEvalsStore();
		const { applyingIds: applyingSuggestionIds, applySuggestions, applyingPreview, applyPreviewSuggestion } = useApplyAgentEvalSuggestions(() => props.target);
		const phase = ref("generating-preview");
		const previewInput = ref("");
		const previewOutput = ref("");
		const suiteCases = ref([]);
		const suiteOwnExamples = ref([]);
		const suiteDatasetId = ref(null);
		const suiteCaseRows = ref(null);
		const suiteCaseLabels = ref({});
		const suiteRunId = ref(null);
		const startingSuiteRun = ref(false);
		const suiteRunFailed = ref(false);
		const stoppingSuiteRun = ref(false);
		const previewScenario = ref(null);
		const previewWhatToCheck = ref("");
		const previewVerdict = ref(null);
		const conversationExpanded = ref(false);
		const firstCheckPassed = computed(() => previewVerdict.value?.status === "skipped" || previewVerdict.value?.status === "completed" && previewVerdict.value.outcome === "pass");
		const previewStatus = computed(() => toAvatarKind("success", previewVerdict.value));
		const previewReasoning = computed(() => readVerdictReasoning(previewVerdict.value));
		const previewSuggestion = computed(() => readVerdictSuggestion(previewVerdict.value));
		const suggestionDismissed = ref(false);
		watch(previewSuggestion, () => {
			suggestionDismissed.value = false;
		});
		const showSuggestion = computed(() => previewSuggestion.value !== null && !suggestionDismissed.value);
		const findings = computed(() => {
			const verdict = previewVerdict.value;
			if (verdict?.status === "completed" && verdict.reasoning) return verdict.reasoning;
			if (verdict?.status === "skipped") return i18n.baseText("instanceAi.testAgentPreview.noRuleFindings");
			return i18n.baseText("instanceAi.testAgentPreview.noFindings");
		});
		const suiteCaseRuns = computed(() => {
			const rows = suiteCaseRows.value;
			if (!rows) return null;
			const results = suiteRunId.value ? store.getReview(suiteRunId.value).results : [];
			return rows.map((row) => {
				const label = suiteCaseLabels.value[row.rowId] ?? "";
				const result = results.find((r) => r.sourceRowId === String(row.rowId));
				if (!result || result.status === "new" || result.status === "running") return {
					rowId: row.rowId,
					resultId: result?.id ?? null,
					input: row.input,
					label,
					status: "waiting",
					output: result ? readAgentAnswer(result.output) : null,
					toolCalls: result ? toDisplayToolCalls(result.toolCalls) : [],
					whatToCheck: row.whatToCheck || null,
					errorMessage: null
				};
				return {
					rowId: row.rowId,
					resultId: result.id,
					input: row.input,
					label,
					status: toAvatarKind(result.status, result.verdict),
					output: readAgentAnswer(result.output),
					toolCalls: toDisplayToolCalls(result.toolCalls),
					whatToCheck: row.whatToCheck || null,
					errorMessage: readErrorMessage(result.errorDetails) ?? readVerdictReasoning(result.verdict),
					fixSuggestion: readVerdictSuggestion(result.verdict)
				};
			});
		});
		let isMounted = true;
		function failAndDismiss(error) {
			if (!isMounted) return;
			toast.showError(error, i18n.baseText("agents.builder.agentEvals.generateError"));
			emit("dismiss");
		}
		async function runGeneratedPreview() {
			try {
				const { projectId, agentId } = props.target;
				const result = await store.previewRun(projectId, agentId);
				if (!isMounted) return;
				if (result.status !== "completed") {
					failAndDismiss(/* @__PURE__ */ new Error("Preview run did not complete successfully"));
					return;
				}
				previewScenario.value = result.scenario || null;
				previewWhatToCheck.value = result.whatToCheck;
				previewVerdict.value = result.verdict;
				previewInput.value = result.input;
				previewOutput.value = result.response;
				conversationExpanded.value = false;
				phase.value = "awaiting-confirmation";
			} catch (error) {
				failAndDismiss(error);
			}
		}
		onMounted(runGeneratedPreview);
		onBeforeUnmount(() => {
			isMounted = false;
			store.stopPollingRun();
		});
		async function onConfirm() {
			if (phase.value !== "awaiting-confirmation") return;
			emit("confirm");
			phase.value = "generating-suite";
			try {
				const { projectId, agentId } = props.target;
				const example = previewInput.value && previewOutput.value ? {
					exampleInput: previewInput.value,
					exampleOutput: previewOutput.value
				} : {};
				const result = await store.generateDraftCases(projectId, agentId, {
					count: 10,
					save: false,
					...example
				});
				if (!isMounted) return;
				suiteCases.value = result.cases;
				phase.value = "suite-ready";
			} catch (error) {
				failAndDismiss(error);
			}
		}
		/** Kept in memory only — nothing is persisted until "Check your agent" commits. */
		function onAddExample(input) {
			suiteOwnExamples.value = [...suiteOwnExamples.value, input];
		}
		/**
		* Commits the preview: creates a real (empty) dataset, inserts the slider's
		* selected generated cases plus every self-written one as rows, then runs the
		* agent over them. From here the panel shows each case's live status instead
		* of the editor. Nothing from the preview is persisted before this point.
		*/
		async function onCheckAgent(count) {
			if (suiteCaseRows.value) return;
			const { projectId, agentId } = props.target;
			startingSuiteRun.value = true;
			let runSubmitted = false;
			const discardDraft = async (datasetId) => {
				await store.deleteDraftDataset(projectId, agentId, datasetId).catch(() => null);
			};
			try {
				const created = await store.createDraftDataset(projectId, agentId);
				if (!isMounted) {
					await discardDraft(created.datasetId);
					return;
				}
				suiteDatasetId.value = created.datasetId;
				const columns = resolveCaseColumns(created.columnMapping);
				if (!columns) throw new Error("The draft dataset has no writable case columns");
				const source = {
					datasetId: created.datasetId,
					dataTableId: created.dataTableId,
					columns
				};
				const selectedCases = suiteCases.value.slice(0, count);
				const confirmedTry = {
					input: previewInput.value,
					whatToCheck: previewWhatToCheck.value
				};
				const toCreate = [...selectedCases.map((c) => ({
					input: c.input,
					whatToCheck: c.whatToCheck
				})), ...suiteOwnExamples.value.map((input) => ({
					input,
					whatToCheck: ""
				}))];
				await store.createCase(projectId, source, confirmedTry);
				await Promise.all(toCreate.map((value) => store.createCase(projectId, source, value)));
				if (!isMounted) {
					await discardDraft(created.datasetId);
					return;
				}
				const cases = await store.fetchCases(projectId, source);
				if (!isMounted) {
					await discardDraft(created.datasetId);
					return;
				}
				const customLabel = i18n.baseText("instanceAi.testAgentPreview.customExampleLabel");
				const labelByInput = new Map(selectedCases.map((c) => [c.input, c.scenario]));
				for (const input of suiteOwnExamples.value) labelByInput.set(input, customLabel);
				labelByInput.set(confirmedTry.input, previewScenario.value ?? i18n.baseText("instanceAi.testAgentPreview.yourTry"));
				suiteCaseLabels.value = Object.fromEntries(cases.map((c) => [c.rowId, labelByInput.get(c.input) ?? ""]));
				suiteCaseRows.value = cases;
				runSubmitted = true;
				const run = await store.startRun(projectId, agentId, created.datasetId);
				if (!isMounted) return;
				suiteRunId.value = run.id;
				await followSuiteRun();
			} catch (error) {
				if (suiteDatasetId.value && !runSubmitted) {
					await store.deleteDraftDataset(projectId, agentId, suiteDatasetId.value).catch(() => null);
					suiteDatasetId.value = null;
				}
				if (!isMounted) return;
				if (runSubmitted && await recoverSuiteRun()) return;
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.run.startError"));
			} finally {
				if (isMounted) startingSuiteRun.value = false;
			}
		}
		/** Loads the committed run's results and follows it until every case settles. */
		async function followSuiteRun() {
			const { projectId, agentId } = props.target;
			const runId = suiteRunId.value;
			if (!runId) return;
			await store.openRun(projectId, agentId, runId);
			if (!isMounted) return;
			if (store.isRunInFlight(runId)) store.startPollingRun(projectId, agentId, runId);
		}
		/**
		* Picks the committed dataset's run back up after the start or the first read
		* failed. A start whose response was lost may still have seeded a real run, so
		* it looks for that run before concluding there is none — starting another
		* would run every case twice. With none found, it flags the failure so the
		* user can retry instead of watching rows wait for a run that does not exist.
		*/
		async function recoverSuiteRun() {
			const { projectId, agentId } = props.target;
			if (!suiteDatasetId.value) return false;
			try {
				if (!suiteRunId.value) suiteRunId.value = await store.resolveLatestRunId(projectId, agentId, suiteDatasetId.value);
				if (suiteRunId.value) {
					suiteRunFailed.value = false;
					await followSuiteRun();
					return true;
				}
			} catch {}
			if (isMounted) suiteRunFailed.value = true;
			return false;
		}
		async function onRetrySuiteRun() {
			const datasetId = suiteDatasetId.value;
			if (!datasetId || startingSuiteRun.value) return;
			const { projectId, agentId } = props.target;
			startingSuiteRun.value = true;
			try {
				if (!suiteRunId.value) suiteRunId.value = await store.resolveLatestRunId(projectId, agentId, datasetId);
				if (!suiteRunId.value) {
					const run = await store.startRun(projectId, agentId, datasetId);
					if (!isMounted) return;
					suiteRunId.value = run.id;
				}
				suiteRunFailed.value = false;
				await followSuiteRun();
			} catch (error) {
				if (!isMounted) return;
				suiteRunFailed.value = true;
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.run.startError"));
			} finally {
				if (isMounted) startingSuiteRun.value = false;
			}
		}
		async function onStopSuiteRun() {
			const { projectId, agentId } = props.target;
			if (!suiteDatasetId.value || !suiteRunId.value) return;
			stoppingSuiteRun.value = true;
			try {
				await store.cancelRun(projectId, agentId, suiteDatasetId.value, suiteRunId.value);
			} catch (error) {
				if (!isMounted) return;
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.run.cancelError"));
			} finally {
				if (isMounted) stoppingSuiteRun.value = false;
			}
		}
		async function onApplySuggestion() {
			const suggestion = previewSuggestion.value;
			if (!suggestion || phase.value !== "awaiting-confirmation" || applyingPreview.value) return;
			const applied = await applyPreviewSuggestion({
				input: previewInput.value,
				whatToCheck: previewWhatToCheck.value,
				suggestion
			});
			if (!applied || !isMounted) return;
			const { preview } = applied;
			if (preview.status !== "completed") {
				suggestionDismissed.value = true;
				toast.showError(/* @__PURE__ */ new Error("Preview run did not complete successfully"), i18n.baseText("agents.builder.agentEvals.suggestion.rerunError"));
				return;
			}
			previewInput.value = preview.input;
			previewOutput.value = preview.response;
			previewVerdict.value = preview.verdict;
			conversationExpanded.value = false;
		}
		function onDontCreateEvals() {
			emit("dismiss");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.root),
				"data-test-id": "instance-ai-test-agent-preview-panel"
			}, [phase.value === "generating-preview" ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.loadingRow),
				"data-test-id": "instance-ai-test-agent-preview-generating"
			}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createVNode(unref(N8nText_default), { color: "text-base" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.generatingPreview")), 1)]),
				_: 1
			})], 2)) : phase.value === "awaiting-confirmation" ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.firstCheck),
				"data-passed": firstCheckPassed.value,
				"data-test-id": "instance-ai-test-agent-preview-first-check"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.firstCheckHeader) }, [createVNode(AgentAvatar_default, {
					kind: firstCheckPassed.value ? "pass" : "work",
					size: "sm"
				}, null, 8, ["kind"]), createVNode(unref(N8nText_default), {
					bold: "",
					size: "medium",
					color: "text-dark",
					"data-test-id": "instance-ai-test-agent-preview-first-check-title"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(firstCheckPassed.value ? "instanceAi.testAgentPreview.firstCheckPassed" : "instanceAi.testAgentPreview.firstCheckNeedsWork")), 1)]),
					_: 1
				})], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [createVNode(unref(N8nText_default), {
					bold: "",
					color: "text-dark",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.exampleMessage")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					color: "text-dark",
					"data-test-id": "instance-ai-test-agent-preview-example",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(" “" + toDisplayString(previewInput.value) + "” ", 1)]),
					_: 1
				})], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.section) }, [
					createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-dark",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.whatWeFound")), 1)]),
						_: 1
					}),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.findings) }, [createVNode(unref(N8nText_default), {
						color: "text-dark",
						size: "small",
						class: normalizeClass(_ctx.$style.findingsText),
						"data-test-id": "instance-ai-test-agent-preview-findings"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(findings.value), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						"icon-only": "",
						"aria-expanded": conversationExpanded.value,
						"aria-label": unref(i18n).baseText(conversationExpanded.value ? "instanceAi.testAgentPreview.hideConversation" : "instanceAi.testAgentPreview.showConversation"),
						"data-test-id": "instance-ai-test-agent-preview-toggle-conversation",
						onClick: _cache[0] || (_cache[0] = ($event) => conversationExpanded.value = !conversationExpanded.value)
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "message-square",
							size: "small"
						})]),
						_: 1
					}, 8, ["aria-expanded", "aria-label"])], 2),
					conversationExpanded.value ? (openBlock(), createBlock(EvalInitialSample_default, {
						key: 0,
						"preview-input": previewInput.value,
						"preview-output": previewOutput.value,
						"hide-banner": ""
					}, null, 8, ["preview-input", "preview-output"])) : createCommentVNode("", true)
				], 2),
				showSuggestion.value && previewSuggestion.value ? (openBlock(), createBlock(AgentEvalSuggestionCard_default, {
					key: 0,
					suggestion: previewSuggestion.value,
					applying: unref(applyingPreview),
					"test-id": "instance-ai-test-agent-preview-suggestion",
					onApply: onApplySuggestion,
					onDismiss: _cache[1] || (_cache[1] = ($event) => suggestionDismissed.value = true)
				}, null, 8, ["suggestion", "applying"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					color: "text-base",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(firstCheckPassed.value ? "instanceAi.testAgentPreview.firstCheckPassedHint" : "instanceAi.testAgentPreview.firstCheckNeedsWorkHint")), 1)]),
					_: 1
				})),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.options) }, [firstCheckPassed.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "solid",
					size: "small",
					"data-test-id": "instance-ai-test-agent-preview-check-harder",
					onClick: onConfirm
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.checkHarderCases")), 1)]),
					_: 1
				})) : !showSuggestion.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					variant: "outline",
					size: "small",
					"data-test-id": "instance-ai-test-agent-preview-check-harder",
					onClick: onConfirm
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.checkHarderCasesAnyway")), 1)]),
					_: 1
				})) : createCommentVNode("", true), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					disabled: unref(applyingPreview),
					"data-test-id": "instance-ai-test-agent-preview-later",
					onClick: onDontCreateEvals
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.later")), 1)]),
					_: 1
				}, 8, ["disabled"])], 2)
			], 10, _hoisted_1$2)) : phase.value === "generating-suite" ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.loadingRow),
				"data-test-id": "instance-ai-test-agent-preview-generating-suite"
			}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createVNode(unref(N8nText_default), { color: "text-base" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.generatingSuite")), 1)]),
				_: 1
			})], 2)) : phase.value === "suite-ready" ? (openBlock(), createBlock(InstanceAiTestAgentExamplesPanel_default, {
				key: 3,
				"preview-input": previewInput.value,
				"preview-output": previewOutput.value,
				"preview-scenario": previewScenario.value,
				"preview-status": previewStatus.value,
				"preview-reasoning": previewReasoning.value,
				"project-id": __props.target.projectId,
				examples: suiteCases.value,
				"case-runs": suiteCaseRuns.value,
				"starting-run": startingSuiteRun.value,
				"stopping-run": stoppingSuiteRun.value,
				"run-failed": suiteRunFailed.value,
				"applying-suggestion-ids": unref(applyingSuggestionIds),
				onAddExample,
				onCheckAgent,
				onStopRun: onStopSuiteRun,
				onRetryRun: onRetrySuiteRun,
				onTryAgent: _cache[2] || (_cache[2] = ($event) => emit("try-agent")),
				onOpenCase: _cache[3] || (_cache[3] = ($event) => emit("open-evals", $event)),
				onApplySuggestion: _cache[4] || (_cache[4] = ($event) => unref(applySuggestions)([$event])),
				onApplySuggestions: _cache[5] || (_cache[5] = ($event) => unref(applySuggestions)($event))
			}, null, 8, [
				"preview-input",
				"preview-output",
				"preview-scenario",
				"preview-status",
				"preview-reasoning",
				"project-id",
				"examples",
				"case-runs",
				"starting-run",
				"stopping-run",
				"run-failed",
				"applying-suggestion-ids"
			])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_1d6na_1",
	loadingRow: "_loadingRow_1d6na_13",
	firstCheck: "_firstCheck_1d6na_19",
	firstCheckHeader: "_firstCheckHeader_1d6na_27",
	section: "_section_1d6na_33",
	findings: "_findings_1d6na_39",
	findingsText: "_findingsText_1d6na_46",
	options: "_options_1d6na_51"
} }]]);
//#endregion
//#region src/experiments/openWorkflowInAssistant/components/OpenWorkflowInAssistantNotification.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var OpenWorkflowInAssistantNotification_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "OpenWorkflowInAssistantNotification",
	props: { threadId: {} },
	setup(__props) {
		const props = __props;
		const store = useOpenWorkflowInAssistantStore();
		const i18n = useI18n();
		const router = useRouter();
		const visible = computed(() => store.isNotificationVisibleFor(props.threadId));
		async function onSettingsLink() {
			store.closeNotification("settings_link");
			store.requestSettingHighlight();
			await router.push({ name: INSTANCE_AI_SETTINGS_VIEW });
		}
		return (_ctx, _cache) => {
			return visible.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.notification),
				"data-test-id": "open-in-assistant-notification"
			}, [
				createVNode(unref(N8nIcon_default), {
					icon: "sparkles",
					color: "primary",
					class: normalizeClass(_ctx.$style.icon)
				}, null, 8, ["class"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-dark",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.openWorkflowInAssistant.notification.title")), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.openWorkflowInAssistant.notification.text")) + " ", 1), createVNode(unref(N8nLink_default), {
						size: "small",
						class: normalizeClass(_ctx.$style.settingsLink),
						"data-test-id": "open-in-assistant-notification-settings-link",
						onClick: onSettingsLink
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("experiments.openWorkflowInAssistant.notification.settingsLink")), 1)]),
						_: 1
					}, 8, ["class"])]),
					_: 1
				})], 2),
				createVNode(unref(N8nIconButton_default), {
					icon: "x",
					variant: "ghost",
					size: "small",
					class: normalizeClass(_ctx.$style.close),
					"aria-label": unref(i18n).baseText("generic.close"),
					"data-test-id": "open-in-assistant-notification-close",
					onClick: _cache[0] || (_cache[0] = ($event) => unref(store).closeNotification("close"))
				}, null, 8, ["class", "aria-label"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					label: unref(i18n).baseText("experiments.openWorkflowInAssistant.notification.neverShowAgain"),
					"data-test-id": "open-in-assistant-notification-never",
					onClick: _cache[1] || (_cache[1] = ($event) => unref(store).neverShowAgain())
				}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "small",
					label: unref(i18n).baseText("experiments.openWorkflowInAssistant.notification.gotIt"),
					"data-test-id": "open-in-assistant-notification-got-it",
					onClick: _cache[2] || (_cache[2] = ($event) => unref(store).closeNotification("got_it"))
				}, null, 8, ["label"])], 2)
			], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	notification: "_notification_1wbsv_1",
	"slide-in": "_slide-in_1wbsv_1",
	icon: "_icon_1wbsv_29",
	content: "_content_1wbsv_33",
	settingsLink: "_settingsLink_1wbsv_39",
	close: "_close_1wbsv_43",
	actions: "_actions_1wbsv_47"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/testAgentOffer.ts
/**
* Dismissal key for the "test your agent" suggestion, stored alongside the
* handoff-context keys in `dismissedContextKeys`. Scoped per agent so
* dismissing it for one agent doesn't suppress it for another built later in
* the same thread.
*/
function testAgentOfferKey(agentId) {
	return `test-agent:${agentId}`;
}
/**
* Whether an agent is set up enough to be worth testing.
*
* A model alone isn't enough — an agent with no tools and no skills has almost
* no behaviour to get wrong, so generated cases would only exercise the model's
* prose. Requiring one capability is what makes the suggestion land at the
* moment the design describes ("your agent is set up") rather than the moment
* the row was created.
*
* `forceWorthTesting` is the operator override (`N8N_FORCE_AGENT_WORTH_TESTING`,
* surfaced as `settings.evaluation.forceAgentWorthTesting`) — when `true` it
* short-circuits the check below entirely.
*/
function isAgentWorthTesting(summary, forceWorthTesting = false) {
	if (forceWorthTesting) return true;
	if (!summary?.model) return false;
	return summary.tools.length + summary.skills.length > 0;
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiBrowserPreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = [
	"src",
	"title",
	"data-cloud-browser-task-id",
	"data-cloud-browser-window-id",
	"tabindex",
	"aria-hidden",
	"data-test-id",
	"onLoad"
];
var InstanceAiBrowserPreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiBrowserPreview",
	props: {
		taskId: {},
		userAction: {}
	},
	setup(__props) {
		/**
		* The live view of a running cloud browser task, in a preview tab. It keeps Browserbase's own
		* bar, which shows the address of the page. It is read-only until the user takes over. "Take over"
		* tells the server, which then shows the take over after a reload. When the agent asked for the
		* user, they already have control; otherwise the agent's calls wait from now on. "I'm done" gives
		* control back. After a takeover the agent did not ask for, it first asks what the user changed.
		*/
		const props = __props;
		const i18n = useI18n();
		const toast = useToast();
		const rootStore = useRootStore();
		const thread = useThread();
		const liveViews = inject(CloudBrowserLiveViewsKey, void 0);
		const refreshLiveView = inject(CloudBrowserLiveViewRefreshKey, void 0);
		const liveView = computed(() => liveViews?.get(props.taskId));
		/**
		* One frame for each loaded window: the window behind the current one, kept loaded but hidden so
		* going back to it is instant, then the current window. Frames are keyed by window, so a window
		* that becomes current again keeps its frame. The window behind comes first, so no frame moves in
		* the page, which would reload it.
		*/
		const frames = computed(() => {
			const view = liveView.value;
			if (view?.status !== "live") return [];
			const current = {
				windowId: view.windowId,
				liveViewUrl: view.liveViewUrl,
				isCurrent: true
			};
			return view.background ? [{
				...view.background,
				isCurrent: false
			}, current] : [current];
		});
		const isDisconnected = computed(() => liveView.value?.status === "disconnected" || liveView.value?.status === "not-found");
		const placeholder = computed(() => i18n.baseText(isDisconnected.value ? "instanceAi.cloudBrowser.disconnected" : "instanceAi.cloudBrowser.opening"));
		const loadedLiveViewUrls = ref(/* @__PURE__ */ new Set());
		function onFrameLoad(liveViewUrl) {
			loadedLiveViewUrls.value.add(liveViewUrl);
		}
		watch(frames, (current) => {
			const shown = new Set(current.map((frame) => frame.liveViewUrl));
			for (const url of loadedLiveViewUrls.value) if (!shown.has(url)) loadedLiveViewUrls.value.delete(url);
		});
		const showsPlaceholder = computed(() => !frames.value.some((frame) => frame.isCurrent && loadedLiveViewUrls.value.has(frame.liveViewUrl)));
		/** True after the user clicks "Take over", until they give control back. */
		const hasControl = ref(false);
		const isBusy = ref(false);
		const isNoteDialogOpen = ref(false);
		const note = ref("");
		/** The user took over without the agent asking, so the agent does not know what they changed. */
		const isUserTakeover = computed(() => hasControl.value && !props.userAction);
		watch(() => liveView.value?.status === "live" ? liveView.value.userHasTakenOver === true : void 0, (hasTakenOver) => {
			if (hasTakenOver !== void 0) hasControl.value = hasTakenOver;
		}, { immediate: true });
		watch(() => liveView.value?.status, (status) => {
			if (status === "disconnected" || status === "not-found") hasControl.value = false;
		});
		watch(hasControl, (inControl) => {
			if (inControl) return;
			isNoteDialogOpen.value = false;
			note.value = "";
		});
		watch(() => props.userAction, (current, previous) => {
			if (previous && !current) hasControl.value = false;
		});
		async function takeOver() {
			if (isBusy.value) return;
			isBusy.value = true;
			try {
				await postCloudBrowserTakeOver(rootStore.restApiContext, thread.id, props.taskId);
				hasControl.value = true;
				refreshLiveView?.(props.taskId);
			} catch (error) {
				toast.showError(error, i18n.baseText("instanceAi.cloudBrowser.takeOverFailed"));
			} finally {
				isBusy.value = false;
			}
		}
		function onDone() {
			if (isUserTakeover.value) {
				isNoteDialogOpen.value = true;
				return;
			}
			returnControl();
		}
		async function returnControl(userNote) {
			if (isBusy.value) return;
			isBusy.value = true;
			try {
				await postCloudBrowserReturnControl(rootStore.restApiContext, thread.id, props.taskId, userNote);
				hasControl.value = false;
				refreshLiveView?.(props.taskId);
			} catch (error) {
				toast.showError(error, i18n.baseText("instanceAi.cloudBrowser.returnControlFailed"));
			} finally {
				isBusy.value = false;
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.container),
				"data-test-id": "instance-ai-browser-preview"
			}, [__props.userAction || hasControl.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.banner),
				"data-test-id": "instance-ai-browser-preview-banner"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.bannerText) }, [createVNode(unref(N8nText_default), {
				tag: "div",
				size: "medium",
				bold: "",
				class: normalizeClass(_ctx.$style.bannerTitle)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(hasControl.value ? unref(i18n).baseText("instanceAi.cloudBrowser.youHaveControl") : unref(i18n).baseText("instanceAi.cloudBrowser.needsInput")), 1)]),
				_: 1
			}, 8, ["class"]), createVNode(unref(N8nText_default), {
				tag: "div",
				size: "medium"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(hasControl.value ? unref(i18n).baseText("instanceAi.cloudBrowser.returnControlHint") : __props.userAction?.reason), 1)]),
				_: 1
			})], 2), hasControl.value ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 0,
				variant: "brand",
				size: "medium",
				loading: isBusy.value,
				"data-test-id": "instance-ai-browser-preview-done",
				onClick: onDone
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.done")), 1)]),
				_: 1
			}, 8, ["loading"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.stage) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.window) }, [
				showsPlaceholder.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.placeholder),
					"data-test-id": "instance-ai-browser-preview-placeholder"
				}, [!isDisconnected.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 0,
					icon: "loader-circle",
					size: "small",
					spin: "",
					"aria-hidden": "true",
					"data-test-id": "instance-ai-browser-preview-spinner"
				})) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(placeholder.value), 1)], 2)) : createCommentVNode("", true),
				frames.value.length ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [(openBlock(true), createElementBlock(Fragment, null, renderList(frames.value, (frame) => {
					return openBlock(), createElementBlock("iframe", {
						key: frame.windowId,
						src: unref(embeddedLiveViewUrl)(frame.liveViewUrl, { navbar: true }),
						title: frame.isCurrent ? unref(i18n).baseText("instanceAi.cloudBrowser.frameTitle") : void 0,
						class: normalizeClass([_ctx.$style.frame, {
							[_ctx.$style.backgroundFrame]: !frame.isCurrent,
							[_ctx.$style.viewOnly]: !frame.isCurrent || !hasControl.value
						}]),
						"data-cloud-browser-task-id": __props.taskId,
						"data-cloud-browser-window-id": frame.windowId,
						tabindex: frame.isCurrent && hasControl.value ? 0 : -1,
						"aria-hidden": frame.isCurrent ? void 0 : "true",
						sandbox: "allow-same-origin allow-scripts allow-forms",
						allow: "clipboard-read; clipboard-write",
						"data-test-id": frame.isCurrent ? "instance-ai-browser-preview-frame" : "instance-ai-browser-preview-background-frame",
						onLoad: ($event) => onFrameLoad(frame.liveViewUrl)
					}, null, 42, _hoisted_1$1);
				}), 128)), !hasControl.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.overlay, { [_ctx.$style.overlayVisible]: !!__props.userAction }]),
					"data-test-id": "instance-ai-browser-preview-overlay"
				}, [createVNode(unref(N8nButton_default), {
					variant: "brand",
					size: "large",
					loading: isBusy.value,
					"data-test-id": "instance-ai-browser-preview-take-over",
					onClick: takeOver
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.takeOver")), 1)]),
					_: 1
				}, 8, ["loading"])], 2)) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
				isNoteDialogOpen.value ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.noteBackdrop),
					"data-test-id": "instance-ai-browser-preview-note-dialog"
				}, [createVNode(unref(FocusScope_default), {
					trapped: "",
					loop: "",
					"as-child": ""
				}, {
					default: withCtx(() => [createBaseVNode("div", {
						class: normalizeClass(_ctx.$style.noteDialog),
						role: "dialog",
						"aria-modal": "true",
						"aria-labelledby": "instance-ai-browser-note-title",
						onKeydown: _cache[3] || (_cache[3] = withKeys(($event) => isNoteDialogOpen.value = false, ["esc"]))
					}, [
						createVNode(unref(N8nText_default), {
							id: "instance-ai-browser-note-title",
							tag: "h3",
							size: "large",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.noteTitle")), 1)]),
							_: 1
						}),
						createVNode(unref(N8nText_default), {
							tag: "p",
							size: "small",
							class: normalizeClass(_ctx.$style.noteDescription)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.noteDescription")), 1)]),
							_: 1
						}, 8, ["class"]),
						createVNode(unref(Input_default), {
							modelValue: note.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => note.value = $event),
							type: "textarea",
							autosize: {
								minRows: 3,
								maxRows: 8
							},
							maxlength: 2e3,
							placeholder: unref(i18n).baseText("instanceAi.cloudBrowser.notePlaceholder"),
							"data-test-id": "instance-ai-browser-preview-note-input"
						}, null, 8, ["modelValue", "placeholder"]),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.noteActions) }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "medium",
							disabled: isBusy.value,
							"data-test-id": "instance-ai-browser-preview-note-skip",
							onClick: _cache[1] || (_cache[1] = ($event) => returnControl())
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.noteSkip")), 1)]),
							_: 1
						}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
							variant: "brand",
							size: "medium",
							disabled: !note.value.trim(),
							loading: isBusy.value,
							"data-test-id": "instance-ai-browser-preview-note-submit",
							onClick: _cache[2] || (_cache[2] = ($event) => returnControl(note.value.trim()))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.noteSubmit")), 1)]),
							_: 1
						}, 8, ["disabled", "loading"])], 2)
					], 34)]),
					_: 1
				})], 2)) : createCommentVNode("", true)
			], 2)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_5mrj9_1",
	banner: "_banner_5mrj9_9",
	bannerText: "_bannerText_5mrj9_16",
	bannerTitle: "_bannerTitle_5mrj9_24",
	stage: "_stage_5mrj9_28",
	window: "_window_5mrj9_37",
	placeholder: "_placeholder_5mrj9_51",
	frame: "_frame_5mrj9_64",
	backgroundFrame: "_backgroundFrame_5mrj9_72",
	viewOnly: "_viewOnly_5mrj9_78",
	noteBackdrop: "_noteBackdrop_5mrj9_82",
	noteDialog: "_noteDialog_5mrj9_94",
	noteDescription: "_noteDescription_5mrj9_106",
	noteActions: "_noteActions_5mrj9_110",
	overlay: "_overlay_5mrj9_116",
	overlayVisible: "_overlayVisible_5mrj9_126"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiCloudBrowserUserActionPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiCloudBrowserUserActionPanel.vue
var InstanceAiCloudBrowserUserActionPanel_default = /* @__PURE__ */ defineComponent({
	__name: "InstanceAiCloudBrowserUserActionPanel",
	setup(__props) {
		/**
		* The bar above the composer while a cloud browser task waits for the user: one row per task,
		* whose "Take over" button opens the browser tab. A row goes away once the task stops waiting.
		*/
		const i18n = useI18n();
		const tasks = useCloudBrowserTasks();
		const openCloudBrowserTab = inject("openCloudBrowserTab", void 0);
		const items = computed(() => tasks.value.flatMap((task) => task.userAction ? [{
			id: task.taskId,
			title: task.title ? i18n.baseText("instanceAi.cloudBrowser.userActionRowTitle", { interpolate: { title: task.title } }) : i18n.baseText("instanceAi.cloudBrowser.tabName"),
			completed: false,
			hasAction: true
		}] : []));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(SetupPanel_default), {
				items: items.value,
				"data-test-id": "instance-ai-cloud-browser-user-action-panel"
			}, {
				icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "globe",
					size: "large"
				})]),
				action: withCtx(({ item }) => [createVNode(unref(N8nButton_default), {
					size: "small",
					variant: "outline",
					"data-test-id": "instance-ai-cloud-browser-take-over",
					onClick: ($event) => unref(openCloudBrowserTab)?.(item.id)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.takeOver")), 1)]),
					_: 1
				}, 8, ["onClick"])]),
				_: 1
			}, 8, ["items"]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/InstanceAiThreadView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["data-layout-animated"];
var _hoisted_2 = ["inert", "aria-hidden"];
var _hoisted_3 = [
	"data-layout-transitions-enabled",
	"inert",
	"aria-hidden"
];
var _hoisted_4 = ["data-expanded"];
var InstanceAiThreadView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiThreadView",
	props: { threadId: {} },
	setup(__props) {
		const props = __props;
		const store = useInstanceAiStore();
		const settingsStore = useInstanceAiSettingsStore();
		const appSettingsStore = useSettingsStore();
		const thread = provideThread(props.threadId);
		useAssistantAwayTelemetry({
			threadId: () => props.threadId,
			isRunning: () => thread.isStreaming || thread.isSendingMessage,
			isAwaitingUser: () => thread.isAwaitingUserInput,
			isReady: () => thread.hydrationStatus === "ready",
			turn: () => getCurrentTurn(thread.artifactTurns)
		});
		const rootStore = useRootStore();
		const i18n = useI18n();
		const router = useRouter();
		const route = useRoute();
		const { width: windowWidth } = useWindowSize();
		const { isCollapsed: isMainSidebarCollapsed, sidebarWidth: mainSidebarWidth } = useSidebarLayout();
		const toast = useToast();
		const mentionsEnabled = useIsAssistantAtMentionsEnabled();
		const conversationRef = useTemplateRef("conversation");
		const handoffContext = computed(() => conversationRef.value?.pendingComposerContext ?? null);
		function onThreadMissing() {
			if (router.currentRoute.value.params.threadId !== props.threadId) return;
			router.replace({ name: INSTANCE_AI_VIEW });
		}
		function onAgentAttachmentRestored(attachment) {
			preview.openAgentPreview(attachment.id, attachment.projectId);
		}
		const failedRun = ref(null);
		const dismissedExecutionId = ref(null);
		const isChatInProgress = computed(() => thread.isStreaming || thread.isSendingMessage || thread.isAwaitingConfirmation);
		const activeFixWithAiOffer = computed(() => {
			const run = failedRun.value;
			if (!run) return null;
			if (run.executionId === dismissedExecutionId.value) return null;
			if (isChatInProgress.value) return null;
			return {
				...run,
				workflowName: thread.producedArtifacts.get(run.workflowId)?.name
			};
		});
		const isAgentEvalsEnabled = useAgentEvalsFlag();
		const agentEvalsStore = useAgentEvalsStore();
		const forceAgentWorthTesting = computed(() => appSettingsStore.settings.evaluation?.forceAgentWorthTesting === true);
		const isAgentWorking = useIsAgentWorking(thread);
		const agentBuilderTarget = computed(() => getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(thread.id)));
		/**
		* The agent this thread would offer to test, before the checks that need its
		* capabilities. Resolves to null for the conditions we can decide without a
		* network call — flag off, nothing built, already dismissed — so the capability
		* summary is never fetched for a card the user will not be shown.
		*/
		const testAgentOfferCandidate = computed(() => {
			if (!isAgentEvalsEnabled.value) return null;
			const target = agentBuilderTarget.value;
			if (!target) return null;
			return new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id))).has(testAgentOfferKey(target.agentId)) ? null : target;
		});
		const offerAgentId = computed(() => testAgentOfferCandidate.value?.agentId ?? "");
		const offerProjectId = computed(() => testAgentOfferCandidate.value?.projectId ?? "");
		const { summary: offerAgentSummary } = useAgentCapabilitySummary(offerProjectId, offerAgentId);
		const activeTestAgentOffer = computed(() => {
			const target = testAgentOfferCandidate.value;
			if (!target) return null;
			if (isAgentWorking.value) return null;
			if (agentEvalsStore.isLoaded(target.agentId) && agentEvalsStore.getDatasets(target.agentId).length) return null;
			if (!isAgentWorthTesting(offerAgentSummary.value, forceAgentWorthTesting.value)) return null;
			return target;
		});
		const latchedTestAgentOffer = ref(null);
		const isTestAgentOfferCommitted = ref(false);
		function clearTestAgentOfferLatch() {
			latchedTestAgentOffer.value = null;
			isTestAgentOfferCommitted.value = false;
		}
		watch(activeTestAgentOffer, (offer) => {
			const latched = latchedTestAgentOffer.value;
			if (offer) {
				if (latched?.agentId === offer.agentId) return;
				latchedTestAgentOffer.value = offer;
				isTestAgentOfferCommitted.value = false;
				return;
			}
			if (latched && !isTestAgentOfferCommitted.value) clearTestAgentOfferLatch();
		}, { immediate: true });
		const { isFeatureEnabled: isTestAgentPreviewEnabled } = useTestAgentPreviewFlag();
		const currentThreadTitle = computed(() => getThreadDisplayTitle(store.threads.find((t) => t.id === props.threadId), thread.messages));
		const isOnboardingChromeHidden = computed(() => store.isOnboardingChromeHidden(props.threadId));
		const documentTitle = useDocumentTitle();
		watch(currentThreadTitle, (title) => documentTitle.set(title ?? i18n.baseText("instanceAi.view.title")), { immediate: true });
		const appTargets = computed(() => getAppTargetsFromThreadMetadata(store.getThreadMetadata(props.threadId)));
		const requestedAppId = computed(() => {
			const appId = route.query[INSTANCE_AI_APP_ID_QUERY];
			return typeof appId === "string" && appTargets.value.some((target) => target.appId === appId) ? appId : void 0;
		});
		const cloudBrowserTasks = useCloudBrowserTasks(thread);
		const preview = useCanvasPreview({
			thread,
			threadId: () => props.threadId,
			cloudBrowserTasks: () => cloudBrowserTasks.value,
			initialAgentId: () => getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(props.threadId))?.agentId,
			initialAppId: () => requestedAppId.value ?? appTargets.value[0]?.appId,
			tabsStorage: {
				load: async () => (await fetchThreadTabs(rootStore.restApiContext, props.threadId)).state,
				save: async (state) => {
					await saveThreadTabs(rootStore.restApiContext, props.threadId, state);
				}
			}
		});
		const openSkillTabs = computed(() => preview.openTabs.value.filter((tab) => tab.type === "skill"));
		watch([requestedAppId, () => preview.tabsLoaded.value], ([appId, tabsLoaded]) => {
			if (appId && tabsLoaded) preview.openAppPreview(appId);
		}, { immediate: true });
		watch([() => preview.activeTabId.value, () => preview.isPreviewVisible.value], ([tabId, previewVisible]) => {
			const isArtifact = preview.openTabs.value.some((tab) => tab.id === tabId && isArtifactTab(tab));
			thread.setActiveArtifactId(previewVisible && isArtifact ? tabId : void 0);
		}, { immediate: true });
		watch([() => preview.openTabs.value, () => preview.tabsLoaded.value], ([tabs, loaded]) => thread.setOpenTabs(loaded ? tabs.filter(isArtifactTab) : null), { immediate: true });
		const setupPanelWorkflowId = computed(() => {
			if (!settingsStore.isInstanceAiSetupPanelEnabled) return void 0;
			const active = preview.activeWorkflowId.value;
			if (preview.activeTabId.value) return active ?? void 0;
			let latest;
			for (const entry of thread.producedArtifacts.values()) if (entry.type === "workflow") latest = entry.id;
			return latest ?? thread.latestSetupWorkflowId;
		});
		const setupPanelProjectId = computed(() => setupPanelWorkflowId.value ? thread.producedArtifacts.get(setupPanelWorkflowId.value)?.projectId : void 0);
		const setupOverlapHeight = ref(0);
		const setupPanelRef = useTemplateRef("setupPanel");
		onUnmounted(thread.registerSetupChatTelemetryContext(() => {
			const context = setupPanelRef.value?.getChatTelemetryContext();
			return context?.workflow_id === setupPanelWorkflowId.value ? context : void 0;
		}));
		const agentReturnContext = useAgentReturnContextStore().consumePendingArtifactReturn();
		const agentReturnWorkflowId = agentReturnContext?.workflowId;
		const agentReturnNodeId = ref(agentReturnContext?.nodeId);
		if (agentReturnWorkflowId) preview.openWorkflowPreview(agentReturnWorkflowId);
		function consumeAgentReturnNodeId() {
			agentReturnNodeId.value = void 0;
		}
		function openAgentChatPreview(agentId, projectId) {
			preview.openAgentPreview(agentId, projectId);
			isAgentTestDockOpen.value = true;
			return true;
		}
		const activeAgentPreviewSessionId = computed(() => {
			const context = handoffContext.value;
			if (context?.source === "agent-preview" && context.agentId === preview.activeAgentId.value) return context.threadId;
			const metadata = store.getThreadMetadata(props.threadId);
			const persisted = getAgentPreviewViewFromThreadMetadata(metadata) ?? getAgentPreviewSessionFromThreadMetadata(metadata);
			return persisted?.agentId === preview.activeAgentId.value ? persisted.threadId : void 0;
		});
		provide("openWorkflowPreview", preview.openWorkflowPreview);
		provide("showMentionedWorkflow", preview.showMentionedWorkflow);
		provide("openDataTablePreview", preview.openDataTablePreview);
		provide("openAgentPreview", preview.openAgentPreview);
		provide("openCloudBrowserTab", preview.openCloudBrowserTab);
		provide(CloudBrowserTasksKey, preview.cloudBrowserTasks);
		const cloudBrowserLiveViews = useCloudBrowserLiveViews(computed(() => preview.cloudBrowserTasks.value.filter((task) => task.state === "running")), () => props.threadId);
		provide(CloudBrowserLiveViewsKey, cloudBrowserLiveViews.views);
		provide(CloudBrowserLiveViewRefreshKey, cloudBrowserLiveViews.refresh);
		provide("openAgentChatPreview", openAgentChatPreview);
		provide("openSkillPreview", preview.openSkillPreview);
		provide("openAppPreview", preview.openAppPreview);
		provide("pendingComposerContext", handoffContext);
		provide("dismissPendingComposerContext", (key) => conversationRef.value?.dismissPendingComposerContext(key) ?? false);
		const showDebugPanel = ref(false);
		const isDebugEnabled = computed(() => localStorage.getItem("instanceAi.debugMode") === "true");
		const hasPreviewTabs = computed(() => preview.openTabs.value.length > 0);
		const showOpenResourcePicker = computed(() => preview.tabsLoaded.value && !preview.isPreviewVisible.value && !hasPreviewTabs.value);
		const artifactsPanelTransitionGate = useTransitionGate({ isBlocked: () => thread.isHydratingThread });
		const previewPanelTransitionGate = useTransitionGate({ isBlocked: () => thread.isHydratingThread });
		const isArtifactsPanelTransitionEnabled = artifactsPanelTransitionGate.isEnabled;
		const isPreviewPanelTransitionEnabled = previewPanelTransitionGate.isEnabled;
		const isPreviewPanelTransitioning = ref(false);
		const { previewToggleLabel: artifactsPreviewToggleLabel, togglePreview: toggleArtifactsPreview } = usePreviewToggle(preview);
		const artifactsPanelTransitionName = computed(() => isPreviewPanelTransitioning.value ? "artifacts-panel-preview" : "artifacts-panel-fade");
		function enablePanelTransitionsAfterStableRender() {
			artifactsPanelTransitionGate.enableAfterStableRender();
			previewPanelTransitionGate.enableAfterStableRender();
		}
		function suppressPanelTransitionsUntilStableRender() {
			artifactsPanelTransitionGate.suppressUntilStableRender();
			previewPanelTransitionGate.suppressUntilStableRender();
		}
		const threadAreaRef = useTemplateRef("threadArea");
		const { width: threadAreaWidth } = useElementSize(threadAreaRef);
		const mainSidebarOccupiedWidth = computed(() => isMainSidebarCollapsed.value ? 42 : mainSidebarWidth.value ?? 0);
		const availableWidthForPinnedArtifactsPanel = computed(() => windowWidth.value - mainSidebarOccupiedWidth.value);
		const isArtifactsPanelInLayout = computed(() => availableWidthForPinnedArtifactsPanel.value >= 900);
		const canShowArtifactsPanel = computed(() => thread.hasMessages || preview.openTabs.value.length > 0 || Boolean(props.threadId) && thread.isHydratingThread);
		const { showArtifactsPanel, artifactsPanelToggleLabel, toggleArtifactsPanel } = useArtifactsPanelToggle({
			isInLayout: () => isArtifactsPanelInLayout.value,
			canShow: () => canShowArtifactsPanel.value,
			isPreviewVisible: () => preview.isPreviewVisible.value,
			isHidden: () => isOnboardingChromeHidden.value,
			panelSlot: useTemplateRef("artifactsPanelSlot"),
			toggleSelector: "[data-test-id=\"instance-ai-artifacts-panel-toggle\"]"
		});
		const showArtifactsPanelToggle = computed(() => canShowArtifactsPanel.value && !preview.isPreviewVisible.value);
		const reserveArtifactsPanelLayout = computed(() => showArtifactsPanel.value && isArtifactsPanelInLayout.value);
		const shouldAnimateArtifactsPanel = computed(() => isArtifactsPanelTransitionEnabled.value && isArtifactsPanelInLayout.value);
		const shouldSuppressContentLayoutTransitions = computed(() => !isPreviewPanelTransitionEnabled.value);
		const isResizingPreview = ref(false);
		const isThreadAreaResizing = ref(false);
		const isPreviewExpanded = ref(false);
		const isAgentTestDockOpen = ref(false);
		const agentPreviewChatTarget = useTemplateRef("agentPreviewChatTarget");
		watch(() => store.composerFocusRequest, () => {
			isPreviewExpanded.value = false;
		});
		watch(preview.activeTabId, (activeTabId, previousActiveTabId) => {
			if (activeTabId !== previousActiveTabId) isAgentTestDockOpen.value = false;
		}, { flush: "sync" });
		const { previewMinWidth, previewMaxWidth, previewPanelWidth, isPreviewResizeEnabled, handlePreviewResize } = usePreviewPanelWidth({
			threadAreaWidth,
			isExpanded: () => isPreviewExpanded.value
		});
		const shouldAnimatePreviewLayout = computed(() => isPreviewPanelTransitionEnabled.value && !isResizingPreview.value && !isThreadAreaResizing.value);
		const agentPreviewPanelStyle = computed(() => isPreviewExpanded.value ? void 0 : { width: `${previewPanelWidth.value}px` });
		function togglePreviewExpanded() {
			isPreviewExpanded.value = !isPreviewExpanded.value;
			if (isPreviewExpanded.value) isAgentTestDockOpen.value = false;
		}
		function handleAgentTestDockOpenChange(open) {
			const wasOpen = isAgentTestDockOpen.value;
			isAgentTestDockOpen.value = open;
			if (open) isPreviewExpanded.value = false;
			else if (wasOpen) store.requestComposerFocus();
		}
		function handlePreviewPanelAfterEnter() {
			isPreviewPanelTransitioning.value = false;
			workflowPreviewRef.value?.requestFitView();
		}
		function handlePreviewPanelAfterLeave() {
			isPreviewPanelTransitioning.value = false;
			isPreviewExpanded.value = false;
		}
		watch(preview.isPreviewVisible, (visible, wasVisible) => {
			if (visible !== wasVisible) isPreviewPanelTransitioning.value = isPreviewPanelTransitionEnabled.value;
			if (!visible) isAgentTestDockOpen.value = false;
		}, { flush: "sync" });
		const finishThreadAreaResize = useDebounceFn(() => {
			isThreadAreaResizing.value = false;
		}, getDebounceTime(DEBOUNCE_TIME.UI.RESIZE));
		watch(threadAreaWidth, (width, previousWidth) => {
			if (typeof previousWidth === "number" && previousWidth > 0 && width !== previousWidth && preview.isPreviewVisible.value) {
				isThreadAreaResizing.value = true;
				finishThreadAreaResize();
			}
		}, { immediate: true });
		watch(() => props.threadId, (threadId, previousThreadId) => {
			if (threadId !== previousThreadId) {
				isAgentTestDockOpen.value = false;
				suppressPanelTransitionsUntilStableRender();
			}
		});
		watch(() => thread.isHydratingThread, (isHydrating) => {
			if (isHydrating) {
				artifactsPanelTransitionGate.suppress();
				previewPanelTransitionGate.suppress();
				return;
			}
			suppressPanelTransitionsUntilStableRender();
		});
		onMounted(() => {
			enablePanelTransitionsAfterStableRender();
		});
		onUnmounted(() => {
			if (router.currentRoute.value.params.threadId !== props.threadId) {
				store.disposeRuntime(props.threadId);
				const offeredAgentId = agentBuilderTarget.value?.agentId;
				if (offeredAgentId) agentEvalsStore.clearEvalsFocus(offeredAgentId);
			}
		});
		const workflowPreviewRef = useTemplateRef("workflowPreview");
		function handleFixWithAiFromOffer() {
			const offer = activeFixWithAiOffer.value;
			if (!offer) return;
			dismissedExecutionId.value = offer.executionId;
			conversationRef.value?.resetScroll();
			thread.sendMessage(buildFixWithAiPrompt({
				workflowName: offer.workflowName,
				errors: offer.errors
			}), {
				authorship: {
					kind: "prefill",
					prefillType: "handoff_fix_with_ai"
				},
				pushRef: rootStore.pushRef,
				attachments: [{
					type: "workflow",
					id: offer.workflowId,
					...offer.workflowName ? { name: offer.workflowName } : {},
					executionId: offer.executionId
				}]
			});
		}
		function dismissFixWithAiOffer() {
			const offer = activeFixWithAiOffer.value;
			if (!offer) return;
			dismissedExecutionId.value = offer.executionId;
		}
		function handleWorkflowFailures(report) {
			failedRun.value = report;
		}
		function handleAgentPreviewAssistantHandoff(params) {
			if (params.agentId !== preview.activeAgentId.value || params.projectId !== preview.activeAgentProjectId.value) return;
			if (conversationRef.value?.isDirty()) {
				toast.showMessage({
					title: i18n.baseText("instanceAi.input.finishDraftBeforeHandoff.title"),
					message: i18n.baseText("instanceAi.input.finishDraftBeforeHandoff.message"),
					type: "warning"
				});
				return;
			}
			isAgentTestDockOpen.value = false;
			if (!conversationRef.value) return;
			conversationRef.value.applyHandoff(buildInstanceAiAgentPreviewHandoffContext(params), params.initialDraft);
			params.onAccepted?.();
		}
		/**
		* Reveal the agent artifact, then hand off to the builder to select its Evals
		* tab and generate. Generation deliberately stays in the builder: it already
		* owns the call, its loading flag and its error toast, so driving it from here
		* would be a second call site for the same operation.
		*/
		async function handleGenerateTestCasesFromOffer() {
			const target = latchedTestAgentOffer.value;
			if (!target) return;
			agentEvalsStore.requestEvalsFocus(target.agentId, true);
			preview.openAgentPreview(target.agentId, target.projectId);
			await persistTestAgentOfferDismissal(target.agentId);
			clearTestAgentOfferLatch();
		}
		async function dismissTestAgentOffer() {
			const target = latchedTestAgentOffer.value;
			if (!target) return;
			await persistTestAgentOfferDismissal(target.agentId);
			clearTestAgentOfferLatch();
		}
		/**
		* The preview panel confirms as soon as the user says "Looks good", before it
		* generates the rest of the suite — dismissal happens on that signal alone,
		* matching the generic offer's CTA, which also persists immediately rather
		* than waiting for generation to finish. The latch stays set: the flow
		* continues (the panel keeps generating and offers "Open evals" next), so the
		* panel must not unmount yet.
		*/
		async function handleConfirmTestAgentPreview() {
			const target = latchedTestAgentOffer.value;
			if (!target) return;
			isTestAgentOfferCommitted.value = true;
			await persistTestAgentOfferDismissal(target.agentId);
		}
		/**
		* The preview panel has already generated every case by the time this fires,
		* so — unlike `handleGenerateTestCasesFromOffer` — this does not request
		* generation on arrival. This is the end of the preview flow, so the latch
		* clears here.
		*/
		function handleOpenEvalsFromPreview(resultId) {
			const target = latchedTestAgentOffer.value;
			if (!target) return;
			agentEvalsStore.requestEvalsFocus(target.agentId, false, resultId ?? void 0);
			preview.openAgentPreview(target.agentId, target.projectId);
			if (!resultId) clearTestAgentOfferLatch();
		}
		function handleTryAgentFromPreview() {
			const target = latchedTestAgentOffer.value;
			if (!target) return;
			openAgentChatPreview(target.agentId, target.projectId);
		}
		async function persistTestAgentOfferDismissal(agentId) {
			const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
			dismissedKeys.add(testAgentOfferKey(agentId));
			await store.updateThreadMetadata(thread.id, { dismissedContextKeys: [...dismissedKeys] });
		}
		function handleNewThreadClick() {
			router.push({ name: INSTANCE_AI_VIEW });
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref: "threadArea",
				class: normalizeClass([_ctx.$style.threadArea, { agentPreviewDockOpen: isAgentTestDockOpen.value }]),
				"data-test-id": "instance-ai-thread-area"
			}, [
				createBaseVNode("div", {
					ref_key: "agentPreviewChatTarget",
					ref: agentPreviewChatTarget,
					class: normalizeClass([_ctx.$style.chatArea, { [_ctx.$style.agentPreviewLayoutTransition]: shouldAnimatePreviewLayout.value }]),
					"data-layout-animated": shouldAnimatePreviewLayout.value,
					"data-test-id": "instance-ai-builder-chat"
				}, [createBaseVNode("div", {
					class: normalizeClass([_ctx.$style.builderChatHeader, { [_ctx.$style.chromeHidden]: isOnboardingChromeHidden.value }]),
					inert: isAgentTestDockOpen.value || void 0,
					"aria-hidden": isAgentTestDockOpen.value || void 0,
					"data-test-id": "instance-ai-builder-chat-header"
				}, [createVNode(InstanceAiViewHeader_default, {
					title: currentThreadTitle.value,
					"thread-credits-used": unref(store).threadCreditsUsed(props.threadId)
				}, {
					status: withCtx(() => [unref(thread).sseState === "reconnecting" ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-light",
						class: normalizeClass(_ctx.$style.reconnecting)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.view.reconnecting")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true)]),
					actions: withCtx(() => [
						createVNode(unref(N8nTooltip_default), {
							content: unref(i18n).baseText("instanceAi.thread.new"),
							placement: "bottom",
							"show-after": unref(500)
						}, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								icon: "message-circle-plus",
								variant: "ghost",
								size: "small",
								"icon-size": "large",
								"aria-label": unref(i18n).baseText("instanceAi.thread.new"),
								"data-test-id": "instance-ai-embed-new-thread",
								onClick: handleNewThreadClick
							}, null, 8, ["aria-label"])]),
							_: 1
						}, 8, ["content", "show-after"]),
						isDebugEnabled.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
							key: 0,
							icon: "bug",
							variant: "ghost",
							size: "small",
							"icon-size": "large",
							class: normalizeClass({ [_ctx.$style.activeButton]: showDebugPanel.value }),
							onClick: _cache[0] || (_cache[0] = ($event) => {
								showDebugPanel.value = !showDebugPanel.value;
								unref(store).debugMode = showDebugPanel.value;
							})
						}, null, 8, ["class"])) : createCommentVNode("", true),
						createVNode(unref(N8nTooltip_default), {
							content: unref(artifactsPanelToggleLabel),
							placement: "bottom",
							"show-after": unref(500)
						}, {
							default: withCtx(() => [createVNode(Transition, {
								name: "preview-toggle-opacity",
								css: unref(isArtifactsPanelTransitionEnabled)
							}, {
								default: withCtx(() => [showArtifactsPanelToggle.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
									key: 0,
									icon: "list",
									variant: "ghost",
									size: "small",
									"icon-size": "large",
									"data-test-id": "instance-ai-artifacts-panel-toggle",
									"aria-label": unref(artifactsPanelToggleLabel),
									"aria-pressed": unref(showArtifactsPanel),
									disabled: !canShowArtifactsPanel.value,
									onClick: unref(toggleArtifactsPanel)
								}, null, 8, [
									"aria-label",
									"aria-pressed",
									"disabled",
									"onClick"
								])) : createCommentVNode("", true)]),
								_: 1
							}, 8, ["css"])]),
							_: 1
						}, 8, ["content", "show-after"]),
						showOpenResourcePicker.value && unref(thread).projectId ? (openBlock(), createBlock(InstanceAiResourcePicker_default, {
							key: 1,
							"project-id": unref(thread).projectId,
							"excluded-tabs": unref(preview).openTabs.value.filter(unref(isArtifactTab)),
							placement: "bottom-end",
							"content-test-id": "instance-ai-open-resource-picker",
							onSelect: unref(preview).openTab
						}, {
							trigger: withCtx(() => [createVNode(unref(N8nTooltip_default), {
								content: unref(i18n).baseText("instanceAi.artifactsPanel.openResource"),
								placement: "bottom",
								"show-after": unref(500),
								"as-child": ""
							}, {
								default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
									icon: "square-plus",
									variant: "ghost",
									size: "small",
									"icon-size": "large",
									"data-test-id": "instance-ai-open-resource",
									"aria-label": unref(i18n).baseText("instanceAi.artifactsPanel.openResource")
								}, null, 8, ["aria-label"])]),
								_: 1
							}, 8, ["content", "show-after"])]),
							_: 1
						}, 8, [
							"project-id",
							"excluded-tabs",
							"onSelect"
						])) : (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 2,
							content: unref(artifactsPreviewToggleLabel),
							placement: "bottom",
							"show-after": unref(500)
						}, {
							default: withCtx(() => [createVNode(Transition, {
								name: "preview-toggle-opacity",
								css: unref(isPreviewPanelTransitionEnabled)
							}, {
								default: withCtx(() => [!unref(preview).isPreviewVisible.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
									key: 0,
									icon: "panel-right",
									variant: "ghost",
									size: "small",
									"icon-size": "large",
									"data-test-id": "instance-ai-artifacts-preview-toggle",
									"aria-label": unref(artifactsPreviewToggleLabel),
									"aria-pressed": unref(preview).isPreviewVisible.value,
									disabled: !hasPreviewTabs.value,
									onClick: unref(toggleArtifactsPreview)
								}, null, 8, [
									"aria-label",
									"aria-pressed",
									"disabled",
									"onClick"
								])) : createCommentVNode("", true)]),
								_: 1
							}, 8, ["css"])]),
							_: 1
						}, 8, ["content", "show-after"]))
					]),
					_: 1
				}, 8, ["title", "thread-credits-used"])], 10, _hoisted_2), createBaseVNode("div", {
					class: normalizeClass([
						_ctx.$style.contentArea,
						{ [_ctx.$style.contentAreaWithPinnedArtifacts]: reserveArtifactsPanelLayout.value },
						{ [_ctx.$style.contentAreaWithoutLayoutTransitions]: shouldSuppressContentLayoutTransitions.value }
					]),
					"data-layout-transitions-enabled": unref(isPreviewPanelTransitionEnabled),
					inert: isAgentTestDockOpen.value || void 0,
					"aria-hidden": isAgentTestDockOpen.value || void 0,
					"data-test-id": "instance-ai-content-area"
				}, [
					createVNode(InstanceAiConversation_default, {
						ref: "conversation",
						"above-input-overlap-height": setupPanelWorkflowId.value ? setupOverlapHeight.value : void 0,
						"mentions-enabled": unref(mentionsEnabled),
						onThreadMissing,
						onAgentAttachmentRestored
					}, createSlots({
						"above-input": withCtx(() => [createVNode(InstanceAiCloudBrowserUserActionPanel_default), setupPanelWorkflowId.value ? (openBlock(), createBlock(InstanceAiSetupPanel_default, {
							key: 0,
							ref: "setupPanel",
							"workflow-id": setupPanelWorkflowId.value,
							"project-id": setupPanelProjectId.value,
							"onUpdate:overlapHeight": _cache[1] || (_cache[1] = ($event) => setupOverlapHeight.value = $event)
						}, null, 8, ["workflow-id", "project-id"])) : createCommentVNode("", true)]),
						"inline-offers": withCtx(() => [
							createVNode(Transition, { name: "confirmation-slide" }, {
								default: withCtx(() => [activeFixWithAiOffer.value ? (openBlock(), createBlock(InstanceAiFixWithAiPanel_default, {
									key: 0,
									"node-name": activeFixWithAiOffer.value.errors[0].nodeName,
									"error-message": activeFixWithAiOffer.value.errors[0].errorMessage,
									"failed-count": activeFixWithAiOffer.value.errors.length,
									onFixWithAi: handleFixWithAiFromOffer,
									onDismiss: dismissFixWithAiOffer
								}, null, 8, [
									"node-name",
									"error-message",
									"failed-count"
								])) : createCommentVNode("", true)]),
								_: 1
							}),
							createVNode(Transition, { name: "confirmation-slide" }, {
								default: withCtx(() => [activeTestAgentOffer.value && !unref(isTestAgentPreviewEnabled) ? (openBlock(), createBlock(InstanceAiTestAgentPanel_default, {
									key: 0,
									onGenerate: handleGenerateTestCasesFromOffer,
									onDismiss: dismissTestAgentOffer
								})) : createCommentVNode("", true)]),
								_: 1
							}),
							createVNode(Transition, { name: "confirmation-slide" }, {
								default: withCtx(() => [latchedTestAgentOffer.value && unref(isTestAgentPreviewEnabled) ? (openBlock(), createBlock(InstanceAiTestAgentPreviewPanel_default, {
									key: latchedTestAgentOffer.value.agentId,
									target: latchedTestAgentOffer.value,
									onConfirm: handleConfirmTestAgentPreview,
									onDismiss: dismissTestAgentOffer,
									onOpenEvals: _cache[2] || (_cache[2] = ($event) => handleOpenEvalsFromPreview($event)),
									onTryAgent: handleTryAgentFromPreview
								}, null, 8, ["target"])) : createCommentVNode("", true)]),
								_: 1
							})
						]),
						_: 2
					}, [!unref(threadTargetsAgent)(unref(store).getThreadMetadata(props.threadId)) ? {
						name: "composer-controls",
						fn: withCtx(() => [createVNode(ApprovalModeSelector_default, { "thread-id": props.threadId }, null, 8, ["thread-id"])]),
						key: "0"
					} : void 0]), 1032, ["above-input-overlap-height", "mentions-enabled"]),
					createVNode(Transition, {
						name: artifactsPanelTransitionName.value,
						css: shouldAnimateArtifactsPanel.value
					}, {
						default: withCtx(() => [unref(showArtifactsPanel) ? (openBlock(), createElementBlock("div", {
							key: 0,
							ref: "artifactsPanelSlot",
							class: normalizeClass([_ctx.$style.artifactsPanelSlot, { [_ctx.$style.artifactsPanelSlotOverlay]: !reserveArtifactsPanelLayout.value }]),
							"data-test-id": "instance-ai-artifacts-sidebar-slot"
						}, [createVNode(InstanceAiArtifactsPanel_default)], 2)) : createCommentVNode("", true)]),
						_: 1
					}, 8, ["name", "css"]),
					showDebugPanel.value ? (openBlock(), createBlock(InstanceAiDebugPanel_default, {
						key: 0,
						onClose: _cache[3] || (_cache[3] = ($event) => {
							showDebugPanel.value = false;
							unref(store).debugMode = false;
						})
					})) : createCommentVNode("", true)
				], 10, _hoisted_3)], 10, _hoisted_1),
				createVNode(Transition, {
					name: "preview-panel-slide",
					css: unref(isPreviewPanelTransitionEnabled),
					onAfterEnter: handlePreviewPanelAfterEnter,
					onAfterLeave: handlePreviewPanelAfterLeave
				}, {
					default: withCtx(() => [withDirectives(createBaseVNode("div", {
						class: normalizeClass([_ctx.$style.canvasArea, {
							[_ctx.$style.canvasAreaExpanded]: isPreviewExpanded.value,
							[_ctx.$style.agentPreviewLayoutTransition]: shouldAnimatePreviewLayout.value
						}]),
						style: normalizeStyle(agentPreviewPanelStyle.value),
						"data-expanded": isPreviewExpanded.value,
						"data-test-id": "instance-ai-preview-panel"
					}, [createVNode(unref(N8nResizeWrapper_default), {
						width: unref(previewPanelWidth),
						"min-width": unref(previewMinWidth),
						"max-width": unref(previewMaxWidth),
						"supported-directions": ["left"],
						"is-resizing-enabled": unref(isPreviewResizeEnabled),
						"grid-size": 8,
						onResize: unref(handlePreviewResize),
						onResizestart: _cache[4] || (_cache[4] = ($event) => isResizingPreview.value = true),
						onResizeend: _cache[5] || (_cache[5] = ($event) => isResizingPreview.value = false)
					}, {
						default: withCtx(() => [createVNode(unref(TabsRoot_default), {
							"model-value": unref(preview).activeTabId.value,
							orientation: "horizontal",
							class: normalizeClass(_ctx.$style.previewPanel),
							"onUpdate:modelValue": unref(preview).selectTab
						}, {
							default: withCtx(() => [createVNode(InstanceAiPreviewTabBar_default, {
								tabs: unref(preview).openTabs.value,
								"active-tab-id": unref(preview).activeTabId.value,
								"is-expanded": isPreviewExpanded.value,
								"preview-toggle-label": unref(artifactsPreviewToggleLabel),
								onTogglePreview: unref(toggleArtifactsPreview),
								onToggleExpanded: togglePreviewExpanded,
								"project-id": unref(thread).projectId,
								onCloseTab: unref(preview).closeTab,
								onOpenTab: unref(preview).openTab,
								onReorderTab: unref(preview).reorderTab
							}, null, 8, [
								"tabs",
								"active-tab-id",
								"is-expanded",
								"preview-toggle-label",
								"onTogglePreview",
								"project-id",
								"onCloseTab",
								"onOpenTab",
								"onReorderTab"
							]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.previewContent) }, [
								unref(preview).isPreviewVisible.value && unref(preview).activeWorkflowId.value ? (openBlock(), createBlock(InstanceAiWorkflowPreview_default, {
									key: unref(preview).activeWorkflowId.value,
									ref: "workflowPreview",
									class: normalizeClass([_ctx.$style.previewSlot, { [_ctx.$style.previewSlotHidden]: !!unref(preview).activeDataTableId.value }]),
									"workflow-id": unref(preview).activeWorkflowId.value,
									"initial-node-id": unref(preview).activeWorkflowId.value === unref(agentReturnWorkflowId) ? agentReturnNodeId.value : void 0,
									"refresh-key": unref(preview).workflowRefreshKey.value,
									"execution-result": unref(preview).activeWorkflowExecutionResult.value,
									onInitialNodeIdConsumed: consumeAgentReturnNodeId,
									onWorkflowFailures: handleWorkflowFailures
								}, null, 8, [
									"class",
									"workflow-id",
									"initial-node-id",
									"refresh-key",
									"execution-result"
								])) : createCommentVNode("", true),
								unref(preview).isPreviewVisible.value && unref(preview).activeDataTableId.value ? (openBlock(), createBlock(InstanceAiDataTablePreview_default, {
									key: 1,
									class: normalizeClass(_ctx.$style.previewSlot),
									"data-table-id": unref(preview).activeDataTableId.value,
									"project-id": unref(preview).activeDataTableProjectId.value,
									"refresh-key": unref(preview).dataTableRefreshKey.value
								}, null, 8, [
									"class",
									"data-table-id",
									"project-id",
									"refresh-key"
								])) : createCommentVNode("", true),
								unref(preview).isPreviewVisible.value && unref(preview).activeAgentId.value && unref(preview).activeAgentProjectId.value ? (openBlock(), createBlock(InstanceAiAgentPreview_default, {
									key: 2,
									class: normalizeClass(_ctx.$style.previewSlot),
									"agent-id": unref(preview).activeAgentId.value,
									"project-id": unref(preview).activeAgentProjectId.value,
									"preview-session-id": activeAgentPreviewSessionId.value,
									"preview-open": isAgentTestDockOpen.value,
									"preview-chat-target": agentPreviewChatTarget.value,
									pending: unref(preview).activeAgentPending.value,
									onPreviewOpenChange: handleAgentTestDockOpenChange,
									onAssistantHandoff: handleAgentPreviewAssistantHandoff
								}, null, 8, [
									"class",
									"agent-id",
									"project-id",
									"preview-session-id",
									"preview-open",
									"preview-chat-target",
									"pending"
								])) : createCommentVNode("", true),
								(openBlock(true), createElementBlock(Fragment, null, renderList(unref(preview).viewedBrowserTabs.value, (browserTab) => {
									return withDirectives((openBlock(), createBlock(InstanceAiBrowserPreview_default, {
										key: browserTab.id,
										class: normalizeClass(_ctx.$style.previewSlot),
										"task-id": browserTab.taskId,
										"user-action": browserTab.userAction
									}, null, 8, [
										"class",
										"task-id",
										"user-action"
									])), [[vShow, unref(preview).isPreviewVisible.value && unref(preview).activeBrowserTab.value?.id === browserTab.id]]);
								}), 128)),
								(openBlock(true), createElementBlock(Fragment, null, renderList(openSkillTabs.value, (tab) => {
									return openBlock(), createBlock(KeepAlive, { key: tab.id }, [unref(preview).isPreviewVisible.value && unref(preview).activeSkillId.value === tab.id ? (openBlock(), createBlock(InstanceAiSkillPreview_default, {
										key: 0,
										class: normalizeClass(_ctx.$style.previewSlot),
										"skill-id": tab.id,
										"refresh-key": unref(preview).skillRefreshKey.value
									}, null, 8, [
										"class",
										"skill-id",
										"refresh-key"
									])) : createCommentVNode("", true)], 1024);
								}), 128)),
								unref(preview).isPreviewVisible.value && unref(preview).activeApp.value ? (openBlock(), createBlock(InstanceAiAppPreview_default, {
									key: 3,
									class: normalizeClass(_ctx.$style.previewSlot),
									"project-id": unref(preview).activeApp.value.projectId,
									"app-id": unref(preview).activeApp.value.id,
									"refresh-key": unref(preview).appRefreshKey.value,
									onDeleted: unref(preview).closeTab
								}, null, 8, [
									"class",
									"project-id",
									"app-id",
									"refresh-key",
									"onDeleted"
								])) : createCommentVNode("", true)
							], 2)]),
							_: 1
						}, 8, [
							"model-value",
							"class",
							"onUpdate:modelValue"
						])]),
						_: 1
					}, 8, [
						"width",
						"min-width",
						"max-width",
						"is-resizing-enabled",
						"onResize"
					])], 14, _hoisted_4), [[vShow, unref(preview).isPreviewVisible.value]])]),
					_: 1
				}, 8, ["css"]),
				createVNode(OpenWorkflowInAssistantNotification_default, { "thread-id": __props.threadId }, null, 8, ["thread-id"])
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	threadArea: "_threadArea_hz93c_450",
	agentPreviewLayoutTransition: "_agentPreviewLayoutTransition_hz93c_460",
	builderChatHeader: "_builderChatHeader_hz93c_473",
	chromeHidden: "_chromeHidden_hz93c_477",
	chatArea: "_chatArea_hz93c_481",
	canvasArea: "_canvasArea_hz93c_491",
	canvasAreaExpanded: "_canvasAreaExpanded_hz93c_497",
	activeButton: "_activeButton_hz93c_505",
	reconnecting: "_reconnecting_hz93c_509",
	contentArea: "_contentArea_hz93c_513",
	artifactsPanelSlot: "_artifactsPanelSlot_hz93c_522",
	artifactsPanelSlotOverlay: "_artifactsPanelSlotOverlay_hz93c_535",
	contentAreaWithPinnedArtifacts: "_contentAreaWithPinnedArtifacts_hz93c_540",
	contentAreaWithoutLayoutTransitions: "_contentAreaWithoutLayoutTransitions_hz93c_544",
	previewPanel: "_previewPanel_hz93c_553",
	previewContent: "_previewContent_hz93c_559",
	previewSlot: "_previewSlot_hz93c_565",
	previewSlotHidden: "_previewSlotHidden_hz93c_570",
	shimmer: "_shimmer_hz93c_1",
	spin: "_spin_hz93c_1",
	"skeleton-pulse": "_skeleton-pulse_hz93c_1",
	opacityPulse: "_opacityPulse_hz93c_1",
	popoverIn: "_popoverIn_hz93c_1",
	fadeIn: "_fadeIn_hz93c_1",
	collapsibleSlideDown: "_collapsibleSlideDown_hz93c_1",
	collapsibleSlideUp: "_collapsibleSlideUp_hz93c_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_hz93c_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_hz93c_1",
	blurSwapIn: "_blurSwapIn_hz93c_1",
	blurSwapOut: "_blurSwapOut_hz93c_1",
	pulse: "_pulse_hz93c_1",
	pulseGlow: "_pulseGlow_hz93c_1",
	pulseGlowDelayed: "_pulseGlowDelayed_hz93c_1",
	fade: "_fade_hz93c_1",
	fadeInUp: "_fadeInUp_hz93c_1",
	fadeInDown: "_fadeInDown_hz93c_1",
	fadeInLeft: "_fadeInLeft_hz93c_1",
	fadeInRight: "_fadeInRight_hz93c_1",
	fadeOut: "_fadeOut_hz93c_1",
	fadeOutDown: "_fadeOutDown_hz93c_1",
	fadeOutUp: "_fadeOutUp_hz93c_1",
	fadeOutLeft: "_fadeOutLeft_hz93c_1",
	fadeOutRight: "_fadeOutRight_hz93c_1",
	ping: "_ping_hz93c_1",
	blinkBackground: "_blinkBackground_hz93c_1",
	typingBlink: "_typingBlink_hz93c_1"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/InstanceAiThreadRouteView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiThreadRouteView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiThreadRouteView",
	props: { threadId: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const store = useInstanceAiStore();
		const settingsStore = useInstanceAiSettingsStore();
		const agentThreadsStore = useAssistantAgentThreadsStore();
		const runtime = ref(knownAssistantThreadRuntime(props.threadId, {
			assistantAgentEnabled: settingsStore.isAssistantAgentEnabled,
			isAssistantThread: (threadId) => store.threads.some((thread) => thread.id === threadId)
		}));
		const lookupFailed = ref(false);
		async function lookUpRuntime() {
			lookupFailed.value = false;
			try {
				runtime.value = await lookUpAssistantThreadRuntime(props.threadId, async (threadId) => {
					const thread = await getSystemAgentThread(rootStore.restApiContext, ASSISTANT_AGENT_ID, threadId);
					agentThreadsStore.addOpenedThread(thread);
					return thread;
				});
			} catch {
				lookupFailed.value = true;
			}
		}
		onMounted(async () => {
			if (runtime.value) return;
			await lookUpRuntime();
		});
		return (_ctx, _cache) => {
			return runtime.value?.kind === "assistant" ? (openBlock(), createBlock(InstanceAiThreadView_default, {
				key: 0,
				"thread-id": props.threadId
			}, null, 8, ["thread-id"])) : runtime.value?.kind === "assistant-agent" ? (openBlock(), createBlock(AssistantAgentThreadView_default, {
				key: 1,
				"thread-id": props.threadId,
				"project-id": runtime.value.projectId
			}, null, 8, ["thread-id", "project-id"])) : lookupFailed.value ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.status),
				role: "alert",
				"data-test-id": "instance-ai-thread-route-error"
			}, [createVNode(unref(N8nText_default), null, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.thread.loadError")), 1)]),
				_: 1
			}), createVNode(unref(N8nButton_default), {
				variant: "outline",
				size: "small",
				"data-test-id": "instance-ai-thread-route-retry",
				onClick: lookUpRuntime
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
				_: 1
			})], 2)) : (openBlock(), createElementBlock("div", {
				key: 3,
				class: normalizeClass(_ctx.$style.status),
				"data-test-id": "instance-ai-thread-route-loading"
			}, [createVNode(unref(N8nSpinner_default), { size: "large" })], 2));
		};
	}
}), [["__cssModules", { "$style": { status: "_status_154yg_1" } }]]);
//#endregion
export { InstanceAiThreadRouteView_default as default };
