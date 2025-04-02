import { storeToRefs } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeType } from '@/composables/useNodeType';

export function useActiveNode() {
	const ndvStore = useNDVStore();

	const { activeNode } = storeToRefs(ndvStore);
	const { nodeType: activeNodeType } = useNodeType({
		node: activeNode,
	});

	return {
		activeNode,
		activeNodeType,
	};
}
