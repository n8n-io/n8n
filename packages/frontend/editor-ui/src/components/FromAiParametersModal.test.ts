import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import FromAiParametersModal from '@/components/FromAiParametersModal.vue';
import { FROM_AI_PARAMETERS_MODAL_KEY, AI_MCP_TOOL_NODE_TYPE } from '@/constants';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useAgentRequestStore } from '@n8n/stores/useAgentRequestStore';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useRouter } from 'vue-router';
import type { Workflow } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { nextTick } from 'vue';
import { mock } from 'vitest-mock-extended';
import { createTestWorkflow } from '@/__tests__/mocks';
import { type MockedStore, mockedStore } from '@/__tests__/utils';

const ModalStub = {
	template: `
		<div>
			<slot name="header" />
			<slot name="title" />
			<slot name="content" />
			<slot name="footer" />
		</div>
	`,
};

vi.mock('vue-router');

vi.mocked(useRouter);

const mockNode = {
	id: 'id1',
	name: 'Test Node',
	type: 'n8n-nodes-base.ai-tool',
	parameters: {
		testBoolean: "={{ $fromAI('testBoolean', ``, 'boolean') }}",
		testParam: "={{ $fromAi('testParam',  ``, 'string') }}",
	},
};

const mockMcpNode = {
	id: 'id1',
	name: 'Test MCP Node',
	type: AI_MCP_TOOL_NODE_TYPE,
	typeVersion: 1,
	parameters: {},
	credentials: undefined,
};

const mockParentNode = {
	name: 'Parent Node',
};

const mockRunData = {
	data: {
		resultData: {
			runData: {
				['Test Node']: [
					{
						inputOverride: {
							[NodeConnectionTypes.AiTool]: [[{ json: { query: { testParam: 'override' } } }]],
						},
					},
				],
			},
		},
	},
};

const mockWorkflow = createTestWorkflow({
	id: 'test-workflow',
});

const mockWorkflowObject = mock<Workflow>({
	id: mockWorkflow.id,
	getChildNodes: () => ['Parent Node'],
});

const mockTools = [
	{
		name: 'Test Tool',
		value: 'test-tool',
		inputSchema: {
			properties: {
				query: {
					type: 'string',
					description: 'Test query',
				},
			},
		},
	},
];

const renderModal = createComponentRenderer(FromAiParametersModal);
let pinia: ReturnType<typeof createTestingPinia>;
let workflowsStore: ReturnType<typeof useWorkflowsStore>;
let agentRequestStore: ReturnType<typeof useAgentRequestStore>;
let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;

