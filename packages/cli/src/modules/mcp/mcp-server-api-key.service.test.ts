import { testDb } from '@n8n/backend-test-utils';
import { ApiKeyRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';
import { createOwner } from '@test-integration/db/users';

import { McpServerApiKeyService } from './mcp-api-key.service';

const mockReqWith = (authHeader: string | undefined) => {
	const req = mockDeep<Request>();
	req.header.mockImplementation((name: string) => {
		if (name === 'authorization') return authHeader;
		return undefined;
	});
	return req;
};

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());

let userRepository: UserRepository;
let apiKeyRepository: ApiKeyRepository;
let mcpServerApiKeyService: McpServerApiKeyService;

describe('McpServerApiKeyService', () => {
	beforeEach(async () => {
		await testDb.truncate(['User', 'ApiKey']);
		jest.clearAllMocks();
	});

	beforeAll(async () => {
		await testDb.init();
		userRepository = Container.get(UserRepository);
		apiKeyRepository = Container.get(ApiKeyRepository);
		mcpServerApiKeyService = new McpServerApiKeyService(
			apiKeyRepository,
			jwtService,
			userRepository,
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getAuthMiddleware', () => {
		it('should return 401 if authorization header is missing', async () => {
			// Arrange
			const req = mockReqWith(undefined);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should throw error if authorization header does not start with Bearer', async () => {
			// Arrange
			const req = mockReqWith('Basic sometoken');
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act & Assert
			await expect(middleware(req, res, next)).rejects.toThrow(
				'Invalid authorization header format',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should throw error if authorization header has invalid Bearer format', async () => {
			// Arrange
			const req = mockReqWith('Bearer');
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act & Assert
			await expect(middleware(req, res, next)).rejects.toThrow(
				'Invalid authorization header format',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should return 401 if API key is not found in database', async () => {
			// Arrange
			const apiKey = jwtService.sign({
				sub: randomUUID(),
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			const req = mockReqWith(`Bearer ${apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should return 401 if JWT verification fails (invalid signature)', async () => {
			// Arrange
			const user = await createOwner();

			const wrongJwtService = new JwtService(
				mock<InstanceSettings>({ encryptionKey: 'wrong-key' }),
				mock(),
			);

			const apiKey = wrongJwtService.sign({
				sub: user.id,
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			// Use the service's repository to insert with proper ID generation
			const apiKeyEntity = apiKeyRepository.create({
				userId: user.id,
				apiKey,
				audience: 'mcp-server-api',
				scopes: [],
				label: 'MCP Server API Key',
			});

			await apiKeyRepository.save(apiKeyEntity);

			const req = mockReqWith(`Bearer ${apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should authenticate successfully with valid API key', async () => {
			// Arrange
			const user = await createOwner();
			const apiKeyEntity = await mcpServerApiKeyService.createMcpServerApiKey(user);

			const req = mockReqWith(`Bearer ${apiKeyEntity.apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
			expect(res.send).not.toHaveBeenCalled();
			// @ts-ignore
			expect(req.user).toBeDefined();
			// @ts-ignore
			expect(req.user.id).toBe(user.id);
		});

		it('should attach user with role information to request', async () => {
			// Arrange
			const user = await createOwner();
			const apiKeyEntity = await mcpServerApiKeyService.createMcpServerApiKey(user);

			const req = mockReqWith(`Bearer ${apiKeyEntity.apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
			// @ts-ignore
			expect(req.user).toBeDefined();
			// @ts-ignore
			expect(req.user.role).toBeDefined();
		});

		it('should handle Bearer token with exact case matching', async () => {
			// Arrange
			const user = await createOwner();
			const apiKeyEntity = await mcpServerApiKeyService.createMcpServerApiKey(user);

			const req = mockReqWith(`Bearer ${apiKeyEntity.apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('should throw error with non-standard Bearer casing', async () => {
			// Arrange
			const user = await createOwner();
			const apiKeyEntity = await mcpServerApiKeyService.createMcpServerApiKey(user);

			const req = mockReqWith(`BEARER ${apiKeyEntity.apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act & Assert
			await expect(middleware(req, res, next)).rejects.toThrow(
				'Invalid authorization header format',
			);
			expect(next).not.toHaveBeenCalled();
		});

		it('should return 401 if user is not found for valid JWT', async () => {
			// Arrange
			const apiKey = jwtService.sign({
				sub: randomUUID(),
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			const req = mockReqWith(`Bearer ${apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should return 401 for malformed JWT', async () => {
			// Arrange
			const req = mockReqWith('Bearer malformed.jwt.token');
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should handle Bearer token with extra whitespace', async () => {
			// Arrange
			const user = await createOwner();
			const apiKeyEntity = await mcpServerApiKeyService.createMcpServerApiKey(user);

			const req = mockReqWith(`Bearer    ${apiKeyEntity.apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(next).toHaveBeenCalled();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('should return 401 if API key exists but user is deleted', async () => {
			// Arrange
			const user = await createOwner();
			const apiKeyEntity = await mcpServerApiKeyService.createMcpServerApiKey(user);

			// Delete the user
			await userRepository.delete({ id: user.id });

			const req = mockReqWith(`Bearer ${apiKeyEntity.apiKey}`);
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act
			await middleware(req, res, next);

			// Assert
			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
			expect(next).not.toHaveBeenCalled();
		});

		it('should throw error with empty Bearer token', async () => {
			// Arrange
			const req = mockReqWith('Bearer ');
			const res = mockDeep<Response>();
			res.status.mockReturnThis();
			res.send.mockReturnThis();
			const next = jest.fn() as NextFunction;

			const middleware = mcpServerApiKeyService.getAuthMiddleware();

			// Act & Assert
			await expect(middleware(req, res, next)).rejects.toThrow(
				'Invalid authorization header format',
			);
			expect(next).not.toHaveBeenCalled();
		});
	});
});
