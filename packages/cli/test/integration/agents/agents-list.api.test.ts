import { randomUUID } from 'node:crypto';

import { createTeamProject, linkUserToProject, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';

import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });

/**
 * The overview and project agents list routes: offset/limit pagination and the
 * workflow-parity filters (`active`, `projectId`, `query`).
 */
describe('agents list HTTP routes', () => {
	async function createDraftAgent(projectId: string, name: string) {
		const agentRepository = Container.get(AgentRepository);
		return await agentRepository.save(
			agentRepository.create({
				id: randomUUID(),
				name,
				projectId,
				schema: { name, model: 'anthropic/claude-sonnet-4-5', instructions: 'Help' },
				integrations: [],
				tools: {},
				versionId: randomUUID(),
			}),
		);
	}

	async function createPublishedAgent(projectId: string, name: string) {
		const agentRepository = Container.get(AgentRepository);
		const agent = await createDraftAgent(projectId, name);
		const versionId = randomUUID();
		await Container.get(AgentHistoryRepository).saveVersion(
			{
				versionId,
				agentId: agent.id,
				schema: { name, model: 'anthropic/claude-sonnet-4-5', instructions: 'Help' },
				tools: {},
				publishedBy: 'test',
			},
			{},
		);
		await agentRepository.update({ id: agent.id }, { activeVersionId: versionId });
		return agent;
	}

	it('paginates the project list with offset and limit', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Pagination', owner);
		await createDraftAgent(project.id, 'Alpha Agent');
		await createDraftAgent(project.id, 'Bravo Agent');
		await createDraftAgent(project.id, 'Charlie Agent');

		const firstPage = await server
			.authAgentFor(owner)
			.get(`/projects/${project.id}/agents/v2`)
			.query({ offset: 0, limit: 2, sortBy: 'name:asc' })
			.expect(200);
		const secondPage = await server
			.authAgentFor(owner)
			.get(`/projects/${project.id}/agents/v2`)
			.query({ offset: 2, limit: 2, sortBy: 'name:asc' })
			.expect(200);

		expect(firstPage.body.count).toBe(3);
		expect(firstPage.body.data.map(({ name }: { name: string }) => name)).toEqual([
			'Alpha Agent',
			'Bravo Agent',
		]);
		expect(secondPage.body.count).toBe(3);
		expect(secondPage.body.data.map(({ name }: { name: string }) => name)).toEqual([
			'Charlie Agent',
		]);
	});

	it('paginates the global list with offset and limit, pinned by ids', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Global pagination', owner);
		const agents = [
			await createDraftAgent(project.id, 'Alpha One'),
			await createDraftAgent(project.id, 'Bravo One'),
			await createDraftAgent(project.id, 'Charlie One'),
		];
		const ids = agents.map((agent) => agent.id);

		const secondPage = await server
			.authAgentFor(owner)
			.get('/agents/v2')
			.query({
				offset: 1,
				limit: 1,
				sortBy: 'name:asc',
				filter: JSON.stringify({ ids }),
			})
			.expect(200);

		expect(secondPage.body.count).toBe(3);
		expect(secondPage.body.data.map(({ id }: { id: string }) => id)).toEqual([ids[1]]);
	});

	it('filters the project list by published state', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Published state', owner);
		const draft = await createDraftAgent(project.id, 'Draft Agent');
		const published = await createPublishedAgent(project.id, 'Published Agent');

		const activeOnly = await server
			.authAgentFor(owner)
			.get(`/projects/${project.id}/agents/v2`)
			.query({ filter: JSON.stringify({ active: true }) })
			.expect(200);
		const draftsOnly = await server
			.authAgentFor(owner)
			.get(`/projects/${project.id}/agents/v2`)
			.query({ filter: JSON.stringify({ active: false }) })
			.expect(200);

		expect(activeOnly.body.data.map(({ id }: { id: string }) => id)).toEqual([published.id]);
		expect(draftsOnly.body.data.map(({ id }: { id: string }) => id)).toEqual([draft.id]);
	});

	it('filters the project list by query', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Query filter', owner);
		const agent = await createDraftAgent(project.id, 'Support Agent');
		await createDraftAgent(project.id, 'Billing Agent');

		const response = await server
			.authAgentFor(owner)
			.get(`/projects/${project.id}/agents/v2`)
			.query({ filter: JSON.stringify({ query: 'support' }) })
			.expect(200);

		expect(response.body.data.map(({ id }: { id: string }) => id)).toEqual([agent.id]);
	});

	it('narrows the global list to the filtered project, without leaking inaccessible ones', async () => {
		const owner = await createOwner();
		const member = await createMember();
		const accessible = await createTeamProject('Accessible', owner);
		await linkUserToProject(member, accessible, 'project:editor');
		const agent = await createDraftAgent(accessible.id, 'Member Agent');

		const other = await createTeamProject('Inaccessible', owner);
		const foreign = await createDraftAgent(other.id, 'Foreign Agent');

		const scoped = await server
			.authAgentFor(member)
			.get('/agents/v2')
			.query({ filter: JSON.stringify({ projectId: accessible.id }) })
			.expect(200);
		const leaked = await server
			.authAgentFor(member)
			.get('/agents/v2')
			.query({ filter: JSON.stringify({ projectId: other.id }) })
			.expect(200);

		expect(scoped.body.data.map(({ id }: { id: string }) => id)).toEqual([agent.id]);
		// The member holds no `agent:list` in the other project, so its agents
		// stay out however the filter is phrased.
		expect(leaked.body.data.map(({ id }: { id: string }) => id)).not.toContain(foreign.id);
		expect(leaked.body.count).toBe(0);
	});

	it('ignores the legacy skip and take parameters', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Legacy params', owner);
		const agents = [
			await createDraftAgent(project.id, 'Alpha Two'),
			await createDraftAgent(project.id, 'Bravo Two'),
			await createDraftAgent(project.id, 'Charlie Two'),
		];

		// `skip` and `take` are no longer read: the defaults (offset 0, limit 10)
		// apply, so the whole project list comes back instead of one row.
		const response = await server
			.authAgentFor(owner)
			.get(`/projects/${project.id}/agents/v2`)
			.query({ skip: 1, take: 1, sortBy: 'name:asc' })
			.expect(200);

		expect(response.body.data.map(({ id }: { id: string }) => id)).toEqual(
			agents.map((agent) => agent.id),
		);
	});
});
