import type { Request } from 'express';
import { mock } from 'vitest-mock-extended';

import { sanitizeWebhookRequest } from '@/webhooks/webhook-request-sanitizer';

describe('webhookRequestSanitizer', () => {
	let mockRequest: Request;

	beforeEach(() => {
		mockRequest = mock<Request>();
	});

	describe('when no cookies are present', () => {
		it('should call next() without modifying request', () => {
			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBeUndefined();
		});

		it('should handle undefined cookies object', () => {
			(mockRequest.cookies as unknown) = undefined;

			sanitizeWebhookRequest(mockRequest);
		});
	});

	describe('when cookie is present in header', () => {
		it('should remove cookie from cookie header', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; other-cookie=value; another-cookie=test',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value; another-cookie=test');
		});

		it('should remove cookie when it is the only cookie', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('');
		});

		it('should remove cookie when it is the last cookie', () => {
			mockRequest.headers = {
				cookie: 'other-cookie=value; n8n-auth=abc123',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});

		it('should remove cookie when it is in the middle', () => {
			mockRequest.headers = {
				cookie: 'first-cookie=value1; n8n-auth=abc123; last-cookie=value2',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('first-cookie=value1; last-cookie=value2');
		});

		it('should handle multiple n8n-auth cookies', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; other-cookie=value; n8n-auth=def456',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});

		it('should handle whitespace around cookies', () => {
			mockRequest.headers = {
				cookie: '  n8n-auth=abc123  ;  other-cookie=value  ',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});

		it('should not remove cookies that start with n8n-auth but are not exact match', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth-extra=value; other-cookie=value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('n8n-auth-extra=value; other-cookie=value');
		});
	});

	describe('when cookie is not present in header', () => {
		it('should not modify cookie header when n8n-auth is not present', () => {
			const originalCookie = 'other-cookie=value; another-cookie=test';
			mockRequest.headers = {
				cookie: originalCookie,
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe(originalCookie);
		});

		it('should handle case sensitivity correctly', () => {
			mockRequest.headers = {
				cookie: 'N8N-AUTH=abc123; other-cookie=value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('N8N-AUTH=abc123; other-cookie=value');
		});
	});

	describe('when cookie is present in parsed cookies', () => {
		it('should remove n8n-auth from parsed cookies object', () => {
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
				'other-cookie': 'value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
		});

		it('should handle when n8n-auth is the only cookie in parsed cookies', () => {
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.cookies).toEqual({});
		});

		it('should not modify other cookies when n8n-auth is not present in parsed cookies', () => {
			const originalCookies = {
				'other-cookie': 'value',
				'another-cookie': 'test',
			};
			mockRequest.cookies = { ...originalCookies };

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.cookies).toEqual(originalCookies);
		});
	});

	describe('when both header and parsed cookies contain n8n-auth', () => {
		it('should remove n8n-auth from both header and parsed cookies', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; other-cookie=value',
			};
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
				'other-cookie': 'value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
		});
	});

	describe('edge cases', () => {
		it('should handle empty cookie header', () => {
			mockRequest.headers = {
				cookie: '',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('');
		});

		it('should handle cookie header with only whitespace', () => {
			mockRequest.headers = {
				cookie: '   ',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('   ');
		});

		it('should handle cookie header with only semicolons', () => {
			mockRequest.headers = {
				cookie: ';;;',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe(';;;');
		});

		it('should handle malformed cookies without equals sign', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth; other-cookie=value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});
	});

	describe('when n8n-browserId is present in header', () => {
		it('should remove n8n-browserId from cookie header', () => {
			mockRequest.headers = {
				cookie: 'n8n-browserId=abc123; other-cookie=value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});

		it('should remove n8n-browserId from parsed cookies', () => {
			mockRequest.cookies = {
				'n8n-browserId': 'abc123',
				'other-cookie': 'value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
		});

		it('should remove both n8n-auth and n8n-browserId from cookie header', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; n8n-browserId=def456; other-cookie=value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});

		it('should remove both n8n-auth and n8n-browserId from parsed cookies', () => {
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
				'n8n-browserId': 'def456',
				'other-cookie': 'value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
		});
	});

	// The form endpoints skip sanitizing for their own node types, so removing these
	// here only affects the webhooks that have no use for them. The form auth cookie
	// names embed the workflow or execution they were minted for, hence the suffixes.
	describe('when the form cookies are present', () => {
		const formCookieNames = [
			'n8n-form-auth-wf-a-workflow-id',
			'n8n-form-auth-ex-12345',
			'n8n-form-oauth',
		];

		it.each(formCookieNames)('should remove %s from the header', (name) => {
			mockRequest.headers = {
				cookie: `${name}=abc123; other-cookie=value`,
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});

		it.each(formCookieNames)('should remove %s from parsed cookies', (name) => {
			mockRequest.cookies = {
				[name]: 'abc123',
				'other-cookie': 'value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
		});

		it('should leave an unrelated cookie that merely begins with the prefix', () => {
			mockRequest.headers = {
				cookie: 'n8n-form-authentic=abc123; n8n-form-auth-ex-12345=def',
			};
			mockRequest.cookies = {
				'n8n-form-authentic': 'abc123',
				'n8n-form-auth-ex-12345': 'def',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('n8n-form-authentic=abc123');
			expect(mockRequest.cookies).toEqual({ 'n8n-form-authentic': 'abc123' });
		});

		it('should remove every disallowed cookie in one pass', () => {
			mockRequest.headers = {
				cookie:
					'n8n-auth=a; n8n-browserId=b; n8n-form-auth-ex-12345=c; n8n-form-oauth=d; other-cookie=value',
			};
			mockRequest.cookies = {
				'n8n-auth': 'a',
				'n8n-browserId': 'b',
				'n8n-form-auth-ex-12345': 'c',
				'n8n-form-oauth': 'd',
				'other-cookie': 'value',
			};

			sanitizeWebhookRequest(mockRequest);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
			expect(mockRequest.cookies).toEqual({ 'other-cookie': 'value' });
		});
	});
});
