import type { InstanceAiHandoffContext } from '@n8n/api-types';
import { computed, reactive, type DeepReadonly } from 'vue';

import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import { createArtifactPreviewMemory } from '../artifactPreviewMemory';
import type { ArtifactThread } from '../artifactThread';
import { useResourceRegistry } from '../useResourceRegistry';
import {
	findArchivedAssistantWorkflowIds,
	findLatestAssistantTasks,
	toAssistantArtifactMessages,
} from './assistantArtifactMessages';

interface UseAssistantArtifactThreadOptions {
	threadId: string;
	projectId: string;
	messages: () => ReadonlyArray<DeepReadonly<ChatMessage>>;
	isStreaming: () => boolean;
	isLoadingHistory: () => boolean;
	/**
	 * Sends a message to the chat, for the previews that ask the Assistant
	 * something. The hand-off context goes with the message.
	 */
	sendMessage: (text: string, handoffContext?: InstanceAiHandoffContext) => void;
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

	const archivedWorkflowIds = computed(() => findArchivedAssistantWorkflowIds(options.messages()));

	const { producedArtifacts, resourceNameIndex } = useResourceRegistry(
		() => messages.value,
		(id) => workflowsListStore.getWorkflowById(id)?.name,
		() => archivedWorkflowIds.value,
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
		sendMessage: async (text: string, opts: Parameters<ArtifactThread['sendMessage']>[1]) => {
			options.sendMessage(text, opts.handoffContext);
			return true;
		},
		...createArtifactPreviewMemory(),
	});

	return thread;
}
