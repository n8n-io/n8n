import { describe, it, expect, vi } from 'vitest';
import { useActiveNode } from '@/composables/useActiveNode';
import { useNodeType } from '@/composables/useNodeType';
import { createTestNode } from '@/__tests__/mocks';
import { MANUAL_TRIGGER_NODE_TYPE } from '@/constants';
import { computed } from 'vue';
import { defaultMockNodeTypes } from '@/__tests__/defaults';

const node = computed(() => createTestNode({ name: 'Node', type: MANUAL_TRIGGER_NODE_TYPE }));
const nodeType = computed(() => defaultMockNodeTypes[MANUAL_TRIGGER_NODE_TYPE]);

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
