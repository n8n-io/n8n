import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';

import { DataTableColumnRepository } from '../data-table-column.repository';
import { DataTableService } from '../data-table.service';
import { mockDataTableSizeValidator } from './test-helpers';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
	mockDataTableSizeValidator();
});

afterAll(async () => {
	await testDb.terminate();
});

const timed = async <T>(fn: () => Promise<T>) => {
	const start = Date.now();
	const value = await fn();
	return { value, ms: Date.now() - start };
};

describe('DataTableService.getManyRowsAndCount under a concurrent write transaction', () => {
	let dataTableService: DataTableService;
	let manager: DataTableColumnRepository['manager'];
	let project: Project;
	let dataTableId: string;

	beforeAll(async () => {
		dataTableService = Container.get(DataTableService);
		manager = Container.get(DataTableColumnRepository).manager;
		project = await createTeamProject();
		const dataTable = await dataTableService.createDataTable(project.id, {
			name: 'readOnlyTx',
			columns: [{ name: 'name', type: 'string' }],
		});
		dataTableId = dataTable.id;
		await dataTableService.insertRows(dataTableId, project.id, [{ name: 'a' }, { name: 'b' }]);
	});

	it('does not wait for the write connection', async () => {
		const HOLD_MS = 1500;
		let writeStarted: () => void = () => {};
		const writeHasConnection = new Promise<void>((resolve) => {
			writeStarted = resolve;
		});
		const writeHeld = manager.transaction(async () => {
			writeStarted();
			await sleep(HOLD_MS);
		});
		await writeHasConnection;

		const read = await timed(
			async () => await dataTableService.getManyRowsAndCount(dataTableId, project.id, {}),
		);
		await writeHeld;

		expect(read.value.count).toBe(2);
		expect(read.value.data.map((row) => row.name)).toEqual(['a', 'b']);
		if (Container.get(GlobalConfig).database.type === 'sqlite') {
			expect(read.ms).toBeLessThan(HOLD_MS / 2);
		}
	});
});
