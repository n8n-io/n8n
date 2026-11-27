import type {
	AssistantAgentTargetsState,
	InstanceAiAppTarget,
	InstanceAiHandoffContext,
	InstanceAiWorkflowAttachment,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, reactive, shallowRef, type DeepReadonly } from 'vue';

import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import { createArtifactPreviewMemory } from '../artifactPreviewMemory';
import type { ArtifactSendMessageOptions, ArtifactThread } from '../artifactThread';
import type { InstanceAiMessageAuthorship } from '../prefills';
import type { SetupPanelMetadataStore } from '../composables/useSetupPanelActions';
import { useResourceRegistry } from '../useResourceRegistry';
import {
	fetchAssistantAgentSetupCredentials,
	saveAssistantAgentSetupCredentials,
} from './assistantAgentTabs.api';
import {
	findArchivedAssistantWorkflowIds,
	findLatestAssistantSetupItems,
	findLatestAssistantTasks,
	toAssistantArtifactTurns,
} from './assistantArtifactTurns';

interface UseAssistantArtifactThreadOptions {
	threadId: string;
	projectId: string;
	messages: () => ReadonlyArray<DeepReadonly<ChatMessage>>;
	isStreaming: () => boolean;
	/** The chat waits for the user to answer a card. The run is not over, so its turn stays live. */
	isAwaitingUser?: () => boolean;
	isLoadingHistory: () => boolean;
	/**
	 * Sends a message to the chat, for the previews that ask the Assistant
	 * something. The hand-off context goes with the message.
	 */
	sendMessage: (
		text: string,
		authorship: InstanceAiMessageAuthorship,
		handoffContext?: InstanceAiHandoffContext,
	) => void;
	/** A workflow handed off to a new thread. Its preview opens before the first message. */
	pendingWorkflowAttachment?: InstanceAiWorkflowAttachment;
	/** The agents that the thread metadata binds. */
	agentTargets?: () => DeepReadonly<AssistantAgentTargetsState> | null;
	/** The apps that the thread metadata binds. */
	appTargets?: () => readonly InstanceAiAppTarget[];
	/** The artifact of the active preview tab. */
	activeArtifactId?: () => string | undefined;
}

/**
 * The artifact thread of an Assistant agent thread, derived from its Agents
 * chat messages and host events.
 */
export function useAssistantArtifactThread(options: UseAssistantArtifactThreadOptions) {
	const workflowsListStore = useWorkflowsListStore();
	const rootStore = useRootStore();
	const i18n = useI18n();

	const artifactTurns = computed(() =>
		toAssistantArtifactTurns(
			options.messages(),
			options.isStreaming() || (options.isAwaitingUser?.() ?? false),
		),
	);
	const currentTasks = computed(() => findLatestAssistantTasks(options.messages()));
	const setupItemsByWorkflowId = computed(() => findLatestAssistantSetupItems(options.messages()));
	const latestSetupWorkflowId = computed(
		() => artifactTurns.value.findLast((turn) => turn.announcedWorkflowId)?.announcedWorkflowId,
	);
	const isHydratingThread = computed(() => options.isLoadingHistory());
	// The credential choices of the setup panel. The agent reads them from the thread metadata.
	const setupMetadata = shallowRef<Record<string, unknown>>();
	let setupMetadataRequested = false;
	const setupMetadataStore: SetupPanelMetadataStore = {
		getThreadMetadata: () => {
			// Load the stored choices once, when the panel first reads them. Local writes win.
			if (!setupMetadataRequested) {
				setupMetadataRequested = true;
				void fetchAssistantAgentSetupCredentials(rootStore.restApiContext, options.threadId)
					.then(({ metadata }) => (setupMetadata.value = { ...metadata, ...setupMetadata.value }))
					.catch(() => {});
			}
			return setupMetadata.value;
		},
		setThreadMetadata: (metadata) => (setupMetadata.value = metadata),
		updateThreadMetadata: async (metadata) =>
			await saveAssistantAgentSetupCredentials(
				rootStore.restApiContext,
				options.threadId,
				metadata,
			),
		fetchThreadMetadata: async () =>
			(await fetchAssistantAgentSetupCredentials(rootStore.restApiContext, options.threadId))
				.metadata,
	};

	const archivedWorkflowIds = computed(() => findArchivedAssistantWorkflowIds(options.messages()));

	const { producedArtifacts, resourceNameIndex } = useResourceRegistry(() => artifactTurns.value, {
		workflowNameLookup: (id) => workflowsListStore.getWorkflowById(id)?.name,
		archivedWorkflowIds: () => archivedWorkflowIds.value,
		pendingWorkflowAttachment: () => options.pendingWorkflowAttachment,
		agentBuilderTarget: () => options.agentTargets?.()?.bound ?? undefined,
		pendingAgentTarget: () => {
			const pending = options.agentTargets?.()?.pending;
			return pending ? { ...pending, name: i18n.baseText('agents.new.defaultName') } : undefined;
		},
		agentBuilderTargets: () => [...(options.agentTargets?.()?.targets ?? [])],
		appTargets: options.appTargets,
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
		isAwaitingConfirmation: computed(() => options.isAwaitingUser?.() ?? false),
		setupItemsByWorkflowId,
		latestSetupWorkflowId,
		setupMetadataStore,
		activeArtifactId: computed(() => options.activeArtifactId?.()),
		currentTasks,
		// The editor snapshot seeds only current-runtime threads. The preview fetches the workflow.
		consumePendingHandoff: () => undefined,
		sendMessage: async (text: string, opts: ArtifactSendMessageOptions) => {
			options.sendMessage(text, opts.authorship, opts.handoffContext);
			return true;
		},
		...createArtifactPreviewMemory(),
	});

	return thread;
}
