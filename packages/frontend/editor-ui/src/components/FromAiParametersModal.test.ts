import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import FromAiParametersModal from '@/components/FromAiParametersModal.vue';
import { FROM_AI_PARAMETERS_MODAL_KEY, AI_MCP_TOOL_NODE_TYPE } from '@/constants';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useAgentRequestStore } from '@/stores/agentRequest.store';
import { useRouter } from 'vue-router';
import { NodeConnectionTypes } from 'n8n-workflow';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { nextTick } from 'vue';

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
	parameters: {},
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

const mockWorkflow = {
	id: 'test-workflow',
	getChildNodes: () => ['Parent Node'],
};

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
		workflowsStore.getCurrentWorkflow = vi.fn().mockReturnValue(mockWorkflow);
		agentRequestStore = useAgentRequestStore();
		agentRequestStore.clearAgentRequests = vi.fn();
		agentRequestStore.addAgentRequests = vi.fn();
		agentRequestStore.generateAgentRequest = vi.fn();
		nodeTypesStore = useNodeTypesStore();
		nodeTypesStore.getNodeParameterOptions = vi.fn().mockResolvedValue(mockTools);
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

		expect(agentRequestStore.addAgentRequests).toHaveBeenCalledWith('test-workflow', 'id1', {
			'query.testBoolean': true,
			'query.testParam': 'override',
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

		expect(agentRequestStore.addAgentRequests).toHaveBeenCalledWith('test-workflow', 'id1', {
			'query.testBoolean': false,
			'query.testParam': 'given value',
		});
	});
});
