import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { TOOLS_MANAGER_MODAL_KEY } from '@/features/ai/chatHub/constants';
import AgentEditorModal from './AgentEditorModal.vue';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { MODAL_CONFIRM } from '@/app/constants';
import { ref } from 'vue';
import type { ChatModelDto } from '@n8n/api-types';

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string) => key,
		nodeText: () => ({
			topParameterPanel: () => '',
			inputLabelDisplayName: (parameter: { displayName: string }) => parameter.displayName,
			inputLabelDescription: (parameter: { description?: string }) => parameter.description,
			placeholder: (parameter: { placeholder?: string }) => parameter.placeholder,
			hint: (parameter: { hint?: string }) => parameter.hint,
			optionsOptionName: (parameter: { name: string }) => parameter.name,
			optionsOptionDescription: (parameter: { description?: string }) => parameter.description,
			collectionOptionName: (parameter: { displayName: string }) => parameter.displayName,
			credentialsSelectAuthDisplayName: (parameter: { displayName: string }) =>
				parameter.displayName,
			credentialsSelectAuthDescription: (parameter: { description?: string }) =>
				parameter.description,
		}),
	};
	return {
		useI18n: () => i18n,
		i18n,
		i18nInstance: { install: vi.fn() },
	};
});

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn(() => ({ href: '' })) }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: { template: '<a><slot /></a>' },
}));

const mockConfirm = vi.fn();
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: mockConfirm }),
}));

const mockShowError = vi.fn();
const mockShowMessage = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mockShowError, showMessage: mockShowMessage }),
}));

const mockUseCustomAgent = vi.fn();
vi.mock('@/features/ai/chatHub/composables/useCustomAgent', () => ({
	useCustomAgent: (...args: unknown[]) => mockUseCustomAgent(...args),
}));

