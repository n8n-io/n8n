import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { ProjectImportContext } from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { DataTableImporter } from '../data-table.importer';
import type { ManifestDataTableEntry } from '../data-table.types';

describe('DataTableImporter', () => {
	let importer: DataTableImporter;
	let mockDataTableRepository: MockProxy<DataTableRepository>;
	let mockReader: MockProxy<PackageReader>;
	let ctx: ProjectImportContext;

	beforeEach(() => {
		jest.clearAllMocks();

		mockDataTableRepository = mock<DataTableRepository>();
		mockReader = mock<PackageReader>();

		importer = new DataTableImporter(mockDataTableRepository);

		ctx = {
			user: mock(),
			projectId: 'new-project-1',
			projectEntry: mock(),
			folderIdMap: new Map(),
			reader: mockReader,
		};
	});

	it('should do nothing when entries is empty', async () => {
		await importer.importForProject(ctx, []);

		expect(mockDataTableRepository.createDataTable).not.toHaveBeenCalled();
	});

	it('should create a data table via DataTableRepository', async () => {
		const entries: ManifestDataTableEntry[] = [
			{ id: 'dt-1', name: 'customers', target: 'projects/billing/data-tables/customers' },
		];

		const columns = [
			{ name: 'name', type: 'string' as const, index: 0 },
			{ name: 'age', type: 'number' as const, index: 1 },
		];

		mockReader.readFile.mockReturnValue(JSON.stringify({ id: 'dt-1', name: 'customers', columns }));
		mockDataTableRepository.createDataTable.mockResolvedValue(mock());

		await importer.importForProject(ctx, entries);

		expect(mockDataTableRepository.createDataTable).toHaveBeenCalledWith(
			'new-project-1',
			'customers',
			columns,
		);
	});

	it('should create multiple data tables', async () => {
		const entries: ManifestDataTableEntry[] = [
			{ id: 'dt-1', name: 'customers', target: 'projects/billing/data-tables/customers' },
			{ id: 'dt-2', name: 'orders', target: 'projects/billing/data-tables/orders' },
		];

		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'dt-1', name: 'customers', columns: [] }))
			.mockReturnValueOnce(JSON.stringify({ id: 'dt-2', name: 'orders', columns: [] }));
		mockDataTableRepository.createDataTable.mockResolvedValue(mock());

		await importer.importForProject(ctx, entries);

		expect(mockDataTableRepository.createDataTable).toHaveBeenCalledTimes(2);
	});
});
