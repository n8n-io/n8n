import { runDataTableCall, type DataTableBackend } from '../data-table.ts';

describe('runDataTableCall', () => {
	const calls: unknown[] = [];
	const backend: DataTableBackend = {
		getDataTableAggregateProxy: async () => ({
			getManyAndCount: async (options: unknown) => {
				calls.push(['getManyAndCount', options]);
				return { count: 1, data: [{ id: 'T', createdAt: new Date(0) }] };
			},
		}),
		getDataTableProxy: async (id: string) => ({
			insertRows: async (rows: unknown, returnType: unknown) => {
				calls.push(['insertRows', id, rows, returnType]);
				return [{ id: 1, createdAt: new Date(0) }];
			},
			deleteRows: async () => {
				throw Object.assign(new Error('unknown column name'), { description: 'd' });
			},
		}),
	};

	it('calls the service method with the arguments of the call, and gives JSON', async () => {
		expect(
			await runDataTableCall(backend, {
				service: 'dataTable',
				op: 'insertRows',
				args: { dataTableId: 'T', rows: [{ a: 1 }], returnType: 'all' },
			}),
		).toEqual({ ok: true, result: [{ id: 1, createdAt: '1970-01-01T00:00:00.000Z' }] });
		await runDataTableCall(backend, {
			service: 'dataTable',
			op: 'getManyAndCount',
			args: { options: { filter: { name: 'x' }, take: 1 } },
		});
		expect(calls).toEqual([
			['insertRows', 'T', [{ a: 1 }], 'all'],
			['getManyAndCount', { filter: { name: 'x' }, take: 1 }],
		]);
	});

	it('answers a failed call with the error', async () => {
		expect(
			await runDataTableCall(backend, {
				service: 'dataTable',
				op: 'deleteRows',
				args: { dataTableId: 'T', options: {} },
			}),
		).toEqual({ ok: false, error: { message: 'unknown column name', description: 'd' } });
		expect(
			await runDataTableCall(backend, { service: 'dataTable', op: 'dropTable', args: {} }),
		).toEqual({ ok: false, error: { message: 'Unknown data table operation "dropTable"' } });
	});
});
