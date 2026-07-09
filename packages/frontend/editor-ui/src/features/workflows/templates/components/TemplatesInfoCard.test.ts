import { createComponentRenderer } from '@/__tests__/render';
import { createPinia, setActivePinia } from 'pinia';
import TemplatesInfoCard from './TemplatesInfoCard.vue';
import type { ITemplatesCollection } from '@n8n/rest-api-client';

let pinia: ReturnType<typeof createPinia>;
const renderComponent = createComponentRenderer(TemplatesInfoCard);

const TEST_COLLECTION: ITemplatesCollection = {
	id: 8,
	name: 'Advanced AI',
	workflows: [{ id: 1951 }, { id: 1953 }, { id: 1954 }, { id: 1955 }],
	nodes: [
		{
			id: 1119,
			icon: 'fa:robot',
			name: '@n8n/n8n-nodes-langchain.agent',
			iconData: {
				icon: 'robot',
				type: 'icon',
			},
			displayName: 'Agent',
			defaults: {},
		},
		{
			id: 1121,
			icon: 'fa:link',
			name: '@n8n/n8n-nodes-langchain.chainSummarization',
			iconData: {
				icon: 'link',
				type: 'icon',
			},
			displayName: 'Summarization Chain',
			defaults: {},
		},
		{
			id: 1123,
			icon: 'fa:link',
			name: '@n8n/n8n-nodes-langchain.chainLlm',
			iconData: {
				icon: 'link',
				type: 'icon',
			},
			displayName: 'Basic LLM Chain',
			defaults: {},
		},
	],
};

describe('TemplatesInfoCard', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render component properly', () => {
		const { getByText, container } = renderComponent({
			pinia,
			props: {
				collection: TEST_COLLECTION,
			},
		});
		expect(getByText(TEST_COLLECTION.name)).toBeInTheDocument();
		expect(getByText(`${TEST_COLLECTION.workflows.length} Workflows`)).toBeVisible();
		expect(container.querySelectorAll('.n8n-node-icon').length).toBe(TEST_COLLECTION.nodes.length);
	});

	it('should not render item count if configured so', () => {
		const { getByText } = renderComponent({
			pinia,
			props: {
				collection: TEST_COLLECTION,
				showItemCount: false,
			},
		});
		expect(getByText(`${TEST_COLLECTION.workflows.length} Workflows`)).not.toBeVisible();
	});
});
