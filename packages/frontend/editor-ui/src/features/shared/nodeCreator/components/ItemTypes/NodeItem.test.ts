import type { Pinia } from 'pinia';
import { createPinia, setActivePinia } from 'pinia';

import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { mockSimplifiedNodeType } from '../../__tests__/utils';
import NodeItem from './NodeItem.vue';

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

const render = createComponentRenderer(NodeItem);

describe('NodeItem', () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
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
					displayName: 'Message an n8n Agent',
					group: ['transform'],
				}),
			},
		});

		expect(container.querySelector('[draggable="false"]')).toBeInTheDocument();
		expect(container.querySelector('[data-icon="arrow-right"]')).toBeInTheDocument();
		expect(container.querySelector('[data-test-id="node-creator-node-item"]')).toBeInTheDocument();
	});
});
