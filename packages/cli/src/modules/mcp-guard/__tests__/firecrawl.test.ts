import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { FIRECRAWL_PROFILE, HTTP_PROFILES } from '../http-profiles';
import { HttpGuardRouter } from '../http-router';
import type { McpCaller } from '../mcp-upstream';
import type { CapturedRequest } from '../network';
import { isTokenExchange, loadVendorKnowledge, vendorForRequest } from '../vendor-knowledge';

const HOST = 'api.firecrawl.dev';
const API_KEY = 'fc-secret-key-123';
const JOB = '3f2b6c1e-8a4d-4f0b-9c7e-1d2a3b4c5d6e';

const result = (body: unknown, status = 200): CallToolResult => ({
	isError: status >= 400,
	content: [{ type: 'text', text: JSON.stringify(body) }],
	_meta: { status, contentType: 'application/json' },
});

const request = (method: string, path: string, body?: unknown): CapturedRequest => ({
	method,
	url: new URL(`https://${HOST}${path}`),
	headers: { authorization: `Bearer ${API_KEY}` },
	body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
});

// Every operation of the Firecrawl API that a node can call. None reaches the real service.
const OPERATIONS: Array<[string, string, string]> = [
	['scrape v1', 'POST', '/v1/scrape'],
	['search v1', 'POST', '/v1/search'],
	['map v1', 'POST', '/v1/map'],
	['scrape v2', 'POST', '/v2/scrape'],
	['search v2', 'POST', '/v2/search'],
	['map v2', 'POST', '/v2/map'],
	['crawl', 'POST', '/v1/crawl'],
	['crawl v2', 'POST', '/v2/crawl'],
	['extract', 'POST', '/v1/extract'],
	['batch scrape', 'POST', '/v1/batch/scrape'],
	['agent', 'POST', '/v2/agent'],
	['crawl status', 'GET', `/v1/crawl/${JOB}`],
	['extract status', 'GET', `/v1/extract/${JOB}`],
	['credit usage', 'GET', '/v1/team/credit-usage'],
	['crawl cancel', 'DELETE', `/v1/crawl/${JOB}`],
];

function setup() {
	const upstream = {
		listTools: vi.fn(async () => []),
		callTool: vi.fn(async (..._a: unknown[]) => result({ success: true, data: { markdown: '#' } })),
	};
	const gym = {
		listTools: vi.fn(async () => []),
		callTool: vi.fn(async (..._a: unknown[]) => result({ success: true, id: JOB, url: 'x' })),
	};
	const hydrator = {
		hydrate: vi.fn(async (..._a: unknown[]) => {}),
		hydrateWrite: vi.fn(async (..._a: unknown[]) => {}),
		noteWrite: vi.fn(),
	};
	const router = new HttpGuardRouter({
		upstream: upstream as unknown as McpCaller,
		gym: gym as unknown as McpCaller,
		hydrator,
		profile: FIRECRAWL_PROFILE,
	});
	return { router, upstream, gym, hydrator };
}

describe('the Firecrawl vendor file', () => {
	const vendor = loadVendorKnowledge('firecrawl');

	it('loads and names the host and the versions', () => {
		expect(vendor.name).toBe('firecrawl');
		expect(vendor.hosts).toEqual([HOST]);
		expect(vendor.pathPrefixes).toEqual(['/v1', '/v2']);
		expect(vendor.passthroughHosts).toEqual([]);
		expect(vendor.readPaths).toHaveLength(0);
		expect(vendor.instructions).toContain('crawl');
	});

	it('is chosen for the Firecrawl host and for no other path or host', () => {
		expect(vendorForRequest(HOST, '/v1/scrape')?.name).toBe('firecrawl');
		expect(vendorForRequest(HOST, '/v2/map')?.name).toBe('firecrawl');
		expect(vendorForRequest(HOST, '/v3/scrape')).toBeUndefined();
		expect(vendorForRequest('example.com', '/v1/scrape')).toBeUndefined();
	});

	it('has no sign-in host, so nothing is a token exchange', () => {
		expect(isTokenExchange({ method: 'POST', url: new URL(`https://${HOST}/v1/token`) })).toBe(
			false,
		);
	});

	it('has a profile with the default ports of the table', () => {
		expect(HTTP_PROFILES).toContain(FIRECRAWL_PROFILE);
	});
});

describe('Firecrawl policy for each operation', () => {
	it('has a profile that keeps every call away from the real service', () => {
		expect(FIRECRAWL_PROFILE.gymOnly).toBe(true);
	});

	it.each(OPERATIONS)('%s goes only to the gym', async (_label, method, path) => {
		const { router, upstream, gym, hydrator } = setup();

		const res = await router.handle(
			request(method, path, method === 'POST' ? { url: 'https://example.com' } : undefined),
		);

		expect(res.status).toBe(200);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(hydrator.hydrate).not.toHaveBeenCalled();
		expect(hydrator.hydrateWrite).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('sends the call to the gym as a write, so the real credential is never asked', async () => {
		const { router, gym } = setup();

		await router.handle(request('POST', '/v1/scrape', { url: 'https://example.com' }));

		expect(gym.callTool.mock.calls[0][0]).toMatch(/^write_post_/);
	});
});

describe('a crawl job', () => {
	it('starts in the gym, and a status read of that id goes only to the gym', async () => {
		const { router, upstream, gym } = setup();

		const start = await router.handle(request('POST', '/v1/crawl', { url: 'https://example.com' }));
		expect(await start.json()).toMatchObject({ id: JOB });

		gym.callTool.mockResolvedValueOnce(result({ status: 'completed', total: 1, data: [] }));
		const status = await router.handle(request('GET', `/v1/crawl/${JOB}`));

		expect(await status.json()).toMatchObject({ status: 'completed' });
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(2);
	});

	it('does not read the real service for a status read of an id that the gym did not make', async () => {
		const { router, upstream, gym } = setup();

		const res = await router.handle(request('GET', `/v1/crawl/${JOB}`));

		expect(res.status).toBe(200);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});
});

describe('secrets', () => {
	it('keeps the API key and the query out of the log and out of what goes to the gym', async () => {
		const lines: string[] = [];
		const sink = (line: string) => lines.push(line);
		Container.set(Logger, { info: sink, warn: sink, error: sink } as unknown as Logger);
		const { router, gym } = setup();

		await router.handle(request('POST', '/v1/crawl', { url: 'https://example.com' }));
		await router.handle(request('POST', '/v1/scrape?api_key=qs-secret', { url: 'https://x.test' }));
		await router.handle(request('GET', `/v1/crawl/${JOB}?token=qs-secret`));

		expect(lines.length).toBeGreaterThan(0);
		for (const line of lines) {
			expect(line).not.toContain(API_KEY);
			expect(line).not.toContain('qs-secret');
		}
		expect(JSON.stringify(gym.callTool.mock.calls)).not.toContain(API_KEY);
	});
});
