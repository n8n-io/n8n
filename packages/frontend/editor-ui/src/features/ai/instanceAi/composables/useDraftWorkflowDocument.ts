import { nextTick, onScopeDispose, shallowRef, watch } from 'vue';

import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
	type WorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';

import { toDraftWorkflowDb } from '../instanceAi.workflowDraftCanvas';
import type { WorkflowDraft } from '../instanceAi.workflowDrafts';

/** Its own namespace, so a draft never shares a document with a saved workflow. */
function draftDocumentWorkflowId(filePath: string): string {
	return `instance-ai-draft:${filePath}`;
}

function disposeDocument(documentId: WorkflowDocumentId) {
	disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(documentId));
	disposeWorkflowDocumentStore(useWorkflowDocumentStore(documentId));
}

/**
 * A throwaway workflow document store for each draft revision. The editor's
 * workflow canvas renders it, so the draft shows nodes, groups and stickies the
 * way the saved workflow will, without loading the editor or touching the saved
 * workflow's document.
 */
export function useDraftWorkflowDocument(draft: () => WorkflowDraft) {
	const documentStore = shallowRef<WorkflowDocumentStore | null>(null);

	function hydrate(current: WorkflowDraft) {
		const previous = documentStore.value?.documentId;
		const workflow = toDraftWorkflowDb(current, draftDocumentWorkflowId(current.filePath));
		const store = useWorkflowDocumentStore(
			createWorkflowDocumentId(workflow.id, workflow.versionId),
		);
		store.hydrate(workflow);
		documentStore.value = store;
		// Dispose the old revision only after the canvas has moved to the new one.
		if (previous && previous !== store.documentId) void nextTick(() => disposeDocument(previous));
	}

	watch(draft, hydrate, { immediate: true });
	onScopeDispose(() => {
		if (documentStore.value) disposeDocument(documentStore.value.documentId);
	});

	return { documentStore };
}
