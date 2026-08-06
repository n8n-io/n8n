import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';

import {
	AI_CATEGORY_OTHER_TOOLS,
	DEFAULT_SUBCATEGORY,
	DRAG_EVENT_DATA_KEY,
	MESSAGE_AN_AGENT_NODE_TYPE,
} from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { mockSimplifiedNodeType } from '../../__tests__/utils';
import { useViewStacks } from '../../composables/useViewStacks';
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

function getDescription(container: Element) {
	return container.querySelector('[data-test-id="node-creator-item-description"]')?.textContent;
}

describe('NodeItem', () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		vi.clearAllMocks();
		useViewStacks().resetViewStacks();
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
					displayName: 'AI Agent V2',
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

	describe('description visibility', () => {
		it('shows description for a preview community node in the default subcategory', () => {
			const { container } = render({
				pinia,
				props: {
					nodeType: mockSimplifiedNodeType({
						name: 'n8n-nodes-preview-firecrawl.firecrawl',
						displayName: 'Firecrawl',
						description: 'Scrape websites with Firecrawl',
					}),
					subcategory: DEFAULT_SUBCATEGORY,
				},
			});

			expect(getDescription(container)).toBe('Scrape websites with Firecrawl');
		});

		it('shows description for an installed community node in the default subcategory', () => {
			const { container } = render({
				pinia,
				props: {
					nodeType: mockSimplifiedNodeType({
						name: '@mendable/n8n-nodes-firecrawl.firecrawl',
						displayName: 'Firecrawl',
						description: 'Scrape websites with Firecrawl',
					}),
					subcategory: DEFAULT_SUBCATEGORY,
				},
			});

			expect(getDescription(container)).toBe('Scrape websites with Firecrawl');
		});

		it('hides description for a core node in the default subcategory', () => {
			const { container } = render({
				pinia,
				props: {
					nodeType: mockSimplifiedNodeType({
						name: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Consume Slack API',
					}),
					subcategory: DEFAULT_SUBCATEGORY,
				},
			});

			expect(getDescription(container)).toBeUndefined();
		});

		it('shows description for an installed community node in the tools subcategory', () => {
			const { container } = render({
				pinia,
				props: {
					nodeType: mockSimplifiedNodeType({
						name: '@mendable/n8n-nodes-firecrawl.firecrawl',
						displayName: 'Firecrawl',
						description: 'Scrape websites with Firecrawl',
					}),
					subcategory: AI_CATEGORY_OTHER_TOOLS,
				},
			});

			expect(getDescription(container)).toBe('Scrape websites with Firecrawl');
		});

		it('shows description for a core node in the default subcategory while searching', () => {
			useViewStacks().pushViewStack({
				title: 'AI Nodes',
				mode: 'nodes',
				items: [],
				search: 'anthr',
			});

			const { container } = render({
				pinia,
				props: {
					nodeType: mockSimplifiedNodeType({
						name: '@n8n/n8n-nodes-langchain.anthropic',
						displayName: 'Anthropic',
						description: 'Interact with Anthropic AI models',
					}),
					subcategory: DEFAULT_SUBCATEGORY,
				},
			});

			expect(getDescription(container)).toBe('Interact with Anthropic AI models');
		});
	});
});
