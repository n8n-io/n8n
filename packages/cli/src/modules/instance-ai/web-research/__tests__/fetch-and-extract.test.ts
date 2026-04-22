import { fetchAndExtract } from '../fetch-and-extract';
import * as ssrfGuard from '../ssrf-guard';

jest.mock('../ssrf-guard');

const mockAssertPublicUrl = ssrfGuard.assertPublicUrl as jest.MockedFunction<
	typeof ssrfGuard.assertPublicUrl
>;

// Helper to create a mock Response
function createMockResponse(
	body: string,
	options: { contentType?: string; status?: number; url?: string } = {},
): Response {
	const { contentType = 'text/html', status = 200, url: responseUrl } = options;
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(encoder.encode(body));
			controller.close();
		},
	});

	return {
		ok: status >= 200 && status < 300,
		status,
		statusText: status === 200 ? 'OK' : 'Not Found',
		url: responseUrl ?? 'https://example.com',
		headers: new Headers({ 'content-type': contentType }),
		body: stream,
	} as unknown as Response;
}

describe('fetchAndExtract', () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		jest.clearAllMocks();
		mockAssertPublicUrl.mockResolvedValue(undefined);
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

		const result = await fetchAndExtract('https://example.com/docs');

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

		const result = await fetchAndExtract('https://example.com/table');

		expect(result.content).toContain('Code');
		expect(result.content).toContain('200');
	});

	it('passes through plain text', async () => {
		const text = 'Just some plain text content.';
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(createMockResponse(text, { contentType: 'text/plain' }));

		const result = await fetchAndExtract('https://example.com/file.txt');

		expect(result.content).toBe(text);
		expect(result.truncated).toBe(false);
	});

	it('truncates content exceeding maxContentLength', async () => {
		const longText = 'a'.repeat(50_000);
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(createMockResponse(longText, { contentType: 'text/plain' }));

		const result = await fetchAndExtract('https://example.com/long', {
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

		const result = await fetchAndExtract('https://example.com/spa');

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

		const result = await fetchAndExtract('https://example.com/login');

		expect(result.safetyFlags?.loginRequired).toBe(true);
	});

	it('performs post-redirect SSRF check', async () => {
		const html = '<html><body><p>Hello</p></body></html>';
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(createMockResponse(html, { url: 'https://redirected.example.com' }));

		await fetchAndExtract('https://example.com');

		// Should be called twice: once for original URL, once for redirect URL
		expect(mockAssertPublicUrl).toHaveBeenCalledTimes(2);
		expect(mockAssertPublicUrl).toHaveBeenCalledWith('https://example.com');
		expect(mockAssertPublicUrl).toHaveBeenCalledWith('https://redirected.example.com');
	});

	it('handles HTTP errors gracefully', async () => {
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(createMockResponse('Not Found', { status: 404 }));

		const result = await fetchAndExtract('https://example.com/missing');

		expect(result.content).toContain('HTTP 404');
		expect(result.contentLength).toBe(0);
	});

	it('skips post-redirect SSRF check when URL did not change', async () => {
		const html = '<html><body><p>Hello</p></body></html>';
		globalThis.fetch = jest
			.fn()
			.mockResolvedValue(createMockResponse(html, { url: 'https://example.com' }));

		await fetchAndExtract('https://example.com');

		// Only called once for the original URL
		expect(mockAssertPublicUrl).toHaveBeenCalledTimes(1);
	});
});
