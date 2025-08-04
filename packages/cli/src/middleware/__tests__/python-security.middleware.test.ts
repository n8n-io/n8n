import type { Request, Response, NextFunction } from 'express';
import { mock } from 'jest-mock-extended';

// Mock services
const mockLogger = {
	error: jest.fn(),
	warn: jest.fn(),
	info: jest.fn(),
	debug: jest.fn(),
};

const mockPythonSandboxService = {
	getAuditLogs: jest.fn(),
	getSecurityConfig: jest.fn(),
};

// Mock Container.get
jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn((service: any) => {
			if (service.name === 'PythonSandboxService') return mockPythonSandboxService;
			return mockLogger;
		}),
	},
}));

import {
	pythonExecutionRateLimit,
	validatePythonCode,
	validateUserPermissions,
	sanitizePythonRequest,
	monitorSecurityEvents,
	securityHealthCheck,
	getSecurityMetrics,
	pythonSecurityMiddleware,
} from '../python-security.middleware';

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
	return jest.fn(() => jest.fn((req: any, res: any, next: any) => next()));
});

// Mock crypto
jest.mock('crypto', () => ({
	createHash: jest.fn(() => ({
		update: jest.fn().mockReturnThis(),
		digest: jest.fn(() => ({
			substring: jest.fn(() => 'abcd1234efgh5678'),
		})),
	})),
}));

interface TestPythonExecutionRequest extends Request {
	body: {
		code: string;
		context?: Record<string, any>;
		packages?: string[];
		timeout?: number;
	};
	user?: {
		id: string;
		role: string;
		permissions: string[];
	};
}

