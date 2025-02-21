import { useVueFlow, type VueFlowStore } from '@vue-flow/core';
import { mock } from 'vitest-mock-extended';
import { ref } from 'vue';
import { createCanvasNodeElement } from '../__tests__/data';

vi.mock('@vue-flow/core');

describe('useCanvasLayout', () => {
	test('should layout a basic workflow', () => {
		const node = createCanvasNodeElement();
		vi.mocked(useVueFlow).mockReturnValue(
			mock<VueFlowStore>({
				findNode: (id) => null,
				getSelectedNodes: ref([]),
				nodes: ref([node]),
				edges: ref([]),
			}),
		);
	});
});
