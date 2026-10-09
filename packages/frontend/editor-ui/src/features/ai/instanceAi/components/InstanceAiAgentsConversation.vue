<script setup lang="ts">
/**
 * Renders an n8n Assistant thread with the Agents chat core. The thread is an
 * Agents session of the code-defined `n8n-assistant` agent: the session id is
 * the thread id and the project is the thread's working project.
 *
 * The thread runtime mirrors the Agents chat messages, so the artifacts panel,
 * the preview tabs and the to-do list keep reading `thread.messages`. Every
 * Assistant message goes through the Agents chat, with the Assistant client
 * context (time zone, push ref, open tabs, hand-off context and resource
 * references) as `hostContext`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import type {
	InstanceAiAgentAttachment,
	InstanceAiAttachment,
	InstanceAiHandoffContext,
	InstanceAiNodesAttachment,
	InstanceAiPrefillPayload,
	InstanceAiResourceAttachment,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { useAgentExecutionUpdates } from '@/features/agents/composables/useAgentExecutionUpdates';
import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import { findTailOpenInteractive } from '@/features/ai/shared/agentsChat/messageMappers';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
// Experiment cleanup: remove with openWorkflowInAssistant.
import { useOpenWorkflowInAssistantStore } from '@/experiments/openWorkflowInAssistant/stores/openWorkflowInAssistant.store';
import { useInstanceAiStore, useThread } from '../instanceAi.store';
import { optionalRunTarget } from '../runTarget/runTargetOptions';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import {
	getAgentBuilderTargetFromThreadMetadata,
	type ThreadChatMessage,
} from '../instanceAi.threadRuntime';
import { ASSISTANT_AGENT_ID } from '../agentsChatMode';
import { agentsChatToThreadMessages } from '../agentsChatThreadAdapter';
import {
	clearPendingAgentAttachment,
	clearPendingComposerDraft,
	clearPendingHandoffContext,
	clearPendingThreadHandoff,
	clearPendingWorkflowAttachment as clearStashedWorkflowAttachment,
	consumePendingDraftAttachment,
	consumePendingFirstMessage,
	consumePendingFirstMessageFiles,
	consumePendingRedirectLanding,
	getPendingAgentAttachment,
	getPendingComposerDraft,
	getPendingHandoffContext,
	getPendingWorkflowAttachment,
	stashPendingComposerDraft,
	stashPendingHandoffContext,
	type PendingComposerDraft,
} from '../composables/useInstanceAiHandoff';
import {
	agentPreviewContextIcon,
	formatAgentPreviewContextLabel,
	handoffContextKey,
} from '../instanceAi.handoffContext';
import { INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY } from '../constants';
import { countAttachedNodes, mergeNodeSets } from '../utils/buildNodesAttachment';
import { USER_TYPED_MESSAGE, type InstanceAiMessageAuthorship } from '../prefills';
import type { InstanceAiEmbedSubject } from '../embed/instanceAiEmbed.types';
import type { SuggestionSelectionPayload } from './InstanceAiInput.vue';
import AttachmentPreview from './AttachmentPreview.vue';
import InstanceAiResourceChip from './InstanceAiResourceChip.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import InstanceAiInputMenu from './InstanceAiInputMenu.vue';
import SharedThreadNotice from '../sharing/SharedThreadNotice.vue';
import { provideThreadSharing } from '../sharing/useThreadSharing';

const props = defineProps<{
	/** Runs before every send (e.g. flush a pending autosave). Rejecting cancels the send. */
	beforeSend?: () => Promise<void>;
	/**
	 * The live embed subject. When it refers to the same agent as the stashed
	 * agent attachment, the context chip follows its name, so a rename in the
	 * host updates the chip.
	 */
	subject?: InstanceAiEmbedSubject;
}>();

const emit = defineEmits<{
	'thread-missing': [];
	'agent-attachment-restored': [attachment: InstanceAiAgentAttachment];
}>();

const slots = defineSlots<{
	/** Content docked above the composer (the setup checklist). */
	'above-input'?: () => unknown;
	/** Offers between the transcript and the composer. */
	'inline-offers'?: () => unknown;
	/** A host's welcome state, rendered until the thread has its first message. */
	empty?: () => unknown;
}>();

/** The server refines the title with an LLM call after a turn finishes. */
const TITLE_REFINE_DELAY_MS = 5_000;

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const thread = useThread();
const rootStore = useRootStore();
const toast = useToast();
const telemetry = useTelemetry();
const i18n = useI18n();

