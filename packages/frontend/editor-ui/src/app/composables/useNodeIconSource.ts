import type { INode } from 'n8n-workflow';
import { getNodeIconSource, type IconNodeType, type NodeIconSource } from '../utils/nodeIcon';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { injectWorkflowDocumentStore } from '../stores/workflowDocument.store';

export function useNodeIconSource(
	nodeType: MaybeRefOrGetter<IconNodeType | string | null | undefined>,
	node?: MaybeRefOrGetter<INode | null>,
): ComputedRef<NodeIconSource | undefined> {
	const workflowDocumentStore = injectWorkflowDocumentStore();

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
