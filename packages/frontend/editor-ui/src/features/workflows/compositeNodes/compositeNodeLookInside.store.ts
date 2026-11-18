import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type { ExpandedCompositeNode } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ExecutionStatus, INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { IN_PROGRESS_EXECUTION_ID } from '@/app/constants/placeholders';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { ExecutionPreviewNodeSchema } from '@/features/execution/executions/executions.types';

import { expandCompositeNode } from './compositeNodes.api';
import { toInnerNodeStatuses } from './compositeNodes.utils';

export interface CompositePreviewWorkflow {
	id: string;
	name: string;
	nodes: ExpandedCompositeNode['nodes'];
	connections: ExpandedCompositeNode['connections'];
}

/**
 * Opens the "Look inside" view of a composite node. The node panel and the
 * canvas context menu both open it, and one dialog in the editor shows it.
 */
export const useCompositeNodeLookInsideStore = defineStore('compositeNodeLookInside', () => {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();

	/** The composite node being expanded, while the backend works. */
	const loadingNodeName = ref<string>();
	/** The node whose inside the dialog shows. */
	const nodeName = ref<string>();
	// Set once for each opening: a new object makes the preview load the
	// workflow again, and that drops the marks of the last execution.
	const previewWorkflow = shallowRef<CompositePreviewWorkflow>();
	const nodeStatuses = shallowRef<Record<string, ExecutionPreviewNodeSchema>>();
	const executionStatus = ref<ExecutionStatus>();

	/** The execution the editor shows, when it is a finished run that the backend stored. */
	function lastExecutionId(documentStore: WorkflowDocumentStore): string | undefined {
		const id = useWorkflowExecutionStateStore(documentStore.documentId).activeExecution?.id;
		return id && id !== IN_PROGRESS_EXECUTION_ID ? id : undefined;
	}

	async function loadLastExecution(
		documentStore: WorkflowDocumentStore,
		nodes: ExpandedCompositeNode['nodes'],
	) {
		const executionId = lastExecutionId(documentStore);
		if (!executionId) return;
		try {
			const execution = await workflowsStore.fetchExecutionDataById(executionId);
			const statuses = toInnerNodeStatuses(nodes, execution?.data?.resultData.runData);
			if (Object.keys(statuses).length === 0) return;
			nodeStatuses.value = statuses;
			executionStatus.value = execution?.status;
		} catch {
			// The view is still useful without the marks of the last execution.
		}
	}

	async function open(node: INode, documentStore: WorkflowDocumentStore) {
		if (loadingNodeName.value) return;
		close();
		loadingNodeName.value = node.name;
		try {
			const { nodes, connections } = await expandCompositeNode(
				rootStore.restApiContext,
				documentStore.workflowId,
				node,
			);
			await loadLastExecution(documentStore, nodes);
			nodeName.value = node.name;
			previewWorkflow.value = {
				id: documentStore.workflowId,
				name: node.name,
				// The canvas expects node ids to be UUIDs; inner ids such as "poll:request 1" are not.
				nodes: nodes.map((inner) => ({ ...inner, id: uuid() })),
				connections,
			};
		} catch (error) {
			toast.showError(error, i18n.baseText('compositeNode.lookInside.error'));
		} finally {
			loadingNodeName.value = undefined;
		}
	}

	function close() {
		nodeName.value = undefined;
		previewWorkflow.value = undefined;
		nodeStatuses.value = undefined;
		executionStatus.value = undefined;
	}

	return {
		loadingNodeName,
		nodeName,
		previewWorkflow,
		nodeStatuses,
		executionStatus,
		open,
		close,
	};
});
