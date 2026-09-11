import { createClient, N8nAppError } from '../index.js';

const jsonResponse = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), { status });

const row = { id: 1, createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z' };

describe('tables', () => {
	const fetchMock = vi.fn<typeof fetch>();
	const client = createClient({ baseUrl: '/apps/board/api/' });

	beforeEach(() => {
		vi.stubGlobal('fetch', fetchMock);
		fetchMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('lists rows with filter, sort, paging and search in the query string', async () => {
		const body = { count: 1, data: [{ ...row, title: 'a', done: false }] };
		fetchMock.mockResolvedValue(jsonResponse(200, body));

		const result = await client.tables.tasks.list({
			filter: { filters: [{ columnName: 'done', value: false }] },
			sortBy: 'title:asc',
			take: 50,
			skip: 10,
			search: 'a',
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(
			'/apps/board/api/tables/tasks/rows?filter=%7B%22filters%22%3A%5B%7B%22columnName%22%3A%22done%22%2C%22value%22%3Afalse%7D%5D%7D&search=a&sortBy=title%3Aasc&take=50&skip=10',
		);
		expect(init).toMatchObject({ method: 'GET', body: undefined });
		expect(result).toEqual(body);
	});

	it('lists without a query string when no option is given', async () => {
		fetchMock.mockResolvedValue(jsonResponse(200, { count: 0, data: [] }));

		await client.tables.tasks.list();

		expect(fetchMock.mock.calls[0][0]).toBe('/apps/board/api/tables/tasks/rows');
	});

	it('posts new rows as { data } and returns the stored rows', async () => {
		const body = { data: [{ ...row, title: 'a', done: null }] };
		fetchMock.mockResolvedValue(jsonResponse(201, body));

		const result = await client.tables.tasks.insert([{ title: 'a' }]);

		expect(fetchMock).toHaveBeenCalledWith('/apps/board/api/tables/tasks/rows', {
			method: 'POST',
			headers: [['Content-Type', 'application/json']],
			body: '{"data":[{"title":"a"}]}',
			signal: undefined,
		});
		expect(result).toEqual(body);
	});

	it('patches with { filter, data }', async () => {
		fetchMock.mockResolvedValue(jsonResponse(200, { data: [{ ...row, title: 'a', done: true }] }));

		await client.tables.tasks.update({ filters: [{ columnName: 'id', value: 1 }] }, { done: true });

		expect(fetchMock.mock.calls[0]).toEqual([
			'/apps/board/api/tables/tasks/rows',
			expect.objectContaining({
				method: 'PATCH',
				body: '{"filter":{"filters":[{"columnName":"id","value":1}]},"data":{"done":true}}',
			}),
		]);
	});

	it('deletes with the filter in the query string', async () => {
		fetchMock.mockResolvedValue(jsonResponse(200, { data: [{ ...row, title: 'a', done: true }] }));

		await client.tables.tasks.delete({ type: 'or', filters: [{ columnName: 'id', value: 1 }] });

		expect(fetchMock.mock.calls[0]).toEqual([
			'/apps/board/api/tables/tasks/rows?filter=%7B%22type%22%3A%22or%22%2C%22filters%22%3A%5B%7B%22columnName%22%3A%22id%22%2C%22value%22%3A1%7D%5D%7D',
			expect.objectContaining({ method: 'DELETE', body: undefined }),
		]);
	});

	it('encodes the binding key in the path', async () => {
		fetchMock.mockResolvedValue(jsonResponse(200, { count: 0, data: [] }));

		await createClient({ baseUrl: '/x' }).tables['to-do'].list();

		expect(fetchMock.mock.calls[0][0]).toBe('/x/tables/to-do/rows');
	});

	it('throws N8nAppError with the server code on 403 permission_denied', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(403, { code: 'permission_denied', message: 'read-only binding' }),
		);

		const error = await client.tables.tasks.insert([{ title: 'a' }]).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(N8nAppError);
		expect(error).toMatchObject({
			status: 403,
			code: 'permission_denied',
			message: 'read-only binding',
		});
	});

	it('throws invalid_response when the body is not a row list', async () => {
		fetchMock.mockResolvedValue(jsonResponse(200, { rows: [] }));

		await expect(client.tables.tasks.list()).rejects.toMatchObject({
			status: 200,
			code: 'invalid_response',
		});
	});

	it('rethrows the abort error of the caller unchanged', async () => {
		const controller = new AbortController();
		const abortError = new DOMException('Aborted', 'AbortError');
		controller.abort();
		fetchMock.mockRejectedValue(abortError);

		await expect(client.tables.tasks.list({ signal: controller.signal })).rejects.toBe(abortError);
	});
});
