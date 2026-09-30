import { ACME_SEED, startMockServer } from '../mock-server';

describe('mock server', () => {
	// Port 0: the test must not clash with an eval run on the fixed port.
	const server = startMockServer(0);

	afterAll(async () => await (await server).close());

	const call = async (path: string, init: RequestInit = {}) => {
		const response = await fetch(`${(await server).url}${path}`, init);
		return { status: response.status, headers: response.headers, body: await response.json() };
	};

	it('serves the docs of each service', async () => {
		const docs = await Promise.all(
			['acme-tasks', 'ledger', 'searchly'].map(async (service) => {
				const response = await fetch(`${(await server).url}/${service}/docs`);
				return [response.status, (await response.text()).length > 500];
			}),
		);
		expect(docs).toEqual([
			[200, true],
			[200, true],
			[200, true],
		]);
	});

	it('pages acme tasks with a cursor and logs the requests per key', async () => {
		const headers = { 'X-Acme-Key': 'acme_page' };
		const first = await call('/acme-tasks/v1/tasks?status=open&pageSize=10', { headers });
		const second = await call(
			`/acme-tasks/v1/tasks?status=open&pageSize=10&cursor=${first.body.nextCursor}`,
			{ headers },
		);
		const open = ACME_SEED.filter((task) => task.status === 'open');
		expect([...first.body.data, ...second.body.data]).toEqual(open);
		expect(second.body.nextCursor).toBeNull();
		expect((await server).requestsFor('acme_page').map(({ returned }) => returned)).toEqual([
			10, 7,
		]);
		expect((await call('/acme-tasks/v1/tasks')).status).toBe(401);
		expect((await call('/acme-tasks/v1/tasks?status=any', { headers })).status).toBe(400);
	});

	it('creates acme tasks per key and rejects empty fields', async () => {
		const create = async (key: string, body: unknown) =>
			await call('/acme-tasks/v1/tasks', {
				method: 'POST',
				headers: { 'X-Acme-Key': key, 'content-type': 'application/json' },
				body: JSON.stringify(body),
			});
		expect((await create('acme_a', { title: 'One' })).body).toMatchObject({
			id: 'tsk_026',
			assignee: null,
		});
		expect((await create('acme_b', { title: 'Two', assignee: 'ada' })).body.id).toBe('tsk_026');
		expect((await create('acme_b', { title: 'Two', assignee: '' })).status).toBe(400);
	});

	it('returns ledger invoices with a bearer token and 404 for unknown ids', async () => {
		const headers = { Authorization: 'Bearer ldg_test' };
		const found = await call('/ledger/api/invoices/inv_1002', { headers });
		expect(found.body.data).toMatchObject({ id: 'inv_1002', dueDate: null, totalCents: 90000 });
		expect((await call('/ledger/api/invoices/inv_9', { headers })).status).toBe(404);
		expect((await call('/ledger/api/invoices/inv_1002')).status).toBe(401);
	});

	it('rate-limits the first searchly call of each key, then pages by offset', async () => {
		const search = async (query: string) =>
			await call(`/searchly/v2/search?api_key=sly_rate&index=docs&${query}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ query: 'workflow', filters: { lang: 'de' } }),
			});
		const limited = await search('offset=0');
		expect(limited.status).toBe(429);
		expect(limited.headers.get('retry-after')).toBe('1');
		const page = await search('offset=4&limit=10');
		expect(page.body).toMatchObject({ total: 6, offset: 4, limit: 10 });
		expect(page.body.hits.map(({ id }: { id: string }) => id)).toEqual(['doc_28', 'doc_32']);
		expect((await search('limit=11')).status).toBe(400);
	});
});
