import { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { FolderRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, INodeParameterResourceLocator, Workflow } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { createFolder } from '@test-integration/db/folders';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportPackageRequest } from '../n8n-packages.types';
import type { PackageDataTableRequirement } from '../spec/requirements.schema';
import type { SerializedDataTable } from '../spec/serialized/data-table.schema';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';
import {
	buildEntityPackageBuffer,
	dataTableRequirement,
	serializedDataTable,
	serializedWorkflowWithDataTable,
} from './fixtures/package-fixtures';
import { buildWorkflowReferencingDataTables } from './utils/test-builders';
import { streamToBuffer } from './utils/tar-support';

let service: N8nPackagesService;
let dataTableService: DataTableService;
let dataTableRepository: DataTableRepository;
let workflowRepository: WorkflowRepository;

const licenseMocker = new LicenseMocker();

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'data-table']);
	await testDb.init();
	// Register node types so the plan-phase missing-node-type check can resolve
	// the node types used by the package fixtures.
	await initNodeTypes();
	mockDataTableSizeValidator();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	service = Container.get(N8nPackagesService);
	dataTableService = Container.get(DataTableService);
	dataTableRepository = Container.get(DataTableRepository);
	workflowRepository = Container.get(WorkflowRepository);
});

afterAll(async () => {
	await testDb.terminate();
});

type ImportParams = { user: User; projectId: string; packageBuffer: Buffer } & Partial<
	Omit<ImportPackageRequest, 'user' | 'projectId' | 'packageBuffer'>
>;

async function importPackage(params: ImportParams) {
	return await service.importPackage({
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: 'fail',
		workflowPublishingPolicy: 'preserve-published-state',
		workflowIdPolicy: 'new',
		missingNodeTypeMode: 'fail',
		folderConflictPolicy: 'merge',
		dataTableMatchingMode: 'by-id',
		dataTableMissingMode: 'create',
		dataTableSchemaConflictPolicy: 'keep-existing',
		variableMissingMode: 'do-nothing',
		...params,
	});
}

/** A package holding `tables` plus one workflow per table referencing it. */
async function buildDataTablePackage(
	tables: SerializedDataTable[],
	options: {
		workflows?: SerializedWorkflow[];
		requirements?: PackageDataTableRequirement[];
	} = {},
): Promise<{ packageBuffer: Buffer; workflows: SerializedWorkflow[] }> {
	const workflows =
		options.workflows ??
		tables.map((table, index) =>
			serializedWorkflowWithDataTable({
				id: `wf-${index}`,
				name: `Workflow ${index}`,
				dataTableId: table.id,
			}),
		);
	const requirements =
		options.requirements ??
		tables.map((table) =>
			dataTableRequirement(
				table,
				workflows.map(({ id }) => id),
			),
		);

	const packageBuffer = await buildEntityPackageBuffer({
		workflows: workflows.map((workflow, index) => ({
			target: `workflows/wf-${index}`,
			workflow,
		})),
		dataTables: tables.map((dataTable, index) => ({
			target: `data-tables/dt-${index}`,
			dataTable,
		})),
		manifestExtras: { requirements: { dataTables: requirements } },
	});

	return { packageBuffer, workflows };
}

async function tablesInProject(projectId: string) {
	return await dataTableRepository.find({
		where: { projectId },
		relations: { columns: true },
	});
}

