import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { WorkflowRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { EventService } from '@/events/event.service';
import {
	buildEntityPackageBuffer,
	serializedProject,
	serializedWorkflow,
} from '@/modules/n8n-packages/__tests__/fixtures/package-fixtures';
import { Telemetry } from '@/telemetry';

import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let owner: User;
let authOwnerAgent: SuperAgentTest;

/** A project package: project `projectId` with two root workflows, WFA and WFB. */
async function buildProjectPackage(projectId: string): Promise<Buffer> {
	return await buildEntityPackageBuffer({
		sourceId: 'http-selection-source',
		projects: [
			{ target: 'projects/p1', project: serializedProject({ id: projectId, name: 'P1' }) },
		],
		workflows: [
			{
				target: 'projects/p1/workflows/wfa',
				workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
			},
			{
				target: 'projects/p1/workflows/wfb',
				workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
			},
		],
	});
}

beforeAll(async () => {
	await utils.initNodeTypes();
	owner = await createOwnerWithApiKey();
	Container.get(InstanceSettings).markAsLeader();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'Project',
		'ProjectRelation',
		'Folder',
	]);
	testServer.license.enable('feat:projectRole:admin');
	testServer.license.enable('feat:folders');
	testServer.license.setQuota('quota:maxTeamProjects', 100);
	authOwnerAgent = testServer.publicApiAgentFor(owner);
});

describe('POST /n8n-packages/import-selection', () => {
	it('returns 409 before writing a workflow selected for import and deletion', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA', 'WFB']))
			.field('deletedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(409);
		expect(response.body.issues).toEqual([
			{
				type: 'workflow-removal-conflict',
				sourceWorkflowId: 'WFA',
				workflowId: 'WFA',
				projectId: project.id,
			},
		]);
		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('imports only the selected subset into the target project', async () => {
		const project = await createTeamProject('Target', owner);
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		// Only WFA is imported; the unselected WFB never appears in the result.
		expect(response.body.workflows).toHaveLength(1);
		expect(response.body.workflows[0]).toMatchObject({
			sourceWorkflowId: 'WFA',
			status: 'created',
			projectId: project.id,
		});
		// The user-facing tar path emits the import telemetry event.
		expect(emitSpy).toHaveBeenCalledWith('n8n-package-imported', expect.any(Object));
	});

	it('rejects a request that omits selectedProjectId', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(400);
	});

	it('rejects a blank selectedProjectId', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', '')
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(400);
	});

	it('rejects a non-project (workflow) package', async () => {
		const tarBuffer = await buildEntityPackageBuffer({
			sourceId: 'http-selection-workflow-package',
			workflows: [
				{ target: 'workflows/wfa', workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }) },
			],
		});

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', 'P1')
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(400);
	});

	it('returns 422 when the caller may not perform a requested delete', async () => {
		const project = await createTeamProject('Target', owner);
		const protectedWorkflow = await createWorkflow({ name: 'Protected' }, project);

		// The API key carries the delete scope, so the request clears the API-key gate; the 422 comes
		// from the member's project role, which grants import but not workflow:delete.
		const member = await createMemberWithApiKey({
			scopes: ['project:create', 'project:update', 'workflow:import', 'workflow:delete'],
		});
		const importOnlyRole = await createCustomRoleWithScopeSlugs(
			[
				'project:read',
				'project:list',
				'project:update',
				'workflow:create',
				'workflow:read',
				'workflow:update',
				'workflow:import',
				'workflow:list',
				'workflow:publish',
				'folder:create',
				'folder:read',
				'folder:update',
				'folder:list',
				'credential:read',
				'credential:list',
			],
			{ roleType: 'project' },
		);
		await linkUserToProject(member, project, importOnlyRole.slug);

		const tarBuffer = await buildProjectPackage(project.id);

		const response = await testServer
			.publicApiAgentFor(member)
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.field('deletedWorkflowIds', JSON.stringify([protectedWorkflow.id]))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(422);
		expect(response.body).toMatchObject({
			message: expect.stringContaining('Import blocked'),
			issues: [
				expect.objectContaining({
					type: 'workflow-removal-forbidden',
					workflowId: protectedWorkflow.id,
				}),
			],
		});
	});
});