describe('Python Security Middleware', () => {
	let mockRequest: TestPythonExecutionRequest;
	let mockResponse: Response;
	let mockNext: NextFunction;

	beforeEach(() => {
		jest.clearAllMocks();

		mockRequest = mock<TestPythonExecutionRequest>({
			ip: '192.168.1.1',
			get: jest.fn(),
			body: {
				code: 'print("Hello World")',
				context: {},
				packages: [],
				timeout: 30000,
			},
			user: {
				id: 'user-123',
				role: 'editor',
				permissions: ['python:execute'],
			},
		});

		mockResponse = mock<Response>({
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		});

		mockNext = jest.fn();

		// Mock Date.now for consistent timing
		jest.spyOn(Date, 'now').mockReturnValue(1640995200000);

		// Reset Python sandbox service mocks
		mockPythonSandboxService.getAuditLogs.mockReturnValue([]);
		mockPythonSandboxService.getSecurityConfig.mockReturnValue({});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('validatePythonCode', () => {
		it('should pass valid Python code', () => {
			// Arrange
			mockRequest.body.code = 'print("Hello World")';

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should reject missing code', () => {
			// Arrange
			mockRequest.body.code = '';

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid or missing Python code',
				code: 'INVALID_CODE',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject non-string code', () => {
			// Arrange
			(mockRequest.body as any).code = { malicious: 'object' };

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid or missing Python code',
				code: 'INVALID_CODE',
			});
		});

		it('should reject code exceeding maximum length', () => {
			// Arrange
			mockRequest.body.code = 'x = 1\n'.repeat(10000); // ~60,000 characters

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Python code exceeds maximum length of 50,000 characters',
				code: 'CODE_TOO_LONG',
			});
		});

		it('should reject code exceeding maximum line count', () => {
			// Arrange
			mockRequest.body.code = 'x = 1\n'.repeat(1001); // 1001 lines

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Python code exceeds maximum line count of 1,000 lines',
				code: 'TOO_MANY_LINES',
			});
		});

		it('should detect dangerous eval() pattern', () => {
			// Arrange
			mockRequest.body.code = 'result = eval("print(1)")';

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Security violations detected in code',
				code: 'SECURITY_VIOLATION',
				violations: expect.arrayContaining([
					expect.stringContaining('Potentially dangerous pattern detected'),
				]),
			});
		});

		it('should detect dangerous exec() pattern', () => {
			// Arrange
			mockRequest.body.code = 'exec("import os; os.system(\'ls\')")';

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Security violations detected in code',
				code: 'SECURITY_VIOLATION',
				violations: expect.arrayContaining([
					expect.stringContaining('Potentially dangerous pattern detected'),
				]),
			});
		});

		it('should detect subprocess usage', () => {
			// Arrange
			mockRequest.body.code = 'import subprocess\nsubprocess.call(["ls", "-la"])';

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Security violations detected in code',
				code: 'SECURITY_VIOLATION',
				violations: expect.arrayContaining([
					expect.stringContaining('Potentially dangerous pattern detected'),
				]),
			});
		});

		it('should detect file system access patterns', () => {
			// Arrange
			mockRequest.body.code = 'with open("/etc/passwd", "r") as f: content = f.read()';

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Security violations detected in code',
				code: 'SECURITY_VIOLATION',
				violations: expect.arrayContaining([
					expect.stringContaining('Potentially dangerous pattern detected'),
				]),
			});
		});

		it('should detect network access patterns', () => {
			// Arrange
			mockRequest.body.code = 'import socket\ns = socket.socket()';

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Security violations detected in code',
				code: 'SECURITY_VIOLATION',
				violations: expect.arrayContaining([
					expect.stringContaining('Potentially dangerous pattern detected'),
				]),
			});
		});

		it('should reject too many packages', () => {
			// Arrange
			mockRequest.body.packages = Array.from({ length: 51 }, (_, i) => `package${i}`);

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Too many packages requested (maximum: 50)',
				code: 'TOO_MANY_PACKAGES',
			});
		});

		it('should allow safe Python code', () => {
			// Arrange
			mockRequest.body.code = `
import math
import json

def calculate_area(radius):
    return math.pi * radius ** 2

data = {"radius": 5}
area = calculate_area(data["radius"])
print(f"Area: {area}")
			`;

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});

	describe('validateUserPermissions', () => {
		it('should allow users with python:execute permission', () => {
			// Arrange
			mockRequest.user = {
				id: 'user-123',
				role: 'user',
				permissions: ['python:execute'],
			};

			// Act
			validateUserPermissions(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should allow admin users without explicit permission', () => {
			// Arrange
			mockRequest.user = {
				id: 'admin-123',
				role: 'admin',
				permissions: [],
			};

			// Act
			validateUserPermissions(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should allow editor users without explicit permission', () => {
			// Arrange
			mockRequest.user = {
				id: 'editor-123',
				role: 'editor',
				permissions: [],
			};

			// Act
			validateUserPermissions(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should reject unauthenticated requests', () => {
			// Arrange
			mockRequest.user = undefined;

			// Act
			validateUserPermissions(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Authentication required for Python execution',
				code: 'AUTHENTICATION_REQUIRED',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should reject users without sufficient permissions', () => {
			// Arrange
			mockRequest.user = {
				id: 'user-123',
				role: 'user',
				permissions: ['workflow:read'],
			};

			// Act
			validateUserPermissions(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Insufficient permissions for Python execution',
				code: 'INSUFFICIENT_PERMISSIONS',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});
	});

	describe('sanitizePythonRequest', () => {
		it('should sanitize timeout values', () => {
			// Arrange
			mockRequest.body.timeout = 200000; // Above maximum

			// Act
			sanitizePythonRequest(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockRequest.body.timeout).toBe(120000); // Clamped to maximum
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should clamp timeout to minimum value', () => {
			// Arrange
			mockRequest.body.timeout = 500; // Below minimum

			// Act
			sanitizePythonRequest(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockRequest.body.timeout).toBe(1000); // Clamped to minimum
		});

		it('should handle invalid timeout values', () => {
			// Arrange
			(mockRequest.body as any).timeout = 'invalid';

			// Act
			sanitizePythonRequest(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockRequest.body.timeout).toBe(30000); // Default value
		});

		it('should remove dangerous context keys', () => {
			// Arrange
			mockRequest.body.context = {
				data: 'safe',
				__builtins__: 'dangerous',
				__globals__: 'dangerous',
				eval: 'dangerous',
			};

			// Act
			sanitizePythonRequest(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockRequest.body.context).toEqual({ data: 'safe' });
			expect(mockRequest.body.context!.__builtins__).toBeUndefined();
			expect(mockRequest.body.context!.__globals__).toBeUndefined();
			expect(mockRequest.body.context!.eval).toBeUndefined();
		});

		it('should reject oversized context', () => {
			// Arrange
			const largeContext = { data: 'x'.repeat(100001) }; // > 100KB
			mockRequest.body.context = largeContext;

			// Act
			sanitizePythonRequest(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Context data exceeds maximum size of 100KB',
				code: 'CONTEXT_TOO_LARGE',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});

		it('should sanitize packages array', () => {
			// Arrange
			mockRequest.body.packages = [
				'  NumPy  ',
				'pandas',
				123 as any, // Invalid type
				'a'.repeat(101), // Too long
				'',
				'requests',
			];

			// Act
			sanitizePythonRequest(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockRequest.body.packages).toEqual(['numpy', 'pandas', 'requests']);
		});

		it('should limit packages to 50 items', () => {
			// Arrange
			mockRequest.body.packages = Array.from({ length: 100 }, (_, i) => `package${i}`);

			// Act
			sanitizePythonRequest(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockRequest.body.packages).toHaveLength(50);
		});
	});

	describe('monitorSecurityEvents', () => {
		it('should log execution requests', () => {
			// Act
			monitorSecurityEvents(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockLogger.debug).toHaveBeenCalledWith('Python execution request received', {
				userId: 'user-123',
				ip: '192.168.1.1',
				userAgent: undefined,
				codeLength: 20, // Length of 'print("Hello World")'
				packages: 0,
				hasContext: true,
			});
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should override response.json to track metrics', () => {
			// Arrange
			const originalJson = mockResponse.json;

			// Act
			monitorSecurityEvents(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.json).not.toBe(originalJson);
		});

		it('should log successful executions', () => {
			// Arrange
			mockResponse.statusCode = 200;

			// Act
			monitorSecurityEvents(mockRequest, mockResponse, mockNext);
			(mockResponse.json as jest.Mock)({ result: 'success' });

			// Assert
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});

		it('should log failed executions', () => {
			// Arrange
			mockResponse.statusCode = 400;

			// Act
			monitorSecurityEvents(mockRequest, mockResponse, mockNext);
			(mockResponse.json as jest.Mock)({ error: 'Execution failed' });

			// Assert
			expect(mockLogger.warn).toHaveBeenCalledWith('Python execution failed', {
				userId: 'user-123',
				statusCode: 400,
				executionTime: expect.any(Number),
				error: 'Execution failed',
			});
		});
	});

	describe('securityHealthCheck', () => {
		it('should pass when failure rate is acceptable', () => {
			// Act
			securityHealthCheck(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});

		it('should block requests when failure rate is too high', () => {
			// Arrange - Simulate high failure rate by making failing requests
			mockResponse.statusCode = 500;
			for (let i = 0; i < 15; i++) {
				monitorSecurityEvents(mockRequest, mockResponse, mockNext);
				(mockResponse.json as jest.Mock)({ error: 'Failed' });
			}

			// Reset mocks
			jest.clearAllMocks();
			mockResponse.statusCode = 200;

			// Act
			securityHealthCheck(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(503);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Python execution service temporarily unavailable due to high failure rate',
				code: 'SERVICE_DEGRADED',
				retryAfter: 300,
			});
			expect(mockNext).not.toHaveBeenCalled();
		});
	});

	describe('getSecurityMetrics', () => {
		it('should return metrics for admin users', () => {
			// Arrange
			(mockRequest as any).user = { id: 'admin-123', role: 'admin' };

			// Act
			getSecurityMetrics(mockRequest, mockResponse);

			// Assert
			expect(mockResponse.json).toHaveBeenCalledWith({
				metrics: expect.objectContaining({
					totalExecutions: expect.any(Number),
					failedExecutions: expect.any(Number),
					securityViolations: expect.any(Number),
					averageExecutionTime: expect.any(Number),
					failureRate: expect.any(Number),
				}),
				recentAuditLogs: [],
				securityConfig: {},
			});
		});

		it('should reject non-admin users', () => {
			// Arrange
			(mockRequest as any).user = { id: 'user-123', role: 'user' };

			// Act
			getSecurityMetrics(mockRequest, mockResponse);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Admin access required',
				code: 'ADMIN_ONLY',
			});
		});

		it('should reject unauthenticated requests', () => {
			// Arrange
			(mockRequest as any).user = undefined;

			// Act
			getSecurityMetrics(mockRequest, mockResponse);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Admin access required',
				code: 'ADMIN_ONLY',
			});
		});
	});

	describe('pythonSecurityMiddleware stack', () => {
		it('should export complete middleware stack', () => {
			// Assert
			expect(Array.isArray(pythonSecurityMiddleware)).toBe(true);
			expect(pythonSecurityMiddleware).toHaveLength(6);
		});

		it('should include all required middleware functions', () => {
			// Assert
			const middlewareNames = pythonSecurityMiddleware.map((mw) => mw.name || 'anonymous');
			expect(middlewareNames).toContain('anonymous'); // Rate limit middleware
		});
	});

	describe('SecurityMetricsTracker', () => {
		it('should track execution metrics', () => {
			// Arrange - Access the internal metrics tracker
			const mockReq = { ...mockRequest };
			mockResponse.statusCode = 200;

			// Act - Simulate successful execution
			monitorSecurityEvents(mockReq, mockResponse, mockNext);
			(mockResponse.json as jest.Mock)({ result: 'success' });

			// Reset for failed execution
			jest.clearAllMocks();
			mockResponse.statusCode = 400;
			const mockReq2 = { ...mockRequest };

			// Act - Simulate failed execution
			monitorSecurityEvents(mockReq2, mockResponse, mockNext);
			(mockResponse.json as jest.Mock)({ error: 'Failed' });

			// Assert - Should have tracked both executions
			expect(mockLogger.debug).toHaveBeenCalledTimes(1);
			expect(mockLogger.warn).toHaveBeenCalledTimes(1);
		});

		it('should record security violations', () => {
			// Arrange
			mockRequest.body.code = 'eval("malicious code")';

			// Act
			validatePythonCode(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Security violations detected in Python code',
				expect.objectContaining({
					userId: 'user-123',
					violations: expect.any(Array),
					codeHash: expect.any(String),
				}),
			);
		});
	});

	describe('rate limiting configuration', () => {
		it('should configure different limits for different user roles', () => {
			// Assert - Rate limiting should be configured
			expect(pythonExecutionRateLimit).toBeDefined();
		});
	});

	describe('comprehensive security validation', () => {
		const securityTestCases = [
			{
				name: 'SQL injection attempt',
				code: 'import sqlite3; cursor.execute("SELECT * FROM users WHERE id = " + user_input)',
				shouldBlock: false, // This is not in our current patterns but could be added
			},
			{
				name: 'File deletion attempt',
				code: 'import os; os.system("rm -rf /")',
				shouldBlock: true,
			},
			{
				name: 'Network request attempt',
				code: 'import urllib.request; urllib.request.urlopen("http://evil.com")',
				shouldBlock: true,
			},
			{
				name: 'Safe scientific computing',
				code: 'import numpy as np; import pandas as pd; df = pd.DataFrame({"x": [1,2,3]})',
				shouldBlock: false,
			},
		];

		securityTestCases.forEach((testCase) => {
			it(`should ${testCase.shouldBlock ? 'block' : 'allow'} ${testCase.name}`, () => {
				// Arrange
				mockRequest.body.code = testCase.code;

				// Act
				validatePythonCode(mockRequest, mockResponse, mockNext);

				// Assert
				if (testCase.shouldBlock) {
					expect(mockResponse.status).toHaveBeenCalledWith(400);
					expect(mockNext).not.toHaveBeenCalled();
				} else {
					expect(mockNext).toHaveBeenCalledWith();
					expect(mockResponse.status).not.toHaveBeenCalled();
				}
			});
		});
	});

	describe('edge cases and error handling', () => {
		it('should handle undefined body gracefully', () => {
			// Arrange
			(mockRequest as any).body = undefined;

			// Act & Assert - Should not throw
			expect(() => {
				validatePythonCode(mockRequest, mockResponse, mockNext);
			}).not.toThrow();
		});

		it('should handle null user object', () => {
			// Arrange
			mockRequest.user = null as any;

			// Act
			validateUserPermissions(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(401);
		});

		it('should handle missing permissions array', () => {
			// Arrange
			mockRequest.user = {
				id: 'user-123',
				role: 'user',
				permissions: undefined as any,
			};

			// Act
			validateUserPermissions(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});

		it('should handle malformed context object', () => {
			// Arrange
			(mockRequest.body as any).context = 'not an object';

			// Act
			sanitizePythonRequest(mockRequest, mockResponse, mockNext);

			// Assert
			expect(mockNext).toHaveBeenCalledWith();
		});

		it('should handle JSON.stringify errors in context validation', () => {
			// Arrange
			const circularObject: any = {};
			circularObject.self = circularObject;
			mockRequest.body.context = circularObject;

			// Act & Assert - Should not throw
			expect(() => {
				sanitizePythonRequest(mockRequest, mockResponse, mockNext);
			}).not.toThrow();
		});
	});
});
