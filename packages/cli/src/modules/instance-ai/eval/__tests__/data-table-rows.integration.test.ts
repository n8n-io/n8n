import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableService } from '@/modules/data-table/data-table.service';

import { resolveDataTableNodeId } from '../data-table-rows';

beforeAll(async () => {
	await testModules.loadModules(['data-table']);
	await testDb.init();
	mockDataTableSizeValidator();
});

afterAll(async () => {
	await testDb.terminate();
});

function readByName(value: string): INode {
	return {
		id: 'read',
		name: 'Read',
		type: 'n8n-nodes-base.dataTable',
		typeVersion: 1,
		position: [0, 0],
		parameters: { resource: 'row', operation: 'get', dataTableId: { mode: 'name', value } },
	};
}

describe('resolveDataTableNodeId', () => {
	it('finds the table a name locator reads at run time, whatever its case, in the workflow project', async () => {
		const dataTableService = Container.get(DataTableService);
		const project = await createTeamProject();
		const otherProject = await createTeamProject();
		const table = await dataTableService.createDataTable(project.id, {
			name: 'Sent Posts',
			columns: [],
		});
		await dataTableService.createDataTable(otherProject.id, { name: 'sent posts', columns: [] });

		await expect(
			resolveDataTableNodeId(dataTableService, readByName('sent posts'), project.id),
		).resolves.toBe(table.id);
	});
});
