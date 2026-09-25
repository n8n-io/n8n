import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { ProjectRepository, WorkflowHistoryRepository, WorkflowRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportSelection, ImportSelectionRequest } from '../n8n-packages.types';
import {
	buildEntityPackageDirectory,
	serializedProject,
	serializedWorkflow,
	subWorkflowRefOf,
	WIRE_VERSION_ID,
	workflowRequirementsFromWorkflows,
	type EntityPackageOptions,
} from './fixtures/package-fixtures';
import { executeWorkflowNode } from './utils/test-builders';

const licenseMocker = new LicenseMocker();

// Mock the active workflow manager to avoid starting triggers during publication.
mockInstance(ActiveWorkflowManager);

/** Trigger node, needed so a workflow can be published. */
function scheduleTriggerNode() {
	return {
		id: 'schedule-trigger',
		name: 'Schedule Trigger',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	};
}

async function findProject(id: string) {
	return await Container.get(ProjectRepository).findOne({ where: { id } });
}

async function findWorkflow(id: string) {
	return await Container.get(WorkflowRepository).findOne({
		where: { id },
		relations: { parentFolder: true },
	});
}

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
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

describe('importPackageSelectionFromDirectory', () => {
	let owner: User;
	let createdDirs: string[];

	beforeEach(async () => {
		await testDb.truncate([
			'Folder',
			'Project',
			'ProjectRelation',
			'SharedWorkflow',
			'WorkflowEntity',
			'WorkflowHistory',
		]);
		licenseMocker.reset();
		owner = await createOwner();
		createdDirs = [];
	});

	afterEach(async () => {
		await Promise.all(
			createdDirs.map(async (dir) => await rm(dir, { recursive: true, force: true })),
		);
	});

	async function packageDir(options: EntityPackageOptions): Promise<string> {
		const dir = await mkdtemp(path.join(tmpdir(), 'n8n-import-selection-'));
		createdDirs.push(dir);
		await buildEntityPackageDirectory(dir, options);
		return dir;
	}

	async function importSelection(
		sourceDir: string,
		selection: ImportSelection,
		overrides?: Partial<ImportSelectionRequest>,
	) {
		return await Container.get(N8nPackagesService).importPackageSelectionFromDirectory(
			{ user: owner, ...overrides },
			{ sourceDir },
			selection,
		);
	}

	const twoWorkflowPackage: EntityPackageOptions = {
		projects: [{ target: 'projects/p1', project: serializedProject({ id: 'P1', name: 'p1' }) }],
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
	};

	it('imports only the selected workflows, leaving the rest of the package out', async () => {
		const result = await importSelection(await packageDir(twoWorkflowPackage), {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['WFA'],
		});

		expect(result.workflows).toHaveLength(1);
		expect(result.workflows[0]).toMatchObject({ sourceWorkflowId: 'WFA', status: 'created' });
		// The default ID policy preserves source IDs in the destination.
		expect(await findWorkflow('WFA')).not.toBeNull();
		expect(await findWorkflow('WFB')).toBeNull();
		expect(await findProject('P1')).not.toBeNull();
	});

	it('is additive: a re-import touches only the selection, never pre-existing target workflows', async () => {
		await importSelection(await packageDir(twoWorkflowPackage), {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['WFA'],
		});
		const project = await Container.get(ProjectRepository).findOneOrFail({ where: { id: 'P1' } });
		const keeper = await createWorkflow({ name: 'Keeper' }, project);

		const renamedDir = await packageDir({
			projects: [{ target: 'projects/p1', project: serializedProject({ id: 'P1', name: 'p1' }) }],
			workflows: [
				{
					target: 'projects/p1/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa renamed' }),
				},
			],
		});
		const result = await importSelection(renamedDir, {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['WFA'],
		});

		expect(result.workflows[0]).toMatchObject({ sourceWorkflowId: 'WFA', status: 'updated' });
		expect((await findWorkflow('WFA'))?.name).toBe('wfa renamed');
		expect(result.removedWorkflows).toEqual([]);
		const survivor = await findWorkflow(keeper.id);
		expect(survivor?.isArchived).toBe(false);
		expect(survivor?.name).toBe('Keeper');
	});

	it('confines the import to the selected project, never touching another package project', async () => {
		const bystander = await createTeamProject('Bystander', owner);
		const untouched = await createWorkflow({ name: 'Untouched' }, bystander);

		const sourceDir = await packageDir({
			projects: [
				{ target: 'projects/p1', project: serializedProject({ id: 'P1', name: 'p1' }) },
				{ target: 'projects/p2', project: serializedProject({ id: 'P2', name: 'p2' }) },
			],
			workflows: [
				{
					target: 'projects/p1/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
				},
				{
					target: 'projects/p2/workflows/wfb',
					workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
				},
			],
		});

		const result = await importSelection(sourceDir, {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['WFA'],
		});

		expect(result.projects.map((p) => p.localId)).toEqual(['P1']);
		expect(await findProject('P1')).not.toBeNull();
		expect(await findProject('P2')).toBeNull();
		expect(await findWorkflow('WFB')).toBeNull();
		expect((await findWorkflow(untouched.id))?.isArchived).toBe(false);
	});

	it('drops selected ids that belong to another project', async () => {
		const sourceDir = await packageDir({
			projects: [
				{ target: 'projects/p1', project: serializedProject({ id: 'P1', name: 'p1' }) },
				{ target: 'projects/p2', project: serializedProject({ id: 'P2', name: 'p2' }) },
			],
			workflows: [
				{
					target: 'projects/p1/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
				},
				{
					target: 'projects/p2/workflows/wfb',
					workflow: serializedWorkflow({ id: 'WFB', name: 'wfb' }),
				},
			],
		});

		const result = await importSelection(sourceDir, {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['WFA', 'WFB'],
		});

		expect(result.workflows.map((w) => w.sourceWorkflowId)).toEqual(['WFA']);
		expect(await findWorkflow('WFB')).toBeNull();
		expect(await findProject('P2')).toBeNull();
	});

	it('rejects a selected project the package does not contain, writing nothing', async () => {
		await expect(
			importSelection(await packageDir(twoWorkflowPackage), {
				selectedProjectId: 'MISSING',
				selectedWorkflowIds: ['WFA'],
			}),
		).rejects.toBeInstanceOf(BadRequestError);

		expect(await findProject('P1')).toBeNull();
		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('rejects a non-project (workflow) directory package, like a whole-scope directory import', async () => {
		const workflowPackageDir = await packageDir({
			workflows: [
				{ target: 'workflows/wfa', workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }) },
			],
		});

		await expect(
			importSelection(workflowPackageDir, {
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA'],
			}),
		).rejects.toThrow('Directory packages must contain projects');
	});

	it('is a no-op for an empty working copy, like a whole-scope directory import', async () => {
		const emptyDir = await packageDir({});

		const result = await importSelection(emptyDir, {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['WFA'],
		});

		expect(result.projects).toHaveLength(0);
		expect(result.workflows).toHaveLength(0);
		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});

	it('honours an overridden workflowIdPolicy', async () => {
		const result = await importSelection(
			await packageDir(twoWorkflowPackage),
			{ selectedProjectId: 'P1', selectedWorkflowIds: ['WFA'] },
			{ workflowIdPolicy: 'new' },
		);

		const summary = result.workflows[0];
		expect(summary.sourceWorkflowId).toBe('WFA');
		expect(summary.localId).not.toBe('WFA');
		expect(await findWorkflow(summary.localId)).not.toBeNull();
		expect(await findWorkflow('WFA')).toBeNull();
	});

	it('honours an overridden workflowConflictPolicy', async () => {
		await importSelection(await packageDir(twoWorkflowPackage), {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['WFA'],
		});

		const renamedDir = await packageDir({
			projects: [{ target: 'projects/p1', project: serializedProject({ id: 'P1', name: 'p1' }) }],
			workflows: [
				{
					target: 'projects/p1/workflows/wfa',
					workflow: serializedWorkflow({ id: 'WFA', name: 'wfa renamed' }),
				},
			],
		});

		const result = await importSelection(
			renamedDir,
			{ selectedProjectId: 'P1', selectedWorkflowIds: ['WFA'] },
			{ workflowConflictPolicy: 'skip' },
		);

		expect(result.workflows[0]).toMatchObject({ sourceWorkflowId: 'WFA', status: 'skipped' });
		expect((await findWorkflow('WFA'))?.name).toBe('wfa');
	});

	it('imports an out-of-subset sub-workflow reference broken-but-preserved, soft-failing its publish', async () => {
		const parent = serializedWorkflow({
			id: 'CHEDDAR',
			name: 'Parent',
			publishedVersionId: WIRE_VERSION_ID,
			nodes: [scheduleTriggerNode(), executeWorkflowNode('BRIE')],
		});
		const sub = serializedWorkflow({
			id: 'BRIE',
			name: 'Sub-workflow',
			publishedVersionId: WIRE_VERSION_ID,
			nodes: [scheduleTriggerNode()],
		});
		const sourceDir = await packageDir({
			projects: [{ target: 'projects/p1', project: serializedProject({ id: 'P1', name: 'p1' }) }],
			workflows: [
				{ target: 'projects/p1/workflows/cheddar', workflow: parent },
				{ target: 'projects/p1/workflows/brie', workflow: sub },
			],
			manifestExtras: {
				requirements: { workflows: workflowRequirementsFromWorkflows([parent, sub]) },
			},
		});

		const result = await importSelection(sourceDir, {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['CHEDDAR'],
		});

		const parentSummary = result.workflows.find((w) => w.sourceWorkflowId === 'CHEDDAR');
		expect(parentSummary?.status).toBe('created');
		const importedParent = await findWorkflow(parentSummary!.localId);
		expect(subWorkflowRefOf(importedParent!)).toBe('BRIE');
		expect(await findWorkflow('BRIE')).toBeNull();
		expect(parentSummary?.publishing.state).toBe('failed');
		expect(parentSummary?.publishing.error).toMatch(/BRIE.*not published/);
	});

	it('imports the selected subset from a real exported directory', async () => {
		const sourceDir = await mkdtemp(path.join(tmpdir(), 'n8n-export-selection-'));
		createdDirs.push(sourceDir);

		const project = await createTeamProject('Alpha Project', owner);
		const wfOne = await createWorkflow({ name: 'WF One', nodes: [], connections: {} }, project);
		const wfTwo = await createWorkflow({ name: 'WF Two', nodes: [], connections: {} }, project);
		await Container.get(N8nPackagesService).exportPackageToDirectory(
			{ user: owner, projectIds: [project.id] },
			{ targetDir: sourceDir },
		);

		// Clear the workflows so the re-import must recreate exactly the selected subset.
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);

		const result = await importSelection(sourceDir, {
			selectedProjectId: project.id,
			selectedWorkflowIds: [wfOne.id],
		});

		expect(result.workflows.map((w) => w.sourceWorkflowId)).toEqual([wfOne.id]);
		expect(await findWorkflow(wfOne.id)).not.toBeNull();
		expect(await findWorkflow(wfTwo.id)).toBeNull();
	});

	describe('explicit deletes', () => {
		it('rejects a selected create before creating the project or workflows', async () => {
			await expect(
				importSelection(await packageDir(twoWorkflowPackage), {
					selectedProjectId: 'P1',
					selectedWorkflowIds: ['WFA', 'WFB'],
					deletedWorkflowIds: ['WFA'],
				}),
			).rejects.toMatchObject({
				constructor: ConflictError,
				meta: {
					issues: [
						{
							type: 'workflow-removal-conflict',
							sourceWorkflowId: 'WFA',
							workflowId: 'WFA',
							projectId: 'P1',
						},
					],
				},
			});

			expect(await findProject('P1')).toBeNull();
			expect(await findWorkflow('WFA')).toBeNull();
			expect(await findWorkflow('WFB')).toBeNull();
		});

		it.each([
			{ isArchived: false, workflowConflictPolicy: 'new-version', workflowIdPolicy: 'source' },
			{ isArchived: true, workflowConflictPolicy: 'new-version', workflowIdPolicy: 'source' },
			{ isArchived: false, workflowConflictPolicy: 'skip', workflowIdPolicy: 'source' },
			{ isArchived: false, workflowConflictPolicy: 'new-version', workflowIdPolicy: 'new' },
		] as const)(
			'rejects an overlap with archived=$isArchived, conflict=$workflowConflictPolicy, ids=$workflowIdPolicy',
			async ({ isArchived, workflowConflictPolicy, workflowIdPolicy }) => {
				const sourceDir = await packageDir(twoWorkflowPackage);
				const seeded = await importSelection(
					sourceDir,
					{ selectedProjectId: 'P1', selectedWorkflowIds: ['WFA'] },
					{ workflowIdPolicy },
				);
				const workflowId = seeded.workflows[0].localId;
				if (workflowIdPolicy === 'new') expect(workflowId).not.toBe('WFA');
				await Container.get(WorkflowRepository).update(workflowId, { isArchived });
				const before = await findWorkflow(workflowId);
				const historyBefore = await Container.get(WorkflowHistoryRepository).countBy({
					workflowId,
				});
				const projectBefore = await findProject('P1');

				await expect(
					importSelection(
						sourceDir,
						{
							selectedProjectId: 'P1',
							selectedWorkflowIds: ['WFA', 'WFB'],
							deletedWorkflowIds: [workflowId],
						},
						{ workflowConflictPolicy },
					),
				).rejects.toMatchObject({
					constructor: ConflictError,
					meta: {
						issues: [
							{
								type: 'workflow-removal-conflict',
								sourceWorkflowId: 'WFA',
								workflowId,
								projectId: 'P1',
							},
						],
					},
				});

				expect(await findWorkflow(workflowId)).toEqual(before);
				expect(await Container.get(WorkflowHistoryRepository).countBy({ workflowId })).toBe(
					historyBefore,
				);
				expect(await findWorkflow('WFB')).toBeNull();
				expect(await findProject('P1')).toEqual(projectBefore);
			},
		);

		it('allows deletion of a workflow that is only referenced by the selection', async () => {
			await seedBothWorkflows();
			const parent = serializedWorkflow({
				id: 'WFA',
				name: 'Parent',
				nodes: [executeWorkflowNode('WFB')],
			});
			const sub = serializedWorkflow({ id: 'WFB', name: 'Sub' });
			const sourceDir = await packageDir({
				projects: twoWorkflowPackage.projects,
				workflows: [{ target: 'projects/p1/workflows/wfa', workflow: parent }],
				manifestExtras: {
					requirements: { workflows: workflowRequirementsFromWorkflows([parent, sub]) },
				},
			});

			const result = await importSelection(sourceDir, {
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA'],
				deletedWorkflowIds: ['WFB'],
			});

			expect(result.workflows).toEqual([
				expect.objectContaining({ sourceWorkflowId: 'WFA', status: 'updated' }),
			]);
			expect(result.removedWorkflows).toEqual([
				expect.objectContaining({ workflowId: 'WFB', deletion: 'archived' }),
			]);
			expect((await findWorkflow('WFB'))?.isArchived).toBe(true);
			expect(subWorkflowRefOf((await findWorkflow('WFA'))!)).toBe('WFB');
		});

		async function seedBothWorkflows() {
			await importSelection(await packageDir(twoWorkflowPackage), {
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA', 'WFB'],
			});
		}

		it('archives a workflow named for deletion, even under the additive merge profile', async () => {
			await seedBothWorkflows();
			expect((await findWorkflow('WFB'))?.isArchived).toBe(false);

			const result = await importSelection(await packageDir(twoWorkflowPackage), {
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA'],
				deletedWorkflowIds: ['WFB'],
			});

			expect(result.removedWorkflows).toEqual([
				{
					workflowId: 'WFB',
					name: 'wfb',
					projectId: 'P1',
					parentFolderId: null,
					deletion: 'archived',
				},
			]);
			expect((await findWorkflow('WFB'))?.isArchived).toBe(true);
			expect((await findWorkflow('WFA'))?.isArchived).toBe(false);
		});

		it('tolerates deleting an already-archived or absent workflow as a no-op', async () => {
			await seedBothWorkflows();

			await importSelection(await packageDir(twoWorkflowPackage), {
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA'],
				deletedWorkflowIds: ['WFB'],
			});
			expect((await findWorkflow('WFB'))?.isArchived).toBe(true);

			const result = await importSelection(await packageDir(twoWorkflowPackage), {
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA'],
				deletedWorkflowIds: ['WFB', 'GHOST'],
			});

			expect(result.removedWorkflows).toEqual([]);
			expect((await findWorkflow('WFB'))?.isArchived).toBe(true);
		});

		it('confines deletes to the scoped project, never removing a bystander project workflow', async () => {
			await seedBothWorkflows();
			const bystander = await createTeamProject('Bystander', owner);
			const outsider = await createWorkflow({ name: 'Outsider' }, bystander);

			const result = await importSelection(await packageDir(twoWorkflowPackage), {
				selectedProjectId: 'P1',
				selectedWorkflowIds: ['WFA'],
				deletedWorkflowIds: [outsider.id],
			});

			expect(result.removedWorkflows).toEqual([]);
			expect((await findWorkflow(outsider.id))?.isArchived).toBe(false);
		});

		it('rejects an explicit delete the caller may not perform, writing nothing', async () => {
			const projectRepository = Container.get(ProjectRepository);
			await projectRepository.save(
				projectRepository.create({ id: 'P1', name: 'p1', type: 'team' }),
			);
			const project = await projectRepository.findOneOrFail({ where: { id: 'P1' } });
			const protectedWorkflow = await createWorkflow({ name: 'Protected' }, project);

			// Grant import permissions without workflow:delete to test the project permission check.
			const member = await createMember();
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

			const sourceDir = await packageDir({
				projects: [{ target: 'projects/p1', project: serializedProject({ id: 'P1', name: 'p1' }) }],
				workflows: [
					{
						target: 'projects/p1/workflows/wfa',
						workflow: serializedWorkflow({ id: 'WFA', name: 'wfa' }),
					},
				],
			});

			let caught: unknown;
			try {
				await importSelection(
					sourceDir,
					{
						selectedProjectId: 'P1',
						selectedWorkflowIds: ['WFA'],
						deletedWorkflowIds: [protectedWorkflow.id],
					},
					{ user: member },
				);
			} catch (error) {
				caught = error;
			}

			expect(caught).toBeInstanceOf(UnprocessableRequestError);
			expect((caught as UnprocessableRequestError).meta?.issues).toContainEqual({
				type: 'workflow-removal-forbidden',
				workflowId: protectedWorkflow.id,
				name: 'Protected',
				projectId: 'P1',
			});

			expect(await findWorkflow('WFA')).toBeNull();
			expect((await findWorkflow(protectedWorkflow.id))?.isArchived).toBe(false);
		});
	});
});
