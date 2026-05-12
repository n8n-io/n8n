import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { N8nClient } from '../client';

describe('N8nClient REST helpers', () => {
	const originalFetch = global.fetch;
	const fetchMock = vi.fn();

	function jsonResponse(body: unknown, init: Partial<ResponseInit> = {}): Response {
		return new Response(JSON.stringify(body), {
			status: 200,
			// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header
			headers: { 'content-type': 'application/json' },
			...init,
		});
	}

	beforeEach(() => {
		fetchMock.mockReset();
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('searchNodes hits GET /rest/nodes/search with the q param', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse({
				results: [{ nodeId: 'slack.message.send', displayName: 'Send', description: '' }],
			}),
		);

		const client = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: 'test-key' });
		const result = await client.searchNodes('slack');

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const calledUrl = fetchMock.mock.calls[0][0] as string;
		expect(calledUrl).toContain('/rest/nodes/search');
		expect(calledUrl).toContain('q=slack');
		expect(calledUrl).not.toContain('/api/v1/');
		expect(result.results[0].nodeId).toBe('slack.message.send');
	});

	it('searchNodes forwards the hasCredential flag', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

		const client = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: 'k' });
		await client.searchNodes('slack', true);

		const calledUrl = fetchMock.mock.calls[0][0] as string;
		expect(calledUrl).toContain('hasCredential=true');
	});

	it('getNode hits GET /rest/nodes/:id and URL-encodes the id', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ nodeId: 'slack.message.send' }));

		const client = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: 'k' });
		await client.getNode('@n8n/n8n-nodes-langchain.agent');

		const calledUrl = fetchMock.mock.calls[0][0] as string;
		expect(calledUrl).toContain('/rest/nodes/');
		// `@` and `/` must both be URL-encoded so they survive routing.
		expect(calledUrl).toContain(encodeURIComponent('@n8n/n8n-nodes-langchain.agent'));
	});

	it('executeNode POSTs to /rest/executions/node with the JSON body', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse({ executionId: 'exec-1', status: 'success', executionUrl: 'http://x/e/1' }),
		);

		const client = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: 'k' });
		const result = await client.executeNode({
			nodeType: 'n8n-nodes-base.slack',
			parameters: { resource: 'message', operation: 'send', channel: '#test' },
			credentialId: 'c1',
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [calledUrl, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(calledUrl).toContain('/rest/executions/node');
		expect(init.method).toBe('POST');
		expect(typeof init.body).toBe('string');
		const body = JSON.parse(init.body as string) as Record<string, unknown>;
		expect(body.nodeType).toBe('n8n-nodes-base.slack');
		expect(body.credentialId).toBe('c1');
		expect(body.parameters).toEqual({
			resource: 'message',
			operation: 'send',
			channel: '#test',
		});
		expect(result.executionId).toBe('exec-1');
	});

	it('sends the X-N8N-API-KEY header on REST calls', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

		const client = new N8nClient({ baseUrl: 'http://localhost:5678', apiKey: 'sekret' });
		await client.searchNodes('x');

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		const headers = init.headers as Headers;
		expect(headers.get('X-N8N-API-KEY')).toBe('sekret');
	});
});
