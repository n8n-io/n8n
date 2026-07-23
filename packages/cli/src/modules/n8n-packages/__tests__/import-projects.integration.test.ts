import { LicenseState } from '@n8n/backend-common';
import { linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
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
import { createMember, createOwner } from '@test-integration/db/users';
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
		variableParentPolicy: 'project',
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

		/**
		 * Two team projects — brie (P1, workflow WFA) and stilton (P2, workflow WFB) — with an
		 * optional bundled variable `catalog` and the variable `requirements` its workflows declare.
		 * A catalog entry's `target` encodes scope: `variables/x` is global, `projects/<name>/variables/x`
		 * is that project's. Requirements are what the workflows reference (by `usedByWorkflows`).
		 */
		const twoProjectPackage = async (
			opts: {
				catalog?: Array<{ id: string; name: string; target: string }>;
				requirements?: Array<{ name: string; usedByWorkflows: string[] }>;
			} = {},
		) =>
			await buildEntityPackageBuffer({
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
				manifestExtras: {
					...(opts.catalog ? { variables: opts.catalog } : {}),
					...(opts.requirements ? { requirements: { variables: opts.requirements } } : {}),
				},
			});

		/** Both projects' workflows reference `API_URL` as a name-only requirement (nothing bundled). */
		const apiUrlPackage = async () =>
			await twoProjectPackage({
				requirements: [{ name: 'API_URL', usedByWorkflows: ['WFA', 'WFB'] }],
			});

		/** Single team project brie (P1, workflow WFA) whose workflow needs a top-level (global) variable. */
		const packageWithGlobalVariable = async () =>
			await buildEntityPackageBuffer({
				projects: [
					{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				],
				workflows: [
					{
						target: 'projects/brie/workflows/wfa',
						workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
					},
				],
				manifestExtras: {
					variables: [{ id: 'v1', name: 'GLOBAL_VAR', target: 'variables/global_var' }],
					requirements: {
						variables: [{ name: 'GLOBAL_VAR', usedByWorkflows: ['WFA'] }],
					},
				},
			});

		describe('do-nothing missing mode', () => {
			it('reports resolution across projects and deduplicates shared names', async () => {
				await createVariable('GLOBAL_URL', 'https://global.example.com');
				const packageBuffer = await twoProjectPackage({
					requirements: [
						{ name: 'GLOBAL_URL', usedByWorkflows: ['WFA', 'WFB'] },
						{ name: 'ABSENT_VAR', usedByWorkflows: ['WFA', 'WFB'] },
					],
				});

				const result = await importProjects(owner, packageBuffer);

				expect(result.variables).toEqual({
					matched: ['GLOBAL_URL'],
					missing: ['ABSENT_VAR'],
					stubbed: [],
				});
				// do-nothing mode does not create variables.
				expect(await Container.get(VariablesRepository).count()).toBe(1);
			});

			it('lists a name under both matched and missing when it resolves in only some projects', async () => {
				const packageBuffer = await apiUrlPackage();
				await importProjects(owner, packageBuffer);
				await createProjectVariable(
					'API_URL',
					'https://p1.example.com',
					(await findProject('P1'))!,
				);

				const result = await importProjects(owner, packageBuffer);

				expect(result.variables).toEqual({
					matched: ['API_URL'],
					missing: ['API_URL'],
					stubbed: [],
				});
			});
		});

		describe('must-preexist missing mode', () => {
			it('blocks the import when a referenced variable is unresolved', async () => {
				await createVariable('GLOBAL_URL', 'https://global.example.com');
				const packageBuffer = await twoProjectPackage({
					requirements: [
						{ name: 'GLOBAL_URL', usedByWorkflows: ['WFA', 'WFB'] },
						{ name: 'ABSENT_VAR', usedByWorkflows: ['WFA', 'WFB'] },
					],
				});

				const error = await importProjects(owner, packageBuffer, undefined, {
					variableMissingMode: 'must-preexist',
				}).catch((e: unknown) => e);

				expect(error).toBeInstanceOf(UnprocessableRequestError);
				expect((error as UnprocessableRequestError).message).toMatch(/Import blocked/);
				// One issue per consuming workflow of the unresolved name.
				expect((error as UnprocessableRequestError).meta?.issues).toEqual([
					{ type: 'variable-unresolved', name: 'ABSENT_VAR', usedByWorkflows: ['WFA'] },
					{ type: 'variable-unresolved', name: 'ABSENT_VAR', usedByWorkflows: ['WFB'] },
				]);

				expect(await findProject('P1')).toBeNull();
				expect(await findProject('P2')).toBeNull();
				// must-preexist never creates variables; only the seeded global remains.
				expect(await Container.get(VariablesRepository).count()).toBe(1);
			});

			it('blocks only on the projects where the variable is unresolved', async () => {
				const workflowStates = async () =>
					await Container.get(WorkflowRepository).find({
						select: ['id', 'versionId', 'updatedAt'],
						order: { id: 'ASC' },
					});
				const packageBuffer = await apiUrlPackage();
				await importProjects(owner, packageBuffer);
				await createProjectVariable(
					'API_URL',
					'https://p1.example.com',
					(await findProject('P1'))!,
				);
				const workflowsBefore = await workflowStates();

				const error = await importProjects(owner, packageBuffer, undefined, {
					variableMissingMode: 'must-preexist',
				}).catch((e: unknown) => e);

				expect(error).toBeInstanceOf(UnprocessableRequestError);
				// API_URL resolves in P1 (seeded above) but not P2, so only WFB blocks.
				expect((error as UnprocessableRequestError).meta?.issues).toEqual([
					{ type: 'variable-unresolved', name: 'API_URL', usedByWorkflows: ['WFB'] },
				]);
				expect(await workflowStates()).toEqual(workflowsBefore);
			});
		});

		describe('create-stub missing mode', () => {
			beforeEach(() => {
				licenseMocker.enable('feat:variables');
			});

			it('creates each missing variable at its package-driven scope', async () => {
				// PROJECT_VAR is bundled under the brie project; GLOBAL_VAR at the package top level.
				const packageBuffer = await twoProjectPackage({
					catalog: [
						{ id: 'v1', name: 'PROJECT_VAR', target: 'projects/brie/variables/project_var' },
						{ id: 'v2', name: 'GLOBAL_VAR', target: 'variables/global_var' },
					],
					requirements: [
						{ name: 'PROJECT_VAR', usedByWorkflows: ['WFA'] },
						{ name: 'GLOBAL_VAR', usedByWorkflows: ['WFB'] },
					],
				});

				const result = await importProjects(owner, packageBuffer, undefined, {
					variableMissingMode: 'create-stub',
				});

				expect(result.variables).toEqual({
					matched: [],
					missing: [],
					stubbed: expect.arrayContaining(['GLOBAL_VAR', 'PROJECT_VAR']),
				});
				expect(result.variables.stubbed).toHaveLength(2);

				// Each stub is created empty, at the scope its catalog entry declared.
				const created = await Container.get(VariablesRepository).find({
					relations: { project: true },
				});
				const layout = created.map((v) => ({
					key: v.key,
					scope: v.project?.id ?? 'global',
					value: v.value,
				}));
				expect(layout).toEqual(
					expect.arrayContaining([
						{ key: 'PROJECT_VAR', scope: 'P1', value: '' },
						{ key: 'GLOBAL_VAR', scope: 'global', value: '' },
					]),
				);
				expect(layout).toHaveLength(2);
			});

			it('ignores variableParentPolicy; placement stays package-driven', async () => {
				const result = await importProjects(owner, await packageWithGlobalVariable(), undefined, {
					variableMissingMode: 'create-stub',
					variableParentPolicy: 'project',
				});

				expect(result.variables).toEqual({ matched: [], missing: [], stubbed: ['GLOBAL_VAR'] });
				// Despite the caller asking for project placement, the top-level entry keeps it global.
				const created = await Container.get(VariablesRepository).find({
					relations: { project: true },
				});
				const layout = created.map((v) => ({ key: v.key, scope: v.project?.id ?? 'global' }));
				expect(layout).toEqual([{ key: 'GLOBAL_VAR', scope: 'global' }]);
			});

			it('creates one row per consuming project for a name-only requirement', async () => {
				const packageBuffer = await apiUrlPackage();

				const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

				const result = await importProjects(owner, packageBuffer, undefined, {
					variableMissingMode: 'create-stub',
				});

				// A name-only requirement (no bundled entry) falls back to each consuming project.
				expect(result.variables).toEqual({ matched: [], missing: [], stubbed: ['API_URL'] });
				const created = await Container.get(VariablesRepository).find({
					relations: { project: true },
				});
				const layout = created.map((v) => ({ key: v.key, scope: v.project?.id ?? 'global' }));
				expect(layout).toEqual(
					expect.arrayContaining([
						{ key: 'API_URL', scope: 'P1' },
						{ key: 'API_URL', scope: 'P2' },
					]),
				);
				expect(layout).toHaveLength(2);

				// The name is stubbed once in the summary but is two rows, so telemetry counts 2.
				const importedEvents = emitSpy.mock.calls.filter(
					([name]) => name === 'n8n-package-imported',
				);
				expect(importedEvents).toHaveLength(1);
				const payload = importedEvents[0][1] as RelayEventMap['n8n-package-imported'];
				expect(payload.counts.variables.created).toBe(2);
			});

			it("does not let another project's bundled entry control this scope's placement", async () => {
				// Only stilton (P2) has a workflow; THEIRS is bundled under brie but consumed by WFB.
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
							target: 'projects/stilton/workflows/wfb',
							workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
						},
					],
					manifestExtras: {
						// The catalog places THEIRS in brie, but brie has no workflow that uses it. Since
						// the bundled scope belongs to a different project than the consumer, it's ignored:
						// the stub is created in the consuming project (stilton), not brie or global.
						variables: [{ id: 'v1', name: 'THEIRS', target: 'projects/brie/variables/theirs' }],
						requirements: {
							variables: [{ name: 'THEIRS', usedByWorkflows: ['WFB'] }],
						},
					},
				});

				const result = await importProjects(owner, packageBuffer, undefined, {
					variableMissingMode: 'create-stub',
				});

				expect(result.variables).toEqual({ matched: [], missing: [], stubbed: ['THEIRS'] });
				const created = await Container.get(VariablesRepository).find({
					relations: { project: true },
				});
				const layout = created.map((v) => ({ key: v.key, scope: v.project?.id ?? 'global' }));
				expect(layout).toEqual([{ key: 'THEIRS', scope: 'P2' }]);
			});

			it('creates a shared global variable once and a same-key project variable at its own destination', async () => {
				const packageBuffer = await twoProjectPackage({
					catalog: [
						// SHARED_URL is global and used by both projects: one row, stubbed once.
						{ id: 'v1', name: 'SHARED_URL', target: 'variables/shared_url' },
						// API_URL exists both at the top level and inside stilton: brie's scope sees the
						// global entry while stilton's own entry wins for its scope — two distinct rows.
						{ id: 'v2', name: 'API_URL', target: 'variables/api_url' },
						{ id: 'v3', name: 'API_URL', target: 'projects/stilton/variables/api_url' },
					],
					requirements: [
						{ name: 'SHARED_URL', usedByWorkflows: ['WFA', 'WFB'] },
						{ name: 'API_URL', usedByWorkflows: ['WFA', 'WFB'] },
					],
				});

				const result = await importProjects(owner, packageBuffer, undefined, {
					variableMissingMode: 'create-stub',
				});

				// Each name is stubbed once in the summary, regardless of how many rows it maps to.
				expect(result.variables).toEqual({
					matched: [],
					missing: [],
					stubbed: expect.arrayContaining(['API_URL', 'SHARED_URL']),
				});
				expect(result.variables.stubbed).toHaveLength(2);

				// SHARED_URL lands once (global); API_URL lands twice — global for brie, project-scoped
				// for stilton — proving the fresh global row doesn't cancel stilton's project creation.
				const created = await Container.get(VariablesRepository).find({
					relations: { project: true },
				});
				const layout = created.map((v) => ({ key: v.key, scope: v.project?.id ?? 'global' }));
				expect(layout).toEqual(
					expect.arrayContaining([
						{ key: 'SHARED_URL', scope: 'global' },
						{ key: 'API_URL', scope: 'global' },
						{ key: 'API_URL', scope: 'P2' },
					]),
				);
				expect(layout).toHaveLength(3);
			});

			it('lists a name under both matched and stubbed when it pre-exists in only some projects', async () => {
				const packageBuffer = await apiUrlPackage();
				await importProjects(owner, packageBuffer);
				await createProjectVariable(
					'API_URL',
					'https://p1.example.com',
					(await findProject('P1'))!,
				);

				const result = await importProjects(owner, packageBuffer, undefined, {
					variableMissingMode: 'create-stub',
				});

				expect(result.variables).toEqual({
					matched: ['API_URL'],
					missing: [],
					stubbed: ['API_URL'],
				});
				const rows = await Container.get(VariablesRepository).find({
					relations: { project: true },
				});
				const layout = rows.map((v) => ({
					key: v.key,
					scope: v.project?.id ?? 'global',
					value: v.value,
				}));
				expect(layout).toEqual(
					expect.arrayContaining([
						// The stub (empty value) lands only in P2, where the name did not resolve.
						{ key: 'API_URL', scope: 'P2', value: '' },
						// P1 keeps just its pre-seeded row — the import must not add a stub beside it.
						{ key: 'API_URL', scope: 'P1', value: 'https://p1.example.com' },
					]),
				);
				expect(layout).toHaveLength(2);
			});

			it('rejects a global variable stub for a caller without the global variable:create scope', async () => {
				// A member who is admin of the existing target project may update it (and import
				// workflows into it), but lacks the global variable:create scope.
				const member = await createMember();
				const projectRepository = Container.get(ProjectRepository);
				await projectRepository.save(
					projectRepository.create({ id: 'P1', name: 'brie', type: 'team' }),
				);
				await linkUserToProject(member, (await findProject('P1'))!, 'project:admin');

				await expect(
					importProjects(member, await packageWithGlobalVariable(), undefined, {
						variableMissingMode: 'create-stub',
					}),
				).rejects.toThrow('You are not allowed to create global variables');

				expect(await Container.get(VariablesRepository).count()).toBe(0);
			});

			it('rejects the import when the API key lacks the variable:create scope', async () => {
				// The gate is requirement-based: it applies even though the variable already matches.
				await createVariable('GLOBAL_VAR', 'https://global.example.com');

				await expect(
					importProjects(
						owner,
						await packageWithGlobalVariable(),
						['project:create', 'project:update', 'workflow:import'],
						{ variableMissingMode: 'create-stub' },
					),
				).rejects.toBeInstanceOf(ForbiddenError);

				expect(await findProject('P1')).toBeNull();
			});

			it('blocks up front with a single limit issue when the package exceeds the variable quota', async () => {
				licenseMocker.setQuota('quota:maxVariables', 1);
				const packageBuffer = await twoProjectPackage({
					catalog: [
						{ id: 'v1', name: 'VAR_A', target: 'projects/brie/variables/var_a' },
						{ id: 'v2', name: 'VAR_B', target: 'projects/stilton/variables/var_b' },
					],
					requirements: [
						{ name: 'VAR_A', usedByWorkflows: ['WFA'] },
						{ name: 'VAR_B', usedByWorkflows: ['WFB'] },
					],
				});

				const error = await importProjects(owner, packageBuffer, undefined, {
					variableMissingMode: 'create-stub',
				}).catch((e: unknown) => e);

				expect(error).toBeInstanceOf(UnprocessableRequestError);
				// The aggregate preflight reports the overrun exactly once, not per project scope.
				expect((error as UnprocessableRequestError).meta?.issues).toEqual([
					{
						type: 'variable-limit-exceeded',
						limit: 1,
						requested: 2,
						names: ['VAR_A', 'VAR_B'],
					},
				]);
				expect(await findProject('P1')).toBeNull();
				expect(await findProject('P2')).toBeNull();
				expect(await Container.get(VariablesRepository).count()).toBe(0);
			});
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
