import { patchThread } from '@n8n/instance-ai';

import type { TemporaryWorkflowMarkers } from '../temporary-workflow-markers';
import type { AssistantTurnMemory } from '../turn-setup/assistant-turn-runtime';

/** Thread metadata key with the ids of the thread's temporary workflows. */
export const TEMPORARY_WORKFLOWS_METADATA_KEY = 'assistantTemporaryWorkflowIds';

function workflowIdsOf(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

/** Keeps the temporary workflows of an Assistant agent thread in the thread metadata. */
export function createThreadTemporaryWorkflowMarkers(
	memory: AssistantTurnMemory,
	threadId: string,
): TemporaryWorkflowMarkers {
	const list = async () =>
		workflowIdsOf((await memory.getThread(threadId))?.metadata?.[TEMPORARY_WORKFLOWS_METADATA_KEY]);
	const update = async (change: (workflowIds: string[]) => string[]) => {
		await patchThread(memory, {
			threadId,
			update: ({ metadata }) => ({
				metadata: {
					...metadata,
					[TEMPORARY_WORKFLOWS_METADATA_KEY]: change(
						workflowIdsOf(metadata?.[TEMPORARY_WORKFLOWS_METADATA_KEY]),
					),
				},
			}),
		});
	};
	return {
		mark: async (workflowId) =>
			await update((ids) => (ids.includes(workflowId) ? ids : [...ids, workflowId])),
		unmark: async (workflowId) => await update((ids) => ids.filter((id) => id !== workflowId)),
		has: async (workflowId) => (await list()).includes(workflowId),
		list,
	};
}

/**
 * Keeps a copy of the markers of a deleted thread in memory. The thread
 * metadata is gone, so the archive reads and drops the markers here.
 */
export function createSnapshotTemporaryWorkflowMarkers(
	workflowIds: string[],
): TemporaryWorkflowMarkers {
	const ids = new Set(workflowIds);
	return {
		mark: async (workflowId) => {
			ids.add(workflowId);
		},
		unmark: async (workflowId) => {
			ids.delete(workflowId);
		},
		has: async (workflowId) => ids.has(workflowId),
		list: async () => [...ids],
	};
}
