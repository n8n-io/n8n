import { createPinia, setActivePinia } from 'pinia';
import { fireEvent, waitFor } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';
import { NodeConnectionType } from 'n8n-workflow';
import type { IConnections, INode } from 'n8n-workflow';

import WorkflowLMChatModal from '@/components/WorkflowLMChat/WorkflowLMChat.vue';
import { WORKFLOW_LM_CHAT_MODAL_KEY } from '@/constants';
import type { IWorkflowDb } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

import { createComponentRenderer } from '@/__tests__/render';
import { setupServer } from '@/__tests__/server';
import { defaultNodeDescriptions, mockNodes } from '@/__tests__/mocks';

const connections: IConnections = {
	'Chat Trigger': {
		main: [
			[
				{
					node: 'Agent',
					type: NodeConnectionType.Main,
					index: 0,
				},
			],
		],
	},
};

const renderComponent = createComponentRenderer(WorkflowLMChatModal, {
	props: {
		teleported: false,
		appendToBody: false,
	},
});

async function createPiniaWithAINodes(options = { withConnections: true, withAgentNode: true }) {
	const { withConnections, withAgentNode } = options;

	const chatTriggerNode = mockNodes[4];
	const agentNode = mockNodes[5];
	const nodes: INode[] = [chatTriggerNode];
	if (withAgentNode) nodes.push(agentNode);
	const workflow = mock<IWorkflowDb>({
		nodes,
		...(withConnections ? { connections } : {}),
	});

	const pinia = createPinia();
	setActivePinia(pinia);

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();

	nodeTypesStore.setNodeTypes(defaultNodeDescriptions);
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
			pinia: await createPiniaWithAINodes({
				withConnections: true,
				withAgentNode: true,
			}),
		});

		await waitFor(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		const chatDialog = wrapper.getByTestId('workflow-lm-chat-dialog');
		const chatInputsContainer = wrapper.getByTestId('lm-chat-inputs');
		const chatSendButton = chatInputsContainer.querySelector('.chat-input-send-button');
		const chatInput = chatInputsContainer.querySelector('textarea');

		if (chatInput && chatSendButton) {
			await fireEvent.update(chatInput, 'Hello!');
			await fireEvent.click(chatSendButton);
		}

		await waitFor(() => expect(chatDialog.querySelectorAll('.chat-message')).toHaveLength(1));

		expect(chatDialog.querySelector('.chat-message')).toHaveTextContent('Hello!');
	});
});
