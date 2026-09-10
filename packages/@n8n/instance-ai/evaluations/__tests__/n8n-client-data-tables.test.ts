import { afterEach, vi } from 'vitest';

import { N8nClient } from '../clients/n8n-client';

function mockFetch(body: unknown) {
	const fn = vi.fn((_url: string | URL, _init?: RequestInit) => ({
		ok: true,
		status: 200,
		// The client reads `set-cookie` off every response to capture the login cookie.
		headers: { get: () => null },
		json: () => body,
	}));
	vi.stubGlobal('fetch', fn);
	return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('N8nClient.listDataTables', () => {
	// Burned live: reading `data` as the array returned [] for every project, with no
	// error path — so the seed-table eviction and computer-use's data-table cleanup
	// both silently did nothing.
	it('unwraps the paginated `{ data: { count, data } }` envelope', async () => {
		mockFetch({
			data: {
				count: 2,
				data: [
					{ id: 'dt-1', name: 'Orders' },
					{ id: 'dt-2', name: 'B' },
				],
			},
		});

		const tables = await new N8nClient('http://n8n.test').listDataTables('project-1');

		expect(tables).toEqual([
			{ id: 'dt-1', name: 'Orders' },
			{ id: 'dt-2', name: 'B' },
		]);
	});

	it('still accepts a flat `{ data: [...] }` envelope', async () => {
		mockFetch({ data: [{ id: 'dt-1', name: 'Orders' }] });

		const tables = await new N8nClient('http://n8n.test').listDataTables('project-1');

		expect(tables).toEqual([{ id: 'dt-1', name: 'Orders' }]);
	});

	it('returns an empty list rather than throwing when the payload has no rows', async () => {
		mockFetch({ data: { count: 0 } });

		expect(await new N8nClient('http://n8n.test').listDataTables('project-1')).toEqual([]);
	});

	// The default page is 10; every caller enumerates the whole set, so a short
	// page silently leaves leftover seed tables behind.
	it('asks for a full page rather than the default 10', async () => {
		const fn = mockFetch({ data: { count: 0, data: [] } });

		await new N8nClient('http://n8n.test').listDataTables('project-1');

		expect(String(fn.mock.calls[0][0])).toContain('take=250');
	});
});
