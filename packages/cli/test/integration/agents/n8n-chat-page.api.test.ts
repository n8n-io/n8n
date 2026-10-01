import { randomUUID } from 'node:crypto';

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
	async function createPublishedAgent(projectId: string, { withChat = true } = {}) {
		const agentRepository = Container.get(AgentRepository);
		const agent = await agentRepository.save(
			agentRepository.create({
				id: randomUUID(),
				name: 'Support agent',
				projectId,
				schema: { name: 'Support agent', model: 'openai:gpt-4o-mini', instructions: 'Help' },
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
				name: 'Support agent',
				description: 'Answers support questions',
				model: 'openai:gpt-4o-mini',
				instructions: 'Help',
				integrations: withChat ? [chatIntegration] : [],
			},
			tools: {},
			skills: {},
			publishedBy: 'test',
		});
		await agentRepository.update({ id: agent.id }, { activeVersionId: versionId });
		return agent;
	}

	async function createN8nChatThread(agentId: string, projectId: string, ownerId: string) {
		const threadRepository = Container.get(AgentExecutionThreadRepository);
		const thread = await threadRepository.save(
			threadRepository.create({
				id: randomUUID(),
				agentId,
				agentName: 'Support agent',
				projectId,
				accessScope: 'user',
				ownerId,
				title: 'My chat',
				sessionNumber: 1,
			}),
		);
		const executionRepository = Container.get(AgentExecutionRepository);
		await executionRepository.save(
			executionRepository.create({
				id: randomUUID(),
				threadId: thread.id,
				status: 'success',
				userMessage: 'Hello',
				source: 'n8n_chat_production',
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

	it('returns one reachable agent in the chat list shape', async () => {
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
		});
	});

	it('returns 404 for an agent without the published n8n Chat channel', async () => {
		const { chatUser, project } = await setup();
		const agent = await createPublishedAgent(project.id, { withChat: false });

		await server.authAgentFor(chatUser).get(`/agents/v2/n8n-chat/agents/${agent.id}`).expect(404);
	});

	it('lists chat agents sorted by usage', async () => {
		const { chatUser, agent } = await setup();

		const response = await server
			.authAgentFor(chatUser)
			.get('/agents/v2')
			.query({ filter: JSON.stringify({ availableInChat: true }), sortBy: 'usage:desc' })
			.expect(200);

		expect(response.body).toMatchObject({ count: 1, data: [{ id: agent.id }] });
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

	it('lets a chat user read the history of their own thread', async () => {
		const { chatUser, project, agent } = await setup();
		const thread = await createN8nChatThread(agent.id, project.id, chatUser.id);

		await server
			.authAgentFor(chatUser)
			.get(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}/messages`)
			.expect(200);
	});
});
