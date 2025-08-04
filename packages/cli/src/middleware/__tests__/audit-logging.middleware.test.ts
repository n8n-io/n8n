import type { Request, Response, NextFunction } from 'express';
import { mock } from 'jest-mock-extended';

// Mock services without using Container
const mockAuditLoggingService = {
	logApiCall: jest.fn(),
	logEvent: jest.fn(),
};

const mockSecurityMonitoringService = {
	reportSuspiciousApiActivity: jest.fn(),
	reportSecurityEvent: jest.fn(),
};

// Mock Logger
const mockLogger = {
	error: jest.fn(),
	warn: jest.fn(),
	info: jest.fn(),
	debug: jest.fn(),
};

// Mock Container.get
jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn((service: any) => {
			if (service.name === 'AuditLoggingService') return mockAuditLoggingService;
			if (service.name === 'SecurityMonitoringService') return mockSecurityMonitoringService;
			return mockLogger;
		}),
	},
}));

import {
	AuditLoggingMiddleware,
	createAuditMiddleware,
	auditMiddleware,
	type AuditMiddlewareConfig,
	type AuditableRequest,
} from '../audit-logging.middleware';

// Mock LoggerProxy from n8n-workflow
jest.mock('n8n-workflow', () => ({
	LoggerProxy: {
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
	},
}));

// Mock performance
jest.mock('perf_hooks', () => ({
	performance: {
		now: jest.fn().mockReturnValue(1000),
	},
}));

interface MockUser {
	id: string;
	email: string;
	role: string;
}