describe('FromAiParametersModal', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					modalsById: {
						[FROM_AI_PARAMETERS_MODAL_KEY]: {
							open: true,
							data: {
								nodeName: 'Test Node',
							},
						},
					},
					modalStack: [FROM_AI_PARAMETERS_MODAL_KEY],
				},
				[STORES.WORKFLOWS]: {
					workflow: mockWorkflow,
					workflowObject: mockWorkflowObject,
					workflowExecutionData: mockRunData,
				},
			},
		});
		workflowsStore = useWorkflowsStore();
		workflowsStore.getNodeByName = vi.fn().mockImplementation((name: string) => {
			switch (name) {
				case 'Test Node':
					return mockNode;
				case 'Test MCP Node':
					return mockMcpNode;
				default:
					return mockParentNode;
			}
		});
		agentRequestStore = useAgentRequestStore();
		agentRequestStore.clearAgentRequests = vi.fn();
		agentRequestStore.setAgentRequestForNode = vi.fn();
		agentRequestStore.getAgentRequest = vi.fn();
		nodeTypesStore = useNodeTypesStore();
		nodeTypesStore.getNodeParameterOptions = vi.fn().mockResolvedValue(mockTools);
		projectsStore = mockedStore(useProjectsStore);
		projectsStore.currentProjectId = 'test-project-id';
	});

	it('renders correctly with node data', () => {
		const { getByTitle } = renderModal({
			props: {
				modalName: FROM_AI_PARAMETERS_MODAL_KEY,
				data: {
					nodeName: 'Test Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		expect(getByTitle('Test Test Node')).toBeTruthy();
	});

	it('shows tool selection for AI tool nodes', async () => {
		const { findByRole } = renderModal({
			props: {
				modalName: FROM_AI_PARAMETERS_MODAL_KEY,
				data: {
					nodeName: 'Test MCP Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		const toolSelect = await findByRole('combobox');
		expect(toolSelect).toBeTruthy();
	});

	it('shows tool parameters after tool selection', async () => {
		const { getByTestId, findByRole, findByText } = renderModal({
			props: {
				modalName: FROM_AI_PARAMETERS_MODAL_KEY,
				data: {
					nodeName: 'Test MCP Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		const toolSelect = await findByRole('combobox');
		await userEvent.click(toolSelect);

		const toolOption = await findByText('Test Tool');
		await userEvent.click(toolOption);
		await nextTick();
		const inputs = getByTestId('from-ai-parameters-modal-inputs');
		const inputByName = inputs.querySelector('input[name="query.query"]');
		expect(inputByName).toBeTruthy();
	});

	it('uses run data when available as initial values', async () => {
		const { getByTestId } = renderModal({
			props: {
				modalName: FROM_AI_PARAMETERS_MODAL_KEY,
				data: {
					nodeName: 'Test Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		await userEvent.click(getByTestId('execute-workflow-button'));

		expect(agentRequestStore.setAgentRequestForNode).toHaveBeenCalledWith('test-workflow', 'id1', {
			query: {
				testBoolean: true,
				testParam: 'override',
			},
		});
	});

	it('clears parameter overrides when modal is executed', async () => {
		const { getByTestId } = renderModal({
			props: {
				modalName: FROM_AI_PARAMETERS_MODAL_KEY,
				data: {
					nodeName: 'Test Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		await userEvent.click(getByTestId('execute-workflow-button'));

		expect(agentRequestStore.clearAgentRequests).toHaveBeenCalledWith('test-workflow', 'id1');
	});

	it('adds agent request with given parameters when executed', async () => {
		const { getByTestId } = renderModal({
			props: {
				modalName: FROM_AI_PARAMETERS_MODAL_KEY,
				data: {
					nodeName: 'Test Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		const inputs = getByTestId('from-ai-parameters-modal-inputs');
		await userEvent.click(inputs.querySelector('input[value="testBoolean"]') as Element);
		await userEvent.clear(inputs.querySelector('input[name="query.testParam"]') as Element);
		await userEvent.type(
			inputs.querySelector('input[name="query.testParam"]') as Element,
			'given value',
		);
		await userEvent.click(getByTestId('execute-workflow-button'));

		expect(agentRequestStore.setAgentRequestForNode).toHaveBeenCalledWith('test-workflow', 'id1', {
			query: {
				testBoolean: false,
				testParam: 'given value',
			},
		});
	});

	it('passes credentials and projectId to MCP tool loading', async () => {
		renderModal({
			props: {
				modalName: FROM_AI_PARAMETERS_MODAL_KEY,
				data: {
					nodeName: 'Test MCP Node',
				},
			},
			global: {
				stubs: {
					Modal: ModalStub,
				},
			},
			pinia,
		});

		await nextTick();

		expect(nodeTypesStore.getNodeParameterOptions).toHaveBeenCalledWith({
			nodeTypeAndVersion: {
				name: AI_MCP_TOOL_NODE_TYPE,
				version: 1,
			},
			path: 'parameters.includedTools',
			methodName: 'getTools',
			currentNodeParameters: {},
			credentials: undefined,
			projectId: 'test-project-id',
		});
	});

	describe('Error handling for MCP requests', () => {
		it('displays error message when MCP tool loading fails', async () => {
			const errorMessage = 'Failed to load MCP tools';
			nodeTypesStore.getNodeParameterOptions = vi.fn().mockRejectedValue(new Error(errorMessage));

			const { findByText, queryByRole, queryByTestId } = renderModal({
				props: {
					modalName: FROM_AI_PARAMETERS_MODAL_KEY,
					data: {
						nodeName: 'Test MCP Node',
					},
				},
				global: {
					stubs: {
						Modal: ModalStub,
					},
				},
				pinia,
			});

			const errorCallout = await findByText(errorMessage);
			expect(errorCallout).toBeTruthy();

			// Should not show the form inputs when error occurs
			const toolSelect = queryByRole('combobox');
			expect(toolSelect).toBeNull();

			const executeButton = queryByTestId('execute-workflow-button');
			expect(executeButton).toBeNull();
		});

		it('displays generic error message for unknown errors', async () => {
			nodeTypesStore.getNodeParameterOptions = vi.fn().mockRejectedValue('String error');

			const { findByText } = renderModal({
				props: {
					modalName: FROM_AI_PARAMETERS_MODAL_KEY,
					data: {
						nodeName: 'Test MCP Node',
					},
				},
				global: {
					stubs: {
						Modal: ModalStub,
					},
				},
				pinia,
			});

			const errorCallout = await findByText('Unknown error occurred');
			expect(errorCallout).toBeTruthy();
		});
	});
});