thread.enterAgentsChatMode();

const projectId = ref<string | undefined>(thread.projectId);
const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');

function isCurrentThreadRuntime(): boolean {
	return store.getRuntime(thread.id) === thread;
}

function isMissingThreadError(error: unknown): boolean {
	return (
		error instanceof ResponseError && (error.httpStatusCode === 403 || error.httpStatusCode === 404)
	);
}

/** A plan review is answered from the composer: typed text requests changes. */
function composerResumeData(payload: InteractivePayload, text: string): unknown {
	if (payload.toolName !== ASSISTANT_CONFIRMATION_TOOL_NAME) return undefined;
	if (payload.input.inputType !== 'plan-review') return undefined;
	return { kind: 'approval', approved: false, userInput: text };
}

// --- Mirror the Agents chat into the thread runtime ---

const chatMessages = computed(() => chatPanel.value?.messages ?? []);
const isChatStreaming = computed(() => chatPanel.value?.isStreaming ?? false);
const isChatLoadingHistory = computed(() => chatPanel.value?.isLoadingHistory ?? false);
const mirroredMessages = computed(() =>
	agentsChatToThreadMessages(chatMessages.value, isChatStreaming.value),
);
const isAwaitingInput = computed(() => findTailOpenInteractive(chatMessages.value) !== undefined);

// A teammate in a shared chat reads it and answers some cards. Only the owner sends, so a
// teammate gets no composer and none of the offers and panels that send a message.
const sharing = provideThreadSharing(thread, () => chatMessages.value);
const isTeammate = computed(() => sharing.view.value.role === 'teammate');

// The first history load decides what is history and what is live, so nothing
// is mirrored until it has run once.
const historyReady = ref(false);
watch(isChatLoadingHistory, (loading, wasLoading) => {
	if (wasLoading && !loading) historyReady.value = true;
});

watch(
	[mirroredMessages, isChatStreaming, isAwaitingInput, historyReady],
	([messages, streaming, awaiting, ready]) => {
		if (!ready || !isCurrentThreadRuntime()) return;
		thread.syncAgentsChat(messages, streaming, awaiting);
	},
	{ immediate: true },
);

// --- Thread info: title, metadata (tasks, setup items) and project ---

let titleRefreshTimer: ReturnType<typeof setTimeout> | undefined;

async function refreshThreadInfo(): Promise<void> {
	try {
		await store.refreshThread(thread.id);
	} catch {
		// Non-critical: the header and the panels keep their current state.
	}
}

/**
 * A turn sets the heuristic title, the builder metadata, the planned tasks and
 * the setup items while it runs, and the refined title shortly after it ends.
 * Backend follow-up turns arrive as a history refetch, which changes the
 * message count without a local stream.
 */
watch(
	[isChatStreaming, () => chatMessages.value.length],
	([streaming], [wasStreaming, previousCount]) => {
		if (!historyReady.value || streaming) return;
		if (!wasStreaming && previousCount === chatMessages.value.length) return;
		void refreshThreadInfo();
		clearTimeout(titleRefreshTimer);
		titleRefreshTimer = setTimeout(() => {
			void refreshThreadInfo();
		}, TITLE_REFINE_DELAY_MS);
	},
);

// Background planned tasks record turns without a local stream. Each recorded
// turn can move the checklist, so re-read the thread metadata.
useAgentExecutionUpdates(
	{
		projectId: computed(() => projectId.value ?? ''),
		agentId: computed(() => ASSISTANT_AGENT_ID),
		threadId: computed(() => thread.id),
	},
	refreshThreadInfo,
);

/** Load the thread info into the store and resolve the thread's project. */
async function syncThread() {
	try {
		const info = await store.refreshThread(thread.id);
		if (!isCurrentThreadRuntime()) return;
		const resolved = thread.projectId ?? info.projectId;
		if (!resolved) throw new Error('The thread has no project');
		thread.setProjectId(resolved);
		projectId.value = resolved;
	} catch (error) {
		if (!isCurrentThreadRuntime()) return;
		if (isMissingThreadError(error)) {
			clearPendingThreadHandoff(thread.id);
			emit('thread-missing');
			return;
		}
		// Settle the mirror, so the side panels stop waiting for a chat that
		// cannot mount.
		thread.syncAgentsChat([], false);
		toast.showError(error, i18n.baseText('generic.error'));
	}
}

