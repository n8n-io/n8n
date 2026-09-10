import { mock } from 'vitest-mock-extended';

import type { DataTable } from '@/modules/data-table/data-table.entity';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import { AppRuntimeError } from '../app-runtime.error';
import { AppTableRuntimeService } from '../app-table-runtime.service';

const app = (permissions: Array<'read' | 'write'> = ['read', 'write']) =>
	({
		id: 'app-1',
		namespace: 'board',
		projectId: 'proj-1',
		bindings: [
			{ key: 'submit', kind: 'workflow', workflowId: 'wf-1' },
			{ key: 'tasks', kind: 'dataTable', dataTableId: 'dt-1', permissions },
		],
	}) as unknown as App;

const row = { id: 1, title: 'a', createdAt: new Date(0), updatedAt: new Date(0) };

const failure = async (promise: Promise<unknown>) => {
	const error: unknown = await promise.catch((e: unknown) => e);
	expect(error).toBeInstanceOf(AppRuntimeError);
	return error as AppRuntimeError;
};

describe('AppTableRuntimeService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let dataTableService: ReturnType<typeof mock<DataTableService>>;
	let service: AppTableRuntimeService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		dataTableService = mock<DataTableService>();
		appRepository.findByNamespace.mockResolvedValue(app());
		dataTableService.validateDataTableExists.mockResolvedValue(mock<DataTable>({ id: 'dt-1' }));
		service = new AppTableRuntimeService(appRepository, dataTableService);
	});

	describe('resolution', () => {
		it('answers 404 app_not_found for a namespace no app owns', async () => {
			appRepository.findByNamespace.mockResolvedValue(null);

			expect(await failure(service.listRows('nobody', 'tasks', {}))).toMatchObject({
				status: 404,
				code: 'app_not_found',
			});
		});

		it('answers 404 binding_not_found for a key bound to a workflow', async () => {
			expect(await failure(service.listRows('board', 'submit', {}))).toMatchObject({
				status: 404,
				code: 'binding_not_found',
			});
			expect(dataTableService.validateDataTableExists).not.toHaveBeenCalled();
		});

		it('answers 403 permission_denied for a write on a read-only binding', async () => {
			appRepository.findByNamespace.mockResolvedValue(app(['read']));

			expect(await failure(service.insertRows('board', 'tasks', { data: [{}] }))).toMatchObject({
				status: 403,
				code: 'permission_denied',
			});
			expect(dataTableService.validateDataTableExists).not.toHaveBeenCalled();
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('answers 404 table_not_found when the table left the project, before reading the input', async () => {
			dataTableService.validateDataTableExists.mockRejectedValue(
				new DataTableNotFoundError('dt-1'),
			);

			expect(await failure(service.insertRows('board', 'tasks', 'not a body'))).toMatchObject({
				status: 404,
				code: 'table_not_found',
			});
			expect(dataTableService.validateDataTableExists).toHaveBeenCalledWith('dt-1', 'proj-1');
		});
	});

	describe('listRows', () => {
		it('passes the parsed query to the data table service as the app project', async () => {
			dataTableService.getManyRowsAndCount.mockResolvedValue({ count: 1, data: [row] });

			const result = await service.listRows('board', 'tasks', {
				take: '5',
				skip: '10',
				sortBy: 'title:desc',
				filter: JSON.stringify({ filters: [{ columnName: 'title', value: 'a' }] }),
				search: 'a',
			});

			expect(dataTableService.getManyRowsAndCount).toHaveBeenCalledWith('dt-1', 'proj-1', {
				take: 5,
				skip: 10,
				sortBy: ['title', 'DESC'],
				filter: { type: 'and', filters: [{ columnName: 'title', condition: 'eq', value: 'a' }] },
				search: 'a',
			});
			expect(result).toEqual({ count: 1, data: [row] });
		});

		it('answers 400 invalid_input with the issues for a malformed filter', async () => {
			const error = await failure(service.listRows('board', 'tasks', { filter: '{not json' }));

			expect(error).toMatchObject({ status: 400, code: 'invalid_input' });
			expect(error.issues).toEqual([{ path: ['filter', 'filter'], code: 'custom' }]);
			expect(dataTableService.getManyRowsAndCount).not.toHaveBeenCalled();
		});
	});

	describe('insertRows', () => {
		it('inserts the rows and returns them in full', async () => {
			dataTableService.insertRows.mockResolvedValue([row]);

			const result = await service.insertRows('board', 'tasks', { data: [{ title: 'a' }] });

			expect(dataTableService.insertRows).toHaveBeenCalledWith(
				'dt-1',
				'proj-1',
				[{ title: 'a' }],
				'all',
			);
			expect(result).toEqual({ data: [row] });
		});

		it('answers 400 invalid_input for more than 100 rows', async () => {
			const data = Array.from({ length: 101 }, () => ({ title: 'a' }));

			const error = await failure(service.insertRows('board', 'tasks', { data }));

			expect(error).toMatchObject({ status: 400, code: 'invalid_input' });
			expect(error.issues).toEqual([{ path: ['data'], code: 'too_big' }]);
			expect(dataTableService.insertRows).not.toHaveBeenCalled();
		});

		it('answers 400 invalid_input when the columns reject a value', async () => {
			dataTableService.insertRows.mockRejectedValue(
				new DataTableValidationError("unknown column 'nope'"),
			);

			const error = await failure(service.insertRows('board', 'tasks', { data: [{ nope: 1 }] }));

			expect(error).toMatchObject({
				status: 400,
				code: 'invalid_input',
				message: expect.stringContaining("unknown column 'nope'"),
			});
		});

		it('rethrows a failure that is not the caller’s', async () => {
			dataTableService.insertRows.mockRejectedValue(new Error('db down'));

			await expect(service.insertRows('board', 'tasks', { data: [{}] })).rejects.toThrow('db down');
		});
	});

	describe('updateRows', () => {
		it('updates by filter and returns the changed rows', async () => {
			dataTableService.updateRows.mockResolvedValue([row]);

			const result = await service.updateRows('board', 'tasks', {
				filter: { filters: [{ columnName: 'id', value: 1 }] },
				data: { title: 'b' },
			});

			expect(dataTableService.updateRows).toHaveBeenCalledWith(
				'dt-1',
				'proj-1',
				{
					filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] },
					data: { title: 'b' },
				},
				true,
				false,
			);
			expect(result).toEqual({ data: [row] });
		});

		it('answers 400 invalid_input for an empty filter', async () => {
			const error = await failure(
				service.updateRows('board', 'tasks', { filter: { filters: [] }, data: { title: 'b' } }),
			);

			expect(error).toMatchObject({ status: 400, code: 'invalid_input' });
			expect(dataTableService.updateRows).not.toHaveBeenCalled();
		});
	});

	describe('deleteRows', () => {
		it('deletes by the filter in the query string and returns the removed rows', async () => {
			dataTableService.deleteRows.mockResolvedValue([row]);

			const result = await service.deleteRows('board', 'tasks', {
				filter: JSON.stringify({ filters: [{ columnName: 'id', value: 1 }] }),
			});

			expect(dataTableService.deleteRows).toHaveBeenCalledWith(
				'dt-1',
				'proj-1',
				{ filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: 1 }] } },
				true,
				false,
			);
			expect(result).toEqual({ data: [row] });
		});

		it('answers 400 invalid_input without a filter', async () => {
			const error = await failure(service.deleteRows('board', 'tasks', {}));

			expect(error).toMatchObject({ status: 400, code: 'invalid_input' });
			expect(dataTableService.deleteRows).not.toHaveBeenCalled();
		});
	});
});
