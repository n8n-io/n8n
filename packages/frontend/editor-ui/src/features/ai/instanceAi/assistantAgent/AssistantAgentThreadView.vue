<script setup lang="ts">
import {
	EXTENDED_PROMPT_MAX_LENGTH,
	type AgentJsonConfig,
	type AgentSseEvent,
	type AssistantAgentTargetsState,
	type InstanceAiAttachment,
	type InstanceAiHandoffContext,
	type InstanceAiNodesAttachment,
	type InstanceAiResourceAttachment,
	type InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { useAssistantAwayTelemetry } from '../composables/useAssistantAwayTelemetry';
import { getCurrentTurn } from '../assistantTurn';
import {
	N8nActionDropdown,
	N8nChatRating,
	N8nIconButton,
	N8nResizeWrapper,
	N8nTabsRoot,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useElementSize } from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, provide, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { isString } from '@/app/utils/typeGuards';
import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import CreditWarningBanner from '@/features/ai/assistant/components/Agent/CreditWarningBanner.vue';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { useN8nAssistantIdentity } from '@/features/agents/n8nChatPage/composables/useN8nAssistantIdentity';
import AssistantAtMentionPicker from '@/features/ai/assistant-at-mentions/AssistantAtMentionPicker.vue';
import type { WorkflowArtifactReference } from '@/features/ai/assistant-at-mentions/assistantAtMentions.types';

import { provideArtifactAgentTargets } from '../artifactAgentTargets';
import { provideArtifactThread } from '../artifactThread';
import { useAssistantCreditsStore } from '../assistantCredits.store';
import ApprovalModeSelector from '../components/ApprovalModeSelector.vue';
import AttachmentPreview from '../components/AttachmentPreview.vue';
import InstanceAiCanvasRunOverlay from '../components/InstanceAiCanvasRunOverlay.vue';
import InstanceAiAgentPreview from '../components/InstanceAiAgentPreview.vue';
import InstanceAiArtifactsPanel from '../components/InstanceAiArtifactsPanel.vue';
import InstanceAiAppPreview from '../components/InstanceAiAppPreview.vue';
import InstanceAiDataTablePreview from '../components/InstanceAiDataTablePreview.vue';
import InstanceAiFixWithAiPanel from '../components/InstanceAiFixWithAiPanel.vue';
import InstanceAiInputMenu from '../components/InstanceAiInputMenu.vue';
import InstanceAiPreviewTabBar from '../components/InstanceAiPreviewTabBar.vue';
import InstanceAiSkillPreview from '../components/InstanceAiSkillPreview.vue';
import InstanceAiViewHeader from '../components/InstanceAiViewHeader.vue';
import InstanceAiWorkflowDraftPreview from '../components/InstanceAiWorkflowDraftPreview.vue';
import { useDraftWorkflowPreview } from '../composables/useDraftWorkflowPreview';
import { useToolLabel } from '../toolLabels';
import {
	AGENT_CHAT_MARKDOWN_HOST_KEY,
	AGENT_TOOL_STEP_LABEL_KEY,
} from '@/features/agents/components/agentChatInjectionKeys';
import { useArtifactLinks } from '@/features/ai/instanceAi/artifactLinks';
import { isRecord } from '@n8n/utils/is-record';
import LimitedModeNotice from '../components/LimitedModeNotice.vue';
import InstanceAiWorkflowPreview, {
	type WorkflowFailuresReport,
} from '../components/InstanceAiWorkflowPreview.vue';
import NodesAttachmentChips from '../components/NodesAttachmentChips.vue';
import {
	MIN_WIDTH_FOR_PINNED_ARTIFACTS_PANEL,
	useArtifactsPanelToggle,
	usePreviewPanelWidth,
	usePreviewToggle,
} from '../composables/useArtifactsLayout';
import { useTransitionGate } from '../useTransitionGate';
import { useCreditWarningBanner } from '../composables/useCreditWarningBanner';
import type { AgentTestHandoffParams } from '../composables/useInstanceAiAgentTestHandoff';
import {
	buildInstanceAiAgentPreviewHandoffContext,
	clearPendingComposerDraft,
	clearPendingHandoffContext,
	clearPendingWorkflowAttachment,
	consumePendingDraftAttachment,
	consumePendingFirstMessage,
	getPendingComposerDraft,
	getPendingHandoffContext,
	getPendingWorkflowAttachment,
	type PendingFirstMessage,
} from '../composables/useInstanceAiHandoff';
import {
	INSTANCE_AI_APP_ID_QUERY,
	INSTANCE_AI_THREAD_SESSION_VIEW,
	INSTANCE_AI_VIEW,
} from '../constants';
import { buildFixWithAiPrompt } from '../fixWithAi';
import { formatAgentPreviewContextLabel } from '../instanceAi.handoffContext';
import { useInstanceAiStore } from '../instanceAi.store';
import { getAppTargetsFromThreadMetadata } from '../instanceAi.threadRuntime';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { buildThreadArtifactsContext, createDisplayedExecutionReader } from '../threadArtifacts';
import { isArtifactTab, isSavedArtifactTab, useCanvasPreview } from '../useCanvasPreview';
import { provideOpenResource } from '@/features/ai/instanceAi/openResourceContext';
import { toAgentPreviewComposerAttachment } from './assistantAgentPreviewHandoff';
import {
	fetchAssistantAgentThreadTabs,
	saveAssistantAgentThreadTabs,
} from './assistantAgentTabs.api';
import {
	ASSISTANT_AGENT_ACCEPTED_MIME_TYPES,
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_PROJECT_ID,
	ASSISTANT_AGENT_THREAD_ID,
	clearAssistantAgentLaunch,
	consumePendingAssistantAgentMessage,
	getAssistantAgentLaunch,
	type PendingAssistantAgentMessage,
} from './assistantAgentThreads';
import { assistantAnsweredQuestionsExtension } from './assistantAnsweredQuestions';
import { assistantAutoApprovalExtension } from './assistantAutoApproval';
import { assistantConfirmationExtension } from './assistantConfirmation';
import { assistantHostEventExtensions } from './assistantHostEvents';
import { assistantCodeToolResultExtension } from './assistantCodeToolResults';
import {
	ASSISTANT_PREFERENCE_CARDS,
	assistantPreferenceCardExtension,
	useAssistantPreferenceCards,
} from './assistantPreferenceCards';
import { assistantSharedFilesExtension } from './assistantSharedFiles';
import { provideAssistantArtifactCards } from './assistantArtifactCards';
import { assistantToolResultTableExtension } from './assistantToolResultTables';
import { useAssistantAgentThreadsStore } from './assistantAgentThreads.store';
import { stagedElementAppId, toElementComposerAttachment } from './assistantElementAttachments';
import {
	mentionChipId,
	readMessageReferences,
	toMentionComposerAttachment,
} from './assistantMentionAttachments';
import {
	countSentNodes,
	readNodesAttachment,
	toNodesComposerAttachment,
} from './assistantNodeAttachments';
import {
	useAssistantAgentMessageTelemetry,
	type AssistantAgentSendingMessage,
} from './useAssistantAgentMessageTelemetry';
import { useAssistantAgentTurnTelemetry } from './useAssistantAgentTurnTelemetry';
import {
	ASSISTANT_AGENT_SETUP_SAVED,
	useAssistantAgentSetupSavedTelemetry,
} from './useAssistantAgentSetupSavedTelemetry';
import { useAssistantAgentMentions } from './useAssistantAgentMentions';
import { useAssistantAgentTargets } from './useAssistantAgentTargets';
import { useAssistantAgentTrace } from './useAssistantAgentTrace';
import { useAssistantAgentFeedback } from './useAssistantAgentFeedback';
import { useAssistantArtifactThread } from './useAssistantArtifactThread';
import { useAssistantWorkflowDrafts } from './useAssistantWorkflowDrafts';
import { formatThreadTitle } from '@/features/agents/utils/thread-title';

const props = defineProps<{ threadId: string; projectId: string }>();

provide(ASSISTANT_AGENT_THREAD_ID, props.threadId);
useAssistantAwayTelemetry({
	threadId: () => props.threadId,
	isRunning: () => (panel.value?.isStreaming || panel.value?.isSubmitting) ?? false,
	isAwaitingUser: () => panel.value?.isAwaitingUserAnswer ?? false,
	isReady: () => panel.value?.isLoadingHistory === false,
	turn: () => getCurrentTurn(thread.artifactTurns),
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

// A new thread has a launch marker until the server accepts its first message.
// The server does not know the thread before then.
const launch = getAssistantAgentLaunch(props.threadId);
// What the empty view or a hand-off left for this new thread. The first message
// and the nodes are read once, so a reload cannot send them again. The rest
// stays until the server accepts the first message.
const handoff = readPendingHandoff();
const isNewThread = launch !== undefined || handoff.firstMessage !== undefined;
const isNewSession = ref(isNewThread);
let pendingReferences: InstanceAiAttachment[] = handoff.references;
let pendingHandoffContext: InstanceAiHandoffContext | undefined = handoff.context;
// The lists show a thread opened by URL even when it is older than the recent page.
if (!isNewThread) {
	void threadsStore.loadThread(props.threadId);
	void threadsStore.loadThreadCredits(props.threadId);
}

/** The first message to send, from the empty view or from a hand-off. */
function firstMessageOf(
	fromEmptyView: PendingAssistantAgentMessage | undefined,
	fromHandoff: PendingFirstMessage | null,
): Omit<PendingAssistantAgentMessage, 'threadId'> | undefined {
	if (fromEmptyView) return fromEmptyView;
	if (fromHandoff) {
		return {
			text: fromHandoff.message,
			files: [],
			references: fromHandoff.attachments ?? [],
			authorship: fromHandoff.authorship,
		};
	}
	return undefined;
}

function readPendingHandoff() {
	// The empty view keeps its message in memory, because it can carry files. A
	// hand-off stores its message in localStorage, so a new tab can read it.
	const fromEmptyView = consumePendingAssistantAgentMessage(props.threadId);
	const fromHandoff = consumePendingFirstMessage(props.threadId);
	const firstMessage = firstMessageOf(fromEmptyView, fromHandoff);
	// The handed-off workflow shows as a composer chip, so the user sees it and can remove it.
	const workflowChip = getPendingWorkflowAttachment(props.threadId) ?? undefined;
	const draft = getPendingComposerDraft(props.threadId);
	const nodes = consumePendingDraftAttachment(props.threadId);
	const context = fromHandoff?.context ?? getPendingHandoffContext(props.threadId) ?? undefined;
	const references: InstanceAiAttachment[] = firstMessage?.references ?? [];
	return {
		firstMessage,
		draft,
		nodes,
		context,
		references,
		workflowChip,
		// The preview opens the handed-off workflow before the first message.
		workflow:
			references.find(
				(reference): reference is InstanceAiWorkflowAttachment => reference.type === 'workflow',
			) ?? workflowChip,
	};
}

const agentConfig = computed<AgentJsonConfig>(() => ({
	name: identity.name.value,
	model: '',
	instructions: '',
}));

/** The Assistant reads the same request fields as from its current runtime. */
function clientContext(): Record<string, unknown> {
	return {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		...(rootStore.pushRef ? { pushRef: rootStore.pushRef } : {}),
		browserUseAvailable: settingsStore.isBrowserUseAvailable,
		...(pendingReferences.length > 0 ? { attachments: pendingReferences } : {}),
		...(pendingHandoffContext ? { context: pendingHandoffContext } : {}),
		// The server binds the subject on the first turn. Until then, every send carries it.
		...(launch?.subject && isNewSession.value ? { subject: launch.subject } : {}),
		...threadArtifactsContext(),
	};
}

/**
 * The agent sees the open tabs, not every artifact the thread produced. Until the
 * stored tabs load, the default tabs can still hold closed ones, so send none.
 */
function threadArtifactsContext(): Record<string, unknown> {
	if (!preview.tabsLoaded.value) return {};
	const activeId = preview.isPreviewVisible.value ? preview.activeTabId.value : undefined;
	const threadArtifacts = buildThreadArtifactsContext(
		thread.producedArtifacts.values(),
		activeId,
		preview.openTabs.value.filter(isSavedArtifactTab),
		createDisplayedExecutionReader(thread.artifactTurns, thread.getRememberedManualExecution),
	);
	return threadArtifacts ? { threadArtifacts } : {};
}

/** The references go with the first message, so a retry of a refused send keeps them. */
function onMessageAccepted({ clientContext }: { clientContext?: Record<string, unknown> }): void {
	// Tracked on acceptance, like the current runtime, so refused sends don't inflate the count.
	// The sent context has the references and the nodes that the composer chips added.
	const nodeCount = countSentNodes(clientContext);
	if (nodeCount > 0) {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
			node_count: nodeCount,
			runtime: 'agents',
		});
	}
	// A mentioned workflow shows only now that the message is sent, not when it
	// was picked. The first mention is the one shown, as on the current runtime.
	const mentioned = mentions.firstSentMentionedWorkflow(
		readMessageReferences(clientContext?.attachments),
	);
	if (mentioned) {
		preview.openTab({ id: mentioned.id, type: 'workflow', name: mentioned.name, icon: 'workflow' });
	}
	pendingReferences = [];
	pendingHandoffContext = undefined;
}

/** The resources that a sent message shows: the ones its client context attaches. */
function messageReferences(context: Record<string, unknown> | undefined): unknown[] {
	return readMessageReferences(context?.attachments);
}

const panel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('panel');

provide(
	ASSISTANT_PREFERENCE_CARDS,
	useAssistantPreferenceCards({
		threadId: props.threadId,
		projectId: props.projectId,
		messages: () => panel.value?.messages ?? [],
	}),
);

// --- Credits ---
// The InstanceAiView parent loads the balance, and a push event keeps it current.
const creditsStore = useAssistantCreditsStore();
const creditBanner = useCreditWarningBanner(() => creditsStore.isLowCredits);
const { goToUpgrade } = usePageRedirectionHelper();

/**
 * The server refuses a turn when no credits are left. The composer is disabled
 * then, and this also refuses host sends, such as a hand-off or Fix with AI.
 */
function assertCreditsAvailable(): void {
	if (creditsStore.isOutOfCredits) throw new Error('No Assistant credits are left');
}

const trace = useAssistantAgentTrace({
	threadId: props.threadId,
	messages: () => panel.value?.messages ?? [],
});

const feedback = useAssistantAgentFeedback({
	threadId: props.threadId,
	messages: () => panel.value?.messages ?? [],
});

const turnTelemetry = useAssistantAgentTurnTelemetry({
	threadId: props.threadId,
	isStreaming: () => panel.value?.isStreaming ?? false,
	isStreamAttached: () => panel.value?.isStreamAttached ?? false,
	isSubmitting: () => panel.value?.isSubmitting ?? false,
	hasOpenInteraction: () => panel.value?.hasOpenInteraction ?? false,
});

function onMessageSending(message: AssistantAgentSendingMessage): void {
	mentions.close();
	const sent = readMessageReferences(message.clientContext?.attachments);
	turnTelemetry.trackSubmit(messageTelemetry.trackSend(message, mentions.sentMentionCounts(sent)));
}

function onStreamEvent(event: AgentSseEvent): void {
	trace.recordEvent(event);
	turnTelemetry.handleStreamEvent(event);
	workflowDrafts.handleStreamEvent(event);
}

const setupSavedTelemetry = useAssistantAgentSetupSavedTelemetry({
	threadId: props.threadId,
	messages: () => panel.value?.messages ?? [],
});
provide(ASSISTANT_AGENT_SETUP_SAVED, setupSavedTelemetry.expectResult);

watch(panel, (current) => {
	if (!current) return;
	if (handoff.workflowChip) {
		const { chip, clientContextPatch } = toMentionComposerAttachment(handoff.workflowChip);
		current.addComposerAttachment(chip, clientContextPatch);
	}
	if (handoff.firstMessage) {
		messageTelemetry.expectHostSend(handoff.firstMessage);
		current.sendMessageFromOutside(handoff.firstMessage.text, handoff.firstMessage.files);
	} else if (handoff.draft) {
		messageTelemetry.setPrefill(handoff.draft);
		current.setDraft(handoff.draft.text);
	}
});

/** The server has the thread now, so drop what only a new thread needs. */
function finishLaunch(): void {
	clearPendingWorkflowAttachment(props.threadId);
	clearPendingComposerDraft(props.threadId);
	clearPendingHandoffContext(props.threadId);
	clearAssistantAgentLaunch(props.threadId);
}

function onSessionCreated(): void {
	isNewSession.value = false;
	finishLaunch();
	// The thread exists once the server accepts its first message. Show it in the lists
	// now, not only after the first reply ends.
	void threadsStore.loadThread(props.threadId, firstUserMessageText());
	void agentTargets.refresh();
}

/** The first message that the user sent in this thread, as the panel shows it. */
function firstUserMessageText(): string | undefined {
	return panel.value?.messages.find((message) => message.role === 'user')?.content || undefined;
}

// A finished turn can add the thread to the lists, or give it a title.
let wasStreaming = false;
function onStreamingChange(streaming: boolean): void {
	if (wasStreaming && !streaming) {
		void threadsStore.fetchRecent();
		// The builder tools bind the agents that the turn built or edited.
		void agentTargets.refresh();
	}
	wasStreaming = streaming;
}

// --- Artifacts ---
const agentTargets = useAssistantAgentTargets({
	threadId: props.threadId,
	canLoad: () => !isNewSession.value,
});
void agentTargets.refresh();
provideArtifactAgentTargets(agentTargets.agentTargets);
// Set from the preview tabs below, which need the thread first.
const activeArtifactId = ref<string>();

// The preview shows the subject of a new thread until the server has its bindings, which the
// first message writes. Only a saved resource: a pending one needs a thread that the server knows.
// The MCP server subject has no pending state, so the check narrows the union first.
const launchSubject =
	launch?.subject && 'pending' in launch.subject && launch.subject.pending
		? undefined
		: launch?.subject;
const projectAndName = ({ projectId, name }: { projectId: string; name?: string }) => ({
	projectId,
	...(name ? { name } : {}),
});

// The agent of the launch subject. The server state replaces it once it loads.
const launchAgentTargets: AssistantAgentTargetsState | null =
	launchSubject?.type === 'agent'
		? {
				bound: { agentId: launchSubject.id, ...projectAndName(launchSubject) },
				pending: null,
				targets: [],
				previewSession: null,
			}
		: null;

// The Agent Builder panel attaches its agent to each message it sends, so the
// agent that the thread builds is not a reference that the user chose.
const threadAgentIds = computed(() => {
	const targets = agentTargets.state.value ?? launchAgentTargets;
	return new Set([targets?.bound?.agentId, targets?.pending?.agentId].filter(isString));
});

/** The references that a user message shows, without the agent of the thread. */
function shownReferences(message: ChatMessage): InstanceAiResourceAttachment[] {
	return readMessageReferences(message.references).filter(
		(reference) => reference.type !== 'agent' || !threadAgentIds.value.has(reference.id),
	);
}

// The apps of the thread metadata, and the app of the launch subject.
const appTargets = computed(() => {
	const targets = getAppTargetsFromThreadMetadata(
		threadsStore.threadsById.get(props.threadId)?.metadata,
	);
	if (launchSubject?.type !== 'app') return targets;
	if (targets.some(({ appId }) => appId === launchSubject.id)) return targets;
	return [...targets, { appId: launchSubject.id, ...projectAndName(launchSubject) }];
});
// An app page opens its chat with `?appId=`. Only an app of this thread opens.
const requestedAppId = computed(() => {
	const appId = route.query[INSTANCE_AI_APP_ID_QUERY];
	return typeof appId === 'string' && appTargets.value.some((target) => target.appId === appId)
		? appId
		: undefined;
});

const thread = useAssistantArtifactThread({
	threadId: props.threadId,
	projectId: props.projectId,
	messages: () => panel.value?.messages ?? [],
	isStreaming: () => panel.value?.isStreaming ?? false,
	isAwaitingUser: () => panel.value?.isAwaitingUserAnswer ?? false,
	// Until the chat mounts, its history is not known, so a past build does not open the preview.
	isLoadingHistory: () => panel.value?.isLoadingHistory ?? true,
	// The hand-off context, for example a credential to set up, goes with this message only.
	sendMessage: (text, authorship, handoffContext) => {
		messageTelemetry.expectHostSend({ text, authorship });
		panel.value?.sendMessageFromOutside(
			text,
			[],
			handoffContext ? { context: handoffContext } : undefined,
		);
	},
	pendingWorkflowAttachment: handoff.workflow,
	agentTargets: () => agentTargets.state.value ?? launchAgentTargets,
	appTargets: () => appTargets.value,
	activeArtifactId: () => activeArtifactId.value,
});
provideArtifactThread(thread);

const interactionExtensions = [
	assistantConfirmationExtension,
	assistantAnsweredQuestionsExtension,
	assistantAutoApprovalExtension,
	assistantPreferenceCardExtension,
	...assistantHostEventExtensions,
	assistantToolResultTableExtension,
	assistantCodeToolResultExtension,
	assistantSharedFilesExtension,
	provideAssistantArtifactCards(thread),
];

// Experiment cleanup (137_instance_ai_draft_workflow_preview)
const isAwaitingUser = () => panel.value?.isAwaitingUserAnswer ?? false;
// A run that waits on a card can end its stream, but the build is not over.
const isAgentRunning = () =>
	(panel.value?.isStreaming || panel.value?.isSubmitting || isAwaitingUser()) ?? false;
const workflowDrafts = useAssistantWorkflowDrafts({
	liveRunId: () => thread.artifactTurns.find((turn) => turn.isLive)?.id,
});
const draftPreview = useDraftWorkflowPreview({
	threadId: () => props.threadId,
	turns: () => thread.artifactTurns,
	workflowDrafts: () => workflowDrafts.drafts.value,
	dismissWorkflowDrafts: workflowDrafts.dismiss,
	isRunning: isAgentRunning,
	isAwaitingUser,
	isAwaitingApproval: () => panel.value?.isAwaitingUserApproval ?? false,
});
// The tool steps of the chat name what a node lookup or a workflow source write works on.
const { getSpecificToolLabel } = useToolLabel();
provide(AGENT_TOOL_STEP_LABEL_KEY, (toolName, input) =>
	getSpecificToolLabel(toolName, isRecord(input) ? input : undefined),
);
// EOF Experiment cleanup

const preview = useCanvasPreview({
	thread,
	threadId: () => props.threadId,
	initialAgentId: () => launchAgentTargets?.bound?.agentId,
	initialAppId: () => requestedAppId.value ?? appTargets.value[0]?.appId,
	tabsStorage: {
		// A new thread has no stored tabs, and the server does not know it before its first message.
		load: async () =>
			isNewThread
				? null
				: (await fetchAssistantAgentThreadTabs(rootStore.restApiContext, props.threadId)).state,
		save: async (state) => {
			await saveAssistantAgentThreadTabs(rootStore.restApiContext, props.threadId, state);
		},
	},
	...draftPreview.canvasOptions,
});

const canvasRunState = draftPreview.useCanvasRunState(preview);
provide('openWorkflowPreview', preview.openWorkflowPreview);
provide('openDataTablePreview', preview.openDataTablePreview);
provide('openAppPreview', preview.openAppPreview);
provide('openSkillPreview', preview.openSkillPreview);
provide('openAgentPreview', preview.openAgentPreview);
provide('openAgentChatPreview', openAgentChatPreview);
provideOpenResource({
	projectId: () => props.projectId,
	// A resource opened before the stored tabs load replaces them, and the history can open
	// tabs for past builds, so the item waits for both.
	isAvailable: () => preview.tabsLoaded.value && !thread.isHydratingThread,
	excludedTabs: () => preview.openTabs.value.filter(isArtifactTab),
	open: preview.openTab,
});
// Links to the resources of the thread open in the preview, as in the current Assistant.
provide(AGENT_CHAT_MARKDOWN_HOST_KEY, {
	resources: () => [...thread.resourceNameIndex.values()],
	linkableResources: () => [...thread.producedArtifacts.values()],
	artifactLinks: useArtifactLinks(),
});
watch(
	[requestedAppId, () => preview.tabsLoaded.value],
	([appId, tabsLoaded]) => {
		if (appId && tabsLoaded) preview.openAppPreview(appId);
	},
	{ immediate: true },
);

const openSkillTabs = computed(() => preview.openTabs.value.filter((tab) => tab.type === 'skill'));

// --- Mentions ---
const mentionPicker =
	useTemplateRef<InstanceType<typeof AssistantAtMentionPicker>>('mentionPicker');
const mentionArtifacts = computed<WorkflowArtifactReference[]>(() =>
	[...thread.producedArtifacts.values()]
		.filter((artifact) => artifact.type === 'workflow' && artifact.archived !== true)
		.map(({ id, name }) => ({ id, name })),
);
const mentionActiveWorkflowId = computed(() => {
	const activeId = activeArtifactId.value;
	return activeId && thread.producedArtifacts.get(activeId)?.type === 'workflow'
		? activeId
		: undefined;
});
const mentions = useAssistantAgentMentions({
	threadId: props.threadId,
	projectId: () => props.projectId,
	panel: () => panel.value,
	picker: () => mentionPicker.value,
	artifacts: () => mentionArtifacts.value,
	reservedAttachmentCount: () => pendingReferences.length,
	isBlocked: () => panel.value?.isSubmitting ?? true,
});
// The picker opens over the whole composer, like the menu of the current runtime.
const mentionInput = computed(() =>
	mentions.menuOpen.value ? panel.value?.getInputElement() : null,
);
const mentionReference = computed(
	() => mentionInput.value?.closest<HTMLElement>('[data-testid="chat-input"]') ?? null,
);

watch(
	[() => preview.activeTabId.value, () => preview.isPreviewVisible.value],
	([tabId, previewVisible]) => {
		const isDraft = preview.openTabs.value.some(
			(tab) => tab.id === tabId && isArtifactTab(tab) && tab.draft,
		);
		activeArtifactId.value = previewVisible && !isDraft ? tabId : undefined;
	},
	{ immediate: true },
);

// --- Fix-with-AI offer (failure data emitted by the workflow preview) ---
const failedRun = ref<WorkflowFailuresReport | null>(null);
const dismissedExecutionId = ref<string | null>(null);

const activeFixWithAiOffer = computed(() => {
	const run = failedRun.value;
	if (!run || run.executionId === dismissedExecutionId.value) return null;
	if (panel.value?.isBusy) return null;
	// The send would be refused, so the offer comes back once credits do.
	if (creditsStore.isOutOfCredits) return null;
	return { ...run, workflowName: thread.producedArtifacts.get(run.workflowId)?.name };
});

function handleWorkflowFailures(report: WorkflowFailuresReport): void {
	failedRun.value = report;
}

function handleWorkflowSucceeded(workflowId: string): void {
	if (failedRun.value?.workflowId === workflowId) failedRun.value = null;
}

function dismissFixWithAiOffer(): void {
	const offer = activeFixWithAiOffer.value;
	if (offer) dismissedExecutionId.value = offer.executionId;
}

async function handleFixWithAiFromOffer(): Promise<void> {
	const offer = activeFixWithAiOffer.value;
	if (!offer || !panel.value) return;
	// Hidden before the send settles, so a second click cannot send it twice.
	dismissedExecutionId.value = offer.executionId;
	// Sent past the composer, so the user's draft and staged chips stay. Names the
	// failed run, so the agent reads that execution instead of guessing from the
	// list. A run that n8n did not save has no list entry.
	const text = buildFixWithAiPrompt({ workflowName: offer.workflowName, errors: offer.errors });
	messageTelemetry.expectHostSend({
		text,
		authorship: { kind: 'prefill', prefillType: 'handoff_fix_with_ai' },
	});
	const result = await panel.value.sendHostMessage(text, {
		attachments: [
			{
				type: 'workflow',
				id: offer.workflowId,
				...(offer.workflowName ? { name: offer.workflowName } : {}),
				executionId: offer.executionId,
			},
		],
	});
	// A refused send leaves the user nothing to retry with, so offer it again.
	if (result !== 'sent' && dismissedExecutionId.value === offer.executionId) {
		dismissedExecutionId.value = null;
	}
}

// --- Agent preview ---
// The test chat of the agent preview docks over the chat column.
const isAgentTestDockOpen = ref(false);
const agentPreviewChatTarget = useTemplateRef<HTMLElement>('agentPreviewChatTarget');

function openAgentChatPreview(agentId: string, projectId: string): boolean {
	preview.openAgentPreview(agentId, projectId);
	isAgentTestDockOpen.value = true;
	return true;
}

watch(
	[() => preview.activeTabId.value, () => preview.isPreviewVisible.value],
	([tabId, visible], [previousTabId]) => {
		if (tabId !== previousTabId || !visible) isAgentTestDockOpen.value = false;
	},
	{ flush: 'sync' },
);

function handleAgentTestDockOpenChange(open: boolean): void {
	const wasOpen = isAgentTestDockOpen.value;
	isAgentTestDockOpen.value = open;
	if (open) {
		isPreviewExpanded.value = false;
	} else if (wasOpen) {
		panel.value?.focusInput();
	}
}

// The session of the last hand-off. The turn stores it only after the message
// is sent, so the stored session is older until the targets load again.
const lastHandoffSession = ref<{ agentId: string; threadId: string }>();

/** The test chat session that the preview shows: the last hand-off, else the stored one. */
const activeAgentPreviewSessionId = computed(() => {
	const agentId = preview.activeAgentId.value;
	// Check the agent of each session, so a hand-off for one agent keeps the stored session of another.
	return [lastHandoffSession.value, agentTargets.state.value?.previewSession].find(
		(session) => session?.agentId === agentId,
	)?.threadId;
});

/** The user asks the Assistant about a test chat of the agent preview. */
function handleAgentPreviewAssistantHandoff(params: AgentTestHandoffParams): void {
	if (
		params.agentId !== preview.activeAgentId.value ||
		params.projectId !== preview.activeAgentProjectId.value
	) {
		return;
	}
	const current = panel.value;
	if (!current) return;
	if (current.isDirty()) {
		toast.showMessage({
			title: i18n.baseText('instanceAi.input.finishDraftBeforeHandoff.title'),
			message: i18n.baseText('instanceAi.input.finishDraftBeforeHandoff.message'),
			type: 'warning',
		});
		return;
	}

	// The request now belongs to the Assistant composer, so close the test chat.
	isAgentTestDockOpen.value = false;
	const context = buildInstanceAiAgentPreviewHandoffContext(params);
	if (context.source !== 'agent-preview') return;
	const label = formatAgentPreviewContextLabel(
		context,
		(key, options) => i18n.baseText(key, options),
		thread.producedArtifacts.get(context.agentId)?.name,
	);
	lastHandoffSession.value = { agentId: context.agentId, threadId: context.threadId };
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

// --- Header ---
// As in the sidebar: the generated title, else the first user message until the title
// arrives. The panel has the message before the thread summary loads. A thread with no
// messages has no title, so the header does not flash the placeholder.
const threadTitle = computed(() => {
	const thread = threadsStore.threadsById.get(props.threadId);
	const firstMessage = thread?.firstMessage ?? firstUserMessageText();
	if (!thread?.title && !firstMessage) return undefined;
	return formatThreadTitle(
		{ title: thread?.title ?? null, firstMessage },
		i18n.baseText('commandBar.instanceAi.newThread'),
	);
});

function startNewThread(): void {
	void router.push({ name: INSTANCE_AI_VIEW });
}

function viewSessionTrace(): void {
	void router.push({
		name: INSTANCE_AI_THREAD_SESSION_VIEW,
		params: { threadId: props.threadId },
	});
}

// --- Layout ---
const threadArea = useTemplateRef<HTMLElement>('threadArea');
const { width: threadAreaWidth } = useElementSize(threadArea);
const isPreviewExpanded = ref(false);

function togglePreviewExpanded(): void {
	isPreviewExpanded.value = !isPreviewExpanded.value;
	if (isPreviewExpanded.value) isAgentTestDockOpen.value = false;
}

const isArtifactsPanelInLayout = computed(
	() => threadAreaWidth.value >= MIN_WIDTH_FOR_PINNED_ARTIFACTS_PANEL,
);
// With the preview open, the chat is too narrow to keep the panel beside it.
const isArtifactsPanelPinned = computed(
	() => isArtifactsPanelInLayout.value && !preview.isPreviewVisible.value,
);
// A loading thread shows the panel too, so its loading state shows in place.
const canShowArtifactsPanel = computed(
	() =>
		thread.artifactTurns.length > 0 ||
		preview.openTabs.value.length > 0 ||
		thread.isHydratingThread,
);
const {
	showArtifactsPanel,
	artifactsPanelToggleLabel,
	toggleArtifactsPanel,
	closeArtifactsPanelOverChat,
} = useArtifactsPanelToggle({
	isInLayout: () => isArtifactsPanelInLayout.value,
	canShow: () => canShowArtifactsPanel.value,
	isPreviewVisible: () => preview.isPreviewVisible.value,
	canRevealOverPreview: true,
	panelSlot: useTemplateRef<HTMLElement>('artifactsPanelSlot'),
	toggleSelector: '[data-test-id="assistant-agent-artifacts-panel-toggle"]',
});
// A pick from the panel over the chat opens a tab, so the panel has done its job.
watch(() => preview.activeTabId.value, closeArtifactsPanelOverChat);

const {
	previewMinWidth,
	previewMaxWidth,
	previewPanelWidth,
	isPreviewResizeEnabled,
	handlePreviewResize,
} = usePreviewPanelWidth({ threadAreaWidth, isExpanded: () => isPreviewExpanded.value });

// --- Panel motion ---
// Panels appear in place while a thread loads, so a restored layout does not animate.
const panelTransitionGate = useTransitionGate({ isBlocked: () => thread.isHydratingThread });
const arePanelTransitionsEnabled = panelTransitionGate.isEnabled;
// While the preview opens or closes, the artifacts panel only fades, so the motions do not compete.
const isPreviewPanelTransitioning = ref(false);
const artifactsPanelTransitionName = computed(() => {
	if (isPreviewPanelTransitioning.value) return 'assistant-agent-artifacts-panel-fade';
	// Over the chat, the panel opens from the list button like a dropdown.
	return isArtifactsPanelPinned.value
		? 'assistant-agent-artifacts-panel-slide'
		: 'assistant-agent-artifacts-panel-dropdown';
});
const workflowPreview =
	useTemplateRef<InstanceType<typeof InstanceAiWorkflowPreview>>('workflowPreview');

watch(
	() => preview.isPreviewVisible.value,
	(visible, wasVisible) => {
		if (visible !== wasVisible)
			isPreviewPanelTransitioning.value = arePanelTransitionsEnabled.value;
	},
	{ flush: 'sync' },
);
watch(
	() => thread.isHydratingThread,
	(isHydrating) => {
		if (isHydrating) panelTransitionGate.suppress();
		else panelTransitionGate.suppressUntilStableRender();
	},
);
onMounted(() => panelTransitionGate.enableAfterStableRender());

function onPreviewPanelAfterEnter(): void {
	isPreviewPanelTransitioning.value = false;
	// The canvas fitted its view while the panel was still narrow, so it fits again at full width.
	workflowPreview.value?.requestFitView();
}

function onPreviewPanelAfterLeave(): void {
	isPreviewPanelTransitioning.value = false;
	isPreviewExpanded.value = false;
}

// --- Canvas nodes ---
// "Add to chat" on the preview canvas stages the nodes in the Assistant store. Move them to
// the composer of this chat, one chip for each workflow, so they go with the next message.
const instanceAiStore = useInstanceAiStore();
// Canvas nodes from a hand-off go to the composer like nodes added in this thread.
if (handoff.nodes) instanceAiStore.stageNodeSets(handoff.nodes.workflowId, handoff.nodes.sets);
watch(
	[panel, () => instanceAiStore.pendingComposerAttachments],
	([current, pending]) => {
		if (!current || pending.length === 0) return;
		for (const attachment of instanceAiStore.consumePendingAttachments()) {
			if (attachment.type === 'element') {
				const { chip, clientContextPatch } = toElementComposerAttachment(attachment);
				current.addComposerAttachment(chip, clientContextPatch);
				continue;
			}
			if (attachment.type !== 'nodes') continue;
			const { chip, clientContextPatch } = toNodesComposerAttachment(
				attachment,
				current.composerAttachments,
			);
			current.addComposerAttachment(chip, clientContextPatch);
		}
	},
	{ immediate: true },
);

watch(
	() => stagedElementAppId(panel.value?.composerAttachments ?? []),
	(appId) => instanceAiStore.setComposerElementAppId(appId),
	{ immediate: true },
);
onBeforeUnmount(() => instanceAiStore.setComposerElementAppId(null));

// The canvas asks for the composer after it stages nodes: show the chat and focus its input.
watch(
	() => instanceAiStore.composerFocusRequest,
	() => {
		isPreviewExpanded.value = false;
		panel.value?.focusInput();
	},
);

/** The staged nodes chips. The panel shows the other chips as cards. */
const stagedNodes = computed(() =>
	(panel.value?.composerAttachments ?? []).flatMap((staged) => {
		const nodes = readNodesAttachment(staged);
		return nodes ? [{ id: staged.chip.id, nodes }] : [];
	}),
);

/** A removed handoff workflow must not come back when the page reloads. */
function onComposerChipRemoved(chipId: string): void {
	mentions.handleChipRemoved(chipId);
	if (handoff.workflowChip && chipId === mentionChipId(handoff.workflowChip)) {
		clearPendingWorkflowAttachment(props.threadId);
	}
}

/** The user removed some of the nodes from a chip. */
function updateStagedNodes(attachment: InstanceAiNodesAttachment): void {
	const { chip, clientContextPatch } = toNodesComposerAttachment(attachment, []);
	panel.value?.addComposerAttachment(chip, clientContextPatch);
}
</script>

<template>
	<div ref="threadArea" :class="$style.container" data-test-id="assistant-agent-thread-view">
		<div ref="agentPreviewChatTarget" :class="$style.chatArea">
			<InstanceAiViewHeader
				:title="threadTitle"
				:thread-id="props.threadId"
				:thread-credits-used="threadsStore.threadCreditsUsed(props.threadId)"
				:inert="isAgentTestDockOpen || undefined"
				:aria-hidden="isAgentTestDockOpen || undefined"
			>
				<template #actions>
					<!-- A debug tool, so it shows with the debug flag only. A new thread has no turns
					to show until its first message starts the session. -->
					<N8nTooltip
						v-if="trace.isEnabled && !isNewSession"
						:content="i18n.baseText('agents.builder.preview.viewSession')"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="list-tree"
							variant="ghost"
							size="small"
							icon-size="large"
							:aria-label="i18n.baseText('agents.builder.preview.viewSession')"
							data-test-id="assistant-agent-view-session"
							@click="viewSessionTrace"
						/>
					</N8nTooltip>
					<N8nTooltip
						:content="i18n.baseText('instanceAi.thread.new')"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="message-circle-plus"
							variant="ghost"
							size="small"
							icon-size="large"
							:aria-label="i18n.baseText('instanceAi.thread.new')"
							data-test-id="assistant-agent-new-thread"
							@click="startNewThread"
						/>
					</N8nTooltip>
					<N8nActionDropdown
						v-if="trace.isEnabled"
						:items="trace.menuItems"
						placement="bottom-end"
						data-test-id="assistant-agent-trace-menu"
						@select="trace.runAction"
					>
						<template #activator>
							<N8nIconButton
								icon="bug"
								variant="ghost"
								size="small"
								icon-size="large"
								:aria-label="i18n.baseText('instanceAi.debug.title')"
								data-test-id="assistant-agent-trace-button"
							/>
						</template>
					</N8nActionDropdown>
					<N8nTooltip
						v-if="canShowArtifactsPanel"
						:content="artifactsPanelToggleLabel"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="list"
							variant="ghost"
							size="small"
							icon-size="large"
							data-test-id="assistant-agent-artifacts-panel-toggle"
							:aria-label="artifactsPanelToggleLabel"
							:aria-pressed="showArtifactsPanel"
							@click="toggleArtifactsPanel"
						/>
					</N8nTooltip>
					<!-- With no tab open, the "+" menu of the composer opens a resource. -->
					<N8nTooltip
						v-if="preview.openTabs.value.length > 0 && !preview.isPreviewVisible.value"
						:content="previewToggleLabel"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="panel-right"
							variant="ghost"
							size="small"
							icon-size="large"
							data-test-id="assistant-agent-preview-toggle"
							:aria-label="previewToggleLabel"
							:aria-pressed="false"
							@click="togglePreview"
						/>
					</N8nTooltip>
				</template>
			</InstanceAiViewHeader>

			<div
				:class="[
					$style.contentArea,
					{
						[$style.contentAreaWithPinnedArtifacts]: showArtifactsPanel && isArtifactsPanelPinned,
						[$style.contentAreaAnimated]: arePanelTransitionsEnabled,
					},
				]"
				:inert="isAgentTestDockOpen || undefined"
				:aria-hidden="isAgentTestDockOpen || undefined"
			>
				<div
					:class="$style.chatColumn"
					@keydown.capture="mentions.handleKeydown"
					@pointerdown.capture="mentions.handlePointerDown"
					@click.capture="mentions.handleCaretMove"
					@keyup.capture="mentions.handleCaretMove"
					@select.capture="mentions.handleCaretMove"
				>
					<AgentChatPanel
						ref="panel"
						:project-id="props.projectId"
						:agent-id="ASSISTANT_AGENT_ID"
						mode="inline"
						:continue-session-id="props.threadId"
						:new-session="isNewSession"
						:agent-config="agentConfig"
						empty-state-icon="n8n-assistant"
						:accepted-mime-types="ASSISTANT_AGENT_ACCEPTED_MIME_TYPES"
						agent-status="production"
						:connected-triggers="[]"
						channel="system"
						:thinking-label="draftPreview.thinkingWord.value"
						:stopped-label="i18n.baseText('instanceAi.agentTree.stoppedByUser')"
						:client-context="clientContext"
						:message-references="messageReferences"
						:input-draft="mentions.draft.value"
						:interaction-extensions="interactionExtensions"
						:show-attach-button="false"
						:max-length="EXTENDED_PROMPT_MAX_LENGTH"
						:disabled="creditsStore.isOutOfCredits"
						:before-send="assertCreditsAvailable"
						@stream-event="onStreamEvent"
						@session-created="onSessionCreated"
						@message-sending="onMessageSending"
						@draft-cleared="messageTelemetry.setPrefill(null)"
						@message-accepted="onMessageAccepted"
						@update:streaming="onStreamingChange"
						@update:input-draft="mentions.handleTextChange"
						@composer-attachment-removed="onComposerChipRemoved"
					>
						<!-- Passed only with an offer, so the chat keeps its empty state and spacing. -->
						<template v-if="activeFixWithAiOffer" #inline-offers>
							<InstanceAiFixWithAiPanel
								:node-name="activeFixWithAiOffer.errors[0].nodeName"
								:error-message="activeFixWithAiOffer.errors[0].errorMessage"
								:failed-count="activeFixWithAiOffer.errors.length"
								@fix-with-ai="handleFixWithAiFromOffer"
								@dismiss="dismissFixWithAiOffer"
							/>
						</template>
						<template #above-input>
							<LimitedModeNotice />
							<CreditWarningBanner
								v-if="creditsStore.isOutOfCredits || creditBanner.visible.value"
								:credits-remaining="creditsStore.creditsRemaining"
								:credits-quota="creditsStore.creditsQuota"
								:message="
									creditsStore.isOutOfCredits
										? i18n.baseText('instanceAi.error.outOfCredits.title')
										: undefined
								"
								:dismissible="!creditsStore.isOutOfCredits"
								@upgrade-click="goToUpgrade('instance-ai', 'upgrade-instance-ai')"
								@dismiss="creditBanner.dismiss()"
							/>
						</template>
						<template #message-actions="{ executionId }">
							<N8nChatRating
								v-if="feedback.isRateable(executionId)"
								:rating="feedback.ratingOf(executionId)"
								@rate="feedback.rate(executionId, $event)"
							/>
						</template>
						<!-- Nodes chips can drop single nodes, so they are not cards. -->
						<template v-if="stagedNodes.length > 0" #composer-attachments>
							<NodesAttachmentChips
								v-for="{ id, nodes } in stagedNodes"
								:key="id"
								:attachment="nodes"
								is-removable
								@update:attachment="updateStagedNodes"
								@remove-all="mentions.handleChipRemoved(id)"
							/>
						</template>
						<template #user-message-references="{ message }">
							<AttachmentPreview
								v-for="(reference, index) in shownReferences(message)"
								:key="index"
								:attachment="reference"
								:is-removable="false"
							/>
						</template>
						<template v-if="mentions.isEnabled.value" #composer-actions>
							<AssistantAtMentionPicker
								ref="mentionPicker"
								:model-value="mentions.menuOpen.value"
								:query="mentions.query.value"
								:project-id="props.projectId"
								:artifacts="mentionArtifacts"
								:active-workflow-id="mentionActiveWorkflowId"
								:excluded-keys="mentions.excludedKeys.value"
								:excluded-workflow-ids="mentions.excludedWorkflowIds.value"
								:input-element="mentionInput"
								:reference="mentionReference"
								:disabled="!mentions.canUseMentions.value"
								@update:model-value="mentions.handleMenuOpenChange"
								@select="mentions.handleSelect"
								@empty-search="mentions.handleEmptySearch"
							/>
						</template>
						<!-- The Assistant "+" menu replaces the attach button: files, connectors and browser use. -->
						<template #footer-start="{ disabled }">
							<InstanceAiInputMenu
								:disabled="disabled"
								:project-id="props.projectId"
								@attach-files="panel?.openFilePicker()"
							/>
							<ApprovalModeSelector :thread-id="props.threadId" />
						</template>
					</AgentChatPanel>
				</div>

				<Transition :name="artifactsPanelTransitionName" :css="arePanelTransitionsEnabled">
					<div
						v-if="showArtifactsPanel"
						ref="artifactsPanelSlot"
						:class="[
							$style.artifactsPanelSlot,
							{ [$style.artifactsPanelSlotOverlay]: !isArtifactsPanelPinned },
						]"
						data-test-id="assistant-agent-artifacts-panel"
					>
						<InstanceAiArtifactsPanel />
					</div>
				</Transition>
			</div>
		</div>

		<Transition
			name="assistant-agent-preview-panel"
			:css="arePanelTransitionsEnabled"
			@after-enter="onPreviewPanelAfterEnter"
			@after-leave="onPreviewPanelAfterLeave"
		>
			<div
				v-show="preview.isPreviewVisible.value"
				:class="[$style.canvasArea, { [$style.canvasAreaExpanded]: isPreviewExpanded }]"
				:style="isPreviewExpanded ? undefined : { width: `${previewPanelWidth}px` }"
				data-test-id="assistant-agent-preview-panel"
			>
				<N8nResizeWrapper
					:width="previewPanelWidth"
					:min-width="previewMinWidth"
					:max-width="previewMaxWidth"
					:supported-directions="['left']"
					:is-resizing-enabled="isPreviewResizeEnabled"
					:grid-size="8"
					@resize="handlePreviewResize"
				>
					<N8nTabsRoot
						:model-value="preview.activeTabId.value"
						orientation="horizontal"
						:class="$style.previewPanel"
						@update:model-value="preview.selectTab"
					>
						<InstanceAiPreviewTabBar
							:tabs="preview.openTabs.value"
							:active-tab-id="preview.activeTabId.value"
							:is-expanded="isPreviewExpanded"
							:preview-toggle-label="previewToggleLabel"
							:project-id="props.projectId"
							@toggle-preview="togglePreview"
							@toggle-expanded="togglePreviewExpanded"
							@close-tab="preview.closeTab"
							@open-tab="preview.openTab"
							@reorder-tab="preview.reorderTab"
						/>
						<div :class="$style.previewContent">
							<InstanceAiWorkflowPreview
								v-if="preview.isPreviewVisible.value && preview.activeWorkflowId.value"
								ref="workflowPreview"
								:key="preview.activeWorkflowId.value"
								:class="$style.previewSlot"
								:workflow-id="preview.activeWorkflowId.value"
								:refresh-key="preview.workflowRefreshKey.value"
								:execution-result="preview.activeWorkflowExecutionResult.value"
								@workflow-failures="handleWorkflowFailures"
								@workflow-succeeded="handleWorkflowSucceeded"
								@workflow-loaded="workflowDrafts.dismiss"
							/>
							<InstanceAiWorkflowDraftPreview
								v-if="preview.isPreviewVisible.value && preview.activeWorkflowDraft.value"
								:key="preview.activeWorkflowDraft.value.filePath"
								:class="$style.previewSlot"
								:draft="preview.activeWorkflowDraft.value"
								:building="isAgentRunning()"
							/>
							<InstanceAiCanvasRunOverlay
								v-if="canvasRunState"
								:state="canvasRunState"
								@focus-chat="panel?.focusOpenInteraction()"
							/>
							<InstanceAiDataTablePreview
								v-if="preview.isPreviewVisible.value && preview.activeDataTableId.value"
								:class="$style.previewSlot"
								:data-table-id="preview.activeDataTableId.value"
								:project-id="preview.activeDataTableProjectId.value"
								:refresh-key="preview.dataTableRefreshKey.value"
							/>
							<InstanceAiAppPreview
								v-if="preview.isPreviewVisible.value && preview.activeApp.value"
								:class="$style.previewSlot"
								:project-id="preview.activeApp.value.projectId"
								:app-id="preview.activeApp.value.id"
								:refresh-key="preview.appRefreshKey.value"
								:assistant-working="preview.isActiveAppInLiveTurn.value"
								@deleted="preview.closeTab"
							/>
							<InstanceAiAgentPreview
								v-if="
									preview.isPreviewVisible.value &&
									preview.activeAgentId.value &&
									preview.activeAgentProjectId.value
								"
								:class="$style.previewSlot"
								:agent-id="preview.activeAgentId.value"
								:project-id="preview.activeAgentProjectId.value"
								:preview-session-id="activeAgentPreviewSessionId"
								:preview-open="isAgentTestDockOpen"
								:preview-chat-target="agentPreviewChatTarget"
								:pending="preview.activeAgentPending.value"
								@preview-open-change="handleAgentTestDockOpenChange"
								@assistant-handoff="handleAgentPreviewAssistantHandoff"
							/>
							<!-- Retain each open skill's draft while another artifact is visible. -->
							<KeepAlive v-for="tab in openSkillTabs" :key="tab.id">
								<InstanceAiSkillPreview
									v-if="preview.isPreviewVisible.value && preview.activeSkillId.value === tab.id"
									:class="$style.previewSlot"
									:skill-id="tab.id"
									:refresh-key="preview.skillRefreshKey.value"
								/>
							</KeepAlive>
						</div>
					</N8nTabsRoot>
				</N8nResizeWrapper>
			</div>
		</Transition>
	</div>
