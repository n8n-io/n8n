import type { ModuleRegistry } from '@n8n/backend-common';
import type { AppCallContext } from '@n8n/backend-module-apps';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';

import { AppDataTableAdapter } from '../app-data-table.adapter';

const ctx: AppCallContext = {
	appId: 'app-1',
	namespace: 'crm',
	projectId: 'project-1',
	bindingKey: 'tasks',
	visitor: { type: 'user', userId: 'user-1' },
};
const user = mock<User>();

function setup() {
	const service = mock<DataTableService>();
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(true);
	return { adapter: new AppDataTableAdapter(service, moduleRegistry), service, moduleRegistry };
}

describe('AppDataTableAdapter', () => {
	describe('assertCanBind', () => {
		it('needs the write scope for a write permission', async () => {
			const { adapter, service } = setup();
			service.findDataTablesByIdsForUser.mockResolvedValue([
				mock<DataTable>({ projectId: 'project-1' }),
			]);

			await adapter.assertCanBind(user, 'project-1', {
				key: 'tasks',
				kind: 'dataTable',
				dataTableId: 't1',
				permissions: ['read', 'delete'],
			});

			expect(service.findDataTablesByIdsForUser).toHaveBeenCalledWith(['t1'], user, [
				'dataTable:readRow',
				'dataTable:writeRow',
			]);
		});

		it('rejects a table from another project', async () => {
			const { adapter, service } = setup();
			service.findDataTablesByIdsForUser.mockResolvedValue([
				mock<DataTable>({ projectId: 'project-2', name: 'Other' }),
			]);

			await expect(
				adapter.assertCanBind(user, 'project-1', {
					key: 'tasks',
					kind: 'dataTable',
					dataTableId: 't1',
					permissions: ['read'],
				}),
			).rejects.toThrow('must be in the app project');
		});

		it('rejects a table the user cannot read', async () => {
			const { adapter, service } = setup();
			service.findDataTablesByIdsForUser.mockResolvedValue([]);

			await expect(
				adapter.assertCanBind(user, 'project-1', {
					key: 'tasks',
					kind: 'dataTable',
					dataTableId: 't1',
					permissions: ['read'],
				}),
			).rejects.toThrow('you cannot use data table');
		});
	});

	it('acts as the app project', async () => {
		const { adapter, service } = setup();
		service.getManyRowsAndCount.mockResolvedValue({ count: 0, data: [] });

		await adapter.listRows(ctx, 't1', { take: 10 });

		expect(service.getManyRowsAndCount).toHaveBeenCalledWith('t1', 'project-1', { take: 10 });
	});

	it('maps a rejected value to invalid_input', async () => {
		const { adapter, service } = setup();
		service.insertRows.mockRejectedValue(new DataTableValidationError('unknown column "x"'));

		await expect(adapter.insertRows(ctx, 't1', [{ x: 1 }])).rejects.toMatchObject({
			status: 400,
			code: 'invalid_input',
		});
	});

	it('maps a table that left the project to resource_missing', async () => {
		const { adapter, service } = setup();
		service.deleteRows.mockRejectedValue(new DataTableNotFoundError('t1'));

		await expect(
			adapter.deleteRows(ctx, 't1', {
				type: 'and',
				filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
			}),
		).rejects.toMatchObject({ status: 404, code: 'resource_missing' });
	});

	it('describes a missing table as null', async () => {
		const { adapter, service } = setup();
		service.validateDataTableExists.mockRejectedValue(new DataTableNotFoundError('t1'));

		expect(
			await adapter.describe('project-1', {
				key: 'tasks',
				kind: 'dataTable',
				dataTableId: 't1',
				permissions: ['read'],
			}),
		).toBeNull();
	});
});
