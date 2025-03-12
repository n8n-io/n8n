import { createComponentRenderer } from '@/__tests__/render';

import NodeErrorView from '@/components/Error/NodeErrorView.vue';

import { createTestingPinia } from '@pinia/testing';
import type { NodeError } from 'n8n-workflow';
import { useAssistantStore } from '@/stores/assistant.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { mockedStore } from '@/__tests__/utils';
import userEvent from '@testing-library/user-event';
import { useNDVStore } from '@/stores/ndv.store';

const renderComponent = createComponentRenderer(NodeErrorView);

let mockAiAssistantStore: ReturnType<typeof mockedStore<typeof useAssistantStore>>;
let mockNodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
let mockNdvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;

describe('NodeErrorView.vue', () => {
	let error: NodeError;

	beforeEach(() => {
		createTestingPinia();

		mockAiAssistantStore = mockedStore(useAssistantStore);
		mockNodeTypeStore = mockedStore(useNodeTypesStore);
		mockNdvStore = mockedStore(useNDVStore);
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
				name: 'ErrorCode',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [940, 240],
			},
			stack: 'Test stack trace',
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
		mockNodeTypeStore.getNodeType = vi.fn(() => ({
			type: 'n8n-nodes-base.function',
			typeVersion: 1,
			hidden: true,
		}));

		mockAiAssistantStore.canShowAssistantButtonsOnCanvas = true;

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

	it('renders open node button when the error is in sub node', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				error: {
					...error,
					name: 'NodeOperationError',
					functionality: 'configuration-node',
				},
			},
		});

		expect(getByTestId('node-error-view-open-node-button')).toHaveTextContent('Open errored node');

		expect(queryByTestId('ask-assistant-button')).not.toBeInTheDocument();
	});

	it('does not renders open node button when the error is in sub node', () => {
		mockAiAssistantStore.canShowAssistantButtonsOnCanvas = true;
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				error,
			},
		});

		expect(queryByTestId('node-error-view-open-node-button')).not.toBeInTheDocument();

		expect(getByTestId('ask-assistant-button')).toBeInTheDocument();
	});

	it('open error node details when open error node is clicked', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				error: {
					...error,
					name: 'NodeOperationError',
					functionality: 'configuration-node',
				},
			},
		});

		await userEvent.click(getByTestId('node-error-view-open-node-button'));

		expect(emitted().click).toHaveLength(1);
		expect(mockNdvStore.activeNodeName).toBe(error.node.name);
	});
});
