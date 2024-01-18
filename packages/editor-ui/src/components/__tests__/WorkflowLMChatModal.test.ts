import WorkflowLMChatModal from '@/components/WorkflowLMChat.vue';
import { AGENT_NODE_TYPE, CHAT_TRIGGER_NODE_TYPE, WORKFLOW_LM_CHAT_MODAL_KEY } from '@/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { fireEvent, waitFor } from '@testing-library/vue';
import { uuid } from '@jsplumb/util';
import { createTestNode, createTestWorkflow } from '@/__tests__/mocks';
import { createPinia, setActivePinia } from 'pinia';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { testingNodeTypes, mockNodeTypesToArray } from '@/__tests__/defaults';
import { setupServer } from '@/__tests__/server';

const renderComponent = createComponentRenderer(WorkflowLMChatModal, {
	props: {
		teleported: false,
		appendToBody: false,
	},
});

async function createPiniaWithAINodes(options = { withConnections: true, withAgentNode: true }) {
	const { withConnections, withAgentNode } = options;
	const workflowId = uuid();
	const workflow = createTestWorkflow({
		id: workflowId,
		name: 'Test Workflow',
		connections: withConnections
			? {
					'Chat Trigger': {
						main: [
							[
								{
									node: 'Agent',
									type: 'main',
									index: 0,
								},
							],
						],
					},
			  }
			: {},
		active: true,
		nodes: [
			createTestNode({
				name: 'Chat Trigger',
				type: CHAT_TRIGGER_NODE_TYPE,
			}),
			...(withAgentNode
				? [
						createTestNode({
							name: 'Agent',
							type: AGENT_NODE_TYPE,
						}),
				  ]
				: []),
		],
	});

	const pinia = createPinia();
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();

	nodeTypesStore.setNodeTypes(
		mockNodeTypesToArray({
			[CHAT_TRIGGER_NODE_TYPE]: testingNodeTypes[CHAT_TRIGGER_NODE_TYPE],
			[AGENT_NODE_TYPE]: testingNodeTypes[AGENT_NODE_TYPE],
		}),
	);
	workflowsStore.workflow = workflow;

	await useSettingsStore().getSettings();
	await useUsersStore().loginWithCookie();
	uiStore.openModal(WORKFLOW_LM_CHAT_MODAL_KEY);

	return pinia;
}

describe('WorkflowLMChatModal', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(() => {
		server = setupServer();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render correctly when Agent Node not present', async () => {
		renderComponent({
			pinia: await createPiniaWithAINodes({
				withConnections: false,
				withAgentNode: false,
			}),
		});

		await waitFor(() =>
			expect(document.querySelectorAll('.el-notification')[0]).toHaveTextContent(
				'Missing AI node Chat only works when an AI agent or chain is connected to the chat trigger node',
			),
		);
	});

	it('should render correctly when Agent Node present but not connected to Manual Chat Node', async () => {
		renderComponent({
			pinia: await createPiniaWithAINodes({
				withConnections: false,
				withAgentNode: true,
			}),
		});

		await waitFor(() =>
			expect(document.querySelectorAll('.el-notification')[1]).toHaveTextContent(
				'Missing AI node Chat only works when an AI agent or chain is connected to the chat trigger node',
			),
		);
	});

	it('should render correctly', async () => {
		const wrapper = renderComponent({
			pinia: await createPiniaWithAINodes(),
		});

		await waitFor(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		expect(wrapper.getByTestId('workflow-lm-chat-dialog')).toBeInTheDocument();
	});

	it('should send and display chat message', async () => {
		const wrapper = renderComponent({
			pinia: await createPiniaWithAINodes(),
		});

		await waitFor(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		const chatDialog = wrapper.getByTestId('workflow-lm-chat-dialog');
		const chatSendButton = wrapper.getByTestId('workflow-chat-send-button');
		const chatInput = wrapper.getByTestId('workflow-chat-input');

		await fireEvent.update(chatInput, 'Hello!');
		await fireEvent.click(chatSendButton);

		await waitFor(() => expect(chatDialog.querySelectorAll('.message')).toHaveLength(1));

		expect(chatDialog.querySelector('.message')).toHaveTextContent('Hello!');
	});
});
