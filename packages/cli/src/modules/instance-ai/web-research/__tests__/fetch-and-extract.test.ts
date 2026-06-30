import type { Mocked } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type {
	CustomFetch,
	HttpTransport,
	SsrfBridge,
	SsrfOption,
	SsrfProtectionService,
} from '@n8n/backend-network';
import { OutboundHttp } from '@n8n/backend-network';
import { mock } from 'vitest-mock-extended';
import { createResultError, createResultOk } from 'n8n-workflow';
import dns from 'node:dns';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo, LookupFunction } from 'node:net';

import { fetchAndExtract } from '../fetch-and-extract';

// The SSRF interceptor hands `validateUrl` a `URL` object (not a string), so we
// match on its `href` rather than comparing against a raw string.
const validatedUrl = (href: string) => expect.objectContaining({ href }) as unknown as URL;

/**
 * Wires `fetchAndExtract` to a canned `fetch` by stubbing the transport. SSRF
 * enforcement is the transport's job (covered by the factory's own tests and the
 * end-to-end cases below), so these unit tests can drive the extraction logic
 * with deterministic responses.
 */
function mockTransport(fetchImpl: CustomFetch) {
	const transportFetch = vi.fn(fetchImpl);
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(transportFetch);
	return { transport, transportFetch };
}

// Helper to create a mock Response
function createMockResponse(
	body: string,
	options: {
		contentType?: string;
		status?: number;
		url?: string;
		location?: string;
	} = {},
): Response {
	const { contentType = 'text/html', status = 200, url: responseUrl, location } = options;
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(body));
			controller.close();
		},
	});

	const headers = new Headers({ 'content-type': contentType });
	if (location) headers.set('location', location);

	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? 'OK' : status === 301 ? 'Moved' : 'Not Found',
		url: responseUrl ?? 'https://example.com',
		headers,
		body: stream,
	} as unknown as Response;
}

