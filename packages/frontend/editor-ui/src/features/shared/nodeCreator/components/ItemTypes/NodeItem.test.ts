import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import NodeItem from './NodeItem.vue';
import type { AddedNodesAndConnections, INodeUi, SimplifiedNodeType } from '@/Interface';
import { DRAG_EVENT_DATA_KEY } from '@/app/constants';

const mockGetAddedNodesAndConnections = vi.fn<() => AddedNodesAndConnections>(() => ({
	nodes: [],
	connections: [],
}));
const mockGetConnectionTriggerNode = vi.fn<() => INodeUi | undefined>(() => undefined);

vi.mock('../../composables/useActions', () => ({
	useActions: () => ({
		getAddedNodesAndConnections: mockGetAddedNodesAndConnections,
		getConnectionTriggerNode: mockGetConnectionTriggerNode,
	}),
}));

const nodeType = {
	name: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	description: '',
	group: ['output'],
	icon: 'file:slack.svg',
	defaults: {},
	outputs: [],
} as SimplifiedNodeType;

const renderComponent = createComponentRenderer(NodeItem, {
	pinia: createTestingPinia(),
	props: { nodeType },
});

function dispatchDragStart(element: Element) {
	const dataTransfer = {
		effectAllowed: '',
		dropEffect: '',
		setData: vi.fn(),
		setDragImage: vi.fn(),
	};
	const event = new Event('dragstart', { bubbles: true, cancelable: true });
	Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
	element.dispatchEvent(event);
	return dataTransfer;
}

describe('NodeItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards the connection trigger node when dragging the node onto the canvas', async () => {
		const triggerNode = {
			id: '1',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
		} as INodeUi;
		mockGetConnectionTriggerNode.mockReturnValue(triggerNode);

		const { findByTestId } = renderComponent();
		const draggable = await findByTestId('node-creator-node-item');

		dispatchDragStart(draggable);

		expect(mockGetAddedNodesAndConnections).toHaveBeenCalledWith(
			[{ type: 'n8n-nodes-base.slack' }],
			triggerNode,
		);
	});

	it('sets the drag data to the result of getAddedNodesAndConnections', async () => {
		mockGetConnectionTriggerNode.mockReturnValue(undefined);
		const addedNodesAndConnections = { nodes: [{ type: 'n8n-nodes-base.slack' }], connections: [] };
		mockGetAddedNodesAndConnections.mockReturnValue(addedNodesAndConnections);

		const { findByTestId } = renderComponent();
		const draggable = await findByTestId('node-creator-node-item');

		const dataTransfer = dispatchDragStart(draggable);

		expect(mockGetAddedNodesAndConnections).toHaveBeenCalledWith(
			[{ type: 'n8n-nodes-base.slack' }],
			undefined,
		);
		expect(dataTransfer.setData).toHaveBeenCalledWith(
			DRAG_EVENT_DATA_KEY,
			JSON.stringify(addedNodesAndConnections),
		);
	});
});
