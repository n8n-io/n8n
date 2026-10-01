import { ACME_SEED, EVENTS, startMockServer } from '../mock-server';

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
			['acme-tasks', 'ledger', 'searchly', 'inventory', 'events'].map(async (service) => {
				const response = await fetch(`${(await server).url}/${service}/docs`);
				return [response.status, (await response.text()).length > 500];
			}),
		);
		expect(docs).toEqual(Array.from({ length: 5 }, () => [200, true]));
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

	it('creates inventory items per kind and answers 422 with field errors', async () => {
		const create = async (body: unknown) =>
			await call('/inventory/v1/items', {
				method: 'POST',
				headers: { Authorization: 'ApiKey stk_test', 'content-type': 'application/json' },
				body: JSON.stringify(body),
			});
		const digital = {
			kind: 'digital',
			sku: 'EBOOK-7',
			name: 'Guide',
			downloadUrl: 'https://x.test/a',
		};
		expect((await create(digital)).body).toMatchObject({ id: 'itm_001', ...digital });
		expect((await create({ ...digital, weight: { value: 1, unit: 'g' } })).status).toBe(400);
		const invalid = await create({
			kind: 'physical',
			sku: 'bad sku',
			name: 'Mug',
			weight: { value: 0, unit: 'g' },
			dimensions: { length: 1, width: 1, height: -2, unit: 'cm' },
		});
		expect(invalid.status).toBe(422);
		expect(invalid.body.errors.map(({ field }: { field: string }) => field)).toEqual([
			'sku',
			'weight.value',
			'dimensions.height',
		]);
		expect((await call('/inventory/v1/items', { method: 'POST' })).status).toBe(401);
	});

	it('lists events in a UTC range with tombstones and Link pages', async () => {
		const headers = { 'X-Events-Key': 'evt_test' };
		const first = await fetch(
			`${(await server).url}/events/v1/events?occurred_after=2026-03-29T00:00:00Z`,
			{ headers },
		);
		const next = /<([^>]+)>; rel="next"/.exec(first.headers.get('link') ?? '')?.[1] ?? '';
		const second = await fetch(next, { headers });
		const ids = [...(await first.json()).data, ...(await second.json()).data].map(
			({ id }: { id: string }) => id,
		);
		expect(ids).toEqual(EVENTS.slice(39, 79).map(({ id }) => id));
		expect(new URL(next).searchParams.get('occurred_after')).toBe('2026-03-29T00:00:00Z');
		expect(EVENTS[5]).toEqual({ id: 'evt_006', occurredAt: '2026-03-27T06:15:00Z', deleted: true });
		const offset = await call('/events/v1/events?occurred_after=2026-03-29T00:00:00%2B02:00', {
			headers,
		});
		expect(offset.status).toBe(400);
		expect(
			(await call('/events/v1/events?occurred_after=2026-03-29T00:00:00.000Z', { headers })).status,
		).toBe(400);
	});
});