const mockFetchChatModels = vi.fn();
vi.mock('@/features/ai/chatHub/chat.api', () => ({
	fetchChatModelsApi: (...args: unknown[]) => mockFetchChatModels(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

const MOCK_AGENT = {
	name: 'Test Agent',
	description: 'A test agent',
	systemPrompt: 'You are a helpful assistant',
	provider: 'openai' as const,
	model: 'gpt-4',
	credentialId: 'cred-1',
	toolIds: ['tool-1'],
	icon: { type: 'emoji' as const, value: '🤖' },
};

const MOCK_AGENT_MODEL: ChatModelDto = {
	model: { provider: 'openai', model: 'gpt-4' },
	name: 'GPT-4',
	description: null,
	icon: null,
	createdAt: '',
	updatedAt: '',
	metadata: {
		capabilities: { functionCalling: true },
		inputModalities: [],
		available: true,
	},
	groupName: null,
	groupIcon: null,
};

const sharedStubs = {
	DialogPortal: { template: '<div><slot /></div>' },
	DialogOverlay: { template: '<div />' },
	ModelSelector: {
		template: '<div data-test-id="model-selector" />',
		props: [
			'selectedAgent',
			'includeCustomAgents',
			'credentials',
			'agents',
			'isLoading',
			'warnMissingCredentials',
		],
	},
	ToolsSelector: {
		template: '<div data-test-id="tools-selector" />',
		props: ['disabled', 'disabledTooltip', 'checkedToolIds'],
	},
	N8nIconPicker: {
		template: '<div data-test-id="icon-picker" />',
		props: ['modelValue', 'buttonTooltip'],
	},
};

const MODAL_NAME = 'AgentEditorModal';
const onCloseMock = vi.fn();
const onCreateMock = vi.fn();

function renderModal({
	agentId,
	credentials = {},
}: { agentId?: string; credentials?: Record<string, string> } = {}) {
	return renderComponent(AgentEditorModal, {
		props: {
			modalName: MODAL_NAME,
			data: {
				agentId,
				credentials,
				onClose: onCloseMock,
				onCreateCustomAgent: onCreateMock,
			},
		},
		global: { stubs: sharedStubs },
	});
}

describe('AgentEditorModal', () => {
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
	let chatStore: ReturnType<typeof mockedStore<typeof useChatStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		vi.clearAllMocks();

		createTestingPinia({ stubActions: false });

		uiStore = mockedStore(useUIStore);
		chatStore = mockedStore(useChatStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		uiStore.closeModal = vi.fn();
		uiStore.openModalWithData = vi.fn();
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		chatStore.updateCustomAgent = vi.fn().mockResolvedValue(MOCK_AGENT);
		chatStore.createCustomAgent = vi.fn().mockResolvedValue(MOCK_AGENT_MODEL);
		chatStore.deleteCustomAgent = vi.fn().mockResolvedValue(undefined);
		chatStore.getAgent = vi.fn().mockReturnValue(MOCK_AGENT_MODEL);

		mockFetchChatModels.mockResolvedValue({
			openai: { models: [] },
			anthropic: { models: [] },
			google: { models: [] },
			azureOpenAi: { models: [] },
			azureEntraId: { models: [] },
			ollama: { models: [] },
			awsBedrock: { models: [] },
		});

		mockUseCustomAgent.mockReturnValue({
			isLoading: ref(false),
			customAgent: ref(undefined),
		});
	});

	describe('create mode', () => {
		it('should render with new agent title', () => {
			const { getByText } = renderModal();

			expect(getByText('chatHub.agent.editor.title.new')).toBeTruthy();
		});

		it('should not show delete button', () => {
			const { queryByText, container } = renderModal();

			// No delete button (only shown in edit mode)
			const deleteButton = container.querySelector('.deleteButton');
			expect(deleteButton).toBeNull();
			// But cancel and save are shown
			expect(queryByText('chatHub.tools.editor.cancel')).toBeTruthy();
			expect(queryByText('chatHub.agent.editor.save')).toBeTruthy();
		});

		it('should render form fields', () => {
			const { getByTestId, getByText } = renderModal();

			expect(getByText('chatHub.agent.editor.name.label')).toBeTruthy();
			expect(getByText('chatHub.agent.editor.description.label')).toBeTruthy();
			expect(getByText('chatHub.agent.editor.systemPrompt.label')).toBeTruthy();
			expect(getByText('chatHub.agent.editor.model.label')).toBeTruthy();
			expect(getByText('chatHub.agent.editor.tools.label')).toBeTruthy();
			expect(getByTestId('model-selector')).toBeTruthy();
			expect(getByTestId('tools-selector')).toBeTruthy();
		});

		it('should have save button disabled when form is empty', () => {
			const { getByText } = renderModal();

			const saveButton = getByText('chatHub.agent.editor.save').closest('button');
			expect(saveButton?.disabled).toBe(true);
		});
	});

	describe('edit mode', () => {
		beforeEach(() => {
			mockUseCustomAgent.mockReturnValue({
				isLoading: ref(false),
				customAgent: ref(MOCK_AGENT),
			});
		});

		it('should render with edit title', () => {
			const { getByText } = renderModal({ agentId: 'agent-1' });

			expect(getByText('chatHub.agent.editor.title.edit')).toBeTruthy();
		});

		it('should show delete button', () => {
			const { container } = renderModal({ agentId: 'agent-1' });

			const deleteButton = container.querySelector('.deleteButton');
			expect(deleteButton).toBeTruthy();
		});

		it('should populate form from existing agent', async () => {
			const { container } = renderModal({ agentId: 'agent-1' });

			await waitFor(() => {
				const nameInput = container.querySelector('#agent-name') as HTMLInputElement;
				expect(nameInput?.value).toBe('Test Agent');

				const descInput = container.querySelector('#agent-description') as HTMLTextAreaElement;
				expect(descInput?.value).toBe('A test agent');

				const promptInput = container.querySelector('#agent-system-prompt') as HTMLTextAreaElement;
				expect(promptInput?.value).toBe('You are a helpful assistant');
			});
		});

		it('should have save button enabled when form is valid', async () => {
			const { getByText } = renderModal({
				agentId: 'agent-1',
				credentials: { openai: 'cred-1' },
			});

			await waitFor(() => {
				const saveButton = getByText('chatHub.agent.editor.save').closest('button');
				expect(saveButton?.disabled).toBeFalsy();
			});
		});

		it('should call updateCustomAgent when saving', async () => {
			const { getByText } = renderModal({
				agentId: 'agent-1',
				credentials: { openai: 'cred-1' },
			});

			await waitFor(() => {
				const saveButton = getByText('chatHub.agent.editor.save').closest('button');
				expect(saveButton?.disabled).toBeFalsy();
			});

			const saveButton = getByText('chatHub.agent.editor.save').closest('button') as HTMLElement;
			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(chatStore.updateCustomAgent).toHaveBeenCalledWith(
					'agent-1',
					expect.objectContaining({
						name: 'Test Agent',
						systemPrompt: 'You are a helpful assistant',
						provider: 'openai',
						model: 'gpt-4',
					}),
					{ openai: 'cred-1' },
				);
				expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
				expect(mockShowMessage).toHaveBeenCalled();
			});
		});

		it('should show error toast when save fails', async () => {
			const error = new Error('Save failed');
			chatStore.updateCustomAgent = vi.fn().mockRejectedValue(error);

			const { getByText } = renderModal({
				agentId: 'agent-1',
				credentials: { openai: 'cred-1' },
			});

			await waitFor(() => {
				const saveButton = getByText('chatHub.agent.editor.save').closest('button');
				expect(saveButton?.disabled).toBeFalsy();
			});

			const saveButton = getByText('chatHub.agent.editor.save').closest('button') as HTMLElement;
			await userEvent.click(saveButton);

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(
					error,
					'chatHub.agent.editor.error.save',
					'Save failed',
				);
			});
		});
	});

	describe('delete', () => {
		beforeEach(() => {
			mockUseCustomAgent.mockReturnValue({
				isLoading: ref(false),
				customAgent: ref(MOCK_AGENT),
			});
		});

		it('should delete agent after confirmation', async () => {
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);

			const { container } = renderModal({
				agentId: 'agent-1',
				credentials: { openai: 'cred-1' },
			});

			const deleteButton = container.querySelector('.deleteButton') as HTMLElement;
			await userEvent.click(deleteButton);

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalled();
				expect(chatStore.deleteCustomAgent).toHaveBeenCalledWith('agent-1', {
					openai: 'cred-1',
				});
				expect(onCloseMock).toHaveBeenCalled();
				expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
			});
		});

		it('should not delete when confirmation is cancelled', async () => {
			mockConfirm.mockResolvedValue('cancel');

			const { container } = renderModal({ agentId: 'agent-1' });

			const deleteButton = container.querySelector('.deleteButton') as HTMLElement;
			await userEvent.click(deleteButton);

			await waitFor(() => {
				expect(mockConfirm).toHaveBeenCalled();
			});
			expect(chatStore.deleteCustomAgent).not.toHaveBeenCalled();
		});

		it('should show error toast when delete fails', async () => {
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			const error = new Error('Delete failed');
			chatStore.deleteCustomAgent = vi.fn().mockRejectedValue(error);

			const { container } = renderModal({
				agentId: 'agent-1',
				credentials: { openai: 'cred-1' },
			});

			const deleteButton = container.querySelector('.deleteButton') as HTMLElement;
			await userEvent.click(deleteButton);

			await waitFor(() => {
				expect(mockShowError).toHaveBeenCalledWith(
					error,
					'chatHub.agent.editor.error.delete',
					'Delete failed',
				);
			});
		});
	});

	describe('loading state', () => {
		it('should show spinner while loading agent', () => {
			mockUseCustomAgent.mockReturnValue({
				isLoading: ref(true),
				customAgent: ref(undefined),
			});

			const { container, queryByText } = renderModal({ agentId: 'agent-1' });

			// Spinner should be visible, form fields should not
			expect(container.querySelector('.loader')).toBeTruthy();
			expect(queryByText('chatHub.agent.editor.name.label')).toBeNull();
		});
	});

	describe('tools selector', () => {
		beforeEach(() => {
			mockUseCustomAgent.mockReturnValue({
				isLoading: ref(false),
				customAgent: ref(MOCK_AGENT),
			});
		});

		it('should open tools manager modal when tools button is clicked', async () => {
			chatStore.configuredTools = [];

			const { getByTestId } = renderComponent(AgentEditorModal, {
				props: {
					modalName: MODAL_NAME,
					data: {
						agentId: 'agent-1',
						credentials: { openai: 'cred-1' },
						onClose: onCloseMock,
						onCreateCustomAgent: onCreateMock,
					},
				},
				global: {
					stubs: {
						DialogPortal: { template: '<div><slot /></div>' },
						DialogOverlay: { template: '<div />' },
						ModelSelector: sharedStubs.ModelSelector,
						N8nIconPicker: sharedStubs.N8nIconPicker,
						NodeIcon: { template: '<div />' },
					},
				},
			});

			await waitFor(() => {
				expect(getByTestId('chat-tools-button')).toBeTruthy();
			});

			const toolsButton = getByTestId('chat-tools-button');
			await userEvent.click(toolsButton);

			expect(uiStore.openModalWithData).toHaveBeenCalledWith(
				expect.objectContaining({
					name: TOOLS_MANAGER_MODAL_KEY,
				}),
			);
		});
	});

	it('should close dialog when cancel is clicked', async () => {
		const { getByText } = renderModal();

		const cancelButton = getByText('chatHub.tools.editor.cancel').closest('button') as HTMLElement;
		await userEvent.click(cancelButton);

		expect(uiStore.closeModal).toHaveBeenCalledWith(MODAL_NAME);
	});
});