describe('AuditLoggingMiddleware', () => {
	const mockUser: MockUser = {
		id: 'user-123',
		email: 'test@example.com',
		role: 'global:member',
	};

	let mockRequest: AuditableRequest;
	let mockResponse: Response;
	let mockNext: NextFunction;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = mock<AuditableRequest>({
			path: '/api/workflows',
			originalUrl: '/api/workflows?page=1',
			method: 'GET',
			ip: '192.168.1.1',
			connection: { remoteAddress: '192.168.1.1' },
			user: mockUser,
			params: {},
			body: {},
			get: jest.fn().mockImplementation((header: string) => {
				if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
				if (header === 'X-Forwarded-For') return null;
				return null;
			}),
		});

		mockResponse = mock<Response>({
			statusCode: 200,
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			on: jest.fn(),
		});

		mockNext = jest.fn();

		// Mock performance.now to return incrementing values
		const performanceMock = require('perf_hooks').performance;
		performanceMock.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
	});

	describe('constructor', () => {
		it('should create middleware with default configuration', () => {
			const middleware = new AuditLoggingMiddleware();
			expect(middleware).toBeInstanceOf(AuditLoggingMiddleware);
		});

		it('should create middleware with custom configuration', () => {
			const config: Partial<AuditMiddlewareConfig> = {
				enabled: false,
				logAllRequests: true,
				riskScoreThreshold: 75,
			};

			const middleware = new AuditLoggingMiddleware(config);
			expect(middleware).toBeInstanceOf(AuditLoggingMiddleware);
		});
	});

	describe('auditRequest', () => {
		let middleware: AuditLoggingMiddleware;

		beforeEach(() => {
			middleware = new AuditLoggingMiddleware();
		});

		it('should skip processing when audit logging is disabled', async () => {
			// Arrange
			const disabledMiddleware = new AuditLoggingMiddleware({ enabled: false });
			const auditHandler = disabledMiddleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.auditMetadata).toBeUndefined();
		});

		it('should skip excluded paths', async () => {
			// Arrange
			mockRequest.path = '/healthz';
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.auditMetadata).toBeUndefined();
		});

		it('should initialize audit metadata for valid requests', async () => {
			// Arrange
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockRequest.auditMetadata).toBeDefined();
			expect(mockRequest.auditMetadata!.startTime).toBe(1000);
			expect(mockRequest.auditMetadata!.requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
			expect(mockRequest.auditMetadata!.ipAddress).toBe('192.168.1.1');
			expect(mockRequest.auditMetadata!.userAgent).toBe('Mozilla/5.0 Test Browser');
			expect(mockRequest.auditMetadata!.riskScore).toBe(0);
			expect(mockRequest.auditMetadata!.suspiciousIndicators).toEqual([]);
		});

		it('should extract IP from X-Forwarded-For header', async () => {
			// Arrange
			mockRequest.get = jest.fn().mockImplementation((header: string) => {
				if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
				if (header === 'X-Forwarded-For') return '203.0.113.1, 198.51.100.1';
				return null;
			});
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockRequest.auditMetadata!.ipAddress).toBe('203.0.113.1');
		});

		it('should override response methods to capture data', async () => {
			// Arrange
			const auditHandler = middleware.auditRequest();
			const originalJson = mockResponse.json;
			const originalSend = mockResponse.send;

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.json).not.toBe(originalJson);
			expect(mockResponse.send).not.toBe(originalSend);
		});

		it('should set up response event listeners', async () => {
			// Arrange
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
			expect(mockResponse.on).toHaveBeenCalledWith('error', expect.any(Function));
		});

		it('should call next function', async () => {
			// Arrange
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
		});
	});

	describe('performPreRequestAnalysis', () => {
		let middleware: AuditLoggingMiddleware;

		beforeEach(() => {
			middleware = new AuditLoggingMiddleware();
			mockRequest.auditMetadata = {
				startTime: 1000,
				requestId: 'req_123',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0 Test Browser',
				riskScore: 0,
				suspiciousIndicators: [],
			};
		});

		it('should analyze suspicious URLs', async () => {
			// Arrange
			mockRequest.originalUrl = '/api/workflows?cmd=dir&search=<script>';
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			const metadata = mockRequest.auditMetadata!;
			expect(metadata.riskScore).toBeGreaterThan(0);
			expect(metadata.suspiciousIndicators).toContain('suspicious_url_pattern');
		});

		it('should detect path traversal attempts', async () => {
			// Arrange
			mockRequest.originalUrl = '/api/workflows/../../../etc/passwd';
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			const metadata = mockRequest.auditMetadata!;
			expect(metadata.riskScore).toBeGreaterThan(0);
			expect(metadata.suspiciousIndicators).toContain('path_traversal_attempt');
		});

		it('should analyze suspicious user agents', async () => {
			// Arrange
			mockRequest.get = jest.fn().mockImplementation((header: string) => {
				if (header === 'User-Agent') return 'curl/7.68.0';
				return null;
			});
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			const metadata = mockRequest.auditMetadata!;
			expect(metadata.riskScore).toBeGreaterThan(0);
			expect(metadata.suspiciousIndicators).toContain('bot_user_agent');
		});

		it('should detect empty user agents', async () => {
			// Arrange
			mockRequest.get = jest.fn().mockImplementation((header: string) => {
				if (header === 'User-Agent') return '';
				return null;
			});
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			const metadata = mockRequest.auditMetadata!;
			expect(metadata.riskScore).toBeGreaterThan(0);
			expect(metadata.suspiciousIndicators).toContain('empty_user_agent');
		});

		it('should report high-risk activities to security monitoring', async () => {
			// Arrange
			mockRequest.originalUrl =
				'/api/workflows?cmd=rm%20-rf%20/&search=<script>alert("xss")</script>';
			const highRiskMiddleware = new AuditLoggingMiddleware({ riskScoreThreshold: 10 });
			const auditHandler = highRiskMiddleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockSecurityMonitoringService.reportSuspiciousApiActivity).toHaveBeenCalledWith(
				mockRequest,
				expect.stringContaining('Suspicious API activity detected'),
				expect.any(Number),
				'user-123',
			);
		});
	});

	describe('captureResponse', () => {
		let middleware: AuditLoggingMiddleware;

		beforeEach(() => {
			middleware = new AuditLoggingMiddleware({ logResponseBody: true });
			mockRequest.auditMetadata = {
				startTime: 1000,
				requestId: 'req_123',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0 Test Browser',
				riskScore: 0,
				suspiciousIndicators: [],
			};
		});

		it('should capture response body for workflows endpoint', async () => {
			// Arrange
			mockRequest.path = '/api/workflows';
			const responseBody = { id: 'wf-123', name: 'Test Workflow' };
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			mockResponse.json(responseBody);

			// Assert
			expect(mockRequest.auditMetadata!.responseBody).toEqual(responseBody);
		});

		it('should sanitize sensitive fields in response body', async () => {
			// Arrange
			mockRequest.path = '/api/credentials';
			const responseBody = { id: 'cred-123', name: 'Test Cred', password: 'secret123' };
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			mockResponse.json(responseBody);

			// Assert
			expect(mockRequest.auditMetadata!.responseBody.password).toBe('[REDACTED]');
		});

		it('should not capture response body for excluded paths', async () => {
			// Arrange
			mockRequest.path = '/api/executions';
			const responseBody = { id: 'exec-123' };
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			mockResponse.json(responseBody);

			// Assert
			expect(mockRequest.auditMetadata!.responseBody).toBeUndefined();
		});

		it('should handle missing audit metadata gracefully', async () => {
			// Arrange
			mockRequest.auditMetadata = undefined;
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert - Should not throw error
			expect(() => mockResponse.json({ test: 'data' })).not.toThrow();
		});
	});

	describe('performPostRequestLogging', () => {
		let middleware: AuditLoggingMiddleware;

		beforeEach(() => {
			middleware = new AuditLoggingMiddleware();
			mockRequest.auditMetadata = {
				startTime: 1000,
				requestId: 'req_123',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0 Test Browser',
				riskScore: 0,
				suspiciousIndicators: [],
			};
		});

		it('should log API calls for POST requests', async () => {
			// Arrange
			mockRequest.method = 'POST';
			mockRequest.path = '/api/workflows';
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			const finishHandler = (mockResponse.on as jest.Mock).mock.calls.find(
				([event]) => event === 'finish',
			)[1];
			await finishHandler();

			// Assert
			expect(mockAuditLoggingService.logApiCall).toHaveBeenCalledWith(
				mockRequest,
				200,
				expect.any(Number),
				'user-123',
				undefined,
				undefined,
			);
		});

		it('should log security events for failed requests', async () => {
			// Arrange
			mockResponse.statusCode = 401;
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			const finishHandler = (mockResponse.on as jest.Mock).mock.calls.find(
				([event]) => event === 'finish',
			)[1];
			await finishHandler();

			// Assert
			expect(mockSecurityMonitoringService.reportSecurityEvent).toHaveBeenCalledWith({
				eventType: 'unauthorized_access_attempt',
				severity: 'high',
				threatLevel: 'high',
				title: 'HTTP 401 - GET /api/workflows',
				description: 'Failed API request: GET /api/workflows returned 401',
				userId: 'user-123',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0 Test Browser',
				sessionId: undefined,
				requestId: 'req_123',
				httpMethod: 'GET',
				endpoint: '/api/workflows',
				statusCode: 401,
				riskScore: 0,
				metadata: {
					responseTimeMs: expect.any(Number),
					suspiciousIndicators: [],
				},
				tags: ['api_failure', '401'],
			});
		});

		it('should log workflow creation events', async () => {
			// Arrange
			mockRequest.method = 'POST';
			mockRequest.path = '/api/workflows';
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			const finishHandler = (mockResponse.on as jest.Mock).mock.calls.find(
				([event]) => event === 'finish',
			)[1];
			await finishHandler();

			// Assert
			expect(mockAuditLoggingService.logEvent).toHaveBeenCalledWith({
				eventType: 'workflow_created',
				category: 'workflow_management',
				severity: 'medium',
				description: 'Workflow created',
				userId: 'user-123',
				resourceType: 'workflow',
				resourceId: null,
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0 Test Browser',
				httpMethod: 'POST',
				endpoint: '/api/workflows',
				statusCode: 200,
			});
		});

		it('should handle logging errors gracefully', async () => {
			// Arrange
			mockAuditLoggingService.logApiCall.mockRejectedValue(new Error('Database error'));
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			const finishHandler = (mockResponse.on as jest.Mock).mock.calls.find(
				([event]) => event === 'finish',
			)[1];
			await finishHandler();

			// Assert
			const LoggerProxy = require('n8n-workflow').LoggerProxy;
			expect(LoggerProxy.error).toHaveBeenCalledWith(
				'Failed to log audit event in middleware',
				expect.objectContaining({
					error: 'Database error',
					requestId: 'req_123',
					path: '/api/workflows',
					method: 'GET',
				}),
			);
		});
	});

	describe('handleRequestError', () => {
		let middleware: AuditLoggingMiddleware;

		beforeEach(() => {
			middleware = new AuditLoggingMiddleware();
			mockRequest.auditMetadata = {
				startTime: 1000,
				requestId: 'req_123',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0 Test Browser',
				riskScore: 25,
				suspiciousIndicators: ['high_request_rate'],
			};
		});

		it('should log request errors', async () => {
			// Arrange
			const error = new Error('Connection timeout');
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			const errorHandler = (mockResponse.on as jest.Mock).mock.calls.find(
				([event]) => event === 'error',
			)[1];
			await errorHandler(error);

			// Assert
			expect(mockAuditLoggingService.logEvent).toHaveBeenCalledWith({
				eventType: 'api_call',
				category: 'data_access',
				severity: 'high',
				description: 'API request error: GET /api/workflows',
				userId: 'user-123',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0 Test Browser',
				httpMethod: 'GET',
				endpoint: '/api/workflows',
				statusCode: 200,
				errorMessage: 'Connection timeout',
				metadata: {
					requestId: 'req_123',
					riskScore: 25,
					suspiciousIndicators: ['high_request_rate'],
				},
			});
		});

		it('should handle logging errors during error handling', async () => {
			// Arrange
			mockAuditLoggingService.logEvent.mockRejectedValue(new Error('Logging service down'));
			const error = new Error('Request failed');
			const auditHandler = middleware.auditRequest();

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);
			const errorHandler = (mockResponse.on as jest.Mock).mock.calls.find(
				([event]) => event === 'error',
			)[1];
			await errorHandler(error);

			// Assert
			const LoggerProxy = require('n8n-workflow').LoggerProxy;
			expect(LoggerProxy.error).toHaveBeenCalledWith(
				'Failed to log request error',
				expect.objectContaining({
					originalError: 'Request failed',
					loggingError: 'Logging service down',
				}),
			);
		});
	});

	describe('rate limiting analysis', () => {
		let middleware: AuditLoggingMiddleware;

		beforeEach(() => {
			middleware = new AuditLoggingMiddleware();
			// Mock Date.now for consistent timing
			jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // Fixed timestamp
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should track request rates per IP', async () => {
			// Arrange
			const auditHandler = middleware.auditRequest();

			// Act - Make multiple requests from same IP
			for (let i = 0; i < 5; i++) {
				await auditHandler(mockRequest, mockResponse, mockNext);
			}

			// Assert - Should not trigger rate limiting for 5 requests
			expect(mockRequest.auditMetadata!.riskScore).toBe(0);
		});

		it('should detect high request rates', async () => {
			// Arrange
			const auditHandler = middleware.auditRequest();

			// Mock request counts to simulate high rate
			const requestCounts = (middleware as any).requestCounts;
			requestCounts.set('192.168.1.1', {
				count: 150, // Above threshold of 100
				firstRequest: Date.now(),
				lastRequest: Date.now(),
			});

			// Act
			await auditHandler(mockRequest, mockResponse, mockNext);

			// Assert
			const metadata = mockRequest.auditMetadata!;
			expect(metadata.riskScore).toBeGreaterThanOrEqual(20);
			expect(metadata.suspiciousIndicators).toContain('high_request_rate');
		});
	});

	describe('utility functions', () => {
		let middleware: AuditLoggingMiddleware;

		beforeEach(() => {
			middleware = new AuditLoggingMiddleware();
		});

		it('should determine which requests to log', async () => {
			// Arrange
			const auditHandler = middleware.auditRequest();

			// Test authentication endpoints
			mockRequest.path = '/api/auth/login';
			await auditHandler(mockRequest, mockResponse, mockNext);
			let finishHandler = (mockResponse.on as jest.Mock).mock.calls.find(
				([event]) => event === 'finish',
			)[1];
			await finishHandler();
			expect(mockAuditLoggingService.logApiCall).toHaveBeenCalled();

			// Reset mocks
			jest.clearAllMocks();

			// Test data modification operations
			mockRequest.method = 'DELETE';
			mockRequest.path = '/api/workflows/123';
			await auditHandler(mockRequest, mockResponse, mockNext);
			finishHandler = (mockResponse.on as jest.Mock).mock.calls.find(
				([event]) => event === 'finish',
			)[1];
			await finishHandler();
			expect(mockAuditLoggingService.logApiCall).toHaveBeenCalled();
		});

		it('should generate unique request IDs', async () => {
			// Arrange
			const auditHandler = middleware.auditRequest();
			const requestIds = new Set();

			// Act
			for (let i = 0; i < 10; i++) {
				const req = { ...mockRequest };
				await auditHandler(req, mockResponse, mockNext);
				requestIds.add((req as AuditableRequest).auditMetadata!.requestId);
			}

			// Assert
			expect(requestIds.size).toBe(10); // All IDs should be unique
		});
	});

	describe('factory functions', () => {
		it('should create audit middleware with createAuditMiddleware', () => {
			// Act
			const middleware = createAuditMiddleware({ enabled: true });

			// Assert
			expect(typeof middleware).toBe('function');
		});

		it('should create audit middleware with custom config', () => {
			// Act
			const middleware = createAuditMiddleware({
				enabled: false,
				logAllRequests: true,
				riskScoreThreshold: 25,
			});

			// Assert
			expect(typeof middleware).toBe('function');
		});

		it('should export default audit middleware', () => {
			// Assert
			expect(typeof auditMiddleware).toBe('function');
		});
	});
});
