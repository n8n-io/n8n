import { randomUUID } from 'node:crypto';

import type { AgentIntegrationConfig } from '@n8n/api-types';
import { testModules } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });

/** These cases end before a model call, so the agent needs no model credential. */
describe('webhook channel HTTP route', () => {
	async function createPublishedAgent(webhook: AgentIntegrationConfig) {
		const owner = await createOwner();
		const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const schema = { name: 'Agent', model: 'openai/gpt-4o-mini', instructions: 'Help' };
		const repository = Container.get(AgentRepository);
		const agent = await repository.save(
			repository.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: project.id,
				schema,
				integrations: [webhook],
				tools: {},
				versionId: randomUUID(),
			}),
		);
		const versionId = randomUUID();
		await Container.get(AgentHistoryRepository).saveVersion(
			{ versionId, agentId: agent.id, schema, tools: {}, publishedBy: 'test' },
			{},
		);
		await repository.update({ id: agent.id }, { activeVersionId: versionId });
		return agent;
	}

	const post = (agentId: string, body: object) =>
		server.restlessAgent.post(`/agent-webhook/${agentId}/responses`).send(body);

	it('answers an unknown agent with 404 in the OpenAI error shape, without n8n auth', async () => {
		const response = await post(randomUUID(), { input: 'Hi' }).expect(404);

		expect(response.body).toEqual({
			error: expect.objectContaining({ type: 'not_found_error', code: 'agent_not_found' }),
		});
	});

	it('rejects an invalid body with 400 on its parameter', async () => {
		const agent = await createPublishedAgent({
			type: 'webhook',
			credentialId: '',
			settings: { authentication: 'none' },
		});

		const response = await post(agent.id, { input: [] }).expect(400);

		expect(response.body.error).toMatchObject({ type: 'invalid_request_error', param: 'input' });
	});

	it('answers an unknown conversation with 404', async () => {
		const agent = await createPublishedAgent({
			type: 'webhook',
			credentialId: '',
			settings: { authentication: 'none' },
		});

		const response = await post(agent.id, { input: 'Hi', conversation: 'unknown' }).expect(404);

		expect(response.body.error).toMatchObject({ code: 'conversation_not_found' });
	});

	it('fails closed for header auth until the check exists', async () => {
		const agent = await createPublishedAgent({
			type: 'webhook',
			credentialId: 'cred-1',
			settings: { authentication: 'headerAuth' },
		});

		const response = await post(agent.id, { input: 'Hi' }).expect(500);

		expect(response.body.error).toMatchObject({ code: 'authentication_unavailable' });
	});
});
