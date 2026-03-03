import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { ProjectExportContext } from '../../import-export.types';
import type { PackageWriter } from '../../package-writer';
import { DataTableExporter } from '../data-table.exporter';
import type { DataTableSerializer } from '../data-table.serializer';

describe('DataTableExporter', () => {
	let exporter: DataTableExporter;
	let mockDataTableRepository: MockProxy<DataTableRepository>;
	let mockSerializer: MockProxy<DataTableSerializer>;
	let mockWriter: MockProxy<PackageWriter>;
	let ctx: ProjectExportContext;

	const projectTarget = 'projects/billing-550e84';

	beforeEach(() => {
		jest.clearAllMocks();

		mockDataTableRepository = mock<DataTableRepository>();
		mockSerializer = mock<DataTableSerializer>();
		mockWriter = mock<PackageWriter>();

		exporter = new DataTableExporter(mockDataTableRepository, mockSerializer);

		ctx = {
			projectId: 'project-1',
			projectTarget,
			folderPathMap: new Map(),
			writer: mockWriter,
		};
	});

	it('should return empty array when project has no data tables', async () => {
		mockDataTableRepository.find.mockResolvedValue([]);

		const entries = await exporter.exportForProject(ctx);

		expect(entries).toEqual([]);
		expect(mockWriter.writeDirectory).not.toHaveBeenCalled();
		expect(mockWriter.writeFile).not.toHaveBeenCalled();
	});

	it('should export a data table with columns', async () => {
		const dataTable = {
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'customers',
			columns: [
				{ name: 'name', type: 'string', index: 0 },
				{ name: 'age', type: 'number', index: 1 },
			],
		} as DataTable;

		mockDataTableRepository.find.mockResolvedValue([dataTable]);
		mockSerializer.serialize.mockReturnValue({
			id: dataTable.id,
			name: dataTable.name,
			columns: [
				{ name: 'name', type: 'string', index: 0 },
				{ name: 'age', type: 'number', index: 1 },
			],
		});

		const entries = await exporter.exportForProject(ctx);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe(dataTable.id);
		expect(entries[0].name).toBe('customers');
		expect(entries[0].target).toBe('projects/billing-550e84/data-tables/customers-aabb11');

		expect(mockWriter.writeDirectory).toHaveBeenCalledWith(
			'projects/billing-550e84/data-tables/customers-aabb11',
		);
		expect(mockWriter.writeFile).toHaveBeenCalledWith(
			'projects/billing-550e84/data-tables/customers-aabb11/data-table.json',
			expect.any(String),
		);
	});

	it('should serialize data table as JSON in the written file', async () => {
		const dataTable = {
			id: 'aabb1100-0000-0000-0000-000000000000',
			name: 'customers',
			columns: [],
		} as unknown as DataTable;

		const serialized = { id: dataTable.id, name: 'customers', columns: [] };
		mockDataTableRepository.find.mockResolvedValue([dataTable]);
		mockSerializer.serialize.mockReturnValue(serialized);

		await exporter.exportForProject(ctx);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});

	it('should export multiple data tables', async () => {
		const dataTables = [
			{ id: 'aabb1100-0000-0000-0000-000000000000', name: 'customers', columns: [] },
			{ id: 'ccdd2200-0000-0000-0000-000000000000', name: 'orders', columns: [] },
		] as unknown as DataTable[];

		mockDataTableRepository.find.mockResolvedValue(dataTables);
		mockSerializer.serialize
			.mockReturnValueOnce({ id: dataTables[0].id, name: dataTables[0].name, columns: [] })
			.mockReturnValueOnce({ id: dataTables[1].id, name: dataTables[1].name, columns: [] });

		const entries = await exporter.exportForProject(ctx);

		expect(entries).toHaveLength(2);
		expect(mockWriter.writeDirectory).toHaveBeenCalledTimes(2);
		expect(mockWriter.writeFile).toHaveBeenCalledTimes(2);
	});

	it('should query data tables by project id with columns relation', async () => {
		mockDataTableRepository.find.mockResolvedValue([]);

		await exporter.exportForProject(ctx);

		expect(mockDataTableRepository.find).toHaveBeenCalledWith({
			where: { projectId: 'project-1' },
			relations: ['columns'],
		});
	});
});
