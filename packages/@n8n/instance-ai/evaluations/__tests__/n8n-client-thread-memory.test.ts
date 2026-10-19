import { afterEach, vi } from 'vitest';

import { N8nClient } from '../clients/n8n-client';

/**
 * The compaction premise check reads memory through `getThreadMemory`, and the
 * harness drives compaction through `sendMessage`'s threshold field. Both are
 * mocked everywhere else, so this is the only place the wire shape is pinned.
 */

function mockFetch(body: unknown = { data: {} }) {
	const fn = vi.fn((_url: string | URL, _init?: RequestInit) => ({
		ok: true,
		status: 200,
		headers: { get: () => null },
		json: () => body,
		text: () => '',
	}));
	vi.stubGlobal('fetch', fn);
	return fn;
}

afterEach(() => vi.unstubAllGlobals());

function requestOf(fn: ReturnType<typeof mockFetch>): { path: string; init: RequestInit } {
	const [url, init] = fn.mock.calls[0] as [string, RequestInit];
	return { path: url.replace('http://n8n.test', ''), init };
}

describe('N8nClient.getThreadMemory', () => {
	it('reads the eval memory route and unwraps the REST envelope', async () => {
		const memory = {
			observations: [{ marker: 'critical', text: 'Posting via HTTP Request', tokenCount: 7 }],
			cursor: { lastObservedMessageId: 'm137', lastObservedAt: '2020-01-01T00:00:00.000Z' },
		};
		const fetchMock = mockFetch({ data: memory });

		const result = await new N8nClient('http://n8n.test').getThreadMemory('thread-1');

		expect(result).toEqual(memory);
		const { path, init } = requestOf(fetchMock);
		expect(path).toBe('/rest/instance-ai/eval/threads/thread-1/memory');
		expect(init.method).toBe('GET');
	});
});

describe('N8nClient.sendMessage observer threshold', () => {
	it('sends the threshold when the harness asks for compaction', async () => {
		const fetchMock = mockFetch({ data: { runId: 'run-1' } });

		await new N8nClient('http://n8n.test').sendMessage(
			'thread-1',
			'build',
			undefined,
			'default',
			undefined,
			undefined,
			1000,
		);

		const { path, init } = requestOf(fetchMock);
		expect(path).toBe('/rest/instance-ai/chat/thread-1');
		expect(JSON.parse(init.body as string)).toMatchObject({ observerThresholdTokens: 1000 });
	});

	it('omits the field otherwise, so the instance default applies', async () => {
		const fetchMock = mockFetch({ data: { runId: 'run-1' } });

		await new N8nClient('http://n8n.test').sendMessage('thread-1', 'build');

		expect(JSON.parse(requestOf(fetchMock).init.body as string)).not.toHaveProperty(
			'observerThresholdTokens',
		);
	});
});
