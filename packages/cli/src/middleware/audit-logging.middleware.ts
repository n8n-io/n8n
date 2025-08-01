import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { NextFunction, Response } from 'express';
import { performance } from 'perf_hooks';

import { LoggerProxy } from 'n8n-workflow';
import { AuditLoggingService } from '@/services/audit-logging.service';
import { SecurityMonitoringService } from '@/services/security-monitoring.service';

/**
 * Configuration for audit logging middleware
 */
export interface AuditMiddlewareConfig {
	enabled: boolean;
	logAllRequests: boolean;
	excludePaths: string[];
	sensitiveFields: string[];
	logRequestBody: boolean;
	logResponseBody: boolean;
	detectSuspiciousActivity: boolean;
	riskScoreThreshold: number;
}

/**
 * Default configuration for audit middleware
 */
const DEFAULT_CONFIG: AuditMiddlewareConfig = {
	enabled: true,
	logAllRequests: false, // Only log significant events by default
	excludePaths: ['/healthz', '/health', '/metrics', '/favicon.ico', '/static/', '/assets/'],
	sensitiveFields: [
		'password',
		'token',
		'apiKey',
		'secret',
		'authorization',
		'cookie',
		'x-api-key',
		'x-auth-token',
	],
	logRequestBody: false, // Privacy consideration - only for specific endpoints
	logResponseBody: false, // Privacy consideration - only for specific endpoints
	detectSuspiciousActivity: true,
	riskScoreThreshold: 50,
};

/**
 * Extended request interface with audit metadata
 */
export interface AuditableRequest extends AuthenticatedRequest {
	auditMetadata?: {
		startTime: number;
		requestId: string;
		ipAddress: string;
		userAgent: string;
		riskScore: number;
		suspiciousIndicators: string[];
	};
}

/**
 * Audit logging middleware for comprehensive API request/response tracking
 */
export class AuditLoggingMiddleware {
	private readonly logger = LoggerProxy;
	private readonly auditLoggingService = Container.get(AuditLoggingService);
	private readonly securityMonitoringService = Container.get(SecurityMonitoringService);
	private readonly config: AuditMiddlewareConfig;

	// Request rate tracking for suspicious activity detection
	private readonly requestCounts = new Map<
		string,
		{ count: number; firstRequest: number; lastRequest: number }
	>();

	// Pattern detection for suspicious activity
	private readonly suspiciousPatterns = [
		/(?:select|insert|update|delete|drop|create|alter|exec|union|script|javascript|<script)/i,
		/(?:\.\.\/|\.\.\\|\/etc\/passwd|\/bin\/sh|cmd\.exe|powershell)/i,
		/(?:<script|<iframe|javascript:|data:text\/html|vbscript:)/i,
		/(?:\b(?:admin|root|administrator|sa|system|guest)\b)/i,
	];

	constructor(config: Partial<AuditMiddlewareConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };

