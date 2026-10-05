<script setup lang="ts">
/**
 * Renders an n8n Assistant thread with the Agents chat core. The thread is an
 * Agents session of the code-defined `n8n-assistant` agent: the session id is
 * the thread id and the project is the thread's working project.
 */
import { onMounted, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { ASSISTANT_CONFIRMATION_TOOL_NAME } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import type { InteractivePayload } from '@/features/ai/shared/agentsChat/types';
import { useInstanceAiStore, useThread } from '../instanceAi.store';
import { fetchThread } from '../instanceAi.memory.api';
import { ASSISTANT_AGENT_ID } from '../agentsChatMode';
import { consumePendingFirstMessage } from '../composables/useInstanceAiHandoff';

const emit = defineEmits<{
	'thread-missing': [];
}>();

const store = useInstanceAiStore();
const thread = useThread();
const rootStore = useRootStore();
const toast = useToast();
const i18n = useI18n();

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

/**
 * The thread runtime still feeds the artifacts panel and the preview tabs, so
 * keep it hydrated next to the Agents chat. It also knows the thread project.
 */
async function hydrateThreadRuntime() {
	if (thread.sseState !== 'disconnected') return;
	const status = await thread.loadHistoricalMessages();
	if (status === 'stale' || !isCurrentThreadRuntime()) return;
	await thread.loadThreadStatus();
	if (!isCurrentThreadRuntime()) return;
	thread.connectSSE();
}

async function resolveProjectId(): Promise<string | undefined> {
	if (thread.projectId) return thread.projectId;
	const { thread: info } = await fetchThread(rootStore.restApiContext, thread.id);
	return info.projectId;
}

async function syncThread() {
	try {
		if (!store.threads.some((t) => t.id === thread.id)) {
			await store.loadThread(thread.id);
		}
		if (!isCurrentThreadRuntime()) return;
		await hydrateThreadRuntime();
		if (!isCurrentThreadRuntime()) return;
		projectId.value = await resolveProjectId();
	} catch (error) {
		if (!isCurrentThreadRuntime()) return;
		if (isMissingThreadError(error)) {
			emit('thread-missing');
			return;
		}
		toast.showError(error, i18n.baseText('generic.error'));
	}
}

/**
 * Send an opener stashed by the empty view or a new-tab hand-off. Text-only
 * openers go through the Agents chat so they stream here. Openers with
 * attachments or hand-off context still need the Assistant endpoint.
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
