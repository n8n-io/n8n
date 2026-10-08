import { LicenseState } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { FolderRepository, TagRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IWorkflowSettings } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import {
	buildEntityPackageBuffer,
	buildImportPackageBuffer,
	dataTableRequirement,
	serializedDataTable,
	serializedFolder,
	serializedWorkflow,
	serializedWorkflowWithDataTable,
} from '../../__tests__/fixtures/package-fixtures';
import {
	exportTool,
	exported,
	importTool,
	imported,
	storedWorkflow,
	textOf,
	workflowCountIn,
} from './workflow-package-test-helpers';

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let owner: User;
let member: User;
let sourceProject: Project;
let targetProject: Project;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'data-table']);
	await testDb.init();
	await initNodeTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: [
			'feat:projectRole:admin',
			'feat:projectRole:editor',
			'feat:projectRole:viewer',
			'feat:folders',
		],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'WorkflowHistory',
		'SharedWorkflow',
		'Folder',
		'TagEntity',
		'ProjectRelation',
		'Project',
		'User',
	]);

	owner = await createOwner();
	member = await createMember();
	sourceProject = await createTeamProject('Sales', owner);
	targetProject = await createTeamProject('Cloud automations', owner);
	await linkUserToProject(member, targetProject, 'project:editor');
});

afterEach(() => {
	vi.restoreAllMocks();
});

const createSourceWorkflow = async (settings: IWorkflowSettings = {}) =>
	await createWorkflow(
		{
			name: 'Daily report',
			nodes: [],
			connections: {},
			settings: { availableInMCP: true, ...settings },
		},
		sourceProject,
	);

/** Exports a workflow of the source project and imports it into the target project once. */
async function pushOnce() {
	const source = await createSourceWorkflow();
	const { packageBase64 } = exported(await exportTool(owner, source.id));
	const copy = imported(await importTool(member, { packageBase64, projectId: targetProject.id }));
	return { source, packageBase64, copyId: copy.workflowId };
}

const changeWorkflow = async (workflowId: string, changes: Record<string, unknown>) =>
	await Container.get(WorkflowRepository).update({ id: workflowId }, changes);

describe('import_workflow_package and MCP access', () => {
	it('does not update a copy whose MCP access the owner turned off', async () => {
		const { packageBase64, copyId } = await pushOnce();
		await changeWorkflow(copyId, { name: 'Kept by owner', settings: { availableInMCP: false } });
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const result = await importTool(member, { packageBase64, projectId: targetProject.id });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain(
			`The package matches the workflow "Kept by owner" (${copyId}) in the target project, so the import would update that workflow. Workflow is not available in MCP.`,
		);
		expect(textOf(result)).toContain('You can also import the package into another project.');
		const copy = await storedWorkflow(copyId);
		expect(copy.name).toBe('Kept by owner');
		expect(copy.settings).toEqual({ availableInMCP: false });
		expect(await workflowCountIn(targetProject)).toBe(1);
		expect(emit).toHaveBeenCalledWith('n8n-package-import-failed', {
			user: member,
			reason: 'access-denied',
			projectId: targetProject.id,
		});
		expect(emit).not.toHaveBeenCalledWith('n8n-package-imported', expect.anything());
	});

	it('does not update or restore an archived copy', async () => {
		const { packageBase64, copyId } = await pushOnce();
		await changeWorkflow(copyId, { name: 'Archived by owner', isArchived: true });
		const emit = vi.spyOn(Container.get(EventService), 'emit');

		const result = await importTool(member, { packageBase64, projectId: targetProject.id });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain(`Workflow '${copyId}' is archived and cannot be accessed.`);
		const copy = await storedWorkflow(copyId);
		expect(copy.isArchived).toBe(true);
		expect(copy.name).toBe('Archived by owner');
		expect(await workflowCountIn(targetProject)).toBe(1);
		expect(emit).toHaveBeenCalledWith('n8n-package-import-failed', {
			user: member,
			reason: 'blocked',
			projectId: targetProject.id,
		});
	});

	// The import also matches a workflow by its own id, so a package can target the workflow that it
	// was exported from.
	it('does not update the source workflow after its MCP access was turned off', async () => {
		const source = await createSourceWorkflow();
		const { packageBase64 } = exported(await exportTool(owner, source.id));
		await changeWorkflow(source.id, { name: 'Private', settings: { availableInMCP: false } });

		const result = await importTool(owner, { packageBase64, projectId: sourceProject.id });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain('Workflow is not available in MCP.');
		const stored = await storedWorkflow(source.id);
		expect(stored.name).toBe('Private');
		expect(stored.settings).toEqual({ availableInMCP: false });
		expect(await workflowCountIn(sourceProject)).toBe(1);
	});

	it('updates a copy that is still available in MCP', async () => {
		const { packageBase64, copyId } = await pushOnce();
		await changeWorkflow(copyId, { name: 'Renamed copy' });

		const second = imported(
			await importTool(member, { packageBase64, projectId: targetProject.id }),
		);

		expect(second).toMatchObject({ workflowId: copyId, created: false });
		expect((await storedWorkflow(copyId)).name).toBe('Daily report');
	});

	// As with create_workflow_from_code: the client can update or publish what it created.
	it('makes the workflow available in MCP, so that the same package can update it again', async () => {
		const packageBase64 = (
			await buildImportPackageBuffer([
				serializedWorkflow({ id: 'wf-hidden', settings: { availableInMCP: false } }),
			])
		).toString('base64');

		const first = imported(
			await importTool(member, { packageBase64, projectId: targetProject.id }),
		);
		const second = imported(
			await importTool(member, { packageBase64, projectId: targetProject.id }),
		);

		expect(first.created).toBe(true);
		expect(first.warnings).toEqual([]);
		expect((await storedWorkflow(first.workflowId)).settings?.availableInMCP).toBe(true);
		expect(second).toMatchObject({ workflowId: first.workflowId, created: false });
		expect((await storedWorkflow(first.workflowId)).settings?.availableInMCP).toBe(true);
	});
});

