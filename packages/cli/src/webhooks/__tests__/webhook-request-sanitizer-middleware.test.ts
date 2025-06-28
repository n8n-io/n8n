import type { Request, Response, NextFunction } from 'express';
import { mock } from 'jest-mock-extended';

import { webhookRequestSanitizer } from '@/webhooks/webhook-request-sanitizer-middleware';

describe('webhookRequestSanitizer', () => {
	let mockRequest: Request;
	let mockResponse: Response;
	let mockNext: NextFunction;

	beforeEach(() => {
		mockRequest = mock<Request>();
		mockResponse = mock<Response>();
		mockNext = jest.fn();
	});

	describe('when no cookies are present', () => {
		it('should call next() without modifying request', () => {
			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.headers.cookie).toBeUndefined();
		});

		it('should handle undefined cookies object', () => {
			(mockRequest.cookies as unknown) = undefined;

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockNext).toHaveBeenCalledWith();
		});
	});

	describe('when cookie is present in header', () => {
		it('should remove cookie from cookie header', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; other-cookie=value; another-cookie=test',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value;another-cookie=test');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should remove cookie when it is the only cookie', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should remove cookie when it is the last cookie', () => {
			mockRequest.headers = {
				cookie: 'other-cookie=value; n8n-auth=abc123',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should remove cookie when it is in the middle', () => {
			mockRequest.headers = {
				cookie: 'first-cookie=value1; n8n-auth=abc123; last-cookie=value2',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('first-cookie=value1;last-cookie=value2');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should handle multiple n8n-auth cookies', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth=abc123; other-cookie=value; n8n-auth=def456',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should handle whitespace around cookies', () => {
			mockRequest.headers = {
				cookie: '  n8n-auth=abc123  ;  other-cookie=value  ',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should not remove cookies that start with n8n-auth but are not exact match', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth-extra=value; other-cookie=value',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('n8n-auth-extra=value; other-cookie=value');
			expect(mockNext).toHaveBeenCalledWith();
		});
	});

	describe('when cookie is not present in header', () => {
		it('should not modify cookie header when n8n-auth is not present', () => {
			const originalCookie = 'other-cookie=value; another-cookie=test';
			mockRequest.headers = {
				cookie: originalCookie,
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe(originalCookie);
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should handle case sensitivity correctly', () => {
			mockRequest.headers = {
				cookie: 'N8N-AUTH=abc123; other-cookie=value',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('N8N-AUTH=abc123; other-cookie=value');
			expect(mockNext).toHaveBeenCalledWith();
		});
	});

	describe('when cookie is present in parsed cookies', () => {
		it('should remove n8n-auth from parsed cookies object', () => {
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
				'other-cookie': 'value',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should handle when n8n-auth is the only cookie in parsed cookies', () => {
			mockRequest.cookies = {
				'n8n-auth': 'abc123',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.cookies).toEqual({});
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should not modify other cookies when n8n-auth is not present in parsed cookies', () => {
			const originalCookies = {
				'other-cookie': 'value',
				'another-cookie': 'test',
			};
			mockRequest.cookies = { ...originalCookies };

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.cookies).toEqual(originalCookies);
			expect(mockNext).toHaveBeenCalledWith();
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

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('other-cookie=value');
			expect(mockRequest.cookies).toEqual({
				'other-cookie': 'value',
			});
			expect(mockNext).toHaveBeenCalledWith();
		});
	});

	describe('edge cases', () => {
		it('should handle empty cookie header', () => {
			mockRequest.headers = {
				cookie: '',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should handle cookie header with only whitespace', () => {
			mockRequest.headers = {
				cookie: '   ',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('   ');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should handle cookie header with only semicolons', () => {
			mockRequest.headers = {
				cookie: ';;;',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe(';;;');
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should handle malformed cookies without equals sign', () => {
			mockRequest.headers = {
				cookie: 'n8n-auth; other-cookie=value',
			};

			webhookRequestSanitizer(mockRequest, mockResponse, mockNext);

			expect(mockRequest.headers.cookie).toBe('n8n-auth; other-cookie=value');
			expect(mockNext).toHaveBeenCalledWith();
		});
	});
});