describe('workflow package import — with data tables', () => {
	let owner: User;
	let project: Project;

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowEntity',
			'SharedWorkflow',
			'DataTable',
			'DataTableColumn',
			'Folder',
			'ProjectRelation',
			'Project',
		]);

		owner = await createOwner();
		project = await createTeamProject('Target Project', owner);
	});

	describe('creating missing tables', () => {
		it('creates an absent table with the package (source) id, columns, and remappable reference', async () => {
			const table = serializedDataTable();
			const { packageBuffer } = await buildDataTablePackage([table]);

			const result = await importPackage({ user: owner, projectId: project.id, packageBuffer });

			const tables = await tablesInProject(project.id);
			expect(tables).toHaveLength(1);
			expect(tables[0].id).toBe(table.id);
			expect(tables[0].name).toBe(table.name);
			expect(
				[...tables[0].columns]
					.sort((a, b) => a.index - b.index)
					.map(({ name, type, index }) => ({ name, type, index })),
			).toEqual(table.columns);

			const imported = await workflowRepository.findOneOrFail({
				where: { id: result.workflows[0].localId },
			});
			expect(imported.nodes[0].parameters.dataTableId).toMatchObject({ value: table.id });

			const { count: rowCount } = await dataTableService.getManyRowsAndCount(
				table.id,
				project.id,
				{},
			);
			expect(rowCount).toBe(0);
		});

		it('handles a package mixing matched and created tables', async () => {
			const existing = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'signed_up_at', type: 'date' },
				],
			});
			const matchedTable = serializedDataTable({ id: existing.id });
			const createdTable = serializedDataTable({ id: 'freshtable1', name: 'Orders' });
			const { packageBuffer } = await buildDataTablePackage([matchedTable, createdTable]);

			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');
			try {
				await importPackage({ user: owner, projectId: project.id, packageBuffer });

				const tables = await tablesInProject(project.id);
				expect(tables.map(({ id }) => id).sort()).toEqual([existing.id, 'freshtable1'].sort());
				expect(tables.find(({ id }) => id === 'freshtable1')?.name).toBe('Orders');

				const importedEvents = emitSpy.mock.calls.filter(
					([name]) => name === 'n8n-package-imported',
				);
				expect(importedEvents).toHaveLength(1);
				const { options, counts } = importedEvents[0][1] as RelayEventMap['n8n-package-imported'];
				expect(options.dataTableMatchingMode).toBe('by-id');
				expect(options.dataTableMissingMode).toBe('create');
				expect(options.dataTableSchemaConflictPolicy).toBe('keep-existing');
				expect(counts.dataTables).toEqual({ matched: 1, created: 1, requirements: 2 });
			} finally {
				emitSpy.mockRestore();
			}
		});

		it('round-trips a real export: table lands in another project with the same id and schema', async () => {
			const sourceProject = await createTeamProject('Source Project', owner);
			const sourceTable = await dataTableService.createDataTable(sourceProject.id, {
				name: 'Round Trip',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'age', type: 'number' },
				],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Round trip workflow',
				project: sourceProject,
				references: [{ dataTableId: sourceTable.id }],
			});

			const stream = await service.exportPackage({ user: owner, workflowIds: [workflow.id] });
			const packageBuffer = await streamToBuffer(stream);

			// Simulate importing on another instance: ids are global, so the source
			// table must be gone for the create-with-source-id path to be free.
			await workflowRepository.delete({ id: workflow.id });
			await dataTableService.deleteDataTable(sourceTable.id, sourceProject.id);

			const result = await importPackage({ user: owner, projectId: project.id, packageBuffer });

			const tables = await tablesInProject(project.id);
			expect(tables).toHaveLength(1);
			expect(tables[0].id).toBe(sourceTable.id);
			expect(tables[0].name).toBe('Round Trip');
			expect(
				[...tables[0].columns]
					.sort((a, b) => a.index - b.index)
					.map(({ name, type }) => ({ name, type })),
			).toEqual([
				{ name: 'email', type: 'string' },
				{ name: 'age', type: 'number' },
			]);
			expect(result.workflows).toHaveLength(1);
		});

		it('re-imports idempotently: the created table is matched, not duplicated', async () => {
			const table = serializedDataTable();
			const { packageBuffer } = await buildDataTablePackage([table]);

			await importPackage({
				user: owner,
				projectId: project.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});
			await importPackage({
				user: owner,
				projectId: project.id,
				packageBuffer,
				workflowConflictPolicy: 'new-version',
			});

			expect(await tablesInProject(project.id)).toHaveLength(1);
		});
	});

	describe('matching by id', () => {
		it('uses a matched identical-schema table as-is', async () => {
			const existing = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'signed_up_at', type: 'date' },
				],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: existing.id }),
			]);

			await importPackage({ user: owner, projectId: project.id, packageBuffer });

			const tables = await tablesInProject(project.id);
			expect(tables).toHaveLength(1);
			expect(tables[0].id).toBe(existing.id);
			expect(tables[0].columns).toHaveLength(2);
		});

		it('accepts a matched table with extra columns and leaves them untouched', async () => {
			const existing = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'signed_up_at', type: 'date' },
					{ name: 'extra', type: 'boolean' },
				],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: existing.id }),
			]);

			await importPackage({ user: owner, projectId: project.id, packageBuffer });

			const tables = await tablesInProject(project.id);
			expect(tables).toHaveLength(1);
			expect(tables[0].columns).toHaveLength(3);
		});

		it('accepts an identical matched table under the strict fail conflict policy', async () => {
			const existing = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'signed_up_at', type: 'date' },
				],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: existing.id }),
			]);

			await importPackage({
				user: owner,
				projectId: project.id,
				packageBuffer,
				dataTableSchemaConflictPolicy: 'fail',
			});

			expect(await tablesInProject(project.id)).toHaveLength(1);
		});

		it('matches a renamed target table by id and does not rename it back', async () => {
			const existing = await dataTableService.createDataTable(project.id, {
				name: 'Renamed On Target',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'signed_up_at', type: 'date' },
				],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: existing.id, name: 'Customers' }),
			]);

			await importPackage({ user: owner, projectId: project.id, packageBuffer });

			const tables = await tablesInProject(project.id);
			expect(tables).toHaveLength(1);
			expect(tables[0].name).toBe('Renamed On Target');
		});
	});

	describe('blocked imports write nothing', () => {
		async function expectBlocked(promise: Promise<unknown>, issue: Record<string, unknown>) {
			await expect(promise).rejects.toMatchObject({
				message: expect.stringContaining('Import blocked'),
				meta: { issues: [expect.objectContaining(issue)] },
			});
		}

		it('blocks when a matched table is missing a package column', async () => {
			const existing = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: existing.id }),
			]);

			await expectBlocked(importPackage({ user: owner, projectId: project.id, packageBuffer }), {
				type: 'data-table-unresolved',
				kind: 'schema-incompatible',
				sourceId: existing.id,
				missingColumns: ['signed_up_at'],
				typeMismatches: [],
				usedByWorkflows: ['wf-0'],
			});

			expect(await workflowRepository.count()).toBe(0);
		});

		it('blocks a matched table with extra columns under the strict fail conflict policy', async () => {
			const existing = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'string' },
					{ name: 'signed_up_at', type: 'date' },
					{ name: 'extra', type: 'boolean' },
				],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: existing.id }),
			]);

			await expectBlocked(
				importPackage({
					user: owner,
					projectId: project.id,
					packageBuffer,
					dataTableSchemaConflictPolicy: 'fail',
				}),
				{
					type: 'data-table-unresolved',
					kind: 'schema-incompatible',
					sourceId: existing.id,
					missingColumns: [],
					typeMismatches: [],
					extraColumns: ['extra'],
				},
			);

			expect(await workflowRepository.count()).toBe(0);
		});

		it('blocks when a matched table has a column with a different type, even under do-nothing', async () => {
			const existing = await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'number' },
					{ name: 'signed_up_at', type: 'date' },
				],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: existing.id }),
			]);

			await expectBlocked(
				importPackage({
					user: owner,
					projectId: project.id,
					packageBuffer,
					dataTableMissingMode: 'do-nothing',
				}),
				{
					type: 'data-table-unresolved',
					kind: 'schema-incompatible',
					missingColumns: [],
					typeMismatches: [{ column: 'email', expectedType: 'string', actualType: 'number' }],
				},
			);

			expect(await workflowRepository.count()).toBe(0);
		});

		it('blocks creation when the package table id belongs to a table in another project', async () => {
			const otherProject = await createTeamProject('Other Project', owner);
			const conflicting = await dataTableService.createDataTable(otherProject.id, {
				name: 'Elsewhere',
				columns: [{ name: 'email', type: 'string' }],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: conflicting.id }),
			]);

			await expectBlocked(importPackage({ user: owner, projectId: project.id, packageBuffer }), {
				type: 'data-table-unresolved',
				kind: 'id-conflict',
				sourceId: conflicting.id,
				existingProjectId: otherProject.id,
			});

			expect(await workflowRepository.count()).toBe(0);
			expect(await tablesInProject(project.id)).toHaveLength(0);
		});

		it('blocks creation when the package table name is already used in the target project', async () => {
			await dataTableService.createDataTable(project.id, {
				name: 'Customers',
				columns: [{ name: 'email', type: 'string' }],
			});
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: 'differentid1' }),
			]);

			await expectBlocked(importPackage({ user: owner, projectId: project.id, packageBuffer }), {
				type: 'data-table-unresolved',
				kind: 'name-conflict',
				sourceId: 'differentid1',
				name: 'Customers',
			});

			expect(await workflowRepository.count()).toBe(0);
			expect(await tablesInProject(project.id)).toHaveLength(1);
		});

		it('blocks when two package tables would be created with the same name', async () => {
			const { packageBuffer } = await buildDataTablePackage([
				serializedDataTable({ id: 'sourcetbla1' }),
				serializedDataTable({ id: 'sourcetblb2' }),
			]);

			await expect(
				importPackage({ user: owner, projectId: project.id, packageBuffer }),
			).rejects.toMatchObject({
				message: expect.stringContaining('Import blocked'),
				meta: {
					issues: [
						expect.objectContaining({ kind: 'name-conflict', sourceId: 'sourcetbla1' }),
						expect.objectContaining({ kind: 'name-conflict', sourceId: 'sourcetblb2' }),
					],
				},
			});

			expect(await tablesInProject(project.id)).toHaveLength(0);
		});

		it('blocks an absent table under must-preexist', async () => {
			const table = serializedDataTable();
			const { packageBuffer } = await buildDataTablePackage([table]);

			await expectBlocked(
				importPackage({
					user: owner,
					projectId: project.id,
					packageBuffer,
					dataTableMissingMode: 'must-preexist',
				}),
				{
					type: 'data-table-unresolved',
					kind: 'missing',
					sourceId: table.id,
					name: table.name,
					usedByWorkflows: ['wf-0'],
				},
			);

			expect(await workflowRepository.count()).toBe(0);
			expect(await tablesInProject(project.id)).toHaveLength(0);
		});

		it('blocks when the package requires data tables and the module is disabled', async () => {
			const { packageBuffer } = await buildDataTablePackage([serializedDataTable()]);
			const isActive = vi
				.spyOn(Container.get(ModuleRegistry), 'isActive')
				.mockImplementation((moduleName) => moduleName !== 'data-table');

			try {
				await expectBlocked(importPackage({ user: owner, projectId: project.id, packageBuffer }), {
					type: 'data-table-unresolved',
					kind: 'module-disabled',
				});
			} finally {
				isActive.mockRestore();
			}

			expect(await workflowRepository.count()).toBe(0);
		});
	});

	describe('do-nothing missing mode', () => {
		it('imports the workflows without creating absent tables', async () => {
			const table = serializedDataTable();
			const { packageBuffer } = await buildDataTablePackage([table]);

			const result = await importPackage({
				user: owner,
				projectId: project.id,
				packageBuffer,
				dataTableMissingMode: 'do-nothing',
			});

			expect(result.workflows).toHaveLength(1);
			expect(await tablesInProject(project.id)).toHaveLength(0);
		});

		it("imported workflow's data table reference fails fast with a node error", async () => {
			const table = serializedDataTable();
			const { packageBuffer } = await buildDataTablePackage([table]);

			const result = await importPackage({
				user: owner,
				projectId: project.id,
				packageBuffer,
				dataTableMissingMode: 'do-nothing',
			});

			const imported = await workflowRepository.findOneOrFail({
				where: { id: result.workflows[0].localId },
			});
			const reference = imported.nodes[0].parameters.dataTableId as INodeParameterResourceLocator;
			expect(reference.value).toBe(table.id);

			const promise = Container.get(DataTableProxyService).getDataTableProxy(
				mock<Workflow>({ id: imported.id }),
				mock<INode>({ type: 'n8n-nodes-base.dataTable' }),
				reference.value as string,
				project.id,
			);

			await expect(promise).rejects.toBeInstanceOf(NodeOperationError);
			await expect(promise).rejects.toThrow(table.id);
		});
	});

	describe('malformed packages', () => {
		it('rejects a package whose manifest references a missing data table file', async () => {
			const table = serializedDataTable();
			const workflow = serializedWorkflowWithDataTable({
				id: 'wf-0',
				name: 'Workflow 0',
				dataTableId: table.id,
			});
			const packageBuffer = await buildEntityPackageBuffer({
				workflows: [{ target: 'workflows/wf-0', workflow }],
				manifestExtras: {
					dataTables: [{ id: table.id, name: table.name, target: 'data-tables/dt-0' }],
					requirements: { dataTables: [dataTableRequirement(table, ['wf-0'])] },
				},
			});

			await expect(
				importPackage({ user: owner, projectId: project.id, packageBuffer }),
			).rejects.toThrowError(/missing data table file/);
		});

		it('rejects a package whose requirements reference a table without a bundled schema', async () => {
			const table = serializedDataTable();
			const workflow = serializedWorkflowWithDataTable({
				id: 'wf-0',
				name: 'Workflow 0',
				dataTableId: table.id,
			});
			const packageBuffer = await buildEntityPackageBuffer({
				workflows: [{ target: 'workflows/wf-0', workflow }],
				manifestExtras: {
					requirements: { dataTables: [dataTableRequirement(table, ['wf-0'])] },
				},
			});

			await expect(
				importPackage({ user: owner, projectId: project.id, packageBuffer }),
			).rejects.toThrowError(/missing the data table schema/);
		});

		it('rejects a package whose manifest data table id disagrees with its data-table.json', async () => {
			const table = serializedDataTable({ id: 'realid1' });
			const packageBuffer = await buildEntityPackageBuffer({
				dataTables: [{ target: 'data-tables/dt-0', dataTable: table }],
				// Manifest points the same target at a different id than data-table.json declares.
				manifestExtras: {
					dataTables: [{ id: 'manifestid1', name: table.name, target: 'data-tables/dt-0' }],
				},
			});

			await expect(
				importPackage({ user: owner, projectId: project.id, packageBuffer }),
			).rejects.toThrow(/declares id "realid1" but the manifest lists it as "manifestid1"/);
		});

		it('rejects a table with a reserved column name before any writes', async () => {
			const table = serializedDataTable({
				columns: [{ name: 'id', type: 'string', index: 0 }],
			});
			const { packageBuffer } = await buildDataTablePackage([table]);

			await expect(
				importPackage({ user: owner, projectId: project.id, packageBuffer }),
			).rejects.toThrowError(/failed schema validation/);

			expect(await tablesInProject(project.id)).toHaveLength(0);
			expect(await workflowRepository.count()).toBe(0);
		});
	});

	describe('public API key scopes', () => {
		it('rejects a table-creating import when the API key lacks the dataTable:create scope', async () => {
			const { packageBuffer } = await buildDataTablePackage([serializedDataTable()]);

			await expect(
				importPackage({
					user: owner,
					projectId: project.id,
					packageBuffer,
					apiKeyScopes: ['workflow:import'],
				}),
			).rejects.toBeInstanceOf(ForbiddenError);
		});

		it('accepts a table-creating import when the API key holds the dataTable:create scope', async () => {
			const { packageBuffer } = await buildDataTablePackage([serializedDataTable()]);

			await importPackage({
				user: owner,
				projectId: project.id,
				packageBuffer,
				apiKeyScopes: ['workflow:import', 'dataTable:create'],
			});

			expect(await tablesInProject(project.id)).toHaveLength(1);
		});
	});

	describe('folder packages', () => {
		beforeEach(() => {
			licenseMocker.enable('feat:folders');
		});

		/** Exports a folder holding one table-referencing workflow, then deletes the
		 * source artifacts so their globally unique ids are free for the import. */
		async function exportFolderPackage() {
			const sourceProject = await createTeamProject('Folder Source', owner);
			const folder = await createFolder(sourceProject, { name: 'to_production' });
			const table = await dataTableService.createDataTable(sourceProject.id, {
				name: 'Folder Trip',
				columns: [{ name: 'email', type: 'string' }],
			});
			const workflow = await buildWorkflowReferencingDataTables({
				name: 'Folder trip workflow',
				project: sourceProject,
				references: [{ dataTableId: table.id }],
				parentFolder: folder,
			});

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [],
				folderIds: [folder.id],
			});
			const packageBuffer = await streamToBuffer(stream);

			await workflowRepository.delete({ id: workflow.id });
			await dataTableService.deleteDataTable(table.id, sourceProject.id);
			await Container.get(FolderRepository).delete({ id: folder.id });

			return { packageBuffer, folderId: folder.id, tableId: table.id };
		}

		it('round-trips a folder export: folder, workflow, and table land together', async () => {
			const { packageBuffer, folderId, tableId } = await exportFolderPackage();

			const result = await importPackage({ user: owner, projectId: project.id, packageBuffer });

			expect(result.folders).toHaveLength(1);
			const importedFolder = await Container.get(FolderRepository).findOne({
				where: { id: folderId },
				relations: { homeProject: true },
			});
			expect(importedFolder?.homeProject.id).toBe(project.id);

			const importedWorkflow = await workflowRepository.findOne({
				where: { name: 'Folder trip workflow' },
				relations: { parentFolder: true },
			});
			expect(importedWorkflow?.parentFolder?.id).toBe(folderId);

			const tables = await tablesInProject(project.id);
			expect(tables).toHaveLength(1);
			expect(tables[0].id).toBe(tableId);
			expect(tables[0].columns.map(({ name, type }) => ({ name, type }))).toEqual([
				{ name: 'email', type: 'string' },
			]);
		});

		it('blocks the whole folder package when a data table cannot be created', async () => {
			const { packageBuffer, folderId } = await exportFolderPackage();
			await dataTableService.createDataTable(project.id, {
				name: 'Folder Trip',
				columns: [{ name: 'email', type: 'string' }],
			});

			await expect(
				importPackage({ user: owner, projectId: project.id, packageBuffer }),
			).rejects.toMatchObject({
				message: expect.stringContaining('Import blocked'),
				meta: {
					issues: [
						expect.objectContaining({ type: 'data-table-unresolved', kind: 'name-conflict' }),
					],
				},
			});

			expect(await Container.get(FolderRepository).findOneBy({ id: folderId })).toBeNull();
			expect(await workflowRepository.count()).toBe(0);
			expect(await tablesInProject(project.id)).toHaveLength(1);
		});
	});
});
