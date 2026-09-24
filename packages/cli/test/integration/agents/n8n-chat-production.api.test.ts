import { randomUUID } from 'node:crypto';

import { linkUserToProject, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
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

	async function createThread(agentId: string, projectId: string, ownerId: string, source: string) {
		const threadRepository = Container.get(AgentExecutionThreadRepository);
		const thread = await threadRepository.save(
			threadRepository.create({
				id: randomUUID(),
				agentId,
				agentName: 'Agent',
				projectId,
				accessScope: 'user',
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
