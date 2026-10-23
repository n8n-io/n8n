import { mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { BinaryDataService } from 'n8n-core';
import type { INode } from 'n8n-workflow';

import { saveCredential } from '@test-integration/db/credentials';
import { createMember } from '@test-integration/db/users';

import { WorkflowExecutionService } from '../../../workflows/workflow-execution.service';
import { ChatHubAgent } from '../chat-hub-agent.entity';
import { ChatHubAgentRepository } from '../chat-hub-agent.repository';
import { ChatHubAgentService } from '../chat-hub-agent.service';
import { ChatHubCredentialsService } from '../chat-hub-credentials.service';
import { ChatHubSession } from '../chat-hub-session.entity';
import type { ChatHubTool } from '../chat-hub-tool.entity';
import { ChatHubToolRepository } from '../chat-hub-tool.repository';
import { ChatHubToolService } from '../chat-hub-tool.service';
import { ChatHubService } from '../chat-hub.service';
import { ChatHubSessionRepository } from '../chat-session.repository';

mockInstance(BinaryDataService);
mockInstance(WorkflowExecutionService);
mockInstance(ChatHubCredentialsService);

beforeAll(async () => {
	await testModules.loadModules(['chat-hub']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'ChatHubSession',
		'ChatHubAgent',
		'ChatHubTool',
		'SharedCredentials',
		'CredentialsEntity',
	]);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('chat hub tool references', () => {
	let chatHubService: ChatHubService;
	let agentService: ChatHubAgentService;
	let toolService: ChatHubToolService;
	let toolRepository: ChatHubToolRepository;
	let sessionRepository: ChatHubSessionRepository;
	let agentRepository: ChatHubAgentRepository;

	let owner: User;
	let otherUser: User;

	beforeAll(() => {
		chatHubService = Container.get(ChatHubService);
		agentService = Container.get(ChatHubAgentService);
		toolService = Container.get(ChatHubToolService);
		toolRepository = Container.get(ChatHubToolRepository);
		sessionRepository = Container.get(ChatHubSessionRepository);
		agentRepository = Container.get(ChatHubAgentRepository);
	});

	beforeEach(async () => {
		owner = await createMember();
		otherUser = await createMember();
	});

	async function createTool(ownerId: string) {
		const id = crypto.randomUUID();
		const definition: INode = {
			id,
			name: `Tool ${id}`,
			type: 'n8n-nodes-base.httpRequestTool',
			typeVersion: 4.4,
			position: [0, 0],
			parameters: {},
		};
		return await toolRepository.createTool({
			id,
			name: definition.name,
			type: definition.type,
			typeVersion: definition.typeVersion,
			ownerId,
			definition,
			enabled: true,
		});
	}

	async function createSession(ownerId: string) {
		return await sessionRepository.createChatSession({
			id: crypto.randomUUID(),
			ownerId,
			title: 'session',
			lastMessageAt: new Date(),
		});
	}

	async function createAgent(ownerId: string) {
		return await agentRepository.createAgent({
			id: crypto.randomUUID(),
			name: 'agent',
			systemPrompt: 'prompt',
			ownerId,
			credentialId: null,
			provider: 'openai',
			model: 'gpt-4',
			files: [],
		});
	}

	/** Reads every stored link row, without the owner filter that the services apply */
	async function storedLinkIds(entity: typeof ChatHubSession | typeof ChatHubAgent, id: string) {
		const tools = await toolRepository.manager
			.createQueryBuilder()
			.relation(entity, 'tools')
			.of(id)
			.loadMany<ChatHubTool>();
		return tools.map((t) => t.id).sort();
	}

	describe('updateSession', () => {
		it('should set tools that the user owns', async () => {
			const session = await createSession(owner.id);
			const tool = await createTool(owner.id);

			await chatHubService.updateSession(owner, session.id, { toolIds: [tool.id] });

			expect(await toolService.getToolIdsForSession(session.id)).toEqual([tool.id]);
		});

		it('should reject tools that another user owns and keep the session unchanged', async () => {
			const session = await createSession(owner.id);
			const ownTool = await createTool(owner.id);
			const foreignTool = await createTool(otherUser.id);
			await chatHubService.updateSession(owner, session.id, { toolIds: [ownTool.id] });

			await expect(
				chatHubService.updateSession(owner, session.id, {
					title: 'renamed',
					toolIds: [ownTool.id, foreignTool.id],
				}),
			).rejects.toThrow(NotFoundError);

			expect(await toolService.getToolIdsForSession(session.id)).toEqual([ownTool.id]);
			const stored = await sessionRepository.findOneByOrFail({ id: session.id });
			expect(stored.title).toBe('session');
		});

		it('should accept duplicate IDs of an owned tool', async () => {
			const session = await createSession(owner.id);
			const tool = await createTool(owner.id);

			await chatHubService.updateSession(owner, session.id, { toolIds: [tool.id, tool.id] });

			expect(await toolService.getToolIdsForSession(session.id)).toEqual([tool.id]);
		});

		it('should keep the tool links unchanged when the session update fails', async () => {
			const session = await createSession(owner.id);
			const tool = await createTool(owner.id);

			await expect(
				chatHubService.updateSession(owner, session.id, {
					credentialId: crypto.randomUUID(),
					toolIds: [tool.id],
				}),
			).rejects.toThrow();

			expect(await storedLinkIds(ChatHubSession, session.id)).toEqual([]);
		});

		it('should only return owned tool IDs and remove other links on the next save', async () => {
			const session = await createSession(owner.id);
			const ownTool = await createTool(owner.id);
			const foreignTool = await createTool(otherUser.id);
			// Write the link rows directly to simulate rows stored before validation existed
			await toolRepository.setSessionTools(session.id, [ownTool.id, foreignTool.id]);

			const { session: dto } = await chatHubService.getConversation(owner.id, session.id);
			expect(dto.toolIds).toEqual([ownTool.id]);

			await chatHubService.updateSession(owner, session.id, { toolIds: dto.toolIds });

			expect(await storedLinkIds(ChatHubSession, session.id)).toEqual([ownTool.id]);
		});
	});

	describe('createAgent', () => {
		async function agentRequest() {
			const credential = await saveCredential(
				{ name: 'OpenAI', type: 'openAiApi', data: { apiKey: 'test-api-key' } },
				{ user: owner, role: 'credential:owner' },
			);
			return {
				name: 'agent',
				systemPrompt: 'prompt',
				icon: { type: 'emoji' as const, value: '🤖' },
				credentialId: credential.id,
				provider: 'openai' as const,
				model: 'gpt-4',
			};
		}

		it('should set tools that the user owns', async () => {
			const tool = await createTool(owner.id);

			const agent = await agentService.createAgent(owner, {
				...(await agentRequest()),
				toolIds: [tool.id],
			});

			expect(await toolService.getToolIdsForAgent(agent.id)).toEqual([tool.id]);
		});

		it('should reject tools that another user owns and not create the agent', async () => {
			const foreignTool = await createTool(otherUser.id);

			await expect(
				agentService.createAgent(owner, { ...(await agentRequest()), toolIds: [foreignTool.id] }),
			).rejects.toThrow(NotFoundError);

			expect(await agentRepository.getManyByUserId(owner.id)).toHaveLength(0);
		});

		it('should return each tool ID once when the request repeats an ID', async () => {
			const tool = await createTool(owner.id);

			const agent = await agentService.createAgent(owner, {
				...(await agentRequest()),
				toolIds: [tool.id, tool.id],
			});

			expect(agent.toolIds).toEqual([tool.id]);
		});
	});

	describe('updateAgent', () => {
		it('should reject tools that another user owns and keep the agent unchanged', async () => {
			const agent = await createAgent(owner.id);
			const foreignTool = await createTool(otherUser.id);

			await expect(
				agentService.updateAgent(agent.id, owner, { name: 'renamed', toolIds: [foreignTool.id] }),
			).rejects.toThrow(NotFoundError);

			expect(await toolService.getToolIdsForAgent(agent.id)).toEqual([]);
			const stored = await agentRepository.findOneByOrFail({ id: agent.id });
			expect(stored.name).toBe('agent');
		});

		it('should keep the tool links unchanged when the agent update fails', async () => {
			const agent = await createAgent(owner.id);
			const tool = await createTool(owner.id);

			await expect(
				agentService.updateAgent(agent.id, owner, {
					credentialId: crypto.randomUUID(),
					toolIds: [tool.id],
				}),
			).rejects.toThrow();

			expect(await storedLinkIds(ChatHubAgent, agent.id)).toEqual([]);
		});

		it('should only return owned tool IDs and remove other links on the next save', async () => {
			const agent = await createAgent(owner.id);
			const ownTool = await createTool(owner.id);
			const foreignTool = await createTool(otherUser.id);
			await toolRepository.setAgentTools(agent.id, [ownTool.id, foreignTool.id]);

			const dto = await agentService.getAgentByIdAsDto(agent.id, owner.id);
			expect(dto.toolIds).toEqual([ownTool.id]);

			await agentService.updateAgent(agent.id, owner, { toolIds: dto.toolIds });

			expect(await storedLinkIds(ChatHubAgent, agent.id)).toEqual([ownTool.id]);
		});
	});

	describe('tool definitions at run time', () => {
		it('should only return session tools that the session owner owns', async () => {
			const session = await createSession(owner.id);
			const ownTool = await createTool(owner.id);
			const foreignTool = await createTool(otherUser.id);
			// Write the link rows directly to simulate rows stored before validation existed
			await toolRepository.setSessionTools(session.id, [ownTool.id, foreignTool.id]);

			const definitions = await toolService.getToolDefinitionsForSession(session.id);

			expect(definitions.map((d) => d.id)).toEqual([ownTool.id]);
		});

		it('should only return agent tools that the agent owner owns', async () => {
			const agent = await createAgent(owner.id);
			const ownTool = await createTool(owner.id);
			const foreignTool = await createTool(otherUser.id);
			await toolRepository.setAgentTools(agent.id, [ownTool.id, foreignTool.id]);

			const definitions = await toolService.getToolDefinitionsForAgent(agent.id);

			expect(definitions.map((d) => d.id)).toEqual([ownTool.id]);
		});
	});
});
