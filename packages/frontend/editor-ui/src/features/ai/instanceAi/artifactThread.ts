import { inject, provide, type InjectionKey } from 'vue';

import { useThread, type ThreadRuntime } from './instanceAi.store';

/**
 * The part of a thread that the artifacts panel and the artifact previews read.
 * The thread runtime has all of it. A host without a thread runtime (the
 * Assistant agent view) provides its own, derived from its chat messages.
 */
export type ArtifactThread = Pick<
	ThreadRuntime,
	| 'id'
	| 'projectId'
	| 'messages'
	| 'producedArtifacts'
	| 'resourceNameIndex'
	| 'pendingWorkflowAttachment'
	| 'hydrationStatus'
	| 'isHydratingThread'
	| 'isStreaming'
	| 'isSendingMessage'
	| 'currentTasks'
	| 'consumePendingHandoff'
	| 'sendMessage'
>;

const ArtifactThreadKey: InjectionKey<ArtifactThread> = Symbol('ArtifactThread');

export function provideArtifactThread(thread: ArtifactThread): void {
	provide(ArtifactThreadKey, thread);
}

/** The provided artifact thread, else the thread runtime. */
export function useArtifactThread(): ArtifactThread {
	return inject(ArtifactThreadKey, null) ?? useThread();
}
