import type { User } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableService } from '@/modules/data-table/data-table.service';

import { CapturingWriter } from '../../../io/__tests__/utils/capturing-writer';
import { DataTableExporter } from '../data-table.exporter';
import { DataTableSerializer } from '../data-table.serializer';
import type { WorkflowDataTableRequirement } from '../data-table.types';

const user = mock<User>({ id: 'user-1' });

function makeDataTable(overrides: Partial<DataTable> = {}): DataTable {
	return {
		id: 'dt-1',
		name: 'Customers',
		projectId: 'proj-1',
		columns: [{ id: 'col-1', name: 'email', type: 'string', index: 0 }],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as unknown as DataTable;
}

function makeRequirement(
	overrides: Partial<WorkflowDataTableRequirement> = {},
): WorkflowDataTableRequirement {
	return {
		workflowId: 'wf-1',
		dataTableId: 'dt-1',
		...overrides,
	};
}

function makeExporter() {
	const dataTableService = mock<DataTableService>();
	const exporter = new DataTableExporter(dataTableService, new DataTableSerializer());
	return { exporter, dataTableService };
}

describe('DataTableExporter', () => {
	describe('empty input', () => {
		it('returns empty result and writes nothing when given no requirements', async () => {
			const { exporter, dataTableService } = makeExporter();
			const writer = new CapturingWriter();

			const result = await exporter.export({ user, requirements: [], writer });

			expect(result).toEqual({ entries: [], requirements: [] });
			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
			expect(dataTableService.findDataTablesByIdsForUser).not.toHaveBeenCalled();
		});
	});

	describe('happy path', () => {
		it('writes one accessible table to its slugged folder and emits matching entry + requirement', async () => {
			const { exporter, dataTableService } = makeExporter();
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([makeDataTable()]);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [makeRequirement()],
				writer,
			});

			expect(dataTableService.findDataTablesByIdsForUser).toHaveBeenCalledWith(['dt-1'], user, [
				'dataTable:read',
			]);

			expect(result.entries).toEqual([
				{ id: 'dt-1', name: 'Customers', target: 'data-tables/customers' },
			]);
			expect(result.requirements).toEqual([
				{
					id: 'dt-1',
					name: 'Customers',
					sourceProjectId: 'proj-1',
					usedByWorkflows: ['wf-1'],
				},
			]);

			expect(writer.directories).toEqual(['data-tables/customers']);
			expect(writer.files).toHaveLength(1);
			expect(writer.files[0].path).toBe('data-tables/customers/data-table.json');

			const parsed = jsonParse<Record<string, unknown>>(writer.files[0].content);
			expect(parsed).toEqual({
				id: 'dt-1',
				name: 'Customers',
				columns: [{ name: 'email', type: 'string', index: 0 }],
			});
		});

		it('dedupes by table id and aggregates usedByWorkflows when requirements come from multiple workflows', async () => {
			const { exporter, dataTableService } = makeExporter();
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([makeDataTable()]);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [
					makeRequirement({ workflowId: 'wf-a' }),
					makeRequirement({ workflowId: 'wf-b' }),
				],
				writer,
			});

			expect(dataTableService.findDataTablesByIdsForUser).toHaveBeenCalledWith(['dt-1'], user, [
				'dataTable:read',
			]);
			expect(result.entries).toEqual([
				{ id: 'dt-1', name: 'Customers', target: 'data-tables/customers' },
			]);
			expect(result.requirements).toEqual([
				{
					id: 'dt-1',
					name: 'Customers',
					sourceProjectId: 'proj-1',
					usedByWorkflows: ['wf-a', 'wf-b'],
				},
			]);
			expect(writer.files).toHaveLength(1);
		});

		it('disambiguates targets when two tables share a name', async () => {
			const { exporter, dataTableService } = makeExporter();
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([
				makeDataTable({ id: 'dt-a', name: 'Same Name' }),
				makeDataTable({ id: 'dt-b', name: 'Same Name' }),
			]);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [
					makeRequirement({ dataTableId: 'dt-a' }),
					makeRequirement({ dataTableId: 'dt-b' }),
				],
				writer,
			});

			const targets = result.entries.map((e) => e.target);
			expect(targets).toEqual(['data-tables/same-name', 'data-tables/same-name-2']);

			const writtenPaths = writer.files.map((f) => f.path);
			expect(writtenPaths).toContain('data-tables/same-name/data-table.json');
			expect(writtenPaths).toContain('data-tables/same-name-2/data-table.json');
		});

		it('namespaces a table under its owner project when that project is part of the export', async () => {
			const { exporter, dataTableService } = makeExporter();
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([
				makeDataTable({ id: 'dt-1', projectId: 'proj-sales' }),
			]);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [makeRequirement()],
				writer,
				projectTargetsById: new Map([['proj-sales', 'projects/sales']]),
			});

			expect(result.entries).toEqual([
				{ id: 'dt-1', name: 'Customers', target: 'projects/sales/data-tables/customers' },
			]);
			expect(writer.files.map((f) => f.path)).toContain(
				'projects/sales/data-tables/customers/data-table.json',
			);
		});

		it('keeps a table top-level when its owner project is not part of the export', async () => {
			const { exporter, dataTableService } = makeExporter();
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([
				makeDataTable({ id: 'dt-1', projectId: 'proj-other' }),
			]);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [makeRequirement()],
				writer,
				projectTargetsById: new Map([['proj-sales', 'projects/sales']]),
			});

			expect(result.entries).toEqual([
				{ id: 'dt-1', name: 'Customers', target: 'data-tables/customers' },
			]);
		});

		it('disambiguates same-named tables owned by different exported projects independently of the top-level dir', async () => {
			const { exporter, dataTableService } = makeExporter();
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([
				makeDataTable({ id: 'dt-a', name: 'Users', projectId: 'proj-a' }),
				makeDataTable({ id: 'dt-b', name: 'Users', projectId: 'proj-b' }),
			]);
			const writer = new CapturingWriter();

			const result = await exporter.export({
				user,
				requirements: [
					makeRequirement({ dataTableId: 'dt-a' }),
					makeRequirement({ dataTableId: 'dt-b' }),
				],
				writer,
				projectTargetsById: new Map([
					['proj-a', 'projects/team-a'],
					['proj-b', 'projects/team-b'],
				]),
			});

			const targets = result.entries.map((e) => e.target).sort();
			expect(targets).toEqual([
				'projects/team-a/data-tables/users',
				'projects/team-b/data-tables/users',
			]);
		});
	});

	describe('blocked export', () => {
		it('throws and writes nothing when a referenced table is missing or inaccessible', async () => {
			const { exporter, dataTableService } = makeExporter();
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([]);
			const writer = new CapturingWriter();

			await expect(
				exporter.export({
					user,
					requirements: [makeRequirement({ dataTableId: 'dt-missing-or-denied' })],
					writer,
				}),
			).rejects.toThrow('1 data table(s) not found or not accessible. Export aborted.');

			expect(writer.files).toEqual([]);
			expect(writer.directories).toEqual([]);
		});

		it('throws when only some of several referenced tables are accessible', async () => {
			const { exporter, dataTableService } = makeExporter();
			dataTableService.findDataTablesByIdsForUser.mockResolvedValue([
				makeDataTable({ id: 'dt-1' }),
			]);
			const writer = new CapturingWriter();

			await expect(
				exporter.export({
					user,
					requirements: [
						makeRequirement({ dataTableId: 'dt-1' }),
						makeRequirement({ dataTableId: 'dt-2' }),
					],
					writer,
				}),
			).rejects.toThrow('1 data table(s) not found or not accessible. Export aborted.');

			expect(writer.files).toEqual([]);
		});
	});
});
