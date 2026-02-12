import { mock } from 'jest-mock-extended';
import type { Request } from 'express';
import type { AuthService } from '@/auth/auth.service';
import { DynamicCredentialWebService } from '../dynamic-credential-web.service';

describe('DynamicCredentialWebService', () => {
	let service: DynamicCredentialWebService;
	let mockAuthService: jest.Mocked<AuthService>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockAuthService = mock<AuthService>({
			getCookieToken: jest.fn(),
			getBrowserId: jest.fn(),
			getMethod: jest.fn(),
			getEndpoint: jest.fn(),
		});

		service = new DynamicCredentialWebService(mockAuthService);
	});

	describe('getCredentialContextFromRequest', () => {
		describe('with explicit authSource=bearer', () => {
			it('should extract bearer token when authSource query param is "bearer"', () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'Bearer my-token-123' },
				});

				const result = service.getCredentialContextFromRequest(req);

				expect(result).toEqual({
					identity: 'my-token-123',
					version: 1,
					metadata: {},
				});
				expect(mockAuthService.getCookieToken).not.toHaveBeenCalled();
			});

			it('should accept case-insensitive bearer prefix', () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'bearer lowercase-token' },
				});

				const result = service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('lowercase-token');
			});

			it('should accept mixed-case bearer prefix', () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'BeArEr mixed-case-token' },
				});

				const result = service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('mixed-case-token');
			});

			it('should throw error when bearer token is missing with authSource=bearer', () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: {},
				});

				expect(() => service.getCredentialContextFromRequest(req)).toThrow(
					'Bearer token is missing',
				);
			});

			it('should throw error when authorization header has no Bearer prefix', () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'token-without-bearer' },
				});

				expect(() => service.getCredentialContextFromRequest(req)).toThrow(
					'Bearer token is missing',
				);
			});

			it('should throw error when bearer token is empty after prefix', () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'Bearer ' },
				});

				expect(() => service.getCredentialContextFromRequest(req)).toThrow(
					'Bearer token is missing',
				);
			});
		});

		describe('with explicit authSource=cookie', () => {
			it('should extract cookie token when authSource query param is "cookie"', () => {
				const req = mock<Request>({
					query: { authSource: 'cookie' },
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-session-123');
				mockAuthService.getBrowserId.mockReturnValue('browser-abc');
				mockAuthService.getMethod.mockReturnValue('GET');
				mockAuthService.getEndpoint.mockReturnValue('/api/test');

				const result = service.getCredentialContextFromRequest(req);

				expect(result).toEqual({
					identity: 'cookie-session-123',
					version: 1,
					metadata: {
						source: 'cookie-source',
						browserId: 'browser-abc',
						method: 'GET',
						endpoint: '/api/test',
					},
				});
				expect(mockAuthService.getCookieToken).toHaveBeenCalledWith(req);
				expect(mockAuthService.getBrowserId).toHaveBeenCalledWith(req);
				expect(mockAuthService.getMethod).toHaveBeenCalledWith(req);
				expect(mockAuthService.getEndpoint).toHaveBeenCalledWith(req);
			});

			it('should throw error when session cookie is missing with authSource=cookie', () => {
				const req = mock<Request>({
					query: { authSource: 'cookie' },
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue(undefined);

				expect(() => service.getCredentialContextFromRequest(req)).toThrow(
					'Session cookie is missing',
				);
			});
		});

		describe('fallback behavior (no authSource query param)', () => {
			it('should extract bearer token when present without authSource param', () => {
				const req = mock<Request>({
					query: {},
					headers: { authorization: 'Bearer fallback-token' },
				});

				const result = service.getCredentialContextFromRequest(req);

				expect(result).toEqual({
					identity: 'fallback-token',
					version: 1,
					metadata: {},
				});
				expect(mockAuthService.getCookieToken).not.toHaveBeenCalled();
			});

			it('should fall back to cookie when bearer token is not present', () => {
				const req = mock<Request>({
					query: {},
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-fallback-123');
				mockAuthService.getBrowserId.mockReturnValue('browser-xyz');
				mockAuthService.getMethod.mockReturnValue('POST');
				mockAuthService.getEndpoint.mockReturnValue('/api/workflow');

				const result = service.getCredentialContextFromRequest(req);

				expect(result).toEqual({
					identity: 'cookie-fallback-123',
					version: 1,
					metadata: {
						source: 'cookie-source',
						browserId: 'browser-xyz',
						method: 'POST',
						endpoint: '/api/workflow',
					},
				});
				expect(mockAuthService.getCookieToken).toHaveBeenCalledWith(req);
			});

			it('should fall back to cookie when authorization header is malformed', () => {
				const req = mock<Request>({
					query: {},
					headers: { authorization: 'malformed-header' },
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-fallback-456');
				mockAuthService.getBrowserId.mockReturnValue('browser-123');
				mockAuthService.getMethod.mockReturnValue('GET');
				mockAuthService.getEndpoint.mockReturnValue('/api/test');

				const result = service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('cookie-fallback-456');
				expect(mockAuthService.getCookieToken).toHaveBeenCalledWith(req);
			});

			it('should throw error when both bearer and cookie are missing', () => {
				const req = mock<Request>({
					query: {},
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue(undefined);

				expect(() => service.getCredentialContextFromRequest(req)).toThrow(
					'Session cookie is missing',
				);
			});
		});

		describe('edge cases', () => {
			it('should handle bearer token with special characters', () => {
				const specialToken = 'token-with-special!@#$%^&*()chars';
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: `Bearer ${specialToken}` },
				});

				const result = service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe(specialToken);
			});

			it('should handle very long bearer tokens', () => {
				const longToken = 'a'.repeat(1000);
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: `Bearer ${longToken}` },
				});

				const result = service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe(longToken);
			});

			it('should handle undefined browserId from AuthService', () => {
				const req = mock<Request>({
					query: { authSource: 'cookie' },
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-token');
				mockAuthService.getBrowserId.mockReturnValue(undefined);
				mockAuthService.getMethod.mockReturnValue('GET');
				mockAuthService.getEndpoint.mockReturnValue('/api/test');

				const result = service.getCredentialContextFromRequest(req);

				expect(result.metadata).toEqual({
					source: 'cookie-source',
					browserId: undefined,
					method: 'GET',
					endpoint: '/api/test',
				});
			});

			it('should prioritize authSource=bearer over existing bearer token in fallback mode', () => {
				const req = mock<Request>({
					query: { authSource: 'cookie' },
					headers: { authorization: 'Bearer should-be-ignored' },
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-token');
				mockAuthService.getBrowserId.mockReturnValue('browser-id');
				mockAuthService.getMethod.mockReturnValue('GET');
				mockAuthService.getEndpoint.mockReturnValue('/api/test');

				const result = service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('cookie-token');
				expect(result.metadata?.source).toBe('cookie-source');
			});

			it('should handle empty query object', () => {
				const req = mock<Request>({
					query: {},
					headers: { authorization: 'Bearer empty-query-token' },
				});

				const result = service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('empty-query-token');
			});

			it('should handle authSource with invalid value', () => {
				const req = mock<Request>({
					query: { authSource: 'invalid' as any },
					headers: { authorization: 'Bearer token' },
				});

				// Should fall back to default behavior (bearer first)
				const result = service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('token');
			});
		});
	});
});
