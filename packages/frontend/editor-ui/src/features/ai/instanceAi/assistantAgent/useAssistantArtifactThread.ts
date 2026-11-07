import type { InstanceAiHandoffContext, InstanceAiWorkflowAttachment } from '@n8n/api-types';
import { computed, reactive, type DeepReadonly } from 'vue';

import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import { createArtifactPreviewMemory } from '../artifactPreviewMemory';
import type { ArtifactSendMessageOptions, ArtifactThread } from '../artifactThread';
import { useResourceRegistry } from '../useResourceRegistry';
import {
	findArchivedAssistantWorkflowIds,
	findLatestAssistantTasks,
	toAssistantArtifactTurns,
} from './assistantArtifactTurns';

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
	/** A workflow handed off to a new thread. Its preview opens before the first message. */
	pendingWorkflowAttachment?: InstanceAiWorkflowAttachment;
}

/**
 * The artifact thread of an Assistant agent thread, derived from its Agents
 * chat messages and host events.
 */
export function useAssistantArtifactThread(options: UseAssistantArtifactThreadOptions) {
	const workflowsListStore = useWorkflowsListStore();

	const artifactTurns = computed(() =>
		toAssistantArtifactTurns(options.messages(), options.isStreaming()),
	);
	const currentTasks = computed(() => findLatestAssistantTasks(options.messages()));
	const isHydratingThread = computed(() => options.isLoadingHistory());

	const archivedWorkflowIds = computed(() => findArchivedAssistantWorkflowIds(options.messages()));

	const { producedArtifacts, resourceNameIndex } = useResourceRegistry(() => artifactTurns.value, {
		workflowNameLookup: (id) => workflowsListStore.getWorkflowById(id)?.name,
		archivedWorkflowIds: () => archivedWorkflowIds.value,
		pendingWorkflowAttachment: () => options.pendingWorkflowAttachment,
	});

	const thread: ArtifactThread = reactive({
		id: options.threadId,
		projectId: options.projectId,
		artifactTurns,
		producedArtifacts,
		resourceNameIndex,
		pendingWorkflowAttachment: options.pendingWorkflowAttachment ?? null,
		hydrationStatus: computed(() => (isHydratingThread.value ? 'hydrating' : 'ready')),
		isHydratingThread,
		isStreaming: computed(() => options.isStreaming()),
		// The chat streams as soon as it accepts a message.
		isSendingMessage: false,
		currentTasks,
		// The editor snapshot seeds only current-runtime threads. The preview fetches the workflow.
		consumePendingHandoff: () => undefined,
		sendMessage: async (text: string, opts: ArtifactSendMessageOptions) => {
			options.sendMessage(text, opts.handoffContext);
			return true;
		},
		...createArtifactPreviewMemory(),
	});

	return thread;
}
