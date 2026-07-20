import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import ActionItem from './ActionItem.vue';
import type {
	ActionTypeDescription,
	AddedNodesAndConnections,
	INodeUi,
	SimplifiedNodeType,
} from '@/Interface';
import { DRAG_EVENT_DATA_KEY } from '@/app/constants';

const mockGetAddedNodesAndConnections = vi.fn<() => AddedNodesAndConnections>(() => ({
	nodes: [],
	connections: [],
}));
const mockGetConnectionTriggerNode = vi.fn<() => INodeUi | undefined>(() => undefined);

vi.mock('../../composables/useActions', () => ({
	useActions: () => ({
		getActionData: (actionItem: ActionTypeDescription) => ({
			name: actionItem.displayName,
			key: actionItem.name,
			value: actionItem.values ?? {},
		}),
		getAddedNodesAndConnections: mockGetAddedNodesAndConnections,
		getConnectionTriggerNode: mockGetConnectionTriggerNode,
		setAddedNodeActionParameters: vi.fn(),
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

const action = {
	name: 'n8n-nodes-base.slack',
	displayName: 'Send Message',
	description: '',
	group: ['output'],
	defaults: {},
	outputs: [],
	actionKey: 'sendMessage',
	codex: { label: '', categories: [] },
} as ActionTypeDescription;

const renderComponent = createComponentRenderer(ActionItem, {
	pinia: createTestingPinia(),
	props: { nodeType, action },
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
	Object.defineProperty(event, 'pageX', { value: 0 });
	Object.defineProperty(event, 'pageY', { value: 0 });
	element.dispatchEvent(event);
	return dataTransfer;
}

describe('ActionItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('forwards the connection trigger node when dragging the action onto the canvas', async () => {
		const triggerNode = {
			id: '1',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
		} as INodeUi;
		mockGetConnectionTriggerNode.mockReturnValue(triggerNode);
		const addedNodesAndConnections = { nodes: [{ type: 'n8n-nodes-base.slack' }], connections: [] };
		mockGetAddedNodesAndConnections.mockReturnValue(addedNodesAndConnections);

		const { container, findByText } = renderComponent();
		await findByText(action.displayName);
		const draggable = container.querySelector('[draggable]');
		if (!draggable) throw new Error('draggable element not found');

		const dataTransfer = dispatchDragStart(draggable);

		expect(mockGetAddedNodesAndConnections).toHaveBeenCalledWith(
			[{ type: 'n8n-nodes-base.slack' }],
			triggerNode,
		);
		expect(dataTransfer.setData).toHaveBeenCalledWith(
			DRAG_EVENT_DATA_KEY,
			JSON.stringify(addedNodesAndConnections),
		);
	});

	it('passes undefined when the node creator was not opened by connecting to an existing node', async () => {
		mockGetConnectionTriggerNode.mockReturnValue(undefined);

		const { container, findByText } = renderComponent();
		await findByText(action.displayName);
		const draggable = container.querySelector('[draggable]');
		if (!draggable) throw new Error('draggable element not found');

		dispatchDragStart(draggable);

		expect(mockGetAddedNodesAndConnections).toHaveBeenCalledWith(
			[{ type: 'n8n-nodes-base.slack' }],
			undefined,
		);
	});
});
