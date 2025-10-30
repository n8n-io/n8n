import type { MaybeRef } from 'vue';
import { computed, unref } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi, SimplifiedNodeType } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { NodeHelpers } from 'n8n-workflow';

export function useNodeType(
	options: {
		node?: MaybeRef<INodeUi | null>;
		nodeType?: MaybeRef<INodeTypeDescription | SimplifiedNodeType | null>;
	} = {},
) {
	const nodeTypesStore = useNodeTypesStore();

	const nodeType = computed(() => {
		if (options.nodeType) {
			return unref(options.nodeType);
		}

		const activeNode = unref(options.node);
		if (activeNode) {
			return nodeTypesStore.getNodeType(activeNode.type, activeNode.typeVersion);
		}

		return null;
	});

	const isSubNodeType = computed(() => NodeHelpers.isSubNodeType(nodeType.value));

	const isMultipleOutputsNodeType = computed(() => {
		const outputs = nodeType.value?.outputs;

		if (typeof outputs === 'string') return false; // e.g. Webhook node

		return (outputs ?? []).length > 1;
	});

	return {
		nodeType,
		isSubNodeType,
		isMultipleOutputsNodeType,
	};
}
