import { describe, it, beforeEach, expect, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import {
	createMockModelsResponse,
	createMockAgent,
	createMockConversationResponse,
	createMockSession,
	createMockMessageDto,
	createMockStreamChunk,
} from './__test__/data';
import ChatView from './ChatView.vue';
import * as chatApi from './chat.api';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

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

// Create a reactive route object that can be shared
import { reactive } from 'vue';
import type { EnrichedStructuredChunk } from '@n8n/api-types';
const mockRoute = reactive<{ params: Record<string, any>; query: Record<string, any> }>({
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
	let onMessageUpdated: (chunk: EnrichedStructuredChunk) => void;
	let onDone: () => void;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		onMessageUpdated = () => {};
		onDone = () => {};

		mockRoute.params = {};
		mockRoute.query = {};
		mockRouterPush.mockClear();
		localStorage.clear();

		vi.mocked(chatApi.sendMessageApi).mockClear();
		vi.mocked(chatApi.sendMessageApi).mockImplementation((_ctx, _, onMessageUpdated_, onDone_) => {
			onMessageUpdated = onMessageUpdated_;
			onDone = onDone_;
		});
		vi.mocked(chatApi.editMessageApi).mockClear();
		vi.mocked(chatApi.editMessageApi).mockImplementation(
			(_ctx, _sessionId, _editId, _payload, onMessageUpdated_, onDone_) => {
				onMessageUpdated = onMessageUpdated_;
				onDone = onDone_;
			},
		);
		vi.mocked(chatApi.regenerateMessageApi).mockClear();
		vi.mocked(chatApi.regenerateMessageApi).mockImplementation(
			(_ctx, _sessionId, _retryId, _payload, onMessageUpdated_, onDone_) => {
				onMessageUpdated = onMessageUpdated_;
				onDone = onDone_;
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
		vi.mocked(chatApi.fetchConversationsApi).mockResolvedValue([]);
		vi.mocked(chatApi.updateConversationApi).mockClear();
	});

	describe('Rendering new session', () => {
		it('displays chat starter, conversation header, and prompt input', async () => {
			const rendered = renderComponent({ pinia });

			expect(rendered.queryByRole('log')).not.toBeInTheDocument();
			expect(await rendered.findByText('Hello, Test!')).toBeInTheDocument();
			expect(await rendered.findByRole('textbox')).toBeInTheDocument();
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

			expect(await rendered.findByRole('button', { name: /GPT-4/i })).toBeInTheDocument();
		});

		it.todo('preselects first available agent when no preference exists', async () => {
			// Create fresh pinia instance for this test
			const freshPinia = createPinia();
			setActivePinia(freshPinia);

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

			const rendered = renderComponent({ pinia: freshPinia });

			expect(
				await rendered.findByRole('button', { name: /GPT-4/i }, { timeout: 3000 }),
			).toBeInTheDocument();
		});

		it('disables prompt when no agents are available', async () => {
			vi.mocked(chatApi.fetchChatModelsApi).mockResolvedValue(
				createMockModelsResponse({
					openai: { models: [] },
					anthropic: { models: [] },
					'custom-agent': { models: [] },
					n8n: { models: [] },
				}),
			);

			const rendered = renderComponent({ pinia });

			// Wait for the agents to be loaded and the missingAgent state to be set
			await vi.waitFor(() => {
				const textbox = rendered.getByRole('textbox');
				expect(textbox).toBeDisabled();
			});

			// Also verify the callout message appears
			const callouts = rendered.queryAllByText((content, element) => {
				return element?.textContent?.includes('select a model to start a conversation') ?? false;
			});
			expect(callouts.length).toBeGreaterThan(0);
		});
	});

	describe('Rendering existing session', () => {
		beforeEach(() => {
			mockRoute.params = { id: 'existing-session-123' };

			vi.mocked(chatApi.fetchSingleConversationApi).mockResolvedValue(
				createMockConversationResponse({
					session: createMockSession({
						id: 'existing-session-123',
						title: 'Test Conversation',
						lastMessageAt: new Date().toISOString(),
						provider: 'custom-agent',
						agentId: 'agent-123',
					}),
					conversation: {
						messages: {
							'msg-1': createMockMessageDto({
								id: 'msg-1',
								sessionId: 'existing-session-123',
								content: 'What is the weather today?',
							}),
							'msg-2': createMockMessageDto({
								id: 'msg-2',
								sessionId: 'existing-session-123',
								type: 'ai',
								name: 'Assistant',
								content: 'The weather is sunny today.',
								provider: 'custom-agent',
								agentId: 'agent-123',
								previousMessageId: 'msg-1',
							}),
						},
					},
				}),
			);
		});

		it('displays conversation with messages loaded from API', async () => {
			const rendered = renderComponent({ pinia });

			expect(await rendered.findByText('The weather is sunny today.')).toBeInTheDocument();

			const messages = rendered.container.querySelectorAll('[data-message-id]');
			expect(messages).toHaveLength(2);
			expect(messages[0]).toHaveTextContent('What is the weather today?');
			expect(messages[1]).toHaveTextContent('The weather is sunny today.');
		});

		it.todo(
			'displays error toast and redirects to chat view when fetching conversation fails',
			async () => {
				vi.mocked(chatApi.fetchSingleConversationApi).mockRejectedValue(
					new Error('Conversation not found'),
				);

				const rendered = renderComponent({ pinia });

				expect(await rendered.findByText(/Error fetching a conversation/i)).toBeInTheDocument();

				await vi.waitFor(() => {
					expect(mockRouterPush).toHaveBeenCalledWith({ name: 'chat' });
				});
			},
		);

		it.todo(
			'handles when the agent selected for the conversation is not available anymore',
			async () => {
				vi.mocked(chatApi.fetchChatModelsApi).mockResolvedValue(
					createMockModelsResponse({
						openai: {
							models: [
								createMockAgent({
									name: 'GPT-4',
									model: { provider: 'openai', model: 'gpt-4' },
								}),
							],
						},
					}),
				);

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

			const textarea = (await rendered.findByRole('textbox')) as HTMLTextAreaElement;
			await user.click(textarea);
			await user.type(textarea, 'What is n8n?');

			// Click the submit button instead of pressing Enter
			const submitButton = rendered.getByRole('button', { name: /send/i });
			await user.click(submitButton);

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

			onMessageUpdated(
				createMockStreamChunk({
					type: 'begin',
					content: '',
					metadata: {
						messageId: 'ai-message-123',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			await vi.waitFor(() => expect(textarea.value).toBe(''));

			await rendered.findByText('What is n8n?');
			let messages = rendered.container.querySelectorAll('[data-message-id]');

			onMessageUpdated(
				createMockStreamChunk({
					type: 'item',
					content: 'n8n is',
					metadata: {
						messageId: 'ai-message-123',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			expect(await rendered.findByText(/n8n is/)).toBeInTheDocument();

			onMessageUpdated(
				createMockStreamChunk({
					type: 'item',
					content: ' a workflow',
					metadata: {
						messageId: 'ai-message-123',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			expect(await rendered.findByText(/n8n is a workflow/)).toBeInTheDocument();

			onMessageUpdated(
				createMockStreamChunk({
					type: 'item',
					content: ' automation tool.',
					metadata: {
						messageId: 'ai-message-123',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			onMessageUpdated(
				createMockStreamChunk({
					type: 'end',
					content: '',
					metadata: {
						messageId: 'ai-message-123',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			onDone();

			expect(await rendered.findByText('n8n is a workflow automation tool.')).toBeInTheDocument();
			expect(mockRouterPush).toHaveBeenCalledWith({
				name: 'chat-conversation',
				params: { id: sessionIdFromApi },
			});

			messages = rendered.container.querySelectorAll('[data-message-id]');
			expect(messages).toHaveLength(2);
			expect(messages[0]).toHaveTextContent('What is n8n?');
			expect(messages[1]).toHaveTextContent('n8n is a workflow automation tool.');
		});

		it('sends message in existing session and displays both user and AI messages', async () => {
			const user = userEvent.setup();

			mockRoute.params = { id: 'existing-session-123' };

			vi.mocked(chatApi.fetchSingleConversationApi).mockResolvedValue(
				createMockConversationResponse({
					session: createMockSession({
						id: 'existing-session-123',
						title: 'Existing Conversation',
						lastMessageAt: new Date().toISOString(),
						provider: 'custom-agent',
						agentId: 'agent-123',
					}),
					conversation: {
						messages: {
							'msg-1': createMockMessageDto({
								id: 'msg-1',
								sessionId: 'existing-session-123',
								content: 'Previous question',
							}),
							'msg-2': createMockMessageDto({
								id: 'msg-2',
								sessionId: 'existing-session-123',
								type: 'ai',
								name: 'Assistant',
								content: 'Previous answer',
								provider: 'openai',
								model: 'gpt-4',
								previousMessageId: 'msg-1',
							}),
						},
					},
				}),
			);

			const rendered = renderComponent({ pinia });

			const textarea = (await rendered.findByRole('textbox')) as HTMLTextAreaElement;
			await user.click(textarea);
			await user.type(textarea, 'New question');

			// Click the submit button instead of pressing Enter
			const submitButton = rendered.getByRole('button', { name: /send/i });
			await user.click(submitButton);

			expect(chatApi.sendMessageApi).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					message: 'New question',
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

			onMessageUpdated(
				createMockStreamChunk({
					type: 'begin',
					content: '',
					metadata: {
						messageId: 'ai-message-456',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			await vi.waitFor(() => expect(textarea.value).toBe(''));

			onMessageUpdated(
				createMockStreamChunk({
					type: 'item',
					content: 'AI response here',
					metadata: {
						messageId: 'ai-message-456',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			onMessageUpdated(
				createMockStreamChunk({
					type: 'end',
					content: '',
					metadata: {
						messageId: 'ai-message-456',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			onDone();

			expect(await rendered.findByText('AI response here')).toBeInTheDocument();

			const messages = rendered.container.querySelectorAll('[data-message-id]');
			expect(messages).toHaveLength(4);
			expect(messages[0]).toHaveTextContent('Previous question');
			expect(messages[1]).toHaveTextContent('Previous answer');
			expect(messages[2]).toHaveTextContent('New question');
			expect(messages[3]).toHaveTextContent('AI response here');

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

			onMessageUpdated(
				createMockStreamChunk({
					type: 'begin',
					content: '',
					metadata: {
						messageId: 'ai-message-123',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			onMessageUpdated(
				createMockStreamChunk({
					type: 'item',
					content: 'Starting response...',
					metadata: {
						messageId: 'ai-message-123',
						previousMessageId: messageIdFromApi,
					},
				}),
			);

			await user.click(await rendered.findByRole('button', { name: /stop generating/i }));

			expect(chatApi.stopGenerationApi).toHaveBeenCalledWith(
				expect.anything(),
				sessionId,
				'ai-message-123',
			);
		});
	});
});
