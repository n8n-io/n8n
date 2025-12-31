import { createComponentRenderer } from '@/__tests__/render';
import { emptyChatModelsResponse } from '@n8n/api-types';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import {
	createChatHubModuleSettings,
	createMockAgent,
	createMockConversationResponse,
	createMockModelsResponse,
	createMockSession,
	wrapOnMessageUpdate,
	SIMPLE_CONVERSATION,
	CONVERSATION_WITH_ATTACHMENTS,
	MULTI_STEP_AI_CONVERSATION,
	type SimulateStreamChunkFn,
} from './__test__/data';
import * as chatApi from './chat.api';
import ChatView from './ChatView.vue';

// Mock external stores and modules
vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		currentUserId: 'user-123',
		currentUser: {
			id: 'user-123',
			firstName: 'Test',
			fullName: 'Test User',
		},
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		openModal: vi.fn(),
		modalsById: {},
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchCredentialTypes: vi.fn().mockResolvedValue(undefined),
		fetchAllCredentials: vi.fn().mockResolvedValue(undefined),
		fetchAllCredentialsForWorkflow: vi.fn().mockResolvedValue([]),
		getCredentialById: vi.fn().mockReturnValue(undefined),
		getCredentialsByType: vi.fn().mockReturnValue([]),
		getCredentialTypeByName: vi.fn().mockReturnValue(undefined),
		allCredentials: [],
		allCredentialTypes: [],
	}),
}));

vi.mock('./chat.api');

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		settings: {},
		moduleSettings: {
			'chat-hub': createChatHubModuleSettings(),
		},
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProjectId: 'project-123',
		personalProject: { id: 'project-123', type: 'personal' },
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		loadNodeTypesIfNotLoaded: vi.fn().mockResolvedValue(undefined),
		nodeTypes: [],
	}),
}));

const mockRoute = reactive<{ params: Record<string, unknown>; query: Record<string, unknown> }>({
	params: {},
	query: {},
});

const mockRouterPush = vi.fn((route) => {
	// Simulate route navigation by updating mockRoute
	if (typeof route === 'object' && route.params) {
		Object.assign(mockRoute.params, route.params);
	}
});

vi.mock('vue-router', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('vue-router')>();

	return {
		...actual,
		useRoute: () => mockRoute,
		useRouter: () => ({
			push: mockRouterPush,
			resolve: vi.fn(),
		}),
	};
});

const renderComponent = createComponentRenderer(ChatView);

