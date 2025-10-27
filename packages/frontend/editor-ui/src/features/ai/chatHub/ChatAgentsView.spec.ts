import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ChatAgentsView from './ChatAgentsView.vue';
import type { ChatHubAgentDto } from '@n8n/api-types';
import * as chatApi from '@/features/ai/chatHub/chat.api';
import * as credentialsApi from '@/features/credentials/credentials.api';

const renderComponent = createComponentRenderer(ChatAgentsView);

const mockAgent: ChatHubAgentDto = {
	id: 'agent-1',
	name: 'Test Agent',
	description: 'A test agent for automated testing',
	provider: 'openai',
	model: 'gpt-4',
	systemPrompt: 'You are a helpful assistant',
	ownerId: 'user-1',
	credentialId: null,
	createdAt: '2025-10-20T10:00:00.000Z',
	updatedAt: '2025-10-27T15:30:00.000Z',
};

const mockAgent2: ChatHubAgentDto = {
	id: 'agent-2',
	name: 'Second Agent',
	description: 'Another agent for testing multiple cards',
	provider: 'anthropic',
	model: 'claude-3',
	systemPrompt: 'You are a coding assistant',
	ownerId: 'user-1',
	credentialId: null,
	createdAt: '2025-10-15T08:00:00.000Z',
	updatedAt: '2025-10-26T12:00:00.000Z',
};

describe('ChatAgentsView.vue', () => {
	beforeEach(() => {
		// Mock API calls only, not store methods
		vi.spyOn(chatApi, 'fetchAgentsApi').mockResolvedValue([]);
		vi.spyOn(chatApi, 'fetchAgentApi').mockResolvedValue(mockAgent);
		vi.spyOn(chatApi, 'deleteAgentApi').mockResolvedValue(undefined);

		// Mock credentials API calls
		vi.spyOn(credentialsApi, 'getCredentialTypes').mockResolvedValue([]);
		vi.spyOn(credentialsApi, 'getAllCredentials').mockResolvedValue([]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should show empty state when no agents are returned from API', async () => {
		vi.mocked(chatApi.fetchAgentsApi).mockResolvedValue([]);

		const pinia = createTestingPinia({ stubActions: false });
		const { findByText, container } = renderComponent({ pinia });

		await findByText(/No custom agents yet/);

		expect(container.textContent).toContain('Create your first agent to get started');
	});

	it('should display agent name and description when API returns agents', async () => {
		vi.mocked(chatApi.fetchAgentsApi).mockResolvedValue([mockAgent]);

		const pinia = createTestingPinia({ stubActions: false });
		const { findByText, container } = renderComponent({ pinia });

		await findByText('Test Agent');

		expect(container.textContent).toContain('A test agent for automated testing');
	});

	it('should display provider and model for each agent', async () => {
		vi.mocked(chatApi.fetchAgentsApi).mockResolvedValue([mockAgent, mockAgent2]);

		const pinia = createTestingPinia({ stubActions: false });
		const { findByText, container } = renderComponent({ pinia });

		await findByText('Test Agent');
		await findByText('Second Agent');

		expect(container.textContent).toContain('OpenAI');
		expect(container.textContent).toContain('gpt-4');
		expect(container.textContent).toContain('Anthropic');
		expect(container.textContent).toContain('claude-3');
	});

	it('should call delete API with correct agent ID when user confirms deletion', async () => {
		const fetchAgentsMock = vi.mocked(chatApi.fetchAgentsApi);
		const deleteAgentMock = vi.mocked(chatApi.deleteAgentApi);
		fetchAgentsMock.mockResolvedValue([mockAgent, mockAgent2]);

		const pinia = createTestingPinia({ stubActions: false });
		const { findByText, container } = renderComponent({ pinia });
		const user = userEvent.setup();

		await findByText('Test Agent');
		await findByText('Second Agent');

		// Click delete button for first agent
		const deleteButtons = container.querySelectorAll('[title="Delete agent"]');
		await user.click(deleteButtons[0] as HTMLElement);

		// Confirm deletion appears in modal
		const confirmButton = await findByText('Delete');
		expect(confirmButton).toBeTruthy();

		await user.click(confirmButton);

		// Verify delete API was called with correct agent ID
		expect(deleteAgentMock).toHaveBeenCalledWith(expect.anything(), 'agent-1');
	});
});
