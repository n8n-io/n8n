'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const mockAuditLoggingService = {
	logApiCall: jest.fn(),
	logEvent: jest.fn(),
};
const mockSecurityMonitoringService = {
	reportSuspiciousApiActivity: jest.fn(),
	reportSecurityEvent: jest.fn(),
};
const mockLogger = {
	error: jest.fn(),
	warn: jest.fn(),
	info: jest.fn(),
	debug: jest.fn(),
};
jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn((service) => {
			if (service.name === 'AuditLoggingService') return mockAuditLoggingService;
			if (service.name === 'SecurityMonitoringService') return mockSecurityMonitoringService;
			return mockLogger;
		}),
	},
}));
const audit_logging_middleware_1 = require('../audit-logging.middleware');
jest.mock('n8n-workflow', () => ({
	LoggerProxy: {
		error: jest.fn(),
		warn: jest.fn(),
		info: jest.fn(),
		debug: jest.fn(),
	},
}));
jest.mock('perf_hooks', () => ({
	performance: {
		now: jest.fn().mockReturnValue(1000),
	},
}));
describe('AuditLoggingMiddleware', () => {
	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		role: 'global:member',
	};
	let mockRequest;
	let mockResponse;
	let mockNext;
	beforeEach(() => {
		jest.clearAllMocks();
		mockRequest = (0, jest_mock_extended_1.mock)({
			path: '/api/workflows',
			originalUrl: '/api/workflows?page=1',
			method: 'GET',
			ip: '192.168.1.1',
			connection: { remoteAddress: '192.168.1.1' },
			user: mockUser,
			params: {},
			body: {},
			get: jest.fn().mockImplementation((header) => {
				if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
				if (header === 'X-Forwarded-For') return null;
				return null;
			}),
		});
		mockResponse = (0, jest_mock_extended_1.mock)({
			statusCode: 200,
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			on: jest.fn(),
		});
		mockNext = jest.fn();
		const performanceMock = require('perf_hooks').performance;
		performanceMock.now.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
	});
	describe('constructor', () => {
		it('should create middleware with default configuration', () => {
			const middleware = new audit_logging_middleware_1.AuditLoggingMiddleware();
			expect(middleware).toBeInstanceOf(audit_logging_middleware_1.AuditLoggingMiddleware);
		});
		it('should create middleware with custom configuration', () => {
			const config = {
				enabled: false,
				logAllRequests: true,
				riskScoreThreshold: 75,
			};
			const middleware = new audit_logging_middleware_1.AuditLoggingMiddleware(config);
			expect(middleware).toBeInstanceOf(audit_logging_middleware_1.AuditLoggingMiddleware);
		});
	});
	describe('auditRequest', () => {
		let middleware;
		beforeEach(() => {
			middleware = new audit_logging_middleware_1.AuditLoggingMiddleware();
		});
		it('should skip processing when audit logging is disabled', async () => {
			const disabledMiddleware = new audit_logging_middleware_1.AuditLoggingMiddleware({
				enabled: false,
			});
			const auditHandler = disabledMiddleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.auditMetadata).toBeUndefined();
		});
		it('should skip excluded paths', async () => {
			mockRequest.path = '/healthz';
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockRequest.auditMetadata).toBeUndefined();
		});
		it('should initialize audit metadata for valid requests', async () => {
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(mockRequest.auditMetadata).toBeDefined();
			expect(mockRequest.auditMetadata.startTime).toBe(1000);
			expect(mockRequest.auditMetadata.requestId).toMatch(/^req_\d+_[a-z0-9]{9}$/);
			expect(mockRequest.auditMetadata.ipAddress).toBe('192.168.1.1');
			expect(mockRequest.auditMetadata.userAgent).toBe('Mozilla/5.0 Test Browser');
			expect(mockRequest.auditMetadata.riskScore).toBe(0);
			expect(mockRequest.auditMetadata.suspiciousIndicators).toEqual([]);
		});
		it('should extract IP from X-Forwarded-For header', async () => {
			mockRequest.get = jest.fn().mockImplementation((header) => {
				if (header === 'User-Agent') return 'Mozilla/5.0 Test Browser';
				if (header === 'X-Forwarded-For') return '203.0.113.1, 198.51.100.1';
				return null;
			});
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(mockRequest.auditMetadata.ipAddress).toBe('203.0.113.1');
		});
		it('should override response methods to capture data', async () => {
			const auditHandler = middleware.auditRequest();
			const originalJson = mockResponse.json;
			const originalSend = mockResponse.send;
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(mockResponse.json).not.toBe(originalJson);
			expect(mockResponse.send).not.toBe(originalSend);
		});
		it('should set up response event listeners', async () => {
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
			expect(mockResponse.on).toHaveBeenCalledWith('error', expect.any(Function));
		});
		it('should call next function', async () => {
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(mockNext).toHaveBeenCalledWith();
		});
	});
	describe('performPreRequestAnalysis', () => {
		let middleware;
		beforeEach(() => {
			middleware = new audit_logging_middleware_1.AuditLoggingMiddleware();
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
			mockRequest.originalUrl = '/api/workflows?cmd=dir&search=<script>';
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const metadata = mockRequest.auditMetadata;
			expect(metadata.riskScore).toBeGreaterThan(0);
			expect(metadata.suspiciousIndicators).toContain('suspicious_url_pattern');
		});
		it('should detect path traversal attempts', async () => {
			mockRequest.originalUrl = '/api/workflows/../../../etc/passwd';
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const metadata = mockRequest.auditMetadata;
			expect(metadata.riskScore).toBeGreaterThan(0);
			expect(metadata.suspiciousIndicators).toContain('path_traversal_attempt');
		});
		it('should analyze suspicious user agents', async () => {
			mockRequest.get = jest.fn().mockImplementation((header) => {
				if (header === 'User-Agent') return 'curl/7.68.0';
				return null;
			});
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const metadata = mockRequest.auditMetadata;
			expect(metadata.riskScore).toBeGreaterThan(0);
			expect(metadata.suspiciousIndicators).toContain('bot_user_agent');
		});
		it('should detect empty user agents', async () => {
			mockRequest.get = jest.fn().mockImplementation((header) => {
				if (header === 'User-Agent') return '';
				return null;
			});
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const metadata = mockRequest.auditMetadata;
			expect(metadata.riskScore).toBeGreaterThan(0);
			expect(metadata.suspiciousIndicators).toContain('empty_user_agent');
		});
		it('should report high-risk activities to security monitoring', async () => {
			mockRequest.originalUrl =
				'/api/workflows?cmd=rm%20-rf%20/&search=<script>alert("xss")</script>';
			const highRiskMiddleware = new audit_logging_middleware_1.AuditLoggingMiddleware({
				riskScoreThreshold: 10,
			});
			const auditHandler = highRiskMiddleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(mockSecurityMonitoringService.reportSuspiciousApiActivity).toHaveBeenCalledWith(
				mockRequest,
				expect.stringContaining('Suspicious API activity detected'),
				expect.any(Number),
				'user-123',
			);
		});
	});
	describe('captureResponse', () => {
		let middleware;
		beforeEach(() => {
			middleware = new audit_logging_middleware_1.AuditLoggingMiddleware({ logResponseBody: true });
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
			mockRequest.path = '/api/workflows';
			const responseBody = { id: 'wf-123', name: 'Test Workflow' };
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			mockResponse.json(responseBody);
			expect(mockRequest.auditMetadata.responseBody).toEqual(responseBody);
		});
		it('should sanitize sensitive fields in response body', async () => {
			mockRequest.path = '/api/credentials';
			const responseBody = { id: 'cred-123', name: 'Test Cred', password: 'secret123' };
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			mockResponse.json(responseBody);
			expect(mockRequest.auditMetadata.responseBody.password).toBe('[REDACTED]');
		});
		it('should not capture response body for excluded paths', async () => {
			mockRequest.path = '/api/executions';
			const responseBody = { id: 'exec-123' };
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			mockResponse.json(responseBody);
			expect(mockRequest.auditMetadata.responseBody).toBeUndefined();
		});
		it('should handle missing audit metadata gracefully', async () => {
			mockRequest.auditMetadata = undefined;
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			expect(() => mockResponse.json({ test: 'data' })).not.toThrow();
		});
	});
	describe('performPostRequestLogging', () => {
		let middleware;
		beforeEach(() => {
			middleware = new audit_logging_middleware_1.AuditLoggingMiddleware();
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
			mockRequest.method = 'POST';
			mockRequest.path = '/api/workflows';
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const finishHandler = mockResponse.on.mock.calls.find(([event]) => event === 'finish')[1];
			await finishHandler();
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
			mockResponse.statusCode = 401;
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const finishHandler = mockResponse.on.mock.calls.find(([event]) => event === 'finish')[1];
			await finishHandler();
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
			mockRequest.method = 'POST';
			mockRequest.path = '/api/workflows';
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const finishHandler = mockResponse.on.mock.calls.find(([event]) => event === 'finish')[1];
			await finishHandler();
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
			mockAuditLoggingService.logApiCall.mockRejectedValue(new Error('Database error'));
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const finishHandler = mockResponse.on.mock.calls.find(([event]) => event === 'finish')[1];
			await finishHandler();
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
		let middleware;
		beforeEach(() => {
			middleware = new audit_logging_middleware_1.AuditLoggingMiddleware();
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
			const error = new Error('Connection timeout');
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const errorHandler = mockResponse.on.mock.calls.find(([event]) => event === 'error')[1];
			await errorHandler(error);
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
			mockAuditLoggingService.logEvent.mockRejectedValue(new Error('Logging service down'));
			const error = new Error('Request failed');
			const auditHandler = middleware.auditRequest();
			await auditHandler(mockRequest, mockResponse, mockNext);
			const errorHandler = mockResponse.on.mock.calls.find(([event]) => event === 'error')[1];
			await errorHandler(error);
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
		let middleware;
		beforeEach(() => {
			middleware = new audit_logging_middleware_1.AuditLoggingMiddleware();
			jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
		});
		afterEach(() => {
			jest.restoreAllMocks();
		});
		it('should track request rates per IP', async () => {
			const auditHandler = middleware.auditRequest();
			for (let i = 0; i < 5; i++) {
				await auditHandler(mockRequest, mockResponse, mockNext);
			}
			expect(mockRequest.auditMetadata.riskScore).toBe(0);
		});
		it('should detect high request rates', async () => {
			const auditHandler = middleware.auditRequest();
			const requestCounts = middleware.requestCounts;
			requestCounts.set('192.168.1.1', {
				count: 150,
				firstRequest: Date.now(),
				lastRequest: Date.now(),
			});
			await auditHandler(mockRequest, mockResponse, mockNext);
			const metadata = mockRequest.auditMetadata;
			expect(metadata.riskScore).toBeGreaterThanOrEqual(20);
			expect(metadata.suspiciousIndicators).toContain('high_request_rate');
		});
	});
	describe('utility functions', () => {
		let middleware;
		beforeEach(() => {
			middleware = new audit_logging_middleware_1.AuditLoggingMiddleware();
		});
		it('should determine which requests to log', async () => {
			const auditHandler = middleware.auditRequest();
			mockRequest.path = '/api/auth/login';
			await auditHandler(mockRequest, mockResponse, mockNext);
			let finishHandler = mockResponse.on.mock.calls.find(([event]) => event === 'finish')[1];
			await finishHandler();
			expect(mockAuditLoggingService.logApiCall).toHaveBeenCalled();
			jest.clearAllMocks();
			mockRequest.method = 'DELETE';
			mockRequest.path = '/api/workflows/123';
			await auditHandler(mockRequest, mockResponse, mockNext);
			finishHandler = mockResponse.on.mock.calls.find(([event]) => event === 'finish')[1];
			await finishHandler();
			expect(mockAuditLoggingService.logApiCall).toHaveBeenCalled();
		});
		it('should generate unique request IDs', async () => {
			const auditHandler = middleware.auditRequest();
			const requestIds = new Set();
			for (let i = 0; i < 10; i++) {
				const req = { ...mockRequest };
				await auditHandler(req, mockResponse, mockNext);
				requestIds.add(req.auditMetadata.requestId);
			}
			expect(requestIds.size).toBe(10);
		});
	});
	describe('factory functions', () => {
		it('should create audit middleware with createAuditMiddleware', () => {
			const middleware = (0, audit_logging_middleware_1.createAuditMiddleware)({ enabled: true });
			expect(typeof middleware).toBe('function');
		});
		it('should create audit middleware with custom config', () => {
			const middleware = (0, audit_logging_middleware_1.createAuditMiddleware)({
				enabled: false,
				logAllRequests: true,
				riskScoreThreshold: 25,
			});
			expect(typeof middleware).toBe('function');
		});
		it('should export default audit middleware', () => {
			expect(typeof audit_logging_middleware_1.auditMiddleware).toBe('function');
		});
	});
});
//# sourceMappingURL=audit-logging.middleware.test.js.map
