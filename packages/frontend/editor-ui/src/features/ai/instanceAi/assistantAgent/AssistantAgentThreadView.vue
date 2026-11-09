<script setup lang="ts">
import type {
	AgentJsonConfig,
	InstanceAiAttachment,
	InstanceAiHandoffContext,
	InstanceAiNodesAttachment,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionDropdown,
	N8nIconButton,
	N8nResizeWrapper,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useElementSize } from '@vueuse/core';
import { TabsRoot } from 'reka-ui';
import { computed, onBeforeUnmount, provide, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { useN8nAssistantIdentity } from '@/features/agents/n8nChatPage/composables/useN8nAssistantIdentity';

import { provideArtifactAgentTargets } from '../artifactAgentTargets';
import { provideArtifactThread } from '../artifactThread';
import InstanceAiAgentPreview from '../components/InstanceAiAgentPreview.vue';
import InstanceAiArtifactsPanel from '../components/InstanceAiArtifactsPanel.vue';
import InstanceAiAppPreview from '../components/InstanceAiAppPreview.vue';
import InstanceAiDataTablePreview from '../components/InstanceAiDataTablePreview.vue';
import InstanceAiFixWithAiPanel from '../components/InstanceAiFixWithAiPanel.vue';
import InstanceAiInputMenu from '../components/InstanceAiInputMenu.vue';
import InstanceAiPreviewTabBar from '../components/InstanceAiPreviewTabBar.vue';
import InstanceAiResourcePicker from '../components/InstanceAiResourcePicker.vue';
import InstanceAiViewHeader from '../components/InstanceAiViewHeader.vue';
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
import { INSTANCE_AI_VIEW } from '../constants';
import { buildFixWithAiPrompt } from '../fixWithAi';
import { formatAgentPreviewContextLabel } from '../instanceAi.handoffContext';
import { useInstanceAiStore } from '../instanceAi.store';
import { firstMessageTitle } from '../instanceAi.threadRuntime';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { buildThreadArtifactsContext } from '../threadArtifacts';
import { useCanvasPreview } from '../useCanvasPreview';
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
import { assistantConfirmationExtension } from './assistantConfirmation';
import { assistantHostEventExtensions } from './assistantHostEvents';
import { useAssistantAgentThreadsStore } from './assistantAgentThreads.store';
import { stagedElementAppId, toElementComposerAttachment } from './assistantElementAttachments';
import {
	countSentNodes,
	readNodesAttachment,
	toNodesComposerAttachment,
} from './assistantNodeAttachments';
import { useAssistantAgentTargets } from './useAssistantAgentTargets';
import { useAssistantAgentTrace } from './useAssistantAgentTrace';
import { useAssistantArtifactThread } from './useAssistantArtifactThread';

const props = defineProps<{ threadId: string; projectId: string }>();

provide(ASSISTANT_AGENT_THREAD_ID, props.threadId);
provide(ASSISTANT_AGENT_PROJECT_ID, props.projectId);

const telemetry = useTelemetry();
const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const settingsStore = useInstanceAiSettingsStore();
const identity = useN8nAssistantIdentity();
const threadsStore = useAssistantAgentThreadsStore();
const toast = useToast();

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
): { text: string; files: File[]; references: InstanceAiAttachment[] } | undefined {
	if (fromEmptyView) return fromEmptyView;
	if (fromHandoff) {
		return { text: fromHandoff.message, files: [], references: fromHandoff.attachments ?? [] };
	}
	return undefined;
}

function readPendingHandoff() {
	// The empty view keeps its message in memory, because it can carry files. A
	// hand-off stores its message in localStorage, so a new tab can read it.
	const fromEmptyView = consumePendingAssistantAgentMessage(props.threadId);
	const fromHandoff = consumePendingFirstMessage(props.threadId);
	const firstMessage = firstMessageOf(fromEmptyView, fromHandoff);
	const workflow = getPendingWorkflowAttachment(props.threadId);
	const draft = getPendingComposerDraft(props.threadId);
	const nodes = consumePendingDraftAttachment(props.threadId);
	const context = fromHandoff?.context ?? getPendingHandoffContext(props.threadId) ?? undefined;
	const references: InstanceAiAttachment[] = [
		...(firstMessage?.references ?? []),
		...(workflow ? [workflow] : []),
	];
	return {
		firstMessage,
		draft: draft?.text,
		nodes,
		context,
		references,
		// The preview opens the handed-off workflow before the first message.
		workflow: references.find(
			(reference): reference is InstanceAiWorkflowAttachment => reference.type === 'workflow',
		),
	};
}

const agentConfig = computed<AgentJsonConfig>(() => ({
	name: identity.name.value,
	model: '',
	instructions: '',
	personalisation: identity.personalisation,
}));