describe('concurrent imports', () => {
	it('creates one workflow when the same package is imported twice at the same time', async () => {
		const source = await createSourceWorkflow();
		const { packageBase64 } = exported(await exportTool(owner, source.id));
		const args = { packageBase64, projectId: targetProject.id };

		const results = await Promise.all([importTool(member, args), importTool(member, args)]);

		const [first, second] = results.map(imported);
		expect([first.created, second.created].sort()).toEqual([false, true]);
		expect(second.workflowId).toBe(first.workflowId);
		expect(await workflowCountIn(targetProject)).toBe(1);
	});
});

describe('what the import does not create', () => {
	it('rejects a package with folders and creates nothing', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			workflows: [{ target: 'workflows/wf-0', workflow: serializedWorkflow({ id: 'wf-0' }) }],
			folders: [
				{ target: 'folders/f-0', folder: serializedFolder({ id: 'f-0', name: 'Reports' }) },
			],
		});

		const result = await importTool(member, {
			packageBase64: packageBuffer.toString('base64'),
			projectId: targetProject.id,
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toBe(
			'The package must contain exactly one workflow and no folders or projects, but it contains 1 workflow(s), 1 folder(s) and 0 project(s). Use a package from export_workflow_package.',
		);
		expect(await Container.get(FolderRepository).count()).toBe(0);
		expect(await workflowCountIn(targetProject)).toBe(0);
	});

	it('does not create a tag that this instance does not have, and says so', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			workflows: [
				{
					target: 'workflows/wf-0',
					workflow: serializedWorkflow({ id: 'wf-0', tagIds: ['tag-finance'] }),
				},
			],
			manifestExtras: {
				requirements: {
					tags: [{ id: 'tag-finance', name: 'Finance', usedByWorkflows: ['wf-0'] }],
				},
			},
		});

		const result = await importTool(member, {
			packageBase64: packageBuffer.toString('base64'),
			projectId: targetProject.id,
		});

		expect(imported(result).warnings).toEqual([
			'The import did not add 1 tag(s), because this instance does not have them: Finance.',
		]);
		expect(textOf(result)).toContain('The import did not add 1 tag(s)');
		expect(await Container.get(TagRepository).count()).toBe(0);
	});

	it('does not create a data table that the target project does not have, and says so', async () => {
		const table = serializedDataTable({ id: 'dtsource1', name: 'Customers' });
		const packageBuffer = await buildEntityPackageBuffer({
			workflows: [
				{
					target: 'workflows/wf-0',
					workflow: serializedWorkflowWithDataTable({
						id: 'wf-0',
						name: 'Sync customers',
						dataTableId: table.id,
					}),
				},
			],
			dataTables: [{ target: 'data-tables/dt-0', dataTable: table }],
			manifestExtras: { requirements: { dataTables: [dataTableRequirement(table, ['wf-0'])] } },
		});

		const result = await importTool(member, {
			packageBase64: packageBuffer.toString('base64'),
			projectId: targetProject.id,
		});

		expect(imported(result).created).toBe(true);
		expect(imported(result).warnings).toEqual([
			'1 of the 1 data table(s) that the workflow uses are not in the target project, and the import did not create them. The workflow uses: Customers. Create the missing tables, then select them in the workflow.',
		]);
		expect(await Container.get(DataTableRepository).count()).toBe(0);
	});
});
