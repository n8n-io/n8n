import { createComponentRenderer } from '@/__tests__/render';

import NodeErrorView from '@/components/Error/NodeErrorView.vue';

import { createTestingPinia } from '@pinia/testing';
import type { NodeError } from 'n8n-workflow';
import { useAssistantStore } from '@/stores/assistant.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';

const renderComponent = createComponentRenderer(NodeErrorView);

let aiAssistantStore: ReturnType<typeof mockedStore<typeof useAssistantStore>>;
let nodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

describe('NodeErrorView.vue', () => {
	let error: NodeError;

	beforeEach(() => {
		createTestingPinia();

		aiAssistantStore = mockedStore(useAssistantStore);
		nodeTypeStore = mockedStore(useNodeTypesStore);
		//@ts-expect-error
		error = {
			name: 'NodeOperationError',
			message: 'Test error message',
			description: 'Test error description',
			context: {
				descriptionKey: 'noInputConnection',
				nodeCause: 'Test node cause',
				runIndex: '1',
				itemIndex: '2',
				parameter: 'testParameter',
				data: { key: 'value' },
				causeDetailed: 'Detailed cause',
			},
			node: {
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
			},
			messages: ['Test message 1', 'Test message 2'],
			timestamp: Date.now(),
			stack: 'Test stack trace',
			findProperty: () => 'Test error data',
			addToMessages: () => {},
			setDescriptiveErrorMessage: () => [
				'Test error data',
				['Test raw message 1', 'Test raw message 2'],
			],
			lineNumber: 1,
		};
	});
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders an Error with a messages array', async () => {
		const { getByTestId } = renderComponent({
			props: {
				error: {
					node: error.node,
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
					node: error.node,
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
						...error.node,
						type: 'n8n-nodes-base.function',
						typeVersion: 1,
					},
				},
			},
		});

		const aiAssistantButton = queryByTestId('ask-assistant-button');

		expect(aiAssistantButton).toBeNull();
	});

	it('renders error message', () => {
		const { getByTestId } = renderComponent({
			props: { error },
		});
		expect(getByTestId('node-error-message').textContent).toContain('Test error message');
	});

	it('renders error description', () => {
		const { getByTestId } = renderComponent({
			props: { error },
		});
		expect(getByTestId('node-error-description').innerHTML).toContain(
			'This node has no input data. Please make sure this node is connected to another node.',
		);
	});

	it('renders stack trace', () => {
		const { getByText } = renderComponent({
			props: { error },
		});
		expect(getByText('Test stack trace')).toBeTruthy();
	});
});
