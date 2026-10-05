<script setup lang="ts">
/**
 * Renders an n8n Assistant thread with the Agents chat core. The thread is an
 * Agents session of the code-defined `n8n-assistant` agent: the session id is
 * the thread id and the project is the thread's working project.
 *
 * The thread runtime does not open the legacy event stream here. It mirrors the
 * Agents chat messages instead, so the artifacts panel, the preview tabs and the
 * to-do list keep reading `thread.messages`.
 */
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import { useInstanceAiStore, useThread } from '../instanceAi.store';
import { fetchThreadMessages } from '../instanceAi.memory.api';
import { ASSISTANT_AGENT_ID } from '../agentsChatMode';
import { agentsChatToThreadMessages } from '../agentsChatThreadAdapter';
import { consumePendingFirstMessage } from '../composables/useInstanceAiHandoff';

const emit = defineEmits<{
	'thread-missing': [];
}>();

/** The server refines the title with an LLM call after a turn finishes. */
const TITLE_REFINE_DELAY_MS = 5_000;

const store = useInstanceAiStore();
const thread = useThread();
const rootStore = useRootStore();
const toast = useToast();
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

// The first history load decides what is history and what is live, so nothing
// is mirrored until it has run once.
const historyReady = ref(false);
watch(isChatLoadingHistory, (loading, wasLoading) => {
	if (wasLoading && !loading) historyReady.value = true;
});

watch(
	[mirroredMessages, isChatStreaming, historyReady],
	([messages, streaming, ready]) => {
		if (!ready || !isCurrentThreadRuntime()) return;
		thread.syncAgentsChat(messages, streaming);
	},
	{ immediate: true },
);

// --- Thread info: title, metadata and project ---

let titleRefreshTimer: ReturnType<typeof setTimeout> | undefined;

async function refreshThreadInfo(): Promise<void> {
	try {
		await store.refreshThread(thread.id);
	} catch {
		// Non-critical: the header keeps its current title.
	}
}

/**
 * A turn sets the heuristic title and the builder metadata while it runs, and
 * the refined title shortly after it ends. Backend follow-up turns arrive as a
 * history refetch, which changes the message count without a local stream.
 */
watch(
	[isChatStreaming, () => chatMessages.value.length],
	([streaming], [wasStreaming, previousCount]) => {
		if (!historyReady.value || streaming) return;
		if (!wasStreaming && previousCount === chatMessages.value.length) return;
		void refreshThreadInfo();
		clearTimeout(titleRefreshTimer);
		titleRefreshTimer = setTimeout(() => void refreshThreadInfo(), TITLE_REFINE_DELAY_MS);
	},
);

/**
 * Load the thread info into the store (title and metadata for the header and the
 * artifacts) and resolve the project. The thread info does not carry the
 * project yet, so fall back to one page of thread messages, which does.
 */
async function syncThread() {
	try {
		const info = await store.refreshThread(thread.id);
		if (!isCurrentThreadRuntime()) return;
		let resolved = thread.projectId ?? info.projectId;
		if (!resolved) {
			resolved = (await fetchThreadMessages(rootStore.restApiContext, thread.id, 1)).projectId;
			if (!isCurrentThreadRuntime()) return;
		}
		thread.setProjectId(resolved);
		projectId.value = resolved;
	} catch (error) {
		if (!isCurrentThreadRuntime()) return;
		if (isMissingThreadError(error)) {
			emit('thread-missing');
			return;
		}
		// Settle the mirror, so the side panels stop waiting for a chat that
		// cannot mount.
		thread.syncAgentsChat([], false);
		toast.showError(error, i18n.baseText('generic.error'));
	}
}

/**
 * Send an opener stashed by the empty view or a new-tab hand-off. Text-only
 * openers go through the Agents chat so they stream here. Openers with
 * attachments or hand-off context still need the Assistant endpoint; the
 * Agents chat picks that turn up through its push recovery.
 */
function sendPendingFirstMessage() {
	const pending = consumePendingFirstMessage(thread.id);
	if (!pending) return;
	if (!pending.attachments?.length && !pending.context && chatPanel.value) {
		chatPanel.value.sendMessageFromOutside(pending.message);
		return;
	}
	void thread.sendMessage(pending.message, {
		authorship: pending.authorship,
		attachments: pending.attachments,
		pushRef: rootStore.pushRef,
		handoffContext: pending.context,
		responseStartedAtEpochMs: pending.responseStartedAtEpochMs,
	});
}

const stopPendingWatch = watch(chatPanel, (panel) => {
	if (!panel) return;
	stopPendingWatch();
	sendPendingFirstMessage();
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
			mode="inline"
		/>
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
</style>
