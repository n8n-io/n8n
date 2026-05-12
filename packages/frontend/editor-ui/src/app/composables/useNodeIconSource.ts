import type { INode } from 'n8n-workflow';
import { getNodeIconSource, type IconNodeType, type NodeIconSource } from '../utils/nodeIcon';
import { computed, toValue, type ComputedRef, type MaybeRef } from 'vue';
import { useWorkflowsStore } from '../stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '../stores/workflowDocument.store';

export function useNodeIconSource(
	nodeType: MaybeRef<IconNodeType | string | null | undefined>,
	node?: MaybeRef<INode | null>,
): ComputedRef<NodeIconSource | undefined> {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId)),
	);

	return computed(() => {
		const typeValue = toValue(nodeType);
		const nodeValue = toValue(node);

		return getNodeIconSource(
			typeValue ?? nodeValue?.type,
			nodeValue ?? null,
			workflowDocumentStore.value.getExpressionHandler(),
		);
	});
}
