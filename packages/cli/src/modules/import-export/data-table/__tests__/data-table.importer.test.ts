import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { DataTableRepository } from '@/modules/data-table/data-table.repository';

import type { ImportScope } from '../../import-export.types';
import type { PackageReader } from '../../package-reader';
import { DataTableImporter } from '../data-table.importer';
import type { ManifestEntry } from '../../import-export.types';

describe('DataTableImporter', () => {
	let importer: DataTableImporter;
	let mockDataTableRepository: MockProxy<DataTableRepository>;
	let mockReader: MockProxy<PackageReader>;
	let scope: ImportScope;

	beforeEach(() => {
		jest.clearAllMocks();

		mockDataTableRepository = mock<DataTableRepository>();
		mockReader = mock<PackageReader>();

		importer = new DataTableImporter(mockDataTableRepository);

		scope = {
			user: mock(),
			targetProjectId: 'new-project-1',
			reader: mockReader,
			entityOptions: {},
			state: {
				folderIdMap: new Map(),
				credentialBindings: new Map(),
				subWorkflowBindings: new Map(),
			},
		};
	});

	it('should do nothing when entries is empty', async () => {
		await importer.import(scope, []);

		expect(mockDataTableRepository.createDataTable).not.toHaveBeenCalled();
	});

	it('should create a data table when no existing match', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'dt-1', name: 'customers', target: 'projects/billing/data-tables/customers' },
		];

		const columns = [
			{ name: 'name', type: 'string' as const, index: 0 },
			{ name: 'age', type: 'number' as const, index: 1 },
		];

		mockReader.readFile.mockReturnValue(JSON.stringify({ id: 'dt-1', name: 'customers', columns }));
		mockDataTableRepository.findOne.mockResolvedValue(null);
		mockDataTableRepository.createDataTable.mockResolvedValue(mock());

		await importer.import(scope, entries);

		expect(mockDataTableRepository.createDataTable).toHaveBeenCalledWith(
			'new-project-1',
			'customers',
			columns,
			undefined,
		);
	});

	it('should skip a data table that already exists in the project', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'dt-1', name: 'customers', target: 'projects/billing/data-tables/customers' },
		];

		mockReader.readFile.mockReturnValue(
			JSON.stringify({ id: 'dt-1', name: 'customers', columns: [] }),
		);
		mockDataTableRepository.findOne.mockResolvedValue({
			id: 'existing-dt',
			name: 'customers',
		} as never);

		await importer.import(scope, entries);

		expect(mockDataTableRepository.createDataTable).not.toHaveBeenCalled();
	});

	it('should create multiple data tables', async () => {
		const entries: ManifestEntry[] = [
			{ id: 'dt-1', name: 'customers', target: 'projects/billing/data-tables/customers' },
			{ id: 'dt-2', name: 'orders', target: 'projects/billing/data-tables/orders' },
		];

		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'dt-1', name: 'customers', columns: [] }))
			.mockReturnValueOnce(JSON.stringify({ id: 'dt-2', name: 'orders', columns: [] }));
		mockDataTableRepository.findOne.mockResolvedValue(null);
		mockDataTableRepository.createDataTable.mockResolvedValue(mock());

		await importer.import(scope, entries);

		expect(mockDataTableRepository.createDataTable).toHaveBeenCalledTimes(2);
	});
});
