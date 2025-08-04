'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const webhook_request_sanitizer_1 = require('@/webhooks/webhook-request-sanitizer');
describe('webhookRequestSanitizer', () => {
	let mockRequest;
	beforeEach(() => {
		mockRequest = (0, jest_mock_extended_1.mock)();
	});
	describe('when no cookies are present', () => {
		it('should call next() without modifying request', () => {
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBeUndefined();
		});
		it('should handle undefined cookies object', () => {
			mockRequest.cookies = undefined;
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
		});
	});
	describe('when cookie is present in header', () => {
		it('should remove cookie from cookie header', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; other-cookie=value; another-cookie=test',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('other-cookie=value; another-cookie=test');
		});
		it('should remove cookie when it is the only cookie', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('');
		});
		it('should remove cookie when it is the last cookie', () => {
			mockRequest.headers = {
				cookie: 'other-cookie=value; n8n-auth=abc123',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});
		it('should remove cookie when it is in the middle', () => {
			mockRequest.headers = {
				cookie: 'first-cookie=value1; n8n-auth=abc123; last-cookie=value2',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('first-cookie=value1; last-cookie=value2');
		});
		it('should handle multiple n8n-auth cookies', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; other-cookie=value; n8n-auth=def456',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});
		it('should handle whitespace around cookies', () => {
			mockRequest.headers = {
				cookie: '  n8n-auth=abc123  ;  other-cookie=value  ',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});
		it('should not remove cookies that start with n8n-auth but are not exact match', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth-extra=value; other-cookie=value',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('n8n-auth-extra=value; other-cookie=value');
		});
	});
	describe('when cookie is not present in header', () => {
		it('should not modify cookie header when n8n-auth is not present', () => {
			const originalCookie = 'other-cookie=value; another-cookie=test';
			mockRequest.headers = {
				cookie: originalCookie,
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe(originalCookie);
		});
		it('should handle case sensitivity correctly', () => {
			mockRequest.headers = {
				cookie: 'N8N-AUTH=abc123; other-cookie=value',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('N8N-AUTH=abc123; other-cookie=value');
		});
	});
	describe('when cookie is present in parsed cookies', () => {
		it('should remove n8n-auth from parsed cookies object', () => {
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
				'other-cookie': 'value',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
		});
		it('should handle when n8n-auth is the only cookie in parsed cookies', () => {
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.cookies).toEqual({});
		});
		it('should not modify other cookies when n8n-auth is not present in parsed cookies', () => {
			const originalCookies = {
				'other-cookie': 'value',
				'another-cookie': 'test',
			};
			mockRequest.cookies = { ...originalCookies };
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
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
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
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
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('');
		});
		it('should handle cookie header with only whitespace', () => {
			mockRequest.headers = {
				cookie: '   ',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('   ');
		});
		it('should handle cookie header with only semicolons', () => {
			mockRequest.headers = {
				cookie: ';;;',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe(';;;');
		});
		it('should handle malformed cookies without equals sign', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth; other-cookie=value',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});
	});
	describe('when n8n-browserId is present in header', () => {
		it('should remove n8n-browserId from cookie header', () => {
			mockRequest.headers = {
				cookie: 'n8n-browserId=abc123; other-cookie=value',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});
		it('should remove n8n-browserId from parsed cookies', () => {
			mockRequest.cookies = {
				'n8n-browserId': 'abc123',
				'other-cookie': 'value',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
		});
		it('should remove both n8n-auth and n8n-browserId from cookie header', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; n8n-browserId=def456; other-cookie=value',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
		});
		it('should remove both n8n-auth and n8n-browserId from parsed cookies', () => {
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
				'n8n-browserId': 'def456',
				'other-cookie': 'value',
			};
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(mockRequest);
			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
		});
	});
});
//# sourceMappingURL=webhook-request-sanitizer.test.js.map
