import { createComponentRenderer } from '@/__tests__/render';

import NodeErrorView from '@/components/Error/NodeErrorView.vue';

import { createTestingPinia } from '@pinia/testing';
import { type INode } from 'n8n-workflow';
import { useAssistantStore } from '@/stores/assistant.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';

const renderComponent = createComponentRenderer(NodeErrorView);

let aiAssistantStore: ReturnType<typeof mockedStore<typeof useAssistantStore>>;
let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

describe('NodeErrorView.vue', () => {
	let mockNode: INode;

	beforeEach(() => {
		createTestingPinia();

		aiAssistantStore = mockedStore(useAssistantStore);
		nodeTypeStore = mockedStore(useNodeTypesStore);
	});
	afterEach(() => {
		mockNode = {
			parameters: {
				mode: 'runOnceForAllItems',
				language: 'javaScript',
				jsCode: 'cons error = 9;',
				notice: '',
			},
			id: 'd1ce5dc9-f9ae-4ac6-84e5-0696ba175dd9',
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [940, 240],
		};
		vi.clearAllMocks();
	});

	it('renders an Error with a messages array', async () => {
		const { getByTestId } = renderComponent({
			props: {
				error: {
					node: mockNode,
					messages: ['Unexpected identifier [line 1]'],
				},
			},
		});

		const errorMessage = getByTestId('node-error-message');

		expect(errorMessage).toHaveTextContent('Unexpected identifier [line 1]');
	});

	it('renders an Error with a message string', async () => {
		const { getByTestId } = renderComponent({
			props: {
				error: {
					node: mockNode,
					message: 'Unexpected identifier [line 1]',
				},
			},
		});

		const errorMessage = getByTestId('node-error-message');

		expect(errorMessage).toHaveTextContent('Unexpected identifier [line 1]');
	});

	it('should not render AI assistant button when error happens in deprecated function node', async () => {
		//@ts-expect-error
		nodeTypeStore.getNodeType = vi.fn(() => ({
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			hidden: true,
		}));

		aiAssistantStore.canShowAssistantButtonsOnCanvas = true;

		const { queryByTestId } = renderComponent({
			props: {
				error: {
					node: {
						...mockNode,
						type: 'n8n-nodes-base.function',
						typeVersion: 1,
					},
				},
			},
		});

		const aiAssistantButton = queryByTestId('ask-assistant-button');

		expect(aiAssistantButton).toBeNull();
	});
});
