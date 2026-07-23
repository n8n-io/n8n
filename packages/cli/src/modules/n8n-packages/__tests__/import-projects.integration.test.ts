import { LicenseState } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import {
	FolderRepository,
	ProjectRelationRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	VariablesRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { createOwner } from '@test-integration/db/users';
import { createProjectVariable, createVariable } from '@test-integration/db/variables';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportPackageRequest } from '../n8n-packages.types';
import {
	buildEntityPackageBuffer,
	credentialRequirementsFromWorkflows,
	serializedFolder,
	serializedProject,
	serializedWorkflow,
	serializedWorkflowWithCredential,
} from './fixtures/package-fixtures';

async function importProjects(
	user: User,
	packageBuffer: Buffer,
	apiKeyScopes?: string[],
	overrides?: Partial<ImportPackageRequest>,
) {
	const request: ImportPackageRequest = {
		user,
		packageBuffer,
		apiKeyScopes,
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: 'new-version',
		workflowPublishingPolicy: 'preserve-published-state',
		workflowIdPolicy: 'new',
		missingNodeTypeMode: 'fail',
		folderConflictPolicy: 'merge',
		dataTableMatchingMode: 'by-id',
		dataTableMissingMode: 'create',
		dataTableSchemaConflictPolicy: 'keep-existing',
		variableMissingMode: 'do-nothing',
		...overrides,
	};
	return await Container.get(N8nPackagesService).importPackage(request);
}

const licenseMocker = new LicenseMocker();

async function findProject(id: string) {
	return await Container.get(ProjectRepository).findOne({ where: { id } });
}

async function findFolder(id: string) {
	return await Container.get(FolderRepository).findOne({
		where: { id },
		relations: { homeProject: true },
	});
}

async function findWorkflow(id: string) {
	return await Container.get(WorkflowRepository).findOne({
		where: { id },
		relations: { parentFolder: true },
	});
}

async function isAdminOf(projectId: string, userId: string): Promise<boolean> {
	const count = await Container.get(ProjectRelationRepository).count({
		where: { projectId, userId, role: { slug: 'project:admin' } },
	});
	return count > 0;
}

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	// Register node types so the plan-phase missing-node-type check can resolve
	// the node types used by the package fixtures.
	await initNodeTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'Folder',
		'Project',
		'ProjectRelation',
		'SharedWorkflow',
		'WorkflowEntity',
	]);
	licenseMocker.reset();
});

