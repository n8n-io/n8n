import { mock } from 'jest-mock-extended';
import type { Request } from 'express';
import type { AuthService } from '@/auth/auth.service';
import type { SlackAuthService } from '../slack-auth.service';
import { DynamicCredentialWebService } from '../dynamic-credential-web.service';

describe('DynamicCredentialWebService', () => {
	let service: DynamicCredentialWebService;
	let mockAuthService: jest.Mocked<AuthService>;
	let mockSlackAuthService: jest.Mocked<SlackAuthService>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockAuthService = mock<AuthService>({
			getCookieToken: jest.fn(),
			getBrowserId: jest.fn(),
			getMethod: jest.fn(),
			getEndpoint: jest.fn(),
		});

		mockSlackAuthService = mock<SlackAuthService>({
			buildSlackCredentialContext: jest.fn(),
		});

		service = new DynamicCredentialWebService(mockAuthService, mockSlackAuthService);
	});

	describe('getCredentialContextFromRequest', () => {
		describe('with explicit authSource=bearer', () => {
			it('should extract bearer token when authSource query param is "bearer"', async () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'Bearer my-token-123' },
				});

				const result = await service.getCredentialContextFromRequest(req);

				expect(result).toEqual({
					identity: 'my-token-123',
					version: 1,
					metadata: {},
				});
				expect(mockAuthService.getCookieToken).not.toHaveBeenCalled();
			});

			it('should accept case-insensitive bearer prefix', async () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'bearer lowercase-token' },
				});

				const result = await service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('lowercase-token');
			});

			it('should accept mixed-case bearer prefix', async () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'BeArEr mixed-case-token' },
				});

				const result = await service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('mixed-case-token');
			});

			it('should throw error when bearer token is missing with authSource=bearer', async () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: {},
				});

				await expect(service.getCredentialContextFromRequest(req)).rejects.toThrow(
					'Bearer token is missing',
				);
			});

			it('should throw error when authorization header has no Bearer prefix', async () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'token-without-bearer' },
				});

				await expect(service.getCredentialContextFromRequest(req)).rejects.toThrow(
					'Bearer token is missing',
				);
			});

			it('should throw error when bearer token is empty after prefix', async () => {
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: 'Bearer ' },
				});

				await expect(service.getCredentialContextFromRequest(req)).rejects.toThrow(
					'Bearer token is missing',
				);
			});
		});

		describe('with explicit authSource=cookie', () => {
			it('should extract cookie token when authSource query param is "cookie"', async () => {
				const req = mock<Request>({
					query: { authSource: 'cookie' },
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-session-123');
				mockAuthService.getBrowserId.mockReturnValue('browser-abc');
				mockAuthService.getMethod.mockReturnValue('GET');
				mockAuthService.getEndpoint.mockReturnValue('/api/test');

				const result = await service.getCredentialContextFromRequest(req);

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

			it('should throw error when session cookie is missing with authSource=cookie', async () => {
				const req = mock<Request>({
					query: { authSource: 'cookie' },
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue(undefined);

				await expect(service.getCredentialContextFromRequest(req)).rejects.toThrow(
					'Session cookie is missing',
				);
			});
		});

		describe('with explicit authSource=slack', () => {
			it('should delegate to SlackAuthService', async () => {
				const req = mock<Request>({
					query: { authSource: 'slack' },
					headers: {},
				});

				const expectedContext = {
					identity: 'U0A293J0RFV',
					version: 1 as const,
					metadata: { source: 'slack-request', teamId: 'TG9695PUK' },
				};
				mockSlackAuthService.buildSlackCredentialContext.mockResolvedValue(expectedContext);

				const result = await service.getCredentialContextFromRequest(req, 'workflow-1');

				expect(result).toEqual(expectedContext);
				expect(mockSlackAuthService.buildSlackCredentialContext).toHaveBeenCalledWith(
					req,
					'workflow-1',
				);
			});

			it('should throw when workflowId is not provided', async () => {
				const req = mock<Request>({
					query: { authSource: 'slack' },
					headers: {},
				});

				await expect(service.getCredentialContextFromRequest(req)).rejects.toThrow(
					'workflowId is required for Slack authentication',
				);
			});
		});

		describe('fallback behavior (no authSource query param)', () => {
			it('should extract bearer token when present without authSource param', async () => {
				const req = mock<Request>({
					query: {},
					headers: { authorization: 'Bearer fallback-token' },
				});

				const result = await service.getCredentialContextFromRequest(req);

				expect(result).toEqual({
					identity: 'fallback-token',
					version: 1,
					metadata: {},
				});
				expect(mockAuthService.getCookieToken).not.toHaveBeenCalled();
			});

			it('should fall back to cookie when bearer token is not present', async () => {
				const req = mock<Request>({
					query: {},
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-fallback-123');
				mockAuthService.getBrowserId.mockReturnValue('browser-xyz');
				mockAuthService.getMethod.mockReturnValue('POST');
				mockAuthService.getEndpoint.mockReturnValue('/api/workflow');

				const result = await service.getCredentialContextFromRequest(req);

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

			it('should fall back to cookie when authorization header is malformed', async () => {
				const req = mock<Request>({
					query: {},
					headers: { authorization: 'malformed-header' },
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-fallback-456');
				mockAuthService.getBrowserId.mockReturnValue('browser-123');
				mockAuthService.getMethod.mockReturnValue('GET');
				mockAuthService.getEndpoint.mockReturnValue('/api/test');

				const result = await service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('cookie-fallback-456');
				expect(mockAuthService.getCookieToken).toHaveBeenCalledWith(req);
			});

			it('should throw error when both bearer and cookie are missing', async () => {
				const req = mock<Request>({
					query: {},
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue(undefined);

				await expect(service.getCredentialContextFromRequest(req)).rejects.toThrow(
					'Session cookie is missing',
				);
			});
		});

		describe('edge cases', () => {
			it('should handle bearer token with special characters', async () => {
				const specialToken = 'token-with-special!@#$%^&*()chars';
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: `Bearer ${specialToken}` },
				});

				const result = await service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe(specialToken);
			});

			it('should handle very long bearer tokens', async () => {
				const longToken = 'a'.repeat(1000);
				const req = mock<Request>({
					query: { authSource: 'bearer' },
					headers: { authorization: `Bearer ${longToken}` },
				});

				const result = await service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe(longToken);
			});

			it('should handle undefined browserId from AuthService', async () => {
				const req = mock<Request>({
					query: { authSource: 'cookie' },
					headers: {},
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-token');
				mockAuthService.getBrowserId.mockReturnValue(undefined);
				mockAuthService.getMethod.mockReturnValue('GET');
				mockAuthService.getEndpoint.mockReturnValue('/api/test');

				const result = await service.getCredentialContextFromRequest(req);

				expect(result.metadata).toEqual({
					source: 'cookie-source',
					browserId: undefined,
					method: 'GET',
					endpoint: '/api/test',
				});
			});

			it('should prioritize authSource=bearer over existing bearer token in fallback mode', async () => {
				const req = mock<Request>({
					query: { authSource: 'cookie' },
					headers: { authorization: 'Bearer should-be-ignored' },
				});

				mockAuthService.getCookieToken.mockReturnValue('cookie-token');
				mockAuthService.getBrowserId.mockReturnValue('browser-id');
				mockAuthService.getMethod.mockReturnValue('GET');
				mockAuthService.getEndpoint.mockReturnValue('/api/test');

				const result = await service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('cookie-token');
				expect(result.metadata?.source).toBe('cookie-source');
			});

			it('should handle empty query object', async () => {
				const req = mock<Request>({
					query: {},
					headers: { authorization: 'Bearer empty-query-token' },
				});

				const result = await service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('empty-query-token');
			});

			it('should handle authSource with invalid value', async () => {
				const req = mock<Request>({
					query: { authSource: 'invalid' as any },
					headers: { authorization: 'Bearer token' },
				});

				// Should fall back to default behavior (bearer first)
				const result = await service.getCredentialContextFromRequest(req);

				expect(result.identity).toBe('token');
			});
		});
	});
});