/** The Assistant reads the same request fields as from its current runtime. */
function clientContext(): Record<string, unknown> {
	return {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		...(rootStore.pushRef ? { pushRef: rootStore.pushRef } : {}),
		browserUseAvailable: settingsStore.isBrowserUseAvailable,
		...(pendingReferences.length > 0 ? { attachments: pendingReferences } : {}),
		...(pendingHandoffContext ? { context: pendingHandoffContext } : {}),
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
		preview.openTabs.value,
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
	pendingReferences = [];
	pendingHandoffContext = undefined;
}

const interactionExtensions = [assistantConfirmationExtension, ...assistantHostEventExtensions];

const panel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('panel');

const trace = useAssistantAgentTrace({
	threadId: props.threadId,
	messages: () => panel.value?.messages ?? [],
});

watch(panel, (current) => {
	if (!current) return;
	if (handoff.firstMessage) {
		current.sendMessageFromOutside(handoff.firstMessage.text, handoff.firstMessage.files);
	} else if (handoff.draft) {
		current.setDraft(handoff.draft);
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
	void threadsStore.loadThread(props.threadId);
	void agentTargets.refresh();
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

const thread = useAssistantArtifactThread({
	threadId: props.threadId,
	projectId: props.projectId,
	messages: () => panel.value?.messages ?? [],
	isStreaming: () => panel.value?.isStreaming ?? false,
	// Until the chat mounts, its history is not known, so a past build does not open the preview.
	isLoadingHistory: () => panel.value?.isLoadingHistory ?? true,
	// The hand-off context, for example a credential to set up, goes with this message only.
	sendMessage: (text, handoffContext) =>
		panel.value?.sendMessageFromOutside(
			text,
			[],
			handoffContext ? { context: handoffContext } : undefined,
		),
	pendingWorkflowAttachment: handoff.workflow,
	agentTargets: () => agentTargets.state.value,
	activeArtifactId: () => activeArtifactId.value,
});
provideArtifactThread(thread);

const preview = useCanvasPreview({
	thread,
	threadId: () => props.threadId,
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
});
provide('openWorkflowPreview', preview.openWorkflowPreview);
provide('openDataTablePreview', preview.openDataTablePreview);
provide('openAppPreview', preview.openAppPreview);
provide('openAgentPreview', preview.openAgentPreview);
provide('openAgentChatPreview', openAgentChatPreview);

watch(
	[() => preview.activeTabId.value, () => preview.isPreviewVisible.value],
	([tabId, previewVisible]) => {
		activeArtifactId.value = previewVisible ? tabId : undefined;
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

function handleFixWithAiFromOffer(): void {
	const offer = activeFixWithAiOffer.value;
	if (!offer) return;
	dismissedExecutionId.value = offer.executionId;
	// Names the failed run, so the agent reads that execution instead of
	// guessing from the list. A run that n8n did not save has no list entry.
	panel.value?.sendMessageFromOutside(
		buildFixWithAiPrompt({ workflowName: offer.workflowName, errors: offer.errors }),
		[],
		{
			attachments: [
				{
					type: 'workflow',
					id: offer.workflowId,
					...(offer.workflowName ? { name: offer.workflowName } : {}),
					executionId: offer.executionId,
				},
			],
		},
	);
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
	if (params.initialDraft) current.setDraft(params.initialDraft.text);
	current.focusInput();
	params.onAccepted?.();
}

const { previewToggleLabel, togglePreview } = usePreviewToggle(preview);

// --- Header ---
// The stored title, else the first user message, as in the Assistant runtime view.
const threadTitle = computed(() => {
	const title = threadsStore.threadsById.get(props.threadId)?.title;
	if (title) return title;
	const firstUserMessage = panel.value?.messages.find((message) => message.role === 'user');
	return firstUserMessage?.content ? firstMessageTitle(firstUserMessage.content) : undefined;
});

function startNewThread(): void {
	void router.push({ name: INSTANCE_AI_VIEW });
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
// A loading thread shows the panel too, so its loading state shows in place.
const canShowArtifactsPanel = computed(
	() =>
		thread.artifactTurns.length > 0 ||
		preview.openTabs.value.length > 0 ||
		thread.isHydratingThread,
);
const { showArtifactsPanel, artifactsPanelToggleLabel, toggleArtifactsPanel } =
	useArtifactsPanelToggle({
		isInLayout: () => isArtifactsPanelInLayout.value,
		canShow: () => canShowArtifactsPanel.value,
		isPreviewVisible: () => preview.isPreviewVisible.value,
		panelSlot: useTemplateRef<HTMLElement>('artifactsPanelSlot'),
		toggleSelector: '[data-test-id="assistant-agent-artifacts-panel-toggle"]',
	});

const {
	previewMinWidth,
	previewMaxWidth,
	previewPanelWidth,
	isPreviewResizeEnabled,
	handlePreviewResize,
} = usePreviewPanelWidth({ threadAreaWidth, isExpanded: () => isPreviewExpanded.value });

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

const stagedNodes = computed(() =>
	(panel.value?.composerAttachments ?? []).flatMap((staged) => {
		const attachment = readNodesAttachment(staged);
		return attachment ? [{ id: staged.chip.id, attachment }] : [];
	}),
);

/** The user removed some of the nodes from a chip. */
function updateStagedNodes(attachment: InstanceAiNodesAttachment): void {
	const { chip, clientContextPatch } = toNodesComposerAttachment(attachment, []);
	panel.value?.addComposerAttachment(chip, clientContextPatch);
}

function removeStagedNodes(chipId: string): void {
	panel.value?.removeComposerAttachment(chipId);
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
						v-if="canShowArtifactsPanel && !preview.isPreviewVisible.value"
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
					<!-- With no tabs to show, the toggle opens a resource in a new tab. It waits for
					the history, which can open tabs for past builds. -->
					<InstanceAiResourcePicker
						v-if="
							!thread.isHydratingThread &&
							!preview.isPreviewVisible.value &&
							preview.openTabs.value.length === 0
						"
						:project-id="props.projectId"
						:excluded-tabs="preview.openTabs.value"
						placement="bottom-end"
						content-test-id="assistant-agent-open-resource-picker"
						@select="preview.openTab"
					>
						<template #trigger>
							<N8nTooltip
								:content="i18n.baseText('instanceAi.artifactsPanel.openResource')"
								placement="bottom"
								:show-after="TOOLTIP_DELAY_MS"
								as-child
							>
								<N8nIconButton
									icon="square-plus"
									variant="ghost"
									size="small"
									icon-size="large"
									data-test-id="assistant-agent-open-resource"
									:aria-label="i18n.baseText('instanceAi.artifactsPanel.openResource')"
								/>
							</N8nTooltip>
						</template>
					</InstanceAiResourcePicker>
					<N8nTooltip
						v-else-if="!preview.isPreviewVisible.value"
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
							:disabled="preview.openTabs.value.length === 0"
							@click="togglePreview"
						/>
					</N8nTooltip>
				</template>
			</InstanceAiViewHeader>

			<div
				:class="$style.contentArea"
				:inert="isAgentTestDockOpen || undefined"
				:aria-hidden="isAgentTestDockOpen || undefined"
			>
				<div :class="$style.chatColumn">
					<AgentChatPanel
						ref="panel"
						:project-id="props.projectId"
						:agent-id="ASSISTANT_AGENT_ID"
						mode="inline"
						:continue-session-id="props.threadId"
						:new-session="isNewSession"
						:agent-config="agentConfig"
						:accepted-mime-types="ASSISTANT_AGENT_ACCEPTED_MIME_TYPES"
						agent-status="production"
						:connected-triggers="[]"
						channel="system"
						:client-context="clientContext"
						:interaction-extensions="interactionExtensions"
						:show-attach-button="false"
						@stream-event="trace.recordEvent"
						@session-created="onSessionCreated"
						@message-accepted="onMessageAccepted"
						@update:streaming="onStreamingChange"
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
						<template v-if="stagedNodes.length > 0" #composer-attachments>
							<NodesAttachmentChips
								v-for="{ id, attachment } in stagedNodes"
								:key="id"
								:attachment="attachment"
								is-removable
								@update:attachment="updateStagedNodes"
								@remove-all="removeStagedNodes(id)"
							/>
						</template>
						<!-- The Assistant "+" menu replaces the attach button: files, connectors and browser use. -->
						<template #footer-start="{ disabled }">
							<InstanceAiInputMenu
								:disabled="disabled"
								:project-id="props.projectId"
								@attach-files="panel?.openFilePicker()"
							/>
						</template>
					</AgentChatPanel>
				</div>

				<div
					v-if="showArtifactsPanel"
					ref="artifactsPanelSlot"
					:class="[
						$style.artifactsPanelSlot,
						{ [$style.artifactsPanelSlotOverlay]: !isArtifactsPanelInLayout },
					]"
					data-test-id="assistant-agent-artifacts-panel"
				>
					<InstanceAiArtifactsPanel />
				</div>
			</div>
		</div>

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
				<TabsRoot
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
							:key="preview.activeWorkflowId.value"
							:class="$style.previewSlot"
							:workflow-id="preview.activeWorkflowId.value"
							:refresh-key="preview.workflowRefreshKey.value"
							:execution-result="preview.activeWorkflowExecutionResult.value"
							@workflow-failures="handleWorkflowFailures"
							@workflow-succeeded="handleWorkflowSucceeded"
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
					</div>
				</TabsRoot>
			</N8nResizeWrapper>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
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
	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
}

.chatColumn {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.artifactsPanelSlot {
	display: flex;
	flex-shrink: 0;
	overflow: hidden;
}

// A narrow view shows the panel over the chat.
.artifactsPanelSlotOverlay {
	position: absolute;
	top: 0;
	right: 0;
	z-index: 4;
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
