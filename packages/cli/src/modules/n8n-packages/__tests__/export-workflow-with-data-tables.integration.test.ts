import type { Project, User } from '@n8n/db';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackagesService } from '../n8n-packages.service';
import { readExport } from './utils/tar-support';
import { buildWorkflowReferencingDataTables } from './utils/test-builders';

let service: N8nPackagesService;
let dataTableService: DataTableService;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'data-table']);
	await testDb.init();
	mockDataTableSizeValidator();
	service = Container.get(N8nPackagesService);
	dataTableService = Container.get(DataTableService);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('workflow package export — with data tables', () => {
	// Most cases share one owner and one team project the owner administers;
	// access-control cases that need a different actor/relation build their own.
	let owner: User;
	let project: Project;

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowEntity',
			'SharedWorkflow',
			'DataTable',
			'DataTableColumn',
			'ProjectRelation',
			'Project',
		]);

		owner = await createOwner();
		project = await createTeamProject('Project A', owner);
	});

	describe('schema serialization', () => {
		it('bundles a referenced table schema and lists it in requirements.dataTables', async () => {
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Workflow with table',
				project,
				references: [{ dataTableId: dataTable.id }],
			});

			const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const { manifest, entries } = await readExport(stream);

			expect(manifest.requirements).toEqual({
				dataTables: [
					{
						id: dataTable.id,
						name: 'Customers',
						sourceProjectId: project.id,
						usedByWorkflows: [workflow.id],
					},
				],
			});

			const dataTableFile = entries.find((e) => e.name === 'data-tables/customers/data-table.json');
			expect(dataTableFile).toBeDefined();
			const parsed = jsonParse<Record<string, unknown>>(dataTableFile!.content.toString());
			expect(parsed).toEqual({
				id: dataTable.id,
				name: 'Customers',
				columns: [{ name: 'email', type: 'string', index: 0 }],
			});
		});

		it('lists every column with its type for a table with all column types', async () => {
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'Everything',
				columns: [
					{ name: 'aString', type: 'string' },
					{ name: 'aNumber', type: 'number' },
					{ name: 'aBoolean', type: 'boolean' },
					{ name: 'aDate', type: 'date' },
				],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Workflow with all types',
				project,
				references: [{ dataTableId: dataTable.id }],
			});

			const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const { entries } = await readExport(stream);

			const dataTableFile = entries.find(
				(e) => e.name === 'data-tables/everything/data-table.json',
			);
			const parsed = jsonParse<{ columns: Array<{ name: string; type: string }> }>(
				dataTableFile!.content.toString(),
			);
			expect(parsed.columns).toEqual([
				{ name: 'aString', type: 'string', index: 0 },
				{ name: 'aNumber', type: 'number', index: 1 },
				{ name: 'aBoolean', type: 'boolean', index: 2 },
				{ name: 'aDate', type: 'date', index: 3 },
			]);
		});

		it('exports only the schema, never row data, for a table that contains rows', async () => {
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'WithRows',
				columns: [{ name: 'email', type: 'string' }],
			});
			await dataTableService.insertRows(dataTable.id, project.id, [
				{ email: 'secret-user@example.com' },
			]);
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Workflow with rows',
				project,
				references: [{ dataTableId: dataTable.id }],
			});

			const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const { entries } = await readExport(stream);

			const dataTableFile = entries.find((e) => e.name === 'data-tables/withrows/data-table.json');
			const raw = dataTableFile!.content.toString();
			expect(raw).not.toContain('secret-user@example.com');
			expect(jsonParse<Record<string, unknown>>(raw)).toEqual({
				id: dataTable.id,
				name: 'WithRows',
				columns: [{ name: 'email', type: 'string', index: 0 }],
			});
			expect(entries.filter((e) => e.name.endsWith('/data-table.json'))).toHaveLength(1);
		});
	});

	describe('reference resolution', () => {
		it('bundles a table referenced through a mode "list" resourceLocator', async () => {
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Workflow with list-mode table',
				project,
				references: [{ dataTableId: dataTable.id, mode: 'list' }],
			});

			const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const { manifest, entries } = await readExport(stream);

			expect(manifest.requirements?.dataTables).toEqual([
				{
					id: dataTable.id,
					name: 'Customers',
					sourceProjectId: project.id,
					usedByWorkflows: [workflow.id],
				},
			]);
			expect(entries.map((e) => e.name)).toContain('data-tables/customers/data-table.json');
		});

		it('dedupes a table referenced by two workflows in a single export', async () => {
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'Shared table',
				columns: [{ name: 'email', type: 'string' }],
			});
			const wfA = await buildWorkflowReferencingDataTables({
				name: 'Workflow A',
				project,
				references: [{ dataTableId: dataTable.id }],
			});
			const wfB = await buildWorkflowReferencingDataTables({
				name: 'Workflow B',
				project,
				references: [{ dataTableId: dataTable.id }],
			});

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [wfA.id, wfB.id],
			});
			const { manifest, entries } = await readExport(stream);

			expect(manifest.requirements?.dataTables).toHaveLength(1);
			expect(manifest.requirements!.dataTables![0].usedByWorkflows.sort()).toEqual(
				[wfA.id, wfB.id].sort(),
			);
			expect(entries.filter((e) => e.name.endsWith('/data-table.json'))).toHaveLength(1);
		});

		it('bundles both tables when one workflow references two via different modes', async () => {
			const tableById = await dataTableService.createDataTable(project.id, {
				name: 'ById',
				columns: [{ name: 'email', type: 'string' }],
			});
			const tableByList = await dataTableService.createDataTable(project.id, {
				name: 'ByList',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Workflow with two tables',
				project,
				references: [
					{ dataTableId: tableById.id, mode: 'id' },
					{ dataTableId: tableByList.id, mode: 'list' },
				],
			});

			const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const { manifest, entries } = await readExport(stream);

			expect(manifest.requirements?.dataTables?.map((d) => d.id).sort()).toEqual(
				[tableById.id, tableByList.id].sort(),
			);
			expect(entries.filter((e) => e.name.endsWith('/data-table.json'))).toHaveLength(2);
		});
	});

	describe('package layout & namespacing', () => {
		it('disambiguates same-named tables from two different projects with a suffix, instead of failing', async () => {
			const projectB = await createTeamProject('Project B', owner);
			const tableA = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const tableB = await dataTableService.createDataTable(projectB.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const wfA = await buildWorkflowReferencingDataTables({
				name: 'Workflow A',
				project,
				references: [{ dataTableId: tableA.id }],
			});
			const wfB = await buildWorkflowReferencingDataTables({
				name: 'Workflow B',
				project: projectB,
				references: [{ dataTableId: tableB.id }],
			});

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [wfA.id, wfB.id],
			});
			const { manifest, entries } = await readExport(stream);

			expect(manifest.requirements?.dataTables).toHaveLength(2);
			const dataTableFiles = entries.filter((e) => e.name.endsWith('/data-table.json'));
			expect(dataTableFiles.map((e) => e.name).sort()).toEqual([
				'data-tables/customers-2/data-table.json',
				'data-tables/customers/data-table.json',
			]);
		});

		it('namespaces the table under its project path when exporting the whole project', async () => {
			const salesProject = await createTeamProject('Sales', owner);
			const dataTable = await dataTableService.createDataTable(salesProject.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Customer sync',
				project: salesProject,
				references: [{ dataTableId: dataTable.id }],
			});

			const stream = await service.exportPackage({ user: owner, projectIds: [salesProject.id] });
			const { manifest, entries } = await readExport(stream);

			const projectTarget = manifest.projects![0].target;
			expect(manifest.requirements?.dataTables).toEqual([
				{
					id: dataTable.id,
					name: 'Customers',
					sourceProjectId: salesProject.id,
					usedByWorkflows: [workflow.id],
				},
			]);
			expect(entries.map((e) => e.name)).toContain(
				`${projectTarget}/data-tables/customers/data-table.json`,
			);
		});

		it('keeps the table at the top-level data-tables path (not under the folder) when exporting a folder', async () => {
			const folder = await createFolder(project, { name: 'to_production' });
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Customer sync',
				project,
				references: [{ dataTableId: dataTable.id }],
				parentFolder: folder,
			});

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [],
				folderIds: [folder.id],
			});
			const { manifest, entries } = await readExport(stream);

			expect(manifest.requirements?.dataTables).toEqual([
				{
					id: dataTable.id,
					name: 'Customers',
					sourceProjectId: project.id,
					usedByWorkflows: [workflow.id],
				},
			]);
			// Folder packages keep data tables top-level, unlike project packages.
			const dataTableFile = entries.find((e) => e.name.endsWith('/data-table.json'));
			expect(dataTableFile!.name).toBe('data-tables/customers/data-table.json');
		});
	});

	describe('access control', () => {
		it('bundles a table when the caller has access only through the global scope', async () => {
			// The team project is created without linking the owner, so the owner
			// holds no project relation to it — access can only come from the
			// instance-wide global scope path, not the project-role path.
			const admin = await createMember();
			const foreignProject = await createTeamProject('Foreign', admin);
			const dataTable = await dataTableService.createDataTable(foreignProject.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Workflow with foreign table',
				project: foreignProject,
				references: [{ dataTableId: dataTable.id }],
			});

			const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const { manifest } = await readExport(stream);

			expect(manifest.requirements?.dataTables).toEqual([
				{
					id: dataTable.id,
					name: 'Customers',
					sourceProjectId: foreignProject.id,
					usedByWorkflows: [workflow.id],
				},
			]);
		});

		it('allows export with a project-viewer role, without needing dataTable:readRow directly', async () => {
			const viewer = await createMember();
			await linkUserToProject(viewer, project, 'project:viewer');

			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Workflow with table',
				project,
				references: [{ dataTableId: dataTable.id }],
			});

			const stream = await service.exportPackage({ user: viewer, workflowIds: [workflow.id] });
			const { manifest } = await readExport(stream);

			expect(manifest.requirements?.dataTables).toEqual([
				{
					id: dataTable.id,
					name: 'Customers',
					sourceProjectId: project.id,
					usedByWorkflows: [workflow.id],
				},
			]);
		});

		it("allows export of a table living in the caller's personal project", async () => {
			const member = await createMember();
			const personalProject = await getPersonalProject(member);
			const dataTable = await dataTableService.createDataTable(personalProject.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Personal workflow',
				project: personalProject,
				references: [{ dataTableId: dataTable.id }],
			});

			const stream = await service.exportPackage({ user: member, workflowIds: [workflow.id] });
			const { manifest } = await readExport(stream);

			expect(manifest.requirements?.dataTables).toEqual([
				{
					id: dataTable.id,
					name: 'Customers',
					sourceProjectId: personalProject.id,
					usedByWorkflows: [workflow.id],
				},
			]);
		});

		it('blocks the export when the caller can read the workflow but not the table', async () => {
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'Private table',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Shared workflow with private table',
				project,
				references: [{ dataTableId: dataTable.id }],
			});

			const sharee = await createMember();
			await shareWorkflowWithUsers(workflow, [sharee]);

			// The sharee can reach the workflow via the direct share, but has no
			// project relation to the table's home project, so `dataTable:read`
			// fails — unlike credentials, this must abort the whole export.
			await expect(
				service.exportPackage({ user: sharee, workflowIds: [workflow.id] }),
			).rejects.toThrow(/data table\(s\) not found or not accessible/i);
		});

		it('blocks the export when at least one of several referenced tables is inaccessible', async () => {
			// A member who administers only their own project references one table
			// there (accessible) and one in a project they cannot see (inaccessible).
			const member = await createMember();
			const memberProject = await createTeamProject('Member project', member);
			const accessibleTable = await dataTableService.createDataTable(memberProject.id, {
				name: 'Accessible',
				columns: [{ name: 'email', type: 'string' }],
			});
			const forbiddenTable = await dataTableService.createDataTable(project.id, {
				name: 'Forbidden',
				columns: [{ name: 'email', type: 'string' }],
			});

			const accessibleWf = await buildWorkflowReferencingDataTables({
				name: 'Accessible workflow',
				project: memberProject,
				references: [{ dataTableId: accessibleTable.id }],
			});
			const forbiddenWf = await buildWorkflowReferencingDataTables({
				name: 'Forbidden workflow',
				project,
				references: [{ dataTableId: forbiddenTable.id }],
			});
			// Both workflows are reachable by the member (own project + direct share),
			// but the second table's project is not — the whole export must abort.
			await shareWorkflowWithUsers(forbiddenWf, [member]);

			await expect(
				service.exportPackage({
					user: member,
					workflowIds: [accessibleWf.id, forbiddenWf.id],
				}),
			).rejects.toThrow(/data table\(s\) not found or not accessible/i);
		});
	});

	describe('telemetry', () => {
		it('counts bundled data tables on a successful export', async () => {
			const dataTable = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Workflow with table',
				project,
				references: [{ dataTableId: dataTable.id }],
			});

			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			try {
				await service.exportPackage({ user: owner, workflowIds: [workflow.id] });

				const exportedEvents = emitSpy.mock.calls.filter(
					([name]) => name === 'n8n-package-exported',
				);
				expect(exportedEvents).toHaveLength(1);

				const payload = exportedEvents[0][1] as RelayEventMap['n8n-package-exported'];
				expect(payload.counts.dataTables).toBe(1);
			} finally {
				emitSpy.mockRestore();
			}
		});
	});
});
