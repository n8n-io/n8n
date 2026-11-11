import { EventService } from '@n8n/backend-services';
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import {
	CredentialsRepository,
	FolderRepository,
	ProjectRepository,
	WorkflowRepository,
	type Project,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import { InstanceSettings } from 'n8n-core';

import { CredentialTypes } from '@/credential-types';
import { CredentialsService } from '@/credentials/credentials.service';
import {
	buildEntityPackageBuffer,
	credentialRequirementsFromWorkflows,
	githubCredentialPayload,
	serializedCredential,
	serializedFolder,
	serializedProject,
	serializedWorkflow,
	serializedWorkflowWithCredential,
	WIRE_VERSION_ID,
} from '@/modules/n8n-packages/__tests__/fixtures/package-fixtures';
import { Telemetry } from '@/telemetry';
import { WorkflowPublicationNotifier } from '@/workflows/publication/workflow-publication-notifier';

import { saveCredential } from '../shared/db/credentials';
import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);
// Keep the publication outbox from draining in the background after a test publishes.
mockInstance(WorkflowPublicationNotifier);

// Must run before `setupTestServer`, which constructs the controller with this mock.
const credentialTypesMock = mockInstance(CredentialTypes);
credentialTypesMock.recognizes.mockReturnValue(true);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

let owner: User;
let authOwnerAgent: SuperAgentTest;

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
		'WorkflowPublishedVersion',
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'Project',
		'ProjectRelation',
		'Folder',
		'CredentialsEntity',
		'SharedCredentials',
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
		expect(response.body.workflows).toHaveLength(1);
		expect(response.body.workflows[0]).toMatchObject({
			sourceWorkflowId: 'WFA',
			status: 'created',
			projectId: project.id,
		});
		expect(emitSpy).toHaveBeenCalledWith('n8n-package-imported', expect.any(Object));

		// Ground truth: only WFA lands in the DB; the unselected WFB is never created.
		const workflowRepository = Container.get(WorkflowRepository);
		expect(await workflowRepository.count()).toBe(1);
		expect(await workflowRepository.findOneBy({ id: 'WFA' })).not.toBeNull();
		expect(await workflowRepository.findOneBy({ id: 'WFB' })).toBeNull();
	});

	it('archives a target workflow named in deletedWorkflowIds by default and returns 200', async () => {
		const project = await createTeamProject('Target', owner);
		const victim = await createWorkflow({ name: 'Victim' }, project);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.field('deletedWorkflowIds', JSON.stringify([victim.id]))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.workflows).toHaveLength(1);
		expect(response.body.workflows[0]).toMatchObject({
			sourceWorkflowId: 'WFA',
			status: 'created',
		});
		expect(response.body.removedWorkflows).toEqual([
			expect.objectContaining({ workflowId: victim.id, deletion: 'archived' }),
		]);

		const workflowRepository = Container.get(WorkflowRepository);
		expect((await workflowRepository.findOneBy({ id: victim.id }))?.isArchived).toBe(true);
		expect(await workflowRepository.findOneBy({ id: 'WFA' })).not.toBeNull();
	});

	it('hard-deletes a target workflow when overwriteDeletionPolicy is hard-delete and returns 200', async () => {
		const project = await createTeamProject('Target', owner);
		const victim = await createWorkflow({ name: 'Victim' }, project);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.field('deletedWorkflowIds', JSON.stringify([victim.id]))
			.field('overwriteDeletionPolicy', 'hard-delete')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.removedWorkflows).toEqual([
			expect.objectContaining({ workflowId: victim.id, deletion: 'deleted' }),
		]);

		const workflowRepository = Container.get(WorkflowRepository);
		expect(await workflowRepository.findOneBy({ id: victim.id })).toBeNull();
		expect(await workflowRepository.findOneBy({ id: 'WFA' })).not.toBeNull();
	});

	it('returns 409 for a conflicting import under conflictPolicy=fail', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);

		// Seed WFA in the target under the default policy.
		await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', tarBuffer, 'import.n8np');

		// Re-importing the same id under `fail` is blocked as a conflict.
		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.field('conflictPolicy', 'fail')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(409);
		expect(response.body.issues).toEqual([
			expect.objectContaining({
				type: 'workflow-conflict',
				sourceWorkflowId: 'WFA',
				existingWorkflowId: 'WFA',
			}),
		]);
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

		// Grant the API key delete scope so the request reaches the project permission check.
		// The project role must cause the 422 response.
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

	it('fails due to missing API Key', async () => {
		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.post('/n8n-packages/import-selection');

		expect(response.statusCode).toBe(401);
	});

	it('rejects a request when the API key lacks workflow:import scope and emits no telemetry', async () => {
		const limitedMember = await createMemberWithApiKey({ scopes: ['workflow:export'] });
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		const response = await testServer
			.publicApiAgentFor(limitedMember)
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(403);
		expect(emitSpy).not.toHaveBeenCalledWith('n8n-package-import-failed', expect.any(Object));
	});

	it('rejects a non-multipart Content-Type', async () => {
		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.set('Content-Type', 'application/json')
			.send({ not: 'a tar' });

		expect(response.statusCode).toBe(415);
	});

	it('rejects a multipart request without a package file', async () => {
		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', 'P1')
			.field('selectedWorkflowIds', JSON.stringify(['WFA']));

		expect(response.statusCode).toBe(400);
	});

	it('rejects a form field the import-selection endpoint does not accept', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.field('projectId', project.id)
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(400);
		expect(response.body).toStrictEqual({ message: 'Unexpected form field "projectId"' });
	});

	it('rejects credentialConflictPolicy as a form field', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.field('credentialConflictPolicy', 'overwrite')
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(400);
		expect(response.body).toStrictEqual({
			message: 'Unexpected form field "credentialConflictPolicy"',
		});
	});

	it('keeps a matched credential when the package has a different name and values for it', async () => {
		const project = await createTeamProject('Target', owner);
		const credential = await saveCredential(
			githubCredentialPayload({ name: 'GitHub', data: { accessToken: 'stored-secret' } }),
			{ project, role: 'credential:owner' },
		);
		const workflow = serializedWorkflowWithCredential({
			id: 'WFC',
			name: 'Uses credential',
			credentialId: credential.id,
			credentialName: credential.name,
		});
		const tarBuffer = await buildEntityPackageBuffer({
			sourceId: 'http-selection-source',
			projects: [
				{ target: 'projects/p1', project: serializedProject({ id: project.id, name: 'P1' }) },
			],
			workflows: [{ target: 'projects/p1/workflows/wfc', workflow }],
			credentials: [
				{
					target: 'projects/p1/credentials/github',
					credential: serializedCredential({
						id: credential.id,
						name: 'Renamed',
						data: { user: '={{ $vars.githubToken }}' },
					}),
				},
			],
			manifestExtras: {
				requirements: { credentials: credentialRequirementsFromWorkflows([workflow]) },
			},
		});

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFC']))
			.attach('package', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(200);
		expect(response.body.credentials).toMatchObject({ matched: [credential.id], updated: [] });
		const stored = await Container.get(CredentialsRepository).findOneByOrFail({
			id: credential.id,
		});
		expect(stored.name).toBe('GitHub');
		expect(await Container.get(CredentialsService).decrypt(stored, true)).toEqual({
			accessToken: 'stored-secret',
		});
	});

	it('rejects a second file with 413', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', tarBuffer, 'import.n8np')
			.attach('package', tarBuffer, 'second.n8np');

		expect(response.statusCode).toBe(413);
		expect(response.body).toStrictEqual({ message: 'Too many files' });
	});

	it('rejects a package file larger than the payload size limit with 413', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);
		const endpoints = Container.get(GlobalConfig).endpoints;
		const payloadSizeMax = endpoints.payloadSizeMax;
		endpoints.payloadSizeMax = 1 / 1024 / 1024;

		try {
			const response = await authOwnerAgent
				.post('/n8n-packages/import-selection')
				.field('selectedProjectId', project.id)
				.field('selectedWorkflowIds', JSON.stringify(['WFA']))
				.attach('package', tarBuffer, 'import.n8np');

			expect(response.statusCode).toBe(413);
			expect(response.body).toStrictEqual({ message: 'File too large' });
		} finally {
			endpoints.payloadSizeMax = payloadSizeMax;
		}
	});

	it('rejects a package file sent under another field name', async () => {
		const project = await createTeamProject('Target', owner);
		const tarBuffer = await buildProjectPackage(project.id);

		const response = await authOwnerAgent
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('file', tarBuffer, 'import.n8np');

		expect(response.statusCode).toBe(400);
		expect(response.body).toStrictEqual({
			message: "request/body must have required property 'package'",
		});
	});
});

