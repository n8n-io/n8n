'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.pythonSecurityMiddleware =
	exports.getSecurityMetrics =
	exports.securityHealthCheck =
	exports.monitorSecurityEvents =
	exports.sanitizePythonRequest =
	exports.validateUserPermissions =
	exports.validatePythonCode =
	exports.pythonExecutionRateLimit =
		void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const python_sandbox_service_1 = require('../security/python-sandbox.service');
const express_rate_limit_1 = __importDefault(require('express-rate-limit'));
const crypto_1 = require('crypto');
exports.pythonExecutionRateLimit = (0, express_rate_limit_1.default)({
	windowMs: 15 * 60 * 1000,
	max: (req) => {
		const user = req.user;
		if (!user) return 5;
		switch (user.role) {
			case 'admin':
				return 500;
			case 'editor':
				return 200;
			case 'user':
			default:
				return 50;
		}
	},
	message: {
		error: 'Too many Python execution requests',
		retryAfter: '15 minutes',
	},
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => {
		const user = req.user;
		return user?.id || req.ip;
	},
});
class SecurityMetricsTracker {
	constructor() {
		this.metrics = {
			totalExecutions: 0,
			failedExecutions: 0,
			securityViolations: 0,
			averageExecutionTime: 0,
			lastSecurityEvent: null,
		};
		this.executionTimes = [];
		this.logger = di_1.Container.get(backend_common_1.Logger);
	}
	recordExecution(executionTime, success) {
		this.metrics.totalExecutions++;
		this.executionTimes.push(executionTime);
		if (!success) {
			this.metrics.failedExecutions++;
		}
		if (this.executionTimes.length > 100) {
			this.executionTimes.shift();
		}
		this.metrics.averageExecutionTime =
			this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
	}
	recordSecurityViolation() {
		this.metrics.securityViolations++;
		this.metrics.lastSecurityEvent = new Date();
		this.logger.warn('Security violation recorded', {
			totalViolations: this.metrics.securityViolations,
			timestamp: this.metrics.lastSecurityEvent,
		});
	}
	getMetrics() {
		return { ...this.metrics };
	}
	getFailureRate() {
		if (this.metrics.totalExecutions === 0) return 0;
		return this.metrics.failedExecutions / this.metrics.totalExecutions;
	}
}
const securityMetrics = new SecurityMetricsTracker();
const validatePythonCode = (req, res, next) => {
	const logger = di_1.Container.get(backend_common_1.Logger);
	const { code, packages = [] } = req.body;
	if (!code || typeof code !== 'string') {
		logger.warn('Invalid Python code in request', { userId: req.user?.id });
		securityMetrics.recordSecurityViolation();
		res.status(400).json({
			error: 'Invalid or missing Python code',
			code: 'INVALID_CODE',
		});
		return;
	}
	if (code.length > 50000) {
		logger.warn('Python code exceeds maximum length', {
			userId: req.user?.id,
			codeLength: code.length,
		});
		securityMetrics.recordSecurityViolation();
		res.status(400).json({
			error: 'Python code exceeds maximum length of 50,000 characters',
			code: 'CODE_TOO_LONG',
		});
		return;
	}
	const lineCount = code.split('\n').length;
	if (lineCount > 1000) {
		logger.warn('Python code exceeds maximum line count', {
			userId: req.user?.id,
			lineCount,
		});
		securityMetrics.recordSecurityViolation();
		res.status(400).json({
			error: 'Python code exceeds maximum line count of 1,000 lines',
			code: 'TOO_MANY_LINES',
		});
		return;
	}
	const securityPatterns = [
		/eval\s*\(/g,
		/exec\s*\(/g,
		/__import__\s*\(/g,
		/subprocess\./g,
		/os\.system/g,
		/os\.popen/g,
		/open\s*\([^)]*['"](\/etc|\/root|\/home|\/usr|\/var|\/sys|\/proc)/g,
		/socket\./g,
		/urllib\./g,
		/http\.client/g,
	];
	const violations = [];
	for (const pattern of securityPatterns) {
		if (pattern.test(code)) {
			violations.push(`Potentially dangerous pattern detected: ${pattern.source}`);
		}
	}
	if (violations.length > 0) {
		logger.warn('Security violations detected in Python code', {
			userId: req.user?.id,
			violations,
			codeHash: (0, crypto_1.createHash)('sha256').update(code).digest('hex').substring(0, 16),
		});
		securityMetrics.recordSecurityViolation();
		res.status(400).json({
			error: 'Security violations detected in code',
			code: 'SECURITY_VIOLATION',
			violations,
		});
		return;
	}
	if (packages.length > 50) {
		logger.warn('Too many packages requested', {
			userId: req.user?.id,
			packageCount: packages.length,
		});
		securityMetrics.recordSecurityViolation();
		res.status(400).json({
			error: 'Too many packages requested (maximum: 50)',
			code: 'TOO_MANY_PACKAGES',
		});
		return;
	}
	next();
};
exports.validatePythonCode = validatePythonCode;
const validateUserPermissions = (req, res, next) => {
	const logger = di_1.Container.get(backend_common_1.Logger);
	const user = req.user;
	if (!user) {
		logger.warn('Unauthenticated Python execution attempt', { ip: req.ip });
		securityMetrics.recordSecurityViolation();
		res.status(401).json({
			error: 'Authentication required for Python execution',
			code: 'AUTHENTICATION_REQUIRED',
		});
		return;
	}
	const hasPermission =
		user.permissions?.includes('python:execute') || user.role === 'admin' || user.role === 'editor';
	if (!hasPermission) {
		logger.warn('Unauthorized Python execution attempt', {
			userId: user.id,
			role: user.role,
			permissions: user.permissions,
		});
		securityMetrics.recordSecurityViolation();
		res.status(403).json({
			error: 'Insufficient permissions for Python execution',
			code: 'INSUFFICIENT_PERMISSIONS',
		});
		return;
	}
	next();
};
exports.validateUserPermissions = validateUserPermissions;
const sanitizePythonRequest = (req, res, next) => {
	const { body } = req;
	if (body.timeout !== undefined) {
		body.timeout = Math.min(Math.max(parseInt(String(body.timeout), 10) || 30000, 1000), 120000);
	}
	if (body.context && typeof body.context === 'object') {
		const dangerousKeys = ['__builtins__', '__globals__', '__locals__', 'eval', 'exec'];
		for (const key of dangerousKeys) {
			delete body.context[key];
		}
		const contextString = JSON.stringify(body.context);
		if (contextString.length > 100000) {
			res.status(400).json({
				error: 'Context data exceeds maximum size of 100KB',
				code: 'CONTEXT_TOO_LARGE',
			});
			return;
		}
	}
	if (body.packages && Array.isArray(body.packages)) {
		body.packages = body.packages
			.filter((pkg) => typeof pkg === 'string')
			.map((pkg) => pkg.trim().toLowerCase())
			.filter((pkg) => pkg.length > 0 && pkg.length < 100)
			.slice(0, 50);
	}
	next();
};
exports.sanitizePythonRequest = sanitizePythonRequest;
const monitorSecurityEvents = (req, res, next) => {
	const logger = di_1.Container.get(backend_common_1.Logger);
	const startTime = Date.now();
	logger.debug('Python execution request received', {
		userId: req.user?.id,
		ip: req.ip,
		userAgent: req.get('User-Agent'),
		codeLength: req.body.code?.length || 0,
		packages: req.body.packages?.length || 0,
		hasContext: !!req.body.context,
	});
	const originalJson = res.json;
	res.json = function (body) {
		const executionTime = Date.now() - startTime;
		const success = res.statusCode < 400;
		securityMetrics.recordExecution(executionTime, success);
		if (!success) {
			logger.warn('Python execution failed', {
				userId: req.user?.id,
				statusCode: res.statusCode,
				executionTime,
				error: body.error,
			});
		}
		return originalJson.call(this, body);
	};
	next();
};
exports.monitorSecurityEvents = monitorSecurityEvents;
const securityHealthCheck = (_req, res, next) => {
	const metrics = securityMetrics.getMetrics();
	const failureRate = securityMetrics.getFailureRate();
	if (failureRate > 0.5 && metrics.totalExecutions > 10) {
		const logger = di_1.Container.get(backend_common_1.Logger);
		logger.error('High failure rate detected in Python executions', {
			failureRate,
			totalExecutions: metrics.totalExecutions,
			failedExecutions: metrics.failedExecutions,
		});
		res.status(503).json({
			error: 'Python execution service temporarily unavailable due to high failure rate',
			code: 'SERVICE_DEGRADED',
			retryAfter: 300,
		});
		return;
	}
	next();
};
exports.securityHealthCheck = securityHealthCheck;
const getSecurityMetrics = (req, res) => {
	const user = req.user;
	if (!user || user.role !== 'admin') {
		res.status(403).json({
			error: 'Admin access required',
			code: 'ADMIN_ONLY',
		});
		return;
	}
	const metrics = securityMetrics.getMetrics();
	const sandboxService = di_1.Container.get(python_sandbox_service_1.PythonSandboxService);
	const auditLogs = sandboxService.getAuditLogs();
	res.json({
		metrics: {
			...metrics,
			failureRate: securityMetrics.getFailureRate(),
		},
		recentAuditLogs: auditLogs.slice(-10),
		securityConfig: sandboxService.getSecurityConfig(),
	});
};
exports.getSecurityMetrics = getSecurityMetrics;
exports.pythonSecurityMiddleware = [
	exports.pythonExecutionRateLimit,
	exports.validateUserPermissions,
	exports.sanitizePythonRequest,
	exports.validatePythonCode,
	exports.monitorSecurityEvents,
	exports.securityHealthCheck,
];
//# sourceMappingURL=python-security.middleware.js.map
