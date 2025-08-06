import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import type { NodeError } from 'n8n-workflow';
import { mockedStore } from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import type { IExecutionResponse } from '@/Interface';
import NodeErrorView from '@/components/Error/NodeErrorView.vue';
import { useAssistantStore } from '@/stores/assistant.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

const mockRouterResolve = vi.fn(() => ({
	href: '',
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: mockRouterResolve,
	}),
	useRoute: () => reactive({ meta: {} }),
	RouterLink: vi.fn(),
}));

// Mock window.open
Object.defineProperty(window, 'open', {
	value: vi.fn(),
	writable: true,
});

let mockAiAssistantStore: ReturnType<typeof mockedStore<typeof useAssistantStore>>;
let mockNodeTypeStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;
let mockNDVStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
let mockWorkflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

const renderComponent = createComponentRenderer(NodeErrorView);

describe('NodeErrorView.vue', () => {
	let error: NodeError;

	beforeEach(() => {
		createTestingPinia();
		mockAiAssistantStore = mockedStore(useAssistantStore);
		mockNodeTypeStore = mockedStore(useNodeTypesStore);
		mockNDVStore = mockedStore(useNDVStore);
		mockWorkflowsStore = mockedStore(useWorkflowsStore);

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

	it('renders an Error with a messages array', () => {
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

	it('renders an Error with a message string', () => {
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

	it('should not render AI assistant button when error happens in deprecated function node', () => {
		// @ts-expect-error - Mock node type store method
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

	it('renders stack trace if showDetails is set to true', () => {
		const { getByText } = renderComponent({
			props: { error, showDetails: true },
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

	describe('onOpenErrorNodeDetailClick', () => {
		it('does nothing when error has no node', async () => {
			const errorWithoutNode = {
				name: 'NodeOperationError',
				functionality: 'configuration-node',
				message: 'Error without node',
				node: undefined,
			};

			const { queryByTestId } = renderComponent({
				props: {
					error: errorWithoutNode,
				},
			});

			const button = queryByTestId('node-error-view-open-node-button');

			// If there's no node, button should not render or if it does, clicking it should do nothing
			if (button) {
				await userEvent.click(button);
			}

			expect(window.open).not.toHaveBeenCalled();
			expect(mockNDVStore.activeNodeName).toBeNull();
		});

		it('opens new window when error has different workflow and execution IDs', async () => {
			mockWorkflowsStore.workflowId = 'current-workflow-id';
			mockWorkflowsStore.getWorkflowExecution = {
				id: 'current-execution-id',
			} as IExecutionResponse;

			const testError = {
				...error,
				name: 'NodeOperationError',
				functionality: 'configuration-node',
				workflowId: 'different-workflow-id',
				executionId: 'different-execution-id',
			};

			const { getByTestId } = renderComponent({
				props: {
					error: testError,
				},
			});

			const button = getByTestId('node-error-view-open-node-button');
			await userEvent.click(button);

			expect(mockRouterResolve).toHaveBeenCalledWith({
				name: 'ExecutionPreview',
				params: {
					name: 'different-workflow-id',
					executionId: 'different-execution-id',
					nodeId: 'd1ce5dc9-f9ae-4ac6-84e5-0696ba175dd9',
				},
			});
			expect(window.open).toHaveBeenCalled();
		});

		it('sets active node name when error is in current workflow/execution', async () => {
			mockWorkflowsStore.workflowId = 'current-workflow-id';
			mockWorkflowsStore.getWorkflowExecution = {
				id: 'current-execution-id',
			} as IExecutionResponse;

			const testError = {
				...error,
				name: 'NodeOperationError',
				functionality: 'configuration-node',
				workflowId: 'current-workflow-id',
				executionId: 'current-execution-id',
			};

			const { getByTestId } = renderComponent({
				props: {
					error: testError,
				},
			});

			const button = getByTestId('node-error-view-open-node-button');
			await userEvent.click(button);

			expect(window.open).not.toHaveBeenCalled();
			expect(mockNDVStore.activeNodeName).toBe('ErrorCode');
		});

		it('sets active node name when error has no workflow/execution IDs', async () => {
			const testError = {
				...error,
				name: 'NodeOperationError',
				functionality: 'configuration-node',
			};

			const { getByTestId } = renderComponent({
				props: {
					error: testError,
				},
			});

			const button = getByTestId('node-error-view-open-node-button');
			await userEvent.click(button);

			expect(window.open).not.toHaveBeenCalled();
			expect(mockNDVStore.activeNodeName).toBe('ErrorCode');
		});
	});
});