// --- Composer hand-off state ---

const pendingComposerContext = ref<InstanceAiHandoffContext | null>(
	getPendingHandoffContext(thread.id),
);
const pendingAgentAttachment = ref<InstanceAiAgentAttachment | null>(
	getPendingAgentAttachment(thread.id),
);
/** Resource references staged in the composer (canvas node selections). */
const composerResources = ref<InstanceAiResourceAttachment[]>([]);
/** Text n8n wrote into the composer, to tell a pre-fill from a typed message. */
const activePrefill = ref<InstanceAiPrefillPayload | null>(null);
/** A programmatic send: its context replaces the composer state for one message. */
let oneShotMessage: OneShotMessage | null = null;

const restoredWorkflowAttachment = getPendingWorkflowAttachment(thread.id);
if (restoredWorkflowAttachment) thread.setPendingWorkflowAttachment(restoredWorkflowAttachment);
if (pendingAgentAttachment.value) emit('agent-attachment-restored', pendingAgentAttachment.value);
const restoredDraftAttachment = consumePendingDraftAttachment(thread.id);
if (restoredDraftAttachment) {
	store.stageNodeSets(restoredDraftAttachment.workflowId, restoredDraftAttachment.sets);
}

/** The agent attachment with the bound target's latest name. */
const currentAgentAttachment = computed<InstanceAiAgentAttachment | null>(() => {
	const queued = pendingAgentAttachment.value;
	if (!queued) return null;
	const boundTarget = getAgentBuilderTargetFromThreadMetadata(store.getThreadMetadata(thread.id));
	if (
		boundTarget?.agentId !== queued.id ||
		boundTarget.projectId !== queued.projectId ||
		!queued.pending
	) {
		return queued;
	}
	const name = boundTarget.name ?? queued.name;
	return { type: 'agent', id: queued.id, projectId: queued.projectId, ...(name ? { name } : {}) };
});

// Canvas node selections staged in the store move into this composer.
watch(
	() => store.pendingComposerAttachments,
	(staged) => {
		if (staged.length === 0) return;
		for (const attachment of store.consumePendingAttachments()) {
			if (attachment.type === 'file') continue;
			if (attachment.type !== 'nodes') {
				composerResources.value = [...composerResources.value, attachment];
				continue;
			}
			const existing = composerResources.value.find(
				(entry): entry is InstanceAiNodesAttachment =>
					entry.type === 'nodes' && entry.workflowId === attachment.workflowId,
			);
			if (existing) {
				existing.sets = mergeNodeSets(existing.sets, attachment.sets);
			} else {
				composerResources.value = [...composerResources.value, attachment];
			}
		}
		chatPanel.value?.focusInput();
	},
	{ immediate: true, deep: true },
);

function removeComposerResource(index: number) {
	composerResources.value = composerResources.value.filter((_, i) => i !== index);
}

function updateComposerResource(index: number, attachment: InstanceAiNodesAttachment) {
	composerResources.value = composerResources.value.map((entry, i) =>
		i === index ? attachment : entry,
	);
}

/** The removable chip for the hand-off the next message carries. */
const composerContextChip = computed(() => {
	const agentAttachment = currentAgentAttachment.value;
	const isNewAgent = pendingAgentAttachment.value?.pending === true;
	if (agentAttachment && !isNewAgent && pendingComposerContext.value?.source !== 'agent-preview') {
		const liveSubjectName =
			props.subject?.type === 'agent' && props.subject.id === agentAttachment.id
				? props.subject.name
				: undefined;
		return {
			kind: 'agent' as const,
			label: liveSubjectName ?? agentAttachment.name ?? i18n.baseText('agents.new.defaultName'),
			icon: 'robot',
		};
	}
	const workflowAttachment = thread.pendingWorkflowAttachment;
	if (workflowAttachment) {
		return {
			kind: 'workflow' as const,
			label:
				workflowAttachment.name ?? i18n.baseText('instanceAi.workflowHandoff.untitledWorkflow'),
			icon: 'workflow',
		};
	}
	const context = pendingComposerContext.value;
	if (context?.source === 'agent-preview') {
		return {
			kind: 'context' as const,
			label: formatAgentPreviewContextLabel(
				context,
				(textKey, options) => i18n.baseText(textKey, options),
				thread.producedArtifacts.get(context.agentId)?.name,
			),
			icon: agentPreviewContextIcon(context.agentIcon),
		};
	}
	return null;
});

