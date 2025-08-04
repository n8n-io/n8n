import type { Request, Response, NextFunction } from 'express';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { PythonSandboxService } from '../security/python-sandbox.service';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';

interface PythonExecutionRequest extends Request {
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

interface SecurityMetrics {
	totalExecutions: number;
	failedExecutions: number;
	securityViolations: number;
	averageExecutionTime: number;
	lastSecurityEvent: Date | null;
}

/**
 * Rate limiting for Python execution endpoints
 */
export const pythonExecutionRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: (req: Request) => {
		const user = (req as any).user;
		if (!user) return 5; // Anonymous users: 5 requests per 15 minutes

		switch (user.role) {
			case 'admin':
				return 500; // Admin users: 500 requests per 15 minutes
			case 'editor':
				return 200; // Editor users: 200 requests per 15 minutes
			case 'user':
			default:
				return 50; // Regular users: 50 requests per 15 minutes
		}
	},
	message: {
		error: 'Too many Python execution requests',
		retryAfter: '15 minutes',
	},
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request) => {
		const user = (req as any).user;
		return user?.id || req.ip;
	},
});

/**
 * Security metrics tracking
 */
class SecurityMetricsTracker {
	private metrics: SecurityMetrics = {
		totalExecutions: 0,
		failedExecutions: 0,
		securityViolations: 0,
		averageExecutionTime: 0,
		lastSecurityEvent: null,
	};

	private executionTimes: number[] = [];
	private readonly logger = Container.get(Logger);

	recordExecution(executionTime: number, success: boolean): void {
		this.metrics.totalExecutions++;
		this.executionTimes.push(executionTime);

		if (!success) {
			this.metrics.failedExecutions++;
		}

		// Keep only the last 100 execution times for average calculation
		if (this.executionTimes.length > 100) {
			this.executionTimes.shift();
		}

		this.metrics.averageExecutionTime =
			this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
	}

	recordSecurityViolation(): void {
		this.metrics.securityViolations++;
		this.metrics.lastSecurityEvent = new Date();

		this.logger.warn('Security violation recorded', {
			totalViolations: this.metrics.securityViolations,
			timestamp: this.metrics.lastSecurityEvent,
		});
	}

	getMetrics(): SecurityMetrics {
		return { ...this.metrics };
	}

	getFailureRate(): number {
		if (this.metrics.totalExecutions === 0) return 0;
		return this.metrics.failedExecutions / this.metrics.totalExecutions;
	}
}

const securityMetrics = new SecurityMetricsTracker();

/**
 * Python code security validation middleware
 */
export const validatePythonCode = (
	req: PythonExecutionRequest,
	res: Response,
	next: NextFunction,
): void => {
	const logger = Container.get(Logger);
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

	// Code length validation
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

	// Line count validation
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

	// Basic security pattern detection
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
			codeHash: createHash('sha256').update(code).digest('hex').substring(0, 16),
		});
		securityMetrics.recordSecurityViolation();

		res.status(400).json({
			error: 'Security violations detected in code',
			code: 'SECURITY_VIOLATION',
			violations,
		});
		return;
	}

	// Package validation
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

/**
 * User permission validation middleware
 */
export const validateUserPermissions = (
	req: PythonExecutionRequest,
	res: Response,
	next: NextFunction,
): void => {
	const logger = Container.get(Logger);
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

	// Check if user has Python execution permission
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

/**
 * Request sanitization middleware
 */
export const sanitizePythonRequest = (
	req: PythonExecutionRequest,
	res: Response,
	next: NextFunction,
): void => {
	const { body } = req;

	// Sanitize timeout
	if (body.timeout !== undefined) {
		body.timeout = Math.min(Math.max(parseInt(String(body.timeout), 10) || 30000, 1000), 120000);
	}

	// Sanitize context
	if (body.context && typeof body.context === 'object') {
		// Remove potentially dangerous context keys
		const dangerousKeys = ['__builtins__', '__globals__', '__locals__', 'eval', 'exec'];
		for (const key of dangerousKeys) {
			delete body.context[key];
		}

		// Limit context size
		const contextString = JSON.stringify(body.context);
		if (contextString.length > 100000) {
			res.status(400).json({
				error: 'Context data exceeds maximum size of 100KB',
				code: 'CONTEXT_TOO_LARGE',
			});
			return;
		}
	}

	// Sanitize packages array
	if (body.packages && Array.isArray(body.packages)) {
		body.packages = body.packages
			.filter((pkg): pkg is string => typeof pkg === 'string')
			.map((pkg) => pkg.trim().toLowerCase())
			.filter((pkg) => pkg.length > 0 && pkg.length < 100)
			.slice(0, 50); // Limit to 50 packages
	}

	next();
};

/**
 * Security monitoring middleware
 */
export const monitorSecurityEvents = (
	req: PythonExecutionRequest,
	res: Response,
	next: NextFunction,
): void => {
	const logger = Container.get(Logger);
	const startTime = Date.now();

	// Log the request
	logger.debug('Python execution request received', {
		userId: req.user?.id,
		ip: req.ip,
		userAgent: req.get('User-Agent'),
		codeLength: req.body.code?.length || 0,
		packages: req.body.packages?.length || 0,
		hasContext: !!req.body.context,
	});

	// Override res.json to capture response
	const originalJson = res.json;
	res.json = function (body: any) {
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

/**
 * Security health check middleware
 */
export const securityHealthCheck = (_req: Request, res: Response, next: NextFunction): void => {
	const metrics = securityMetrics.getMetrics();
	const failureRate = securityMetrics.getFailureRate();

	// Check if failure rate is too high
	if (failureRate > 0.5 && metrics.totalExecutions > 10) {
		const logger = Container.get(Logger);
		logger.error('High failure rate detected in Python executions', {
			failureRate,
			totalExecutions: metrics.totalExecutions,
			failedExecutions: metrics.failedExecutions,
		});

		res.status(503).json({
			error: 'Python execution service temporarily unavailable due to high failure rate',
			code: 'SERVICE_DEGRADED',
			retryAfter: 300, // 5 minutes
		});
		return;
	}

	next();
};

/**
 * Get security metrics (for admin endpoints)
 */
export const getSecurityMetrics = (req: Request, res: Response): void => {
	const user = (req as any).user;

	if (!user || user.role !== 'admin') {
		res.status(403).json({
			error: 'Admin access required',
			code: 'ADMIN_ONLY',
		});
		return;
	}

	const metrics = securityMetrics.getMetrics();
	const sandboxService = Container.get(PythonSandboxService);
	const auditLogs = sandboxService.getAuditLogs();

	res.json({
		metrics: {
			...metrics,
			failureRate: securityMetrics.getFailureRate(),
		},
		recentAuditLogs: auditLogs.slice(-10), // Last 10 audit logs
		securityConfig: sandboxService.getSecurityConfig(),
	});
};

/**
 * Combined security middleware stack
 */
export const pythonSecurityMiddleware = [
	pythonExecutionRateLimit,
	validateUserPermissions,
	sanitizePythonRequest,
	validatePythonCode,
	monitorSecurityEvents,
	securityHealthCheck,
];
