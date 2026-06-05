import type { Logger } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { SsrfBridge } from 'n8n-core';
import { createResultOk } from 'n8n-workflow';
import type { LookupFunction } from 'node:net';

import type { DnsResolver } from '@/services/ssrf/dns-resolver';
import { SsrfProtectionService } from '@/services/ssrf/ssrf-protection.service';

import { fetchAndExtract } from '../fetch-and-extract';

function createSsrfMock(): jest.Mocked<SsrfBridge> {
	const ssrf = mock<SsrfBridge>();
	ssrf.validateUrl.mockResolvedValue(createResultOk(undefined));
	ssrf.validateRedirectSync.mockReturnValue(undefined);
	// Lookup is invoked by undici when fetching real hosts. Our tests stub fetch
	// itself so the lookup is never called — return a noop.
	ssrf.createSecureLookup.mockReturnValue((_h, _o, cb) =>
		cb(null, '127.0.0.1', 4),
	) as unknown as jest.Mocked<SsrfBridge>['createSecureLookup'];
	return ssrf;
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
	const originalFetch = globalThis.fetch;
	let ssrf: jest.Mocked<SsrfBridge>;

	beforeEach(() => {
		jest.clearAllMocks();
		ssrf = createSsrfMock();
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
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

		globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(html));

		const result = await fetchAndExtract('https://example.com/docs', { ssrf });

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

		globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(html));

		const result = await fetchAndExtract('https://example.com/table', { ssrf });

		expect(result.content).toContain('Code');
		expect(result.content).toContain('200');
	});

	it('passes through plain text', async () => {
		const text = 'Just some plain text content.';
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(createMockResponse(text, { contentType: 'text/plain' }));

		const result = await fetchAndExtract('https://example.com/file.txt', { ssrf });

		expect(result.content).toBe(text);
		expect(result.truncated).toBe(false);
	});

	it('truncates content exceeding maxContentLength', async () => {
		const longText = 'a'.repeat(50_000);
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(createMockResponse(longText, { contentType: 'text/plain' }));

		const result = await fetchAndExtract('https://example.com/long', {
			ssrf,
			maxContentLength: 1000,
		});

		expect(result.content.length).toBe(1000);
		expect(result.truncated).toBe(true);
		expect(result.contentLength).toBe(50_000);
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

		globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(html));

		const result = await fetchAndExtract('https://example.com/spa', { ssrf });

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

		globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(html));

		const result = await fetchAndExtract('https://example.com/login', { ssrf });

		expect(result.safetyFlags?.loginRequired).toBe(true);
	});

	it('handles HTTP errors gracefully', async () => {
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(createMockResponse('Not Found', { status: 404 }));

		const result = await fetchAndExtract('https://example.com/missing', { ssrf });

		expect(result.content).toContain('HTTP 404');
		expect(result.contentLength).toBe(0);
	});

	describe('SSRF integration', () => {
		it('validates the initial URL via SsrfBridge', async () => {
			const html = '<html><body><p>Hi</p></body></html>';
			globalThis.fetch = jest.fn().mockResolvedValue(createMockResponse(html));

			await fetchAndExtract('https://example.com', { ssrf });

			expect(ssrf.validateUrl).toHaveBeenCalledWith('https://example.com');
		});

		it('aborts the fetch if validateUrl rejects', async () => {
			const blockedError = new Error('Blocked: 10.0.0.1');
			ssrf.validateUrl.mockResolvedValueOnce({ ok: false, error: blockedError });
			globalThis.fetch = jest.fn();

			await expect(fetchAndExtract('https://blocked.example', { ssrf })).rejects.toThrow(
				'Blocked: 10.0.0.1',
			);
			expect(globalThis.fetch).not.toHaveBeenCalled();
		});

		it('passes a dispatcher with the secure lookup to fetch', async () => {
			const html = '<html><body><p>Hi</p></body></html>';
			const fetchSpy = jest.fn().mockResolvedValue(createMockResponse(html));
			globalThis.fetch = fetchSpy;

			await fetchAndExtract('https://example.com', { ssrf });

			expect(ssrf.createSecureLookup).toHaveBeenCalled();
			const fetchOptions = fetchSpy.mock.calls[0][1] as { dispatcher?: unknown };
			expect(fetchOptions.dispatcher).toBeDefined();
		});

		it('validates each redirect target via validateRedirectSync and validateUrl', async () => {
			const html = '<html><body><p>Hi</p></body></html>';
			globalThis.fetch = jest
				.fn()
				.mockResolvedValueOnce(
					createMockResponse('', {
						status: 301,
						location: 'https://final.example.com/page',
					}),
				)
				.mockResolvedValueOnce(createMockResponse(html));

			await fetchAndExtract('https://example.com', { ssrf });

			expect(ssrf.validateUrl).toHaveBeenCalledWith('https://example.com');
			expect(ssrf.validateUrl).toHaveBeenCalledWith('https://final.example.com/page');
			expect(ssrf.validateRedirectSync).toHaveBeenCalledWith('https://final.example.com/page');
		});

		it('blocks redirects whose direct-IP target is private', async () => {
			globalThis.fetch = jest.fn().mockResolvedValueOnce(
				createMockResponse('', {
					status: 301,
					location: 'http://10.0.0.1/secret',
				}),
			);
			ssrf.validateRedirectSync.mockImplementationOnce(() => {
				throw new Error('Blocked: 10.0.0.1');
			});

			await expect(fetchAndExtract('https://example.com', { ssrf })).rejects.toThrow(
				'Blocked: 10.0.0.1',
			);
		});

		it('defeats DNS rebinding: secure lookup rejects a private IP returned at connect time', async () => {
			// End-to-end TOCTOU regression guard. Wires fetchAndExtract to a real
			// SsrfProtectionService backed by a mocked DnsResolver that returns a
			// public IP on the validation lookup and a private IP on the connect
			// lookup. The secure lookup must reject the private IP rather than
			// hand it to undici, even though validation passed.
			const dnsResolver = mock<DnsResolver>();
			dnsResolver.lookup
				.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
				.mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }]);

			const realSsrf = new SsrfProtectionService(
				new SsrfProtectionConfig(),
				dnsResolver,
				mock<Logger>({ scoped: jest.fn().mockReturnThis() }),
			);

			// Capture the lookup function that fetchAndExtract installs on the dispatcher.
			let dispatcherLookup: LookupFunction | undefined;
			const realCreate = realSsrf.createSecureLookup.bind(realSsrf);
			jest.spyOn(realSsrf, 'createSecureLookup').mockImplementation(() => {
				dispatcherLookup = realCreate();
				return dispatcherLookup;
			});

			globalThis.fetch = jest
				.fn()
				.mockResolvedValue(createMockResponse('<html><body>x</body></html>'));

			// Validation lookup returns the public IP, so fetchAndExtract proceeds.
			await fetchAndExtract('https://evil.example/', { ssrf: realSsrf });
			expect(dispatcherLookup).toBeDefined();

			// Simulate undici invoking the dispatcher's lookup at connect time.
			// DnsResolver now returns the private IP — the secure lookup must error
			// out instead of returning the rebound address.
			await expect(
				new Promise<void>((resolve, reject) => {
					dispatcherLookup!('evil.example', { family: 0 }, (err) => {
						if (err) reject(err);
						else resolve();
					});
				}),
			).rejects.toThrow(/restricted IP/i);
		});
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

		globalThis.fetch = jest.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
			url: 'https://example.com/slow',
			headers: new Headers({ 'content-type': 'text/html' }),
			body: slowBody,
		} as unknown as Response);

		const result = await Promise.race([
			fetchAndExtract('https://example.com/slow', { ssrf }),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error('fetchAndExtract deadlocked')), 2000),
			),
		]);

		expect(result.content).toContain('hello world');
	});
});
