const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/AssistantConfirmationCard-bHQqcJLQ.js","assets/vendor-Hx42-oQF.js","assets/rolldown-runtime-EITvVbkG.js","assets/vendor-CB64RKTG.css","assets/app-D5flEmb-.js","assets/app-jHnVG3bN.css","assets/useApprovalCardLabels-CDqp7YoU.js","assets/InstanceAiWorkflowSetup-DBV6NWQo.js","assets/AgentPersonalisationIcon-e0gl5zLq.js","assets/AgentPersonalisationIcon-BBonwVeH.css","assets/toolDisplayName-C5txb6dB.js","assets/CredentialsDropdown-nSv7g1B1.js","assets/CredentialsDropdown-TDtMaTo5.css","assets/AgentCredentialSelect-DlxHWwBS.js","assets/AgentCredentialSelect-FnlrPUIH.css","assets/useAgentProjectBreadcrumb-VTuNETiM.js","assets/agents.eventBus-DIO3iH52.js","assets/FreeAiCreditsCallout-DX3YcSkq.js","assets/useFreeAiCredits-D2CXiIAV.js","assets/AgentModal-DCnB4PUf.js","assets/AgentModal-fyGPe6v6.css","assets/ToolCredentialPicker-Clmo6S9M.js","assets/ToolCredentialPicker-BHbwUT90.css","assets/ToolIcon-JHi_v9xF.js","assets/ToolIcon-BjwIJ6B5.css","assets/useAgentConfirmationModal-3kW3PApn.js","assets/mcpRegistryIcon-BDkbIdlc.js","assets/AgentFormSettingRow-Bt9I4Pbf.js","assets/AgentFormSettingRow-B-ehOR7Z.css","assets/instanceAiMcp.store-DclLlpUY.js","assets/mcpRegistry.api-Ck2JWrEp.js","assets/useMcpServerConnect-D4-BWFpf.js","assets/useBrowserUseConnection-DnUBZV8R.js","assets/useExtensionDirectConnect-DyzoSYRV.js","assets/templatedAuth.utils-BSmmAPGQ.js","assets/useInstanceAiCredentialHelp-3exi7OdU.js","assets/useAgentAssistantCredentialHelp-RmZi0Ada.js","assets/InstanceAiWorkflowSetup-BH3v6Fgg.css","assets/AssistantConfirmationCard-C4Bygo-I.css"])))=>i.map(i=>d[i]);
import { o as __toESM } from "./rolldown-runtime-EITvVbkG.js";
import { $a as objectType, $d as init_runtime_core_esm_bundler, $u as useStorage, Ad as vModelText, Au as useDocumentVisibility, Bd as createBlock, Cd as TransitionGroup, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Gf as toRaw, Hd as createElementBlock, Hf as shallowReactive, If as isRef, Il as CollapsibleTrigger_default, Iu as useEventListener, Jd as defineComponent, Jf as toValue, Jo as onBeforeRouteUpdate, Kd as createVNode, Kf as toRef, Ku as usePreferredReducedMotion, Ld as Teleport, Md as withKeys, Mf as getCurrentScope, Nd as withModifiers, Nf as init_reactivity_esm_bundler, Oa as v4, Od as useCssModule, Of as withDirectives, Pd as Fragment, Pu as useElementSize, Rd as computed, Rf as onScopeDispose, Rl as CollapsibleRoot_default, Sd as Transition, Sf as useSlots, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Ud as createSlots, Vd as createCommentVNode, Vf as ref, Vu as useLocalStorage, Wu as useNow, Xf as unref, Xo as useRouter, Yo as useRoute, Zd as h, _p as normalizeClass, _u as StorageSerializers, bd as I18nT, bf as useId, do as storeToRefs, ef as inject, ff as openBlock, hf as renderSlot, if as nextTick, ip as init_shared_esm_bundler, jd as vShow, lf as onMounted, lo as defineStore, md as useIntervalFn, mf as renderList, nf as mergeModels, nu as ElSkeletonItem, of as onBeforeUnmount, pd as useDebounceFn, pf as provide, qd as defineAsyncComponent, qo as onBeforeRouteLeave, rf as mergeProps, to as stringType, uf as onUnmounted, vf as resolveDynamicComponent, xf as useModel, xr as require_FileSaver_min, yp as normalizeStyle, ys as TagsInputInput_default, zd as createBaseVNode, zf as reactive, zo as require_dateformat } from "./vendor-Hx42-oQF.js";
import { $A as N8nInlineTextEdit_default, $E as N8N_CHAT_INTEGRATION_TYPE, $M as DropdownMenu_default, $S as TIME, $T as addMissingAgentPersonalisation, $m as AGENT_DESCRIPTION_MODAL_KEY, AA as TagsInput_default, Ah as AGENT_PREVIEW_VIEW, Ai as useInstanceAiSettingsStore, At as provisionSubjectThread, Bo as listAgentVersions, CN as updatedIconSet, Ct as consumePendingFirstMessage, DN as __vitePreload, Dh as TOOL_CALL_STATE, Di as createArtifactPreviewMemory, Dt as getPendingComposerDraft, EA as STORES, ED as WORKFLOW_BUILDER_TOOL_NAMES, EN as toMb, Ei as isAgentEditingWorkflow, Et as getPendingAgentAttachment, Ft as stashPendingHandoffContext, Fw as makeRestApiRequest, G as useOpenWorkflowInAssistantStore, GA as DialogDescription_default, GD as isAgentModelProvider, Gt as useMCPStore, Gw as AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS, HS as TEST_BUTTON_PRIMARY_COLOR_EXPERIMENT, Hc as CredentialIcon_default, IM as CanvasPill_default, Ic as unsavedAgentIds, JA as DialogHeader_default, JE as workflowsArchivedPayloadSchema, JM as useDropdownSearch, Jg as useUIStore, Ji as undoPreferenceCard, Jo as listSystemAgentThreads, Jr as useInstanceAiStore, KA as Dialog_default, KD as isDraftIntegration, KS as AGENT_EXTERNAL_UPDATE_NOTICE_DURATION, Kd as useDocumentTitle, Kr as useAgentPermissions, LD as DEFAULT_AGENT_PERSONALISATION, LM as N8nCallout_default, Lc as useCreateAgent, Lt as USER_TYPED_MESSAGE, MT as ANTHROPIC_CACHE_TTL_OPTIONS, Mh as AGENT_SESSION_DETAIL_VIEW, Mj as ChatMessage_default, Mn as convertToDisplayDate, Mp as useCredentialsStore, Mt as stashPendingComposerDraft, Mw as ResponseError, ND as resolveBuilderToolName, NE as confirmationRequestPayloadSchema, NM as N8nCard_default, Nj as N8nPopover_default, OE as INSTANCE_AI_THREAD_SOURCE_FALLBACK, Oi as EMPTY_ASSISTANT_MENTION_COUNTS, Ot as getPendingHandoffContext, PD as unwrapToolCatalogCall, Ph as PROJECT_AGENTS, Po as getSystemAgentThread, Pt as stashPendingFirstMessage, QM as useDeviceSupport, Qa as createAgent, Qi as ASSISTANT_AGENT_THREAD_ID, Qm as AGENT_DEFAULT_PANEL_WIDTH_RATIO, RD as MANAGED_CREDENTIAL_TOKEN, RT as getModelPromptCachingCapability, Rc as useAgentTelemetry, Rk as jsonParse, Ro as listAgentMemoryEntries, Rt as resolveAuthorship, Ru as usePageRedirectionHelper, SM as N8nHeading_default, SN as _plugin_vue_export_helper_default, Sh as PENDING_AGENT_STARTER_STATE, St as consumePendingDraftAttachment, TD as SHARED_BUILDER_TOOL_NAMES, TN as formatMbOrGb, Ti as isAgentEditingAgent, Tj as N8nResizeWrapper_default, Ty as getAgentBuilderExperimentEnrollment, UA as DialogFooter_default, UM as ApprovalCard_default, Ui as editPreferenceCard, VD as AGENT_REASONING_LEVELS, VE as instanceAiEventSchema, Vr as useClipboard, W as AGENTS_MODALS, WA as DialogBody_default, WE as setupItemsPayloadSchema, Wp as useWorkflowsListStore, Wt as useMcp, Ww as AGENT_EVAL_MAX_COMMENT_CHARS, XA as VisuallyHidden_default, XM as N8nActionDropdown_default, Xc as usePushConnectionStore, Xi as ASSISTANT_AGENT_ID, YM as N8nActionToggle_default, Yi as ASSISTANT_AGENT_ACCEPTED_MIME_TYPES, Yo as moveAgent, Yr as useThread, ZA as isRecord, ZD as webhookAuthentication, Zi as ASSISTANT_AGENT_PROJECT_ID, Zr as countAttachedNodes, _C as useUsersStore, _N as N8nText_default, _i as getLatestAgentConfigMutation, _s as canWriteProjectScope, _t as clearPendingAgentAttachment, aM as N8nHoverCard_default, aa as lookUpAssistantThreadRuntime, ad as useInstanceAiAvailable, ai as getThreadDisplayTitle, aj as N8nUserStack_default, an as CreditWarningBanner_default, bC as useRootStore, bD as AGENT_BUILDER_TOOL_NAMES, bN as N8nSpinner_default, bh as OPEN_PREVIEW_PARAM, bj as N8nSlider_default, bt as clearPendingThreadHandoff, cN as Input_default, ch as AGENT_TASK_MODAL_KEY, ci as instanceAiResponseNow, co as getAgent, dC as useToast, dM as N8nSwitch_default, dh as AGENT_UNPUBLISHED_WORKFLOWS_MODAL_KEY, dj as AiActivityStepResultSection_default, ds as updateAgentVersion, eE as resolveAgentPersonalisation, eM as N8nInputNumber_default, eN as DropdownMenuItem_default, ei as getAgentBuilderTargetFromThreadMetadata, eo as createAgentTask, fM as Switch_default, fN as N8nTooltip_default, fh as AGENT_VECTOR_STORES_MODAL_KEY, gM as N8nInputLabel_default, gh as EXECUTIONS_SECTION_KEY, gj as N8nTimeAgo_default, gt as buildInstanceAiCredentialQuestion, hC as useTelemetry, hh as CONTINUE_SESSION_ID_PARAM, hj as AiActivityStepButton_default, ho as getAgentMemorySourceFacets, hs as canWriteInstanceScope, ht as buildInstanceAiCredentialHandoffContext, iE as MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES, iO as aiPreferenceTargetOf, ia as knownAssistantThreadRuntime, ik as isUnknownArray, io as deleteAgentTask, jE as appBlueprintSchema, jN as useI18n, jc as INSTANCE_AI_VIEW, jj as N8nChatScrollArea_default, jt as stashPendingAgentAttachment, kc as INSTANCE_AI_THREAD_VIEW, kh as AGENT_BUILDER_VIEW, kj as N8nSegmentControl_default, kt as getPendingWorkflowAttachment, li as observeInstanceAiResponseRender, ln as KeyboardShortcutTooltip_default, ls as updateAgentSkill, mM as N8nOption_default, mN as truncate, mh as ASSISTANT_THREAD_PARAM, mi as getActiveSelectedAgentIds, mj as AiActivityStepChevron_default, mo as getAgentConfigValidation, n as isEmbedSubject, nE as ALLOWED_AGENT_FILE_EXTENSIONS, nN as N8nBadge_default, nO as aiPreferenceContentSchema, nh as AGENT_JSON_IMPORT_MODAL_KEY, nj as N8nIconPicker_default, o as useAssistantAgentThreadsStore, oa as markAssistantAgentLaunch, od as useInstanceAiReady, oi as messageApprovalMode, pC as useStorage$1, pM as N8nSelect_default, pi as useResourceRegistry, pj as AnimatedCollapsibleContent_default, pt as buildInstanceAiAgentPreviewHandoffContext, qA as DialogTitle_default, qE as tasksUpdatePayloadSchema, qS as AGENT_PROMPT_INSPIRATION_TIMING, qr as provideThread, r as threadTargetsSubject, rE as MAX_AGENT_FILE_SIZE_BYTES, rO as aiPreferenceScopeSchema, ra as isKnownAssistantAgentThread, ro as deleteAgentMemoryEntry, sC as useAssistantTopUpEligibility, sN as ChatActions_default, sa as rememberAssistantAgentThread, si as threadTargetsAgent, t as INSTANCE_AI_EMBED_SUBJECT_KEY, tN as N8nLoading_default, tO as AI_PREFERENCE_CONTENT_MAX_LENGTH, th as AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE, tj as N8nBreadcrumbs_default, to as deleteAgent, tp as useTypeAvailability, ts as revertAgentToVersion, uM as N8nFormInput_default, uN as AttachmentGroup_default, uf as useNodeTypesStore, uj as AiActivityStep_default, uo as getAgentBudgetSpend, vN as N8nIconButton_default, vS as AGENT_BUILDER_CHAT_WIDTH_EXPERIMENT, vh as N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS, vm as useProjectsStore, vo as getAgentTasks, vt as clearPendingComposerDraft, vy as usePostHog, wD as REMOVED_BUILDER_TOOL_NAMES, wM as TableBase_default, w_ as DEFAULT_PROJECT_ICON, wt as consumePendingRedirectLanding, wy as TELEMETRY_EVENT, xM as N8nEmptyState_default, xN as N8nIcon_default, xh as PENDING_AGENT_ID_STATE, xo as getAgentWriteLock, xt as clearPendingWorkflowAttachment, xu as useDataTableStore, xy as redactTelemetryProperties, yC as useSettingsStore, yN as N8nButton_default, yS as AGENT_BUILDER_TEST_TOGGLE_EXPERIMENT, yc as INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY, yh as NEW_SESSION_PARAM, yj as Tabs_default, ym as useFavoritesStore, ys as isContextPreferencesEnabled, yt as clearPendingHandoffContext, yy as getDebounceTime, zD as SUB_AGENT_TASK_DIFFICULTIES, zE as instanceAiConfirmationSeveritySchema, zc as useAgentsN8nChatFlag, zo as listAgentPublishHistory } from "./app-D5flEmb-.js";
import { t as useKeybindings } from "./useKeybindings-DShLgy_J.js";
import { t as N8nChatHintPopover_default } from "./N8nChatHintPopover-C-g8mfwE.js";
import { t as AgentPersonalisationIcon_default } from "./AgentPersonalisationIcon-e0gl5zLq.js";
import { i as useArtifactLinks, n as buildAgentTestHref, t as ChatMarkdown_default } from "./ChatMarkdown-CnSVNFpG.js";
import { n as getVersionLabel, t as generateVersionLabelFromId } from "./useWorkflowVersionLabel-cYv19BC7.js";
import { _ as useAgentProjectId, a as AgentSkillsSection_default, c as AgentChipButton_default, d as modelToString, f as parseModelString, g as agent_panel_module_default, h as useAgentModelCredentials, i as AgentCapabilitiesSection_default, l as AgentInfoPanel_default, m as useModelCatalog, n as isPersistedSave, o as AgentItemContextMenu_default, p as sanitizeModelId, r as useAgentConfigAutosave, s as AgentChipRow_default, t as useAgentCapabilitiesActions, u as AgentModelSelector_default, v as AgentPanel_default } from "./useAgentCapabilitiesActions-Bo0Gma2X.js";
import { i as useProjectAgentsList, n as removeProjectAgentFromListCache, r as upsertProjectAgentsListCache } from "./useProjectAgentsList-yCWZeTO1.js";
import { a as unpublishedWorkflowTools, t as hasBlockingIssues } from "./validationIssues-CnPTm-2x.js";
import { n as resolveAgentValidationIssueMessageKey } from "./agentValidationIssueMessages-BhJ6yEAa.js";
import { t as useAgentProjectBreadcrumb } from "./useAgentProjectBreadcrumb-VTuNETiM.js";
import { t as agentsEventBus } from "./agents.eventBus-DIO3iH52.js";
import { t as useAgentConfig } from "./useAgentConfig-BZ4ZXuth.js";
import { t as useActivityDetection } from "./useActivityDetection-C5YwTv_h.js";
import { t as AgentModal_default } from "./AgentModal-DCnB4PUf.js";
import { t as AgentModalMultiStep_default } from "./AgentModalMultiStep-83xh6J77.js";
import { a as describeSchedule, c as getNextScheduleOccurrence, n as AgentValidationTooltip_default, t as AgentTestButton_default } from "./AgentTestButton-HEwBVmUv.js";
import { n as AGENT_CONFIG_WRITE_KEY, t as AGENT_BUILDER_STANDALONE_KEY } from "./agentBuilderInjectionKeys-DvUElIHc.js";
import { t as useAgentConfirmationModal } from "./useAgentConfirmationModal-3kW3PApn.js";
import { t as AgentFormSettingRow_default } from "./AgentFormSettingRow-Bt9I4Pbf.js";
import { t as AgentApprovalSelector_default } from "./AgentApprovalSelector-BEv8kXQY.js";
import { n as AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS } from "./vector-stores-4QgyIYTL.js";
import { a as buildAgentChangeRequestPrompt, c as AgentChatToolSteps_default, d as isNotFoundError, i as useRelativeTimestamp, l as AiThinkingBlock_default, n as buildAgentConfigFingerprint, o as buildAgentFixWithAssistantPrompt, r as deriveAgentStatus, s as AgentMarkdownChunk_default, t as AgentChatPanel_default, u as AiReasoningBlock_default } from "./AgentChatPanel-D1FZE16O.js";
import { i as InstanceAiResourceChip_default, n as ChatHistoryDropdown_default, t as ChatHistoryDropdownTrigger_default } from "./ChatHistoryDropdownTrigger-DTXXSxT4.js";
import { _ as monthlyBudgetSave, b as sessionCapSave, f as useAgentExecutionUpdates, h as increasedBudgetConfig, m as formatBudgetUsd, v as parseBudgetAmount, x as snapAlertPercent, y as raisedBudgetCaps } from "./ToolApprovalCard-Dt5UQ-1j.js";
import { t as hasAgentUnpublishedChanges } from "./agentPublication-B0tlGvRZ.js";
import { t as useApprovalCardLabels } from "./useApprovalCardLabels-CDqp7YoU.js";
import { t as useN8nAssistantIdentity } from "./useN8nAssistantIdentity-DseCiekY.js";
import { a as AGENT_TEMPLATE_SUGGESTIONS_VERSION, c as isAgentStarter, i as AGENT_TEMPLATES, l as useAgentArchive, n as useAgentPublish, o as applyAgentTemplate, r as useAgentVersionMetadataModal, s as isAgentConfigBlank, t as AgentTemplateList_default, u as AgentFolderDialog_default } from "./AgentTemplateList-CZUUs0fS.js";
import { A as createAgentChannelRuntime, B as useAgentIntegrationsCatalog, C as getToolIcon, D as useAgentChannelSetup, E as useAssistantAgentSetupSavedTelemetry, F as fileAccessJustApproved, I as provideAgentPersonalisation, L as syncAgentIntegrationStatusCache, M as useWhatsAppMetaStatus, N as metaTitleKey, O as useAgentChannelRemoval, P as presentWhatsAppMetaState, R as useAgentIntegrationStatus, S as trackInputCompleted, T as ASSISTANT_AGENT_SETUP_SAVED, _ as mcpConnectInputs, a as GatewayResourceDecision_default, b as testListenerInputs, c as formatApprovalDetails, f as AppBlueprintCard_default, g as getConfirmationType, h as continueInputs, i as InstanceAiChannelSetup_default, j as getAgentChannelPlatform, k as agentChannelPlatforms, l as formatApprovalTitle, m as approvalInputs, n as InstanceAiQuestions_default, p as appBlueprintInputs, r as InstanceAiCredentialSetup_default, s as DomainAccessApproval_default, t as InstanceAiWorkflowSetup_default, u as InstanceAiMcpConnectCard_default, v as questionsInputs, w as useToolLabel, x as textInputs, y as skippedTextInputs, z as useN8nChatChannel } from "./InstanceAiWorkflowSetup-DBV6NWQo.js";
import { n as useThreadTitle, r as useAgentSessionsStore } from "./useAgentSessionStop-CtqFqela.js";
import { t as useAgentFolderBreadcrumb } from "./useAgentFolderBreadcrumb-BeD-Ouo7.js";
import { t as AgentSessionsListView_default } from "./AgentSessionsListView-CxXKm9PK.js";
import { t as CredentialPicker_default } from "./CredentialPicker-QRMIIfvA.js";
import { n as formatAgentUsage, r as useAgentSessionLangSmithExport, t as useAgentSessionUsage } from "./useAgentSessionUsage-dxTyKbg6.js";
import { t as useIntersectionObserver } from "./useIntersectionObserver-BTGMngAL.js";
import "./useIntersectionObserver-CVH8U9lD.js";
import { t as formatPublicationDuration } from "./publicationHistoryUtils-CnuI4Tp_.js";
import { t as useAssistantCreditsStore } from "./assistantCredits.store-C3Z2lAHs.js";
import { a as CloudBrowserTasksKey, d as isCloudBrowserAgent, f as isCloudBrowserResourceDecision, n as WorkflowBuilderUnavailableNotice_default, p as InstanceAiViewHeader_default, r as InstanceAiInput_default, s as AttachmentPreview_default, t as LimitedModeNotice_default, u as useCreditWarningBanner } from "./LimitedModeNotice-Ct2kcHcR.js";
import { t as useContextStore } from "./context.store-NJvocoDO.js";
import { n as autoApprovalReason, t as autoApprovalLabel } from "./autoApproval-DF-5zwLk.js";
import { t as useInstanceContextLabel } from "./instanceContextLabels-C2EvhBog.js";
//#region src/features/agents/composables/useAgentPromptInspiration.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
function useAgentPromptInspiration(options) {
	const placeholder = ref();
	const visibility = useDocumentVisibility();
	const reducedMotion = usePreferredReducedMotion();
	let timer;
	function clearTimer() {
		clearTimeout(timer);
		timer = void 0;
	}
	watch([
		() => toValue(options.enabled),
		() => toValue(options.prompts),
		visibility,
		reducedMotion
	], ([enabled, prompts, visible, motion]) => {
		clearTimer();
		placeholder.value = void 0;
		const examples = prompts.filter((prompt) => prompt.length > 0).map((prompt) => [...prompt]);
		const first = examples[0];
		if (!enabled || !first) return;
		if (motion === "reduce") {
			placeholder.value = first.join("");
			return;
		}
		if (visible !== "visible") return;
		let index = 0;
		let length = 0;
		let erasing = false;
		placeholder.value = "";
		function tick() {
			const prompt = examples[index];
			length += erasing ? -1 : 1;
			placeholder.value = prompt.slice(0, length).join("");
			let delay = erasing ? AGENT_PROMPT_INSPIRATION_TIMING.ERASE : AGENT_PROMPT_INSPIRATION_TIMING.TYPE;
			if (!erasing && length === prompt.length) {
				erasing = true;
				delay = AGENT_PROMPT_INSPIRATION_TIMING.HOLD;
			} else if (erasing && length === 0) {
				erasing = false;
				index = (index + 1) % examples.length;
				delay = AGENT_PROMPT_INSPIRATION_TIMING.TYPE;
			}
			timer = setTimeout(tick, delay);
		}
		timer = setTimeout(tick, AGENT_PROMPT_INSPIRATION_TIMING.TYPE);
	}, { immediate: true });
	onScopeDispose(clearTimer);
	return { placeholder };
}
//#endregion
//#region src/experiments/agentBuilder/stores/agentBuilder.store.ts
init_runtime_core_esm_bundler();
var useAgentBuilderExperimentStore = defineStore(STORES.EXPERIMENT_AGENT_BUILDER, () => {
	const posthog = usePostHog();
	const enrollment = computed(() => getAgentBuilderExperimentEnrollment(posthog.getVariant));
	const isEnabled = computed(() => enrollment.value !== void 0);
	const layout = computed(() => ({
		chatWidth: enrollment.value?.variant === AGENT_BUILDER_CHAT_WIDTH_EXPERIMENT.wide || enrollment.value?.variant === AGENT_BUILDER_TEST_TOGGLE_EXPERIMENT.wide ? "wide" : "current",
		testChat: enrollment.value?.variant === AGENT_BUILDER_TEST_TOGGLE_EXPERIMENT.wide || enrollment.value?.variant === AGENT_BUILDER_TEST_TOGGLE_EXPERIMENT.current ? "inline" : "dock"
	}));
	function trackExposure() {
		if (enrollment.value) posthog.trackExposure(enrollment.value.name);
	}
	return {
		enrollment,
		isEnabled,
		layout,
		trackExposure
	};
});
//#endregion
//#region ../../@n8n/utils/src/promise/deferred-promise.ts
function createDeferredPromise() {
	const deferred = {};
	deferred.promise = new Promise((resolve, reject) => {
		deferred.resolve = resolve;
		deferred.reject = reject;
	});
	return deferred;
}
//#endregion
//#region src/features/agents/utils/agentSectionEditor.utils.ts
init_reactivity_esm_bundler();
/** Copy JSON config without removing input names or reading Vue proxy methods. */
function copyAgentConfig(config) {
	return jsonParse(JSON.stringify(config, (_key, value) => toRaw(value)));
}
//#endregion
//#region src/features/agents/composables/useKnowledgeApi.ts
var listAgentFiles = async (context, projectId, agentId) => {
	return await makeRestApiRequest(context, "GET", `/projects/${projectId}/agents/v2/${agentId}/files`);
};
var uploadAgentFiles = async (context, projectId, agentId, files) => {
	const formData = new FormData();
	for (const file of files) formData.append("files", file);
	return await makeRestApiRequest(context, "POST", `/projects/${projectId}/agents/v2/${agentId}/files`, formData);
};
var deleteAgentFile = async (context, projectId, agentId, fileId) => {
	await makeRestApiRequest(context, "DELETE", `/projects/${projectId}/agents/v2/${agentId}/files/${fileId}`);
};
var warmAgentKnowledgeSandbox = async (context, projectId, agentId) => {
	return await makeRestApiRequest(context, "POST", `/projects/${projectId}/agents/v2/${agentId}/sandbox/knowledge/warmup`);
};
//#endregion
//#region src/features/agents/composables/useAgentKnowledge.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The limits the backend enforces at default configuration. Used when the
* module settings carry no `knowledge` entry, which only happens while the
* knowledge module is off, so no upload reaches these checks then.
*/
var DEFAULT_UPLOAD_LIMITS = {
	maxFileSizeBytes: MAX_AGENT_FILE_SIZE_BYTES,
	maxFilesPerUpload: 10,
	maxTotalSizeBytes: MAX_AGENT_KNOWLEDGE_BASE_SIZE_BYTES
};
/**
* The knowledge files of the agent open in the builder: the list, the upload
* with its client-side checks, the deletion and the sandbox warm-up. The host
* owns the agent and project identity and hands over its guards.
*/
function useAgentKnowledge(deps) {
	const locale = useI18n();
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const { showError, showMessage } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	/** The upload limits the backend enforces, so the client rejects the same uploads first. */
	const uploadLimits = computed(() => settingsStore.moduleSettings.knowledge?.limits ?? DEFAULT_UPLOAD_LIMITS);
	const agentFiles = ref([]);
	const agentFilesLoading = ref(false);
	const agentFilesUploading = ref(false);
	const deletingAgentFileId = ref(null);
	const lastKnowledgeSandboxWarmupKey = ref(null);
	async function fetchAgentFiles(targetProjectId = deps.projectId.value, targetAgentId = deps.agentId.value) {
		if (!deps.isKnowledgeBaseEnabled.value) return;
		agentFilesLoading.value = true;
		try {
			const files = await listAgentFiles(rootStore.restApiContext, targetProjectId, targetAgentId);
			if (deps.isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			agentFiles.value = files;
		} catch (error) {
			showError(error, locale.baseText("agents.builder.files.loadError"));
		} finally {
			if (!deps.isStaleAgentTarget(targetProjectId, targetAgentId)) agentFilesLoading.value = false;
		}
	}
	async function uploadFiles(files) {
		if (files.length === 0) return;
		deps.telemetry.trackStartedFileUpload(files.length);
		const { maxFileSizeBytes, maxFilesPerUpload, maxTotalSizeBytes } = uploadLimits.value;
		const oversizedFiles = files.filter((file) => file.size > maxFileSizeBytes);
		if (oversizedFiles.length > 0) showError(new Error(locale.baseText("agents.builder.files.uploadFileTooLarge.message", { interpolate: {
			name: oversizedFiles[0].name,
			size: String(toMb(maxFileSizeBytes))
		} })), locale.baseText("agents.builder.files.uploadFileTooLarge.title"));
		const filesWithinLimit = files.filter((file) => file.size <= maxFileSizeBytes);
		if (filesWithinLimit.length === 0) {
			deps.telemetry.trackRejectedFileUpload("file_size", oversizedFiles.length);
			return;
		}
		if (filesWithinLimit.length > maxFilesPerUpload) {
			deps.telemetry.trackRejectedFileUpload("too_many_files", filesWithinLimit.length);
			showError(new Error(locale.baseText("agents.builder.files.uploadTooManyFiles.message", { interpolate: { max: String(maxFilesPerUpload) } })), locale.baseText("agents.builder.files.uploadTooManyFiles.title"));
			return;
		}
		if (agentFiles.value.reduce((total, file) => total + file.fileSizeBytes, 0) + filesWithinLimit.reduce((total, file) => total + file.size, 0) > maxTotalSizeBytes) {
			deps.telemetry.trackRejectedFileUpload("total_limit", filesWithinLimit.length);
			showError(new Error(locale.baseText("agents.builder.files.uploadTotalTooLarge.message", { interpolate: { size: formatMbOrGb(maxTotalSizeBytes) } })), locale.baseText("agents.builder.files.uploadTotalTooLarge.title"));
			return;
		}
		if (oversizedFiles.length > 0) deps.telemetry.trackRejectedFileUpload("file_size", oversizedFiles.length);
		const targetProjectId = deps.projectId.value;
		const targetAgentId = deps.agentId.value;
		agentFilesUploading.value = true;
		try {
			await deps.ensureAgentPersisted();
			const uploadedFiles = await uploadAgentFiles(rootStore.restApiContext, targetProjectId, targetAgentId, filesWithinLimit);
			if (deps.isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			const existingById = new Map(agentFiles.value.map((file) => [file.id, file]));
			for (const file of uploadedFiles) existingById.set(file.id, file);
			agentFiles.value = Array.from(existingById.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
			showMessage({
				title: locale.baseText("agents.builder.files.uploaded"),
				type: "success"
			});
		} catch (error) {
			showError(error, locale.baseText("agents.builder.files.uploadError"));
		} finally {
			if (!deps.isStaleAgentTarget(targetProjectId, targetAgentId)) agentFilesUploading.value = false;
		}
	}
	async function deleteFile(file) {
		if (deletingAgentFileId.value !== null) return;
		if (await openAgentConfirmationModal({
			title: locale.baseText("agents.builder.files.deleteModal.title", { interpolate: { name: file.fileName } }),
			description: locale.baseText("agents.builder.files.deleteModal.description", { interpolate: { name: file.fileName } }),
			confirmButtonText: locale.baseText("agents.builder.files.deleteModal.button.delete"),
			cancelButtonText: locale.baseText("generic.cancel")
		}) !== "confirm") return;
		const targetProjectId = deps.projectId.value;
		const targetAgentId = deps.agentId.value;
		deletingAgentFileId.value = file.id;
		try {
			await deleteAgentFile(rootStore.restApiContext, targetProjectId, targetAgentId, file.id);
			if (deps.isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			agentFiles.value = agentFiles.value.filter((agentFile) => agentFile.id !== file.id);
			showMessage({
				title: locale.baseText("agents.builder.files.deleted"),
				type: "success"
			});
		} catch (error) {
			showError(error, locale.baseText("agents.builder.files.deleteError"));
		} finally {
			if (deletingAgentFileId.value === file.id) deletingAgentFileId.value = null;
		}
	}
	function warmKnowledgeSandbox() {
		if (!deps.initialized.value || !deps.isKnowledgeBaseEnabled.value || !deps.agent.value) return;
		if (deps.isUnsaved.value) return;
		const targetProjectId = deps.projectId.value;
		const targetAgentId = deps.agentId.value;
		const warmupKey = `${targetProjectId}:${targetAgentId}`;
		if (lastKnowledgeSandboxWarmupKey.value === warmupKey) return;
		lastKnowledgeSandboxWarmupKey.value = warmupKey;
		warmAgentKnowledgeSandbox(rootStore.restApiContext, targetProjectId, targetAgentId).catch(() => {
			if (!deps.isStaleAgentTarget(targetProjectId, targetAgentId)) lastKnowledgeSandboxWarmupKey.value = null;
		});
	}
	/** Clears the files state when the host switches to another agent. */
	function reset() {
		agentFiles.value = [];
		agentFilesLoading.value = false;
		agentFilesUploading.value = false;
		deletingAgentFileId.value = null;
	}
	return {
		uploadLimits,
		agentFiles,
		agentFilesLoading,
		agentFilesUploading,
		deletingAgentFileId,
		fetchAgentFiles,
		uploadFiles,
		deleteFile,
		warmKnowledgeSandbox,
		reset
	};
}
//#endregion
//#region src/features/agents/composables/useAgentBuilderTelemetry.ts
/**
* The config says which channels exist, not whether they are running — only the
* status endpoint knows that. A published agent's channels are therefore seeded
* as `starting` rather than `connected`: claiming connected here is what let a
* channel that never started show a green dot until something refetched.
*/
function integrationStatusEntriesFromConfig(config, knownTriggerTypes, isPublished) {
	const knownTypes = new Set(knownTriggerTypes);
	const entries = [];
	for (const integration of config?.integrations ?? []) {
		if (!knownTypes.has(integration.type)) continue;
		entries.push({
			type: integration.type,
			credentialId: integration.credentialId,
			..."settings" in integration ? { settings: integration.settings } : {},
			..."approval" in integration && integration.approval ? { approval: integration.approval } : {},
			status: isPublished ? "starting" : "configured"
		});
	}
	return entries;
}
function useAgentBuilderTelemetry(deps) {
	const agentTelemetry = useAgentTelemetry();
	function snapshot() {
		return {
			agentId: deps.agentId.value,
			status: deriveAgentStatus(deps.agent.value),
			config: deps.localConfig.value
		};
	}
	/**
	* Compute the fingerprint before each event. Ignore failures so telemetry
	* does not interrupt editing. Track calls also handle errors in `useAgentTelemetry`.
	*/
	function withFingerprint(config, triggers, emit, additionalConfiguredTriggers = []) {
		(async () => {
			try {
				const fp = await buildAgentConfigFingerprint(config, triggers, additionalConfiguredTriggers);
				emit(fp.config_version, fp.triggers);
			} catch {}
		})();
	}
	function trackTriggerAdded(payload) {
		const s = snapshot();
		withFingerprint(s.config, payload.triggers, (configVersion, configuredTriggers) => {
			agentTelemetry.trackAddedTrigger({
				agentId: s.agentId,
				triggerType: payload.triggerType,
				triggers: configuredTriggers,
				configVersion,
				status: s.status
			});
		}, [payload.triggerType]);
	}
	function trackTriggerRemoved(payload) {
		const s = snapshot();
		withFingerprint(s.config, payload.triggers, (configVersion, configuredTriggers) => {
			agentTelemetry.trackRemovedTrigger({
				agentId: s.agentId,
				triggerType: payload.triggerType,
				triggers: configuredTriggers,
				configVersion,
				status: s.status
			});
		});
	}
	/**
	* Eagerly derive configured trigger types so telemetry fingerprints are
	* accurate even if the user never opens the Triggers section of the
	* settings sidebar. Integrations are already part of the fetched agent
	* config, so this does not need a separate integration-status request.
	*/
	async function fetchInitialTriggersBaseline(knownTriggerTypes) {
		const integrations = integrationStatusEntriesFromConfig(deps.localConfig.value, knownTriggerTypes, !!deps.agent.value?.activeVersionId);
		const configured = integrations.map((integration) => integration.type).sort();
		const configuredIntegrations = integrations.filter((integration) => !isDraftIntegration(integration));
		syncAgentIntegrationStatusCache(deps.projectId.value, deps.agentId.value, knownTriggerTypes, configuredIntegrations, integrations.filter((integration) => isDraftIntegration(integration)));
		return configured;
	}
	function trackOpenedToolFromList(toolType) {
		agentTelemetry.trackOpenedToolFromList({
			agentId: deps.agentId.value,
			toolType
		});
	}
	function trackOpenedSkillFromList(skillId) {
		agentTelemetry.trackOpenedSkillFromList({
			agentId: deps.agentId.value,
			skillId
		});
	}
	function trackOpenedAddSkillModal() {
		agentTelemetry.trackOpenedAddSkillModal({ agentId: deps.agentId.value });
	}
	function trackOpenedKnowledgeTab() {
		agentTelemetry.trackOpenedKnowledgeTab({ agentId: deps.agentId.value });
	}
	function trackStartedFileUpload(fileCount) {
		agentTelemetry.trackStartedAddingKnowledge({
			agentId: deps.agentId.value,
			kind: "file",
			fileCount
		});
	}
	function trackStartedVectorStoreSetup() {
		agentTelemetry.trackStartedAddingKnowledge({
			agentId: deps.agentId.value,
			kind: "vector_store"
		});
	}
	function trackRejectedFileUpload(reason, fileCount) {
		agentTelemetry.trackFailedKnowledgeUpload({
			agentId: deps.agentId.value,
			reason,
			fileCount
		});
	}
	return {
		trackTriggerAdded,
		trackTriggerRemoved,
		fetchInitialTriggersBaseline,
		trackOpenedToolFromList,
		trackOpenedSkillFromList,
		trackOpenedAddSkillModal,
		trackOpenedKnowledgeTab,
		trackStartedFileUpload,
		trackStartedVectorStoreSetup,
		trackRejectedFileUpload
	};
}
//#endregion
//#region src/features/agents/composables/useAgentConfigValidation.ts
init_reactivity_esm_bundler();
/**
* Tracks the agent's static, authoritative publish readiness — powers the
* disabled Publish tooltip and invalid capability chip states. Mirrors
* `useAgentConfig`'s stale-response guard: a fetch for a previous
* (project, agent) pair that resolves after the user has switched away is
* dropped rather than applied.
*/
function useAgentConfigValidation() {
	const rootStore = useRootStore();
	const validation = ref(null);
	const loading = ref(false);
	let latestKey = null;
	function keyFor(projectId, agentId) {
		return `${projectId}:${agentId}`;
	}
	/**
	* Repoint the active (project, agent) pair without fetching — mirrors
	* `useAgentConfig.repoint`. Drops the previous pair's result so an
	* in-flight validation fetch for it can't land on the new pair.
	*/
	function repoint(projectId, agentId) {
		latestKey = keyFor(projectId, agentId);
		validation.value = null;
		loading.value = false;
	}
	/**
	* Mark the current validation result stale without fetching. Called
	* immediately on local config edits — the persisted validation result is
	* known to no longer reflect the working copy, so Publish must not stay
	* enabled against it until a fresh save + refresh lands.
	*/
	function invalidate() {
		validation.value = null;
	}
	async function refresh(projectId, agentId) {
		const key = keyFor(projectId, agentId);
		latestKey = key;
		loading.value = true;
		try {
			const fresh = await getAgentConfigValidation(rootStore.restApiContext, projectId, agentId);
			if (latestKey === key) validation.value = fresh;
		} catch {
			if (latestKey === key) validation.value = null;
		} finally {
			if (latestKey === key) loading.value = false;
		}
	}
	return {
		validation,
		loading,
		repoint,
		invalidate,
		refresh
	};
}
//#endregion
//#region src/features/agents/agentEvals.api.ts
var evalsPath = (projectId, agentId) => `/projects/${projectId}/agents/v2/${agentId}/evals`;
var getDatasets = async (context, projectId, agentId) => {
	return await makeRestApiRequest(context, "GET", `${evalsPath(projectId, agentId)}/datasets`);
};
var generateDraftCases = async (context, projectId, agentId, options = {}) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/generate`, options);
};
var createDraftDataset = async (context, projectId, agentId, options = {}) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/datasets/draft`, options);
};
var deleteDataset = async (context, projectId, agentId, datasetId) => {
	return await makeRestApiRequest(context, "DELETE", `${evalsPath(projectId, agentId)}/datasets/${datasetId}`);
};
var deleteDraftDataset = async (context, projectId, agentId, datasetId) => {
	return await makeRestApiRequest(context, "DELETE", `${evalsPath(projectId, agentId)}/datasets/${datasetId}/draft`);
};
var previewRun = async (context, projectId, agentId, options = {}) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/preview-run`, options);
};
var applyPreviewSuggestion = async (context, projectId, agentId, options) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/preview-run/apply-suggestion`, options);
};
var listRuns = async (context, projectId, agentId, datasetId, query = {}) => {
	return await makeRestApiRequest(context, "GET", `${evalsPath(projectId, agentId)}/datasets/${datasetId}/runs`, query);
};
var getRunDetail = async (context, projectId, agentId, runId, query = {}) => {
	return await makeRestApiRequest(context, "GET", `${evalsPath(projectId, agentId)}/runs/${runId}`, query);
};
var getRunSummary = async (context, projectId, agentId, runId) => {
	return await makeRestApiRequest(context, "GET", `${evalsPath(projectId, agentId)}/runs/${runId}/summary`);
};
var listLatestRatingsForRun = async (context, projectId, agentId, runId) => {
	return await makeRestApiRequest(context, "GET", `${evalsPath(projectId, agentId)}/runs/${runId}/ratings`);
};
var rateResult = async (context, projectId, agentId, resultId, payload) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/results/${resultId}/ratings`, payload);
};
var startRun = async (context, projectId, agentId, datasetId) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/datasets/${datasetId}/runs`, {});
};
var deleteResult = async (context, projectId, agentId, resultId) => {
	return await makeRestApiRequest(context, "DELETE", `${evalsPath(projectId, agentId)}/results/${resultId}`);
};
var rerunResult = async (context, projectId, agentId, resultId, options = {}) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/results/${resultId}/rerun`, options);
};
var applySuggestions = async (context, projectId, agentId, options) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/apply-suggestions`, options);
};
var acceptResult = async (context, projectId, agentId, resultId) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/results/${resultId}/accept`);
};
var cancelRun = async (context, projectId, agentId, runId) => {
	return await makeRestApiRequest(context, "POST", `${evalsPath(projectId, agentId)}/runs/${runId}/cancel`);
};
//#endregion
//#region src/features/agents/utils/agent-eval-review.ts
/** A non-empty string, or null — the shape both `finalText` readers want. */
function readText(source, key) {
	if (!isRecord(source)) return null;
	const value = source[key];
	return typeof value === "string" && value.length > 0 ? value : null;
}
/**
* The case's request text. A result's `input` is the whole case snapshot, not a
* string, and its `input` cell comes from a Data Table so it can be any scalar.
* Objects have no sensible one-line rendering, so they read as absent.
*/
function readCaseRequest(input) {
	if (!isRecord(input)) return "";
	const value = input.input;
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return "";
}
/** The case's "what to check" criteria, written into the snapshot under `criteria`.
*  Null when the dataset maps no criteria column — a valid dataset, just one with
*  no per-case rule. Like the request, the cell comes from a Data Table, so a
*  number or boolean reads as its text rather than vanishing. */
function readCaseWhatToCheck(input) {
	if (!isRecord(input)) return null;
	const value = input.criteria;
	if (typeof value === "string" && value.length > 0) return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return null;
}
/** The agent's answer for the case. Null when the run recorded none. */
function readAgentAnswer(output) {
	return readText(output, "finalText");
}
/**
* A short, human-readable reason a result errored. The shape of `errorDetails`
* depends on which failure path in `agent-eval-runner.service.ts` wrote it —
* most failures carry `{ message }`, a failed-but-ran execution carries
* `{ errors, finalText }` instead. Read as plain strings only; nothing nested
* deeper than that is ever persisted.
*/
function readErrorMessage(errorDetails) {
	if (!isRecord(errorDetails)) return null;
	const message = errorDetails.message;
	if (typeof message === "string" && message.length > 0) return message;
	const errors = errorDetails.errors;
	if (!Array.isArray(errors)) return null;
	const joined = errors.filter((error) => typeof error === "string").join("; ");
	return joined.length > 0 ? joined : null;
}
/** The reviewer's edited answer, stored on the rating — never on the dataset. */
function readCorrectionText(correction) {
	return readText(correction, "finalText");
}
/**
* The judge's explanation, whichever way it ruled — or its error message when
* the judge call itself failed. Null when judging never ran (`null`,
* `'skipped'`), so a row with nothing graded shows nothing here.
*/
function readVerdictReasoning(verdict) {
	if (!verdict || verdict.status === "skipped") return null;
	return verdict.reasoning;
}
/**
* The fix the judge's failure produced, when there is one. Only a graded fail
* carries it, so a pass, a skipped or errored judge, and a blank value all read
* as no suggestion.
*/
function readVerdictSuggestion(verdict) {
	if (verdict?.status !== "completed" || verdict.outcome !== "fail") return null;
	const suggestion = verdict.suggestion?.trim();
	return suggestion ? suggestion : null;
}
/**
* Maps a result's execution status plus its (optional) judge verdict onto the
* avatar vocabulary shared across every agent-eval view. Execution statuses
* other than `success` are unaffected by judging — there is nothing to grade
* until a case actually finishes — except that a user's "Actually fine" (a
* completed pass) turns an errored or cancelled case into a pass. A judge call that errored leaves the case
* ungraded, which reads as `work` so it is never counted as a pass.
*
* A graded fail reads as `work` ("needs a look"), not `fail` — `fail` already
* means "couldn't finish" (an execution error) elsewhere in this vocabulary,
* and conflating "ran fine but broke the rule" with that would cost a reviewer
* the at-a-glance distinction between the two. `work` already carries this
* "ran, but needs a look" meaning for a cancelled case; this extends its
* population, not its meaning.
*/
function toAvatarKind(status, verdict) {
	if (status === "new") return "idle";
	if (status === "running") return "waiting";
	if ((status === "error" || status === "cancelled") && verdict?.status === "completed" && verdict.outcome === "pass") return "pass";
	if (status === "error") return "fail";
	if (status === "cancelled") return "work";
	if (verdict?.status === "error") return "work";
	if (!verdict || verdict.status !== "completed") return "pass";
	return verdict.outcome === "pass" ? "pass" : "work";
}
/**
* Whether a draft can be persisted. A thumbs-down without a reason cannot: the
* reason is the only thing that says *why* the answer was wrong, and asking for
* it on disagreement alone is what keeps the review from becoming a rubber stamp.
*/
function canSaveDraft(draft) {
	if (draft.vote === null) return false;
	if (draft.vote === "up") return true;
	return draft.comment.trim().length > 0;
}
/**
* Precedence is draft → pending → persisted rating → unrated: what the reviewer
* is typing outranks what is in flight, which outranks what is stored.
*/
function resolveReviewRowView(input) {
	const { rating, pending, draft } = input;
	if (draft) return {
		kind: "editing",
		vote: draft.vote,
		comment: draft.comment,
		correction: draft.correction,
		showReason: draft.vote === "down" && draft.panel !== "answer",
		showAnswerEditor: draft.panel === "answer" || draft.panel === "both",
		canSave: canSaveDraft(draft)
	};
	if (pending) return {
		kind: "settled",
		vote: pending.vote,
		comment: pending.comment,
		correction: pending.correction,
		saving: true
	};
	if (rating) return {
		kind: "settled",
		vote: rating.vote,
		comment: rating.comment,
		correction: readCorrectionText(rating.correction),
		saving: false
	};
	return { kind: "unrated" };
}
//#endregion
//#region src/features/agents/utils/agentEvalCases.utils.ts
/**
* Column names come from the dataset's own mapping, never guessed. Case generation
* happens to write `input`/`criteria`, but a dataset whose mapping says otherwise
* would be silently corrupted by a hardcoded fallback: the text would land in a
* column the runner never reads, producing a run that tests nothing and reports
* success. Without an `input` column there is nothing to render, so callers get
* null and fall back to a read-only view.
*/
var resolveCaseColumns = (mapping) => {
	if (!mapping?.input) return null;
	const criteria = mapping.criteria === mapping.input ? void 0 : mapping.criteria;
	return {
		input: mapping.input,
		whatToCheck: criteria ?? null
	};
};
/** Narrows a dataset to its Data Table backing — the single place the ref union is split. */
var isDataTableDataset = (dataset) => dataset.datasetSource === "data_table" && "dataTableId" in dataset.datasetRef;
/**
* Bundles a dataset's id, its table and its resolved columns. Null when the mapping
* names no input column, which is the signal to fall back to a read-only view rather
* than write cases into columns the runner would ignore.
*/
var toCaseSource = (dataset) => {
	const columns = resolveCaseColumns(dataset.columnMapping);
	if (!columns) return null;
	return {
		datasetId: dataset.id,
		dataTableId: dataset.datasetRef.dataTableId,
		columns
	};
};
/**
* Renders any cell as the plain text the view shows. Takes `undefined` on top of the
* value union because a mapping can name a column the table no longer has — indexing
* a row is typed as always present, but at runtime that yields `undefined`, and
* `String(undefined)` would put the word "undefined" in front of the user.
*/
var toDisplayText = (value) => {
	if (value === null || value === void 0) return "";
	if (value instanceof Date) return value.toISOString();
	return String(value);
};
/**
* Row to case. The numeric system `id` is what row updates and deletes filter on,
* so a row without one is dropped rather than rendered as a case that silently
* fails to save.
*/
var toAgentEvalCase = (row, columns) => {
	const rowId = row["id"];
	if (typeof rowId !== "number") return null;
	return {
		rowId,
		input: toDisplayText(row[columns.input]),
		whatToCheck: columns.whatToCheck === null ? "" : toDisplayText(row[columns.whatToCheck])
	};
};
var toAgentEvalCases = (rows, columns) => rows.reduce((cases, row) => {
	const mapped = toAgentEvalCase(row, columns);
	if (mapped) cases.push(mapped);
	return cases;
}, []);
/**
* Case to row. Writes only the mapped columns so the update stays partial and
* leaves any other column on the table — an expected output, a note — untouched.
*/
var toDataTableRow = (value, columns) => {
	const row = { [columns.input]: value.input };
	if (columns.whatToCheck !== null) row[columns.whatToCheck] = value.whatToCheck;
	return row;
};
//#endregion
//#region src/features/agents/agentEvals.store.ts
init_reactivity_esm_bundler();
/**
* How often an in-flight run is re-checked. The summary route is counts-only, so
* this stays cheap; the interval is a compromise between a live-feeling progress
* and not hammering the instance for a run that takes minutes.
*/
var RUN_POLL_INTERVAL_MS = 5 * TIME.SECOND;
/** Stop watching a run that never settles, so a forgotten tab can't poll indefinitely. */
var RUN_POLL_TIMEOUT_MS = 10 * TIME.MINUTE;
/** One failed poll is a blip worth retrying; a sustained run of them means we've lost the run. */
var RUN_POLL_MAX_ERRORS = 3;
/** A run in one of these states is still doing work. */
var isPendingStatus = (status) => status === "new" || status === "running";
var emptyRunReview = () => ({
	run: null,
	results: [],
	resultsCount: 0,
	ratingsByResultId: {},
	pendingByResultId: {},
	draftsByResultId: {},
	counts: null,
	loading: false,
	loadingMore: false
});
/**
* Client state for an agent's eval datasets, runs and per-case review.
*/
var useAgentEvalsStore = defineStore(STORES.AGENT_EVALS, () => {
	const rootStore = useRootStore();
	const dataTableStore = useDataTableStore();
	const datasetsByAgentId = ref({});
	const loadingDatasets = ref({});
	const generatingCases = ref({});
	const reviewByRunId = ref({});
	const latestRunIdByDatasetId = ref({});
	const startingRunByDatasetId = ref({});
	let latestOpenKey = null;
	const openKeyFor = (projectId, agentId, runId) => `${projectId}:${agentId}:${runId}`;
	let pollTimer = null;
	let pollGeneration = 0;
	/** Wall clock past which the current watch gives up; null when not watching. */
	let pollDeadline = null;
	let pollConsecutiveErrors = 0;
	const lostTrackByRunId = ref({});
	const casesByDatasetId = ref({});
	const casesCountByDatasetId = ref({});
	const loadingCases = ref({});
	const mutatingCases = ref({});
	const cancellingRunByDatasetId = ref({});
	const tableProjectByDataTableId = ref({});
	/**
	* A request from another surface to focus an agent's eval tab, optionally
	* generating on arrival — raised by the assistant's post-setup suggestion.
	*
	* Held here rather than emitted on the event bus because the builder that
	* serves the request may not be mounted yet when it's raised (the assistant
	* has to reveal the agent artifact first). A watcher can consume a request
	* that predates it; a fire-and-forget event would be dropped.
	*/
	const pendingEvalsFocus = ref(null);
	/**
	* The check the eval view should expand — handed on from a consumed request,
	* because the checks panel mounts after the builder claims the request.
	*/
	const focusedEvalResult = ref(null);
	const requestEvalsFocus = (agentId, generate = false, resultId) => {
		pendingEvalsFocus.value = {
			agentId,
			generate,
			resultId
		};
	};
	/** Claims the request when it names this agent, so only one builder acts on it. */
	const consumeEvalsFocus = (agentId) => {
		const request = pendingEvalsFocus.value;
		if (request?.agentId !== agentId) return null;
		pendingEvalsFocus.value = null;
		if (request.resultId) focusedEvalResult.value = {
			agentId,
			resultId: request.resultId
		};
		return request;
	};
	/** Claims the focused check when it belongs to this agent, so it expands only once. */
	const consumeFocusedEvalResult = (agentId) => {
		const focused = focusedEvalResult.value;
		if (focused?.agentId !== agentId) return null;
		focusedEvalResult.value = null;
		return focused.resultId;
	};
	/**
	* Drops an unclaimed request for this agent. Called by the surface that raised
	* it when it goes away: without this, a request no builder ever picked up
	* would sit here for the rest of the session and then fire in an unrelated
	* context, jumping to Evals and generating cases the user didn't ask for at
	* that moment.
	*
	* Scoped by agent for the same reason `consumeEvalsFocus` is — a surface
	* tearing down must not discard a request some other surface just raised.
	*/
	const clearEvalsFocus = (agentId) => {
		if (pendingEvalsFocus.value?.agentId !== agentId) return;
		pendingEvalsFocus.value = null;
	};
	const getDatasets$1 = (agentId) => datasetsByAgentId.value[agentId] ?? [];
	const isLoaded = (agentId) => datasetsByAgentId.value[agentId] !== void 0;
	const isLoadingDatasets = (agentId) => loadingDatasets.value[agentId] === true;
	const isGeneratingCases = (agentId) => generatingCases.value[agentId] === true;
	const setDatasets = (agentId, datasets) => {
		datasetsByAgentId.value = {
			...datasetsByAgentId.value,
			[agentId]: datasets
		};
	};
	const fetchDatasets = async (projectId, agentId) => {
		loadingDatasets.value = {
			...loadingDatasets.value,
			[agentId]: true
		};
		try {
			const datasets = await getDatasets(rootStore.restApiContext, projectId, agentId);
			setDatasets(agentId, datasets);
			return datasets;
		} finally {
			loadingDatasets.value = {
				...loadingDatasets.value,
				[agentId]: false
			};
		}
	};
	const generateDraftCases$1 = async (projectId, agentId, options = {}) => {
		generatingCases.value = {
			...generatingCases.value,
			[agentId]: true
		};
		try {
			const result = await generateDraftCases(rootStore.restApiContext, projectId, agentId, options);
			if (options.save !== false) await fetchDatasets(projectId, agentId).catch(() => null);
			return result;
		} finally {
			generatingCases.value = {
				...generatingCases.value,
				[agentId]: false
			};
		}
	};
	const createDraftDataset$1 = async (projectId, agentId, options = {}) => {
		const result = await createDraftDataset(rootStore.restApiContext, projectId, agentId, options);
		await fetchDatasets(projectId, agentId).catch(() => null);
		return result;
	};
	const deleteDataset$1 = async (projectId, agentId, datasetId) => {
		await deleteDataset(rootStore.restApiContext, projectId, agentId, datasetId);
		const current = datasetsByAgentId.value[agentId];
		if (current) setDatasets(agentId, current.filter((d) => d.id !== datasetId));
	};
	const deleteDraftDataset$1 = async (projectId, agentId, datasetId) => {
		await deleteDraftDataset(rootStore.restApiContext, projectId, agentId, datasetId);
		const current = datasetsByAgentId.value[agentId];
		if (current) setDatasets(agentId, current.filter((d) => d.id !== datasetId));
	};
	const previewRun$1 = async (projectId, agentId, options = {}) => {
		return await previewRun(rootStore.restApiContext, projectId, agentId, options);
	};
	const applyPreviewSuggestion$1 = async (projectId, agentId, options) => {
		return await applyPreviewSuggestion(rootStore.restApiContext, projectId, agentId, options);
	};
	const getReview = (runId) => reviewByRunId.value[runId] ?? emptyRunReview();
	const patchReview = (runId, patch) => {
		const current = reviewByRunId.value[runId] ?? emptyRunReview();
		reviewByRunId.value = {
			...reviewByRunId.value,
			[runId]: {
				...current,
				...patch
			}
		};
	};
	const removeCachedResult = (runId, resultId) => {
		const current = getReview(runId);
		const results = current.results.filter((result) => result.id !== resultId);
		if (results.length === current.results.length) return;
		const { [resultId]: _rating, ...ratingsByResultId } = current.ratingsByResultId;
		const { [resultId]: _pending, ...pendingByResultId } = current.pendingByResultId;
		const { [resultId]: _draft, ...draftsByResultId } = current.draftsByResultId;
		patchReview(runId, {
			results,
			resultsCount: Math.max(0, current.resultsCount - 1),
			ratingsByResultId,
			pendingByResultId,
			draftsByResultId
		});
	};
	const getLatestRunId = (datasetId) => latestRunIdByDatasetId.value[datasetId];
	const isStartingRun = (datasetId) => startingRunByDatasetId.value[datasetId] === true;
	const getCases = (datasetId) => casesByDatasetId.value[datasetId] ?? [];
	const getCasesCount = (datasetId) => casesCountByDatasetId.value[datasetId] ?? 0;
	/** Absence of an entry is "not read yet", not "no cases" — the two render differently. */
	const areCasesLoaded = (datasetId) => casesByDatasetId.value[datasetId] !== void 0;
	const isLoadingCases = (datasetId) => loadingCases.value[datasetId] === true;
	const isMutatingCase = (datasetId, rowId) => mutatingCases.value[`${datasetId}:${rowId}`] === true;
	const isCancellingRun = (datasetId) => cancellingRunByDatasetId.value[datasetId] === true;
	/** True when a watch stopped without its run settling — the counts shown are frozen. */
	const hasLostTrackOfRun = (runId) => lostTrackByRunId.value[runId] === true;
	const setCases = (datasetId, cases) => {
		casesByDatasetId.value = {
			...casesByDatasetId.value,
			[datasetId]: cases
		};
	};
	const setCasesCount = (datasetId, count) => {
		casesCountByDatasetId.value = {
			...casesCountByDatasetId.value,
			[datasetId]: count
		};
	};
	const setMutatingCase = (datasetId, rowId, mutating) => {
		mutatingCases.value = {
			...mutatingCases.value,
			[`${datasetId}:${rowId}`]: mutating
		};
	};
	const resolveTableProjectId = async (agentProjectId, dataTableId) => {
		const cached = tableProjectByDataTableId.value[dataTableId];
		if (cached) return cached;
		const resolved = await dataTableStore.fetchDataTableById(dataTableId).then((table) => table?.projectId).catch(() => void 0);
		if (!resolved) return agentProjectId;
		tableProjectByDataTableId.value = {
			...tableProjectByDataTableId.value,
			[dataTableId]: resolved
		};
		return resolved;
	};
	const fetchCases = async (projectId, source) => {
		loadingCases.value = {
			...loadingCases.value,
			[source.datasetId]: true
		};
		try {
			const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
			const { count, data } = await dataTableStore.fetchDataTableContent(source.dataTableId, tableProjectId, 1, 250, `id:asc`);
			const cases = toAgentEvalCases(data, source.columns);
			setCases(source.datasetId, cases);
			setCasesCount(source.datasetId, count);
			return cases;
		} finally {
			loadingCases.value = {
				...loadingCases.value,
				[source.datasetId]: false
			};
		}
	};
	const createCase = async (projectId, source, value) => {
		const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
		const inserted = await dataTableStore.insertRow(source.dataTableId, tableProjectId, toDataTableRow(value, source.columns));
		setCasesCount(source.datasetId, getCasesCount(source.datasetId) + 1);
		const created = inserted ? toAgentEvalCase(inserted, source.columns) : null;
		if (created) setCases(source.datasetId, [...getCases(source.datasetId), created]);
		return created;
	};
	const updateCase = async (projectId, source, rowId, value) => {
		setMutatingCase(source.datasetId, rowId, true);
		try {
			const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
			if (!await dataTableStore.updateRow(source.dataTableId, tableProjectId, rowId, toDataTableRow(value, source.columns))) return false;
			setCases(source.datasetId, getCases(source.datasetId).map((c) => c.rowId === rowId ? {
				...c,
				...value
			} : c));
			return true;
		} finally {
			setMutatingCase(source.datasetId, rowId, false);
		}
	};
	const updateCaseRule = async (projectId, source, rowId, whatToCheck) => {
		const column = source.columns.whatToCheck;
		if (column === null) return false;
		setMutatingCase(source.datasetId, rowId, true);
		try {
			const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
			if (!await dataTableStore.updateRow(source.dataTableId, tableProjectId, rowId, { [column]: whatToCheck })) return false;
			setCases(source.datasetId, getCases(source.datasetId).map((c) => c.rowId === rowId ? {
				...c,
				whatToCheck
			} : c));
			return true;
		} finally {
			setMutatingCase(source.datasetId, rowId, false);
		}
	};
	const deleteCase = async (projectId, source, rowId) => {
		setMutatingCase(source.datasetId, rowId, true);
		try {
			const tableProjectId = await resolveTableProjectId(projectId, source.dataTableId);
			if (!await dataTableStore.deleteRows(source.dataTableId, tableProjectId, [rowId])) return false;
			setCases(source.datasetId, getCases(source.datasetId).filter((c) => c.rowId !== rowId));
			setCasesCount(source.datasetId, Math.max(0, getCasesCount(source.datasetId) - 1));
			return true;
		} finally {
			setMutatingCase(source.datasetId, rowId, false);
		}
	};
	/**
	* The newest run of a dataset, or `null` when it has never been run. Runs come
	* back newest-first, so a single-row window is enough.
	*/
	const resolveLatestRunId = async (projectId, agentId, datasetId) => {
		const runId = (await listRuns(rootStore.restApiContext, projectId, agentId, datasetId, {
			take: 1,
			skip: 0
		})).data[0]?.id ?? null;
		latestRunIdByDatasetId.value = {
			...latestRunIdByDatasetId.value,
			[datasetId]: runId
		};
		return runId;
	};
	/**
	* The window a re-read must cover so it doesn't collapse what the reviewer has
	* paged in — capped at what the route will actually serve.
	*
	* `take` is clamped server-side, not rejected, so asking for more than the cap
	* quietly returns fewer rows than are already on screen. A run may hold more
	* cases than one request can carry, so past the cap a re-read is skipped
	* entirely rather than allowed to truncate the list.
	*/
	const loadedWindow = (runId) => Math.max(getReview(runId).results.length, 50);
	const canRefreshWholeWindow = (runId) => getReview(runId).results.length <= 250;
	/**
	* Refreshed rows, keeping any the reviewer paged in while the read was running.
	*
	* Every re-read covers a window captured before it started, so replacing the list
	* wholesale would silently drop rows appended since — jumping the view back a
	* page. Splicing by index is sound because a run's cases are seeded once and
	* always ordered by `runIndex`, so position i is the same case in both lists.
	*/
	const spliceRefreshed = (held, refreshed) => held.length > refreshed.length ? [...refreshed, ...held.slice(refreshed.length)] : refreshed;
	/**
	* Reads back a window wider than one request by walking pages.
	*
	* `take` is clamped server-side, so a window past the cap cannot be fetched in
	* one go — and asking anyway silently returns fewer rows than are on screen.
	* Only used where correctness beats request count (settling a run), never on the
	* polling path.
	*/
	const readResultsWindow = async (projectId, agentId, runId, target) => {
		const collected = [];
		let run = null;
		let total = 0;
		while (collected.length < target) {
			const { results, ...rest } = await getRunDetail(rootStore.restApiContext, projectId, agentId, runId, {
				take: Math.min(50, target - collected.length),
				skip: collected.length
			});
			run = rest;
			total = results.count;
			if (results.data.length === 0) break;
			collected.push(...results.data);
			if (collected.length >= total) break;
		}
		return {
			run,
			results: collected,
			total
		};
	};
	/**
	* The one-off read when a run finishes: every case now has a final status and an
	* answer, and any rating submitted while it was running needs picking up.
	*
	* Results and ratings are refreshed independently, because they fail differently
	* — the results window can exceed what a single request carries, the ratings
	* route is unpaginated and always readable in one.
	*/
	const settleRun = async (projectId, agentId, runId) => {
		const target = loadedWindow(runId);
		const [window, ratings] = await Promise.all([readResultsWindow(projectId, agentId, runId, target), listLatestRatingsForRun(rootStore.restApiContext, projectId, agentId, runId)]);
		const current = getReview(runId);
		patchReview(runId, {
			...window.run ? { run: window.run } : {},
			results: spliceRefreshed(current.results, window.results),
			resultsCount: window.total,
			ratingsByResultId: mergeRatings(current.ratingsByResultId, ratings)
		});
	};
	/**
	* Loads a run's cases together with every latest rating in the run. Ratings are
	* read whole rather than per page: the route returns one row per rated case,
	* which keeps the reviewed tally right before the user pages.
	*
	* `take` defaults to one page, but a re-read of a run already on screen passes
	* the window the reviewer has open — otherwise settling a run they had paged
	* through would silently drop them back to the first page.
	*/
	const openRun = async (projectId, agentId, runId, take = 50) => {
		const key = openKeyFor(projectId, agentId, runId);
		latestOpenKey = key;
		patchReview(runId, { loading: true });
		try {
			const [detail, ratings] = await Promise.all([getRunDetail(rootStore.restApiContext, projectId, agentId, runId, {
				take,
				skip: 0
			}), listLatestRatingsForRun(rootStore.restApiContext, projectId, agentId, runId)]);
			if (latestOpenKey !== key) return;
			const { results, ...run } = detail;
			const current = getReview(runId);
			patchReview(runId, {
				run,
				results: results.data,
				resultsCount: results.count,
				ratingsByResultId: mergeRatings(current.ratingsByResultId, ratings),
				loading: false
			});
		} finally {
			if (latestOpenKey === key) patchReview(runId, { loading: false });
		}
	};
	/** Appends the next page of cases. Ratings are already loaded for the whole run. */
	const loadMoreResults = async (projectId, agentId, runId) => {
		const state = getReview(runId);
		if (state.loadingMore || state.results.length >= state.resultsCount) return;
		patchReview(runId, { loadingMore: true });
		try {
			const detail = await getRunDetail(rootStore.restApiContext, projectId, agentId, runId, {
				take: 50,
				skip: state.results.length
			});
			const current = getReview(runId);
			const seen = new Set(current.results.map((result) => result.id));
			patchReview(runId, {
				results: [...current.results, ...detail.results.data.filter((r) => !seen.has(r.id))],
				resultsCount: detail.results.count
			});
		} finally {
			patchReview(runId, { loadingMore: false });
		}
	};
	const getDraft = (runId, resultId) => reviewByRunId.value[runId]?.draftsByResultId[resultId];
	const setDraft = (runId, resultId, draft) => {
		const state = getReview(runId);
		patchReview(runId, { draftsByResultId: {
			...state.draftsByResultId,
			[resultId]: draft
		} });
	};
	/** The draft a row starts from: whatever is already persisted on it. */
	const draftFromRating = (rating) => ({
		vote: rating?.vote ?? null,
		comment: rating?.comment ?? "",
		correction: readCorrectionText(rating?.correction ?? null) ?? "",
		panel: "reason"
	});
	const startingDraft = (runId, resultId) => getDraft(runId, resultId) ?? draftFromRating(getReview(runId).ratingsByResultId[resultId]);
	/**
	* Whether switching this case to agreement would throw away a reason or a rewrite.
	*
	* Reads the persisted rating and the draft directly rather than the row's view:
	* a view is shadowed by any open draft, so a reviewer who had just opened the
	* note editor would look unrated and lose the note without being asked.
	*/
	const wouldDiscardOnAgreement = (runId, resultId) => {
		const state = getReview(runId);
		const saved = state.ratingsByResultId[resultId];
		if (saved?.comment?.trim() || readCorrectionText(saved?.correction ?? null)?.trim()) return true;
		const draft = state.draftsByResultId[resultId];
		return Boolean(draft && (draft.comment.trim() || draft.correction.trim()));
	};
	const beginVote = (runId, resultId, vote) => {
		const draft = startingDraft(runId, resultId);
		if (vote === "up") {
			setDraft(runId, resultId, {
				...draft,
				vote,
				comment: "",
				correction: "",
				panel: "reason"
			});
			return;
		}
		setDraft(runId, resultId, {
			...draft,
			vote,
			panel: draft.correction ? "both" : "reason"
		});
	};
	/**
	* Opens the answer editor. On a case with no vote yet this selects a
	* thumbs-down, which in turn requires a reason: an edited answer *is* a
	* disagreement, and letting the editor stand in for a vote would route around
	* the one question the review asks. An existing vote is left alone rather than
	* silently rewritten.
	*/
	const beginAnswerEdit = (runId, resultId) => {
		const draft = startingDraft(runId, resultId);
		const vote = draft.vote ?? "down";
		setDraft(runId, resultId, {
			...draft,
			vote,
			panel: vote === "down" ? "both" : "answer"
		});
	};
	/** Reopens the reason on an already-reviewed case. */
	const beginNoteEdit = (runId, resultId) => {
		const draft = startingDraft(runId, resultId);
		setDraft(runId, resultId, {
			...draft,
			vote: draft.vote ?? "down",
			panel: draft.correction ? "both" : "reason"
		});
	};
	const setDraftComment = (runId, resultId, comment) => {
		setDraft(runId, resultId, {
			...startingDraft(runId, resultId),
			comment
		});
	};
	const setDraftCorrection = (runId, resultId, correction) => {
		setDraft(runId, resultId, {
			...startingDraft(runId, resultId),
			correction
		});
	};
	/** Discards the draft. Anything already persisted on the case is untouched. */
	const cancelDraft = (runId, resultId) => {
		const { [resultId]: _discarded, ...rest } = getReview(runId).draftsByResultId;
		patchReview(runId, { draftsByResultId: rest });
	};
	/**
	* Persists a row's draft. The vote moves to `pending` first so the row reads as
	* saved immediately; a failure restores the draft verbatim and rethrows, since
	* silently dropping what someone typed is worse than showing them an error.
	*/
	const saveReview = async (projectId, agentId, runId, resultId) => {
		const draft = getDraft(runId, resultId);
		if (!draft?.vote || !canSaveDraft(draft)) return;
		const correction = draft.correction.trim();
		const comment = draft.comment.trim();
		const pending = {
			vote: draft.vote,
			comment: comment || null,
			correction: correction || null
		};
		const before = getReview(runId);
		const { [resultId]: _draft, ...remainingDrafts } = before.draftsByResultId;
		patchReview(runId, {
			draftsByResultId: remainingDrafts,
			pendingByResultId: {
				...before.pendingByResultId,
				[resultId]: pending
			}
		});
		try {
			const record = await rateResult(rootStore.restApiContext, projectId, agentId, resultId, {
				vote: draft.vote,
				...comment ? { comment } : {},
				...correction ? { correction: { finalText: correction } } : {}
			});
			const settled = getReview(runId);
			const { [resultId]: _pending, ...remainingPending } = settled.pendingByResultId;
			patchReview(runId, {
				pendingByResultId: remainingPending,
				ratingsByResultId: {
					...settled.ratingsByResultId,
					[resultId]: record
				}
			});
			return record;
		} catch (error) {
			const failed = getReview(runId);
			const { [resultId]: _pending, ...remainingPending } = failed.pendingByResultId;
			patchReview(runId, {
				pendingByResultId: remainingPending,
				draftsByResultId: {
					...failed.draftsByResultId,
					[resultId]: draft
				}
			});
			throw error;
		}
	};
	/**
	* Cases carrying a review, whether persisted or still in flight. The union is
	* what makes the tally move the moment someone votes, and move back if the save
	* fails.
	*/
	const reviewedCount = (runId) => {
		const state = getReview(runId);
		return (/* @__PURE__ */ new Set([...Object.keys(state.ratingsByResultId), ...Object.keys(state.pendingByResultId)])).size;
	};
	/** True while the loaded run still has work to do. */
	const isRunInFlight = (runId) => isPendingStatus(getReview(runId).run?.status);
	const stopPollingRun = () => {
		pollGeneration += 1;
		pollDeadline = null;
		pollConsecutiveErrors = 0;
		if (pollTimer !== null) {
			clearTimeout(pollTimer);
			pollTimer = null;
		}
	};
	/**
	* Re-reads the cases without disturbing the review on top of them. Keeps the
	* window the reviewer has already paged open, so a refresh mid-run can't
	* collapse it back to the first page.
	*/
	const refreshResults = async (projectId, agentId, runId) => {
		const { results, ...run } = await getRunDetail(rootStore.restApiContext, projectId, agentId, runId, {
			take: loadedWindow(runId),
			skip: 0
		});
		patchReview(runId, {
			run,
			results: spliceRefreshed(getReview(runId).results, results.data),
			resultsCount: results.count
		});
	};
	/** One check of an in-flight run. Resolves true once the run has settled. */
	const pollRunOnce = async (projectId, agentId, runId) => {
		try {
			const summary = await getRunSummary(rootStore.restApiContext, projectId, agentId, runId);
			const current = getReview(runId);
			patchReview(runId, {
				counts: summary.counts,
				...current.run ? { run: {
					...current.run,
					status: summary.status
				} } : {}
			});
			if (!isPendingStatus(summary.status)) {
				await settleRun(projectId, agentId, runId);
				return true;
			}
			if (current.counts !== null && canRefreshWholeWindow(runId)) await refreshResults(projectId, agentId, runId);
			pollConsecutiveErrors = 0;
		} catch {
			pollConsecutiveErrors += 1;
			if (pollConsecutiveErrors >= RUN_POLL_MAX_ERRORS) {
				lostTrackByRunId.value = {
					...lostTrackByRunId.value,
					[runId]: true
				};
				return true;
			}
		}
		return false;
	};
	const schedulePoll = (projectId, agentId, runId, generation) => {
		if (generation !== pollGeneration) return;
		pollTimer = setTimeout(async () => {
			pollTimer = null;
			if (generation !== pollGeneration) return;
			if (pollDeadline !== null && Date.now() > pollDeadline) {
				lostTrackByRunId.value = {
					...lostTrackByRunId.value,
					[runId]: true
				};
				stopPollingRun();
				return;
			}
			if (!document.hidden && await pollRunOnce(projectId, agentId, runId)) {
				stopPollingRun();
				return;
			}
			schedulePoll(projectId, agentId, runId, generation);
		}, RUN_POLL_INTERVAL_MS);
	};
	/**
	* Watches an in-flight run until it settles, reporting progress as it goes.
	* Reads once straight away so a freshly started run shows its tallies
	* immediately rather than after a blank interval.
	*/
	const startPollingRun = (projectId, agentId, runId) => {
		stopPollingRun();
		const generation = pollGeneration;
		pollDeadline = Date.now() + RUN_POLL_TIMEOUT_MS;
		lostTrackByRunId.value = {
			...lostTrackByRunId.value,
			[runId]: false
		};
		(async () => {
			const settled = await pollRunOnce(projectId, agentId, runId);
			if (generation !== pollGeneration) return;
			if (settled) stopPollingRun();
			else schedulePoll(projectId, agentId, runId, generation);
		})();
	};
	const cancelRun$1 = async (projectId, agentId, datasetId, runId) => {
		cancellingRunByDatasetId.value = {
			...cancellingRunByDatasetId.value,
			[datasetId]: true
		};
		try {
			const run = await cancelRun(rootStore.restApiContext, projectId, agentId, runId);
			patchReview(runId, { run });
			return run;
		} finally {
			cancellingRunByDatasetId.value = {
				...cancellingRunByDatasetId.value,
				[datasetId]: false
			};
		}
	};
	/** Finds which cached run page currently holds a given result, if any. */
	const findCachedResult = (resultId) => {
		for (const [runId, state] of Object.entries(reviewByRunId.value)) {
			const result = state.results.find((r) => r.id === resultId);
			if (result) return {
				runId,
				result
			};
		}
	};
	const replaceCachedResult = (runId, resultId, result) => {
		patchReview(runId, { results: getReview(runId).results.map((r) => r.id === resultId ? result : r) });
	};
	const refreshCachedResult = async (projectId, agentId, runId, resultId) => {
		const index = getReview(runId).results.findIndex((r) => r.id === resultId);
		if (index < 0) return false;
		const fresh = (await getRunDetail(rootStore.restApiContext, projectId, agentId, runId, {
			take: 1,
			skip: index
		})).results.data[0];
		if (fresh?.id !== resultId) return false;
		replaceCachedResult(runId, resultId, fresh);
		return true;
	};
	const rerunResult$1 = async (projectId, agentId, resultId, options = {}) => {
		const cached = findCachedResult(resultId);
		if (cached?.result.status === "running") return cached.result;
		if (cached) {
			const optimisticInput = options.whatToCheck !== void 0 ? {
				...cached.result.input ?? {},
				criteria: options.whatToCheck
			} : cached.result.input;
			replaceCachedResult(cached.runId, resultId, {
				...cached.result,
				status: "running",
				input: optimisticInput
			});
		}
		try {
			const updated = await rerunResult(rootStore.restApiContext, projectId, agentId, resultId, options);
			replaceCachedResult(updated.runId, resultId, updated);
			return updated;
		} catch (error) {
			if (cached && findCachedResult(resultId)?.result.status === "running") {
				if (options.whatToCheck === void 0) replaceCachedResult(cached.runId, resultId, cached.result);
				else if (!await refreshCachedResult(projectId, agentId, cached.runId, resultId).catch(() => false) && findCachedResult(resultId)?.result.status === "running") replaceCachedResult(cached.runId, resultId, cached.result);
			}
			throw error;
		}
	};
	const applySuggestions$1 = async (projectId, agentId, resultIds) => {
		const targets = [];
		for (const resultId of new Set(resultIds)) {
			const cached = findCachedResult(resultId);
			if (cached?.result.status === "running") continue;
			if (cached) targets.push(cached);
		}
		if (targets.length === 0) return null;
		for (const { runId, result } of targets) replaceCachedResult(runId, result.id, {
			...result,
			status: "running"
		});
		try {
			const applied = await applySuggestions(rootStore.restApiContext, projectId, agentId, { resultIds: targets.map(({ result }) => result.id) });
			for (const updated of applied.results) replaceCachedResult(updated.runId, updated.id, updated);
			return applied;
		} catch (error) {
			await Promise.all(targets.map(async ({ runId, result }) => {
				if (findCachedResult(result.id)?.result.status !== "running") return;
				if (!await refreshCachedResult(projectId, agentId, runId, result.id).catch(() => false) && findCachedResult(result.id)?.result.status === "running") replaceCachedResult(runId, result.id, result);
			}));
			throw error;
		}
	};
	const acceptResult$1 = async (projectId, agentId, resultId) => {
		const cached = findCachedResult(resultId);
		if (cached) replaceCachedResult(cached.runId, resultId, {
			...cached.result,
			verdict: {
				status: "completed",
				outcome: "pass",
				reasoning: null
			}
		});
		try {
			const updated = await acceptResult(rootStore.restApiContext, projectId, agentId, resultId);
			replaceCachedResult(updated.runId, resultId, updated);
			return updated;
		} catch (error) {
			if (cached) replaceCachedResult(cached.runId, resultId, cached.result);
			throw error;
		}
	};
	const deleteResult$1 = async (projectId, agentId, resultId) => {
		const cached = findCachedResult(resultId);
		await deleteResult(rootStore.restApiContext, projectId, agentId, resultId);
		if (cached) removeCachedResult(cached.runId, resultId);
	};
	/** Runs the dataset's cases again against the agent's current config. */
	const startRun$1 = async (projectId, agentId, datasetId) => {
		startingRunByDatasetId.value = {
			...startingRunByDatasetId.value,
			[datasetId]: true
		};
		try {
			const run = await startRun(rootStore.restApiContext, projectId, agentId, datasetId);
			latestRunIdByDatasetId.value = {
				...latestRunIdByDatasetId.value,
				[datasetId]: run.id
			};
			return run;
		} finally {
			startingRunByDatasetId.value = {
				...startingRunByDatasetId.value,
				[datasetId]: false
			};
		}
	};
	return {
		getDatasets: getDatasets$1,
		isLoaded,
		isLoadingDatasets,
		isGeneratingCases,
		fetchDatasets,
		generateDraftCases: generateDraftCases$1,
		createDraftDataset: createDraftDataset$1,
		deleteDataset: deleteDataset$1,
		deleteDraftDataset: deleteDraftDataset$1,
		previewRun: previewRun$1,
		applyPreviewSuggestion: applyPreviewSuggestion$1,
		getReview,
		removeCachedResult,
		deleteResult: deleteResult$1,
		getLatestRunId,
		isStartingRun,
		resolveLatestRunId,
		openRun,
		loadMoreResults,
		getDraft,
		beginVote,
		wouldDiscardOnAgreement,
		beginAnswerEdit,
		beginNoteEdit,
		setDraftComment,
		setDraftCorrection,
		cancelDraft,
		saveReview,
		reviewedCount,
		isRunInFlight,
		startPollingRun,
		stopPollingRun,
		hasLostTrackOfRun,
		startRun: startRun$1,
		rerunResult: rerunResult$1,
		applySuggestions: applySuggestions$1,
		acceptResult: acceptResult$1,
		cancelRun: cancelRun$1,
		isCancellingRun,
		getCases,
		getCasesCount,
		areCasesLoaded,
		isLoadingCases,
		isMutatingCase,
		fetchCases,
		createCase,
		updateCase,
		updateCaseRule,
		deleteCase,
		pendingEvalsFocus,
		requestEvalsFocus,
		consumeEvalsFocus,
		focusedEvalResult,
		consumeFocusedEvalResult,
		clearEvalsFocus
	};
});
/**
* Folds a fetched ratings list over what is already held, newest per case wins.
*
* A plain spread in either direction is wrong. `listLatestRatingsForRun` returns
* the latest rating *as of its own read*, so a vote saved while that read was in
* flight is either missing from it (letting the fetch win would drop a rating the
* server holds) or represented by the row it replaced (letting the fetch win would
* revert the row to the vote the reviewer just changed). Recency is the only
* ordering that is right in both directions.
*/
var mergeRatings = (held, fetched) => {
	const merged = { ...held };
	for (const rating of fetched) {
		const mine = merged[rating.resultId];
		if (!mine || ratedAt(rating) > ratedAt(mine)) merged[rating.resultId] = rating;
	}
	return merged;
};
/** Unparseable timestamps sort oldest, so a readable record is always preferred. */
var ratedAt = (rating) => {
	const ms = Date.parse(rating.createdAt);
	return Number.isNaN(ms) ? -Infinity : ms;
};
//#endregion
//#region src/features/agents/composables/useAgentBuilderSession.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Max chars for session-name display in the preview breadcrumb dropdown trigger
* and its menu rows. Long titles otherwise crowd the header actions.
*/
var SESSION_TITLE_MAX_CHARS = 64;
/**
* Owns the preview chat-session state:
*
* - `continueSessionId` — set via the URL query string for shareable deep-links
*   into a specific session. Takes precedence when route backing is enabled.
* - `activeChatSessionId` — the in-tab session selection. Used exclusively
*   when route backing is disabled and as a fallback otherwise.
*
* Plus the session-picker dropdown menu and titles, all driven off the
* `agentSessionsStore` thread list.
*/
function useAgentBuilderSession(options) {
	const selection = useSessionSelection(options.routeBacked);
	return {
		...selection,
		...useSessionMetadata(options, selection.effectiveSessionId),
		...useSessionDeletion(options, selection)
	};
}
function useSessionSelection(routeBacked) {
	const route = useRoute();
	const router = useRouter();
	const activeChatSessionId = ref(null);
	const ephemeralSessionId = ref(null);
	const locallyMintedSessionId = ref(null);
	const { continueSessionId, pendingRouteSessionId } = useSessionRoute(routeBacked, activeChatSessionId, ephemeralSessionId, locallyMintedSessionId);
	const effectiveSessionId = computed(() => (routeBacked.value ? pendingRouteSessionId.value ?? continueSessionId.value : void 0) ?? activeChatSessionId.value ?? void 0);
	const currentSessionIsEphemeral = computed(() => ephemeralSessionId.value !== null && ephemeralSessionId.value === effectiveSessionId.value);
	const currentSessionIsLocallyMinted = computed(() => locallyMintedSessionId.value !== null && locallyMintedSessionId.value === effectiveSessionId.value);
	function selectSession(id, ephemeral = id === ephemeralSessionId.value) {
		activeChatSessionId.value = id;
		ephemeralSessionId.value = ephemeral ? id : null;
		locallyMintedSessionId.value = ephemeral ? id : null;
		if (!routeBacked.value) return;
		pendingRouteSessionId.value = id;
		const query = {
			...route.query,
			[CONTINUE_SESSION_ID_PARAM]: id
		};
		if (ephemeral) delete query[NEW_SESSION_PARAM];
		router.replace({ query });
	}
	function setSessionInUrl(id) {
		selectSession(id);
	}
	function clearContinueSessionParam() {
		if (!routeBacked.value) return;
		const { [CONTINUE_SESSION_ID_PARAM]: _dropped, ...rest } = route.query;
		router.replace({ query: rest });
	}
	function onSessionPick(id) {
		if (id === "__empty__") return;
		selectSession(id);
	}
	function onNewChat() {
		selectSession(crypto.randomUUID(), true);
	}
	function markSessionCreated(sessionId) {
		if (ephemeralSessionId.value === sessionId) ephemeralSessionId.value = null;
	}
	return {
		activeChatSessionId,
		continueSessionId,
		effectiveSessionId,
		currentSessionIsEphemeral,
		currentSessionIsLocallyMinted,
		setSessionInUrl,
		clearContinueSessionParam,
		onSessionPick,
		onNewChat,
		markSessionCreated
	};
}
function useSessionRoute(routeBacked, activeChatSessionId, ephemeralSessionId, locallyMintedSessionId) {
	const route = useRoute();
	const pendingRouteSessionId = ref(null);
	const continueSessionId = computed(() => {
		const raw = route.query[CONTINUE_SESSION_ID_PARAM];
		const value = Array.isArray(raw) ? raw[0] : raw;
		return typeof value === "string" && value.length > 0 ? value : void 0;
	});
	watch([routeBacked, continueSessionId], ([isRouteBacked, routeSessionId]) => {
		if (!isRouteBacked) {
			pendingRouteSessionId.value = null;
			return;
		}
		if (routeSessionId && routeSessionId !== locallyMintedSessionId.value) {
			ephemeralSessionId.value = null;
			locallyMintedSessionId.value = null;
		}
		if (pendingRouteSessionId.value !== null) pendingRouteSessionId.value = null;
		if (routeSessionId) activeChatSessionId.value = routeSessionId;
	}, { immediate: true });
	watch(activeChatSessionId, (sessionId) => {
		if (sessionId === null) {
			pendingRouteSessionId.value = null;
			ephemeralSessionId.value = null;
			locallyMintedSessionId.value = null;
		} else {
			if (locallyMintedSessionId.value !== null && sessionId !== locallyMintedSessionId.value) {
				ephemeralSessionId.value = null;
				locallyMintedSessionId.value = null;
			}
			if (routeBacked.value && sessionId !== continueSessionId.value) pendingRouteSessionId.value = sessionId;
		}
	});
	return {
		continueSessionId,
		pendingRouteSessionId
	};
}
function useSessionMetadata({ projectId, agentId }, effectiveSessionId) {
	const sessionsStore = useAgentSessionsStore();
	const i18n = useI18n();
	const threadTitleOf = useThreadTitle();
	const previewThreads = computed(() => sessionsStore.previewThreads.filter((thread) => thread.canContinueInPreview && thread.projectId === projectId.value && thread.agentId === agentId.value));
	const isCurrentSession = (thread) => thread?.id === effectiveSessionId.value && thread?.projectId === projectId.value && thread?.agentId === agentId.value;
	const currentSession = computed((previous) => previewThreads.value.find(isCurrentSession) ?? sessionsStore.threads.find(isCurrentSession) ?? (isCurrentSession(previous) ? previous : void 0));
	return {
		previewThreads,
		currentSession,
		currentSessionHasMessages: computed(() => Boolean(currentSession.value)),
		currentSessionTitle: computed(() => {
			if (!effectiveSessionId.value) return "";
			if (!currentSession.value) return i18n.baseText("agents.builder.chat.newChat.label");
			return truncate(threadTitleOf(currentSession.value), SESSION_TITLE_MAX_CHARS);
		}),
		sessionMenu: computed(() => previewThreads.value.map((thread) => ({
			id: thread.id,
			title: threadTitleOf(thread),
			label: truncate(threadTitleOf(thread), SESSION_TITLE_MAX_CHARS),
			updatedAt: thread.updatedAt
		})))
	};
}
function useSessionDeletion({ projectId, agentId }, { effectiveSessionId, onNewChat }) {
	const sessionsStore = useAgentSessionsStore();
	const i18n = useI18n();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	const toast = useToast();
	const isDeletingSession = ref(false);
	let isDisposed = false;
	if (getCurrentScope()) onScopeDispose(() => isDisposed = true);
	async function deleteSession(sessionId) {
		if (isDisposed || isDeletingSession.value || !sessionId) return false;
		const targetProjectId = projectId.value;
		const targetAgentId = agentId.value;
		if (!targetProjectId || !targetAgentId) return false;
		const isTargetCurrent = () => !isDisposed && projectId.value === targetProjectId && agentId.value === targetAgentId;
		isDeletingSession.value = true;
		try {
			if (await openAgentConfirmationModal({
				title: i18n.baseText("agentSessions.deleteConfirm.headline"),
				description: i18n.baseText("agentSessions.deleteConfirm.message"),
				isDestructive: true,
				confirmButtonText: i18n.baseText("agentSessions.deleteConfirm.confirmButtonText"),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) !== "confirm" || !isTargetCurrent()) return false;
			await sessionsStore.deleteThread(targetProjectId, targetAgentId, sessionId);
			if (!isTargetCurrent()) return false;
			toast.showMessage({
				title: i18n.baseText("agentSessions.showMessage.deleted"),
				type: "success"
			});
			if (effectiveSessionId.value === sessionId) onNewChat();
			return true;
		} catch (error) {
			if (isTargetCurrent()) toast.showError(error, i18n.baseText("agentSessions.showError.delete"));
			return false;
		} finally {
			isDeletingSession.value = false;
		}
	}
	return {
		isDeletingSession,
		deleteSession
	};
}
//#endregion
//#region src/features/ai/evaluation.ee/composables/useAgentEvalsFlag.ts
init_runtime_core_esm_bundler();
/**
* Frontend gate for the agent-evals feature surface, matching the
* `101_agent_evals` flag the backend consults to gate its routes. It combines
* two independent signals:
*
*  - `settings.evaluation.agentEvalsEnabled` — the backend-provided operator
*    override (`N8N_AGENT_EVALS_ENABLED`). Delivered in the settings payload,
*    so it works even when the in-browser PostHog client never initializes
*    (telemetry off), where the flag would otherwise stay false.
*  - the PostHog client flag — carries per-cohort rollout when telemetry is on.
*
* Coerces to a strict boolean so `v-if="isAgentEvalsEnabled"` never
* undefined-flickers during the initial flag-fetch frame.
*/
var useAgentEvalsFlag = () => {
	const postHog = usePostHog();
	const settingsStore = useSettingsStore();
	return computed(() => settingsStore.settings.evaluation?.agentEvalsEnabled === true || postHog.isFeatureEnabled("101_agent_evals") === true);
};
//#endregion
//#region src/features/agents/composables/useAgentBuilderMainTabs.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var SECTION_QUERY_PARAM = "section";
function getSectionFromQuery(section, isEvalsEnabled) {
	const value = Array.isArray(section) ? section[0] : section;
	if (value === "knowledge" || value === "__executions" || value === "settings") return value;
	if (value === "evals" && isEvalsEnabled) return "evals";
	return null;
}
function getSectionFromTab(tab) {
	if (tab === "knowledge") return "knowledge";
	if (tab === "sessions") return EXECUTIONS_SECTION_KEY;
	if (tab === "settings") return "settings";
	if (tab === "evals") return "evals";
	return null;
}
function useAgentBuilderMainTabs({ executionsCount, routeBacked = computed(() => true) }) {
	const route = useRoute();
	const router = useRouter();
	const i18n = useI18n();
	const isEvalsEnabled = useAgentEvalsFlag();
	const selectedSection = ref(null);
	async function setSelectedSection(section) {
		selectedSection.value = section;
		if (!routeBacked.value) return;
		await router.replace({ query: {
			...route.query,
			[SECTION_QUERY_PARAM]: section ?? void 0
		} });
	}
	const activeMainTab = computed({
		get() {
			if (selectedSection.value === "knowledge") return "knowledge";
			if (selectedSection.value === "__executions") return "sessions";
			if (selectedSection.value === "settings") return "settings";
			if (selectedSection.value === "evals") return "evals";
			return "agent";
		},
		set(tab) {
			setSelectedSection(getSectionFromTab(tab));
		}
	});
	const mainTabOptions = computed(() => [
		{
			label: i18n.baseText("agents.builder.header.tab.agent"),
			value: "agent"
		},
		{
			label: i18n.baseText("agents.builder.header.tab.knowledge"),
			value: "knowledge"
		},
		{
			label: i18n.baseText("agents.builder.header.tab.executions"),
			value: "sessions"
		},
		{
			label: i18n.baseText("agents.builder.header.tab.settings"),
			value: "settings"
		},
		...isEvalsEnabled.value ? [{
			label: i18n.baseText("agents.builder.header.tab.agentEvals"),
			value: "evals"
		}] : []
	]);
	const executionsDescription = computed(() => i18n.baseText("agents.builder.executions.count", {
		adjustToNumber: executionsCount.value,
		interpolate: { count: String(executionsCount.value) }
	}));
	watch(() => [
		routeBacked.value,
		route.query[SECTION_QUERY_PARAM],
		isEvalsEnabled.value
	], ([isRouteBacked, section, evalsEnabled]) => {
		if (!isRouteBacked) return;
		selectedSection.value = getSectionFromQuery(section, evalsEnabled);
	}, { immediate: true });
	return {
		activeMainTab,
		mainTabOptions,
		executionsDescription
	};
}
//#endregion
//#region src/features/agents/components/AgentSetupTasks/agentSetupTasks.registry.ts
/** Returns the task state after the agent configuration is available. */
function getConfigState(context, complete) {
	if (!context.config.loaded) return "unknown";
	return complete ? "complete" : "todo";
}
function getAddChannelState(context) {
	if (!context.channels.loaded) return "unknown";
	return context.channels.ids.length > 0 ? "complete" : "todo";
}
function getPublishAgentState(context) {
	if (!context.publication.loaded) return "unknown";
	return context.publication.activeVersionId ? "complete" : "todo";
}
function isTestAgentComplete(context) {
	return context.sessions.loaded && context.sessions.count > 0;
}
function getTestAgentState(context) {
	if (!context.sessions.loaded) return "unknown";
	return isTestAgentComplete(context) ? "complete" : "todo";
}
var setupTaskDefinitions = {
	"choose-model": {
		titleKey: "agents.builder.setupTasks.chooseModel",
		required: true,
		action: {
			labelKey: "agents.builder.setupTasks.chooseModel",
			target: { kind: "agent" },
			path: "model"
		},
		getState: (context) => getConfigState(context, context.config.model.trim().length > 0)
	},
	"add-tool": {
		titleKey: "agents.builder.setupTasks.addTool",
		required: false,
		action: {
			labelKey: "agents.builder.setupTasks.addTool",
			target: { kind: "tool" }
		},
		getState: (context) => getConfigState(context, context.config.toolCount > 0)
	},
	"add-instructions": {
		titleKey: "agents.builder.setupTasks.addInstructions",
		required: true,
		action: {
			labelKey: "agents.builder.setupTasks.addInstructions",
			target: { kind: "agent" },
			path: "instructions"
		},
		getState: (context) => getConfigState(context, context.config.instructions.trim().length > 0)
	},
	"test-agent": {
		titleKey: "agents.builder.setupTasks.testAgent",
		required: false,
		action: {
			labelKey: "agents.builder.setupTasks.testAgent",
			target: { kind: "agent" },
			path: "preview"
		},
		getVisible: (context) => context.config.isRunnable,
		getState: getTestAgentState
	},
	"add-channel": {
		titleKey: "agents.builder.setupTasks.addChannel",
		descriptionKey: "agents.builder.setupTasks.addChannel.description",
		required: false,
		/** TODO: Decide if we want to conditionally render this */
		getVisible: () => false,
		action: {
			labelKey: "agents.builder.setupTasks.addChannel",
			target: { kind: "channel" }
		},
		getState: getAddChannelState
	},
	"publish-agent": {
		titleKey: "agents.builder.setupTasks.publishAgent",
		getVisible: (context) => context.publication.canPublish && isTestAgentComplete(context),
		required: false,
		action: {
			labelKey: "agents.builder.setupTasks.publishAgent",
			target: { kind: "agent" }
		},
		getState: getPublishAgentState
	}
};
var setupTaskOrder = [
	"choose-model",
	"add-tool",
	"add-instructions",
	"test-agent",
	"add-channel",
	"publish-agent"
];
//#endregion
//#region src/features/agents/components/AgentSetupTasks/useAgentSetupTasks.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useAgentSetupTasks(context) {
	const tasks = computed(() => {
		return setupTaskOrder.map((id) => {
			const { getState, getVisible, ...task } = setupTaskDefinitions[id];
			return {
				...task,
				id,
				visible: getVisible?.(context.value) ?? true,
				state: getState(context.value)
			};
		});
	});
	const isVisible = ref(false);
	const checklistState = computed(() => {
		if (tasks.value.some((task) => task.state === "unknown")) return "unknown";
		return tasks.value.some((task) => task.visible && task.state !== "complete") ? "todo" : "complete";
	});
	watch(checklistState, (state, _, onCleanup) => {
		if (state !== "complete") {
			isVisible.value = state === "todo";
			return;
		}
		if (!isVisible.value) return;
		const timeout = setTimeout(() => {
			isVisible.value = false;
		}, 5 * TIME.SECOND);
		onCleanup(() => clearTimeout(timeout));
	}, { immediate: true });
	return {
		tasks,
		isVisible
	};
}
//#endregion
//#region src/features/agents/components/AgentBuilderChatMode.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$28 = ["aria-label"];
var AgentBuilderChatMode_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBuilderChatMode",
	props: {
		modelValue: {},
		disabled: { type: Boolean },
		testDisabled: { type: Boolean },
		testDisabledReason: {},
		validationIssues: {},
		discovery: { type: Boolean }
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass([_ctx.$style.track, { [_ctx.$style.discovery]: __props.discovery }]),
				role: "group",
				"aria-label": unref(i18n).baseText("agents.builder.chatMode.label"),
				"data-testid": "agent-builder-chat-mode"
			}, [createVNode(unref(N8nButton_default), {
				variant: "ghost",
				class: normalizeClass([_ctx.$style.mode, { [_ctx.$style.active]: __props.modelValue === "build" }]),
				"aria-pressed": __props.modelValue === "build",
				disabled: __props.disabled,
				"data-testid": "agent-builder-mode-build",
				onClick: _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", "build"))
			}, {
				default: withCtx(() => [createVNode(unref(N8nIcon_default), {
					icon: "wrench",
					size: "medium"
				}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.chatMode.build")), 1)]),
				_: 1
			}, 8, [
				"class",
				"aria-pressed",
				"disabled"
			]), createVNode(AgentValidationTooltip_default, {
				disabled: !__props.disabled && !__props.testDisabled,
				fallback: __props.testDisabledReason ?? unref(i18n).baseText("agents.builder.preview.disabledTooltip"),
				action: "preview",
				issues: __props.validationIssues
			}, {
				default: withCtx(() => [createBaseVNode("span", null, [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					class: normalizeClass([_ctx.$style.mode, { [_ctx.$style.active]: __props.modelValue === "test" }]),
					"aria-pressed": __props.modelValue === "test",
					disabled: __props.disabled || __props.testDisabled,
					"data-testid": "agent-builder-mode-test",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("update:modelValue", "test"))
				}, {
					default: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "flask-conical",
						size: "medium"
					}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.chatMode.test")), 1)]),
					_: 1
				}, 8, [
					"class",
					"aria-pressed",
					"disabled"
				])])]),
				_: 1
			}, 8, [
				"disabled",
				"fallback",
				"issues"
			])], 10, _hoisted_1$28);
		};
	}
}), [["__cssModules", { "$style": {
	track: "_track_1ota1_450",
	mode: "_mode_1ota1_459",
	active: "_active_1ota1_477",
	discovery: "_discovery_1ota1_486",
	discover: "_discover_1ota1_486",
	shimmer: "_shimmer_1ota1_1",
	spin: "_spin_1ota1_1",
	"skeleton-pulse": "_skeleton-pulse_1ota1_1",
	opacityPulse: "_opacityPulse_1ota1_1",
	popoverIn: "_popoverIn_1ota1_1",
	fadeIn: "_fadeIn_1ota1_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1ota1_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1ota1_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1ota1_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1ota1_1",
	blurSwapIn: "_blurSwapIn_1ota1_1",
	blurSwapOut: "_blurSwapOut_1ota1_1",
	pulse: "_pulse_1ota1_1",
	pulseGlow: "_pulseGlow_1ota1_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1ota1_1",
	fade: "_fade_1ota1_1",
	fadeInUp: "_fadeInUp_1ota1_1",
	fadeInDown: "_fadeInDown_1ota1_1",
	fadeInLeft: "_fadeInLeft_1ota1_1",
	fadeInRight: "_fadeInRight_1ota1_1",
	fadeOut: "_fadeOut_1ota1_1",
	fadeOutDown: "_fadeOutDown_1ota1_1",
	fadeOutUp: "_fadeOutUp_1ota1_1",
	fadeOutLeft: "_fadeOutLeft_1ota1_1",
	fadeOutRight: "_fadeOutRight_1ota1_1",
	ping: "_ping_1ota1_1",
	blinkBackground: "_blinkBackground_1ota1_1",
	typingBlink: "_typingBlink_1ota1_1"
} }]]);
//#endregion
//#region src/features/agents/components/AgentBuilderChatDisclaimer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentBuilderChatDisclaimer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBuilderChatDisclaimer",
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("p", {
				class: normalizeClass(_ctx.$style.disclaimer),
				"data-testid": "agent-builder-chat-disclaimer"
			}, toDisplayString(unref(i18n).baseText("instanceAi.input.disclaimer")), 3);
		};
	}
}), [["__cssModules", { "$style": { disclaimer: "_disclaimer_1y4o0_1" } }]]);
//#endregion
//#region src/features/agents/composables/useAgentBuilderLayout.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var DEFAULT_CONFIG_RATIO = .35;
var MIN_CHAT_WIDTH = 320;
function useAgentBuilderLayout(containerWidth, availableWidth = containerWidth) {
	const configRatio = useLocalStorage("N8N_AGENT_BUILDER_CONFIG_RATIO", DEFAULT_CONFIG_RATIO);
	const compact = computed(() => {
		const width = toValue(availableWidth);
		return width > 0 && width < 680;
	});
	const maxConfigWidth = computed(() => Math.max(360, toValue(containerWidth) - MIN_CHAT_WIDTH));
	const renderedConfigWidth = computed(() => Math.min(maxConfigWidth.value, Math.max(360, toValue(containerWidth) * configRatio.value)));
	const chatWidth = computed(() => compact.value ? toValue(containerWidth) : Math.max(MIN_CHAT_WIDTH, toValue(containerWidth) - renderedConfigWidth.value));
	const defaultChatWidth = computed(() => Math.max(MIN_CHAT_WIDTH, toValue(containerWidth) - Math.max(360, toValue(containerWidth) * DEFAULT_CONFIG_RATIO)));
	function resizeChat(width) {
		const totalWidth = toValue(containerWidth);
		if (totalWidth <= 0 || compact.value) return;
		configRatio.value = Math.abs(width - defaultChatWidth.value) < 1 ? DEFAULT_CONFIG_RATIO : Math.min(maxConfigWidth.value, Math.max(360, totalWidth - width)) / totalWidth;
	}
	return {
		compact,
		chatWidth,
		defaultChatWidth,
		resizeChat
	};
}
//#endregion
//#region src/features/agents/components/AgentPublishButton.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentPublishButton_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentPublishButton",
	props: {
		agent: {},
		projectId: {},
		agentId: {},
		isSaving: { type: Boolean },
		isUnsaved: { type: Boolean },
		showPublishTimeline: { type: Boolean },
		beforeRevertToPublished: {},
		configValidationStatus: { default: "valid" },
		configValidationIssues: { default: () => [] },
		beforePublish: {}
	},
	emits: [
		"publish-ready",
		"open-publish-timeline",
		"published",
		"unpublished",
		"reverted"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const { canUpdate, canPublish, canUnpublish } = useAgentPermissions(() => props.projectId);
		const emit = __emit;
		const locale = useI18n();
		const { publish, unpublish, revertToPublished, publishing } = useAgentPublish();
		const publishState = computed(() => {
			if (!props.agent?.activeVersionId) return "not-published";
			if (hasAgentUnpublishedChanges(props.agent)) return "published-with-changes";
			return "published-no-changes";
		});
		const isConfigInvalid = computed(() => props.configValidationStatus === null || hasBlockingIssues(props.configValidationIssues));
		const invalidConfigTooltip = computed(() => locale.baseText("agents.publish.button.invalidConfigTooltip"));
		const buttonConfig = computed(() => {
			switch (publishState.value) {
				case "not-published": return {
					text: locale.baseText("agents.publish.button.publish"),
					enabled: true,
					showIndicator: false,
					indicatorClass: ""
				};
				case "published-with-changes": return {
					text: locale.baseText("agents.publish.button.publish"),
					enabled: true,
					showIndicator: true,
					indicatorClass: "changes"
				};
				default: return {
					text: locale.baseText("agents.publish.button.published"),
					enabled: false,
					showIndicator: true,
					indicatorClass: "published"
				};
			}
		});
		const isPublishDisabled = computed(() => !buttonConfig.value.enabled || publishing.value || props.isSaving || !canPublish.value || isConfigInvalid.value);
		watch(isPublishDisabled, (disabled) => emit("publish-ready", !disabled), { immediate: true });
		const dropdownActions = computed(() => {
			const actions = [{
				id: "publish",
				label: locale.baseText("agents.publish.dropdown.publish"),
				shortcut: {
					shiftKey: true,
					keys: ["P"]
				},
				disabled: isPublishDisabled.value
			}];
			if (props.agent?.activeVersionId) actions.push({
				id: "revert-to-published",
				label: locale.baseText("agents.publish.dropdown.revertToPublished"),
				disabled: publishState.value !== "published-with-changes" || publishing.value || props.isSaving || !canUpdate.value
			});
			if (props.showPublishTimeline) actions.push({
				id: "publish-timeline",
				label: locale.baseText("workflowHistory.action.viewTimeline"),
				disabled: !props.agent || props.isUnsaved
			});
			actions.push({
				id: "unpublish",
				label: locale.baseText("agents.publish.dropdown.unpublish"),
				disabled: !props.agent?.activeVersionId || publishing.value || props.isSaving || !canUnpublish.value,
				divided: true
			});
			return actions;
		});
		async function onPublishClick() {
			if (isPublishDisabled.value) return;
			const { projectId, agentId } = props;
			if (props.beforePublish && !await props.beforePublish()) return;
			if (projectId !== props.projectId || agentId !== props.agentId) return;
			if (!props.agent?.versionId) return;
			const updated = await publish(projectId, agentId, void 0, () => projectId === props.projectId && agentId === props.agentId);
			if (updated && projectId === props.projectId && agentId === props.agentId) emit("published", updated);
		}
		useKeybindings({ shift_p: {
			disabled: () => isPublishDisabled.value,
			run: onPublishClick
		} });
		__expose({ publish: onPublishClick });
		async function onDropdownSelect(action) {
			if (action === "publish-timeline") {
				if (props.showPublishTimeline && props.agent && !props.isUnsaved) emit("open-publish-timeline");
				return;
			}
			if (action === "publish") {
				await onPublishClick();
				return;
			}
			if (action === "revert-to-published") {
				if (publishState.value !== "published-with-changes" || props.isSaving || !canUpdate.value) return;
				await props.beforeRevertToPublished?.();
				const updated = await revertToPublished(props.projectId, props.agentId);
				if (updated) emit("reverted", updated);
				return;
			}
			if (action !== "unpublish" || !canUnpublish.value) return;
			const updated = await unpublish(props.projectId, props.agentId, props.agent?.name);
			if (updated) emit("unpublished", updated);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.buttonGroup) }, [createVNode(AgentValidationTooltip_default, {
				disabled: !(buttonConfig.value.enabled && !__props.isSaving && unref(canPublish) && isConfigInvalid.value),
				fallback: invalidConfigTooltip.value,
				action: "publish",
				issues: __props.configValidationIssues
			}, {
				default: withCtx(() => [createVNode(unref(N8nButton_default), {
					class: normalizeClass(_ctx.$style.groupButtonLeft),
					loading: unref(publishing),
					disabled: isPublishDisabled.value,
					variant: "ghost",
					"data-testid": "publish-agent-button",
					onClick: onPublishClick
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.flex) }, [buttonConfig.value.showIndicator ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass({
							[_ctx.$style.indicatorDot]: true,
							[_ctx.$style.indicatorPublished]: buttonConfig.value.indicatorClass === "published",
							[_ctx.$style.indicatorChanges]: buttonConfig.value.indicatorClass === "changes"
						})
					}, null, 2)) : createCommentVNode("", true), createBaseVNode("span", { class: normalizeClass({ [_ctx.$style.indicatorPublishedText]: publishState.value === "published-no-changes" }) }, toDisplayString(buttonConfig.value.text), 3)], 2)]),
					_: 1
				}, 8, [
					"class",
					"loading",
					"disabled"
				])]),
				_: 1
			}, 8, [
				"disabled",
				"fallback",
				"issues"
			]), createVNode(unref(N8nActionDropdown_default), {
				items: dropdownActions.value,
				placement: "bottom-end",
				"data-testid": "agent-publish-dropdown",
				onSelect: onDropdownSelect
			}, {
				activator: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					class: normalizeClass(_ctx.$style.groupButtonRight),
					variant: "ghost",
					icon: "chevron-down",
					"aria-label": unref(locale).baseText("agents.publish.dropdown.ariaLabel"),
					"data-testid": "agent-publish-dropdown-trigger"
				}, null, 8, ["class", "aria-label"])]),
				_: 1
			}, 8, ["items"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	buttonGroup: "_buttonGroup_xtizb_1",
	groupButtonLeft: "_groupButtonLeft_xtizb_7",
	groupButtonRight: "_groupButtonRight_xtizb_19",
	indicatorDot: "_indicatorDot_xtizb_29",
	indicatorPublished: "_indicatorPublished_xtizb_37",
	indicatorPublishedText: "_indicatorPublishedText_xtizb_41",
	indicatorChanges: "_indicatorChanges_xtizb_45",
	flex: "_flex_xtizb_49"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSetupTasks/AgentSetupTasks.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$27 = ["aria-label", "aria-valuenow"];
var _hoisted_2$9 = ["stroke-dashoffset"];
var _hoisted_3$4 = [
	"id",
	"role",
	"data-selected",
	"onFocus",
	"onMouseenter",
	"onClick"
];
var AgentSetupTasks_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSetupTasks",
	props: {
		tasks: {},
		personalisation: {}
	},
	emits: ["action"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const taskIdPrefix = useId();
		const isTriggerShimmering = ref(false);
		const activeTaskIndex = ref(-1);
		const isPopoverOpen = ref(false);
		const areTasksResolved = computed(() => props.tasks.every((task) => task.state !== "unknown"));
		const listRef = useTemplateRef("list");
		watch([
			isPopoverOpen,
			areTasksResolved,
			activeTaskIndex
		], async ([isOpen, resolved]) => {
			if (!isOpen || !resolved) return;
			await nextTick();
			const listElement = listRef.value?.$el;
			if (!(listElement instanceof HTMLElement)) return;
			(listElement.querySelector("[tabindex=\"0\"]") ?? listElement).focus();
		});
		const sortedList = computed(() => {
			return props.tasks.filter((task) => task.visible).toSorted((a, b) => Number(a.state === "complete") - Number(b.state === "complete"));
		});
		const completedTaskCount = computed(() => {
			return sortedList.value.filter((task) => task.state === "complete").length;
		});
		const completionPercentage = computed(() => sortedList.value.length > 0 ? completedTaskCount.value / sortedList.value.length * 100 : 0);
		const completedTasksAreGrouped = computed(() => completedTaskCount.value > 3);
		const incompleteTasks = computed(() => sortedList.value.filter((task) => task.state !== "complete"));
		const triggerLabel = computed(() => i18n.baseText(incompleteTasks.value.length > 0 ? "agents.builder.setupTasks.title" : "agents.builder.setupTasks.done"));
		function getActiveTaskItem() {
			const task = incompleteTasks.value[activeTaskIndex.value];
			return task ? `${taskIdPrefix}-${task.id}` : void 0;
		}
		function resetActiveTask() {
			/** Reset this to -1 so active state doesnt appear until keydown */
			activeTaskIndex.value = -1;
		}
		function setActiveTask(task) {
			const index = incompleteTasks.value.findIndex((incompleteTask) => incompleteTask.id === task.id);
			if (index >= 0) activeTaskIndex.value = index;
		}
		function handleTaskKeydown(event) {
			if (!isPopoverOpen.value) return;
			if (![
				"ArrowUp",
				"ArrowDown",
				"Enter",
				" "
			].includes(event.key)) return;
			event.preventDefault();
			switch (event.key) {
				case "ArrowUp":
					if (activeTaskIndex.value > 0) activeTaskIndex.value -= 1;
					return;
				case "ArrowDown":
					if (activeTaskIndex.value < incompleteTasks.value.length - 1) activeTaskIndex.value += 1;
					return;
				case "Enter":
				case " ": {
					const task = incompleteTasks.value[activeTaskIndex.value];
					if (task) emit("action", task);
					return;
				}
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nPopover_default), {
				open: isPopoverOpen.value,
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => isPopoverOpen.value = $event),
				"suppress-auto-focus": true,
				side: "bottom",
				align: "end",
				width: "280px",
				"content-class": _ctx.$style.popoverContent,
				onBeforeEnter: resetActiveTask
			}, {
				trigger: withCtx(() => [createBaseVNode("button", {
					type: "button",
					class: normalizeClass([_ctx.$style.trigger, { [_ctx.$style.triggerShimmer]: isTriggerShimmering.value && !isPopoverOpen.value }]),
					onAnimationend: _cache[0] || (_cache[0] = withModifiers(($event) => isTriggerShimmering.value = true, ["self"]))
				}, [incompleteTasks.value.length > 0 ? (openBlock(), createElementBlock("svg", {
					key: 0,
					class: normalizeClass(_ctx.$style.progressWheel),
					viewBox: "0 0 20 20",
					fill: "none",
					"stroke-width": "2",
					role: "progressbar",
					"aria-label": unref(i18n).baseText("agents.builder.setupTasks.title"),
					"aria-valuenow": completionPercentage.value,
					"aria-valuemin": 0,
					"aria-valuemax": 100
				}, [createBaseVNode("circle", {
					class: normalizeClass(_ctx.$style.progressTrack),
					cx: "10",
					cy: "10",
					r: "8"
				}, null, 2), createBaseVNode("circle", {
					class: normalizeClass(_ctx.$style.progressValue),
					cx: "10",
					cy: "10",
					r: "8",
					pathLength: "100",
					"stroke-dasharray": "100",
					"stroke-dashoffset": 100 - completionPercentage.value,
					transform: "rotate(-90 10 10)"
				}, null, 10, _hoisted_2$9)], 10, _hoisted_1$27)) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: "check",
					size: 20
				})), createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.triggerLabel),
					step: "sm",
					bold: ""
				}, {
					default: withCtx(() => [createVNode(Transition, {
						"enter-active-class": _ctx.$style.labelEnter,
						"leave-active-class": _ctx.$style.labelLeave
					}, {
						default: withCtx(() => [(openBlock(), createElementBlock("span", { key: triggerLabel.value }, toDisplayString(triggerLabel.value), 1))]),
						_: 1
					}, 8, ["enter-active-class", "leave-active-class"])]),
					_: 1
				}, 8, ["class"])], 34)]),
				content: withCtx(() => [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.container),
					"data-testid": "agent-setup-tasks"
				}, [areTasksResolved.value ? (openBlock(), createBlock(TransitionGroup, {
					key: 0,
					ref: "list",
					tag: "ul",
					role: "menu",
					"aria-label": unref(i18n).baseText("agents.builder.setupTasks.title"),
					tabindex: "-1",
					"aria-activedescendant": getActiveTaskItem(),
					class: normalizeClass(_ctx.$style.list),
					"move-class": _ctx.$style.listMove,
					onKeydown: handleTaskKeydown
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(completedTasksAreGrouped.value ? incompleteTasks.value : sortedList.value, (task, index) => {
						return openBlock(), createElementBlock("li", {
							id: `${unref(taskIdPrefix)}-${task.id}`,
							key: task.id,
							role: task.state !== "complete" ? "menuitem" : void 0,
							"data-selected": task.state !== "complete" && activeTaskIndex.value === index,
							class: normalizeClass([_ctx.$style.listItem, { [_ctx.$style.isComplete]: task.state === "complete" }]),
							onFocus: ($event) => setActiveTask(task),
							onMouseenter: ($event) => setActiveTask(task),
							onClick: ($event) => emit("action", task)
						}, [
							createBaseVNode("div", { class: normalizeClass([_ctx.$style.taskIcon, { [_ctx.$style.isComplete]: task.state === "complete" }]) }, [task.state === "complete" ? (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 0,
								icon: "check",
								size: "small",
								"stroke-width": 2.5
							})) : createCommentVNode("", true)], 2),
							createVNode(unref(N8nText_default), {
								bold: "",
								class: normalizeClass(_ctx.$style.taskTitle)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(task.titleKey)), 1)]),
								_: 2
							}, 1032, ["class"]),
							createVNode(unref(N8nIcon_default), {
								icon: "arrow-right",
								color: "text-light",
								class: normalizeClass(_ctx.$style.taskActionIcon)
							}, null, 8, ["class"])
						], 42, _hoisted_3$4);
					}), 128)), completedTasksAreGrouped.value ? (openBlock(), createElementBlock("li", {
						key: "completed-tasks",
						role: "presentation",
						class: normalizeClass([_ctx.$style.listItem, _ctx.$style.isComplete])
					}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.taskIcon, _ctx.$style.isComplete]) }, [createVNode(unref(N8nIcon_default), {
						icon: "check",
						size: "small",
						"stroke-width": 2.5
					})], 2), createVNode(unref(N8nText_default), {
						bold: "",
						class: normalizeClass(_ctx.$style.taskTitle)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.setupTasks.tasksDone", { interpolate: { count: completedTaskCount.value.toString() } })), 1)]),
						_: 1
					}, 8, ["class"])], 2)) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"aria-label",
					"aria-activedescendant",
					"class",
					"move-class"
				])) : createCommentVNode("", true)], 2)]),
				_: 1
			}, 8, ["open", "content-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	popoverContent: "_popoverContent_1f3vs_573",
	trigger: "_trigger_1f3vs_577",
	fadeIn: "_fadeIn_1f3vs_1",
	triggerLabel: "_triggerLabel_1f3vs_615",
	labelEnter: "_labelEnter_1f3vs_623",
	blurSwapIn: "_blurSwapIn_1f3vs_1",
	labelLeave: "_labelLeave_1f3vs_632",
	blurSwapOut: "_blurSwapOut_1f3vs_1",
	triggerShimmer: "_triggerShimmer_1f3vs_641",
	container: "_container_1f3vs_679",
	header: "_header_1f3vs_687",
	headerContent: "_headerContent_1f3vs_697",
	progressWheel: "_progressWheel_1f3vs_704",
	progressTrack: "_progressTrack_1f3vs_710",
	progressValue: "_progressValue_1f3vs_714",
	progressFill: "_progressFill_1f3vs_1",
	list: "_list_1f3vs_730",
	listMove: "_listMove_1f3vs_765",
	taskMoveBlur: "_taskMoveBlur_1f3vs_1",
	listItem: "_listItem_1f3vs_787",
	taskActionIcon: "_taskActionIcon_1f3vs_800",
	isComplete: "_isComplete_1f3vs_806",
	taskTitle: "_taskTitle_1f3vs_820",
	taskIcon: "_taskIcon_1f3vs_826",
	shimmer: "_shimmer_1f3vs_1",
	spin: "_spin_1f3vs_1",
	"skeleton-pulse": "_skeleton-pulse_1f3vs_1",
	opacityPulse: "_opacityPulse_1f3vs_1",
	popoverIn: "_popoverIn_1f3vs_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1f3vs_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1f3vs_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1f3vs_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1f3vs_1",
	pulse: "_pulse_1f3vs_1",
	pulseGlow: "_pulseGlow_1f3vs_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1f3vs_1",
	fade: "_fade_1f3vs_1",
	fadeInUp: "_fadeInUp_1f3vs_1",
	fadeInDown: "_fadeInDown_1f3vs_1",
	fadeInLeft: "_fadeInLeft_1f3vs_1",
	fadeInRight: "_fadeInRight_1f3vs_1",
	fadeOut: "_fadeOut_1f3vs_1",
	fadeOutDown: "_fadeOutDown_1f3vs_1",
	fadeOutUp: "_fadeOutUp_1f3vs_1",
	fadeOutLeft: "_fadeOutLeft_1f3vs_1",
	fadeOutRight: "_fadeOutRight_1f3vs_1",
	ping: "_ping_1f3vs_1",
	blinkBackground: "_blinkBackground_1f3vs_1",
	typingBlink: "_typingBlink_1f3vs_1"
} }]]);
//#endregion
//#region src/features/agents/components/AgentBuilderHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var AgentBuilderHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBuilderHeader",
	props: {
		agent: {},
		projectId: {},
		agentId: {},
		projectName: {},
		projectIcon: {},
		headerActions: {},
		isUnsaved: { type: Boolean },
		saveStatus: {},
		beforeRevertToPublished: { type: Function },
		artifactMode: { type: Boolean },
		editingLocked: { type: Boolean },
		configValidationStatus: {},
		configValidationIssues: {},
		beforePublish: { type: Function },
		tasks: {}
	},
	emits: [
		"header-action",
		"publish-ready",
		"published",
		"unpublished",
		"reverted",
		"switch-agent",
		"open-publish-timeline",
		"setup-task-action"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		/**
		* Top header bar for the agent builder. Hosts breadcrumb navigation,
		* agent switcher, publish button, and the existing action-menu dropdown.
		*
		* Navigation intents are emitted as events, except for the project breadcrumb
		* which links back to the owning project/personal page.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const $style = useCssModule();
		const publishButton = ref();
		const { createAgent } = useCreateAgent();
		const { list: agentsList, ensureLoaded } = useProjectAgentsList(computed(() => props.projectId));
		onMounted(() => {
			if (props.artifactMode) return;
			ensureLoaded();
		});
		const projectRoute = computed(() => ({
			name: PROJECT_AGENTS,
			params: { projectId: props.projectId }
		}));
		const folderBreadcrumbs = useAgentFolderBreadcrumb(computed(() => props.projectId), computed(() => props.agent?.parentFolderId));
		const breadcrumbItems = computed(() => [{
			id: props.projectId,
			icon: props.projectIcon,
			label: props.projectName ?? i18n.baseText("agents.builder.header.projectFallback"),
			href: router.resolve(projectRoute.value).href
		}, ...folderBreadcrumbs.value]);
		const agentDisplayName = computed(() => props.agent?.name ?? "…");
		function publishAgent() {
			return publishButton.value?.publish();
		}
		__expose({ publishAgent });
		const switcherOptions = computed(() => {
			const others = (agentsList.value ?? []).filter((a) => a.id !== props.agentId);
			if (others.length === 0) return [{
				id: "__empty__",
				label: i18n.baseText("agents.builder.header.switcher.empty"),
				disabled: true
			}];
			return others.map((a) => ({
				id: a.id,
				label: a.name
			}));
		});
		const { filteredItems: filteredSwitcherOptions, handleSearch: onSwitcherSearch } = useDropdownSearch(switcherOptions, { isSearchable: (item) => !item.disabled });
		function onSwitcherSelect(id) {
			if (id === "__empty__") return;
			emit("switch-agent", id);
		}
		function onCreateAgent() {
			createAgent("dropdown", props.projectId);
		}
		function onBreadcrumbSelect(item) {
			router.push(item.id === props.projectId ? projectRoute.value : {
				name: PROJECT_AGENTS,
				params: { projectId: props.projectId },
				query: { folderId: item.id }
			});
		}
		/**
		* Converts an action item and its children to the dropdown menu format.
		*/
		function toMenuItem(action) {
			return {
				id: action.id,
				label: action.label,
				testId: action.testId,
				icon: {
					type: "icon",
					value: action.icon ?? "file"
				},
				disabled: action.disabled,
				divided: action.divided,
				checked: action.checked,
				class: action.id === "delete" ? $style.destructiveItem : void 0,
				data: action,
				children: action.children?.map(toMenuItem)
			};
		}
		const menuItems = computed(() => props.headerActions.map(toMenuItem));
		function onMenuSelect(id) {
			emit("header-action", id);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("header", {
				class: normalizeClass(unref($style).header),
				"data-testid": "agent-builder-header"
			}, [createBaseVNode("div", { class: normalizeClass(unref($style).left) }, [!props.artifactMode ? (openBlock(), createBlock(unref(N8nBreadcrumbs_default), {
				key: 0,
				items: breadcrumbItems.value,
				theme: "medium",
				onItemSelected: onBreadcrumbSelect
			}, {
				append: withCtx(() => [
					createBaseVNode("span", {
						class: normalizeClass(unref($style).crumbSeparator),
						"aria-hidden": "true"
					}, "/", 2),
					createVNode(unref(DropdownMenu_default), {
						items: unref(filteredSwitcherOptions),
						placement: "bottom-start",
						"data-testid": "agent-header-switcher",
						searchable: "",
						"search-placeholder": unref(i18n).baseText("generic.search"),
						"empty-text": unref(i18n).baseText("agents.noResults"),
						onSearch: unref(onSwitcherSearch),
						onSelect: onSwitcherSelect
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							size: "small",
							class: normalizeClass(unref($style).switcherButton),
							"aria-label": unref(i18n).baseText("agents.builder.header.switcher.ariaLabel")
						}, {
							default: withCtx(() => [createBaseVNode("span", { class: normalizeClass([unref($style).switcherLabel, unref($style).agentSwitcherLabel]) }, toDisplayString(agentDisplayName.value), 3), createVNode(unref(N8nIcon_default), {
								icon: "chevron-down",
								size: 12
							})]),
							_: 1
						}, 8, ["class", "aria-label"])]),
						footer: withCtx(() => [createBaseVNode("div", { class: normalizeClass(unref($style).switcherFooter) }, [createVNode(unref(DropdownMenuItem_default), {
							id: "__new_agent__",
							label: unref(i18n).baseText("agents.builder.header.switcher.newAgent"),
							icon: {
								type: "icon",
								value: "plus"
							},
							"test-id": "agent-header-new-agent",
							onSelect: onCreateAgent
						}, null, 8, ["label"])], 2)]),
						_: 1
					}, 8, [
						"items",
						"search-placeholder",
						"empty-text",
						"onSearch"
					]),
					!props.artifactMode && menuItems.value.length > 0 ? (openBlock(), createBlock(unref(DropdownMenu_default), {
						key: 0,
						items: menuItems.value,
						placement: "bottom-start",
						"extra-popper-class": unref($style).headerActionsMenu,
						"data-testid": "agent-header-actions",
						onSelect: onMenuSelect
					}, {
						trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							size: "medium",
							icon: "ellipsis",
							"icon-only": "",
							"aria-label": unref(i18n).baseText("node.moreActions")
						}, null, 8, ["aria-label"])]),
						_: 1
					}, 8, ["items", "extra-popper-class"])) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, ["items"])) : createCommentVNode("", true)], 2), createBaseVNode("div", { class: normalizeClass(unref($style).right) }, [
				__props.saveStatus && __props.saveStatus !== "idle" ? (openBlock(), createElementBlock("span", {
					key: 0,
					class: normalizeClass(unref($style).saveStatus),
					"data-testid": "agent-header-save-status"
				}, toDisplayString(__props.saveStatus === "saving" ? unref(i18n).baseText("agents.builder.header.saving") : unref(i18n).baseText("agents.builder.header.saved")), 3)) : createCommentVNode("", true),
				__props.tasks && __props.tasks.length > 0 && !__props.agent?.isArchived ? (openBlock(), createBlock(AgentSetupTasks_default, {
					key: 1,
					tasks: __props.tasks,
					onAction: _cache[0] || (_cache[0] = ($event) => emit("setup-task-action", $event))
				}, null, 8, ["tasks"])) : createCommentVNode("", true),
				createVNode(unref(N8nHoverCard_default), {
					side: "bottom",
					align: "end"
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "medium",
						icon: "circle-help",
						"icon-only": "",
						"aria-label": unref(i18n).baseText("agents.builder.header.documentation"),
						href: "https://blog.n8n.io/introducing-n8n-agents/",
						target: "_blank",
						"data-testid": "agent-documentation-help"
					}, null, 8, ["aria-label"])]),
					content: withCtx(() => [createBaseVNode("a", {
						href: "https://blog.n8n.io/introducing-n8n-agents/",
						target: "_blank",
						rel: "noopener noreferrer",
						class: normalizeClass(unref($style).documentationLink),
						"data-testid": "agent-documentation-link"
					}, [createVNode(unref(N8nText_default), {
						step: "sm",
						class: normalizeClass(unref($style).documentationTitle)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.header.documentation")) + " ", 1), createVNode(unref(N8nIcon_default), {
							icon: "arrow-up-right",
							size: "small"
						})]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						step: "xs",
						color: "text-base"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.header.documentation.description")), 1)]),
						_: 1
					})], 2)]),
					_: 1
				}),
				__props.agent?.isArchived ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 2,
					variant: "outline",
					"data-testid": "agent-header-archived-badge"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("workflows.item.archived")), 1)]),
					_: 1
				})) : (openBlock(), createBlock(AgentPublishButton_default, {
					key: 3,
					ref_key: "publishButton",
					ref: publishButton,
					agent: __props.agent,
					"project-id": __props.projectId,
					"agent-id": __props.agentId,
					"is-saving": __props.saveStatus === "saving" || __props.editingLocked,
					"show-publish-timeline": !__props.artifactMode,
					"is-unsaved": __props.isUnsaved,
					"before-revert-to-published": __props.beforeRevertToPublished,
					"config-validation-status": __props.configValidationStatus,
					"config-validation-issues": props.configValidationIssues ?? [],
					"before-publish": __props.beforePublish,
					onPublishReady: _cache[1] || (_cache[1] = ($event) => emit("publish-ready", $event)),
					onOpenPublishTimeline: _cache[2] || (_cache[2] = ($event) => emit("open-publish-timeline")),
					onPublished: _cache[3] || (_cache[3] = (a) => emit("published", a)),
					onUnpublished: _cache[4] || (_cache[4] = (a) => emit("unpublished", a)),
					onReverted: _cache[5] || (_cache[5] = (a) => emit("reverted", a))
				}, null, 8, [
					"agent",
					"project-id",
					"agent-id",
					"is-saving",
					"show-publish-timeline",
					"is-unsaved",
					"before-revert-to-published",
					"config-validation-status",
					"config-validation-issues",
					"before-publish"
				]))
			], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_qyqic_1",
	left: "_left_qyqic_16",
	crumbSeparator: "_crumbSeparator_qyqic_38",
	switcherButton: "_switcherButton_qyqic_45",
	switcherLabel: "_switcherLabel_qyqic_51",
	agentSwitcherLabel: "_agentSwitcherLabel_qyqic_59",
	switcherFooter: "_switcherFooter_qyqic_63",
	right: "_right_qyqic_68",
	saveStatus: "_saveStatus_qyqic_77",
	headerActionsMenu: "_headerActionsMenu_qyqic_83",
	destructiveItem: "_destructiveItem_qyqic_87",
	documentationLink: "_documentationLink_qyqic_92",
	documentationTitle: "_documentationTitle_qyqic_104"
} }]]);
//#endregion
//#region src/features/agents/stores/agentCollaboration.store.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;
var WRITE_LOCK_HEARTBEAT_INTERVAL = 30 * TIME.SECOND;
var LOCK_STATE_POLL_INTERVAL = 20 * TIME.SECOND;
var INACTIVITY_CHECK_INTERVAL = 5 * TIME.SECOND;
var INACTIVITY_TIMEOUT_THRESHOLD = 20 * TIME.SECOND;
/**
* Store for tracking the agent builder write lock and active collaborators.
* Mirrors the workflow collaboration store without the canvas/dirty-state
* machinery — the agent builder has its own autosave loop.
*/
var useAgentCollaborationStore = defineStore(STORES.AGENT_COLLABORATION, () => {
	const pushStore = usePushConnectionStore();
	const rootStore = useRootStore();
	const usersStore = useUsersStore();
	const collaborators = ref([]);
	const currentWriterLock = ref(null);
	const lastActivityTime = ref(Date.now());
	const activityCheckInterval = ref(null);
	const heartbeatTimer = ref(null);
	const writeLockHeartbeatTimer = ref(null);
	const lockStatePollTimer = ref(null);
	let lockStatePollingSuspended = false;
	const pushStoreEventListenerRemovalFn = ref(null);
	const collaboratingAgentId = ref(null);
	const isCurrentTabWriter = computed(() => currentWriterLock.value !== null && currentWriterLock.value.clientId === rootStore.pushRef);
	const isCurrentUserWriter = computed(() => currentWriterLock.value?.userId === usersStore.currentUserId);
	const currentWriter = computed(() => collaborators.value.find((c) => c.user.id === currentWriterLock.value?.userId) ?? null);
	const isAnyoneWriting = computed(() => currentWriterLock.value !== null);
	const shouldBeReadOnly = computed(() => isAnyoneWriting.value && !isCurrentTabWriter.value);
	async function fetchWriteLockState(projectId, agentId) {
		try {
			return await getAgentWriteLock(rootStore.restApiContext, projectId, agentId);
		} catch (error) {
			if (error instanceof ResponseError && error.httpStatusCode === 401) {
				lockStatePollingSuspended = true;
				stopLockStatePolling();
			}
			return null;
		}
	}
	function notifyAgentOpened() {
		if (!collaboratingAgentId.value) return;
		pushStore.send({
			type: "agentOpened",
			agentId: collaboratingAgentId.value
		});
	}
	function notifyAgentClosed() {
		if (!collaboratingAgentId.value) return;
		pushStore.send({
			type: "agentClosed",
			agentId: collaboratingAgentId.value
		});
		collaborators.value = collaborators.value.filter(({ user }) => user.id !== usersStore.currentUserId);
	}
	const stopHeartbeat = () => {
		if (heartbeatTimer.value !== null) {
			clearInterval(heartbeatTimer.value);
			heartbeatTimer.value = null;
		}
	};
	const startHeartbeat = () => {
		stopHeartbeat();
		heartbeatTimer.value = window.setInterval(notifyAgentOpened, HEARTBEAT_INTERVAL);
	};
	const stopWriteLockHeartbeat = () => {
		if (writeLockHeartbeatTimer.value !== null) {
			clearInterval(writeLockHeartbeatTimer.value);
			writeLockHeartbeatTimer.value = null;
		}
	};
	const sendWriteLockHeartbeat = () => {
		if (!isCurrentTabWriter.value || !collaboratingAgentId.value) {
			stopWriteLockHeartbeat();
			return;
		}
		pushStore.send({
			type: "agentWriteAccessHeartbeat",
			agentId: collaboratingAgentId.value
		});
	};
	const startWriteLockHeartbeat = () => {
		stopWriteLockHeartbeat();
		writeLockHeartbeatTimer.value = window.setInterval(sendWriteLockHeartbeat, WRITE_LOCK_HEARTBEAT_INTERVAL);
	};
	const stopLockStatePolling = () => {
		if (lockStatePollTimer.value !== null) {
			clearInterval(lockStatePollTimer.value);
			lockStatePollTimer.value = null;
		}
	};
	const pollLockState = async (projectId, agentId) => {
		if (!shouldBeReadOnly.value) {
			stopLockStatePolling();
			return;
		}
		const writeLock = await fetchWriteLockState(projectId, agentId);
		if (collaboratingAgentId.value !== agentId) return;
		if (!writeLock && currentWriterLock.value) {
			currentWriterLock.value = null;
			stopLockStatePolling();
		}
	};
	const startLockStatePolling = (projectId, agentId) => {
		if (lockStatePollingSuspended) return;
		stopLockStatePolling();
		lockStatePollTimer.value = window.setInterval(async () => await pollLockState(projectId, agentId), LOCK_STATE_POLL_INTERVAL);
	};
	function recordActivity() {
		lastActivityTime.value = Date.now();
	}
	function checkInactivity() {
		if (!isCurrentTabWriter.value) return;
		if (Date.now() - lastActivityTime.value >= INACTIVITY_TIMEOUT_THRESHOLD) releaseWriteAccess();
	}
	function stopInactivityCheck() {
		if (activityCheckInterval.value !== null) {
			clearInterval(activityCheckInterval.value);
			activityCheckInterval.value = null;
		}
	}
	function startInactivityCheck() {
		stopInactivityCheck();
		activityCheckInterval.value = window.setInterval(checkInactivity, INACTIVITY_CHECK_INTERVAL);
	}
	function requestWriteAccess() {
		if (isCurrentTabWriter.value) return true;
		if (!collaboratingAgentId.value) return false;
		try {
			pushStore.send({
				type: "agentWriteAccessRequested",
				agentId: collaboratingAgentId.value
			});
		} catch {
			return false;
		}
		return true;
	}
	function requestWriteAccessForce() {
		if (!collaboratingAgentId.value) return false;
		try {
			pushStore.send({
				type: "agentWriteAccessRequested",
				agentId: collaboratingAgentId.value,
				force: true
			});
		} catch {
			return false;
		}
		return true;
	}
	function releaseWriteAccess() {
		currentWriterLock.value = null;
		stopWriteLockHeartbeat();
		if (!collaboratingAgentId.value) return true;
		try {
			pushStore.send({
				type: "agentWriteAccessReleaseRequested",
				agentId: collaboratingAgentId.value
			});
			return true;
		} catch {
			return false;
		}
	}
	function handleWriteLockHolderLeft() {
		if (!currentWriterLock.value) return;
		if (!collaborators.value.some((c) => c.user.id === currentWriterLock.value?.userId)) currentWriterLock.value = null;
	}
	async function initialize(projectId, agentId) {
		if (pushStoreEventListenerRemovalFn.value) {
			if (collaboratingAgentId.value === agentId) return;
			terminate();
		}
		collaboratingAgentId.value = agentId;
		lockStatePollingSuspended = false;
		const writeLock = await fetchWriteLockState(projectId, agentId);
		if (collaboratingAgentId.value !== agentId) return;
		if (writeLock) {
			currentWriterLock.value = writeLock;
			if (isCurrentTabWriter.value) startWriteLockHeartbeat();
			else startLockStatePolling(projectId, agentId);
		}
		pushStoreEventListenerRemovalFn.value = pushStore.addEventListener((event) => {
			if (event.type === "collaboratorsChanged" && event.data.agentId === collaboratingAgentId.value) {
				collaborators.value = event.data.collaborators;
				handleWriteLockHolderLeft();
				return;
			}
			if (event.type === "writeAccessAcquired" && event.data.agentId === collaboratingAgentId.value) {
				currentWriterLock.value = {
					clientId: event.data.clientId,
					userId: event.data.userId
				};
				if (isCurrentTabWriter.value) {
					recordActivity();
					startWriteLockHeartbeat();
					stopLockStatePolling();
				} else startLockStatePolling(projectId, agentId);
				return;
			}
			if (event.type === "writeAccessReleased" && event.data.agentId === collaboratingAgentId.value) {
				currentWriterLock.value = null;
				stopWriteLockHeartbeat();
				stopLockStatePolling();
				return;
			}
		});
		notifyAgentOpened();
		startHeartbeat();
		startInactivityCheck();
	}
	function terminate() {
		if (typeof pushStoreEventListenerRemovalFn.value === "function") {
			pushStoreEventListenerRemovalFn.value();
			pushStoreEventListenerRemovalFn.value = null;
		}
		pushStore.clearQueue();
		notifyAgentClosed();
		stopHeartbeat();
		stopWriteLockHeartbeat();
		stopLockStatePolling();
		stopInactivityCheck();
		if (isCurrentTabWriter.value) releaseWriteAccess();
		collaboratingAgentId.value = null;
		currentWriterLock.value = null;
		collaborators.value = [];
		lockStatePollingSuspended = false;
	}
	return {
		collaborators,
		currentWriter,
		currentWriterLock,
		isCurrentTabWriter,
		isCurrentUserWriter,
		isAnyoneWriting,
		shouldBeReadOnly,
		requestWriteAccess,
		requestWriteAccessForce,
		releaseWriteAccess,
		recordActivity,
		initialize,
		terminate,
		startHeartbeat,
		stopHeartbeat
	};
});
//#endregion
//#region src/features/agents/components/AgentCollaborationBanner.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var AgentCollaborationBanner_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentCollaborationBanner",
	setup(__props) {
		const locale = useI18n();
		const usersStore = useUsersStore();
		const agentCollaborationStore = useAgentCollaborationStore();
		const showBanner = computed(() => agentCollaborationStore.isAnyoneWriting && !agentCollaborationStore.isCurrentTabWriter);
		const writerName = computed(() => {
			const collaborator = agentCollaborationStore.currentWriter?.user;
			if (collaborator) return [collaborator.firstName, collaborator.lastName].filter(Boolean).join(" ") || collaborator.email;
			const lockUserId = agentCollaborationStore.currentWriterLock?.userId;
			if (lockUserId) {
				const u = usersStore.usersById[lockUserId];
				if (u) return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
			}
			return "";
		});
		const bannerMessage = computed(() => {
			if (agentCollaborationStore.isCurrentUserWriter) return locale.baseText("agents.builder.collaboration.banner.readOnly.sameUser");
			const name = writerName.value;
			if (!name) return locale.baseText("agents.builder.collaboration.banner.readOnly.differentUserFallback");
			return locale.baseText("agents.builder.collaboration.banner.readOnly.differentUser", { interpolate: { name } });
		});
		const tooltip = computed(() => {
			if (agentCollaborationStore.isCurrentUserWriter) return locale.baseText("agents.builder.collaboration.banner.tooltip.youOtherTab");
			const name = writerName.value;
			if (!name) return locale.baseText("agents.builder.collaboration.banner.tooltip.otherUserFallback");
			return locale.baseText("agents.builder.collaboration.banner.tooltip.otherUser", { interpolate: { name } });
		});
		const collaboratorsSorted = computed(() => {
			const users = agentCollaborationStore.collaborators.map(({ user }) => user);
			const index = users.findIndex((user) => user.id === usersStore.currentUser?.id);
			if (index < 1) return { defaultGroup: users };
			const [currentUser] = users.splice(index, 1);
			return { defaultGroup: [currentUser, ...users] };
		});
		const currentUserEmail = computed(() => usersStore.currentUser?.email ?? "");
		function onTakeOver() {
			agentCollaborationStore.requestWriteAccessForce();
		}
		return (_ctx, _cache) => {
			return showBanner.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.banner),
				"data-test-id": "agent-collaboration-banner"
			}, [createVNode(unref(N8nCallout_default), {
				theme: "warning",
				class: normalizeClass(_ctx.$style.callout),
				"icon-tooltip": tooltip.value,
				"round-corners": false,
				"only-bottom-border": true
			}, {
				actions: withCtx(() => [unref(agentCollaborationStore).isCurrentUserWriter ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.takeOverButton),
					size: "small",
					"data-test-id": "agent-collaboration-take-over",
					onClick: onTakeOver
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("agents.builder.collaboration.banner.takeOver")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)]),
				trailingContent: withCtx(() => [collaboratorsSorted.value.defaultGroup.length > 0 ? (openBlock(), createBlock(unref(N8nUserStack_default), {
					key: 0,
					users: collaboratorsSorted.value,
					"current-user-email": currentUserEmail.value
				}, null, 8, ["users", "current-user-email"])) : createCommentVNode("", true)]),
				default: withCtx(() => [createTextVNode(toDisplayString(bannerMessage.value) + " ", 1)]),
				_: 1
			}, 8, ["class", "icon-tooltip"])], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	banner: "_banner_1z0ue_1",
	callout: "_callout_1z0ue_5",
	takeOverButton: "_takeOverButton_1z0ue_9"
} }]]);
//#endregion
//#region src/experiments/testButtonPrimaryColor/useTestButtonPrimaryColorExperiment.ts
init_runtime_core_esm_bundler();
function useTestButtonPrimaryColorExperiment() {
	const posthog = usePostHog();
	return { isEnabled: computed(() => posthog.isVariantEnabled(TEST_BUTTON_PRIMARY_COLOR_EXPERIMENT.name, TEST_BUTTON_PRIMARY_COLOR_EXPERIMENT.variant)) };
}
//#endregion
//#region src/features/agents/components/AgentMemoryModelSetting.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentMemoryModelSetting.vue
var AgentMemoryModelSetting_default = /* @__PURE__ */ defineComponent({
	__name: "AgentMemoryModelSetting",
	props: {
		config: {},
		disabled: {
			type: Boolean,
			default: false
		},
		projectId: { default: void 0 }
	},
	emits: ["update:config"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const usersStore = useUsersStore();
		const projectId = computed(() => props.projectId ?? "");
		const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();
		const { credentialsByProvider, selectCredential } = useAgentModelCredentials(usersStore.currentUserId ?? "anonymous", projectId);
		const pendingCredential = ref(null);
		const configuredMemoryWorker = computed(() => {
			const episodicMemory = props.config?.memory?.episodicMemory;
			return (episodicMemory?.enabled === true ? episodicMemory.reflectorModel ?? null : null) ?? props.config?.memory?.observationalMemory?.reflectorModel ?? props.config?.memory?.observationalMemory?.observerModel ?? null;
		});
		const configuredMemoryModel = computed(() => configuredMemoryWorker.value?.model ?? null);
		const configuredMemoryCredential = computed(() => configuredMemoryWorker.value?.credential ?? props.config?.credential ?? null);
		const configuredMemoryProvider = computed(() => {
			const model = configuredMemoryModel.value ?? modelToString(props.config?.model);
			if (!model) return null;
			const parsed = parseModelString(model);
			return parsed && isAgentModelProvider(parsed.provider) ? parsed.provider : null;
		});
		const effectiveCredentials = computed(() => {
			const credentials = credentialsByProvider.value;
			const provider = configuredMemoryProvider.value;
			const credential = configuredMemoryCredential.value;
			if (!credentials) return credentials;
			const effectiveCredentials = provider && credential ? {
				...credentials,
				[provider]: credential
			} : { ...credentials };
			if (pendingCredential.value) effectiveCredentials[pendingCredential.value.provider] = pendingCredential.value.credentialId;
			return effectiveCredentials;
		});
		const selectedMemoryModel = ref(configuredMemoryModel.value);
		const modelsByProvider = computed(() => getModelsForPicker(effectiveCredentials.value));
		const selectedModel = computed(() => {
			const modelString = selectedMemoryModel.value ?? modelToString(props.config?.model);
			if (!modelString) return null;
			const parsed = parseModelString(modelString);
			if (!parsed || !isAgentModelProvider(parsed.provider)) return null;
			const catalogModel = modelsByProvider.value[parsed.provider]?.models.find((model) => model.model === parsed.name);
			if (catalogModel) return catalogModel;
			return {
				provider: parsed.provider,
				model: parsed.name,
				name: parsed.name,
				description: null,
				createdAt: null,
				metadata: {
					functionCalling: false,
					available: true
				}
			};
		});
		watch(projectId, (id) => {
			if (id) ensureLoaded(id);
		}, { immediate: true });
		watch(configuredMemoryModel, (model) => {
			selectedMemoryModel.value = model;
		});
		watch([configuredMemoryProvider, configuredMemoryCredential], ([provider, credential]) => {
			if (pendingCredential.value?.provider === provider && pendingCredential.value.credentialId === credential) pendingCredential.value = null;
		});
		function onMemoryModelChange(selection) {
			const credentialId = effectiveCredentials.value?.[selection.provider] ?? "";
			if (!credentialId) return;
			const model = `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`;
			const workerModel = {
				model,
				credential: credentialId
			};
			const existingMemory = props.config?.memory;
			const existingEpisodicMemory = existingMemory?.episodicMemory;
			selectedMemoryModel.value = model;
			emit("update:config", { memory: {
				...existingMemory,
				enabled: true,
				storage: "n8n",
				observationalMemory: {
					...existingMemory?.observationalMemory,
					observerModel: workerModel,
					reflectorModel: workerModel
				},
				...existingEpisodicMemory?.enabled === true ? { episodicMemory: {
					...existingEpisodicMemory,
					reflectorModel: workerModel
				} } : {}
			} });
		}
		function onSelectCredential(provider, credentialId) {
			selectCredential(provider, credentialId);
			pendingCredential.value = credentialId ? {
				provider,
				credentialId
			} : null;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
				step: "sm",
				bold: "",
				class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.recallModel.label")), 1)]),
				_: 1
			}, 8, ["class"]), createVNode(unref(N8nText_default), {
				size: "small",
				class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.recallModel.hint")), 1)]),
				_: 1
			}, 8, ["class"])], 2), createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingControlWide) }, [createVNode(AgentModelSelector_default, {
				"selected-model": selectedModel.value,
				credentials: effectiveCredentials.value,
				"models-by-provider": modelsByProvider.value,
				"is-loading": unref(isLoading),
				"project-id": projectId.value,
				"warn-missing-credentials": true,
				"bound-credential-id": configuredMemoryCredential.value,
				"credential-modal-append-to-body": "",
				disabled: props.disabled,
				"data-testid": "agent-memory-recall-model-selector",
				onChange: onMemoryModelChange,
				onSelectCredential
			}, null, 8, [
				"selected-model",
				"credentials",
				"models-by-provider",
				"is-loading",
				"project-id",
				"bound-credential-id",
				"disabled"
			])], 2)], 2);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentAdvancedPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
/**
* Creates a ref, debounced config-emit, change handler, and watch-sync
* function for one numeric field inside `config`. Designed for N8nInputNumber
* which emits numbers directly (NaN when the field is cleared).
*
* Pass a number for fields that always persist their fallback (e.g. concurrency).
* Pass `{ displayDefault }` for optional fields that show a runtime default in
* the UI but omit the key from saved config when cleared.
*/
var CONCURRENCY_MIN = 1;
var CONCURRENCY_MAX = 100;
var CONCURRENCY_DEFAULT = 1;
var MAX_ITERATIONS_MIN = 1;
var MAX_ITERATIONS_MAX = 200;
var MAX_ITERATIONS_DEFAULT = 100;
var PROMPT_CACHING_TTL_DEFAULT = "1h";
var AgentAdvancedPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentAdvancedPanel",
	props: {
		config: {},
		disabled: {
			type: Boolean,
			default: false
		},
		projectId: {}
	},
	emits: ["update:config"],
	setup(__props, { emit: __emit }) {
		/** Advanced settings for memory and execution behavior. */
		const i18n = useI18n();
		const { catalog, ensureLoaded } = useModelCatalog();
		function normalizeReasoningLevel(value) {
			return AGENT_REASONING_LEVELS.find((level) => level === value) ?? "medium";
		}
		const props = __props;
		const emit = __emit;
		const selectedModel = computed(() => parseModelString(modelToString(props.config?.model)));
		const selectedCatalogModel = computed(() => {
			if (!selectedModel.value) return void 0;
			return catalog.value[selectedModel.value.provider]?.models[selectedModel.value.name];
		});
		const isReasoningUnavailable = computed(() => !selectedModel.value || selectedCatalogModel.value?.reasoning === false);
		const reasoningHintKey = computed(() => {
			if (!selectedModel.value) return "agents.builder.advanced.reasoning.noModelHint";
			if (selectedCatalogModel.value?.reasoning === false) return "agents.builder.advanced.reasoning.unsupportedHint";
			return "agents.builder.advanced.reasoning.hint";
		});
		const promptCachingCapability = computed(() => getModelPromptCachingCapability(modelToString(props.config?.model)));
		watch(() => props.projectId, (projectId) => {
			if (projectId) ensureLoaded(projectId);
		}, { immediate: true });
		function makeNumberField(key, options) {
			const displayDefault = typeof options === "number" ? options : options.displayDefault;
			const persistFallback = typeof options === "number";
			const resolveDisplay = (cfg) => cfg?.config?.[key] ?? displayDefault;
			const value = ref(resolveDisplay(props.config));
			const debouncedEmit = useDebounceFn(() => {
				const cfg = { ...props.config?.config ?? {} };
				if (value.value === void 0) delete cfg[key];
				else cfg[key] = value.value;
				emit("update:config", { config: cfg });
			}, 500);
			const emitConfig = (nextValue) => {
				const cfg = { ...props.config?.config ?? {} };
				if (nextValue === void 0) delete cfg[key];
				else cfg[key] = nextValue;
				emit("update:config", { config: cfg });
			};
			return {
				modelValue: value,
				onChange(n) {
					if (persistFallback) {
						value.value = isNaN(n) ? displayDefault : n;
						debouncedEmit();
						return;
					}
					if (isNaN(n)) {
						value.value = displayDefault;
						emitConfig(void 0);
						return;
					}
					value.value = n;
					emitConfig(n);
				},
				sync(cfg) {
					value.value = resolveDisplay(cfg);
				}
			};
		}
		const { modelValue: concurrencyModelValue, onChange: onConcurrencyChange, sync: syncConcurrency } = makeNumberField("toolCallConcurrency", CONCURRENCY_DEFAULT);
		const { modelValue: maxIterationsModelValue, onChange: onMaxIterationsChange, sync: syncMaxIterations } = makeNumberField("maxIterations", { displayDefault: MAX_ITERATIONS_DEFAULT });
		const reasoningEnabled = ref(props.config?.config?.reasoning !== void 0);
		const reasoningLevel = ref(normalizeReasoningLevel(props.config?.config?.reasoning));
		function anthropicTtlFrom(cfg) {
			return cfg?.config?.promptCaching?.anthropic?.ttl ?? PROMPT_CACHING_TTL_DEFAULT;
		}
		const anthropicTtl = ref(anthropicTtlFrom(props.config));
		const promptCachingEnabled = computed(() => props.config?.config?.promptCaching?.enabled !== false);
		watch(() => props.config, (config) => {
			if (!config) return;
			reasoningEnabled.value = config.config?.reasoning !== void 0;
			reasoningLevel.value = normalizeReasoningLevel(config.config?.reasoning);
			anthropicTtl.value = anthropicTtlFrom(config);
			syncConcurrency(config);
			syncMaxIterations(config);
		}, { deep: true });
		function emitReasoning() {
			emit("update:config", { config: {
				...props.config?.config,
				reasoning: reasoningLevel.value
			} });
		}
		function onReasoningToggle(value) {
			reasoningEnabled.value = value;
			if (!value) {
				const rest = { ...props.config?.config ?? {} };
				delete rest.reasoning;
				emit("update:config", { config: rest });
				return;
			}
			emitReasoning();
		}
		function onReasoningLevelChange(value) {
			reasoningLevel.value = value;
			emitReasoning();
		}
		function emitPromptCaching(enabled) {
			const ttl = props.config?.config?.promptCaching?.anthropic?.ttl;
			emit("update:config", { config: {
				...props.config?.config,
				promptCaching: {
					enabled,
					...ttl ? { anthropic: { ttl } } : {}
				}
			} });
		}
		function onAnthropicTtlChange(value) {
			anthropicTtl.value = value;
			emit("update:config", { config: {
				...props.config?.config,
				promptCaching: {
					enabled: true,
					anthropic: { ttl: value }
				}
			} });
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.panels),
				"data-testid": "agent-behavior-panel"
			}, [createVNode(AgentPanel_default, {
				header: unref(i18n).baseText("agents.builder.advanced.title"),
				description: unref(i18n).baseText("agents.builder.advanced.description")
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
					createVNode(AgentMemoryModelSetting_default, {
						config: props.config,
						disabled: props.disabled,
						"project-id": props.projectId,
						"onUpdate:config": _cache[0] || (_cache[0] = ($event) => emit("update:config", $event))
					}, null, 8, [
						"config",
						"disabled",
						"project-id"
					]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingGroup) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.reasoning.label")), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel),
						"data-testid": "agent-reasoning-hint"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(reasoningHintKey.value)), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(Switch_default), {
						"model-value": reasoningEnabled.value,
						disabled: props.disabled || isReasoningUnavailable.value,
						class: normalizeClass([_ctx.$style.switchControl, unref(agent_panel_module_default).settingControl]),
						"data-testid": "agent-reasoning-toggle",
						"onUpdate:modelValue": _cache[1] || (_cache[1] = (v) => onReasoningToggle(Boolean(v)))
					}, null, 8, [
						"model-value",
						"disabled",
						"class"
					])], 2), reasoningEnabled.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.subSettings),
						"data-testid": "agent-reasoning-settings"
					}, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.reasoningEffort.label")), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(N8nSelect_default), {
						"model-value": reasoningLevel.value,
						size: "small",
						disabled: props.disabled || isReasoningUnavailable.value,
						class: normalizeClass(unref(agent_panel_module_default).settingControlShort),
						"data-testid": "agent-reasoning-effort-select",
						"onUpdate:modelValue": onReasoningLevelChange
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(AGENT_REASONING_LEVELS), (opt) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: opt,
								value: opt,
								label: opt
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, [
						"model-value",
						"disabled",
						"class"
					])], 2)], 2)) : createCommentVNode("", true)], 2),
					promptCachingCapability.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.settingGroup)
					}, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.promptCaching.label")), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.promptCaching.hint")), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(Switch_default), {
						"model-value": promptCachingEnabled.value,
						disabled: props.disabled,
						class: normalizeClass([_ctx.$style.switchControl, unref(agent_panel_module_default).settingControl]),
						"data-testid": "agent-prompt-caching-toggle",
						"data-attr": "agent-prompt-caching-toggle",
						"onUpdate:modelValue": _cache[2] || (_cache[2] = (v) => emitPromptCaching(Boolean(v)))
					}, null, 8, [
						"model-value",
						"disabled",
						"class"
					])], 2), promptCachingEnabled.value && promptCachingCapability.value === "ttl" ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.subSettings)
					}, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.promptCachingTtl.label")), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(N8nSelect_default), {
						"model-value": anthropicTtl.value,
						size: "small",
						disabled: props.disabled,
						class: normalizeClass(unref(agent_panel_module_default).settingControlShort),
						"data-testid": "agent-prompt-caching-ttl-select",
						"onUpdate:modelValue": _cache[3] || (_cache[3] = (v) => onAnthropicTtlChange(v))
					}, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(ANTHROPIC_CACHE_TTL_OPTIONS), (opt) => {
							return openBlock(), createBlock(unref(N8nOption_default), {
								key: opt,
								value: opt,
								label: opt
							}, null, 8, ["value", "label"]);
						}), 128))]),
						_: 1
					}, 8, [
						"model-value",
						"disabled",
						"class"
					])], 2)], 2)) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.concurrency.label")), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.concurrency.hint")), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(N8nInputNumber_default), {
						"model-value": unref(concurrencyModelValue),
						min: CONCURRENCY_MIN,
						max: CONCURRENCY_MAX,
						precision: 0,
						controls: false,
						disabled: props.disabled,
						class: normalizeClass(unref(agent_panel_module_default).settingControlShort),
						"data-testid": "agent-concurrency-input",
						"onUpdate:modelValue": unref(onConcurrencyChange)
					}, null, 8, [
						"model-value",
						"disabled",
						"class",
						"onUpdate:modelValue"
					])], 2),
					createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.maxIterations.label")), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.advanced.maxIterations.hint")), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(N8nInputNumber_default), {
						"model-value": unref(maxIterationsModelValue),
						min: MAX_ITERATIONS_MIN,
						max: MAX_ITERATIONS_MAX,
						precision: 0,
						controls: false,
						disabled: props.disabled,
						class: normalizeClass(unref(agent_panel_module_default).settingControlShort),
						"data-testid": "agent-max-iterations-input",
						"onUpdate:modelValue": unref(onMaxIterationsChange)
					}, null, 8, [
						"model-value",
						"disabled",
						"class",
						"onUpdate:modelValue"
					])], 2)
				], 2)]),
				_: 1
			}, 8, ["header", "description"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panels: "_panels_hon1a_2",
	content: "_content_hon1a_8",
	settingGroup: "_settingGroup_hon1a_15",
	subSettings: "_subSettings_hon1a_21",
	switchControl: "_switchControl_hon1a_29"
} }]]);
//#endregion
//#region src/features/agents/composables/useBudgetCoverageCalloutDismissal.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The budget coverage caption in the usage-and-limits panel explains which
* costs the limits cover. A builder who has read it once does not need it on
* every visit. `sessionStorage`-backed so it survives a reload but clears
* when the tab closes.
*/
var STORAGE_KEY$1 = "N8N_AGENT_BUDGET_COVERAGE_CALLOUT_DISMISSED";
var version$1 = ref(0);
function useBudgetCoverageCalloutDismissal() {
	const dismissed = computed(() => {
		version$1.value;
		return sessionStorage.getItem(STORAGE_KEY$1) === "true";
	});
	function dismiss() {
		sessionStorage.setItem(STORAGE_KEY$1, "true");
		version$1.value++;
	}
	return {
		dismissed,
		dismiss
	};
}
//#endregion
//#region src/features/agents/components/BudgetAlertSlider.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var BudgetAlertSlider_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "BudgetAlertSlider",
	props: {
		modelValue: {},
		label: {},
		disabled: { type: Boolean }
	},
	emits: ["update:modelValue"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		function onUpdate([value]) {
			emit("update:modelValue", value);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nSlider_default), {
				"model-value": [__props.modelValue],
				"min-value": 10,
				step: 10,
				"show-step-markers": "",
				"hide-value": "",
				size: "small",
				disabled: __props.disabled,
				"aria-label": __props.label,
				class: normalizeClass(_ctx.$style.slider),
				"data-testid": "agent-budget-alert-slider",
				"onUpdate:modelValue": onUpdate
			}, null, 8, [
				"model-value",
				"disabled",
				"aria-label",
				"class"
			]);
		};
	}
}), [["__cssModules", { "$style": { slider: "_slider_61frl_1" } }]]);
//#endregion
//#region src/features/agents/components/AgentBudgetMonthlyModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentBudgetMonthlyModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBudgetMonthlyModal",
	props: {
		open: { type: Boolean },
		config: {},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:open", "save"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const amount = ref();
		const alertOn = ref(false);
		const alertPercent = ref(80);
		const hasAmount = () => amount.value !== void 0;
		const alertPercentLabel = computed(() => i18n.baseText("agents.builder.budget.alert.percent", { interpolate: { percent: alertPercent.value } }));
		watch(() => props.open, (open) => {
			if (!open) return;
			const budget = props.config?.config?.guardrails?.budget;
			amount.value = parseBudgetAmount(budget?.monthlyBudgetUsd);
			const saved = budget?.alertThresholdPercent;
			alertOn.value = saved !== void 0 && amount.value !== void 0;
			alertPercent.value = saved === void 0 ? 80 : snapAlertPercent(saved);
		}, { immediate: true });
		function onAmount(value) {
			amount.value = parseBudgetAmount(value);
			if (!hasAmount()) alertOn.value = false;
		}
		function onAlertToggle(value) {
			if (!hasAmount()) return;
			alertOn.value = value;
			if (value) alertPercent.value = snapAlertPercent(alertPercent.value);
		}
		function save() {
			emit("save", monthlyBudgetSave(props.config, amount.value, {
				enabled: alertOn.value && hasAmount(),
				percent: alertPercent.value
			}));
			emit("update:open", false);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: __props.open,
				size: "medium",
				title: unref(i18n).baseText("agents.builder.budget.monthly.modalTitle"),
				"data-testid": "agent-budget-monthly-modal",
				"onUpdate:open": _cache[1] || (_cache[1] = ($event) => emit("update:open", $event))
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					disabled: __props.disabled,
					"data-testid": "agent-budget-monthly-save",
					onClick: save
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, ["disabled"])]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [
					createBaseVNode("label", { class: normalizeClass(_ctx.$style.amountRow) }, [createVNode(unref(N8nInputNumber_default), {
						"model-value": amount.value,
						min: 0,
						controls: false,
						disabled: __props.disabled,
						class: normalizeClass(_ctx.$style.amountInput),
						"data-testid": "agent-budget-monthly-amount",
						"onUpdate:modelValue": onAmount
					}, {
						prefix: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.currencyPrefix")), 1)]),
						_: 1
					}, 8, [
						"model-value",
						"disabled",
						"class"
					]), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(_ctx.$style.suffix)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.monthly.suffix")), 1)]),
						_: 1
					}, 8, ["class"])], 2),
					createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(_ctx.$style.hint)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.monthly.stop")), 1)]),
						_: 1
					}, 8, ["class"]),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.alert) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.alertCopy) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.alert.label")), 1)]),
						_: 1
					}), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(_ctx.$style.hint)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.alert.hint")), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(Switch_default), {
						"model-value": alertOn.value,
						disabled: __props.disabled || !hasAmount(),
						size: "small",
						"aria-label": unref(i18n).baseText("agents.builder.budget.alert.label"),
						"data-testid": "agent-budget-alert-switch",
						"onUpdate:modelValue": onAlertToggle
					}, null, 8, [
						"model-value",
						"disabled",
						"aria-label"
					])], 2),
					alertOn.value && hasAmount() ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.slider)
					}, [createVNode(unref(N8nText_default), { size: "small" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(alertPercentLabel.value), 1)]),
						_: 1
					}), createVNode(BudgetAlertSlider_default, {
						modelValue: alertPercent.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => alertPercent.value = $event),
						disabled: __props.disabled,
						label: alertPercentLabel.value
					}, null, 8, [
						"modelValue",
						"disabled",
						"label"
					])], 2)) : createCommentVNode("", true)
				], 2)]),
				_: 1
			}, 8, ["open", "title"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_aeuc2_1",
	amountRow: "_amountRow_aeuc2_10",
	amountInput: "_amountInput_aeuc2_16",
	suffix: "_suffix_aeuc2_21",
	hint: "_hint_aeuc2_26",
	alert: "_alert_aeuc2_30",
	alertCopy: "_alertCopy_aeuc2_37",
	slider: "_slider_aeuc2_43"
} }]]);
//#endregion
//#region src/features/agents/components/AgentBudgetSessionModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentBudgetSessionModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBudgetSessionModal",
	props: {
		open: { type: Boolean },
		config: {},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:open", "save"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const amount = ref();
		watch(() => props.open, (open) => {
			if (!open) return;
			amount.value = parseBudgetAmount(props.config?.config?.guardrails?.budget?.sessionCostCapUsd);
		}, { immediate: true });
		function onAmount(value) {
			amount.value = parseBudgetAmount(value);
		}
		function save() {
			emit("save", sessionCapSave(props.config, amount.value));
			emit("update:open", false);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: __props.open,
				size: "medium",
				title: unref(i18n).baseText("agents.builder.budget.session.modalTitle"),
				"data-testid": "agent-budget-session-modal",
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => emit("update:open", $event))
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					disabled: __props.disabled,
					"data-testid": "agent-budget-session-save",
					onClick: save
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, ["disabled"])]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [createBaseVNode("label", { class: normalizeClass(_ctx.$style.amountRow) }, [createVNode(unref(N8nInputNumber_default), {
					"model-value": amount.value,
					min: 0,
					controls: false,
					disabled: __props.disabled,
					class: normalizeClass(_ctx.$style.amountInput),
					"data-testid": "agent-budget-session-amount",
					"onUpdate:modelValue": onAmount
				}, {
					prefix: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.currencyPrefix")), 1)]),
					_: 1
				}, 8, [
					"model-value",
					"disabled",
					"class"
				]), createVNode(unref(N8nText_default), {
					size: "small",
					class: normalizeClass(_ctx.$style.suffix)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.session.suffix")), 1)]),
					_: 1
				}, 8, ["class"])], 2), createVNode(unref(N8nText_default), {
					size: "small",
					class: normalizeClass(_ctx.$style.hint)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.session.stop")), 1)]),
					_: 1
				}, 8, ["class"])], 2)]),
				_: 1
			}, 8, ["open", "title"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_sadhh_1",
	amountRow: "_amountRow_sadhh_7",
	amountInput: "_amountInput_sadhh_13",
	suffix: "_suffix_sadhh_18",
	hint: "_hint_sadhh_23"
} }]]);
//#endregion
//#region src/features/agents/components/AgentBudgetPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$26 = ["aria-valuenow"];
var _hoisted_2$8 = ["disabled"];
var _hoisted_3$3 = ["disabled"];
var AgentBudgetPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBudgetPanel",
	props: {
		config: {},
		projectId: {},
		agentId: {},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:config"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const { dismissed: coverageCaptionDismissed, dismiss: dismissCoverageCaption } = useBudgetCoverageCalloutDismissal();
		const monthlyOpen = ref(false);
		const sessionOpen = ref(false);
		const spentUsd = ref();
		const spendState = ref("idle");
		let spendRequest = 0;
		const budget = computed(() => props.config?.config?.guardrails?.budget);
		const monthlyBudget = computed(() => parseBudgetAmount(budget.value?.monthlyBudgetUsd));
		const sessionCap = computed(() => parseBudgetAmount(budget.value?.sessionCostCapUsd));
		const usagePercent = computed(() => {
			const limit = monthlyBudget.value;
			const spent = spentUsd.value;
			if (limit === void 0 || spent === void 0 || limit <= 0) return limit === 0 && spent !== void 0 && spent > 0 ? 100 : 0;
			return Math.min(100, Math.round(spent / limit * 100));
		});
		async function loadSpend(silent = false) {
			const request = ++spendRequest;
			if (monthlyBudget.value === void 0 || !props.projectId || !props.agentId) {
				spendState.value = "idle";
				spentUsd.value = void 0;
				return;
			}
			if (!silent) spendState.value = "loading";
			try {
				const result = await getAgentBudgetSpend(rootStore.restApiContext, props.projectId, props.agentId);
				if (request !== spendRequest) return;
				spentUsd.value = result.spentUsd;
				spendState.value = "ready";
			} catch {
				if (request !== spendRequest) return;
				if (!silent || spentUsd.value === void 0) {
					spentUsd.value = void 0;
					spendState.value = "error";
				} else spendState.value = "ready";
			}
		}
		watch([() => props.agentId, monthlyBudget], () => {
			loadSpend().catch(() => {
				spendState.value = "error";
			});
		}, { immediate: true });
		useAgentExecutionUpdates({
			projectId: computed(() => props.projectId),
			agentId: computed(() => props.agentId)
		}, () => loadSpend(true));
		const monthlyValue = computed(() => {
			const amount = monthlyBudget.value;
			if (amount === void 0) return i18n.baseText("agents.builder.budget.notSet");
			return i18n.baseText("agents.builder.budget.monthly.value", { interpolate: { amount: formatBudgetUsd(amount) } });
		});
		const sessionValue = computed(() => {
			const amount = sessionCap.value;
			if (amount === void 0) return i18n.baseText("agents.builder.budget.notSet");
			return formatBudgetUsd(amount);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentPanel_default, {
				header: unref(i18n).baseText("agents.builder.budget.title"),
				"header-visibility": "visually-hidden",
				"data-testid": "agent-budget-panel"
			}, {
				default: withCtx(() => [
					createBaseVNode("div", { class: normalizeClass([__props.disabled && unref(agent_panel_module_default).disabled, _ctx.$style.body]) }, [
						createBaseVNode("div", {
							"data-testid": "agent-budget-usage",
							class: normalizeClass(_ctx.$style.usageSection)
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.usageHeader) }, [createVNode(unref(N8nText_default), {
							step: "sm",
							bold: "",
							class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.usage.label")), 1)]),
							_: 1
						}, 8, ["class"]), monthlyBudget.value === void 0 ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.usage.none")), 1)]),
							_: 1
						}, 8, ["class"])) : spendState.value === "error" ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.usage.unavailable")), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)], 2), monthlyBudget.value !== void 0 && spendState.value === "ready" && spentUsd.value !== void 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.usageLine) }, [createVNode(unref(I18nT), {
								keypath: "agents.builder.budget.usage.spent",
								scope: "global",
								tag: "span",
								class: normalizeClass(_ctx.$style.spent)
							}, {
								spent: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.amount) }, toDisplayString(unref(formatBudgetUsd)(spentUsd.value)), 3)]),
								budget: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.amount) }, toDisplayString(unref(formatBudgetUsd)(monthlyBudget.value)), 3)]),
								_: 1
							}, 8, ["class"]), createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(usagePercent.value) + "%", 1)]),
								_: 1
							})], 2),
							createBaseVNode("div", {
								class: normalizeClass(_ctx.$style.track),
								role: "meter",
								"aria-valuenow": usagePercent.value,
								"aria-valuemin": "0",
								"aria-valuemax": "100"
							}, [createBaseVNode("div", {
								class: normalizeClass(_ctx.$style.fill),
								style: normalizeStyle({ width: `${usagePercent.value}%` })
							}, null, 6)], 10, _hoisted_1$26),
							createVNode(unref(N8nText_default), {
								size: "small",
								class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.usage.estimate")), 1)]),
								_: 1
							}, 8, ["class"])
						], 64)) : createCommentVNode("", true)], 2),
						createBaseVNode("button", {
							type: "button",
							class: normalizeClass(_ctx.$style.row),
							disabled: __props.disabled,
							"data-testid": "agent-budget-monthly-row",
							onClick: _cache[0] || (_cache[0] = ($event) => monthlyOpen.value = true)
						}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.rowLabel) }, [createVNode(unref(N8nText_default), {
							step: "sm",
							bold: "",
							class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.monthly.label")), 1)]),
							_: 1
						}, 8, ["class"]), createVNode(unref(N8nText_default), {
							size: "small",
							class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.monthly.hint")), 1)]),
							_: 1
						}, 8, ["class"])], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.rowValue) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.rowValueStack) }, [createVNode(unref(N8nText_default), { size: "small" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(monthlyValue.value), 1)]),
							_: 1
						}), monthlyBudget.value !== void 0 && budget.value?.alertThresholdPercent !== void 0 ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel),
							"data-testid": "agent-budget-alert-value"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.monthly.alert", { interpolate: { percent: budget.value.alertThresholdPercent } })), 1)]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true)], 2), createVNode(unref(N8nIcon_default), { icon: "chevron-right" })], 2)], 10, _hoisted_2$8),
						createBaseVNode("button", {
							type: "button",
							class: normalizeClass(_ctx.$style.row),
							disabled: __props.disabled,
							"data-testid": "agent-budget-session-row",
							onClick: _cache[1] || (_cache[1] = ($event) => sessionOpen.value = true)
						}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.rowLabel) }, [createVNode(unref(N8nText_default), {
							step: "sm",
							bold: "",
							class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.session.label")), 1)]),
							_: 1
						}, 8, ["class"]), createVNode(unref(N8nText_default), {
							size: "small",
							class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.session.hint")), 1)]),
							_: 1
						}, 8, ["class"])], 2), createBaseVNode("span", { class: normalizeClass(_ctx.$style.rowValue) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.rowValueStack) }, [createVNode(unref(N8nText_default), { size: "small" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(sessionValue.value), 1)]),
							_: 1
						})], 2), createVNode(unref(N8nIcon_default), { icon: "chevron-right" })], 2)], 10, _hoisted_3$3),
						!unref(coverageCaptionDismissed) ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "info",
							slim: "",
							"data-testid": "agent-budget-coverage-callout"
						}, {
							trailingContent: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								icon: "x",
								variant: "ghost",
								size: "xsmall",
								"aria-label": unref(i18n).baseText("generic.dismiss"),
								"data-testid": "agent-budget-coverage-dismiss",
								onClick: unref(dismissCoverageCaption)
							}, null, 8, ["aria-label", "onClick"])]),
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.budget.coverage.caption")) + " ", 1)]),
							_: 1
						})) : createCommentVNode("", true)
					], 2),
					createVNode(AgentBudgetMonthlyModal_default, {
						open: monthlyOpen.value,
						config: __props.config,
						disabled: __props.disabled,
						"onUpdate:open": _cache[2] || (_cache[2] = ($event) => monthlyOpen.value = $event),
						onSave: _cache[3] || (_cache[3] = ($event) => emit("update:config", $event))
					}, null, 8, [
						"open",
						"config",
						"disabled"
					]),
					createVNode(AgentBudgetSessionModal_default, {
						open: sessionOpen.value,
						config: __props.config,
						disabled: __props.disabled,
						"onUpdate:open": _cache[4] || (_cache[4] = ($event) => sessionOpen.value = $event),
						onSave: _cache[5] || (_cache[5] = ($event) => emit("update:config", $event))
					}, null, 8, [
						"open",
						"config",
						"disabled"
					])
				]),
				_: 1
			}, 8, ["header"]);
		};
	}
}), [["__cssModules", { "$style": {
	body: "_body_19lrm_1",
	usageSection: "_usageSection_19lrm_7",
	usageHeader: "_usageHeader_19lrm_13",
	spent: "_spent_19lrm_25",
	amount: "_amount_19lrm_31",
	usageLine: "_usageLine_19lrm_36",
	rowValue: "_rowValue_19lrm_44",
	rowValueStack: "_rowValueStack_19lrm_51",
	track: "_track_19lrm_59",
	fill: "_fill_19lrm_66",
	row: "_row_19lrm_44",
	rowLabel: "_rowLabel_19lrm_88"
} }]]);
//#endregion
//#region src/features/agents/components/AgentChannelApprovalSetting.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
/**
* The catalog names actions, so a new action appears here without a label. It
* falls back to its raw name rather than to a missing-key placeholder.
*/
var toggleId = "agent-channel-approval-toggle";
var AgentChannelApprovalSetting_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentChannelApprovalSetting",
	props: {
		modelValue: {},
		actions: {}
	},
	emits: ["update:modelValue", "update:valid"],
	setup(__props, { emit: __emit }) {
		/**
		* Opt-in approval for a channel's actions.
		*
		* The toggle is the whole control for a builder who does not want to think
		* about individual actions: turning it on pre-selects the actions that reach
		* outside the conversation the agent was addressed in. The selector below it is
		* there to narrow or widen that.
		*/
		const ACTION_LABEL_KEYS = {
			send_dm: "agents.channels.approval.action.send_dm",
			send_channel_message: "agents.channels.approval.action.send_channel_message",
			edit_message: "agents.channels.approval.action.edit_message",
			add_reaction: "agents.channels.approval.action.add_reaction",
			create_issue: "agents.channels.approval.action.create_issue",
			update_issue: "agents.channels.approval.action.update_issue",
			create_comment: "agents.channels.approval.action.create_comment",
			send_template: "agents.channels.approval.action.send_template"
		};
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const enabled = ref(props.modelValue !== void 0);
		const isValid = computed(() => !enabled.value || props.modelValue?.mode !== "selected" || props.modelValue.tools.length > 0);
		watch(isValid, (valid) => emit("update:valid", valid), { immediate: true });
		const approvableActions = computed(() => props.actions.filter((action) => action.name !== "respond" && action.name !== "do_not_respond"));
		const options = computed(() => approvableActions.value.map((action) => {
			const labelKey = ACTION_LABEL_KEYS[action.name];
			return {
				label: labelKey ? i18n.baseText(labelKey) : action.name,
				value: action.name
			};
		}));
		const defaultApproval = computed(() => {
			const sensitive = approvableActions.value.filter((action) => action.sensitive).map(({ name }) => name);
			return sensitive.length > 0 ? {
				mode: "selected",
				tools: sensitive
			} : { mode: "global" };
		});
		watch(() => props.modelValue, (approval) => {
			enabled.value = approval !== void 0;
		});
		function handleToggle(value) {
			enabled.value = value;
			emit("update:modelValue", value ? defaultApproval.value : void 0);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.container) }, [createVNode(AgentFormSettingRow_default, {
				"control-id": toggleId,
				title: unref(i18n).baseText("agents.channels.approval.label"),
				description: unref(i18n).baseText("agents.channels.approval.hint")
			}, {
				default: withCtx(() => [createVNode(unref(Switch_default), {
					id: toggleId,
					"model-value": enabled.value,
					"aria-label": unref(i18n).baseText("agents.channels.approval.label"),
					"data-test-id": "agent-channel-approval-toggle",
					"onUpdate:modelValue": handleToggle
				}, null, 8, ["model-value", "aria-label"])]),
				_: 1
			}, 8, ["title", "description"]), enabled.value ? (openBlock(), createBlock(AgentApprovalSelector_default, {
				key: 0,
				"model-value": props.modelValue,
				options: options.value,
				label: unref(i18n).baseText("agents.channels.approval.actions.label"),
				placeholder: unref(i18n).baseText("agents.channels.approval.actions.placeholder"),
				"selection-only": "",
				"test-id-prefix": "agent-channel-approval",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => emit("update:modelValue", $event))
			}, null, 8, [
				"model-value",
				"options",
				"label",
				"placeholder"
			])) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": { container: "_container_glpbh_1" } }]]);
//#endregion
//#region src/features/agents/components/AgentChannelListItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentChannelListItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentChannelListItem",
	props: {
		integration: {},
		description: {},
		configured: { type: Boolean },
		connected: { type: Boolean },
		connectAction: {},
		loading: { type: Boolean },
		notRunning: { type: Boolean },
		runtimeError: {},
		configuredLabel: {},
		menuItems: {}
	},
	emits: [
		"setup",
		"edit",
		"remove"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		function isIconName(icon) {
			return icon in updatedIconSet;
		}
		const statusLabel = computed(() => {
			if (props.configuredLabel) return props.configuredLabel;
			if (props.notRunning) return i18n.baseText("agents.channels.modal.notRunning");
			if (props.connected) return i18n.baseText("agents.channels.modal.connected");
			return i18n.baseText("agents.channels.modal.configured");
		});
		function selectMenuItem(itemId) {
			if (itemId === "edit") {
				emit("edit", props.integration.type);
				return;
			}
			emit("remove", props.integration.type);
		}
		/**
		* The tooltip is the only place the startup error is shown, so it must not be
		* empty when there is one to explain — fall back to generic copy if the server
		* reported a failure without a message.
		*/
		const statusTooltip = computed(() => {
			if (!props.notRunning) return "";
			return props.runtimeError || i18n.baseText("agents.channels.modal.notRunning.tooltip");
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("li", { class: normalizeClass(_ctx.$style.channelItem) }, [__props.loading ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.iconWrapper) }, [createVNode(unref(N8nLoading_default), { variant: "circle" })], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nLoading_default), {
					variant: "text",
					class: normalizeClass(_ctx.$style.nameSkeleton)
				}, null, 8, ["class"]), __props.description ? (openBlock(), createBlock(unref(N8nLoading_default), {
					key: 0,
					variant: "text",
					class: normalizeClass(_ctx.$style.descriptionSkeleton)
				}, null, 8, ["class"])) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.channelActions) }, [createVNode(unref(N8nLoading_default), {
					variant: "rect",
					class: normalizeClass(_ctx.$style.buttonSkeleton)
				}, null, 8, ["class"])], 2)
			], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.iconWrapper) }, [createVNode(unref(N8nIcon_default), {
					icon: __props.integration.icon && isIconName(__props.integration.icon) ? __props.integration.icon : "zap",
					size: 28,
					class: normalizeClass(_ctx.$style.channelIcon)
				}, null, 8, ["icon", "class"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nText_default), {
					class: normalizeClass(_ctx.$style.name),
					size: "medium",
					bold: "",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.integration.label), 1)]),
					_: 1
				}, 8, ["class"]), __props.description ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-light",
					"data-testid": "agent-channel-description"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.description), 1)]),
					_: 1
				})) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.channelActions) }, [__props.configured && __props.menuItems && __props.menuItems.length > 0 ? (openBlock(), createBlock(unref(DropdownMenu_default), {
					key: 0,
					items: __props.menuItems,
					placement: "bottom-end",
					onSelect: selectMenuItem
				}, {
					trigger: withCtx(() => [createBaseVNode("button", {
						type: "button",
						class: normalizeClass(_ctx.$style.connectedTrigger),
						"data-testid": "agent-channel-connected-trigger"
					}, [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.connectedIcon),
						"data-testid": "agent-channel-connected-indicator"
					}, [createVNode(unref(N8nIcon_default), {
						icon: "check",
						size: 14,
						"aria-hidden": "true"
					})], 2), createTextVNode(" " + toDisplayString(statusLabel.value), 1)], 2)]),
					_: 1
				}, 8, ["items"])) : __props.configured ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 1,
					content: statusTooltip.value,
					disabled: !__props.notRunning,
					placement: "top"
				}, {
					default: withCtx(() => [createBaseVNode("button", {
						type: "button",
						class: normalizeClass(_ctx.$style.connectedTrigger),
						onClick: _cache[0] || (_cache[0] = ($event) => emit("edit", __props.integration.type))
					}, [!__props.notRunning ? (openBlock(), createElementBlock("span", {
						key: 0,
						class: normalizeClass(_ctx.$style.connectedIcon),
						"data-testid": "agent-channel-connected-indicator"
					}, [createVNode(unref(N8nIcon_default), {
						icon: "check",
						size: 14,
						"aria-hidden": "true"
					})], 2)) : __props.notRunning ? (openBlock(), createElementBlock("span", {
						key: 1,
						class: normalizeClass(_ctx.$style.notRunningIndicator),
						"data-testid": "agent-channel-not-running-indicator"
					}, null, 2)) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(statusLabel.value), 1)], 2)]),
					_: 1
				}, 8, ["content", "disabled"])) : (openBlock(), createBlock(unref(N8nButton_default), {
					key: 2,
					variant: "outline",
					size: "medium",
					icon: __props.connectAction.icon,
					onClick: _cache[1] || (_cache[1] = ($event) => emit("setup", __props.integration.type))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.connectAction.label), 1)]),
					_: 1
				}, 8, ["icon"]))], 2)
			], 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	channelItem: "_channelItem_1bqmp_3",
	iconWrapper: "_iconWrapper_1bqmp_10",
	channelIcon: "_channelIcon_1bqmp_19",
	nameSkeleton: "_nameSkeleton_1bqmp_23",
	descriptionSkeleton: "_descriptionSkeleton_1bqmp_27",
	buttonSkeleton: "_buttonSkeleton_1bqmp_31",
	content: "_content_1bqmp_42",
	name: "_name_1bqmp_23",
	channelActions: "_channelActions_1bqmp_57",
	connectedTrigger: "_connectedTrigger_1bqmp_64",
	connectedIcon: "_connectedIcon_1bqmp_86",
	notRunningIndicator: "_notRunningIndicator_1bqmp_92"
} }]]);
//#endregion
//#region src/features/agents/components/AgentChannelModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var AgentChannelModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentChannelModal",
	props: {
		open: { type: Boolean },
		agentId: {},
		projectId: {},
		view: {},
		disabled: {
			type: Boolean,
			default: false
		},
		isPublished: {
			type: Boolean,
			default: false
		},
		simpleSetup: {
			type: Boolean,
			default: false
		},
		ensureAgentPersisted: {
			type: Function,
			default: void 0
		},
		savedDescription: {},
		saveDescription: {}
	},
	emits: [
		"update:open",
		"update:view",
		"channel-connected",
		"channel-disconnected",
		"agent-changed"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const agentTelemetry = useAgentTelemetry();
		const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
		const integrationStatus = useAgentIntegrationStatus(props.projectId, props.agentId);
		const { fetchStatus, connectedCredentials, integrationSettings, integrationApproval, loadingMap, errorMessages, errorIsConflict, runtimeErrors, isConnected: isIntegrationConnected, isConfigured: isIntegrationConfigured, hasRuntimeError, connect, clearError: clearIntegrationError } = integrationStatus;
		const currentView = ref(props.view);
		const openedFromList = ref(props.view === "list");
		const viewSession = ref(0);
		const credentialIdAtEditOpen = ref("");
		const channelActionInFlight = ref(false);
		const saveAttempted = ref(false);
		/**
		* A setup whose remaining steps happen outside n8n writes several times and
		* reaches no single terminal step, so the first successful write is the
		* completion. Later writes must not report it again: each one would re-run the
		* `trigger-added` telemetry and the channel reload on the agent page.
		*/
		const connectReported = ref(false);
		function channelTypeFromView(view) {
			if (view === "list") return null;
			return view.replace(/_(setup|edit)$/, "");
		}
		function captureConnectedCredential(channelType) {
			credentialIdAtEditOpen.value = channelType ? connectedCredentials.value[channelType] ?? "" : "";
		}
		watch(currentView, (newView) => {
			emit("update:view", newView);
		});
		const selectedChannelType = computed(() => {
			return channelTypeFromView(currentView.value);
		});
		const isSetupMode = computed(() => currentView.value.endsWith("_setup"));
		const isEditMode = computed(() => currentView.value.endsWith("_edit"));
		const isN8nChatSelected = computed(() => selectedChannelType.value === N8N_CHAT_INTEGRATION_TYPE);
		const { withN8nChat } = useN8nChatChannel();
		const channelList = computed(() => withN8nChat(catalog.value ?? []));
		const n8nChatAvailableLabel = computed(() => i18n.baseText("agents.channels.n8nChat.available"));
		const removeChannelLabel = computed(() => i18n.baseText(isN8nChatSelected.value ? "agents.channels.n8nChat.makeUnavailable" : "agents.channels.modal.removeChannel"));
		const n8nChatSaveLabel = computed(() => i18n.baseText(isSetupMode.value ? "agents.channels.n8nChat.makeAvailable" : "generic.save"));
		const n8nChatMenuItems = computed(() => [{
			id: "edit",
			label: i18n.baseText("agents.channels.n8nChat.edit")
		}, {
			id: "remove",
			label: i18n.baseText("agents.channels.n8nChat.makeUnavailable")
		}]);
		const currentIntegration = computed(() => {
			if (!selectedChannelType.value) return null;
			return channelList.value.find((i) => i.type === selectedChannelType.value) ?? null;
		});
		/** The channel whose setup view is on screen, so the close event fires once per start. */
		let trackedSetupType = null;
		function endSetupTracking(completed) {
			if (!trackedSetupType) return;
			agentTelemetry.trackClosedChannelSetup({
				agentId: props.agentId,
				channelType: trackedSetupType,
				completed
			});
			trackedSetupType = null;
		}
		watch(() => props.open && isSetupMode.value && currentIntegration.value ? selectedChannelType.value : null, (channelType) => {
			if (channelType === trackedSetupType) return;
			endSetupTracking(false);
			if (!channelType) return;
			trackedSetupType = channelType;
			agentTelemetry.trackStartedChannelSetup({
				agentId: props.agentId,
				channelType
			});
		}, { immediate: true });
		onUnmounted(() => endSetupTracking(false));
		function trackSetupFailure(channelType, stage) {
			if (!isSetupMode.value) return;
			agentTelemetry.trackFailedToConnectChannel({
				agentId: props.agentId,
				channelType,
				stage,
				conflict: stage === "connect" && (errorIsConflict.value[channelType] ?? false)
			});
		}
		const { selectedCredentials, credentialsLoading, credentialPermissions, credentialModalOpen, getChannelCredentialId, getCredentials, loadChannelState: loadSharedChannelState, createCredential, editCredential } = useAgentChannelSetup({
			projectId: () => props.projectId,
			currentIntegration,
			connectedCredentials,
			fetchStatus
		});
		watch(() => {
			const type = selectedChannelType.value;
			return {
				type,
				credentialId: type ? selectedCredentials.value[type] : void 0
			};
		}, (current, previous) => {
			if (current.type && current.type === previous.type && current.credentialId !== previous.credentialId) clearIntegrationError(current.type);
		});
		const projectIdRef = computed(() => props.projectId);
		const agentIdRef = computed(() => props.agentId);
		const runtimes = Object.fromEntries(Object.values(agentChannelPlatforms).map((platform) => [platform.type, createAgentChannelRuntime(platform, {
			projectId: projectIdRef,
			agentId: agentIdRef,
			selectedCredentialId: computed(() => getChannelCredentialId(platform.type)),
			credentialModalOpen,
			fetchStatus,
			isConnected: isIntegrationConnected,
			isConfigured: isIntegrationConfigured,
			ensureAgentPersisted: props.ensureAgentPersisted
		})]));
		const fallbackRuntime = createAgentChannelRuntime(getAgentChannelPlatform("unknown"), {
			projectId: projectIdRef,
			agentId: agentIdRef,
			selectedCredentialId: ref(""),
			credentialModalOpen,
			fetchStatus,
			isConnected: isIntegrationConnected,
			isConfigured: isIntegrationConfigured,
			ensureAgentPersisted: props.ensureAgentPersisted
		});
		const runtimeFor = (type) => runtimes[type] ?? fallbackRuntime;
		const currentPlatform = computed(() => getAgentChannelPlatform(selectedChannelType.value ?? "unknown"));
		const currentRuntime = computed(() => runtimeFor(selectedChannelType.value ?? "unknown"));
		const channelViewRef = ref();
		/** Pending approval edit for the channel being edited, seeded from what is saved. */
		const channelApproval = ref();
		const channelApprovalValid = ref(true);
		const approvableActions = computed(() => currentIntegration.value?.approvableActions ?? []);
		const channelViewLoading = computed(() => channelViewRef.value?.loading === true);
		/**
		* Persisting the Agent and setting the channel up are one action from here: the
		* modal opens before the Agent row exists, so guarding on the connect request
		* alone leaves the whole `ensureAgentPersisted` await open to a second submit.
		*/
		const actionInFlight = computed(() => channelActionInFlight.value || removingChannel.value || channelViewLoading.value || (selectedChannelType.value ? isLoading(selectedChannelType.value) : false));
		const listLoading = computed(() => actionInFlight.value || Object.values(runtimes).some((runtime) => runtime.loading.value));
		const { pendingDisconnect, disconnectConfirmationComponent, removing: removingChannel, requestDisconnect, confirmDisconnect } = useAgentChannelRemoval({
			projectId: () => props.projectId,
			agentId: () => props.agentId,
			isPublished: () => props.isPublished,
			disabled: () => props.disabled || channelActionInFlight.value || channelViewLoading.value,
			status: integrationStatus,
			runtimeFor,
			onRemoved: (channelType, { restartWith }) => {
				if (!isIntegrationConfigured(channelType)) emit("channel-disconnected", channelType);
				emit("agent-changed");
				if (restartWith) restartSetup(channelType, restartWith);
				else completeAndClose();
			}
		});
		const headerContentDisabled = computed(() => currentRuntime.value.loading.value || actionInFlight.value);
		const headerContentComponent = computed(() => {
			if (isSetupMode.value) return currentPlatform.value.headerContent?.setupModal;
			if (isEditMode.value) return currentPlatform.value.headerContent?.editModal;
		});
		function prepareChannelEdit(channelType) {
			captureConnectedCredential(channelType);
			channelApproval.value = channelType ? integrationApproval.value[channelType] : void 0;
			if (!channelType) return;
			clearIntegrationError(channelType);
			if (credentialIdAtEditOpen.value) selectedCredentials.value[channelType] = credentialIdAtEditOpen.value;
		}
		watch(() => props.view, (newView) => {
			currentView.value = newView;
			prepareChannelEdit(newView.endsWith("_edit") ? channelTypeFromView(newView) : null);
		});
		const setupCanFinish = computed(() => isSetupMode.value && channelViewRef.value?.canFinish === true);
		const showFooterActions = computed(() => selectedChannelType.value !== null && (isEditMode.value || isSetupMode.value && isN8nChatSelected.value));
		const currentChannelCredentialId = computed(() => getChannelCredentialId(selectedChannelType.value));
		/** A channel view can say that the channel runs without a credential. */
		const credentialMissing = computed(() => channelViewRef.value?.credentialRequired !== false && !currentChannelCredentialId.value);
		const headerText = computed(() => {
			const isListMode = currentView.value === "list";
			const channel = selectedChannelType.value;
			if (channel && !isListMode) return currentIntegration.value?.label ?? channel;
			return i18n.baseText("agents.channels.modal.title");
		});
		const currentStep = computed(() => currentView.value === "list" ? "list" : "configure");
		function isConnected(channelType) {
			return isIntegrationConnected(channelType);
		}
		function isConfigured(channelType) {
			return isIntegrationConfigured(channelType);
		}
		function isLoading(channelType) {
			return loadingMap.value[channelType] ?? false;
		}
		function hasError(channelType) {
			return (errorMessages.value[channelType] ?? "").length > 0;
		}
		function integrationConnectedText(channelType) {
			if (!isIntegrationConnected(channelType)) return "";
			return getAgentChannelPlatform(channelType).getConnectedDescription?.({ text: (key) => i18n.baseText(key) }) ?? "";
		}
		function connectAction(channelType) {
			return getAgentChannelPlatform(channelType).getConnectAction({ text: (key) => i18n.baseText(key) }, runtimeFor(channelType));
		}
		function listDescription(channelType) {
			return getAgentChannelPlatform(channelType).getListDescription?.({ text: (key) => i18n.baseText(key) });
		}
		function goToSetup(channelType) {
			clearIntegrationError(channelType);
			openedFromList.value = true;
			saveAttempted.value = false;
			connectReported.value = false;
			currentView.value = `${channelType}_setup`;
		}
		function goToEdit(channelType) {
			prepareChannelEdit(channelType);
			openedFromList.value = true;
			saveAttempted.value = false;
			connectReported.value = false;
			currentView.value = `${channelType}_edit`;
		}
		function goBackToList() {
			if (actionInFlight.value) return;
			prepareChannelEdit(null);
			saveAttempted.value = false;
			connectReported.value = false;
			currentView.value = "list";
		}
		/**
		* Close once a flow has finished its own work. Separate from `closeModal`
		* because a platform reports `connected` from inside its setup flow, while that
		* flow still counts as in flight — the user-facing guard would refuse to close.
		*/
		function completeAndClose() {
			emit("update:open", false);
		}
		/**
		* Done is the save for a setup that never ran one. The routes that bind the
		* credential themselves emit `persist`; a step already finished when the setup
		* reopened does not, so closing on Done left the channel unbound and absent
		* from the agent. Staying open on a failure keeps the reason on screen.
		*/
		async function finishSetup() {
			if (!setupCanFinish.value) return completeAndClose();
			if (await writeChannelConfig()) completeAndClose();
		}
		function handleModalOpenUpdate(isOpen) {
			if (!isOpen && actionInFlight.value) return;
			emit("update:open", isOpen);
		}
		function handleInteractOutside(event) {
			if (credentialModalOpen.value) event.preventDefault();
		}
		async function persistAgent() {
			try {
				await props.ensureAgentPersisted?.();
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.channels.modal.saveChannelError"));
				return false;
			}
		}
		/**
		* The platform's own pre-save step (Slack managed settings). Only some of its
		* failures render inline in the view, so a rejection is reported here rather
		* than closing the modal on settings that were never saved.
		*/
		async function runBeforeSave() {
			try {
				await channelViewRef.value?.beforeSave?.();
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.channels.modal.saveChannelError"));
				return false;
			}
		}
		/**
		* Writes the channel config and reports whether it landed. Separate from
		* closing, because a setup whose remaining steps happen outside n8n writes
		* what it has and leaves the dialog open.
		*/
		async function writeChannelConfig() {
			if (actionInFlight.value) return false;
			saveAttempted.value = true;
			const channelType = selectedChannelType.value;
			const credentialId = channelType && channelViewRef.value?.credentialRequired === false ? selectedCredentials.value[channelType] ?? "" : currentChannelCredentialId.value;
			if (!channelType || credentialMissing.value) return false;
			if (channelViewRef.value?.validationError) return false;
			if (!channelApprovalValid.value) return false;
			const credentialIdToReplace = isEditMode.value && isConfigured(channelType) && credentialIdAtEditOpen.value !== credentialId ? credentialIdAtEditOpen.value : void 0;
			channelActionInFlight.value = true;
			try {
				if (!await persistAgent()) {
					trackSetupFailure(channelType, "persist");
					return false;
				}
				if (!await runBeforeSave()) {
					trackSetupFailure(channelType, "before_save");
					return false;
				}
				await connect(channelType, credentialId, channelViewRef.value?.currentSettings, {
					...credentialIdToReplace !== void 0 ? { replaces: { credentialId: credentialIdToReplace } } : {},
					...isEditMode.value && channelApproval.value ? { approval: channelApproval.value } : {}
				});
				await channelViewRef.value?.afterSave?.();
			} catch {
				trackSetupFailure(channelType, "connect");
				return false;
			} finally {
				channelActionInFlight.value = false;
			}
			emit("agent-changed");
			reportConnected(channelType);
			return true;
		}
		async function saveChannelConfig() {
			if (!await writeChannelConfig()) return;
			const channelType = selectedChannelType.value;
			if (channelType) finishConnect(channelType);
		}
		function reportConnected(channelType) {
			if (connectReported.value) return;
			connectReported.value = true;
			endSetupTracking(true);
			emit("channel-connected", channelType);
		}
		function finishConnect(channelType) {
			reportConnected(channelType);
			if (!channelViewRef.value?.keepOpenAfterConnect) completeAndClose();
		}
		/** Same shape as `persistAgent`: reports its own failure and returns whether it saved. */
		async function persistDescription(description) {
			try {
				await props.saveDescription?.(description);
				return true;
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.channels.modal.saveChannelError"));
				return false;
			}
		}
		/**
		* n8n Chat has no credential and no per-platform view logic, so it saves
		* separately rather than bending `saveChannelConfig` to a channel that skips
		* most of what that function does (credentials, `beforeSave`, approval).
		*/
		async function saveN8nChat() {
			if (actionInFlight.value) return;
			const description = channelViewRef.value?.description;
			if (description === void 0) return;
			const settingUp = isSetupMode.value;
			channelActionInFlight.value = true;
			try {
				if (!await persistAgent()) {
					trackSetupFailure(N8N_CHAT_INTEGRATION_TYPE, "persist");
					return;
				}
				if (!await persistDescription(description)) return;
				if (settingUp) await connect(N8N_CHAT_INTEGRATION_TYPE, "");
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.channels.modal.saveChannelError"));
				trackSetupFailure(N8N_CHAT_INTEGRATION_TYPE, "connect");
				return;
			} finally {
				channelActionInFlight.value = false;
			}
			emit("agent-changed");
			if (settingUp) {
				finishConnect(N8N_CHAT_INTEGRATION_TYPE);
				return;
			}
			completeAndClose();
		}
		function handlePlatformConnected() {
			const channelType = selectedChannelType.value;
			if (!channelType) return;
			emit("agent-changed");
			finishConnect(channelType);
		}
		function removeCurrentChannel(restartWith) {
			const channelType = selectedChannelType.value;
			if (!channelType) return;
			requestDisconnect(channelType, credentialIdAtEditOpen.value || connectedCredentials.value[channelType] || "", restartWith);
		}
		function restartSetup(channelType, restart) {
			runtimeFor(channelType).reset?.(restart);
			prepareChannelEdit(null);
			selectedCredentials.value[channelType] = restart.credentialId;
			viewSession.value += 1;
			goToSetup(channelType);
		}
		/** The list's "Make unavailable" menu item. n8n Chat has no credential to carry. */
		function handleChannelRemove(channelType) {
			requestDisconnect(channelType, "");
		}
		async function loadChannelState() {
			const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
			await Promise.all([loadSharedChannelState(withN8nChat(integrations)), ...integrations.map(({ type }) => runtimeFor(type).load())]);
			if (isEditMode.value) prepareChannelEdit(selectedChannelType.value);
		}
		watch(() => props.open, (isOpen) => {
			if (isOpen) {
				viewSession.value += 1;
				loadChannelState();
				openedFromList.value = props.view === "list";
				saveAttempted.value = false;
				connectReported.value = false;
				currentView.value = props.view;
			} else captureConnectedCredential(null);
		}, { immediate: true });
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModalMultiStep_default, {
				open: __props.open,
				step: currentStep.value,
				title: headerText.value,
				"show-back": currentView.value !== "list" && openedFromList.value,
				"show-footer": showFooterActions.value,
				"show-cancel": !isN8nChatSelected.value,
				busy: actionInFlight.value,
				"trap-focus": !unref(credentialModalOpen),
				"disable-outside-pointer-events": !unref(credentialModalOpen),
				onInteractOutside: handleInteractOutside,
				"onUpdate:open": handleModalOpenUpdate,
				onBack: goBackToList
			}, createSlots({
				headerActions: withCtx(() => [headerContentComponent.value ? (openBlock(), createBlock(resolveDynamicComponent(headerContentComponent.value), {
					key: 0,
					runtime: currentRuntime.value,
					disabled: headerContentDisabled.value
				}, null, 8, ["runtime", "disabled"])) : createCommentVNode("", true)]),
				default: withCtx(() => [createBaseVNode("div", {
					"data-testid": "agent-channel-modal",
					class: normalizeClass(_ctx.$style.container)
				}, [withDirectives(createBaseVNode("div", {
					key: "list",
					class: normalizeClass(_ctx.$style.listView)
				}, [createBaseVNode("ul", { class: normalizeClass(_ctx.$style.channelList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(channelList.value, (integration) => {
					return openBlock(), createBlock(AgentChannelListItem_default, {
						key: integration.type,
						integration,
						description: listDescription(integration.type),
						configured: isConfigured(integration.type),
						connected: isConnected(integration.type),
						"not-running": unref(hasRuntimeError)(integration.type),
						"runtime-error": unref(runtimeErrors)[integration.type],
						loading: listLoading.value,
						"connect-action": connectAction(integration.type),
						"configured-label": integration.type === unref("n8n_chat") ? n8nChatAvailableLabel.value : void 0,
						"menu-items": integration.type === unref("n8n_chat") ? n8nChatMenuItems.value : void 0,
						onSetup: goToSetup,
						onEdit: goToEdit,
						onRemove: handleChannelRemove
					}, null, 8, [
						"integration",
						"description",
						"configured",
						"connected",
						"not-running",
						"runtime-error",
						"loading",
						"connect-action",
						"configured-label",
						"menu-items"
					]);
				}), 128))], 2)], 2), [[vShow, currentView.value === "list"]]), currentView.value !== "list" && currentIntegration.value ? (openBlock(), createElementBlock("div", {
					key: `${isSetupMode.value ? "setup" : "edit"}-${currentView.value}`,
					class: normalizeClass(isSetupMode.value ? _ctx.$style.setupView : _ctx.$style.editView)
				}, [
					(openBlock(), createBlock(resolveDynamicComponent(isSetupMode.value ? currentPlatform.value.setupComponent : currentPlatform.value.editComponent), {
						key: viewSession.value,
						ref_key: "channelViewRef",
						ref: channelViewRef,
						modelValue: unref(selectedCredentials)[currentIntegration.value.type],
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(selectedCredentials)[currentIntegration.value.type] = $event),
						mode: isSetupMode.value ? "setup" : "edit",
						integration: currentIntegration.value,
						credentials: unref(getCredentials)(currentIntegration.value.type),
						"credential-permissions": unref(credentialPermissions),
						"credentials-loading": unref(credentialsLoading),
						loading: isLoading(currentIntegration.value.type),
						connected: isConfigured(currentIntegration.value.type),
						"connected-description": integrationConnectedText(currentIntegration.value.type),
						"error-message": hasError(currentIntegration.value.type) ? unref(errorMessages)[currentIntegration.value.type] : "",
						"error-is-conflict": unref(errorIsConflict)[currentIntegration.value.type],
						"saved-settings": unref(integrationSettings)[currentIntegration.value.type],
						"saved-credential-id": unref(connectedCredentials)[currentIntegration.value.type] ?? "",
						"is-published": __props.isPublished,
						"agent-name": __props.agentId,
						"project-id": __props.projectId,
						"agent-id": __props.agentId,
						"ensure-agent-persisted": __props.ensureAgentPersisted,
						"persist-channel": writeChannelConfig,
						"force-new-credential": false,
						"simple-setup": __props.simpleSetup,
						runtime: currentRuntime.value,
						"saved-description": isN8nChatSelected.value ? __props.savedDescription : void 0,
						onCreate: unref(createCredential),
						onEdit: unref(editCredential),
						onConnect: saveChannelConfig,
						onPersist: writeChannelConfig,
						onConnected: handlePlatformConnected,
						onDone: finishSetup,
						onRestart: removeCurrentChannel
					}, createSlots({ _: 2 }, [isEditMode.value && currentIntegration.value.type === "slack" && approvableActions.value.length > 0 ? {
						name: "additionalSettings",
						fn: withCtx(() => [createVNode(AgentChannelApprovalSetting_default, {
							modelValue: channelApproval.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => channelApproval.value = $event),
							actions: approvableActions.value,
							"onUpdate:valid": _cache[1] || (_cache[1] = ($event) => channelApprovalValid.value = $event)
						}, null, 8, ["modelValue", "actions"])]),
						key: "0"
					} : void 0]), 1064, [
						"modelValue",
						"mode",
						"integration",
						"credentials",
						"credential-permissions",
						"credentials-loading",
						"loading",
						"connected",
						"connected-description",
						"error-message",
						"error-is-conflict",
						"saved-settings",
						"saved-credential-id",
						"is-published",
						"agent-name",
						"project-id",
						"agent-id",
						"ensure-agent-persisted",
						"simple-setup",
						"runtime",
						"saved-description",
						"onCreate",
						"onEdit"
					])),
					saveAttempted.value && credentialMissing.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "danger",
						"data-testid": "agent-channel-credential-required"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.channels.modal.credentialRequired")), 1)]),
						_: 1
					})) : createCommentVNode("", true),
					isEditMode.value && currentIntegration.value.type !== "slack" && approvableActions.value.length > 0 ? (openBlock(), createBlock(AgentChannelApprovalSetting_default, {
						key: 1,
						modelValue: channelApproval.value,
						"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => channelApproval.value = $event),
						actions: approvableActions.value,
						"onUpdate:valid": _cache[4] || (_cache[4] = ($event) => channelApprovalValid.value = $event)
					}, null, 8, ["modelValue", "actions"])) : createCommentVNode("", true)
				], 2)) : createCommentVNode("", true)], 2), unref(pendingDisconnect) && unref(disconnectConfirmationComponent) ? (openBlock(), createBlock(resolveDynamicComponent(unref(disconnectConfirmationComponent)), {
					key: 0,
					open: true,
					loading: unref(removingChannel),
					onCancel: _cache[7] || (_cache[7] = ($event) => pendingDisconnect.value = null),
					onConfirm: unref(confirmDisconnect)
				}, null, 40, ["loading", "onConfirm"])) : createCommentVNode("", true)]),
				_: 2
			}, [showFooterActions.value && isEditMode.value ? {
				name: "footerLeft",
				fn: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "medium",
					loading: selectedChannelType.value ? isLoading(selectedChannelType.value) : false,
					disabled: __props.disabled || actionInFlight.value || !selectedChannelType.value,
					"data-testid": "agent-channel-remove-channel",
					onClick: _cache[5] || (_cache[5] = ($event) => removeCurrentChannel())
				}, createSlots({
					default: withCtx(() => [createTextVNode(" " + toDisplayString(removeChannelLabel.value), 1)]),
					_: 2
				}, [!isN8nChatSelected.value ? {
					name: "icon",
					fn: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "trash-2",
						size: 16
					})]),
					key: "0"
				} : void 0]), 1032, ["loading", "disabled"])]),
				key: "0"
			} : void 0, showFooterActions.value ? {
				name: "footerActions",
				fn: withCtx(() => [isN8nChatSelected.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "medium",
					disabled: actionInFlight.value,
					"data-testid": "agent-channel-cancel",
					onClick: _cache[6] || (_cache[6] = ($event) => handleModalOpenUpdate(false))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
					_: 1
				}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "medium",
					loading: actionInFlight.value,
					disabled: actionInFlight.value,
					"data-testid": "agent-channel-save-channel-config",
					onClick: saveN8nChat
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(n8nChatSaveLabel.value), 1)]),
					_: 1
				}, 8, ["loading", "disabled"])], 64)) : (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					variant: "solid",
					size: "medium",
					loading: actionInFlight.value,
					disabled: !channelApprovalValid.value || actionInFlight.value,
					"data-testid": "agent-channel-save-channel-config",
					onClick: saveChannelConfig
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(channelViewRef.value?.saveLabel || unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, ["loading", "disabled"]))]),
				key: "1"
			} : void 0]), 1032, [
				"open",
				"step",
				"title",
				"show-back",
				"show-footer",
				"show-cancel",
				"busy",
				"trap-focus",
				"disable-outside-pointer-events"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1rmo9_1",
	listView: "_listView_1rmo9_7",
	channelList: "_channelList_1rmo9_12",
	setupView: "_setupView_1rmo9_18",
	editView: "_editView_1rmo9_19"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSchedulesRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$25 = ["inert"];
var AgentSchedulesRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSchedulesRow",
	props: {
		taskRefs: { default: () => [] },
		disabled: {
			type: Boolean,
			default: false
		},
		projectId: {},
		agentId: {},
		isPublished: { type: Boolean },
		isRunnable: {
			type: Boolean,
			default: false
		},
		reloadKey: {},
		agentUnsaved: { type: Boolean },
		ensureAgentPersisted: {},
		validationIssues: { default: () => [] },
		previewDisabledReason: {}
	},
	emits: [
		"toggle-task",
		"tasks-changed",
		"preview-task"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const uiStore = useUIStore();
		const toast = useToast();
		const taskBodies = ref([]);
		const taskErrorMessage = ref("");
		const removingTaskId = ref(null);
		let active = true;
		onBeforeUnmount(() => {
			active = false;
		});
		function isCurrentAgent(projectId, agentId) {
			return active && props.projectId === projectId && props.agentId === agentId;
		}
		const taskIssueMessages = computed(() => {
			const messages = /* @__PURE__ */ new Map();
			for (const issue of props.validationIssues) {
				if (issue.capability.kind !== "task" || !issue.capability.id) continue;
				const message = i18n.baseText(resolveAgentValidationIssueMessageKey(issue), { interpolate: { id: issue.capability.id } });
				messages.set(issue.capability.id, [.../* @__PURE__ */ new Set([...messages.get(issue.capability.id) ?? [], message])]);
			}
			return messages;
		});
		const taskRows = computed(() => {
			const refsById = new Map(props.taskRefs.map((taskRef) => [taskRef.id, taskRef]));
			return taskBodies.value.map((body) => {
				const taskRef = refsById.get(body.id);
				const invalidReasons = taskIssueMessages.value.get(body.id) ?? [];
				return {
					...body,
					enabled: taskRef?.enabled ?? true,
					invalid: invalidReasons.length > 0,
					invalidReasons
				};
			});
		});
		async function reloadTasks() {
			const { projectId, agentId } = props;
			taskErrorMessage.value = "";
			if (props.agentUnsaved) {
				taskBodies.value = [];
				return;
			}
			try {
				const tasks = await getAgentTasks(rootStore.restApiContext, projectId, agentId);
				if (isCurrentAgent(projectId, agentId)) taskBodies.value = tasks;
			} catch (error) {
				if (!isCurrentAgent(projectId, agentId)) return;
				taskErrorMessage.value = error instanceof Error && error.message ? error.message : i18n.baseText("agents.builder.tasks.loadError");
			}
		}
		function onTasksChanged() {
			reloadTasks();
			emit("tasks-changed");
		}
		function toggleTask(task, enabled) {
			if (props.disabled || removingTaskId.value) return;
			emit("toggle-task", {
				id: task.id,
				enabled
			});
		}
		async function removeTask(task) {
			if (props.disabled || removingTaskId.value) return;
			const { projectId, agentId } = props;
			removingTaskId.value = task.id;
			try {
				await deleteAgentTask(rootStore.restApiContext, projectId, agentId, task.id);
				if (!isCurrentAgent(projectId, agentId)) return;
				taskBodies.value = taskBodies.value.filter(({ id }) => id !== task.id);
				onTasksChanged();
			} catch (error) {
				if (isCurrentAgent(projectId, agentId)) toast.showError(error, i18n.baseText("agents.builder.tasks.removeError"));
			} finally {
				removingTaskId.value = null;
			}
		}
		function openTaskModal(task) {
			const { projectId, agentId } = props;
			uiStore.openModalWithData({
				name: AGENT_TASK_MODAL_KEY,
				data: {
					projectId: props.projectId,
					agentId: props.agentId,
					ensureAgentPersisted: props.ensureAgentPersisted,
					task,
					isPublished: props.isPublished,
					isRunnable: props.isRunnable,
					validationIssues: props.validationIssues,
					getPreviewDisabledReason: () => props.previewDisabledReason,
					taskState: task ? { enabled: task.enabled } : void 0,
					onPreview: (instructions) => emit("preview-task", instructions),
					onSaved: () => {
						if (isCurrentAgent(projectId, agentId)) onTasksChanged();
					}
				}
			});
		}
		function taskScheduleTooltip(task) {
			const timezone = task.timezone ?? rootStore.timezone;
			const description = getNextScheduleOccurrence(task.cronExpression, timezone) ? describeSchedule(task.cronExpression) : null;
			if (!description) return i18n.baseText("agents.builder.tasks.schedule.invalidDescription");
			return description;
		}
		onMounted(reloadTasks);
		watch([
			toRef(props, "reloadKey"),
			toRef(props, "projectId"),
			toRef(props, "agentId"),
			toRef(props, "agentUnsaved")
		], reloadTasks);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.scheduleRow),
				inert: props.disabled || void 0
			}, [taskRows.value.length > 0 ? (openBlock(), createBlock(unref(N8nText_default), {
				key: 0,
				bold: "",
				class: normalizeClass(_ctx.$style.rowLabel)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.tasks.title")), 1)]),
				_: 1
			}, 8, ["class"])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.chips) }, [
				(openBlock(true), createElementBlock(Fragment, null, renderList(taskRows.value, (task, taskIndex) => {
					return openBlock(), createElementBlock("div", {
						key: task.id,
						class: normalizeClass(_ctx.$style.chipGroup)
					}, [createVNode(AgentItemContextMenu_default, {
						disabled: props.disabled || removingTaskId.value !== null,
						enabled: task.enabled,
						"onUpdate:enabled": ($event) => toggleTask(task, $event),
						onRemove: ($event) => removeTask(task)
					}, {
						default: withCtx(() => [createVNode(unref(N8nTooltip_default), {
							content: taskScheduleTooltip(task),
							placement: "top",
							"as-child": ""
						}, {
							default: withCtx(() => [createVNode(AgentChipButton_default, {
								icon: "clipboard-list",
								deactivated: !task.enabled,
								invalid: task.invalid,
								"invalid-reasons": task.invalidReasons,
								disabled: props.disabled || removingTaskId.value === task.id,
								class: normalizeClass(_ctx.$style.scheduleChip),
								"data-testid": "agent-capabilities-task-row",
								onClick: ($event) => openTaskModal(task)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(task.name), 1)]),
								_: 2
							}, 1032, [
								"deactivated",
								"invalid",
								"invalid-reasons",
								"disabled",
								"class",
								"onClick"
							])]),
							_: 2
						}, 1032, ["content"])]),
						_: 2
					}, 1032, [
						"disabled",
						"enabled",
						"onUpdate:enabled",
						"onRemove"
					]), taskIndex === taskRows.value.length - 1 ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						content: unref(i18n).baseText("agents.builder.tasks.add"),
						placement: "top"
					}, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							size: "medium",
							"icon-only": "",
							disabled: props.disabled,
							"data-testid": "agent-capabilities-add-task",
							onClick: _cache[0] || (_cache[0] = ($event) => openTaskModal(null))
						}, {
							icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
								icon: "plus",
								size: 16,
								color: "text-light"
							})]),
							_: 1
						}, 8, ["disabled"])]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true)], 2);
				}), 128)),
				taskRows.value.length === 0 ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.addButtonEmpty),
					variant: "ghost",
					size: "medium",
					disabled: props.disabled,
					"data-testid": "agent-capabilities-add-task",
					onClick: _cache[1] || (_cache[1] = ($event) => openTaskModal(null))
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "plus",
						size: 16
					})]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.tasks.add")), 1)]),
					_: 1
				}, 8, ["class", "disabled"])) : createCommentVNode("", true),
				taskErrorMessage.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "small",
					class: normalizeClass(_ctx.$style.error)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(taskErrorMessage.value), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)
			], 2)], 10, _hoisted_1$25);
		};
	}
}), [["__cssModules", { "$style": {
	scheduleRow: "_scheduleRow_wt2nk_1",
	rowLabel: "_rowLabel_wt2nk_7",
	chips: "_chips_wt2nk_15",
	chipGroup: "_chipGroup_wt2nk_24",
	scheduleChip: "_scheduleChip_wt2nk_33",
	addButtonEmpty: "_addButtonEmpty_wt2nk_38",
	error: "_error_wt2nk_49"
} }]]);
//#endregion
//#region src/features/agents/components/AgentTriggersSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$24 = ["inert"];
var FILE_ACCESS_CONSENT_STATE = "teams-file-access";
var AgentTriggersSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentTriggersSection",
	props: {
		connectedTriggers: { default: () => [] },
		disabled: {
			type: Boolean,
			default: false
		},
		projectId: {},
		agentId: {},
		isPublished: {
			type: Boolean,
			default: false
		},
		isRunnable: {
			type: Boolean,
			default: false
		},
		validationIssues: { default: () => [] },
		previewDisabledReason: {},
		simpleChannelSetup: {
			type: Boolean,
			default: false
		},
		taskRefs: { default: () => [] },
		reloadKey: {},
		agentUnsaved: { type: Boolean },
		ensureAgentPersisted: {
			type: Function,
			default: void 0
		},
		savedDescription: {},
		saveDescription: {}
	},
	emits: [
		"update:connected-triggers",
		"trigger-added",
		"trigger-removed",
		"toggle-task",
		"tasks-changed",
		"preview-task",
		"agent-changed"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const credentialsStore = useCredentialsStore();
		const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
		const integrationStatus = useAgentIntegrationStatus(props.projectId, props.agentId);
		const { connectedCredentials, integrationSettings, runtimeErrors, hasRuntimeError, fetchStatus } = integrationStatus;
		const { status: whatsAppMetaStatus, refresh: refreshWhatsAppMetaStatus } = useWhatsAppMetaStatus(toRef(props, "projectId"), toRef(props, "agentId"), computed(() => props.connectedTriggers.includes("whatsapp") ? connectedCredentials.value.whatsapp : void 0), { poll: false });
		/**
		* Meta's review state for a channel, as the headline and how serious it is. Only
		* WhatsApp has one. The chip shows an error for the same states that show a red callout.
		*/
		function channelMetaNotice(channel) {
			if (channel !== "whatsapp" || !whatsAppMetaStatus.value) return void 0;
			const presentation = presentWhatsAppMetaState(whatsAppMetaStatus.value.state);
			if (!presentation) return void 0;
			return {
				isError: presentation.theme === "danger",
				message: i18n.baseText(metaTitleKey(presentation, whatsAppMetaStatus.value), { interpolate: {
					number: whatsAppMetaStatus.value.displayPhoneNumber ?? "",
					name: whatsAppMetaStatus.value.displayName ?? ""
				} })
			};
		}
		const runtimeContext = {
			projectId: computed(() => props.projectId),
			agentId: computed(() => props.agentId),
			credentialModalOpen: ref(false),
			fetchStatus,
			isConnected: integrationStatus.isConnected,
			isConfigured: integrationStatus.isConfigured
		};
		const runtimes = Object.fromEntries(Object.values(agentChannelPlatforms).map((platform) => [platform.type, createAgentChannelRuntime(platform, {
			...runtimeContext,
			selectedCredentialId: computed(() => connectedCredentials.value[platform.type] ?? "")
		})]));
		const fallbackRuntime = createAgentChannelRuntime(getAgentChannelPlatform("unknown"), {
			...runtimeContext,
			selectedCredentialId: ref("")
		});
		const { pendingDisconnect, disconnectConfirmationComponent, removing: removingChannel, requestDisconnect, confirmDisconnect } = useAgentChannelRemoval({
			projectId: () => props.projectId,
			agentId: () => props.agentId,
			isPublished: () => props.isPublished,
			disabled: () => props.disabled,
			status: integrationStatus,
			runtimeFor: async (channelType) => {
				const runtime = runtimes[channelType] ?? fallbackRuntime;
				await runtime.load();
				return runtime;
			},
			onRemoved: (channelType) => {
				if (!integrationStatus.isConfigured(channelType)) handleChannelDisconnected(channelType);
				emit("agent-changed");
			}
		});
		const { isEnabled: isN8nChatEnabled, withN8nChat } = useN8nChatChannel();
		const channelList = computed(() => withN8nChat(catalog.value ?? []));
		const credentialNamesById = ref({});
		const channelModalOpen = ref(false);
		watch(channelModalOpen, (open, wasOpen) => {
			if (wasOpen && !open) refreshWhatsAppMetaStatus();
		});
		const channelModalView = ref("list");
		function isIconName(icon) {
			return typeof icon === "string" && icon in updatedIconSet;
		}
		function channelIcon(integrationIcon) {
			if (isIconName(integrationIcon)) return integrationIcon;
			return "zap";
		}
		const channelIssueMessages = computed(() => {
			const messages = /* @__PURE__ */ new Map();
			for (const issue of props.validationIssues) {
				if (issue.capability.kind !== "channel" || !issue.capability.id) continue;
				const message = i18n.baseText(resolveAgentValidationIssueMessageKey(issue), { interpolate: { id: issue.capability.id } });
				messages.set(issue.capability.id, [.../* @__PURE__ */ new Set([...messages.get(issue.capability.id) ?? [], message])]);
			}
			return messages;
		});
		function channelRuntimeErrorMessage(channel) {
			return runtimeErrors.value[channel] || i18n.baseText("agents.channels.modal.notRunning.tooltip");
		}
		const channelRows = computed(() => [...isN8nChatEnabled.value ? [N8N_CHAT_INTEGRATION_TYPE] : [], ...props.connectedTriggers.filter((channel) => channel !== N8N_CHAT_INTEGRATION_TYPE)].map((channel) => {
			const integration = channelList.value.find(({ type }) => type === channel);
			const credentialId = connectedCredentials.value[channel];
			const metaNotice = channelMetaNotice(channel);
			const invalidReasons = [
				...channelIssueMessages.value.get(channel) ?? [],
				...hasRuntimeError(channel) ? [channelRuntimeErrorMessage(channel)] : [],
				...metaNotice?.isError ? [metaNotice.message] : []
			];
			return {
				type: channel,
				label: integration?.label ?? channel,
				icon: channelIcon(integration?.icon),
				credentialName: credentialId ? credentialNamesById.value[credentialId] : void 0,
				invalidReasons,
				invalidIcon: metaNotice?.isError ? "circle-x" : void 0,
				warningReasons: [...metaNotice && !metaNotice.isError ? [metaNotice.message] : [], ...channel === "webhook" && webhookAuthentication({ settings: integrationSettings.value[channel] }) === "none" ? [i18n.baseText("agents.channels.webhook.authentication.noneNotice")] : []],
				connected: props.connectedTriggers.includes(channel) || integrationStatus.isConfigured(channel)
			};
		}));
		async function loadChannelDetails() {
			const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
			if (!props.agentUnsaved) await fetchStatus(withN8nChat(integrations).map(({ type }) => type));
			openTeamsAfterFileAccessConsent(integrations);
			try {
				const credentials = await credentialsStore.fetchUsableCredentials({
					projectId: props.projectId,
					forAgent: true
				});
				credentialNamesById.value = Object.fromEntries(credentials.map((credential) => [credential.id, credential.name]));
			} catch {
				credentialNamesById.value = {};
			}
		}
		onMounted(() => {
			loadChannelDetails();
			agentsEventBus.on("agentUpdated", onExternalAgentUpdated);
		});
		function onChannelSetup(event) {
			if (event?.agentId !== props.agentId || event.source !== "channel-setup-card") return;
			loadChannelDetails();
		}
		agentsEventBus.on("agentUpdated", onChannelSetup);
		onBeforeUnmount(() => agentsEventBus.off("agentUpdated", onChannelSetup));
		watch([
			toRef(props, "projectId"),
			toRef(props, "agentId"),
			toRef(props, "agentUnsaved")
		], loadChannelDetails);
		function onExternalAgentUpdated(event) {
			if (event?.source === "agent-builder") return;
			if (event?.agentId && event.agentId !== props.agentId) return;
			loadChannelDetails();
		}
		onBeforeUnmount(() => {
			agentsEventBus.off("agentUpdated", onExternalAgentUpdated);
		});
		function openChannelModal() {
			channelModalView.value = "list";
			channelModalOpen.value = true;
		}
		function openChannelEdit(channelType, connected) {
			const hasEditableChannelView = channelList.value.some(({ type }) => type === channelType);
			channelModalView.value = hasEditableChannelView ? `${channelType}_${connected ? "edit" : "setup"}` : "list";
			channelModalOpen.value = true;
		}
		const newChatHintStorage = useStorage$1(N8N_CHAT_HINT_DISMISSED_STORAGE_KEYS.new_chat_sidebar);
		const newChatHintDismissed = computed(() => newChatHintStorage.value === "true");
		function handleChannelConnected(channelType) {
			const channels = Array.from(/* @__PURE__ */ new Set([...props.connectedTriggers, channelType]));
			emit("update:connected-triggers", channels);
			emit("trigger-added", {
				triggerType: channelType,
				triggers: channels
			});
			loadChannelDetails();
		}
		const route = useRoute();
		const router = useRouter();
		const toast = useToast();
		/**
		* Microsoft returns an administrator here after the Teams file access consent,
		* with `state` passed back unchanged. The Teams settings show the result. The
		* other query values are Microsoft's and only cleared, never shown. Runs after
		* the status fetch: the agent's channels can load later than this page, and
		* until then a connected Teams reads as not connected and opens the setup.
		*/
		function openTeamsAfterFileAccessConsent(integrations) {
			if (route?.query.state !== FILE_ACCESS_CONSENT_STATE) return;
			if (!integrations.some(({ type }) => type === "teams")) return;
			const { state, admin_consent, tenant, error, error_description, error_subcode, ...query } = route.query;
			router.replace({ query });
			fileAccessJustApproved.value = admin_consent === "True";
			if (error) toast.showMessage({
				type: "error",
				title: i18n.baseText("agents.channels.teams.fileAccessConsentFailed")
			});
			openChannelEdit("teams", props.connectedTriggers.includes("teams") || integrationStatus.isConfigured("teams"));
		}
		__expose({ openChannelModal });
		function handleChannelDisconnected(channelType) {
			const channels = props.connectedTriggers.filter((channel) => channel !== channelType);
			emit("update:connected-triggers", channels);
			emit("trigger-removed", {
				triggerType: channelType,
				triggers: channels
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass([_ctx.$style.row, props.disabled && _ctx.$style.disabled]),
				inert: props.disabled || void 0
			}, [
				createVNode(AgentChipRow_default, {
					label: unref(i18n).baseText("agents.builder.channel.title"),
					"item-count": channelRows.value.length,
					"add-label": unref(i18n).baseText("agents.builder.channel.add"),
					"add-button-test-id": "agent-channels-add-channel",
					disabled: props.disabled,
					onAdd: openChannelModal
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(channelRows.value, (channel) => {
						return openBlock(), createBlock(AgentItemContextMenu_default, {
							key: channel.type,
							disabled: props.disabled || unref(removingChannel) || !channel.connected,
							onRemove: ($event) => unref(requestDisconnect)(channel.type, unref(connectedCredentials)[channel.type] ?? "")
						}, {
							default: withCtx(() => [createVNode(N8nChatHintPopover_default, {
								hint: "channel_chip",
								active: channel.type === unref("n8n_chat") && channel.connected && !channelModalOpen.value && !props.disabled && newChatHintDismissed.value,
								title: unref(i18n).baseText("agents.n8nChatHint.channelAdded.title"),
								body: unref(i18n).baseText("agents.n8nChatHint.channelAdded.body"),
								"agent-id": props.agentId
							}, {
								default: withCtx(() => [createVNode(AgentChipButton_default, {
									icon: channel.icon,
									deactivated: !channel.connected,
									invalid: channel.invalidReasons.length > 0,
									"invalid-reasons": channel.invalidReasons,
									"invalid-icon": channel.invalidIcon,
									warning: channel.warningReasons.length > 0,
									"warning-reasons": channel.warningReasons,
									disabled: props.disabled || unref(removingChannel),
									class: normalizeClass(_ctx.$style.channelChip),
									onClick: ($event) => openChannelEdit(channel.type, channel.connected)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(channel.label), 1)]),
									_: 2
								}, 1032, [
									"icon",
									"deactivated",
									"invalid",
									"invalid-reasons",
									"invalid-icon",
									"warning",
									"warning-reasons",
									"disabled",
									"class",
									"onClick"
								])]),
								_: 2
							}, 1032, [
								"active",
								"title",
								"body",
								"agent-id"
							])]),
							_: 2
						}, 1032, ["disabled", "onRemove"]);
					}), 128))]),
					_: 1
				}, 8, [
					"label",
					"item-count",
					"add-label",
					"disabled"
				]),
				createVNode(AgentSchedulesRow_default, {
					"preview-disabled-reason": props.previewDisabledReason,
					"task-refs": props.taskRefs,
					disabled: props.disabled,
					"project-id": props.projectId,
					"agent-id": props.agentId,
					"is-published": props.isPublished,
					"is-runnable": props.isRunnable,
					"reload-key": props.reloadKey,
					"agent-unsaved": props.agentUnsaved,
					"ensure-agent-persisted": props.ensureAgentPersisted,
					"validation-issues": props.validationIssues,
					onToggleTask: _cache[0] || (_cache[0] = ($event) => emit("toggle-task", $event)),
					onTasksChanged: _cache[1] || (_cache[1] = ($event) => emit("tasks-changed")),
					onPreviewTask: _cache[2] || (_cache[2] = ($event) => emit("preview-task", $event))
				}, null, 8, [
					"preview-disabled-reason",
					"task-refs",
					"disabled",
					"project-id",
					"agent-id",
					"is-published",
					"is-runnable",
					"reload-key",
					"agent-unsaved",
					"ensure-agent-persisted",
					"validation-issues"
				]),
				channelModalOpen.value ? (openBlock(), createBlock(AgentChannelModal_default, {
					key: 0,
					open: channelModalOpen.value,
					"onUpdate:open": _cache[3] || (_cache[3] = ($event) => channelModalOpen.value = $event),
					view: channelModalView.value,
					"onUpdate:view": _cache[4] || (_cache[4] = ($event) => channelModalView.value = $event),
					"agent-id": __props.agentId,
					"project-id": __props.projectId,
					"is-published": __props.isPublished,
					disabled: props.disabled,
					"simple-setup": __props.simpleChannelSetup,
					"ensure-agent-persisted": __props.ensureAgentPersisted,
					"saved-description": __props.savedDescription,
					"save-description": __props.saveDescription,
					onChannelConnected: handleChannelConnected,
					onChannelDisconnected: handleChannelDisconnected,
					onAgentChanged: _cache[5] || (_cache[5] = ($event) => emit("agent-changed"))
				}, null, 8, [
					"open",
					"view",
					"agent-id",
					"project-id",
					"is-published",
					"disabled",
					"simple-setup",
					"ensure-agent-persisted",
					"saved-description",
					"save-description"
				])) : createCommentVNode("", true),
				unref(pendingDisconnect) && unref(disconnectConfirmationComponent) ? (openBlock(), createBlock(resolveDynamicComponent(unref(disconnectConfirmationComponent)), {
					key: 1,
					open: true,
					loading: unref(removingChannel),
					onCancel: _cache[6] || (_cache[6] = ($event) => pendingDisconnect.value = null),
					onConfirm: unref(confirmDisconnect)
				}, null, 40, ["loading", "onConfirm"])) : createCommentVNode("", true)
			], 10, _hoisted_1$24);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_1ktn1_1",
	disabled: "_disabled_1ktn1_7",
	channelChip: "_channelChip_1ktn1_11"
} }]]);
//#endregion
//#region src/features/agents/components/AgentIdentityHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentIdentityHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentIdentityHeader",
	props: {
		config: {},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:config"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const name = computed(() => props.config?.name ?? "");
		const personalisation = computed(() => resolveAgentPersonalisation(props.config?.personalisation));
		const iconPickerModel = computed({
			get: () => ({
				type: "icon",
				value: personalisation.value.icon
			}),
			set: (value) => {
				if (value.type !== "icon") return;
				emit("update:config", { personalisation: {
					icon: value.value,
					gradient: { ...personalisation.value.gradient }
				} });
			}
		});
		function personalisationStyle(value) {
			return {
				"--agent-personalisation-gradient-from": value.gradient.from,
				"--agent-personalisation-gradient-to": value.gradient.to,
				"--agent-personalisation-gradient-angle": `${value.gradient.angle}deg`,
				"--agent-personalisation-gradient-from-stop": `${value.gradient.fromStop}%`,
				"--agent-personalisation-gradient-to-stop": `${value.gradient.toStop}%`
			};
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.text),
				style: normalizeStyle(personalisationStyle(personalisation.value)),
				"data-testid": "agent-identity-header"
			}, [createVNode(unref(N8nIconPicker_default), {
				modelValue: iconPickerModel.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => iconPickerModel.value = $event),
				"button-tooltip": unref(i18n).baseText("agents.builder.agent.personalisation.change"),
				"button-size": "xlarge",
				"is-read-only": props.disabled,
				"icons-only": "",
				"fallback-icon": unref(DEFAULT_AGENT_PERSONALISATION).icon,
				"container-class": _ctx.$style.personalisationPicker,
				"button-class": _ctx.$style.personalisationIcon,
				"data-testid": "agent-personalisation-icon"
			}, null, 8, [
				"modelValue",
				"button-tooltip",
				"is-read-only",
				"fallback-icon",
				"container-class",
				"button-class"
			]), createVNode(unref(N8nInlineTextEdit_default), {
				"model-value": name.value,
				placeholder: unref(i18n).baseText("agents.builder.agent.name.placeholder"),
				disabled: props.disabled,
				"max-width": "100%",
				"min-width": 96,
				class: normalizeClass(_ctx.$style.title),
				"data-testid": "agent-name-inline-edit",
				"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => emit("update:config", { name: $event }))
			}, null, 8, [
				"model-value",
				"placeholder",
				"disabled",
				"class"
			])], 6);
		};
	}
}), [["__cssModules", { "$style": {
	text: "_text_1xf3k_1",
	personalisationPicker: "_personalisationPicker_1xf3k_10",
	personalisationIcon: "_personalisationIcon_1xf3k_16",
	title: "_title_1xf3k_97"
} }]]);
//#endregion
//#region src/features/agents/components/AgentFilesPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$23 = ["title"];
var _hoisted_2$7 = ["accept"];
var AgentFilesPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentFilesPanel",
	props: {
		agentId: {},
		files: {},
		disabled: {
			type: Boolean,
			default: false
		},
		loading: {
			type: Boolean,
			default: false
		},
		uploading: {
			type: Boolean,
			default: false
		},
		deletingFileId: { default: null }
	},
	emits: ["upload-files", "delete-file"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const agentTelemetry = useAgentTelemetry();
		const fileInput = useTemplateRef("fileInput");
		const isMutating = computed(() => props.uploading || props.deletingFileId !== null);
		const isUploadDisabled = computed(() => props.disabled || props.loading || isMutating.value);
		const uploadButtonLabel = computed(() => i18n.baseText("agents.builder.files.addFile"));
		const acceptAttr = ALLOWED_AGENT_FILE_EXTENSIONS.join(",");
		const emptyStateHeader = computed(() => i18n.baseText("agents.builder.files.empty"));
		const emptyStateDescription = computed(() => i18n.baseText("agents.builder.files.emptyDescription"));
		function getFileIcon(file) {
			const extension = file.fileName.split(".").pop()?.toLowerCase();
			if (extension === "csv" || file.mimeType === "text/csv") return "file-code";
			if (extension === "pdf" || file.mimeType === "application/pdf") return "file";
			if (extension === "md" || extension === "markdown" || file.mimeType === "text/markdown") return "scroll-text";
			if (extension === "txt" || file.mimeType === "text/plain") return "file-text";
			return "file";
		}
		function getFileType(file) {
			const extension = file.fileName.split(".").pop()?.toLowerCase();
			if (extension === "csv" || file.mimeType === "text/csv") return i18n.baseText("agents.builder.files.type.csv");
			if (extension === "pdf" || file.mimeType === "application/pdf") return i18n.baseText("agents.builder.files.type.pdf");
			if (extension === "md" || extension === "markdown" || file.mimeType === "text/markdown") return i18n.baseText("agents.builder.files.type.markdown");
			if (extension === "txt" || file.mimeType === "text/plain") return i18n.baseText("agents.builder.files.type.txt");
			return i18n.baseText("agents.builder.files.type.file");
		}
		function formatFileSize(bytes) {
			if (bytes < 1024) return i18n.baseText("agents.builder.files.size.bytes", { interpolate: { bytes } });
			const kilobytes = bytes / 1024;
			if (kilobytes < 1024) return i18n.baseText("agents.builder.files.size.kilobytes", { interpolate: { kilobytes: kilobytes.toFixed(1) } });
			const megabytes = kilobytes / 1024;
			return i18n.baseText("agents.builder.files.size.megabytes", { interpolate: { megabytes: megabytes.toFixed(1) } });
		}
		function formatDate(fullDate) {
			const { date, time } = convertToDisplayDate(fullDate);
			return `${date} ${time}`;
		}
		function rowActions() {
			return [{
				id: "delete",
				label: i18n.baseText("agents.builder.files.delete"),
				icon: "trash-2",
				disabled: props.disabled || props.loading || isMutating.value
			}];
		}
		function onAction(actionId, file) {
			if (actionId !== "delete") return;
			emit("delete-file", file);
		}
		function openFilePicker() {
			if (isUploadDisabled.value) return;
			agentTelemetry.trackClickedKnowledgeUpload({ agentId: props.agentId });
			fileInput.value?.click();
		}
		function onFilesSelected(event) {
			const input = event.target;
			if (!(input instanceof HTMLInputElement)) return;
			const selectedFiles = Array.from(input.files ?? []);
			input.value = "";
			if (selectedFiles.length === 0) return;
			emit("upload-files", selectedFiles);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.panel),
				"data-testid": "agent-files-panel"
			}, [!props.loading && props.files.length === 0 ? (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 0,
				icon: {
					type: "icon",
					value: "file"
				},
				class: normalizeClass(_ctx.$style.emptyState),
				heading: emptyStateHeader.value,
				description: emptyStateDescription.value,
				"button-text": uploadButtonLabel.value,
				"button-disabled": isUploadDisabled.value,
				"onClick:button": openFilePicker
			}, null, 8, [
				"class",
				"heading",
				"description",
				"button-text",
				"button-disabled"
			])) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.tableContainer)
			}, [createVNode(unref(TableBase_default), { "max-displayed-rows": 10 }, {
				default: withCtx(() => [createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(props.files, (file) => {
					return openBlock(), createElementBlock("tr", {
						key: file.id,
						class: normalizeClass(_ctx.$style.fileRow),
						"data-testid": "agent-files-list-row"
					}, [
						createBaseVNode("td", { class: normalizeClass(_ctx.$style.titleCell) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.fileTitle) }, [createVNode(unref(N8nIcon_default), {
							icon: getFileIcon(file),
							size: "medium",
							class: normalizeClass(_ctx.$style.fileIcon)
						}, null, 8, ["icon", "class"]), createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.fileName),
							title: file.fileName,
							"data-testid": "agent-file-name"
						}, toDisplayString(file.fileName), 11, _hoisted_1$23)], 2)], 2),
						createBaseVNode("td", {
							class: normalizeClass(_ctx.$style.originCell),
							"data-testid": "agent-file-origin"
						}, [createVNode(unref(N8nBadge_default), {
							"leading-icon": "user",
							"data-testid": "agent-file-origin-pill"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.files.origin.user")), 1)]),
							_: 1
						})], 2),
						createBaseVNode("td", {
							class: normalizeClass(_ctx.$style.dateCell),
							"data-testid": "agent-file-created-at"
						}, toDisplayString(formatDate(file.createdAt)), 3),
						createBaseVNode("td", {
							class: normalizeClass(_ctx.$style.typeCell),
							"data-testid": "agent-file-type"
						}, toDisplayString(getFileType(file)), 3),
						createBaseVNode("td", {
							class: normalizeClass(_ctx.$style.sizeCell),
							"data-testid": "agent-file-size"
						}, toDisplayString(formatFileSize(file.fileSizeBytes)), 3),
						createBaseVNode("td", {
							class: normalizeClass(_ctx.$style.actionCell),
							onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
						}, [createVNode(unref(N8nActionDropdown_default), {
							items: rowActions(),
							disabled: props.disabled || props.loading || isMutating.value,
							"activator-icon": "ellipsis",
							"data-testid": "agent-files-actions",
							onSelect: ($event) => onAction($event, file)
						}, null, 8, [
							"items",
							"disabled",
							"onSelect"
						])], 2)
					], 2);
				}), 128)), props.loading && props.files.length === 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, renderList(5, (item) => {
					return createBaseVNode("tr", { key: item }, [(openBlock(), createElementBlock(Fragment, null, renderList(6, (col) => {
						return createBaseVNode("td", { key: col }, [createVNode(unref(ElSkeletonItem))]);
					}), 64))]);
				}), 64)) : createCommentVNode("", true)])]),
				_: 1
			})], 2)), createBaseVNode("div", { class: normalizeClass(_ctx.$style.toolbar) }, [createBaseVNode("input", {
				ref_key: "fileInput",
				ref: fileInput,
				type: "file",
				accept: unref(acceptAttr),
				multiple: "",
				class: normalizeClass(_ctx.$style.fileInput),
				"data-testid": "agent-files-upload-input",
				onChange: onFilesSelected
			}, null, 42, _hoisted_2$7), !props.loading && props.files.length > 0 ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 0,
				variant: "ghost",
				icon: "plus",
				disabled: isUploadDisabled.value,
				"aria-label": uploadButtonLabel.value,
				"data-testid": "agent-files-upload",
				onClick: openFilePicker
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(uploadButtonLabel.value), 1)]),
				_: 1
			}, 8, ["disabled", "aria-label"])) : createCommentVNode("", true)], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_1unrq_1",
	toolbar: "_toolbar_1unrq_8",
	fileInput: "_fileInput_1unrq_17",
	tableContainer: "_tableContainer_1unrq_21",
	titleCell: "_titleCell_1unrq_28",
	fileTitle: "_fileTitle_1unrq_33",
	fileIcon: "_fileIcon_1unrq_40",
	fileName: "_fileName_1unrq_45",
	originCell: "_originCell_1unrq_57",
	dateCell: "_dateCell_1unrq_58",
	typeCell: "_typeCell_1unrq_59",
	sizeCell: "_sizeCell_1unrq_60",
	originPill: "_originPill_1unrq_65",
	actionCell: "_actionCell_1unrq_87",
	fileRow: "_fileRow_1unrq_95",
	lastRow: "_lastRow_1unrq_102",
	emptyMessage: "_emptyMessage_1unrq_110"
} }]]);
//#endregion
//#region src/features/agents/composables/useAgentMemorySourceLabels.ts
var SURFACE_ICONS = {
	users: "users",
	"n8n-chat": "message-circle",
	preview: "flask-conical",
	build: "wrench"
};
var SURFACE_LABELS = {
	users: "agents.builder.memory.entries.filter.users",
	"n8n-chat": "agents.builder.memory.entries.source.chat",
	preview: "agents.builder.memory.entries.source.preview",
	build: "agents.builder.memory.entries.source.build"
};
function isIconName(icon) {
	return typeof icon === "string" && icon in updatedIconSet;
}
/** Icons and labels of the integrations and chat surfaces that memories come from. */
function useAgentMemorySourceLabels() {
	const i18n = useI18n();
	const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
	function catalogEntry(kind) {
		return catalog.value?.find(({ type }) => type === kind);
	}
	function kindIcon(kind) {
		const surfaceIcon = SURFACE_ICONS[kind];
		if (surfaceIcon) return surfaceIcon;
		const icon = catalogEntry(kind)?.icon;
		return isIconName(icon) ? icon : "zap";
	}
	/** Undefined until the integrations catalog knows the kind. */
	function kindLabel(kind) {
		const surfaceLabel = SURFACE_LABELS[kind];
		if (surfaceLabel) return i18n.baseText(surfaceLabel);
		return catalogEntry(kind)?.label;
	}
	return {
		kindIcon,
		kindLabel,
		ensureLoaded
	};
}
//#endregion
//#region src/features/agents/components/AgentMemorySourceFilter.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
/** Sub-menus with more items than this get a search field. */
var SEARCHABLE_MIN_ITEMS = 8;
var ALL_ID = "__all__";
//#endregion
//#region src/features/agents/components/AgentMemorySourceFilter.vue
var AgentMemorySourceFilter_default = /* @__PURE__ */ defineComponent({
	__name: "AgentMemorySourceFilter",
	props: /*@__PURE__*/ mergeModels({
		groups: {},
		disabled: { type: Boolean }
	}, {
		"modelValue": { default: () => ({}) },
		"modelModifiers": {}
	}),
	emits: ["update:modelValue"],
	setup(__props) {
		const props = __props;
		const selection = useModel(__props, "modelValue");
		const i18n = useI18n();
		const { kindIcon, kindLabel } = useAgentMemorySourceLabels();
		/** Search term of each searchable sub-menu, by the id of its group item. */
		const searchTerms = ref({});
		const FACET_HEADERS = {
			channel: "agents.builder.memory.entries.filter.channels",
			team: "agents.builder.memory.entries.filter.teams",
			user: "agents.builder.memory.entries.filter.users"
		};
		function selectionId(next) {
			return JSON.stringify([
				next.source,
				next.sourceFacet,
				next.sourceFacetId
			]);
		}
		function groupLabel(group) {
			return kindLabel(group.kind) ?? group.kind;
		}
		function facetLabel(facet, item) {
			if (item.isViewer) return i18n.baseText("agents.builder.memory.entries.source.you");
			if (facet === "channel") return `#${item.name ?? item.id}`;
			if (item.name) return item.name;
			if (facet === "user") return i18n.baseText("agents.builder.memory.entries.filter.unknownUser");
			return item.id;
		}
		/** Every selectable option by its menu id, to resolve a selection and the trigger label. */
		const options = computed(() => {
			const byId = /* @__PURE__ */ new Map();
			for (const group of props.groups) {
				byId.set(selectionId({ source: group.kind }), {
					selection: { source: group.kind },
					label: groupLabel(group)
				});
				for (const [facet, items] of facetSections(group)) for (const item of items) {
					const next = {
						source: group.kind,
						sourceFacet: facet,
						sourceFacetId: item.id
					};
					byId.set(selectionId(next), {
						selection: next,
						label: facetLabel(facet, item)
					});
				}
			}
			return byId;
		});
		function facetSections(group) {
			return [
				["channel", group.channels],
				["team", group.teams],
				["user", group.users]
			].flatMap(([facet, items]) => items?.length ? [[facet, items]] : []);
		}
		const currentId = computed(() => selectionId(selection.value));
		function toFacetItems(group, facet, items, withHeader) {
			const header = {
				id: `${group.kind}-${facet}-header`,
				label: i18n.baseText(FACET_HEADERS[facet]),
				header: true
			};
			return [...withHeader ? [header] : [], ...items.map((item) => {
				const id = selectionId({
					source: group.kind,
					sourceFacet: facet,
					sourceFacetId: item.id
				});
				return {
					id,
					label: facetLabel(facet, item),
					checked: id === currentId.value
				};
			})];
		}
		function allLabel(group) {
			if (group.kind === "users") return i18n.baseText("agents.builder.memory.entries.filter.allUsers");
			return i18n.baseText("agents.builder.memory.entries.filter.allFrom", { interpolate: { source: groupLabel(group) } });
		}
		/** N8nDropdownMenu only emits `search`, so the sub-menu items are filtered here. */
		function filterBySearch(items, searchTerm = "") {
			const term = searchTerm.trim().toLowerCase();
			if (!term) return items;
			const matches = items.filter((item) => item.header || item.label.toLowerCase().includes(term));
			return matches.filter((item, index) => {
				const next = matches[index + 1];
				return !item.header || next !== void 0 && !next.header;
			});
		}
		function toGroupItem(group) {
			const id = `${group.kind}-group`;
			const allId = selectionId({ source: group.kind });
			const sections = facetSections(group);
			const facetItems = sections.flatMap(([facet, items]) => toFacetItems(group, facet, items, sections.length > 1));
			const allItem = {
				id: allId,
				label: allLabel(group),
				checked: allId === currentId.value
			};
			return {
				id,
				label: groupLabel(group),
				icon: {
					type: "icon",
					value: kindIcon(group.kind)
				},
				checked: selection.value.source === group.kind,
				searchable: facetItems.length > SEARCHABLE_MIN_ITEMS,
				children: filterBySearch([allItem, ...facetItems], searchTerms.value[id]),
				testId: `agent-memory-source-group-${group.kind}`
			};
		}
		const menuItems = computed(() => [{
			id: ALL_ID,
			label: i18n.baseText("agents.builder.memory.entries.filter.all"),
			checked: !selection.value.source
		}, ...props.groups.map((group, index) => ({
			...toGroupItem(group),
			divided: index === 0
		}))]);
		const triggerLabel = computed(() => {
			const label = selection.value.source ? options.value.get(currentId.value)?.label : i18n.baseText("agents.builder.memory.entries.filter.all");
			return i18n.baseText("agents.builder.memory.entries.filter.trigger", { interpolate: { source: label ?? "" } });
		});
		function onSelect(id) {
			if (id === ALL_ID) {
				selection.value = {};
				return;
			}
			const option = options.value.get(id);
			if (option) selection.value = option.selection;
		}
		function onSearch(term, itemId) {
			if (itemId) searchTerms.value[itemId] = term;
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(DropdownMenu_default), {
				items: menuItems.value,
				disabled: props.disabled,
				placement: "bottom-end",
				onSelect,
				onSearch
			}, {
				trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
					variant: "outline",
					disabled: props.disabled,
					"data-testid": "agent-memory-source-filter"
				}, {
					default: withCtx(() => [createVNode(unref(N8nText_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(triggerLabel.value), 1)]),
						_: 1
					}), createVNode(unref(N8nIcon_default), {
						icon: "chevron-down",
						size: "small"
					})]),
					_: 1
				}, 8, ["disabled"])]),
				_: 1
			}, 8, ["items", "disabled"]);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentMemoryEntriesPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var INLINE_PAGE_SIZE = 10;
var FULL_PAGE_SIZE = 25;
var AgentMemoryEntriesPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentMemoryEntriesPanel",
	props: /*@__PURE__*/ mergeModels({
		projectId: {},
		agentId: {},
		disabled: { type: Boolean }
	}, {
		"showAll": {
			type: Boolean,
			default: false
		},
		"showAllModifiers": {}
	}),
	emits: ["update:showAll"],
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const { showError, showMessage } = useToast();
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const { kindIcon, kindLabel, ensureLoaded } = useAgentMemorySourceLabels();
		const entries = ref([]);
		const total = ref(0);
		const nextCursor = ref(null);
		const loading = ref(false);
		const loadFailed = ref(false);
		const deletingId = ref(null);
		/** The parent hides the other Knowledge cards while this is true. */
		const showAll = useModel(__props, "showAll");
		/** The mode the user asked for. `showAll` can lag when the parent owns it. */
		const fullList = ref(showAll.value);
		/** The source filter only applies to the full list. */
		const sourceSelection = ref({});
		const facetGroups = ref([]);
		const isFiltered = computed(() => fullList.value && !!sourceSelection.value.source);
		const emptyText = computed(() => i18n.baseText(isFiltered.value ? "agents.builder.memory.entries.noMatches" : "agents.builder.memory.entries.empty"));
		function limitFor(showAllEntries) {
			return showAllEntries ? FULL_PAGE_SIZE : INLINE_PAGE_SIZE;
		}
		function isStale(projectId, agentId) {
			return projectId !== props.projectId || agentId !== props.agentId;
		}
		let latestRequestId = 0;
		async function loadEntries({ append, limit }) {
			const { projectId, agentId } = props;
			const requestId = ++latestRequestId;
			const isOutdated = () => requestId !== latestRequestId || isStale(projectId, agentId);
			loading.value = true;
			try {
				const page = await listAgentMemoryEntries(rootStore.restApiContext, projectId, agentId, {
					limit,
					cursor: append ? nextCursor.value ?? void 0 : void 0,
					...fullList.value && sourceSelection.value
				});
				if (isOutdated()) return;
				loadFailed.value = false;
				entries.value = append ? [...entries.value, ...page.items] : page.items;
				total.value = page.total;
				nextCursor.value = page.nextCursor;
			} catch (error) {
				if (!isOutdated()) {
					loadFailed.value = true;
					showError(error, i18n.baseText("agents.builder.memory.entries.loadError"));
				}
			} finally {
				if (!isOutdated()) loading.value = false;
			}
		}
		async function loadFacets() {
			const { projectId, agentId } = props;
			try {
				const facets = await getAgentMemorySourceFacets(rootStore.restApiContext, projectId, agentId);
				if (!isStale(projectId, agentId)) facetGroups.value = facets.groups;
			} catch {
				if (!isStale(projectId, agentId)) facetGroups.value = [];
			}
		}
		function resetFilters() {
			sourceSelection.value = {};
		}
		async function setShowAll(value) {
			showAll.value = value;
			fullList.value = value;
			if (!value) resetFilters();
			await Promise.all([loadEntries({
				append: false,
				limit: limitFor(value)
			}), value ? loadFacets() : void 0]);
		}
		async function onDelete(entry) {
			if (deletingId.value !== null) return;
			if (await openAgentConfirmationModal({
				title: i18n.baseText("agents.builder.memory.entries.deleteModal.title"),
				description: i18n.baseText("agents.builder.memory.entries.deleteModal.description"),
				confirmButtonText: i18n.baseText("agents.builder.memory.entries.deleteModal.button.delete"),
				cancelButtonText: i18n.baseText("generic.cancel")
			}) !== "confirm") return;
			const { projectId, agentId } = props;
			deletingId.value = entry.id;
			try {
				await deleteAgentMemoryEntry(rootStore.restApiContext, projectId, agentId, entry.id);
				if (isStale(projectId, agentId)) return;
				entries.value = entries.value.filter(({ id }) => id !== entry.id);
				total.value = Math.max(total.value - 1, 0);
				showMessage({
					title: i18n.baseText("agents.builder.memory.entries.deleted"),
					type: "success"
				});
				if (!showAll.value) await loadEntries({
					append: false,
					limit: INLINE_PAGE_SIZE
				});
			} catch (error) {
				showError(error, i18n.baseText("agents.builder.memory.entries.deleteError"));
			} finally {
				deletingId.value = null;
			}
		}
		function sourceIcon(source) {
			if (!source) return "brain";
			return kindIcon(source.kind);
		}
		function sourcePlace(source) {
			if (source.isDirectMessage) return i18n.baseText("agents.builder.memory.entries.source.directMessage");
			if (source.place) return source.place;
			return kindLabel(source.kind);
		}
		function sourceParts(source) {
			if (!source) return [];
			return [source.isViewer ? i18n.baseText("agents.builder.memory.entries.source.you") : source.userName, sourcePlace(source)];
		}
		function metaLine(entry) {
			const others = entry.otherSourceCount;
			const othersLabel = others > 0 ? i18n.baseText("agents.builder.memory.entries.otherSources", {
				adjustToNumber: others,
				interpolate: { count: String(others) }
			}) : void 0;
			return [
				...sourceParts(entry.source),
				convertToDisplayDate(entry.createdAt).date,
				othersLabel
			].filter(Boolean).join(" · ");
		}
		onMounted(async () => {
			await Promise.all([loadEntries({
				append: false,
				limit: limitFor(showAll.value)
			}), showAll.value ? loadFacets() : void 0]);
			await ensureLoaded(props.projectId).catch(() => void 0);
		});
		watch(() => [props.projectId, props.agentId], async () => {
			showAll.value = false;
			fullList.value = false;
			resetFilters();
			facetGroups.value = [];
			await loadEntries({
				append: false,
				limit: INLINE_PAGE_SIZE
			});
		});
		watch(showAll, (value) => {
			fullList.value = value;
		});
		watch(sourceSelection, async () => {
			if (!fullList.value) return;
			await loadEntries({
				append: false,
				limit: FULL_PAGE_SIZE
			});
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.root),
				"data-testid": "agent-memory-entries-panel"
			}, [showAll.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.backRow)
			}, [createVNode(unref(N8nIconButton_default), {
				icon: "arrow-left",
				variant: "ghost",
				size: "small",
				"aria-label": unref(i18n).baseText("agents.builder.memory.entries.back"),
				"data-testid": "agent-memory-entries-back",
				onClick: _cache[0] || (_cache[0] = ($event) => setShowAll(false))
			}, null, 8, ["aria-label"]), createVNode(unref(N8nText_default), {
				tag: "h3",
				step: "sm",
				bold: true
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.entries.title")), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true), createVNode(AgentPanel_default, {
				header: unref(i18n).baseText("agents.builder.memory.entries.title"),
				"header-visibility": showAll.value ? "visually-hidden" : "visible"
			}, createSlots({
				default: withCtx(() => [
					showAll.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.toolbar)
					}, [createVNode(AgentMemorySourceFilter_default, {
						modelValue: sourceSelection.value,
						"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => sourceSelection.value = $event),
						groups: facetGroups.value
					}, null, 8, ["modelValue", "groups"])], 2)) : createCommentVNode("", true),
					!loading.value && !loadFailed.value && entries.value.length === 0 ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 1,
						color: "text-light",
						"data-testid": "agent-memory-entries-empty"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(emptyText.value), 1)]),
						_: 1
					})) : (openBlock(), createElementBlock("ul", {
						key: 2,
						class: normalizeClass(_ctx.$style.list)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(entries.value, (entry) => {
						return openBlock(), createElementBlock("li", {
							key: entry.id,
							class: normalizeClass(_ctx.$style.row),
							"data-testid": "agent-memory-entry"
						}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.entryCopy) }, [createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.content),
							"data-testid": "agent-memory-entry-content"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(entry.content), 1)]),
							_: 2
						}, 1032, ["class"]), createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.meta),
							"data-testid": "agent-memory-entry-meta"
						}, [createVNode(unref(N8nIcon_default), {
							icon: sourceIcon(entry.source),
							size: "small"
						}, null, 8, ["icon"]), createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(metaLine(entry)), 1)]),
							_: 2
						}, 1024)], 2)], 2), !props.disabled ? (openBlock(), createBlock(unref(N8nIconButton_default), {
							key: 0,
							icon: "trash-2",
							variant: "ghost",
							size: "small",
							disabled: deletingId.value !== null,
							"aria-label": unref(i18n).baseText("agents.builder.memory.entries.delete"),
							"data-testid": "agent-memory-entry-delete",
							onClick: ($event) => onDelete(entry)
						}, null, 8, [
							"disabled",
							"aria-label",
							"onClick"
						])) : createCommentVNode("", true)], 2);
					}), 128))], 2)),
					showAll.value && nextCursor.value ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 3,
						variant: "ghost",
						loading: loading.value,
						"data-testid": "agent-memory-entries-load-more",
						onClick: _cache[3] || (_cache[3] = ($event) => loadEntries({
							append: true,
							limit: FULL_PAGE_SIZE
						}))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.entries.loadMore")), 1)]),
						_: 1
					}, 8, ["loading"])) : createCommentVNode("", true)
				]),
				_: 2
			}, [!showAll.value ? {
				name: "header",
				fn: withCtx(({ headerId }) => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.copy) }, [createVNode(unref(N8nText_default), {
					id: headerId,
					tag: "h3",
					step: "sm",
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.entries.title")), 1)]),
					_: 1
				}, 8, ["id"]), createVNode(unref(N8nText_default), { color: "text-light" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.entries.description")), 1)]),
					_: 1
				})], 2), total.value > INLINE_PAGE_SIZE ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "ghost",
					"data-testid": "agent-memory-entries-view-all",
					onClick: _cache[1] || (_cache[1] = ($event) => setShowAll(true))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.entries.viewAll", { interpolate: { count: String(total.value) } })) + " ", 1), createVNode(unref(N8nIcon_default), {
						icon: "chevron-right",
						size: "small"
					})]),
					_: 1
				})) : createCommentVNode("", true)], 2)]),
				key: "0"
			} : void 0]), 1032, ["header", "header-visibility"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_193nw_1",
	toolbar: "_toolbar_193nw_8",
	backRow: "_backRow_193nw_14",
	header: "_header_193nw_20",
	copy: "_copy_193nw_26",
	list: "_list_193nw_34",
	row: "_row_193nw_42",
	entryCopy: "_entryCopy_193nw_50",
	content: "_content_193nw_58",
	meta: "_meta_193nw_62"
} }]]);
//#endregion
//#region src/features/agents/components/AgentVectorStoresPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$22 = ["title"];
var _hoisted_2$6 = ["title"];
var _hoisted_3$2 = ["title"];
var AgentVectorStoresPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentVectorStoresPanel",
	props: {
		vectorStores: {},
		disabled: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"connect",
		"edit",
		"remove"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		function locatorLabel(vectorStore) {
			switch (vectorStore.provider) {
				case "pinecone": return vectorStore.indexName;
				case "qdrant": return vectorStore.collectionName;
				case "supabase":
				case "postgres": return vectorStore.tableName;
			}
		}
		function rowActions() {
			return [{
				id: "edit",
				label: i18n.baseText("agents.builder.vectorStores.panel.edit"),
				icon: "pen",
				disabled: props.disabled
			}, {
				id: "remove",
				label: i18n.baseText("agents.builder.vectorStores.panel.remove"),
				icon: "trash-2",
				disabled: props.disabled
			}];
		}
		function onAction(actionId, vectorStore) {
			if (actionId === "edit") emit("edit", vectorStore);
			else if (actionId === "remove") emit("remove", vectorStore);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.panel),
				"data-testid": "agent-vector-stores-panel"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.toolbar) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerText) }, [createVNode(unref(N8nText_default), {
				bold: "",
				"data-testid": "agent-vector-stores-title"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.vectorStores.panel.title")), 1)]),
				_: 1
			}), createVNode(unref(N8nText_default), {
				color: "text-light",
				step: "sm"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.vectorStores.panel.titleTooltip")), 1)]),
				_: 1
			})], 2), props.vectorStores.length > 0 ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				content: unref(i18n).baseText("agents.builder.vectorStores.panel.connectButton"),
				placement: "top"
			}, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					variant: "ghost",
					size: "small",
					icon: "plus",
					disabled: props.disabled,
					"aria-label": unref(i18n).baseText("agents.builder.vectorStores.panel.connectButton"),
					"data-testid": "agent-vector-stores-connect",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("connect"))
				}, null, 8, ["disabled", "aria-label"])]),
				_: 1
			}, 8, ["content"])) : createCommentVNode("", true)], 2), props.vectorStores.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.tableContainer)
			}, [createVNode(unref(TableBase_default), null, {
				default: withCtx(() => [createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(props.vectorStores, (vectorStore) => {
					return openBlock(), createElementBlock("tr", {
						key: vectorStore.name,
						class: normalizeClass(_ctx.$style.row),
						"data-testid": "agent-vector-stores-list-row"
					}, [
						createBaseVNode("td", { class: normalizeClass(_ctx.$style.titleCell) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.rowTitle) }, [createVNode(CredentialIcon_default, {
							"credential-type-name": unref(AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS)[vectorStore.provider].credentialType,
							size: 20,
							class: normalizeClass(_ctx.$style.rowIcon)
						}, null, 8, ["credential-type-name", "class"]), createBaseVNode("span", {
							class: normalizeClass(_ctx.$style.rowName),
							title: vectorStore.name,
							"data-testid": "agent-vector-store-name"
						}, toDisplayString(vectorStore.name), 11, _hoisted_1$22)], 2)], 2),
						createBaseVNode("td", {
							class: normalizeClass(_ctx.$style.locatorCell),
							title: locatorLabel(vectorStore),
							"data-testid": "agent-vector-store-locator"
						}, toDisplayString(locatorLabel(vectorStore)), 11, _hoisted_2$6),
						createBaseVNode("td", {
							class: normalizeClass(_ctx.$style.useWhenCell),
							title: vectorStore.useWhen,
							"data-testid": "agent-vector-store-use-when"
						}, toDisplayString(vectorStore.useWhen), 11, _hoisted_3$2),
						createBaseVNode("td", {
							class: normalizeClass(_ctx.$style.actionCell),
							onClick: _cache[1] || (_cache[1] = withModifiers(() => {}, ["stop"]))
						}, [createVNode(unref(N8nActionDropdown_default), {
							items: rowActions(),
							disabled: props.disabled,
							"activator-icon": "ellipsis",
							"data-testid": "agent-vector-stores-actions",
							onSelect: ($event) => onAction($event, vectorStore)
						}, null, 8, [
							"items",
							"disabled",
							"onSelect"
						])], 2)
					], 2);
				}), 128))])]),
				_: 1
			})], 2)) : (openBlock(), createBlock(unref(N8nEmptyState_default), {
				key: 1,
				icon: {
					type: "icon",
					value: "database"
				},
				heading: unref(i18n).baseText("agents.builder.vectorStores.panel.empty.title"),
				description: unref(i18n).baseText("agents.builder.vectorStores.panel.empty.description"),
				"button-text": unref(i18n).baseText("agents.builder.vectorStores.panel.connectButton"),
				"button-disabled": props.disabled,
				"data-testid": "agent-vector-stores-empty",
				"onClick:button": _cache[2] || (_cache[2] = ($event) => emit("connect"))
			}, null, 8, [
				"heading",
				"description",
				"button-text",
				"button-disabled"
			]))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_1j4m9_1",
	toolbar: "_toolbar_1j4m9_8",
	headerText: "_headerText_1j4m9_16",
	tableContainer: "_tableContainer_1j4m9_26",
	titleCell: "_titleCell_1j4m9_33",
	rowTitle: "_rowTitle_1j4m9_38",
	rowIcon: "_rowIcon_1j4m9_45",
	rowName: "_rowName_1j4m9_50",
	locatorCell: "_locatorCell_1j4m9_62",
	useWhenCell: "_useWhenCell_1j4m9_63",
	actionCell: "_actionCell_1j4m9_73",
	row: "_row_1j4m9_38"
} }]]);
//#endregion
//#region src/features/agents/components/AgentMcpPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentMcpPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentMcpPanel",
	props: {
		availableInMcp: { type: Boolean },
		disabled: { type: Boolean }
	},
	emits: ["toggle-mcp-access"],
	setup(__props, { emit: __emit }) {
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.mcpPanel) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
				step: "sm",
				bold: "",
				class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.mcp.availableInMCP.label")), 1)]),
				_: 1
			}, 8, ["class"]), createVNode(unref(N8nText_default), {
				size: "small",
				class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.mcp.availableInMCP.hint")), 1)]),
				_: 1
			}, 8, ["class"])], 2), createVNode(unref(Switch_default), {
				"model-value": __props.availableInMcp,
				disabled: __props.disabled,
				class: normalizeClass(unref(agent_panel_module_default).settingControl),
				"data-testid": "agent-available-in-mcp-toggle",
				"onUpdate:modelValue": _cache[0] || (_cache[0] = (value) => emit("toggle-mcp-access", value))
			}, null, 8, [
				"model-value",
				"disabled",
				"class"
			])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": { mcpPanel: "_mcpPanel_1s67g_1" } }]]);
//#endregion
//#region src/features/agents/components/AgentMemoryGuidanceModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentMemoryGuidanceModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentMemoryGuidanceModal",
	props: {
		open: { type: Boolean },
		guidance: {},
		disabled: { type: Boolean }
	},
	emits: ["update:open", "save"],
	setup(__props, { emit: __emit }) {
		const FIELDS = [{
			key: "include",
			label: "agents.builder.memory.episodicMemory.guidance.include.label"
		}, {
			key: "exclude",
			label: "agents.builder.memory.episodicMemory.guidance.exclude.label"
		}];
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const topics = ref({
			include: [],
			exclude: []
		});
		watch(() => props.open, (open) => {
			if (!open) return;
			topics.value = {
				include: [...props.guidance?.include ?? []],
				exclude: [...props.guidance?.exclude ?? []]
			};
		}, { immediate: true });
		function toTopics(values) {
			const trimmed = values.filter((value) => typeof value === "string").map((value) => value.trim());
			return [...new Set(trimmed.filter((topic) => topic.length > 0))];
		}
		function onSave() {
			const include = toTopics(topics.value.include);
			const exclude = toTopics(topics.value.exclude);
			const isEmpty = include.length === 0 && exclude.length === 0;
			emit("save", isEmpty ? void 0 : {
				include,
				exclude
			});
			emit("update:open", false);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentModal_default, {
				open: props.open,
				size: "medium",
				title: unref(i18n).baseText("agents.builder.memory.episodicMemory.guidance.title"),
				"data-testid": "agent-memory-guidance-modal",
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => emit("update:open", $event))
			}, {
				footerActions: withCtx(() => [createVNode(unref(N8nButton_default), {
					disabled: props.disabled,
					"data-testid": "agent-memory-guidance-save",
					onClick: onSave
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
					_: 1
				}, 8, ["disabled"])]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.fields) }, [createVNode(unref(N8nText_default), {
					step: "sm",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.episodicMemory.guidance.description")), 1)]),
					_: 1
				}), (openBlock(), createElementBlock(Fragment, null, renderList(FIELDS, (field) => {
					return createBaseVNode("div", {
						key: field.key,
						class: normalizeClass(_ctx.$style.field)
					}, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: ""
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(field.label)), 1)]),
						_: 2
					}, 1024), createVNode(unref(TagsInput_default), {
						modelValue: topics.value[field.key],
						"onUpdate:modelValue": ($event) => topics.value[field.key] = $event,
						max: unref(20),
						placeholder: unref(i18n).baseText("agents.builder.memory.episodicMemory.guidance.placeholder"),
						disabled: props.disabled,
						"add-on-blur": "",
						"data-testid": `agent-memory-guidance-${field.key}`
					}, {
						input: withCtx((inputProps) => [createVNode(unref(TagsInputInput_default), mergeProps({ ref_for: true }, inputProps, {
							"aria-label": unref(i18n).baseText(field.label),
							maxlength: unref(100)
						}), null, 16, ["aria-label", "maxlength"])]),
						_: 2
					}, 1032, [
						"modelValue",
						"onUpdate:modelValue",
						"max",
						"placeholder",
						"disabled",
						"data-testid"
					])], 2);
				}), 64))], 2)]),
				_: 1
			}, 8, ["open", "title"]);
		};
	}
}), [["__cssModules", { "$style": {
	fields: "_fields_ihuhd_2",
	field: "_field_ihuhd_2"
} }]]);
//#endregion
//#region src/features/agents/components/AgentMemoryPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentMemoryPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentMemoryPanel",
	props: {
		config: {},
		disabled: {
			type: Boolean,
			default: false
		},
		embedded: {
			type: Boolean,
			default: false
		}
	},
	emits: ["update:config"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const credentialDialogOpen = ref(false);
		const guidanceDialogOpen = ref(false);
		const settingsStore = useSettingsStore();
		const projectId = useAgentProjectId();
		const episodicMemory = computed(() => props.config?.memory?.episodicMemory ?? null);
		const episodicMemoryEnabled = computed(() => episodicMemory.value?.enabled === true);
		const episodicMemoryGuidance = computed(() => {
			const memory = episodicMemory.value;
			return memory?.enabled === true ? memory.guidance : void 0;
		});
		const episodicMemoryCredentialId = computed(() => {
			const memory = episodicMemory.value;
			return memory?.enabled === true ? memory.credential : null;
		});
		const isAiAssistantProxyEnabled = computed(() => settingsStore.moduleSettings.agents?.proxyEnabled === true);
		function buildEnabledMemoryConfig() {
			return {
				...props.config?.memory,
				enabled: true,
				storage: "n8n"
			};
		}
		function enableEpisodicMemory(credentialId) {
			const existingEpisodicMemory = (props.config?.memory)?.episodicMemory;
			emit("update:config", { memory: {
				...buildEnabledMemoryConfig(),
				episodicMemory: {
					...existingEpisodicMemory?.enabled === true ? existingEpisodicMemory : {},
					enabled: true,
					credential: credentialId
				}
			} });
		}
		function disableEpisodicMemory() {
			emit("update:config", { memory: {
				...buildEnabledMemoryConfig(),
				episodicMemory: { enabled: false }
			} });
		}
		function onGuidanceSave(guidance) {
			const existingEpisodicMemory = episodicMemory.value;
			if (existingEpisodicMemory?.enabled !== true) return;
			const { guidance: _, ...rest } = existingEpisodicMemory;
			emit("update:config", { memory: {
				...buildEnabledMemoryConfig(),
				episodicMemory: guidance ? {
					...rest,
					guidance
				} : rest
			} });
		}
		function onCredentialSelected(credentialId) {
			enableEpisodicMemory(credentialId);
			credentialDialogOpen.value = false;
		}
		function onEpisodicMemoryToggle(enabled) {
			if (!enabled) {
				disableEpisodicMemory();
				return;
			}
			if (isAiAssistantProxyEnabled.value) {
				enableEpisodicMemory(MANAGED_CREDENTIAL_TOKEN);
				return;
			}
			credentialDialogOpen.value = true;
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentPanel_default, {
				header: unref(i18n).baseText("agents.builder.memory.title"),
				description: unref(i18n).baseText("agents.builder.memory.description")
			}, {
				"header-actions": withCtx(() => [createVNode(unref(N8nText_default), {
					step: "sm",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.alwaysOn")), 1)]),
					_: 1
				})]),
				default: withCtx(() => [
					createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [
						createVNode(unref(N8nText_default), {
							step: "sm",
							bold: "",
							class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.episodicMemory.label")), 1)]),
							_: 1
						}, 8, ["class"]),
						createVNode(unref(N8nText_default), {
							step: "sm",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.episodicMemory.hint")), 1)]),
							_: 1
						}),
						episodicMemoryEnabled.value && !isAiAssistantProxyEnabled.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "ghost",
							size: "small",
							disabled: props.disabled,
							class: normalizeClass(_ctx.$style.changeCredentialButton),
							"data-testid": "agent-episodic-memory-change-credential",
							onClick: _cache[0] || (_cache[0] = ($event) => credentialDialogOpen.value = true)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.episodicMemory.changeCredential")), 1)]),
							_: 1
						}, 8, ["disabled", "class"])) : createCommentVNode("", true)
					], 2), createBaseVNode("div", { class: normalizeClass([unref(agent_panel_module_default).settingControl, _ctx.$style.episodicControls]) }, [createVNode(unref(N8nSwitch_default), {
						"model-value": episodicMemoryEnabled.value,
						disabled: props.disabled,
						"data-testid": "agent-episodic-memory-toggle",
						"onUpdate:modelValue": _cache[1] || (_cache[1] = (value) => onEpisodicMemoryToggle(Boolean(value)))
					}, null, 8, ["model-value", "disabled"]), episodicMemoryEnabled.value ? (openBlock(), createBlock(unref(N8nIconButton_default), {
						key: 0,
						icon: "chevron-right",
						variant: "ghost",
						size: "small",
						disabled: props.disabled,
						"aria-label": unref(i18n).baseText("agents.builder.memory.episodicMemory.guidance.open"),
						"data-testid": "agent-episodic-memory-guidance-open",
						onClick: _cache[2] || (_cache[2] = ($event) => guidanceDialogOpen.value = true)
					}, null, 8, ["disabled", "aria-label"])) : createCommentVNode("", true)], 2)], 2),
					createVNode(AgentMemoryGuidanceModal_default, {
						open: guidanceDialogOpen.value,
						"onUpdate:open": _cache[3] || (_cache[3] = ($event) => guidanceDialogOpen.value = $event),
						guidance: episodicMemoryGuidance.value,
						disabled: props.disabled,
						onSave: onGuidanceSave
					}, null, 8, [
						"open",
						"guidance",
						"disabled"
					]),
					createVNode(unref(Dialog_default), {
						open: credentialDialogOpen.value,
						size: "medium",
						"onUpdate:open": _cache[4] || (_cache[4] = ($event) => credentialDialogOpen.value = $event)
					}, {
						default: withCtx(() => [createVNode(unref(DialogHeader_default), null, {
							default: withCtx(() => [createVNode(unref(DialogTitle_default), null, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.episodicMemory.credentialDialog.title")), 1)]),
								_: 1
							})]),
							_: 1
						}), createVNode(unref(DialogBody_default), null, {
							default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.dialogContent) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.row) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleGroup) }, [createVNode(unref(N8nText_default), {
								step: "sm",
								bold: "",
								class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.episodicMemory.credential.label")), 1)]),
								_: 1
							}, 8, ["class"]), createVNode(unref(N8nText_default), {
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.memory.episodicMemory.credential.hint")), 1)]),
								_: 1
							})], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.credentialPicker) }, [createVNode(CredentialPicker_default, {
								"app-name": "OpenAI",
								size: "medium",
								"button-size": "large",
								"credential-type": unref(AGENT_EPISODIC_MEMORY_CREDENTIAL_TYPE),
								"selected-credential-id": episodicMemoryCredentialId.value,
								"project-id": unref(projectId),
								"show-delete": false,
								"hide-create-new": false,
								teleported: "",
								"credential-modal-append-to-body": "",
								class: normalizeClass(_ctx.$style.credentialPicker),
								"data-testid": "agent-episodic-memory-credential-picker",
								onCredentialSelected
							}, null, 8, [
								"credential-type",
								"selected-credential-id",
								"project-id",
								"class"
							])], 2)], 2)], 2)]),
							_: 1
						})]),
						_: 1
					}, 8, ["open"])
				]),
				_: 1
			}, 8, ["header", "description"]);
		};
	}
}), [["__cssModules", { "$style": {
	container: "_container_1bdzt_2",
	titleGroup: "_titleGroup_1bdzt_13",
	dialogContent: "_dialogContent_1bdzt_21",
	row: "_row_1bdzt_27",
	credentialPicker: "_credentialPicker_1bdzt_32",
	changeCredentialButton: "_changeCredentialButton_1bdzt_51",
	episodicControls: "_episodicControls_1bdzt_55"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSubAgentsPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$21 = ["data-testid"];
var AgentSubAgentsPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSubAgentsPanel",
	props: {
		config: {},
		disabled: { type: Boolean },
		projectId: {},
		agentId: {}
	},
	emits: ["update:config"],
	setup(__props, { emit: __emit }) {
		const DIFFICULTY_LABEL_KEYS = {
			low: "agents.builder.subAgents.modelsByDifficulty.low.label",
			medium: "agents.builder.subAgents.modelsByDifficulty.medium.label",
			high: "agents.builder.subAgents.modelsByDifficulty.high.label"
		};
		const DIFFICULTY_DESCRIPTION_KEYS = {
			low: "agents.builder.subAgents.modelsByDifficulty.low.description",
			medium: "agents.builder.subAgents.modelsByDifficulty.medium.description",
			high: "agents.builder.subAgents.modelsByDifficulty.high.description"
		};
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const usersStore = useUsersStore();
		const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();
		const projectIdRef = computed(() => props.projectId);
		const { credentialsByProvider } = useAgentModelCredentials(usersStore.currentUserId ?? "anonymous", projectIdRef);
		const pendingDifficultyCredentials = ref({});
		function setPendingDifficultyCredential(difficulty, provider, credentialId) {
			pendingDifficultyCredentials.value = {
				...pendingDifficultyCredentials.value,
				[difficulty]: {
					...pendingDifficultyCredentials.value[difficulty],
					[provider]: credentialId
				}
			};
		}
		function clearPendingDifficultyCredential(difficulty, provider) {
			const current = pendingDifficultyCredentials.value[difficulty];
			if (!current || !(provider in current)) return;
			const { [provider]: _removed, ...rest } = current;
			pendingDifficultyCredentials.value = {
				...pendingDifficultyCredentials.value,
				[difficulty]: rest
			};
		}
		const maxChildrenHintInterpolate = {
			min: String(1),
			max: String(20)
		};
		watch(projectIdRef, (id) => {
			if (id) ensureLoaded(id);
		}, { immediate: true });
		const modelsByDifficulty = computed(() => {
			const entries = SUB_AGENT_TASK_DIFFICULTIES.map((difficulty) => [difficulty, getModelsForPicker(credentialsForDifficulty(difficulty))]);
			return Object.fromEntries(entries);
		});
		function resolveMaxChildrenDisplay(value) {
			return value ?? 10;
		}
		const maxChildrenModelValue = ref(resolveMaxChildrenDisplay(props.config?.subAgents?.maxChildren));
		watch(() => props.config?.subAgents?.maxChildren, (value) => {
			maxChildrenModelValue.value = resolveMaxChildrenDisplay(value);
		});
		function onMaxChildrenChange(n) {
			if (props.disabled) return;
			const subAgents = { ...props.config?.subAgents ?? {} };
			if (isNaN(n)) {
				delete subAgents.maxChildren;
				maxChildrenModelValue.value = 10;
			} else {
				subAgents.maxChildren = n;
				maxChildrenModelValue.value = n;
			}
			emit("update:config", { subAgents });
		}
		function credentialsForDifficulty(difficulty) {
			const global = credentialsByProvider.value;
			const pending = pendingDifficultyCredentials.value[difficulty];
			const base = pending ? {
				...global ?? {},
				...pending
			} : global;
			const mapping = props.config?.subAgents?.modelsByDifficulty?.[difficulty];
			if (!mapping?.model) return base;
			const parsed = parseModelString(mapping.model);
			if (!parsed || !isAgentModelProvider(parsed.provider)) return base;
			return {
				...base ?? {},
				[parsed.provider]: mapping.credential
			};
		}
		function selectedModelForDifficulty(difficulty) {
			const mapping = props.config?.subAgents?.modelsByDifficulty?.[difficulty];
			if (!mapping?.model) return null;
			const parsed = parseModelString(mapping.model);
			if (!parsed || !isAgentModelProvider(parsed.provider)) return null;
			const registryEntry = modelsByDifficulty.value[difficulty][parsed.provider]?.models.find((model) => model.model === parsed.name);
			if (registryEntry) return registryEntry;
			return {
				provider: parsed.provider,
				model: parsed.name,
				name: parsed.name,
				description: null,
				createdAt: null,
				metadata: {
					functionCalling: false,
					available: true
				}
			};
		}
		function hasDifficultyMapping(difficulty) {
			return Boolean(props.config?.subAgents?.modelsByDifficulty?.[difficulty]);
		}
		function boundCredentialForDifficulty(difficulty) {
			return props.config?.subAgents?.modelsByDifficulty?.[difficulty]?.credential ?? null;
		}
		const hasAnyDifficultyMapping = computed(() => SUB_AGENT_TASK_DIFFICULTIES.some((difficulty) => hasDifficultyMapping(difficulty)));
		const customModelRoutingEnabled = ref(hasAnyDifficultyMapping.value);
		watch(() => props.agentId, () => {
			customModelRoutingEnabled.value = false;
		}, { flush: "sync" });
		watch(() => props.config?.subAgents?.modelsByDifficulty, () => {
			if (hasAnyDifficultyMapping.value) customModelRoutingEnabled.value = true;
		}, {
			deep: true,
			immediate: true
		});
		function emitModelsByDifficulty(difficulty, mapping) {
			const existing = { ...props.config?.subAgents?.modelsByDifficulty ?? {} };
			if (mapping) existing[difficulty] = mapping;
			else delete existing[difficulty];
			const subAgents = { ...props.config?.subAgents ?? {} };
			if (Object.keys(existing).length > 0) subAgents.modelsByDifficulty = existing;
			else delete subAgents.modelsByDifficulty;
			emit("update:config", { subAgents });
		}
		function onCustomModelRoutingToggle(enabled) {
			if (props.disabled) return;
			customModelRoutingEnabled.value = enabled;
			if (enabled) return;
			const subAgents = { ...props.config?.subAgents ?? {} };
			delete subAgents.modelsByDifficulty;
			emit("update:config", { subAgents });
		}
		function onDifficultyModelChange(difficulty, selection) {
			if (props.disabled) return;
			const credentialId = credentialsForDifficulty(difficulty)?.[selection.provider];
			if (!credentialId) {
				toast.showError(new Error(i18n.baseText("credentials.noResults")), i18n.baseText("error"));
				return;
			}
			emitModelsByDifficulty(difficulty, {
				model: `${selection.provider}/${sanitizeModelId(selection.provider, selection.model)}`,
				credential: credentialId
			});
			clearPendingDifficultyCredential(difficulty, selection.provider);
		}
		function onDifficultySelectCredential(difficulty, provider, credentialId) {
			if (props.disabled || !credentialId) return;
			const mapping = props.config?.subAgents?.modelsByDifficulty?.[difficulty];
			const mappingProvider = mapping?.model ? parseModelString(mapping.model)?.provider : void 0;
			if (mapping?.model && mappingProvider === provider) {
				clearPendingDifficultyCredential(difficulty, provider);
				emitModelsByDifficulty(difficulty, {
					...mapping,
					credential: credentialId
				});
				return;
			}
			setPendingDifficultyCredential(difficulty, provider, credentialId);
		}
		function clearDifficultyMapping(difficulty) {
			if (props.disabled) return;
			pendingDifficultyCredentials.value = {
				...pendingDifficultyCredentials.value,
				[difficulty]: {}
			};
			emitModelsByDifficulty(difficulty, void 0);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentPanel_default, {
				header: unref(i18n).baseText("agents.builder.subAgents.title"),
				description: unref(i18n).baseText("agents.builder.subAgents.settings.description"),
				class: normalizeClass(_ctx.$style.subAgentsPanel),
				"aria-disabled": __props.disabled
			}, {
				default: withCtx(() => [
					createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.subAgents.maxChildren.label")), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.subAgents.maxChildren.hint", { interpolate: maxChildrenHintInterpolate })), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(N8nInputNumber_default), {
						"model-value": maxChildrenModelValue.value,
						min: unref(1),
						max: unref(20),
						precision: 0,
						controls: false,
						disabled: __props.disabled,
						class: normalizeClass(unref(agent_panel_module_default).settingControlShort),
						"data-testid": "agent-sub-agents-max-children-input",
						"onUpdate:modelValue": onMaxChildrenChange
					}, null, 8, [
						"model-value",
						"min",
						"max",
						"disabled",
						"class"
					])], 2),
					createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingRow) }, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
						step: "sm",
						bold: "",
						class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.subAgents.customModelRouting.label")), 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						size: "small",
						class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.subAgents.customModelRouting.hint")), 1)]),
						_: 1
					}, 8, ["class"])], 2), createVNode(unref(Switch_default), {
						"model-value": customModelRoutingEnabled.value,
						disabled: __props.disabled,
						class: normalizeClass(unref(agent_panel_module_default).settingControl),
						"data-testid": "agent-sub-agents-custom-model-routing-toggle",
						"onUpdate:modelValue": onCustomModelRoutingToggle
					}, null, 8, [
						"model-value",
						"disabled",
						"class"
					])], 2),
					customModelRoutingEnabled.value ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.inlineModelsSection),
						"data-testid": "agent-sub-agents-inline-models"
					}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.difficultyRows) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(SUB_AGENT_TASK_DIFFICULTIES), (difficulty) => {
						return openBlock(), createElementBlock("div", {
							key: difficulty,
							class: normalizeClass(unref(agent_panel_module_default).settingRow),
							"data-testid": `agent-sub-agents-difficulty-row-${difficulty}`
						}, [createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingLabel) }, [createVNode(unref(N8nText_default), {
							step: "sm",
							bold: "",
							class: normalizeClass(unref(agent_panel_module_default).dataEntryLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(DIFFICULTY_LABEL_KEYS[difficulty])), 1)]),
							_: 2
						}, 1032, ["class"]), createVNode(unref(N8nText_default), {
							size: "small",
							class: normalizeClass(unref(agent_panel_module_default).dataEntrySubLabel)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(DIFFICULTY_DESCRIPTION_KEYS[difficulty])), 1)]),
							_: 2
						}, 1032, ["class"])], 2), createBaseVNode("div", { class: normalizeClass(unref(agent_panel_module_default).settingControlWide) }, [createVNode(AgentModelSelector_default, {
							"selected-model": selectedModelForDifficulty(difficulty),
							credentials: credentialsForDifficulty(difficulty),
							"models-by-provider": modelsByDifficulty.value[difficulty],
							"is-loading": unref(isLoading),
							"project-id": __props.projectId,
							"warn-missing-credentials": true,
							"bound-credential-id": boundCredentialForDifficulty(difficulty),
							disabled: __props.disabled,
							"data-testid": `agent-sub-agents-difficulty-${difficulty}-model`,
							onChange: (selection) => onDifficultyModelChange(difficulty, selection),
							onSelectCredential: (provider, credentialId) => onDifficultySelectCredential(difficulty, provider, credentialId)
						}, null, 8, [
							"selected-model",
							"credentials",
							"models-by-provider",
							"is-loading",
							"project-id",
							"bound-credential-id",
							"disabled",
							"data-testid",
							"onChange",
							"onSelectCredential"
						]), hasDifficultyMapping(difficulty) ? (openBlock(), createBlock(unref(N8nTooltip_default), {
							key: 0,
							content: unref(i18n).baseText("agents.builder.subAgents.modelsByDifficulty.clear"),
							placement: "top"
						}, {
							default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
								icon: "x",
								variant: "ghost",
								size: "mini",
								"icon-size": "small",
								disabled: __props.disabled,
								"aria-label": unref(i18n).baseText("agents.builder.subAgents.modelsByDifficulty.clear"),
								"data-testid": `agent-sub-agents-difficulty-${difficulty}-clear`,
								onClick: ($event) => clearDifficultyMapping(difficulty)
							}, null, 8, [
								"disabled",
								"aria-label",
								"data-testid",
								"onClick"
							])]),
							_: 2
						}, 1032, ["content"])) : createCommentVNode("", true)], 2)], 10, _hoisted_1$21);
					}), 128))], 2)], 2)) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, [
				"header",
				"description",
				"class",
				"aria-disabled"
			]);
		};
	}
}), [["__cssModules", { "$style": {
	subAgentsPanel: "_subAgentsPanel_1q141_1",
	inlineModelsSection: "_inlineModelsSection_1q141_8",
	difficultyRows: "_difficultyRows_1q141_15"
} }]]);
var AgentBuilderTabPanel_vue_vue_type_style_index_0_lang_module_default = { tabPanel: "_tabPanel_128q6_1" };
//#endregion
//#region src/features/agents/components/AgentBuilderTabPanel.vue
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _sfc_main$1 = {};
function _sfc_render$1(_ctx, _cache) {
	return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.tabPanel) }, [renderSlot(_ctx.$slots, "default")], 2);
}
var AgentBuilderTabPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(_sfc_main$1, [["render", _sfc_render$1], ["__cssModules", { "$style": AgentBuilderTabPanel_vue_vue_type_style_index_0_lang_module_default }]]);
//#endregion
//#region src/features/agents/composables/useTestAgentPreviewFlag.ts
init_runtime_core_esm_bundler();
function useTestAgentPreviewFlag() {
	const isAgentEvalsEnabled = useAgentEvalsFlag();
	return { isFeatureEnabled: computed(() => isAgentEvalsEnabled.value) };
}
//#endregion
//#region src/features/agents/composables/useAgentEvalRunProgress.ts
/**
* Watches an agent eval run from start to settled, for the cases card.
*
* A run executes the agent once per case, so it finishes long after the request
* that started it returns. Progress therefore comes from polling the summary
* route — status plus tallies, no per-case rows — until nothing is pending.
*
* The polling itself lives in the store rather than here. It has to refresh the
* run's per-case rows as well as its counts (rows read mid-run still show as
* queued with no answer), which the review view depends on — so there is one
* poller for the run, not one per surface. This composable owns the lifecycle for
* this card: when to start it, when to stop it, and what to say when it settles.
*/
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
function useAgentEvalRunProgress(params) {
	const store = useAgentEvalsStore();
	const i18n = useI18n();
	const { showError, showMessage } = useToast();
	/** The run this card is watching, once one is known. */
	const runId = computed(() => store.getLatestRunId(toValue(params.datasetId)) ?? null);
	const review = computed(() => runId.value ? store.getReview(runId.value) : null);
	const summary = computed(() => review.value?.counts ?? null);
	const isStarting = computed(() => store.isStartingRun(toValue(params.datasetId)));
	const isCancelling = computed(() => store.isCancellingRun(toValue(params.datasetId)));
	const isRunning = computed(() => runId.value ? store.isRunInFlight(runId.value) : false);
	const lostTrack = computed(() => runId.value ? store.hasLostTrackOfRun(runId.value) : false);
	/**
	* True until we know whether this dataset already has a run. `resolveLatestRunId`
	* writes the answer into the store, so starting a run while it is in flight would
	* let a "no run yet" result land afterwards and wipe the id of the run just
	* started — leaving it unwatched with no progress and no stop control.
	*/
	const isResolving = ref(true);
	/** Announced once per run, so a re-render can't re-toast a run already reported. */
	const announcedRunIds = ref(/* @__PURE__ */ new Set());
	function announceSettled(id, counts) {
		if (announcedRunIds.value.has(id)) return;
		announcedRunIds.value.add(id);
		const { total, success, error, cancelled } = counts;
		if (cancelled > 0) {
			showMessage({
				title: i18n.baseText("agents.builder.agentEvals.run.cancelled", {
					adjustToNumber: cancelled,
					interpolate: { cancelled: String(cancelled) }
				}),
				type: "info"
			});
			return;
		}
		showMessage({
			title: i18n.baseText("agents.builder.agentEvals.run.finished", {
				adjustToNumber: total,
				interpolate: {
					success: String(success),
					total: String(total)
				}
			}),
			type: error > 0 ? "warning" : "success"
		});
	}
	function isStaleTarget(projectId, agentId, datasetId) {
		return toValue(params.projectId) !== projectId || toValue(params.agentId) !== agentId || toValue(params.datasetId) !== datasetId;
	}
	function watchRun(id) {
		store.startPollingRun(toValue(params.projectId), toValue(params.agentId), id);
	}
	async function startRun() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		if (!projectId || !agentId || !datasetId || isResolving.value) return;
		try {
			const run = await store.startRun(projectId, agentId, datasetId);
			if (isStaleTarget(projectId, agentId, datasetId)) return;
			await store.openRun(projectId, agentId, run.id).catch(() => null);
			if (isStaleTarget(projectId, agentId, datasetId)) return;
			watchRun(run.id);
		} catch (error) {
			if (isStaleTarget(projectId, agentId, datasetId)) return;
			showError(error, i18n.baseText("agents.builder.agentEvals.run.startError"));
		}
	}
	async function cancelRun() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		const id = runId.value;
		if (!projectId || !agentId || !datasetId || !id) return;
		try {
			await store.cancelRun(projectId, agentId, datasetId, id);
		} catch (error) {
			if (isStaleTarget(projectId, agentId, datasetId)) return;
			showError(error, i18n.baseText("agents.builder.agentEvals.run.cancelError"));
		}
	}
	async function adoptLatestRun() {
		const projectId = toValue(params.projectId);
		const agentId = toValue(params.agentId);
		const datasetId = toValue(params.datasetId);
		if (!projectId || !agentId || !datasetId) return;
		isResolving.value = true;
		try {
			const id = await store.resolveLatestRunId(projectId, agentId, datasetId);
			if (!id || isStaleTarget(projectId, agentId, datasetId)) return;
			await store.openRun(projectId, agentId, id).catch(() => null);
			if (isStaleTarget(projectId, agentId, datasetId)) return;
			if (store.isRunInFlight(id)) watchRun(id);
		} catch {} finally {
			isResolving.value = false;
		}
	}
	watch([runId, summary], ([id, counts]) => {
		if (!id || !counts) return;
		if (counts.pending === 0) announceSettled(id, counts);
	});
	watch([
		() => toValue(params.projectId),
		() => toValue(params.agentId),
		() => toValue(params.datasetId)
	], () => {
		store.stopPollingRun();
		adoptLatestRun();
	}, { immediate: true });
	onScopeDispose(() => store.stopPollingRun());
	return {
		runId,
		summary,
		isRunning,
		isStarting,
		isCancelling,
		isResolving,
		lostTrack,
		startRun,
		cancelRun
	};
}
//#endregion
//#region src/features/agents/components/AgentEvalCaseEditor.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$20 = ["onKeydown"];
var AgentEvalCaseEditor_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalCaseEditor",
	props: {
		input: {},
		whatToCheck: {},
		removable: { type: Boolean },
		requestOnly: { type: Boolean },
		saving: { type: Boolean },
		removing: { type: Boolean }
	},
	emits: [
		"save",
		"cancel",
		"remove"
	],
	setup(__props, { emit: __emit }) {
		/**
		* One case in edit mode, in place of the row it replaces.
		*
		* Values are seeded into local state rather than bound to the props, so
		* cancelling genuinely discards and a concurrent refresh can't rewrite what
		* someone is halfway through typing. Removal lives here because the design gives
		* a row no delete affordance of its own.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const input = ref(props.input);
		const whatToCheck = ref(props.whatToCheck);
		watch(() => [props.input, props.whatToCheck], ([nextInput, nextCheck]) => {
			input.value = nextInput;
			whatToCheck.value = nextCheck;
		});
		const busy = computed(() => Boolean(props.saving) || Boolean(props.removing));
		const canSave = computed(() => !busy.value && input.value.trim().length > 0 && (props.requestOnly || whatToCheck.value.trim().length > 0));
		function onSave() {
			if (!canSave.value) return;
			emit("save", {
				input: input.value.trim(),
				whatToCheck: props.requestOnly ? "" : whatToCheck.value.trim()
			});
		}
		function onCancel() {
			if (busy.value) return;
			emit("cancel");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.editor),
				"data-testid": "agent-evals-case-editor",
				onKeydown: withKeys(withModifiers(onCancel, ["stop"]), ["esc"])
			}, [
				createVNode(unref(N8nInputLabel_default), {
					label: unref(i18n).baseText("agents.builder.agentEvals.case.request.label"),
					bold: false,
					size: "small"
				}, {
					default: withCtx(() => [createVNode(unref(Input_default), {
						modelValue: input.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => input.value = $event),
						type: "textarea",
						autosize: {
							minRows: 1,
							maxRows: 6
						},
						disabled: busy.value,
						placeholder: unref(i18n).baseText("agents.builder.agentEvals.case.request.placeholder"),
						"data-testid": "agent-evals-case-input",
						onKeydown: [withKeys(withModifiers(onSave, ["meta"]), ["enter"]), withKeys(withModifiers(onSave, ["ctrl"]), ["enter"])]
					}, null, 8, [
						"modelValue",
						"disabled",
						"placeholder",
						"onKeydown"
					])]),
					_: 1
				}, 8, ["label"]),
				!__props.requestOnly ? (openBlock(), createBlock(unref(N8nInputLabel_default), {
					key: 0,
					label: unref(i18n).baseText("agents.builder.agentEvals.case.whatToCheck.label"),
					bold: false,
					size: "small"
				}, {
					default: withCtx(() => [createVNode(unref(Input_default), {
						modelValue: whatToCheck.value,
						"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => whatToCheck.value = $event),
						type: "textarea",
						autosize: {
							minRows: 1,
							maxRows: 6
						},
						disabled: busy.value,
						placeholder: unref(i18n).baseText("agents.builder.agentEvals.case.whatToCheck.placeholder"),
						"data-testid": "agent-evals-case-check",
						onKeydown: [withKeys(withModifiers(onSave, ["meta"]), ["enter"]), withKeys(withModifiers(onSave, ["ctrl"]), ["enter"])]
					}, null, 8, [
						"modelValue",
						"disabled",
						"placeholder",
						"onKeydown"
					])]),
					_: 1
				}, 8, ["label"])) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [
					__props.removable ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "destructive",
						size: "small",
						type: "button",
						loading: __props.removing,
						disabled: busy.value,
						"data-testid": "agent-evals-case-remove",
						onClick: _cache[2] || (_cache[2] = ($event) => emit("remove"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.case.remove")), 1)]),
						_: 1
					}, 8, ["loading", "disabled"])) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.spacer) }, null, 2),
					createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						type: "button",
						disabled: busy.value,
						"data-testid": "agent-evals-case-cancel",
						onClick: onCancel
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.case.cancel")), 1)]),
						_: 1
					}, 8, ["disabled"]),
					createVNode(unref(N8nButton_default), {
						variant: "solid",
						size: "small",
						type: "button",
						loading: __props.saving,
						disabled: !canSave.value,
						"data-testid": "agent-evals-case-save",
						onClick: onSave
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.case.save")), 1)]),
						_: 1
					}, 8, ["loading", "disabled"])
				], 2)
			], 42, _hoisted_1$20);
		};
	}
}), [["__cssModules", { "$style": {
	editor: "_editor_kvs0q_1",
	actions: "_actions_kvs0q_9",
	spacer: "_spacer_kvs0q_15"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalCaseRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var AgentEvalCaseRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalCaseRow",
	props: {
		index: {},
		input: {},
		whatToCheck: {},
		editable: { type: Boolean }
	},
	emits: ["edit"],
	setup(__props, { emit: __emit }) {
		/**
		* One drafted case in read mode: the request, and in plain language what a good
		* answer does. The check is advisory — nothing grades against it automatically —
		* so it reads as a note rather than an assertion.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const editLabel = computed(() => i18n.baseText("agents.builder.agentEvals.cases.editCase", { interpolate: { index: String(props.index) } }));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.row),
				"data-testid": "agent-evals-case-row"
			}, [
				createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.index)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.index), 1)]),
					_: 1
				}, 8, ["class"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.input), 1)]),
					_: 1
				}), __props.whatToCheck ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.check)
				}, [createVNode(unref(N8nIcon_default), {
					icon: "circle-check",
					size: "small",
					class: normalizeClass(_ctx.$style.checkIcon)
				}, null, 8, ["class"]), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.whatToCheck), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true)], 2),
				__props.editable ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: editLabel.value
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "pencil",
						variant: "ghost",
						size: "small",
						type: "button",
						"aria-label": editLabel.value,
						"data-testid": "agent-evals-case-edit",
						onClick: _cache[0] || (_cache[0] = ($event) => emit("edit"))
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["content"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_f1sro_1",
	index: "_index_f1sro_9",
	body: "_body_f1sro_14",
	check: "_check_f1sro_22",
	checkIcon: "_checkIcon_f1sro_28"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalCasesCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentEvalCasesCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalCasesCard",
	props: {
		projectId: {},
		agentId: {},
		dataset: {},
		disabled: { type: Boolean },
		canRun: { type: Boolean },
		generating: { type: Boolean }
	},
	emits: ["regenerate"],
	setup(__props, { emit: __emit }) {
		/**
		* The drafted cases of one dataset: a list to review, edit, add to and run.
		*
		* Framed as drafts throughout — the tag says they were AI-written and the
		* subtitle says nothing is graded automatically, because the checks are notes for
		* the person reviewing the run, not assertions the runner enforces.
		*/
		const props = __props;
		const emit = __emit;
		const store = useAgentEvalsStore();
		const i18n = useI18n();
		const { showError, showMessage } = useToast();
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const source = computed(() => toCaseSource(props.dataset));
		const isRequestOnly = computed(() => source.value?.columns.whatToCheck === null);
		/** True when the last read of this dataset's rows failed, so the list is unknown rather than empty. */
		const loadFailed = ref(false);
		const isEditable = computed(() => !props.disabled && source.value !== null && !loadFailed.value);
		const editingRowId = ref(null);
		const isAddingCase = ref(false);
		const savingDraft = ref(false);
		const removingRowId = ref(null);
		const cases = computed(() => store.getCases(props.dataset.id));
		const caseCount = computed(() => store.getCasesCount(props.dataset.id));
		const isLoading = computed(() => store.isLoadingCases(props.dataset.id) && !store.areCasesLoaded(props.dataset.id));
		const hiddenCaseCount = computed(() => Math.max(0, caseCount.value - cases.value.length));
		const { summary, isRunning, isStarting, isCancelling, isResolving, lostTrack, startRun, cancelRun } = useAgentEvalRunProgress({
			projectId: () => props.projectId,
			agentId: () => props.agentId,
			datasetId: () => props.dataset.id
		});
		const isInFlight = computed(() => isStarting.value || isRunning.value);
		const canCancel = computed(() => !props.disabled);
		const runAllLabel = computed(() => i18n.baseText("agents.builder.agentEvals.cases.runAll", {
			adjustToNumber: caseCount.value,
			interpolate: { count: String(caseCount.value) }
		}));
		const runStatus = computed(() => {
			if (lostTrack.value) return i18n.baseText("agents.builder.agentEvals.run.lostTrack");
			if (isStarting.value) return i18n.baseText("agents.builder.agentEvals.run.starting");
			if (!isRunning.value) return null;
			const counts = summary.value;
			if (!counts) return i18n.baseText("agents.builder.agentEvals.run.starting");
			return i18n.baseText("agents.builder.agentEvals.run.progress", { interpolate: {
				done: String(counts.total - counts.pending),
				total: String(counts.total)
			} });
		});
		async function loadCases() {
			const current = source.value;
			if (!current) return;
			loadFailed.value = false;
			try {
				await store.fetchCases(props.projectId, current);
			} catch (error) {
				loadFailed.value = true;
				showError(error, i18n.baseText("agents.builder.agentEvals.cases.loadError"));
			}
		}
		watch([() => props.projectId, () => props.dataset.id], async () => {
			editingRowId.value = null;
			isAddingCase.value = false;
			await loadCases();
		}, { immediate: true });
		function onEdit(rowId) {
			isAddingCase.value = false;
			editingRowId.value = rowId;
		}
		function onAddCase() {
			editingRowId.value = null;
			isAddingCase.value = true;
		}
		async function onSaveCase(rowId, value) {
			const current = source.value;
			if (!current) return;
			try {
				if (!await store.updateCase(props.projectId, current, rowId, value)) {
					showMessage({
						title: i18n.baseText("agents.builder.agentEvals.case.saveError"),
						type: "error"
					});
					return;
				}
				editingRowId.value = null;
			} catch (error) {
				showError(error, i18n.baseText("agents.builder.agentEvals.case.saveError"));
			}
		}
		async function onSaveDraft(value) {
			const current = source.value;
			if (!current) return;
			savingDraft.value = true;
			try {
				await store.createCase(props.projectId, current, value);
				isAddingCase.value = false;
			} catch (error) {
				showError(error, i18n.baseText("agents.builder.agentEvals.case.addError"));
			} finally {
				savingDraft.value = false;
			}
		}
		async function onRemoveCase(rowId) {
			const current = source.value;
			if (!current) return;
			removingRowId.value = rowId;
			try {
				if (!await store.deleteCase(props.projectId, current, rowId)) {
					showMessage({
						title: i18n.baseText("agents.builder.agentEvals.case.removeError"),
						type: "error"
					});
					return;
				}
				editingRowId.value = null;
			} catch (error) {
				showError(error, i18n.baseText("agents.builder.agentEvals.case.removeError"));
			} finally {
				removingRowId.value = null;
			}
		}
		async function onRegenerate() {
			if (await openAgentConfirmationModal({
				title: i18n.baseText("agents.builder.agentEvals.regenerate.confirm.title"),
				description: i18n.baseText("agents.builder.agentEvals.regenerate.confirm.description"),
				confirmButtonText: i18n.baseText("agents.builder.agentEvals.regenerate.confirm.confirmButton"),
				cancelButtonText: i18n.baseText("agents.builder.agentEvals.regenerate.confirm.cancelButton")
			}) !== "confirm") return;
			emit("regenerate");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				class: normalizeClass(_ctx.$style.card),
				"data-testid": "agent-evals-cases-card"
			}, {
				default: withCtx(() => [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerRow) }, [
							createVNode(unref(N8nBadge_default), {
								variant: "secondary",
								class: normalizeClass(_ctx.$style.tag)
							}, {
								default: withCtx(() => [createVNode(unref(N8nIcon_default), {
									icon: "sparkles",
									size: "xsmall"
								}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.tag")), 1)]),
								_: 1
							}, 8, ["class"]),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.spacer) }, null, 2),
							!__props.disabled ? (openBlock(), createBlock(unref(N8nButton_default), {
								key: 0,
								variant: "ghost",
								size: "small",
								type: "button",
								icon: "refresh-cw",
								loading: __props.generating,
								"data-testid": "agent-evals-regenerate",
								onClick: onRegenerate
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.regenerate")), 1)]),
								_: 1
							}, 8, ["loading"])) : createCommentVNode("", true)
						], 2),
						createVNode(unref(N8nText_default), {
							tag: "h3",
							size: "large",
							color: "text-dark",
							bold: "",
							class: normalizeClass(_ctx.$style.title)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.title")), 1)]),
							_: 1
						}, 8, ["class"]),
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.description")), 1)]),
							_: 1
						})
					], 2),
					!source.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 0,
						theme: "info",
						class: normalizeClass(_ctx.$style.notice),
						"data-testid": "agent-evals-cases-unmapped"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.unmapped")), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					loadFailed.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "danger",
						class: normalizeClass(_ctx.$style.notice),
						"data-testid": "agent-evals-cases-load-failed"
					}, {
						actions: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "ghost",
							size: "small",
							type: "button",
							"data-testid": "agent-evals-cases-retry",
							onClick: loadCases
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.retry")), 1)]),
							_: 1
						})]),
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.loadError")) + " ", 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					hiddenCaseCount.value > 0 ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 2,
						theme: "warning",
						class: normalizeClass(_ctx.$style.notice),
						"data-testid": "agent-evals-cases-truncated"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.truncated", {
							adjustToNumber: hiddenCaseCount.value,
							interpolate: {
								shown: String(cases.value.length),
								hidden: String(hiddenCaseCount.value)
							}
						})), 1)]),
						_: 1
					}, 8, ["class"])) : createCommentVNode("", true),
					isLoading.value ? (openBlock(), createElementBlock("div", {
						key: 3,
						class: normalizeClass(_ctx.$style.loading),
						"data-testid": "agent-evals-cases-loading"
					}, [createVNode(unref(N8nLoading_default), {
						variant: "p",
						rows: 4
					})], 2)) : (openBlock(), createElementBlock("div", {
						key: 4,
						class: normalizeClass(_ctx.$style.rows)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(cases.value, (evalCase, position) => {
						return openBlock(), createElementBlock(Fragment, { key: evalCase.rowId }, [editingRowId.value === evalCase.rowId ? (openBlock(), createBlock(AgentEvalCaseEditor_default, {
							key: 0,
							input: evalCase.input,
							"what-to-check": evalCase.whatToCheck,
							"request-only": isRequestOnly.value,
							removable: "",
							saving: unref(store).isMutatingCase(__props.dataset.id, evalCase.rowId) && removingRowId.value !== evalCase.rowId,
							removing: removingRowId.value === evalCase.rowId,
							onSave: ($event) => onSaveCase(evalCase.rowId, $event),
							onCancel: _cache[0] || (_cache[0] = ($event) => editingRowId.value = null),
							onRemove: ($event) => onRemoveCase(evalCase.rowId)
						}, null, 8, [
							"input",
							"what-to-check",
							"request-only",
							"saving",
							"removing",
							"onSave",
							"onRemove"
						])) : (openBlock(), createBlock(AgentEvalCaseRow_default, {
							key: 1,
							index: position + 1,
							input: evalCase.input,
							"what-to-check": evalCase.whatToCheck,
							editable: isEditable.value,
							onEdit: ($event) => onEdit(evalCase.rowId)
						}, null, 8, [
							"index",
							"input",
							"what-to-check",
							"editable",
							"onEdit"
						]))], 64);
					}), 128)), isAddingCase.value ? (openBlock(), createBlock(AgentEvalCaseEditor_default, {
						key: 0,
						input: "",
						"what-to-check": "",
						"request-only": isRequestOnly.value,
						saving: savingDraft.value,
						onSave: onSaveDraft,
						onCancel: _cache[1] || (_cache[1] = ($event) => isAddingCase.value = false)
					}, null, 8, ["request-only", "saving"])) : createCommentVNode("", true)], 2)),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.footer) }, [
						isEditable.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 0,
							variant: "ghost",
							size: "small",
							type: "button",
							icon: "plus",
							disabled: isAddingCase.value,
							"data-testid": "agent-evals-add-case",
							onClick: onAddCase
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.cases.addCase")), 1)]),
							_: 1
						}, 8, ["disabled"])) : createCommentVNode("", true),
						createBaseVNode("div", { class: normalizeClass(_ctx.$style.spacer) }, null, 2),
						runStatus.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 1,
							size: "small",
							color: "text-light",
							"data-testid": "agent-evals-run-status"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(runStatus.value), 1)]),
							_: 1
						})) : createCommentVNode("", true),
						isInFlight.value && canCancel.value ? (openBlock(), createBlock(unref(N8nButton_default), {
							key: 2,
							variant: "outline",
							size: "medium",
							type: "button",
							icon: "filled-square",
							loading: unref(isCancelling),
							"data-testid": "agent-evals-cancel-run",
							onClick: unref(cancelRun)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.run.cancel")), 1)]),
							_: 1
						}, 8, ["loading", "onClick"])) : (openBlock(), createBlock(unref(N8nButton_default), {
							key: 3,
							variant: "solid",
							size: "medium",
							type: "button",
							icon: "play",
							disabled: !__props.canRun || caseCount.value === 0 || unref(lostTrack) || unref(isResolving),
							loading: isInFlight.value,
							"data-testid": "agent-evals-run-all",
							onClick: unref(startRun)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(runAllLabel.value), 1)]),
							_: 1
						}, 8, [
							"disabled",
							"loading",
							"onClick"
						]))
					], 2)
				]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_1xs0p_3",
	header: "_header_1xs0p_8",
	headerRow: "_headerRow_1xs0p_15",
	tag: "_tag_1xs0p_22",
	title: "_title_1xs0p_28",
	spacer: "_spacer_1xs0p_32",
	notice: "_notice_1xs0p_36",
	loading: "_loading_1xs0p_40",
	rows: "_rows_1xs0p_44",
	footer: "_footer_1xs0p_52"
} }]]);
//#endregion
//#region src/features/agents/composables/useApplyAgentEvalSuggestions.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Applies the stored fix suggestions of failed eval results: the backend rewrites the
* agent's instructions from the *saved* config, then reruns just those results. The builder
* saves its pending edits first, locks editing while this runs and reloads the config
* afterwards (see `AgentConfigWrite`). Without a builder there is nothing to lock, so other
* surfaces are told to refresh instead.
*/
function useApplyAgentEvalSuggestions(target) {
	const i18n = useI18n();
	const toast = useToast();
	const store = useAgentEvalsStore();
	const runConfigWrite = inject(AGENT_CONFIG_WRITE_KEY, null);
	const applyingIds = ref([]);
	const applyingPreview = ref(false);
	async function writeConfig(agentId, work) {
		try {
			if (runConfigWrite) return await runConfigWrite(work);
			try {
				return await work();
			} finally {
				agentsEventBus.emit("agentUpdated", {
					agentId,
					source: "agent-evals"
				});
			}
		} catch (error) {
			const conflict = error instanceof ResponseError && error.httpStatusCode === 409;
			toast.showError(error, i18n.baseText(conflict ? "agents.builder.agentEvals.suggestion.conflictError" : "agents.builder.agentEvals.suggestion.applyError"));
			return null;
		}
	}
	const busy = () => applyingIds.value.length > 0 || applyingPreview.value;
	/**
	* Applies the suggestions of these results. One request takes at most
	* MAX_APPLY_SUGGESTIONS results, so a longer list goes out as successive requests, all
	* inside one locked write on the agent the call started on. The first failure stops the
	* rest. A batch with nothing left to send is skipped, not a failure. Resolves to whether
	* no request failed.
	*/
	async function applySuggestions(resultIds) {
		const ids = [...new Set(resultIds)];
		if (ids.length === 0 || busy()) return false;
		const { projectId, agentId } = target();
		applyingIds.value = ids;
		try {
			return await writeConfig(agentId, async () => {
				for (let start = 0; start < ids.length; start += 10) {
					const batch = ids.slice(start, start + 10);
					await store.applySuggestions(projectId, agentId, batch);
				}
				return true;
			}) === true;
		} finally {
			applyingIds.value = [];
		}
	}
	async function applyPreviewSuggestion(options) {
		if (busy()) return null;
		const { projectId, agentId } = target();
		applyingPreview.value = true;
		try {
			return await writeConfig(agentId, async () => await store.applyPreviewSuggestion(projectId, agentId, options));
		} finally {
			applyingPreview.value = false;
		}
	}
	return {
		applyingIds,
		applySuggestions,
		applyingPreview,
		applyPreviewSuggestion
	};
}
//#endregion
//#region src/features/agents/utils/agent-eval-tool-calls.ts
/** The recorded value for a call the runner cancelled, as opposed to one that failed. */
var CANCELED_ERROR = "canceled";
function isPersistedToolCall(value) {
	return isRecord(value) && typeof value.tool === "string";
}
function resolveState(error) {
	if (error === void 0) return TOOL_CALL_STATE.DONE;
	if (error === CANCELED_ERROR) return TOOL_CALL_STATE.CANCELLED;
	return TOOL_CALL_STATE.ERROR;
}
/**
* Adapts a persisted eval result's `toolCalls` blob into the shape
* `AgentChatToolSteps` renders, so the chat component stays the single renderer of
* a tool-call disclosure.
*
* The runner stores `{ calls: [...] }`, and its records carry neither a call id nor
* a state — a chat tool call is observed live, an eval one is read back after the
* fact — so both are synthesized here.
*
* Takes the blob as `unknown` rather than `JsonObject`: the column's declared type
* says nothing useful about its elements, and narrowing from `JsonValue` can't
* reach a record shape whose `input`/`output` are themselves opaque.
*/
function toDisplayToolCalls(toolCalls) {
	if (!isRecord(toolCalls) || !isUnknownArray(toolCalls.calls)) return [];
	return toolCalls.calls.filter(isPersistedToolCall).map((call, index) => ({
		tool: call.tool,
		toolCallId: `${index}-${call.tool}`,
		input: call.input,
		output: call.output,
		state: resolveState(call.error)
	}));
}
//#endregion
//#region src/features/agents/components/AgentAvatar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$19 = [
	"data-tone",
	"data-waiting",
	"aria-label",
	"title"
];
var AgentAvatar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentAvatar",
	props: {
		kind: {},
		size: {},
		label: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const toneByKind = {
			pass: "good",
			strong: "good",
			work: "warn",
			fail: "bad",
			idle: "neutral",
			waiting: "none"
		};
		const tone = computed(() => toneByKind[props.kind]);
		const iconByKind = {
			pass: "bot-pass",
			strong: "bot-pass",
			work: "bot-warning",
			fail: "bot-fail",
			idle: "bot-idle",
			waiting: "bot-waiting"
		};
		const icon = computed(() => iconByKind[props.kind]);
		const statusLabel = computed(() => {
			return {
				pass: i18n.baseText("instanceAi.testAgentPreview.avatar.passed"),
				strong: i18n.baseText("instanceAi.testAgentPreview.avatar.passed"),
				work: i18n.baseText("instanceAi.testAgentPreview.avatar.needsWork"),
				fail: i18n.baseText("instanceAi.testAgentPreview.avatar.couldntFinish"),
				idle: i18n.baseText("instanceAi.testAgentPreview.avatar.notRun"),
				waiting: i18n.baseText("instanceAi.testAgentPreview.avatar.notRun")
			}[props.kind];
		});
		const accessibleLabel = computed(() => props.label ? `${props.label} — ${statusLabel.value}` : statusLabel.value);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", {
				class: normalizeClass([
					_ctx.$style.avatar,
					_ctx.$style[__props.size],
					_ctx.$style[tone.value]
				]),
				"data-tone": tone.value,
				"data-waiting": __props.kind === "waiting" ? "" : void 0,
				"aria-label": accessibleLabel.value,
				title: accessibleLabel.value,
				role: "img"
			}, [createVNode(unref(N8nIcon_default), {
				class: normalizeClass(_ctx.$style.icon),
				icon: icon.value
			}, null, 8, ["class", "icon"]), __props.kind === "strong" ? (openBlock(), createElementBlock("span", {
				key: 0,
				class: normalizeClass(_ctx.$style.sparkle),
				"aria-hidden": "true"
			}, "✦", 2)) : createCommentVNode("", true)], 10, _hoisted_1$19);
		};
	}
}), [["__cssModules", { "$style": {
	avatar: "_avatar_1dv1y_1",
	icon: "_icon_1dv1y_16",
	xs: "_xs_1dv1y_22",
	row: "_row_1dv1y_26",
	sm: "_sm_1dv1y_30",
	md: "_md_1dv1y_34",
	lg: "_lg_1dv1y_38",
	good: "_good_1dv1y_42",
	warn: "_warn_1dv1y_48",
	bad: "_bad_1dv1y_54",
	none: "_none_1dv1y_60",
	neutral: "_neutral_1dv1y_66",
	sparkle: "_sparkle_1dv1y_71",
	"agent-avatar-bob": "_agent-avatar-bob_1dv1y_1",
	"agent-avatar-eyes-look": "_agent-avatar-eyes-look_1dv1y_1"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalAddCheckPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$18 = [
	"placeholder",
	"aria-label",
	"disabled",
	"onKeydown"
];
var PREPARED_COUNT = 10;
var COLLAPSED_ROW_COUNT$1 = 3;
var AgentEvalAddCheckPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalAddCheckPanel",
	props: {
		projectId: {},
		agentId: {},
		caseSource: {},
		disabled: { type: Boolean },
		busy: { type: Boolean }
	},
	emits: ["close", "added"],
	setup(__props, { emit: __emit }) {
		/**
		* The "Add a check" panel of the checks view. Two ways in: type a rule (a
		* test message is drafted for it), or pick one of a batch of prepared cases.
		* Either way the case is written to the run's dataset, and the parent is told
		* so it can run the checks again — a run only holds the cases it started with.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const store = useAgentEvalsStore();
		const ruleInput = ref("");
		const prepared = ref([]);
		const loadingPrepared = ref(false);
		const expanded = ref(false);
		const adding = ref(null);
		const canAdd = computed(() => !props.disabled && props.caseSource !== null && !props.busy && adding.value === null);
		const hasOverflow = computed(() => prepared.value.length > COLLAPSED_ROW_COUNT$1);
		const shownPrepared = computed(() => expanded.value || !hasOverflow.value ? prepared.value : prepared.value.slice(0, COLLAPSED_ROW_COUNT$1));
		const hiddenCount = computed(() => Math.max(0, prepared.value.length - COLLAPSED_ROW_COUNT$1));
		let isMounted = true;
		async function loadPrepared() {
			loadingPrepared.value = true;
			try {
				const result = await store.generateDraftCases(props.projectId, props.agentId, {
					count: PREPARED_COUNT,
					save: false
				});
				if (!isMounted) return;
				prepared.value = result.cases.map((draft, key) => ({
					...draft,
					key
				}));
			} catch (error) {
				if (!isMounted) return;
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.generateError"));
			} finally {
				if (isMounted) loadingPrepared.value = false;
			}
		}
		onMounted(loadPrepared);
		onBeforeUnmount(() => {
			isMounted = false;
		});
		/** Writes the case to the dataset, then tells the parent to run the checks again. */
		async function writeCase(value) {
			const source = props.caseSource;
			if (!source) return false;
			try {
				if (!await store.createCase(props.projectId, source, value)) throw new Error("The test case was not saved");
			} catch (error) {
				if (isMounted) toast.showError(error, i18n.baseText("agents.builder.agentEvals.case.addError"));
				return false;
			}
			emit("added");
			return true;
		}
		async function onAddRule() {
			const rule = ruleInput.value.trim();
			if (!rule || !canAdd.value) return;
			adding.value = "rule";
			try {
				let input;
				try {
					const draft = (await store.generateDraftCases(props.projectId, props.agentId, {
						count: 1,
						save: false,
						rule
					})).cases[0];
					if (!draft) throw new Error("No test message was generated");
					input = draft.input;
				} catch (error) {
					if (isMounted) toast.showError(error, i18n.baseText("agents.builder.agentEvals.generateError"));
					return;
				}
				if (!isMounted) return;
				if (await writeCase({
					input,
					whatToCheck: rule
				})) ruleInput.value = "";
			} finally {
				if (isMounted) adding.value = null;
			}
		}
		async function onAddPrepared(row) {
			if (!canAdd.value) return;
			adding.value = row.key;
			try {
				if (await writeCase({
					input: row.input,
					whatToCheck: row.whatToCheck
				}) && isMounted) prepared.value = prepared.value.filter((candidate) => candidate.key !== row.key);
			} finally {
				if (isMounted) adding.value = null;
			}
		}
		function toggleExpanded() {
			expanded.value = !expanded.value;
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.panel),
				"data-testid": "agent-eval-add-check"
			}, [
				createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
					tag: "h3",
					bold: "",
					size: "medium",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.checks.addCheck")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					"icon-only": "",
					"aria-label": unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckClose"),
					"data-testid": "agent-eval-add-check-close",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "x",
						size: "small"
					})]),
					_: 1
				}, 8, ["aria-label"])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.ruleRow) }, [withDirectives(createBaseVNode("input", {
					"onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => ruleInput.value = $event),
					class: normalizeClass(_ctx.$style.ruleInput),
					placeholder: unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckRulePlaceholder"),
					"aria-label": unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckRuleLabel"),
					disabled: __props.disabled || !__props.caseSource,
					"data-testid": "agent-eval-add-check-rule-input",
					onKeydown: withKeys(withModifiers(onAddRule, ["exact"]), ["enter"])
				}, null, 42, _hoisted_1$18), [[vModelText, ruleInput.value]]), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					disabled: !canAdd.value || !ruleInput.value.trim(),
					loading: adding.value === "rule",
					"data-testid": "agent-eval-add-check-rule-submit",
					onClick: onAddRule
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckSubmit")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])], 2),
				loadingPrepared.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.loading),
					"data-testid": "agent-eval-add-check-loading"
				}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createVNode(unref(N8nText_default), { color: "text-base" }, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckPreparing")), 1)]),
					_: 1
				})], 2)) : prepared.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.prepared),
					"data-testid": "agent-eval-add-check-prepared"
				}, [
					createVNode(unref(N8nText_default), {
						bold: "",
						color: "text-dark",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckPrepared")), 1)]),
						_: 1
					}),
					createBaseVNode("ul", { class: normalizeClass(_ctx.$style.list) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(shownPrepared.value, (row) => {
						return openBlock(), createElementBlock("li", {
							key: row.key,
							class: normalizeClass(_ctx.$style.row),
							"data-testid": "agent-eval-add-check-prepared-row"
						}, [
							createVNode(AgentAvatar_default, {
								kind: "idle",
								size: "md"
							}),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.rowText) }, [createVNode(unref(N8nText_default), {
								color: "text-light",
								size: "small"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(row.scenario), 1)]),
								_: 2
							}, 1024), createVNode(unref(N8nText_default), { color: "text-dark" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(row.input), 1)]),
								_: 2
							}, 1024)], 2),
							createVNode(unref(N8nButton_default), {
								variant: "outline",
								size: "small",
								disabled: !canAdd.value,
								loading: adding.value === row.key,
								"data-testid": "agent-eval-add-check-prepared-add",
								onClick: ($event) => onAddPrepared(row)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckSubmit")), 1)]),
								_: 1
							}, 8, [
								"disabled",
								"loading",
								"onClick"
							])
						], 2);
					}), 128))], 2),
					hasOverflow.value ? (openBlock(), createElementBlock("button", {
						key: 0,
						type: "button",
						class: normalizeClass(_ctx.$style.moreToggle),
						"data-testid": "agent-eval-add-check-more",
						onClick: toggleExpanded
					}, [createVNode(unref(N8nText_default), {
						color: "text-light",
						size: "small"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(expanded.value ? unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckFewer") : unref(i18n).baseText("agents.builder.agentEvals.checks.addCheckMore", { interpolate: { count: String(hiddenCount.value) } })), 1)]),
						_: 1
					})], 2)) : createCommentVNode("", true)
				], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_mjcab_1",
	header: "_header_mjcab_11",
	ruleRow: "_ruleRow_mjcab_18",
	ruleInput: "_ruleInput_mjcab_27",
	loading: "_loading_mjcab_43",
	prepared: "_prepared_mjcab_49",
	list: "_list_mjcab_55",
	row: "_row_mjcab_66",
	rowText: "_rowText_mjcab_78",
	moreToggle: "_moreToggle_mjcab_85"
} }]]);
//#endregion
//#region src/features/agents/composables/usePracticeRunBannerDismissal.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The "Practice run" reassurance banner shows under every expanded case
* sample. Dismissing it from any one row should hide it everywhere else too
* — a reviewer who already knows nothing is sent/saved/changed doesn't need
* to be told again on the next row they expand. `sessionStorage`-backed so it
* survives a reload but clears when the tab closes, matching "for that
* session".
*
* Storage is the source of truth, not a cached module-level flag: `dismissed`
* re-reads it on every access, gated by this module-level version counter
* (bumped on dismiss) so every row's own `computed` — across every mounted
* `AgentEvalTryRow` instance — invalidates and re-reads together.
*/
var STORAGE_KEY = "N8N_AGENT_EVAL_PRACTICE_BANNER_DISMISSED";
var version = ref(0);
function usePracticeRunBannerDismissal() {
	const dismissed = computed(() => {
		version.value;
		return sessionStorage.getItem(STORAGE_KEY) === "true";
	});
	function dismiss() {
		sessionStorage.setItem(STORAGE_KEY, "true");
		version.value++;
	}
	return {
		dismissed,
		dismiss
	};
}
//#endregion
//#region src/features/agents/components/AgentEvalSuggestionCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$17 = ["data-test-id"];
var AgentEvalSuggestionCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalSuggestionCard",
	props: {
		suggestion: {},
		applying: { type: Boolean },
		disabled: { type: Boolean },
		testId: {}
	},
	emits: ["apply", "dismiss"],
	setup(__props, { emit: __emit }) {
		/**
		* A fix the judge proposed for a failed check: one instruction to add to the
		* agent. "Apply suggestion" hands it to the parent, which rewrites the agent's
		* instructions and reruns the check. "Keep as is" only hides the card.
		*/
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.card),
				"data-test-id": __props.testId
			}, [
				createVNode(unref(N8nText_default), {
					bold: "",
					color: "text-dark",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.suggestion.title")), 1)]),
					_: 1
				}),
				createVNode(unref(N8nText_default), {
					color: "text-dark",
					size: "medium",
					class: normalizeClass(_ctx.$style.text)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.suggestion), 1)]),
					_: 1
				}, 8, ["class"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "small",
					disabled: __props.disabled,
					loading: __props.applying,
					"data-test-id": __props.testId && `${__props.testId}-apply`,
					onClick: _cache[0] || (_cache[0] = ($event) => emit("apply"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.suggestion.apply")), 1)]),
					_: 1
				}, 8, [
					"disabled",
					"loading",
					"data-test-id"
				]), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					disabled: __props.disabled || __props.applying,
					"data-test-id": __props.testId && `${__props.testId}-dismiss`,
					onClick: _cache[1] || (_cache[1] = ($event) => emit("dismiss"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.suggestion.keep")), 1)]),
					_: 1
				}, 8, ["disabled", "data-test-id"])], 2)
			], 10, _hoisted_1$17);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_r5w5w_1",
	text: "_text_r5w5w_11",
	actions: "_actions_r5w5w_16"
} }]]);
//#endregion
//#region src/features/agents/components/ChatBubble.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ChatBubble_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ChatBubble",
	props: {
		text: {},
		position: {}
	},
	setup(__props) {
		const props = __props;
		const positionStyle = computed(() => props.position === "left" ? "border-bottom-left-radius: 0px" : "border-bottom-right-radius: 0px");
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.root),
				style: normalizeStyle(positionStyle.value)
			}, [createVNode(unref(N8nText_default), { color: "text-dark" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(__props.text) + " ", 1), renderSlot(_ctx.$slots, "default")]),
				_: 3
			})], 6);
		};
	}
}), [["__cssModules", { "$style": { root: "_root_v80w3_1" } }]]);
//#endregion
//#region src/features/agents/components/AgentAnswerCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var AgentAnswerCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentAnswerCard",
	props: {
		answeredAt: {},
		source: {},
		status: {}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.root) }, [createVNode(AgentAvatar_default, {
				kind: __props.status ?? "idle",
				size: "sm"
			}, null, 8, ["kind"]), createVNode(ChatBubble_default, {
				class: normalizeClass(_ctx.$style.content),
				position: "left"
			}, {
				default: withCtx(() => [createVNode(AgentMarkdownChunk_default, { source: __props.source }, null, 8, ["source"])]),
				_: 1
			}, 8, ["class"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_1qaer_1",
	content: "_content_1qaer_8"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalToolCalls.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var AgentEvalToolCalls_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalToolCalls",
	props: {
		toolCalls: {},
		projectId: {}
	},
	setup(__props) {
		/**
		* The tool-call disclosure on a reviewed case.
		*
		* Wraps the chat's own renderer rather than reimplementing it, adapting the
		* persisted blob on the way in. `executionId` and `canFixWithAssistant` are
		* deliberately left unset: an eval result has no execution to fix from, and
		* without them the "Fix with assistant" callout is unreachable.
		*/
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.toolCalls),
				"data-testid": "agent-eval-tool-calls"
			}, [createVNode(AgentChatToolSteps_default, {
				"tool-calls": __props.toolCalls,
				"project-id": __props.projectId
			}, null, 8, ["tool-calls", "project-id"])], 2);
		};
	}
}), [["__cssModules", { "$style": { toolCalls: "_toolCalls_7ue9k_3" } }]]);
//#endregion
//#region src/features/agents/components/EvalInitialSample.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var EvalInitialSample_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "EvalInitialSample",
	props: {
		previewInput: {},
		previewOutput: {},
		errorMessage: {},
		status: {},
		toolCalls: {},
		projectId: {},
		hideBanner: { type: Boolean },
		joinedBelow: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const isFailing = computed(() => props.status === "work" || props.status === "fail");
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass([_ctx.$style.evalPreview, { [_ctx.$style.joinedBelow]: __props.joinedBelow }]) }, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.evalPreviewUserMessage) }, [createVNode(ChatBubble_default, {
					text: __props.previewInput,
					status: __props.status
				}, null, 8, ["text", "status"])], 2),
				__props.toolCalls && __props.toolCalls.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.tools)
				}, [createVNode(AgentEvalToolCalls_default, {
					"tool-calls": __props.toolCalls,
					"project-id": __props.projectId
				}, null, 8, ["tool-calls", "project-id"])], 2)) : createCommentVNode("", true),
				createVNode(AgentAnswerCard_default, {
					"data-test-id": "instance-ai-test-agent-preview-output",
					source: __props.previewOutput,
					status: __props.status
				}, null, 8, ["source", "status"]),
				__props.previewOutput && !__props.hideBanner && __props.status !== "waiting" ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.callout)
				}, [createVNode(unref(N8nCallout_default), {
					theme: isFailing.value ? "secondary" : "success",
					iconless: ""
				}, {
					default: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText(isFailing.value ? "agents.builder.agentEvals.checks.status.breaksRule" : "agents.builder.agentEvals.checks.status.followsRule")), 1), createTextVNode(" " + toDisplayString(isFailing.value ? __props.errorMessage : ""), 1)]),
					_: 1
				}, 8, ["theme"])], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	evalPreview: "_evalPreview_pz96z_1",
	evalPreviewUserMessage: "_evalPreviewUserMessage_pz96z_11",
	joinedBelow: "_joinedBelow_pz96z_17",
	tools: "_tools_pz96z_22",
	callout: "_callout_pz96z_26"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalTryRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$16 = ["data-test-id"];
var _hoisted_2$5 = { key: 1 };
var _hoisted_3$1 = ["data-test-id"];
var _hoisted_4$1 = ["data-test-id"];
var _hoisted_5 = ["data-test-id"];
var AgentEvalTryRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalTryRow",
	props: {
		status: {},
		input: {},
		output: {},
		label: {},
		testId: {},
		date: {},
		savingCheck: { type: Boolean },
		runningCheck: { type: Boolean },
		view: {},
		errorMessage: {},
		toolCalls: {},
		projectId: {},
		whatToCheck: {},
		disabled: { type: Boolean },
		hideRevise: { type: Boolean },
		focused: { type: Boolean },
		fixSuggestion: {},
		applyingSuggestion: { type: Boolean }
	},
	emits: [
		"save-check",
		"actually-fine",
		"rerun-check",
		"save-what-to-check",
		"delete-check",
		"apply-suggestion",
		"open"
	],
	setup(__props, { emit: __emit }) {
		/**
		* One eval case as a single row: a status avatar, the request text, and —
		* once it has run, or it needs correction — a chevron. In the complete view
		* the chevron expands the full input/output sample in place. In the small view
		* it is a right chevron that emits `open` instead, so the parent can open the
		* complete view on this case. A case with no output and nothing to correct has
		* nothing to open, so the chevron is hidden; an idle (never-run) case says so
		* in its place. A "needs work" or "couldn't finish" case still opens with no
		* output, to reach the correction form.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const { dismissed: practiceBannerDismissed, dismiss: dismissPracticeBanner } = usePracticeRunBannerDismissal();
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const expanded = ref(false);
		const suggestion = ref("");
		const root = ref(null);
		const needsCorrection = computed(() => props.status === "work" || props.status === "fail");
		const suggestionDismissed = ref(false);
		watch(() => props.fixSuggestion, () => {
			suggestionDismissed.value = false;
		});
		const showFixSuggestion = computed(() => props.view === "complete" && needsCorrection.value && Boolean(props.fixSuggestion?.trim()) && !suggestionDismissed.value);
		const canExpand = computed(() => props.output !== null || needsCorrection.value);
		const STATUS_TEXT = {
			pass: {
				labelKey: "agents.builder.agentEvals.checks.status.passes",
				color: "success"
			},
			strong: {
				labelKey: "agents.builder.agentEvals.checks.status.passes",
				color: "success"
			},
			waiting: {
				labelKey: "agents.builder.agentEvals.checks.status.running",
				color: "text-light"
			},
			idle: {
				labelKey: "agents.builder.agentEvals.checks.status.neverRan",
				color: "text-light"
			},
			work: {
				labelKey: "agents.builder.agentEvals.checks.status.needsWork",
				warning: true
			},
			fail: {
				labelKey: "agents.builder.agentEvals.checks.status.needsWork",
				color: "danger"
			}
		};
		const statusText = computed(() => i18n.baseText(STATUS_TEXT[props.status].labelKey));
		const statusColor = computed(() => STATUS_TEXT[props.status].color);
		const statusIsWarning = computed(() => STATUS_TEXT[props.status].warning === true);
		function toggleExpanded() {
			if (!canExpand.value) return;
			expanded.value = !expanded.value;
		}
		function onOpen() {
			if (!canExpand.value) return;
			emit("open");
		}
		watch(() => [props.focused, canExpand.value], async ([focused, expandable]) => {
			if (!focused || !expandable) return;
			expanded.value = true;
			await nextTick();
			root.value?.scrollIntoView?.({
				block: "center",
				behavior: "smooth"
			});
		}, { immediate: true });
		function onSaveCheck() {
			const value = suggestion.value.trim();
			if (!value) return;
			emit("save-check", value);
		}
		function onActuallyFine() {
			emit("actually-fine");
		}
		function onRunCheck() {
			emit("rerun-check");
		}
		const editingWhatToCheck = ref(false);
		const whatToCheckDraft = ref("");
		function onStartEditWhatToCheck() {
			whatToCheckDraft.value = props.whatToCheck ?? "";
			editingWhatToCheck.value = true;
		}
		function onSaveWhatToCheck() {
			const value = whatToCheckDraft.value.trim();
			if (!value) return;
			emit("save-what-to-check", value);
			editingWhatToCheck.value = false;
		}
		function onCancelEditWhatToCheck() {
			editingWhatToCheck.value = false;
		}
		async function onDeleteCheck() {
			if (await openAgentConfirmationModal({
				title: i18n.baseText("instanceAi.testAgentPreview.deleteCheck.confirm.title", { interpolate: { title: props.input } }),
				description: i18n.baseText("instanceAi.testAgentPreview.deleteCheck.confirm.description"),
				confirmButtonText: i18n.baseText("instanceAi.testAgentPreview.deleteCheck.confirm.confirmButton"),
				cancelButtonText: i18n.baseText("instanceAi.testAgentPreview.deleteCheck.confirm.cancelButton")
			}) !== "confirm") return;
			emit("delete-check");
		}
		watch(() => props.status, (status) => {
			if (status !== "work" && status !== "fail") suggestion.value = "";
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "root",
				ref: root,
				class: normalizeClass(_ctx.$style.root),
				"data-test-id": __props.testId
			}, [__props.view === "complete" ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.header),
				onClick: toggleExpanded
			}, [
				createVNode(AgentAvatar_default, {
					kind: __props.status,
					size: "md"
				}, null, 8, ["kind"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerTitle) }, [createVNode(unref(N8nText_default), {
					color: "text-dark",
					size: "medium",
					bold: "",
					class: normalizeClass(_ctx.$style.headerTitleText)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.input), 1)]),
					_: 1
				}, 8, ["class"]), createVNode(unref(N8nText_default), {
					color: statusColor.value,
					class: normalizeClass({ [_ctx.$style.statusWarning]: statusIsWarning.value }),
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(statusText.value), 1)]),
					_: 1
				}, 8, ["color", "class"])], 2),
				createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small"
				}, {
					default: withCtx(() => [__props.date ? (openBlock(), createBlock(unref(N8nTimeAgo_default), {
						key: 0,
						date: __props.date
					}, null, 8, ["date"])) : __props.status === "idle" ? (openBlock(), createElementBlock("span", _hoisted_2$5, toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.avatar.notRun")), 1)) : createCommentVNode("", true)]),
					_: 1
				}),
				canExpand.value ? (openBlock(), createElementBlock("button", {
					key: 0,
					type: "button",
					class: normalizeClass(_ctx.$style.expandToggle),
					"data-test-id": __props.testId && `${__props.testId}-toggle`
				}, [createVNode(unref(N8nIcon_default), {
					icon: expanded.value ? "chevron-up" : "chevron-down",
					size: "small"
				}, null, 8, ["icon"])], 10, _hoisted_3$1)) : createCommentVNode("", true)
			], 2)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.header),
				onClick: onOpen
			}, [
				createVNode(AgentAvatar_default, {
					kind: __props.status,
					size: "xs"
				}, null, 8, ["kind"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerTitle) }, [__props.label ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-light",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.label), 1)]),
					_: 1
				})) : createCommentVNode("", true), createVNode(unref(N8nText_default), {
					color: "text-dark",
					class: normalizeClass(_ctx.$style.inputText),
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.input), 1)]),
					_: 1
				}, 8, ["class"])], 2),
				canExpand.value ? (openBlock(), createElementBlock("button", {
					key: 0,
					type: "button",
					class: normalizeClass(_ctx.$style.expandToggle),
					"data-test-id": __props.testId && `${__props.testId}-toggle`
				}, [createVNode(unref(N8nIcon_default), {
					icon: "chevron-right",
					size: "small"
				})], 10, _hoisted_4$1)) : createCommentVNode("", true)
			], 2)), expanded.value && canExpand.value ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.sample),
				"data-test-id": __props.testId && `${__props.testId}-placeholder`
			}, [
				__props.whatToCheck ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.whatToCheck)
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.whatToCheckBody) }, [createVNode(unref(N8nText_default), {
					bold: "",
					color: "text-dark",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.rule")), 1)]),
					_: 1
				}), !editingWhatToCheck.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-dark",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(__props.whatToCheck), 1)]),
					_: 1
				})) : (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.whatToCheckEdit)
				}, [
					createVNode(unref(Input_default), {
						modelValue: whatToCheckDraft.value,
						"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => whatToCheckDraft.value = $event),
						size: "medium",
						"data-test-id": __props.testId && `${__props.testId}-rule-input`,
						onKeydown: [
							withKeys(withModifiers(onSaveWhatToCheck, ["meta"]), ["enter"]),
							withKeys(withModifiers(onSaveWhatToCheck, ["ctrl"]), ["enter"]),
							withKeys(onCancelEditWhatToCheck, ["esc"])
						]
					}, null, 8, [
						"modelValue",
						"data-test-id",
						"onKeydown"
					]),
					createVNode(unref(N8nButton_default), {
						variant: "solid",
						size: "small",
						disabled: !whatToCheckDraft.value.trim(),
						"data-test-id": __props.testId && `${__props.testId}-rule-save`,
						onClick: onSaveWhatToCheck
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.save")), 1)]),
						_: 1
					}, 8, ["disabled", "data-test-id"]),
					createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						"data-test-id": __props.testId && `${__props.testId}-rule-cancel`,
						onClick: onCancelEditWhatToCheck
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
						_: 1
					}, 8, ["data-test-id"])
				], 2))], 2), !editingWhatToCheck.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "outline",
					size: "small",
					"icon-only": "",
					disabled: __props.disabled || __props.runningCheck,
					"aria-label": unref(i18n).baseText("instanceAi.testAgentPreview.editRule"),
					"data-test-id": __props.testId && `${__props.testId}-edit-rule`,
					onClick: onStartEditWhatToCheck
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "pencil",
						size: "small"
					})]),
					_: 1
				}, 8, [
					"disabled",
					"aria-label",
					"data-test-id"
				])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true),
				createVNode(unref(N8nText_default), {
					bold: "",
					color: "text-dark",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.conversation")), 1)]),
					_: 1
				}),
				createBaseVNode("div", null, [createVNode(EvalInitialSample_default, {
					"preview-input": __props.input,
					"preview-output": __props.output ?? "",
					"error-message": __props.errorMessage ?? void 0,
					status: __props.status,
					"tool-calls": __props.toolCalls,
					"project-id": __props.projectId,
					"joined-below": !unref(practiceBannerDismissed)
				}, null, 8, [
					"preview-input",
					"preview-output",
					"error-message",
					"status",
					"tool-calls",
					"project-id",
					"joined-below"
				]), !unref(practiceBannerDismissed) ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.practiceBanner)
				}, [createVNode(unref(N8nText_default), { size: "small" }, {
					default: withCtx(() => [createBaseVNode("strong", null, toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.practiceRunTitle")) + ". ", 1), createTextVNode(" " + toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.practiceRunDescription")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "xsmall",
					"data-test-id": __props.testId && `${__props.testId}-practice-banner-dismiss`,
					onClick: unref(dismissPracticeBanner)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.gotIt")), 1)]),
					_: 1
				}, 8, ["data-test-id", "onClick"])], 2)) : createCommentVNode("", true)]),
				needsCorrection.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [showFixSuggestion.value && __props.fixSuggestion ? (openBlock(), createBlock(AgentEvalSuggestionCard_default, {
					key: 0,
					class: normalizeClass(_ctx.$style.fixSuggestion),
					suggestion: __props.fixSuggestion,
					applying: __props.applyingSuggestion,
					disabled: __props.disabled,
					"test-id": __props.testId && `${__props.testId}-suggestion-card`,
					onApply: _cache[1] || (_cache[1] = ($event) => emit("apply-suggestion")),
					onDismiss: _cache[2] || (_cache[2] = ($event) => suggestionDismissed.value = true)
				}, null, 8, [
					"class",
					"suggestion",
					"applying",
					"disabled",
					"test-id"
				])) : createCommentVNode("", true), !__props.hideRevise ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nText_default), {
					bold: "",
					color: "text-dark",
					class: normalizeClass(_ctx.$style.correctionHint)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.inputCorrectionHint")), 1)]),
					_: 1
				}, 8, ["class"]), createVNode(unref(Input_default), {
					modelValue: suggestion.value,
					"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => suggestion.value = $event),
					type: "textarea",
					autosize: {
						minRows: 2,
						maxRows: 6
					},
					disabled: __props.disabled,
					placeholder: unref(i18n).baseText("instanceAi.testAgentPreview.inputCorrectionPlaceholder"),
					"data-test-id": __props.testId && `${__props.testId}-suggestion`,
					onKeydown: [withKeys(withModifiers(onSaveCheck, ["meta"]), ["enter"]), withKeys(withModifiers(onSaveCheck, ["ctrl"]), ["enter"])]
				}, null, 8, [
					"modelValue",
					"disabled",
					"placeholder",
					"data-test-id",
					"onKeydown"
				])], 64)) : createCommentVNode("", true)], 64)) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.correctionActions) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.primaryActions) }, [needsCorrection.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [!__props.hideRevise ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "solid",
					size: "small",
					disabled: __props.disabled || !suggestion.value.trim(),
					loading: __props.savingCheck,
					"data-test-id": __props.testId && `${__props.testId}-save-check`,
					onClick: onSaveCheck
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.saveCorrection")), 1)]),
					_: 1
				}, 8, [
					"disabled",
					"loading",
					"data-test-id"
				])) : createCommentVNode("", true), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "small",
					disabled: __props.disabled || __props.savingCheck,
					"data-test-id": __props.testId && `${__props.testId}-actually-fine`,
					onClick: onActuallyFine
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.actuallyFine")), 1)]),
					_: 1
				}, 8, ["disabled", "data-test-id"])], 64)) : (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					size: "small",
					variant: "outline",
					disabled: __props.disabled,
					loading: __props.runningCheck,
					"data-test-id": __props.testId && `${__props.testId}-run-check`,
					onClick: onRunCheck
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.runCheck")), 1)]),
					_: 1
				}, 8, [
					"disabled",
					"loading",
					"data-test-id"
				]))], 2), createVNode(unref(N8nTooltip_default), {
					content: unref(i18n).baseText("instanceAi.testAgentPreview.deleteCheck.label"),
					placement: "top-end"
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "medium",
						"icon-only": "",
						disabled: __props.disabled,
						"aria-label": unref(i18n).baseText("instanceAi.testAgentPreview.deleteCheck.label"),
						"data-test-id": __props.testId && `${__props.testId}-delete-check`,
						onClick: onDeleteCheck
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "trash-2",
							size: "small"
						})]),
						_: 1
					}, 8, [
						"disabled",
						"aria-label",
						"data-test-id"
					])]),
					_: 1
				}, 8, ["content"])], 2)
			], 10, _hoisted_5)) : createCommentVNode("", true)], 10, _hoisted_1$16);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_uvhlt_1",
	headerTitle: "_headerTitle_uvhlt_8",
	statusWarning: "_statusWarning_uvhlt_16",
	headerTitleText: "_headerTitleText_uvhlt_20",
	inputText: "_inputText_uvhlt_27",
	whatToCheck: "_whatToCheck_uvhlt_34",
	whatToCheckBody: "_whatToCheckBody_uvhlt_42",
	whatToCheckEdit: "_whatToCheckEdit_uvhlt_49",
	expandToggle: "_expandToggle_uvhlt_59",
	sample: "_sample_uvhlt_70",
	correctionHint: "_correctionHint_uvhlt_76",
	fixSuggestion: "_fixSuggestion_uvhlt_82",
	correctionActions: "_correctionActions_uvhlt_86",
	primaryActions: "_primaryActions_uvhlt_93",
	practiceBanner: "_practiceBanner_uvhlt_99"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalChecksPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$15 = ["data-testid"];
var AgentEvalChecksPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalChecksPanel",
	props: {
		projectId: {},
		agentId: {},
		runId: {},
		disabled: { type: Boolean },
		rerunning: { type: Boolean }
	},
	emits: ["rerun"],
	setup(__props, { emit: __emit }) {
		/**
		* The checks-have-run view behind `useTestAgentPreviewFlag`: status
		* filter segment control plus "Add a check" and "Run all checks" buttons up top, then each case as an
		* `AgentEvalTryRow` — replaces `AgentEvalResultsPanel`'s vote/comment review
		* model with the simpler row the rest of the preview flow already uses.
		*
		* Rows have no scenario tag here — a run's result only ever carries
		* `input`/`output`/`status` (the Data Table has no column for it), so this
		* never passes `label` to `AgentEvalTryRow`.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const store = useAgentEvalsStore();
		const review = computed(() => store.getReview(props.runId));
		const results = computed(() => review.value.results);
		const hasMore = computed(() => results.value.length < review.value.resultsCount);
		const shownReview = ref(review.value);
		const shownRunId = ref(props.runId);
		watch(review, (next) => {
			if (next.run !== null || next.results.length > 0) {
				shownReview.value = next;
				shownRunId.value = props.runId;
			}
		});
		const showingPreviousRun = computed(() => shownRunId.value !== props.runId);
		const inFlight = computed(() => store.isRunInFlight(props.runId));
		const rows = computed(() => shownReview.value.results.map((result) => {
			return {
				id: result.id,
				sourceRowId: result.sourceRowId,
				status: toAvatarKind(result.status, result.verdict),
				input: readCaseRequest(result.input),
				output: readAgentAnswer(result.output),
				runAt: result.runAt,
				errorMessage: readErrorMessage(result.errorDetails) ?? readVerdictReasoning(result.verdict),
				toolCalls: toDisplayToolCalls(result.toolCalls),
				whatToCheck: readCaseWhatToCheck(result.input),
				fixSuggestion: readVerdictSuggestion(result.verdict)
			};
		}));
		const passedCount = computed(() => rows.value.filter((row) => row.status === "pass").length);
		const needsWorkCount = computed(() => rows.value.filter((row) => row.status === "work" || row.status === "fail").length);
		const statusFilter = ref("all");
		/** No avatar for "All" — it isn't one of `AgentAvatar`'s statuses. */
		const STATUS_FILTER_AVATARS = {
			"needs-work": "work",
			pass: "pass",
			all: void 0
		};
		const statusFilterOptions = computed(() => [
			{
				key: "needs-work",
				count: needsWorkCount.value,
				labelKey: "agents.builder.agentEvals.checks.needsWork"
			},
			{
				key: "pass",
				count: passedCount.value,
				labelKey: "agents.builder.agentEvals.checks.pass"
			},
			{
				key: "all",
				count: rows.value.length,
				labelKey: "agents.builder.agentEvals.checks.all",
				alwaysShown: true
			}
		]);
		const visibleStatusFilters = computed(() => statusFilterOptions.value.filter((option) => option.alwaysShown || option.count > 0));
		const statusFilterSegments = computed(() => visibleStatusFilters.value.map((option) => ({
			value: option.key,
			label: i18n.baseText(option.labelKey, {
				adjustToNumber: option.count,
				interpolate: { count: String(option.count) }
			})
		})));
		const STATUS_RANK = {
			work: 0,
			fail: 0,
			waiting: 1,
			idle: 1,
			pass: 2,
			strong: 2
		};
		const sortedRows = computed(() => [...rows.value].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]));
		const filteredRows = computed(() => {
			if (statusFilter.value === "pass") return sortedRows.value.filter((row) => row.status === "pass");
			if (statusFilter.value === "needs-work") return sortedRows.value.filter((row) => row.status === "work" || row.status === "fail");
			return sortedRows.value;
		});
		watch([needsWorkCount, passedCount], ([needsWork, passed]) => {
			if (statusFilter.value === "needs-work" && needsWork === 0) statusFilter.value = "all";
			if (statusFilter.value === "pass" && passed === 0) statusFilter.value = "all";
		});
		function setStatusFilter(filter) {
			statusFilter.value = filter;
		}
		const focusedResultId = ref(null);
		watch(() => store.focusedEvalResult, () => {
			const resultId = store.consumeFocusedEvalResult(props.agentId);
			if (!resultId) return;
			statusFilter.value = "all";
			focusedResultId.value = resultId;
		}, { immediate: true });
		async function onActuallyFine(resultId) {
			try {
				await store.acceptResult(props.projectId, props.agentId, resultId);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.acceptCaseError"));
			}
		}
		async function onRerunCheck(resultId) {
			try {
				await store.rerunResult(props.projectId, props.agentId, resultId);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.rerunCaseError"));
			}
		}
		const { applyingIds: applyingSuggestionIds, applySuggestions } = useApplyAgentEvalSuggestions(() => ({
			projectId: props.projectId,
			agentId: props.agentId
		}));
		const applyingAll = ref(false);
		const applicableSuggestionIds = computed(() => rows.value.filter((row) => row.fixSuggestion !== null && row.status !== "waiting").map((row) => row.id));
		const isApplyingSuggestions = computed(() => applyingSuggestionIds.value.length > 0);
		async function onApplySuggestion(resultId) {
			await applySuggestions([resultId]);
		}
		async function onApplyAllSuggestions() {
			applyingAll.value = true;
			try {
				await applySuggestions(applicableSuggestionIds.value);
			} finally {
				applyingAll.value = false;
			}
		}
		async function onSaveWhatToCheck(resultId, whatToCheck) {
			const sourceRowId = rows.value.find((row) => row.id === resultId)?.sourceRowId;
			const rowId = sourceRowId ? Number(sourceRowId) : NaN;
			const source = addCheckSource.value;
			if (source && Number.isInteger(rowId)) try {
				if (!await store.updateCaseRule(props.projectId, source, rowId, whatToCheck)) throw new Error("The check was not saved");
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.case.saveError"));
				return;
			}
			try {
				await store.rerunResult(props.projectId, props.agentId, resultId, { whatToCheck });
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.rerunCaseError"));
			}
		}
		/** Resolves the run's own dataset into a writable case source — the only
		*  path "delete the check" has to the Data Table row, since this view never
		*  loads a case list of its own. */
		function resolveCaseSource() {
			const datasetId = shownReview.value.run?.datasetId;
			if (!datasetId) return null;
			const dataset = store.getDatasets(props.agentId).find((d) => d.id === datasetId);
			return dataset && isDataTableDataset(dataset) ? toCaseSource(dataset) : null;
		}
		const addCheckSource = computed(() => {
			const source = resolveCaseSource();
			return source?.columns.whatToCheck ? source : null;
		});
		const addCheckOpen = ref(false);
		const addCheckMounted = ref(false);
		function toggleAddCheck() {
			addCheckMounted.value = true;
			addCheckOpen.value = !addCheckOpen.value;
		}
		async function onDeleteCheck(row) {
			const source = resolveCaseSource();
			if (!source || !row.sourceRowId) {
				toast.showError(/* @__PURE__ */ new Error("Could not resolve this check’s dataset row"), i18n.baseText("agents.builder.agentEvals.case.removeError"));
				return;
			}
			try {
				if (!await store.deleteCase(props.projectId, source, Number(row.sourceRowId))) {
					toast.showError(/* @__PURE__ */ new Error("Failed to remove the test case"), i18n.baseText("agents.builder.agentEvals.case.removeError"));
					return;
				}
				await store.deleteResult(props.projectId, props.agentId, row.id);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.case.removeError"));
			}
		}
		let loadGeneration = 0;
		let openedGeneration = 0;
		const load = async () => {
			const generation = ++loadGeneration;
			store.stopPollingRun();
			try {
				await store.openRun(props.projectId, props.agentId, props.runId);
				if (generation !== loadGeneration) return;
				openedGeneration = generation;
				if (store.isRunInFlight(props.runId)) store.startPollingRun(props.projectId, props.agentId, props.runId);
				else await loadRemainingResults(generation);
			} catch (error) {
				if (generation !== loadGeneration) return;
				shownReview.value = review.value;
				shownRunId.value = props.runId;
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.loadError"));
			}
		};
		const onLoadMore = async () => {
			try {
				await store.loadMoreResults(props.projectId, props.agentId, props.runId);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.loadError"));
			}
		};
		let activeGeneration = null;
		const loadRemainingResults = async (generation) => {
			if (activeGeneration !== null) return;
			activeGeneration = generation;
			try {
				let loadedCount = results.value.length;
				while (generation === loadGeneration && !inFlight.value && hasMore.value) {
					await store.loadMoreResults(props.projectId, props.agentId, props.runId);
					if (generation !== loadGeneration) break;
					if (results.value.length === loadedCount) break;
					loadedCount = results.value.length;
				}
			} catch (error) {
				if (generation === loadGeneration) toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.loadError"));
			} finally {
				activeGeneration = null;
				if (generation !== loadGeneration && openedGeneration === loadGeneration && !inFlight.value && hasMore.value) loadRemainingResults(loadGeneration);
			}
		};
		onMounted(load);
		watch(() => props.runId, load);
		watch(inFlight, (isInFlight, wasInFlight) => {
			if (wasInFlight && !isInFlight && openedGeneration === loadGeneration) loadRemainingResults(loadGeneration);
		});
		onBeforeUnmount(store.stopPollingRun);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.panel),
				"data-testid": "agent-eval-checks-panel"
			}, [
				createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [rows.value.length > 0 ? (openBlock(), createBlock(unref(N8nSegmentControl_default), {
					key: 0,
					"model-value": statusFilter.value,
					options: statusFilterSegments.value,
					"onUpdate:modelValue": setStatusFilter
				}, {
					option: withCtx(({ value, label }) => [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.filterOption),
						"data-testid": `agent-eval-checks-filter-${value}`
					}, [STATUS_FILTER_AVATARS[value] ? (openBlock(), createBlock(AgentAvatar_default, {
						key: 0,
						kind: STATUS_FILTER_AVATARS[value],
						size: "xs",
						class: normalizeClass(_ctx.$style.filterAvatar)
					}, null, 8, ["kind", "class"])) : createCommentVNode("", true), createTextVNode(" " + toDisplayString(label), 1)], 10, _hoisted_1$15)]),
					_: 1
				}, 8, ["model-value", "options"])) : createCommentVNode("", true), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [applicableSuggestionIds.value.length > 0 && !showingPreviousRun.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 0,
					variant: "solid",
					size: "small",
					disabled: __props.disabled || __props.rerunning || inFlight.value || isApplyingSuggestions.value,
					loading: applyingAll.value,
					"data-testid": "agent-eval-checks-apply-all-suggestions",
					onClick: onApplyAllSuggestions
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.suggestion.applyAll")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])) : createCommentVNode("", true), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					disabled: __props.disabled || __props.rerunning,
					loading: __props.rerunning || inFlight.value,
					"data-testid": "agent-eval-checks-run-all",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("rerun"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.checks.runAll")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])], 2)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.list) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(filteredRows.value, (row) => {
					return openBlock(), createBlock(AgentEvalTryRow_default, {
						key: row.id,
						status: row.status,
						input: row.input,
						output: row.output,
						date: row.runAt,
						"error-message": row.errorMessage,
						"tool-calls": row.toolCalls,
						"project-id": __props.projectId,
						"what-to-check": row.whatToCheck,
						"fix-suggestion": row.fixSuggestion,
						"applying-suggestion": unref(applyingSuggestionIds).includes(row.id),
						disabled: __props.disabled || showingPreviousRun.value || isApplyingSuggestions.value,
						"running-check": row.status === "waiting",
						"hide-revise": "",
						view: "complete",
						focused: row.id === focusedResultId.value,
						"test-id": `agent-eval-check-${row.id}`,
						onActuallyFine: ($event) => onActuallyFine(row.id),
						onRerunCheck: ($event) => onRerunCheck(row.id),
						onApplySuggestion: ($event) => onApplySuggestion(row.id),
						onSaveWhatToCheck: ($event) => onSaveWhatToCheck(row.id, $event),
						onDeleteCheck: ($event) => onDeleteCheck(row)
					}, null, 8, [
						"status",
						"input",
						"output",
						"date",
						"error-message",
						"tool-calls",
						"project-id",
						"what-to-check",
						"fix-suggestion",
						"applying-suggestion",
						"disabled",
						"running-check",
						"focused",
						"test-id",
						"onActuallyFine",
						"onRerunCheck",
						"onApplySuggestion",
						"onSaveWhatToCheck",
						"onDeleteCheck"
					]);
				}), 128))], 2),
				addCheckMounted.value ? withDirectives((openBlock(), createBlock(AgentEvalAddCheckPanel_default, {
					key: 0,
					"project-id": __props.projectId,
					"agent-id": __props.agentId,
					"case-source": addCheckSource.value,
					disabled: __props.disabled || showingPreviousRun.value,
					busy: __props.rerunning || inFlight.value,
					onClose: _cache[1] || (_cache[1] = ($event) => addCheckOpen.value = false),
					onAdded: _cache[2] || (_cache[2] = ($event) => emit("rerun"))
				}, null, 8, [
					"project-id",
					"agent-id",
					"case-source",
					"disabled",
					"busy"
				])), [[vShow, addCheckOpen.value]]) : createCommentVNode("", true),
				addCheckSource.value && !addCheckOpen.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					variant: "ghost",
					size: "small",
					disabled: __props.disabled,
					"data-testid": "agent-eval-checks-add-check",
					onClick: toggleAddCheck
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "plus",
						size: "small"
					})]),
					default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.checks.addCheck")), 1)]),
					_: 1
				}, 8, ["disabled"])) : createCommentVNode("", true),
				hasMore.value ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.loadMore)
				}, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					loading: review.value.loadingMore,
					onClick: onLoadMore
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.loadMore")), 1)]),
					_: 1
				}, 8, ["loading"])], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_1p1m1_1",
	header: "_header_1p1m1_8",
	filterOption: "_filterOption_1p1m1_15",
	filterAvatar: "_filterAvatar_1p1m1_22",
	actions: "_actions_1p1m1_26",
	list: "_list_1p1m1_32",
	loadMore: "_loadMore_1p1m1_64"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalVoteButtons.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentEvalVoteButtons_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalVoteButtons",
	props: {
		vote: {},
		disabled: { type: Boolean },
		disabledReason: {}
	},
	emits: ["vote"],
	setup(__props, { emit: __emit }) {
		/**
		* The 👍/👎 pair on a reviewed case. Purely a control: it reports the vote and
		* reflects the current one, and knows nothing about reasons or persistence.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const labelFor = (vote) => props.disabled && props.disabledReason ? props.disabledReason : i18n.baseText(vote === "up" ? "agents.builder.agentEvals.review.row.thumbsUp" : "agents.builder.agentEvals.review.row.thumbsDown");
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.votes) }, [createVNode(unref(N8nTooltip_default), {
				content: labelFor("up"),
				placement: "top"
			}, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					icon: "thumbs-up",
					size: "small",
					variant: "outline",
					class: normalizeClass({ [_ctx.$style.selectedUp]: __props.vote === "up" }),
					disabled: __props.disabled,
					"aria-label": labelFor("up"),
					"aria-pressed": __props.vote === "up",
					"data-testid": "agent-eval-vote-up",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("vote", "up"))
				}, null, 8, [
					"class",
					"disabled",
					"aria-label",
					"aria-pressed"
				])]),
				_: 1
			}, 8, ["content"]), createVNode(unref(N8nTooltip_default), {
				content: labelFor("down"),
				placement: "top"
			}, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					icon: "thumbs-down",
					size: "small",
					variant: "outline",
					class: normalizeClass({ [_ctx.$style.selectedDown]: __props.vote === "down" }),
					disabled: __props.disabled,
					"aria-label": labelFor("down"),
					"aria-pressed": __props.vote === "down",
					"data-testid": "agent-eval-vote-down",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("vote", "down"))
				}, null, 8, [
					"class",
					"disabled",
					"aria-label",
					"aria-pressed"
				])]),
				_: 1
			}, 8, ["content"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	votes: "_votes_konl3_1",
	selectedUp: "_selectedUp_konl3_17",
	selectedDown: "_selectedDown_konl3_21"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalResultRow.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var AgentEvalResultRow_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalResultRow",
	props: {
		result: {},
		view: {},
		disabled: { type: Boolean },
		projectId: {}
	},
	emits: [
		"vote",
		"update:comment",
		"update:correction",
		"edit-answer",
		"edit-note",
		"save",
		"cancel"
	],
	setup(__props, { emit: __emit }) {
		/**
		* One reviewed case: the request, the agent's answer, the vote, and — on
		* disagreement — the reason and the edited answer.
		*
		* Presentational. It reports intent and reflects the view it is handed; the panel
		* above it owns persistence. The status chip reads the case's *execution* outcome
		* only and is never derived from a vote: a human's 👍/👎 is not a verdict on the
		* run, and nothing here grades an answer automatically.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const request = computed(() => readCaseRequest(props.result.input));
		const agentAnswer = computed(() => readAgentAnswer(props.result.output));
		const isEditing = computed(() => props.view.kind === "editing");
		const isSettled = computed(() => props.view.kind === "settled");
		const currentVote = computed(() => props.view.kind === "unrated" ? null : props.view.vote);
		/** The correction only exists on a settled row; editing shows it in its editor. */
		const settledCorrection = computed(() => props.view.kind === "settled" ? props.view.correction : null);
		const settledComment = computed(() => props.view.kind === "settled" ? props.view.comment : null);
		const isPending = computed(() => props.result.status === "new" || props.result.status === "running");
		const votesDisabled = computed(() => props.disabled === true || isPending.value);
		/**
		* Execution outcomes only — there is no pass/fail grade in this view.
		*
		* `new` and `running` are told apart deliberately: the runner marks each case
		* running as it picks it up, so this is the only place a waiting reviewer can see
		* which case is actually executing rather than queued behind the concurrency cap.
		*/
		const statusLabel = computed(() => {
			switch (props.result.status) {
				case "error": return i18n.baseText("agents.builder.agentEvals.review.row.status.errored");
				case "cancelled": return i18n.baseText("agents.builder.agentEvals.review.row.status.cancelled");
				case "new": return i18n.baseText("agents.builder.agentEvals.review.row.status.queued");
				case "running": return i18n.baseText("agents.builder.agentEvals.review.row.status.running");
				default: return null;
			}
		});
		const statusTheme = computed(() => props.result.status === "error" ? "danger" : "outline");
		const toolCalls = computed(() => toDisplayToolCalls(props.result.toolCalls));
		/** The edit affordance lives in the reason panel or the edited-answer block when either is open. */
		const showFooterEdit = computed(() => !isEditing.value && !settledCorrection.value);
		const showFooter = computed(() => toolCalls.value.length > 0 || showFooterEdit.value);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass([_ctx.$style.row, { [_ctx.$style.editing]: isEditing.value }]),
				"data-testid": "agent-eval-result-row"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-dark",
					bold: "",
					class: normalizeClass(_ctx.$style.request)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(request.value), 1)]),
					_: 1
				}, 8, ["class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerActions) }, [
					statusLabel.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 0,
						variant: statusTheme.value,
						"data-testid": "agent-eval-status-chip"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(statusLabel.value), 1)]),
						_: 1
					}, 8, ["variant"])) : createCommentVNode("", true),
					isEditing.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 1,
						variant: "warning",
						"data-testid": "agent-eval-unsaved-pill"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.unsavedPill")), 1)]),
						_: 1
					})) : isSettled.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 2,
						variant: "success",
						"data-testid": "agent-eval-saved-pill"
					}, {
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.savedPill) }, [createVNode(unref(N8nIcon_default), {
							icon: "circle-check",
							size: "small"
						}), createTextVNode(" " + toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.savedPill")), 1)], 2)]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(AgentEvalVoteButtons_default, {
						vote: currentVote.value,
						disabled: votesDisabled.value,
						"disabled-reason": isPending.value ? unref(i18n).baseText("agents.builder.agentEvals.review.row.votePending") : void 0,
						onVote: _cache[0] || (_cache[0] = ($event) => emit("vote", $event))
					}, null, 8, [
						"vote",
						"disabled",
						"disabled-reason"
					])
				], 2)], 2),
				settledCorrection.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "xsmall",
					color: "text-light",
					class: normalizeClass(_ctx.$style.blockLabel),
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.agentAnswered")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true),
				createBaseVNode("div", { class: normalizeClass([_ctx.$style.answer, { [_ctx.$style.answerMuted]: Boolean(settledCorrection.value) }]) }, [agentAnswer.value ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(agentAnswer.value), 1)]),
					_: 1
				})) : isPending.value ? (openBlock(), createElementBlock("span", {
					key: 1,
					class: normalizeClass(_ctx.$style.awaiting)
				}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.awaitingAnswer")), 1)]),
					_: 1
				})], 2)) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 2,
					size: "small",
					color: "text-light",
					class: normalizeClass(_ctx.$style.noAnswer)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.noAnswer")), 1)]),
					_: 1
				}, 8, ["class"]))], 2),
				settledCorrection.value ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [createVNode(unref(N8nText_default), {
					size: "xsmall",
					color: "text-light",
					class: normalizeClass(_ctx.$style.blockLabel),
					bold: true
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.yourAnswer")), 1)]),
					_: 1
				}, 8, ["class"]), createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.correction),
					"data-testid": "agent-eval-correction"
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(settledCorrection.value), 1)]),
					_: 1
				}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.correctionFooter) }, [createVNode(unref(N8nText_default), {
					size: "xsmall",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.keptWithFeedback")), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					icon: "pencil",
					disabled: __props.disabled,
					"data-testid": "agent-eval-edit-answer",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("edit-answer"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.editAnswer")), 1)]),
					_: 1
				}, 8, ["disabled"])], 2)], 2)], 64)) : createCommentVNode("", true),
				isEditing.value && __props.view.kind === "editing" ? (openBlock(), createElementBlock("div", {
					key: 2,
					class: normalizeClass(_ctx.$style.panel)
				}, [
					__props.view.showReason ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-dark",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.reason.label")), 1)]),
							_: 1
						}),
						createVNode(unref(Input_default), {
							type: "textarea",
							autofocus: "",
							"model-value": __props.view.comment,
							rows: 2,
							maxlength: unref(AGENT_EVAL_MAX_COMMENT_CHARS),
							placeholder: unref(i18n).baseText("agents.builder.agentEvals.review.reason.placeholder"),
							"data-testid": "agent-eval-reason-input",
							"onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => emit("update:comment", $event))
						}, null, 8, [
							"model-value",
							"maxlength",
							"placeholder"
						]),
						createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.reason.helper")), 1)]),
							_: 1
						})
					], 64)) : createCommentVNode("", true),
					__props.view.showAnswerEditor ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
						createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-dark",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.answer.label")), 1)]),
							_: 1
						}),
						createVNode(unref(Input_default), {
							type: "textarea",
							"model-value": __props.view.correction,
							rows: 3,
							maxlength: unref(AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS),
							"data-testid": "agent-eval-answer-input",
							"onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => emit("update:correction", $event))
						}, null, 8, ["model-value", "maxlength"]),
						createVNode(unref(N8nText_default), {
							size: "xsmall",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.answer.helper")), 1)]),
							_: 1
						})
					], 64)) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.panelFooter) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.panelActions) }, [createVNode(unref(N8nButton_default), {
						variant: "solid",
						size: "small",
						disabled: !__props.view.canSave || __props.disabled,
						"data-testid": "agent-eval-reason-save",
						onClick: _cache[4] || (_cache[4] = ($event) => emit("save"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.reason.save")), 1)]),
						_: 1
					}, 8, ["disabled"]), createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "small",
						"data-testid": "agent-eval-reason-cancel",
						onClick: _cache[5] || (_cache[5] = ($event) => emit("cancel"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.cancel")), 1)]),
						_: 1
					})], 2), !__props.view.showAnswerEditor ? (openBlock(), createBlock(unref(N8nButton_default), {
						key: 0,
						variant: "outline",
						size: "small",
						icon: "pencil",
						disabled: __props.disabled,
						"data-testid": "agent-eval-edit-answer",
						onClick: _cache[6] || (_cache[6] = ($event) => emit("edit-answer"))
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.editAnswer")), 1)]),
						_: 1
					}, 8, ["disabled"])) : createCommentVNode("", true)], 2)
				], 2)) : createCommentVNode("", true),
				isSettled.value && settledComment.value ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.note),
					"data-testid": "agent-eval-note-strip"
				}, [createVNode(unref(N8nText_default), {
					size: "xsmall",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.noteLabel")) + " " + toDisplayString(settledComment.value), 1)]),
					_: 1
				}), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					disabled: __props.disabled,
					"data-testid": "agent-eval-edit-note",
					onClick: _cache[7] || (_cache[7] = ($event) => emit("edit-note"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.editNote")), 1)]),
					_: 1
				}, 8, ["disabled"])], 2)) : createCommentVNode("", true),
				showFooter.value ? (openBlock(), createElementBlock("div", {
					key: 4,
					class: normalizeClass(_ctx.$style.footer)
				}, [toolCalls.value.length > 0 ? (openBlock(), createBlock(AgentEvalToolCalls_default, {
					key: 0,
					"tool-calls": toolCalls.value,
					"project-id": __props.projectId
				}, null, 8, ["tool-calls", "project-id"])) : createCommentVNode("", true), showFooterEdit.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 1,
					variant: "outline",
					size: "small",
					icon: "pencil",
					disabled: __props.disabled,
					class: normalizeClass(_ctx.$style.footerEdit),
					"data-testid": "agent-eval-edit-answer",
					onClick: _cache[8] || (_cache[8] = ($event) => emit("edit-answer"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.row.editAnswer")), 1)]),
					_: 1
				}, 8, ["disabled", "class"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	row: "_row_o3qpl_1",
	editing: "_editing_o3qpl_11",
	header: "_header_o3qpl_15",
	request: "_request_o3qpl_22",
	headerActions: "_headerActions_o3qpl_26",
	savedPill: "_savedPill_o3qpl_33",
	blockLabel: "_blockLabel_o3qpl_39",
	answer: "_answer_o3qpl_43",
	answerMuted: "_answerMuted_o3qpl_49",
	noAnswer: "_noAnswer_o3qpl_53",
	awaiting: "_awaiting_o3qpl_57",
	correction: "_correction_o3qpl_63",
	correctionFooter: "_correctionFooter_o3qpl_72",
	panelFooter: "_panelFooter_o3qpl_73",
	note: "_note_o3qpl_74",
	panel: "_panel_o3qpl_73",
	panelActions: "_panelActions_o3qpl_91",
	footer: "_footer_o3qpl_103",
	footerEdit: "_footerEdit_o3qpl_110"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalResultsPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentEvalResultsPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalResultsPanel",
	props: {
		projectId: {},
		agentId: {},
		runId: {},
		disabled: { type: Boolean },
		rerunning: { type: Boolean }
	},
	emits: ["rerun"],
	setup(__props, { emit: __emit }) {
		/**
		* The results card for one eval run: what ran, how much of it has been reviewed,
		* a row per case, and the handoff back to the assistant.
		*
		* Owns persistence for the rows beneath it — they report intent, this reads and
		* writes the store. Counts come from the run's page envelope, never from the
		* loaded page, so paging can't change what the header claims.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const store = useAgentEvalsStore();
		const formatRelative = useRelativeTimestamp();
		const review = computed(() => store.getReview(props.runId));
		const results = computed(() => review.value.results);
		const reviewedCount = computed(() => store.reviewedCount(props.runId));
		const remaining = computed(() => Math.max(0, review.value.resultsCount - reviewedCount.value));
		const hasMore = computed(() => results.value.length < review.value.resultsCount);
		const counts = computed(() => review.value.counts);
		const inFlight = computed(() => store.isRunInFlight(props.runId));
		const settledCases = computed(() => {
			const c = counts.value;
			return c ? c.total - c.pending : 0;
		});
		const relativeRunTime = computed(() => {
			const run = review.value.run;
			const timestamp = run?.completedAt ?? run?.runAt ?? run?.createdAt;
			return timestamp ? formatRelative(timestamp) : null;
		});
		const viewFor = (resultId) => resolveReviewRowView({
			rating: review.value.ratingsByResultId[resultId],
			pending: review.value.pendingByResultId[resultId],
			draft: store.getDraft(props.runId, resultId)
		});
		const load = async () => {
			store.stopPollingRun();
			try {
				await store.openRun(props.projectId, props.agentId, props.runId);
				if (store.isRunInFlight(props.runId)) store.startPollingRun(props.projectId, props.agentId, props.runId);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.loadError"));
			}
		};
		const onLoadMore = async () => {
			try {
				await store.loadMoreResults(props.projectId, props.agentId, props.runId);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.loadError"));
			}
		};
		const onSave = async (resultId) => {
			try {
				await store.saveReview(props.projectId, props.agentId, props.runId, resultId);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.saveError"));
			}
		};
		const onVote = async (resultId, vote) => {
			const discardsWork = store.wouldDiscardOnAgreement(props.runId, resultId);
			store.beginVote(props.runId, resultId, vote);
			if (vote === "up" && !discardsWork) await onSave(resultId);
		};
		onMounted(load);
		watch(() => props.runId, load);
		onBeforeUnmount(store.stopPollingRun);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass(_ctx.$style.card),
				"data-testid": "agent-eval-results-panel"
			}, [
				createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.headerRow) }, [createVNode(unref(N8nText_default), {
					tag: "h3",
					size: "large",
					color: "text-dark",
					bold: "",
					class: normalizeClass(_ctx.$style.title)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.title")), 1)]),
					_: 1
				}, 8, ["class"]), createVNode(unref(N8nButton_default), {
					variant: "ghost",
					size: "xsmall",
					icon: "refresh-cw",
					disabled: __props.disabled || __props.rerunning,
					loading: __props.rerunning,
					"data-testid": "agent-eval-rerun-button",
					onClick: _cache[0] || (_cache[0] = ($event) => emit("rerun"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.rerun")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.meta) }, [
					inFlight.value ? (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 0,
						"data-testid": "agent-eval-progress-chip"
					}, {
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.progressChip) }, [createVNode(unref(N8nSpinner_default), { size: "small" }), createTextVNode(" " + toDisplayString(counts.value ? unref(i18n).baseText("agents.builder.agentEvals.review.progress", { interpolate: {
							done: settledCases.value,
							total: counts.value.total
						} }) : unref(i18n).baseText("agents.builder.agentEvals.review.running")), 1)], 2)]),
						_: 1
					})) : (openBlock(), createBlock(unref(N8nBadge_default), {
						key: 1,
						"data-testid": "agent-eval-cases-run-chip"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.casesRun", {
							adjustToNumber: review.value.resultsCount,
							interpolate: { count: review.value.resultsCount }
						})), 1)]),
						_: 1
					})),
					createVNode(unref(N8nBadge_default), { "data-testid": "agent-eval-reviewed-chip" }, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.reviewed", { interpolate: {
							reviewed: reviewedCount.value,
							total: review.value.resultsCount
						} })), 1)]),
						_: 1
					}),
					relativeRunTime.value ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 2,
						size: "xsmall",
						color: "text-light"
					}, {
						default: withCtx(() => [createTextVNode(" · " + toDisplayString(relativeRunTime.value), 1)]),
						_: 1
					})) : createCommentVNode("", true)
				], 2)], 2),
				(openBlock(true), createElementBlock(Fragment, null, renderList(results.value, (result) => {
					return openBlock(), createBlock(AgentEvalResultRow_default, {
						key: result.id,
						result,
						view: viewFor(result.id),
						disabled: __props.disabled,
						"project-id": __props.projectId,
						onVote: ($event) => onVote(result.id, $event),
						"onUpdate:comment": ($event) => unref(store).setDraftComment(__props.runId, result.id, $event),
						"onUpdate:correction": ($event) => unref(store).setDraftCorrection(__props.runId, result.id, $event),
						onEditAnswer: ($event) => unref(store).beginAnswerEdit(__props.runId, result.id),
						onEditNote: ($event) => unref(store).beginNoteEdit(__props.runId, result.id),
						onSave: ($event) => onSave(result.id),
						onCancel: ($event) => unref(store).cancelDraft(__props.runId, result.id)
					}, null, 8, [
						"result",
						"view",
						"disabled",
						"project-id",
						"onVote",
						"onUpdate:comment",
						"onUpdate:correction",
						"onEditAnswer",
						"onEditNote",
						"onSave",
						"onCancel"
					]);
				}), 128)),
				hasMore.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.loadMore)
				}, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					loading: review.value.loadingMore,
					"data-testid": "agent-eval-load-more",
					onClick: onLoadMore
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.loadMore")), 1)]),
					_: 1
				}, 8, ["loading"])], 2)) : createCommentVNode("", true),
				createBaseVNode("footer", { class: normalizeClass(_ctx.$style.footer) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.progress) }, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-dark",
					bold: ""
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.reviewed", { interpolate: {
						reviewed: reviewedCount.value,
						total: review.value.resultsCount
					} })), 1)]),
					_: 1
				}), createVNode(unref(N8nText_default), {
					size: "xsmall",
					color: "text-light"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(remaining.value === 0 ? unref(i18n).baseText("agents.builder.agentEvals.review.footer.allReviewed") : unref(i18n).baseText("agents.builder.agentEvals.review.footer.remaining", {
						adjustToNumber: remaining.value,
						interpolate: { count: remaining.value }
					})), 1)]),
					_: 1
				})], 2), createVNode(unref(N8nTooltip_default), {
					content: unref(i18n).baseText("agents.builder.agentEvals.review.footer.sendUnavailable"),
					placement: "top"
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "solid",
						size: "medium",
						disabled: "",
						"data-testid": "agent-eval-send-feedback"
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.review.footer.send")), 1)]),
						_: 1
					})]),
					_: 1
				}, 8, ["content"])], 2)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_4pp6l_2",
	header: "_header_4pp6l_14",
	headerRow: "_headerRow_4pp6l_21",
	title: "_title_4pp6l_28",
	progressChip: "_progressChip_4pp6l_32",
	meta: "_meta_4pp6l_38",
	loadMore: "_loadMore_4pp6l_45",
	footer: "_footer_4pp6l_52",
	progress: "_progress_4pp6l_32"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalExamplesSlider.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$14 = ["for"];
var _hoisted_2$4 = [
	"id",
	"placeholder",
	"disabled",
	"onKeydown"
];
var COLLAPSED_ROW_COUNT = 3;
var AgentEvalExamplesSlider_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalExamplesSlider",
	props: {
		examples: {},
		loading: { type: Boolean },
		disabled: { type: Boolean }
	},
	emits: ["add-example"],
	setup(__props, { expose: __expose, emit: __emit }) {
		/**
		* The slider-controlled batch of generated examples, plus the "add your own"
		* form. Split out of `InstanceAiTestAgentExamplesPanel` so the same picker can
		* also drive the evals-tab empty-state preview.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const maxSliderValue = computed(() => Math.max(1, Math.min(10, props.examples.length)));
		const sliderValue = ref(Math.min(2, maxSliderValue.value));
		watch(() => props.examples.length, (length, previousLength) => {
			if (previousLength === 0 && length > 0) sliderValue.value = Math.min(2, maxSliderValue.value);
		});
		const visibleExamples = computed(() => props.examples.slice(0, sliderValue.value));
		const ownExamples = ref([]);
		let nextOwnExampleId = 0;
		const ownInput = ref("");
		const customLabel = computed(() => i18n.baseText("instanceAi.testAgentPreview.customExampleLabel"));
		const generatedDisplay = computed(() => visibleExamples.value.map((example, index) => ({
			id: `gen:${index}`,
			input: example.input,
			label: example.scenario
		})).reverse());
		const ownDisplay = computed(() => ownExamples.value.map(({ id, input }) => ({
			id: `own:${id}`,
			input,
			label: customLabel.value
		})));
		const allDisplayExamples = computed(() => [...ownDisplay.value, ...generatedDisplay.value]);
		const expanded = ref(false);
		const hasOverflow = computed(() => allDisplayExamples.value.length > COLLAPSED_ROW_COUNT);
		const shownExamples = computed(() => expanded.value || !hasOverflow.value ? allDisplayExamples.value : allDisplayExamples.value.slice(0, COLLAPSED_ROW_COUNT));
		const hiddenExampleCount = computed(() => Math.max(0, allDisplayExamples.value.length - COLLAPSED_ROW_COUNT));
		function toggleExpanded() {
			expanded.value = !expanded.value;
		}
		function submitOwnExample() {
			const value = ownInput.value.trim();
			if (!value) return;
			ownExamples.value = [{
				id: nextOwnExampleId++,
				input: value
			}, ...ownExamples.value];
			emit("add-example", value);
			ownInput.value = "";
		}
		function cancelAddOwn() {
			ownInput.value = "";
		}
		const ownInputRef = ref(null);
		const ownInputId = useId();
		const sliderCountId = useId();
		function updateSliderValue([value]) {
			sliderValue.value = value;
		}
		function focusOwnInput() {
			ownInputRef.value?.focus();
		}
		__expose({
			sliderValue,
			focusOwnInput
		});
		return (_ctx, _cache) => {
			return __props.loading ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass([_ctx.$style.root, _ctx.$style.loadingRow]),
				"data-test-id": "agent-eval-examples-slider-loading"
			}, [createVNode(unref(N8nSpinner_default), { size: "small" }), createVNode(unref(N8nText_default), { color: "text-base" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.generatingSuite")), 1)]),
				_: 1
			})], 2)) : (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.root)
			}, [
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.sliderRow),
					"data-test-id": "instance-ai-test-agent-examples-slider"
				}, [createVNode(unref(N8nText_default), {
					id: unref(sliderCountId),
					class: normalizeClass(_ctx.$style.sliderCount),
					bold: "",
					size: "medium"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.examplesCount", {
						adjustToNumber: sliderValue.value,
						interpolate: {
							count: String(sliderValue.value),
							total: String(__props.examples.length)
						}
					})), 1)]),
					_: 1
				}, 8, ["id", "class"]), createVNode(unref(N8nSlider_default), {
					"model-value": [sliderValue.value],
					"min-value": 1,
					"max-value": maxSliderValue.value,
					step: 1,
					"show-step-markers": false,
					"hide-value": "",
					"aria-labelledby": unref(sliderCountId),
					class: normalizeClass(_ctx.$style.slider),
					size: "small",
					"onUpdate:modelValue": updateSliderValue
				}, null, 8, [
					"model-value",
					"max-value",
					"aria-labelledby",
					"class"
				])], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.exampleList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(shownExamples.value, (example) => {
					return openBlock(), createBlock(AgentEvalTryRow_default, {
						key: example.id,
						status: "idle",
						input: example.input,
						output: null,
						label: example.label,
						"test-id": example.id.startsWith("own:") ? "instance-ai-test-agent-examples-own-example" : "instance-ai-test-agent-examples-example"
					}, null, 8, [
						"input",
						"label",
						"test-id"
					]);
				}), 128)), hasOverflow.value ? (openBlock(), createElementBlock("button", {
					key: 0,
					type: "button",
					class: normalizeClass(_ctx.$style.toggleRow),
					"data-test-id": "instance-ai-test-agent-examples-toggle-more",
					onClick: toggleExpanded
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-dark"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(expanded.value ? unref(i18n).baseText("instanceAi.testAgentPreview.showFewerExamples") : unref(i18n).baseText("instanceAi.testAgentPreview.showMoreExamples", { interpolate: { count: String(hiddenExampleCount.value) } })), 1)]),
					_: 1
				}), createVNode(unref(N8nIcon_default), {
					icon: expanded.value ? "chevron-up" : "chevron-down",
					size: "small"
				}, null, 8, ["icon"])], 2)) : createCommentVNode("", true)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.addOwnForm) }, [createVNode(AgentAvatar_default, {
					kind: "idle",
					size: "xs"
				}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.addOwnFormHeader) }, [createBaseVNode("label", { for: unref(ownInputId) }, [createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testAgentPreview.customExampleLabel")), 1)]),
					_: 1
				})], 8, _hoisted_1$14), withDirectives(createBaseVNode("input", {
					id: unref(ownInputId),
					ref_key: "ownInputRef",
					ref: ownInputRef,
					"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => ownInput.value = $event),
					name: "ownInput",
					class: normalizeClass(_ctx.$style.addOwnInput),
					placeholder: unref(i18n).baseText("instanceAi.testAgentPreview.addYourOwnExample"),
					disabled: __props.disabled,
					"data-test-id": "instance-ai-test-agent-examples-add-own-input",
					onKeydown: [
						withKeys(withModifiers(submitOwnExample, ["meta"]), ["enter"]),
						withKeys(withModifiers(submitOwnExample, ["exact"]), ["enter"]),
						withKeys(cancelAddOwn, ["esc"])
					]
				}, null, 42, _hoisted_2$4), [[vModelText, ownInput.value]])], 2)], 2)
			], 2));
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_an1h3_1",
	loadingRow: "_loadingRow_an1h3_20",
	sliderRow: "_sliderRow_an1h3_26",
	slider: "_slider_an1h3_26",
	sliderCount: "_sliderCount_an1h3_40",
	exampleList: "_exampleList_an1h3_45",
	"exr-in": "_exr-in_an1h3_1",
	toggleRow: "_toggleRow_an1h3_64",
	addOwnForm: "_addOwnForm_an1h3_76",
	addOwnFormHeader: "_addOwnFormHeader_an1h3_85",
	addOwnInput: "_addOwnInput_an1h3_91"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalsEmptyStatePreview.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var AgentEvalsEmptyStatePreview_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalsEmptyStatePreview",
	props: {
		examples: {},
		loading: { type: Boolean },
		addingChecks: { type: Boolean },
		disabled: { type: Boolean }
	},
	emits: ["add-example", "add-checks"],
	setup(__props, { emit: __emit }) {
		/**
		* Alternate empty state for the evals tab, shown instead of the plain
		* "Generate test cases" card when `useTestAgentPreviewFlag` is on.
		*/
		const emit = __emit;
		const i18n = useI18n();
		const examplesSlider = ref(null);
		function onAddChecks() {
			emit("add-checks", examplesSlider.value?.sliderValue ?? 1);
		}
		function onAddYourOwn() {
			examplesSlider.value?.focusOwnInput();
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.root),
				"data-testid": "agent-evals-empty-state-preview"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.avatars) }, [
					createVNode(AgentAvatar_default, {
						kind: "waiting",
						size: "lg"
					}),
					createVNode(AgentAvatar_default, {
						kind: "waiting",
						size: "lg"
					}),
					createVNode(AgentAvatar_default, {
						kind: "waiting",
						size: "lg"
					})
				], 2),
				createVNode(unref(N8nText_default), {
					tag: "h3",
					color: "text-dark",
					bold: "",
					class: normalizeClass(_ctx.$style.title)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.empty.preview.title")), 1)]),
					_: 1
				}, 8, ["class"]),
				createVNode(unref(N8nText_default), {
					color: "text-light",
					size: "small",
					class: normalizeClass(_ctx.$style.description)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.empty.preview.description")), 1)]),
					_: 1
				}, 8, ["class"]),
				createVNode(AgentEvalExamplesSlider_default, {
					ref_key: "examplesSlider",
					ref: examplesSlider,
					examples: __props.examples,
					loading: __props.loading,
					disabled: __props.disabled || __props.addingChecks,
					onAddExample: _cache[0] || (_cache[0] = ($event) => emit("add-example", $event))
				}, null, 8, [
					"examples",
					"loading",
					"disabled"
				]),
				!__props.loading ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.actions)
				}, [createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "small",
					disabled: __props.disabled,
					loading: __props.addingChecks,
					"data-testid": "agent-evals-empty-preview-add-checks",
					onClick: onAddChecks
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.empty.preview.addChecks", {
						adjustToNumber: examplesSlider.value?.sliderValue ?? 1,
						interpolate: { count: String(examplesSlider.value?.sliderValue ?? 1) }
					})), 1)]),
					_: 1
				}, 8, ["disabled", "loading"]), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "small",
					disabled: __props.disabled || __props.addingChecks,
					"data-testid": "agent-evals-empty-preview-add-own",
					onClick: onAddYourOwn
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.empty.preview.addYourOwn")), 1)]),
					_: 1
				}, 8, ["disabled"])], 2)) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	root: "_root_5scsn_1",
	actions: "_actions_5scsn_11",
	avatars: "_avatars_5scsn_17",
	title: "_title_5scsn_23",
	description: "_description_5scsn_27"
} }]]);
//#endregion
//#region src/features/agents/components/AgentEvalsSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentEvalsSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentEvalsSection",
	props: {
		projectId: {},
		agentId: {},
		disabled: { type: Boolean },
		canRun: { type: Boolean },
		generating: { type: Boolean },
		agentUnsaved: { type: Boolean }
	},
	emits: ["generate"],
	setup(__props, { emit: __emit }) {
		/**
		* Container for the agent's eval surface: the first-run state until a dataset
		* exists, then the review card for its newest run.
		*
		* Owns which run is shown. There is no run picker yet, so it resolves the newest
		* run of the newest dataset itself rather than depending on a list view.
		*/
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const toast = useToast();
		const store = useAgentEvalsStore();
		const { isFeatureEnabled: showEmptyStatePreview } = useTestAgentPreviewFlag();
		const datasets = computed(() => store.getDatasets(props.agentId));
		const dataset = computed(() => datasets.value[0]);
		/**
		* False until the read for the current agent has finished — either way. Keyed on
		* the attempt rather than on `isLoaded`, because a *failed* read never populates
		* the cache: reading `isLoaded` alone leaves the skeleton up for good once the
		* toast has gone, with nothing to retry from. An agent with no row yet is never
		* fetched for at all, so it is settled from the start.
		*/
		const hasSettled = ref(false);
		const awaitingDatasets = computed(() => !hasSettled.value);
		const runId = computed(() => dataset.value ? store.getLatestRunId(dataset.value.id) : void 0);
		const caseDataset = computed(() => dataset.value && isDataTableDataset(dataset.value) ? dataset.value : null);
		const previewCases = ref([]);
		const previewOwnExamples = ref([]);
		const hasPreview = computed(() => previewCases.value.length > 0);
		const addingChecks = ref(false);
		const generatingPreview = ref(false);
		let previewRequestId = 0;
		const loadPreview = async () => {
			if (hasPreview.value || generatingPreview.value) return;
			const requestId = previewRequestId;
			generatingPreview.value = true;
			try {
				const result = await store.generateDraftCases(props.projectId, props.agentId, {
					count: 10,
					save: false
				});
				if (requestId !== previewRequestId) return;
				previewCases.value = result.cases;
			} catch (error) {
				if (requestId !== previewRequestId) return;
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.generateError"));
			} finally {
				if (requestId === previewRequestId) generatingPreview.value = false;
			}
		};
		const load = async () => {
			previewRequestId += 1;
			previewCases.value = [];
			previewOwnExamples.value = [];
			generatingPreview.value = false;
			if (!props.agentId || props.agentUnsaved) {
				hasSettled.value = true;
				return;
			}
			hasSettled.value = false;
			try {
				const newest = (await store.fetchDatasets(props.projectId, props.agentId))[0];
				if (!newest) {
					if (showEmptyStatePreview.value) loadPreview();
					return;
				}
				await store.resolveLatestRunId(props.projectId, props.agentId, newest.id);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.loadError"));
			} finally {
				hasSettled.value = true;
			}
		};
		const onRerun = async () => {
			if (!dataset.value) return;
			try {
				await store.startRun(props.projectId, props.agentId, dataset.value.id);
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.agentEvals.review.rerunError"));
			}
		};
		/** "Add your own example" from the preview slider: kept in memory only —
		*  nothing is persisted until "Add checks" commits the whole batch. */
		const onAddPreviewExample = (input) => {
			previewOwnExamples.value = [...previewOwnExamples.value, input];
		};
		/**
		* Commits the preview: creates a real (empty) dataset, inserts the slider's
		* selected generated cases plus every self-written one as rows, runs the
		* agent over them, then reloads — which switches the view from the preview
		* straight to the run's results, same as the instanceAi flow's "Check your
		* agent". Nothing from the preview is persisted before this point.
		*/
		const onAddChecks = async (count) => {
			addingChecks.value = true;
			const { projectId, agentId } = props;
			const toCreate = [...previewCases.value.slice(0, count).map((c) => ({
				input: c.input,
				whatToCheck: c.whatToCheck
			})), ...previewOwnExamples.value.map((input) => ({
				input,
				whatToCheck: ""
			}))];
			const isStale = () => props.projectId !== projectId || props.agentId !== agentId;
			let createdDatasetId;
			let runSubmitted = false;
			try {
				const created = await store.createDraftDataset(projectId, agentId);
				createdDatasetId = created.datasetId;
				const columns = resolveCaseColumns(created.columnMapping);
				if (!columns) throw new Error("The draft dataset has no writable case columns");
				const source = {
					datasetId: created.datasetId,
					dataTableId: created.dataTableId,
					columns
				};
				await Promise.all(toCreate.map((value) => store.createCase(projectId, source, value)));
				runSubmitted = true;
				await store.startRun(projectId, agentId, created.datasetId);
				if (!isStale()) await load();
			} catch (error) {
				if (createdDatasetId && !runSubmitted) await store.deleteDraftDataset(projectId, agentId, createdDatasetId).catch(() => null);
				if (!isStale()) toast.showError(error, i18n.baseText("agents.builder.agentEvals.run.startError"));
			} finally {
				addingChecks.value = false;
			}
		};
		onMounted(load);
		watch(() => props.agentId, load);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.section),
				"data-testid": "agent-evals-section"
			}, [awaitingDatasets.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				rows: 4,
				"data-testid": "agent-evals-loading"
			})) : dataset.value && runId.value && unref(showEmptyStatePreview) ? (openBlock(), createBlock(AgentEvalChecksPanel_default, {
				key: 1,
				"project-id": __props.projectId,
				"agent-id": __props.agentId,
				"run-id": runId.value,
				disabled: __props.disabled,
				rerunning: unref(store).isStartingRun(dataset.value.id),
				onRerun
			}, null, 8, [
				"project-id",
				"agent-id",
				"run-id",
				"disabled",
				"rerunning"
			])) : dataset.value && runId.value ? (openBlock(), createBlock(AgentEvalResultsPanel_default, {
				key: 2,
				"project-id": __props.projectId,
				"agent-id": __props.agentId,
				"run-id": runId.value,
				disabled: __props.disabled,
				rerunning: unref(store).isStartingRun(dataset.value.id),
				onRerun
			}, null, 8, [
				"project-id",
				"agent-id",
				"run-id",
				"disabled",
				"rerunning"
			])) : dataset.value && caseDataset.value ? (openBlock(), createBlock(AgentEvalCasesCard_default, {
				key: `${__props.projectId}:${__props.agentId}:${caseDataset.value.id}`,
				"project-id": __props.projectId,
				"agent-id": __props.agentId,
				dataset: caseDataset.value,
				disabled: __props.disabled,
				"can-run": __props.canRun,
				generating: __props.generating,
				onRegenerate: _cache[0] || (_cache[0] = ($event) => emit("generate"))
			}, null, 8, [
				"project-id",
				"agent-id",
				"dataset",
				"disabled",
				"can-run",
				"generating"
			])) : dataset.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 4,
				theme: "info",
				"data-testid": "agent-evals-external-source"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.external.description")), 1)]),
				_: 1
			})) : unref(showEmptyStatePreview) && (generatingPreview.value || hasPreview.value) ? (openBlock(), createBlock(AgentEvalsEmptyStatePreview_default, {
				key: 5,
				examples: previewCases.value,
				loading: generatingPreview.value,
				"adding-checks": addingChecks.value,
				disabled: __props.disabled,
				onAddExample: onAddPreviewExample,
				onAddChecks
			}, null, 8, [
				"examples",
				"loading",
				"adding-checks",
				"disabled"
			])) : (openBlock(), createElementBlock("div", {
				key: 6,
				class: normalizeClass(_ctx.$style.emptyState),
				"data-testid": "agent-evals-empty-state"
			}, [
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.iconBadge) }, [createVNode(unref(N8nIcon_default), {
					icon: "sparkles",
					size: "xlarge"
				})], 2),
				createVNode(unref(N8nText_default), {
					tag: "h3",
					size: "large",
					color: "text-dark",
					bold: "",
					class: normalizeClass(_ctx.$style.title)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.empty.title")), 1)]),
					_: 1
				}, 8, ["class"]),
				createVNode(unref(N8nText_default), {
					size: "medium",
					color: "text-base",
					class: normalizeClass(_ctx.$style.description)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.empty.description")), 1)]),
					_: 1
				}, 8, ["class"]),
				createVNode(unref(N8nButton_default), {
					variant: "solid",
					size: "large",
					type: "button",
					icon: "sparkles",
					disabled: __props.disabled || __props.agentUnsaved,
					loading: __props.generating,
					"data-testid": "agent-evals-generate-button",
					onClick: _cache[1] || (_cache[1] = ($event) => emit("generate"))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.agentEvals.empty.generate")), 1)]),
					_: 1
				}, 8, ["disabled", "loading"])
			], 2))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	section: "_section_uhu7z_2",
	emptyState: "_emptyState_uhu7z_11",
	iconBadge: "_iconBadge_uhu7z_24",
	title: "_title_uhu7z_34",
	description: "_description_uhu7z_40"
} }]]);
//#endregion
//#region src/features/agents/components/AgentBuilderEditorColumn.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$13 = ["aria-label"];
var _hoisted_2$3 = ["id", "aria-expanded"];
var AgentBuilderEditorColumn_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBuilderEditorColumn",
	props: {
		activeMainTab: {},
		mainTabOptions: {},
		localConfig: {},
		agent: {},
		projectId: {},
		agentId: {},
		agentFiles: {},
		agentFilesLoading: { type: Boolean },
		agentFilesUploading: { type: Boolean },
		knowledgeBaseEnabled: { type: Boolean },
		deletingAgentFileId: {},
		appliedSkills: {},
		connectedTriggers: {},
		canEditAgent: { type: Boolean },
		canExecuteAgent: { type: Boolean },
		agentAvailableInMcp: { type: Boolean },
		executionsDescription: {},
		generatingEvalCases: { type: Boolean },
		tasksReloadKey: {},
		artifactMode: { type: Boolean },
		chatFirst: { type: Boolean },
		isPreviewOpen: { type: Boolean },
		hidePreviewButton: { type: Boolean },
		preventScroll: { type: Boolean },
		embeddedAiBuilding: { type: Boolean },
		agentUnsaved: { type: Boolean },
		ensureAgentPersisted: { type: Function },
		configValidationIssues: {},
		previewDisabledReason: {},
		savedDescription: {},
		saveDescription: { type: Function }
	},
	emits: [
		"update:activeMainTab",
		"update:config",
		"update:budget-config",
		"draft:config",
		"open-tool",
		"open-skill",
		"add-tool",
		"add-skill",
		"remove-tool",
		"remove-skill",
		"upload-files",
		"delete-file",
		"add-vector-store",
		"edit-vector-store",
		"remove-vector-store",
		"update:connected-triggers",
		"trigger-added",
		"trigger-removed",
		"toggle-task",
		"toggle-mcp-access",
		"tasks-changed",
		"preview-task",
		"agent-changed",
		"generate-eval-cases",
		"open-preview",
		"close-preview",
		"publish-agent",
		"setup-task-action"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const childrenDisabled = computed(() => !props.canEditAgent);
		provideAgentPersonalisation(() => props.localConfig?.personalisation ?? props.agent?.config?.personalisation);
		const isKnowledgeAdvancedExpanded = ref(false);
		const isMemoryViewAll = ref(false);
		const settingsStore = useSettingsStore();
		const isMcpAvailable = computed(() => settingsStore.isModuleActive("mcp") && !!settingsStore.moduleSettings.mcp?.mcpAccessEnabled);
		watch(() => props.activeMainTab, () => {
			isMemoryViewAll.value = false;
		});
		useTypeAvailability(() => props.projectId);
		const emit = __emit;
		const i18n = useI18n();
		const agentTelemetry = useAgentTelemetry();
		const testButtonPrimaryColorExperiment = useTestButtonPrimaryColorExperiment();
		const showPrimaryColorTestButton = computed(() => !props.artifactMode && testButtonPrimaryColorExperiment.isEnabled.value);
		const agentInfoPanel = ref();
		const agentTriggersSection = ref();
		function onMainTabSelect(tab) {
			if (tab !== "evals") agentTelemetry.trackClickedAgentsTab({
				agentId: props.agentId,
				name: tab === "agent" ? "build" : tab
			});
			emit("update:activeMainTab", tab);
		}
		function onSetupTaskAction(task) {
			if (task.id === "publish-agent") {
				emit("publish-agent");
				return;
			}
			if (task.action.target.kind === "tool") {
				emit("add-tool", "tools");
				return;
			}
			if (task.action.target.kind === "channel") {
				agentTriggersSection.value?.openChannelModal();
				return;
			}
			if (task.action.path === "instructions") {
				agentInfoPanel.value?.focusInstructions();
				return;
			}
			if (task.action.path === "model") agentInfoPanel.value?.focusModel();
		}
		__expose({ onSetupTaskAction });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("section", {
				class: normalizeClass([_ctx.$style.editorColumn, {
					[_ctx.$style.embeddedAiBuilding]: props.embeddedAiBuilding,
					[_ctx.$style.chatFirst]: props.chatFirst
				}]),
				"aria-label": unref(i18n).baseText("agents.builder.editorColumn.ariaLabel"),
				"data-testid": "agent-builder-editor-column"
			}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.panelArea, { [_ctx.$style.preventScroll]: props.preventScroll }]) }, [
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.identityHeaderRow),
					"data-testid": "agent-builder-identity-header"
				}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.identityHeader) }, [createVNode(AgentIdentityHeader_default, {
					class: normalizeClass(_ctx.$style.identityContent),
					config: __props.localConfig,
					disabled: childrenDisabled.value,
					"onUpdate:config": _cache[0] || (_cache[0] = ($event) => emit("update:config", $event))
				}, null, 8, [
					"class",
					"config",
					"disabled"
				]), !props.hidePreviewButton ? (openBlock(), createBlock(AgentTestButton_default, {
					key: 0,
					"disabled-reason": props.previewDisabledReason,
					"is-runnable": props.agent?.isRunnable === true,
					"is-preview-open": props.isPreviewOpen,
					"validation-issues": props.configValidationIssues ?? [],
					variant: showPrimaryColorTestButton.value ? "solid" : "outline",
					"test-id": "agent-header-preview-btn",
					onOpenPreview: _cache[1] || (_cache[1] = ($event) => emit("open-preview", "primary")),
					onClosePreview: _cache[2] || (_cache[2] = ($event) => emit("close-preview"))
				}, null, 8, [
					"disabled-reason",
					"is-runnable",
					"is-preview-open",
					"validation-issues",
					"variant"
				])) : createCommentVNode("", true)], 2)], 2),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.tabsRow),
					"data-testid": "agent-tabs-row"
				}, [createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.tabsRule),
					"data-testid": "agent-tabs-rule"
				}, [createVNode(unref(Tabs_default), {
					"model-value": __props.activeMainTab,
					options: __props.mainTabOptions,
					class: normalizeClass(_ctx.$style.mainTabs),
					"data-testid": "agent-header-tabs",
					"onUpdate:modelValue": onMainTabSelect
				}, null, 8, [
					"model-value",
					"options",
					"class"
				])], 2)], 2),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.panelAreaContainer) }, [__props.activeMainTab === "agent" ? (openBlock(), createBlock(AgentBuilderTabPanel_default, {
					key: 0,
					"data-testid": "agent-tab-content"
				}, {
					default: withCtx(() => [
						createVNode(AgentInfoPanel_default, {
							ref_key: "agentInfoPanel",
							ref: agentInfoPanel,
							config: __props.localConfig,
							disabled: childrenDisabled.value,
							"project-id": __props.projectId,
							"onUpdate:config": _cache[3] || (_cache[3] = (changes, meta) => emit("update:config", changes, meta)),
							"onDraft:config": _cache[4] || (_cache[4] = ($event) => emit("draft:config"))
						}, null, 8, [
							"config",
							"disabled",
							"project-id"
						]),
						createVNode(AgentPanel_default, {
							header: unref(i18n).baseText("agents.builder.skills.title"),
							description: unref(i18n).baseText("agents.builder.skills.description"),
							"data-testid": "agent-skills-panel"
						}, {
							default: withCtx(() => [createVNode(AgentSkillsSection_default, {
								skills: __props.appliedSkills,
								disabled: childrenDisabled.value,
								"show-label": false,
								"validation-issues": __props.configValidationIssues ?? [],
								"outdated-skill-ids": __props.agent?.outdatedSkillIds ?? [],
								onOpenSkill: _cache[5] || (_cache[5] = ($event) => emit("open-skill", $event)),
								onAddSkill: _cache[6] || (_cache[6] = ($event) => emit("add-skill")),
								onRemoveSkill: _cache[7] || (_cache[7] = ($event) => emit("remove-skill", $event))
							}, null, 8, [
								"skills",
								"disabled",
								"validation-issues",
								"outdated-skill-ids"
							])]),
							_: 1
						}, 8, ["header", "description"]),
						createVNode(AgentPanel_default, {
							header: unref(i18n).baseText("agents.builder.triggers.title"),
							description: unref(i18n).baseText("agents.builder.triggers.description")
						}, {
							"header-actions": withCtx(() => [createVNode(AgentTestButton_default, {
								"disabled-reason": props.previewDisabledReason,
								"icon-only": true,
								"is-runnable": props.agent?.isRunnable === true,
								"validation-issues": props.configValidationIssues ?? [],
								"test-id": "agent-triggers-preview-chat-button",
								onOpenPreview: _cache[8] || (_cache[8] = ($event) => emit("open-preview", "icon"))
							}, null, 8, [
								"disabled-reason",
								"is-runnable",
								"validation-issues"
							])]),
							default: withCtx(() => [(openBlock(), createBlock(AgentTriggersSection_default, {
								"preview-disabled-reason": props.previewDisabledReason,
								ref_key: "agentTriggersSection",
								ref: agentTriggersSection,
								key: `${__props.projectId}:${__props.agentId}`,
								"connected-triggers": __props.connectedTriggers,
								disabled: childrenDisabled.value,
								"agent-id": __props.agentId,
								"project-id": __props.projectId,
								"is-published": Boolean(__props.agent?.activeVersionId),
								"is-runnable": props.agent?.isRunnable === true,
								"validation-issues": __props.configValidationIssues ?? [],
								"simple-channel-setup": __props.artifactMode,
								"agent-unsaved": __props.agentUnsaved,
								"ensure-agent-persisted": __props.ensureAgentPersisted,
								"saved-description": __props.savedDescription,
								"save-description": __props.saveDescription,
								"task-refs": __props.localConfig?.tasks ?? [],
								"reload-key": __props.tasksReloadKey,
								"onUpdate:connectedTriggers": _cache[9] || (_cache[9] = ($event) => emit("update:connected-triggers", $event)),
								onTriggerAdded: _cache[10] || (_cache[10] = ($event) => emit("trigger-added", $event)),
								onTriggerRemoved: _cache[11] || (_cache[11] = ($event) => emit("trigger-removed", $event)),
								onAgentChanged: _cache[12] || (_cache[12] = ($event) => emit("agent-changed")),
								onToggleTask: _cache[13] || (_cache[13] = ($event) => emit("toggle-task", $event)),
								onTasksChanged: _cache[14] || (_cache[14] = ($event) => emit("tasks-changed")),
								onPreviewTask: _cache[15] || (_cache[15] = ($event) => emit("preview-task", $event))
							}, null, 8, [
								"preview-disabled-reason",
								"connected-triggers",
								"disabled",
								"agent-id",
								"project-id",
								"is-published",
								"is-runnable",
								"validation-issues",
								"simple-channel-setup",
								"agent-unsaved",
								"ensure-agent-persisted",
								"saved-description",
								"save-description",
								"task-refs",
								"reload-key"
							]))]),
							_: 1
						}, 8, ["header", "description"]),
						createVNode(AgentPanel_default, {
							header: unref(i18n).baseText("agents.builder.capabilities.title"),
							description: unref(i18n).baseText("agents.builder.capabilities.description")
						}, {
							default: withCtx(() => [createVNode(AgentCapabilitiesSection_default, {
								"supports-activation": "",
								config: __props.localConfig,
								tools: __props.localConfig?.tools ?? [],
								"custom-tools": __props.agent?.tools ?? {},
								skills: __props.appliedSkills,
								disabled: childrenDisabled.value,
								"project-id": __props.projectId,
								"agent-id": __props.agentId,
								"is-published": Boolean(__props.agent?.activeVersionId),
								"validation-issues": __props.configValidationIssues ?? [],
								"agent-unsaved": __props.agentUnsaved,
								sections: [
									"tools",
									"subAgents",
									"tasks"
								],
								onOpenTool: _cache[16] || (_cache[16] = ($event) => emit("open-tool", $event)),
								onAddTool: _cache[17] || (_cache[17] = ($event) => emit("add-tool", $event)),
								"onUpdate:config": _cache[18] || (_cache[18] = ($event) => emit("update:config", $event)),
								onRemoveTool: _cache[19] || (_cache[19] = ($event) => emit("remove-tool", $event))
							}, null, 8, [
								"config",
								"tools",
								"custom-tools",
								"skills",
								"disabled",
								"project-id",
								"agent-id",
								"is-published",
								"validation-issues",
								"agent-unsaved"
							])]),
							_: 1
						}, 8, ["header", "description"]),
						__props.canEditAgent ? (openBlock(), createBlock(AgentMemoryPanel_default, {
							key: 0,
							config: __props.localConfig,
							disabled: childrenDisabled.value,
							"data-testid": "agent-memory-panel",
							"onUpdate:config": _cache[20] || (_cache[20] = ($event) => emit("update:config", $event))
						}, null, 8, ["config", "disabled"])) : createCommentVNode("", true)
					]),
					_: 1
				})) : __props.activeMainTab === "knowledge" ? (openBlock(), createBlock(AgentBuilderTabPanel_default, {
					key: 1,
					"data-testid": "agent-knowledge-tab-content"
				}, {
					default: withCtx(() => [
						__props.knowledgeBaseEnabled && !isMemoryViewAll.value ? (openBlock(), createBlock(AgentPanel_default, {
							key: 0,
							header: unref(i18n).baseText("agents.builder.files.title"),
							description: unref(i18n).baseText("agents.builder.files.titleTooltip")
						}, {
							default: withCtx(() => [createVNode(AgentFilesPanel_default, {
								"agent-id": __props.agentId,
								files: __props.agentFiles,
								disabled: childrenDisabled.value,
								loading: __props.agentFilesLoading,
								uploading: __props.agentFilesUploading,
								"deleting-file-id": __props.deletingAgentFileId,
								"data-testid": "agent-files-card",
								onUploadFiles: _cache[21] || (_cache[21] = ($event) => emit("upload-files", $event)),
								onDeleteFile: _cache[22] || (_cache[22] = ($event) => emit("delete-file", $event))
							}, null, 8, [
								"agent-id",
								"files",
								"disabled",
								"loading",
								"uploading",
								"deleting-file-id"
							])]),
							_: 1
						}, 8, ["header", "description"])) : createCommentVNode("", true),
						!__props.agentUnsaved ? (openBlock(), createBlock(AgentMemoryEntriesPanel_default, {
							key: 1,
							"show-all": isMemoryViewAll.value,
							"onUpdate:showAll": _cache[23] || (_cache[23] = ($event) => isMemoryViewAll.value = $event),
							"project-id": __props.projectId,
							"agent-id": __props.agentId,
							disabled: childrenDisabled.value
						}, null, 8, [
							"show-all",
							"project-id",
							"agent-id",
							"disabled"
						])) : createCommentVNode("", true),
						!isMemoryViewAll.value ? (openBlock(), createBlock(AgentPanel_default, {
							key: 2,
							header: unref(i18n).baseText("agents.builder.knowledge.advanced.title")
						}, {
							header: withCtx(({ headerId }) => [createBaseVNode("button", {
								id: headerId,
								type: "button",
								class: normalizeClass(_ctx.$style.advancedTrigger),
								"aria-expanded": isKnowledgeAdvancedExpanded.value,
								"data-testid": "agent-knowledge-advanced-trigger",
								onClick: _cache[24] || (_cache[24] = ($event) => isKnowledgeAdvancedExpanded.value = !isKnowledgeAdvancedExpanded.value)
							}, [createVNode(unref(N8nText_default), {
								tag: "span",
								bold: "",
								"data-testid": "agent-knowledge-tab-content-advanced"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.knowledge.advanced.title")), 1)]),
								_: 1
							}), createVNode(unref(N8nIcon_default), {
								icon: isKnowledgeAdvancedExpanded.value ? "chevron-up" : "chevron-down",
								size: "medium",
								color: "text-light",
								"aria-hidden": "true",
								"data-testid": "agent-knowledge-advanced-chevron"
							}, null, 8, ["icon"])], 10, _hoisted_2$3)]),
							default: withCtx(() => [isKnowledgeAdvancedExpanded.value ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(_ctx.$style.advancedContent),
								"data-testid": "agent-knowledge-advanced-content"
							}, [createVNode(AgentVectorStoresPanel_default, {
								"vector-stores": __props.localConfig?.vectorStores ?? [],
								disabled: childrenDisabled.value,
								"data-testid": "agent-vector-stores-card",
								onConnect: _cache[25] || (_cache[25] = ($event) => emit("add-vector-store")),
								onEdit: _cache[26] || (_cache[26] = ($event) => emit("edit-vector-store", $event)),
								onRemove: _cache[27] || (_cache[27] = ($event) => emit("remove-vector-store", $event))
							}, null, 8, ["vector-stores", "disabled"])], 2)) : createCommentVNode("", true)]),
							_: 1
						}, 8, ["header"])) : createCommentVNode("", true)
					]),
					_: 1
				})) : __props.activeMainTab === "sessions" ? (openBlock(), createBlock(AgentBuilderTabPanel_default, {
					key: 2,
					"data-testid": "agent-sessions-tab-content"
				}, {
					default: withCtx(() => [createVNode(AgentSessionsListView_default, {
						embedded: true,
						"project-id": __props.projectId,
						"agent-id": __props.agentId,
						"manage-store-lifecycle": false,
						"data-testid": "agent-executions-panel"
					}, null, 8, ["project-id", "agent-id"])]),
					_: 1
				})) : __props.activeMainTab === "settings" ? (openBlock(), createBlock(AgentBuilderTabPanel_default, {
					key: 3,
					"data-testid": "agent-settings-tab-content"
				}, {
					default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.settingsCards) }, [
						createVNode(AgentBudgetPanel_default, {
							config: __props.localConfig,
							"project-id": __props.projectId,
							"agent-id": __props.agentId,
							disabled: childrenDisabled.value,
							"onUpdate:config": _cache[28] || (_cache[28] = ($event) => emit("update:budget-config", $event))
						}, null, 8, [
							"config",
							"project-id",
							"agent-id",
							"disabled"
						]),
						createVNode(AgentSubAgentsPanel_default, {
							config: __props.localConfig,
							disabled: childrenDisabled.value,
							"project-id": __props.projectId,
							"agent-id": __props.agentId,
							"onUpdate:config": _cache[29] || (_cache[29] = ($event) => emit("update:config", $event))
						}, null, 8, [
							"config",
							"disabled",
							"project-id",
							"agent-id"
						]),
						isMcpAvailable.value ? (openBlock(), createBlock(unref(N8nCard_default), {
							key: 0,
							class: normalizeClass(_ctx.$style.settingsCard),
							"data-testid": "agent-settings-card"
						}, {
							default: withCtx(() => [createVNode(AgentMcpPanel_default, {
								"available-in-mcp": __props.agentAvailableInMcp ?? false,
								disabled: childrenDisabled.value,
								"data-testid": "agent-mcp-panel",
								onToggleMcpAccess: _cache[30] || (_cache[30] = ($event) => emit("toggle-mcp-access", $event))
							}, null, 8, ["available-in-mcp", "disabled"])]),
							_: 1
						}, 8, ["class"])) : createCommentVNode("", true),
						createVNode(AgentAdvancedPanel_default, {
							config: __props.localConfig,
							disabled: childrenDisabled.value,
							"project-id": __props.projectId,
							"onUpdate:config": _cache[31] || (_cache[31] = ($event) => emit("update:config", $event))
						}, null, 8, [
							"config",
							"disabled",
							"project-id"
						])
					], 2)]),
					_: 1
				})) : __props.activeMainTab === "evals" ? (openBlock(), createBlock(AgentBuilderTabPanel_default, {
					key: 4,
					"data-testid": "agent-evals-tab-content"
				}, {
					default: withCtx(() => [createVNode(AgentEvalsSection_default, {
						"project-id": __props.projectId,
						"agent-id": __props.agentId,
						"agent-unsaved": __props.agentUnsaved,
						disabled: childrenDisabled.value,
						"can-run": __props.canExecuteAgent,
						generating: __props.generatingEvalCases,
						onGenerate: _cache[32] || (_cache[32] = ($event) => emit("generate-eval-cases"))
					}, null, 8, [
						"project-id",
						"agent-id",
						"agent-unsaved",
						"disabled",
						"can-run",
						"generating"
					])]),
					_: 1
				})) : createCommentVNode("", true)], 2)
			], 2)], 10, _hoisted_1$13);
		};
	}
}), [["__cssModules", { "$style": {
	advancedTrigger: "_advancedTrigger_1r9hm_124",
	advancedContent: "_advancedContent_1r9hm_148",
	embeddedAiBuilding: "_embeddedAiBuilding_1r9hm_154",
	editorColumn: "_editorColumn_1r9hm_159",
	panelArea: "_panelArea_1r9hm_168",
	preventScroll: "_preventScroll_1r9hm_211",
	panelAreaContainer: "_panelAreaContainer_1r9hm_215",
	settingsCards: "_settingsCards_1r9hm_228",
	settingsCard: "_settingsCard_1r9hm_228",
	identityHeaderRow: "_identityHeaderRow_1r9hm_241",
	identityHeader: "_identityHeader_1r9hm_241",
	chatFirst: "_chatFirst_1r9hm_260",
	identityContent: "_identityContent_1r9hm_260",
	tabsRow: "_tabsRow_1r9hm_266",
	tabsRule: "_tabsRule_1r9hm_273",
	mainTabs: "_mainTabs_1r9hm_281",
	setupTasks: "_setupTasks_1r9hm_289"
} }]]);
//#endregion
//#region src/features/agents/components/AgentBuilderIntro.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentBuilderIntro_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBuilderIntro",
	emits: ["select"],
	setup(__props, { emit: __emit }) {
		/**
		* Welcome state for the agent builder's embedded assistant panel: says what
		* the assistant does (builds and configures the agent, rather than only
		* chatting about it) and offers one-click starter templates. The host owns
		* the apply; this component only emits the chosen template.
		*/
		const emit = __emit;
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.intro),
				"data-test-id": "instance-ai-agent-intro"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.introHeader) }, [createVNode(unref(N8nHeading_default), {
				tag: "h2",
				bold: ""
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.templates.title")), 1)]),
				_: 1
			}), createVNode(unref(N8nText_default), { color: "text-light" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.builder.templates.subtitle")), 1)]),
				_: 1
			})], 2), createVNode(AgentTemplateList_default, { onSelect: _cache[0] || (_cache[0] = ($event) => emit("select", $event)) })], 2);
		};
	}
}), [["__cssModules", { "$style": {
	intro: "_intro_mlnyb_450",
	introHeader: "_introHeader_mlnyb_456",
	fadeInUp: "_fadeInUp_mlnyb_1",
	shimmer: "_shimmer_mlnyb_1",
	spin: "_spin_mlnyb_1",
	"skeleton-pulse": "_skeleton-pulse_mlnyb_1",
	opacityPulse: "_opacityPulse_mlnyb_1",
	popoverIn: "_popoverIn_mlnyb_1",
	fadeIn: "_fadeIn_mlnyb_1",
	collapsibleSlideDown: "_collapsibleSlideDown_mlnyb_1",
	collapsibleSlideUp: "_collapsibleSlideUp_mlnyb_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_mlnyb_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_mlnyb_1",
	blurSwapIn: "_blurSwapIn_mlnyb_1",
	blurSwapOut: "_blurSwapOut_mlnyb_1",
	pulse: "_pulse_mlnyb_1",
	pulseGlow: "_pulseGlow_mlnyb_1",
	pulseGlowDelayed: "_pulseGlowDelayed_mlnyb_1",
	fade: "_fade_mlnyb_1",
	fadeInDown: "_fadeInDown_mlnyb_1",
	fadeInLeft: "_fadeInLeft_mlnyb_1",
	fadeInRight: "_fadeInRight_mlnyb_1",
	fadeOut: "_fadeOut_mlnyb_1",
	fadeOutDown: "_fadeOutDown_mlnyb_1",
	fadeOutUp: "_fadeOutUp_mlnyb_1",
	fadeOutLeft: "_fadeOutLeft_mlnyb_1",
	fadeOutRight: "_fadeOutRight_mlnyb_1",
	ping: "_ping_mlnyb_1",
	blinkBackground: "_blinkBackground_mlnyb_1",
	typingBlink: "_typingBlink_mlnyb_1"
} }]]);
//#endregion
//#region src/features/agents/components/AgentSessionHistoryDropdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/agents/components/AgentSessionHistoryDropdown.vue
var AgentSessionHistoryDropdown_default = /* @__PURE__ */ defineComponent({
	__name: "AgentSessionHistoryDropdown",
	props: {
		sessionOptions: {},
		canDeleteSession: {
			type: Boolean,
			default: false
		},
		isDeletingSession: {
			type: Boolean,
			default: false
		}
	},
	emits: ["select", "delete"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const sessionsStore = useAgentSessionsStore();
		const deleteActions = [{
			id: "delete",
			label: i18n.baseText("agentSessions.delete"),
			icon: "trash-2",
			variant: "destructive"
		}];
		const items = computed(() => props.sessionOptions.map((option) => ({
			id: option.id,
			label: option.label ?? option.title,
			disabled: option.disabled,
			data: {
				fullTitle: option.title,
				updatedAt: option.updatedAt,
				actions: !option.disabled && props.canDeleteSession ? deleteActions : void 0
			}
		})));
		const { search, filteredItems, handleSearch } = useDropdownSearch(items, {
			isSearchable: (item) => !item.disabled,
			searchFields: (item) => [item.label, item.data?.fullTitle]
		});
		const emptyText = computed(() => i18n.baseText(search.value.trim() ? "agents.builder.chat.sessionPicker.noMatch" : "agents.builder.chat.sessionPicker.empty"));
		function requestDeletion(actionId, sessionId) {
			if (actionId !== "delete" || !props.canDeleteSession || props.isDeletingSession) return;
			emit("delete", sessionId);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ChatHistoryDropdown_default, {
				items: unref(filteredItems),
				"search-placeholder": unref(i18n).baseText("agents.builder.chat.sessionPicker.searchPlaceholder"),
				"empty-text": emptyText.value,
				loading: unref(sessionsStore).loading,
				"action-button-label": unref(i18n).baseText("agentSessions.actions"),
				"actions-disabled": props.isDeletingSession,
				"content-test-id": "agent-preview-session-list",
				"data-test-id": "agent-preview-session-switcher",
				onSearch: unref(handleSearch),
				onSelect: _cache[0] || (_cache[0] = ($event) => emit("select", $event)),
				onAction: requestDeletion
			}, {
				trigger: withCtx(() => [renderSlot(_ctx.$slots, "trigger")]),
				_: 3
			}, 8, [
				"items",
				"search-placeholder",
				"empty-text",
				"loading",
				"action-button-label",
				"actions-disabled",
				"onSearch"
			]);
		};
	}
});
//#endregion
//#region src/features/agents/components/AgentTestHeader.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var AgentTestHeader_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentTestHeader",
	props: {
		agentId: {},
		agentName: {},
		agentHref: {},
		sessionTitle: {},
		sessionOptions: {},
		hasTrace: { type: Boolean },
		canDeleteSession: {
			type: Boolean,
			default: false
		},
		isDeletingSession: {
			type: Boolean,
			default: false
		}
	},
	emits: [
		"back",
		"delete-session",
		"new-session",
		"session-select",
		"view-trace"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const agentTelemetry = useAgentTelemetry();
		const breadcrumbItems = computed(function getBreadcrumbItems() {
			return [{
				id: "agent",
				label: props.agentName,
				href: props.agentHref
			}];
		});
		function goToSessionTrace() {
			emit("view-trace");
		}
		function createNewSession() {
			agentTelemetry.trackClickedNewTestChat({
				agentId: props.agentId,
				source: "standalone"
			});
			emit("new-session");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("header", {
				class: normalizeClass(_ctx.$style.header),
				"data-testid": "agent-preview-page-header"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.titleGroup) }, [createVNode(unref(N8nBreadcrumbs_default), {
				items: breadcrumbItems.value,
				theme: "medium",
				"highlight-last-item": false,
				onItemSelected: _cache[2] || (_cache[2] = ($event) => emit("back"))
			}, {
				append: withCtx(() => [createBaseVNode("span", {
					class: normalizeClass(_ctx.$style.crumbSeparator),
					"aria-hidden": "true"
				}, "/", 2), createVNode(AgentSessionHistoryDropdown_default, {
					"session-options": props.sessionOptions,
					"can-delete-session": props.canDeleteSession,
					"is-deleting-session": props.isDeletingSession,
					onSelect: _cache[0] || (_cache[0] = ($event) => emit("session-select", $event)),
					onDelete: _cache[1] || (_cache[1] = ($event) => emit("delete-session", $event))
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "ghost",
						size: "small",
						class: normalizeClass(_ctx.$style.sessionTitle),
						"aria-label": unref(i18n).baseText("agentSessions.sessionName")
					}, {
						default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.sessionTitleLabel) }, toDisplayString(props.sessionTitle || unref(i18n).baseText("agents.builder.chat.newChat.label")), 3), createVNode(unref(N8nIcon_default), {
							icon: "chevron-down",
							color: "text-light",
							size: 12
						})]),
						_: 1
					}, 8, ["class", "aria-label"])]),
					_: 1
				}, 8, [
					"session-options",
					"can-delete-session",
					"is-deleting-session"
				])]),
				_: 1
			}, 8, ["items"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [props.hasTrace ? (openBlock(), createBlock(unref(N8nTooltip_default), {
				key: 0,
				content: unref(i18n).baseText("agents.builder.preview.viewSession")
			}, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					icon: "list-tree",
					variant: "ghost",
					size: "medium",
					"aria-label": unref(i18n).baseText("agents.builder.preview.viewSession"),
					"data-testid": "agent-preview-view-trace",
					onClick: goToSessionTrace
				}, null, 8, ["aria-label"])]),
				_: 1
			}, 8, ["content"])) : createCommentVNode("", true), createVNode(unref(N8nButton_default), {
				variant: "outline",
				size: "medium",
				icon: "message-circle-plus",
				label: unref(i18n).baseText("agents.builder.chat.newChat.label"),
				"data-testid": "agent-preview-new-chat-btn",
				onClick: createNewSession
			}, null, 8, ["label"])], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_u10y0_1",
	titleGroup: "_titleGroup_u10y0_12",
	sessionTitle: "_sessionTitle_u10y0_20",
	sessionTitleLabel: "_sessionTitleLabel_u10y0_26",
	crumbSeparator: "_crumbSeparator_u10y0_34",
	actions: "_actions_u10y0_41"
} }]]);
//#endregion
//#region src/features/agents/components/AgentTestChatPage.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentTestChatPage_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentTestChatPage",
	props: {
		visible: {
			type: Boolean,
			default: true
		},
		initialized: { type: Boolean },
		projectId: {},
		agentId: {},
		agent: {},
		localConfig: {},
		connectedTriggers: {},
		effectiveSessionId: {},
		newSession: {
			type: Boolean,
			default: false
		},
		initialPrompt: {},
		placeholder: {},
		composerHeight: {},
		canSendToAssistant: { type: Boolean },
		dismissedFixToolCallIds: { default: () => [] },
		beforeSend: {},
		layout: { default: "dock" },
		budgetCards: {
			type: Boolean,
			default: false
		},
		increaseBudget: {
			type: Function,
			default: void 0
		}
	},
	emits: [
		"continue-loaded",
		"usage-updated",
		"session-created",
		"open-build",
		"send-to-assistant",
		"initial-consumed",
		"message-sent"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const standaloneBuilder = inject(AGENT_BUILDER_STANDALONE_KEY, false);
		const props = __props;
		const emit = __emit;
		const inputDraft = ref("");
		const chatPanel = useTemplateRef("chatPanel");
		function onFirstUserMessage(text) {
			if (text !== void 0) emit("message-sent");
		}
		function focusInput(options) {
			chatPanel.value?.focusInput(options);
		}
		async function getConversationMarkdown() {
			return await chatPanel.value?.getConversationMarkdown() ?? "";
		}
		function clearBudgetStops(fields) {
			chatPanel.value?.clearBudgetStops(fields);
		}
		watch([() => props.initialPrompt, chatPanel], ([prompt, panel]) => {
			if (!prompt || !panel) return;
			panel.sendMessageFromOutside(prompt);
		}, {
			immediate: true,
			flush: "post"
		});
		__expose({
			focusInput,
			getConversationMarkdown,
			clearBudgetStops
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(resolveDynamicComponent(__props.layout === "page" ? "main" : "div"), {
				class: normalizeClass([_ctx.$style.previewPage, { [_ctx.$style.pageLayout]: __props.layout === "page" }]),
				"data-testid": "agent-preview-chat-page"
			}, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.chatFrame) }, [__props.initialized && __props.effectiveSessionId ? (openBlock(), createBlock(AgentChatPanel_default, {
					key: `preview-${__props.effectiveSessionId}`,
					ref_key: "chatPanel",
					ref: chatPanel,
					"input-draft": inputDraft.value,
					"onUpdate:inputDraft": _cache[0] || (_cache[0] = ($event) => inputDraft.value = $event),
					"project-id": __props.projectId,
					"agent-id": __props.agentId,
					placeholder: __props.placeholder,
					"composer-height": __props.composerHeight,
					"attach-button-icon": unref(standaloneBuilder) ? "plus" : "paperclip",
					visible: __props.visible,
					"background-jobs-active": __props.visible,
					mode: "inline",
					"continue-session-id": __props.effectiveSessionId,
					"new-session": __props.newSession,
					"agent-config": __props.localConfig,
					"agent-status": unref(deriveAgentStatus)(__props.agent),
					"connected-triggers": __props.connectedTriggers,
					"can-send-to-assistant": __props.canSendToAssistant,
					"dismissed-fix-tool-call-ids": __props.dismissedFixToolCallIds,
					"before-send": __props.beforeSend,
					"budget-cards": __props.budgetCards,
					"increase-budget": __props.increaseBudget,
					onContinueLoaded: _cache[1] || (_cache[1] = ($event) => emit("continue-loaded", $event)),
					onUsageUpdated: _cache[2] || (_cache[2] = ($event) => emit("usage-updated", $event)),
					onSessionCreated: _cache[3] || (_cache[3] = ($event) => emit("session-created", $event)),
					onInitialConsumed: _cache[4] || (_cache[4] = ($event) => emit("initial-consumed")),
					onOpenBuild: _cache[5] || (_cache[5] = ($event) => emit("open-build")),
					onSendToAssistant: _cache[6] || (_cache[6] = ($event) => emit("send-to-assistant", $event)),
					onFirstUserMessage
				}, createSlots({ _: 2 }, [_ctx.$slots["composer-start"] ? {
					name: "composer-start",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-start")]),
					key: "0"
				} : void 0, _ctx.$slots["composer-footer"] ? {
					name: "composer-footer",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-footer")]),
					key: "1"
				} : void 0]), 1032, [
					"input-draft",
					"project-id",
					"agent-id",
					"placeholder",
					"composer-height",
					"attach-button-icon",
					"visible",
					"background-jobs-active",
					"continue-session-id",
					"new-session",
					"agent-config",
					"agent-status",
					"connected-triggers",
					"can-send-to-assistant",
					"dismissed-fix-tool-call-ids",
					"before-send",
					"budget-cards",
					"increase-budget"
				])) : createCommentVNode("", true)], 2)]),
				_: 3
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	previewPage: "_previewPage_dda05_1",
	pageLayout: "_pageLayout_dda05_10",
	chatFrame: "_chatFrame_dda05_14"
} }]]);
//#endregion
//#region src/features/agents/components/AgentTestMoreMenu.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$12 = { key: 0 };
var _hoisted_2$2 = { key: 0 };
var _hoisted_3 = { key: 1 };
var _hoisted_4 = { key: 2 };
var COPY_LINK = "copy-link";
var COPY_CONVERSATION = "copy-conversation";
var OPEN_IN_NEW_TAB = "open-in-new-tab";
var TOGGLE_FULL_WIDTH = "toggle-full-width";
var EXPORT_SESSION = "export-session";
var DELETE_SESSION = "delete-session";
var AgentTestMoreMenu_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentTestMoreMenu",
	props: {
		projectId: {},
		agentId: {},
		effectiveSessionId: {},
		hasSession: { type: Boolean },
		canDeleteSession: {
			type: Boolean,
			default: false
		},
		isDeletingSession: {
			type: Boolean,
			default: false
		},
		isFullWidth: { type: Boolean },
		hideLayoutToggle: { type: Boolean },
		isLangSmithExportEnabled: { type: Boolean },
		isExporting: { type: Boolean },
		getConversationMarkdown: {},
		usageUpdates: { default: () => ({}) }
	},
	emits: [
		"toggle-full-width",
		"export-session",
		"delete-session"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const router = useRouter();
		const clipboard = useClipboard();
		const toast = useToast();
		const sessionsStore = useAgentSessionsStore();
		const agentTelemetry = useAgentTelemetry();
		const sessionDetail = ref(null);
		const sessionMetadata = computed(() => sessionDetail.value?.thread ?? null);
		const canLinkSession = computed(function canLinkSession() {
			return props.hasSession && Boolean(props.effectiveSessionId);
		});
		const allMenuItems = computed(() => [
			{
				id: COPY_LINK,
				label: i18n.baseText("agents.builder.preview.more.copyLink"),
				icon: {
					type: "icon",
					value: "link"
				},
				disabled: !canLinkSession.value
			},
			{
				id: COPY_CONVERSATION,
				label: i18n.baseText("agents.builder.preview.more.copyConversation"),
				icon: {
					type: "icon",
					value: "copy"
				},
				disabled: !props.hasSession
			},
			{
				id: OPEN_IN_NEW_TAB,
				label: i18n.baseText("agents.builder.preview.layout.openInNewTab"),
				icon: {
					type: "icon",
					value: "external-link"
				},
				disabled: !canLinkSession.value
			},
			{
				id: TOGGLE_FULL_WIDTH,
				label: i18n.baseText("agents.builder.preview.more.fullWidth"),
				icon: props.isFullWidth ? {
					type: "icon",
					value: "minimize-2"
				} : {
					type: "icon",
					value: "maximize-2"
				},
				keepOpen: true,
				checkbox: true,
				checked: props.isFullWidth
			},
			...props.isLangSmithExportEnabled && props.hasSession && props.effectiveSessionId ? [{
				id: EXPORT_SESSION,
				label: i18n.baseText("agentSessions.langsmithExport.button"),
				icon: {
					type: "icon",
					value: "bug"
				},
				disabled: props.isExporting
			}] : [],
			...props.canDeleteSession ? [{
				id: DELETE_SESSION,
				label: i18n.baseText("agentSessions.delete"),
				icon: {
					type: "icon",
					value: "trash"
				},
				divided: true,
				destructive: true,
				disabled: !props.hasSession || !props.effectiveSessionId || props.isDeletingSession
			}] : []
		]);
		const menuItems = computed(() => allMenuItems.value.filter((item) => !props.hideLayoutToggle || item.id !== TOGGLE_FULL_WIDTH));
		const triggerLabel = computed(() => {
			const source = sessionMetadata.value?.source;
			if (!source || source === "chat" || source === "n8n_chat") return i18n.baseText("agentSessions.origin.preview");
			if (source === "instance-ai") return i18n.baseText("agentSessions.origin.instanceAi");
			if (source === "n8n_chat_production") return i18n.baseText("agentSessions.origin.n8nChat");
			if (source === "webhook") return i18n.baseText("agentSessions.origin.webhook");
			if (source === "public_api") return i18n.baseText("agentSessions.origin.publicApi");
			return source.charAt(0).toUpperCase() + source.slice(1);
		});
		const triggerIcon = computed(() => {
			switch (sessionMetadata.value?.source) {
				case "slack":
				case "telegram":
				case "linear":
				case "discord":
				case "whatsapp":
				case "teams":
				case "mcp":
				case "workflow": return sessionMetadata.value.source;
				case "webhook":
				case "public_api": return "plug";
				case "instance-ai": return "sparkles";
				case "n8n_chat_production": return "message-square";
				default: return "bolt-filled";
			}
		});
		const { usage, duration, onExecutionUpdated } = useAgentSessionUsage(() => sessionDetail.value, () => props.usageUpdates);
		const tokenSpendLabel = computed(() => formatAgentUsage(usage.value.totalTokens, usage.value.cost));
		const durationLabel = computed(() => {
			if (!Number.isFinite(duration.value) || duration.value <= 0) return "";
			if (duration.value < 1e3) return `${duration.value}ms`;
			return `${(duration.value / 1e3).toFixed(1)}s`;
		});
		useAgentExecutionUpdates({
			projectId: computed(() => props.projectId),
			agentId: computed(() => props.agentId),
			threadId: computed(() => props.effectiveSessionId)
		}, () => loadSessionMetadata(), (update) => {
			if (update.threadId === props.effectiveSessionId) onExecutionUpdated(update);
		});
		const lastMessageLabel = computed(() => {
			const updatedAt = sessionMetadata.value?.updatedAt;
			if (!updatedAt) return "—";
			const { date, time } = convertToDisplayDate(updatedAt);
			return `${date} ${time}`;
		});
		function getSessionRoute() {
			return router.resolve({
				name: AGENT_BUILDER_VIEW,
				params: {
					projectId: props.projectId,
					agentId: props.agentId
				},
				query: {
					[CONTINUE_SESSION_ID_PARAM]: props.effectiveSessionId,
					[OPEN_PREVIEW_PARAM]: "true"
				}
			});
		}
		async function copyLink() {
			try {
				const url = new URL(getSessionRoute().href, window.location.origin).href;
				await clipboard.copy(url);
				toast.showMessage({
					title: i18n.baseText("agents.builder.preview.more.linkCopied"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.preview.more.copyLinkError"));
			}
		}
		async function copyConversation() {
			try {
				const conversation = await props.getConversationMarkdown();
				if (!conversation) return;
				await clipboard.copy(conversation);
				toast.showMessage({
					title: i18n.baseText("agents.builder.preview.more.conversationCopied"),
					type: "success"
				});
			} catch (error) {
				toast.showError(error, i18n.baseText("agents.builder.preview.more.copyConversationError"));
			}
		}
		function selectMenuItem(itemId) {
			const item = menuItems.value.find((menuItem) => menuItem.id === itemId);
			if (!item || item.disabled) return;
			agentTelemetry.trackClickedPreviewMoreOption({
				agentId: props.agentId,
				option: item.id
			});
			dispatchMenuAction(item.id);
		}
		function dispatchMenuAction(itemId) {
			switch (itemId) {
				case COPY_LINK:
					copyLink();
					break;
				case COPY_CONVERSATION:
					copyConversation();
					break;
				case OPEN_IN_NEW_TAB: {
					const route = router.resolve({
						name: AGENT_PREVIEW_VIEW,
						params: {
							projectId: props.projectId,
							agentId: props.agentId
						},
						query: { [CONTINUE_SESSION_ID_PARAM]: props.effectiveSessionId }
					});
					window.open(route.href, "_blank", "noopener");
					break;
				}
				case TOGGLE_FULL_WIDTH:
					emit("toggle-full-width");
					break;
				case EXPORT_SESSION:
					emit("export-session");
					break;
				case DELETE_SESSION: emit("delete-session");
			}
		}
		let metadataRequestId = 0;
		async function loadSessionMetadata() {
			const requestId = ++metadataRequestId;
			const sessionId = props.effectiveSessionId;
			if (!sessionId) {
				sessionDetail.value = null;
				return;
			}
			try {
				const detail = await sessionsStore.getThreadDetail(props.projectId, props.agentId, sessionId);
				if (requestId === metadataRequestId) sessionDetail.value = {
					...detail,
					thread: {
						...detail.thread,
						source: detail.executions.find(function hasSource(execution) {
							return execution.source !== null;
						})?.source
					}
				};
			} catch {
				if (requestId === metadataRequestId) sessionDetail.value = null;
			}
		}
		function onMenuOpenChange(isOpen) {
			if (!isOpen) return;
			agentTelemetry.trackClickedPreviewMoreOptions({ agentId: props.agentId });
			loadSessionMetadata();
		}
		watch([
			() => props.projectId,
			() => props.agentId,
			() => props.effectiveSessionId
		], function refreshSessionMetadata() {
			sessionDetail.value = null;
			loadSessionMetadata();
		}, { immediate: true });
		watch(() => Object.values(props.usageUpdates), (updates, previous) => {
			if (updates.length === 0) return;
			const completed = updates.filter((update) => update.complete).length;
			const previouslyCompleted = previous.filter((update) => update.complete).length;
			if (!sessionDetail.value || completed !== previouslyCompleted) loadSessionMetadata();
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nTooltip_default), {
				placement: "bottom",
				content: unref(i18n).baseText("agents.builder.preview.more.label")
			}, {
				default: withCtx(() => [createVNode(unref(DropdownMenu_default), {
					items: menuItems.value,
					placement: "bottom-end",
					"extra-popper-class": _ctx.$style.moreMenu,
					onSelect: selectMenuItem,
					"onUpdate:modelValue": onMenuOpenChange
				}, {
					trigger: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "ellipsis",
						variant: "ghost",
						size: "small",
						"icon-size": "large",
						"aria-label": unref(i18n).baseText("agents.builder.preview.more.label"),
						"data-testid": "agent-preview-more-btn"
					}, null, 8, ["aria-label"])]),
					"item-trailing": withCtx(({ item }) => [item.id === TOGGLE_FULL_WIDTH ? (openBlock(), createBlock(unref(N8nSwitch_default), {
						key: 0,
						"model-value": props.isFullWidth,
						size: "small",
						tabindex: "-1",
						"aria-hidden": "true",
						class: normalizeClass(_ctx.$style.layoutSwitch)
					}, null, 8, ["model-value", "class"])) : createCommentVNode("", true)]),
					footer: withCtx(() => [createBaseVNode("ul", { class: normalizeClass(_ctx.$style.sessionMetadata) }, [
						triggerLabel.value ? (openBlock(), createElementBlock("li", _hoisted_1$12, [createVNode(unref(N8nIcon_default), {
							icon: triggerIcon.value,
							size: 12
						}, null, 8, ["icon"]), createTextVNode(toDisplayString(triggerLabel.value), 1)])) : createCommentVNode("", true),
						tokenSpendLabel.value || durationLabel.value ? (openBlock(), createElementBlock("li", {
							key: 1,
							class: normalizeClass(_ctx.$style.metrics)
						}, [
							tokenSpendLabel.value ? (openBlock(), createElementBlock("span", _hoisted_2$2, toDisplayString(tokenSpendLabel.value), 1)) : createCommentVNode("", true),
							tokenSpendLabel.value && durationLabel.value ? (openBlock(), createElementBlock("span", _hoisted_3, " • ")) : createCommentVNode("", true),
							createTextVNode(toDisplayString(durationLabel.value), 1)
						], 2)) : createCommentVNode("", true),
						sessionMetadata.value?.updatedAt ? (openBlock(), createElementBlock("li", _hoisted_4, toDisplayString(unref(i18n).baseText("agents.builder.preview.more.lastMessageSent", { interpolate: { date: lastMessageLabel.value } })), 1)) : createCommentVNode("", true)
					], 2)]),
					_: 1
				}, 8, ["items", "extra-popper-class"])]),
				_: 1
			}, 8, ["content"]);
		};
	}
}), [["__cssModules", { "$style": {
	moreMenu: "_moreMenu_28k5h_1",
	layoutSwitch: "_layoutSwitch_28k5h_5",
	metrics: "_metrics_28k5h_9",
	sessionMetadata: "_sessionMetadata_28k5h_13"
} }]]);
//#endregion
//#region src/features/agents/components/AgentTestDock.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$11 = [
	"aria-label",
	"aria-hidden",
	"inert",
	"data-preview-layout"
];
var AgentTestDock_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentTestDock",
	props: {
		sessionTitle: {},
		sessionOptions: {},
		hasSession: { type: Boolean },
		initialized: { type: Boolean },
		projectId: {},
		agentId: {},
		agent: {},
		localConfig: {},
		connectedTriggers: {},
		isOpen: { type: Boolean },
		overlay: {
			type: Boolean,
			default: false
		},
		inline: { type: Boolean },
		closable: { type: Boolean },
		placeholder: {},
		effectiveSessionId: {},
		newSession: {
			type: Boolean,
			default: false
		},
		initialPrompt: {},
		canSendToAssistant: { type: Boolean },
		dismissedFixToolCallIds: { default: () => [] },
		canDeleteSession: {
			type: Boolean,
			default: false
		},
		beforeSend: {},
		isDeletingSession: {
			type: Boolean,
			default: false
		},
		budgetCards: {
			type: Boolean,
			default: false
		},
		increaseBudget: {
			type: Function,
			default: void 0
		}
	},
	emits: [
		"view-trace",
		"new-session",
		"delete-session",
		"session-select",
		"close",
		"continue-loaded",
		"usage-updated",
		"session-created",
		"open-build",
		"send-to-assistant",
		"initial-consumed",
		"message-sent"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const usageUpdates = ref({});
		function onUsageUpdated(update) {
			if (update.sessionId !== props.effectiveSessionId) return;
			const previous = usageUpdates.value[update.executionId];
			usageUpdates.value[update.executionId] = {
				...update,
				usage: update.usage ?? previous?.usage
			};
			emit("usage-updated", usageUpdates.value[update.executionId]);
		}
		const agentTelemetry = useAgentTelemetry();
		const dock = useTemplateRef("dock");
		const { isEnabled: isLangSmithExportEnabled, isExporting, sendSession } = useAgentSessionLangSmithExport();
		const previewChatPage = useTemplateRef("previewChatPage");
		const storedLayout = useStorage("N8N_AGENT_PREVIEW_LAYOUT", "docked");
		const layout = computed(() => !props.inline && !props.overlay && storedLayout.value === "fullpage" ? "fullpage" : "docked");
		function requestActiveSessionDeletion() {
			if (!props.canDeleteSession || !props.hasSession || !props.effectiveSessionId || props.isDeletingSession) return;
			emit("delete-session", props.effectiveSessionId);
		}
		function viewTrace() {
			if (!props.hasSession || !props.effectiveSessionId) return;
			/** Dock the chat so it does not cover the session view after navigation. */
			storedLayout.value = "docked";
			emit("view-trace");
		}
		function exportSession() {
			if (!props.hasSession || !props.effectiveSessionId) return;
			sendSession({
				projectId: props.projectId,
				agentId: props.agentId,
				threadId: props.effectiveSessionId
			});
		}
		function createNewSession(source) {
			agentTelemetry.trackClickedNewTestChat({
				agentId: props.agentId,
				source
			});
			emit("new-session");
		}
		function close() {
			emit("close");
		}
		async function getConversationMarkdown() {
			return await previewChatPage.value?.getConversationMarkdown() ?? "";
		}
		function clearBudgetStops(fields) {
			previewChatPage.value?.clearBudgetStops(fields);
		}
		function toggleFullWidth() {
			if (props.overlay) return;
			storedLayout.value = layout.value === "fullpage" ? "docked" : "fullpage";
		}
		watch([
			() => props.isOpen,
			() => props.initialized,
			() => props.effectiveSessionId
		], async function focusPreviewInput([isOpen, initialized, sessionId]) {
			if (!isOpen || !initialized || !sessionId) return;
			await nextTick();
			/** preventScroll makes sure that the content doesn't jump when transitioning */
			previewChatPage.value?.focusInput({ preventScroll: true });
		}, { flush: "post" });
		/** Handle the escape shortcut locally instead of useKeybindings so it also works while inputs have focus. */
		function handleEscapeKey(event) {
			if (event.defaultPrevented || event.isComposing || event.key !== "Escape") return;
			if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
			if (!props.isOpen || props.inline && !props.closable || dock.value?.contains(event.target) !== true || event.target instanceof Element && event.target.closest("[role=\"dialog\"]") !== null) return;
			event.preventDefault();
			event.stopPropagation();
			close();
		}
		useKeybindings({ "ctrl+shift+;": {
			allowInInputs: true,
			disabled: () => !props.isOpen,
			run: () => createNewSession("shortcut")
		} });
		__expose({ clearBudgetStops });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				ref_key: "dock",
				ref: dock,
				class: normalizeClass([_ctx.$style.dock, {
					[_ctx.$style.open]: props.isOpen,
					[_ctx.$style.inline]: props.inline,
					[_ctx.$style.overlay]: props.overlay
				}]),
				"aria-label": unref(i18n).baseText("agents.builder.preview.button"),
				"aria-hidden": !props.isOpen,
				inert: !props.isOpen,
				onKeydown: handleEscapeKey,
				"data-preview-layout": layout.value,
				"data-testid": "agent-preview-dock"
			}, [createBaseVNode("div", { class: normalizeClass([_ctx.$style.dockInner, { [_ctx.$style.fullpage]: layout.value === "fullpage" }]) }, [createBaseVNode("header", {
				class: normalizeClass(_ctx.$style.header),
				"data-testid": "agent-preview-dock-header"
			}, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.sessionHistory) }, [createVNode(AgentSessionHistoryDropdown_default, {
				"session-options": props.sessionOptions,
				"can-delete-session": props.canDeleteSession,
				"is-deleting-session": props.isDeletingSession,
				onSelect: _cache[0] || (_cache[0] = ($event) => emit("session-select", $event)),
				onDelete: _cache[1] || (_cache[1] = ($event) => emit("delete-session", $event))
			}, {
				trigger: withCtx(() => [createVNode(ChatHistoryDropdownTrigger_default, {
					title: props.hasSession ? props.sessionTitle : void 0,
					"data-testid": "agent-preview-history-trigger"
				}, null, 8, ["title"])]),
				_: 1
			}, 8, [
				"session-options",
				"can-delete-session",
				"is-deleting-session"
			])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.actions) }, [
				renderSlot(_ctx.$slots, "header-actions"),
				props.hasSession && props.effectiveSessionId ? (openBlock(), createBlock(unref(N8nTooltip_default), {
					key: 0,
					content: unref(i18n).baseText("agents.builder.preview.viewSession"),
					placement: "bottom",
					"show-after": unref(500),
					"data-testid": "agent-preview-view-session-tooltip"
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "list-tree",
						variant: "ghost",
						size: "small",
						"icon-size": "large",
						"aria-label": unref(i18n).baseText("agents.builder.preview.viewSession"),
						"data-testid": "agent-preview-view-session-btn",
						onClick: viewTrace
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["content", "show-after"])) : createCommentVNode("", true),
				createVNode(KeyboardShortcutTooltip_default, {
					placement: "bottom",
					label: unref(i18n).baseText("agents.builder.chat.newChat.label"),
					shortcut: {
						metaKey: true,
						shiftKey: true,
						keys: [";"]
					}
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "message-circle-plus",
						variant: "ghost",
						size: "small",
						"icon-size": "large",
						"aria-label": unref(i18n).baseText("agents.builder.chat.newChat.label"),
						"data-testid": "agent-preview-new-chat-btn",
						onClick: _cache[2] || (_cache[2] = ($event) => createNewSession("test-panel"))
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["label"]),
				createVNode(AgentTestMoreMenu_default, {
					"project-id": props.projectId,
					"agent-id": props.agentId,
					"effective-session-id": props.effectiveSessionId,
					"has-session": props.hasSession,
					"can-delete-session": props.canDeleteSession,
					"is-deleting-session": props.isDeletingSession,
					"is-full-width": layout.value === "fullpage",
					"hide-layout-toggle": props.inline || props.overlay,
					"is-lang-smith-export-enabled": unref(isLangSmithExportEnabled),
					"is-exporting": unref(isExporting),
					"get-conversation-markdown": getConversationMarkdown,
					"usage-updates": usageUpdates.value,
					onToggleFullWidth: toggleFullWidth,
					onExportSession: exportSession,
					onDeleteSession: requestActiveSessionDeletion
				}, null, 8, [
					"project-id",
					"agent-id",
					"effective-session-id",
					"has-session",
					"can-delete-session",
					"is-deleting-session",
					"is-full-width",
					"hide-layout-toggle",
					"is-lang-smith-export-enabled",
					"is-exporting",
					"usage-updates"
				]),
				!props.inline || props.closable ? (openBlock(), createBlock(KeyboardShortcutTooltip_default, {
					key: 1,
					placement: "bottom",
					label: unref(i18n).baseText("agents.builder.preview.close.ariaLabel"),
					shortcut: {
						metaKey: false,
						shiftKey: false,
						keys: ["esc"]
					}
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "x",
						variant: "ghost",
						size: "small",
						"icon-size": "large",
						"aria-label": unref(i18n).baseText("agents.builder.preview.close.ariaLabel"),
						"data-testid": "agent-preview-close-btn",
						onClick: close
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["label"])) : createCommentVNode("", true)
			], 2)], 2), createVNode(AgentTestChatPage_default, {
				ref_key: "previewChatPage",
				ref: previewChatPage,
				visible: props.isOpen,
				placeholder: props.placeholder,
				"composer-height": props.inline ? "var(--agent-builder-composer-height)" : void 0,
				initialized: props.initialized,
				"project-id": props.projectId,
				"agent-id": props.agentId,
				agent: props.agent,
				"local-config": props.localConfig,
				"connected-triggers": props.connectedTriggers,
				"effective-session-id": props.effectiveSessionId,
				"new-session": props.newSession,
				"initial-prompt": props.initialPrompt,
				"can-send-to-assistant": props.canSendToAssistant,
				"dismissed-fix-tool-call-ids": props.dismissedFixToolCallIds,
				"before-send": props.beforeSend,
				"budget-cards": props.budgetCards,
				"increase-budget": props.increaseBudget,
				onContinueLoaded: _cache[3] || (_cache[3] = ($event) => emit("continue-loaded", $event)),
				onUsageUpdated,
				onSessionCreated: _cache[4] || (_cache[4] = ($event) => emit("session-created", $event)),
				onOpenBuild: _cache[5] || (_cache[5] = ($event) => emit("open-build")),
				onSendToAssistant: _cache[6] || (_cache[6] = ($event) => emit("send-to-assistant", $event)),
				onInitialConsumed: _cache[7] || (_cache[7] = ($event) => emit("initial-consumed")),
				onMessageSent: _cache[8] || (_cache[8] = ($event) => emit("message-sent"))
			}, createSlots({ _: 2 }, [_ctx.$slots["composer-start"] ? {
				name: "composer-start",
				fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-start")]),
				key: "0"
			} : void 0, _ctx.$slots["composer-footer"] ? {
				name: "composer-footer",
				fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-footer")]),
				key: "1"
			} : void 0]), 1032, [
				"visible",
				"placeholder",
				"composer-height",
				"initialized",
				"project-id",
				"agent-id",
				"agent",
				"local-config",
				"connected-triggers",
				"effective-session-id",
				"new-session",
				"initial-prompt",
				"can-send-to-assistant",
				"dismissed-fix-tool-call-ids",
				"before-send",
				"budget-cards",
				"increase-budget"
			])], 2)], 42, _hoisted_1$11);
		};
	}
}), [["__cssModules", { "$style": {
	dock: "_dock_1v6s7_1",
	fullpage: "_fullpage_1v6s7_13",
	dockInner: "_dockInner_1v6s7_17",
	open: "_open_1v6s7_30",
	inline: "_inline_1v6s7_41",
	overlay: "_overlay_1v6s7_55",
	header: "_header_1v6s7_67",
	sessionHistory: "_sessionHistory_1v6s7_75",
	actions: "_actions_1v6s7_79"
} }]]);
//#endregion
//#region src/features/agents/composables/useAgentVersionHistory.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var PAGE_SIZE$1 = 20;
/** Owns saved-version pagination and actions. The caller applies Agent changes to the editor. */
function useAgentVersionHistory() {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showMessage, showError } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	const { trackRevertedChangesOnAgent } = useAgentTelemetry();
	const { publish } = useAgentPublish();
	const { openVersionMetadata } = useAgentVersionMetadataModal();
	const items = ref([]);
	const isLoading = ref(false);
	const isInitialLoad = ref(true);
	const hasMore = ref(true);
	const acting = ref(false);
	const failedLoad = ref(null);
	const hasLoadError = computed(() => failedLoad.value !== null);
	const agentKey = ref("");
	let fetchedCount = 0;
	let requestToken = 0;
	async function refresh(projectId, agentId) {
		if (agentKey.value !== `${projectId}/${agentId}`) {
			agentKey.value = `${projectId}/${agentId}`;
			items.value = [];
			isInitialLoad.value = true;
			fetchedCount = 0;
		}
		failedLoad.value = null;
		const token = ++requestToken;
		isLoading.value = true;
		try {
			const data = await listAgentVersions(rootStore.restApiContext, projectId, agentId, {
				take: PAGE_SIZE$1,
				skip: 0
			});
			if (token !== requestToken) return;
			items.value = data;
			fetchedCount = data.length;
			hasMore.value = data.length === PAGE_SIZE$1;
		} catch (error) {
			if (token !== requestToken) return;
			failedLoad.value = "refresh";
			showError(error, locale.baseText("agents.versionHistory.error.load"));
		} finally {
			if (token === requestToken) {
				isLoading.value = false;
				isInitialLoad.value = false;
			}
		}
	}
	async function fetchMore(projectId, agentId) {
		if (isLoading.value || !hasMore.value || failedLoad.value === "refresh") return;
		const token = ++requestToken;
		isLoading.value = true;
		try {
			const data = await listAgentVersions(rootStore.restApiContext, projectId, agentId, {
				take: PAGE_SIZE$1,
				skip: fetchedCount
			});
			if (token !== requestToken) return;
			items.value = [...new Map([...items.value, ...data].map((item) => [item.versionId, item])).values()];
			fetchedCount += data.length;
			failedLoad.value = null;
			hasMore.value = data.length === PAGE_SIZE$1;
		} catch (error) {
			if (token !== requestToken) return;
			failedLoad.value = "fetchMore";
			showError(error, locale.baseText("agents.versionHistory.error.load"));
		} finally {
			if (token === requestToken) isLoading.value = false;
		}
	}
	async function retry(projectId, agentId) {
		if (isLoading.value) return;
		if (failedLoad.value === "refresh") await refresh(projectId, agentId);
		else if (failedLoad.value === "fetchMore") await fetchMore(projectId, agentId);
	}
	async function revertToVersion(projectId, agentId, versionId) {
		if (acting.value) return null;
		if (await openAgentConfirmationModal({
			title: locale.baseText("agents.versionHistory.revert.modal.title"),
			description: locale.baseText("agents.versionHistory.revert.modal.description"),
			confirmButtonText: locale.baseText("agents.versionHistory.revert.modal.button.revert"),
			cancelButtonText: locale.baseText("generic.cancel")
		}) !== "confirm") return null;
		acting.value = true;
		try {
			const updated = await revertAgentToVersion(rootStore.restApiContext, projectId, agentId, versionId);
			trackRevertedChangesOnAgent({ agentId });
			showMessage({
				title: locale.baseText("agents.versionHistory.revert.toast.title"),
				type: "success"
			});
			if (!agentKey.value || agentKey.value === `${projectId}/${agentId}`) await refresh(projectId, agentId);
			return updated;
		} catch (error) {
			showError(error, locale.baseText("agents.versionHistory.revert.error"));
			return null;
		} finally {
			acting.value = false;
		}
	}
	async function publishVersion(projectId, agentId, versionId) {
		if (acting.value) return null;
		acting.value = true;
		try {
			const updated = await publish(projectId, agentId, versionId, () => !agentKey.value || agentKey.value === `${projectId}/${agentId}`);
			if (updated && (!agentKey.value || agentKey.value === `${projectId}/${agentId}`)) await refresh(projectId, agentId);
			return updated;
		} finally {
			acting.value = false;
		}
	}
	async function editVersion(projectId, agentId, versionId) {
		if (acting.value) return;
		const version = items.value.find((item) => item.versionId === versionId);
		if (!version) return;
		acting.value = true;
		try {
			await openVersionMetadata({
				mode: "edit",
				versionId,
				isCurrent: () => !agentKey.value || agentKey.value === `${projectId}/${agentId}`,
				name: version.name,
				description: version.description,
				onSubmit: async (metadata) => {
					try {
						await updateAgentVersion(rootStore.restApiContext, projectId, agentId, versionId, metadata);
						if (!agentKey.value || agentKey.value === `${projectId}/${agentId}`) await refresh(projectId, agentId);
						return true;
					} catch (error) {
						showError(error, locale.baseText("agents.versionHistory.metadata.error"));
						return false;
					}
				}
			});
		} finally {
			acting.value = false;
		}
	}
	return {
		items,
		isLoading,
		isInitialLoad,
		hasMore,
		hasLoadError,
		acting,
		pageSize: PAGE_SIZE$1,
		refresh,
		fetchMore,
		retry,
		revertToVersion,
		publishVersion,
		editVersion
	};
}
//#endregion
//#region src/features/agents/components/VersionHistory/agentVersionHistory.utils.ts
var import_dateformat = /* @__PURE__ */ __toESM(require_dateformat(), 1);
function formatTimestamp(value) {
	const currentYear = (/* @__PURE__ */ new Date()).getFullYear().toString();
	const [date, time] = (0, import_dateformat.default)(value, `${value.startsWith(currentYear) ? "" : "yyyy "}mmm d"#"HH:MM:ss`).split("#");
	return {
		date,
		time
	};
}
//#endregion
//#region src/features/agents/components/VersionHistory/AgentVersionStatusIndicator.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var AgentVersionStatusIndicator_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentVersionStatusIndicator",
	props: { status: { default: "default" } },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("span", { class: normalizeClass([_ctx.$style.indicator, _ctx.$style[`indicator-${__props.status}`]]) }, null, 2);
		};
	}
}), [["__cssModules", { "$style": {
	indicator: "_indicator_a6dzc_1",
	"indicator-published": "_indicator-published_a6dzc_9",
	"indicator-latest": "_indicator-latest_a6dzc_13",
	"indicator-default": "_indicator-default_a6dzc_17"
} }]]);
//#endregion
//#region src/features/agents/components/VersionHistory/AgentPublishTimeline.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$10 = ["role"];
var _hoisted_2$1 = ["aria-label"];
var PAGE_SIZE = 20;
var AgentPublishTimeline_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentPublishTimeline",
	props: {
		projectId: {},
		agentId: {}
	},
	setup(__props, { expose: __expose }) {
		const props = __props;
		const i18n = useI18n();
		const rootStore = useRootStore();
		const toast = useToast();
		const now = useNow({ interval: 1e3 });
		const events = ref([]);
		const loading = ref(true);
		const hasMore = ref(false);
		const hasError = ref(false);
		const list = ref(null);
		const sentinel = ref(null);
		let fetchedCount = 0;
		let requestToken = 0;
		let retryRefresh = true;
		async function load(refresh = false) {
			if (!refresh && (loading.value || !hasMore.value)) return;
			const token = ++requestToken;
			loading.value = true;
			hasError.value = false;
			try {
				const data = await listAgentPublishHistory(rootStore.restApiContext, props.projectId, props.agentId, {
					take: PAGE_SIZE,
					skip: refresh ? 0 : fetchedCount
				});
				if (token !== requestToken) return;
				events.value = refresh ? data : [...new Map([...events.value, ...data].map((event) => [event.id, event])).values()];
				fetchedCount = (refresh ? 0 : fetchedCount) + data.length;
				hasMore.value = data.length === PAGE_SIZE;
			} catch (error) {
				if (token !== requestToken) return;
				hasError.value = true;
				retryRefresh = refresh;
				toast.showError(error, i18n.baseText("agents.versionHistory.timeline.error"));
			} finally {
				if (token === requestToken) loading.value = false;
			}
		}
		const { observe } = useIntersectionObserver({
			root: list,
			threshold: .01,
			onIntersect: () => {
				load();
			}
		});
		watch([
			sentinel,
			hasMore,
			() => events.value.length
		], ([target, more]) => {
			if (target && more) observe(target);
		});
		onMounted(() => {
			load(true);
		});
		onBeforeUnmount(() => {
			requestToken++;
		});
		__expose({ refresh: () => load(true) });
		const entries = computed(() => events.value.map((event) => {
			const started = new Date(event.createdAt);
			const version = event.name ?? (event.versionId ? generateVersionLabelFromId(event.versionId) : i18n.baseText("agents.versionHistory.timeline.deletedVersion"));
			const title = event.event === "activated" ? i18n.baseText("agents.versionHistory.timeline.published", { interpolate: { version } }) : i18n.baseText("agents.versionHistory.timeline.unpublished");
			const duration = event.isLegacy ? i18n.baseText("agents.versionHistory.timeline.legacyDuration") : i18n.baseText(event.event === "activated" ? "workflowHistory.publishTimeline.activeDuration" : "workflowHistory.publishTimeline.inactiveDuration", { interpolate: { duration: formatPublicationDuration(started, event.endedAt ? new Date(event.endedAt) : now.value) } });
			const { date, time } = formatTimestamp(event.createdAt);
			const timestamp = i18n.baseText("agents.versionHistory.item.createdAt", { interpolate: {
				date,
				time
			} });
			const tooltip = [
				title,
				`${event.author}, ${timestamp}`,
				event.description,
				event.isLegacy ? i18n.baseText("agents.versionHistory.timeline.legacyHint") : null
			].filter(Boolean).join("\n");
			const shortDate = (0, import_dateformat.default)(started, started.toDateString() === now.value.toDateString() ? "HH:MM" : started.getFullYear() === now.value.getFullYear() ? "d mmm" : "d mmm yyyy");
			return {
				...event,
				title,
				duration,
				tooltip,
				shortDate
			};
		}));
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "list",
				ref: list,
				class: normalizeClass(_ctx.$style.timeline),
				"data-test-id": "agent-publish-timeline"
			}, [
				loading.value && !events.value.length ? (openBlock(), createBlock(unref(N8nLoading_default), {
					key: 0,
					rows: 6,
					loading: true,
					animated: ""
				})) : !events.value.length ? (openBlock(), createElementBlock("div", {
					key: 1,
					class: normalizeClass(_ctx.$style.empty),
					role: hasError.value ? "alert" : void 0
				}, [createVNode(unref(N8nText_default), {
					size: "small",
					color: "text-base"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(hasError.value ? "agents.versionHistory.timeline.error" : "agents.versionHistory.timeline.empty")), 1)]),
					_: 1
				})], 10, _hoisted_1$10)) : (openBlock(), createElementBlock("ol", {
					key: 2,
					class: normalizeClass(_ctx.$style.entries)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(entries.value, (entry) => {
					return openBlock(), createElementBlock("li", {
						key: entry.id,
						class: normalizeClass([_ctx.$style.entry, { [_ctx.$style.active]: entry.isActive }]),
						"data-test-id": "agent-publish-timeline-entry"
					}, [createVNode(unref(N8nTooltip_default), {
						content: entry.tooltip,
						placement: "left"
					}, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.entryContent) }, [createVNode(unref(N8nText_default), {
							size: "small",
							color: "text-base",
							class: normalizeClass(_ctx.$style.duration)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(entry.duration), 1)]),
							_: 2
						}, 1032, ["class"]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.row) }, [
							createBaseVNode("span", {
								role: "img",
								"aria-label": entry.isActive ? unref(i18n).baseText("agents.versionHistory.item.publishedBadge") : entry.title,
								class: normalizeClass(_ctx.$style.marker)
							}, [createVNode(AgentVersionStatusIndicator_default, { status: entry.isActive ? "published" : "default" }, null, 8, ["status"])], 10, _hoisted_2$1),
							createVNode(unref(N8nText_default), {
								size: "small",
								bold: true,
								class: normalizeClass(_ctx.$style.title)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(entry.title), 1)]),
								_: 2
							}, 1032, ["class"]),
							createVNode(unref(N8nText_default), {
								tag: "time",
								size: "small",
								color: "text-base",
								datetime: entry.createdAt,
								class: normalizeClass(_ctx.$style.date)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(entry.shortDate), 1)]),
								_: 2
							}, 1032, ["datetime", "class"])
						], 2)], 2)]),
						_: 2
					}, 1032, ["content"])], 2);
				}), 128))], 2)),
				hasMore.value ? (openBlock(), createElementBlock("div", {
					key: 3,
					ref_key: "sentinel",
					ref: sentinel,
					class: normalizeClass(_ctx.$style.sentinel)
				}, null, 2)) : createCommentVNode("", true),
				loading.value && events.value.length ? (openBlock(), createBlock(unref(N8nLoading_default), {
					key: 4,
					rows: 1,
					loading: true
				})) : createCommentVNode("", true),
				hasError.value ? (openBlock(), createBlock(unref(N8nButton_default), {
					key: 5,
					variant: "ghost",
					disabled: loading.value,
					onClick: _cache[0] || (_cache[0] = ($event) => load(unref(retryRefresh)))
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
					_: 1
				}, 8, ["disabled"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	timeline: "_timeline_zdhzp_1",
	empty: "_empty_zdhzp_8",
	entries: "_entries_zdhzp_13",
	entry: "_entry_zdhzp_19",
	active: "_active_zdhzp_35",
	entryContent: "_entryContent_zdhzp_39",
	duration: "_duration_zdhzp_43",
	row: "_row_zdhzp_49",
	marker: "_marker_zdhzp_56",
	title: "_title_zdhzp_63",
	date: "_date_zdhzp_70",
	sentinel: "_sentinel_zdhzp_74"
} }]]);
//#endregion
//#region src/features/agents/components/VersionHistory/AgentVersionListItem.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$9 = ["aria-label"];
var AgentVersionListItem_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentVersionListItem",
	props: {
		item: {},
		actions: {}
	},
	emits: ["action"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const versionLabel = computed(() => getVersionLabel({
			workflowHistory: props.item,
			currentVersionId: props.item.isCurrent ? props.item.versionId : void 0
		}));
		const formattedCreatedAt = computed(() => {
			const { date, time } = formatTimestamp(props.item.createdAt);
			return i18n.baseText("agents.versionHistory.item.createdAt", { interpolate: {
				date,
				time
			} });
		});
		const status = computed(() => props.item.isActive ? "published" : props.item.isCurrent ? "latest" : "default");
		const statusLabel = computed(() => {
			if (props.item.isActive) return i18n.baseText("agents.versionHistory.item.publishedBadge");
			if (props.item.isCurrent) return i18n.baseText("agents.versionHistory.item.currentDraft");
			return i18n.baseText("agents.versionHistory.item.savedVersion");
		});
		const statusTooltip = computed(() => {
			const publication = props.item.lastPublished;
			if (!publication) return statusLabel.value;
			const { date, time } = formatTimestamp(publication.createdAt);
			return `${statusLabel.value}. ${i18n.baseText("agents.versionHistory.item.lastPublished", { interpolate: {
				author: publication.author,
				date,
				time
			} })}`;
		});
		function onAction(value) {
			emit("action", {
				action: value,
				versionId: props.item.versionId
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("li", {
				class: normalizeClass([_ctx.$style.item, { [_ctx.$style.current]: __props.item.isCurrent }]),
				"data-test-id": "agent-version-history-list-item"
			}, [
				createVNode(unref(N8nTooltip_default), { content: statusTooltip.value }, {
					default: withCtx(() => [createBaseVNode("span", {
						class: normalizeClass(_ctx.$style.timelineColumn),
						"aria-label": statusLabel.value,
						role: "img",
						tabindex: "0"
					}, [createVNode(AgentVersionStatusIndicator_default, { status: status.value }, null, 8, ["status"])], 10, _hoisted_1$9)]),
					_: 1
				}, 8, ["content"]),
				createBaseVNode("div", { class: normalizeClass(_ctx.$style.content) }, [
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.mainRow) }, [createVNode(unref(N8nText_default), {
						size: "small",
						bold: true,
						color: "text-dark",
						class: normalizeClass(_ctx.$style.mainLine),
						title: versionLabel.value
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(versionLabel.value), 1)]),
						_: 1
					}, 8, ["class", "title"])], 2),
					__props.item.description ? (openBlock(), createBlock(unref(N8nText_default), {
						key: 0,
						size: "small",
						color: "text-base",
						class: normalizeClass(_ctx.$style.description),
						title: __props.item.description
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.item.description), 1)]),
						_: 1
					}, 8, ["class", "title"])) : createCommentVNode("", true),
					createBaseVNode("div", { class: normalizeClass(_ctx.$style.metaRow) }, [createVNode(unref(N8nText_default), {
						size: "small",
						color: "text-base",
						class: normalizeClass(_ctx.$style.metaAuthor)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(__props.item.author) + ", ", 1)]),
						_: 1
					}, 8, ["class"]), createVNode(unref(N8nText_default), {
						tag: "time",
						size: "small",
						color: "text-base",
						class: normalizeClass(_ctx.$style.metaTime)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(formattedCreatedAt.value), 1)]),
						_: 1
					}, 8, ["class"])], 2)
				], 2),
				__props.actions.length > 0 ? (openBlock(), createBlock(unref(N8nActionToggle_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.actions),
					actions: __props.actions,
					placement: "bottom-end",
					"data-test-id": "agent-version-history-item-actions",
					onAction,
					onClick: _cache[0] || (_cache[0] = withModifiers(() => {}, ["stop"]))
				}, {
					default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
						icon: "ellipsis-12",
						variant: "ghost",
						size: "small",
						"aria-label": unref(i18n).baseText("agents.versionHistory.item.actions.label", { interpolate: { version: versionLabel.value } })
					}, null, 8, ["aria-label"])]),
					_: 1
				}, 8, ["class", "actions"])) : createCommentVNode("", true)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	item: "_item_liarv_1",
	current: "_current_liarv_23",
	description: "_description_liarv_27",
	timelineColumn: "_timelineColumn_liarv_36",
	content: "_content_liarv_44",
	mainRow: "_mainRow_liarv_51",
	mainLine: "_mainLine_liarv_57",
	metaRow: "_metaRow_liarv_63",
	metaAuthor: "_metaAuthor_liarv_71",
	metaTime: "_metaTime_liarv_78",
	actions: "_actions_liarv_82"
} }]]);
//#endregion
//#region src/features/agents/components/VersionHistory/AgentVersionList.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentVersionList_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentVersionList",
	props: {
		items: {},
		actions: {},
		activeActions: {},
		hasMore: { type: Boolean },
		isInitialLoad: { type: Boolean },
		isLoading: { type: Boolean },
		hasLoadError: { type: Boolean }
	},
	emits: [
		"action",
		"loadMore",
		"retry"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const listElement = ref(null);
		const loadMoreSentinel = ref(null);
		const canLoadMore = computed(() => props.hasMore && !props.isLoading && !props.hasLoadError);
		const { observe: observeForLoadMore } = useIntersectionObserver({
			root: listElement,
			threshold: .01,
			onIntersect: () => {
				if (canLoadMore.value) emit("loadMore");
			}
		});
		watch([
			loadMoreSentinel,
			canLoadMore,
			() => props.items.length
		], ([sentinel, canObserve]) => {
			if (sentinel && canObserve) observeForLoadMore(sentinel);
		}, { immediate: true });
		const isEmpty = computed(() => !props.isInitialLoad && !props.isLoading && props.items.length === 0);
		function getActions(item) {
			return (item.isActive ? props.activeActions : props.actions).map((action) => ({
				...action,
				disabled: action.disabled || action.value === "revert" && Boolean(item.isCurrent)
			}));
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "listElement",
				ref: listElement,
				class: normalizeClass(_ctx.$style.list),
				"data-test-id": "agent-version-history-list"
			}, [__props.isInitialLoad ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				loading: true,
				rows: 6,
				animated: ""
			})) : __props.hasLoadError && __props.items.length === 0 ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass(_ctx.$style.empty),
				role: "alert"
			}, [createVNode(unref(N8nText_default), { size: "small" }, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.versionHistory.error.load")), 1)]),
				_: 1
			}), createVNode(unref(N8nButton_default), {
				variant: "ghost",
				onClick: _cache[0] || (_cache[0] = ($event) => emit("retry"))
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
				_: 1
			})], 2)) : isEmpty.value ? (openBlock(), createElementBlock("div", {
				key: 2,
				class: normalizeClass(_ctx.$style.empty),
				"data-test-id": "agent-version-history-empty"
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-base"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("agents.versionHistory.empty")), 1)]),
				_: 1
			})], 2)) : (openBlock(), createElementBlock("ul", {
				key: 3,
				class: normalizeClass(_ctx.$style.items)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(__props.items, (item) => {
				return openBlock(), createBlock(AgentVersionListItem_default, {
					key: item.versionId,
					item,
					actions: getActions(item),
					onAction: _cache[1] || (_cache[1] = (value) => emit("action", value))
				}, null, 8, ["item", "actions"]);
			}), 128)), __props.hasMore || __props.hasLoadError || __props.isLoading ? (openBlock(), createElementBlock("li", {
				key: 0,
				ref_key: "loadMoreSentinel",
				ref: loadMoreSentinel,
				class: normalizeClass(_ctx.$style.sentinel),
				"data-test-id": "agent-version-history-sentinel"
			}, [__props.isLoading ? (openBlock(), createBlock(unref(N8nLoading_default), {
				key: 0,
				loading: true,
				rows: 1,
				animated: ""
			})) : __props.hasLoadError ? (openBlock(), createBlock(unref(N8nButton_default), {
				key: 1,
				variant: "ghost",
				onClick: _cache[2] || (_cache[2] = ($event) => emit("retry"))
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
				_: 1
			})) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 2))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	list: "_list_1ep4u_1",
	empty: "_empty_1ep4u_8",
	items: "_items_1ep4u_19",
	sentinel: "_sentinel_1ep4u_25"
} }]]);
//#endregion
//#region src/features/agents/components/VersionHistory/AgentVersionHistoryPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentVersionHistoryPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentVersionHistoryPanel",
	props: /*@__PURE__*/ mergeModels({
		projectId: {},
		agentId: {},
		currentVersionId: {},
		hasUnpublishedChanges: { type: Boolean },
		agentName: {},
		editingLocked: { type: Boolean },
		beforePublish: { type: Function }
	}, {
		"activeTab": { default: "versions" },
		"activeTabModifiers": {}
	}),
	emits: /*@__PURE__*/ mergeModels([
		"close",
		"reverted",
		"published",
		"unpublished"
	], ["update:activeTab"]),
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const i18n = useI18n();
		const activeTab = useModel(__props, "activeTab");
		const tabs = computed(() => [{
			value: "versions",
			label: i18n.baseText("workflowHistory.tab.history")
		}, {
			value: "timeline",
			label: i18n.baseText("workflowHistory.tab.publishTimeline")
		}]);
		const timeline = useTemplateRef("timeline");
		const { items, isLoading, isInitialLoad, hasMore, hasLoadError, refresh, fetchMore, retry, revertToVersion, publishVersion, editVersion } = useAgentVersionHistory();
		const { unpublish } = useAgentPublish();
		const { canUpdate, canPublish, canUnpublish } = useAgentPermissions(toRef(props, "projectId"));
		const agentCollaborationStore = useAgentCollaborationStore();
		const actions = computed(() => {
			const result = [];
			if (canUpdate.value) result.push({
				label: i18n.baseText("agents.versionHistory.item.actions.revert"),
				value: "revert",
				disabled: Boolean(props.editingLocked)
			});
			if (canPublish.value) result.push({
				label: i18n.baseText("agents.versionHistory.item.actions.publish"),
				value: "publish",
				disabled: Boolean(props.editingLocked)
			});
			if (canUpdate.value) result.push({
				label: i18n.baseText("agents.versionHistory.metadata.editTitle"),
				value: "edit",
				disabled: Boolean(props.editingLocked)
			});
			return result;
		});
		const activeActions = computed(() => {
			const result = [];
			if (canUpdate.value) result.push({
				label: i18n.baseText("agents.versionHistory.item.actions.revert"),
				value: "revert",
				disabled: Boolean(props.editingLocked) || !props.hasUnpublishedChanges
			});
			if (canUnpublish.value) result.push({
				label: i18n.baseText("agents.versionHistory.item.actions.unpublish"),
				value: "unpublish",
				disabled: Boolean(props.editingLocked)
			});
			if (canUpdate.value) result.push({
				label: i18n.baseText("agents.versionHistory.metadata.editTitle"),
				value: "edit",
				disabled: Boolean(props.editingLocked)
			});
			return result;
		});
		onMounted(() => {
			refresh(props.projectId, props.agentId);
		});
		watch(() => [
			props.projectId,
			props.agentId,
			props.currentVersionId,
			props.hasUnpublishedChanges
		], () => {
			refresh(props.projectId, props.agentId);
		});
		async function onAction({ action, versionId }) {
			if (props.editingLocked) return;
			if ((action === "revert" || action === "edit") && !canUpdate.value) return;
			if (action === "publish" && !canPublish.value) return;
			if (action === "unpublish" && !canUnpublish.value) return;
			agentCollaborationStore.requestWriteAccess();
			const { projectId, agentId } = props;
			const isCurrentAgent = () => projectId === props.projectId && agentId === props.agentId;
			if (action === "edit") await editVersion(projectId, agentId, versionId);
			else if (action === "revert") {
				const result = await revertToVersion(projectId, agentId, versionId);
				if (result && isCurrentAgent()) emit("reverted", result);
			} else if (action === "publish") {
				if (props.beforePublish && !await props.beforePublish()) return;
				if (!isCurrentAgent() || props.editingLocked) return;
				const result = await publishVersion(projectId, agentId, versionId);
				if (result && isCurrentAgent()) emit("published", result);
			} else {
				const result = await unpublish(projectId, agentId, props.agentName);
				if (result && isCurrentAgent()) {
					await refresh(projectId, agentId);
					emit("unpublished", result);
				}
			}
		}
		function onLoadMore() {
			fetchMore(props.projectId, props.agentId);
		}
		function onClose() {
			emit("close");
		}
		__expose({ refresh: async () => {
			await refresh(props.projectId, props.agentId);
			await timeline.value?.refresh();
		} });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("aside", {
				class: normalizeClass(_ctx.$style.panel),
				"data-test-id": "agent-version-history-panel"
			}, [createBaseVNode("header", { class: normalizeClass(_ctx.$style.header) }, [createVNode(unref(Tabs_default), {
				modelValue: activeTab.value,
				"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => activeTab.value = $event),
				options: tabs.value,
				size: "small",
				"data-test-id": "agent-history-tabs"
			}, null, 8, ["modelValue", "options"]), createVNode(unref(N8nTooltip_default), { content: unref(i18n).baseText("agents.versionHistory.close") }, {
				default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
					icon: "x",
					variant: "ghost",
					size: "medium",
					class: normalizeClass(_ctx.$style.closeButton),
					title: unref(i18n).baseText("agents.versionHistory.close"),
					"data-test-id": "agent-version-history-close",
					onClick: onClose
				}, null, 8, ["class", "title"])]),
				_: 1
			}, 8, ["content"])], 2), activeTab.value === "versions" ? (openBlock(), createBlock(AgentVersionList_default, {
				key: 0,
				items: unref(items),
				actions: actions.value,
				"active-actions": activeActions.value,
				"has-more": unref(hasMore),
				"has-load-error": unref(hasLoadError),
				"is-initial-load": unref(isInitialLoad),
				"is-loading": unref(isLoading),
				onAction,
				onLoadMore,
				onRetry: _cache[1] || (_cache[1] = ($event) => unref(retry)(__props.projectId, __props.agentId))
			}, null, 8, [
				"items",
				"actions",
				"active-actions",
				"has-more",
				"has-load-error",
				"is-initial-load",
				"is-loading"
			])) : (openBlock(), createBlock(AgentPublishTimeline_default, {
				key: `${__props.projectId}/${__props.agentId}`,
				ref_key: "timeline",
				ref: timeline,
				"project-id": __props.projectId,
				"agent-id": __props.agentId
			}, null, 8, ["project-id", "agent-id"]))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_av5oz_1",
	header: "_header_av5oz_14",
	closeButton: "_closeButton_av5oz_23"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/artifactThread.ts
init_runtime_core_esm_bundler();
var ArtifactThreadKey = Symbol("ArtifactThread");
function provideArtifactThread(thread) {
	provide(ArtifactThreadKey, thread);
}
/** The provided artifact thread, else the thread runtime. */
function useArtifactThread() {
	return inject(ArtifactThreadKey, null) ?? useThread();
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/assistantConfirmation.ts
init_runtime_core_esm_bundler();
/**
* Key of the n8n Assistant confirmation card. The Assistant suspends many tools
* with the same confirmation payload, so the card matches the payload shape,
* not the tool name.
*/
var ASSISTANT_CONFIRMATION_KEY = "assistant_confirmation";
/**
* Every Assistant tool suspends with these fields, and no other tool sends a
* `requestId`. `severity` is any string here, so a value that this editor does
* not know yet still renders the fallback card.
*/
var assistantSuspendSchema = objectType({
	requestId: stringType(),
	message: stringType(),
	severity: stringType()
}).passthrough();
var lenientConfirmationSchema = confirmationRequestPayloadSchema.partial().passthrough();
/**
* Parses a suspend payload as an Assistant confirmation. Returns `undefined`
* for the payloads of other tools, such as the generic approval, so they keep
* their own cards.
*/
function parseAssistantConfirmationInput(value) {
	const suspend = assistantSuspendSchema.safeParse(value);
	if (!suspend.success) return void 0;
	const payload = suspend.data;
	const { requestId, message } = payload;
	const parsed = lenientConfirmationSchema.safeParse(payload);
	if (parsed.success) return {
		...parsed.data,
		requestId,
		message
	};
	const severity = instanceAiConfirmationSeveritySchema.safeParse(payload.severity);
	const blocksAlwaysAllow = payload.targetApproval !== void 0 || payload.credentialDestination !== void 0;
	return {
		requestId,
		message,
		severity: severity.success && !blocksAlwaysAllow ? severity.data : "destructive",
		...typeof payload.toolName === "string" ? { toolName: payload.toolName } : {}
	};
}
function parseAssistantToolCall(toolCall) {
	const input = parseAssistantConfirmationInput(toolCall.suspendPayload);
	if (!input) return void 0;
	return {
		...input,
		toolName: input.toolName ?? toolCall.tool,
		args: input.args ?? (isRecord(toolCall.input) ? toolCall.input : {})
	};
}
/** The Assistant confirmation cards in the agents chat of the Assistant agent. */
var assistantConfirmationExtension = {
	key: ASSISTANT_CONFIRMATION_KEY,
	parse: parseAssistantToolCall,
	component: defineAsyncComponent(async () => await __vitePreload(() => import("./AssistantConfirmationCard-bHQqcJLQ.js"), __vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38]))),
	getProps: (input) => ({ input })
};
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/useAssistantAgentMessageTelemetry.ts
/**
* Sends `User sent builder message` for each message of an Assistant agent
* thread, with the properties of the current runtime. The host tells who wrote
* a text before it pre-fills or sends it. The chat reports each send.
*/
function useAssistantAgentMessageTelemetry(threadId) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const settingsStore = useInstanceAiSettingsStore();
	const threadsStore = useAssistantAgentThreadsStore();
	let prefill = null;
	let hostSend = null;
	function takeAuthorship(text) {
		const host = hostSend;
		hostSend = null;
		if (host?.text.trim() === text) return {
			authorship: host.authorship,
			mentionCounts: host.mentionCounts
		};
		return { authorship: resolveAuthorship(text, prefill) };
	}
	/** Returns the context of the message, which `User received AI Assistant response` repeats. */
	function trackSend({ text, files, clientContext, isFirstMessage }) {
		const { authorship, mentionCounts = EMPTY_ASSISTANT_MENTION_COUNTS } = takeAuthorship(text);
		const isPrefill = authorship.kind === "prefill";
		const attachments = Array.isArray(clientContext?.attachments) ? clientContext.attachments : [];
		const attachmentCount = files.length + attachments.length;
		const selectedElementCount = attachments.filter((a) => isRecord(a) && a.type === "element").length;
		const buildsAgent = attachments.some((attachment) => isRecord(attachment) && attachment.type === "agent") || threadTargetsAgent(threadsStore.threadsById.get(threadId)?.metadata);
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE, {
			thread_id: threadId,
			instance_id: rootStore.instanceId,
			is_first_message: isFirstMessage,
			action_source: INSTANCE_AI_THREAD_SOURCE_FALLBACK,
			prefill_type: isPrefill ? authorship.prefillType : null,
			prefill_id: isPrefill ? authorship.prefillId ?? null : null,
			prompt_modified: isPrefill ? authorship.promptModified ?? false : null,
			approval_mode: messageApprovalMode(settingsStore, buildsAgent),
			mention_counts: mentionCounts,
			attachment_count: attachmentCount,
			selected_element_count: selectedElementCount,
			runtime: "agents"
		});
		return {
			isFirstMessage,
			mentionCounts,
			attachmentCount,
			selectedElementCount
		};
	}
	return {
		/** The text that the composer shows now came from a pre-fill. Set `null` when the composer text is cleared. */
		setPrefill(next) {
			prefill = next;
		},
		/** Call before the host sends a text for the user. */
		expectHostSend(send) {
			hostSend = send;
		},
		trackSend
	};
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/useAssistantAgentTurnTelemetry.ts
init_runtime_core_esm_bundler();
/** Silence window after which an active run with no stream traffic counts as stalled. */
var GENERATION_STALL_TIMEOUT_MS = TIME.MINUTE;
/**
* Finish reasons of a run that ended without a reply. The current runtime drops
* these samples too. A run that shows a card settles on `tool-call-suspended`
* before it pauses.
*/
var DISCARDED_FINISH_REASONS = /* @__PURE__ */ new Set([
	"cancelled",
	"error",
	"guardrail",
	"paused"
]);
/**
* Sends `User received AI Assistant response` and `Builder generation stalled`
* for an Assistant agent thread, with the same rules as the current runtime.
*
* A user message starts a sample. The run that the server starts for it binds
* the sample to a run id. The sample ends when the run finishes or shows a card.
* The stream events carry no send id, so a sample binds only to a send that the
* server queued or that is still in flight.
*/
function useAssistantAgentTurnTelemetry(options) {
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	let submitted = null;
	let pending = null;
	let disposed = false;
	/** Call when the chat sends a user message. */
	function trackSubmit(context) {
		if (options.isStreaming()) return;
		if (submitted?.queued) {
			submitted = null;
			return;
		}
		submitted = {
			startedAtEpochMs: instanceAiResponseNow(),
			context,
			queued: false
		};
	}
	function settle(responseKind) {
		const response = pending;
		pending = null;
		if (!response || responseKind === null) return;
		observeInstanceAiResponseRender().then(({ atEpochMs, tabVisible }) => {
			if (disposed) return;
			const { context } = response;
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_RECEIVED_AI_ASSISTANT_RESPONSE, {
				instance_id: rootStore.instanceId,
				thread_id: options.threadId,
				run_id: response.runId,
				latency_ms: Math.max(0, Math.round(atEpochMs - response.startedAtEpochMs)),
				is_first_user_message: context.isFirstMessage,
				response_kind: responseKind,
				action_source: INSTANCE_AI_THREAD_SOURCE_FALLBACK,
				tab_visible: tabVisible,
				mention_counts: context.mentionCounts,
				attachment_count: context.attachmentCount,
				selected_element_count: context.selectedElementCount,
				runtime: "agents"
			});
		});
	}
	function handleResponseEvent(event) {
		switch (event.type) {
			case "message-queued":
				if (submitted) submitted.queued = true;
				return;
			case "execution-started":
				if (submitted && (submitted.queued || options.isSubmitting())) {
					const { startedAtEpochMs, context } = submitted;
					pending = {
						startedAtEpochMs,
						context,
						runId: event.executionId
					};
				}
				submitted = null;
				return;
			case "message-steered":
				submitted = null;
				return;
			case "tool-call-suspended":
				settle("awaiting_input");
				return;
			case "finish":
				settle(DISCARDED_FINISH_REASONS.has(event.finishReason) ? null : "completed");
				return;
			case "error":
				submitted = null;
				settle(null);
				return;
			case "done":
				settle(null);
				return;
			default: return;
		}
	}
	watch(() => options.isStreamAttached(), (attached) => {
		if (!attached) pending = null;
	}, { flush: "sync" });
	let stallTimer = null;
	const isGenerationPending = computed(() => options.isStreamAttached() && !options.hasOpenInteraction());
	function disarmStallWatchdog() {
		if (stallTimer === null) return;
		clearTimeout(stallTimer);
		stallTimer = null;
	}
	function resetStallWatchdog() {
		disarmStallWatchdog();
		if (disposed || !isGenerationPending.value) return;
		stallTimer = setTimeout(() => {
			stallTimer = null;
			telemetry.track("Builder generation stalled", {
				thread_id: options.threadId,
				runtime: "agents"
			});
		}, GENERATION_STALL_TIMEOUT_MS);
	}
	watch(isGenerationPending, resetStallWatchdog);
	onBeforeUnmount(() => {
		disposed = true;
		disarmStallWatchdog();
	});
	return {
		trackSubmit,
		/** Call with each event of the chat stream, as received. */
		handleStreamEvent(event) {
			handleResponseEvent(event);
			resetStallWatchdog();
		}
	};
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/assistantArtifactTurns.ts
/**
* Maps Agents chat messages to the input of the artifact readers: the
* artifacts panel, the previews and the resource registry. The tool names,
* inputs and outputs are the same as in the Assistant runtime.
*/
var IN_FLIGHT_STATES = /* @__PURE__ */ new Set([
	TOOL_CALL_STATE.PENDING,
	TOOL_CALL_STATE.RUNNING,
	TOOL_CALL_STATE.SUSPENDED
]);
function toolCallError(toolCall) {
	if (toolCall.state !== TOOL_CALL_STATE.ERROR) return void 0;
	if (typeof toolCall.output === "string" && toolCall.output) return toolCall.output;
	if (isRecord(toolCall.output) && typeof toolCall.output.error === "string") return toolCall.output.error;
	return "Tool call failed";
}
function toArtifactToolCall(toolCall) {
	const error = toolCallError(toolCall);
	const { toolName, args } = unwrapToolCatalogCall(toolCall.tool, isRecord(toolCall.input) ? toolCall.input : {});
	return {
		toolCallId: toolCall.toolCallId,
		toolName,
		args,
		...error === void 0 ? { result: toolCall.output } : { error },
		isLoading: IN_FLIGHT_STATES.has(toolCall.state)
	};
}
/**
* Adds the tool calls of a later message to a turn. The chat stores a message
* when a stream suspends and again when it completes, so the history can hold
* the same call twice: open, then resolved. The later copy replaces the
* earlier one, so an open copy does not keep the call in flight.
*/
function appendToolCalls(turnCalls, next) {
	for (const toolCall of next) {
		const index = toolCall.toolCallId ? turnCalls.findIndex((call) => call.toolCallId === toolCall.toolCallId) : -1;
		if (index === -1) {
			turnCalls.push(toolCall);
			continue;
		}
		const previous = turnCalls[index];
		turnCalls[index] = Object.keys(toolCall.args).length > 0 ? toolCall : {
			...toolCall,
			toolName: previous.toolName,
			args: previous.args
		};
	}
}
/** The latest task list of the thread, from the `tasks-update` host events. */
function findLatestAssistantTasks(messages) {
	for (let i = messages.length - 1; i >= 0; i--) {
		const events = messages[i].hostEvents ?? [];
		for (let j = events.length - 1; j >= 0; j--) {
			if (events[j].name !== "tasks-update") continue;
			const parsed = tasksUpdatePayloadSchema.safeParse(events[j].payload);
			if (parsed.success) return parsed.data.tasks;
		}
	}
	return null;
}
/**
* The workflows that the turn ends of the thread archived, from the
* `workflows-archived` host events. The artifacts panel marks them as archived.
*/
function findArchivedAssistantWorkflowIds(messages) {
	const workflowIds = /* @__PURE__ */ new Set();
	for (const message of messages) for (const event of message.hostEvents ?? []) {
		if (event.name !== "workflows-archived") continue;
		const parsed = workflowsArchivedPayloadSchema.safeParse(event.payload);
		if (parsed.success) for (const id of parsed.data.workflowIds) workflowIds.add(id);
	}
	return workflowIds;
}
/** The latest workflow of the turn's `setup-items` host events. */
function findAnnouncedWorkflowId(message) {
	const events = message.hostEvents ?? [];
	for (let i = events.length - 1; i >= 0; i--) {
		if (events[i].name !== "setup-items") continue;
		const parsed = setupItemsPayloadSchema.safeParse(events[i].payload);
		if (parsed.success) return parsed.data.workflowId;
	}
}
/**
* Builds the artifact turns from Agents chat messages. The chat adds a message
* for each model step, so the assistant messages after a user message make one
* turn, as on the current runtime. A lock that one step starts, such as an
* agent selection, then lasts until the run ends. While the chat streams, the
* latest assistant turn is the live one.
*/
function toAssistantArtifactTurns(messages, isStreaming) {
	const turns = [];
	for (const message of messages) {
		if (message.role === "user") {
			turns.push({
				id: message.id,
				role: "user",
				isLive: false,
				toolCalls: []
			});
			continue;
		}
		const toolCalls = (message.toolCalls ?? []).map(toArtifactToolCall);
		const announcedWorkflowId = findAnnouncedWorkflowId(message);
		const current = turns.at(-1);
		if (current?.role === "assistant") {
			appendToolCalls(current.toolCalls, toolCalls);
			if (announcedWorkflowId) current.announcedWorkflowId = announcedWorkflowId;
			continue;
		}
		turns.push({
			id: message.id,
			role: "assistant",
			isLive: false,
			toolCalls,
			...announcedWorkflowId ? { announcedWorkflowId } : {}
		});
	}
	const live = isStreaming ? turns.at(-1) : void 0;
	if (live?.role === "assistant") live.isLive = true;
	return turns;
}
//#endregion
//#region src/features/ai/instanceAi/assistantAgent/useAssistantArtifactThread.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The artifact thread of an Assistant agent thread, derived from its Agents
* chat messages and host events.
*/
function useAssistantArtifactThread(options) {
	const workflowsListStore = useWorkflowsListStore();
	const i18n = useI18n();
	const artifactTurns = computed(() => toAssistantArtifactTurns(options.messages(), options.isStreaming()));
	const currentTasks = computed(() => findLatestAssistantTasks(options.messages()));
	const isHydratingThread = computed(() => options.isLoadingHistory());
	const archivedWorkflowIds = computed(() => findArchivedAssistantWorkflowIds(options.messages()));
	const { producedArtifacts, resourceNameIndex } = useResourceRegistry(() => artifactTurns.value, {
		workflowNameLookup: (id) => workflowsListStore.getWorkflowById(id)?.name,
		archivedWorkflowIds: () => archivedWorkflowIds.value,
		pendingWorkflowAttachment: () => options.pendingWorkflowAttachment,
		agentBuilderTarget: () => options.agentTargets?.()?.bound ?? void 0,
		pendingAgentTarget: () => {
			const pending = options.agentTargets?.()?.pending;
			return pending ? {
				...pending,
				name: i18n.baseText("agents.new.defaultName")
			} : void 0;
		},
		agentBuilderTargets: () => [...options.agentTargets?.()?.targets ?? []],
		appTargets: options.appTargets
	});
	return reactive({
		id: options.threadId,
		projectId: options.projectId,
		artifactTurns,
		producedArtifacts,
		resourceNameIndex,
		pendingWorkflowAttachment: options.pendingWorkflowAttachment ?? null,
		hydrationStatus: computed(() => isHydratingThread.value ? "hydrating" : "ready"),
		isHydratingThread,
		isStreaming: computed(() => options.isStreaming()),
		isSendingMessage: false,
		activeArtifactId: computed(() => options.activeArtifactId?.()),
		currentTasks,
		consumePendingHandoff: () => void 0,
		sendMessage: async (text, opts) => {
			options.sendMessage(text, opts.authorship, opts.handoffContext);
			return true;
		},
		...createArtifactPreviewMemory()
	});
}
//#endregion
//#region src/features/ai/instanceAi/composables/useAgentMutationRefresh.ts
init_runtime_core_esm_bundler();
/**
* Signal persisted builder config mutations onto the agents event bus. Every
* successful config-mutating builder tool call (stamped configMutated by the
* backend) notifies any mounted AgentBuilderView for that agent — the artifact
* panel, or a full-page builder in another route.
*/
function useAgentMutationRefresh(thread) {
	const latestAgentConfigMutation = computed(() => getLatestAgentConfigMutation(thread.artifactTurns) ?? null);
	watch(() => latestAgentConfigMutation.value?.toolCallId, (toolCallId) => {
		if (!toolCallId || !latestAgentConfigMutation.value) return;
		if (thread.isHydratingThread) return;
		agentsEventBus.emit("agentUpdated", {
			agentId: latestAgentConfigMutation.value.agentId,
			source: "instance-ai"
		});
	}, { flush: "sync" });
}
//#endregion
//#region src/features/ai/instanceAi/composables/useBuildingArtifactIds.ts
init_runtime_core_esm_bundler();
/**
* Ids of the thread's artifacts the AI is actively mutating right now — the
* per-artifact progress signal behind the spinners on preview tabs and
* sidebar rows, so the artifact panel visibly reacts while a build is in
* flight instead of only when the change lands.
*
* Reuses the per-artifact editing-lock signals (`isAgentEditingWorkflow` /
* `isAgentEditingAgent`), so the indicator covers the same window as the
* editing lock: from the first mutating tool call until the run settles.
* Data tables have no lock signal and are not tracked.
*
* Agents selected in an active run count even before they are produced: the
* agent can read and ask about an existing draft before its first write.
*
* Pass `runtime` from the component that *provides* the thread — it can't
* inject what it provides. Everything below it just calls this with no
* argument.
*/
function useBuildingArtifactIds(runtime) {
	const thread = runtime ?? useArtifactThread();
	return computed(() => {
		const turns = thread.artifactTurns;
		const ids = getActiveSelectedAgentIds(turns);
		for (const entry of thread.producedArtifacts.values()) {
			if (entry.type !== "workflow" && entry.type !== "agent") continue;
			if (ids.has(entry.id)) continue;
			if ((entry.type === "workflow" ? isAgentEditingWorkflow : isAgentEditingAgent)(turns, entry.id)) ids.add(entry.id);
		}
		return ids;
	});
}
//#endregion
//#region src/features/ai/instanceAi/instanceAi.handoffContext.ts
function handoffContextKey(context) {
	if (context.source === "agent-preview") return `${context.source}:${context.agentId}:${context.threadId}:${context.executionId ?? ""}`;
	if (context.source === "setup-panel-execute") return `${context.source}:${context.workflowId}`;
	if (context.source === "migration-report") return `${context.source}:${context.ruleId}:${context.workflowId}`;
	return `${context.source}:${context.credential.credentialType}:${context.credential.id ?? context.credential.displayName}`;
}
function getDismissedContextKeys(metadata) {
	return Array.isArray(metadata?.dismissedContextKeys) ? metadata.dismissedContextKeys : [];
}
/**
* Prefer the agent's personalisation icon. Do not gate on `isSupportedIconName` —
* the agent icon picker allows any Lucide name, and `N8nIcon` already falls back
* for names outside the curated set.
*/
function agentPreviewContextIcon(icon) {
	const trimmed = icon?.trim();
	return trimmed ? trimmed : "robot";
}
function formatAgentPreviewContextLabel(context, t, artifactName) {
	const carriedName = context.agentName?.trim();
	const carriedTitle = context.sessionTitle?.trim();
	if (carriedName && carriedTitle) return t("instanceAi.artifactsPanel.context.agentPreviewTitled", { interpolate: {
		agentName: carriedName,
		sessionTitle: carriedTitle
	} });
	if (carriedTitle) return t("instanceAi.artifactsPanel.context.agentPreviewSessionTitled", { interpolate: { sessionTitle: carriedTitle } });
	const name = carriedName || artifactName?.trim();
	if (name) return t("instanceAi.artifactsPanel.context.agentPreviewNamed", { interpolate: { name } });
	return t("instanceAi.artifactsPanel.context.agentPreview");
}
//#endregion
//#region src/features/ai/instanceAi/embed/AssistantAgentPanelThread.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AssistantAgentPanelThread_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AssistantAgentPanelThread",
	props: {
		threadId: {},
		subject: {},
		newSession: { type: Boolean },
		placeholder: {},
		placeholderPreview: {},
		visible: {
			type: Boolean,
			default: true
		},
		composerHeight: {},
		beforeSend: {}
	},
	emits: [
		"update:building",
		"update:working",
		"message-sent",
		"content-change",
		"session-created"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		/**
		* One thread of the embedded panel on the Assistant agent. It sends the
		* subject agent with each message: as an attachment, so the Assistant knows
		* which agent the user builds, and as the subject, which binds the thread. A
		* pending agent that the user saved since then binds as saved. It exposes the
		* same calls as `InstanceAiConversation`, so the panel treats both runtimes
		* the same.
		*/
		const props = __props;
		const emit = __emit;
		const slots = useSlots();
		provide(ASSISTANT_AGENT_THREAD_ID, props.threadId);
		provide(ASSISTANT_AGENT_PROJECT_ID, props.subject.projectId);
		const i18n = useI18n();
		const rootStore = useRootStore();
		const settingsStore = useInstanceAiSettingsStore();
		const threadsStore = useAssistantAgentThreadsStore();
		const identity = useN8nAssistantIdentity();
		const messageTelemetry = useAssistantAgentMessageTelemetry(props.threadId);
		const isNewSession = ref(props.newSession);
		const agentConfig = computed(() => ({
			name: identity.name.value,
			model: "",
			instructions: ""
		}));
		const starter = consumePendingFirstMessage(props.threadId);
		if (!props.newSession) threadsStore.loadThreadCredits(props.threadId);
		let starterReferences = starter?.attachments ?? [];
		const handoffContext = ref(starter?.context ?? getPendingHandoffContext(props.threadId));
		/** The request fields of the current runtime, plus the agent that the user builds. */
		function clientContext() {
			return {
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				...rootStore.pushRef ? { pushRef: rootStore.pushRef } : {},
				browserUseAvailable: settingsStore.isBrowserUseAvailable,
				attachments: [...starterReferences, props.subject],
				subject: props.subject,
				...handoffContext.value ? { context: handoffContext.value } : {}
			};
		}
		function clearHandoff() {
			handoffContext.value = null;
			clearPendingHandoffContext(props.threadId);
			clearPendingComposerDraft(props.threadId);
		}
		/** Like the current runtime, removing the chip also removes the draft that the hand-off typed. */
		function dismissHandoff() {
			const draft = getPendingComposerDraft(props.threadId);
			if (draft) panel.value?.clearDraftIfMatches(draft.text);
			clearHandoff();
		}
		function onMessageAccepted({ clientContext }) {
			starterReferences = [];
			if (handoffContext.value && clientContext?.context === handoffContext.value) clearHandoff();
		}
		/** Like the current runtime, the composer shows a pending agent preview hand-off as a chip. */
		const handoffChip = computed(() => {
			const context = handoffContext.value;
			if (context?.source !== "agent-preview") return null;
			return {
				label: formatAgentPreviewContextLabel(context, (key, options) => i18n.baseText(key, options), context.agentId === props.subject.id ? props.subject.name : void 0),
				icon: agentPreviewContextIcon(context.agentIcon)
			};
		});
		const panel = useTemplateRef("panel");
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
		watch(panel, (current, previous) => {
			if (!current || previous) return;
			if (starter) {
				messageTelemetry.expectHostSend({
					text: starter.message,
					authorship: starter.authorship
				});
				current.sendMessageFromOutside(starter.message);
				return;
			}
			const draft = getPendingComposerDraft(props.threadId);
			if (draft) setPrefill(draft);
		});
		function setPrefill(prefill) {
			messageTelemetry.setPrefill(prefill);
			panel.value?.setDraft(prefill.text);
		}
		function onSessionCreated() {
			isNewSession.value = false;
			threadsStore.loadThread(props.threadId);
			emit("session-created");
		}
		let wasStreaming = false;
		function onStreamingChange(streaming) {
			emit("update:working", streaming);
			if (wasStreaming && !streaming) threadsStore.fetchRecent();
			wasStreaming = streaming;
		}
		const setupSavedTelemetry = useAssistantAgentSetupSavedTelemetry({
			threadId: props.threadId,
			messages: () => panel.value?.messages ?? []
		});
		provide(ASSISTANT_AGENT_SETUP_SAVED, setupSavedTelemetry.expectResult);
		const thread = useAssistantArtifactThread({
			threadId: props.threadId,
			projectId: props.subject.projectId,
			messages: () => panel.value?.messages ?? [],
			isStreaming: () => panel.value?.isStreaming ?? false,
			isLoadingHistory: () => panel.value?.isLoadingHistory ?? true,
			sendMessage: (text, authorship, context) => {
				messageTelemetry.expectHostSend({
					text,
					authorship
				});
				panel.value?.sendMessageFromOutside(text, [], context ? { context } : void 0);
			}
		});
		provideArtifactThread(thread);
		useAgentMutationRefresh(thread);
		const buildingArtifactIds = useBuildingArtifactIds(thread);
		watch(() => buildingArtifactIds.value.has(props.subject.id), (building) => emit("update:building", building), { immediate: true });
		watch(() => thread.artifactTurns.some((turn) => turn.role === "user"), (hasMessages) => {
			if (hasMessages) emit("message-sent");
		}, { immediate: true });
		const interactionExtensions = [assistantConfirmationExtension];
		__expose({
			focus: () => panel.value?.focusInput(),
			isDirty: () => panel.value?.isDirty() ?? false,
			applyHandoff(context, initialDraft) {
				stashPendingHandoffContext(props.threadId, context);
				handoffContext.value = context;
				if (initialDraft) {
					stashPendingComposerDraft(props.threadId, initialDraft);
					setPrefill(initialDraft);
				} else clearPendingComposerDraft(props.threadId);
				panel.value?.focusInput();
			},
			setPrefill,
			submitSuggestion(payload) {
				const text = payload.prompt ?? i18n.baseText(payload.promptKey);
				const prefill = {
					text,
					prefillType: payload.prefillType,
					prefillId: payload.suggestionId
				};
				messageTelemetry.expectHostSend({
					text,
					authorship: resolveAuthorship(text, prefill)
				});
				panel.value?.sendMessageFromOutside(text);
			}
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentChatPanel_default, {
				ref_key: "panel",
				ref: panel,
				"project-id": props.subject.projectId,
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
				"before-send": props.beforeSend,
				placeholder: props.placeholder,
				"placeholder-preview": props.placeholderPreview,
				visible: props.visible,
				autofocus: "",
				"composer-height": props.composerHeight,
				"data-test-id": "instance-ai-embed-assistant-agent-thread",
				onContentChange: _cache[0] || (_cache[0] = ($event) => emit("content-change", $event)),
				onSessionCreated,
				onMessageSending,
				onStreamEvent: unref(turnTelemetry).handleStreamEvent,
				onDraftCleared: _cache[1] || (_cache[1] = ($event) => unref(messageTelemetry).setPrefill(null)),
				onMessageAccepted,
				"onUpdate:streaming": onStreamingChange
			}, createSlots({ _: 2 }, [
				slots.empty ? {
					name: "empty-state",
					fn: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.emptyState) }, [renderSlot(_ctx.$slots, "empty")], 2)]),
					key: "0"
				} : void 0,
				handoffChip.value ? {
					name: "composer-attachments",
					fn: withCtx(({ chips, removeChip }) => [createVNode(InstanceAiResourceChip_default, {
						label: handoffChip.value.label,
						icon: handoffChip.value.icon,
						"remove-label": unref(i18n).baseText("generic.close"),
						"test-id": "instance-ai-handoff-context-chip",
						"remove-test-id": "instance-ai-handoff-context-chip-dismiss",
						removable: "",
						onRemove: dismissHandoff
					}, null, 8, [
						"label",
						"icon",
						"remove-label"
					]), (openBlock(true), createElementBlock(Fragment, null, renderList(chips, (chip) => {
						return openBlock(), createBlock(InstanceAiResourceChip_default, {
							key: chip.id,
							label: chip.label,
							icon: chip.icon,
							removable: "",
							"remove-label": unref(i18n).baseText("agents.chat.composer.removeChip", { interpolate: { label: chip.label } }),
							"test-id": "agent-chat-composer-chip",
							"remove-test-id": "agent-chat-composer-chip-remove",
							onRemove: ($event) => removeChip(chip.id)
						}, null, 8, [
							"label",
							"icon",
							"remove-label",
							"onRemove"
						]);
					}), 128))]),
					key: "1"
				} : void 0,
				slots["composer-start"] ? {
					name: "composer-start",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-start")]),
					key: "2"
				} : void 0,
				slots["composer-footer"] ? {
					name: "composer-footer",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-footer")]),
					key: "3"
				} : void 0
			]), 1032, [
				"project-id",
				"agent-id",
				"continue-session-id",
				"new-session",
				"agent-config",
				"accepted-mime-types",
				"before-send",
				"placeholder",
				"placeholder-preview",
				"visible",
				"composer-height",
				"onStreamEvent"
			]);
		};
	}
}), [["__cssModules", { "$style": { emptyState: "_emptyState_oyl2e_2" } }]]);
//#endregion
//#region src/features/ai/instanceAi/composables/useIsAgentWorking.ts
init_runtime_core_esm_bundler();
/**
* Whether the agent is busy anywhere in this thread — the lock signal shared by
* every artifact preview, so user edits can't race agent mutations.
*
* Thread-wide rather than per-artifact: keying off tool calls that name a
* resource id left long stretches unlocked. Hydration counts as busy, since an
* in-flight run isn't known until thread status resolves after a reload.
*
* `isAwaitingConfirmation` is deliberately unused — it can linger on
* confirmations left unresolved by a finished run. A live confirmation keeps
* `activeRunId` set, so `isStreaming` already covers that case.
*
* Pass `runtime` from the component that *provides* the thread — it can't
* inject what it provides, and forking this logic there would leave two copies
* to keep in sync. Everything below it just calls this with no argument.
*/
function useIsAgentWorking(runtime) {
	const thread = runtime ?? useArtifactThread();
	return computed(() => thread.isHydratingThread || thread.isStreaming || thread.isSendingMessage);
}
//#endregion
//#region src/features/ai/instanceAi/confirmationKinds.ts
/**
* Decides whether a pending confirmation belongs in the floating slot (takes
* over the chat input) or the inline list (renders in the chat flow).
*
* Floating: structured questions, single-click approvals, domain/web-search access,
*   and cloud browser resource-decisions.
* Inline: text, setup, credential, other gateway resource-decisions,
*   continue, channel setup.
*
* Items are inline-by-presence: if `setupRequests` / `credentialRequests` /
* `credentialFlow` / `channelConfig` / `testListener` is set, the panel renders
* a setup, credential, channel, or test-listener card regardless of `inputType`. Otherwise `inputType` drives the
* choice; an absent or `'approval'` `inputType` falls through to floating.
*/
function isPendingItemFloating(item) {
	const conf = item.toolCall.confirmation;
	if (conf.setupRequests?.length) return false;
	if (conf.credentialRequests?.length) return false;
	if (conf.credentialFlow) return false;
	if (conf.channelConfig) return false;
	if (conf.testListener) return false;
	if (conf.appBlueprint) return false;
	switch (conf.inputType) {
		case "text":
		case "continue":
		case "app-blueprint": return false;
		case "resource-decision": return isCloudBrowserResourceDecision(item);
		case "questions":
		case "approval":
		case void 0: return true;
	}
}
//#endregion
//#region src/features/ai/instanceAi/builderAgents.ts
var AGENT_ACTIVITY_KEYS = {
	creating: "instanceAi.agentActivity.creating",
	editing: "instanceAi.agentActivity.editing",
	exploring: "instanceAi.agentActivity.exploring",
	testing: "instanceAi.agentActivity.testing",
	publishing: "instanceAi.agentActivity.publishing",
	working: "instanceAi.agentActivity.working"
};
function getAgentActivityKey(node) {
	return node.activity ? AGENT_ACTIVITY_KEYS[node.activity] : void 0;
}
var BUILDER_ROLE_LABELS = {
	"agent-builder": "Building agent",
	"workflow-builder": "Building workflow"
};
/** True when the agent node is a workflow-builder or agent-builder sub-agent. */
function isBuilderAgent(node) {
	return node.kind === "builder" || node.kind === "agent-builder" || node.role === "workflow-builder" || node.role === "agent-builder";
}
function getBuilderRoleLabel(node) {
	if (!isBuilderAgent(node)) return void 0;
	return BUILDER_ROLE_LABELS[node.role];
}
/** First candidate that has content, trimmed. A blank one never wins over the next. */
function firstNonBlank(...candidates) {
	return candidates.map((candidate) => candidate?.trim()).find((candidate) => candidate);
}
/**
* Header label for a sub-agent section. Blank candidates are skipped: an empty
* title or subtitle — which older threads persisted — would otherwise leave a
* header with nothing in it but a chevron.
*/
function getAgentSectionTitle(node, activityTitle) {
	return firstNonBlank(activityTitle, node.title, getBuilderRoleLabel(node), node.targetResource?.name, node.subtitle, node.role);
}
/** True when the node is a builder sub-agent that is currently running. */
function isActiveBuilderAgent(node) {
	return isBuilderAgent(node) && node.status === "active";
}
/**
* True when the message would produce visible output in the message list.
*
* Assistant messages whose only renderable content has been extracted to the
* bottom builder section (or which haven't produced anything yet) would
* otherwise leave an empty wrapper — this predicate filters them out.
*/
function messageHasVisibleContent(message) {
	if (message.role === "user") return true;
	if (message.content) return true;
	const tree = message.agentTree;
	if (!tree) return message.isStreaming;
	if (tree.reasoning) return true;
	if (tree.statusMessage) return true;
	if (tree.status === "error" && tree.error) return true;
	if (!message.isStreaming && tree.children.some((c) => c.status === "active" && !isBuilderAgent(c))) return true;
	const activeBuilderChildIds = new Set(tree.children.filter((child) => isActiveBuilderAgent(child)).map((child) => child.agentId));
	const activeBuilderChildResponseIds = new Set(tree.timeline.filter((entry) => entry.type === "child" && entry.responseId !== void 0 && activeBuilderChildIds.has(entry.agentId)).map((entry) => entry.responseId));
	const toolCallsById = Object.fromEntries(tree.toolCalls.map((tc) => [tc.toolCallId, tc]));
	const childrenById = {};
	for (const c of tree.children) childrenById[c.agentId] = c;
	return tree.timeline.some((e) => {
		if (e.type === "tool-call") return !(toolCallsById[e.toolCallId]?.toolName === AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT && e.responseId !== void 0 && activeBuilderChildResponseIds.has(e.responseId));
		if (e.type !== "child") return true;
		const child = childrenById[e.agentId];
		return !child || !isActiveBuilderAgent(child);
	});
}
/**
* Walks every message's agent tree and returns active builder sub-agents in
* the order they appear. Used to render running builders in a dedicated bottom
* section of the conversation; completed builders stay in their natural slot.
*/
function collectActiveBuilderAgents(messages) {
	const result = [];
	const visit = (node) => {
		if (isActiveBuilderAgent(node)) result.push(node);
		for (const child of node.children) visit(child);
	};
	for (const m of messages) if (m.agentTree) visit(m.agentTree);
	return result;
}
/** True only for the fact the card endpoints return. The card moves on nothing else,
*  so a 2xx body without it counts as a failure rather than a state change. */
function isPreferenceCardEvent(value) {
	const parsed = instanceAiEventSchema.safeParse(value);
	return parsed.success && parsed.data.type === "preference-card";
}
/** True only for a tool result that wrote a row. A refusal (`ok: false`) and a
*  call that is still running both fail this check. */
function isSavedPreferenceResult(result) {
	if (typeof result !== "object" || result === null) return false;
	if (!("ok" in result) || result.ok !== true) return false;
	if (!("preference" in result)) return false;
	const preference = result.preference;
	if (typeof preference !== "object" || preference === null) return false;
	return "id" in preference && typeof preference.id === "string" && "content" in preference && typeof preference.content === "string" && "scope" in preference && aiPreferenceScopeSchema.safeParse(preference.scope).success;
}
/** True for a tool result that refused the write. Any non-empty reason counts. */
function isRejectedPreferenceResult(result) {
	if (typeof result !== "object" || result === null) return false;
	if (!("ok" in result) || result.ok !== false) return false;
	return "reason" in result && typeof result.reason === "string" && result.reason.length > 0;
}
/** A finished `save_user_preference` call, saved or refused. In flight has no card. */
function isPreferenceWriteOutcome(tc) {
	if (tc.toolName !== "save_user_preference" || tc.isLoading) return false;
	return isSavedPreferenceResult(tc.result) || isRejectedPreferenceResult(tc.result) || typeof tc.error === "string";
}
/** The card's state, text and scope, from the tool result plus any later fact.
*  Only the save tool's result counts: another tool may answer in the same shape.
*  A fact that names a scope wins over the result, so a move shows after a reload. */
function resolvePreferenceCard(tc) {
	if (tc.toolName !== "save_user_preference") return null;
	if (!isSavedPreferenceResult(tc.result)) return null;
	const saved = tc.result.preference;
	const later = tc.preferenceCard;
	const scope = later?.scope ?? saved.scope;
	const projectId = later?.scope ? later.projectId ?? null : saved.projectId ?? null;
	return {
		state: later?.state ?? "saved",
		preferenceId: saved.id,
		content: later?.content ?? saved.content,
		scope,
		projectId: scope === "project" ? projectId : null,
		userId: saved.userId ?? null
	};
}
/** The refusal the card shows. A tool that threw counts as `failed` with no message.
*  An interrupted call may have saved the row, so it is `interrupted`, not `failed`. */
function resolvePreferenceRejection(tc) {
	if (tc.toolName !== "save_user_preference" || tc.isLoading) return null;
	const attempted = typeof tc.args.content === "string" ? tc.args.content.trim() : "";
	const content = attempted.length > 0 ? attempted : void 0;
	if (isRejectedPreferenceResult(tc.result)) {
		const message = typeof tc.result.message === "string" && tc.result.message.trim().length > 0 ? tc.result.message : void 0;
		return {
			reason: tc.result.reason,
			message,
			content
		};
	}
	if (tc.result === void 0 && tc.interrupted) return {
		reason: "interrupted",
		content
	};
	if (tc.result === void 0 && typeof tc.error === "string") return {
		reason: "failed",
		content
	};
	return null;
}
//#endregion
//#region src/features/ai/instanceAi/agentTimeline.utils.ts
/** Tool calls that are internal bookkeeping and should not be shown to the user.
*  `leave-onboarding` ends the turn right after the model's reply: hiding it keeps
*  that reply a user-facing final message instead of narration before a tool call. */
var HIDDEN_TOOLS = /* @__PURE__ */ new Set([
	"updateWorkingMemory",
	"leave-onboarding",
	REMOVED_BUILDER_TOOL_NAMES.CREATE_TASKS,
	REMOVED_BUILDER_TOOL_NAMES.COMPLETE_CHECKPOINT,
	"create-tasks",
	"complete-checkpoint"
]);
/** Render hints whose tool calls produce no output in the timeline — they are
*  represented elsewhere (child agent sections, artifact cards). */
var INVISIBLE_RENDER_HINTS = /* @__PURE__ */ new Set(["data-table", "eval-setup"]);
/** Streamed tail text up to this length is treated as thinking narration;
*  beyond it, it is likely the final answer and renders outside the block. */
var TAIL_NARRATION_MAX_LENGTH = 200;
/**
* How long the transcript must stay quiet before the activity indicator shows.
*
* Short silences are normal — the tail of a streamed answer, a run wrapping up
* after its last token — and calling those "Thinking" is noise on every reply.
* A real stall is an order of magnitude longer: a provider that buffers tool
* calls goes quiet for 10s on a 4.5KB write and ~53s on a 20KB one (INS-1224).
*
* A threshold rather than a signal, because the client cannot tell the two
* apart on its own; the server knowing it is mid-generation would replace this.
*/
var ACTIVITY_INDICATOR_DELAY_MS = 5e3;
/**
* How a tool call renders in the timeline. `trace` rows join thinking blocks;
* `tasks`/`mcp-connect`/`questions`/`preference` render standalone
* UI; `hidden` calls are dropped without splitting a run.
*
* Builder calls delegated to a sub-agent (`*-with-agent`) are hidden — the
* child agent section represents them. In-thread builds (`workflow_builder_build_workflow`)
* render as trace rows so the build step is visible inside the thinking block.
*/
function classifyToolCall(tc, preferencesEnabled) {
	if (HIDDEN_TOOLS.has(tc.toolName)) return "hidden";
	if (tc.renderHint === "tasks") return "tasks";
	if (tc.renderHint === "builder" && tc.toolName.endsWith("-with-agent")) return "hidden";
	if (tc.renderHint && INVISIBLE_RENDER_HINTS.has(tc.renderHint)) return "hidden";
	if (tc.toolName === "save_user_preference") return preferencesEnabled && isPreferenceWriteOutcome(tc) ? "preference" : "hidden";
	if (tc.confirmation?.mcpConnectRequest) return "mcp-connect";
	if (tc.confirmation?.appBlueprint) return "app-blueprint";
	if (tc.confirmation?.inputType === "questions") return tc.isLoading ? "questions-pending" : "questions";
	return "trace";
}
function hasBuilderChildInResponse(responseId, builderChildResponseIds) {
	return responseId !== void 0 && builderChildResponseIds.has(responseId);
}
function buildTimelineBlocks(entries, toolCallsById, childrenById, agentStatus, preferencesEnabled) {
	const lastTraceIdxByResponse = /* @__PURE__ */ new Map();
	let firstTraceIdx;
	const markTrace = (responseId, idx) => {
		lastTraceIdxByResponse.set(responseId, idx);
		firstTraceIdx ??= idx;
	};
	const builderChildResponseIds = new Set(entries.filter((entry) => entry.type === "child" && entry.responseId !== void 0 && !!childrenById[entry.agentId] && isBuilderAgent(childrenById[entry.agentId])).map((entry) => entry.responseId).filter((responseId) => responseId !== void 0));
	entries.forEach((entry, idx) => {
		if (entry.responseId === void 0) return;
		if (entry.type === "reasoning") markTrace(entry.responseId, idx);
		else if (entry.type === "tool-call") {
			const tc = toolCallsById[entry.toolCallId];
			if (tc && classifyToolCall(tc, preferencesEnabled) === "trace" && tc.confirmation === void 0 && !(tc.toolName === AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT && hasBuilderChildInResponse(entry.responseId, builderChildResponseIds))) markTrace(entry.responseId, idx);
		}
	});
	const isIntermediateText = (entry, idx) => {
		if (entry.responseId === void 0) return false;
		const lastTraceIdx = lastTraceIdxByResponse.get(entry.responseId);
		if (lastTraceIdx !== void 0 && lastTraceIdx > idx) return true;
		return agentStatus === "active" && idx === entries.length - 1 && firstTraceIdx !== void 0 && firstTraceIdx < idx && entry.content.length <= TAIL_NARRATION_MAX_LENGTH;
	};
	const blocks = [];
	let run = null;
	const pushStandalone = (block) => {
		run = null;
		blocks.push(block);
	};
	const pushTrace = (entry, idx) => {
		if (!run) {
			run = {
				type: "thinking",
				key: `thinking-${idx}`,
				entries: [],
				active: false
			};
			blocks.push(run);
		}
		run.entries.push(entry);
	};
	entries.forEach((entry, idx) => {
		if (entry.type === "reasoning") {
			pushTrace(entry, idx);
			return;
		}
		if (entry.type === "instance-context" || entry.type === "skill-update") {
			pushTrace(entry, idx);
			return;
		}
		if (entry.type === "text") {
			if (isIntermediateText(entry, idx)) pushTrace(entry, idx);
			else pushStandalone({
				type: "text",
				key: `text-${idx}`,
				entry
			});
			return;
		}
		if (entry.type === "child") {
			const child = childrenById[entry.agentId];
			if (child && !isCloudBrowserAgent(child) && !isActiveBuilderAgent(child)) pushStandalone({
				type: "child",
				key: `child-${idx}`,
				child
			});
			return;
		}
		const tc = toolCallsById[entry.toolCallId];
		if (!tc) return;
		if (tc.toolName === AGENT_BUILDER_TOOL_NAMES.BUILD_AGENT && hasBuilderChildInResponse(entry.responseId, builderChildResponseIds)) return;
		switch (classifyToolCall(tc, preferencesEnabled)) {
			case "tasks":
				pushStandalone({
					type: "tasks",
					key: `tasks-${idx}`,
					toolCall: tc
				});
				return;
			case "mcp-connect":
				pushStandalone({
					type: "mcp-connect",
					key: `mcp-connect-${idx}`,
					toolCall: tc
				});
				return;
			case "app-blueprint":
				pushStandalone({
					type: "app-blueprint",
					key: `app-blueprint-${idx}`,
					toolCall: tc
				});
				return;
			case "questions":
				pushStandalone({
					type: "questions",
					key: `questions-${idx}`,
					toolCall: tc
				});
				return;
			case "preference":
				pushStandalone({
					type: "preference",
					key: `preference-${idx}`,
					toolCall: tc
				});
				return;
			case "trace":
				pushTrace(entry, idx);
				return;
			default: return;
		}
	});
	if (agentStatus === "active") {
		let activated = false;
		let settledByNarrationCap = false;
		for (let i = blocks.length - 1; i >= 0; i--) {
			const block = blocks[i];
			if (block.type === "thinking") {
				block.active = true;
				activated = true;
				break;
			}
			if (block.type !== "text") break;
			if (block.entry.content.length > TAIL_NARRATION_MAX_LENGTH) {
				settledByNarrationCap = true;
				break;
			}
		}
		if (!activated && settledByNarrationCap) blocks.push({
			type: "activity",
			key: "activity"
		});
	}
	return blocks;
}
/**
* True while `entry` is the timeline entry still receiving stream deltas.
* The reducer only ever appends to an agent's LAST timeline entry, so any
* entry before the tail is settled — even while the agent itself is still
* active (e.g. text written before a tool call or an HITL pause). Used to
* scope the markdown decoration deferral to the one actively-growing block.
*/
function isStreamingTimelineEntry(agentNode, entry) {
	return agentNode.status === "active" && entry === agentNode.timeline.at(-1);
}
/** The workflow a workflow_builder_build_workflow / submit-workflow call wrote, if it wrote one. */
function workflowArtifactFromToolCall(tc) {
	if (tc.toolName !== WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW && tc.toolName !== REMOVED_BUILDER_TOOL_NAMES.SUBMIT_WORKFLOW) return void 0;
	if (!tc.result || typeof tc.result !== "object") return void 0;
	const result = tc.result;
	if (typeof result.workflowId !== "string") return void 0;
	const name = firstNonBlank(typeof result.workflowName === "string" ? result.workflowName : void 0, typeof tc.args?.name === "string" ? tc.args.name : void 0) ?? "Untitled";
	return {
		type: "workflow",
		resourceId: result.workflowId,
		name,
		completedAt: tc.completedAt
	};
}
/**
* Workflows the agent built with its own tool calls, not through a sub-agent.
* Only successful builds count, each workflow once.
*/
function extractBuiltWorkflowArtifacts(toolCalls) {
	const artifacts = /* @__PURE__ */ new Map();
	for (const tc of toolCalls) {
		if (tc.result?.success === false) continue;
		const workflow = workflowArtifactFromToolCall(tc);
		if (workflow && !artifacts.has(workflow.resourceId)) artifacts.set(workflow.resourceId, workflow);
	}
	return [...artifacts.values()];
}
/** The Agent an orchestrator builder call created or changed, if it did. */
function agentArtifactFromToolCall(tc) {
	if (tc.isLoading || !isRecord(tc.result)) return void 0;
	const result = tc.result;
	if (typeof result.agentId !== "string") return void 0;
	if (!(tc.toolName === AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT ? result.ok === true && result.agentChange === "created" : result.configMutated === true)) return void 0;
	return {
		type: "agent",
		resourceId: result.agentId,
		name: typeof result.agentName === "string" ? result.agentName : "",
		...typeof result.projectId === "string" ? { projectId: result.projectId } : {},
		completedAt: tc.completedAt
	};
}
/**
* Agents the orchestrator created or changed with its own builder tool calls.
* Each Agent appears once, with the name and project of its latest change.
*/
function extractBuiltAgentArtifacts(toolCalls) {
	const artifacts = /* @__PURE__ */ new Map();
	for (const tc of toolCalls) {
		const agent = agentArtifactFromToolCall(tc);
		if (!agent) continue;
		const previous = artifacts.get(agent.resourceId);
		artifacts.set(agent.resourceId, {
			...agent,
			name: firstNonBlank(agent.name, previous?.name) ?? "Untitled",
			projectId: agent.projectId ?? previous?.projectId
		});
	}
	return [...artifacts.values()];
}
/** Extract all artifacts (workflows, data tables, and agents) from a node's tool calls. */
function extractArtifacts(node) {
	if (node.status !== "completed") return [];
	const artifacts = [];
	const seenIds = /* @__PURE__ */ new Set();
	if (node.targetResource?.id && node.targetResource.type && (node.targetResource.type !== "agent" || node.agentChange === "created" || node.agentChange === "updated" || node.agentChange === void 0)) {
		const type = node.targetResource.type;
		if (type === "workflow" || type === "data-table" || type === "agent") {
			seenIds.add(node.targetResource.id);
			const artifact = {
				type,
				resourceId: node.targetResource.id,
				name: firstNonBlank(node.targetResource.name, node.subtitle) ?? "Untitled",
				completedAt: void 0
			};
			if (node.targetResource.projectId) artifact.projectId = node.targetResource.projectId;
			artifacts.push(artifact);
		}
	}
	for (const tc of node.toolCalls) {
		if (!tc.result || typeof tc.result !== "object") continue;
		const result = tc.result;
		const workflow = workflowArtifactFromToolCall(tc);
		if (workflow) {
			if (!seenIds.has(workflow.resourceId)) {
				seenIds.add(workflow.resourceId);
				artifacts.push(workflow);
			}
			continue;
		}
		let tableId;
		let tableName;
		let tableProjectId;
		if (typeof result.tableId === "string") tableId = result.tableId;
		if (typeof result.dataTableId === "string") tableId = result.dataTableId;
		if (typeof result.name === "string") tableName = result.name;
		if (typeof result.tableName === "string") tableName = result.tableName;
		if (typeof result.projectId === "string") tableProjectId = result.projectId;
		const table = result.table;
		if (table && typeof table === "object") {
			const t = table;
			if (typeof t.id === "string") tableId = t.id;
			if (typeof t.name === "string") tableName = t.name;
			if (typeof t.projectId === "string") tableProjectId = t.projectId;
		}
		if (tableId && !seenIds.has(tableId)) {
			seenIds.add(tableId);
			artifacts.push({
				type: "data-table",
				resourceId: tableId,
				name: firstNonBlank(tableName) ?? "Untitled",
				projectId: tableProjectId,
				completedAt: tc.completedAt
			});
		}
	}
	for (const child of node.children) for (const artifact of extractArtifacts(child)) if (!seenIds.has(artifact.resourceId)) {
		seenIds.add(artifact.resourceId);
		artifacts.push(artifact);
	}
	return artifacts;
}
var ButtonLike_vue_vue_type_style_index_0_lang_module_default = { buttonLike: "_buttonLike_1rc9v_2" };
//#endregion
//#region src/features/ai/instanceAi/components/ButtonLike.vue
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _sfc_main = {};
function _sfc_render(_ctx, _cache) {
	return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.buttonLike) }, [renderSlot(_ctx.$slots, "default")], 2);
}
var ButtonLike_default = /*#__PURE__*/ _plugin_vue_export_helper_default(_sfc_main, [["render", _sfc_render], ["__cssModules", { "$style": ButtonLike_vue_vue_type_style_index_0_lang_module_default }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiMarkdown.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiMarkdown.vue
var InstanceAiMarkdown_default = /* @__PURE__ */ defineComponent({
	__name: "InstanceAiMarkdown",
	props: {
		content: {},
		agentPreviewTarget: {},
		streaming: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const thread = useThread();
		const artifactLinks = useArtifactLinks();
		const openWorkflowPreview = inject("openWorkflowPreview", void 0);
		const openDataTablePreview = inject("openDataTablePreview", void 0);
		const openAgentPreview = inject("openAgentPreview", void 0);
		const openAgentChatPreview = inject("openAgentChatPreview", void 0);
		const openSkillPreview = inject("openSkillPreview", void 0);
		const openAppPreview = inject("openAppPreview", void 0);
		return (_ctx, _cache) => {
			return openBlock(), createBlock(ChatMarkdown_default, {
				content: props.content,
				streaming: props.streaming,
				resources: [...unref(thread).resourceNameIndex.values()],
				"linkable-resources": [...unref(thread).linkableResourceNameIndex.values()],
				"agent-preview-target": props.agentPreviewTarget,
				"open-workflow-preview": unref(openWorkflowPreview),
				"open-data-table-preview": unref(openDataTablePreview),
				"open-agent-preview": unref(openAgentPreview),
				"open-agent-chat-preview": unref(openAgentChatPreview),
				"open-skill-preview": unref(openSkillPreview),
				"open-app-preview": unref(openAppPreview),
				"artifact-links": unref(artifactLinks),
				options: {
					math: true,
					footnotes: "pill"
				},
				"filter-internal-blocks": true
			}, null, 8, [
				"content",
				"streaming",
				"resources",
				"linkable-resources",
				"agent-preview-target",
				"open-workflow-preview",
				"open-data-table-preview",
				"open-agent-preview",
				"open-agent-chat-preview",
				"open-skill-preview",
				"open-app-preview",
				"artifact-links"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/ToolResultJson.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var import_FileSaver_min = /* @__PURE__ */ __toESM(require_FileSaver_min(), 1);
var _hoisted_1$8 = ["innerHTML"];
/**
* Maximum number of characters to render in the DOM.
* Beyond this threshold the JSON is truncated to prevent browser freezes.
*/
var MAX_JSON_DISPLAY_LENGTH = 1e5;
var ToolResultJson_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolResultJson",
	props: { value: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		function escapeHtml(text) {
			return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
		}
		/**
		* Recursively build syntax-highlighted HTML from a JSON value.
		* Uses a structural walk instead of regex to avoid catastrophic
		* backtracking on large payloads.
		*/
		function highlightJson(value, indent = 0) {
			const pad = "  ".repeat(indent);
			const padInner = "  ".repeat(indent + 1);
			if (value === null) return "<span class=\"json-bool\">null</span>";
			if (typeof value === "boolean") return `<span class="json-bool">${value}</span>`;
			if (typeof value === "number") return `<span class="json-number">${value}</span>`;
			if (typeof value === "string") return `<span class="json-string">&quot;${escapeHtml(value)}&quot;</span>`;
			if (Array.isArray(value)) {
				if (value.length === 0) return "[]";
				return `[\n${value.map((v) => `${padInner}${highlightJson(v, indent + 1)}`).join(",\n")}\n${pad}]`;
			}
			if (typeof value === "object") {
				const entries = Object.entries(value);
				if (entries.length === 0) return "{}";
				return `{\n${entries.map(([k, v]) => `${padInner}<span class="json-key">&quot;${escapeHtml(k)}&quot;</span>: ${highlightJson(v, indent + 1)}`).join(",\n")}\n${pad}}`;
			}
			return escapeHtml(String(value));
		}
		const jsonString = computed(() => {
			return JSON.stringify(props.value, null, 2) ?? String(props.value);
		});
		const isTruncated = computed(() => jsonString.value.length > MAX_JSON_DISPLAY_LENGTH);
		const highlighted = computed(() => {
			return highlightJson(isTruncated.value ? jsonString.value.slice(0, MAX_JSON_DISPLAY_LENGTH) : jsonString.value);
		});
		function downloadFullJson() {
			const blob = new Blob([jsonString.value], { type: "application/json" });
			(0, import_FileSaver_min.saveAs)(blob, "tool-result.json");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(AiActivityStepResultSection_default), null, {
				default: withCtx(() => [createBaseVNode("pre", {
					class: normalizeClass(_ctx.$style.json),
					innerHTML: highlighted.value
				}, null, 10, _hoisted_1$8), isTruncated.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.truncatedNotice)
				}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.truncatedText) }, toDisplayString(unref(i18n).baseText("instanceAi.toolResult.dataTruncated")), 3), createVNode(unref(N8nButton_default), {
					variant: "outline",
					size: "mini",
					label: unref(i18n).baseText("runData.downloadBinaryData"),
					onClick: downloadFullJson
				}, null, 8, ["label"])], 2)) : createCommentVNode("", true)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	json: "_json_dhcoz_1",
	truncatedNotice: "_truncatedNotice_dhcoz_11",
	truncatedText: "_truncatedText_dhcoz_18"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/ToolResultTable.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var MAX_ROWS = 20;
var ToolResultTable_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolResultTable",
	props: { rows: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const headers = computed(() => {
			if (props.rows.length === 0) return [];
			return Object.keys(props.rows[0]);
		});
		const displayRows = computed(() => props.rows.slice(0, MAX_ROWS));
		const hasMore = computed(() => props.rows.length > MAX_ROWS);
		function formatCell(value) {
			if (value === null || value === void 0) return "—";
			if (typeof value === "boolean") return value ? "Yes" : "No";
			if (typeof value === "object") return JSON.stringify(value);
			return String(value);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.wrapper) }, [createBaseVNode("table", { class: normalizeClass(_ctx.$style.table) }, [createBaseVNode("thead", null, [createBaseVNode("tr", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(headers.value, (header) => {
				return openBlock(), createElementBlock("th", {
					key: header,
					class: normalizeClass(_ctx.$style.th)
				}, toDisplayString(header), 3);
			}), 128))])]), createBaseVNode("tbody", null, [(openBlock(true), createElementBlock(Fragment, null, renderList(displayRows.value, (row, idx) => {
				return openBlock(), createElementBlock("tr", {
					key: idx,
					class: normalizeClass(_ctx.$style.tr)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(headers.value, (header) => {
					return openBlock(), createElementBlock("td", {
						key: header,
						class: normalizeClass(_ctx.$style.td)
					}, toDisplayString(formatCell(row[header])), 3);
				}), 128))], 2);
			}), 128))])], 2), hasMore.value ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.more)
			}, toDisplayString(unref(i18n).baseText("instanceAi.toolResult.moreRows", { interpolate: { count: String(props.rows.length - MAX_ROWS) } })), 3)) : createCommentVNode("", true)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_q87hj_1",
	table: "_table_q87hj_7",
	th: "_th_q87hj_14",
	tr: "_tr_q87hj_28",
	td: "_td_q87hj_32",
	more: "_more_q87hj_41"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/ToolResultCode.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ToolResultCode_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolResultCode",
	props: { code: {} },
	setup(__props) {
		const props = __props;
		const clipboard = useClipboard();
		const copied = ref(false);
		async function handleCopy() {
			await clipboard.copy(props.code);
			copied.value = true;
			setTimeout(() => {
				copied.value = false;
			}, 2e3);
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.wrapper) }, [createVNode(unref(N8nIconButton_default), {
				icon: copied.value ? "check" : "copy",
				variant: "ghost",
				size: "xsmall",
				class: normalizeClass(_ctx.$style.copyBtn),
				onClick: handleCopy
			}, null, 8, ["icon", "class"]), createBaseVNode("pre", { class: normalizeClass(_ctx.$style.code) }, toDisplayString(props.code), 3)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_fhwvd_1",
	copyBtn: "_copyBtn_fhwvd_5",
	code: "_code_fhwvd_16"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/ToolResultImage.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$7 = ["src"];
var ToolResultImage_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolResultImage",
	props: {
		data: {},
		mimeType: {}
	},
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("img", {
				src: `data:${__props.mimeType};base64,${__props.data}`,
				class: normalizeClass(_ctx.$style.image)
			}, null, 10, _hoisted_1$7);
		};
	}
}), [["__cssModules", { "$style": { image: "_image_1l1xi_2" } }]]);
//#endregion
//#region src/features/ai/instanceAi/components/ToolResultFile.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$6 = ["src", "title"];
var ToolResultFile_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolResultFile",
	props: {
		data: {},
		mimeType: {}
	},
	setup(__props) {
		const i18n = useI18n();
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("iframe", {
				src: `data:${__props.mimeType};base64,${__props.data}`,
				class: normalizeClass(_ctx.$style.file),
				title: unref(i18n).baseText("binaryDataDisplay.filePreview")
			}, null, 10, _hoisted_1$6);
		};
	}
}), [["__cssModules", { "$style": { file: "_file_vywdb_2" } }]]);
//#endregion
//#region src/features/ai/instanceAi/components/ToolResultText.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$5 = ["textContent"];
var ToolResultText_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolResultText",
	props: { text: {} },
	setup(__props) {
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("pre", {
				class: normalizeClass(_ctx.$style.text),
				textContent: toDisplayString(__props.text)
			}, null, 10, _hoisted_1$5);
		};
	}
}), [["__cssModules", { "$style": { text: "_text_1xlo6_2" } }]]);
//#endregion
//#region src/features/ai/instanceAi/components/ToolResultRenderer.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var ToolResultRenderer_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ToolResultRenderer",
	props: {
		result: {},
		toolName: {},
		toolArgs: {}
	},
	setup(__props) {
		const props = __props;
		function resolvedToolName() {
			return resolveBuilderToolName(props.toolName, props.toolArgs?.action);
		}
		function isAction(family, action) {
			return resolveBuilderToolName(props.toolName) === family && props.toolArgs?.action === action;
		}
		function normalizeImageContentItem(item) {
			if (typeof item.data !== "string") return null;
			switch (item.type) {
				case "image": return typeof item.mimeType === "string" ? {
					type: "image",
					data: item.data,
					mimeType: item.mimeType
				} : null;
				case "image-data": return typeof item.mediaType === "string" ? {
					type: "image",
					data: item.data,
					mimeType: item.mediaType
				} : null;
				case "media":
				case "file-data": return typeof item.mediaType === "string" && item.mediaType.startsWith("image/") ? {
					type: "image",
					data: item.data,
					mimeType: item.mediaType
				} : null;
				default: return null;
			}
		}
		function normalizeContentItem(item) {
			if (!isRecord(item) || typeof item.type !== "string") return null;
			if (item.type === "text" && typeof item.text === "string") return {
				type: "text",
				text: item.text
			};
			if (item.type === "file" && typeof item.mediaType === "string" && isRecord(item.data) && item.data.type === "data" && typeof item.data.data === "string") return item.mediaType.startsWith("image/") ? {
				type: "image",
				data: item.data.data,
				mimeType: item.mediaType
			} : {
				type: "resource",
				resource: {
					uri: "",
					blob: item.data.data,
					mimeType: item.mediaType
				}
			};
			if (item.type === "file-data" && typeof item.mediaType === "string" && typeof item.data === "string" && !item.mediaType.startsWith("image/")) return {
				type: "resource",
				resource: {
					uri: "",
					blob: item.data,
					mimeType: item.mediaType
				}
			};
			return normalizeImageContentItem(item);
		}
		function normalizeContentItems(items) {
			const content = items.map(normalizeContentItem).filter((item) => item !== null);
			return content.length > 0 ? content : null;
		}
		function isCodeTool() {
			return resolvedToolName() === WORKFLOW_BUILDER_TOOL_NAMES.GET_WORKFLOW_AS_CODE || isAction(WORKFLOW_BUILDER_TOOL_NAMES.NODES, "type-definition") || resolveBuilderToolName(props.toolName) === SHARED_BUILDER_TOOL_NAMES.GET_NODE_TYPES;
		}
		function isTableTool() {
			return resolvedToolName() === SHARED_BUILDER_TOOL_NAMES.QUERY_DATA_TABLE || resolvedToolName() === WORKFLOW_BUILDER_TOOL_NAMES.LIST_WORKFLOWS || resolvedToolName() === WORKFLOW_BUILDER_TOOL_NAMES.LIST_EXECUTIONS || resolveBuilderToolName(props.toolName, props.toolArgs?.action) === SHARED_BUILDER_TOOL_NAMES.LIST_CREDENTIALS || isAction(WORKFLOW_BUILDER_TOOL_NAMES.NODES, "search") || isAction(WORKFLOW_BUILDER_TOOL_NAMES.NODES, "list") || resolveBuilderToolName(props.toolName) === SHARED_BUILDER_TOOL_NAMES.SEARCH_NODES || resolvedToolName() === SHARED_BUILDER_TOOL_NAMES.LIST_DATA_TABLES;
		}
		function extractMcpContent(result) {
			if (Array.isArray(result)) return normalizeContentItems(result);
			if (isRecord(result) && "content" in result && Array.isArray(result.content)) return normalizeContentItems(result.content);
			if (isRecord(result) && result.type === "content" && Array.isArray(result.value)) return normalizeContentItems(result.value);
			return null;
		}
		function detectType(result) {
			if (extractMcpContent(result) !== null) return "content";
			if (isCodeTool()) return "code";
			if (isTableTool() && result && typeof result === "object") return "table";
			return "json";
		}
		function extractCode(result) {
			if (!result || typeof result !== "object") return null;
			const obj = result;
			if (resolvedToolName() === WORKFLOW_BUILDER_TOOL_NAMES.GET_WORKFLOW_AS_CODE && typeof obj.code === "string") return obj.code;
			if ((isAction(WORKFLOW_BUILDER_TOOL_NAMES.NODES, "type-definition") || resolveBuilderToolName(props.toolName) === SHARED_BUILDER_TOOL_NAMES.GET_NODE_TYPES) && Array.isArray(obj.definitions)) return obj.definitions.filter((d) => typeof d.content === "string").map((d) => d.content).join("\n\n");
			return null;
		}
		function extractTableRows(result) {
			if (!result || typeof result !== "object") return null;
			const obj = result;
			for (const key of [
				"data",
				"workflows",
				"executions",
				"credentials",
				"results",
				"nodes",
				"tables"
			]) if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === "object") return obj[key];
			return null;
		}
		const resultType = computed(() => detectType(props.result));
		const contentItems = computed(() => extractMcpContent(props.result));
		const codeContent = computed(() => extractCode(props.result));
		const tableRows = computed(() => extractTableRows(props.result));
		return (_ctx, _cache) => {
			return resultType.value === "content" && contentItems.value ? (openBlock(), createBlock(unref(AiActivityStepResultSection_default), { key: 0 }, {
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.contentList) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(contentItems.value, (item, idx) => {
					return openBlock(), createElementBlock(Fragment, { key: idx }, [item.type === "image" ? (openBlock(), createBlock(ToolResultImage_default, {
						key: 0,
						data: item.data,
						"mime-type": item.mimeType
					}, null, 8, ["data", "mime-type"])) : item.type === "resource" && item.resource.mimeType ? (openBlock(), createBlock(ToolResultFile_default, {
						key: 1,
						data: item.resource.blob,
						"mime-type": item.resource.mimeType
					}, null, 8, ["data", "mime-type"])) : item.type === "text" ? (openBlock(), createBlock(ToolResultText_default, {
						key: 2,
						text: item.text
					}, null, 8, ["text"])) : createCommentVNode("", true)], 64);
				}), 128))], 2)]),
				_: 1
			})) : resultType.value === "code" && codeContent.value ? (openBlock(), createBlock(unref(AiActivityStepResultSection_default), { key: 1 }, {
				default: withCtx(() => [createVNode(ToolResultCode_default, { code: codeContent.value }, null, 8, ["code"])]),
				_: 1
			})) : resultType.value === "table" && tableRows.value ? (openBlock(), createBlock(unref(AiActivityStepResultSection_default), { key: 2 }, {
				default: withCtx(() => [createVNode(ToolResultTable_default, { rows: tableRows.value }, null, 8, ["rows"])]),
				_: 1
			})) : (openBlock(), createBlock(ToolResultJson_default, {
				key: 3,
				value: props.result
			}, null, 8, ["value"]));
		};
	}
}), [["__cssModules", { "$style": { contentList: "_contentList_1ooyo_2" } }]]);
//#endregion
//#region src/features/ai/instanceAi/components/SubagentStepTimeline.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var SubagentStepTimeline_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "SubagentStepTimeline",
	props: {
		agentNode: {},
		agentPreviewTarget: {},
		visibleEntries: { default: void 0 },
		peek: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const { getToolLabel, getToggleLabel, getHideLabel } = useToolLabel();
		const CODE_BLOCK_PATTERN = /```/;
		function extractShortLabel(content) {
			const firstLine = content.replace(/```[\s\S]*?```/g, "").trim().split("\n").find((line) => line.trim().length > 0) ?? "";
			if (firstLine) return firstLine.length > 80 ? firstLine.slice(0, 80) + "…" : firstLine;
			return i18n.baseText("instanceAi.stepTimeline.craftingWorkflow");
		}
		function isLongTextContent(content) {
			return CODE_BLOCK_PATTERN.test(content);
		}
		/** Index tool calls by ID for O(1) lookup. */
		const toolCallsById = computed(() => {
			const map = {};
			for (const tc of props.agentNode.toolCalls) map[tc.toolCallId] = tc;
			return map;
		});
		const timelineEntries = computed(() => props.visibleEntries ?? props.agentNode.timeline);
		const steps = computed(() => {
			const result = [];
			for (const entry of timelineEntries.value) if (entry.type === "text") {
				const longText = isLongTextContent(entry.content);
				result.push({
					type: "text",
					icon: "brain",
					label: longText ? extractShortLabel(entry.content) : entry.content,
					isLoading: false,
					textContent: entry.content,
					isLongText: longText,
					shortLabel: longText ? extractShortLabel(entry.content) : void 0
				});
			} else if (entry.type === "tool-call") {
				const tc = toolCallsById.value[entry.toolCallId];
				if (!tc || HIDDEN_TOOLS.has(tc.toolName)) continue;
				result.push({
					type: "tool-call",
					icon: tc.isLoading ? "spinner" : getToolIcon(tc.toolName),
					label: getToolLabel(tc.toolName, tc.args),
					isLoading: tc.isLoading,
					toggleLabel: getToggleLabel(tc),
					hideLabel: getHideLabel(tc),
					toolCall: tc
				});
			} else if (entry.type === "reasoning") result.push({
				type: "reasoning",
				icon: "brain",
				label: "",
				isLoading: false,
				entry
			});
			return result;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.timeline) }, [(openBlock(true), createElementBlock(Fragment, null, renderList(steps.value, (step, idx) => {
				return openBlock(), createElementBlock(Fragment, { key: idx }, [step.type === "tool-call" && step.toolCall ? (openBlock(), createBlock(unref(AiActivityStep_default), {
					key: 0,
					label: step.label,
					loading: step.toolCall.isLoading,
					error: step.toolCall.error
				}, {
					default: withCtx(() => [step.toolCall.args ? (openBlock(), createBlock(ToolResultJson_default, {
						key: 0,
						value: step.toolCall.args
					}, null, 8, ["value"])) : createCommentVNode("", true), step.toolCall.result !== void 0 ? (openBlock(), createBlock(ToolResultRenderer_default, {
						key: 1,
						result: step.toolCall.result,
						"tool-name": step.toolCall.toolName,
						"tool-args": step.toolCall.args
					}, null, 8, [
						"result",
						"tool-name",
						"tool-args"
					])) : createCommentVNode("", true)]),
					_: 2
				}, 1032, [
					"label",
					"loading",
					"error"
				])) : step.type === "text" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [step.isLongText ? (openBlock(), createBlock(unref(CollapsibleRoot_default), { key: 0 }, {
					default: withCtx(({ open }) => [createVNode(unref(CollapsibleTrigger_default), { "as-child": "" }, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							ref_for: true,
							ref: "triggerRef",
							variant: "ghost",
							size: "small",
							class: normalizeClass(_ctx.$style.toggleTrigger)
						}, {
							icon: withCtx(() => [step.isLoading ? (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 0,
								icon: "spinner",
								size: "small",
								color: "primary",
								spin: ""
							})) : (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 1,
								icon: step.icon,
								size: "small"
							}, null, 8, ["icon"]))]),
							default: withCtx(() => [open ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.statusBar.thinking")), 1)], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [createTextVNode(toDisplayString(step.label), 1)], 64))]),
							_: 2
						}, 1032, ["class"])]),
						_: 2
					}, 1024), createVNode(unref(AnimatedCollapsibleContent_default), { class: normalizeClass(_ctx.$style.toggleContent) }, {
						default: withCtx(() => [createVNode(unref(AiActivityStepResultSection_default), null, {
							default: withCtx(() => [createVNode(InstanceAiMarkdown_default, {
								content: step.textContent,
								"agent-preview-target": props.agentPreviewTarget
							}, null, 8, ["content", "agent-preview-target"])]),
							_: 2
						}, 1024)]),
						_: 2
					}, 1032, ["class"])]),
					_: 2
				}, 1024)) : (openBlock(), createBlock(ButtonLike_default, { key: 1 }, {
					default: withCtx(() => [props.peek ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.streamingMarkdown)
					}, [createVNode(InstanceAiMarkdown_default, {
						content: step.label,
						"agent-preview-target": props.agentPreviewTarget
					}, null, 8, ["content", "agent-preview-target"])], 2)) : (openBlock(), createBlock(InstanceAiMarkdown_default, {
						key: 1,
						content: step.label,
						"agent-preview-target": props.agentPreviewTarget
					}, null, 8, ["content", "agent-preview-target"]))]),
					_: 2
				}, 1024))], 64)) : step.type === "reasoning" && step.entry ? (openBlock(), createBlock(AiReasoningBlock_default, {
					key: 2,
					entry: step.entry,
					streaming: unref(isStreamingTimelineEntry)(props.agentNode, step.entry)
				}, null, 8, ["entry", "streaming"])) : createCommentVNode("", true)], 64);
			}), 128))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	timeline: "_timeline_1i3pw_1",
	toggleContent: "_toggleContent_1i3pw_7",
	toggleTrigger: "_toggleTrigger_1i3pw_12",
	streamingMarkdown: "_streamingMarkdown_1i3pw_19"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/AgentSection.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentSection_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentSection",
	props: { agentNode: {} },
	setup(__props) {
		const props = __props;
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const isActive = computed(() => props.agentNode.status === "active");
		const isExpanded = ref(settingsStore.isCloudDeployment);
		const isError = computed(() => props.agentNode.status === "error");
		const agentPreviewTarget = computed(() => {
			const target = props.agentNode.targetResource;
			if (target?.type !== "agent" || !target.id || !target.projectId) return void 0;
			return {
				agentId: target.id,
				projectId: target.projectId
			};
		});
		const sectionTitle = computed(() => {
			const activityKey = getAgentActivityKey(props.agentNode);
			const activityTitle = activityKey ? i18n.baseText(activityKey) : void 0;
			return getAgentSectionTitle(props.agentNode, activityTitle) ?? i18n.baseText("instanceAi.agentActivity.working");
		});
		/**
		* Most recent timeline entry that SubagentStepTimeline can render (text,
		* tool call, or reasoning), shown as a peek while collapsed and active.
		*/
		const peekEntries = computed(() => {
			const entries = props.agentNode.timeline;
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];
				if (entry.type === "text" || entry.type === "tool-call" || entry.type === "reasoning") return [entry];
			}
			return [];
		});
		watch(() => props.agentNode.status, (status) => {
			if (status === "completed") isExpanded.value = false;
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock(Fragment, null, [createVNode(unref(CollapsibleRoot_default), {
				open: isExpanded.value,
				"onUpdate:open": _cache[0] || (_cache[0] = ($event) => isExpanded.value = $event)
			}, {
				default: withCtx(({ open: isOpen }) => [
					createVNode(unref(CollapsibleTrigger_default), { "as-child": "" }, {
						default: withCtx(() => [createVNode(unref(AiActivityStepButton_default), {
							loading: isActive.value,
							size: "medium"
						}, {
							icon: withCtx(() => [createVNode(unref(AiActivityStepChevron_default), { open: isOpen }, null, 8, ["open"])]),
							default: withCtx(() => [createTextVNode(" " + toDisplayString(sectionTitle.value), 1)]),
							_: 2
						}, 1032, ["loading"])]),
						_: 2
					}, 1024),
					!isOpen && isActive.value && peekEntries.value.length ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.content)
					}, [createVNode(SubagentStepTimeline_default, {
						"agent-node": props.agentNode,
						"agent-preview-target": agentPreviewTarget.value,
						"visible-entries": peekEntries.value,
						peek: ""
					}, null, 8, [
						"agent-node",
						"agent-preview-target",
						"visible-entries"
					])], 2)) : createCommentVNode("", true),
					createVNode(unref(AnimatedCollapsibleContent_default), { class: normalizeClass(_ctx.$style.content) }, {
						default: withCtx(() => [createVNode(SubagentStepTimeline_default, {
							"agent-node": props.agentNode,
							"agent-preview-target": agentPreviewTarget.value
						}, null, 8, ["agent-node", "agent-preview-target"])]),
						_: 1
					}, 8, ["class"])
				]),
				_: 1
			}, 8, ["open"]), isError.value && props.agentNode.error ? (openBlock(), createBlock(unref(N8nCallout_default), {
				key: 0,
				theme: "danger"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(props.agentNode.error), 1)]),
				_: 1
			})) : createCommentVNode("", true)], 64);
		};
	}
}), [["__cssModules", { "$style": { content: "_content_17ze8_1" } }]]);
//#endregion
//#region src/features/ai/instanceAi/components/AnsweredQuestions.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var AnsweredQuestions_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AnsweredQuestions",
	props: { toolCall: {} },
	setup(__props) {
		/**
		* AnsweredQuestions.vue
		*
		* Read-only display of answered questions. Shown inline in the timeline
		* after the user submits answers via the questions wizard.
		* Styled to match the AI builder's UserAnswersMessage.
		*/
		const props = __props;
		const i18n = useI18n();
		function getAnswers() {
			const questions = props.toolCall.confirmation?.questions ?? [];
			const rawAnswers = props.toolCall.result?.answers ?? [];
			return questions.map((q) => {
				const a = rawAnswers.find((ans) => ans.questionId === q.id);
				if (!a || a.skipped) return {
					question: q.question,
					answer: "",
					skipped: true
				};
				const parts = [];
				if (Array.isArray(a.selectedOptions) && a.selectedOptions.length > 0) parts.push(a.selectedOptions.map((o) => o.split("\n")[0]).join(", "));
				if (typeof a.customText === "string" && a.customText.trim()) parts.push(a.customText.trim());
				return {
					question: q.question,
					answer: parts.join(" — ") || "",
					skipped: parts.length === 0
				};
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.wrapper) }, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.userBubble),
				"data-test-id": "instance-ai-answered-questions"
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(getAnswers(), (item, idx) => {
				return openBlock(), createElementBlock("div", {
					key: idx,
					class: normalizeClass(_ctx.$style.answerItem)
				}, [createVNode(unref(N8nText_default), {
					bold: true,
					size: "large",
					class: normalizeClass(_ctx.$style.question)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.question), 1)]),
					_: 2
				}, 1032, ["class"]), item.skipped ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.skipped),
					size: "large"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("aiAssistant.builder.planMode.answers.skipped")), 1)]),
					_: 1
				}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nText_default), {
					key: 1,
					size: "large"
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(item.answer), 1)]),
					_: 2
				}, 1024))], 2);
			}), 128))], 2)], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wrapper: "_wrapper_h78l6_1",
	userBubble: "_userBubble_h78l6_7",
	answerItem: "_answerItem_h78l6_16",
	question: "_question_h78l6_25",
	skipped: "_skipped_h78l6_29"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/ArtifactCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ArtifactCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ArtifactCard",
	props: {
		type: {},
		name: {},
		resourceId: {},
		projectId: {},
		metadata: {},
		archived: { type: Boolean }
	},
	setup(__props) {
		const i18n = useI18n();
		const { openArtifactInNewTab } = useArtifactLinks();
		const props = __props;
		const openPreview = inject("openWorkflowPreview", void 0);
		const openDataTablePreview = inject("openDataTablePreview", void 0);
		const openAgentPreview = inject("openAgentPreview", void 0);
		const iconMap = {
			workflow: "workflow",
			"data-table": "table",
			agent: "robot"
		};
		const icon = computed(() => iconMap[props.type] ?? "file");
		const rootStore = useRootStore();
		const personalisation = ref();
		watch(() => [
			props.type,
			props.projectId,
			props.resourceId
		], async ([type, projectId, resourceId], _previous, onCleanup) => {
			let active = true;
			onCleanup(() => {
				active = false;
			});
			personalisation.value = void 0;
			if (type !== "agent" || !projectId) return;
			try {
				const agent = await getAgent(rootStore.restApiContext, projectId, resourceId);
				if (active) personalisation.value = agent.config?.personalisation;
			} catch {}
		}, { immediate: true });
		function handleClick(e) {
			if (e.metaKey || e.ctrlKey) {
				openArtifactInNewTab(props.type, props.resourceId, props.projectId);
				return;
			}
			if (props.type === "workflow") openPreview?.(props.resourceId);
			else if (props.type === "data-table") {
				if (props.projectId) openDataTablePreview?.(props.resourceId, props.projectId);
			} else if (props.type === "agent") {
				if (props.projectId) openAgentPreview?.(props.resourceId, props.projectId);
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(N8nCard_default), {
				"data-test-id": "instance-ai-artifact-card",
				class: normalizeClass([_ctx.$style.card, props.archived && _ctx.$style.cardArchived]),
				onClick: handleClick
			}, {
				prepend: withCtx(() => [props.type === "agent" ? (openBlock(), createBlock(AgentPersonalisationIcon_default, {
					key: 0,
					personalisation: personalisation.value
				}, null, 8, ["personalisation"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
					key: 1,
					icon: icon.value,
					size: "large",
					class: normalizeClass(_ctx.$style.icon)
				}, null, 8, ["icon", "class"]))]),
				header: withCtx(() => [createVNode(unref(N8nText_default), null, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.name), 1)]),
					_: 1
				}), props.archived ? (openBlock(), createBlock(unref(N8nBadge_default), {
					key: 0,
					variant: "filled",
					class: normalizeClass(_ctx.$style.archivedBadge)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.artifactsPanel.archived")), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)]),
				default: withCtx(() => [props.metadata ? (openBlock(), createBlock(unref(N8nText_default), {
					key: 0,
					color: "text-light",
					class: normalizeClass(_ctx.$style.metadata)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(props.metadata), 1)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)]),
				_: 1
			}, 8, ["class"]);
		};
	}
}), [["__cssModules", { "$style": {
	card: "_card_q5f0n_1",
	cardArchived: "_cardArchived_q5f0n_5",
	archivedBadge: "_archivedBadge_q5f0n_9",
	icon: "_icon_q5f0n_13",
	name: "_name_q5f0n_18",
	metadata: "_metadata_q5f0n_27"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiAppBlueprint.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiAppBlueprint.vue
var InstanceAiAppBlueprint_default = /* @__PURE__ */ defineComponent({
	__name: "InstanceAiAppBlueprint",
	props: {
		requestId: {},
		inputThreadId: {},
		blueprint: {},
		errors: {},
		failed: { type: Boolean },
		readOnly: { type: Boolean },
		expired: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const thread = useThread();
		const telemetry = useTelemetry();
		const rootStore = useRootStore();
		const submitted = ref(false);
		async function submit(body) {
			if (submitted.value || props.readOnly || props.expired) return;
			submitted.value = true;
			if (!await thread.confirmAction(props.requestId, body)) {
				submitted.value = false;
				return;
			}
			if (body.kind !== "appBlueprint") return;
			trackInputCompleted(telemetry, {
				threadId: thread.id,
				inputThreadId: props.inputThreadId,
				instanceId: rootStore.instanceId,
				actionSource: thread.resolveActionSource(),
				type: "app-blueprint",
				runtime: "instance-ai"
			}, appBlueprintInputs(body.approved));
			thread.resolveConfirmation(props.requestId, body.approved ? "approved" : "denied");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AppBlueprintCard_default, {
				blueprint: __props.blueprint,
				errors: __props.errors,
				failed: __props.failed,
				"read-only": __props.readOnly || __props.expired || submitted.value,
				onSubmit: submit
			}, null, 8, [
				"blueprint",
				"errors",
				"failed",
				"read-only"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiMcpConnect.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var MAX_CONFIRM_ATTEMPTS = 2;
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiMcpConnect.vue
var InstanceAiMcpConnect_default = /* @__PURE__ */ defineComponent({
	__name: "InstanceAiMcpConnect",
	props: {
		requestId: {},
		inputThreadId: {},
		servers: {},
		readOnly: { type: Boolean },
		expired: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const thread = useThread();
		const telemetry = useTelemetry();
		const rootStore = useRootStore();
		const submitted = ref(false);
		const isResolved = computed(() => submitted.value || Boolean(props.readOnly) || Boolean(props.expired) || thread.resolvedConfirmationIds.has(props.requestId));
		async function onResolve({ approved, connectedSlugs }) {
			if (isResolved.value) return;
			submitted.value = true;
			let confirmed = false;
			for (let attempt = 0; attempt < MAX_CONFIRM_ATTEMPTS && !confirmed; attempt++) confirmed = await thread.confirmAction(props.requestId, {
				kind: "mcpConnect",
				approved,
				connectedSlugs
			});
			if (!confirmed) {
				submitted.value = false;
				return;
			}
			trackInputCompleted(telemetry, {
				threadId: thread.id,
				inputThreadId: props.inputThreadId,
				instanceId: rootStore.instanceId,
				actionSource: thread.resolveActionSource(),
				type: "mcp-connect",
				runtime: "instance-ai"
			}, mcpConnectInputs(props.servers, approved, connectedSlugs));
			thread.resolveConfirmation(props.requestId, approved ? "approved" : "deferred");
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(InstanceAiMcpConnectCard_default, {
				servers: __props.servers,
				"read-only": isResolved.value,
				expired: __props.expired,
				onResolve
			}, null, 8, [
				"servers",
				"read-only",
				"expired"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/preferenceScope.utils.ts
/**
* The words the card and its modal use for a scope. A personal project is named by its
* kind, because its stored name is an email string. A project the store does not list
* gets a neutral label rather than its id.
*
* Only the thread's own project is "this project". A row can sit in another one, and the
* select can offer both at once, so naming them both "this project" would describe two
* different places with the same words.
*/
function preferenceScopeLabel(i18n, scope, projectId, myProjects, threadProjectId = null) {
	if (scope === "user") return i18n.baseText("settings.context.preferences.scope.user");
	if (scope === "instance") return i18n.baseText("settings.context.preferences.scope.instance");
	const isThreadProject = projectId !== null && projectId === threadProjectId;
	const project = myProjects.find((candidate) => candidate.id === projectId);
	if (!project) return i18n.baseText(isThreadProject ? "instanceAi.preferenceCard.scope.projectFallback" : "instanceAi.preferenceCard.scope.otherProjectFallback");
	if (project.type === "personal") return i18n.baseText("settings.context.preferences.scope.personalProject");
	return i18n.baseText(isThreadProject ? "instanceAi.preferenceCard.scope.project" : "instanceAi.preferenceCard.scope.otherProject", { interpolate: { name: project.name ?? project.id } });
}
/**
* The words the card's header reads for a saved row: where the preference applies,
* in the same words on every turn. A personal project is named by its kind, because
* its stored name is an email string. A project the store does not list gets a
* neutral name rather than its id.
*/
function preferenceSavedLabel(i18n, scope, projectId, myProjects, threadProjectId = null) {
	if (scope === "user") return i18n.baseText("instanceAi.preferenceCard.saved.justForYou");
	if (scope === "instance") return i18n.baseText("instanceAi.preferenceCard.saved.globally");
	const isThreadProject = projectId !== null && projectId === threadProjectId;
	const project = myProjects.find((candidate) => candidate.id === projectId);
	const name = project ? project.type === "personal" ? i18n.baseText("instanceAi.preferenceCard.saved.namePersonalProject") : project.name ?? project.id : i18n.baseText(isThreadProject ? "instanceAi.preferenceCard.saved.nameThisProject" : "instanceAi.preferenceCard.saved.nameAnotherProject");
	return i18n.baseText("instanceAi.preferenceCard.saved.forProject", { interpolate: { name } });
}
//#endregion
//#region src/features/ai/instanceAi/components/PreferenceEditModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var USER_SCOPE_VALUE = "user";
var INSTANCE_SCOPE_VALUE = "instance";
var PROJECT_SCOPE_PREFIX = "project:";
var PreferenceEditModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PreferenceEditModal",
	props: /*@__PURE__*/ mergeModels({
		preferenceId: {},
		content: {},
		scope: {},
		projectId: {},
		userId: {},
		runId: {},
		toolCallId: {}
	}, {
		"open": {
			type: Boolean,
			required: true
		},
		"openModifiers": {}
	}),
	emits: ["update:open"],
	setup(__props) {
		const open = useModel(__props, "open");
		const props = __props;
		const i18n = useI18n();
		const { restApiContext } = useRootStore();
		const thread = useThread();
		const projectsStore = useProjectsStore();
		const usersStore = useUsersStore();
		const contextStore = useContextStore();
		/** Select values, in the shape the settings modal uses: `user`, `instance`, `project:<id>`. */
		const projectScopeValue = (id) => `${PROJECT_SCOPE_PREFIX}${id}`;
		function scopeValueOf(scope, projectId) {
			if (scope === "instance") return INSTANCE_SCOPE_VALUE;
			if (scope === "project" && projectId) return projectScopeValue(projectId);
			return USER_SCOPE_VALUE;
		}
		const currentScopeValue = computed(() => scopeValueOf(props.scope, props.projectId));
		const scopeDraft = ref(currentScopeValue.value);
		/** Whether this opening has moved the select. Only then may an edit carry a scope. */
		const scopeTouched = ref(false);
		/**
		* The row behind the card may resolve while this modal is open, which moves
		* `currentScopeValue` under the draft. A draft nobody has moved follows it, so an
		* untouched select cannot save the scope the card guessed before the row arrived.
		*/
		watch(currentScopeValue, (value) => {
			if (!scopeTouched.value) scopeDraft.value = value;
		});
		const USER_ICON = {
			type: "icon",
			value: "user"
		};
		const INSTANCE_ICON = {
			type: "icon",
			value: "globe"
		};
		function optionFor(value) {
			const projects = projectsStore.myProjects;
			if (value === USER_SCOPE_VALUE) return {
				value,
				label: preferenceScopeLabel(i18n, "user", null, projects),
				icon: USER_ICON
			};
			if (value === INSTANCE_SCOPE_VALUE) return {
				value,
				label: preferenceScopeLabel(i18n, "instance", null, projects),
				icon: INSTANCE_ICON
			};
			const projectId = value.slice(8);
			const project = projects.find((candidate) => candidate.id === projectId);
			return {
				value,
				label: preferenceScopeLabel(i18n, "project", projectId, projects, thread.projectId),
				icon: project?.type === "personal" ? USER_ICON : project?.icon ?? DEFAULT_PROJECT_ICON
			};
		}
		/**
		* The scopes this user may write, from the same helpers the settings modal uses: the
		* user always, the thread's project when they hold `projectAiPreference:create` on it,
		* the instance when they hold the global `aiPreference:create`. The row's current scope
		* is always listed, so the select shows where the row is even when the user could not
		* put it there today. The server refuses a move the user may not make.
		*/
		const scopeOptions = computed(() => {
			const values = [USER_SCOPE_VALUE];
			const boundProjectId = thread.projectId;
			if (boundProjectId && canWriteProjectScope(boundProjectId)) values.push(projectScopeValue(boundProjectId));
			if (canWriteInstanceScope()) values.push(INSTANCE_SCOPE_VALUE);
			if (!values.includes(currentScopeValue.value)) values.push(currentScopeValue.value);
			return values.map(optionFor);
		});
		const selectedIcon = computed(() => scopeOptions.value.find((option) => option.value === scopeDraft.value)?.icon ?? DEFAULT_PROJECT_ICON);
		function parseScope() {
			const value = scopeDraft.value;
			if (value === INSTANCE_SCOPE_VALUE) return {
				scope: "instance",
				projectId: null,
				userId: null
			};
			if (value.startsWith(PROJECT_SCOPE_PREFIX)) return {
				scope: "project",
				projectId: value.slice(8),
				userId: null
			};
			return {
				scope: "user",
				projectId: null,
				userId: (props.scope === "user" ? props.userId : usersStore.currentUser?.id) ?? null
			};
		}
		const draft = ref(props.content);
		const busy = ref(false);
		const errorMessage = ref("");
		watch(open, (isOpen) => {
			if (!isOpen) return;
			draft.value = props.content;
			scopeDraft.value = currentScopeValue.value;
			scopeTouched.value = false;
			errorMessage.value = "";
			projectsStore.getMyProjects();
		});
		const contentValidationRules = [{ name: "REQUIRED" }, {
			name: "MAX_LENGTH",
			config: { maximum: AI_PREFERENCE_CONTENT_MAX_LENGTH }
		}];
		const validation = computed(() => aiPreferenceContentSchema.safeParse(draft.value));
		const scopeChanged = computed(() => scopeDraft.value !== currentScopeValue.value);
		const isDirty = computed(() => draft.value.trim() !== props.content || scopeChanged.value);
		const canSave = computed(() => isDirty.value && validation.value.success && !busy.value);
		async function save() {
			if (!canSave.value || !validation.value.success) return;
			busy.value = true;
			errorMessage.value = "";
			try {
				const response = await editPreferenceCard(restApiContext, thread.id, props.preferenceId, {
					runId: props.runId,
					toolCallId: props.toolCallId,
					content: validation.value.data,
					...scopeChanged.value ? parseScope() : {}
				});
				if (!applyReturnedFact(response, "instanceAi.preferenceCard.modal.saveFailed")) return;
				contextStore.setRow(response.preference);
				open.value = false;
			} catch (error) {
				errorMessage.value = messageOf(error, "instanceAi.preferenceCard.modal.saveFailed");
			} finally {
				busy.value = false;
			}
		}
		async function remove() {
			if (busy.value) return;
			busy.value = true;
			errorMessage.value = "";
			try {
				if (!applyReturnedFact(await undoPreferenceCard(restApiContext, thread.id, props.preferenceId, {
					runId: props.runId,
					toolCallId: props.toolCallId
				}), "instanceAi.preferenceCard.modal.removeFailed")) return;
				contextStore.forgetRow(props.preferenceId);
				open.value = false;
			} catch (error) {
				errorMessage.value = messageOf(error, "instanceAi.preferenceCard.modal.removeFailed");
			} finally {
				busy.value = false;
			}
		}
		/**
		* Moves the card with the fact the endpoint returned. The stream delivers the same
		* fact and sets the same fields. A body without that fact leaves the row state
		* unknown, so nothing is applied and the modal stays open with the failure line.
		*/
		function applyReturnedFact(response, failureKey) {
			const event = typeof response === "object" && response !== null && "event" in response ? response.event : void 0;
			if (!isPreferenceCardEvent(event)) {
				errorMessage.value = i18n.baseText(failureKey);
				return false;
			}
			thread.applyEvent(event);
			return true;
		}
		/** A close while a request is in flight would hide the refusal it may still return. */
		function onOpenChange(value) {
			if (busy.value) return;
			open.value = value;
		}
		/** The server explains a refusal better than a generic line, so prefer its message. */
		function messageOf(error, fallbackKey) {
			if (error instanceof Error && error.message) return error.message;
			return i18n.baseText(fallbackKey);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: open.value,
				size: "xlarge",
				header: unref(i18n).baseText("instanceAi.preferenceCard.modal.title"),
				"data-test-id": "instance-ai-preference-modal",
				"onUpdate:open": onOpenChange
			}, {
				default: withCtx(() => [createVNode(unref(DialogBody_default), null, {
					default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.preferenceCard.modal.subtitle")), 1)]),
						_: 1
					}), createBaseVNode("div", { class: normalizeClass(_ctx.$style.form) }, [
						createVNode(unref(N8nFormInput_default), {
							modelValue: draft.value,
							"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => draft.value = $event),
							name: "content",
							type: "textarea",
							required: "",
							label: unref(i18n).baseText("instanceAi.preferenceCard.modal.textLabel"),
							autosize: {
								minRows: 6,
								maxRows: 16
							},
							maxlength: unref(AI_PREFERENCE_CONTENT_MAX_LENGTH),
							"validate-on-blur": false,
							"validation-rules": contentValidationRules,
							disabled: busy.value,
							"data-test-id": "instance-ai-preference-modal-text"
						}, null, 8, [
							"modelValue",
							"label",
							"maxlength",
							"disabled"
						]),
						createVNode(unref(N8nText_default), {
							class: normalizeClass(_ctx.$style.counter),
							size: "small",
							color: "text-light",
							"data-test-id": "instance-ai-preference-modal-counter"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(draft.value.length) + " / " + toDisplayString(unref(AI_PREFERENCE_CONTENT_MAX_LENGTH)), 1)]),
							_: 1
						}, 8, ["class"]),
						createVNode(unref(N8nInputLabel_default), {
							label: unref(i18n).baseText("instanceAi.preferenceCard.modal.scopeLabel"),
							color: "text-dark"
						}, {
							default: withCtx(() => [createVNode(unref(N8nSelect_default), {
								modelValue: scopeDraft.value,
								"onUpdate:modelValue": [_cache[1] || (_cache[1] = ($event) => scopeDraft.value = $event), _cache[2] || (_cache[2] = ($event) => scopeTouched.value = true)],
								size: "large",
								disabled: busy.value,
								teleported: false,
								"data-test-id": "instance-ai-preference-modal-scope"
							}, {
								prefix: withCtx(() => [selectedIcon.value.type === "emoji" ? (openBlock(), createBlock(unref(N8nText_default), {
									key: 0,
									class: normalizeClass(_ctx.$style.emoji)
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(selectedIcon.value.value), 1)]),
									_: 1
								}, 8, ["class"])) : (openBlock(), createBlock(unref(N8nIcon_default), {
									key: 1,
									icon: selectedIcon.value.value
								}, null, 8, ["icon"]))]),
								default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(scopeOptions.value, (option) => {
									return openBlock(), createBlock(unref(N8nOption_default), {
										key: option.value,
										value: option.value,
										label: option.label
									}, null, 8, ["value", "label"]);
								}), 128))]),
								_: 1
							}, 8, ["modelValue", "disabled"])]),
							_: 1
						}, 8, ["label"]),
						errorMessage.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
							key: 0,
							theme: "danger",
							"data-test-id": "instance-ai-preference-modal-error"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(errorMessage.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)
					], 2)]),
					_: 1
				}), createVNode(unref(DialogFooter_default), null, {
					default: withCtx(() => [
						createVNode(unref(N8nButton_default), {
							class: normalizeClass(_ctx.$style.remove),
							variant: "destructive",
							disabled: busy.value,
							"data-test-id": "instance-ai-preference-modal-remove",
							onClick: remove
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.preferenceCard.modal.remove")), 1)]),
							_: 1
						}, 8, ["class", "disabled"]),
						createVNode(unref(N8nButton_default), {
							variant: "outline",
							disabled: busy.value,
							onClick: _cache[3] || (_cache[3] = ($event) => open.value = false)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.preferenceCard.modal.cancel")), 1)]),
							_: 1
						}, 8, ["disabled"]),
						createVNode(unref(N8nButton_default), {
							disabled: !canSave.value,
							loading: busy.value,
							"data-test-id": "instance-ai-preference-modal-save",
							onClick: save
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.preferenceCard.modal.save")), 1)]),
							_: 1
						}, 8, ["disabled", "loading"])
					]),
					_: 1
				})]),
				_: 1
			}, 8, ["open", "header"]);
		};
	}
}), [["__cssModules", { "$style": {
	form: "_form_hk1n5_1",
	counter: "_counter_hk1n5_10",
	emoji: "_emoji_hk1n5_15",
	remove: "_remove_hk1n5_20"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/PreferenceCard.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var _hoisted_1$4 = ["aria-expanded"];
var PreferenceCard_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "PreferenceCard",
	props: {
		toolCall: {},
		runId: {},
		readOnly: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const card = computed(() => resolvePreferenceCard(props.toolCall));
		const rejection = computed(() => resolvePreferenceRejection(props.toolCall));
		const isUnconfirmed = computed(() => rejection.value?.reason === "interrupted");
		const projectsStore = useProjectsStore();
		const contextStore = useContextStore();
		const thread = useThread();
		/**
		* The card's fact says where its own last write put the row. A move made on the settings
		* page or over MCP never reaches that fact, so the row itself is read here and wins. An
		* unresolved id leaves the fact in place: it is the newest thing this card knows.
		*/
		watch(() => card.value?.preferenceId, (preferenceId) => {
			if (preferenceId) contextStore.resolveRows([preferenceId]);
		}, { immediate: true });
		const liveTarget = computed(() => {
			const preferenceId = card.value?.preferenceId;
			if (!preferenceId) return null;
			const row = contextStore.rowById.get(preferenceId);
			return row ? aiPreferenceTargetOf(row) : null;
		});
		/** Where the row is, and who owns it: the row when it is known, else the card's fact. */
		const target = computed(() => {
			if (!card.value) return null;
			const live = liveTarget.value;
			if (!live) {
				const { scope, projectId, userId } = card.value;
				return {
					scope,
					projectId,
					userId
				};
			}
			return {
				scope: live.scope,
				projectId: live.scope === "project" ? live.projectId : null,
				userId: live.scope === "user" ? live.userId : null
			};
		});
		const isRemoved = computed(() => card.value?.state === "undone");
		const isEditable = computed(() => card.value !== null && !props.readOnly && !isRemoved.value);
		const rowLabel = computed(() => {
			if (isUnconfirmed.value) return i18n.baseText("instanceAi.preferenceCard.notConfirmed");
			if (rejection.value) return i18n.baseText("instanceAi.preferenceCard.notSaved");
			if (isRemoved.value) return i18n.baseText("instanceAi.preferenceCard.removed");
			const fact = card.value;
			const live = target.value;
			if (!fact) return "";
			return preferenceSavedLabel(i18n, live?.scope ?? fact.scope, live?.projectId ?? null, projectsStore.myProjects, thread.projectId);
		});
		/** The saved text, or the text the assistant tried to save. */
		const text = computed(() => rejection.value?.content ?? card.value?.content);
		/** Prefer the server's explanation over the generic line. */
		const rejectionMessage = computed(() => {
			if (isUnconfirmed.value) return i18n.baseText("instanceAi.preferenceCard.notConfirmedMessage");
			return rejection.value?.message ?? i18n.baseText("instanceAi.preferenceCard.notSavedFallback");
		});
		const userToggled = ref(null);
		const expanded = computed(() => userToggled.value ?? false);
		watch(() => props.readOnly, (readOnly) => {
			if (readOnly) userToggled.value = null;
		});
		const modalOpen = ref(false);
		const reportedSeen = ref(false);
		watch([card, () => props.readOnly], ([value, readOnly]) => {
			if (reportedSeen.value || !value || readOnly) return;
			reportedSeen.value = true;
			telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_SAW_PREFERENCE_CARD, {
				scope_type: target.value?.scope ?? value.scope,
				state: value.state
			});
		}, { immediate: true });
		return (_ctx, _cache) => {
			return card.value || rejection.value ? (openBlock(), createBlock(unref(CollapsibleRoot_default), {
				key: 0,
				open: expanded.value,
				"data-test-id": "instance-ai-preference-card",
				"onUpdate:open": _cache[2] || (_cache[2] = (value) => userToggled.value = value)
			}, {
				default: withCtx(() => [
					createVNode(unref(CollapsibleTrigger_default), { "as-child": "" }, {
						default: withCtx(() => [createBaseVNode("button", {
							type: "button",
							class: normalizeClass(_ctx.$style.header),
							"aria-expanded": expanded.value,
							"data-test-id": "instance-ai-preference-card-header"
						}, [
							rejection.value ? (openBlock(), createBlock(unref(N8nIcon_default), {
								key: 0,
								icon: "triangle-alert",
								size: "small"
							})) : createCommentVNode("", true),
							createBaseVNode("span", { class: normalizeClass(_ctx.$style.title) }, toDisplayString(rowLabel.value), 3),
							createVNode(unref(AiActivityStepChevron_default), { open: expanded.value }, null, 8, ["open"])
						], 10, _hoisted_1$4)]),
						_: 1
					}),
					createVNode(unref(AnimatedCollapsibleContent_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.card) }, [
							text.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								tag: "p",
								size: "small",
								class: normalizeClass([_ctx.$style.text, {
									[_ctx.$style.removedText]: isRemoved.value,
									[_ctx.$style.attemptedText]: rejection.value
								}]),
								"data-test-id": "instance-ai-preference-card-text"
							}, {
								default: withCtx(() => [createTextVNode(" “" + toDisplayString(text.value) + "” ", 1)]),
								_: 1
							}, 8, ["class"])) : createCommentVNode("", true),
							rejection.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
								key: 1,
								theme: isUnconfirmed.value ? "warning" : "danger",
								"data-test-id": "instance-ai-preference-card-error"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(rejectionMessage.value), 1)]),
								_: 1
							}, 8, ["theme"])) : createCommentVNode("", true),
							isEditable.value ? (openBlock(), createElementBlock("button", {
								key: 2,
								type: "button",
								class: normalizeClass(_ctx.$style.link),
								"data-test-id": "instance-ai-preference-card-edit",
								onClick: _cache[0] || (_cache[0] = ($event) => modalOpen.value = true)
							}, toDisplayString(unref(i18n).baseText("instanceAi.preferenceCard.edit")), 3)) : createCommentVNode("", true)
						], 2)]),
						_: 1
					}),
					card.value && isEditable.value && target.value ? (openBlock(), createBlock(PreferenceEditModal_default, {
						key: 0,
						open: modalOpen.value,
						"onUpdate:open": _cache[1] || (_cache[1] = ($event) => modalOpen.value = $event),
						"preference-id": card.value.preferenceId,
						content: card.value.content,
						scope: target.value.scope,
						"project-id": target.value.projectId,
						"user-id": target.value.userId,
						"run-id": props.runId,
						"tool-call-id": props.toolCall.toolCallId
					}, null, 8, [
						"open",
						"preference-id",
						"content",
						"scope",
						"project-id",
						"user-id",
						"run-id",
						"tool-call-id"
					])) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, ["open"])) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	header: "_header_2mkrn_3",
	title: "_title_2mkrn_22",
	card: "_card_2mkrn_32",
	text: "_text_2mkrn_42",
	link: "_link_2mkrn_46",
	removedText: "_removedText_2mkrn_62",
	attemptedText: "_attemptedText_2mkrn_67"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/TaskChecklist.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var TaskChecklist_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "TaskChecklist",
	props: { tasks: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const statusConfig = {
			todo: {
				icon: "circle",
				color: "text-xlight"
			},
			in_progress: {
				icon: "spinner",
				spin: true,
				color: "primary"
			},
			done: {
				icon: "check",
				color: "success",
				textColor: "text-light"
			},
			failed: {
				icon: "triangle-alert",
				color: "danger"
			},
			cancelled: {
				icon: "x",
				color: "text-xlight",
				lineThrough: true
			}
		};
		function getConfig(status) {
			return statusConfig[status] ?? statusConfig.todo;
		}
		const taskList = computed(() => (props.tasks?.tasks ?? []).map((task) => {
			const config = getConfig(task.status);
			return {
				...task,
				...config,
				description: task.description.trim() || i18n.baseText("instanceAi.tasks.untitled")
			};
		}));
		return (_ctx, _cache) => {
			return taskList.value.length ? (openBlock(), createBlock(unref(N8nCard_default), { key: 0 }, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(taskList.value, (task) => {
					return openBlock(), createBlock(ButtonLike_default, { key: task.id }, {
						default: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: task.icon,
							spin: task.spin,
							size: "small",
							color: task.color
						}, null, 8, [
							"icon",
							"spin",
							"color"
						]), createBaseVNode("span", { class: normalizeClass(_ctx.$style.content) }, [createVNode(unref(N8nText_default), {
							color: task.textColor,
							class: normalizeClass({ [_ctx.$style.lineThrough]: task.lineThrough })
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(task.description), 1)]),
							_: 2
						}, 1032, ["color", "class"]), task.detail ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							size: "small",
							color: "text-light",
							class: normalizeClass(_ctx.$style.detail)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(task.detail), 1)]),
							_: 2
						}, 1032, ["class"])) : createCommentVNode("", true)], 2)]),
						_: 2
					}, 1024);
				}), 128))]),
				_: 1
			})) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	content: "_content_2j7xp_1",
	detail: "_detail_2j7xp_8",
	lineThrough: "_lineThrough_2j7xp_12"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceContextStep.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/InstanceContextStep.vue
var InstanceContextStep_default = /* @__PURE__ */ defineComponent({
	__name: "InstanceContextStep",
	props: { entry: {} },
	setup(__props) {
		const props = __props;
		const { getInstanceContextLabel } = useInstanceContextLabel();
		const label = computed(() => getInstanceContextLabel(props.entry));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(AiActivityStep_default), {
				label: label.value,
				"has-content": false,
				"data-test-id": "instance-ai-context-step"
			}, null, 8, ["label"]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/ThinkingBlock.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var ThinkingBlock_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "ThinkingBlock",
	props: {
		agentNode: {},
		entries: {},
		active: { type: Boolean },
		awaitingInput: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		function skillUpdateLabel(entry) {
			return entry.name ? i18n.baseText(`instanceAi.skillUpdate.${entry.change}`, { interpolate: { name: entry.name } }) : i18n.baseText(`instanceAi.skillUpdate.${entry.change}.unnamed`);
		}
		const { getToolLabel } = useToolLabel();
		const { getInstanceContextLabel } = useInstanceContextLabel();
		const toolCallsById = computed(() => {
			const map = {};
			for (const toolCall of props.agentNode.toolCalls) map[toolCall.toolCallId] = toolCall;
			return map;
		});
		function toolCallFor(entry) {
			return entry.type === "tool-call" ? toolCallsById.value[entry.toolCallId] : void 0;
		}
		function autoApprovalFor(entry) {
			return toolCallFor(entry)?.autoApproval;
		}
		const tailToolCall = computed(() => {
			if (!props.active || props.awaitingInput) return void 0;
			const last = props.entries[props.entries.length - 1];
			if (!last || last.type !== "tool-call") return void 0;
			return toolCallsById.value[last.toolCallId];
		});
		/** Reuse the context row label while it is the latest active entry. */
		const activityLabel = computed(() => {
			const toolCall = tailToolCall.value;
			if (toolCall) return getToolLabel(toolCall.toolName, toolCall.args);
			if (!props.active || props.awaitingInput) return void 0;
			const last = props.entries[props.entries.length - 1];
			if (last?.type === "skill-update") return skillUpdateLabel(last);
			return last?.type === "instance-context" ? getInstanceContextLabel(last) : void 0;
		});
		const segments = computed(() => {
			return props.entries.filter((entry) => entry.type === "text" || entry.type === "reasoning");
		});
		const durationSec = computed(() => {
			let start;
			let end;
			for (const entry of props.entries) {
				const toolCall = toolCallFor(entry);
				if (!toolCall) continue;
				const startedAt = toolCall.startedAt ? Date.parse(toolCall.startedAt) : NaN;
				const completedAt = toolCall.completedAt && !toolCall.interrupted ? Date.parse(toolCall.completedAt) : NaN;
				if (!Number.isNaN(startedAt)) start = start === void 0 ? startedAt : Math.min(start, startedAt);
				if (!Number.isNaN(completedAt)) end = end === void 0 ? completedAt : Math.max(end, completedAt);
			}
			if (start === void 0 || end === void 0 || end < start) return void 0;
			return Math.max(1, Math.round((end - start) / 1e3));
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AiThinkingBlock_default, {
				segments: segments.value,
				active: props.active,
				"awaiting-input": props.awaitingInput,
				"activity-label": activityLabel.value,
				"duration-sec": durationSec.value,
				"test-id": "instance-ai-thinking-block"
			}, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(props.entries, (entry, index) => {
					return openBlock(), createElementBlock(Fragment, { key: index }, [entry.type === "text" || entry.type === "reasoning" ? (openBlock(), createElementBlock("div", {
						key: 0,
						class: normalizeClass(_ctx.$style.thought)
					}, [createVNode(InstanceAiMarkdown_default, {
						content: entry.content,
						streaming: unref(isStreamingTimelineEntry)(props.agentNode, entry)
					}, null, 8, ["content", "streaming"])], 2)) : entry.type === "instance-context" ? (openBlock(), createBlock(InstanceContextStep_default, {
						key: 1,
						entry
					}, null, 8, ["entry"])) : entry.type === "skill-update" ? (openBlock(), createBlock(unref(AiActivityStep_default), {
						key: 2,
						label: skillUpdateLabel(entry),
						"data-test-id": "instance-ai-skill-update"
					}, {
						default: withCtx(() => [createBaseVNode("p", { class: normalizeClass(_ctx.$style.thought) }, toDisplayString(unref(i18n).baseText(`instanceAi.skillUpdate.${entry.change}.description`)), 3)]),
						_: 2
					}, 1032, ["label"])) : entry.type === "tool-call" && toolCallFor(entry) ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [autoApprovalFor(entry) ? (openBlock(), createBlock(unref(AiActivityStep_default), {
						key: 0,
						label: unref(autoApprovalLabel)(unref(i18n), autoApprovalFor(entry)),
						"data-test-id": "instance-ai-auto-approval"
					}, {
						default: withCtx(() => [createBaseVNode("p", { class: normalizeClass(_ctx.$style.thought) }, toDisplayString(unref(autoApprovalReason)(unref(i18n), autoApprovalFor(entry))), 3)]),
						_: 2
					}, 1032, ["label"])) : createCommentVNode("", true), createVNode(unref(AiActivityStep_default), {
						label: unref(getToolLabel)(toolCallFor(entry).toolName, toolCallFor(entry).args),
						loading: props.agentNode.status === "active" && toolCallFor(entry).isLoading,
						error: toolCallFor(entry).error
					}, {
						default: withCtx(() => [toolCallFor(entry).args ? (openBlock(), createBlock(ToolResultJson_default, {
							key: 0,
							value: toolCallFor(entry).args
						}, null, 8, ["value"])) : createCommentVNode("", true), toolCallFor(entry).result !== void 0 ? (openBlock(), createBlock(ToolResultRenderer_default, {
							key: 1,
							result: toolCallFor(entry).result,
							"tool-name": toolCallFor(entry).toolName,
							"tool-args": toolCallFor(entry).args
						}, null, 8, [
							"result",
							"tool-name",
							"tool-args"
						])) : createCommentVNode("", true)]),
						_: 2
					}, 1032, [
						"label",
						"loading",
						"error"
					])], 64)) : createCommentVNode("", true)], 64);
				}), 128))]),
				_: 1
			}, 8, [
				"segments",
				"active",
				"awaiting-input",
				"activity-label",
				"duration-sec"
			]);
		};
	}
}), [["__cssModules", { "$style": { thought: "_thought_rj7w5_1" } }]]);
//#endregion
//#region src/features/ai/instanceAi/components/TimelineActivityIndicator.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/TimelineActivityIndicator.vue
var TimelineActivityIndicator_default = /* @__PURE__ */ defineComponent({
	__name: "TimelineActivityIndicator",
	props: { progressToken: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		/**
		* Time since the run last showed any sign of life, not since this component
		* mounted: the tail entry keeps growing while text streams, and counting that
		* as dead time overstates the stall.
		*
		* Reset rather than remount. Progress arrives one delta at a time, so keying
		* the component on it would rebuild it once per token.
		*/
		let since = Date.now();
		const elapsedSec = ref(0);
		watch(() => props.progressToken, () => {
			since = Date.now();
			elapsedSec.value = 0;
		});
		const ticker = setInterval(() => {
			elapsedSec.value = Math.floor((Date.now() - since) / 1e3);
		}, 1e3);
		onUnmounted(() => clearInterval(ticker));
		function formatDuration(totalSec) {
			if (totalSec < 60) return `${totalSec}s`;
			return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
		}
		/** Held back until the silence is long enough to be worth reporting. */
		const visible = computed(() => elapsedSec.value * 1e3 >= ACTIVITY_INDICATOR_DELAY_MS);
		const label = computed(() => `${i18n.baseText("ai.thinking.active")} · ${formatDuration(elapsedSec.value)}`);
		return (_ctx, _cache) => {
			return visible.value ? (openBlock(), createBlock(unref(AiActivityStep_default), {
				key: 0,
				label: label.value,
				loading: "",
				"has-content": false,
				"data-test-id": "timeline-activity-indicator"
			}, null, 8, ["label"])) : createCommentVNode("", true);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/TimelineTextSegment.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/TimelineTextSegment.vue
var TimelineTextSegment_default = /* @__PURE__ */ defineComponent({
	__name: "TimelineTextSegment",
	props: {
		entry: {},
		compact: {
			type: Boolean,
			default: false
		},
		streaming: {
			type: Boolean,
			default: false
		}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return openBlock(), createBlock(InstanceAiMarkdown_default, {
				content: props.entry.content,
				streaming: props.streaming
			}, null, 8, ["content", "streaming"]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/AgentTimeline.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var AgentTimeline_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentTimeline",
	props: {
		agentNode: {},
		compact: {
			type: Boolean,
			default: false
		},
		visibleEntries: { default: void 0 },
		messageId: { default: void 0 },
		runId: { default: void 0 }
	},
	setup(__props) {
		const i18n = useI18n();
		const thread = useThread();
		const embedSubject = inject(INSTANCE_AI_EMBED_SUBJECT_KEY, void 0);
		/** Resolve artifact name from the enriched registry (falls back to extracted name). */
		function resolveArtifactName(artifact) {
			return thread.producedArtifacts.get(artifact.resourceId)?.name ?? artifact.name;
		}
		function formatRelativeTime(isoTime) {
			const diffMs = Date.now() - new Date(isoTime).getTime();
			const diffMin = Math.floor(diffMs / 6e4);
			if (diffMin < 1) return i18n.baseText("instanceAi.artifactCard.updatedJustNow");
			const diffHours = Math.floor(diffMin / 60);
			if (diffHours < 1) {
				const key = diffMin === 1 ? "instanceAi.artifactCard.minute" : "instanceAi.artifactCard.minutes";
				const time = i18n.baseText(key, { interpolate: { count: `${diffMin}` } });
				return i18n.baseText("instanceAi.artifactCard.updatedAgo", { interpolate: { time } });
			}
			const key = diffHours === 1 ? "instanceAi.artifactCard.hour" : "instanceAi.artifactCard.hours";
			const time = i18n.baseText(key, { interpolate: { count: `${diffHours}` } });
			return i18n.baseText("instanceAi.artifactCard.updatedAgo", { interpolate: { time } });
		}
		function formatCreatedDate(isoTime) {
			const date = new Date(isoTime);
			const day = date.getDate();
			const month = date.toLocaleString("en", { month: "long" });
			return i18n.baseText("instanceAi.artifactCard.createdAt", { interpolate: { date: `${day} ${month}` } });
		}
		function formatArtifactMetadata(artifact) {
			const parts = [];
			if (artifact.completedAt) {
				parts.push(formatRelativeTime(artifact.completedAt));
				parts.push(formatCreatedDate(artifact.completedAt));
			} else parts.push(i18n.baseText("instanceAi.artifactCard.updatedJustNow"));
			return parts.join(" │ ");
		}
		const props = __props;
		/**
		* A preference card acts only from the transcript tail, and only when the
		* message carries the run the endpoints must append the card fact to. A later
		* turn strands the card.
		*/
		const canActOnPreferenceCard = computed(() => props.runId !== void 0 && props.messageId !== void 0 && props.messageId === thread.messages.at(-1)?.id);
		const preferencesEnabled = computed(() => isContextPreferencesEnabled());
		const timelineEntries = computed(() => props.visibleEntries ?? props.agentNode.timeline);
		/** Index tool calls by ID for O(1) lookup and proper reactivity tracking. */
		const toolCallsById = computed(() => {
			const map = {};
			for (const tc of props.agentNode.toolCalls) map[tc.toolCallId] = tc;
			return map;
		});
		/** Index children by agentId for O(1) lookup and proper reactivity tracking. */
		const childrenById = computed(() => {
			const map = {};
			for (const child of props.agentNode.children) map[child.agentId] = child;
			return map;
		});
		/**
		* Changes whenever the run visibly advances: a new run, a new timeline entry,
		* or the tail entry growing. Drives the activity indicator's clock — an
		* entry-derived key can't, because the tail entry's identity is stable while
		* its content streams.
		*/
		const progressToken = computed(() => {
			const entries = timelineEntries.value;
			const tail = entries.at(-1);
			const tailSize = tail && (tail.type === "text" || tail.type === "reasoning") ? tail.content.length : 0;
			return `${thread.activeRunId}:${entries.length}:${tailSize}`;
		});
		const renderBlocks = computed(() => buildTimelineBlocks(timelineEntries.value, toolCallsById.value, childrenById.value, props.agentNode.status, preferencesEnabled.value));
		/** The host page already shows its subject, so a card for it is redundant. */
		function visibleArtifacts(artifacts) {
			return artifacts.filter((artifact) => !isEmbedSubject(embedSubject?.value, artifact.type, artifact.resourceId));
		}
		function blockToolCalls(block) {
			if (block.type === "questions") return [block.toolCall];
			if (block.type !== "thinking") return [];
			return block.entries.flatMap((entry) => entry.type === "tool-call" && toolCallsById.value[entry.toolCallId] ? [toolCallsById.value[entry.toolCallId]] : []);
		}
		/**
		* Workflows and Agents built by this agent's own tool calls, keyed by the
		* thinking or questions block that built them. A workflow card shows only in the embedded
		* panel, because the full view opens the built workflow in its preview panel.
		* An Agent card shows in both views, after the last block that changed it,
		* once the run settles: mid-build the preview tab shows progress, and the
		* block the card anchors to can still change.
		*/
		const builtArtifactsByBlock = computed(() => {
			const byBlock = /* @__PURE__ */ new Map();
			if (props.visibleEntries) return byBlock;
			const showAgentCards = props.agentNode.status !== "active";
			const seenWorkflowIds = /* @__PURE__ */ new Set();
			const latestAgents = /* @__PURE__ */ new Map();
			for (const block of renderBlocks.value) {
				const toolCalls = blockToolCalls(block);
				if (toolCalls.length === 0) continue;
				if (embedSubject) {
					const workflows = visibleArtifacts(extractBuiltWorkflowArtifacts(toolCalls)).filter((artifact) => !seenWorkflowIds.has(artifact.resourceId));
					for (const artifact of workflows) seenWorkflowIds.add(artifact.resourceId);
					if (workflows.length > 0) byBlock.set(block.key, workflows);
				}
				if (!showAgentCards) continue;
				for (const artifact of visibleArtifacts(extractBuiltAgentArtifacts(toolCalls))) {
					const previous = latestAgents.get(artifact.resourceId)?.artifact;
					latestAgents.set(artifact.resourceId, {
						blockKey: block.key,
						artifact: {
							...artifact,
							projectId: artifact.projectId ?? previous?.projectId
						}
					});
				}
			}
			for (const { blockKey, artifact } of latestAgents.values()) byBlock.set(blockKey, [...byBlock.get(blockKey) ?? [], artifact]);
			return byBlock;
		});
		function blockArtifacts(block) {
			if (block.type === "child") return visibleArtifacts(extractArtifacts(block.child));
			return builtArtifactsByBlock.value.get(block.key) ?? [];
		}
		const renderGroups = computed(() => {
			const groups = [];
			function appendAnswerItem(item) {
				const previous = groups.at(-1);
				if (previous?.type === "answer") previous.items.push(item);
				else groups.push({
					type: "answer",
					key: item.key,
					items: [item]
				});
			}
			for (const block of renderBlocks.value) {
				if (block.type === "text") {
					appendAnswerItem(block);
					continue;
				}
				groups.push({
					type: "activity",
					key: block.key,
					block
				});
				if (block.type === "child" && props.visibleEntries) continue;
				for (const artifact of blockArtifacts(block)) appendAnswerItem({
					type: "artifact",
					key: `${block.key}-${artifact.resourceId}`,
					artifact
				});
			}
			return groups;
		});
		/** An in-transcript card is read-only once its tool call has settled OR its
		*  confirmation was resolved client-side. Without the resolvedConfirmationIds
		*  check, a freshly-loading tool call could briefly re-enable the old
		*  card's footer (toolCall.isLoading flips back to true on tool-call-start
		*  before the previous card's read-only catches up). */
		function isCardReadOnly(tc) {
			if (!tc.isLoading) return true;
			const requestId = tc.confirmation?.requestId;
			return !!requestId && thread.resolvedConfirmationIds.has(requestId);
		}
		/** Approval went through, but n8n could not create the app. */
		function hasAppCreateError(tc) {
			return isRecord(tc.result) && tc.result.approved === true && typeof tc.result.error === "string";
		}
		function resolveAppBlueprint(tc) {
			if (isRecord(tc.result)) {
				const parsed = appBlueprintSchema.safeParse(tc.result.blueprint);
				if (parsed.success) return parsed.data;
			}
			return tc.confirmation?.appBlueprint;
		}
		return (_ctx, _cache) => {
			return renderBlocks.value.length > 0 ? (openBlock(), createElementBlock("div", {
				key: 0,
				class: normalizeClass(_ctx.$style.timeline)
			}, [(openBlock(true), createElementBlock(Fragment, null, renderList(renderGroups.value, (group) => {
				return openBlock(), createElementBlock(Fragment, { key: group.key }, [group.type === "answer" ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.answerGroup)
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(group.items, (item) => {
					return openBlock(), createElementBlock(Fragment, { key: item.key }, [item.type === "artifact" ? (openBlock(), createBlock(ArtifactCard_default, {
						key: 0,
						type: item.artifact.type,
						name: resolveArtifactName(item.artifact),
						"resource-id": item.artifact.resourceId,
						"project-id": item.artifact.projectId,
						archived: unref(thread).producedArtifacts.get(item.artifact.resourceId)?.archived,
						metadata: formatArtifactMetadata(item.artifact)
					}, null, 8, [
						"type",
						"name",
						"resource-id",
						"project-id",
						"archived",
						"metadata"
					])) : (openBlock(), createBlock(TimelineTextSegment_default, {
						key: 1,
						entry: item.entry,
						compact: props.compact,
						streaming: unref(isStreamingTimelineEntry)(props.agentNode, item.entry),
						class: normalizeClass(_ctx.$style.timelineItem)
					}, null, 8, [
						"entry",
						"compact",
						"streaming",
						"class"
					]))], 64);
				}), 128))], 2)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList([group.block], (block) => {
					return openBlock(), createElementBlock(Fragment, { key: block.key }, [block.type === "thinking" ? (openBlock(), createBlock(ThinkingBlock_default, {
						key: 0,
						"agent-node": props.agentNode,
						entries: block.entries,
						active: block.active,
						"awaiting-input": block.active && unref(thread).isAwaitingConfirmation
					}, null, 8, [
						"agent-node",
						"entries",
						"active",
						"awaiting-input"
					])) : block.type === "tasks" ? (openBlock(), createBlock(TaskChecklist_default, {
						key: 1,
						tasks: props.agentNode.tasks
					}, null, 8, ["tasks"])) : block.type === "mcp-connect" && block.toolCall.confirmation?.mcpConnectRequest ? (openBlock(), createBlock(InstanceAiMcpConnect_default, {
						key: block.toolCall.confirmation.requestId,
						"request-id": block.toolCall.confirmation.requestId,
						"input-thread-id": block.toolCall.confirmation.inputThreadId,
						servers: block.toolCall.confirmation.mcpConnectRequest.servers,
						"read-only": isCardReadOnly(block.toolCall),
						expired: block.toolCall.confirmation.expired
					}, null, 8, [
						"request-id",
						"input-thread-id",
						"servers",
						"read-only",
						"expired"
					])) : block.type === "app-blueprint" && block.toolCall.confirmation?.appBlueprint ? (openBlock(), createBlock(InstanceAiAppBlueprint_default, {
						key: block.toolCall.confirmation.requestId,
						"request-id": block.toolCall.confirmation.requestId,
						"input-thread-id": block.toolCall.confirmation.inputThreadId,
						blueprint: resolveAppBlueprint(block.toolCall),
						errors: block.toolCall.confirmation.appBlueprintErrors,
						failed: hasAppCreateError(block.toolCall),
						"read-only": isCardReadOnly(block.toolCall),
						expired: block.toolCall.confirmation.expired
					}, null, 8, [
						"request-id",
						"input-thread-id",
						"blueprint",
						"errors",
						"failed",
						"read-only",
						"expired"
					])) : block.type === "questions" ? (openBlock(), createBlock(AnsweredQuestions_default, {
						key: 4,
						"tool-call": block.toolCall
					}, null, 8, ["tool-call"])) : block.type === "preference" ? (openBlock(), createBlock(PreferenceCard_default, {
						key: 5,
						"tool-call": block.toolCall,
						"run-id": props.runId ?? "",
						"read-only": !canActOnPreferenceCard.value,
						class: normalizeClass(_ctx.$style.timelineItem)
					}, null, 8, [
						"tool-call",
						"run-id",
						"read-only",
						"class"
					])) : block.type === "activity" && !unref(thread).isAwaitingConfirmation ? (openBlock(), createBlock(TimelineActivityIndicator_default, {
						key: 6,
						"progress-token": progressToken.value
					}, null, 8, ["progress-token"])) : block.type === "child" ? (openBlock(), createBlock(AgentSection_default, {
						key: 7,
						"agent-node": block.child
					}, null, 8, ["agent-node"])) : createCommentVNode("", true)], 64);
				}), 128))], 64);
			}), 128))], 2)) : createCommentVNode("", true);
		};
	}
}), [["__cssModules", { "$style": {
	timeline: "_timeline_15sl0_1",
	answerGroup: "_answerGroup_15sl0_9"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/AgentActivityTree.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/AgentActivityTree.vue
var AgentActivityTree_default = /* @__PURE__ */ defineComponent({
	__name: "AgentActivityTree",
	props: {
		agentNode: {},
		messageId: {},
		runId: {}
	},
	setup(__props) {
		const props = __props;
		return (_ctx, _cache) => {
			return openBlock(), createBlock(AgentTimeline_default, {
				"agent-node": props.agentNode,
				"message-id": props.messageId,
				"run-id": props.runId
			}, null, 8, [
				"agent-node",
				"message-id",
				"run-id"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiMessage.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$3 = { key: 1 };
var InstanceAiMessage_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiMessage",
	props: { message: {} },
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const store = useInstanceAiStore();
		const thread = useThread();
		const showDebugInfo = ref(false);
		const isUser = computed(() => props.message.role === "user");
		const isStreaming = computed(() => props.message.isStreaming);
		const showContent = computed(() => props.message.content.length > 0 || isStreaming.value);
		const runError = computed(() => {
			const tree = props.message.agentTree;
			if (!tree || tree.status !== "error" || !tree.error) return null;
			return tree.error;
		});
		const errorDetails = computed(() => {
			const tree = props.message.agentTree;
			if (!tree || tree.status !== "error") return null;
			return tree.errorDetails ?? null;
		});
		const hasProviderError = computed(() => !!errorDetails.value?.provider);
		/** The run failed because the user ran out of AI credits — show a tailored state. */
		const isQuotaExhausted = computed(() => errorDetails.value?.code === "quota_exhausted");
		const { goToUpgrade } = usePageRedirectionHelper();
		const { isEligible: isTopUpEligible } = useAssistantTopUpEligibility();
		const outOfCreditsCtaKey = computed(() => isTopUpEligible.value ? "aiAssistant.builder.settings.getMoreCredits" : "instanceAi.error.outOfCredits.upgrade");
		/** A run the user (or a timeout/shutdown) stopped before it completed. */
		const runCancelled = computed(() => props.message.agentTree?.status === "cancelled");
		/** Attribute the stop to its cause; falls back to the generic label when unknown. */
		const cancelledLabel = computed(() => {
			switch (props.message.agentTree?.cancellationReason) {
				case "user": return i18n.baseText("instanceAi.agentTree.stoppedByUser");
				case "timeout": return i18n.baseText("instanceAi.agentTree.timedOut");
				default: return i18n.baseText("instanceAi.agentTree.cancelled");
			}
		});
		const errorTitle = computed(() => {
			if (hasProviderError.value) return `${errorDetails.value.provider} ${i18n.baseText("instanceAi.agentTree.error")}`;
			return runError.value ?? i18n.baseText("instanceAi.error.title");
		});
		const formattedTechnicalDetails = computed(() => {
			const details = errorDetails.value;
			if (!details?.technicalDetails) return null;
			try {
				return JSON.stringify(JSON.parse(details.technicalDetails), null, 2);
			} catch {
				return details.technicalDetails;
			}
		});
		const attachments = computed(() => (props.message.attachments ?? []).map((attachment) => {
			if (attachment.type !== "agent") return attachment;
			const name = thread.producedArtifacts.get(attachment.id)?.name;
			return name && name !== attachment.name ? {
				...attachment,
				name
			} : attachment;
		}));
		const resourceAttachments = computed(() => attachments.value.filter((item) => item.type !== "file"));
		const fileAttachments = computed(() => attachments.value.filter((item) => item.type === "file"));
		/**
		* Answered questions that end the timeline, like the onboarding card that the host answers with
		* no model turn. They render below the actions, so copy and read aloud stay under the assistant
		* text and not under the user's answer.
		*/
		const trailingAnswer = computed(() => {
			const tree = props.message.agentTree;
			if (!tree || tree.status === "active") return void 0;
			const last = tree.timeline.at(-1);
			if (last?.type !== "tool-call") return void 0;
			const toolCall = tree.toolCalls.find((tc) => tc.toolCallId === last.toolCallId);
			return toolCall?.confirmation?.inputType === "questions" && !toolCall.isLoading ? toolCall : void 0;
		});
		const activityTree = computed(() => {
			const tree = props.message.agentTree;
			if (!tree || !trailingAnswer.value) return tree;
			return {
				...tree,
				timeline: tree.timeline.slice(0, -1)
			};
		});
		/** Transient status message from the backend (e.g. "Recalling conversation..."). */
		const statusMessage = computed(() => {
			if (!isStreaming.value || !props.message.agentTree) return "";
			return props.message.agentTree.statusMessage ?? "";
		});
		const responseId = computed(() => props.message.messageGroupId ?? props.message.id);
		const isRateable = computed(() => !isUser.value && thread.rateableResponseId === responseId.value && !(responseId.value in thread.feedbackByResponseId));
		const hasSettledText = computed(function hasSettledAssistantText() {
			return !isUser.value && !isStreaming.value && props.message.content.trim().length > 0;
		});
		const hasMessageActions = computed(function hasAvailableMessageActions() {
			return hasSettledText.value || isRateable.value || store.debugMode && !isUser.value;
		});
		const debugActionLabel = computed(function getDebugActionLabel() {
			return i18n.baseText(showDebugInfo.value ? "instanceAi.message.actions.hideDebugInfo" : "instanceAi.message.actions.showDebugInfo");
		});
		function toggleDebugInfo() {
			showDebugInfo.value = !showDebugInfo.value;
		}
		function onFeedback(payload) {
			thread.submitFeedback(responseId.value, payload);
		}
		function formatJson(value) {
			try {
				return JSON.stringify(value, null, 2);
			} catch {
				return String(value);
			}
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ChatMessage_default), {
				role: props.message.role,
				"data-test-id": isUser.value ? "instance-ai-user-message" : "instance-ai-assistant-message"
			}, createSlots({
				default: withCtx(() => [isUser.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [createTextVNode(toDisplayString(props.message.content) + " ", 1), attachments.value.length > 0 ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass([_ctx.$style.userAttachments, { [_ctx.$style.userAttachmentsAfterText]: props.message.content }])
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(resourceAttachments.value, (attachment, index) => {
					return openBlock(), createBlock(AttachmentPreview_default, {
						key: index,
						attachment,
						"is-removable": false
					}, null, 8, ["attachment"]);
				}), 128)), fileAttachments.value.length > 0 ? (openBlock(), createBlock(unref(AttachmentGroup_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.fileAttachments)
				}, {
					default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(fileAttachments.value, (attachment, index) => {
						return openBlock(), createBlock(AttachmentPreview_default, {
							key: index,
							attachment,
							"is-removable": false
						}, null, 8, ["attachment"]);
					}), 128))]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)], 2)) : createCommentVNode("", true)], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
					activityTree.value ? (openBlock(), createBlock(AgentActivityTree_default, {
						key: 0,
						"agent-node": activityTree.value,
						"message-id": props.message.id,
						"run-id": props.message.runId
					}, null, 8, [
						"agent-node",
						"message-id",
						"run-id"
					])) : createCommentVNode("", true),
					isQuotaExhausted.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 1,
						theme: "warning",
						"data-test-id": "instance-ai-out-of-credits"
					}, {
						trailingContent: withCtx(() => [createVNode(unref(N8nButton_default), {
							variant: "outline",
							size: "xsmall",
							"data-test-id": "instance-ai-out-of-credits-upgrade",
							onClick: _cache[0] || (_cache[0] = ($event) => unref(goToUpgrade)("instance-ai", "upgrade-instance-ai"))
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(outOfCreditsCtaKey.value)), 1)]),
							_: 1
						})]),
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.error.outOfCredits.title")) + " ", 1)]),
						_: 1
					})) : runError.value ? (openBlock(), createBlock(unref(N8nCallout_default), {
						key: 2,
						theme: "danger"
					}, createSlots({
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.runLevelError) }, [
							createVNode(unref(N8nText_default), {
								bold: "",
								tag: "div"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(errorTitle.value), 1)]),
								_: 1
							}),
							hasProviderError.value ? (openBlock(), createBlock(unref(N8nText_default), {
								key: 0,
								tag: "div"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(runError.value), 1)]),
								_: 1
							})) : createCommentVNode("", true),
							formattedTechnicalDetails.value ? (openBlock(), createElementBlock("details", _hoisted_1$3, [createBaseVNode("summary", { class: normalizeClass(_ctx.$style.errorDetailsSummary) }, toDisplayString(unref(i18n).baseText("instanceAi.error.technicalDetails")), 3), createBaseVNode("pre", { class: normalizeClass(_ctx.$style.runLevelErrorDetails) }, toDisplayString(formattedTechnicalDetails.value), 3)])) : createCommentVNode("", true)
						], 2)]),
						_: 2
					}, [errorDetails.value?.statusCode ? {
						name: "trailingContent",
						fn: withCtx(() => [createTextVNode(toDisplayString(errorDetails.value.statusCode), 1)]),
						key: "0"
					} : void 0]), 1024)) : createCommentVNode("", true),
					showContent.value && !props.message.agentTree && props.message.content ? (openBlock(), createBlock(InstanceAiMarkdown_default, {
						key: 3,
						content: props.message.content
					}, null, 8, ["content"])) : createCommentVNode("", true),
					statusMessage.value && !props.message.content ? (openBlock(), createElementBlock("div", {
						key: 4,
						class: normalizeClass(_ctx.$style.statusIndicator)
					}, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.statusDot) }, null, 2), createBaseVNode("span", null, toDisplayString(statusMessage.value), 1)], 2)) : isStreaming.value && !props.message.content && !props.message.agentTree ? (openBlock(), createElementBlock("span", {
						key: 5,
						class: normalizeClass(_ctx.$style.blinkingCursor)
					}, null, 2)) : createCommentVNode("", true),
					runCancelled.value ? (openBlock(), createElementBlock("div", {
						key: 6,
						class: normalizeClass(_ctx.$style.cancelledIndicator),
						"data-test-id": "instance-ai-run-cancelled"
					}, [createVNode(unref(N8nIcon_default), {
						icon: "circle-x",
						size: "small"
					}), createBaseVNode("span", null, toDisplayString(cancelledLabel.value), 1)], 2)) : createCommentVNode("", true),
					showDebugInfo.value ? (openBlock(), createElementBlock("pre", {
						key: 7,
						class: normalizeClass(_ctx.$style.debugJson)
					}, toDisplayString(formatJson(props.message)), 3)) : createCommentVNode("", true)
				], 64))]),
				_: 2
			}, [hasMessageActions.value ? {
				name: "actions",
				fn: withCtx(() => [createVNode(unref(ChatActions_default), {
					content: props.message.content,
					"show-copy": hasSettledText.value,
					"copy-test-id": "instance-ai-message-copy",
					"show-rating": isRateable.value,
					"on-rating": onFeedback,
					"show-read-aloud": hasSettledText.value,
					"read-aloud-test-id": "instance-ai-message-read-aloud"
				}, {
					default: withCtx(() => [unref(store).debugMode ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						placement: "bottom",
						content: debugActionLabel.value
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "code",
							variant: "ghost",
							size: "small",
							"icon-size": "medium",
							"data-test-id": "instance-ai-message-debug",
							"aria-label": debugActionLabel.value,
							"aria-pressed": showDebugInfo.value,
							onClick: toggleDebugInfo
						}, null, 8, ["aria-label", "aria-pressed"])]),
						_: 1
					}, 8, ["content"])) : createCommentVNode("", true)]),
					_: 1
				}, 8, [
					"content",
					"show-copy",
					"show-rating",
					"show-read-aloud"
				])]),
				key: "0"
			} : void 0, trailingAnswer.value ? {
				name: "after-actions",
				fn: withCtx(() => [createVNode(AnsweredQuestions_default, { "tool-call": trailingAnswer.value }, null, 8, ["tool-call"])]),
				key: "1"
			} : void 0]), 1032, ["role", "data-test-id"]);
		};
	}
}), [["__cssModules", { "$style": {
	fileAttachments: "_fileAttachments_11q2a_450",
	userAttachmentsAfterText: "_userAttachmentsAfterText_11q2a_455",
	userAttachments: "_userAttachments_11q2a_455",
	statusIndicator: "_statusIndicator_11q2a_465",
	"status-fade-in": "_status-fade-in_11q2a_1",
	cancelledIndicator: "_cancelledIndicator_11q2a_475",
	statusDot: "_statusDot_11q2a_483",
	opacityPulse: "_opacityPulse_11q2a_1",
	blinkingCursor: "_blinkingCursor_11q2a_506",
	"cursor-blink": "_cursor-blink_11q2a_1",
	runLevelError: "_runLevelError_11q2a_523",
	runLevelErrorDetails: "_runLevelErrorDetails_11q2a_529",
	errorDetailsSummary: "_errorDetailsSummary_11q2a_541",
	debugJson: "_debugJson_11q2a_550",
	shimmer: "_shimmer_11q2a_1",
	spin: "_spin_11q2a_1",
	"skeleton-pulse": "_skeleton-pulse_11q2a_1",
	popoverIn: "_popoverIn_11q2a_1",
	fadeIn: "_fadeIn_11q2a_1",
	collapsibleSlideDown: "_collapsibleSlideDown_11q2a_1",
	collapsibleSlideUp: "_collapsibleSlideUp_11q2a_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_11q2a_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_11q2a_1",
	blurSwapIn: "_blurSwapIn_11q2a_1",
	blurSwapOut: "_blurSwapOut_11q2a_1",
	pulse: "_pulse_11q2a_1",
	pulseGlow: "_pulseGlow_11q2a_1",
	pulseGlowDelayed: "_pulseGlowDelayed_11q2a_1",
	fade: "_fade_11q2a_1",
	fadeInUp: "_fadeInUp_11q2a_1",
	fadeInDown: "_fadeInDown_11q2a_1",
	fadeInLeft: "_fadeInLeft_11q2a_1",
	fadeInRight: "_fadeInRight_11q2a_1",
	fadeOut: "_fadeOut_11q2a_1",
	fadeOutDown: "_fadeOutDown_11q2a_1",
	fadeOutUp: "_fadeOutUp_11q2a_1",
	fadeOutLeft: "_fadeOutLeft_11q2a_1",
	fadeOutRight: "_fadeOutRight_11q2a_1",
	ping: "_ping_11q2a_1",
	blinkBackground: "_blinkBackground_11q2a_1",
	typingBlink: "_typingBlink_11q2a_1"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiStatusBar.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler(), init_reactivity_esm_bundler();
var _hoisted_1$2 = { key: 0 };
var _hoisted_2 = { key: 1 };
var InstanceAiStatusBar_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiStatusBar",
	setup(__props) {
		const thread = useThread();
		const i18n = useI18n();
		const { getToolLabel } = useToolLabel();
		const elapsed = ref(0);
		let timer = null;
		function deriveActivity(messages) {
			const lastMsg = [...messages].reverse().find((m) => m.role === "assistant" && (m.isStreaming || (m.agentTree?.children.some(isActiveBuilderAgent) ?? false)));
			if (!lastMsg?.agentTree) return { label: i18n.baseText("instanceAi.statusBar.thinking") };
			const tree = lastMsg.agentTree;
			const activeChild = tree.children.find((c) => c.status === "active");
			if (activeChild) {
				const activityKey = getAgentActivityKey(activeChild);
				const roleLabel = getAgentSectionTitle(activeChild, activityKey ? i18n.baseText(activityKey) : void 0) ?? i18n.baseText("instanceAi.statusBar.thinking");
				const activeTool = activeChild.toolCalls.find((tc) => tc.isLoading);
				if (activeTool) return {
					label: roleLabel,
					detail: getToolLabel(activeTool.toolName, activeTool.args)
				};
				return { label: roleLabel };
			}
			const activeTool = tree.toolCalls.find((tc) => tc.isLoading);
			if (activeTool) return { label: getToolLabel(activeTool.toolName, activeTool.args) };
			return { label: i18n.baseText("instanceAi.statusBar.thinking") };
		}
		const activity = computed(() => deriveActivity(thread.messages));
		/**
		* True while the streaming orchestrator is rendering an active thinking
		* block — its streamed status line (and tool subline) already shows the live
		* activity, so the bar would say the same thing twice. The bar still covers
		* the moments the block can't: run start before any trace exists, and
		* background builders working after the orchestrator finished (root no
		* longer active).
		*/
		function hasActiveThinkingTrace(messages) {
			return messages.some((m) => {
				if (m.role !== "assistant" || !m.isStreaming) return false;
				const root = m.agentTree;
				if (!root || root.status !== "active") return false;
				return root.timeline.some((entry) => entry.type === "reasoning" || entry.type === "tool-call");
			});
		}
		const isVisible = computed(() => !thread.isAwaitingConfirmation && !hasActiveThinkingTrace(thread.messages) && (thread.isStreaming || collectActiveBuilderAgents(thread.messages).length > 0));
		const formattedElapsed = computed(() => {
			const s = elapsed.value;
			if (s < 60) return `${String(s)}s`;
			const m = Math.floor(s / 60);
			const remaining = s % 60;
			return `${String(m)}m ${String(remaining).padStart(2, "0")}s`;
		});
		watch(isVisible, (visible) => {
			if (visible) {
				elapsed.value = 0;
				timer = setInterval(() => {
					elapsed.value++;
				}, 1e3);
			} else if (timer) {
				clearInterval(timer);
				timer = null;
			}
		}, { immediate: true });
		onUnmounted(() => {
			if (timer) clearInterval(timer);
		});
		return (_ctx, _cache) => {
			return openBlock(), createBlock(Transition, { name: "status-bar" }, {
				default: withCtx(() => [isVisible.value && activity.value ? (openBlock(), createElementBlock("div", {
					key: 0,
					class: normalizeClass(_ctx.$style.bar),
					"data-test-id": "instance-ai-status-bar"
				}, [
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.label) }, toDisplayString(activity.value.label), 3),
					activity.value.detail ? (openBlock(), createElementBlock("span", _hoisted_1$2, "·")) : createCommentVNode("", true),
					activity.value.detail ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(activity.value.detail), 1)) : createCommentVNode("", true),
					_cache[0] || (_cache[0] = createBaseVNode("span", null, "·", -1)),
					createBaseVNode("span", { class: normalizeClass(_ctx.$style.elapsed) }, toDisplayString(formattedElapsed.value), 3)
				], 2)) : createCommentVNode("", true)]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	bar: "_bar_loruz_453",
	label: "_label_loruz_464",
	shimmer: "_shimmer_loruz_1",
	elapsed: "_elapsed_loruz_485",
	spin: "_spin_loruz_1",
	"skeleton-pulse": "_skeleton-pulse_loruz_1",
	opacityPulse: "_opacityPulse_loruz_1",
	popoverIn: "_popoverIn_loruz_1",
	fadeIn: "_fadeIn_loruz_1",
	collapsibleSlideDown: "_collapsibleSlideDown_loruz_1",
	collapsibleSlideUp: "_collapsibleSlideUp_loruz_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_loruz_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_loruz_1",
	blurSwapIn: "_blurSwapIn_loruz_1",
	blurSwapOut: "_blurSwapOut_loruz_1",
	pulse: "_pulse_loruz_1",
	pulseGlow: "_pulseGlow_loruz_1",
	pulseGlowDelayed: "_pulseGlowDelayed_loruz_1",
	fade: "_fade_loruz_1",
	fadeInUp: "_fadeInUp_loruz_1",
	fadeInDown: "_fadeInDown_loruz_1",
	fadeInLeft: "_fadeInLeft_loruz_1",
	fadeInRight: "_fadeInRight_loruz_1",
	fadeOut: "_fadeOut_loruz_1",
	fadeOutDown: "_fadeOutDown_loruz_1",
	fadeOutUp: "_fadeOutUp_loruz_1",
	fadeOutLeft: "_fadeOutLeft_loruz_1",
	fadeOutRight: "_fadeOutRight_loruz_1",
	ping: "_ping_loruz_1",
	blinkBackground: "_blinkBackground_loruz_1",
	typingBlink: "_typingBlink_loruz_1"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/CloudBrowserResourceDecision.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/components/CloudBrowserResourceDecision.vue
var CloudBrowserResourceDecision_default = /* @__PURE__ */ defineComponent({
	__name: "CloudBrowserResourceDecision",
	props: {
		requestId: {},
		kind: {},
		resource: {},
		description: {},
		options: {},
		taskTitle: {}
	},
	setup(__props) {
		const props = __props;
		const i18n = useI18n();
		const telemetry = useTelemetry();
		const rootStore = useRootStore();
		const thread = useThread();
		const title = computed(() => props.kind === "credential-write" ? i18n.baseText("instanceAi.cloudBrowserConfirmation.credentialPrompt", { interpolate: { task: props.taskTitle } }) : i18n.baseText("instanceAi.cloudBrowserConfirmation.hostPrompt", { interpolate: {
			host: props.resource,
			task: props.taskTitle
		} }));
		const details = computed(() => props.kind === "credential-write" ? props.description : props.resource);
		const approvalOptions = computed(() => {
			const list = [];
			if (props.options.includes("allowForSession")) list.push({
				key: "allowForSession",
				icon: "check",
				label: i18n.baseText("instanceAi.domainAccess.allowDomain", { interpolate: { domain: props.resource } }),
				suffix: i18n.baseText("instanceAi.confirmation.alwaysAllowSuffix"),
				testId: "cloud-browser-decision-allow-session"
			});
			if (props.options.includes("allowOnce")) list.push({
				key: "allowOnce",
				icon: "check",
				label: i18n.baseText("instanceAi.domainAccess.allowOnce"),
				testId: "cloud-browser-decision-allow-once"
			});
			if (props.options.includes("denyOnce")) list.push({
				key: "denyOnce",
				icon: "ban",
				label: i18n.baseText("instanceAi.domainAccess.deny"),
				withArrow: false,
				testId: "cloud-browser-decision-deny"
			});
			return list;
		});
		function onSelect(key) {
			const decision = props.options.find((option) => option === key);
			if (!decision) return;
			const tc = thread.findToolCallByRequestId(props.requestId);
			const eventProps = {
				thread_id: thread.id,
				input_thread_id: tc?.confirmation?.inputThreadId ?? "",
				instance_id: rootStore.instanceId,
				type: "resource-decision",
				browser: "cloud",
				resource_kind: props.kind ?? "host",
				provided_inputs: [{
					label: props.resource,
					options: props.options,
					option_chosen: decision
				}],
				skipped_inputs: []
			};
			telemetry.track("User finished providing input", redactTelemetryProperties(eventProps));
			thread.confirmResourceDecision(props.requestId, decision);
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(ApprovalCard_default), {
				title: title.value,
				"title-size": "medium",
				description: details.value,
				options: approvalOptions.value,
				onSelect
			}, null, 8, [
				"title",
				"description",
				"options"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/workflowSetup/composables/useWorkflowSetupApply.ts
init_reactivity_esm_bundler(), init_runtime_core_esm_bundler();
var APPLY_TIMEOUT_MS = 6e4;
var WAIT_CANCELLED = Symbol("wait-cancelled");
function useWorkflowSetupApply(deps) {
	const toast = useToast();
	const terminalState = ref(null);
	let cancelWait = null;
	onUnmounted(() => {
		cancelWait?.();
	});
	function waitForToolResult(requestId) {
		let stopWatch = null;
		let timeoutId = null;
		let resolveWait = null;
		function cleanup() {
			if (stopWatch) {
				stopWatch();
				stopWatch = null;
			}
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		}
		function finish(result) {
			cleanup();
			resolveWait?.(result);
			resolveWait = null;
		}
		return {
			promise: new Promise((resolve) => {
				resolveWait = resolve;
				const existing = deps.thread.findToolCallByRequestId(requestId);
				if (existing?.result !== void 0) {
					finish(isRecord(existing.result) ? existing.result : null);
					return;
				}
				stopWatch = watch(() => {
					return deps.thread.findToolCallByRequestId(requestId)?.result;
				}, (result) => {
					if (result !== void 0) finish(isRecord(result) ? result : null);
				});
				timeoutId = setTimeout(() => {
					finish(null);
				}, APPLY_TIMEOUT_MS);
			}),
			cancel: () => finish(WAIT_CANCELLED)
		};
	}
	async function apply(payload) {
		if (terminalState.value === "applying") return;
		terminalState.value = "applying";
		if (!await deps.thread.confirmAction(deps.requestId.value, {
			kind: "setupWorkflowApply",
			...payload
		})) {
			terminalState.value = null;
			return;
		}
		cancelWait?.();
		const { promise, cancel } = waitForToolResult(deps.requestId.value);
		cancelWait = cancel;
		const result = await promise;
		cancelWait = null;
		if (result === WAIT_CANCELLED) {
			terminalState.value = null;
			return;
		}
		if (result === null) {
			toast.showError(/* @__PURE__ */ new Error("Apply timed out — please try again."), "Setup failed");
			terminalState.value = null;
			return;
		}
		if (result.success === true) {
			terminalState.value = result.partial === true ? "partial" : "applied";
			deps.thread.resolveConfirmation(deps.requestId.value, "approved");
			return result;
		}
		const message = typeof result.error === "string" ? result.error : "Apply failed.";
		toast.showError(new Error(message), "Setup failed");
		terminalState.value = null;
	}
	async function defer() {
		if (terminalState.value === "applying") return;
		terminalState.value = "applying";
		if (await deps.thread.confirmAction(deps.requestId.value, {
			kind: "approval",
			approved: false
		})) {
			terminalState.value = "deferred";
			deps.thread.resolveConfirmation(deps.requestId.value, "deferred");
			return;
		}
		terminalState.value = null;
	}
	return {
		terminalState,
		apply,
		defer
	};
}
//#endregion
//#region src/features/ai/instanceAi/workflowSetup/InstanceAiThreadWorkflowSetup.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
//#endregion
//#region src/features/ai/instanceAi/workflowSetup/InstanceAiThreadWorkflowSetup.vue
var InstanceAiThreadWorkflowSetup_default = /* @__PURE__ */ defineComponent({
	__name: "InstanceAiThreadWorkflowSetup",
	props: {
		requestId: {},
		setupRequests: {},
		projectId: {},
		workflowId: {},
		credentialFlow: {},
		inputThreadId: {}
	},
	setup(__props) {
		/**
		* The workflow setup card in a current Assistant thread. The card emits the
		* user's answer. This wrapper sends it through the thread, waits for the setup
		* tool result, and settles the card with the outcome.
		*/
		const props = __props;
		const thread = useThread();
		const applyMachine = useWorkflowSetupApply({
			requestId: toRef(props, "requestId"),
			thread
		});
		const outcome = ref();
		async function onApply(payload) {
			const result = await applyMachine.apply(payload);
			outcome.value = {
				state: applyMachine.terminalState.value ?? "failed",
				...result ? { result } : {}
			};
		}
		async function onDefer() {
			await applyMachine.defer();
			outcome.value = { state: applyMachine.terminalState.value ?? "failed" };
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(InstanceAiWorkflowSetup_default, {
				"request-id": __props.requestId,
				"setup-requests": __props.setupRequests,
				"project-id": __props.projectId,
				"workflow-id": __props.workflowId,
				"credential-flow": __props.credentialFlow,
				"thread-id": unref(thread).id,
				"input-thread-id": __props.inputThreadId,
				outcome: outcome.value,
				onApply,
				onDefer
			}, null, 8, [
				"request-id",
				"setup-requests",
				"project-id",
				"workflow-id",
				"credential-flow",
				"thread-id",
				"input-thread-id",
				"outcome"
			]);
		};
	}
});
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiConfirmationPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
/**
* Filter pending confirmations to those that belong in this panel mount.
*
* - `inline`: every non-floating item (plan/text/setup/etc.) in chronological
*   order — these forms coexist comfortably in the chat flow.
* - `floating`: only the **oldest** floating item. We intentionally do not
*   stack: the floating panel replaces the chat input, and stacking would
*   shove the input far up the screen. The user must resolve the visible
*   card before the next one appears.
*/
var MAX_CHANNEL_CONFIRM_ATTEMPTS = 2;
var InstanceAiConfirmationPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiConfirmationPanel",
	props: { kind: {} },
	setup(__props) {
		const props = __props;
		const thread = useThread();
		const i18n = useI18n();
		const approvalLabels = useApprovalCardLabels();
		const rootStore = useRootStore();
		const settingsStore = useInstanceAiSettingsStore();
		const telemetry = useTelemetry();
		function trackInputCompleted$1(conf, inputs) {
			trackInputCompleted(telemetry, {
				threadId: thread.id,
				inputThreadId: conf.inputThreadId,
				instanceId: rootStore.instanceId,
				actionSource: thread.resolveActionSource(),
				type: getConfirmationType(conf),
				runtime: "instance-ai"
			}, inputs);
		}
		const chunks = computed(() => {
			if (props.kind === "inline") {
				const result = [];
				for (const item of thread.pendingConfirmations) {
					if (isPendingItemFloating(item)) continue;
					result.push({
						type: "standalone",
						item
					});
				}
				return result;
			}
			for (const item of thread.pendingConfirmations) {
				if (!isPendingItemFloating(item)) continue;
				return [{
					type: "floating",
					item
				}];
			}
			return [];
		});
		function isDestructive(item) {
			return item.toolCall.confirmation.severity === "destructive";
		}
		/**
		* Title for the floating approval. We resolve a short imperative phrase
		* (e.g. "archive workflow") via i18n keyed by the tool name and optional
		* action — `instanceAi.tools.{tool}.{action}.imperative`. When that key
		* exists we render the unified "Allow n8n Assistant to {action}?" prompt;
		* otherwise we fall back to the tool's display label. Doing the lookup on
		* the frontend keeps the action phrase translatable without sending
		* English strings over the wire.
		*
		* When the tool names the resource it acts on, the title carries that name
		* ("Assistant wants to edit CRM Lead enrichment") and the phrase comes from
		* the `.imperativeWithResource` key, which is written to precede a name.
		*/
		function buildApprovalTitle(item) {
			const credentialDestination = item.toolCall.confirmation.credentialDestination;
			if (credentialDestination) return i18n.baseText("instanceAi.confirmation.credentialDestination.title", { interpolate: { origin: credentialDestination.origin } });
			if (item.toolCall.confirmation.targetApproval) return buildApprovalSubtitle(item);
			return formatApprovalTitle({
				toolName: item.toolCall.toolName,
				args: item.toolCall.args,
				resourceName: item.toolCall.confirmation.resourceName,
				approvalDetails: item.toolCall.confirmation.approvalDetails
			});
		}
		/** Show the full change summary. Resource names and values can contain question marks, so never trim at one. */
		function buildApprovalSubtitle(item) {
			const credentialDestination = item.toolCall.confirmation.credentialDestination;
			if (credentialDestination) {
				const [nodeName] = credentialDestination.nodeNames;
				if (credentialDestination.nodeNames.length === 1 && nodeName) return i18n.baseText("instanceAi.confirmation.credentialDestination.description", { interpolate: { nodeName } });
				return i18n.baseText("instanceAi.confirmation.credentialDestination.descriptionMultiple", { interpolate: { nodeNames: credentialDestination.nodeNames.join(", ") } });
			}
			const targetApproval = item.toolCall.confirmation.targetApproval;
			if (targetApproval) return i18n.baseText("ai.shared.toolApproval.description", { interpolate: { toolName: targetApproval.displayName ?? targetApproval.toolName } });
			const details = item.toolCall.confirmation.approvalDetails;
			return details ? formatApprovalDetails(details) : item.toolCall.confirmation.message ?? "";
		}
		function canAlwaysAllow(item) {
			const conf = item.toolCall.confirmation;
			return !isDestructive(item) && !conf.targetApproval && !conf.credentialDestination && thread.canAlwaysAllow(item.toolCall.toolName, item.toolCall.args ?? {}, conf.workflowId);
		}
		function credentialDestinationOptions(item) {
			if (!item.toolCall.confirmation.credentialDestination) return void 0;
			return [{
				key: "allow-once",
				icon: "check",
				label: i18n.baseText("instanceAi.confirmation.credentialDestination.approve")
			}, {
				key: "deny",
				icon: "ban",
				label: i18n.baseText("instanceAi.confirmation.credentialDestination.deny")
			}];
		}
		function handleApprovalSelect(item, key) {
			switch (key) {
				case "always-allow":
					handleAlwaysAllow(item);
					return;
				case "allow-once":
					handleConfirm(item, true);
					return;
				case "deny": handleConfirm(item, false);
			}
		}
		const textInputValues = ref({});
		const inFlightConfirmations = /* @__PURE__ */ new Set();
		async function handleConfirm(item, approved) {
			const conf = item.toolCall.confirmation;
			if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
			if (inFlightConfirmations.has(conf.requestId)) return;
			inFlightConfirmations.add(conf.requestId);
			try {
				const credentialDestination = conf.credentialDestination;
				const payload = credentialDestination ? {
					kind: "credentialDestination",
					approved,
					origin: credentialDestination.origin
				} : {
					kind: "approval",
					approved
				};
				if (!await thread.confirmAction(conf.requestId, payload)) return;
				trackInputCompleted$1(conf, approvalInputs(conf.message, approved ? "approve" : "deny", canAlwaysAllow(item)));
				thread.resolveConfirmation(conf.requestId, approved ? "approved" : "denied");
			} finally {
				inFlightConfirmations.delete(conf.requestId);
			}
		}
		async function handleAlwaysAllow(item) {
			const conf = item.toolCall.confirmation;
			if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
			if (inFlightConfirmations.has(conf.requestId)) return;
			inFlightConfirmations.add(conf.requestId);
			try {
				if (!await thread.confirmAction(conf.requestId, {
					kind: "approval",
					approved: true,
					scope: "session"
				})) return;
				thread.addAlwaysAllowKey(item.toolCall.toolName, item.toolCall.args ?? {}, conf.workflowId);
				trackInputCompleted$1(conf, approvalInputs(conf.message, "approve_always", true));
				thread.resolveConfirmation(conf.requestId, "approved");
			} finally {
				inFlightConfirmations.delete(conf.requestId);
			}
		}
		function handleTextSubmit(conf) {
			const value = (textInputValues.value[conf.requestId] ?? "").trim();
			if (!value) return;
			trackInputCompleted$1(conf, textInputs(conf.message, value));
			thread.resolveConfirmation(conf.requestId, "approved");
			thread.confirmAction(conf.requestId, {
				kind: "approval",
				approved: true,
				userInput: value
			});
		}
		function handleTextSkip(conf) {
			trackInputCompleted$1(conf, skippedTextInputs(conf.message));
			thread.resolveConfirmation(conf.requestId, "deferred");
			thread.confirmAction(conf.requestId, {
				kind: "approval",
				approved: false
			});
		}
		async function settleTestListener(conf, outcome) {
			if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
			if (inFlightConfirmations.has(conf.requestId)) return;
			inFlightConfirmations.add(conf.requestId);
			try {
				const { approved, executionId } = outcome;
				if (!await thread.confirmAction(conf.requestId, {
					kind: "approval",
					approved,
					...executionId ? { userInput: executionId } : {}
				})) return;
				if (!outcome.fromPush) trackInputCompleted$1(conf, testListenerInputs(conf.message, approved));
				thread.resolveConfirmation(conf.requestId, approved ? "approved" : "denied");
			} finally {
				inFlightConfirmations.delete(conf.requestId);
			}
		}
		const removePushListener = usePushConnectionStore().addEventListener((event) => {
			if (event.type !== "testWebhookReceived" && event.type !== "testWebhookDeleted") return;
			for (const item of thread.pendingConfirmations) {
				const conf = item.toolCall.confirmation;
				if (conf?.testListener?.workflowId !== event.data.workflowId) continue;
				settleTestListener(conf, {
					approved: true,
					executionId: event.type === "testWebhookReceived" ? event.data.executionId : void 0,
					fromPush: true
				});
			}
		});
		onBeforeUnmount(removePushListener);
		function formatDeadline(iso) {
			return new Date(iso).toLocaleTimeString(void 0, {
				hour: "2-digit",
				minute: "2-digit"
			});
		}
		/** Bumped for a credential card whose answer failed to send, so the card shows its form again. */
		const credentialFailures = ref({});
		async function handleCredentialDecision(conf, body, resolution) {
			if (await thread.confirmAction(conf.requestId, body)) {
				thread.resolveConfirmation(conf.requestId, resolution);
				return;
			}
			credentialFailures.value[conf.requestId] = (credentialFailures.value[conf.requestId] ?? 0) + 1;
		}
		function handleResourceDecision(conf, decision) {
			thread.confirmResourceDecision(conf.requestId, decision);
		}
		async function handleChannelDecision(conf, approved) {
			if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
			for (let attempt = 0; attempt < MAX_CHANNEL_CONFIRM_ATTEMPTS; attempt++) if (await thread.confirmAction(conf.requestId, {
				kind: "approval",
				approved
			})) break;
			thread.resolveConfirmation(conf.requestId, approved ? "approved" : "deferred");
		}
		/** Domain access and web search cards emit the decision, and the panel sends it. */
		function handleDomainDecision(conf, body) {
			thread.resolveConfirmation(conf.requestId, body.kind === "domainAccessApprove" ? "approved" : "denied");
			thread.confirmAction(conf.requestId, body);
		}
		function handleContinue(conf) {
			if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
			trackInputCompleted$1(conf, continueInputs(conf.message));
			thread.resolveConfirmation(conf.requestId, "approved");
			thread.confirmAction(conf.requestId, {
				kind: "approval",
				approved: true
			});
		}
		function handleQuestionsSubmit(conf, answers) {
			trackInputCompleted$1(conf, questionsInputs(conf.questions ?? [], answers));
			thread.resolveConfirmation(conf.requestId, "approved");
			thread.confirmAction(conf.requestId, {
				kind: "questions",
				answers
			});
		}
		return (_ctx, _cache) => {
			return openBlock(), createBlock(TransitionGroup, { name: "confirmation-slide" }, {
				default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(chunks.value, (chunk) => {
					return openBlock(), createElementBlock(Fragment, { key: chunk.item.toolCall.confirmation.requestId }, [chunk.type === "floating" && chunk.item.toolCall.confirmation.inputType === "questions" && chunk.item.toolCall.confirmation.questions ? (openBlock(), createBlock(InstanceAiQuestions_default, {
						key: "q-" + chunk.item.toolCall.confirmation.requestId,
						questions: chunk.item.toolCall.confirmation.questions,
						"intro-message": chunk.item.toolCall.confirmation.introMessage,
						onSubmit: (answers) => handleQuestionsSubmit(chunk.item.toolCall.confirmation, answers)
					}, null, 8, [
						"questions",
						"intro-message",
						"onSubmit"
					])) : chunk.type === "standalone" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [chunk.item.toolCall.confirmation.setupRequests?.length ? (openBlock(), createBlock(InstanceAiThreadWorkflowSetup_default, {
						key: "setup-" + chunk.item.toolCall.confirmation.requestId,
						"request-id": chunk.item.toolCall.confirmation.requestId,
						"setup-requests": chunk.item.toolCall.confirmation.setupRequests,
						"project-id": chunk.item.toolCall.confirmation.projectId ?? unref(thread).projectId,
						"credential-flow": chunk.item.toolCall.confirmation.credentialFlow,
						"workflow-id": chunk.item.toolCall.confirmation.workflowId,
						"input-thread-id": chunk.item.toolCall.confirmation.inputThreadId
					}, null, 8, [
						"request-id",
						"setup-requests",
						"project-id",
						"credential-flow",
						"workflow-id",
						"input-thread-id"
					])) : chunk.item.toolCall.confirmation.credentialRequests?.length ? (openBlock(), createBlock(InstanceAiCredentialSetup_default, {
						key: "cred-" + chunk.item.toolCall.confirmation.requestId,
						"credential-requests": chunk.item.toolCall.confirmation.credentialRequests,
						message: chunk.item.toolCall.confirmation.message,
						"project-id": chunk.item.toolCall.confirmation.projectId ?? unref(thread).projectId,
						"credential-flow": chunk.item.toolCall.confirmation.credentialFlow,
						"require-user-selection": chunk.item.toolCall.confirmation.requireUserSelection,
						"thread-id": unref(thread).id,
						"input-thread-id": chunk.item.toolCall.confirmation.inputThreadId,
						"failed-attempts": credentialFailures.value[chunk.item.toolCall.confirmation.requestId] ?? 0,
						onDecide: (body, resolution) => handleCredentialDecision(chunk.item.toolCall.confirmation, body, resolution)
					}, null, 8, [
						"credential-requests",
						"message",
						"project-id",
						"credential-flow",
						"require-user-selection",
						"thread-id",
						"input-thread-id",
						"failed-attempts",
						"onDecide"
					])) : chunk.item.toolCall.confirmation.inputType === "text" ? (openBlock(), createElementBlock("div", { key: "text-" + chunk.item.toolCall.confirmation.requestId }, [createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.textCard) }, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { tag: "div" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(chunk.item.toolCall.confirmation.message), 1)]),
							_: 2
						}, 1024), createBaseVNode("div", { class: normalizeClass(_ctx.$style.textInputRow) }, [
							createVNode(unref(Input_default), {
								modelValue: textInputValues.value[chunk.item.toolCall.confirmation.requestId],
								"onUpdate:modelValue": ($event) => textInputValues.value[chunk.item.toolCall.confirmation.requestId] = $event,
								type: "text",
								size: "small",
								placeholder: unref(i18n).baseText("instanceAi.askUser.placeholder"),
								onKeydown: withKeys(($event) => handleTextSubmit(chunk.item.toolCall.confirmation), ["enter"])
							}, null, 8, [
								"modelValue",
								"onUpdate:modelValue",
								"placeholder",
								"onKeydown"
							]),
							!(textInputValues.value[chunk.item.toolCall.confirmation.requestId] ?? "").trim() ? (openBlock(), createBlock(unref(N8nButton_default), {
								key: 0,
								size: "medium",
								variant: "outline",
								onClick: ($event) => handleTextSkip(chunk.item.toolCall.confirmation)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.askUser.skip")), 1)]),
								_: 1
							}, 8, ["onClick"])) : createCommentVNode("", true),
							createVNode(unref(N8nButton_default), {
								size: "medium",
								variant: "solid",
								disabled: !(textInputValues.value[chunk.item.toolCall.confirmation.requestId] ?? "").trim(),
								onClick: ($event) => handleTextSubmit(chunk.item.toolCall.confirmation)
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.askUser.submit")), 1)]),
								_: 1
							}, 8, ["disabled", "onClick"])
						], 2)]),
						_: 2
					}, 1032, ["class"])])) : chunk.item.toolCall.confirmation.inputType === "continue" ? (openBlock(), createElementBlock("div", { key: "continue-" + chunk.item.toolCall.confirmation.requestId }, [createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.textCard) }, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { tag: "div" }, {
							default: withCtx(() => [createTextVNode(toDisplayString(chunk.item.toolCall.confirmation.message), 1)]),
							_: 2
						}, 1024), createBaseVNode("div", { class: normalizeClass(_ctx.$style.continueRow) }, [createVNode(unref(N8nButton_default), {
							"data-test-id": "instance-ai-panel-continue",
							size: "medium",
							variant: "solid",
							onClick: ($event) => handleContinue(chunk.item.toolCall.confirmation)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.confirmation.continue")), 1)]),
							_: 1
						}, 8, ["onClick"])], 2)]),
						_: 2
					}, 1032, ["class"])])) : chunk.item.toolCall.confirmation.testListener ? (openBlock(), createElementBlock("div", {
						key: "test-listener-" + chunk.item.toolCall.confirmation.requestId,
						"data-test-id": "instance-ai-test-listener"
					}, [createVNode(unref(N8nCard_default), { class: normalizeClass(_ctx.$style.textCard) }, {
						default: withCtx(() => [
							createVNode(unref(N8nText_default), { tag: "div" }, {
								default: withCtx(() => [createTextVNode(toDisplayString(chunk.item.toolCall.confirmation.message), 1)]),
								_: 2
							}, 1024),
							(openBlock(true), createElementBlock(Fragment, null, renderList(chunk.item.toolCall.confirmation.testListener.triggers, (trigger) => {
								return openBlock(), createElementBlock("div", {
									key: trigger.nodeName,
									class: normalizeClass(_ctx.$style.testListenerUrl)
								}, [createVNode(unref(N8nText_default), {
									tag: "span",
									size: "small",
									bold: ""
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(trigger.method), 1)]),
									_: 2
								}, 1024), createVNode(unref(N8nText_default), {
									tag: "code",
									size: "small",
									"data-test-id": "instance-ai-test-listener-url"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(trigger.url), 1)]),
									_: 2
								}, 1024)], 2);
							}), 128)),
							createVNode(unref(N8nText_default), {
								tag: "div",
								size: "small",
								color: "text-light"
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testListener.deadline", { interpolate: { time: formatDeadline(chunk.item.toolCall.confirmation.testListener.deadlineAt) } })), 1)]),
								_: 2
							}, 1024),
							createBaseVNode("div", { class: normalizeClass(_ctx.$style.continueRow) }, [createVNode(unref(N8nButton_default), {
								"data-test-id": "instance-ai-test-listener-cancel",
								size: "medium",
								variant: "outline",
								onClick: ($event) => settleTestListener(chunk.item.toolCall.confirmation, { approved: false })
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testListener.cancel")), 1)]),
								_: 1
							}, 8, ["onClick"]), createVNode(unref(N8nButton_default), {
								"data-test-id": "instance-ai-test-listener-sent",
								size: "medium",
								variant: "solid",
								onClick: ($event) => settleTestListener(chunk.item.toolCall.confirmation, { approved: true })
							}, {
								default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.testListener.sent")), 1)]),
								_: 1
							}, 8, ["onClick"])], 2)
						]),
						_: 2
					}, 1032, ["class"])])) : chunk.item.toolCall.confirmation.inputType === "resource-decision" && chunk.item.toolCall.confirmation.resourceDecision ? (openBlock(), createBlock(GatewayResourceDecision_default, {
						key: "rd-" + chunk.item.toolCall.confirmation.requestId,
						"data-test-id": "instance-ai-gateway-confirmation-panel",
						"thread-id": unref(thread).id,
						"input-thread-id": chunk.item.toolCall.confirmation.inputThreadId,
						resource: chunk.item.toolCall.confirmation.resourceDecision.resource,
						description: chunk.item.toolCall.confirmation.resourceDecision.description,
						options: chunk.item.toolCall.confirmation.resourceDecision.options,
						onDecide: ($event) => handleResourceDecision(chunk.item.toolCall.confirmation, $event)
					}, null, 8, [
						"thread-id",
						"input-thread-id",
						"resource",
						"description",
						"options",
						"onDecide"
					])) : chunk.item.toolCall.confirmation.channelConfig ? (openBlock(), createBlock(InstanceAiChannelSetup_default, {
						key: "channel-" + chunk.item.toolCall.confirmation.requestId,
						"integration-type": chunk.item.toolCall.confirmation.channelConfig.integrationType,
						"agent-id": chunk.item.toolCall.confirmation.channelConfig.agentId,
						"project-id": chunk.item.toolCall.confirmation.projectId ?? "",
						onDecide: ($event) => handleChannelDecision(chunk.item.toolCall.confirmation, $event)
					}, null, 8, [
						"integration-type",
						"agent-id",
						"project-id",
						"onDecide"
					])) : createCommentVNode("", true)], 64)) : chunk.item.toolCall.confirmation.domainAccess ? (openBlock(), createBlock(DomainAccessApproval_default, {
						key: "floating-" + chunk.item.toolCall.confirmation.requestId,
						"data-test-id": "instance-ai-confirmation-panel",
						url: chunk.item.toolCall.confirmation.domainAccess.url,
						host: chunk.item.toolCall.confirmation.domainAccess.host,
						severity: chunk.item.toolCall.confirmation.severity,
						onDecide: ($event) => handleDomainDecision(chunk.item.toolCall.confirmation, $event)
					}, null, 8, [
						"url",
						"host",
						"severity",
						"onDecide"
					])) : chunk.item.toolCall.confirmation.webSearch ? (openBlock(), createBlock(DomainAccessApproval_default, {
						key: "floating-" + chunk.item.toolCall.confirmation.requestId,
						"data-test-id": "instance-ai-confirmation-panel",
						query: chunk.item.toolCall.confirmation.webSearch.query,
						severity: chunk.item.toolCall.confirmation.severity,
						onDecide: ($event) => handleDomainDecision(chunk.item.toolCall.confirmation, $event)
					}, null, 8, [
						"query",
						"severity",
						"onDecide"
					])) : unref(isCloudBrowserResourceDecision)(chunk.item) && chunk.item.toolCall.confirmation.resourceDecision ? (openBlock(), createBlock(CloudBrowserResourceDecision_default, {
						key: "floating-" + chunk.item.toolCall.confirmation.requestId,
						"data-test-id": "instance-ai-confirmation-panel",
						"request-id": chunk.item.toolCall.confirmation.requestId,
						kind: chunk.item.toolCall.confirmation.resourceDecision.kind,
						resource: chunk.item.toolCall.confirmation.resourceDecision.resource,
						description: chunk.item.toolCall.confirmation.resourceDecision.description,
						options: chunk.item.toolCall.confirmation.resourceDecision.options,
						"task-title": chunk.item.agentNode.title ?? ""
					}, null, 8, [
						"request-id",
						"kind",
						"resource",
						"description",
						"options",
						"task-title"
					])) : (openBlock(), createBlock(unref(ApprovalCard_default), {
						key: "floating-" + chunk.item.toolCall.confirmation.requestId,
						"data-test-id": "instance-ai-confirmation-panel",
						title: buildApprovalTitle(chunk.item),
						labels: unref(approvalLabels),
						description: chunk.item.toolCall.confirmation.targetApproval ? void 0 : buildApprovalSubtitle(chunk.item),
						args: chunk.item.toolCall.confirmation.targetApproval?.args,
						"description-label": unref(i18n).baseText("instanceAi.confirmation.details"),
						options: credentialDestinationOptions(chunk.item),
						"supports-session-approval": canAlwaysAllow(chunk.item),
						destructive: isDestructive(chunk.item),
						onSelect: (key) => handleApprovalSelect(chunk.item, key)
					}, createSlots({ _: 2 }, [unref(settingsStore).isInstanceAiSetupPanelEnabled && chunk.item.toolCall.confirmation.credentialDestination ? {
						name: "description",
						fn: withCtx(() => [createVNode(unref(N8nText_default), {
							tag: "p",
							size: "small",
							class: normalizeClass(_ctx.$style.credentialDescription)
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(buildApprovalSubtitle(chunk.item)), 1)]),
							_: 2
						}, 1032, ["class"])]),
						key: "0"
					} : void 0]), 1032, [
						"title",
						"labels",
						"description",
						"args",
						"description-label",
						"options",
						"supports-session-approval",
						"destructive",
						"onSelect"
					]))], 64);
				}), 128))]),
				_: 1
			});
		};
	}
}), [["__cssModules", { "$style": {
	credentialDescription: "_credentialDescription_15ywj_1",
	textInputRow: "_textInputRow_15ywj_7",
	continueRow: "_continueRow_15ywj_14",
	testListenerUrl: "_testListenerUrl_15ywj_21",
	textCard: "_textCard_15ywj_30"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/composables/useStopBrowserTasksPrompt.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Stopping a reply leaves its browser tasks running. After a stop, this asks the user whether to
* stop those tasks too.
*/
function useStopBrowserTasksPrompt(thread) {
	const cloudBrowserTasks = inject(CloudBrowserTasksKey, void 0);
	const runningTaskIds = computed(() => cloudBrowserTasks?.value.filter((task) => task.state === "running").map((task) => task.taskId) ?? []);
	const runningCount = computed(() => runningTaskIds.value.length);
	const isOpen = ref(false);
	function close() {
		isOpen.value = false;
	}
	/** Call after the reply was stopped. Opens the prompt only when a browser task still runs. */
	function openIfTasksRunning() {
		if (runningCount.value > 0) isOpen.value = true;
	}
	/** Stops the tasks that run at the time of the click. */
	function stopTasks() {
		for (const taskId of runningTaskIds.value) thread.cancelBackgroundTask(taskId);
		close();
	}
	watch(() => runningCount.value === 0, (noneRunning) => {
		if (noneRunning) close();
	});
	watch(() => thread.id, close);
	watch(() => thread.isStreaming, (isStreaming, wasStreaming) => {
		if (isStreaming && !wasStreaming) close();
	});
	return {
		isOpen,
		runningCount,
		openIfTasksRunning,
		stopTasks,
		close
	};
}
//#endregion
//#region src/features/ai/instanceAi/components/InstanceAiConversation.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1$1 = { "data-test-id": "instance-ai-stop-browser-tasks" };
var GREETING_LINES_MS = 1760;
var GREETING_THINKING_MS = 940;
/** Longer than the greeting's beat, so the last question does not land the moment the card closes. */
var FOLLOW_UP_THINKING_MS = 1800;
var InstanceAiConversation_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiConversation",
	props: {
		beforeSend: {},
		newThread: { type: Boolean },
		placeholder: {},
		placeholderPreview: {},
		autofocus: {
			type: Boolean,
			default: void 0
		},
		composerHeight: {},
		subject: {},
		aboveInputOverlapHeight: {},
		mentionsEnabled: { type: Boolean }
	},
	emits: [
		"thread-missing",
		"message-sent",
		"content-change",
		"agent-attachment-restored"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const store = useInstanceAiStore();
		const settingsStore = useInstanceAiSettingsStore();
		const thread = useThread();
		watch(() => thread.messages.some((message) => message.role === "user"), (hasMessages) => {
			if (hasMessages) emit("message-sent");
		}, { immediate: true });
		const showMentionedWorkflow = inject("showMentionedWorkflow", void 0);
		const creditsStore = useAssistantCreditsStore();
		const { isLowCredits, isOutOfCredits } = storeToRefs(creditsStore);
		const rootStore = useRootStore();
		const i18n = useI18n();
		const toast = useToast();
		const telemetry = useTelemetry();
		const { goToUpgrade } = usePageRedirectionHelper();
		const creditBanner = useCreditWarningBanner(isLowCredits);
		const outOfCreditsMessage = computed(() => {
			if (!isOutOfCredits.value) return void 0;
			return i18n.baseText("instanceAi.error.outOfCredits.title");
		});
		const pendingComposerContext = ref(null);
		const pendingComposerDraft = ref(null);
		const generatedComposerDraft = ref(null);
		const pendingAgentAttachment = ref(null);
		const currentAgentAttachment = computed(() => {
			const queued = pendingAgentAttachment.value;
			if (!queued) return null;
			const boundTarget = getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(thread.id));
			if (boundTarget?.agentId !== queued.id || boundTarget.projectId !== queued.projectId || !queued.pending) return queued;
			const name = boundTarget.name ?? queued.name;
			return {
				type: "agent",
				id: queued.id,
				projectId: queued.projectId,
				...name ? { name } : {}
			};
		});
		const reservedComposerAttachmentCount = computed(() => Number(Boolean(currentAgentAttachment.value)) + Number(Boolean(thread.pendingWorkflowAttachment)));
		const mentionArtifacts = computed(() => [...thread.producedArtifacts.values()].filter((artifact) => artifact.type === "workflow" && artifact.archived !== true).map(({ id, name }) => {
			const origin = thread.producedArtifactOrigins.get(id);
			return {
				id,
				name,
				...origin ? { origin } : {}
			};
		}));
		const mentionActiveWorkflowId = computed(() => {
			const activeArtifactId = thread.activeArtifactId;
			return activeArtifactId && thread.producedArtifacts.get(activeArtifactId)?.type === "workflow" ? activeArtifactId : void 0;
		});
		const builderAgents = computed(() => collectActiveBuilderAgents(thread.messages));
		const displayedMessages = shallowReactive([]);
		watch(() => thread.messages.filter(messageHasVisibleContent), (next) => {
			if (!(next.length === displayedMessages.length && next.every((msg, i) => msg === displayedMessages[i]))) displayedMessages.splice(0, displayedMessages.length, ...next);
		}, { immediate: true });
		/** The third line has risen at ~1.7 s, the card lands at ~2.7 s. */
		const greetingPhase = ref(null);
		let greetingShown = false;
		let greetingTimer = null;
		const onboardingGreeting = computed(() => {
			const [first, second] = displayedMessages;
			return first?.role === "assistant" && !second && store.isOnboardingChromeHidden(thread.id) ? first : null;
		});
		watch(onboardingGreeting, (greeting) => {
			if (!greeting || greetingShown) return;
			greetingShown = true;
			greetingPhase.value = "lines";
			greetingTimer = setTimeout(() => {
				greetingPhase.value = "thinking";
				greetingTimer = setTimeout(() => {
					greetingPhase.value = null;
					greetingTimer = null;
				}, GREETING_THINKING_MS);
			}, GREETING_LINES_MS);
		}, { immediate: true });
		const followUpHeld = ref(false);
		let followUpTimer = null;
		watch(() => displayedMessages.length, (length, previous) => {
			if (previous !== 1 || length !== 2 || displayedMessages[1].role !== "assistant") return;
			if (!store.isOnboardingChromeHidden(thread.id)) return;
			followUpHeld.value = true;
			followUpTimer = setTimeout(() => {
				followUpHeld.value = false;
				followUpTimer = null;
			}, FOLLOW_UP_THINKING_MS);
		});
		onUnmounted(() => {
			if (greetingTimer) clearTimeout(greetingTimer);
			if (followUpTimer) clearTimeout(followUpTimer);
		});
		/**
		* While the greeting plays: the greeting without its agent tree (the message renders its text
		* from the tree when it has one). While the follow-up is held: the greeting only. The stored
		* messages otherwise.
		*/
		const renderedMessages = computed(() => {
			const greeting = onboardingGreeting.value;
			if (greeting && greetingPhase.value !== null) return [{
				...greeting,
				agentTree: void 0,
				isStreaming: true
			}];
			return followUpHeld.value ? displayedMessages.slice(0, 1) : displayedMessages;
		});
		const hasFloatingConfirmation = computed(() => greetingPhase.value === null && thread.pendingConfirmations.some(isPendingItemFloating));
		const awaitingOnboardingGreeting = computed(() => thread.hydrationStatus !== "ready" && store.isOnboardingChromeHidden(thread.id));
		const composerContextChip = computed(() => {
			const agentAttachment = currentAgentAttachment.value;
			const isNewAgent = agentAttachment !== null && pendingAgentAttachment.value?.id === agentAttachment.id && pendingAgentAttachment.value.pending === true;
			if (agentAttachment && !isNewAgent && pendingComposerContext.value?.source !== "agent-preview") {
				const liveSubjectName = props.subject?.type === "agent" && props.subject.id === agentAttachment.id ? props.subject.name : void 0;
				return {
					type: "agent-artifact",
					agentId: agentAttachment.id,
					projectId: agentAttachment.projectId,
					key: `pending-agent:${agentAttachment.id}`,
					label: liveSubjectName ?? agentAttachment.name ?? i18n.baseText("agents.new.defaultName"),
					icon: "robot",
					isPending: true
				};
			}
			const workflowAttachment = thread.pendingWorkflowAttachment;
			if (workflowAttachment) return {
				type: "workflow-artifact",
				workflowId: workflowAttachment.id,
				key: `pending-workflow:${workflowAttachment.id}`,
				label: workflowAttachment.name ?? i18n.baseText("instanceAi.workflowHandoff.untitledWorkflow"),
				icon: "workflow",
				isPending: true
			};
			if (pendingComposerContext.value?.source === "agent-preview") return {
				type: "agent-preview-session",
				agentId: pendingComposerContext.value.agentId,
				threadId: pendingComposerContext.value.threadId,
				executionId: pendingComposerContext.value.executionId,
				key: handoffContextKey(pendingComposerContext.value),
				label: formatAgentPreviewContextLabel(pendingComposerContext.value, (textKey, options) => i18n.baseText(textKey, options), thread.producedArtifacts.get(pendingComposerContext.value.agentId)?.name),
				icon: agentPreviewContextIcon(pendingComposerContext.value.agentIcon),
				isPending: true
			};
			const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
			for (const message of [...thread.messages].reverse()) {
				if (message.role !== "user" || message.context?.source !== "agent-preview") continue;
				const key = handoffContextKey(message.context);
				if (dismissedKeys.has(key)) continue;
				return {
					type: "agent-preview-session",
					agentId: message.context.agentId,
					threadId: message.context.threadId,
					executionId: message.context.executionId,
					key,
					label: formatAgentPreviewContextLabel(message.context, (textKey, options) => i18n.baseText(textKey, options), thread.producedArtifacts.get(message.context.agentId)?.name),
					icon: agentPreviewContextIcon(message.context.agentIcon),
					isPending: false
				};
			}
			return null;
		});
		const isPendingAgentComposer = computed(() => pendingAgentAttachment.value?.pending === true);
		const workflowHandoffGreeting = computed(() => {
			const attachment = thread.pendingWorkflowAttachment;
			if (!attachment || thread.isHydratingThread || thread.hasMessages) return null;
			const name = attachment.name ?? i18n.baseText("instanceAi.workflowHandoff.untitledWorkflow");
			return i18n.baseText("instanceAi.workflowHandoff.greeting", { interpolate: { workflow: name } });
		});
		const workflowHandoffAttachment = computed(() => {
			if (!workflowHandoffGreeting.value) return null;
			return thread.pendingWorkflowAttachment;
		});
		const scrollAreaRef = useTemplateRef("scrollArea");
		const isLoadingOlderMessages = ref(false);
		const loadOlderFailed = ref(false);
		async function loadOlderMessages() {
			if (isLoadingOlderMessages.value || loadOlderFailed.value || !thread.hasOlderMessages) return;
			isLoadingOlderMessages.value = true;
			try {
				await thread.loadOlderMessages();
			} catch {
				loadOlderFailed.value = true;
			} finally {
				isLoadingOlderMessages.value = false;
			}
		}
		function retryLoadOlderMessages() {
			loadOlderFailed.value = false;
			loadOlderMessages();
		}
		/** Jumps to the bottom and follows new content again. */
		function followLatest() {
			scrollAreaRef.value?.scrollToBottom();
		}
		const chatInputRef = ref(null);
		const inputSwapRef = useTemplateRef("inputSwap");
		function focusChatInputIfFocusIsIdle() {
			if (props.autofocus === false) return;
			const activeElement = document.activeElement;
			if (activeElement instanceof HTMLElement && activeElement !== document.body && activeElement !== document.documentElement) return;
			chatInputRef.value?.focus();
		}
		let hasMountedChatInput = false;
		watch([chatInputRef, () => props.autofocus], ([input, autofocus], [, previousAutofocus]) => {
			if (!input) return;
			const forceFocus = autofocus === true && (!hasMountedChatInput || previousAutofocus !== true);
			hasMountedChatInput = true;
			if (autofocus === false) return;
			nextTick(() => {
				if (chatInputRef.value !== input || props.autofocus === false) return;
				if (forceFocus) input.focus();
				else focusChatInputIfFocusIsIdle();
			});
		});
		watch(hasFloatingConfirmation, (isFloating) => {
			if (isFloating) return;
			nextTick(() => {
				if (inputSwapRef.value?.contains(document.activeElement)) {
					chatInputRef.value?.focus();
					return;
				}
				focusChatInputIfFocusIsIdle();
			});
		});
		watch(() => store.composerFocusRequest, () => {
			nextTick(() => chatInputRef.value?.focus());
		});
		watch([chatInputRef, pendingComposerDraft], ([input, draft]) => {
			if (!input || !draft) return;
			input.setPrefill({
				text: draft.text,
				prefillType: draft.prefillType
			});
			generatedComposerDraft.value = draft.text;
			pendingComposerDraft.value = null;
			nextTick(focusChatInputIfFocusIsIdle);
		});
		function isCurrentThreadRuntime() {
			return store.getRuntime(thread.id) === thread;
		}
		function restorePendingHandoffAttachments() {
			const agentAttachment = getPendingAgentAttachment(thread.id);
			if (agentAttachment) {
				pendingAgentAttachment.value = agentAttachment;
				emit("agent-attachment-restored", agentAttachment);
			}
			const workflowAttachment = getPendingWorkflowAttachment(thread.id);
			if (workflowAttachment) thread.setPendingWorkflowAttachment(workflowAttachment);
		}
		function reconnectThreadAfterHydration() {
			const draftAttachment = consumePendingDraftAttachment(thread.id);
			if (draftAttachment) store.stageNodeSets(draftAttachment.workflowId, draftAttachment.sets);
			thread.loadHistoricalMessages().then(async (hydrationStatus) => {
				if (hydrationStatus === "stale") return;
				await thread.loadThreadStatus();
				if (!isCurrentThreadRuntime()) return;
				thread.connectSSE();
				const pending = consumePendingFirstMessage(thread.id);
				if (pending) thread.sendMessage(pending.message, {
					authorship: pending.authorship,
					attachments: pending.attachments,
					pushRef: rootStore.pushRef,
					handoffContext: pending.context,
					responseStartedAtEpochMs: pending.responseStartedAtEpochMs
				}).then((sent) => {
					if (sent) return;
					if (!store.threads.some((t) => t.id === thread.id)) return;
					stashPendingFirstMessage(thread.id, pending);
				});
				const landedFromRedirect = consumePendingRedirectLanding(thread.id);
				if (pending || landedFromRedirect) useOpenWorkflowInAssistantStore().handleRedirectLanding(thread.id);
			});
		}
		async function syncThread() {
			const requestedThreadId = thread.id;
			pendingComposerContext.value = getPendingHandoffContext(requestedThreadId);
			pendingComposerDraft.value = getPendingComposerDraft(requestedThreadId);
			restorePendingHandoffAttachments();
			if (props.newThread) {
				thread.hydrationStatus = "ready";
				if (!settingsStore.isWorkflowBuilderAvailable) return;
				const pending = consumePendingFirstMessage(requestedThreadId);
				if (pending) {
					pendingComposerContext.value = pending.context ?? pendingComposerContext.value;
					handleSubmit(pending.message, pending.attachments, () => {
						if (!isCurrentThreadRuntime()) return false;
						stashPendingFirstMessage(requestedThreadId, pending);
						return true;
					}, pending.authorship, pending.responseStartedAtEpochMs);
				}
				return;
			}
			if (!store.threads.some((t) => t.id === requestedThreadId)) try {
				await store.loadThread(requestedThreadId);
			} catch (error) {
				if (!isCurrentThreadRuntime()) return;
				if (error instanceof ResponseError && (error.httpStatusCode === 403 || error.httpStatusCode === 404)) {
					clearPendingThreadHandoff(requestedThreadId);
					emit("thread-missing");
				} else toast.showError(error, i18n.baseText("generic.error"));
				return;
			}
			if (!isCurrentThreadRuntime()) return;
			if (thread.sseState === "disconnected") reconnectThreadAfterHydration();
			else if (thread.hydrationStatus === "idle") thread.loadHistoricalMessages();
		}
		onMounted(() => {
			syncThread();
			nextTick(focusChatInputIfFocusIsIdle);
		});
		/**
		* Hand a refused submission back to the composer. Its own restore returns the
		* text, the attachments and the pre-fill provenance together -- so a retry stays
		* attributed to the surface that wrote the draft -- and declines when the user
		* has already typed something newer.
		*/
		function restoreFailedSubmission(restoreDraft) {
			restoreDraft();
		}
		async function handleSubmit(message, attachments, restoreDraft, authorship, responseStartedAtEpochMs, mentionCounts = EMPTY_ASSISTANT_MENTION_COUNTS, mentionedWorkflowIds = []) {
			if (!settingsStore.isWorkflowBuilderAvailable) return;
			if (props.beforeSend) {
				try {
					await props.beforeSend();
				} catch {
					restoreDraft?.();
					return;
				}
				if (!isCurrentThreadRuntime()) return;
			}
			followLatest();
			const handoffContext = pendingComposerContext.value ?? void 0;
			const submittedGeneratedDraft = generatedComposerDraft.value;
			const queuedAgentAttachment = pendingAgentAttachment.value;
			const agentAttachment = currentAgentAttachment.value;
			const queuedWorkflowAttachment = thread.pendingWorkflowAttachment;
			const extraAttachments = [];
			if (agentAttachment) extraAttachments.push(agentAttachment);
			if (queuedWorkflowAttachment && !attachments?.some((attachment) => attachment.type === "workflow" && attachment.id === queuedWorkflowAttachment.id)) extraAttachments.push(queuedWorkflowAttachment);
			const submittedAttachments = extraAttachments.length > 0 ? [...attachments ?? [], ...extraAttachments] : attachments;
			const nodeCount = countAttachedNodes(attachments);
			thread.sendMessage(message, {
				authorship,
				attachments: submittedAttachments,
				pushRef: rootStore.pushRef,
				handoffContext,
				...responseStartedAtEpochMs !== void 0 ? { responseStartedAtEpochMs } : {},
				...mentionCounts.total > 0 ? { mentionCounts } : {},
				...mentionedWorkflowIds.length > 0 ? { mentionedWorkflowIds } : {}
			}).then((sent) => {
				if (!sent) {
					restoreFailedSubmission(restoreDraft);
					return;
				}
				const [firstMentionedWorkflowId] = mentionedWorkflowIds;
				if (firstMentionedWorkflowId) showMentionedWorkflow?.(firstMentionedWorkflowId);
				if (nodeCount > 0) telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
					node_count: nodeCount,
					runtime: "instance-ai"
				});
				if (submittedAttachments?.some((a) => a.type === "nodes")) store.requestClearCanvasSelection();
				const isCurrentHandoff = !handoffContext || pendingComposerContext.value === handoffContext;
				const isCurrentDraft = !submittedGeneratedDraft || generatedComposerDraft.value === submittedGeneratedDraft;
				if ((handoffContext || submittedGeneratedDraft) && isCurrentHandoff && isCurrentDraft) {
					clearPendingHandoffContext(thread.id);
					clearPendingComposerDraft(thread.id);
					if (handoffContext) pendingComposerContext.value = null;
					if (submittedGeneratedDraft) generatedComposerDraft.value = null;
				}
				if (queuedAgentAttachment && pendingAgentAttachment.value === queuedAgentAttachment) {
					clearPendingAgentAttachment(thread.id);
					pendingAgentAttachment.value = null;
				}
				if (queuedWorkflowAttachment) {
					if (getPendingWorkflowAttachment(thread.id)?.id === queuedWorkflowAttachment.id) clearPendingWorkflowAttachment(thread.id);
					if (thread.pendingWorkflowAttachment?.id === queuedWorkflowAttachment.id) thread.clearPendingWorkflowAttachment();
				}
			});
		}
		const stopBrowserTasksPrompt = useStopBrowserTasksPrompt(thread);
		const stopBrowserTasksAnchor = ref();
		function handleStop() {
			stopBrowserTasksAnchor.value = chatInputRef.value?.getSendStopButtonElement();
			thread.cancelRun();
			stopBrowserTasksPrompt.openIfTasksRunning();
		}
		function clearGeneratedDraft() {
			const draft = generatedComposerDraft.value;
			if (draft) chatInputRef.value?.clearTextIfMatches(draft);
			clearPendingComposerDraft(thread.id);
			pendingComposerDraft.value = null;
			generatedComposerDraft.value = null;
		}
		/** Body of the former assistant-handoff handler, once the host's own guards pass. */
		function applyHandoff(context, initialDraft) {
			stashPendingHandoffContext(thread.id, context);
			pendingComposerContext.value = context;
			if (context.source === "agent-preview") store.updateThreadMetadata(thread.id, { [INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY]: {
				agentId: context.agentId,
				threadId: context.threadId
			} }).catch((error) => {
				toast.showError(error, i18n.baseText("generic.error"));
			});
			if (initialDraft) {
				stashPendingComposerDraft(thread.id, initialDraft);
				pendingComposerDraft.value = initialDraft;
			} else clearGeneratedDraft();
			nextTick(() => chatInputRef.value?.focus());
		}
		function clearPendingComposerHandoff() {
			const draft = generatedComposerDraft.value ?? pendingComposerDraft.value?.text;
			if (draft) chatInputRef.value?.clearTextIfMatches(draft);
			pendingComposerDraft.value = null;
			generatedComposerDraft.value = null;
			pendingComposerContext.value = null;
			clearPendingHandoffContext(thread.id);
			clearPendingComposerDraft(thread.id);
		}
		/** Exposed for the host to re-provide to sibling panels (e.g. the artifacts panel). */
		function dismissPendingComposerContext(key) {
			const context = pendingComposerContext.value;
			if (!context || handoffContextKey(context) !== key) return false;
			clearPendingComposerHandoff();
			return true;
		}
		async function dismissComposerContextChip() {
			if (!composerContextChip.value) return;
			if (composerContextChip.value.type === "agent-artifact" && pendingAgentAttachment.value) {
				clearPendingAgentAttachment(thread.id);
				pendingAgentAttachment.value = null;
				return;
			}
			if (composerContextChip.value.type === "workflow-artifact") {
				clearPendingWorkflowAttachment(thread.id);
				thread.clearPendingWorkflowAttachment();
				return;
			}
			if (composerContextChip.value.isPending) {
				clearPendingComposerHandoff();
				return;
			}
			const dismissedKeys = new Set(getDismissedContextKeys(store.getThreadMetadata(thread.id)));
			dismissedKeys.add(composerContextChip.value.key);
			await store.updateThreadMetadata(thread.id, { dismissedContextKeys: [...dismissedKeys] });
		}
		function isDirty() {
			return chatInputRef.value?.isDirty() ?? false;
		}
		/**
		* Puts n8n-authored text into the composer without sending it. The host owns
		* the wording and the pre-fill tag; this just forwards to the input so the
		* submit can attribute the message correctly.
		*/
		function setPrefill(prefill) {
			chatInputRef.value?.setPrefill(prefill);
		}
		/**
		* Sends a prompt to the assistant right away, without staging it in the
		* composer first. The host (e.g. the agent builder template picker) owns the
		* wording and the pre-fill tag.
		*/
		function submitSuggestion(payload) {
			chatInputRef.value?.submitSuggestion(payload);
		}
		/** So a host-triggered send (e.g. the "fix with AI" offer) re-follows new messages. */
		function resetScroll() {
			followLatest();
		}
		__expose({
			focus: () => chatInputRef.value?.focus(),
			isDirty,
			applyHandoff,
			dismissPendingComposerContext,
			resetScroll,
			setPrefill,
			submitSuggestion,
			pendingComposerContext
		});
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.chatContent) }, [isLoadingOlderMessages.value ? (openBlock(), createBlock(unref(N8nSpinner_default), {
				key: 0,
				class: normalizeClass(_ctx.$style.olderMessagesStatus),
				"data-test-id": "instance-ai-older-messages-loading"
			}, null, 8, ["class"])) : loadOlderFailed.value ? (openBlock(), createElementBlock("div", {
				key: 1,
				class: normalizeClass([_ctx.$style.olderMessagesStatus, _ctx.$style.olderMessagesError]),
				role: "alert",
				"data-test-id": "instance-ai-older-messages-error"
			}, [createVNode(unref(N8nText_default), {
				size: "small",
				color: "text-light"
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.thread.loadOlderError")), 1)]),
				_: 1
			}), createVNode(unref(N8nButton_default), {
				variant: "ghost",
				size: "xsmall",
				onClick: retryLoadOlderMessages
			}, {
				default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("generic.retry")), 1)]),
				_: 1
			})], 2)) : createCommentVNode("", true), createVNode(unref(N8nChatScrollArea_default), {
				ref: "scrollArea",
				class: normalizeClass(_ctx.$style.scrollArea),
				"loading-older": isLoadingOlderMessages.value,
				onLoadOlder: loadOlderMessages
			}, {
				input: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.inputContainer) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.inputConstraint) }, [
					!unref(settingsStore).isWorkflowBuilderAvailable ? (openBlock(), createBlock(WorkflowBuilderUnavailableNotice_default, { key: 0 })) : createCommentVNode("", true),
					createVNode(LimitedModeNotice_default),
					unref(isOutOfCredits) || unref(creditBanner).visible.value ? (openBlock(), createBlock(CreditWarningBanner_default, {
						key: 1,
						"credits-remaining": unref(creditsStore).creditsRemaining,
						"credits-quota": unref(creditsStore).creditsQuota,
						message: outOfCreditsMessage.value,
						dismissible: !unref(isOutOfCredits),
						onUpgradeClick: _cache[0] || (_cache[0] = ($event) => unref(goToUpgrade)("instance-ai", "upgrade-instance-ai")),
						onDismiss: _cache[1] || (_cache[1] = ($event) => unref(creditBanner).dismiss())
					}, null, 8, [
						"credits-remaining",
						"credits-quota",
						"message",
						"dismissible"
					])) : createCommentVNode("", true),
					renderSlot(_ctx.$slots, "above-input"),
					createBaseVNode("div", {
						ref: "inputSwap",
						class: normalizeClass(_ctx.$style.inputSwap)
					}, [
						createVNode(unref(N8nPopover_default), {
							open: unref(stopBrowserTasksPrompt).isOpen.value,
							reference: stopBrowserTasksAnchor.value,
							side: "top",
							align: "end",
							"side-offset": 8,
							"enable-scrolling": false,
							"suppress-auto-focus": "",
							"content-class": _ctx.$style.stopBrowserTasks,
							"onUpdate:open": _cache[4] || (_cache[4] = (open) => !open && unref(stopBrowserTasksPrompt).close())
						}, {
							content: withCtx(() => [createBaseVNode("div", _hoisted_1$1, [
								createVNode(unref(N8nText_default), {
									tag: "p",
									bold: "",
									size: "medium",
									color: "text-dark"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.stopPopover.title", { adjustToNumber: unref(stopBrowserTasksPrompt).runningCount.value })), 1)]),
									_: 1
								}),
								createVNode(unref(N8nText_default), {
									tag: "p",
									size: "small",
									color: "text-base"
								}, {
									default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.cloudBrowser.stopPopover.body", {
										adjustToNumber: unref(stopBrowserTasksPrompt).runningCount.value,
										interpolate: { count: String(unref(stopBrowserTasksPrompt).runningCount.value) }
									})), 1)]),
									_: 1
								}),
								createBaseVNode("div", { class: normalizeClass(_ctx.$style.stopBrowserTasksActions) }, [createVNode(unref(N8nButton_default), {
									variant: "outline",
									size: "small",
									label: unref(i18n).baseText("instanceAi.cloudBrowser.stopPopover.keepRunning"),
									"data-test-id": "instance-ai-stop-browser-tasks-keep",
									onClick: _cache[2] || (_cache[2] = ($event) => unref(stopBrowserTasksPrompt).close())
								}, null, 8, ["label"]), createVNode(unref(N8nButton_default), {
									variant: "destructive",
									size: "small",
									label: unref(i18n).baseText("instanceAi.cloudBrowser.stopPopover.stop", { adjustToNumber: unref(stopBrowserTasksPrompt).runningCount.value }),
									"data-test-id": "instance-ai-stop-browser-tasks-stop",
									onClick: _cache[3] || (_cache[3] = ($event) => unref(stopBrowserTasksPrompt).stopTasks())
								}, null, 8, ["label"])], 2)
							])]),
							_: 1
						}, 8, [
							"open",
							"reference",
							"content-class"
						]),
						createVNode(Transition, { name: "input-swap" }, {
							default: withCtx(() => [hasFloatingConfirmation.value ? (openBlock(), createBlock(InstanceAiConfirmationPanel_default, {
								key: 0,
								kind: "floating"
							})) : createCommentVNode("", true)]),
							_: 1
						}),
						createVNode(Transition, { name: "input-swap" }, {
							default: withCtx(() => [greetingPhase.value === null && !awaitingOnboardingGreeting.value ? withDirectives((openBlock(), createBlock(InstanceAiInput_default, {
								key: 0,
								ref_key: "chatInputRef",
								ref: chatInputRef,
								"is-streaming": unref(thread).isStreaming,
								"is-out-of-credits": unref(isOutOfCredits),
								"is-submitting": unref(thread).isSendingMessage || unref(thread).hydrationStatus === "idle" || unref(thread).isHydratingThread,
								"is-awaiting-confirmation": unref(thread).isAwaitingConfirmation,
								"is-workflow-builder-available": unref(settingsStore).isWorkflowBuilderAvailable,
								"current-thread-id": unref(thread).id,
								"amend-context": unref(thread).amendContext,
								"context-chip": composerContextChip.value,
								placeholder: props.placeholder,
								"placeholder-preview": props.placeholderPreview,
								"composer-height": props.composerHeight,
								"placeholder-key": isPendingAgentComposer.value ? "instanceAi.input.newAgentPlaceholder" : void 0,
								"contextual-suggestion": unref(thread).contextualSuggestion,
								"mentions-enabled": props.mentionsEnabled,
								"mention-project-id": unref(thread).projectId,
								"mention-artifacts": mentionArtifacts.value,
								"mention-active-workflow-id": mentionActiveWorkflowId.value,
								"reserved-attachment-count": reservedComposerAttachmentCount.value,
								onContentChange: _cache[5] || (_cache[5] = ($event) => emit("content-change", $event)),
								onSubmit: handleSubmit,
								onStop: handleStop,
								onDismissContextChip: dismissComposerContextChip
							}, createSlots({ _: 2 }, [_ctx.$slots["composer-start"] && !hasFloatingConfirmation.value ? {
								name: "footer-start",
								fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-start")]),
								key: "0"
							} : void 0, _ctx.$slots["composer-controls"] ? {
								name: "footer-after-menu",
								fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-controls")]),
								key: "1"
							} : void 0]), 1032, [
								"is-streaming",
								"is-out-of-credits",
								"is-submitting",
								"is-awaiting-confirmation",
								"is-workflow-builder-available",
								"current-thread-id",
								"amend-context",
								"context-chip",
								"placeholder",
								"placeholder-preview",
								"composer-height",
								"placeholder-key",
								"contextual-suggestion",
								"mentions-enabled",
								"mention-project-id",
								"mention-artifacts",
								"mention-active-workflow-id",
								"reserved-attachment-count"
							])), [[vShow, !hasFloatingConfirmation.value]]) : createCommentVNode("", true)]),
							_: 3
						}),
						hasFloatingConfirmation.value ? renderSlot(_ctx.$slots, "composer-start", { key: 0 }) : createCommentVNode("", true)
					], 2),
					renderSlot(_ctx.$slots, "composer-footer")
				], 2)], 2)]),
				default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.messageList) }, [
					!unref(thread).hasMessages ? renderSlot(_ctx.$slots, "empty", { key: 0 }) : createCommentVNode("", true),
					workflowHandoffAttachment.value ? (openBlock(), createBlock(unref(ChatMessage_default), {
						key: 1,
						role: "user",
						"data-test-id": "instance-ai-workflow-handoff-attachment"
					}, {
						default: withCtx(() => [createVNode(AttachmentPreview_default, {
							attachment: workflowHandoffAttachment.value,
							"is-removable": false
						}, null, 8, ["attachment"])]),
						_: 1
					})) : createCommentVNode("", true),
					workflowHandoffGreeting.value ? (openBlock(), createBlock(unref(ChatMessage_default), {
						key: 2,
						role: "assistant",
						"data-test-id": "instance-ai-workflow-handoff-greeting"
					}, {
						default: withCtx(() => [createVNode(unref(N8nText_default), { size: "large" }, {
							default: withCtx(() => [createVNode(InstanceAiMarkdown_default, { content: workflowHandoffGreeting.value }, null, 8, ["content"])]),
							_: 1
						})]),
						_: 1
					})) : createCommentVNode("", true),
					createVNode(TransitionGroup, { name: "message-slide" }, {
						default: withCtx(() => [(openBlock(true), createElementBlock(Fragment, null, renderList(renderedMessages.value, (message) => {
							return openBlock(), createBlock(InstanceAiMessage_default, {
								key: message.id,
								message,
								"data-message-id": message.id,
								class: normalizeClass({ [_ctx.$style.greetingLines]: greetingPhase.value !== null })
							}, null, 8, [
								"message",
								"data-message-id",
								"class"
							]);
						}), 128))]),
						_: 1
					}),
					createVNode(Transition, { name: "message-slide" }, {
						default: withCtx(() => [greetingPhase.value === "thinking" || followUpHeld.value ? (openBlock(), createBlock(unref(ChatMessage_default), {
							key: 0,
							role: "assistant",
							"data-test-id": "instance-ai-onboarding-thinking"
						}, {
							default: withCtx(() => [createVNode(AiThinkingBlock_default, {
								segments: [],
								active: true,
								"activity-label": greetingPhase.value === "thinking" ? unref(i18n).baseText("instanceAi.onboardingGreeting.thinkingActivity") : void 0
							}, null, 8, ["activity-label"])]),
							_: 1
						})) : createCommentVNode("", true)]),
						_: 1
					}),
					builderAgents.value.length ? (openBlock(), createElementBlock("div", {
						key: 3,
						class: normalizeClass(_ctx.$style.builderAgents)
					}, [(openBlock(true), createElementBlock(Fragment, null, renderList(builderAgents.value, (builder) => {
						return openBlock(), createBlock(AgentSection_default, {
							key: builder.agentId,
							"agent-node": builder
						}, null, 8, ["agent-node"]);
					}), 128))], 2)) : createCommentVNode("", true),
					createVNode(InstanceAiConfirmationPanel_default, { kind: "inline" }),
					renderSlot(_ctx.$slots, "inline-offers"),
					createVNode(InstanceAiStatusBar_default)
				], 2), __props.aboveInputOverlapHeight ? (openBlock(), createElementBlock("div", {
					key: 0,
					style: normalizeStyle({ minHeight: `${__props.aboveInputOverlapHeight}px` }),
					"data-test-id": "setup-scroll-clearance"
				}, null, 4)) : createCommentVNode("", true)]),
				_: 3
			}, 8, ["class", "loading-older"])], 2);
		};
	}
}), [["__cssModules", { "$style": {
	chatContent: "_chatContent_1v198_6",
	olderMessagesStatus: "_olderMessagesStatus_1v198_14",
	olderMessagesError: "_olderMessagesError_1v198_22",
	scrollArea: "_scrollArea_1v198_33",
	messageList: "_messageList_1v198_39",
	builderAgents: "_builderAgents_1v198_50",
	inputContainer: "_inputContainer_1v198_57",
	inputConstraint: "_inputConstraint_1v198_66",
	stopBrowserTasks: "_stopBrowserTasks_1v198_76",
	stopBrowserTasksActions: "_stopBrowserTasksActions_1v198_84",
	inputSwap: "_inputSwap_1v198_91",
	greetingLines: "_greetingLines_1v198_95",
	"greeting-rise": "_greeting-rise_1v198_1"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/embed/useInstanceAiEmbedThreads.ts
init_runtime_core_esm_bundler();
/** The threads an embedded panel's history list shows, filtered by subject. */
function useInstanceAiEmbedThreads(subject) {
	const store = useInstanceAiStore();
	return { threads: computed(() => store.threads.filter((thread) => threadTargetsSubject(thread.metadata, subject.value))) };
}
//#endregion
//#region src/features/ai/instanceAi/embed/InstanceAiChatPanel.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler();
var InstanceAiChatPanel_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "InstanceAiChatPanel",
	props: {
		subject: {},
		launch: {},
		threadId: {},
		visible: {
			type: Boolean,
			default: true
		},
		closable: {
			type: Boolean,
			default: true
		},
		showOpenFullAssistant: {
			type: Boolean,
			default: true
		},
		placeholder: {},
		placeholderPreview: {},
		composerHeight: {},
		beforeNewThread: {},
		beforeSend: {}
	},
	emits: [
		"update:threadId",
		"update:building",
		"update:working",
		"close",
		"message-sent",
		"content-change"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		/**
		* Generic embeddable n8n Assistant panel: a chat scoped to one subject (an
		* agent today, a workflow later — see `InstanceAiEmbedSubject`), with its own
		* filtered thread history. It never renders artifact/preview panels — the
		* host's own surface (the agent builder, a future node editor) is the
		* artifact; "open in n8n Assistant" is the escape hatch to the full UI.
		*
		* Router-free except for that one hand-off. Provides the thread runtime
		* itself, so `InstanceAiConversation` works unchanged. Its history lives in
		* `InstanceAiViewHeader`'s popover — scoped and non-navigating via `threadList` —
		* rather than a sidebar.
		*/
		const props = __props;
		const emit = __emit;
		const slots = useSlots();
		const i18n = useI18n();
		const { isCtrlKeyPressed } = useDeviceSupport();
		const toast = useToast();
		const router = useRouter();
		const store = useInstanceAiStore();
		const rootStore = useRootStore();
		const settingsStore = useInstanceAiSettingsStore();
		const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
		const subject = computed(() => props.subject);
		const { threads } = useInstanceAiEmbedThreads(subject);
		provide(INSTANCE_AI_EMBED_SUBJECT_KEY, subject);
		/** An agent panel lists and opens the Assistant agent threads of its agent. */
		const usesAssistantAgent = computed(() => settingsStore.isAssistantAgentEnabled && props.subject.type === "agent");
		/** For a user in the rollout, an agent panel starts its new threads on the Assistant agent. */
		const startsAssistantAgentThreads = computed(() => usesAssistantAgent.value && settingsStore.newThreadsUseAssistantAgent);
		/**
		* The Assistant agent threads that this panel created, and if each one is still
		* new. A new thread has no binding yet: the server writes it with the first message.
		*/
		const panelAgentThreads = /* @__PURE__ */ new Map();
		const draftThreadIds = /* @__PURE__ */ new Set();
		const provisioningThreads = /* @__PURE__ */ new Map();
		async function persistDraftThread(threadId) {
			if (!draftThreadIds.has(threadId)) return;
			const pending = provisioningThreads.get(threadId);
			if (pending) return await pending;
			const subjectAtStart = props.subject;
			const context = getPendingHandoffContext(threadId);
			const extraMetadata = context?.source === "agent-preview" ? { [INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY]: {
				agentId: context.agentId,
				threadId: context.threadId
			} } : void 0;
			const provisioning = (async () => {
				await provisionSubjectThread(subjectAtStart, props.launch, extraMetadata, threadId);
				if (!mounted || props.subject.id !== subjectAtStart.id || props.subject.projectId !== subjectAtStart.projectId || props.subject.type !== subjectAtStart.type || props.threadId !== threadId) {
					clearPendingThreadHandoff(threadId);
					store.deleteThread(threadId, { silent: true });
					throw new DOMException("Chat selection changed", "AbortError");
				}
				draftThreadIds.delete(threadId);
			})();
			provisioningThreads.set(threadId, provisioning);
			try {
				await provisioning;
			} finally {
				provisioningThreads.delete(threadId);
			}
		}
		async function beforeConversationSend(threadId) {
			const subjectAtStart = props.subject;
			await props.beforeSend?.();
			if (!mounted || props.threadId !== threadId || props.subject.id !== subjectAtStart.id || props.subject.projectId !== subjectAtStart.projectId || props.subject.type !== subjectAtStart.type) throw new DOMException("Chat selection changed", "AbortError");
			try {
				await persistDraftThread(threadId);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") throw error;
				toast.showError(error, i18n.baseText("instanceAi.handoff.openFailed.title"));
				throw error;
			}
		}
		const subjectAgentThreads = computed(() => usesAssistantAgent.value ? assistantAgentThreadsStore.knownThreads.filter((thread) => threadTargetsSubject(thread.metadata, props.subject)) : []);
		/** The newest thread of the subject on either runtime. */
		function newestThreadId() {
			return [...threads.value, ...subjectAgentThreads.value].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]?.id;
		}
		/** Adds the subject's Assistant agent threads to the store, for the list and the resume. */
		async function loadSubjectAgentThreads() {
			try {
				const { data } = await listSystemAgentThreads(rootStore.restApiContext, ASSISTANT_AGENT_ID, { limit: 100 });
				for (const thread of data) if (threadTargetsSubject(thread.metadata, props.subject)) assistantAgentThreadsStore.addOpenedThread(thread);
				return true;
			} catch {
				return false;
			}
		}
		const { openArtifactInNewTab } = useArtifactLinks();
		provide("openWorkflowPreview", (id) => openArtifactInNewTab("workflow", id));
		provide("openAgentPreview", (id, projectId) => openArtifactInNewTab("agent", id, projectId));
		function threadFilter(thread) {
			return threadTargetsSubject(thread.metadata, props.subject);
		}
		/** The template ref onto the mounted `InstanceAiConversation` — wired through
		* `ThreadScope`'s render (it's created with `h()`, so the ref is passed as a
		* vnode prop rather than a template attribute), null while no thread is mounted. */
		const conversationRef = ref(null);
		const agentThreadRef = ref(null);
		/** The mounted chat on either runtime. Both expose the same calls. */
		const activeChat = computed(() => conversationRef.value ?? agentThreadRef.value);
		/**
		* A hand-off requested before the conversation for the target thread exists
		* yet (still minting, or resuming). Flushed into the thread's stash the
		* moment its id is known, right before `update:threadId` is emitted — the
		* conversation picks the stash up itself on mount (`syncThread`).
		*/
		const queuedHandoff = ref(null);
		function stashHandoff(threadId, queued) {
			stashPendingHandoffContext(threadId, queued.context);
			if (queued.draft) stashPendingComposerDraft(threadId, queued.draft);
			if (queued.context.source === "agent-preview" && !isKnownAssistantAgentThread(threadId)) {
				const subjectIdAtQueue = props.subject.id;
				store.updateThreadMetadata(threadId, { [INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY]: {
					agentId: queued.context.agentId,
					threadId: queued.context.threadId
				} }).catch((error) => {
					if (!mounted || props.subject.id !== subjectIdAtQueue) return;
					toast.showError(error, i18n.baseText("generic.error"));
				});
			}
		}
		function flushQueuedHandoff(threadId) {
			const queued = queuedHandoff.value;
			if (!queued) return;
			queuedHandoff.value = null;
			stashHandoff(threadId, queued);
		}
		/** Every path that discovers a thread id routes through here so a queued
		* hand-off always lands before the host (and the conversation) see the id. */
		function emitThreadId(threadId) {
			flushQueuedHandoff(threadId);
			emit("update:threadId", threadId);
		}
		/**
		* Puts a preview-chat hand-off into this panel: applies it directly when the
		* conversation is already mounted and clean, otherwise queues it for whichever
		* thread the panel is about to resume or mint. Mirrors
		* `InstanceAiThreadView`'s `handleAgentPreviewAssistantHandoff`.
		*/
		function handoff(context, initialDraft) {
			const conversation = activeChat.value;
			if (conversation) {
				if (conversation.isDirty()) {
					toast.showMessage({
						title: i18n.baseText("instanceAi.input.finishDraftBeforeHandoff.title"),
						message: i18n.baseText("instanceAi.input.finishDraftBeforeHandoff.message"),
						type: "warning"
					});
					return false;
				}
				conversation.applyHandoff(context, initialDraft);
				return true;
			}
			const queued = {
				context,
				draft: initialDraft
			};
			if (activeThreadId.value) stashHandoff(activeThreadId.value, queued);
			else queuedHandoff.value = queued;
			return true;
		}
		/**
		* Puts n8n-authored text into the mounted conversation's composer without
		* sending it. The host (e.g. the agent builder) owns the wording and the
		* pre-fill tag. A no-op while no thread is mounted yet.
		*/
		function setPrefill(prefill) {
			activeChat.value?.setPrefill(prefill);
		}
		/**
		* Sends a prompt to the assistant right away, without staging it in the
		* composer first. The host (e.g. the agent builder) owns the wording and the
		* pre-fill tag. A no-op while no thread is mounted yet.
		*/
		function submitSuggestion(payload) {
			activeChat.value?.submitSuggestion(payload);
		}
		__expose({
			handoff,
			/** Forwards to the mounted conversation's composer; a no-op while no thread is mounted. */
			setPrefill,
			submitSuggestion
		});
		/** The assistant is actively mutating the subject — the thread list stops
		* accepting select/new while that's true, so a click can't race it. */
		const building = ref(false);
		function onBuildingChange(value) {
			building.value = value;
			emit("update:building", value);
		}
		let mounted = true;
		onBeforeUnmount(() => {
			mounted = false;
		});
		/**
		* `openFullAssistant` hands this thread's runtime off to the full assistant
		* view, which adopts it via its own `provideThread` — disposing it here (on
		* unmount or on a thread change) would tear down a runtime the thread view is
		* about to reuse.
		*/
		let handedOffThreadId;
		let minting = false;
		async function mintThread() {
			if (minting) return;
			minting = true;
			const mintedForSubjectId = props.subject.id;
			const threadIdAtStart = props.threadId;
			try {
				try {
					await props.beforeNewThread?.();
				} catch {
					return;
				}
				if (startsAssistantAgentThreads.value) {
					if (!mounted || props.subject.id !== mintedForSubjectId || props.threadId !== threadIdAtStart) return;
					const threadId = v4();
					rememberAssistantAgentThread(threadId, props.subject.projectId);
					panelAgentThreads.set(threadId, true);
					emitThreadId(threadId);
					return;
				}
				if (props.subject.type === "agent") {
					if (!mounted || props.subject.id !== mintedForSubjectId || props.threadId !== threadIdAtStart) return;
					const threadId = v4();
					draftThreadIds.add(threadId);
					stashPendingAgentAttachment(threadId, props.subject);
					emitThreadId(threadId);
					return;
				}
				let threadId;
				try {
					threadId = await provisionSubjectThread(props.subject, props.launch);
				} catch (error) {
					toast.showError(error, i18n.baseText("instanceAi.handoff.openFailed.title"));
					return;
				}
				if (!mounted || props.subject.id !== mintedForSubjectId || props.threadId !== threadIdAtStart) {
					store.deleteThread(threadId, { silent: true });
					return;
				}
				emitThreadId(threadId);
			} finally {
				minting = false;
			}
		}
		/** Resume the subject's most recent thread, or mint a fresh one. */
		async function resumeOrMintThread() {
			if (props.subject.type === "agent" && props.subject.pending) {
				store.loadThreads();
				await mintThread();
				return;
			}
			const loaded = await Promise.all([store.loadThreads(), usesAssistantAgent.value ? loadSubjectAgentThreads() : true]);
			if (!mounted) return;
			if (loaded.includes(false)) {
				toast.showError(new Error(i18n.baseText("instanceAi.handoff.openFailed.message")), i18n.baseText("instanceAi.handoff.openFailed.title"));
				return;
			}
			const existingId = newestThreadId();
			if (existingId) emitThreadId(existingId);
			else await mintThread();
		}
		/**
		* True once `threadId` (the current `props.threadId`) is confirmed to target
		* this subject, so `ThreadScope` never mounts a conversation for a thread the
		* host handed in that turns out to belong to someone else — see
		* `verifyThreadId`.
		*/
		const threadIdVerified = ref(!props.threadId);
		const activeThreadId = computed(() => threadIdVerified.value ? props.threadId : void 0);
		/** The verified thread runs on the Assistant agent, not on the current runtime. */
		const isAgentThread = ref(false);
		/** The credit total of the open thread, from the store of its runtime. */
		const activeThreadCreditsUsed = computed(() => {
			const threadId = activeThreadId.value;
			if (!threadId) return void 0;
			return isAgentThread.value ? assistantAgentThreadsStore.threadCreditsUsed(threadId) : store.threadCreditsUsed(threadId);
		});
		/** Which runtime runs a thread, and the metadata that tells its subject. */
		function findThread(threadId) {
			const metadata = store.getThreadMetadata(threadId);
			if (metadata !== void 0 || store.threads.some((t) => t.id === threadId)) return {
				isAgentThread: false,
				metadata
			};
			const agentThread = usesAssistantAgent.value ? assistantAgentThreadsStore.threadsById.get(threadId) : void 0;
			return agentThread ? {
				isAgentThread: true,
				metadata: agentThread.metadata
			} : void 0;
		}
		/** Fetches a thread that no store holds, from the runtime that runs it. */
		async function fetchThread(threadId) {
			if (usesAssistantAgent.value) {
				if ((knownAssistantThreadRuntime(threadId, {
					assistantAgentEnabled: true,
					isAssistantThread: (id) => store.threads.some((thread) => thread.id === id)
				}) ?? await lookUpAssistantThreadRuntime(threadId, async (id) => {
					const thread = await getSystemAgentThread(rootStore.restApiContext, "assistant", id);
					assistantAgentThreadsStore.addOpenedThread(thread);
					return thread;
				})).kind === "assistant-agent") {
					await assistantAgentThreadsStore.loadThread(threadId);
					return {
						isAgentThread: true,
						metadata: assistantAgentThreadsStore.threadsById.get(threadId)?.metadata
					};
				}
			}
			try {
				await store.loadThread(threadId);
			} catch {}
			return {
				isAgentThread: false,
				metadata: store.getThreadMetadata(threadId)
			};
		}
		/**
		* Confirm an incoming `threadId` actually targets this subject before
		* `ThreadScope` is allowed to mount it: the host may hand in a stale
		* `?assistantThread=` (or similar) that now belongs to a different agent, or
		* to nothing at all. A thread already known locally is checked as-is;
		* otherwise it's fetched once. Anything that doesn't match is treated as
		* absent, same as no `threadId` at all.
		*/
		async function verifyThreadId(threadId) {
			threadIdVerified.value = false;
			if (draftThreadIds.has(threadId)) {
				isAgentThread.value = false;
				threadIdVerified.value = true;
				return;
			}
			if (panelAgentThreads.has(threadId)) {
				isAgentThread.value = true;
				threadIdVerified.value = true;
				return;
			}
			const thread = findThread(threadId) ?? await fetchThread(threadId).catch(() => void 0);
			if (!mounted || props.threadId !== threadId) return;
			if (thread && threadTargetsSubject(thread.metadata, props.subject)) {
				isAgentThread.value = thread.isAgentThread;
				threadIdVerified.value = true;
				return;
			}
			await resumeOrMintThread();
		}
		onMounted(() => {
			if (props.threadId) {
				store.loadThreads();
				verifyThreadId(props.threadId);
			} else resumeOrMintThread();
		});
		watch(() => props.threadId, (next, previous) => {
			if (previous && previous !== next && previous !== handedOffThreadId) {
				store.disposeRuntime(previous);
				if (draftThreadIds.delete(previous)) clearPendingThreadHandoff(previous);
			}
			if (!next) {
				resumeOrMintThread();
				return;
			}
			verifyThreadId(next);
		});
		onUnmounted(() => {
			emit("update:building", false);
			emit("update:working", false);
			if (props.threadId && props.threadId !== handedOffThreadId) store.disposeRuntime(props.threadId);
			for (const threadId of draftThreadIds) clearPendingThreadHandoff(threadId);
		});
		function onAgentSessionCreated() {
			if (props.threadId) panelAgentThreads.set(props.threadId, false);
		}
		function onThreadSelect(threadId) {
			if (building.value) return;
			emit("update:threadId", threadId);
		}
		function onNewThreadRequested() {
			if (building.value) return;
			mintThread();
		}
		function onThreadDeleted(wasActive) {
			if (!wasActive) return;
			const nextId = newestThreadId();
			if (nextId) emit("update:threadId", nextId);
			else mintThread();
		}
		async function openFullAssistant() {
			const threadId = activeThreadId.value;
			if (!threadId) return;
			const subjectIdAtStart = props.subject.id;
			try {
				await props.beforeSend?.();
			} catch {}
			if (!mounted || props.subject.id !== subjectIdAtStart || activeThreadId.value !== threadId) return;
			try {
				await persistDraftThread(threadId);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") return;
				toast.showError(error, i18n.baseText("instanceAi.handoff.openFailed.title"));
				return;
			}
			if (!mounted || props.subject.id !== subjectIdAtStart || activeThreadId.value !== threadId) return;
			if (panelAgentThreads.get(threadId) === true && props.subject.type !== "workflow") markAssistantAgentLaunch(threadId, {
				projectId: props.subject.projectId,
				subject: props.subject
			});
			handedOffThreadId = threadId;
			router.push({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId }
			});
		}
		const currentThreadTitle = computed(() => {
			const threadId = activeThreadId.value;
			if (!threadId) return void 0;
			if (isAgentThread.value) return assistantAgentThreadsStore.threadsById.get(threadId)?.title ?? void 0;
			const summary = store.threads.find((thread) => thread.id === threadId);
			const runtime = store.getRuntime(threadId);
			return getThreadDisplayTitle(summary, runtime?.messages ?? []);
		});
		/**
		* Owns the provide-boundary for the thread runtime: `provide()` only takes
		* effect for descendants created after it runs, so re-providing on a thread
		* switch needs a component that itself remounts (keyed by thread id) rather
		* than a plain watcher. Also the one place that can pass the runtime to
		* `useAgentMutationRefresh` / `useBuildingArtifactIds`, which need it handed
		* in by whichever scope provides it.
		*/
		const ThreadScope = defineComponent({
			name: "InstanceAiChatPanelThreadScope",
			props: { threadId: {
				type: String,
				required: true
			} },
			emits: ["thread-missing", "update:building"],
			setup(scopeProps, { emit: scopeEmit }) {
				const runtime = provideThread(scopeProps.threadId);
				const working = useIsAgentWorking(runtime);
				watch(working, (value) => emit("update:working", value), { immediate: true });
				useAgentMutationRefresh(runtime);
				const buildingArtifactIds = useBuildingArtifactIds(runtime);
				watch(() => buildingArtifactIds.value.has(props.subject.id), (value) => scopeEmit("update:building", value), { immediate: true });
				return () => h(InstanceAiConversation_default, {
					ref: conversationRef,
					subject: props.subject,
					newThread: draftThreadIds.has(scopeProps.threadId),
					beforeSend: () => beforeConversationSend(scopeProps.threadId),
					placeholder: props.placeholder,
					placeholderPreview: props.placeholderPreview,
					autofocus: props.visible,
					composerHeight: props.composerHeight,
					onMessageSent: () => emit("message-sent"),
					onContentChange: (hasContent) => emit("content-change", hasContent),
					onThreadMissing: () => scopeEmit("thread-missing")
				}, {
					...slots.empty ? { empty: slots.empty } : {},
					...slots["composer-start"] ? { "composer-start": slots["composer-start"] } : {},
					...slots["composer-footer"] ? { "composer-footer": slots["composer-footer"] } : {}
				});
			}
		});
		/** Handle shortcuts locally instead of useKeybindings because ChatInput has canvas paste protection. */
		function handleCloseShortcut(event) {
			if (props.closable === false) return;
			if (event.defaultPrevented || event.isComposing || event.shiftKey || event.altKey || event.target instanceof Element && event.target.closest("[role=\"dialog\"]")) return;
			const isEscape = event.key === "Escape" && !event.ctrlKey && !event.metaKey;
			const isToggleShortcut = event.key.toLowerCase() === "j" && isCtrlKeyPressed(event);
			if (!isEscape && !isToggleShortcut) return;
			event.preventDefault();
			event.stopPropagation();
			emit("close");
		}
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				class: normalizeClass(_ctx.$style.panel),
				"data-test-id": "instance-ai-embed-panel",
				onKeydown: handleCloseShortcut
			}, [createVNode(InstanceAiViewHeader_default, {
				title: currentThreadTitle.value,
				"thread-id": activeThreadId.value,
				"thread-credits-used": activeThreadCreditsUsed.value,
				"thread-list": {
					filter: threadFilter,
					navigate: false,
					disabled: building.value
				},
				onSelect: onThreadSelect,
				onDeleted: onThreadDeleted
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
							disabled: building.value,
							"aria-label": unref(i18n).baseText("instanceAi.thread.new"),
							"data-test-id": "instance-ai-embed-new-thread",
							onClick: onNewThreadRequested
						}, null, 8, ["disabled", "aria-label"])]),
						_: 1
					}, 8, ["content", "show-after"]),
					props.showOpenFullAssistant ? (openBlock(), createBlock(unref(N8nTooltip_default), {
						key: 0,
						content: unref(i18n).baseText("instanceAi.embed.openFullAssistant"),
						placement: "bottom",
						"show-after": unref(500)
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "external-link",
							variant: "ghost",
							size: "small",
							"icon-size": "large",
							"aria-label": unref(i18n).baseText("instanceAi.embed.openFullAssistant"),
							"data-test-id": "instance-ai-embed-open-full",
							onClick: openFullAssistant
						}, null, 8, ["aria-label"])]),
						_: 1
					}, 8, ["content", "show-after"])) : createCommentVNode("", true),
					props.closable !== false ? (openBlock(), createBlock(KeyboardShortcutTooltip_default, {
						key: 1,
						placement: "bottom",
						label: unref(i18n).baseText("generic.close"),
						shortcut: {
							metaKey: false,
							shiftKey: false,
							keys: ["esc"]
						}
					}, {
						default: withCtx(() => [createVNode(unref(N8nIconButton_default), {
							icon: "x",
							variant: "ghost",
							size: "small",
							"icon-size": "large",
							"aria-label": unref(i18n).baseText("generic.close"),
							"data-test-id": "instance-ai-embed-close",
							onClick: _cache[0] || (_cache[0] = ($event) => emit("close"))
						}, null, 8, ["aria-label"])]),
						_: 1
					}, 8, ["label"])) : createCommentVNode("", true)
				]),
				_: 1
			}, 8, [
				"title",
				"thread-id",
				"thread-credits-used",
				"thread-list"
			]), createBaseVNode("div", { class: normalizeClass(_ctx.$style.body) }, [activeThreadId.value && isAgentThread.value && props.subject.type === "agent" ? (openBlock(), createBlock(AssistantAgentPanelThread_default, {
				ref_key: "agentThreadRef",
				ref: agentThreadRef,
				key: activeThreadId.value,
				"thread-id": activeThreadId.value,
				subject: props.subject,
				"new-session": unref(panelAgentThreads).get(activeThreadId.value) === true,
				placeholder: props.placeholder,
				"placeholder-preview": props.placeholderPreview,
				visible: props.visible,
				"composer-height": props.composerHeight,
				"before-send": props.beforeSend,
				class: normalizeClass(_ctx.$style.conversation),
				"onUpdate:building": onBuildingChange,
				"onUpdate:working": _cache[1] || (_cache[1] = ($event) => emit("update:working", $event)),
				onMessageSent: _cache[2] || (_cache[2] = ($event) => emit("message-sent")),
				onContentChange: _cache[3] || (_cache[3] = ($event) => emit("content-change", $event)),
				onSessionCreated: onAgentSessionCreated
			}, createSlots({ _: 2 }, [
				slots.empty ? {
					name: "empty",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "empty")]),
					key: "0"
				} : void 0,
				slots["composer-start"] ? {
					name: "composer-start",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-start")]),
					key: "1"
				} : void 0,
				slots["composer-footer"] ? {
					name: "composer-footer",
					fn: withCtx(() => [renderSlot(_ctx.$slots, "composer-footer")]),
					key: "2"
				} : void 0
			]), 1032, [
				"thread-id",
				"subject",
				"new-session",
				"placeholder",
				"placeholder-preview",
				"visible",
				"composer-height",
				"before-send",
				"class"
			])) : activeThreadId.value ? (openBlock(), createBlock(unref(ThreadScope), {
				key: activeThreadId.value,
				"thread-id": activeThreadId.value,
				class: normalizeClass(_ctx.$style.conversation),
				onThreadMissing: mintThread,
				"onUpdate:building": onBuildingChange
			}, null, 8, ["thread-id", "class"])) : createCommentVNode("", true)], 2)], 34);
		};
	}
}), [["__cssModules", { "$style": {
	panel: "_panel_1bb5c_1",
	body: "_body_1bb5c_10",
	conversation: "_conversation_1bb5c_17"
} }]]);
//#endregion
//#region src/features/ai/instanceAi/components/AgentBuildingIndicator.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = ["aria-label"];
var AgentBuildingIndicator_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBuildingIndicator",
	setup(__props) {
		const i18n = useI18n();
		const waves = [
			{
				x: 50,
				width: 24,
				height: 95
			},
			{
				x: 78,
				width: 17,
				height: 82
			},
			{
				x: 24,
				width: 19,
				height: 76
			},
			{
				x: 12,
				width: 16,
				height: 88
			},
			{
				x: 86,
				width: 17,
				height: 76
			},
			{
				x: 65,
				width: 21,
				height: 63
			},
			{
				x: 35,
				width: 18,
				height: 57
			},
			{
				x: 96,
				width: 15,
				height: 76
			},
			{
				x: 4,
				width: 13,
				height: 82
			}
		].map((lobe, index) => ({
			"--wave-position": `${lobe.x}% 100%`,
			"--wave-width": `${lobe.width}%`,
			"--wave-depth": `${lobe.height / 100}`,
			"--wave-color": `var(--n8n-wave--color-${index % 9 + 1})`,
			"--wave-delay": `calc(var(--n8n-wave--duration) * ${-index / 7})`,
			"--wave-duration": `calc(var(--n8n-wave--duration) * ${1 + index % 3 * .17})`
		}));
		const whimsicalLabels = [
			"instanceAi.agentPreview.building.imagining",
			"instanceAi.agentPreview.building.tinkering",
			"instanceAi.agentPreview.building.pondering",
			"instanceAi.agentPreview.building.brewing",
			"instanceAi.agentPreview.building.hatching",
			"instanceAi.agentPreview.building.concocting",
			"instanceAi.agentPreview.building.sparkling",
			"instanceAi.agentPreview.building.noodling",
			"instanceAi.agentPreview.building.percolating",
			"instanceAi.agentPreview.building.doodling"
		];
		function generateWhimsicalLabel() {
			return whimsicalLabels[Math.floor(Math.random() * whimsicalLabels.length)] ?? "instanceAi.agentPreview.building";
		}
		const whimsicalLabel = ref(generateWhimsicalLabel());
		useIntervalFn(() => {
			whimsicalLabel.value = generateWhimsicalLabel();
		}, 5 * TIME.SECOND);
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", { class: normalizeClass(_ctx.$style.wave) }, [createBaseVNode("div", {
				class: normalizeClass(_ctx.$style.buildingIndicator),
				role: "status",
				"aria-live": "polite",
				"aria-label": unref(i18n).baseText("instanceAi.agentPreview.building"),
				"data-test-id": "instance-ai-agent-building-indicator"
			}, [
				createVNode(unref(N8nSpinner_default), {
					type: "grid",
					size: "large",
					"aria-hidden": "true"
				}),
				createVNode(unref(VisuallyHidden_default), null, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("instanceAi.agentPreview.building")), 1)]),
					_: 1
				}),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.buildingLabel),
					"aria-hidden": "true"
				}, [createVNode(Transition, {
					"enter-active-class": _ctx.$style.labelEnterActive,
					"leave-active-class": _ctx.$style.labelLeaveActive,
					"enter-from-class": _ctx.$style.labelEnterFrom,
					"leave-to-class": _ctx.$style.labelLeaveTo
				}, {
					default: withCtx(() => [(openBlock(), createBlock(unref(N8nText_default), {
						key: whimsicalLabel.value,
						step: "md",
						bold: "",
						class: normalizeClass(_ctx.$style.labelWord)
					}, {
						default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText(whimsicalLabel.value)), 1)]),
						_: 1
					}, 8, ["class"]))]),
					_: 1
				}, 8, [
					"enter-active-class",
					"leave-active-class",
					"enter-from-class",
					"leave-to-class"
				])], 2)
			], 10, _hoisted_1), (openBlock(), createElementBlock(Fragment, null, renderList([
				"inner",
				"ring",
				"bloom",
				"highlight"
			], (layer) => {
				return createBaseVNode("div", {
					key: layer,
					class: normalizeClass([_ctx.$style.waveLayer, _ctx.$style[layer]]),
					"aria-hidden": "true"
				}, [(openBlock(true), createElementBlock(Fragment, null, renderList(unref(waves), (wave, index) => {
					return openBlock(), createElementBlock("div", {
						key: index,
						class: normalizeClass(_ctx.$style.waveLight),
						style: normalizeStyle(wave)
					}, null, 6);
				}), 128))], 2);
			}), 64))], 2);
		};
	}
}), [["__cssModules", { "$style": {
	wave: "_wave_1938q_450",
	fadeInUp: "_fadeInUp_1938q_1",
	buildingIndicator: "_buildingIndicator_1938q_499",
	buildingLabel: "_buildingLabel_1938q_529",
	labelWord: "_labelWord_1938q_534",
	labelEnterActive: "_labelEnterActive_1938q_538",
	labelLeaveActive: "_labelLeaveActive_1938q_539",
	labelEnterFrom: "_labelEnterFrom_1938q_550",
	labelLeaveTo: "_labelLeaveTo_1938q_551",
	waveLayer: "_waveLayer_1938q_564",
	ring: "_ring_1938q_572",
	inner: "_inner_1938q_581",
	waveLight: "_waveLight_1938q_585",
	bloom: "_bloom_1938q_589",
	highlight: "_highlight_1938q_596",
	"wave-breathe": "_wave-breathe_1938q_1",
	shimmer: "_shimmer_1938q_1",
	spin: "_spin_1938q_1",
	"skeleton-pulse": "_skeleton-pulse_1938q_1",
	opacityPulse: "_opacityPulse_1938q_1",
	popoverIn: "_popoverIn_1938q_1",
	fadeIn: "_fadeIn_1938q_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1938q_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1938q_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1938q_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1938q_1",
	blurSwapIn: "_blurSwapIn_1938q_1",
	blurSwapOut: "_blurSwapOut_1938q_1",
	pulse: "_pulse_1938q_1",
	pulseGlow: "_pulseGlow_1938q_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1938q_1",
	fade: "_fade_1938q_1",
	fadeInDown: "_fadeInDown_1938q_1",
	fadeInLeft: "_fadeInLeft_1938q_1",
	fadeInRight: "_fadeInRight_1938q_1",
	fadeOut: "_fadeOut_1938q_1",
	fadeOutDown: "_fadeOutDown_1938q_1",
	fadeOutUp: "_fadeOutUp_1938q_1",
	fadeOutLeft: "_fadeOutLeft_1938q_1",
	fadeOutRight: "_fadeOutRight_1938q_1",
	ping: "_ping_1938q_1",
	blinkBackground: "_blinkBackground_1938q_1",
	typingBlink: "_typingBlink_1938q_1"
} }]]);
//#endregion
//#region src/features/agents/composables/useFixWithAssistantCalloutDismissal.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The preview message list unmounts when the dock closes, then history reload
* brings the same tool errors back. Remember handed-off ids here so the
* callout stays gone after that remount.
*/
var STORAGE_PREFIX = "N8N_AGENT_PREVIEW_FIX_CALLOUT:";
function storageKey(sessionId) {
	return `${STORAGE_PREFIX}${sessionId}`;
}
function isStringArray(value) {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function parseRecord(raw) {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (!isRecord(parsed)) return null;
		if (typeof parsed.agentId !== "string") return null;
		if (!isStringArray(parsed.pending) || !isStringArray(parsed.dismissed)) return null;
		return {
			agentId: parsed.agentId,
			pending: parsed.pending,
			dismissed: parsed.dismissed
		};
	} catch {
		return null;
	}
}
function readRecord(sessionId) {
	return parseRecord(sessionStorage.getItem(storageKey(sessionId)));
}
function listStorageKeys() {
	const keys = [];
	for (let index = 0; index < sessionStorage.length; index++) {
		const key = sessionStorage.key(index);
		if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
	}
	return keys;
}
function unique(ids) {
	return [...new Set(ids)];
}
function useFixWithAssistantCalloutDismissal(sessionId) {
	const storageVersion = ref(0);
	const dismissedToolCallIds = computed(() => {
		storageVersion.value;
		const id = sessionId.value;
		if (!id) return [];
		return readRecord(id)?.dismissed ?? [];
	});
	function trackAcceptedFixHandoff(targetSessionId, agentId, toolCallIds) {
		if (toolCallIds.length === 0) return;
		const existing = readRecord(targetSessionId) ?? {
			agentId,
			pending: [],
			dismissed: []
		};
		existing.agentId = agentId;
		existing.pending = unique([...existing.pending, ...toolCallIds]);
		sessionStorage.setItem(storageKey(targetSessionId), JSON.stringify(existing));
	}
	function onAgentUpdated(event) {
		if (event?.source !== "instance-ai" || !event.agentId) return;
		let changed = false;
		for (const key of listStorageKeys()) {
			const record = parseRecord(sessionStorage.getItem(key));
			if (!record || record.agentId !== event.agentId || record.pending.length === 0) continue;
			record.dismissed = unique([...record.dismissed, ...record.pending]);
			record.pending = [];
			sessionStorage.setItem(key, JSON.stringify(record));
			changed = true;
		}
		if (changed) storageVersion.value++;
	}
	agentsEventBus.on("agentUpdated", onAgentUpdated);
	onBeforeUnmount(() => {
		agentsEventBus.off("agentUpdated", onAgentUpdated);
	});
	return {
		dismissedToolCallIds,
		trackAcceptedFixHandoff
	};
}
//#endregion
//#region src/features/agents/views/AgentBuilderView.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_runtime_dom_esm_bundler(), init_shared_esm_bundler();
var AGENT_BUILDER_EDITOR_MIN_WIDTH = 480;
var AgentBuilderView_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	__name: "AgentBuilderView",
	props: {
		artifactMode: {
			type: Boolean,
			default: false
		},
		builderLayout: {},
		artifactProjectId: { default: void 0 },
		artifactAgentId: { default: void 0 },
		artifactPreviewSessionId: { default: void 0 },
		artifactPreviewOpen: {
			type: Boolean,
			default: void 0
		},
		artifactPreviewChatTarget: { default: void 0 },
		artifactEditingLocked: {
			type: Boolean,
			default: false
		},
		artifactAgentPending: {
			type: Boolean,
			default: false
		},
		artifactPersistAgent: {
			type: Function,
			default: void 0
		}
	},
	emits: [
		"preview-open-change",
		"name-saved",
		"assistant-handoff"
	],
	setup(__props, { expose: __expose, emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const route = useRoute();
		const router = useRouter();
		const locale = useI18n();
		const rootStore = useRootStore();
		const pushConnectionStore = usePushConnectionStore();
		const projectsStore = useProjectsStore();
		const telemetry = useTelemetry();
		const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
		const { trackClickedTraceDetailsFromTestPanel } = useAgentTelemetry();
		const instanceAiAvailable = useInstanceAiAvailable();
		const instanceAiReady = useInstanceAiReady();
		const sessionsStore = useAgentSessionsStore();
		const agentEvalsStore = useAgentEvalsStore();
		const credentialsStore = useCredentialsStore();
		const settingsStore = useSettingsStore();
		const uiStore = useUIStore();
		const nodeTypesStore = useNodeTypesStore();
		const favoritesStore = useFavoritesStore();
		const mcpStore = useMCPStore();
		const mcp = useMcp();
		const agentCollaborationStore = useAgentCollaborationStore();
		useActivityDetection(agentCollaborationStore);
		const { isCtrlKeyPressed } = useDeviceSupport();
		const isKnowledgeBaseEnabled = computed(() => settingsStore.isAgentsKnowledgeBaseFeatureEnabled);
		const documentTitle = useDocumentTitle();
		const { showError, showMessage } = useToast();
		const { openAgentConfirmationModal } = useAgentConfirmationModal();
		const { archive, unarchive } = useAgentArchive();
		const isArtifactMode = computed(() => props.artifactMode);
		const isStandalonePreview = computed(function isStandalonePreview() {
			return !isArtifactMode.value && route.name === "AgentPreviewView";
		});
		const projectId = computed(() => (isArtifactMode.value ? props.artifactProjectId : void 0) ?? route.params.projectId ?? projectsStore.personalProject?.id ?? "");
		const agentId = computed(() => (isArtifactMode.value ? props.artifactAgentId : void 0) ?? route.params.agentId);
		function historyMarksAgentPending(targetAgentId) {
			return history.state[PENDING_AGENT_ID_STATE] === targetAgentId;
		}
		function readPendingAgentIdFromHistory() {
			const pendingAgentId = history.state[PENDING_AGENT_ID_STATE];
			if (typeof pendingAgentId === "string") return pendingAgentId;
			return unsavedAgentIds.has(agentId.value) ? agentId.value : null;
		}
		function readPendingStarterFromHistory() {
			const starter = history.state[PENDING_AGENT_STARTER_STATE];
			return isAgentStarter(starter) ? starter : null;
		}
		const routePendingAgentId = ref(readPendingAgentIdFromHistory());
		const routePendingStarter = ref(readPendingStarterFromHistory());
		const pendingStarterMessage = ref(null);
		let starterReady;
		let starterSettled = false;
		let starterInFlight = false;
		const isRouteAgentPending = computed(() => {
			if (isArtifactMode.value) return false;
			return routePendingAgentId.value === agentId.value;
		});
		function currentStarter() {
			if (!isRouteAgentPending.value) return null;
			return routePendingStarter.value;
		}
		function armStarterGate() {
			starterReady?.resolve(void 0);
			starterSettled = false;
			starterInFlight = false;
			pendingStarterMessage.value = null;
			if (!currentStarter()) {
				starterReady = void 0;
				starterSettled = true;
				return;
			}
			starterReady = createDeferredPromise();
		}
		function settleStarter() {
			if (starterSettled) return;
			starterSettled = true;
			starterReady?.resolve(void 0);
		}
		function clearPendingStarterFromHistory() {
			const historyState = history.state;
			if ("instanceAiPendingAgentStarter" in historyState) {
				const { [PENDING_AGENT_STARTER_STATE]: _starter, ...state } = historyState;
				history.replaceState(state, "");
			}
			routePendingStarter.value = null;
		}
		armStarterGate();
		const isAgentPending = computed(() => props.artifactAgentPending || isRouteAgentPending.value);
		const previewOpenStorageKey = computed(function getPreviewOpenStorageKey() {
			return `N8N_AGENT_PREVIEW_OPEN:${projectId.value}:${agentId.value}`;
		});
		const persistedPreviewOpen = useStorage(previewOpenStorageKey, false);
		const resizedPreviewDockWidth = ref();
		const previewDockWidth = computed({
			get: () => resizedPreviewDockWidth.value ?? defaultPanelWidth.value,
			set: (width) => {
				resizedPreviewDockWidth.value = width;
			}
		});
		const isPreviewDockResizing = ref(false);
		const builderHost = useTemplateRef("builderHost");
		const { width: builderHostWidth } = useElementSize(computed(() => builderHost.value?.parentElement));
		const builderContainer = useTemplateRef("builderContainer");
		const { width: builderContainerWidth } = useElementSize(builderContainer, void 0, { box: "border-box" });
		provide(AGENT_BUILDER_STANDALONE_KEY, !isArtifactMode.value);
		const chatLayoutEnabled = computed(() => !isArtifactMode.value && !isStandalonePreview.value && instanceAiReady.value);
		const builderExperiment = useAgentBuilderExperimentStore();
		const builderLayout = computed(() => props.builderLayout ?? builderExperiment.layout);
		const wideChat = computed(() => chatLayoutEnabled.value && builderLayout.value.chatWidth === "wide");
		const inlineTestChat = computed(() => chatLayoutEnabled.value && builderLayout.value.testChat === "inline");
		const { compact: compactLayout, chatWidth: wideChatWidth, defaultChatWidth, resizeChat } = useAgentBuilderLayout(builderContainerWidth, builderHostWidth);
		const compactChatLayout = computed(() => chatLayoutEnabled.value && (wideChat.value || inlineTestChat.value) && compactLayout.value);
		const showConfiguration = ref(false);
		const mobileNavigation = useTemplateRef("mobileNavigation");
		watch(showConfiguration, async (visible) => {
			if (!visible || !compactChatLayout.value) return;
			await nextTick();
			mobileNavigation.value?.querySelector("button")?.focus();
		});
		function closeBuilderChat() {
			if (compactChatLayout.value) showConfiguration.value = true;
			else isAiPanelOpen.value = false;
		}
		function closeTestChat() {
			if (compactChatLayout.value && inlineTestChat.value) showConfiguration.value = true;
			else closePreviewDock();
		}
		const hasSentBuilderMessage = useLocalStorage(computed(() => `N8N_AGENT_BUILDER_CHAT_STARTED:${projectId.value}:${agentId.value}`), false);
		const chatMode = computed(() => isPreviewDockOpen.value ? "test" : "build");
		let previewRequest = 0;
		async function setChatMode(mode) {
			if (mode === "test") return await onOpenPreview();
			if (chatModeBusy.value) return false;
			if (!isArtifactMode.value && instanceAiReady.value) isAiPanelOpen.value = true;
			closePreviewDock();
			return true;
		}
		const openParentAgentChatPreview = inject("openAgentChatPreview", void 0);
		if (!isArtifactMode.value) provide("openAgentChatPreview", (targetAgentId, targetProjectId) => {
			if (targetAgentId === agentId.value && targetProjectId === projectId.value) setChatMode("test");
			else if (openParentAgentChatPreview) return openParentAgentChatPreview(targetAgentId, targetProjectId);
			else router.push(buildAgentTestHref(targetProjectId, targetAgentId));
			return true;
		});
		const defaultPanelWidth = computed(() => {
			if (builderContainerWidth.value === 0) return 480;
			return clampPanelWidth(builderContainerWidth.value * AGENT_DEFAULT_PANEL_WIDTH_RATIO);
		});
		const isPreviewDockOpen = computed(function isPreviewDockOpen() {
			return !isStandalonePreview.value && persistedPreviewOpen.value;
		});
		const taskPreviewPrompt = ref();
		const isPreviewActive = computed(function isPreviewActive() {
			return isStandalonePreview.value || isPreviewDockOpen.value;
		});
		const aiPanelOpenStorageKey = computed(function getAiPanelOpenStorageKey() {
			return `N8N_AGENT_AI_PANEL_OPEN:${projectId.value}:${agentId.value}`;
		});
		const storedAiPanelOpen = useLocalStorage(aiPanelOpenStorageKey, null, {
			serializer: StorageSerializers.boolean,
			writeDefaults: false,
			flush: "sync"
		});
		const aiPanelOpenForVisit = ref(null);
		const openedForPendingAgent = ref(isRouteAgentPending.value);
		/** A starter template was applied; latches the intro closed even if a config
		* refetch momentarily restores a blank config. No chip is shown for this. */
		const templateApplied = ref(false);
		watch([projectId, agentId], () => {
			taskPreviewPrompt.value = void 0;
			showConfiguration.value = false;
			aiPanelOpenForVisit.value = null;
		});
		watch(agentId, () => {
			routePendingAgentId.value = readPendingAgentIdFromHistory();
			routePendingStarter.value = readPendingStarterFromHistory();
			openedForPendingAgent.value = isRouteAgentPending.value;
			templateApplied.value = false;
			armStarterGate();
		});
		const isAiPanelOpen = computed({
			get: () => aiPanelOpenForVisit.value ?? storedAiPanelOpen.value ?? (openedForPendingAgent.value && instanceAiReady.value),
			set: (value) => {
				aiPanelOpenForVisit.value = null;
				storedAiPanelOpen.value = value;
			}
		});
		const showAiPanel = computed(() => !isArtifactMode.value && !isStandalonePreview.value && instanceAiReady.value && chatPanelLayout.value.showAssistant);
		const aiThreadId = computed(() => typeof route.query["assistantThread"] === "string" ? route.query[ASSISTANT_THREAD_PARAM] : void 0);
		function onAiThreadIdChange(threadId) {
			const message = pendingStarterMessage.value;
			if (message) {
				stashPendingFirstMessage(threadId, message);
				pendingStarterMessage.value = null;
				clearPendingStarterFromHistory();
			}
			router.replace({ query: {
				...route.query,
				[ASSISTANT_THREAD_PARAM]: threadId
			} });
		}
		/** True while the embedded assistant is actively mutating this agent. */
		const embeddedAiBuilding = ref(false);
		const embeddedAiWorking = ref(false);
		const chatModeBusy = computed(() => !isArtifactMode.value && (embeddedAiWorking.value || embeddedAiBuilding.value));
		const aiPanelRef = useTemplateRef("aiPanelRef");
		const queuedAiHandoff = ref(null);
		function cancelQueuedAiHandoff() {
			const queued = queuedAiHandoff.value;
			queuedAiHandoff.value = null;
			queued?.resolve(false);
		}
		watch([projectId, agentId], cancelQueuedAiHandoff);
		watch(aiPanelRef, (panel) => {
			if (!panel || !queuedAiHandoff.value) return;
			const { context, initialDraft, onAccepted, resolve } = queuedAiHandoff.value;
			queuedAiHandoff.value = null;
			const handed = panel.handoff(context, initialDraft);
			if (handed) onAccepted?.();
			resolve(handed);
		});
		async function handoffToAssistantPanel(context, initialDraft, onAccepted) {
			if (isArtifactMode.value || !instanceAiReady.value) return false;
			const targetAgentId = agentId.value;
			const targetProjectId = projectId.value;
			isAiPanelOpen.value = true;
			await nextTick();
			if (disposed || agentId.value !== targetAgentId || projectId.value !== targetProjectId) return false;
			if (aiPanelRef.value) {
				if (!aiPanelRef.value.handoff(context, initialDraft)) return false;
				showConfiguration.value = false;
				onAccepted?.();
				if (isPreviewActive.value) closePreviewDock();
			} else {
				cancelQueuedAiHandoff();
				return await new Promise((resolve) => {
					queuedAiHandoff.value = {
						context,
						initialDraft,
						onAccepted,
						resolve
					};
					closePreviewDock();
				});
			}
			return true;
		}
		function onCredentialHelpRequested(request) {
			if (isArtifactMode.value || request.projectId !== projectId.value || request.agentId !== agentId.value) return;
			request.handle = async () => {
				return await handoffToAssistantPanel(buildInstanceAiCredentialHandoffContext(request.credential), {
					text: buildInstanceAiCredentialQuestion(request.credential),
					prefillType: "handoff_credential_setup"
				}, () => {
					for (const { key } of AGENTS_MODALS) if (uiStore.modalsById[key]?.open) uiStore.closeModal(key);
				});
			};
		}
		agentsEventBus.on("credentialHelpRequested", onCredentialHelpRequested);
		const savedAiPanelWidth = useStorage("N8N_AGENT_AI_PANEL_WIDTH", null, void 0, {
			serializer: StorageSerializers.number,
			writeDefaults: false
		});
		const aiPanelWidth = computed({
			get: () => savedAiPanelWidth.value ?? defaultPanelWidth.value,
			set: (width) => {
				savedAiPanelWidth.value = width;
			}
		});
		const preferredSidePanel = ref("assistant");
		function bothSidePanelsFit() {
			if (builderContainerWidth.value === 0) return true;
			return builderContainerWidth.value >= AGENT_BUILDER_EDITOR_MIN_WIDTH + 640;
		}
		function clampPanelWidth(width, maxWidth = 720) {
			return Math.min(maxWidth, Math.max(width, 320));
		}
		const chatPanelLayout = computed(() => {
			const containerWidth = builderContainerWidth.value;
			const sharedWidth = wideChat.value || compactChatLayout.value ? wideChatWidth.value : clampPanelWidth(aiPanelWidth.value, Math.max(320, containerWidth - AGENT_BUILDER_EDITOR_MIN_WIDTH));
			const preview = inlineTestChat.value ? sharedWidth : clampPanelWidth(previewDockWidth.value, Math.max(320, containerWidth - 360 - 320));
			const resizeOffset = wideChat.value && !inlineTestChat.value && isPreviewDockOpen.value ? preview : 0;
			return {
				ai: inlineTestChat.value || !isPreviewDockOpen.value ? sharedWidth : Math.max(320, sharedWidth - preview),
				preview,
				resizeOffset,
				maxWidth: wideChat.value ? Math.max(320, containerWidth - resizeOffset - 360) : 720,
				defaultWidth: wideChat.value ? defaultChatWidth.value - resizeOffset : defaultPanelWidth.value,
				showAssistant: inlineTestChat.value || (wideChat.value ? !isPreviewDockOpen.value || containerWidth >= 1e3 : isAiPanelOpen.value)
			};
		});
		const renderedSidePanelWidths = computed(function getRenderedSidePanelWidths() {
			if (wideChat.value || compactChatLayout.value || inlineTestChat.value) return chatPanelLayout.value;
			const containerWidth = builderContainerWidth.value;
			const bothPanelsOpen = showAiPanel.value && isPreviewDockOpen.value;
			const availableSidePanelWidth = containerWidth === 0 ? Infinity : Math.max(320, containerWidth - AGENT_BUILDER_EDITOR_MIN_WIDTH);
			const openPanelMaxWidth = bothPanelsOpen ? 720 : Math.min(720, availableSidePanelWidth);
			const desiredAiWidth = clampPanelWidth(aiPanelWidth.value, showAiPanel.value ? openPanelMaxWidth : 720);
			const desiredPreviewWidth = clampPanelWidth(previewDockWidth.value, isPreviewDockOpen.value ? openPanelMaxWidth : 720);
			if (!bothPanelsOpen || !bothSidePanelsFit()) return {
				ai: desiredAiWidth,
				preview: desiredPreviewWidth
			};
			if (desiredAiWidth + desiredPreviewWidth <= availableSidePanelWidth) return {
				ai: desiredAiWidth,
				preview: desiredPreviewWidth
			};
			const availableExtraWidth = availableSidePanelWidth - 640;
			const desiredAiExtraWidth = desiredAiWidth - 320;
			const renderedAiWidth = 320 + availableExtraWidth * (desiredAiExtraWidth / (desiredAiExtraWidth + (desiredPreviewWidth - 320)));
			return {
				ai: renderedAiWidth,
				preview: availableSidePanelWidth - renderedAiWidth
			};
		});
		function keepPreferredSidePanel() {
			if (inlineTestChat.value || wideChat.value || !showAiPanel.value || !isPreviewDockOpen.value || bothSidePanelsFit()) return;
			if (preferredSidePanel.value === "preview") {
				isAiPanelOpen.value = false;
				return;
			}
			closePreviewDock();
		}
		watch(showAiPanel, (open, wasOpen) => {
			if (open && !wasOpen) preferredSidePanel.value = "assistant";
		}, { flush: "sync" });
		watch(isPreviewDockOpen, (open, wasOpen) => {
			if (open && !wasOpen) preferredSidePanel.value = "preview";
		}, { flush: "sync" });
		watch([
			builderContainerWidth,
			showAiPanel,
			isPreviewDockOpen,
			aiPanelWidth,
			previewDockWidth
		], keepPreferredSidePanel, { flush: "post" });
		function onAiPanelResize({ width }) {
			if (wideChat.value) {
				resizeChat(width + chatPanelLayout.value.resizeOffset);
				return;
			}
			preferredSidePanel.value = "assistant";
			aiPanelWidth.value = width;
		}
		function toggleAiPanel() {
			if (compactChatLayout.value) {
				showConfiguration.value = !showConfiguration.value;
				return;
			}
			if (inlineTestChat.value || wideChat.value) {
				showConfiguration.value = false;
				closePreviewDock();
				return;
			}
			if (!instanceAiReady.value) {
				router.push({ name: INSTANCE_AI_VIEW });
				return;
			}
			const opening = !isAiPanelOpen.value;
			if (opening) telemetry.track("Instance AI opened from editor", {
				source: "agent_builder_page",
				agent_id: agentId.value,
				workflow_id: null,
				execution_id: null
			});
			isAiPanelOpen.value = opening;
		}
		const agentBuilderHref = computed(function getAgentBuilderHref() {
			return router.resolve({
				name: AGENT_BUILDER_VIEW,
				params: {
					projectId: projectId.value,
					agentId: agentId.value
				},
				query: { [CONTINUE_SESSION_ID_PARAM]: effectiveSessionId.value }
			}).href;
		});
		const isFavorite = computed(() => favoritesStore.isFavorite(agentId.value, "agent"));
		const { canUpdate: canEditAgent, canDelete: canDeleteAgent, canExecute: hasExecuteScope } = useAgentPermissions(projectId);
		const isAgentArchived = computed(() => agent.value?.isArchived === true);
		const canExecuteAgent = computed(() => hasExecuteScope.value && !isAgentArchived.value);
		const configWriteInFlight = ref(false);
		const isEditingLocked = computed(() => props.artifactEditingLocked || embeddedAiBuilding.value || configWriteInFlight.value || agentCollaborationStore.shouldBeReadOnly || isAgentArchived.value);
		const effectiveCanEditAgent = computed(() => canEditAgent.value && !isEditingLocked.value);
		const canDeletePreviewSession = computed(() => canEditAgent.value);
		const showAgentIntro = computed(() => openedForPendingAgent.value && effectiveCanEditAgent.value && !templateApplied.value && localConfig.value !== null && isAgentConfigBlank(localConfig.value));
		const isVersionHistoryOpen = ref(false);
		const versionHistoryTab = ref("versions");
		watch(isPreviewDockOpen, (open) => {
			emit("preview-open-change", open);
		}, { immediate: true });
		watch(() => props.artifactPreviewOpen, (open) => {
			if (!isArtifactMode.value || open === void 0) return;
			persistedPreviewOpen.value = open;
		}, { immediate: true });
		let trackAcceptedFixHandoff = () => {};
		async function onSendPreviewToAssistant(event) {
			const threadId = effectiveSessionId.value;
			if (!threadId || !agentId.value || !projectId.value) return;
			const targetAgentId = agentId.value;
			const acceptFixHandoff = () => {
				if (!event || !("failures" in event) || event.failures.length === 0) return;
				trackAcceptedFixHandoff(threadId, targetAgentId, event.failures.map((failure) => failure.toolCallId));
			};
			const session = currentSession.value;
			const sessionTitle = session?.title?.trim() || currentSessionTitle.value || void 0;
			const sessionNumber = session?.sessionNumber;
			const params = {
				projectId: projectId.value,
				agentId: agentId.value,
				threadId,
				agentName: agentName.value || void 0,
				agentIcon: localConfig.value?.personalisation?.icon,
				sessionTitle,
				...!event ? {} : "failures" in event ? {
					executionId: event.executionId,
					initialDraft: {
						text: buildAgentFixWithAssistantPrompt({
							projectId: projectId.value,
							agentId: agentId.value,
							agentName: agentName.value || void 0,
							threadId,
							sessionTitle,
							...sessionNumber !== void 0 ? { sessionNumber } : {},
							executionId: event.executionId,
							failures: event.failures
						}, locale),
						prefillType: "handoff_agent_change_request"
					}
				} : { initialDraft: {
					text: buildAgentChangeRequestPrompt(event.changeRequest, locale),
					prefillType: "handoff_agent_change_request"
				} }
			};
			if (isArtifactMode.value) {
				emit("assistant-handoff", {
					...params,
					onAccepted: acceptFixHandoff
				});
				return;
			}
			if (!await handoffToAssistantPanel(buildInstanceAiAgentPreviewHandoffContext(params), params.initialDraft, acceptFixHandoff)) return;
			telemetry.track(TELEMETRY_EVENT.AGENTS.INSTANCE_AI_OPENED_FROM_AGENT_PREVIEW, {
				agent_id: params.agentId,
				preview_thread_id: params.threadId,
				...params.executionId ? { preview_execution_id: params.executionId } : {}
			});
		}
		/**
		* Gate for the main body render. Stays false while `initialize()` is running so
		* we don't:
		*   - flash the home screen for users who arrive with a `?prompt=…` query that
		*     will immediately transition them to the build chat, and
		*   - render the preview chat before the route/config/session state has settled.
		*/
		const initialized = ref(false);
		const previewSessionsLoaded = ref(false);
		let disposed = false;
		let latestSessionsFetchRequestId = 0;
		/**
		* No agent row exists behind `agentId` yet. The id was minted by whoever opened
		* this artifact, so the config edits below can create the agent under it at the
		* moment the user first configures something — and until then nothing is
		* persisted. Cleared by `ensureAgentPersisted`.
		*/
		const isUnsaved = ref(false);
		/** Queues `agentUpdated` bus events that land mid-initialize for replay (see `onExternalAgentUpdated`). */
		const pendingExternalRefresh = ref(false);
		/** The queued event's `source`, consumed by `onAgentUpdateRefreshed` once the replay resolves. */
		let pendingExternalRefreshSource;
		const agentName = ref("");
		const agent = ref(null);
		/** Scopes the embedded n8n Assistant panel to this agent's thread history. */
		const instanceAiEmbedSubject = computed(() => ({
			type: "agent",
			id: agentId.value,
			projectId: projectId.value,
			name: agent.value?.name,
			...(isRouteAgentPending.value || isUnsaved.value) && { pending: true }
		}));
		const instanceAiEmbedLaunch = computed(() => ({
			source: "agent_builder_page",
			origin: "internal",
			sourceContext: { agentId: agentId.value }
		}));
		watch(agentName, (name) => {
			documentTitle.set(name || locale.baseText("agents.heading"));
		});
		const { activeChatSessionId, continueSessionId, effectiveSessionId, currentSession, previewThreads, currentSessionHasMessages, currentSessionTitle, currentSessionIsEphemeral, currentSessionIsLocallyMinted, sessionMenu, isDeletingSession, setSessionInUrl, clearContinueSessionParam, onSessionPick, onNewChat, markSessionCreated, deleteSession } = useAgentBuilderSession({
			routeBacked: computed(() => !isArtifactMode.value),
			projectId,
			agentId
		});
		const { dismissedToolCallIds: dismissedFixToolCallIds, trackAcceptedFixHandoff: trackFixHandoff } = useFixWithAssistantCalloutDismissal(effectiveSessionId);
		trackAcceptedFixHandoff = trackFixHandoff;
		const previewSessionsLoading = computed(() => sessionsStore.loading || sessionsStore.previewLoading);
		const previewSessionReady = computed(() => currentSessionIsLocallyMinted.value || currentSession.value?.canContinueInPreview === true);
		const { config, configHash, fetchConfig, updateConfig, acceptCreation, repoint: repointConfig } = useAgentConfig();
		const { validation: configValidation, repoint: repointConfigValidation, invalidate: invalidateConfigValidation, refresh: refreshConfigValidation } = useAgentConfigValidation();
		const localConfig = ref(null);
		let configEditRevision = 0;
		function markConfigDraftEdited() {
			configEditRevision += 1;
		}
		const connectedTriggers = ref([]);
		const isPublishReady = ref(false);
		const { tasks: setupTasks, isVisible: isSetupChecklistVisible } = useAgentSetupTasks(computed(() => {
			return {
				config: {
					loaded: initialized.value && localConfig.value !== null,
					isRunnable: agent.value?.isRunnable === true,
					model: localConfig.value?.model ?? "",
					instructions: localConfig.value?.instructions ?? "",
					toolCount: (localConfig.value?.tools?.length ?? 0) + (localConfig.value?.mcpServers?.length ?? 0) + (localConfig.value?.subAgents?.agents?.length ?? 0)
				},
				channels: {
					loaded: initialized.value,
					ids: connectedTriggers.value
				},
				publication: {
					loaded: initialized.value,
					canPublish: initialized.value && !isUnsaved.value && effectiveCanEditAgent.value && isPublishReady.value,
					activeVersionId: agent.value?.activeVersionId ?? null
				},
				sessions: {
					loaded: initialized.value && previewSessionsLoaded.value,
					count: sessionsStore.previewThreads.length
				}
			};
		}));
		const areSetupTasksVisible = computed(() => isSetupChecklistVisible.value && !agent.value?.activeVersionId && !isUnsaved.value && !props.artifactEditingLocked && !embeddedAiBuilding.value);
		const builderHeader = useTemplateRef("builderHeader");
		const editorColumn = useTemplateRef("editorColumn");
		async function onSetupTaskAction(task) {
			if (task.action.path === "preview") {
				await onOpenPreview();
				return;
			}
			if (activeMainTab.value !== "agent") {
				activeMainTab.value = "agent";
				await nextTick();
			}
			editorColumn.value?.onSetupTaskAction(task);
		}
		function onSetupTaskPublishAgent() {
			builderHeader.value?.publishAgent();
		}
		/** Bumped when the config changes outside the local editor (modal flows, version revert) so the Tasks panel reloads. */
		const tasksReloadKey = ref(0);
		const versionHistoryPanel = useTemplateRef("versionHistoryPanel");
		const previewChatPage = useTemplateRef("previewChatPage");
		const previewDock = useTemplateRef("previewDock");
		const { activeMainTab, mainTabOptions, executionsDescription } = useAgentBuilderMainTabs({
			executionsCount: computed(() => sessionsStore.threads.length),
			routeBacked: computed(() => !isArtifactMode.value)
		});
		const { ensureLoaded: ensureIntegrationsCatalog } = useAgentIntegrationsCatalog();
		const { withN8nChat } = useN8nChatChannel();
		const builderTelemetry = useAgentBuilderTelemetry({
			agentId,
			projectId,
			agent,
			localConfig
		});
		watch([activeMainTab, agentId], ([tab, currentAgentId], previous) => {
			const [previousTab, previousAgentId] = previous ?? [];
			if (tab === "knowledge" && (previousTab !== "knowledge" || previousAgentId !== currentAgentId)) builderTelemetry.trackOpenedKnowledgeTab();
		}, { immediate: true });
		/**
		* The backend owns runnable validation so the chat entry point either opens
		* Preview or stays in the builder.
		*/
		const isBuilt = computed(() => agent.value?.isRunnable === true);
		const previewDisabledReason = computed(() => {
			if (isArtifactMode.value) return void 0;
			if (isAgentArchived.value) return locale.baseText("agents.builder.chatMode.archived");
			if (!canExecuteAgent.value) return locale.baseText("agents.builder.chatMode.noPermission");
			if (chatModeBusy.value) return locale.baseText("agents.builder.chatMode.building");
		});
		const testModeDisabledReason = computed(() => previewDisabledReason.value ?? (!isBuilt.value ? locale.baseText("agents.builder.preview.disabledTooltip") : void 0));
		const testValidationIssues = computed(() => !isBuilt.value && !chatModeBusy.value && canExecuteAgent.value ? configValidation.value?.issues ?? [] : []);
		__expose({ setChatMode });
		watch([
			initialized,
			chatLayoutEnabled,
			() => builderExperiment.enrollment
		], ([loaded, enabled]) => {
			if (loaded && enabled && !props.builderLayout) builderExperiment.trackExposure();
		}, {
			immediate: true,
			flush: "post"
		});
		const showBuilderLoading = computed(() => !initialized.value);
		watch(config, (c) => {
			if (c) {
				localConfig.value = copyAgentConfig(c);
				syncAgentIdentityFromConfig(c);
			}
		}, { immediate: true });
		function syncAgentIdentityFromConfig(c) {
			agentName.value = c.name;
			favoritesStore.renameFavorite(agentId.value, "agent", c.name);
			if (!agent.value) return;
			agent.value = {
				...agent.value,
				name: c.name
			};
		}
		const { projectName, projectIcon } = useAgentProjectBreadcrumb(projectId);
		function isStaleAgentTarget(targetProjectId, targetAgentId) {
			return disposed || projectId.value !== targetProjectId || agentId.value !== targetAgentId;
		}
		async function onGenerateEvalCases() {
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			if (!targetProjectId || !targetAgentId || isUnsaved.value) return;
			try {
				const { cases } = await agentEvalsStore.generateDraftCases(targetProjectId, targetAgentId);
				if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
				showMessage({
					title: locale.baseText("agents.builder.agentEvals.generated", {
						adjustToNumber: cases.length,
						interpolate: { count: String(cases.length) }
					}),
					type: "success"
				});
			} catch (error) {
				if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
				showError(error, locale.baseText("agents.builder.agentEvals.generateError"));
			}
		}
		async function fetchAgent(targetProjectId = projectId.value, targetAgentId = agentId.value, preloaded) {
			const data = preloaded ?? await getAgent(rootStore.restApiContext, targetProjectId, targetAgentId);
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			agent.value = data;
			agentName.value = data.name;
			upsertProjectAgentsListCache(targetProjectId, data);
		}
		const { agentFiles, agentFilesLoading, agentFilesUploading, deletingAgentFileId, fetchAgentFiles, uploadFiles: onUploadAgentFiles, deleteFile: onDeleteAgentFile, warmKnowledgeSandbox: warmAgentKnowledgeSandboxForPage, reset: resetAgentKnowledge } = useAgentKnowledge({
			projectId,
			agentId,
			agent,
			initialized,
			isUnsaved,
			isKnowledgeBaseEnabled,
			isStaleAgentTarget,
			ensureAgentPersisted,
			telemetry: builderTelemetry
		});
		async function refreshAgentAfterIntegrationChange(targetProjectId = projectId.value, targetAgentId = agentId.value) {
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			await Promise.all([
				fetchAgent(targetProjectId, targetAgentId),
				fetchConfig(targetProjectId, targetAgentId),
				refreshConfigValidation(targetProjectId, targetAgentId)
			]);
		}
		function sessionIdForPreview() {
			return effectiveSessionId.value ?? previewThreads.value[0]?.id;
		}
		async function openPreview(preferredSessionId) {
			showConfiguration.value = false;
			preferredSidePanel.value = "preview";
			const sessionId = preferredSessionId ?? sessionIdForPreview();
			activeChatSessionId.value = sessionId ?? null;
			persistedPreviewOpen.value = true;
		}
		function openArtifactPreview(preferredSessionId) {
			if (preferredSessionId) onSessionPick(preferredSessionId);
			else bindPreviewSession();
			persistedPreviewOpen.value = true;
		}
		function viewPreviewTrace() {
			if (!currentSessionHasMessages.value || !effectiveSessionId.value) return;
			trackClickedTraceDetailsFromTestPanel({ agentId: agentId.value });
			router.push({
				name: AGENT_SESSION_DETAIL_VIEW,
				params: {
					projectId: projectId.value,
					agentId: agentId.value,
					threadId: effectiveSessionId.value
				}
			});
		}
		function startNewPreviewSession() {
			onNewChat();
		}
		async function onDeletePreviewSession(sessionId) {
			if (!canDeletePreviewSession.value) return;
			await deleteSession(sessionId);
		}
		async function onOpenPreview(source, expectedTarget) {
			if (!isBuilt.value || !isArtifactMode.value && !canExecuteAgent.value || chatModeBusy.value) return false;
			const request = ++previewRequest;
			const target = expectedTarget ?? {
				projectId: projectId.value,
				agentId: agentId.value
			};
			try {
				await flushAutosave();
			} catch {
				return false;
			}
			if (isArtifactMode.value) {
				if (expectedTarget && isStaleAgentTarget(expectedTarget.projectId, expectedTarget.agentId)) return false;
			} else if (request !== previewRequest || isStaleAgentTarget(target.projectId, target.agentId) || !isBuilt.value || !canExecuteAgent.value || chatModeBusy.value) return false;
			if (isArtifactMode.value) openArtifactPreview();
			else await openPreview();
			telemetry.track(TELEMETRY_EVENT.AGENTS.USER_OPENED_AGENT_PREVIEW, {
				agent_id: agentId.value,
				...source ? { source } : {}
			});
			return true;
		}
		async function onPreviewTask(instructions) {
			const target = {
				projectId: projectId.value,
				agentId: agentId.value
			};
			if (!await onOpenPreview(void 0, target)) return;
			taskPreviewPrompt.value = void 0;
			await nextTick();
			if (isStaleAgentTarget(target.projectId, target.agentId)) return;
			taskPreviewPrompt.value = instructions;
		}
		function getBuilderQuery() {
			const query = { ...route.query };
			delete query[CONTINUE_SESSION_ID_PARAM];
			delete query[NEW_SESSION_PARAM];
			delete query[OPEN_PREVIEW_PARAM];
			delete query.prompt;
			return query;
		}
		function closePreviewRoute() {
			router.push({
				name: AGENT_BUILDER_VIEW,
				params: {
					projectId: projectId.value,
					agentId: agentId.value
				},
				query: getBuilderQuery()
			});
		}
		function returnToBuilderFromPreview() {
			router.push(agentBuilderHref.value);
		}
		function closePreviewDock() {
			previewRequest++;
			persistedPreviewOpen.value = false;
			showConfiguration.value = false;
			if (!isArtifactMode.value) closePreviewRoute();
		}
		function onPreviewDockResize({ width }) {
			preferredSidePanel.value = "preview";
			previewDockWidth.value = width;
		}
		function onPublished(updated) {
			agent.value = updated;
			versionHistoryPanel.value?.refresh();
		}
		function onUnpublished(updated) {
			agent.value = updated;
			versionHistoryPanel.value?.refresh();
		}
		function onOpenVersionHistory(tab = "versions") {
			if (!agent.value || isUnsaved.value) return;
			versionHistoryTab.value = tab;
			isVersionHistoryOpen.value = true;
		}
		function onCloseVersionHistory() {
			isVersionHistoryOpen.value = false;
		}
		async function onReverted(updated) {
			agent.value = updated;
			agentName.value = updated.name;
			await Promise.all([fetchConfig(projectId.value, agentId.value), refreshConfigValidation(projectId.value, agentId.value)]);
			tasksReloadKey.value += 1;
		}
		/**
		* Pick the session the preview chat should bind to when no explicit one has been
		* chosen yet. Resume the latest private chat after the Preview list loads.
		*/
		function bindPreviewSession() {
			if (effectiveSessionId.value || previewSessionsLoading.value) return;
			selectLatestPreviewSession();
		}
		function selectLatestPreviewSession() {
			const latest = previewThreads.value[0];
			if (latest) {
				setSessionInUrl(latest.id);
				return;
			}
			onNewChat();
		}
		const persistFlights = /* @__PURE__ */ new Map();
		const persistedAgentsByTarget = /* @__PURE__ */ new Map();
		function clearRoutePendingState(targetAgentId) {
			if (isArtifactMode.value) return;
			unsavedAgentIds.delete(targetAgentId);
			if (routePendingAgentId.value === targetAgentId) routePendingAgentId.value = null;
			const historyState = history.state;
			if (historyState["instanceAiPendingAgentId"] !== targetAgentId) return;
			const { [PENDING_AGENT_ID_STATE]: _, ...state } = historyState;
			history.replaceState(state, "");
		}
		/**
		* The agent row behind a pending artifact, or null when it genuinely does not
		* exist yet — a 404 is the ordinary answer for a new-agent draft. Anything else
		* is propagated: guessing "absent" on an unclear failure risks drafting over a
		* real agent. The resource is returned rather than a boolean so the hydration
		* below doesn't read the same agent twice.
		*/
		async function probePendingAgentRow(targetProjectId, targetAgentId) {
			try {
				return await getAgent(rootStore.restApiContext, targetProjectId, targetAgentId);
			} catch (error) {
				if (isNotFoundError(error)) return null;
				throw error;
			}
		}
		/**
		* Agent whose row exists but whose host binding has not landed yet, so the next
		* mutation retries it. Not a reason to keep drafting: the row is real and
		* hydrated, and re-showing a blank draft over it is what the probe exists to
		* prevent.
		*/
		const unboundExistingAgent = ref(null);
		/**
		* Retire a stale pending marker whose agent row turned out to exist. Takes the
		* probed row rather than reading `agent.value`, which a stale target switch can
		* leave pointing at a different agent.
		*/
		async function adoptExistingPendingRow(existing) {
			if (!props.artifactPersistAgent) return;
			const ownsRetryState = () => existing.id === agentId.value;
			try {
				await props.artifactPersistAgent({
					projectId: existing.projectId,
					agentId: existing.id,
					name: existing.name
				});
				if (ownsRetryState()) unboundExistingAgent.value = null;
			} catch (error) {
				if (ownsRetryState()) unboundExistingAgent.value = existing;
				console.warn("Failed to bind an existing agent to its artifact", error);
			}
		}
		/** Retry a binding that failed after the probe, before the write it precedes. */
		async function retryPendingBind() {
			const existing = unboundExistingAgent.value;
			if (!existing || existing.id !== agentId.value) return;
			await adoptExistingPendingRow(existing);
		}
		async function createPendingAgent(targetProjectId, targetAgentId, name, initialConfig) {
			const request = {
				projectId: targetProjectId,
				agentId: targetAgentId,
				name,
				...typeof route.query.folderId === "string" ? { parentFolderId: route.query.folderId } : {},
				config: initialConfig
			};
			if (props.artifactPersistAgent) return await props.artifactPersistAgent(request);
			try {
				return await createAgent(rootStore.restApiContext, targetProjectId, name, {
					id: targetAgentId,
					parentFolderId: request.parentFolderId,
					config: initialConfig
				});
			} catch (error) {
				const lostInsert = error instanceof ResponseError && error.httpStatusCode === 409;
				if (!aiThreadId.value || !lostInsert) throw error;
				const existing = await getAgent(rootStore.restApiContext, targetProjectId, targetAgentId);
				if (request.parentFolderId && existing.parentFolderId !== request.parentFolderId) {
					await moveAgent(rootStore.restApiContext, targetProjectId, targetAgentId, request.parentFolderId);
					existing.parentFolderId = request.parentFolderId;
				}
				return {
					...existing,
					config: null,
					configHash: null,
					adopted: true
				};
			}
		}
		function applyPersistedAgent(targetProjectId, targetAgentId, saved) {
			clearRoutePendingState(targetAgentId);
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			isUnsaved.value = false;
			agent.value = saved.agent;
			if (!saved.agent.adopted) acceptCreation(targetProjectId, targetAgentId, saved.agent);
		}
		async function persistAgent(snapshot) {
			const targetProjectId = snapshot?.projectId ?? projectId.value;
			const targetAgentId = snapshot?.agentId ?? agentId.value;
			await retryPendingBind();
			if (!isUnsaved.value && !isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			if (snapshot?.baseConfigHash !== void 0) return;
			const targetKey = `${targetProjectId}:${targetAgentId}`;
			const persisted = persistedAgentsByTarget.get(targetKey);
			if (persisted) {
				applyPersistedAgent(targetProjectId, targetAgentId, persisted);
				return persisted;
			}
			let flight = persistFlights.get(targetKey);
			if (!flight) {
				flight = (async () => {
					const initialConfig = snapshot?.config;
					const name = initialConfig?.name ?? localConfig.value?.name ?? locale.baseText("agents.new.defaultName");
					const created = await createPendingAgent(targetProjectId, targetAgentId, name, initialConfig);
					const saved = {
						agent: created,
						configRevision: snapshot?.revision
					};
					persistedAgentsByTarget.set(targetKey, saved);
					upsertProjectAgentsListCache(targetProjectId, created);
					applyPersistedAgent(targetProjectId, targetAgentId, saved);
					return saved;
				})();
				persistFlights.set(targetKey, flight);
			}
			try {
				return await flight;
			} finally {
				if (persistFlights.get(targetKey) === flight) persistFlights.delete(targetKey);
			}
		}
		async function ensureAgentPersisted() {
			await persistAgent();
		}
		async function handleAutosaveConflict(snapshot) {
			if (!isStaleAgentTarget(snapshot.projectId, snapshot.agentId)) {
				await onConfigUpdated();
				if (!isStaleAgentTarget(snapshot.projectId, snapshot.agentId)) showMessage({
					title: locale.baseText("agents.builder.remoteChange.title"),
					message: locale.baseText("agents.builder.remoteChange.message"),
					type: "warning"
				});
			}
			return "stale";
		}
		async function persistConfigSnapshot(snapshot) {
			const creation = await persistAgent(snapshot);
			const persisted = creation ?? persistedAgentsByTarget.get(`${snapshot.projectId}:${snapshot.agentId}`);
			if (persisted?.agent.adopted && snapshot.baseConfigHash === void 0) return "conflict";
			if (creation?.configRevision === snapshot.revision && creation.agent.config) return {
				config: creation.agent.config,
				versionId: creation.agent.versionId,
				stale: isStaleAgentTarget(snapshot.projectId, snapshot.agentId)
			};
			return await updateConfig(snapshot.projectId, snapshot.agentId, snapshot.config, snapshot.baseConfigHash === void 0 ? persisted?.agent.configHash ?? null : snapshot.baseConfigHash);
		}
		async function saveConfig(snapshot) {
			if (isEditingLocked.value) return "skipped";
			let result;
			try {
				result = await persistConfigSnapshot(snapshot);
			} catch (error) {
				if (!(error instanceof ResponseError) || error.httpStatusCode !== 409) throw error;
				result = "conflict";
			}
			if (result === "conflict") {
				configAutosave.reset();
				return await handleAutosaveConflict(snapshot);
			}
			return await finishConfigSave(snapshot, result);
		}
		async function finishConfigSave(snapshot, result) {
			agentsEventBus.emit("agentUpdated", {
				agentId: snapshot.agentId,
				source: "agent-builder"
			});
			if (result.stale) return void 0;
			if (snapshot.revision === configEditRevision) config.value = result.config;
			if (localConfig.value?.name === snapshot.config.name) emit("name-saved", result.config.name);
			if (agent.value && agent.value.id === snapshot.agentId && result.versionId !== void 0) agent.value = {
				...agent.value,
				versionId: result.versionId
			};
			try {
				await Promise.all([fetchAgent(snapshot.projectId, snapshot.agentId), refreshConfigValidation(snapshot.projectId, snapshot.agentId)]);
			} catch (error) {
				console.error(error);
			}
			if (isStaleAgentTarget(snapshot.projectId, snapshot.agentId)) return "outdated";
			if (snapshot.revision !== configEditRevision) {
				invalidateConfigValidation();
				return "outdated";
			}
		}
		async function saveSkill(snapshot) {
			if (isEditingLocked.value) return "skipped";
			await ensureAgentPersisted();
			let result;
			try {
				result = await updateAgentSkill(rootStore.restApiContext, snapshot.projectId, snapshot.agentId, snapshot.skillId, snapshot.skill, snapshot.baseSkillHash, snapshot.availableTo);
			} catch (error) {
				if (error instanceof ResponseError && error.httpStatusCode === 409) {
					skillAutosave.reset();
					return await handleAutosaveConflict(snapshot);
				}
				throw error;
			}
			agentsEventBus.emit("agentUpdated", {
				agentId: snapshot.agentId,
				source: "agent-builder"
			});
			if (agent.value?.id !== snapshot.agentId) return void 0;
			const versions = agent.value.skillVersions?.[snapshot.skillId];
			const savedNewVersion = !!versions && agent.value.skillHashes?.[snapshot.skillId] !== result.skillHash;
			agent.value = {
				...agent.value,
				versionId: result.versionId,
				...versions && savedNewVersion ? { skillVersions: {
					...agent.value.skillVersions,
					[snapshot.skillId]: {
						...versions,
						latest: versions.latest + 1,
						draft: versions.pinned ? versions.draft : versions.latest + 1
					}
				} } : {},
				skillHashes: {
					...agent.value.skillHashes ?? {},
					[snapshot.skillId]: result.skillHash
				},
				skills: {
					...agent.value.skills ?? {},
					[snapshot.skillId]: result.skill
				}
			};
			await refreshConfigValidation(snapshot.projectId, snapshot.agentId);
		}
		const configAutosave = useAgentConfigAutosave({
			save: saveConfig,
			onError: (error) => {
				showError(error, locale.baseText("agents.builder.saveError"));
			}
		});
		const skillAutosave = useAgentConfigAutosave({
			save: saveSkill,
			onSaved: (snapshot) => {
				telemetry.track(TELEMETRY_EVENT.AGENTS.USER_SAVED_AGENT_SKILL, {
					agent_id: snapshot.agentId,
					skill_id: snapshot.skillId
				});
			},
			onError: (error) => {
				showError(error, locale.baseText("agents.builder.skills.saveError"));
			}
		});
		const mcpAvailabilityOverride = ref(null);
		const agentAvailableInMcp = computed(() => mcpAvailabilityOverride.value ?? agent.value?.availableInMCP ?? false);
		async function saveMcpAvailability(snapshot) {
			if (isEditingLocked.value) return "skipped";
			await ensureAgentPersisted();
			await mcpStore.toggleAgentMcpAccess(snapshot.agentId, snapshot.enabled);
			if (snapshot.enabled) mcp.trackMcpAccessEnabledForAgent(snapshot.agentId);
			if (isStaleAgentTarget(snapshot.projectId, snapshot.agentId)) return void 0;
			if (agent.value?.id === snapshot.agentId) agent.value = {
				...agent.value,
				availableInMCP: snapshot.enabled
			};
			if (mcpAvailabilityOverride.value === snapshot.enabled) mcpAvailabilityOverride.value = null;
		}
		const mcpAutosave = useAgentConfigAutosave({
			save: saveMcpAvailability,
			onError: (error) => {
				mcpAvailabilityOverride.value = null;
				showError(error, locale.baseText("agents.toggleMCP.error.title"));
			}
		});
		function onToggleMcpAccess(enabled) {
			if (!agent.value) return;
			agentCollaborationStore.requestWriteAccess();
			mcpAvailabilityOverride.value = enabled;
			mcpAutosave.scheduleAutosave({
				type: "mcp",
				projectId: projectId.value,
				agentId: agentId.value,
				enabled
			});
		}
		const saveStatus = computed(() => {
			const statuses = [
				configAutosave.saveStatus.value,
				skillAutosave.saveStatus.value,
				mcpAutosave.saveStatus.value
			];
			if (statuses.includes("saving")) return "saving";
			if (statuses.includes("saved")) return "saved";
			return "idle";
		});
		async function settleAutosave() {
			await Promise.all([
				configAutosave.settleAutosave(),
				skillAutosave.settleAutosave(),
				mcpAutosave.settleAutosave()
			]);
		}
		/** Acquire the write lock, then settle pending autosaves before a
		* revert-to-published. The lock is lazy — acquired on first mutating
		* action, released on inactivity — matching the workflow pattern. */
		async function beforeRevertToPublished() {
			agentCollaborationStore.requestWriteAccess();
			await settleAutosave();
		}
		function cancelQueuedAutosaves() {
			configAutosave.cancelPendingAutosave();
			skillAutosave.cancelPendingAutosave();
			mcpAutosave.cancelPendingAutosave();
		}
		/**
		* Flushes every autosave loop. The result is the config save.
		* Set `isolateSideSaveErrors` so a skill or MCP failure does not change it.
		* Leave it unset when a failure must reject, so a route change can retry the edit.
		*/
		async function flushAutosaveLoops(isolateSideSaveErrors = false) {
			if (isEditingLocked.value) {
				cancelQueuedAutosaves();
				return "skipped";
			}
			const sideFlush = (flush) => isolateSideSaveErrors ? flush.then(() => void 0, () => void 0) : flush;
			const [configResult] = await Promise.all([
				configAutosave.flushAutosave(),
				sideFlush(skillAutosave.flushAutosave()),
				sideFlush(mcpAutosave.flushAutosave())
			]);
			return configResult;
		}
		const runConfigWrite = async (write) => {
			if (!isEditingLocked.value) await flushAutosaveLoops();
			configWriteInFlight.value = true;
			try {
				return await write();
			} finally {
				try {
					await onConfigUpdated();
				} catch (error) {
					handleArtifactRefreshError(error);
				} finally {
					configWriteInFlight.value = false;
				}
			}
		};
		provide(AGENT_CONFIG_WRITE_KEY, runConfigWrite);
		async function flushAutosave() {
			return await flushAutosaveLoops();
		}
		/**
		* Config outcome only. Skill and MCP saves still run. Their failures do not
		* change the result: a persisted cap must clear its budget stop. A later save
		* of that same cap would not try again.
		*/
		async function flushConfigAutosave() {
			return await flushAutosaveLoops(true);
		}
		/** Flush variant for callers that await completion but not the save outcome. */
		async function flushAutosaveIgnoringResult() {
			await flushAutosave();
		}
		/** The embedded assistant waits to mint its thread until a list-view starter is applied. */
		async function beforeAiNewThread() {
			await starterReady?.promise;
			await flushAutosaveIgnoringResult();
		}
		useEventListener(document, "keydown", (event) => {
			if (!isCtrlKeyPressed(event) || event.key.toLowerCase() !== "s") return;
			event.preventDefault();
			flushAutosave().catch(() => {});
		});
		async function flushPendingRouteDraftBeforeNavigation() {
			if (!isRouteAgentPending.value || !isUnsaved.value) return;
			await flushAutosave();
		}
		onBeforeRouteLeave(flushPendingRouteDraftBeforeNavigation);
		onBeforeRouteUpdate(async (to) => {
			const nextProjectId = Array.isArray(to.params.projectId) ? to.params.projectId[0] : to.params.projectId;
			const nextAgentId = Array.isArray(to.params.agentId) ? to.params.agentId[0] : to.params.agentId;
			if (nextProjectId === projectId.value && nextAgentId === agentId.value) return;
			if (isRouteAgentPending.value) {
				await flushPendingRouteDraftBeforeNavigation();
				return;
			}
			await flushAutosave();
		});
		async function beforePreviewSend() {
			await flushAutosave();
			try {
				await ensureAgentPersisted();
			} catch (error) {
				showError(error, locale.baseText("agents.builder.preview.sendError"));
				throw error;
			}
		}
		/**
		* Raises a budget cap from a preview notice card. The card stays up (and
		* keeps blocking Send) until the new cap is persisted: a failed save must
		* not unblock the next run against the old cap. Offered only while the user
		* can edit the agent.
		*/
		async function onPreviewIncreaseBudget(payload) {
			if (!localConfig.value || !effectiveCanEditAgent.value) return false;
			const update = increasedBudgetConfig(localConfig.value, payload.field, payload.amount);
			if (!update) return false;
			onConfigFieldUpdate(update);
			try {
				return isPersistedSave(await flushConfigAutosave());
			} catch {
				return false;
			}
		}
		/**
		* Budget settings modal save. When the save persists a raised or removed cap,
		* clear the matching stop cards in the preview chat so Send unblocks — the
		* card's own increase flow is not the only way out of a stop.
		*/
		async function onBudgetSettingsSave(updates) {
			const before = localConfig.value?.config?.guardrails?.budget;
			onConfigFieldUpdate(updates);
			const after = localConfig.value?.config?.guardrails?.budget;
			const clearedFields = raisedBudgetCaps(before, after);
			if (clearedFields.length === 0) return;
			const target = {
				projectId: projectId.value,
				agentId: agentId.value,
				sessionId: effectiveSessionId.value
			};
			try {
				if (!isPersistedSave(await flushConfigAutosave())) return;
			} catch {
				return;
			}
			if (target.projectId !== projectId.value || target.agentId !== agentId.value || target.sessionId !== effectiveSessionId.value) return;
			clearPreviewBudgetStops(clearedFields);
		}
		function clearPreviewBudgetStops(fields) {
			previewChatPage.value?.clearBudgetStops(fields);
			previewDock.value?.clearBudgetStops(fields);
		}
		watch(isEditingLocked, (locked) => {
			if (!locked) return;
			cancelQueuedAutosaves();
			mcpAvailabilityOverride.value = null;
		});
		async function flushBeforePublish() {
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			agentCollaborationStore.requestWriteAccess();
			try {
				let result = await flushAutosave();
				if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
				if (result === "skipped" && !isEditingLocked.value && localConfig.value) {
					replaceConfigAndScheduleSave(localConfig.value);
					result = await flushAutosave();
				}
				return isPersistedSave(result) && !isStaleAgentTarget(targetProjectId, targetAgentId);
			} catch {
				return false;
			}
		}
		/** Save current edits, then check whether the current draft can be published. */
		async function refreshValidationBeforePublish() {
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			if (!await flushBeforePublish()) return false;
			await refreshConfigValidation(targetProjectId, targetAgentId);
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
			if (configValidation.value === null) return false;
			if (hasBlockingIssues(configValidation.value.issues)) return false;
			const unpublishedWorkflows = unpublishedWorkflowTools(configValidation.value.issues, localConfig.value?.tools ?? []);
			if (unpublishedWorkflows.length > 0) {
				uiStore.openModalWithData({
					name: AGENT_UNPUBLISHED_WORKFLOWS_MODAL_KEY,
					data: { workflows: unpublishedWorkflows }
				});
				return false;
			}
			return true;
		}
		function normalizeAgentMemoryConfig(config) {
			return {
				...config,
				memory: {
					...config.memory,
					enabled: true,
					storage: "n8n"
				}
			};
		}
		function onConfigFieldUpdate(updates, meta) {
			if (!localConfig.value) return;
			markConfigDraftEdited();
			agentCollaborationStore.requestWriteAccess();
			invalidateConfigValidation();
			Object.assign(localConfig.value, updates);
			if (updates.name !== void 0) syncAgentIdentityFromConfig(localConfig.value);
			if (meta?.source === "auto" && isUnsaved.value && !configAutosave.hasPendingSave.value) return;
			configAutosave.scheduleAutosave({
				projectId: projectId.value,
				agentId: agentId.value,
				type: "config",
				config: normalizeAgentMemoryConfig(copyAgentConfig(localConfig.value)),
				revision: configEditRevision,
				baseConfigHash: configHash.value
			});
		}
		const caps = useAgentCapabilitiesActions({
			localConfig,
			agent,
			projectId,
			agentId,
			connectedTriggers,
			ensureAgentPersisted,
			flushConfigSave: flushConfigAutosave,
			flushSkillSave: skillAutosave.flushAutosave,
			beforeAgentMutation: flushAutosaveIgnoringResult,
			refreshAgentAfterMutation: onConfigUpdated,
			validationIssues: computed(() => configValidation.value?.issues ?? []),
			scheduleConfigUpdate: onConfigFieldUpdate,
			scheduleSkillSave: ({ skillId, skill, availableTo }) => {
				agentCollaborationStore.requestWriteAccess();
				invalidateConfigValidation();
				skillAutosave.scheduleAutosave({
					type: "skill",
					projectId: projectId.value,
					agentId: agentId.value,
					skillId,
					skill,
					baseSkillHash: agent.value?.skillHashes?.[skillId],
					...availableTo ? { availableTo } : {}
				});
			},
			telemetry: {
				trackOpenedToolFromList: builderTelemetry.trackOpenedToolFromList,
				trackOpenedSkillFromList: builderTelemetry.trackOpenedSkillFromList,
				trackOpenedAddSkillModal: builderTelemetry.trackOpenedAddSkillModal,
				trackTriggerAdded: builderTelemetry.trackTriggerAdded,
				trackTriggerRemoved: builderTelemetry.trackTriggerRemoved
			}
		});
		const appliedSkills = caps.appliedSkills;
		function replaceConfigAndScheduleSave(nextConfig) {
			markConfigDraftEdited();
			invalidateConfigValidation();
			localConfig.value = copyAgentConfig(nextConfig);
			syncAgentIdentityFromConfig(localConfig.value);
			configAutosave.scheduleAutosave({
				projectId: projectId.value,
				agentId: agentId.value,
				type: "config",
				config: normalizeAgentMemoryConfig(copyAgentConfig(localConfig.value)),
				revision: configEditRevision,
				baseConfigHash: configHash.value
			});
		}
		function templateStarterMessage(template) {
			return {
				message: locale.baseText("agents.builder.templates.prompt", { interpolate: {
					name: locale.baseText(template.labelKey),
					description: locale.baseText(template.descriptionKey)
				} }),
				authorship: {
					kind: "prefill",
					prefillType: "template_adjustment",
					prefillId: template.id
				}
			};
		}
		async function applyTemplateConfig(template) {
			if (!localConfig.value) return false;
			const next = applyAgentTemplate(localConfig.value, template, locale.baseText("agents.new.defaultName"));
			if (!next) {
				showMessage({
					title: locale.baseText("agents.builder.templates.notBlank.title"),
					message: locale.baseText("agents.builder.templates.notBlank.message"),
					type: "warning"
				});
				return false;
			}
			replaceConfigAndScheduleSave(next);
			connectedTriggers.value = (next.integrations ?? []).map((i) => i.type);
			templateApplied.value = true;
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			try {
				await flushAutosave();
			} catch {}
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
			if (template.tasks?.length) {
				let tasksCreated = false;
				try {
					await ensureAgentPersisted();
					for (const task of template.tasks) {
						if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
						await createAgentTask(rootStore.restApiContext, targetProjectId, targetAgentId, {
							...task,
							enabled: true
						});
						tasksCreated = true;
					}
				} catch (error) {
					if (!isStaleAgentTarget(targetProjectId, targetAgentId)) showError(error, locale.baseText("agents.builder.tasks.saveError"));
				}
				if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
				if (tasksCreated) {
					if (!await refreshConfigAfterTemplateTasks(targetProjectId, targetAgentId) || isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
				}
			}
			return !isStaleAgentTarget(targetProjectId, targetAgentId);
		}
		async function settlePendingStarter() {
			const gate = starterReady;
			starterInFlight = true;
			try {
				const starter = currentStarter();
				if (!starter) return;
				if (starter.kind === "prompt") {
					const text = starter.text.trim();
					if (text) pendingStarterMessage.value = {
						message: text,
						authorship: USER_TYPED_MESSAGE
					};
					return;
				}
				const template = AGENT_TEMPLATES.find((entry) => entry.id === starter.templateId);
				if (!template) return;
				if (await applyTemplateConfig(template)) pendingStarterMessage.value = templateStarterMessage(template);
			} finally {
				starterInFlight = false;
				if (starterReady === gate) settleStarter();
			}
		}
		async function onApplyTemplate(template) {
			if (!await applyTemplateConfig(template)) return;
			const templateIndex = AGENT_TEMPLATES.findIndex((entry) => entry.id === template.id);
			aiPanelRef.value?.submitSuggestion({
				prompt: templateStarterMessage(template).message,
				suggestionId: template.id,
				suggestionKind: "prompt",
				position: templateIndex >= 0 ? templateIndex + 1 : 0,
				suggestionCatalogVersion: AGENT_TEMPLATE_SUGGESTIONS_VERSION,
				prefillType: "template_adjustment"
			});
		}
		/** Reload the config after task creation. One retry, then stop. */
		async function refreshConfigAfterTemplateTasks(targetProjectId, targetAgentId) {
			let lastError;
			for (let attempt = 0; attempt < 2; attempt += 1) {
				if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
				try {
					await onConfigUpdated();
					return !isStaleAgentTarget(targetProjectId, targetAgentId);
				} catch (error) {
					lastError = error;
				}
			}
			if (!isStaleAgentTarget(targetProjectId, targetAgentId)) showError(lastError, locale.baseText("agents.builder.tasks.saveError"));
			return false;
		}
		function persistMissingPersonalisationGradient() {
			if (!effectiveCanEditAgent.value) return;
			if (!localConfig.value) return;
			const nextConfig = addMissingAgentPersonalisation(localConfig.value);
			if (!nextConfig) return;
			replaceConfigAndScheduleSave(nextConfig);
		}
		async function onConfigUpdated(targetProjectId = projectId.value, targetAgentId = agentId.value) {
			agentsEventBus.emit("agentUpdated", {
				agentId: targetAgentId,
				source: "agent-builder"
			});
			await Promise.all([
				fetchAgent(targetProjectId, targetAgentId),
				fetchConfig(targetProjectId, targetAgentId),
				refreshConfigValidation(targetProjectId, targetAgentId)
			]);
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
			const integrations = await ensureIntegrationsCatalog(targetProjectId).catch(() => []);
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
			const triggerTypes = withN8nChat(integrations).map((i) => i.type);
			const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return false;
			if (connected) connectedTriggers.value = connected;
			tasksReloadKey.value += 1;
			return true;
		}
		async function refreshArtifactShell() {
			await settleAutosave();
			await onConfigUpdated();
		}
		function handleArtifactRefreshError(error) {
			showError(error, locale.baseText("agents.builder.loadError"));
		}
		/**
		* The assistant can build a route-pending agent under the id this view minted.
		* Once the refetch above confirms the row exists, treat it as persisted the same
		* way `ensureAgentPersisted` does, so a reload never re-enters pending mode.
		*/
		function onAgentUpdateRefreshed(source) {
			if (source !== "instance-ai") return;
			if (!isRouteAgentPending.value || !isUnsaved.value || !agent.value) return;
			isUnsaved.value = false;
			clearRoutePendingState(agentId.value);
		}
		let externalRefreshTimer;
		let externalUpdateTimer;
		let externalUpdateAgeTimer;
		let externalUpdateAt = 0;
		const recentExternalUpdate = ref(null);
		const externalUpdateAgeMinutes = ref(0);
		const externalUpdateTime = computed(() => locale.baseText("agents.builder.externalUpdate.time", {
			adjustToNumber: externalUpdateAgeMinutes.value,
			interpolate: { count: externalUpdateAgeMinutes.value }
		}));
		const externalUpdateMessage = computed(() => locale.baseText("agents.builder.externalUpdate.mcp", { interpolate: { time: externalUpdateTime.value } }));
		function clearExternalUpdate() {
			clearTimeout(externalUpdateTimer);
			clearInterval(externalUpdateAgeTimer);
			externalUpdateAt = 0;
			externalUpdateAgeMinutes.value = 0;
			recentExternalUpdate.value = null;
		}
		watch([projectId, agentId], clearExternalUpdate);
		const canApplyPushedAgentUpdate = computed(() => !isEditingLocked.value && !configAutosave.hasPendingSave.value && !skillAutosave.hasPendingSave.value && !mcpAutosave.hasPendingSave.value);
		/**
		* Refetch, then run the "mark pending agent persisted" continuation — but only
		* against the agent the refresh was scheduled for. Both the timer callback and
		* the idle replay below capture their target up front and race an `await`, so
		* a target switch in between must not let A's refresh mark pending agent B
		* persisted.
		*/
		async function refreshAndMarkUpdated(targetProjectId, targetAgentId, source) {
			await refreshArtifactShell();
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			onAgentUpdateRefreshed(source);
		}
		function scheduleExternalRefresh(onlyWhenIdle = false, source) {
			clearTimeout(externalRefreshTimer);
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			externalRefreshTimer = setTimeout(() => {
				if (onlyWhenIdle && !canApplyPushedAgentUpdate.value) {
					pendingExternalRefresh.value = true;
					pendingExternalRefreshSource = source;
					return;
				}
				refreshAndMarkUpdated(targetProjectId, targetAgentId, source).catch(handleArtifactRefreshError);
			}, getDebounceTime(400));
		}
		watch(canApplyPushedAgentUpdate, (idle) => {
			if (idle && initialized.value) replayPendingExternalRefresh().catch(handleArtifactRefreshError);
		});
		function onExternalAgentUpdated(event) {
			if (event?.source === "agent-builder") return;
			if (!event?.agentId || event.agentId !== agentId.value) return;
			if (!initialized.value) {
				pendingExternalRefresh.value = true;
				pendingExternalRefreshSource = event.source;
				return;
			}
			scheduleExternalRefresh(event.source === "push", event.source);
		}
		function onAgentPushMessage(event) {
			if (event.type !== "agentUpdated" || event.data.projectId !== projectId.value || event.data.agentId !== agentId.value) return;
			if (event.data.source === "mcp") {
				clearExternalUpdate();
				recentExternalUpdate.value = event.data;
				externalUpdateAt = Date.now();
				externalUpdateTimer = setTimeout(clearExternalUpdate, AGENT_EXTERNAL_UPDATE_NOTICE_DURATION);
				externalUpdateAgeTimer = setInterval(() => {
					externalUpdateAgeMinutes.value = Math.floor((Date.now() - externalUpdateAt) / TIME.MINUTE);
				}, TIME.MINUTE);
			}
			onExternalAgentUpdated({
				agentId: event.data.agentId,
				source: "push"
			});
		}
		async function replayPendingExternalRefresh() {
			if (!pendingExternalRefresh.value) return;
			pendingExternalRefresh.value = false;
			const source = pendingExternalRefreshSource;
			pendingExternalRefreshSource = void 0;
			await refreshAndMarkUpdated(projectId.value, agentId.value, source);
		}
		agentsEventBus.on("agentUpdated", onExternalAgentUpdated);
		pushConnectionStore.pushConnect();
		const removeAgentUpdateListener = pushConnectionStore.addEventListener(onAgentPushMessage);
		watch([
			() => agentEvalsStore.pendingEvalsFocus,
			agentId,
			mainTabOptions,
			initialized,
			isUnsaved
		], () => {
			if (!agentEvalsStore.pendingEvalsFocus) return;
			if (!initialized.value || isUnsaved.value) return;
			if (!mainTabOptions.value.some((option) => option.value === "evals")) return;
			const request = agentEvalsStore.consumeEvalsFocus(agentId.value);
			if (!request) return;
			activeMainTab.value = "evals";
			if (request.generate) onGenerateEvalCases();
		}, { immediate: true });
		const folderMoveAction = ref(null);
		const headerActions = computed(() => {
			const actions = [];
			if (agent.value && !isUnsaved.value && effectiveCanEditAgent.value && settingsStore.isFoldersFeatureEnabled) actions.push({
				id: "move-folder",
				label: locale.baseText("agents.folders.move"),
				icon: "folder"
			});
			if (effectiveCanEditAgent.value) actions.push({
				id: "edit-description",
				label: locale.baseText("agents.builder.editDescription"),
				icon: "tags"
			});
			if (agent.value) actions.push({
				id: "toggleFavorite",
				label: isFavorite.value === true ? locale.baseText("favorites.remove") : locale.baseText("favorites.add"),
				icon: isFavorite.value === true ? "star-filled" : "star"
			});
			actions.push({
				id: "export-json",
				label: locale.baseText("agents.builder.exportJson"),
				icon: "arrow-block-up",
				divided: actions.length > 0
			});
			if (effectiveCanEditAgent.value) actions.push({
				id: "import-json",
				label: locale.baseText("agents.builder.importJson"),
				icon: "arrow-block-down"
			});
			actions.push({
				id: "version-history",
				label: locale.baseText("menuActions.versionHistory"),
				icon: "history",
				disabled: !agent.value || isUnsaved.value,
				divided: true
			});
			return [...actions, ...archiveHeaderActions.value];
		});
		const archiveHeaderActions = computed(() => {
			if (!canDeleteAgent.value || isUnsaved.value) return [];
			if (!isAgentArchived.value) return [{
				id: "archive",
				label: locale.baseText("menuActions.archive"),
				icon: "archive",
				divided: true
			}];
			return [{
				id: "unarchive",
				label: locale.baseText("menuActions.unarchive"),
				icon: "archive-restore",
				divided: true
			}, {
				id: "delete",
				label: locale.baseText("agents.builder.deleteAgent"),
				icon: "trash-2"
			}];
		});
		async function onArchiveAgent() {
			const target = agent.value;
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			if (!target) return;
			if (!isEditingLocked.value && !await flushBeforePublish()) return;
			if (isStaleAgentTarget(targetProjectId, targetAgentId)) return;
			const updated = await archive(target);
			if (updated && !isStaleAgentTarget(targetProjectId, targetAgentId)) onUnpublished(updated);
		}
		async function onUnarchiveAgent() {
			const target = agent.value;
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			if (!target) return;
			const updated = await unarchive(target);
			if (updated && !isStaleAgentTarget(targetProjectId, targetAgentId)) onUnpublished(updated);
		}
		async function exportAgentJson() {
			if (!localConfig.value) return;
			try {
				await flushAutosave();
			} catch {
				return;
			}
			if (!localConfig.value) return;
			const blob = new Blob([`${JSON.stringify(localConfig.value, null, 2)}\n`], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const name = localConfig.value.name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "agent";
			const link = Object.assign(document.createElement("a"), {
				href: url,
				download: `${name}.json`
			});
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
		}
		function openImportJsonModal() {
			if (!effectiveCanEditAgent.value) return;
			uiStore.openModalWithData({
				name: AGENT_JSON_IMPORT_MODAL_KEY,
				data: { onConfirm: replaceConfigAndScheduleSave }
			});
		}
		function openDescriptionModal() {
			if (!localConfig.value) return;
			const targetAgentId = agentId.value;
			uiStore.openModalWithData({
				name: AGENT_DESCRIPTION_MODAL_KEY,
				data: {
					agentName: localConfig.value.name,
					description: localConfig.value.description ?? "",
					onConfirm: (description) => {
						if (agentId.value !== targetAgentId) return;
						onConfigFieldUpdate({ description });
					}
				}
			});
		}
		/**
		* Saves through the same path as `openDescriptionModal`. The channel modal
		* connects n8n Chat once this resolves, so the save must land first: a config
		* save that lands later would carry `integrations` without n8n Chat.
		*/
		async function saveN8nChatDescription(description) {
			const targetAgentId = agentId.value;
			if (description !== (localConfig.value?.description ?? "")) onConfigFieldUpdate({ description });
			if (!isEditingLocked.value) await configAutosave.flushAutosave();
			if (agentId.value !== targetAgentId || isEditingLocked.value || (localConfig.value?.description ?? "") !== description) throw new Error(locale.baseText("agents.channels.n8nChat.description.saveError"));
		}
		async function onHeaderAction(action) {
			if (action === "move-folder") {
				if (isUnsaved.value) return;
				folderMoveAction.value = {
					mode: "moveAgent",
					id: agentId.value,
					name: agent.value?.name,
					parentFolderId: agent.value?.parentFolderId
				};
				return;
			}
			if (action === "edit-description") {
				openDescriptionModal();
				return;
			}
			if (action === "version-history") {
				onOpenVersionHistory();
				return;
			}
			if (action === "export-json") {
				await exportAgentJson();
				return;
			}
			if (action === "import-json") {
				openImportJsonModal();
				return;
			}
			if (action === "toggleFavorite") {
				await favoritesStore.toggleFavorite(agentId.value, "agent");
				return;
			}
			if (action === "archive") {
				await onArchiveAgent();
				return;
			}
			if (action === "unarchive") {
				await onUnarchiveAgent();
				return;
			}
			if (action === "delete") {
				if (await openAgentConfirmationModal({
					title: locale.baseText("agents.delete.modal.title", { interpolate: { name: agentName.value } }),
					description: locale.baseText("agents.delete.modal.description", { interpolate: { name: agentName.value } }),
					isDestructive: true,
					confirmButtonText: locale.baseText("agents.delete.modal.button.delete"),
					cancelButtonText: locale.baseText("generic.cancel")
				}) !== "confirm") return;
				await settleAutosave();
				configAutosave.cancelPendingAutosave();
				skillAutosave.cancelPendingAutosave();
				const capturedProjectId = projectId.value;
				try {
					await deleteAgent(rootStore.restApiContext, capturedProjectId, agentId.value);
					removeProjectAgentFromListCache(capturedProjectId, agentId.value);
					favoritesStore.removeFavoriteLocally(agentId.value, "agent");
				} catch (error) {
					showError(error, "Could not delete agent");
					return;
				}
				agent.value = null;
				localConfig.value = null;
				agentsEventBus.emit("agentUpdated", {
					agentId: agentId.value,
					source: "agent-builder"
				});
				const targetPath = `/projects/${capturedProjectId}/agents`;
				try {
					await router.replace(targetPath);
				} catch {}
				await nextTick();
				if (route.params.agentId) window.location.assign(targetPath);
			}
		}
		/**
		* Stand-in for the resource the create endpoint would have returned, so the
		* editor and its children can treat an unsaved agent like any other freshly
		* created one instead of every consumer having to handle a null agent.
		*/
		function draftAgentResource(personalisation) {
			const now = (/* @__PURE__ */ new Date()).toISOString();
			return {
				resourceType: "agent",
				id: agentId.value,
				name: locale.baseText("agents.new.defaultName"),
				projectId: projectId.value,
				parentFolderId: typeof route.query.folderId === "string" ? route.query.folderId : null,
				project: null,
				isArchived: false,
				availableInMCP: false,
				isRunnable: false,
				hasPublishHistory: false,
				hasVersionHistory: false,
				createdAt: now,
				updatedAt: now,
				versionId: null,
				activeVersionId: null,
				config: personalisation ? {
					name: locale.baseText("agents.new.defaultName"),
					model: "",
					instructions: "",
					personalisation
				} : null,
				configHash: null,
				tools: {},
				skills: {},
				skillHashes: {},
				outdatedSkillIds: [],
				skillVersions: {},
				activeVersion: null
			};
		}
		/**
		* True while a genuine target switch still owes the autosave-loop reset.
		* Set synchronously when a switching `initialize()` begins; cleared only by
		* `resetAutosaveLoops()`, so a same-target preserveState init that supersedes
		* the switching init inherits the obligation instead of dropping it.
		*/
		let autosaveResetPending = false;
		function resetAutosaveLoops() {
			configAutosave.reset();
			skillAutosave.reset();
			mcpAutosave.reset();
			autosaveResetPending = false;
		}
		async function initialize({ preserveState = false } = {}) {
			const sessionsFetchRequestId = ++latestSessionsFetchRequestId;
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			const targetAgentPending = isAgentPending.value;
			const targetArtifactPending = props.artifactAgentPending;
			const isCurrentInitialization = () => !disposed && sessionsFetchRequestId === latestSessionsFetchRequestId;
			clearTimeout(externalRefreshTimer);
			if (!preserveState) {
				initialized.value = false;
				sessionsStore.reset();
			}
			pendingExternalRefresh.value = false;
			try {
				if (preserveState) {
					if (autosaveResetPending) resetAutosaveLoops();
					await flushAutosave();
					await settleAutosave();
				} else {
					autosaveResetPending = true;
					try {
						await Promise.all([
							configAutosave.settleAutosave(),
							skillAutosave.settleAutosave(),
							mcpAutosave.flushAutosave()
						]);
					} finally {
						if (isCurrentInitialization()) resetAutosaveLoops();
					}
				}
				if (!isCurrentInitialization()) return;
				if (!preserveState) {
					agent.value = null;
					agentName.value = "";
					mcpAvailabilityOverride.value = null;
					activeChatSessionId.value = null;
					localConfig.value = null;
					connectedTriggers.value = [];
					resetAgentKnowledge();
					repointConfig(targetProjectId, targetAgentId);
					repointConfigValidation(targetProjectId, targetAgentId);
				}
				const recoveredRouteDraft = targetAgentPending && !targetArtifactPending && !historyMarksAgentPending(targetAgentId);
				const probedAgent = targetArtifactPending || recoveredRouteDraft ? await probePendingAgentRow(targetProjectId, targetAgentId) : null;
				if (!isCurrentInitialization()) return;
				unboundExistingAgent.value = null;
				isUnsaved.value = targetAgentPending && !probedAgent;
				if (isUnsaved.value) {
					const draftConfig = {
						name: locale.baseText("agents.new.defaultName"),
						model: "",
						instructions: "",
						tools: [],
						skills: [],
						...isAgentsN8nChatFlag.value ? { integrations: [{
							type: N8N_CHAT_INTEGRATION_TYPE,
							credentialId: ""
						}] } : {}
					};
					localConfig.value = addMissingAgentPersonalisation(draftConfig) ?? draftConfig;
					connectedTriggers.value = (localConfig.value.integrations ?? []).map(({ type }) => type);
					agent.value = draftAgentResource(localConfig.value.personalisation);
					agentName.value = agent.value.name;
					if (currentStarter() && isCurrentInitialization()) await settlePendingStarter();
				} else {
					await Promise.all([
						fetchAgent(targetProjectId, targetAgentId, probedAgent ?? void 0),
						fetchConfig(targetProjectId, targetAgentId),
						fetchAgentFiles(targetProjectId, targetAgentId),
						refreshConfigValidation(targetProjectId, targetAgentId)
					]);
					if (!isCurrentInitialization()) return;
					persistMissingPersonalisationGradient();
					if (probedAgent) adoptExistingPendingRow(probedAgent);
					if (recoveredRouteDraft) clearRoutePendingState(targetAgentId);
				}
				if (!isCurrentInitialization()) return;
				if (!preserveState && canEditAgent.value && agent.value?.activeVersionId === null) aiPanelOpenForVisit.value = true;
				nodeTypesStore.loadNodeTypesIfNotLoaded().catch(() => void 0);
				credentialsStore.setCredentials([]);
				await Promise.all([credentialsStore.fetchUsableCredentials({
					projectId: targetProjectId,
					forAgent: true
				}), credentialsStore.fetchCredentialTypes(false)]).catch(() => void 0);
				if (!isCurrentInitialization()) return;
				sessionsStore.stopAutoRefresh();
				previewSessionsLoaded.value = false;
				if (!isUnsaved.value) sessionsStore.fetchThreads(targetProjectId, targetAgentId).catch((error) => {
					if (!isCurrentInitialization()) return;
					showError(error, locale.baseText("agentSessions.showError.load"));
				}).finally(() => {
					if (!isCurrentInitialization()) return;
					previewSessionsLoaded.value = true;
					sessionsStore.startAutoRefresh();
				});
				const connectedTriggersAtBaselineStart = connectedTriggers.value;
				(async () => {
					const integrations = await ensureIntegrationsCatalog(targetProjectId).catch(() => []);
					if (!isCurrentInitialization()) return;
					const triggerTypes = withN8nChat(integrations).map((i) => i.type);
					const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
					if (isCurrentInitialization() && connected && connectedTriggers.value === connectedTriggersAtBaselineStart) connectedTriggers.value = connected;
				})();
				if (!isArtifactMode.value && route.query["newSession"] === "true") {
					persistedPreviewOpen.value = true;
					onNewChat();
				} else {
					if (!isArtifactMode.value && route.query["openPreview"] === "true") persistedPreviewOpen.value = true;
					if (isPreviewActive.value) bindPreviewSession();
				}
				if (!isArtifactMode.value && (route.query.prompt || route.query.expandBuildChat)) router.replace({ query: {
					...route.query,
					prompt: void 0,
					expandBuildChat: void 0
				} });
			} catch (error) {
				if (isCurrentInitialization()) showError(error, locale.baseText("agents.builder.loadError"));
			} finally {
				if (isCurrentInitialization()) {
					if (!starterInFlight) settleStarter();
					initialized.value = true;
					replayPendingExternalRefresh().catch(handleArtifactRefreshError);
					warmAgentKnowledgeSandboxForPage();
					if (!isArtifactMode.value && !isStandalonePreview.value && !isUnsaved.value) agentCollaborationStore.initialize(projectId.value, agentId.value);
				}
			}
		}
		watch([projectId, agentId], ([nextProjectId, nextAgentId], [previousProjectId, previousAgentId]) => {
			if (!isArtifactMode.value || nextProjectId === previousProjectId && nextAgentId === previousAgentId) return;
			persistedPreviewOpen.value = props.artifactPreviewOpen ?? false;
			activeChatSessionId.value = null;
		});
		watch([
			projectId,
			agentId,
			isAgentPending
		], ([nextProjectId, nextAgentId, pending], [previousProjectId, previousAgentId]) => {
			initialize({ preserveState: nextProjectId === previousProjectId && nextAgentId === previousAgentId && !pending });
		}, { immediate: true });
		watch(isStandalonePreview, (isPreview, wasPreview) => {
			if (isPreview === wasPreview || isArtifactMode.value) return;
			if (isPreview) agentCollaborationStore.terminate();
			else if (initialized.value && !isUnsaved.value) agentCollaborationStore.initialize(projectId.value, agentId.value);
		});
		useEventListener(window, "beforeunload", () => {
			if (!isArtifactMode.value && !isStandalonePreview.value) agentCollaborationStore.terminate();
		});
		onBeforeUnmount(async () => {
			disposed = true;
			cancelQueuedAiHandoff();
			latestSessionsFetchRequestId++;
			agentsEventBus.off("agentUpdated", onExternalAgentUpdated);
			agentsEventBus.off("credentialHelpRequested", onCredentialHelpRequested);
			removeAgentUpdateListener();
			pushConnectionStore.pushDisconnect();
			clearTimeout(externalRefreshTimer);
			clearExternalUpdate();
			sessionsStore.stopAutoRefresh();
			if (!isArtifactMode.value) {
				try {
					await flushAutosave();
				} catch {}
				agentCollaborationStore.terminate();
			} else flushAutosave().catch(() => {});
		});
		watch(previewSessionsLoading, (isLoading, wasLoading) => {
			if (!wasLoading || isLoading || !initialized.value) return;
			if (!isPreviewActive.value) return;
			if (effectiveSessionId.value) return;
			bindPreviewSession();
		});
		watch([isPreviewActive, initialized], ([open, isInitialized]) => {
			if (open) persistedPreviewOpen.value = true;
			if (open && isInitialized && !previewSessionsLoading.value) bindPreviewSession();
		}, { immediate: true });
		const pendingPreviewValidations = /* @__PURE__ */ new Set();
		async function ensurePreviewSessionAvailable(sessionId) {
			if (previewSessionsLoading.value || currentSessionIsLocallyMinted.value) return;
			if (currentSession.value) {
				if (!currentSession.value.canContinueInPreview) acceptPreviewSession(currentSession.value);
				return;
			}
			const targetProjectId = projectId.value;
			const targetAgentId = agentId.value;
			const validationKey = JSON.stringify([
				targetProjectId,
				targetAgentId,
				sessionId
			]);
			if (pendingPreviewValidations.has(validationKey)) return;
			pendingPreviewValidations.add(validationKey);
			const isCurrent = () => isPreviewActive.value && !isStaleAgentTarget(targetProjectId, targetAgentId) && effectiveSessionId.value === sessionId;
			try {
				const { thread } = await sessionsStore.getThreadDetail(targetProjectId, targetAgentId, sessionId);
				if (isCurrent()) acceptPreviewSession(thread);
			} catch (error) {
				if (!isCurrent()) return;
				if (isNotFoundError(error)) selectLatestPreviewSession();
				else showError(error, locale.baseText("agentSessions.showError.load"));
			} finally {
				pendingPreviewValidations.delete(validationKey);
			}
		}
		function acceptPreviewSession(thread) {
			if (thread.canContinueInPreview) {
				sessionsStore.upsertThread(thread);
				return;
			}
			router.replace({
				name: AGENT_SESSION_DETAIL_VIEW,
				params: {
					projectId: projectId.value,
					agentId: agentId.value,
					threadId: thread.id
				}
			});
		}
		watch([
			effectiveSessionId,
			initialized,
			isPreviewActive,
			previewSessionsLoading
		], ([sessionId, isInitialized, isOpen, isLoading]) => {
			if (!sessionId || !isInitialized || !isOpen || isLoading) return;
			ensurePreviewSessionAvailable(sessionId);
		}, { immediate: true });
		watch([() => props.artifactPreviewSessionId, initialized], ([sessionId, isInitialized]) => {
			if (!isArtifactMode.value || !isInitialized || !sessionId) return;
			openArtifactPreview(sessionId);
		}, { immediate: true });
		function exitContinueMode() {
			clearContinueSessionParam();
		}
		function onConfirmVectorStore(vectorStore, originalName) {
			const vectorStores = localConfig.value?.vectorStores ?? [];
			const matchName = originalName ?? vectorStore.name;
			const index = vectorStores.findIndex((existing) => existing.name === matchName);
			onConfigFieldUpdate({ vectorStores: index === -1 ? [...vectorStores, vectorStore] : vectorStores.map((existing, i) => i === index ? vectorStore : existing) });
		}
		function onOpenAddVectorStoreModal() {
			builderTelemetry.trackStartedVectorStoreSetup();
			const vectorStores = localConfig.value?.vectorStores ?? [];
			uiStore.openModalWithData({
				name: AGENT_VECTOR_STORES_MODAL_KEY,
				data: {
					projectId: projectId.value,
					agentId: agentId.value,
					existingNames: vectorStores.map((vectorStore) => vectorStore.name),
					onConfirm: onConfirmVectorStore
				}
			});
		}
		function onOpenEditVectorStoreModal(vectorStore) {
			const vectorStores = localConfig.value?.vectorStores ?? [];
			uiStore.openModalWithData({
				name: AGENT_VECTOR_STORES_MODAL_KEY,
				data: {
					projectId: projectId.value,
					agentId: agentId.value,
					existingNames: vectorStores.map((existing) => existing.name),
					vectorStore,
					onConfirm: (updated) => onConfirmVectorStore(updated, vectorStore.name),
					onRemove: (name) => {
						onConfigFieldUpdate({ vectorStores: (localConfig.value?.vectorStores ?? []).filter((existing) => existing.name !== name) });
					}
				}
			});
		}
		function onRemoveVectorStore(vectorStore) {
			onConfigFieldUpdate({ vectorStores: (localConfig.value?.vectorStores ?? []).filter((existing) => existing.name !== vectorStore.name) });
		}
		function onContinueLoaded({ sessionId, count }) {
			if (count === 0 && currentSessionIsEphemeral.value && sessionId === effectiveSessionId.value && sessionId === continueSessionId.value) exitContinueMode();
		}
		function onSwitchAgent(nextAgentId) {
			if (!nextAgentId || nextAgentId === agentId.value) return;
			const { [ASSISTANT_THREAD_PARAM]: _assistantThread, ...query } = route.query;
			router.push({
				name: isStandalonePreview.value ? AGENT_PREVIEW_VIEW : AGENT_BUILDER_VIEW,
				params: {
					projectId: projectId.value,
					agentId: nextAgentId
				},
				query: isStandalonePreview.value ? {} : query
			});
		}
		const builderPromptHasContent = ref(false);
		const promptInspiration = useAgentPromptInspiration({
			prompts: computed(() => AGENT_TEMPLATES.map((template) => locale.baseText(template.placeholderKey))),
			enabled: () => showAgentIntro.value && showAiPanel.value && (!inlineTestChat.value || !isPreviewDockOpen.value) && !(compactChatLayout.value && showConfiguration.value) && !hasSentBuilderMessage.value && !builderPromptHasContent.value
		});
		useKeybindings({ ctrl_j: {
			disabled: function isAiPanelShortcutDisabled() {
				return !instanceAiAvailable.value;
			},
			run: toggleAiPanel,
			/** Enables closing with command whilst panel input is focused */
			allowInInputs: true
		} });
		return (_ctx, _cache) => {
			return openBlock(), createElementBlock("div", {
				ref_key: "builderHost",
				ref: builderHost,
				class: normalizeClass([_ctx.$style.root, {
					[_ctx.$style.standalone]: !isArtifactMode.value,
					[_ctx.$style.fullscreen]: compactChatLayout.value
				}]),
				"data-testid": "agent-builder-layout"
			}, [
				createVNode(AgentFolderDialog_default, {
					"project-id": projectId.value,
					action: folderMoveAction.value,
					onClose: _cache[0] || (_cache[0] = ($event) => folderMoveAction.value = null),
					onSaved: _cache[1] || (_cache[1] = ($event) => fetchAgent())
				}, null, 8, ["project-id", "action"]),
				isStandalonePreview.value ? (openBlock(), createBlock(AgentTestHeader_default, {
					key: 0,
					"agent-id": agentId.value,
					"agent-name": agent.value?.name ?? agentName.value,
					"agent-href": agentBuilderHref.value,
					"session-title": unref(currentSessionTitle),
					"session-options": unref(sessionMenu),
					"has-trace": unref(currentSessionHasMessages) && Boolean(unref(effectiveSessionId)),
					"can-delete-session": canDeletePreviewSession.value,
					"is-deleting-session": unref(isDeletingSession),
					onBack: returnToBuilderFromPreview,
					onDeleteSession: onDeletePreviewSession,
					onNewSession: startNewPreviewSession,
					onSessionSelect: unref(onSessionPick),
					onViewTrace: viewPreviewTrace
				}, null, 8, [
					"agent-id",
					"agent-name",
					"agent-href",
					"session-title",
					"session-options",
					"has-trace",
					"can-delete-session",
					"is-deleting-session",
					"onSessionSelect"
				])) : withDirectives((openBlock(), createBlock(AgentBuilderHeader_default, {
					key: 1,
					ref_key: "builderHeader",
					ref: builderHeader,
					agent: agent.value,
					"project-id": projectId.value,
					"agent-id": agentId.value,
					"project-name": unref(projectName),
					"project-icon": unref(projectIcon),
					"header-actions": headerActions.value,
					"save-status": saveStatus.value,
					"before-revert-to-published": beforeRevertToPublished,
					"is-unsaved": isUnsaved.value,
					"artifact-mode": isArtifactMode.value,
					"editing-locked": isEditingLocked.value,
					"config-validation-status": unref(configValidation)?.status ?? null,
					"config-validation-issues": unref(configValidation)?.issues ?? [],
					"before-publish": refreshValidationBeforePublish,
					tasks: areSetupTasksVisible.value ? unref(setupTasks) : void 0,
					onHeaderAction,
					onOpenPublishTimeline: _cache[2] || (_cache[2] = ($event) => onOpenVersionHistory("timeline")),
					onPublishReady: _cache[3] || (_cache[3] = ($event) => isPublishReady.value = $event),
					onPublished,
					onUnpublished,
					onReverted,
					onSwitchAgent,
					onSetupTaskAction
				}, null, 8, [
					"agent",
					"project-id",
					"agent-id",
					"project-name",
					"project-icon",
					"header-actions",
					"save-status",
					"is-unsaved",
					"artifact-mode",
					"editing-locked",
					"config-validation-status",
					"config-validation-issues",
					"tasks"
				])), [[vShow, !compactChatLayout.value || showConfiguration.value]]),
				!isArtifactMode.value ? (openBlock(), createBlock(AgentCollaborationBanner_default, { key: 2 })) : createCommentVNode("", true),
				!isArtifactMode.value && unref(instanceAiAvailable) && !showAiPanel.value && !unref(agentCollaborationStore).shouldBeReadOnly && !isAgentArchived.value ? (openBlock(), createElementBlock("div", {
					key: 3,
					class: normalizeClass(_ctx.$style.aiToggleBar)
				}, [createVNode(KeyboardShortcutTooltip_default, {
					label: unref(locale).baseText("agents.builder.header.editWithAi"),
					shortcut: {
						metaKey: true,
						keys: ["J"]
					}
				}, {
					default: withCtx(() => [createVNode(unref(N8nButton_default), {
						variant: "outline",
						size: "medium",
						"icon-only": "",
						"aria-label": unref(locale).baseText("agents.builder.header.editWithAi"),
						disabled: !agent.value,
						"data-testid": "agent-builder-instance-ai-btn",
						onClick: toggleAiPanel
					}, {
						icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
							icon: "n8n-assistant",
							size: 18
						})]),
						_: 1
					}, 8, ["aria-label", "disabled"])]),
					_: 1
				}, 8, ["label"])], 2)) : createCommentVNode("", true),
				compactChatLayout.value && showConfiguration.value ? (openBlock(), createElementBlock("div", {
					key: 4,
					ref_key: "mobileNavigation",
					ref: mobileNavigation,
					class: normalizeClass(_ctx.$style.mobileNavigation)
				}, [createVNode(unref(N8nButton_default), {
					variant: "outline",
					icon: "messages-square",
					"data-testid": "agent-builder-show-chat",
					onClick: _cache[4] || (_cache[4] = ($event) => showConfiguration.value = false)
				}, {
					default: withCtx(() => [createTextVNode(toDisplayString(unref(locale).baseText("agents.builder.chatMode.chat")), 1)]),
					_: 1
				})], 2)) : createCommentVNode("", true),
				createBaseVNode("div", {
					class: normalizeClass(_ctx.$style.externalUpdateNotice),
					role: "status",
					"aria-live": "polite",
					"aria-atomic": "true"
				}, [recentExternalUpdate.value ? (openBlock(), createBlock(unref(CanvasPill_default), {
					key: 0,
					class: normalizeClass(_ctx.$style.externalUpdatePill),
					"data-testid": "agent-builder-external-update"
				}, {
					icon: withCtx(() => [createVNode(unref(N8nIcon_default), {
						icon: "info",
						"aria-hidden": "true"
					})]),
					default: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.externalUpdateContent) }, [createBaseVNode("span", { class: normalizeClass(_ctx.$style.externalUpdateText) }, toDisplayString(externalUpdateMessage.value), 3), createVNode(unref(N8nIconButton_default), {
						class: normalizeClass(_ctx.$style.externalUpdateDismiss),
						icon: "x",
						variant: "ghost",
						size: "xsmall",
						"aria-label": unref(locale).baseText("generic.dismiss"),
						title: unref(locale).baseText("generic.dismiss"),
						"data-testid": "agent-builder-external-update-dismiss",
						onClick: clearExternalUpdate
					}, null, 8, [
						"class",
						"aria-label",
						"title"
					])], 2)]),
					_: 1
				}, 8, ["class"])) : createCommentVNode("", true)], 2),
				createBaseVNode("div", {
					ref_key: "builderContainer",
					ref: builderContainer,
					"data-testid": "agent-builder-container",
					class: normalizeClass([_ctx.$style.builder, {
						[_ctx.$style.previewOpen]: isPreviewDockOpen.value && !inlineTestChat.value && !props.artifactPreviewChatTarget,
						[_ctx.$style.inlineTestChat]: inlineTestChat.value,
						[_ctx.$style.chatFirst]: wideChat.value || inlineTestChat.value,
						[_ctx.$style.compactChatLayout]: compactChatLayout.value,
						[_ctx.$style.aiPanelOpen]: showAiPanel.value,
						[_ctx.$style.previewResizing]: isPreviewDockResizing.value
					}]),
					style: normalizeStyle({
						"--agent-ai-panel-width": `${renderedSidePanelWidths.value.ai}px`,
						"--agent-preview-chat-column-width": `${renderedSidePanelWidths.value.preview}px`,
						"--agent-builder-editor-min-width": `${AGENT_BUILDER_EDITOR_MIN_WIDTH}px`
					})
				}, [
					showAiPanel.value ? withDirectives((openBlock(), createElementBlock("aside", {
						key: 0,
						class: normalizeClass([_ctx.$style.aiDock, { [_ctx.$style.testModeActive]: inlineTestChat.value && isPreviewDockOpen.value }]),
						"data-testid": "agent-ai-dock"
					}, [createVNode(unref(N8nResizeWrapper_default), {
						width: renderedSidePanelWidths.value.ai,
						"is-resizing-enabled": !compactChatLayout.value,
						"grid-size": wideChat.value ? 1 : 20,
						"min-width": unref(320),
						"max-width": chatPanelLayout.value.maxWidth,
						"default-width": chatPanelLayout.value.defaultWidth,
						"supported-directions": ["right"],
						onResize: onAiPanelResize
					}, {
						default: withCtx(() => [withDirectives((openBlock(), createBlock(InstanceAiChatPanel_default, {
							ref_key: "aiPanelRef",
							ref: aiPanelRef,
							visible: (!inlineTestChat.value || !isPreviewDockOpen.value) && !(compactChatLayout.value && showConfiguration.value),
							closable: compactChatLayout.value || !inlineTestChat.value && !wideChat.value,
							"show-open-full-assistant": false,
							"composer-height": inlineTestChat.value ? "var(--agent-builder-composer-height)" : void 0,
							placeholder: inlineTestChat.value ? unref(locale).baseText("agents.builder.chatMode.buildPlaceholder") : void 0,
							onMessageSent: _cache[5] || (_cache[5] = ($event) => hasSentBuilderMessage.value = true),
							"placeholder-preview": unref(promptInspiration).placeholder,
							onContentChange: _cache[6] || (_cache[6] = ($event) => builderPromptHasContent.value = $event),
							key: agentId.value,
							subject: instanceAiEmbedSubject.value,
							launch: instanceAiEmbedLaunch.value,
							"thread-id": aiThreadId.value,
							"before-new-thread": beforeAiNewThread,
							"before-send": flushAutosaveIgnoringResult,
							"data-testid": "agent-ai-chat-panel",
							"onUpdate:threadId": onAiThreadIdChange,
							"onUpdate:building": _cache[7] || (_cache[7] = ($event) => embeddedAiBuilding.value = $event),
							"onUpdate:working": _cache[8] || (_cache[8] = ($event) => embeddedAiWorking.value = $event),
							onClose: closeBuilderChat
						}, createSlots({ _: 2 }, [
							inlineTestChat.value ? {
								name: "composer-footer",
								fn: withCtx(() => [createVNode(AgentBuilderChatDisclaimer_default)]),
								key: "0"
							} : void 0,
							inlineTestChat.value ? {
								name: "composer-start",
								fn: withCtx(() => [createVNode(AgentBuilderChatMode_default, {
									"model-value": chatMode.value,
									disabled: chatModeBusy.value,
									"test-disabled": !!testModeDisabledReason.value,
									"test-disabled-reason": testModeDisabledReason.value,
									"validation-issues": testValidationIssues.value,
									discovery: !unref(hasSentBuilderMessage) && !isPreviewDockOpen.value && !showConfiguration.value,
									"onUpdate:modelValue": setChatMode
								}, null, 8, [
									"model-value",
									"disabled",
									"test-disabled",
									"test-disabled-reason",
									"validation-issues",
									"discovery"
								])]),
								key: "1"
							} : void 0,
							showAgentIntro.value ? {
								name: "empty",
								fn: withCtx(() => [createVNode(AgentBuilderIntro_default, { onSelect: onApplyTemplate })]),
								key: "2"
							} : void 0
						]), 1032, [
							"visible",
							"closable",
							"composer-height",
							"placeholder",
							"placeholder-preview",
							"subject",
							"launch",
							"thread-id"
						])), [[vShow, !inlineTestChat.value || !isPreviewDockOpen.value]])]),
						_: 1
					}, 8, [
						"width",
						"is-resizing-enabled",
						"grid-size",
						"min-width",
						"max-width",
						"default-width"
					])], 2)), [[vShow, !(compactChatLayout.value && showConfiguration.value)]]) : createCommentVNode("", true),
					embeddedAiBuilding.value ? (openBlock(), createElementBlock("div", {
						key: 1,
						class: normalizeClass(_ctx.$style.activityArea),
						style: normalizeStyle({
							left: showAiPanel.value ? `${renderedSidePanelWidths.value.ai}px` : void 0,
							right: isPreviewDockOpen.value && !inlineTestChat.value && !props.artifactPreviewChatTarget ? `${renderedSidePanelWidths.value.preview}px` : void 0
						})
					}, [createVNode(AgentBuildingIndicator_default)], 6)) : createCommentVNode("", true),
					showBuilderLoading.value ? (openBlock(), createElementBlock("div", {
						key: 2,
						class: normalizeClass(_ctx.$style.loading)
					}, [createVNode(unref(N8nSpinner_default), {
						type: "brand",
						size: "xxlarge"
					})], 2)) : (openBlock(), createElementBlock(Fragment, { key: 3 }, [
						isStandalonePreview.value ? (openBlock(), createBlock(AgentTestChatPage_default, {
							key: 0,
							ref_key: "previewChatPage",
							ref: previewChatPage,
							layout: "page",
							initialized: initialized.value && previewSessionReady.value,
							"project-id": projectId.value,
							"agent-id": agentId.value,
							agent: agent.value,
							"local-config": localConfig.value,
							"connected-triggers": connectedTriggers.value,
							"effective-session-id": unref(effectiveSessionId),
							"new-session": unref(currentSessionIsEphemeral),
							"can-send-to-assistant": isArtifactMode.value ? unref(instanceAiAvailable) : unref(instanceAiReady),
							"dismissed-fix-tool-call-ids": unref(dismissedFixToolCallIds),
							"before-send": beforePreviewSend,
							"budget-cards": "",
							"increase-budget": effectiveCanEditAgent.value ? onPreviewIncreaseBudget : void 0,
							onContinueLoaded,
							onSessionCreated: unref(markSessionCreated),
							onOpenBuild: returnToBuilderFromPreview,
							onSendToAssistant: onSendPreviewToAssistant
						}, null, 8, [
							"initialized",
							"project-id",
							"agent-id",
							"agent",
							"local-config",
							"connected-triggers",
							"effective-session-id",
							"new-session",
							"can-send-to-assistant",
							"dismissed-fix-tool-call-ids",
							"increase-budget",
							"onSessionCreated"
						])) : withDirectives((openBlock(), createBlock(AgentBuilderEditorColumn_default, {
							key: 1,
							ref_key: "editorColumn",
							ref: editorColumn,
							"active-main-tab": unref(activeMainTab),
							"onUpdate:activeMainTab": _cache[9] || (_cache[9] = ($event) => isRef(activeMainTab) ? activeMainTab.value = $event : null),
							class: normalizeClass(_ctx.$style.editorColumn),
							"chat-first": wideChat.value,
							"embedded-ai-building": embeddedAiBuilding.value,
							"local-config": localConfig.value,
							agent: agent.value,
							"project-id": projectId.value,
							"agent-id": agentId.value,
							"agent-files": unref(agentFiles),
							"agent-files-loading": unref(agentFilesLoading),
							"agent-files-uploading": unref(agentFilesUploading),
							"knowledge-base-enabled": isKnowledgeBaseEnabled.value,
							"deleting-agent-file-id": unref(deletingAgentFileId),
							"applied-skills": unref(appliedSkills),
							"connected-triggers": connectedTriggers.value,
							"can-edit-agent": effectiveCanEditAgent.value,
							"can-execute-agent": canExecuteAgent.value,
							"agent-available-in-mcp": agentAvailableInMcp.value,
							"tasks-reload-key": tasksReloadKey.value,
							"main-tab-options": unref(mainTabOptions),
							"agent-unsaved": isUnsaved.value,
							"ensure-agent-persisted": ensureAgentPersisted,
							"saved-description": localConfig.value?.description ?? "",
							"save-description": saveN8nChatDescription,
							"executions-description": unref(executionsDescription),
							"generating-eval-cases": unref(agentEvalsStore).isGeneratingCases(agentId.value),
							"artifact-mode": isArtifactMode.value,
							"is-preview-open": isPreviewDockOpen.value,
							"hide-preview-button": inlineTestChat.value,
							"prevent-scroll": isPreviewDockResizing.value,
							"config-validation-issues": unref(configValidation)?.issues ?? [],
							"preview-disabled-reason": previewDisabledReason.value,
							"onUpdate:config": onConfigFieldUpdate,
							"onUpdate:budgetConfig": onBudgetSettingsSave,
							"onDraft:config": markConfigDraftEdited,
							onOpenTool: unref(caps).onOpenToolFromList,
							onOpenSkill: unref(caps).onOpenSkillFromList,
							onAddTool: unref(caps).onOpenAddToolModal,
							onAddSkill: unref(caps).onOpenAddSkillModal,
							onUploadFiles: unref(onUploadAgentFiles),
							onDeleteFile: unref(onDeleteAgentFile),
							onAddVectorStore: onOpenAddVectorStoreModal,
							onEditVectorStore: onOpenEditVectorStoreModal,
							onRemoveVectorStore,
							onRemoveTool: unref(caps).onRemoveTool,
							onRemoveSkill: unref(caps).onRemoveSkill,
							"onUpdate:connectedTriggers": unref(caps).onConnectedTriggersUpdate,
							onTriggerAdded: unref(caps).onTriggerAdded,
							onTriggerRemoved: unref(caps).onTriggerRemoved,
							onToggleTask: unref(caps).onToggleTask,
							onToggleMcpAccess,
							onTasksChanged: _cache[10] || (_cache[10] = () => onConfigUpdated()),
							onPreviewTask,
							onAgentChanged: refreshAgentAfterIntegrationChange,
							onGenerateEvalCases,
							onOpenPreview,
							onClosePreview: closePreviewDock,
							onPublishAgent: onSetupTaskPublishAgent
						}, null, 8, [
							"active-main-tab",
							"class",
							"chat-first",
							"embedded-ai-building",
							"local-config",
							"agent",
							"project-id",
							"agent-id",
							"agent-files",
							"agent-files-loading",
							"agent-files-uploading",
							"knowledge-base-enabled",
							"deleting-agent-file-id",
							"applied-skills",
							"connected-triggers",
							"can-edit-agent",
							"can-execute-agent",
							"agent-available-in-mcp",
							"tasks-reload-key",
							"main-tab-options",
							"agent-unsaved",
							"saved-description",
							"executions-description",
							"generating-eval-cases",
							"artifact-mode",
							"is-preview-open",
							"hide-preview-button",
							"prevent-scroll",
							"config-validation-issues",
							"preview-disabled-reason",
							"onOpenTool",
							"onOpenSkill",
							"onAddTool",
							"onAddSkill",
							"onUploadFiles",
							"onDeleteFile",
							"onRemoveTool",
							"onRemoveSkill",
							"onUpdate:connectedTriggers",
							"onTriggerAdded",
							"onTriggerRemoved",
							"onToggleTask"
						])), [[vShow, !compactChatLayout.value || showConfiguration.value]]),
						!isStandalonePreview.value && isVersionHistoryOpen.value ? (openBlock(), createBlock(AgentVersionHistoryPanel_default, {
							key: 2,
							ref_key: "versionHistoryPanel",
							ref: versionHistoryPanel,
							"active-tab": versionHistoryTab.value,
							"onUpdate:activeTab": _cache[11] || (_cache[11] = ($event) => versionHistoryTab.value = $event),
							"project-id": projectId.value,
							"agent-id": agentId.value,
							"current-version-id": agent.value?.versionId,
							"has-unpublished-changes": unref(hasAgentUnpublishedChanges)(agent.value),
							"agent-name": agent.value?.name ?? agentName.value,
							"editing-locked": isEditingLocked.value,
							"before-publish": flushBeforePublish,
							onClose: onCloseVersionHistory,
							onReverted,
							onPublished,
							onUnpublished
						}, null, 8, [
							"active-tab",
							"project-id",
							"agent-id",
							"current-version-id",
							"has-unpublished-changes",
							"agent-name",
							"editing-locked"
						])) : createCommentVNode("", true),
						(openBlock(), createBlock(Teleport, {
							to: props.artifactPreviewChatTarget ?? "body",
							disabled: !props.artifactPreviewChatTarget
						}, [!isStandalonePreview.value ? withDirectives((openBlock(), createBlock(unref(N8nResizeWrapper_default), {
							key: 0,
							class: normalizeClass([_ctx.$style.previewResizeWrapper, {
								[_ctx.$style.previewResizeOpen]: isPreviewDockOpen.value,
								[_ctx.$style.previewOverlay]: !!props.artifactPreviewChatTarget
							}]),
							"is-resizing-enabled": isPreviewDockOpen.value && !inlineTestChat.value && !props.artifactPreviewChatTarget,
							width: renderedSidePanelWidths.value.preview,
							"max-width": unref(720),
							"default-width": defaultPanelWidth.value,
							"min-width": unref(320),
							"supported-directions": ["left"],
							"grid-size": 8,
							onResizestart: _cache[15] || (_cache[15] = ($event) => isPreviewDockResizing.value = true),
							onResize: onPreviewDockResize,
							onResizeend: _cache[16] || (_cache[16] = ($event) => isPreviewDockResizing.value = false)
						}, {
							default: withCtx(() => [createVNode(AgentTestDock_default, {
								ref_key: "previewDock",
								ref: previewDock,
								inline: inlineTestChat.value,
								overlay: !!props.artifactPreviewChatTarget,
								closable: compactChatLayout.value,
								placeholder: inlineTestChat.value ? unref(locale).baseText("agents.builder.chatMode.testPlaceholder", { interpolate: { agentName: localConfig.value?.name || agentName.value } }) : void 0,
								onMessageSent: _cache[12] || (_cache[12] = ($event) => hasSentBuilderMessage.value = true),
								"is-open": isPreviewDockOpen.value && !(compactChatLayout.value && showConfiguration.value),
								"session-title": unref(currentSessionTitle),
								"session-options": unref(sessionMenu),
								"has-session": unref(currentSessionHasMessages),
								initialized: initialized.value && previewSessionReady.value,
								"project-id": projectId.value,
								"agent-id": agentId.value,
								agent: agent.value,
								"local-config": localConfig.value,
								"connected-triggers": connectedTriggers.value,
								"effective-session-id": unref(effectiveSessionId),
								"new-session": unref(currentSessionIsEphemeral),
								"initial-prompt": taskPreviewPrompt.value,
								"can-delete-session": canDeletePreviewSession.value,
								"is-deleting-session": unref(isDeletingSession),
								"can-send-to-assistant": isArtifactMode.value ? unref(instanceAiAvailable) : unref(instanceAiReady),
								"dismissed-fix-tool-call-ids": unref(dismissedFixToolCallIds),
								"before-send": beforePreviewSend,
								"budget-cards": "",
								"increase-budget": effectiveCanEditAgent.value ? onPreviewIncreaseBudget : void 0,
								onViewTrace: viewPreviewTrace,
								onNewSession: startNewPreviewSession,
								onDeleteSession: onDeletePreviewSession,
								onSessionSelect: unref(onSessionPick),
								onClose: closeTestChat,
								onContinueLoaded,
								onSessionCreated: unref(markSessionCreated),
								onSendToAssistant: onSendPreviewToAssistant,
								onOpenBuild: _cache[13] || (_cache[13] = ($event) => !isArtifactMode.value && setChatMode("build")),
								onInitialConsumed: _cache[14] || (_cache[14] = ($event) => taskPreviewPrompt.value = void 0)
							}, createSlots({ _: 2 }, [inlineTestChat.value ? {
								name: "composer-footer",
								fn: withCtx(() => [createVNode(AgentBuilderChatDisclaimer_default)]),
								key: "0"
							} : void 0, inlineTestChat.value ? {
								name: "composer-start",
								fn: withCtx(() => [createVNode(AgentBuilderChatMode_default, {
									"model-value": chatMode.value,
									disabled: chatModeBusy.value,
									"test-disabled": !!testModeDisabledReason.value,
									"test-disabled-reason": testModeDisabledReason.value,
									"validation-issues": testValidationIssues.value,
									discovery: !unref(hasSentBuilderMessage) && isPreviewDockOpen.value && !showConfiguration.value,
									"onUpdate:modelValue": setChatMode
								}, null, 8, [
									"model-value",
									"disabled",
									"test-disabled",
									"test-disabled-reason",
									"validation-issues",
									"discovery"
								])]),
								key: "1"
							} : void 0]), 1032, [
								"inline",
								"overlay",
								"closable",
								"placeholder",
								"is-open",
								"session-title",
								"session-options",
								"has-session",
								"initialized",
								"project-id",
								"agent-id",
								"agent",
								"local-config",
								"connected-triggers",
								"effective-session-id",
								"new-session",
								"initial-prompt",
								"can-delete-session",
								"is-deleting-session",
								"can-send-to-assistant",
								"dismissed-fix-tool-call-ids",
								"increase-budget",
								"onSessionSelect",
								"onSessionCreated"
							])]),
							_: 1
						}, 8, [
							"class",
							"is-resizing-enabled",
							"width",
							"max-width",
							"default-width",
							"min-width"
						])), [[vShow, !(compactChatLayout.value && showConfiguration.value)]]) : createCommentVNode("", true)], 8, ["to", "disabled"]))
					], 64))
				], 6)
			], 2);
		};
	}
}), [["__cssModules", { "$style": {
	fullscreen: "_fullscreen_1xxmg_562",
	root: "_root_1xxmg_570",
	standalone: "_standalone_1xxmg_577",
	builder: "_builder_1xxmg_591",
	previewOpen: "_previewOpen_1xxmg_602",
	aiPanelOpen: "_aiPanelOpen_1xxmg_605",
	previewResizing: "_previewResizing_1xxmg_608",
	chatFirst: "_chatFirst_1xxmg_618",
	aiDock: "_aiDock_1xxmg_625",
	previewResizeWrapper: "_previewResizeWrapper_1xxmg_626",
	inlineTestChat: "_inlineTestChat_1xxmg_630",
	compactChatLayout: "_compactChatLayout_1xxmg_640",
	mobileNavigation: "_mobileNavigation_1xxmg_646",
	previewOverlay: "_previewOverlay_1xxmg_670",
	previewResizeOpen: "_previewResizeOpen_1xxmg_675",
	loading: "_loading_1xxmg_679",
	showBuildChatButton: "_showBuildChatButton_1xxmg_686",
	editorColumn: "_editorColumn_1xxmg_693",
	activityArea: "_activityArea_1xxmg_698",
	testModeActive: "_testModeActive_1xxmg_716",
	externalUpdateNotice: "_externalUpdateNotice_1xxmg_725",
	externalUpdatePill: "_externalUpdatePill_1xxmg_737",
	externalUpdateContent: "_externalUpdateContent_1xxmg_746",
	externalUpdateText: "_externalUpdateText_1xxmg_752",
	externalUpdateDismiss: "_externalUpdateDismiss_1xxmg_757",
	aiToggleBar: "_aiToggleBar_1xxmg_763",
	shimmer: "_shimmer_1xxmg_1",
	spin: "_spin_1xxmg_1",
	"skeleton-pulse": "_skeleton-pulse_1xxmg_1",
	opacityPulse: "_opacityPulse_1xxmg_1",
	popoverIn: "_popoverIn_1xxmg_1",
	fadeIn: "_fadeIn_1xxmg_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1xxmg_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1xxmg_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1xxmg_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1xxmg_1",
	blurSwapIn: "_blurSwapIn_1xxmg_1",
	blurSwapOut: "_blurSwapOut_1xxmg_1",
	pulse: "_pulse_1xxmg_1",
	pulseGlow: "_pulseGlow_1xxmg_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1xxmg_1",
	fade: "_fade_1xxmg_1",
	fadeInUp: "_fadeInUp_1xxmg_1",
	fadeInDown: "_fadeInDown_1xxmg_1",
	fadeInLeft: "_fadeInLeft_1xxmg_1",
	fadeInRight: "_fadeInRight_1xxmg_1",
	fadeOut: "_fadeOut_1xxmg_1",
	fadeOutDown: "_fadeOutDown_1xxmg_1",
	fadeOutUp: "_fadeOutUp_1xxmg_1",
	fadeOutLeft: "_fadeOutLeft_1xxmg_1",
	fadeOutRight: "_fadeOutRight_1xxmg_1",
	ping: "_ping_1xxmg_1",
	blinkBackground: "_blinkBackground_1xxmg_1",
	typingBlink: "_typingBlink_1xxmg_1"
} }]]);
//#endregion
export { readVerdictReasoning as A, useApplyAgentEvalSuggestions as C, resolveCaseColumns as D, useAgentEvalsStore as E, toAvatarKind as M, createDeferredPromise as N, readAgentAnswer as O, toDisplayToolCalls as S, useAgentEvalsFlag as T, AgentEvalExamplesSlider_default as _, agentPreviewContextIcon as a, AgentEvalSuggestionCard_default as b, handoffContextKey as c, useAssistantArtifactThread as d, useAssistantAgentTurnTelemetry as f, useArtifactThread as g, provideArtifactThread as h, useIsAgentWorking as i, readVerdictSuggestion as j, readErrorMessage as k, useBuildingArtifactIds as l, assistantConfirmationExtension as m, AgentBuildingIndicator_default as n, formatAgentPreviewContextLabel as o, useAssistantAgentMessageTelemetry as p, InstanceAiConversation_default as r, getDismissedContextKeys as s, AgentBuilderView_default as t, useAgentMutationRefresh as u, AgentEvalTryRow_default as v, useTestAgentPreviewFlag as w, AgentAvatar_default as x, EvalInitialSample_default as y };
