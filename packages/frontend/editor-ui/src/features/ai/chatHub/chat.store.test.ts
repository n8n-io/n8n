import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChatStore } from './chat.store';
import * as chatApi from './chat.api';
import type { ChatHubToolDto, ChatHubAgentDto, ChatHubSessionDto } from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

function createMockNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'tool-1',
		name: 'Test Tool',
		type: 'n8n-nodes-base.testTool',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function createMockToolDto(overrides: Partial<INode> = {}, enabled = true): ChatHubToolDto {
	return {
		definition: createMockNode(overrides),
		enabled,
	};
}

function createMockSession(overrides: Partial<ChatHubSessionDto> = {}): ChatHubSessionDto {
	return {
		id: 'session-1',
		title: 'Test Session',
		ownerId: 'user-1',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		lastMessageAt: '2024-01-01T00:00:00.000Z',
		credentialId: null,
		provider: 'openai',
		model: 'gpt-4',
		workflowId: null,
		agentId: null,
		agentName: 'GPT-4',
		agentIcon: null,
		toolIds: [],
		...overrides,
	};
}

describe('chat.store - tool methods', () => {
	let store: ReturnType<typeof useChatStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useChatStore();
	});

	describe('fetchConfiguredTools', () => {
		it('should fetch tools and update state', async () => {
			const tools = [createMockToolDto({ id: 'tool-1' }), createMockToolDto({ id: 'tool-2' })];
			vi.spyOn(chatApi, 'fetchToolsApi').mockResolvedValue(tools);

			const result = await store.fetchConfiguredTools();

			expect(chatApi.fetchToolsApi).toHaveBeenCalledWith({});
			expect(result).toEqual(tools);
			expect(store.configuredTools).toEqual(tools);
			expect(store.configuredToolsLoaded).toBe(true);
		});

		it('should set configuredToolsLoaded even when empty', async () => {
			vi.spyOn(chatApi, 'fetchToolsApi').mockResolvedValue([]);

			await store.fetchConfiguredTools();

			expect(store.configuredTools).toEqual([]);
			expect(store.configuredToolsLoaded).toBe(true);
		});
	});

	describe('addConfiguredTool', () => {
		it('should create tool via API and append to state', async () => {
			const node = createMockNode({ id: 'new-tool' });
			const created = createMockToolDto({ id: 'new-tool' });
			vi.spyOn(chatApi, 'createToolApi').mockResolvedValue(created);

			store.configuredTools = [createMockToolDto({ id: 'existing-tool' })];

			const result = await store.addConfiguredTool(node);

			expect(chatApi.createToolApi).toHaveBeenCalledWith({}, node);
			expect(result).toEqual(created);
			expect(store.configuredTools).toHaveLength(2);
			expect(store.configuredTools[1].definition.id).toBe('new-tool');
		});
	});

	describe('updateConfiguredTool', () => {
		it('should update tool via API and replace in state', async () => {
			const original = createMockToolDto({ id: 'tool-1', name: 'Original' });
			const updatedDef = createMockNode({ id: 'tool-1', name: 'Updated' });
			const updated = createMockToolDto({ id: 'tool-1', name: 'Updated' });
			vi.spyOn(chatApi, 'updateToolApi').mockResolvedValue(updated);

			store.configuredTools = [original, createMockToolDto({ id: 'tool-2' })];

			const result = await store.updateConfiguredTool('tool-1', updatedDef);

			expect(chatApi.updateToolApi).toHaveBeenCalledWith({}, 'tool-1', {
				definition: updatedDef,
			});
			expect(result).toEqual(updated);
			expect(store.configuredTools[0].definition.name).toBe('Updated');
			expect(store.configuredTools[1].definition.id).toBe('tool-2');
		});

		it('should not modify other tools', async () => {
			const tool1 = createMockToolDto({ id: 'tool-1', name: 'Tool 1' });
			const tool2 = createMockToolDto({ id: 'tool-2', name: 'Tool 2' });
			const updated = createMockToolDto({ id: 'tool-1', name: 'Updated' });
			vi.spyOn(chatApi, 'updateToolApi').mockResolvedValue(updated);

			store.configuredTools = [tool1, tool2];

			await store.updateConfiguredTool('tool-1', createMockNode({ id: 'tool-1' }));

			expect(store.configuredTools[1]).toStrictEqual(tool2);
		});
	});

	describe('toggleToolEnabled', () => {
		it('should enable a disabled tool', async () => {
			const tool = createMockToolDto({ id: 'tool-1' }, false);
			const updated = createMockToolDto({ id: 'tool-1' }, true);
			vi.spyOn(chatApi, 'updateToolApi').mockResolvedValue(updated);

			store.configuredTools = [tool];

			const result = await store.toggleToolEnabled('tool-1', true);

			expect(chatApi.updateToolApi).toHaveBeenCalledWith({}, 'tool-1', { enabled: true });
			expect(result).toEqual(updated);
			expect(store.configuredTools[0].enabled).toBe(true);
		});

		it('should disable an enabled tool', async () => {
			const tool = createMockToolDto({ id: 'tool-1' }, true);
			const updated = createMockToolDto({ id: 'tool-1' }, false);
			vi.spyOn(chatApi, 'updateToolApi').mockResolvedValue(updated);

			store.configuredTools = [tool];

			await store.toggleToolEnabled('tool-1', false);

			expect(chatApi.updateToolApi).toHaveBeenCalledWith({}, 'tool-1', { enabled: false });
			expect(store.configuredTools[0].enabled).toBe(false);
		});
	});

	describe('removeConfiguredTool', () => {
		it('should delete tool via API and remove from state', async () => {
			vi.spyOn(chatApi, 'deleteToolApi').mockResolvedValue(undefined);

			store.configuredTools = [
				createMockToolDto({ id: 'tool-1' }),
				createMockToolDto({ id: 'tool-2' }),
				createMockToolDto({ id: 'tool-3' }),
			];

			await store.removeConfiguredTool('tool-2');

			expect(chatApi.deleteToolApi).toHaveBeenCalledWith({}, 'tool-2');
			expect(store.configuredTools).toHaveLength(2);
			expect(store.configuredTools.map((t) => t.definition.id)).toEqual(['tool-1', 'tool-3']);
		});

		it('should handle removing the last tool', async () => {
			vi.spyOn(chatApi, 'deleteToolApi').mockResolvedValue(undefined);

			store.configuredTools = [createMockToolDto({ id: 'tool-1' })];

			await store.removeConfiguredTool('tool-1');

			expect(store.configuredTools).toEqual([]);
		});
	});

	describe('toggleCustomAgentTool', () => {
		it('should add tool to custom agent when not present', async () => {
			vi.spyOn(chatApi, 'updateAgentApi').mockResolvedValue({} as ChatHubAgentDto);

			store.customAgents = {
				'agent-1': {
					id: 'agent-1',
					name: 'Test Agent',
					toolIds: ['existing-tool'],
				} as ChatHubAgentDto,
			};

			await store.toggleCustomAgentTool('agent-1', 'new-tool');

			expect(chatApi.updateAgentApi).toHaveBeenCalledWith({}, 'agent-1', {
				toolIds: ['existing-tool', 'new-tool'],
			});
			expect(store.customAgents['agent-1']?.toolIds).toEqual(['existing-tool', 'new-tool']);
		});

		it('should remove tool from custom agent when already present', async () => {
			vi.spyOn(chatApi, 'updateAgentApi').mockResolvedValue({} as ChatHubAgentDto);

			store.customAgents = {
				'agent-1': {
					id: 'agent-1',
					name: 'Test Agent',
					toolIds: ['tool-a', 'tool-b'],
				} as ChatHubAgentDto,
			};

			await store.toggleCustomAgentTool('agent-1', 'tool-a');

			expect(chatApi.updateAgentApi).toHaveBeenCalledWith({}, 'agent-1', {
				toolIds: ['tool-b'],
			});
			expect(store.customAgents['agent-1']?.toolIds).toEqual(['tool-b']);
		});

		it('should throw when agent not found', async () => {
			store.customAgents = {};

			await expect(store.toggleCustomAgentTool('nonexistent', 'tool-1')).rejects.toThrow(
				'Custom agent with ID nonexistent not found',
			);
		});

		it('should handle agent with no toolIds', async () => {
			vi.spyOn(chatApi, 'updateAgentApi').mockResolvedValue({} as ChatHubAgentDto);

			store.customAgents = {
				'agent-1': {
					id: 'agent-1',
					name: 'Test Agent',
				} as ChatHubAgentDto,
			};

			await store.toggleCustomAgentTool('agent-1', 'tool-1');

			expect(chatApi.updateAgentApi).toHaveBeenCalledWith({}, 'agent-1', {
				toolIds: ['tool-1'],
			});
		});
	});

	describe('toggleSessionTool', () => {
		it('should add tool to session when not present', async () => {
			const session = createMockSession({ id: 'session-1', toolIds: ['tool-a'] });
			store.sessions.byId['session-1'] = session;

			vi.spyOn(chatApi, 'updateConversationApi').mockResolvedValue({
				session: { ...session, toolIds: ['tool-a', 'tool-b'] },
				conversation: { messages: {} },
			});

			await store.toggleSessionTool('session-1', 'tool-b');

			expect(chatApi.updateConversationApi).toHaveBeenCalledWith({}, 'session-1', {
				toolIds: ['tool-a', 'tool-b'],
			});
			expect(store.sessions.byId['session-1']?.toolIds).toEqual(['tool-a', 'tool-b']);
		});

		it('should remove tool from session when already present', async () => {
			const session = createMockSession({ id: 'session-1', toolIds: ['tool-a', 'tool-b'] });
			store.sessions.byId['session-1'] = session;

			vi.spyOn(chatApi, 'updateConversationApi').mockResolvedValue({
				session: { ...session, toolIds: ['tool-b'] },
				conversation: { messages: {} },
			});

			await store.toggleSessionTool('session-1', 'tool-a');

			expect(chatApi.updateConversationApi).toHaveBeenCalledWith({}, 'session-1', {
				toolIds: ['tool-b'],
			});
		});

		it('should throw when session not found', async () => {
			await expect(store.toggleSessionTool('nonexistent', 'tool-1')).rejects.toThrow(
				'Session with ID nonexistent not found',
			);
		});

		it('should handle session with no toolIds', async () => {
			const session = createMockSession({ id: 'session-1' });
			// Explicitly set toolIds to undefined to simulate missing field
			(session as unknown as Record<string, unknown>).toolIds = undefined;
			store.sessions.byId['session-1'] = session;

			vi.spyOn(chatApi, 'updateConversationApi').mockResolvedValue({
				session: { ...session, toolIds: ['tool-1'] },
				conversation: { messages: {} },
			});

			await store.toggleSessionTool('session-1', 'tool-1');

			expect(chatApi.updateConversationApi).toHaveBeenCalledWith({}, 'session-1', {
				toolIds: ['tool-1'],
			});
		});
	});

	describe('fetchAgents', () => {
		const CUSTOM_AGENT_MODEL = {
			model: { provider: 'custom-agent' as const, agentId: 'agent-1' },
			agentId: 'agent-1',
			name: 'My Custom Agent',
			description: 'A personal agent',
			icon: { type: 'emoji' as const, value: '🤖' },
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			metadata: {
				capabilities: { functionCalling: true },
				inputModalities: [],
				available: true,
			},
			groupName: null,
			groupIcon: null,
		};

		function createModelsResponse(customAgentModels: Array<typeof CUSTOM_AGENT_MODEL> = []) {
			return {
				openai: {
					models: [
						{
							model: { provider: 'openai' as const, model: 'gpt-4' },
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
						},
					],
				},
				anthropic: { models: [] },
				google: { models: [] },
				azureOpenAi: { models: [] },
				azureEntraId: { models: [] },
				ollama: { models: [] },
				awsBedrock: { models: [] },
				'custom-agent': { models: customAgentModels },
			};
		}

		it('should fetch models and populate agents state', async () => {
			const response = createModelsResponse();
			vi.spyOn(chatApi, 'fetchChatModelsApi').mockResolvedValue(response as never);

			await store.fetchAgents({ openai: 'cred-1' });

			expect(chatApi.fetchChatModelsApi).toHaveBeenCalledWith(
				{},
				{ credentials: { openai: 'cred-1' } },
			);
			expect(store.agents).toEqual(response);
		});

		it('should include custom agents in the response', async () => {
			const response = createModelsResponse([CUSTOM_AGENT_MODEL]);
			vi.spyOn(chatApi, 'fetchChatModelsApi').mockResolvedValue(response as never);

			await store.fetchAgents({ openai: 'cred-1' });

			expect(store.agents['custom-agent'].models).toHaveLength(1);
			expect(store.agents['custom-agent'].models[0].name).toBe('My Custom Agent');
			expect(store.agents['custom-agent'].models[0].model).toEqual({
				provider: 'custom-agent',
				agentId: 'agent-1',
			});
		});

		describe('getCustomAgent', () => {
			it('should retrieve custom agent by agentId', async () => {
				const response = createModelsResponse([CUSTOM_AGENT_MODEL]);
				vi.spyOn(chatApi, 'fetchChatModelsApi').mockResolvedValue(response as never);

				await store.fetchAgents({ openai: 'cred-1' });

				const agent = store.getCustomAgent('agent-1');
				expect(agent).toBeDefined();
				expect(agent?.name).toBe('My Custom Agent');
			});

			it('should return undefined for non-existent custom agent', async () => {
				const response = createModelsResponse([CUSTOM_AGENT_MODEL]);
				vi.spyOn(chatApi, 'fetchChatModelsApi').mockResolvedValue(response as never);

				await store.fetchAgents({ openai: 'cred-1' });

				expect(store.getCustomAgent('nonexistent')).toBeUndefined();
			});
		});
	});
});
