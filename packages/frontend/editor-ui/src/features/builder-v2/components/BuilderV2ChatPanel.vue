<script lang="ts" setup>
import { computed, ref } from 'vue';
import { N8nAskAssistantChat, N8nButton, N8nInfoTip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	ChatUI,
	WorkflowSuggestion as ChatWorkflowSuggestion,
} from '@n8n/design-system/types/assistant';
import shuffle from 'lodash/shuffle';

import { useBuilderV2Store } from '../stores/builder-v2.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import {
	WORKFLOW_SUGGESTIONS,
	type WorkflowSuggestion,
} from '@/experiments/emptyStateBuilderPrompt/constants';

import TaskList from './TaskList.vue';

defineEmits<{
	close: [];
}>();

const builderStore = useBuilderV2Store();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();

const chatRef = ref<InstanceType<typeof N8nAskAssistantChat>>();

defineExpose({
	focusInput: () => chatRef.value?.focusInput(),
});

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const projectId = computed(
	// PoC fallback. Real projectId comes from the projects store once a workflow
	// is loaded; otherwise the backend will validate scope.
	() => projectsStore.currentProjectId ?? 'default-project-id',
);

/**
 * Map the v2 store's transcript into the ChatUI message shape
 * that N8nAskAssistantChat expects. The DS component requires `type: 'text'`
 * on text messages — our store entries don't carry a type field.
 */
const messages = computed<ChatUI.AssistantMessage[]>(() => {
	const out: ChatUI.AssistantMessage[] = builderStore.chatMessages.map((msg, i) => ({
		id: `builder-v2-${msg.role}-${i}`,
		role: msg.role,
		type: 'text',
		content: msg.content,
		read: true,
	}));
	// Surface the error inline as an assistant message so the user sees it
	// in the chat surface instead of a separate banner.
	if (builderStore.error) {
		out.push({
			id: 'error',
			role: 'assistant',
			type: 'error',
			content: builderStore.error,
		});
	}
	return out;
});

/** Empty-state suggestion pills. Shown only before a session is started. */
const suggestions = computed<ChatWorkflowSuggestion[] | undefined>(() => {
	if (builderStore.hasSession) return undefined;
	// Same shape as the DS WorkflowSuggestion: { id, summary, prompt }.
	return shuffle<WorkflowSuggestion>(WORKFLOW_SUGGESTIONS).slice(0, 6);
});

const loadingMessage = computed(() => {
	if (!builderStore.isLoading) return undefined;
	// A pick is in flight — the agent is committing the chosen ghost.
	if (builderStore.pickingIndex !== null) return 'Adding node...';
	// Generic in-flight: agent is reasoning / fetching the next proposal.
	return 'Thinking...';
});

/**
 * Whether to show the static "pick a ghost" affordance. This is NOT a loading
 * message — it's a quiet banner that surfaces when ghosts are on the canvas
 * and the backend is idle, prompting the user to choose one.
 */
const showPickGhostBanner = computed(() => builderStore.hasGhosts && !builderStore.isLoading);

const inputPlaceholder = computed(() => {
	if (builderStore.hasGhosts) return i18n.baseText('builderV2.chat.placeholder.pickGhost');
	if (builderStore.hasSession) return i18n.baseText('builderV2.chat.placeholder.continue');
	return i18n.baseText('builderV2.chat.placeholder.initial');
});

const inputDisabled = computed(() => builderStore.isLoading || builderStore.hasGhosts);

function getWorkflowJson(): unknown {
	const workflowId = workflowsStore.workflowId;
	if (!workflowId) return { nodes: [], connections: {} };
	try {
		const doc = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		const snap = doc.getSnapshot();
		return { nodes: snap.nodes ?? [], connections: snap.connections ?? {} };
	} catch {
		return { nodes: [], connections: {} };
	}
}

async function onUserMessage(content: string) {
	const prompt = content.trim();
	if (!prompt) return;
	if (inputDisabled.value) return;

	await builderStore.startNewSession(projectId.value, prompt, getWorkflowJson());
}

async function onRejectGhosts() {
	await builderStore.rejectGhosts();
}

async function onCancelStuckSession() {
	builderStore.reset();
}

async function onRetryStuckSession() {
	await builderStore.retryLastPrompt(getWorkflowJson());
}
</script>

<template>
	<div :class="$style.wrapper" data-test-id="builder-v2-panel" tabindex="0" @keydown.stop>
		<div :class="$style.chat">
			<N8nAskAssistantChat
				ref="chatRef"
				:user="user"
				:messages="messages"
				:streaming="builderStore.isLoading"
				:loading-message="loadingMessage"
				:session-id="builderStore.sessionId ?? undefined"
				:suggestions="suggestions"
				:input-placeholder="inputPlaceholder"
				:disabled="inputDisabled"
				:scroll-on-new-message="true"
				@close="$emit('close')"
				@message="onUserMessage"
			>
				<template #header>
					<slot name="header" />
				</template>
				<template v-if="builderStore.taskList.length > 0" #messagesFooter>
					<div :class="$style.taskListInChat">
						<TaskList :tasks="builderStore.taskList" />
					</div>
				</template>
				<template v-if="showPickGhostBanner" #inputHeader>
					<div :class="$style.ghostsBanner" data-test-id="builder-v2-ghosts-banner">
						<N8nInfoTip theme="info" :bold="false">
							<span> Pick a suggestion on the canvas to continue, or reject all. </span>
						</N8nInfoTip>
						<N8nButton
							type="secondary"
							size="small"
							data-test-id="builder-v2-reject"
							@click="onRejectGhosts"
						>
							Reject all
						</N8nButton>
					</div>
				</template>
				<template v-else-if="builderStore.isStuck" #inputHeader>
					<div :class="$style.stuckBanner" data-test-id="builder-v2-stuck-banner">
						<N8nInfoTip theme="warning" :bold="false">
							<span>
								The builder is waiting but has nothing on screen to act on. This can happen during
								multi-step proposals.
							</span>
						</N8nInfoTip>
						<div :class="$style.stuckActions">
							<N8nButton
								type="secondary"
								size="small"
								data-test-id="builder-v2-stuck-cancel"
								@click="onCancelStuckSession"
							>
								Cancel session
							</N8nButton>
							<N8nButton
								type="primary"
								size="small"
								data-test-id="builder-v2-stuck-retry"
								@click="onRetryStuckSession"
							>
								Retry last prompt
							</N8nButton>
						</div>
					</div>
				</template>
			</N8nAskAssistantChat>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
}

.chat {
	flex: 1;
	min-height: 0;
}

.ghostsBanner {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: var(--color--background--light-2);
	border-bottom: var(--border);
}

.stuckBanner {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: var(--color--background--light-2);
	border-bottom: var(--border);
}

.stuckActions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.taskListInChat {
	margin-top: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