		// Start cleanup interval for request tracking
		this.startRequestCleanup();
	}

	/**
	 * Main middleware function for audit logging
	 */
	auditRequest = () => {
		return async (req: AuditableRequest, res: Response, next: NextFunction): Promise<void> => {
			// Skip if audit logging is disabled
			if (!this.config.enabled) {
				return next();
			}

			// Skip excluded paths
			if (this.shouldExcludePath(req.path)) {
				return next();
			}

			// Initialize audit metadata
			const startTime = performance.now();
			const requestId = this.generateRequestId();
			const ipAddress = this.extractIpAddress(req);
			const userAgent = req.get('User-Agent') || '';

			req.auditMetadata = {
				startTime,
				requestId,
				ipAddress,
				userAgent,
				riskScore: 0,
				suspiciousIndicators: [],
			};

			// Perform pre-request analysis
			await this.performPreRequestAnalysis(req);

			// Override res.json to capture response data
			const originalJson = res.json.bind(res);
			const originalSend = res.send.bind(res);

			res.json = (body: any) => {
				this.captureResponse(req, res, body);
				return originalJson(body);
			};

			res.send = (body: any) => {
				this.captureResponse(req, res, body);
				return originalSend(body);
			};

			// Handle response completion
			res.on('finish', async () => {
				await this.performPostRequestLogging(req, res);
			});

			// Handle errors
			res.on('error', async (error) => {
				await this.handleRequestError(req, res, error);
			});

			next();
		};
	};

	/**
	 * Perform pre-request security analysis
	 */
	private async performPreRequestAnalysis(req: AuditableRequest): Promise<void> {
		const metadata = req.auditMetadata!;
		let riskScore = 0;
		const suspiciousIndicators: string[] = [];

		// Rate limiting analysis
		const rateLimitAnalysis = this.analyzeRequestRate(metadata.ipAddress);
		if (rateLimitAnalysis.suspicious) {
			riskScore += 20;
			suspiciousIndicators.push('high_request_rate');
		}

		// Suspicious pattern detection in URL and query parameters
		const urlAnalysis = this.analyzeUrlPatterns(req.originalUrl);
		if (urlAnalysis.suspicious) {
			riskScore += urlAnalysis.score;
			suspiciousIndicators.push(...urlAnalysis.indicators);
		}

		// User agent analysis
		const uaAnalysis = this.analyzeUserAgent(metadata.userAgent);
		if (uaAnalysis.suspicious) {
			riskScore += uaAnalysis.score;
			suspiciousIndicators.push(...uaAnalysis.indicators);
		}

		// Authentication analysis
		if (req.user) {
			const authAnalysis = this.analyzeAuthenticationContext(req);
			if (authAnalysis.suspicious) {
				riskScore += authAnalysis.score;
				suspiciousIndicators.push(...authAnalysis.indicators);
			}
		}

		// Request body analysis (if configured and body exists)
		if (this.config.logRequestBody && req.body) {
			const bodyAnalysis = this.analyzeRequestBody(req.body);
			if (bodyAnalysis.suspicious) {
				riskScore += bodyAnalysis.score;
				suspiciousIndicators.push(...bodyAnalysis.indicators);
			}
		}

		// Update metadata
		metadata.riskScore = riskScore;
		metadata.suspiciousIndicators = suspiciousIndicators;

		// Report high-risk activities immediately
		if (riskScore >= this.config.riskScoreThreshold && this.config.detectSuspiciousActivity) {
			await this.securityMonitoringService.reportSuspiciousApiActivity(
				req,
				`Suspicious API activity detected: ${suspiciousIndicators.join(', ')}`,
				riskScore,
				req.user?.id,
			);
		}
	}

	/**
	 * Capture response data for logging
	 */
	private captureResponse(req: AuditableRequest, res: Response, body: any): void {
		if (!req.auditMetadata) return;

		// Store response body if configured (be careful with sensitive data)
		if (this.config.logResponseBody && this.shouldLogResponseBody(req.path, res.statusCode)) {
			req.auditMetadata.responseBody = this.sanitizeResponseBody(body);
		}
	}

	/**
	 * Perform post-request audit logging
	 */
	private async performPostRequestLogging(req: AuditableRequest, res: Response): Promise<void> {
		if (!req.auditMetadata) return;

		const endTime = performance.now();
		const responseTimeMs = Math.round(endTime - req.auditMetadata.startTime);
		const statusCode = res.statusCode;

		try {
			// Always log certain events (authentication, errors, high-risk activities)
			const shouldLog = this.shouldLogRequest(req, res);

			if (shouldLog || this.config.logAllRequests) {
				await this.auditLoggingService.logApiCall(
					req,
					statusCode,
					responseTimeMs,
					req.user?.id,
					req.user?.globalRole?.projectId,
					this.getErrorMessage(req, res),
				);
			}

			// Log specific audit events based on the endpoint
			await this.logSpecificAuditEvents(req, res);

			// Log security events for failed requests
			if (statusCode >= 400) {
				await this.logSecurityEvent(req, res, responseTimeMs);
			}
		} catch (error) {
			this.logger.error('Failed to log audit event in middleware', {
				error: error instanceof Error ? error.message : String(error),
				requestId: req.auditMetadata.requestId,
				path: req.path,
				method: req.method,
			});
		}
	}

	/**
	 * Handle request errors
	 */
	private async handleRequestError(
		req: AuditableRequest,
		res: Response,
		error: Error,
	): Promise<void> {
		if (!req.auditMetadata) return;

		try {
			await this.auditLoggingService.logEvent({
				eventType: 'api_call',
				category: 'data_access',
				severity: 'high',
				description: `API request error: ${req.method} ${req.path}`,
				userId: req.user?.id,
				ipAddress: req.auditMetadata.ipAddress,
				userAgent: req.auditMetadata.userAgent,
				httpMethod: req.method,
				endpoint: req.path,
				statusCode: res.statusCode || 500,
				errorMessage: error.message,
				metadata: {
					requestId: req.auditMetadata.requestId,
					riskScore: req.auditMetadata.riskScore,
					suspiciousIndicators: req.auditMetadata.suspiciousIndicators,
				},
			});
		} catch (loggingError) {
			this.logger.error('Failed to log request error', {
				originalError: error.message,
				loggingError: loggingError instanceof Error ? loggingError.message : String(loggingError),
			});
		}
	}

	/**
	 * Determine if request should be logged
	 */
	private shouldLogRequest(req: AuditableRequest, res: Response): boolean {
		// Always log authentication-related endpoints
		if (req.path.includes('/auth') || req.path.includes('/login') || req.path.includes('/logout')) {
			return true;
		}

		// Always log data modification operations
		if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
			return true;
		}

		// Always log error responses
		if (res.statusCode >= 400) {
			return true;
		}

		// Always log high-risk requests
		if (req.auditMetadata && req.auditMetadata.riskScore >= this.config.riskScoreThreshold) {
			return true;
		}

		// Log admin operations
		if (req.path.includes('/admin') || req.path.includes('/settings')) {
			return true;
		}

		// Log credential and workflow operations
		if (req.path.includes('/credentials') || req.path.includes('/workflows')) {
			return true;
		}

		return false;
	}

	/**
	 * Log specific audit events based on endpoint patterns
	 */
	private async logSpecificAuditEvents(req: AuditableRequest, res: Response): Promise<void> {
		const path = req.path.toLowerCase();
		const method = req.method.toUpperCase();

		// Workflow operations
		if (path.includes('/workflows')) {
			let eventType: string | null = null;

			if (method === 'POST' && res.statusCode < 300) {
				eventType = 'workflow_created';
			} else if (method === 'PUT' && res.statusCode < 300) {
				eventType = 'workflow_updated';
			} else if (method === 'DELETE' && res.statusCode < 300) {
				eventType = 'workflow_deleted';
			}

			if (eventType) {
				await this.auditLoggingService.logEvent({
					eventType: eventType as any,
					category: 'workflow_management',
					severity: 'medium',
					description: `Workflow ${eventType.replace('workflow_', '')}`,
					userId: req.user?.id,
					resourceType: 'workflow',
					resourceId: req.params.id,
					ipAddress: req.auditMetadata?.ipAddress,
					userAgent: req.auditMetadata?.userAgent,
					httpMethod: method,
					endpoint: req.path,
					statusCode: res.statusCode,
				});
			}
		}

		// Credential operations
		if (path.includes('/credentials')) {
			let eventType: string | null = null;

			if (method === 'POST' && res.statusCode < 300) {
				eventType = 'credential_created';
			} else if (method === 'PUT' && res.statusCode < 300) {
				eventType = 'credential_updated';
			} else if (method === 'DELETE' && res.statusCode < 300) {
				eventType = 'credential_deleted';
			} else if (method === 'GET' && req.params.id) {
				eventType = 'credential_accessed';
			}

			if (eventType) {
				await this.auditLoggingService.logEvent({
					eventType: eventType as any,
					category: 'data_access',
					severity: eventType === 'credential_accessed' ? 'medium' : 'high',
					description: `Credential ${eventType.replace('credential_', '')}`,
					userId: req.user?.id,
					resourceType: 'credential',
					resourceId: req.params.id,
					ipAddress: req.auditMetadata?.ipAddress,
					userAgent: req.auditMetadata?.userAgent,
					httpMethod: method,
					endpoint: req.path,
					statusCode: res.statusCode,
				});
			}
		}

		// User management operations
		if (path.includes('/users')) {
			let eventType: string | null = null;

			if (method === 'POST' && res.statusCode < 300) {
				eventType = 'user_created';
			} else if (method === 'PUT' && res.statusCode < 300) {
				eventType = 'user_updated';
			} else if (method === 'DELETE' && res.statusCode < 300) {
				eventType = 'user_deleted';
			}

			if (eventType) {
				await this.auditLoggingService.logEvent({
					eventType: eventType as any,
					category: 'user_management',
					severity: 'high',
					description: `User ${eventType.replace('user_', '')}`,
					userId: req.user?.id,
					resourceType: 'user',
					resourceId: req.params.id,
					ipAddress: req.auditMetadata?.ipAddress,
					userAgent: req.auditMetadata?.userAgent,
					httpMethod: method,
					endpoint: req.path,
					statusCode: res.statusCode,
				});
			}
		}
	}

	/**
	 * Log security events for failed requests
	 */
	private async logSecurityEvent(
		req: AuditableRequest,
		res: Response,
		responseTimeMs: number,
	): Promise<void> {
		const statusCode = res.statusCode;
		let eventType: string | null = null;
		let severity: 'info' | 'low' | 'medium' | 'high' | 'critical' = 'medium';

		if (statusCode === 401) {
			eventType = 'unauthorized_access_attempt';
			severity = 'high';
		} else if (statusCode === 403) {
			eventType = 'unauthorized_access_attempt';
			severity = 'high';
		} else if (statusCode === 429) {
			eventType = 'rate_limit_exceeded';
			severity = 'medium';
		} else if (statusCode >= 500) {
			eventType = 'system_compromise_indicator';
			severity = 'high';
		}

		if (eventType && req.auditMetadata) {
			await this.securityMonitoringService.reportSecurityEvent({
				eventType: eventType as any,
				severity,
				threatLevel: severity === 'high' ? 'high' : 'moderate',
				title: `HTTP ${statusCode} - ${req.method} ${req.path}`,
				description: `Failed API request: ${req.method} ${req.path} returned ${statusCode}`,
				userId: req.user?.id,
				ipAddress: req.auditMetadata.ipAddress,
				userAgent: req.auditMetadata.userAgent,
				sessionId: req.sessionID,
				requestId: req.auditMetadata.requestId,
				httpMethod: req.method,
				endpoint: req.path,
				statusCode,
				riskScore: req.auditMetadata.riskScore,
				metadata: {
					responseTimeMs,
					suspiciousIndicators: req.auditMetadata.suspiciousIndicators,
				},
				tags: ['api_failure', statusCode.toString()],
			});
		}
	}

	/**
	 * Analyze request rate for potential abuse
	 */
	private analyzeRequestRate(ipAddress: string): { suspicious: boolean; score: number } {
		const now = Date.now();
		const windowMs = 60 * 1000; // 1 minute window
		const maxRequestsPerWindow = 100;

		const existing = this.requestCounts.get(ipAddress);

		if (existing) {
			if (now - existing.firstRequest < windowMs) {
				existing.count++;
				existing.lastRequest = now;

				if (existing.count > maxRequestsPerWindow) {
					return { suspicious: true, score: 25 };
				}
			} else {
				// Reset window
				this.requestCounts.set(ipAddress, {
					count: 1,
					firstRequest: now,
					lastRequest: now,
				});
			}
		} else {
			this.requestCounts.set(ipAddress, {
				count: 1,
				firstRequest: now,
				lastRequest: now,
			});
		}

		return { suspicious: false, score: 0 };
	}

	/**
	 * Analyze URL patterns for suspicious content
	 */
	private analyzeUrlPatterns(url: string): {
		suspicious: boolean;
		score: number;
		indicators: string[];
	} {
		const indicators: string[] = [];
		let score = 0;

		for (const pattern of this.suspiciousPatterns) {
			if (pattern.test(url)) {
				indicators.push('suspicious_url_pattern');
				score += 15;
			}
		}

		// Check for excessive path traversal attempts
		if (url.includes('..') || url.includes('%2e%2e')) {
			indicators.push('path_traversal_attempt');
			score += 20;
		}

		// Check for potential injection attempts
		if (url.includes('<') || url.includes('>') || url.includes('"') || url.includes("'")) {
			indicators.push('potential_injection');
			score += 10;
		}

		return {
			suspicious: score > 0,
			score,
			indicators,
		};
	}

	/**
	 * Analyze user agent for suspicious patterns
	 */
	private analyzeUserAgent(userAgent: string): {
		suspicious: boolean;
		score: number;
		indicators: string[];
	} {
		const indicators: string[] = [];
		let score = 0;

		// Check for empty or suspicious user agents
		if (!userAgent || userAgent.trim().length === 0) {
			indicators.push('empty_user_agent');
			score += 5;
		} else if (userAgent.length < 10) {
			indicators.push('short_user_agent');
			score += 10;
		}

		// Check for known bot/scanner patterns
		const botPatterns = [
			/curl/i,
			/wget/i,
			/python/i,
			/sqlmap/i,
			/nikto/i,
			/nmap/i,
			/scanner/i,
			/bot/i,
		];

		for (const pattern of botPatterns) {
			if (pattern.test(userAgent)) {
				indicators.push('bot_user_agent');
				score += 15;
				break;
			}
		}

		return {
			suspicious: score > 0,
			score,
			indicators,
		};
	}

	/**
	 * Analyze authentication context for anomalies
	 */
	private analyzeAuthenticationContext(req: AuditableRequest): {
		suspicious: boolean;
		score: number;
		indicators: string[];
	} {
		const indicators: string[] = [];
		let score = 0;

		// This is a placeholder for more sophisticated authentication analysis
		// In production, you might check for:
		// - Unusual login patterns
		// - Session anomalies
		// - Privilege escalation attempts
		// - Geographic anomalies

		return {
			suspicious: score > 0,
			score,
			indicators,
		};
	}

	/**
	 * Analyze request body for suspicious content
	 */
	private analyzeRequestBody(body: any): {
		suspicious: boolean;
		score: number;
		indicators: string[];
	} {
		const indicators: string[] = [];
		let score = 0;

		try {
			const bodyStr = JSON.stringify(body).toLowerCase();

			for (const pattern of this.suspiciousPatterns) {
				if (pattern.test(bodyStr)) {
					indicators.push('suspicious_body_content');
					score += 20;
					break;
				}
			}
		} catch (error) {
			// Ignore JSON stringify errors
		}

		return {
			suspicious: score > 0,
			score,
			indicators,
		};
	}

	/**
	 * Utility methods
	 */
	private shouldExcludePath(path: string): boolean {
		return this.config.excludePaths.some((excludePath) => path.startsWith(excludePath));
	}

	private shouldLogResponseBody(path: string, statusCode: number): boolean {
		// Only log response bodies for specific endpoints and successful responses
		return (
			statusCode < 400 &&
			(path.includes('/credentials') || path.includes('/workflows') || path.includes('/users'))
		);
	}

	private sanitizeResponseBody(body: any): any {
		// Remove sensitive fields from response body
		if (typeof body === 'object' && body !== null) {
			const sanitized = { ...body };
			for (const field of this.config.sensitiveFields) {
				if (sanitized[field]) {
					sanitized[field] = '[REDACTED]';
				}
			}
			return sanitized;
		}
		return body;
	}

	private extractIpAddress(req: AuditableRequest): string {
		const forwardedFor = req.get('X-Forwarded-For');
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}
		return req.ip || req.connection.remoteAddress || 'unknown';
	}

	private generateRequestId(): string {
		return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private getErrorMessage(req: AuditableRequest, res: Response): string | null {
		if (res.statusCode >= 400) {
			return `HTTP ${res.statusCode} - ${req.method} ${req.path}`;
		}
		return null;
	}

	/**
	 * Start cleanup process for request tracking
	 */
	private startRequestCleanup(): void {
		setInterval(() => {
			const now = Date.now();
			const cleanupThreshold = 5 * 60 * 1000; // 5 minutes

			for (const [ip, data] of this.requestCounts) {
				if (now - data.lastRequest > cleanupThreshold) {
					this.requestCounts.delete(ip);
				}
			}
		}, 60 * 1000); // Cleanup every minute
	}
}

/**
 * Create audit logging middleware instance
 */
export const createAuditMiddleware = (config?: Partial<AuditMiddlewareConfig>) => {
	const middleware = new AuditLoggingMiddleware(config);
	return middleware.auditRequest();
};

/**
 * Default audit middleware instance
 */
export const auditMiddleware = createAuditMiddleware();