describe('ChatView', () => {
	let pinia: ReturnType<typeof createPinia>;
	let simulateStreamChunk: SimulateStreamChunkFn;
	let simulateStreamDone: () => void;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		simulateStreamChunk = () => {};
		simulateStreamDone = () => {};

		mockRoute.params = {};
		mockRoute.query = {};
		mockRouterPush.mockClear();
		localStorage.clear();

		vi.mocked(chatApi.sendMessageApi).mockClear();
		vi.mocked(chatApi.sendMessageApi).mockImplementation((_ctx, _, onMessageUpdated_, onDone_) => {
			simulateStreamChunk = wrapOnMessageUpdate(onMessageUpdated_);
			simulateStreamDone = onDone_;
		});
		vi.mocked(chatApi.editMessageApi).mockClear();
		vi.mocked(chatApi.editMessageApi).mockImplementation(
			(_ctx, _request, onMessageUpdated_, onDone_) => {
				simulateStreamChunk = wrapOnMessageUpdate(onMessageUpdated_);
				simulateStreamDone = onDone_;
			},
		);
		vi.mocked(chatApi.regenerateMessageApi).mockClear();
		vi.mocked(chatApi.regenerateMessageApi).mockImplementation(
			(_ctx, _request, onMessageUpdated_, onDone_) => {
				simulateStreamChunk = wrapOnMessageUpdate(onMessageUpdated_);
				simulateStreamDone = onDone_;
			},
		);
		vi.mocked(chatApi.stopGenerationApi).mockClear();

		vi.mocked(chatApi.fetchChatModelsApi).mockResolvedValue(
			createMockModelsResponse({
				'custom-agent': {
					models: [
						createMockAgent({
							name: 'Test Custom Agent',
							description: 'A test custom agent',
							model: { provider: 'custom-agent', agentId: 'agent-123' },
						}),
						createMockAgent({
							name: 'My Custom Agent',
							model: { provider: 'custom-agent', agentId: 'agent-456' },
						}),
						createMockAgent({
							name: 'Another Custom Agent',
							model: { provider: 'custom-agent', agentId: 'agent-789' },
						}),
					],
				},
				n8n: {
					models: [
						createMockAgent({
							name: 'My Workflow Agent',
							model: { provider: 'n8n', workflowId: 'workflow-789' },
						}),
						createMockAgent({
							name: 'Another Workflow Agent',
							model: { provider: 'n8n', workflowId: 'workflow-999' },
						}),
					],
				},
				openai: {
					models: [
						createMockAgent({
							name: 'GPT-4',
							model: { provider: 'openai', model: 'gpt-4' },
						}),
						createMockAgent({
							name: 'GPT-3.5',
							model: { provider: 'openai', model: 'gpt-3.5-turbo' },
						}),
					],
				},
				anthropic: {
					models: [
						createMockAgent({
							name: 'Claude 3',
							model: { provider: 'anthropic', model: 'claude-3' },
						}),
					],
				},
			}),
		);
		vi.mocked(chatApi.fetchSingleConversationApi).mockResolvedValue(
			createMockConversationResponse({
				session: createMockSession({
					id: 'session-id',
					provider: null,
					model: null,
				}),
			}),
		);
		vi.mocked(chatApi.fetchConversationsApi).mockResolvedValue({
			data: [],
			nextCursor: null,
			hasMore: false,
		});
		vi.mocked(chatApi.updateConversationApi).mockClear();
	});

	describe('Rendering the new chat UI', () => {
		it('displays greeting message', async () => {
			const rendered = renderComponent({ pinia });

			expect(await rendered.findByText('Hello, Test!')).toBeInTheDocument();
		});

		it('preselects agent from agentId query parameter', async () => {
			mockRoute.query = { agentId: 'agent-456' };

			const rendered = renderComponent({ pinia });

			expect(await rendered.findByRole('button', { name: /My Custom Agent/i })).toBeInTheDocument();
		});

		it('preselects agent from workflowId query parameter', async () => {
			mockRoute.query = { workflowId: 'workflow-789' };

			const rendered = renderComponent({ pinia });

			expect(
				await rendered.findByRole('button', { name: /My Workflow Agent/i }),
			).toBeInTheDocument();
		});

		it('preselects agent from localStorage', async () => {
			localStorage.setItem(
				'user-123_N8N_CHAT_HUB_SELECTED_MODEL',
				JSON.stringify({ provider: 'openai', model: 'gpt-4' }),
			);

			const rendered = renderComponent({ pinia });

			expect(await rendered.findByRole('button', { name: /gpt-4/ })).toBeInTheDocument();
		});

		it('preselects first available agent when no preference exists', async () => {
			vi.mocked(chatApi.fetchChatModelsApi).mockResolvedValueOnce(
				createMockModelsResponse({
					openai: {
						models: [
							createMockAgent({
								name: 'GPT-4',
								model: { provider: 'openai', model: 'gpt-4' },
							}),
						],
					},
					anthropic: {
						models: [
							createMockAgent({
								name: 'Claude 3',
								model: { provider: 'anthropic', model: 'claude-3' },
							}),
						],
					},
				}),
			);

			const rendered = renderComponent({ pinia });

			expect(await rendered.findByRole('button', { name: /GPT-4/ })).toBeInTheDocument();
		});

		it('should show callout if no agent is available', async () => {
			vi.mocked(chatApi.fetchChatModelsApi).mockResolvedValue(emptyChatModelsResponse);

			const rendered = renderComponent({ pinia });

			expect(await rendered.findByText('select a model')).toBeInTheDocument();
			expect(await rendered.findByRole('textbox')).toBeDisabled();
		});
	});

	describe('Rendering existing sessions', () => {
		beforeEach(() => {
			mockRoute.params = { id: 'existing-session-123' };

			vi.mocked(chatApi.fetchSingleConversationApi).mockResolvedValue(SIMPLE_CONVERSATION);
		});

		it('preselects agent set for the session', async () => {
			const rendered = renderComponent({ pinia });

			expect(
				await rendered.findByRole('button', { name: /Test Custom Agent/i }),
			).toBeInTheDocument();
		});

		it('displays conversation with messages loaded from API', async () => {
			const rendered = renderComponent({ pinia });

			await vi.waitFor(() => {
				const messages = rendered.container.querySelectorAll('[data-message-id]');

				expect(messages).toHaveLength(2);
				expect(messages[0]).toHaveTextContent('What is the weather today?');
				expect(messages[1]).toHaveTextContent('The weather is sunny today.');
			});
		});

		it('displays error toast and redirects to chat view when fetching conversation fails', async () => {
			vi.mocked(chatApi.fetchSingleConversationApi).mockRejectedValue(
				new Error('Conversation not found'),
			);

			const rendered = renderComponent({ pinia });

			expect(await rendered.findByText(/Failed to load conversation/i)).toBeInTheDocument();

			await vi.waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith({ name: 'chat' }));
		});

		it.todo(
			'handles when the agent selected for the conversation is not available anymore',
			async () => {
				vi.mocked(chatApi.fetchChatModelsApi).mockResolvedValue(emptyChatModelsResponse);

				const rendered = renderComponent({ pinia });

				expect(await rendered.findByText(/reselect a model/i)).toBeInTheDocument();
				expect(await rendered.findByRole('textbox')).toBeDisabled();
			},
		);
	});

	describe('Sending messages', () => {
		it('sends message in new session, calls API, navigates to conversation view, and displays user message', async () => {
			const user = userEvent.setup();

			mockRoute.query = { agentId: 'agent-123' };

			const rendered = renderComponent({ pinia });
			const textarea = await rendered.findByRole('textbox');

			await user.click(textarea);
			await user.type(textarea, 'What is n8n?');
			await user.click(rendered.getByRole('button', { name: /send/i }));

			expect(chatApi.sendMessageApi).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					message: 'What is n8n?',
					model: { provider: 'custom-agent', agentId: 'agent-123' },
					sessionId: expect.any(String),
					credentials: {},
				}),
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
			);

			const apiCallArgs = vi.mocked(chatApi.sendMessageApi).mock.calls[0];
			const messageIdFromApi = apiCallArgs[1].messageId;
			const sessionIdFromApi = apiCallArgs[1].sessionId;

			simulateStreamChunk('begin', '', {
				messageId: 'ai-message-123',
				previousMessageId: messageIdFromApi,
			});

			await vi.waitFor(() => expect(textarea).toHaveValue(''));
			await rendered.findByText('What is n8n?');

			simulateStreamChunk('item', 'n8n is', {
				messageId: 'ai-message-123',
				previousMessageId: messageIdFromApi,
			});

			expect(await rendered.findByText(/n8n is/)).toBeInTheDocument();

			simulateStreamChunk('item', ' a workflow', {
				messageId: 'ai-message-123',
				previousMessageId: messageIdFromApi,
			});

			expect(await rendered.findByText(/n8n is a workflow/)).toBeInTheDocument();

			simulateStreamChunk('item', ' automation tool.', {
				messageId: 'ai-message-123',
				previousMessageId: messageIdFromApi,
			});

			simulateStreamChunk('end', '', {
				messageId: 'ai-message-123',
				previousMessageId: messageIdFromApi,
			});

			simulateStreamDone();

			expect(await rendered.findByText('n8n is a workflow automation tool.')).toBeInTheDocument();
			expect(mockRouterPush).toHaveBeenCalledWith({
				name: 'chat-conversation',
				params: { id: sessionIdFromApi },
			});

			const messages = rendered.container.querySelectorAll('[data-message-id]');

			expect(messages).toHaveLength(2);
			expect(messages[0]).toHaveTextContent('What is n8n?');
			expect(messages[1]).toHaveTextContent('n8n is a workflow automation tool.');
		});

		it('sends message in existing session and displays both user and AI messages', async () => {
			const user = userEvent.setup();

			mockRoute.params = { id: 'existing-session-123' };

			vi.mocked(chatApi.fetchSingleConversationApi).mockResolvedValue(SIMPLE_CONVERSATION);

			const rendered = renderComponent({ pinia });
			const textarea = await rendered.findByRole('textbox');

			await user.click(textarea);
			await user.type(textarea, 'Will it rain tomorrow?');
			await user.click(rendered.getByRole('button', { name: /send/i }));

			expect(chatApi.sendMessageApi).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					message: 'Will it rain tomorrow?',
					model: { provider: 'custom-agent', agentId: 'agent-123' },
					sessionId: 'existing-session-123',
					credentials: {},
					previousMessageId: 'msg-2',
				}),
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
			);

			const apiCallArgs = vi.mocked(chatApi.sendMessageApi).mock.calls[0];
			const messageIdFromApi = apiCallArgs[1].messageId;

			simulateStreamChunk('begin', '', {
				messageId: 'ai-message-456',
				previousMessageId: messageIdFromApi,
			});

			await vi.waitFor(() => expect(textarea).toHaveValue(''));

			simulateStreamChunk('item', 'No rain expected tomorrow', {
				messageId: 'ai-message-456',
				previousMessageId: messageIdFromApi,
			});
			simulateStreamChunk('end', '', {
				messageId: 'ai-message-456',
				previousMessageId: messageIdFromApi,
			});
			simulateStreamDone();

			expect(await rendered.findByText('No rain expected tomorrow')).toBeInTheDocument();

			const messages = rendered.container.querySelectorAll('[data-message-id]');
			expect(messages).toHaveLength(4);
			expect(messages[0]).toHaveTextContent('What is the weather today?');
			expect(messages[1]).toHaveTextContent('The weather is sunny today.');
			expect(messages[2]).toHaveTextContent('Will it rain tomorrow?');
			expect(messages[3]).toHaveTextContent('No rain expected tomorrow');

			expect(mockRouterPush).not.toHaveBeenCalled();
		});

		it('stops streaming when user clicks stop button and calls stopGeneration API', async () => {
			const user = userEvent.setup();

			mockRoute.query = { agentId: 'agent-123' };

			vi.mocked(chatApi.stopGenerationApi).mockResolvedValue(undefined);

			const rendered = renderComponent({ pinia });

			const textarea = (await rendered.findByRole('textbox')) as HTMLTextAreaElement;
			await user.click(textarea);
			await user.type(textarea, 'Hello, AI!{Enter}');

			const sendApiCall = vi.mocked(chatApi.sendMessageApi).mock.calls[0];
			const messageIdFromApi = sendApiCall[1].messageId;
			const sessionId = sendApiCall[1].sessionId;

			simulateStreamChunk('begin', '', {
				messageId: 'ai-message-123',
				previousMessageId: messageIdFromApi,
			});

			simulateStreamChunk('item', 'Starting response...', {
				messageId: 'ai-message-123',
				previousMessageId: messageIdFromApi,
			});

			await user.click(await rendered.findByRole('button', { name: /stop generating/i }));

			expect(chatApi.stopGenerationApi).toHaveBeenCalledWith(
				expect.anything(),
				sessionId,
				'ai-message-123',
			);
		});
	});

	describe('Editing messages', () => {
		it('edits message with adding and removing files', async () => {
			mockRoute.params = { id: 'existing-session-123' };

			vi.mocked(chatApi.fetchSingleConversationApi).mockResolvedValue(
				CONVERSATION_WITH_ATTACHMENTS,
			);

			const user = userEvent.setup();
			const rendered = renderComponent({ pinia });

			await rendered.findByText('Please analyze these files');

			const humanMessage = rendered.getByTestId('chat-message-msg-1');

			await user.click(within(humanMessage).getByTestId('chat-message-edit'));

			const attachments = within(humanMessage).getAllByTestId('chat-file');
			const fileInput = within(humanMessage).getByTestId('message-edit-file-input');
			const newFile = new File(['new content'], 'new-file.txt', { type: 'text/plain' });

			expect(within(humanMessage).getByRole('textbox')).toHaveValue('Please analyze these files');
			expect(attachments).toHaveLength(3);

			await user.click(within(attachments[1]).getByTestId('chat-file-remove'));
			await user.upload(fileInput, newFile);
			await user.click(within(humanMessage).getByText('Send'));

			await vi.waitFor(() => expect(chatApi.editMessageApi).toHaveBeenCalled());

			expect(chatApi.editMessageApi).toHaveBeenCalledWith(
				expect.anything(),
				{
					sessionId: 'existing-session-123',
					editId: 'msg-1',
					payload: expect.objectContaining({
						message: 'Please analyze these files',
						model: { provider: 'custom-agent', agentId: 'agent-123' },
						keepAttachmentIndices: [0, 2], // Kept file1.txt (index 0) and file3.jpg (index 2)
						newAttachments: [
							expect.objectContaining({
								fileName: 'new-file.txt',
								mimeType: 'text/plain',
								data: expect.any(String), // base64 data
							}),
						],
					}),
				},
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
			);

			const promptId = vi.mocked(chatApi.editMessageApi).mock.calls[0][1].payload.messageId;

			simulateStreamChunk('begin', '', {
				messageId: 'ai-message-revised',
				previousMessageId: promptId,
			});

			simulateStreamChunk('item', 'Updated analysis complete', {
				messageId: 'ai-message-revised',
				previousMessageId: promptId,
			});

			simulateStreamChunk('end', '', {
				messageId: 'ai-message-revised',
				previousMessageId: promptId,
			});

			simulateStreamDone();

			expect(await rendered.findByText('Updated analysis complete')).toBeInTheDocument();
		});
	});

	describe('Regenerating messages', () => {
		it('regenerates AI response and displays streamed content', async () => {
			mockRoute.params = { id: 'existing-session-123' };

			vi.mocked(chatApi.fetchSingleConversationApi).mockResolvedValue(MULTI_STEP_AI_CONVERSATION);

			const user = userEvent.setup();
			const rendered = renderComponent({ pinia });

			await rendered.findByText('Let me use web search tool');

			const messages0 = rendered.container.querySelectorAll('[data-message-id]');
			expect(messages0).toHaveLength(4);
			expect(messages0[0]).toHaveTextContent('Check latest news on the web');
			expect(messages0[1]).toHaveTextContent('I will help you find latest news');
			expect(messages0[2]).toHaveTextContent('Let me use web search tool');
			expect(messages0[3]).toHaveTextContent('Here are latest news: Breaking news today...');

			const aiMessage = rendered.getByTestId('chat-message-msg-3');

			await user.click(within(aiMessage).getByTestId('chat-message-regenerate'));

			expect(chatApi.regenerateMessageApi).toHaveBeenCalledWith(
				expect.anything(),
				{
					sessionId: 'existing-session-123',
					retryId: 'msg-3',
					payload: expect.objectContaining({
						model: { provider: 'custom-agent', agentId: 'agent-123' },
						credentials: {},
					}),
				},
				expect.any(Function),
				expect.any(Function),
				expect.any(Function),
			);

			await rendered.findByTestId('chat-typing-indicator');

			const messages1 = rendered.container.querySelectorAll('[data-message-id]');

			// Verify that the whole sequence of AI response is gone and
			// there's one empty message with typing indicator now, although regenerate button on msg-3 is clicked
			expect(messages1).toHaveLength(2);
			expect(messages1[1]).toHaveTextContent('');
			within(messages1[1] as HTMLElement).getByTestId('chat-typing-indicator');

			simulateStreamChunk('begin', '', {
				messageId: 'ai-message-regenerated',
				previousMessageId: 'msg-1',
				retryOfMessageId: 'msg-3',
			});

			simulateStreamChunk('item', 'Nothing found', {
				messageId: 'ai-message-regenerated',
				previousMessageId: 'msg-1',
				retryOfMessageId: 'msg-3',
			});

			await rendered.findByText(/Nothing found/);

			const messages2 = rendered.container.querySelectorAll('[data-message-id]');

			// Verify that the received chunk is shown and typing indicator is still there
			expect(messages2).toHaveLength(2);
			expect(messages2[1]).toHaveTextContent('Nothing found');
			within(messages2[1] as HTMLElement).getByTestId('chat-typing-indicator');

			simulateStreamChunk('item', ' this time', {
				messageId: 'ai-message-regenerated',
				previousMessageId: 'msg-1',
				retryOfMessageId: 'msg-3',
			});

			simulateStreamChunk('end', '', {
				messageId: 'ai-message-regenerated',
				previousMessageId: 'msg-1',
				retryOfMessageId: 'msg-3',
			});

			simulateStreamDone();

			await vi.waitFor(() => {
				expect(rendered.queryByTestId('chat-typing-indicator')).not.toBeInTheDocument();
			});

			const messages3 = rendered.container.querySelectorAll('[data-message-id]');
			expect(messages3).toHaveLength(2);
			expect(messages3[1]).toHaveTextContent('Nothing found this time');
		});
	});
});
