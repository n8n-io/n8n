import { computed } from 'vue';
import { describe, it, expect, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { useActiveNode } from '@/composables/useActiveNode';
import { useNodeType } from '@/composables/useNodeType';

const node = computed(() => mock());
const nodeType = computed(() => mock());

vi.mock('@/stores/ndv.store', () => ({
	useNDVStore: vi.fn(() => ({
		activeNode: node,
	})),
}));

vi.mock('@/composables/useNodeType', () => ({
	useNodeType: vi.fn(() => ({
		nodeType,
	})),
}));

vi.mock('pinia', () => ({
	storeToRefs: vi.fn((store) => store),
}));

describe('useActiveNode()', () => {
	it('should call useNodeType()', () => {
		useActiveNode();

		expect(useNodeType).toHaveBeenCalledWith({
			node,
		});
	});

	it('should return activeNode and activeNodeType', () => {
		const { activeNode, activeNodeType } = useActiveNode();

		expect(activeNode).toBe(node);
		expect(activeNodeType).toBe(nodeType);
	});
});
