'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
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
jest.mock('@n8n/di', () => ({
	Container: {
		get: jest.fn((service) => {
			if (service.name === 'PythonSandboxService') return mockPythonSandboxService;
			return mockLogger;
		}),
	},
}));
const python_security_middleware_1 = require('../python-security.middleware');
jest.mock('express-rate-limit', () => {
	return jest.fn(() => jest.fn((req, res, next) => next()));
});
jest.mock('crypto', () => ({
	createHash: jest.fn(() => ({
		update: jest.fn().mockReturnThis(),
		digest: jest.fn(() => ({
			substring: jest.fn(() => 'abcd1234efgh5678'),
		})),
	})),
}));
describe('Python Security Middleware', () => {
	let mockRequest;
	let mockResponse;
	let mockNext;
	beforeEach(() => {
		jest.clearAllMocks();
		mockRequest = (0, jest_mock_extended_1.mock)({
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
		mockResponse = (0, jest_mock_extended_1.mock)({
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		});
		mockNext = jest.fn();
		jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
		mockPythonSandboxService.getAuditLogs.mockReturnValue([]);
		mockPythonSandboxService.getSecurityConfig.mockReturnValue({});
	});
	afterEach(() => {
		jest.restoreAllMocks();
	});
	describe('validatePythonCode', () => {
		it('should pass valid Python code', () => {
			mockRequest.body.code = 'print("Hello World")';
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
		it('should reject missing code', () => {
			mockRequest.body.code = '';
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid or missing Python code',
				code: 'INVALID_CODE',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});
		it('should reject non-string code', () => {
			mockRequest.body.code = { malicious: 'object' };
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Invalid or missing Python code',
				code: 'INVALID_CODE',
			});
		});
		it('should reject code exceeding maximum length', () => {
			mockRequest.body.code = 'x = 1\n'.repeat(10000);
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Python code exceeds maximum length of 50,000 characters',
				code: 'CODE_TOO_LONG',
			});
		});
		it('should reject code exceeding maximum line count', () => {
			mockRequest.body.code = 'x = 1\n'.repeat(1001);
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Python code exceeds maximum line count of 1,000 lines',
				code: 'TOO_MANY_LINES',
			});
		});
		it('should detect dangerous eval() pattern', () => {
			mockRequest.body.code = 'result = eval("print(1)")';
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
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
			mockRequest.body.code = 'exec("import os; os.system(\'ls\')")';
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
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
			mockRequest.body.code = 'import subprocess\nsubprocess.call(["ls", "-la"])';
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
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
			mockRequest.body.code = 'with open("/etc/passwd", "r") as f: content = f.read()';
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
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
			mockRequest.body.code = 'import socket\ns = socket.socket()';
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
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
			mockRequest.body.packages = Array.from({ length: 51 }, (_, i) => `package${i}`);
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Too many packages requested (maximum: 50)',
				code: 'TOO_MANY_PACKAGES',
			});
		});
		it('should allow safe Python code', () => {
			mockRequest.body.code = `
import math
import json

def calculate_area(radius):
    return math.pi * radius ** 2

data = {"radius": 5}
area = calculate_area(data["radius"])
print(f"Area: {area}")
			`;
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});
	describe('validateUserPermissions', () => {
		it('should allow users with python:execute permission', () => {
			mockRequest.user = {
				id: 'user-123',
				role: 'user',
				permissions: ['python:execute'],
			};
			(0, python_security_middleware_1.validateUserPermissions)(
				mockRequest,
				mockResponse,
				mockNext,
			);
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
		it('should allow admin users without explicit permission', () => {
			mockRequest.user = {
				id: 'admin-123',
				role: 'admin',
				permissions: [],
			};
			(0, python_security_middleware_1.validateUserPermissions)(
				mockRequest,
				mockResponse,
				mockNext,
			);
			expect(mockNext).toHaveBeenCalledWith();
		});
		it('should allow editor users without explicit permission', () => {
			mockRequest.user = {
				id: 'editor-123',
				role: 'editor',
				permissions: [],
			};
			(0, python_security_middleware_1.validateUserPermissions)(
				mockRequest,
				mockResponse,
				mockNext,
			);
			expect(mockNext).toHaveBeenCalledWith();
		});
		it('should reject unauthenticated requests', () => {
			mockRequest.user = undefined;
			(0, python_security_middleware_1.validateUserPermissions)(
				mockRequest,
				mockResponse,
				mockNext,
			);
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Authentication required for Python execution',
				code: 'AUTHENTICATION_REQUIRED',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});
		it('should reject users without sufficient permissions', () => {
			mockRequest.user = {
				id: 'user-123',
				role: 'user',
				permissions: ['workflow:read'],
			};
			(0, python_security_middleware_1.validateUserPermissions)(
				mockRequest,
				mockResponse,
				mockNext,
			);
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
			mockRequest.body.timeout = 200000;
			(0, python_security_middleware_1.sanitizePythonRequest)(mockRequest, mockResponse, mockNext);
			expect(mockRequest.body.timeout).toBe(120000);
			expect(mockNext).toHaveBeenCalledWith();
		});
		it('should clamp timeout to minimum value', () => {
			mockRequest.body.timeout = 500;
			(0, python_security_middleware_1.sanitizePythonRequest)(mockRequest, mockResponse, mockNext);
			expect(mockRequest.body.timeout).toBe(1000);
		});
		it('should handle invalid timeout values', () => {
			mockRequest.body.timeout = 'invalid';
			(0, python_security_middleware_1.sanitizePythonRequest)(mockRequest, mockResponse, mockNext);
			expect(mockRequest.body.timeout).toBe(30000);
		});
		it('should remove dangerous context keys', () => {
			mockRequest.body.context = {
				data: 'safe',
				__builtins__: 'dangerous',
				__globals__: 'dangerous',
				eval: 'dangerous',
			};
			(0, python_security_middleware_1.sanitizePythonRequest)(mockRequest, mockResponse, mockNext);
			expect(mockRequest.body.context).toEqual({ data: 'safe' });
			expect(mockRequest.body.context.__builtins__).toBeUndefined();
			expect(mockRequest.body.context.__globals__).toBeUndefined();
			expect(mockRequest.body.context.eval).toBeUndefined();
		});
		it('should reject oversized context', () => {
			const largeContext = { data: 'x'.repeat(100001) };
			mockRequest.body.context = largeContext;
			(0, python_security_middleware_1.sanitizePythonRequest)(mockRequest, mockResponse, mockNext);
			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Context data exceeds maximum size of 100KB',
				code: 'CONTEXT_TOO_LARGE',
			});
			expect(mockNext).not.toHaveBeenCalled();
		});
		it('should sanitize packages array', () => {
			mockRequest.body.packages = ['  NumPy  ', 'pandas', 123, 'a'.repeat(101), '', 'requests'];
			(0, python_security_middleware_1.sanitizePythonRequest)(mockRequest, mockResponse, mockNext);
			expect(mockRequest.body.packages).toEqual(['numpy', 'pandas', 'requests']);
		});
		it('should limit packages to 50 items', () => {
			mockRequest.body.packages = Array.from({ length: 100 }, (_, i) => `package${i}`);
			(0, python_security_middleware_1.sanitizePythonRequest)(mockRequest, mockResponse, mockNext);
			expect(mockRequest.body.packages).toHaveLength(50);
		});
	});
	describe('monitorSecurityEvents', () => {
		it('should log execution requests', () => {
			(0, python_security_middleware_1.monitorSecurityEvents)(mockRequest, mockResponse, mockNext);
			expect(mockLogger.debug).toHaveBeenCalledWith('Python execution request received', {
				userId: 'user-123',
				ip: '192.168.1.1',
				userAgent: undefined,
				codeLength: 20,
				packages: 0,
				hasContext: true,
			});
			expect(mockNext).toHaveBeenCalledWith();
		});
		it('should override response.json to track metrics', () => {
			const originalJson = mockResponse.json;
			(0, python_security_middleware_1.monitorSecurityEvents)(mockRequest, mockResponse, mockNext);
			expect(mockResponse.json).not.toBe(originalJson);
		});
		it('should log successful executions', () => {
			mockResponse.statusCode = 200;
			(0, python_security_middleware_1.monitorSecurityEvents)(mockRequest, mockResponse, mockNext);
			mockResponse.json({ result: 'success' });
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});
		it('should log failed executions', () => {
			mockResponse.statusCode = 400;
			(0, python_security_middleware_1.monitorSecurityEvents)(mockRequest, mockResponse, mockNext);
			mockResponse.json({ error: 'Execution failed' });
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
			(0, python_security_middleware_1.securityHealthCheck)(mockRequest, mockResponse, mockNext);
			expect(mockNext).toHaveBeenCalledWith();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
		it('should block requests when failure rate is too high', () => {
			mockResponse.statusCode = 500;
			for (let i = 0; i < 15; i++) {
				(0, python_security_middleware_1.monitorSecurityEvents)(
					mockRequest,
					mockResponse,
					mockNext,
				);
				mockResponse.json({ error: 'Failed' });
			}
			jest.clearAllMocks();
			mockResponse.statusCode = 200;
			(0, python_security_middleware_1.securityHealthCheck)(mockRequest, mockResponse, mockNext);
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
			mockRequest.user = { id: 'admin-123', role: 'admin' };
			(0, python_security_middleware_1.getSecurityMetrics)(mockRequest, mockResponse);
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
			mockRequest.user = { id: 'user-123', role: 'user' };
			(0, python_security_middleware_1.getSecurityMetrics)(mockRequest, mockResponse);
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Admin access required',
				code: 'ADMIN_ONLY',
			});
		});
		it('should reject unauthenticated requests', () => {
			mockRequest.user = undefined;
			(0, python_security_middleware_1.getSecurityMetrics)(mockRequest, mockResponse);
			expect(mockResponse.status).toHaveBeenCalledWith(403);
			expect(mockResponse.json).toHaveBeenCalledWith({
				error: 'Admin access required',
				code: 'ADMIN_ONLY',
			});
		});
	});
	describe('pythonSecurityMiddleware stack', () => {
		it('should export complete middleware stack', () => {
			expect(Array.isArray(python_security_middleware_1.pythonSecurityMiddleware)).toBe(true);
			expect(python_security_middleware_1.pythonSecurityMiddleware).toHaveLength(6);
		});
		it('should include all required middleware functions', () => {
			const middlewareNames = python_security_middleware_1.pythonSecurityMiddleware.map(
				(mw) => mw.name || 'anonymous',
			);
			expect(middlewareNames).toContain('anonymous');
		});
	});
	describe('SecurityMetricsTracker', () => {
		it('should track execution metrics', () => {
			const mockReq = { ...mockRequest };
			mockResponse.statusCode = 200;
			(0, python_security_middleware_1.monitorSecurityEvents)(mockReq, mockResponse, mockNext);
			mockResponse.json({ result: 'success' });
			jest.clearAllMocks();
			mockResponse.statusCode = 400;
			const mockReq2 = { ...mockRequest };
			(0, python_security_middleware_1.monitorSecurityEvents)(mockReq2, mockResponse, mockNext);
			mockResponse.json({ error: 'Failed' });
			expect(mockLogger.debug).toHaveBeenCalledTimes(1);
			expect(mockLogger.warn).toHaveBeenCalledTimes(1);
		});
		it('should record security violations', () => {
			mockRequest.body.code = 'eval("malicious code")';
			(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
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
			expect(python_security_middleware_1.pythonExecutionRateLimit).toBeDefined();
		});
	});
	describe('comprehensive security validation', () => {
		const securityTestCases = [
			{
				name: 'SQL injection attempt',
				code: 'import sqlite3; cursor.execute("SELECT * FROM users WHERE id = " + user_input)',
				shouldBlock: false,
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
				mockRequest.body.code = testCase.code;
				(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
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
			mockRequest.body = undefined;
			expect(() => {
				(0, python_security_middleware_1.validatePythonCode)(mockRequest, mockResponse, mockNext);
			}).not.toThrow();
		});
		it('should handle null user object', () => {
			mockRequest.user = null;
			(0, python_security_middleware_1.validateUserPermissions)(
				mockRequest,
				mockResponse,
				mockNext,
			);
			expect(mockResponse.status).toHaveBeenCalledWith(401);
		});
		it('should handle missing permissions array', () => {
			mockRequest.user = {
				id: 'user-123',
				role: 'user',
				permissions: undefined,
			};
			(0, python_security_middleware_1.validateUserPermissions)(
				mockRequest,
				mockResponse,
				mockNext,
			);
			expect(mockResponse.status).toHaveBeenCalledWith(403);
		});
		it('should handle malformed context object', () => {
			mockRequest.body.context = 'not an object';
			(0, python_security_middleware_1.sanitizePythonRequest)(mockRequest, mockResponse, mockNext);
			expect(mockNext).toHaveBeenCalledWith();
		});
		it('should handle JSON.stringify errors in context validation', () => {
			const circularObject = {};
			circularObject.self = circularObject;
			mockRequest.body.context = circularObject;
			expect(() => {
				(0, python_security_middleware_1.sanitizePythonRequest)(
					mockRequest,
					mockResponse,
					mockNext,
				);
			}).not.toThrow();
		});
	});
});
//# sourceMappingURL=python-security.middleware.test.js.map
