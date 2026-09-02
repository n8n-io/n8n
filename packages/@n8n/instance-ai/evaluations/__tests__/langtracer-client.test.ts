import { jsonParse } from 'n8n-workflow';
import { afterEach, vi } from 'vitest';

import { LangTracerClient } from '../langtracer/client';

const config = { baseUrl: 'https://lt.example', apiKey: 'lt_test' };

function mockFetch(response: { ok?: boolean; status?: number; body: unknown }) {
	// A minimal Response-like: `await` tolerates the non-promise returns at the call sites.
	const fn = vi.fn((_url: string | URL, _init?: RequestInit) => ({
		ok: response.ok ?? true,
		status: response.status ?? 200,
		json: () => response.body,
	}));
	vi.stubGlobal('fetch', fn);
	return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('LangTracerClient writes', () => {
	it('getSuite unwraps the { data } envelope reads return', async () => {
		const fetchMock = mockFetch({
			body: { data: { suite: { id: 7, slug: 'wf' }, cases: [{ id: 5, name: 'c' }] } },
		});
		const result = await new LangTracerClient(config).getSuite(7);

		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('https://lt.example/api/v1/suites/7');
		expect(init?.headers).toMatchObject({ Authorization: 'Bearer lt_test' });
		expect(result.cases).toEqual([{ id: 5, name: 'c' }]);
	});

	it('createCase POSTs to /cases and returns the raw (un-unwrapped) write body', async () => {
		const fetchMock = mockFetch({ body: { case: { id: 9, name: 'c' }, alreadyExisted: true } });
		const client = new LangTracerClient(config);

		const result = await client.createCase({
			name: 'c',
			setKind: 'regression',
			synthetic: true,
			suiteId: 7,
			evalComplexity: 'simple',
			evalTags: ['build'],
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('https://lt.example/api/v1/cases');
		expect(init?.method).toBe('POST');
		expect(init?.headers).toMatchObject({
			Authorization: 'Bearer lt_test',
			'Content-Type': 'application/json',
		});
		expect(jsonParse(init?.body as string)).toMatchObject({ name: 'c', suiteId: 7 });
		expect(result.case.id).toBe(9);
		expect(result.alreadyExisted).toBe(true);
	});

	it('updateCase PATCHes /cases/:id with the patch body', async () => {
		const fetchMock = mockFetch({ body: { case: { id: 9, name: 'c' }, revision: 2 } });
		const client = new LangTracerClient(config);

		const result = await client.updateCase(9, { outcomeExpectations: ['x'] });

		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe('https://lt.example/api/v1/cases/9');
		expect(init?.method).toBe('PATCH');
		expect(jsonParse(init?.body as string)).toEqual({ outcomeExpectations: ['x'] });
		expect(result.revision).toBe(2);
	});

	it('throws on a non-ok write without echoing the response body', async () => {
		mockFetch({ ok: false, status: 409, body: { error: 'secret detail' } });
		const client = new LangTracerClient(config);

		await expect(client.updateCase(9, { outcomeExpectations: ['x'] })).rejects.toThrow(/409/);
		await expect(client.updateCase(9, { outcomeExpectations: ['x'] })).rejects.not.toThrow(
			/secret detail/,
		);
	});
});
