import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { Request, Response, NextFunction } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';
import { Telemetry } from '@/telemetry';

import { McpServerApiKeyService } from '../mcp-api-key.service';
import { McpOAuthTokenService } from '../mcp-oauth-token.service';
import { McpServerMiddlewareService } from '../mcp-server-middleware.service';

const mockReqWith = (authHeader: string | undefined, body?: any) => {
	const req = mockDeep<Request>();
	req.header.mockImplementation((name: string) => {
		if (name === 'authorization') return authHeader;
		return undefined;
	});
	req.body = body || {};
	return req;
};

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());

let mcpServerApiKeyService: jest.Mocked<McpServerApiKeyService>;
let oauthTokenService: jest.Mocked<McpOAuthTokenService>;
let telemetry: jest.Mocked<Telemetry>;
let service: McpServerMiddlewareService;

describe('McpServerMiddlewareService', () => {
	beforeAll(() => {
		mcpServerApiKeyService = mockInstance(
			McpServerApiKeyService,
		) as jest.Mocked<McpServerApiKeyService>;
		oauthTokenService = mockInstance(McpOAuthTokenService) as jest.Mocked<McpOAuthTokenService>;
		telemetry = mockInstance(Telemetry);

		service = new McpServerMiddlewareService(
			mcpServerApiKeyService,
			oauthTokenService,
			jwtService,
			telemetry,
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getUserForToken', () => {
		it('should return user for valid OAuth token (meta.isOAuth = true)', async () => {
			const user = mock<User>({ id: 'user-123' });
			const oauthToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
				meta: { isOAuth: true },
			});

			oauthTokenService.verifyOAuthAccessToken.mockResolvedValue(user);

			const result = await service.getUserForToken(oauthToken);

			expect(result).toEqual(user);
			expect(oauthTokenService.verifyOAuthAccessToken).toHaveBeenCalledWith(oauthToken);
			expect(mcpServerApiKeyService.verifyApiKey).not.toHaveBeenCalled();
		});

		it('should return user for valid API key (no meta.isOAuth)', async () => {
			const user = mock<User>({ id: 'user-123' });
			const apiKeyToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
			});

			mcpServerApiKeyService.verifyApiKey.mockResolvedValue(user);

			const result = await service.getUserForToken(apiKeyToken);

			expect(result).toEqual(user);
			expect(mcpServerApiKeyService.verifyApiKey).toHaveBeenCalledWith(apiKeyToken);
			expect(oauthTokenService.verifyOAuthAccessToken).not.toHaveBeenCalled();
		});

		it('should return user for valid API key (meta.isOAuth = false)', async () => {
			const user = mock<User>({ id: 'user-123' });
			const apiKeyToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
				meta: { isOAuth: false },
			});

			mcpServerApiKeyService.verifyApiKey.mockResolvedValue(user);

			const result = await service.getUserForToken(apiKeyToken);

			expect(result).toEqual(user);
			expect(mcpServerApiKeyService.verifyApiKey).toHaveBeenCalledWith(apiKeyToken);
			expect(oauthTokenService.verifyOAuthAccessToken).not.toHaveBeenCalled();
		});

		it('should return null for invalid JWT format', async () => {
			const invalidToken = 'not-a-jwt-token';

			mcpServerApiKeyService.verifyApiKey.mockResolvedValue(null);
			const result = await service.getUserForToken(invalidToken);

			expect(result).toBeNull();
			expect(oauthTokenService.verifyOAuthAccessToken).not.toHaveBeenCalled();
		});

		it('should return null when OAuth token verification fails', async () => {
			const oauthToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
				meta: { isOAuth: true },
			});

			oauthTokenService.verifyOAuthAccessToken.mockResolvedValue(null);

			const result = await service.getUserForToken(oauthToken);

			expect(result).toBeNull();
		});

		it('should return null when API key verification fails', async () => {
			const apiKeyToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
			});

			mcpServerApiKeyService.verifyApiKey.mockResolvedValue(null);

			const result = await service.getUserForToken(apiKeyToken);

			expect(result).toBeNull();
		});
	});

	describe('getAuthMiddleware', () => {
		it('should return 401 when authorization header is missing', async () => {
			const req = mockReqWith(undefined);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = service.getAuthMiddleware();

			await middleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith('User connected to MCP server', {
				mcp_connection_status: 'error',
				error: 'Unauthorized',
				client_name: undefined,
				client_version: undefined,
			});
		});

		it('should throw error when authorization header does not start with Bearer', async () => {
			const req = mockReqWith('Basic sometoken');
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = service.getAuthMiddleware();

			await expect(middleware(req, res, next)).rejects.toThrow(
				'Invalid authorization header format',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should throw error when Bearer token is malformed', async () => {
			const req = mockReqWith('Bearer');
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = service.getAuthMiddleware();

			await expect(middleware(req, res, next)).rejects.toThrow(
				'Invalid authorization header format',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should authenticate with valid OAuth token and call next', async () => {
			const user = mock<User>({ id: 'user-123' });
			const oauthToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
				meta: { isOAuth: true },
			});

			const req = mockReqWith(`Bearer ${oauthToken}`);
			const res = mockDeep<Response>();
			const next = jest.fn() as NextFunction;

			oauthTokenService.verifyOAuthAccessToken.mockResolvedValue(user);

			const middleware = service.getAuthMiddleware();

			await middleware(req, res, next);

			expect((req as any).user).toEqual(user);
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('should authenticate with valid API key and call next', async () => {
			const user = mock<User>({ id: 'user-123' });
			const apiKeyToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
			});

			const req = mockReqWith(`Bearer ${apiKeyToken}`);
			const res = mockDeep<Response>();
			const next = jest.fn() as NextFunction;

			mcpServerApiKeyService.verifyApiKey.mockResolvedValue(user);

			const middleware = service.getAuthMiddleware();

			await middleware(req, res, next);

			expect((req as any).user).toEqual(user);
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('should return 401 when token validation fails', async () => {
			const invalidToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
				meta: { isOAuth: true },
			});

			const req = mockReqWith(`Bearer ${invalidToken}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			oauthTokenService.verifyOAuthAccessToken.mockResolvedValue(null);

			const middleware = service.getAuthMiddleware();

			await middleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should track telemetry with client info from request body', async () => {
			const req = mockReqWith(undefined, {
				params: {
					clientInfo: {
						name: 'test-client',
						version: '1.0.0',
					},
				},
			});
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = service.getAuthMiddleware();

			await middleware(req, res, next);

			expect(telemetry.track).toHaveBeenCalledWith('User connected to MCP server', {
				mcp_connection_status: 'error',
				error: 'Unauthorized',
				client_name: 'test-client',
				client_version: '1.0.0',
			});
		});

		it('should handle invalid token format gracefully', async () => {
			const req = mockReqWith('Bearer invalid-token-format');
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			mcpServerApiKeyService.verifyApiKey.mockResolvedValue(null);

			const middleware = service.getAuthMiddleware();

			await middleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
		});
	});
});