describe('project shell import', () => {
	let owner: User;

	beforeEach(async () => {
		owner = await createOwner();
	});

	it('creates a team project owned by the importer, reusing the source id', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
			],
		});

		const result = await importProjects(owner, packageBuffer);

		expect(result.projects).toEqual([
			{ sourceProjectId: 'P1', localId: 'P1', name: 'brie', status: 'created' },
		]);
		const project = await findProject('P1');
		expect(project?.name).toBe('brie');
		expect(project?.type).toBe('team');
		expect(await isAdminOf('P1', owner.id)).toBe(true);
	});

	it('creates multiple projects in one package', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				{ target: 'projects/stilton', project: serializedProject({ id: 'P2', name: 'stilton' }) },
			],
		});

		const result = await importProjects(owner, packageBuffer);

		expect(result.projects.map((p) => p.localId).sort()).toEqual(['P1', 'P2']);
		expect(await findProject('P1')).not.toBeNull();
		expect(await findProject('P2')).not.toBeNull();
	});

	it('creates two distinct projects that share a name but differ by id', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				{ target: 'projects/brie-1', project: serializedProject({ id: 'P2', name: 'brie' }) },
			],
		});

		await importProjects(owner, packageBuffer);

		expect((await findProject('P1'))?.name).toBe('brie');
		expect((await findProject('P2'))?.name).toBe('brie');
	});

	it('matches an existing project by id on re-import and updates it in place', async () => {
		await importProjects(
			owner,
			await buildEntityPackageBuffer({
				projects: [
					{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				],
			}),
		);

		const result = await importProjects(
			owner,
			await buildEntityPackageBuffer({
				projects: [
					{
						target: 'projects/brie',
						project: serializedProject({ id: 'P1', name: 'brie renamed' }),
					},
				],
			}),
		);

		expect(result.projects).toEqual([
			{ sourceProjectId: 'P1', localId: 'P1', name: 'brie renamed', status: 'updated' },
		]);
		expect(await Container.get(ProjectRepository).count({ where: { type: 'team' } })).toBe(1);
		expect((await findProject('P1'))?.name).toBe('brie renamed');
	});

	it('rejects a project package whose manifest project id disagrees with its project.json', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/p', project: serializedProject({ id: 'real-id', name: 'p' }) },
			],
			// Manifest points the same target at a different id than project.json declares. The project is
			// created under project.json's id, but its contents scope by manifest id — so they must agree.
			manifestExtras: { projects: [{ id: 'manifest-id', name: 'p', target: 'projects/p' }] },
		});

		await expect(importProjects(owner, packageBuffer)).rejects.toThrow(
			/declares id "real-id" but the manifest lists it as "manifest-id"/,
		);
		// Rejected while parsing, before any project shell is created.
		expect(await Container.get(ProjectRepository).count({ where: { type: 'team' } })).toBe(0);
	});

	it('rejects a project package when the API key lacks the project:create scope', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
			],
		});

		await expect(importProjects(owner, packageBuffer, ['workflow:import'])).rejects.toBeInstanceOf(
			ForbiddenError,
		);
	});

	it('refuses to import over an existing personal project id', async () => {
		const personal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: personal.id, name: 'brie' }) },
			],
		});

		await expect(importProjects(owner, packageBuffer)).rejects.toBeInstanceOf(ForbiddenError);
	});

	it('recreates the project folder tree and places nested workflows into the project scope', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{
					target: 'projects/team-ligo',
					project: serializedProject({ id: 'P1', name: 'team-ligo' }),
				},
			],
			folders: [
				// An empty folder shell alongside a populated, nested hierarchy.
				{
					target: 'projects/team-ligo/folders/to_production',
					folder: serializedFolder({ id: 'TP', name: 'to_production' }),
				},
				{
					target: 'projects/team-ligo/folders/in_progress',
					folder: serializedFolder({ id: 'IP', name: 'in_progress' }),
				},
				{
					target: 'projects/team-ligo/folders/in_progress/nested',
					folder: serializedFolder({ id: 'NE', name: 'nested', parentFolderId: 'IP' }),
				},
			],
			workflows: [
				{
					target: 'projects/team-ligo/folders/in_progress/workflows/triage',
					workflow: serializedWorkflow({ id: 'WF1', name: 'triage' }),
				},
				{
					target: 'projects/team-ligo/folders/in_progress/nested/workflows/playground',
					workflow: serializedWorkflow({ id: 'WF2', name: 'playground' }),
				},
			],
		});

		const result = await importProjects(owner, packageBuffer);

		expect(result.projects).toEqual([
			{ sourceProjectId: 'P1', localId: 'P1', name: 'team-ligo', status: 'created' },
		]);
		// Every folder (incl. the empty shell) lands in the project; the nested one keeps its parent.
		for (const id of ['TP', 'IP', 'NE']) {
			expect((await findFolder(id))?.homeProject.id).toBe('P1');
		}
		expect((await findFolder('NE'))?.parentFolderId).toBe('IP');
		// Each workflow is placed under the folder it belongs to, scoped to the project.
		const triage = result.workflows.find((w) => w.sourceWorkflowId === 'WF1')!;
		const playground = result.workflows.find((w) => w.sourceWorkflowId === 'WF2')!;
		expect(triage.projectId).toBe('P1');
		expect((await findWorkflow(triage.localId))?.parentFolder?.id).toBe('IP');
		expect((await findWorkflow(playground.localId))?.parentFolder?.id).toBe('NE');
	});

	it('populates each project in a multi-project package into its own scope', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				{ target: 'projects/stilton', project: serializedProject({ id: 'P2', name: 'stilton' }) },
			],
			folders: [
				{ target: 'projects/brie/folders/a', folder: serializedFolder({ id: 'FA', name: 'a' }) },
				{ target: 'projects/stilton/folders/b', folder: serializedFolder({ id: 'FB', name: 'b' }) },
			],
			workflows: [
				{
					target: 'projects/brie/folders/a/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
				},
				{
					target: 'projects/stilton/folders/b/workflows/wfb',
					workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
				},
			],
		});

		const result = await importProjects(owner, packageBuffer);

		expect(result.projects.map((p) => p.localId).sort()).toEqual(['P1', 'P2']);
		expect((await findFolder('FA'))?.homeProject.id).toBe('P1');
		expect((await findFolder('FB'))?.homeProject.id).toBe('P2');
		const wfa = result.workflows.find((w) => w.sourceWorkflowId === 'WFA')!;
		const wfb = result.workflows.find((w) => w.sourceWorkflowId === 'WFB')!;
		expect(wfa.projectId).toBe('P1');
		expect(wfb.projectId).toBe('P2');
		expect((await findWorkflow(wfa.localId))?.parentFolder?.id).toBe('FA');
		expect((await findWorkflow(wfb.localId))?.parentFolder?.id).toBe('FB');
	});

	it('reuses the project and folder and updates the workflow on re-import', async () => {
		const pkg = async () =>
			await buildEntityPackageBuffer({
				projects: [
					{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				],
				folders: [
					{ target: 'projects/brie/folders/a', folder: serializedFolder({ id: 'FA', name: 'a' }) },
				],
				workflows: [
					{
						target: 'projects/brie/folders/a/workflows/wf',
						workflow: serializedWorkflow({ id: 'WF', name: 'wf' }),
					},
				],
			});

		const first = await importProjects(owner, await pkg());
		const localId = first.workflows[0].localId;

		const second = await importProjects(owner, await pkg());

		expect(second.workflows[0]).toMatchObject({ status: 'updated', localId, parentFolderId: 'FA' });
		expect(await Container.get(ProjectRepository).count({ where: { type: 'team' } })).toBe(1);
		expect(await Container.get(FolderRepository).countBy({ id: 'FA' })).toBe(1);
		expect(await Container.get(WorkflowRepository).countBy({ id: localId })).toBe(1);
	});

	it('resolves a project workflow credential in the project scope, blocking when it is missing', async () => {
		const workflow = serializedWorkflowWithCredential({
			id: 'WF',
			name: 'triage',
			credentialId: 'missing-cred',
			credentialName: 'Linear',
		});
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
			],
			folders: [
				{ target: 'projects/brie/folders/a', folder: serializedFolder({ id: 'FA', name: 'a' }) },
			],
			workflows: [{ target: 'projects/brie/folders/a/workflows/triage', workflow }],
			manifestExtras: {
				requirements: { credentials: credentialRequirementsFromWorkflows([workflow]) },
			},
		});

		// The project workflow's credential requirement resolves in the project scope; under must-preexist
		// a missing credential blocks the import before anything is written — no folder, no project shell.
		await expect(importProjects(owner, packageBuffer)).rejects.toBeInstanceOf(
			UnprocessableRequestError,
		);
		expect(await findFolder('FA')).toBeNull();
		expect(await findProject('P1')).toBeNull();
	});

	it('imports a project-root workflow (no enclosing folder) at the project root', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
			],
			workflows: [
				{
					target: 'projects/brie/workflows/root-wf',
					workflow: serializedWorkflow({ id: 'RWF', name: 'root-wf' }),
				},
			],
		});

		const result = await importProjects(owner, packageBuffer);

		const summary = result.workflows.find((w) => w.sourceWorkflowId === 'RWF')!;
		expect(summary).toMatchObject({ projectId: 'P1', parentFolderId: null });
		// Persisted at the project root (no parent folder), owned by the imported project.
		expect((await findWorkflow(summary.localId))?.parentFolder).toBeNull();
		const shared = await Container.get(SharedWorkflowRepository).findOneBy({
			workflowId: summary.localId,
		});
		expect(shared?.projectId).toBe('P1');
	});

	it('gates the whole package: a later project blocking leaves earlier projects unwritten', async () => {
		const blocked = serializedWorkflowWithCredential({
			id: 'WFB',
			name: 'wfb',
			credentialId: 'missing-cred',
			credentialName: 'Linear',
		});
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/alpha', project: serializedProject({ id: 'P1', name: 'alpha' }) },
				{ target: 'projects/beta', project: serializedProject({ id: 'P2', name: 'beta' }) },
			],
			folders: [
				{ target: 'projects/alpha/folders/a', folder: serializedFolder({ id: 'FA', name: 'a' }) },
				{ target: 'projects/beta/folders/b', folder: serializedFolder({ id: 'FB', name: 'b' }) },
			],
			workflows: [
				{
					target: 'projects/alpha/folders/a/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
				},
				{ target: 'projects/beta/folders/b/workflows/wfb', workflow: blocked },
			],
			manifestExtras: {
				requirements: { credentials: credentialRequirementsFromWorkflows([blocked]) },
			},
		});

		// The second project's workflow needs a missing credential: every project is planned and
		// validated before anything is written, so a block leaves nothing behind — not the first
		// project's folder/workflow, nor either project shell.
		await expect(importProjects(owner, packageBuffer)).rejects.toBeInstanceOf(
			UnprocessableRequestError,
		);
		expect(await findFolder('FA')).toBeNull();
		expect(await findFolder('FB')).toBeNull();
		expect(await findProject('P1')).toBeNull();
		expect(await findProject('P2')).toBeNull();
	});

	it('reports missing node types per project scope and writes nothing', async () => {
		const unknownNode = {
			id: 'unknown-node',
			name: 'Unknown Node',
			type: 'n8n-nodes-community.chatBot',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		};
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				{ target: 'projects/stilton', project: serializedProject({ id: 'P2', name: 'stilton' }) },
			],
			workflows: [
				{
					target: 'projects/brie/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa', nodes: [unknownNode] }),
				},
				{
					target: 'projects/stilton/workflows/wfb',
					workflow: serializedWorkflow({ id: 'WFB', name: 'wfb', nodes: [unknownNode] }),
				},
			],
		});

		// Every project scope is planned before anything is written; the same missing
		// pair yields one issue per scope, each with that scope's workflows.
		const importPromise = importProjects(owner, packageBuffer);
		await expect(importPromise).rejects.toBeInstanceOf(UnprocessableRequestError);
		await expect(importPromise).rejects.toMatchObject({
			meta: {
				issues: [
					{
						type: 'missing-node-type',
						nodeType: 'n8n-nodes-community.chatBot',
						typeVersion: 1,
						usedByWorkflows: ['WFA'],
					},
					{
						type: 'missing-node-type',
						nodeType: 'n8n-nodes-community.chatBot',
						typeVersion: 1,
						usedByWorkflows: ['WFB'],
					},
				],
			},
		});

		expect(await findProject('P1')).toBeNull();
		expect(await findProject('P2')).toBeNull();
		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('creates a new project under publish-all, planned before the project exists', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
			],
			workflows: [
				{
					target: 'projects/brie/workflows/wf',
					workflow: serializedWorkflow({ id: 'WF', name: 'wf' }),
				},
			],
		});

		// publish-all checks publish permission during planning, which now runs before the project
		// is created. A project being created has no row to look up, so the import must not fail — its
		// creator is admin and can always publish.
		const result = await importProjects(owner, packageBuffer, undefined, {
			workflowPublishingPolicy: 'publish-all',
		});

		expect(result.projects).toEqual([
			{ sourceProjectId: 'P1', localId: 'P1', name: 'brie', status: 'created' },
		]);
		expect(result.workflows.find((w) => w.sourceWorkflowId === 'WF')?.projectId).toBe('P1');
		expect(await findProject('P1')).not.toBeNull();
	});

	describe('variable resolution', () => {
		afterEach(async () => {
			const seeded = await Container.get(VariablesRepository).find();
			if (seeded.length > 0) {
				await Container.get(VariablesService).deleteByIds(seeded.map(({ id }) => id));
			}
		});

		it('reports variable resolution across projects, deduplicating shared names', async () => {
			await createVariable('GLOBAL_URL', 'https://global.example.com');
			const packageBuffer = await buildEntityPackageBuffer({
				projects: [
					{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
					{
						target: 'projects/stilton',
						project: serializedProject({ id: 'P2', name: 'stilton' }),
					},
				],
				workflows: [
					{
						target: 'projects/brie/workflows/wfa',
						workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
					},
					{
						target: 'projects/stilton/workflows/wfb',
						workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
					},
				],
				manifestExtras: {
					requirements: {
						variables: [
							{ name: 'GLOBAL_URL', usedByWorkflows: ['WFA', 'WFB'] },
							{ name: 'ABSENT_VAR', usedByWorkflows: ['WFA', 'WFB'] },
						],
					},
				},
			});

			const result = await importProjects(owner, packageBuffer);

			expect(result.variables).toEqual({ matched: ['GLOBAL_URL'], missing: ['ABSENT_VAR'] });
			// do-nothing mode does not create variables
			expect(await Container.get(VariablesRepository).count()).toBe(1);
		});

		it('blocks the import under must-preexist when a referenced variable is unresolved', async () => {
			await createVariable('GLOBAL_URL', 'https://global.example.com');
			const packageBuffer = await buildEntityPackageBuffer({
				projects: [
					{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
					{
						target: 'projects/stilton',
						project: serializedProject({ id: 'P2', name: 'stilton' }),
					},
				],
				workflows: [
					{
						target: 'projects/brie/workflows/wfa',
						workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
					},
					{
						target: 'projects/stilton/workflows/wfb',
						workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
					},
				],
				manifestExtras: {
					requirements: {
						variables: [
							{ name: 'GLOBAL_URL', usedByWorkflows: ['WFA', 'WFB'] },
							{ name: 'ABSENT_VAR', usedByWorkflows: ['WFA', 'WFB'] },
						],
					},
				},
			});

			const error = await importProjects(owner, packageBuffer, undefined, {
				variableMissingMode: 'must-preexist',
			}).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UnprocessableRequestError);
			expect((error as UnprocessableRequestError).message).toMatch(/Import blocked/);
			expect((error as UnprocessableRequestError).meta?.issues).toEqual([
				{ type: 'variable-unresolved', name: 'ABSENT_VAR', usedByWorkflows: ['WFA'] },
				{ type: 'variable-unresolved', name: 'ABSENT_VAR', usedByWorkflows: ['WFB'] },
			]);

			expect(await findProject('P1')).toBeNull();
			expect(await findProject('P2')).toBeNull();
			// must-preexist never creates variables; only the seeded global remains.
			expect(await Container.get(VariablesRepository).count()).toBe(1);
		});

		/** Two projects whose workflows both reference `API_URL`. */
		const twoProjectPackageReferencingApiUrl = async () =>
			await buildEntityPackageBuffer({
				projects: [
					{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
					{
						target: 'projects/stilton',
						project: serializedProject({ id: 'P2', name: 'stilton' }),
					},
				],
				workflows: [
					{
						target: 'projects/brie/workflows/wfa',
						workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
					},
					{
						target: 'projects/stilton/workflows/wfb',
						workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
					},
				],
				manifestExtras: {
					requirements: {
						variables: [{ name: 'API_URL', usedByWorkflows: ['WFA', 'WFB'] }],
					},
				},
			});

		it('lists a name under both matched and missing when it resolves in only some projects', async () => {
			const packageBuffer = await twoProjectPackageReferencingApiUrl();
			await importProjects(owner, packageBuffer);
			await createProjectVariable('API_URL', 'https://p1.example.com', (await findProject('P1'))!);

			const result = await importProjects(owner, packageBuffer);

			expect(result.variables).toEqual({ matched: ['API_URL'], missing: ['API_URL'] });
		});

		it('blocks only on the projects where the variable is unresolved under must-preexist', async () => {
			const workflowStates = async () =>
				await Container.get(WorkflowRepository).find({
					select: ['id', 'versionId', 'updatedAt'],
					order: { id: 'ASC' },
				});
			const packageBuffer = await twoProjectPackageReferencingApiUrl();
			await importProjects(owner, packageBuffer);
			await createProjectVariable('API_URL', 'https://p1.example.com', (await findProject('P1'))!);
			const workflowsBefore = await workflowStates();

			const error = await importProjects(owner, packageBuffer, undefined, {
				variableMissingMode: 'must-preexist',
			}).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(UnprocessableRequestError);
			expect((error as UnprocessableRequestError).meta?.issues).toEqual([
				{ type: 'variable-unresolved', name: 'API_URL', usedByWorkflows: ['WFB'] },
			]);
			expect(await workflowStates()).toEqual(workflowsBefore);
		});
	});

	it('emits a single n8n-package-imported event aggregating every project in the package', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				{ target: 'projects/stilton', project: serializedProject({ id: 'P2', name: 'stilton' }) },
			],
			workflows: [
				{
					target: 'projects/brie/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
				},
				{
					target: 'projects/stilton/workflows/wfb',
					workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
				},
			],
		});

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
		try {
			await importProjects(owner, packageBuffer);

			const importedEvents = emitSpy.mock.calls.filter(([name]) => name === 'n8n-package-imported');
			expect(importedEvents).toHaveLength(1);

			const payload = importedEvents[0][1] as RelayEventMap['n8n-package-imported'];
			expect(payload.projectIds.sort()).toEqual(['P1', 'P2']);
			expect(payload.workflowIds).toHaveLength(2);
			expect(payload.folderId).toBeNull();
			expect(payload.counts.workflows.created).toBe(2);
		} finally {
			emitSpy.mockRestore();
		}
	});
});