const workflowHandoffGreeting = computed(() => {
	const attachment = thread.pendingWorkflowAttachment;
	if (!attachment || thread.isHydratingThread || thread.hasMessages) return null;
	const name = attachment.name ?? i18n.baseText('instanceAi.workflowHandoff.untitledWorkflow');
	return i18n.baseText('instanceAi.workflowHandoff.greeting', {
		interpolate: { workflow: name },
	});
});

const composerPlaceholder = computed(() =>
	pendingAgentAttachment.value?.pending === true
		? i18n.baseText('instanceAi.input.newAgentPlaceholder')
		: i18n.baseText('instanceAi.input.placeholder'),
);

function clearComposerHandoff() {
	pendingComposerContext.value = null;
	clearPendingHandoffContext(thread.id);
	clearPendingComposerDraft(thread.id);
}

function dismissComposerContextChip() {
	const chip = composerContextChip.value;
	if (!chip) return;
	if (chip.kind === 'agent') {
		clearPendingAgentAttachment(thread.id);
		pendingAgentAttachment.value = null;
	} else if (chip.kind === 'workflow') {
		clearStashedWorkflowAttachment(thread.id);
		thread.clearPendingWorkflowAttachment();
	} else {
		clearComposerHandoff();
	}
}

/** Exposed for the host to re-provide to sibling panels (e.g. the artifacts panel). */
function dismissPendingComposerContext(key: string): boolean {
	const context = pendingComposerContext.value;
	if (!context || handoffContextKey(context) !== key) return false;
	clearComposerHandoff();
	return true;
}

// --- Host context ---

function composerAttachments(): InstanceAiResourceAttachment[] {
	const attachments: InstanceAiResourceAttachment[] = [...composerResources.value];
	if (currentAgentAttachment.value) attachments.push(currentAgentAttachment.value);
	const workflow: InstanceAiWorkflowAttachment | null = thread.pendingWorkflowAttachment;
	if (workflow && !attachments.some((a) => a.type === 'workflow' && a.id === workflow.id)) {
		attachments.push(workflow);
	}
	return attachments;
}

/** The parts of a programmatic send that its message carries in place of the composer state. */
type OneShotMessage = Pick<ThreadChatMessage, 'attachments' | 'handoffContext' | 'runTarget'>;

/** The attachments, hand-off context and run target of the next message. */
function nextMessageFields(message: OneShotMessage | null) {
	if (!message) {
		return {
			attachments: composerAttachments(),
			context: pendingComposerContext.value ?? undefined,
			runTarget: undefined,
		};
	}
	return {
		attachments: message.attachments ?? [],
		context: message.handoffContext,
		runTarget: message.runTarget,
	};
}

/**
 * The client context for one Assistant message, in the shape of the Assistant
 * send request. File attachments travel through the Agents chat attachments.
 */
function buildHostContext(): Record<string, unknown> {
	const message = oneShotMessage;
	oneShotMessage = null;
	const { attachments, context, runTarget } = nextMessageFields(message);
	const threadArtifacts = thread.threadArtifactsContext();
	const hostContext: Record<string, unknown> = {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		...(rootStore.pushRef ? { pushRef: rootStore.pushRef } : {}),
		computerUseChannels: settingsStore.computerUseChannels,
		...(threadArtifacts ? { threadArtifacts } : {}),
		...(context ? { context } : {}),
		...(attachments.length ? { attachments } : {}),
		...optionalRunTarget(runTarget),
	};
	// A programmatic send leaves the composer state alone when it is accepted.
	if (message) programmaticHostContexts.add(hostContext);
	return hostContext;
}

const programmaticHostContexts = new WeakSet<Record<string, unknown>>();

function readHostAttachments(hostContext: Record<string, unknown>): InstanceAiAttachment[] {
	const attachments = hostContext.attachments;
	return Array.isArray(attachments) ? (attachments as InstanceAiAttachment[]) : [];
}