describe('POST /n8n-packages/import-selection publishing and API key publish scopes', () => {
	const selectionScopes: ApiKeyScope[] = ['workflow:import'];
	const scheduleTriggerNodes = [
		{
			id: 'schedule-trigger',
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		},
	];

	async function selectionPackage(projectId: string, sourcePublished: boolean) {
		return await buildEntityPackageBuffer({
			sourceId: 'http-selection-source',
			projects: [
				{ target: 'projects/p1', project: serializedProject({ id: projectId, name: 'P1' }) },
			],
			workflows: [
				{
					target: 'projects/p1/workflows/wfa',
					workflow: serializedWorkflow({
						id: 'WFA',
						name: 'wfa',
						nodes: scheduleTriggerNodes,
						publishedVersionId: sourcePublished ? WIRE_VERSION_ID : null,
					}),
				},
			],
		});
	}

	async function importSelectionAs(user: User, projectId: string, packageBuffer: Buffer) {
		return await testServer
			.publicApiAgentFor(user)
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', projectId)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', packageBuffer, 'import.n8np');
	}

	async function seedPublishedTarget(project: Project) {
		const workflow = await createActiveWorkflow({ name: 'Published target' }, project);
		await Container.get(WorkflowRepository).update(workflow.id, { sourceWorkflowId: 'WFA' });
		return workflow;
	}

	async function storedWorkflows() {
		return await Container.get(WorkflowRepository).find({
			select: ['id', 'versionId', 'activeVersionId'],
			order: { id: 'ASC' },
		});
	}

	it('rejects an API key without workflow:activate when match-source publishes the selection', async () => {
		const user = await createOwnerWithApiKey({ scopes: selectionScopes });
		const project = await createTeamProject('Target', owner);

		const response = await importSelectionAs(
			user,
			project.id,
			await selectionPackage(project.id, true),
		);

		expect(response.statusCode).toBe(403);
		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('publishes the selection for an API key with workflow:activate', async () => {
		const user = await createOwnerWithApiKey({
			scopes: [...selectionScopes, 'workflow:activate'],
		});
		const project = await createTeamProject('Target', owner);

		const response = await importSelectionAs(
			user,
			project.id,
			await selectionPackage(project.id, true),
		);

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.workflows).toEqual([
			expect.objectContaining({ sourceWorkflowId: 'WFA', publishing: { state: 'published' } }),
		]);
	});

	it('rejects an API key without workflow:deactivate when match-source unpublishes the selection', async () => {
		const user = await createOwnerWithApiKey({ scopes: selectionScopes });
		const project = await createTeamProject('Target', owner);
		await seedPublishedTarget(project);
		const before = await storedWorkflows();

		const response = await importSelectionAs(
			user,
			project.id,
			await selectionPackage(project.id, false),
		);

		expect(response.statusCode).toBe(403);
		expect(await storedWorkflows()).toEqual(before);
	});

	it('unpublishes the selection for an API key with workflow:deactivate', async () => {
		const user = await createOwnerWithApiKey({
			scopes: [...selectionScopes, 'workflow:deactivate'],
		});
		const project = await createTeamProject('Target', owner);
		const target = await seedPublishedTarget(project);

		const response = await importSelectionAs(
			user,
			project.id,
			await selectionPackage(project.id, false),
		);

		expect(response.statusCode, JSON.stringify(response.body)).toBe(200);
		expect(response.body.workflows).toEqual([
			expect.objectContaining({ sourceWorkflowId: 'WFA', publishing: { state: 'unpublished' } }),
		]);
		expect(await storedWorkflows()).toEqual([
			expect.objectContaining({ id: target.id, activeVersionId: null }),
		]);
	});
});

