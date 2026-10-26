import { computed, reactive, type DeepReadonly } from 'vue';

import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import type { ArtifactThread } from '../artifactThread';
import { useResourceRegistry } from '../useResourceRegistry';
import { findLatestAssistantTasks, toAssistantArtifactMessages } from './assistantArtifactMessages';

interface UseAssistantArtifactThreadOptions {
	threadId: string;
	projectId: string;
	messages: () => ReadonlyArray<DeepReadonly<ChatMessage>>;
	isStreaming: () => boolean;
	isLoadingHistory: () => boolean;
	/** Sends a message to the chat, for the previews that ask the Assistant something. */
	sendMessage: (text: string) => void;
}

/**
 * The artifact thread of an Assistant agent thread, derived from its Agents
 * chat messages, so the artifacts panel and the previews work as in the
 * Assistant runtime.
 */
export function useAssistantArtifactThread(options: UseAssistantArtifactThreadOptions) {
	const workflowsListStore = useWorkflowsListStore();

	const messages = computed(() =>
		toAssistantArtifactMessages(options.messages(), options.isStreaming()),
	);
	const currentTasks = computed(() => findLatestAssistantTasks(options.messages()));
	const isHydratingThread = computed(() => options.isLoadingHistory());

	const { producedArtifacts, resourceNameIndex } = useResourceRegistry(
		() => messages.value,
		(id) => workflowsListStore.getWorkflowById(id)?.name,
	);

	const thread: ArtifactThread = reactive({
		id: options.threadId,
		projectId: options.projectId,
		messages,
		producedArtifacts,
		resourceNameIndex,
		pendingWorkflowAttachment: null,
		hydrationStatus: computed(() => (isHydratingThread.value ? 'hydrating' : 'ready')),
		isHydratingThread,
		isStreaming: computed(() => options.isStreaming()),
		// The chat streams as soon as it accepts a message.
		isSendingMessage: false,
		currentTasks,
		// Hand-offs from the editor open Assistant runtime threads, never these.
		consumePendingHandoff: () => undefined,
		sendMessage: async (text: string) => {
			options.sendMessage(text);
			return true;
		},
	});

	return thread;
}
