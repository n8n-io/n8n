import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import {
	AI_CATEGORY_OTHER_TOOLS,
	DEFAULT_SUBCATEGORY,
	DRAG_EVENT_DATA_KEY,
	MESSAGE_AN_AGENT_NODE_TYPE,
} from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { mockRestrictedCredentialTypes, mockRestrictedNodeTypes } from '@/__tests__/mocks';
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

	describe('restricted node type', () => {
		const gmail = () =>
			mockSimplifiedNodeType({
				name: 'n8n-nodes-base.gmail',
				displayName: 'Gmail',
				group: ['output'],
			});

		it('is greyed, locked, not draggable and has no action arrow', () => {
			mockRestrictedNodeTypes({ 'n8n-nodes-base.gmail': 'instance' });

			const { container, getByTestId } = render({ pinia, props: { nodeType: gmail() } });

			const row = getByTestId('node-creator-restricted-item');
			expect(row.getAttribute('draggable')).toBe('false');
			expect(row.className).toContain('disabled');
			expect(getByTestId('node-restricted-icon')).toBeInTheDocument();
			expect(container.querySelector('[data-icon="arrow-right"]')).not.toBeInTheDocument();
		});

		it('opens the explanation for the hovered row, anchored to the row', async () => {
			mockRestrictedNodeTypes({ 'n8n-nodes-base.gmail': 'instance' });

			const { getByTestId } = render({ pinia, props: { nodeType: gmail() } });
			expect(screen.queryByTestId('node-restricted-popover')).not.toBeInTheDocument();

			await userEvent.hover(getByTestId('node-creator-restricted-item'));

			expect(await screen.findByText('Restricted on this instance')).toBeInTheDocument();
		});

		it('opens the explanation for the keyboard-active row with its scope', async () => {
			mockRestrictedNodeTypes({ 'n8n-nodes-base.gmail': 'project' });

			render({ pinia, props: { nodeType: gmail(), active: true } });

			expect(await screen.findByText('Restricted in this project')).toBeInTheDocument();
		});

		it('treats a credential-only node like the HTTP Request node it wraps', () => {
			mockRestrictedNodeTypes({ 'n8n-nodes-base.httpRequest': 'instance' });

			const { queryByTestId } = render({
				pinia,
				props: {
					nodeType: mockSimplifiedNodeType({
						name: 'n8n-creds-base.sysdigApi',
						displayName: 'Sysdig',
						group: ['output'],
					}),
				},
			});

			expect(queryByTestId('node-creator-restricted-item')).toBeInTheDocument();
		});

		it('treats a credential-only node as restricted when its credential type is restricted', () => {
			mockRestrictedNodeTypes();
			mockRestrictedCredentialTypes({ sysdigApi: 'project' });

			const { queryByTestId } = render({
				pinia,
				props: {
					nodeType: mockSimplifiedNodeType({
						name: 'n8n-creds-base.sysdigApi',
						displayName: 'Sysdig',
						group: ['output'],
					}),
				},
			});

			expect(queryByTestId('node-creator-restricted-item')).toBeInTheDocument();
		});

		it('renders a normal row when the type is not restricted', () => {
			mockRestrictedNodeTypes();

			const { container, queryByTestId } = render({ pinia, props: { nodeType: gmail() } });

			expect(queryByTestId('node-creator-restricted-item')).not.toBeInTheDocument();
			expect(queryByTestId('node-restricted-icon')).not.toBeInTheDocument();
			expect(container.querySelector('[draggable="true"]')).toBeInTheDocument();
		});
	});
});
