import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { createOwner } from '@test-integration/db/users';
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

// The publish path touches the active workflow manager; mock it so no real infra is needed.
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

	/** Writes an unpacked package into a fresh temp directory and returns its path. */
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

	/** Project P1 carrying two root workflows, WFA and WFB. */
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
		// workflowIdPolicy defaults to `source`, so the localId is the source id.
		expect(await findWorkflow('WFA')).not.toBeNull();
		// WFB was in the package but not selected, so it is never written.
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

		// Re-import the same selection with a renamed WFA to prove it updates in place under merge.
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
		// merge never reconciles by absence, so the pre-existing target workflow is untouched.
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
		// The unselected package project is never created.
		expect(await findProject('P2')).toBeNull();
		expect(await findWorkflow('WFB')).toBeNull();
		// A target-only project is out of scope entirely.
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

		// WFB lives in P2, outside the scoped project, so it is dropped rather than imported.
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
		// `new` mints a fresh local id rather than reusing the source id.
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
		// skip leaves the matched workflow's stored content unchanged.
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

		// Select only the parent: its sub-workflow dependency is neither selected nor on the target.
		const result = await importSelection(sourceDir, {
			selectedProjectId: 'P1',
			selectedWorkflowIds: ['CHEDDAR'],
		});

		const parentSummary = result.workflows.find((w) => w.sourceWorkflowId === 'CHEDDAR');
		expect(parentSummary?.status).toBe('created');
		// The reference is kept (broken, not dropped): the id still points at the absent sub-workflow.
		const importedParent = await findWorkflow(parentSummary!.localId);
		expect(subWorkflowRefOf(importedParent!)).toBe('BRIE');
		// The unselected sub-workflow is never imported.
		expect(await findWorkflow('BRIE')).toBeNull();
		// Publish fails softly (reported, not thrown) because the sub-workflow is not published.
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
		// WF Two was in the exported directory but not selected, so it is not recreated.
		expect(await findWorkflow(wfTwo.id)).toBeNull();
	});
});
