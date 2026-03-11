import { HumanMessage, AIMessage } from '@langchain/core/messages';
import dns from 'dns';

import {
	normalizeHost,
	isBlockedUrl,
	fetchUrl,
	extractReadableContent,
	isUrlInUserMessages,
} from '../web-fetch.utils';

// Mock dns module
jest.mock('dns', () => ({
	resolve4: jest.fn(),
	resolve6: jest.fn(),
}));

const mockResolve4 = dns.resolve4 as unknown as jest.Mock;
const mockResolve6 = dns.resolve6 as unknown as jest.Mock;

type DnsCallback = (error: Error | null, addresses: string[]) => void;

// Helper to make dns.resolve return values via callback
function mockDnsResolve(v4: string[] = [], v6: string[] = []) {
	mockResolve4.mockImplementation((_hostname: string, done: DnsCallback) => done(null, v4));
	mockResolve6.mockImplementation((_hostname: string, done: DnsCallback) => done(null, v6));
}

function mockDnsResolveError() {
	mockResolve4.mockImplementation((_hostname: string, done: DnsCallback) =>
		done(new Error('ENOTFOUND'), []),
	);
	mockResolve6.mockImplementation((_hostname: string, done: DnsCallback) =>
		done(new Error('ENOTFOUND'), []),
	);
}

