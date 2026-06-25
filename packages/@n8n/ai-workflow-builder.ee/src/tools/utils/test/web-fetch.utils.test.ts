import { HumanMessage, AIMessage } from '@langchain/core/messages';
import axios, { type AxiosRequestConfig } from 'axios';
import { createResultError, createResultOk } from 'n8n-workflow';
import type { LookupFunction } from 'node:net';
import { Readable } from 'node:stream';
import type { Mock } from 'vitest';

import { WEB_FETCH_MAX_BYTES } from '../../../constants';
import { CrossHostRedirectError, type SsrfGuard } from '../ssrf-guard';
import {
	normalizeHost,
	fetchUrl,
	extractReadableContent,
	isUrlInUserMessages,
} from '../web-fetch.utils';

vi.mock('axios', () => ({ __esModule: true, default: { get: vi.fn() } }));

const mockGet = axios.get as Mock;

/** Build a guard whose IP checks pass by default; override per test. */
function makeGuard(overrides: Partial<SsrfGuard> = {}): SsrfGuard {
	return {
		validateUrl: vi.fn(async () => createResultOk(undefined)),
		validateRedirectSync: vi.fn(),
		createSecureLookup: vi.fn((): LookupFunction => (() => {}) as unknown as LookupFunction),
		...overrides,
	};
}

/** Build an axios-style response wrapping a Node stream body. */
function axiosResponse(body: string | Buffer, contentType: string, responseUrl: string) {
	return {
		data: Readable.from([Buffer.from(body)]),
		status: 200,
		headers: { 'content-type': contentType },
		request: { res: { responseUrl } },
	};
}

describe('web-fetch.utils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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

	describe('fetchUrl', () => {
		it('returns success with body for a same-host response', async () => {
			mockGet.mockResolvedValue(
				axiosResponse(
					'<html><body>Hello</body></html>',
					'text/html; charset=utf-8',
					'https://example.com/page',
				),
			);

			const result = await fetchUrl('https://example.com/page', makeGuard());
			expect(result.status).toBe('success');
			expect(result.body).toContain('Hello');
			expect(result.httpStatus).toBe(200);
			expect(result.finalUrl).toBe('https://example.com/page');
		});

		it('runs a pre-flight SSRF check before connecting', async () => {
			const guard = makeGuard({
				validateUrl: vi.fn(async () => createResultError(new Error('blocked'))),
			});

			const result = await fetchUrl('http://10.0.0.1', guard);
			expect(result.status).toBe('blocked');
			expect(guard.validateUrl).toHaveBeenCalledWith('http://10.0.0.1');
			expect(mockGet).not.toHaveBeenCalled();
		});

		it('wires the secure lookup and a redirect-validating beforeRedirect into the request', async () => {
			const guard = makeGuard();
			mockGet.mockResolvedValue(axiosResponse('', 'text/html', 'https://example.com/page'));

			await fetchUrl('https://example.com/page', guard);

			expect(guard.createSecureLookup).toHaveBeenCalled();
			const config = (mockGet.mock.calls[0] as [string, AxiosRequestConfig])[1];
			expect(config.lookup).toBeDefined();
			expect(config.maxRedirects).toBeGreaterThan(0);

			const beforeRedirect = config.beforeRedirect as unknown as (opts: { href: string }) => void;

			// Same-host redirect: validated but allowed to proceed.
			expect(() => beforeRedirect({ href: 'https://example.com/other' })).not.toThrow();
			expect(guard.validateRedirectSync).toHaveBeenCalledWith('https://example.com/other');

			// Cross-host redirect: halted so the caller can run domain approval.
			expect(() => beforeRedirect({ href: 'https://evil.com/x' })).toThrow(CrossHostRedirectError);
		});

		it('returns redirect_new_host when axios surfaces a cross-host redirect', async () => {
			const wrapped = new Error('redirected', {
				cause: new CrossHostRedirectError('https://other-domain.com/page'),
			});
			mockGet.mockRejectedValue(wrapped);

			const result = await fetchUrl('https://example.com/page', makeGuard());
			expect(result.status).toBe('redirect_new_host');
			expect(result.finalUrl).toBe('https://other-domain.com/page');
		});

		it('returns blocked when axios surfaces an SSRF-blocked error', async () => {
			const ssrfErr = new Error('blocked ip');
			ssrfErr.name = 'SsrfBlockedIpError';
			mockGet.mockRejectedValue(new Error('connect failed', { cause: ssrfErr }));

			const result = await fetchUrl('https://evil.example.com', makeGuard());
			expect(result.status).toBe('blocked');
		});

		it('rethrows non-SSRF, non-redirect errors', async () => {
			mockGet.mockRejectedValue(new Error('ECONNABORTED'));
			await expect(fetchUrl('https://example.com', makeGuard())).rejects.toThrow('ECONNABORTED');
		});

		it('detects PDF content type and returns unsupported', async () => {
			const response = axiosResponse('%PDF-1.4', 'application/pdf', 'https://example.com/doc.pdf');
			const destroySpy = vi.spyOn(response.data, 'destroy');
			mockGet.mockResolvedValue(response);

			const result = await fetchUrl('https://example.com/doc.pdf', makeGuard());
			expect(result.status).toBe('unsupported');
			expect(result.reason).toBe('pdf');
			expect(destroySpy).toHaveBeenCalled();
		});

		it('caps the body at the maximum byte size', async () => {
			const oversized = Buffer.alloc(WEB_FETCH_MAX_BYTES + 1024, 0x61);
			mockGet.mockResolvedValue(axiosResponse(oversized, 'text/html', 'https://example.com/big'));

			const result = await fetchUrl('https://example.com/big', makeGuard());
			expect(result.status).toBe('success');
			expect(result.body?.length).toBe(WEB_FETCH_MAX_BYTES);
		});
	});

	describe('extractReadableContent', () => {
		it('should extract title and Markdown-formatted content from HTML', async () => {
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

			const result = await extractReadableContent(html, 'https://example.com/page');
			expect(result.title).toBe('Test Page');
			expect(result.content).toContain('main content');
			// Verify Markdown formatting is preserved
			expect(result.content).toContain('[link](https://example.com/link)');
			expect(result.content).toContain('**bold**');
			expect(result.content).toContain('## Section One');
			expect(result.truncated).toBe(false);
		});

		it('should handle HTML with no readable content', async () => {
			const html = '<html><body></body></html>';
			const result = await extractReadableContent(html, 'https://example.com/empty');
			expect(result.content).toBe('');
			expect(result.truncated).toBe(false);
		});

		it('should truncate content exceeding max chars', async () => {
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

			const result = await extractReadableContent(html, 'https://example.com/long');
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
