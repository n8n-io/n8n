import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';

import { DRAG_EVENT_DATA_KEY, MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { mockSimplifiedNodeType } from '../../__tests__/utils';
import NodeItem from './NodeItem.vue';
import type { AddedNodesAndConnections } from '@/Interface';

const mockDocumentStoreState = {
	allNodes: [],
	workflowTriggerNodes: [],
	aiNodes: [],
	getExpressionHandler: () => null,
};
vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: () => mockDocumentStoreState,
	createWorkflowDocumentId: (id: string) => `${id}@latest`,
	injectWorkflowDocumentStore: () => ({ value: mockDocumentStoreState }),
}));

const mockGetAddedNodesAndConnections = vi.fn<() => AddedNodesAndConnections>(() => ({
	nodes: [],
	connections: [],
}));

vi.mock('../../composables/useActions', () => ({
	useActions: () => ({
		getAddedNodesAndConnections: mockGetAddedNodesAndConnections,
	}),
}));

const render = createComponentRenderer(NodeItem);

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
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		vi.clearAllMocks();
	});

	it('is draggable and has no action arrow for a regular node', () => {
		const { container } = render({
			pinia,
			props: {
				nodeType: mockSimplifiedNodeType({
					name: 'n8n-nodes-base.set',
					displayName: 'Edit Fields',
					group: ['transform'],
				}),
			},
		});

		expect(container.querySelector('[draggable="true"]')).toBeInTheDocument();
		expect(container.querySelector('[data-icon="arrow-right"]')).not.toBeInTheDocument();
	});

	it('is not draggable and shows the sub-panel arrow for the Message an Agent node', () => {
		const { container } = render({
			pinia,
			props: {
				nodeType: mockSimplifiedNodeType({
					name: MESSAGE_AN_AGENT_NODE_TYPE,
					displayName: 'AI Agent V1',
					group: ['transform'],
				}),
			},
		});

		expect(container.querySelector('[draggable="false"]')).toBeInTheDocument();
		expect(container.querySelector('[data-icon="arrow-right"]')).toBeInTheDocument();
		expect(container.querySelector('[data-test-id="node-creator-node-item"]')).toBeInTheDocument();
	});

	it('sets the drag data to the result of getAddedNodesAndConnections', async () => {
		const addedNodesAndConnections = { nodes: [{ type: 'n8n-nodes-base.slack' }], connections: [] };
		mockGetAddedNodesAndConnections.mockReturnValue(addedNodesAndConnections);

		const { findByTestId } = render({
			pinia,
			props: {
				nodeType: mockSimplifiedNodeType({
					name: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					group: ['output'],
				}),
			},
		});
		const draggable = await findByTestId('node-creator-node-item');

		const dataTransfer = dispatchDragStart(draggable);

		expect(mockGetAddedNodesAndConnections).toHaveBeenCalledWith([
			{ type: 'n8n-nodes-base.slack' },
		]);
		expect(dataTransfer.setData).toHaveBeenCalledWith(
			DRAG_EVENT_DATA_KEY,
			JSON.stringify(addedNodesAndConnections),
		);
	});
});
