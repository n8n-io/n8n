import type {
	InstanceAiHandoffContext,
	InstanceAiSetupItem,
	InstanceAiWorkflowAttachment,
	TaskList,
} from '@n8n/api-types';
import { inject, provide, type InjectionKey } from 'vue';

import type { createArtifactPreviewMemory } from './artifactPreviewMemory';
import type { ArtifactTurn } from './artifactTurns';
import type { SetupPanelMetadataStore } from './composables/useSetupPanelActions';
import { useThread } from './instanceAi.store';
import type { PendingHandoff } from './instanceAi.threadRuntime';
import type { InstanceAiMessageAuthorship } from './prefills';
import type { ResourceEntry } from './useResourceRegistry';

type ArtifactPreviewMemory = ReturnType<typeof createArtifactPreviewMemory>;

/** The options of a message that a preview sends, e.g. a credential question. */
export interface ArtifactSendMessageOptions {
	authorship: InstanceAiMessageAuthorship;
	pushRef?: string;
	handoffContext?: InstanceAiHandoffContext;
}

/**
 * The part of a thread that the artifacts panel and the artifact previews
 * read. The thread runtime and the Assistant agent view each provide it from
 * their own thread data.
 */
export interface ArtifactThread extends ArtifactPreviewMemory {
	id: string;
	projectId: string | undefined;
	/** The messages of the thread, in the shape that the artifact readers read. */
	artifactTurns: readonly ArtifactTurn[];
	producedArtifacts: ReadonlyMap<string, ResourceEntry>;
	resourceNameIndex: ReadonlyMap<string, ResourceEntry>;
	pendingWorkflowAttachment: InstanceAiWorkflowAttachment | null;
	hydrationStatus: 'idle' | 'hydrating' | 'ready';
	isHydratingThread: boolean;
	isStreaming: boolean;
	isSendingMessage: boolean;
	/** A card waits for the user to answer. */
	isAwaitingConfirmation: boolean;
	/** The latest setup checklist of each workflow, from the `setup-items` events. */
	setupItemsByWorkflowId: Record<string, InstanceAiSetupItem[]>;
	/** The workflow of the latest setup announcement. */
	latestSetupWorkflowId: string | undefined;
	/** Where the setup panel saves credential choices. The current runtime uses its thread store. */
	setupMetadataStore?: SetupPanelMetadataStore;
	/** The artifact of the active preview tab, which the next message is about. */
	activeArtifactId: string | undefined;
	currentTasks: TaskList | null;
	consumePendingHandoff: (workflowId: string) => Omit<PendingHandoff, 'workflowId'> | undefined;
	sendMessage: (message: string, opts: ArtifactSendMessageOptions) => Promise<boolean>;
}

const ArtifactThreadKey: InjectionKey<ArtifactThread> = Symbol('ArtifactThread');

export function provideArtifactThread(thread: ArtifactThread): void {
	provide(ArtifactThreadKey, thread);
}

/** The provided artifact thread, else the thread runtime. */
export function useArtifactThread(): ArtifactThread {
	return inject(ArtifactThreadKey, null) ?? useThread();
}
