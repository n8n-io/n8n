import { effectScope, onScopeDispose, ref, shallowRef, watch, type EffectScope } from 'vue';
import type { IConnections } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowDocumentRenderData } from '@/app/stores/workflowDocument/useWorkflowDocumentRenderData';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import {
	createEmptyCanvasRenderData,
	type CanvasRenderData,
} from '@/features/workflows/canvas/canvas.utils';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';

import { toDraftWorkflowDb } from '../instanceAi.workflowDraftCanvas';
import type { WorkflowDraft } from '../instanceAi.workflowDrafts';

/** Its own namespace, so a draft never shares a document with a saved workflow. */
function draftDocumentWorkflowId(filePath: string): string {
	return `instance-ai-draft:${filePath}`;
}

/**
 * Canvas data for an unsaved draft. Each revision hydrates a throwaway document
 * store (the same approach as the workflow diff view), so the draft renders with
 * the real canvas without loading the editor or touching the saved workflow.
 */
export function useDraftWorkflowCanvas(draft: () => WorkflowDraft) {
	const nodes = ref<INodeUi[]>([]);
	const connections = ref<IConnections>({});
	const renderData = shallowRef<CanvasRenderData>(createEmptyCanvasRenderData());
	let documentId: WorkflowDocumentId | undefined;
	let renderScope: EffectScope | undefined;

	function dispose() {
		renderScope?.stop();
		renderScope = undefined;
		if (!documentId) return;
		disposeWorkflowExecutionStateStore(useWorkflowExecutionStateStore(documentId));
		disposeWorkflowDocumentStore(useWorkflowDocumentStore(documentId));
		documentId = undefined;
	}

	function hydrate(current: WorkflowDraft) {
		dispose();
		const workflow = toDraftWorkflowDb(current, draftDocumentWorkflowId(current.filePath));
		const nextId = createWorkflowDocumentId(workflow.id, workflow.versionId);
		// The store owns its node objects, so give it copies of the canvas nodes.
		useWorkflowDocumentStore(nextId).hydrate({
			...workflow,
			nodes: workflow.nodes.map((node) => ({ ...node })),
		});
		documentId = nextId;
		renderScope = effectScope(true);
		renderScope.run(() => {
			renderData.value = useWorkflowDocumentRenderData(nextId);
		});
		nodes.value = workflow.nodes;
		connections.value = workflow.connections;
	}

	watch(draft, hydrate, { immediate: true });
	onScopeDispose(dispose);

	const mapped = useCanvasMapping({ nodes, connections, renderData });
	return { nodes: mapped.nodes, connections: mapped.connections, renderData };
}
