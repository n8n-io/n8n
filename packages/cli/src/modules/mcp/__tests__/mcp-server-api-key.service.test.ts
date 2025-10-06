import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ApiKeyRepository, UserRepository } from '@n8n/db';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';

import { McpServerApiKeyService } from '../mcp-api-key.service';

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

let userRepository: jest.Mocked<UserRepository>;
let apiKeyRepository: jest.Mocked<ApiKeyRepository>;
let mcpServerApiKeyService: McpServerApiKeyService;

describe('McpServerApiKeyService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	beforeAll(() => {
		userRepository = mockInstance(UserRepository);
		apiKeyRepository = mockInstance(ApiKeyRepository);
		mcpServerApiKeyService = new McpServerApiKeyService(
			apiKeyRepository,
			jwtService,
			userRepository,
		);
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

			userRepository.findOne.mockResolvedValue(null);

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
			const userId = randomUUID();
			const mockUser = mockDeep<User>();
			mockUser.id = userId;

			const wrongJwtService = new JwtService(
				mock<InstanceSettings>({ encryptionKey: 'wrong-key' }),
				mock(),
			);

			const apiKey = wrongJwtService.sign({
				sub: userId,
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			userRepository.findOne.mockResolvedValue(mockUser);

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
			const userId = randomUUID();
			const mockUser = mockDeep<User>();
			mockUser.id = userId;

			const apiKey = jwtService.sign({
				sub: userId,
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			userRepository.findOne.mockResolvedValue(mockUser);

			const req = mockReqWith(`Bearer ${apiKey}`);
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
			expect(req.user.id).toBe(userId);
		});

		it('should attach user with role information to request', async () => {
			// Arrange
			const userId = randomUUID();
			const mockUser = mockDeep<User>();
			mockUser.id = userId;

			const apiKey = jwtService.sign({
				sub: userId,
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			userRepository.findOne.mockResolvedValue(mockUser);

			const req = mockReqWith(`Bearer ${apiKey}`);
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
			const userId = randomUUID();
			const mockUser = mockDeep<User>();
			mockUser.id = userId;

			const apiKey = jwtService.sign({
				sub: userId,
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			userRepository.findOne.mockResolvedValue(mockUser);

			const req = mockReqWith(`Bearer ${apiKey}`);
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
			const userId = randomUUID();
			const mockUser = mockDeep<User>();
			mockUser.id = userId;

			const apiKey = jwtService.sign({
				sub: userId,
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			userRepository.findOne.mockResolvedValue(mockUser);

			const req = mockReqWith(`BEARER ${apiKey}`);
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

			userRepository.findOne.mockResolvedValue(null);

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
			userRepository.findOne.mockResolvedValue(null);

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
			const userId = randomUUID();
			const mockUser = mockDeep<User>();
			mockUser.id = userId;

			const apiKey = jwtService.sign({
				sub: userId,
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			userRepository.findOne.mockResolvedValue(mockUser);

			const req = mockReqWith(`Bearer    ${apiKey}`);
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
			const apiKey = jwtService.sign({
				sub: randomUUID(),
				iss: 'n8n',
				aud: 'mcp-server-api',
				jti: randomUUID(),
			});

			userRepository.findOne.mockResolvedValue(null);

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