describe('POST /n8n-packages/import-selection project and folder scopes', () => {
	async function importSelectionWithScopes(
		scopes: ApiKeyScope[],
		projectId: string,
		workflowId: string,
		packageBuffer: Buffer,
	) {
		const user = await createOwnerWithApiKey({ scopes });
		return await testServer
			.publicApiAgentFor(user)
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', projectId)
			.field('selectedWorkflowIds', JSON.stringify([workflowId]))
			.attach('package', packageBuffer, 'import.n8np');
	}

	it('requires project:create only when the selected project does not exist', async () => {
		const packageBuffer = await buildProjectPackage('NEW');

		const denied = await importSelectionWithScopes(
			['workflow:import'],
			'NEW',
			'WFA',
			packageBuffer,
		);
		expect(denied.statusCode).toBe(403);
		expect(await Container.get(ProjectRepository).findOneBy({ id: 'NEW' })).toBeNull();
		expect(await Container.get(WorkflowRepository).count()).toBe(0);

		const allowed = await importSelectionWithScopes(
			['workflow:import', 'project:create'],
			'NEW',
			'WFA',
			packageBuffer,
		);
		expect(allowed.statusCode, JSON.stringify(allowed.body)).toBe(200);
		expect(await Container.get(ProjectRepository).findOneBy({ id: 'NEW' })).not.toBeNull();
	});

	it('still refuses a user who may not update the existing project', async () => {
		const project = await createTeamProject('Target', owner);
		const editor = await createMemberWithApiKey({ scopes: ['workflow:import'] });
		await linkUserToProject(editor, project, 'project:editor');
		const packageBuffer = await buildProjectPackage(project.id);

		const response = await testServer
			.publicApiAgentFor(editor)
			.post('/n8n-packages/import-selection')
			.field('selectedProjectId', project.id)
			.field('selectedWorkflowIds', JSON.stringify(['WFA']))
			.attach('package', packageBuffer, 'import.n8np');

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe(
			'You do not have permission to update the existing project "P1".',
		);
		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('requires folder:create only when the selection creates a folder', async () => {
		const project = await createTeamProject('Target', owner);
		const packageBuffer = await buildEntityPackageBuffer({
			sourceId: 'http-selection-source',
			projects: [
				{ target: 'projects/p1', project: serializedProject({ id: project.id, name: 'P1' }) },
			],
			folders: [
				{ target: 'projects/p1/folders/ops', folder: serializedFolder({ id: 'OPS', name: 'ops' }) },
			],
			workflows: [
				{
					target: 'projects/p1/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
				},
				{
					target: 'projects/p1/folders/ops/workflows/wfb',
					workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
				},
			],
		});
		const folders = Container.get(FolderRepository);
		const workflows = Container.get(WorkflowRepository);

		const rootWorkflow = await importSelectionWithScopes(
			['workflow:import'],
			project.id,
			'WFA',
			packageBuffer,
		);
		expect(rootWorkflow.statusCode, JSON.stringify(rootWorkflow.body)).toBe(200);
		expect(await folders.count()).toBe(0);

		const denied = await importSelectionWithScopes(
			['workflow:import'],
			project.id,
			'WFB',
			packageBuffer,
		);
		expect(denied.statusCode).toBe(403);
		expect(await folders.count()).toBe(0);
		expect(await workflows.findOneBy({ id: 'WFB' })).toBeNull();

		const allowed = await importSelectionWithScopes(
			['workflow:import', 'folder:create'],
			project.id,
			'WFB',
			packageBuffer,
		);
		expect(allowed.statusCode, JSON.stringify(allowed.body)).toBe(200);
		expect(await folders.findOneBy({ id: 'OPS' })).not.toBeNull();

		// The folder exists now, so a new version of WFB needs no folder scope.
		const reimport = await importSelectionWithScopes(
			['workflow:import'],
			project.id,
			'WFB',
			packageBuffer,
		);
		expect(reimport.statusCode, JSON.stringify(reimport.body)).toBe(200);
	});
});