</template>

<style lang="scss" module>
// Registered, so the chat can animate the space that the pinned artifacts panel takes.
@property --agent-chat-reserved-end {
	syntax: '<length>';
	inherits: true;
	initial-value: 0;
}

.container {
	// The timing of the panel motion, as in the current Assistant.
	--assistant-agent-panel-transition-duration: calc(var(--duration--snappy) + 80ms);
	--assistant-agent-panel-transition-easing: var(--easing--ease-in-out);

	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
	min-width: 0;
	height: 100%;
}

.chatArea {
	position: relative;
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.contentArea {
	--assistant-agent-artifacts-panel-width: 280px;

	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
}

// The panel floats over the chat, so the chat scrollbar stays at the edge of the view.
// The chat keeps its messages and its input clear of the panel.
.contentAreaWithPinnedArtifacts {
	--agent-chat-reserved-end: var(--assistant-agent-artifacts-panel-width);
}

// The messages and the input move aside together with the pinned panel.
.contentAreaAnimated {
	transition: --agent-chat-reserved-end var(--assistant-agent-panel-transition-duration)
		var(--assistant-agent-panel-transition-easing);

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}

.chatColumn {
	// No top padding, so the fade of the messages ends at the input, not above it.
	--agent-chat-input-padding: 0 var(--spacing--sm) var(--spacing--xs);

	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.artifactsPanelSlot {
	position: absolute;
	top: 0;
	right: 0;
	z-index: 4;
	display: flex;
	// Only as tall as the panel, so the chat below the panel still scrolls.
	max-height: 100%;
	overflow: hidden;
	// Keeps the transparent right padding of the panel off the chat scrollbar.
	clip-path: inset(0 var(--spacing--2xs) 0 0);
}

// A narrow view shows the panel over the chat with a gap above the input.
.artifactsPanelSlotOverlay {
	max-height: calc(100% - var(--spacing--sm));
}

.canvasArea {
	flex-shrink: 0;
	min-width: 0;
	border-left: var(--border);
}

.canvasAreaExpanded {
	position: absolute;
	inset: 0;
	z-index: 4;
	border-left: none;
	background-color: var(--color--background--light-2);
}

.previewPanel {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.previewContent {
	flex: 1;
	min-height: 0;
	position: relative;
}

.previewSlot {
	position: absolute;
	inset: 0;
}
</style>

<style lang="scss">
// Transitions, not the keyframes of the motion mixins: the mixins file adds all its
// keyframes to this stylesheet, and a transition reverses from where it is.

// The preview opens from the right edge and pushes the chat aside.
.assistant-agent-preview-panel-enter-active,
.assistant-agent-preview-panel-leave-active {
	transition:
		width var(--assistant-agent-panel-transition-duration)
			var(--assistant-agent-panel-transition-easing),
		min-width var(--assistant-agent-panel-transition-duration)
			var(--assistant-agent-panel-transition-easing),
		opacity var(--assistant-agent-panel-transition-duration)
			var(--assistant-agent-panel-transition-easing),
		transform var(--assistant-agent-panel-transition-duration)
			var(--assistant-agent-panel-transition-easing);
	overflow: hidden;

	// Without motion, the panel only fades.
	@media (prefers-reduced-motion: reduce) {
		transition: opacity var(--assistant-agent-panel-transition-duration) linear;
	}
}

.assistant-agent-preview-panel-enter-from,
.assistant-agent-preview-panel-leave-to {
	width: 0 !important;
	min-width: 0 !important;
	opacity: 0;
	transform: translateX(var(--spacing--sm));

	@media (prefers-reduced-motion: reduce) {
		transform: none;
	}
}

// The artifacts panel slides in from the right edge and leaves the same way.
.assistant-agent-artifacts-panel-slide-enter-active,
.assistant-agent-artifacts-panel-slide-leave-active {
	transition:
		opacity var(--assistant-agent-panel-transition-duration) var(--easing--ease-out),
		transform var(--assistant-agent-panel-transition-duration) var(--easing--ease-out);
}

.assistant-agent-artifacts-panel-slide-leave-active {
	pointer-events: none;
}

.assistant-agent-artifacts-panel-slide-enter-from,
.assistant-agent-artifacts-panel-slide-leave-to {
	opacity: 0;
	transform: translateX(100%);
}

// Over the chat, the panel opens from the list button above its top right corner, like a
// dropdown. A transition, so a quick second click reverses it from where it is.
.assistant-agent-artifacts-panel-dropdown-enter-active,
.assistant-agent-artifacts-panel-dropdown-leave-active {
	transform-origin: top right;
	transition:
		opacity var(--duration--snappy) var(--easing--ease-out),
		transform var(--duration--snappy) var(--easing--ease-out);

	@media (prefers-reduced-motion: reduce) {
		transition: opacity var(--duration--snappy) linear;
	}
}

.assistant-agent-artifacts-panel-dropdown-leave-active {
	pointer-events: none;
}

.assistant-agent-artifacts-panel-dropdown-enter-from,
.assistant-agent-artifacts-panel-dropdown-leave-to {
	opacity: 0;
	transform: scale(0.96);

	@media (prefers-reduced-motion: reduce) {
		transform: none;
	}
}

// While the preview opens or closes, and without motion, the artifacts panel only fades.
.assistant-agent-artifacts-panel-fade-enter-active,
.assistant-agent-artifacts-panel-fade-leave-active {
	transition: opacity var(--assistant-agent-panel-transition-duration) linear;
}

.assistant-agent-artifacts-panel-fade-leave-active {
	pointer-events: none;
}

.assistant-agent-artifacts-panel-fade-enter-from,
.assistant-agent-artifacts-panel-fade-leave-to {
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	.assistant-agent-artifacts-panel-slide-enter-active,
	.assistant-agent-artifacts-panel-slide-leave-active {
		transition: opacity var(--assistant-agent-panel-transition-duration) linear;
	}

	.assistant-agent-artifacts-panel-slide-enter-from,
	.assistant-agent-artifacts-panel-slide-leave-to {
		transform: none;
	}
}
</style>
