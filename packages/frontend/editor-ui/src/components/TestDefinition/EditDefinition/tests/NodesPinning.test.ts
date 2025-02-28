import { waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import NodesPinning from '../NodesPinning.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

import {
	createTestNode,
	createTestWorkflow,
	createTestWorkflowObject,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { NodeConnectionType } from 'n8n-workflow';
import { SET_NODE_TYPE } from '@/constants';

vi.mock('vue-router', () => {
	const push = vi.fn();
	return {
		useRouter: () => ({
			push,
		}),
		useRoute: () => ({
			params: {
				name: 'test-workflow',
				testId: 'test-123',
			},
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(NodesPinning, {
	props: {
		modelValue: [{ id: '1', name: 'Node 1' }],
	},
	global: {
		plugins: [createTestingPinia()],
	},
});

describe('NodesPinning', () => {
	const workflowsStore = mockedStore(useWorkflowsStore);
	const nodes = [
		createTestNode({ id: '1', name: 'Node 1', type: SET_NODE_TYPE }),
		createTestNode({ id: '2', name: 'Node 2', type: SET_NODE_TYPE }),
	];

	const nodeTypesStore = mockedStore(useNodeTypesStore);
	const nodeTypeDescription = mockNodeTypeDescription({
		name: SET_NODE_TYPE,
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
	});
	nodeTypesStore.nodeTypes = {
		node: { 1: nodeTypeDescription },
	};

	nodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeTypeDescription);
	const workflow = createTestWorkflow({
		id: 'test-workflow',
		name: 'Test Workflow',
		nodes,
		connections: {},
	});

	const workflowObject = createTestWorkflowObject(workflow);

	workflowsStore.getWorkflowById = vi.fn().mockReturnValue(workflow);
	workflowsStore.getCurrentWorkflow = vi.fn().mockReturnValue(workflowObject);
	beforeEach(() => {
		const pinia = createPinia();
		setActivePinia(pinia);

		nodeTypesStore.setNodeTypes([nodeTypeDescription]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render workflow nodes', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelectorAll('.vue-flow__node')).toHaveLength(2);
		});

		expect(container.querySelector('[data-node-name="Node 1"]')).toBeInTheDocument();
		expect(container.querySelector('[data-node-name="Node 2"]')).toBeInTheDocument();
	});

	it('should update node classes when pinning/unpinning nodes', async () => {
		const { container } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-node-name="Node 1"]')).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(container.querySelector('[data-node-name="Node 1"]')).toHaveClass(
				'canvasNode pinnedNode',
			);
			expect(container.querySelector('[data-node-name="Node 2"]')).toHaveClass(
				'canvasNode notPinnedNode',
			);
		});
	});

	it('should emit update:modelValue when pinning nodes', async () => {
		const { container, emitted, getAllByTestId } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-node-name="Node 1"]')).toBeInTheDocument();
		});
		const pinButton = getAllByTestId('node-pin-button')[1];
		pinButton?.click();

		expect(emitted('update:modelValue')).toBeTruthy();
		expect(emitted('update:modelValue')[0]).toEqual([
			[
				{ id: '1', name: 'Node 1' },
				{ id: '2', name: 'Node 2' },
			],
		]);
	});
	it('should emit update:modelValue when unpinning nodes', async () => {
		const { container, emitted, getAllByTestId } = renderComponent();

		await waitFor(() => {
			expect(container.querySelector('[data-node-name="Node 1"]')).toBeInTheDocument();
		});
		const pinButton = getAllByTestId('node-pin-button')[0];
		pinButton?.click();

		expect(emitted('update:modelValue')).toBeTruthy();
		expect(emitted('update:modelValue')[0]).toEqual([[]]);
	});
});
