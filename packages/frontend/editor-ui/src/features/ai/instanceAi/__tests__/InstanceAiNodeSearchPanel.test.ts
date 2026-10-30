import { createTestingPinia } from '@pinia/testing';
import type { INodeTypeDescription } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import InstanceAiNodeSearchPanel from '../components/InstanceAiNodeSearchPanel.vue';
import type { NodeSearchPanel } from '../instanceAi.workflowStaging';

function mockReducedMotion(reduce: boolean) {
	vi.stubGlobal(
		'matchMedia',
		vi.fn((query: string) => ({
			matches: reduce && query.includes('prefers-reduced-motion'),
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			onchange: null,
			dispatchEvent: vi.fn(),
		})),
	);
}

function nodeType(name: string, displayName: string, group: string[] = ['output']) {
	return {
		name,
		displayName,
		description: `${displayName} description`,
		group,
		version: 1,
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
	} satisfies INodeTypeDescription;
}

const NODE_TYPES = new Map([
	['n8n-nodes-base.gmail', nodeType('n8n-nodes-base.gmail', 'Gmail')],
	[
		'n8n-nodes-base.gmailTrigger',
		nodeType('n8n-nodes-base.gmailTrigger', 'Gmail Trigger', ['trigger']),
	],
	['n8n-nodes-base.slack', nodeType('n8n-nodes-base.slack', 'Slack')],
]);

function panel(overrides: Partial<NodeSearchPanel> = {}): NodeSearchPanel {
	return {
		id: 'tc-search',
		queries: ['gmail', 'slack'],
		searching: false,
		results: ['n8n-nodes-base.gmail', 'n8n-nodes-base.gmailTrigger', 'n8n-nodes-base.slack'],
		picked: [],
		...overrides,
	};
}

const renderComponent = createComponentRenderer(InstanceAiNodeSearchPanel);

function render(props: { panel: NodeSearchPanel }) {
	const pinia = createTestingPinia();
	const nodeTypesStore = mockedStore(useNodeTypesStore);
	nodeTypesStore.getNodeType = vi.fn((name: string) => NODE_TYPES.get(name) ?? null);
	return renderComponent({ pinia, props });
}

describe('InstanceAiNodeSearchPanel', () => {
	beforeEach(() => {
		// Rows and the query show at once, so each test sees the full panel.
		mockReducedMotion(true);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shows the queries of the agent in a search box that the user cannot type in', () => {
		const { getByTestId, container } = render({ panel: panel() });

		expect(getByTestId('instance-ai-node-search-query')).toHaveTextContent('gmail, slack');
		expect(container.querySelector('input')).toBeNull();
	});

	it('shows loading rows while the search runs', () => {
		const { getByTestId, queryAllByTestId } = render({
			panel: panel({ searching: true, results: [] }),
		});

		expect(getByTestId('instance-ai-node-search-loading')).toBeInTheDocument();
		expect(queryAllByTestId('instance-ai-node-search-result')).toHaveLength(0);
	});

	it('shows a row for each result the editor knows, with its name and description', () => {
		const { getAllByTestId } = render({
			panel: panel({ results: [...panel().results, 'acme.unknown'] }),
		});

		const rows = getAllByTestId('instance-ai-node-search-result');
		expect(rows.map((row) => row.textContent)).toEqual([
			expect.stringContaining('Gmail description'),
			expect.stringContaining('Gmail Trigger'),
			expect.stringContaining('Slack'),
		]);
	});

	it('marks the results the agent picked', () => {
		const { getAllByTestId } = render({ panel: panel({ picked: ['n8n-nodes-base.slack'] }) });

		const picked = getAllByTestId('instance-ai-node-search-result').map((row) =>
			row.getAttribute('data-picked'),
		);
		expect(picked).toEqual(['false', 'false', 'true']);
	});

	it('shows at most 8 results', () => {
		const many = Array.from({ length: 12 }, (_, i) => `n8n-nodes-base.slack${i}`);
		const pinia = createTestingPinia();
		const nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn((name: string) => nodeType(name, name));

		const { getAllByTestId } = renderComponent({
			pinia,
			props: { panel: panel({ results: many }) },
		});

		expect(getAllByTestId('instance-ai-node-search-result')).toHaveLength(8);
	});
});
