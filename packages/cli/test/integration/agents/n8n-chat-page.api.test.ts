import { randomUUID } from 'node:crypto';

import type { AgentExecutionStatus } from '@n8n/api-types';
import { createTeamProject, linkUserToProject, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';

import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });
const chatIntegration = { type: 'n8n_chat', credentialId: '' } as const;

// These routes go through the controller registry, so they also check the handler signatures.
describe('n8n Chat page HTTP routes', () => {
	async function createPublishedAgent(
		projectId: string,
		{
			withChat = true,
			model = 'anthropic/claude-sonnet-4-5',
			name = 'Support agent',
			subAgents,
		}: {
			withChat?: boolean;
			model?: string;
			name?: string;
			subAgents?: Array<{ agentId: string; enabled?: boolean }>;
		} = {},
	) {
		const agentRepository = Container.get(AgentRepository);
		const agent = await agentRepository.save(
			agentRepository.create({
				id: randomUUID(),
				name,
				projectId,
				schema: { name, model, instructions: 'Help' },
				integrations: [chatIntegration],
				tools: {},
				skills: {},
				versionId: randomUUID(),
			}),
		);
		const versionId = randomUUID();
		await Container.get(AgentHistoryRepository).saveVersion({
			versionId,
			agentId: agent.id,
			schema: {
				name,
				description: 'Answers support questions',
				model,
				instructions: 'Help',
				integrations: withChat ? [chatIntegration] : [],
				...(subAgents ? { subAgents: { agents: subAgents } } : {}),
			},
			tools: {},
			skills: {},
			publishedBy: 'test',
		});
		await agentRepository.update({ id: agent.id }, { activeVersionId: versionId });
		return agent;
	}

	async function createN8nChatThread(
		agentId: string,
		projectId: string,
		ownerId: string,
		title: string | null = 'My chat',
		{
			source = 'n8n_chat_production',
			status = 'success',
		}: { source?: string; status?: AgentExecutionStatus } = {},
	) {
		const threadRepository = Container.get(AgentExecutionThreadRepository);
		const thread = await threadRepository.save(
			threadRepository.create({
				id: randomUUID(),
				agentId,
				agentName: 'Support agent',
				projectId,
				accessScope: 'user',
				ownerId,
				title,
				sessionNumber: 1,
			}),
		);
		const executionRepository = Container.get(AgentExecutionRepository);
		await executionRepository.save(
			executionRepository.create({
				id: randomUUID(),
				threadId: thread.id,
				status,
				userMessage: 'Hello',
				source,
			}),
		);
		return thread;
	}

	async function setup() {
		const owner = await createOwner();
		const chatUser = await createMember();
		const project = await createTeamProject('Support', owner);
		await linkUserToProject(chatUser, project, 'project:chatUser');
		const agent = await createPublishedAgent(project.id);
		return { owner, chatUser, project, agent };
	}

	it('returns one reachable agent in the chat list shape, plus attachments and sub-agents', async () => {
		const { chatUser, project, agent } = await setup();

		const response = await server
			.authAgentFor(chatUser)
			.get(`/agents/v2/n8n-chat/agents/${agent.id}`)
			.expect(200);

		expect(response.body.data).toEqual({
			id: agent.id,
			name: 'Support agent',
			description: 'Answers support questions',
			project: { id: project.id, name: 'Support' },
			attachments: { image: true, pdf: true, audio: false },
			subAgents: [],
		});
	});

	it('resolves sub-agent names for a chat-only member, including disabled entries', async () => {
		const { chatUser, project } = await setup();
		const researcher = await createPublishedAgent(project.id, {
			withChat: false,
			name: 'Researcher',
		});
		const retired = await createPublishedAgent(project.id, { withChat: false, name: 'Retired' });
		const agent = await createPublishedAgent(project.id, {
			subAgents: [{ agentId: researcher.id }, { agentId: retired.id, enabled: false }],
		});

		const response = await server
			.authAgentFor(chatUser)
			.get(`/agents/v2/n8n-chat/agents/${agent.id}`)
			.expect(200);

		expect(response.body.data.subAgents).toEqual([
			{ id: researcher.id, name: 'Researcher' },
			{ id: retired.id, name: 'Retired' },
		]);
	});

	it('returns 404 for an agent without the published n8n Chat channel', async () => {
		const { chatUser, project } = await setup();
		const agent = await createPublishedAgent(project.id, { withChat: false });

		await server.authAgentFor(chatUser).get(`/agents/v2/n8n-chat/agents/${agent.id}`).expect(404);
	});

	it('lists chat agents sorted by usage', async () => {
		const { chatUser, project, agent } = await setup();
		const busierAgent = await createPublishedAgent(project.id);
		await createN8nChatThread(agent.id, project.id, chatUser.id);
		await createN8nChatThread(busierAgent.id, project.id, chatUser.id);
		await createN8nChatThread(busierAgent.id, project.id, chatUser.id);

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2')
			.query({ filter: JSON.stringify({ availableInChat: true }), sortBy: 'usage:desc' })
			.expect(200);

		expect(response.body).toMatchObject({
			count: 2,
			data: [
				{ id: busierAgent.id, attachments: { image: true, pdf: true, audio: false } },
				{ id: agent.id },
			],
		});
		// The list carries attachments (the composer needs them), but sub-agents stay single-agent only.
		expect(response.body.data[0]).not.toHaveProperty('subAgents');
	});

	it("lists the user's own n8n Chat threads", async () => {
		const { owner, chatUser, project, agent } = await setup();
		const thread = await createN8nChatThread(agent.id, project.id, chatUser.id);
		await createN8nChatThread(agent.id, project.id, owner.id);

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2/n8n-chat/threads')
			.expect(200);

		expect(response.body).toMatchObject({
			data: [{ id: thread.id, title: 'My chat', agent: { id: agent.id, projectId: project.id } }],
			nextCursor: null,
		});
	});

	it('narrows the thread list to one agent via the agentId filter', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createN8nChatThread(agent.id, project.id, chatUser.id);
		const otherAgent = await createPublishedAgent(project.id);
		await createN8nChatThread(otherAgent.id, project.id, chatUser.id);

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2/n8n-chat/threads')
			.query({ agentId: agent.id })
			.expect(200);

		expect(response.body).toMatchObject({
			data: [{ id: thread.id, agent: { id: agent.id } }],
			nextCursor: null,
		});
	});

	it('finds a thread by a case-insensitive, partial title search', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createN8nChatThread(agent.id, project.id, chatUser.id, 'Refund status');
		await createN8nChatThread(agent.id, project.id, chatUser.id, 'Unrelated topic');

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2/n8n-chat/threads')
			.query({ search: 'REFUND' })
			.expect(200);

		expect(response.body).toMatchObject({ data: [{ id: thread.id }], nextCursor: null });
	});

	it('returns one of the own n8n Chat threads by id', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createN8nChatThread(agent.id, project.id, chatUser.id);

		const response = await server
			.authAgentFor(chatUser)
			.get(`/agents/v2/n8n-chat/threads/${thread.id}`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: thread.id,
			title: 'My chat',
			agent: { id: agent.id, projectId: project.id },
		});
	});

	it("returns 404 for another user's thread", async () => {
		const { owner, chatUser, project, agent } = await setup();
		const thread = await createN8nChatThread(agent.id, project.id, owner.id);

		await server.authAgentFor(chatUser).get(`/agents/v2/n8n-chat/threads/${thread.id}`).expect(404);
	});

	it('returns 404 when the thread belongs to an unreachable or unpublished agent', async () => {
		const { chatUser, project } = await setup();
		const unpublishedAgent = await createPublishedAgent(project.id, { withChat: false });
		const thread = await createN8nChatThread(unpublishedAgent.id, project.id, chatUser.id);

		await server.authAgentFor(chatUser).get(`/agents/v2/n8n-chat/threads/${thread.id}`).expect(404);
	});

	it('returns 404 for an unknown thread id', async () => {
		const { chatUser } = await setup();

		await server
			.authAgentFor(chatUser)
			.get(`/agents/v2/n8n-chat/threads/${randomUUID()}`)
			.expect(404);
	});

	it('lets a chat user read the history of their own thread', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createN8nChatThread(agent.id, project.id, chatUser.id);

		await server
			.authAgentFor(chatUser)
			.get(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}/messages`)
			.expect(200);
	});

	describe('deleting an own n8n Chat thread', () => {
		it('lets a chat-only member delete their own thread, and it drops from the thread list', async () => {
			const { chatUser, project, agent } = await setup();
			const thread = await createN8nChatThread(agent.id, project.id, chatUser.id);

			await server
				.authAgentFor(chatUser)
				.delete(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}`)
				.expect(200, { data: { success: true } });

			const response = await server
				.authAgentFor(chatUser)
				.get('/agents/v2/n8n-chat/threads')
				.expect(200);
			expect(response.body.data).toEqual([]);
		});

		it("returns 404 for another user's thread", async () => {
			const { owner, chatUser, project, agent } = await setup();
			const thread = await createN8nChatThread(agent.id, project.id, owner.id);

			await server
				.authAgentFor(chatUser)
				.delete(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}`)
				.expect(404);
		});

		it('returns 404 for a preview (non n8n-chat) thread', async () => {
			const { chatUser, project, agent } = await setup();
			const thread = await createN8nChatThread(agent.id, project.id, chatUser.id, 'Preview chat', {
				source: 'chat',
			});

			await server
				.authAgentFor(chatUser)
				.delete(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}`)
				.expect(404);
		});

		it('returns 409 for a thread with running work', async () => {
			const { chatUser, project, agent } = await setup();
			const thread = await createN8nChatThread(agent.id, project.id, chatUser.id, 'Busy chat', {
				status: 'running',
			});

			await server
				.authAgentFor(chatUser)
				.delete(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}`)
				.expect(409);
		});
	});
});