/** A message the user typed was accepted: settle the hand-off state it carried. */
function onMessageAccepted(payload: {
	text: string;
	files: File[];
	hostContext?: Record<string, unknown>;
}) {
	const hostContext = payload.hostContext ?? {};
	const attachments = readHostAttachments(hostContext);
	thread.recordSentAttachments(attachments);
	if (programmaticHostContexts.has(hostContext)) return;

	const prefill = activePrefill.value;
	const authorship: InstanceAiMessageAuthorship = prefill
		? {
				kind: 'prefill',
				prefillType: prefill.prefillType,
				...(prefill.prefillId ? { prefillId: prefill.prefillId } : {}),
				promptModified: payload.text !== prefill.text.trim(),
			}
		: USER_TYPED_MESSAGE;
	activePrefill.value = null;
	thread.trackUserMessageSent({
		authorship,
		attachmentCount: attachments.length + payload.files.length,
	});

	const nodeCount = countAttachedNodes(attachments);
	if (nodeCount > 0) {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
			node_count: nodeCount,
		});
		store.requestClearCanvasSelection();
	}
	composerResources.value = [];
	if (hostContext.context) clearComposerHandoff();
	if (pendingAgentAttachment.value) {
		clearPendingAgentAttachment(thread.id);
		pendingAgentAttachment.value = null;
	}
	if (thread.pendingWorkflowAttachment) {
		clearStashedWorkflowAttachment(thread.id);
		thread.clearPendingWorkflowAttachment();
	}
}

// --- Programmatic sends ---

async function sendThroughChat(message: ThreadChatMessage): Promise<boolean> {
	const panel = chatPanel.value;
	if (!panel) return false;
	oneShotMessage = {
		...(message.attachments ? { attachments: message.attachments } : {}),
		...(message.handoffContext ? { handoffContext: message.handoffContext } : {}),
		...optionalRunTarget(message.runTarget),
	};
	const sent = await panel.sendMessageFromOutside(message.message, message.files);
	if (!sent) oneShotMessage = null;
	return sent;
}

// Registered once the chat mounts. Until then the runtime stashes programmatic
// sends as the pending first message, which the mount sends.
let unregisterChatSender: (() => void) | undefined;
onBeforeUnmount(() => unregisterChatSender?.());

/**
 * Send an opener stashed by the empty view or a hand-off. It goes through the
 * Agents chat with its hand-off context and references, so it streams here.
 */
function sendPendingFirstMessage() {
	const pending = consumePendingFirstMessage(thread.id);
	const files = consumePendingFirstMessageFiles(thread.id);
	const landedFromRedirect = consumePendingRedirectLanding(thread.id);
	if (pending || landedFromRedirect) {
		useOpenWorkflowInAssistantStore().handleRedirectLanding(thread.id);
	}
	if (!pending) return;
	void thread
		.sendMessage(pending.message, {
			authorship: pending.authorship,
			attachments: pending.attachments,
			files,
			handoffContext: pending.context,
			...optionalRunTarget(pending.runTarget),
		})
		.then((sent) => {
			// The server stores the run target with the first message. Read it back for the header.
			if (sent && pending.runTarget) void store.refreshThread(thread.id).catch(() => {});
		});
}

/** Apply a stashed composer draft once the chat can take it. */
function applyPendingComposerDraft() {
	const draft = getPendingComposerDraft(thread.id);
	if (draft) setPrefill({ text: draft.text, prefillType: draft.prefillType });
}

const stopPendingWatch = watch(chatPanel, (panel) => {
	if (!panel) return;
	stopPendingWatch();
	unregisterChatSender = thread.registerChatSender(sendThroughChat);
	applyPendingComposerDraft();
	sendPendingFirstMessage();
});

watch(
	() => store.composerFocusRequest,
	() => {
		void nextTick(() => chatPanel.value?.focusInput());
	},
);

// --- Host API ---

function isDirty(): boolean {
	return chatPanel.value?.isDirty() ?? false;
}

/** Puts n8n-authored text into the composer without sending it. */
function setPrefill(prefill: InstanceAiPrefillPayload) {
	activePrefill.value = prefill;
	chatPanel.value?.setDraft(prefill.text);
	void nextTick(() => chatPanel.value?.focusInput());
}

/** Sends a suggestion right away, without staging it in the composer first. */
function submitSuggestion(payload: SuggestionSelectionPayload) {
	const prompt = payload.prompt ?? i18n.baseText(payload.promptKey);
	void thread.sendMessage(prompt, {
		authorship: {
			kind: 'prefill',
			prefillType: payload.prefillType,
			prefillId: payload.suggestionId,
		},
	});
}

