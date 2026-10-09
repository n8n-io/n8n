import { randomUUID } from 'node:crypto';

import { linkUserToProject, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { hashAgentSandboxPrincipal } from '@/modules/agents/agent-sandbox-principal';
import { productionChatMemoryResourceId } from '@/modules/agents/utils/agent-memory-scope';

import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });
const chatIntegration = { type: 'n8n_chat', credentialId: '' } as const;

describe('production n8n Chat HTTP route', () => {
	async function createAgent(ownerId: string) {
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(ownerId);
		const repository = Container.get(AgentRepository);
		const agent = await repository.save(
			repository.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: project.id,
				schema: { name: 'Agent', model: 'openai:gpt-4o-mini', instructions: 'Help' },
				integrations: [chatIntegration],
				tools: {},
				skills: {},
				versionId: randomUUID(),
			}),
		);
		return { agent, project };
	}

	async function activateChat(agentId: string, enabled = true) {
		const versionId = randomUUID();
		await Container.get(AgentHistoryRepository).saveVersion({
			versionId,
			agentId,
			schema: {
				name: 'Agent',
				model: 'openai:gpt-4o-mini',
				instructions: 'Help',
				integrations: enabled ? [chatIntegration] : [],
			},
			tools: {},
			skills: {},
			publishedBy: 'test',
		});
		await Container.get(AgentRepository).update({ id: agentId }, { activeVersionId: versionId });
	}

	async function createThread(
		agentId: string,
		projectId: string,
		ownerId: string,
		source: string,
		accessScope: 'user' | 'project' = 'user',
	) {
		const threadRepository = Container.get(AgentExecutionThreadRepository);
		const thread = await threadRepository.save(
			threadRepository.create({
				id: randomUUID(),
				agentId,
				agentName: 'Agent',
				projectId,
				accessScope,
				ownerId,
				sessionNumber: 1,
			}),
		);
		const executionRepository = Container.get(AgentExecutionRepository);
		const execution = await executionRepository.save(
			executionRepository.create({
				id: randomUUID(),
				threadId: thread.id,
				status: 'success',
				userMessage: 'Hello',
				source,
			}),
		);
		return { thread, execution };
	}

	it('rejects an unpublished agent before a model request', async () => {
		const owner = await createOwner();
		const { project, agent } = await createAgent(owner.id);
		const response = await server
			.authAgentFor(owner)
			.post(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`)
			.send({ message: 'Hello' })
			.expect(200);
		expect(response.text).toContain('"errorCode":"agent_unavailable"');
	});

	it('rejects a published version with n8n Chat disabled', async () => {
		const owner = await createOwner();
		const { project, agent } = await createAgent(owner.id);
		await activateChat(agent.id, false);
		const response = await server
			.authAgentFor(owner)
			.post(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`)
			.send({ message: 'Hello' })
			.expect(200);
		expect(response.text).toContain('"errorCode":"agent_unavailable"');
	});

	it('rejects a preview session in the production namespace', async () => {
		const owner = await createOwner();
		const { project, agent } = await createAgent(owner.id);
		await activateChat(agent.id);
		const { thread, execution } = await createThread(agent.id, project.id, owner.id, 'chat');
		const url = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`;
		await server.authAgentFor(owner).get(`${url}/${thread.id}/messages`).expect(404);
		const response = await server
			.authAgentFor(owner)
			.post(url)
			.send({ message: 'Continue', sessionId: thread.id })
			.expect(200);
		expect(response.text).toContain('Session not found');
		await server
			.authAgentFor(owner)
			.delete(`${url}/${thread.id}/executions/${execution.id}`)
			.expect(404);
	});

	it('rejects a production session in the preview namespace', async () => {
		const owner = await createOwner();
		const { project, agent } = await createAgent(owner.id);
		await activateChat(agent.id);
		const { thread, execution } = await createThread(
			agent.id,
			project.id,
			owner.id,
			'n8n_chat_production',
		);
		const url = `/projects/${project.id}/agents/v2/${agent.id}/chat`;
		await server.authAgentFor(owner).get(`${url}/${thread.id}/messages`).expect(404);
		const response = await server
			.authAgentFor(owner)
			.post(url)
			.send({ message: 'Continue', sessionId: thread.id })
			.expect(200);
		expect(response.text).toContain('Session not found');
		await server
			.authAgentFor(owner)
			.delete(`${url}/${thread.id}/executions/${execution.id}`)
			.expect(404);
		const sessionsUrl = `/projects/${project.id}/agents/v2/${agent.id}/threads`;
		const previewSessions = await server
			.authAgentFor(owner)
			.get(`${sessionsUrl}?origin=preview`)
			.expect(200);
		expect(previewSessions.body.data.threads).toEqual([]);
		const productionSessions = await server
			.authAgentFor(owner)
			.get(`${sessionsUrl}?origin=n8n_chat_production`)
			.expect(200);
		expect(productionSessions.body.data.threads).toEqual([
			expect.objectContaining({ id: thread.id }),
		]);
		const detail = await server.authAgentFor(owner).get(`${sessionsUrl}/${thread.id}`).expect(200);
		expect(detail.body.data.thread.canContinueInPreview).toBe(false);
	});

	it('scopes the production session list to the requesting user', async () => {
		const owner = await createOwner();
		const other = await createMember();
		const { project, agent } = await createAgent(owner.id);
		await linkUserToProject(other, project, 'project:editor');
		await activateChat(agent.id);
		const mine = await createThread(agent.id, project.id, owner.id, 'n8n_chat_production');
		// A shared session stays visible to the whole project, so only `scope` filters it out.
		const theirs = await createThread(
			agent.id,
			project.id,
			other.id,
			'n8n_chat_production',
			'project',
		);
		const url = `/projects/${project.id}/agents/v2/${agent.id}/threads?origin=n8n_chat_production`;

		const all = await server.authAgentFor(owner).get(url).expect(200);
		expect(all.body.data.threads).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: mine.thread.id }),
				expect.objectContaining({ id: theirs.thread.id }),
			]),
		);
		const scoped = await server.authAgentFor(owner).get(`${url}&scope=mine`).expect(200);
		expect(scoped.body.data.threads).toEqual([expect.objectContaining({ id: mine.thread.id })]);
	});

	it('keeps another project member out of a private production session', async () => {
		const owner = await createOwner();
		const other = await createMember();
		const { project, agent } = await createAgent(owner.id);
		await linkUserToProject(other, project, 'project:editor');
		await activateChat(agent.id);
		const { thread, execution } = await createThread(
			agent.id,
			project.id,
			owner.id,
			'n8n_chat_production',
		);
		const url = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`;
		await server.authAgentFor(other).get(`${url}/${thread.id}/messages`).expect(404);
		const response = await server
			.authAgentFor(other)
			.post(url)
			.send({ message: 'Continue', sessionId: thread.id })
			.expect(200);
		expect(response.text).toContain('Session not found');
		await server
			.authAgentFor(other)
			.delete(`${url}/${thread.id}/executions/${execution.id}`)
			.expect(404);
	});

	it('requires project access before starting production chat', async () => {
		const owner = await createOwner();
		const other = await createMember();
		const { project, agent } = await createAgent(owner.id);
		await activateChat(agent.id);
		await server
			.authAgentFor(other)
			.post(`/projects/${project.id}/agents/v2/${agent.id}/n8n-chat`)
			.send({ message: 'Hello' })
			.expect(403);
	});

	async function seedBackgroundJob(agentId: string, threadId: string, ownerId: string) {
		const repository = Container.get(AgentBackgroundJobRepository);
		return await repository.save(
			repository.create({
				id: randomUUID(),
				kind: 'subagent',
				status: 'completed',
				parentAgentId: agentId,
				parentThreadId: threadId,
				parentResourceId: productionChatMemoryResourceId(ownerId),
				parentPrincipalHash: hashAgentSandboxPrincipal({ type: 'n8n-user', userId: ownerId }),
				title: 'Research',
				subAgentId: 'sub-agent-1',
				childThreadId: randomUUID(),
				result: 'Done',
				settledAt: new Date(),
			}),
		);
	}

	it("lets a chat-only member read their own thread's background tasks", async () => {
		const owner = await createOwner();
		const chatUser = await createMember();
		const { project, agent } = await createAgent(owner.id);
		await linkUserToProject(chatUser, project, 'project:chatUser');
		await activateChat(agent.id);
		const { thread } = await createThread(agent.id, project.id, chatUser.id, 'n8n_chat_production');
		const base = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}/background-tasks`;

		const empty = await server.authAgentFor(chatUser).get(base).expect(200);
		expect(empty.body.data.tasks).toEqual([]);

		await seedBackgroundJob(agent.id, thread.id, chatUser.id);
		const seeded = await server.authAgentFor(chatUser).get(base).expect(200);
		expect(seeded.body.data.tasks).toEqual([
			expect.objectContaining({ id: expect.any(String), title: 'Research', status: 'completed' }),
		]);
	});

	it("returns an empty list for a session that has no thread yet, and 404s another user's thread", async () => {
		const owner = await createOwner();
		const other = await createMember();
		const { project, agent } = await createAgent(owner.id);
		await linkUserToProject(other, project, 'project:editor');
		await activateChat(agent.id);
		const { thread } = await createThread(agent.id, project.id, owner.id, 'n8n_chat_production');

		const newSessionUrl = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${randomUUID()}/background-tasks`;
		const empty = await server.authAgentFor(owner).get(newSessionUrl).expect(200);
		expect(empty.body.data.tasks).toEqual([]);

		const foreignUrl = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}/background-tasks`;
		await server.authAgentFor(other).get(foreignUrl).expect(404);
	});

	it('rejects stopping background tasks while the feature flag is off', async () => {
		const owner = await createOwner();
		const { project, agent } = await createAgent(owner.id);
		await activateChat(agent.id);
		const { thread } = await createThread(agent.id, project.id, owner.id, 'n8n_chat_production');
		const url = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}/background-tasks/stop`;

		await server.authAgentFor(owner).post(url).expect(400);
	});

	it('removes production reads when the agent is unpublished', async () => {
		const owner = await createOwner();
		const { project, agent } = await createAgent(owner.id);
		await activateChat(agent.id);
		const { thread } = await createThread(agent.id, project.id, owner.id, 'n8n_chat_production');
		const url = `/projects/${project.id}/agents/v2/${agent.id}/n8n-chat/${thread.id}/messages`;
		await server.authAgentFor(owner).get(url).expect(200);
		await Container.get(AgentRepository).update({ id: agent.id }, { activeVersionId: null });
		await server.authAgentFor(owner).get(url).expect(404);
	});
});