describe('web-fetch.utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('normalizeHost', () => {
		it('should lowercase the hostname', () => {
			expect(normalizeHost('https://Example.COM/path')).toBe('example.com');
		});

		it('should strip trailing dot', () => {
			expect(normalizeHost('https://example.com./path')).toBe('example.com');
		});

		it('should extract hostname from full URL', () => {
			expect(normalizeHost('https://docs.example.com:8080/api/v1')).toBe('docs.example.com');
		});

		it('should throw for invalid URLs', () => {
			expect(() => normalizeHost('not-a-url')).toThrow();
		});
	});

	describe('isBlockedUrl', () => {
		describe('scheme blocking', () => {
			it('should block non-HTTP schemes', async () => {
				expect(await isBlockedUrl('ftp://example.com')).toBe(true);
				expect(await isBlockedUrl('file:///etc/passwd')).toBe(true);
				expect(await isBlockedUrl('javascript:alert(1)')).toBe(true);
			});

			it('should block invalid URLs', async () => {
				expect(await isBlockedUrl('not-a-url')).toBe(true);
			});
		});

		describe('localhost blocking', () => {
			it('should block localhost', async () => {
				expect(await isBlockedUrl('http://localhost')).toBe(true);
				expect(await isBlockedUrl('http://localhost:8080')).toBe(true);
			});

			it('should block 127.0.0.1', async () => {
				expect(await isBlockedUrl('http://127.0.0.1')).toBe(true);
				expect(await isBlockedUrl('http://127.0.0.1:3000')).toBe(true);
			});

			it('should block IPv6 loopback', async () => {
				expect(await isBlockedUrl('http://[::1]')).toBe(true);
			});
		});

		describe('TLD blocking', () => {
			it('should block .local TLD', async () => {
				expect(await isBlockedUrl('http://myhost.local')).toBe(true);
			});

			it('should block .internal TLD', async () => {
				expect(await isBlockedUrl('http://service.internal')).toBe(true);
			});
		});

		describe('metadata service blocking', () => {
			it('should block AWS metadata IP', async () => {
				expect(await isBlockedUrl('http://169.254.169.254/latest/meta-data')).toBe(true);
			});

			it('should block Google metadata hostname', async () => {
				expect(await isBlockedUrl('http://metadata.google.internal')).toBe(true);
			});
		});

		describe('private IP blocking', () => {
			it('should block 10.x.x.x range', async () => {
				expect(await isBlockedUrl('http://10.0.0.1')).toBe(true);
				expect(await isBlockedUrl('http://10.255.255.255')).toBe(true);
			});

			it('should block 172.16-31.x.x range', async () => {
				expect(await isBlockedUrl('http://172.16.0.1')).toBe(true);
				expect(await isBlockedUrl('http://172.31.255.255')).toBe(true);
			});

			it('should block 192.168.x.x range', async () => {
				expect(await isBlockedUrl('http://192.168.1.1')).toBe(true);
				expect(await isBlockedUrl('http://192.168.0.100')).toBe(true);
			});

			it('should block link-local 169.254.x.x range', async () => {
				expect(await isBlockedUrl('http://169.254.1.1')).toBe(true);
			});

			it('should block 0.0.0.0', async () => {
				expect(await isBlockedUrl('http://0.0.0.0')).toBe(true);
			});
		});

		describe('DNS resolution checks', () => {
			it('should allow public URLs with public DNS resolution', async () => {
				mockDnsResolve(['93.184.216.34']);
				expect(await isBlockedUrl('https://example.com')).toBe(false);
			});

			it('should block hostnames resolving to private IPs', async () => {
				mockDnsResolve(['192.168.1.1']);
				expect(await isBlockedUrl('https://evil.example.com')).toBe(true);
			});

			it('should block hostnames resolving to loopback', async () => {
				mockDnsResolve(['127.0.0.1']);
				expect(await isBlockedUrl('https://evil.example.com')).toBe(true);
			});

			it('should block when DNS fails', async () => {
				mockDnsResolveError();
				expect(await isBlockedUrl('https://nonexistent.example.com')).toBe(true);
			});

			it('should block private IPv6 addresses', async () => {
				mockDnsResolve([], ['::1']);
				expect(await isBlockedUrl('https://evil.example.com')).toBe(true);
			});

			it('should block link-local IPv6 addresses', async () => {
				mockDnsResolve([], ['fe80::1']);
				expect(await isBlockedUrl('https://evil.example.com')).toBe(true);
			});

			it('should block unique local IPv6 (fc/fd)', async () => {
				mockDnsResolve([], ['fd00::1']);
				expect(await isBlockedUrl('https://evil.example.com')).toBe(true);
			});
		});
	});

	describe('fetchUrl', () => {
		const originalFetch = globalThis.fetch;

		afterEach(() => {
			globalThis.fetch = originalFetch;
		});

		it('should detect PDF content type and return unsupported', async () => {
			globalThis.fetch = jest.fn().mockResolvedValue({
				url: 'https://example.com/doc.pdf',
				headers: new Headers({ 'content-type': 'application/pdf' }),
				body: null,
			});

			const result = await fetchUrl('https://example.com/doc.pdf');
			expect(result.status).toBe('unsupported');
			expect(result.reason).toBe('pdf');
		});

		it('should detect cross-host redirect', async () => {
			globalThis.fetch = jest.fn().mockResolvedValue({
				url: 'https://other-domain.com/page',
				headers: new Headers({ 'content-type': 'text/html' }),
				body: null,
			});

			const result = await fetchUrl('https://example.com/page');
			expect(result.status).toBe('redirect_new_host');
			expect(result.finalUrl).toBe('https://other-domain.com/page');
		});

		it('should return success with body for same-host response', async () => {
			const encoder = new TextEncoder();
			const body = encoder.encode('<html><body>Hello</body></html>');

			globalThis.fetch = jest.fn().mockResolvedValue({
				url: 'https://example.com/page',
				status: 200,
				headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
				body: {
					getReader: () => ({
						read: jest
							.fn()
							.mockResolvedValueOnce({ done: false, value: body })
							.mockResolvedValueOnce({ done: true }),
						cancel: jest.fn(),
					}),
				},
			});

			const result = await fetchUrl('https://example.com/page');
			expect(result.status).toBe('success');
			expect(result.body).toContain('Hello');
			expect(result.httpStatus).toBe(200);
		});

		it('should handle empty body', async () => {
			globalThis.fetch = jest.fn().mockResolvedValue({
				url: 'https://example.com/page',
				status: 200,
				headers: new Headers({ 'content-type': 'text/html' }),
				body: null,
			});

			const result = await fetchUrl('https://example.com/page');
			expect(result.status).toBe('success');
			expect(result.body).toBe('');
		});
	});

	describe('extractReadableContent', () => {
		it('should extract title and Markdown-formatted content from HTML', () => {
			const html = `
				<html>
				<head><title>Test Page</title></head>
				<body>
					<article>
						<h1>Test Page</h1>
						<h2>Section One</h2>
						<p>This is the main content of the page.</p>
						<p>It has a <a href="https://example.com/link">link</a> and <strong>bold</strong> text.</p>
					</article>
				</body>
				</html>
			`;

			const result = extractReadableContent(html, 'https://example.com/page');
			expect(result.title).toBe('Test Page');
			expect(result.content).toContain('main content');
			// Verify Markdown formatting is preserved
			expect(result.content).toContain('[link](https://example.com/link)');
			expect(result.content).toContain('**bold**');
			expect(result.content).toContain('## Section One');
			expect(result.truncated).toBe(false);
		});

		it('should handle HTML with no readable content', () => {
			const html = '<html><body></body></html>';
			const result = extractReadableContent(html, 'https://example.com/empty');
			expect(result.content).toBe('');
			expect(result.truncated).toBe(false);
		});

		it('should truncate content exceeding max chars', () => {
			// Generate content longer than WEB_FETCH_MAX_CONTENT_CHARS (30000)
			const longText = 'A'.repeat(40_000);
			const html = `
				<html>
				<head><title>Long Page</title></head>
				<body>
					<article>
						<p>${longText}</p>
					</article>
				</body>
				</html>
			`;

			const result = extractReadableContent(html, 'https://example.com/long');
			expect(result.truncated).toBe(true);
			expect(result.truncateReason).toContain('30000');
			expect(result.content.length).toBeLessThanOrEqual(30_000);
		});
	});

	describe('isUrlInUserMessages', () => {
		it('should find exact URL in a HumanMessage', () => {
			const messages = [new HumanMessage('Check out https://example.com/docs')];
			expect(isUrlInUserMessages('https://example.com/docs', messages)).toBe(true);
		});

		it('should match URL without trailing slash', () => {
			const messages = [new HumanMessage('See https://example.com/docs/')];
			expect(isUrlInUserMessages('https://example.com/docs', messages)).toBe(true);
		});

		it('should match URL with trailing slash when message has none', () => {
			const messages = [new HumanMessage('See https://example.com/docs')];
			expect(isUrlInUserMessages('https://example.com/docs/', messages)).toBe(true);
		});

		it('should return false for URL not in any message', () => {
			const messages = [new HumanMessage('Check https://other.com/page')];
			expect(isUrlInUserMessages('https://example.com/docs', messages)).toBe(false);
		});

		it('should ignore AI messages', () => {
			const messages = [new AIMessage('Visit https://example.com/docs')];
			expect(isUrlInUserMessages('https://example.com/docs', messages)).toBe(false);
		});

		it('should return false for empty messages array', () => {
			expect(isUrlInUserMessages('https://example.com/docs', [])).toBe(false);
		});

		it('should find URL across multiple messages', () => {
			const messages = [
				new HumanMessage('Hello'),
				new AIMessage('How can I help?'),
				new HumanMessage('Use https://example.com/api-docs for reference'),
			];
			expect(isUrlInUserMessages('https://example.com/api-docs', messages)).toBe(true);
		});
	});
});
