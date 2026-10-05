import { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentPackagesController } from '@/modules/agents/agent-packages.controller';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { expectProjectScopedAgentRoutes } from '@/modules/agents/__tests__/test-utils/controller-route-metadata';
import { unpackTar } from '@/modules/n8n-packages/__tests__/utils/tar-support';
import { FrontendService } from '@/services/frontend.service';

import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

mockInstance(FrontendService);
beforeAll(async () => await testModules.loadModules(['agents', 'n8n-packages']));
const server = setupTestServer({ endpointGroups: ['module-settings'] });
let owner: User;

beforeAll(async () => {
	owner = await createOwner();
});

beforeEach(() => server.license.enable('feat:projectRole:admin'));
afterEach(() => vi.restoreAllMocks());

async function sourceAgent() {
	const project = await createTeamProject('Source', owner);
	const repository = Container.get(AgentRepository);
	const agent = await repository.save(
		repository.create({
			projectId: project.id,
			name: 'Package agent',
			schema: {
				name: 'Package agent',
				model: 'openai/gpt-4.1-mini',
				instructions: 'Help with work',
				skills: [{ type: 'skill', id: 'local_skill' }],
			},
			skills: {
				local_skill: {
					name: 'Triage',
					description: 'Triage work',
					instructions: 'Read the request',
				},
			},
			tools: {},
		}),
	);
	return { agent, project };
}

async function download(projectId: string, agentId: string) {
	return await server
		.authAgentFor(owner)
		.post(`/projects/${projectId}/agents/v2/${agentId}/package`)
		.send({})
		.buffer(true)
		.parse((response, done) => {
			const chunks: Buffer[] = [];
			response.on('data', (chunk: Buffer) => chunks.push(chunk));
			response.on('end', () => done(null, Buffer.concat(chunks)));
			response.on('error', done);
		});
}

describe('Agent package editor routes', () => {
	expectProjectScopedAgentRoutes(AgentPackagesController);

	it('downloads a package and imports its bodies into the route project with shared policies', async () => {
		const { agent, project } = await sourceAgent();
		const target = await createTeamProject('Target', owner);
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const exported = await download(project.id, agent.id);
		expect(exported.statusCode).toBe(200);
		expect(exported.headers['content-disposition']).toContain('.n8np');
		expect(JSON.parse(exported.headers['x-n8n-export-counts'])).toMatchObject({ agents: 1 });
		const files = await unpackTar(exported.body);
		expect(JSON.parse(files[0].content.toString()).agents).toEqual([
			expect.objectContaining({ id: agent.id }),
		]);

		const imported = await server
			.authAgentFor(owner)
			.post(`/projects/${target.id}/agents/v2/package`)
			.field('projectId', project.id)
			.field('agentIdPolicy', 'new')
			.attach('package', exported.body, 'agent.n8np');
		expect(imported.statusCode).toBe(200);
		expect(imported.body.data.agents).toEqual([
			expect.objectContaining({
				sourceAgentId: agent.id,
				projectId: target.id,
				status: 'created',
				activeVersionId: null,
			}),
		]);
		const localId: string = imported.body.data.agents[0].localId;
		expect(localId).not.toBe(agent.id);
		expect(await Container.get(AgentRepository).findOneByOrFail({ id: localId })).toMatchObject({
			skills: agent.skills,
			schema: { skills: [{ type: 'skill', id: 'local_skill' }] },
		});
		const repeated = await server
			.authAgentFor(owner)
			.post(`/projects/${target.id}/agents/v2/package`)
			.field('agentConflictPolicy', 'skip')
			.attach('package', exported.body, 'agent.n8np');
		expect(repeated.body.data.agents[0]).toMatchObject({ localId, status: 'skipped' });
		expect(emit).toHaveBeenCalledWith(
			'n8n-package-imported',
			expect.objectContaining({
				agentIds: [localId],
				counts: expect.objectContaining({ agents: { created: 1, updated: 0, skipped: 0 } }),
			}),
		);
	});

	it('requires project import and export scopes and checks the route agent belongs to the project', async () => {
		const { agent, project } = await sourceAgent();
		const otherProject = await createTeamProject('Other', owner);
		const member = await createMember();
		const role = await createCustomRoleWithScopeSlugs(['agent:read']);
		await linkUserToProject(member, project, role.slug);
		const api = server.authAgentFor(member);
		await api.post(`/projects/${project.id}/agents/v2/${agent.id}/package`).send({}).expect(403);
		await api.post(`/projects/${project.id}/agents/v2/package`).send({}).expect(403);
		await server.authlessAgent.post(`/projects/${project.id}/agents/v2/package`).expect(401);
		await server
			.authAgentFor(owner)
			.post(`/projects/${otherProject.id}/agents/v2/${agent.id}/package`)
			.send({})
			.expect(404);
	});

	it('rejects legacy JSON and malformed uploads before import writes', async () => {
		const { agent, project } = await sourceAgent();
		const api = server.authAgentFor(owner);
		const path = `/projects/${project.id}/agents/v2/package`;
		const repository = Container.get(AgentRepository);
		const count = await repository.count();
		await api.post(path).send({ name: agent.name }).expect(415);
		await api.post(path).field('agentConflictPolicy', 'new-version').expect(400);
		const legacy = await api
			.post(path)
			.attach('package', Buffer.from(JSON.stringify(agent.schema)), 'agent.json');
		expect(legacy.statusCode).toBe(400);
		expect(await repository.count()).toBe(count);
	});

	it('uses the package upload limit and returns the shared conflict metadata', async () => {
		const { agent, project } = await sourceAgent();
		const exported = await download(project.id, agent.id);
		const api = server.authAgentFor(owner);
		const path = `/projects/${project.id}/agents/v2/package`;
		const conflict = await api
			.post(path)
			.field('agentConflictPolicy', 'fail')
			.attach('package', exported.body, 'agent.n8np');
		expect(conflict.statusCode).toBe(409);
		expect(conflict.body.meta.issues[0].type).toBe('agent-conflict');
		const endpoints = Container.get(GlobalConfig).endpoints;
		const previousLimit = endpoints.payloadSizeMax;
		endpoints.payloadSizeMax = 1;
		try {
			await api
				.post(path)
				.attach('package', Buffer.alloc(1024 * 1024 + 1), 'large.n8np')
				.expect(413);
		} finally {
			endpoints.payloadSizeMax = previousLimit;
		}
	});

	it('returns publication failures after content import', async () => {
		const { agent, project } = await sourceAgent();
		const exported = await download(project.id, agent.id);
		vi.spyOn(Container.get(AgentPublishService), 'publishAgent').mockRejectedValueOnce(
			new Error('Channel setup failed'),
		);
		const response = await server
			.authAgentFor(owner)
			.post(`/projects/${project.id}/agents/v2/package`)
			.field('agentPublishingPolicy', 'publish-all')
			.attach('package', exported.body, 'agent.n8np');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.agents[0]).toMatchObject({
			localId: agent.id,
			status: 'updated',
			publishing: { state: 'failed', error: 'Channel setup failed' },
		});
	});
});
