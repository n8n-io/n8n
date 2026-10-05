import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { DataTableDDLRepository } from '../data-table-ddl.repository';
import { DataTableDDLService } from '../data-table-ddl.service';
import { DataTableRepository } from '../data-table.repository';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

it('rolls back metadata when table creation fails', async () => {
	const repository = Container.get(DataTableRepository);
	const ddlService = Container.get(DataTableDDLService);
	const project = await createTeamProject();
	const createTable = vi
		.spyOn(ddlService, 'createTableWithColumns')
		.mockRejectedValueOnce(new Error('DDL failed'));

	try {
		await expect(
			repository.createDataTable(project.id, 'rollback-test', [{ name: 'value', type: 'string' }]),
		).rejects.toThrow('DDL failed');
		expect(await repository.findOneBy({ projectId: project.id, name: 'rollback-test' })).toBeNull();
	} finally {
		createTable.mockRestore();
	}
});

it('joins an existing transaction for table deletion', async () => {
	const repository = Container.get(DataTableRepository);
	const project = await createTeamProject();
	const table = await repository.createDataTable(project.id, 'nested-test', []);

	await expect(
		repository.manager.transaction(async (manager) => {
			await repository.deleteDataTable(table.id, manager);
			throw new Error('abort deletion');
		}),
	).rejects.toThrow('abort deletion');

	expect(await repository.findOneBy({ id: table.id })).not.toBeNull();
	expect(await Container.get(DataTableDDLRepository).tableExists(table.id)).toBe(true);
	await repository.deleteDataTable(table.id);
});
