import { describe, it, expect, vi } from 'vitest';
import { useNodeType } from '@/composables/useNodeType';
import type { INodeUi, SimplifiedNodeType } from '@/Interface'; // Adjust the path accordingly

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType: vi.fn().mockImplementation((type, version) => ({ type, version })),
	})),
}));

describe('useNodeType()', () => {
	describe('nodeType', () => {
		it('returns correct nodeType from nodeType option', () => {
			const nodeTypeOption = { name: 'testNodeType' } as SimplifiedNodeType;
			const { nodeType } = useNodeType({ nodeType: nodeTypeOption });

			expect(nodeType.value).toEqual(nodeTypeOption);
		});

		it('returns correct nodeType from node option', () => {
			const nodeOption = { type: 'testType', typeVersion: 1 } as INodeUi;
			const { nodeType } = useNodeType({ node: nodeOption });

			expect(nodeType.value).toEqual({ type: 'testType', version: 1 });
		});
	});

	describe('isMultipleOutputsNodeType', () => {
		it('identifies multiple outputs node type correctly', () => {
			const nodeTypeOption = {
				name: 'testNodeType',
				outputs: ['Main', 'Other'],
			} as unknown as SimplifiedNodeType;
			const { isMultipleOutputsNodeType } = useNodeType({ nodeType: nodeTypeOption });

			expect(isMultipleOutputsNodeType.value).toBe(true);
		});
	});
});
