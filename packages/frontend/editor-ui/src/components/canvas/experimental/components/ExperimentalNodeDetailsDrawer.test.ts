import { createTestNode } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { cleanupAppModals, createAppModals } from '@/__tests__/utils';
import { SET_NODE_TYPE } from '@/constants';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { createTestingPinia } from '@pinia/testing';
import ExperimentalNodeDetailsDrawer from './ExperimentalNodeDetailsDrawer.vue';
import { nextTick } from 'vue';

const renderComponent = createComponentRenderer(ExperimentalNodeDetailsDrawer);

describe('ExperimentalNodeDetailsDrawer', () => {
	let pinia: ReturnType<typeof createTestingPinia>;
	let workflowsStore: ReturnType<typeof useWorkflowsStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let ndvStore: ReturnType<typeof useNDVStore>;

	const mockNodes = [
		createTestNode({
			id: 'node1',
			name: 'Node 1',
			type: SET_NODE_TYPE,
			parameters: { p0: 'before update' },
		}),
		createTestNode({ id: 'node2', name: 'Node 2', type: SET_NODE_TYPE }),
		createTestNode({ id: 'node3', name: 'Node 3', type: SET_NODE_TYPE }),
	];

	beforeEach(() => {
		pinia = createTestingPinia({
			stubActions: false,
		});

		workflowsStore = useWorkflowsStore(pinia);
		workflowsStore.setNodes(mockNodes);
		nodeTypesStore = useNodeTypesStore(pinia);
		nodeTypesStore.setNodeTypes([
			{
				name: SET_NODE_TYPE,
				properties: [{ name: 'p0', displayName: 'P0', type: 'string', default: '' }],
				version: 1,
				defaults: {},
				inputs: ['main'],
				outputs: ['main'],
				displayName: 'T0',
				group: [],
				description: '',
			},
		]);
		ndvStore = useNDVStore();
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
	});

	it('should show updated parameter after closing NDV', async () => {
		const rendered = renderComponent({
			pinia,
			props: {
				node: mockNodes[0],
				nodes: [mockNodes[0]],
			},
		});

		await rendered.findByDisplayValue('before update');

		// Simulate parameter update in NDV
		ndvStore.setActiveNodeName('Node 1', 'other');
		await nextTick();
		workflowsStore.setNodeParameters({ name: 'Node 1', value: { p0: 'after update' } });
		ndvStore.unsetActiveNodeName();
		await nextTick();

		await rendered.findByDisplayValue('after update');
	});
});