/** Put a hand-off (for example from the agent preview) into the composer. */
function applyHandoff(context: InstanceAiHandoffContext, initialDraft?: PendingComposerDraft) {
	stashPendingHandoffContext(thread.id, context);
	pendingComposerContext.value = context;
	if (context.source === 'agent-preview') {
		void store
			.updateThreadMetadata(thread.id, {
				[INSTANCE_AI_AGENT_PREVIEW_VIEW_METADATA_KEY]: {
					agentId: context.agentId,
					threadId: context.threadId,
				},
			})
			.catch((error: unknown) => {
				toast.showError(error, i18n.baseText('generic.error'));
			});
	}
	if (initialDraft) {
		stashPendingComposerDraft(thread.id, initialDraft);
		setPrefill({ text: initialDraft.text, prefillType: initialDraft.prefillType });
	} else {
		void nextTick(() => chatPanel.value?.focusInput());
	}
}

/** Kept for hosts that re-follow the transcript after a send; the chat follows itself. */
function resetScroll() {}

defineExpose({
	isDirty,
	applyHandoff,
	dismissPendingComposerContext,
	resetScroll,
	setPrefill,
	submitSuggestion,
	pendingComposerContext,
});

onMounted(() => {
	void syncThread();
});

onBeforeUnmount(() => {
	clearTimeout(titleRefreshTimer);
});
</script>

<template>
	<div :class="$style.conversation" data-test-id="instance-ai-agents-conversation">
		<AgentChatPanel
			v-if="projectId"
			ref="chatPanel"
			:project-id="projectId"
			:agent-id="ASSISTANT_AGENT_ID"
			:continue-session-id="thread.id"
			:agent-config="null"
			agent-status="draft"
			:connected-triggers="[]"
			:composer-resume-data="composerResumeData"
			:host-context="buildHostContext"
			:before-send="props.beforeSend"
			attachment-accept=""
			:show-attach-button="false"
			:placeholder="composerPlaceholder"
			mode="inline"
			@message-accepted="onMessageAccepted"
			@resume-failed="sharing.onResumeFailed"
		>
			<template v-if="slots.empty || workflowHandoffGreeting" #empty>
				<div :class="$style.empty">
					<N8nText
						v-if="workflowHandoffGreeting"
						size="large"
						data-test-id="instance-ai-workflow-handoff-greeting"
					>
						<InstanceAiMarkdown :content="workflowHandoffGreeting" />
					</N8nText>
					<slot v-else name="empty" />
				</div>
			</template>
			<template v-if="!isTeammate" #inline-offers>
				<div :class="$style.offers">
					<slot name="inline-offers" />
				</div>
			</template>
			<template v-if="!isTeammate" #above-input>
				<slot name="above-input" />
			</template>
			<template v-if="isTeammate" #composer>
				<SharedThreadNotice :owner-name="sharing.view.value.ownerName" />
			</template>
			<!-- Same menu as the empty view: attachments, computer use, browser use and MCP tools -->
			<template #footer-start>
				<InstanceAiInputMenu :thread-id="thread.id" @attach-files="chatPanel?.openFilePicker()" />
			</template>
			<template v-if="composerContextChip || composerResources.length" #composer-attachments>
				<InstanceAiResourceChip
					v-if="composerContextChip"
					:label="composerContextChip.label"
					:icon="composerContextChip.icon"
					:remove-label="i18n.baseText('generic.close')"
					test-id="instance-ai-handoff-context-chip"
					remove-test-id="instance-ai-handoff-context-chip-dismiss"
					removable
					@remove="dismissComposerContextChip"
				/>
				<AttachmentPreview
					v-for="(attachment, index) in composerResources"
					:key="`res-${index}`"
					:attachment="attachment"
					is-removable
					@remove-resource="removeComposerResource(index)"
					@update:attachment="updateComposerResource(index, $event)"
				/>
			</template>
		</AgentChatPanel>
	</div>
</template>

<style lang="scss" module>
.conversation {
	flex: 1;
	min-width: 0;
	min-height: 0;
	display: flex;
	flex-direction: column;
	position: relative;
}

.empty {
	flex: 1;
	min-height: 0;
	overflow: auto;
	padding: var(--spacing--sm);
}

/* The same column as the composer (AgentChatPanel `.inputArea`), so the offers
   line up with the transcript and the composer. */
.offers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
	max-width: 800px;
	margin-inline: auto;
	padding: 0 var(--spacing--sm);

	&:empty {
		display: none;
	}
}
</style>