describe('fetchAndExtract', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('extracts markdown from HTML', async () => {
		const html = `
			<html>
				<head><title>Test Doc</title></head>
				<body>
					<article>
						<h1>API Reference</h1>
						<p>This is the API documentation.</p>
						<pre><code>const x = 1;</code></pre>
					</article>
				</body>
			</html>`;

		const { transport } = mockTransport(async () => createMockResponse(html));

		const result = await fetchAndExtract('https://example.com/docs', { transport });

		expect(result.title).toBeTruthy();
		expect(result.content).toContain('API Reference');
		expect(result.truncated).toBe(false);
	});

	it('supports GFM tables in HTML', async () => {
		const html = `
			<html>
				<head><title>Table Doc</title></head>
				<body>
					<article>
						<h1>Status Codes</h1>
						<table>
							<thead><tr><th>Code</th><th>Meaning</th></tr></thead>
							<tbody><tr><td>200</td><td>OK</td></tr></tbody>
						</table>
					</article>
				</body>
			</html>`;

		const { transport } = mockTransport(async () => createMockResponse(html));

		const result = await fetchAndExtract('https://example.com/table', { transport });

		expect(result.content).toContain('Code');
		expect(result.content).toContain('200');
	});

	it('passes through plain text', async () => {
		const text = 'Just some plain text content.';
		const { transport } = mockTransport(async () =>
			createMockResponse(text, { contentType: 'text/plain' }),
		);

		const result = await fetchAndExtract('https://example.com/file.txt', { transport });

		expect(result.content).toBe(text);
		expect(result.truncated).toBe(false);
	});

	it('truncates content exceeding maxContentLength', async () => {
		const longText = 'a'.repeat(50_000);
		const { transport } = mockTransport(async () =>
			createMockResponse(longText, { contentType: 'text/plain' }),
		);

		const result = await fetchAndExtract('https://example.com/long', {
			transport,
			maxContentLength: 1000,
		});

		expect(result.content.length).toBe(1000);
		expect(result.truncated).toBe(true);
		expect(result.contentLength).toBe(50_000);
	});

	it('caps the body at maxResponseBytes and cancels the stream', async () => {
		const encoder = new TextEncoder();
		const cancel = vi.fn().mockResolvedValue(undefined);
		// A stream that never closes on its own — emits a 4-byte chunk per pull so
		// the byte cap is reached mid-stream and we must cancel to stop reading.
		const body = new ReadableStream({
			pull(controller) {
				controller.enqueue(encoder.encode('aaaa'));
			},
			cancel,
		});

		const { transport } = mockTransport(
			async () =>
				({
					ok: true,
					status: 200,
					statusText: 'OK',
					url: 'https://example.com/big',
					headers: new Headers({ 'content-type': 'text/plain' }),
					body,
				}) as unknown as Response,
		);

		const result = await fetchAndExtract('https://example.com/big', {
			transport,
			maxResponseBytes: 6,
		});

		expect(result.content).toBe('aaaaaa');
		expect(cancel).toHaveBeenCalled();
	});

	it('detects JS rendering safety flag', async () => {
		const html = `
			<html>
				<head><title>SPA App</title></head>
				<body>
					<div id="app"></div>
					<noscript>You need JavaScript to run this app.</noscript>
					<script src="/app.js"></script>
				</body>
			</html>`;

		const { transport } = mockTransport(async () => createMockResponse(html));

		const result = await fetchAndExtract('https://example.com/spa', { transport });

		expect(result.safetyFlags?.jsRenderingSuspected).toBe(true);
	});

	it('detects login required safety flag', async () => {
		const html = `
			<html>
				<head><title>Login</title></head>
				<body>
					<form action="/login" method="post">
						<input name="username" />
						<input name="password" type="password" />
					</form>
				</body>
			</html>`;

		const { transport } = mockTransport(async () => createMockResponse(html));

		const result = await fetchAndExtract('https://example.com/login', { transport });

		expect(result.safetyFlags?.loginRequired).toBe(true);
	});

	it('handles HTTP errors gracefully', async () => {
		const { transport } = mockTransport(async () =>
			createMockResponse('Not Found', { status: 404 }),
		);

		const result = await fetchAndExtract('https://example.com/missing', { transport });

		expect(result.content).toContain('HTTP 404');
		expect(result.contentLength).toBe(0);
	});

	it('lets the transport follow redirects and reports its final URL', async () => {
		const html = '<html><body><p>Hi</p></body></html>';
		const { transport, transportFetch } = mockTransport(async () =>
			createMockResponse(html, { url: 'https://final.example.com/page' }),
		);

		const result = await fetchAndExtract('https://example.com', { transport });

		expect(transportFetch).toHaveBeenCalledTimes(1);
		expect(transportFetch).toHaveBeenCalledWith(
			'https://example.com',
			expect.objectContaining({ redirect: 'follow' }),
		);
		expect(result.finalUrl).toBe('https://final.example.com/page');
	});

	it('surfaces the root cause when the transport rejects a hop', async () => {
		const { transport } = mockTransport(async () => {
			throw new TypeError('fetch failed', { cause: new Error('Access blocked') });
		});

		await expect(fetchAndExtract('https://example.com', { transport })).rejects.toThrow(
			'Access blocked',
		);
	});

	it('does not deadlock when the response body streams in chunks after fetch resolves', async () => {
		const encoder = new TextEncoder();
		const slowBody = new ReadableStream({
			async start(controller) {
				for (const part of ['<html>', '<body>', 'hello world', '</body>', '</html>']) {
					await new Promise((resolve) => setTimeout(resolve, 5));
					controller.enqueue(encoder.encode(part));
				}
				controller.close();
			},
		});

		const { transport } = mockTransport(
			async () =>
				({
					ok: true,
					status: 200,
					statusText: 'OK',
					url: 'https://example.com/slow',
					headers: new Headers({ 'content-type': 'text/html' }),
					body: slowBody,
				}) as unknown as Response,
		);

		const result = await Promise.race([
			fetchAndExtract('https://example.com/slow', { transport }),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('fetchAndExtract deadlocked')), 2000),
			),
		]);

		expect(result.content).toContain('hello world');
	});

	// ── End-to-end: real redirecting server, real factory transport ──────────
	//
	// Mirrors the factory's `outbound-http.ssrf.test.ts` approach: a real local
	// server issues a 30x, and the transport's SSRF interceptor runs for real, so
	// we prove SSRF coverage extends to redirect hops and that the AI research
	// flow still extracts content through the factory.
	describe('end-to-end against a real redirecting server', () => {
		interface TestServer {
			url: string;
			captured: string[];
			close: () => Promise<void>;
		}

		async function startRedirectServer(): Promise<TestServer> {
			let serverUrl = '';
			const captured: string[] = [];
			const server = createServer((req: IncomingMessage, res: ServerResponse) => {
				captured.push(req.url ?? '');
				if (req.url === '/start') {
					res.writeHead(302, { Location: `${serverUrl}/internal` });
					res.end();
					return;
				}
				res.writeHead(200, { 'content-type': 'text/html' });
				res.end(
					'<html><head><title>Redirected</title></head><body><article><h1>Internal Page</h1>' +
						'<p>This content was reached after following a redirect.</p></article></body></html>',
				);
			});

			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			const { port } = server.address() as AddressInfo;
			serverUrl = `http://127.0.0.1:${port}`;

			return {
				url: serverUrl,
				captured,
				close: async () => await new Promise<void>((resolve) => server.close(() => resolve())),
			};
		}

		// Builds a real transport (the wiring the adapter service performs) so the
		// SSRF (and optional authorize) interceptors run for real against the
		// redirecting server below.
		function realTransport(ssrf: SsrfOption, authorize?: (url: URL) => Promise<void>) {
			return new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>()).transport({
				ssrf,
				authorize,
			});
		}

		function makeBridge(blockedPath?: string): Mocked<SsrfBridge> {
			const bridge = mock<SsrfBridge>();
			bridge.validateUrl.mockImplementation(async (url) => {
				const href = typeof url === 'string' ? url : url.href;
				return blockedPath && href.includes(blockedPath)
					? createResultError(new Error(`SSRF: blocked ${blockedPath}`))
					: createResultOk(undefined);
			});
			// The transport installs this as a connect-time lookup; delegate to real
			// DNS so hostname connections resolve normally (IP-literal targets skip it).
			bridge.createSecureLookup.mockReturnValue(((hostname, options, onResult) =>
				dns.lookup(hostname, options, onResult as never)) as LookupFunction);
			return bridge;
		}

		let server: TestServer;

		beforeEach(async () => {
			server = await startRedirectServer();
		});

		afterEach(async () => {
			await server.close();
		});

		it('follows the redirect and extracts content when every hop passes SSRF validation', async () => {
			const ssrf = makeBridge();

			const result = await fetchAndExtract(`${server.url}/start`, {
				transport: realTransport(ssrf),
			});

			expect(result.content).toContain('Internal Page');
			expect(result.finalUrl).toBe(`${server.url}/internal`);
			expect(ssrf.validateUrl).toHaveBeenCalledWith(validatedUrl(`${server.url}/start`));
			expect(ssrf.validateUrl).toHaveBeenCalledWith(validatedUrl(`${server.url}/internal`));
			expect(server.captured).toEqual(['/start', '/internal']);
		});

		it('blocks a redirect to an SSRF-rejected target without reaching it', async () => {
			const ssrf = makeBridge('/internal');

			await expect(
				fetchAndExtract(`${server.url}/start`, { transport: realTransport(ssrf) }),
			).rejects.toThrow();

			expect(ssrf.validateUrl).toHaveBeenCalledWith(validatedUrl(`${server.url}/internal`));
			expect(server.captured).toContain('/start');
			expect(server.captured).not.toContain('/internal');
		});

		it('blocks the initial request when SSRF rejects its URL', async () => {
			const ssrf = makeBridge('/start');

			await expect(
				fetchAndExtract(`${server.url}/start`, { transport: realTransport(ssrf) }),
			).rejects.toThrow();

			expect(server.captured).not.toContain('/start');
		});

		it('authorizes the redirect target before it is fetched', async () => {
			const ssrf = makeBridge();
			const authorize = vi.fn(async (target: URL) => {
				if (target.href.includes('/internal')) throw new Error('Redirect not allowed');
			});

			await expect(
				fetchAndExtract(`${server.url}/start`, {
					transport: realTransport(ssrf, authorize),
				}),
			).rejects.toThrow('Redirect not allowed');

			expect(authorize).toHaveBeenCalledWith(validatedUrl(`${server.url}/internal`));
			// The redirect target is gated before any request reaches it.
			expect(server.captured).toEqual(['/start']);
		});

		it('follows the redirect without validation when SSRF is disabled', async () => {
			const result = await fetchAndExtract(`${server.url}/start`, {
				transport: realTransport('disabled'),
			});

			expect(result.content).toContain('Internal Page');
			expect(server.captured).toEqual(['/start', '/internal']);
		});
	});
});
