'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.auditMiddleware = exports.createAuditMiddleware = exports.AuditLoggingMiddleware = void 0;
const di_1 = require('@n8n/di');
const perf_hooks_1 = require('perf_hooks');
const n8n_workflow_1 = require('n8n-workflow');
const audit_logging_service_1 = require('@/services/audit-logging.service');
const security_monitoring_service_1 = require('@/services/security-monitoring.service');
const DEFAULT_CONFIG = {
	enabled: true,
	logAllRequests: false,
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
	logRequestBody: false,
	logResponseBody: false,
	detectSuspiciousActivity: true,
	riskScoreThreshold: 50,
};
class AuditLoggingMiddleware {
	constructor(config = {}) {
		this.logger = n8n_workflow_1.LoggerProxy;
		this.auditLoggingService = di_1.Container.get(audit_logging_service_1.AuditLoggingService);
		this.securityMonitoringService = di_1.Container.get(
			security_monitoring_service_1.SecurityMonitoringService,
		);
		this.requestCounts = new Map();
		this.suspiciousPatterns = [
			/(?:select|insert|update|delete|drop|create|alter|exec|union|script|javascript|<script)/i,
			/(?:\.\.\/|\.\.\\|\/etc\/passwd|\/bin\/sh|cmd\.exe|powershell)/i,
			/(?:<script|<iframe|javascript:|data:text\/html|vbscript:)/i,
			/(?:\b(?:admin|root|administrator|sa|system|guest)\b)/i,
		];
		this.auditRequest = () => {
			return async (req, res, next) => {
				if (!this.config.enabled) {
					return next();
				}
				if (this.shouldExcludePath(req.path)) {
					return next();
				}
				const startTime = perf_hooks_1.performance.now();
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
				await this.performPreRequestAnalysis(req);
				const originalJson = res.json.bind(res);
				const originalSend = res.send.bind(res);
				res.json = (body) => {
					this.captureResponse(req, res, body);
					return originalJson(body);
				};
				res.send = (body) => {
					this.captureResponse(req, res, body);
					return originalSend(body);
				};
				res.on('finish', async () => {
					await this.performPostRequestLogging(req, res);
				});
				res.on('error', async (error) => {
					await this.handleRequestError(req, res, error);
				});
				next();
			};
		};
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.startRequestCleanup();
	}
	async performPreRequestAnalysis(req) {
		const metadata = req.auditMetadata;
		let riskScore = 0;
		const suspiciousIndicators = [];
		const rateLimitAnalysis = this.analyzeRequestRate(metadata.ipAddress);
		if (rateLimitAnalysis.suspicious) {
			riskScore += 20;
			suspiciousIndicators.push('high_request_rate');
		}
		const urlAnalysis = this.analyzeUrlPatterns(req.originalUrl);
		if (urlAnalysis.suspicious) {
			riskScore += urlAnalysis.score;
			suspiciousIndicators.push(...urlAnalysis.indicators);
		}
		const uaAnalysis = this.analyzeUserAgent(metadata.userAgent);
		if (uaAnalysis.suspicious) {
			riskScore += uaAnalysis.score;
			suspiciousIndicators.push(...uaAnalysis.indicators);
		}
		if (req.user) {
			const authAnalysis = this.analyzeAuthenticationContext(req);
			if (authAnalysis.suspicious) {
				riskScore += authAnalysis.score;
				suspiciousIndicators.push(...authAnalysis.indicators);
			}
		}
		if (this.config.logRequestBody && req.body) {
			const bodyAnalysis = this.analyzeRequestBody(req.body);
			if (bodyAnalysis.suspicious) {
				riskScore += bodyAnalysis.score;
				suspiciousIndicators.push(...bodyAnalysis.indicators);
			}
		}
		metadata.riskScore = riskScore;
		metadata.suspiciousIndicators = suspiciousIndicators;
		if (riskScore >= this.config.riskScoreThreshold && this.config.detectSuspiciousActivity) {
			await this.securityMonitoringService.reportSuspiciousApiActivity(
				req,
				`Suspicious API activity detected: ${suspiciousIndicators.join(', ')}`,
				riskScore,
				req.user?.id,
			);
		}
	}
	captureResponse(req, res, body) {
		if (!req.auditMetadata) return;
		if (this.config.logResponseBody && this.shouldLogResponseBody(req.path, res.statusCode)) {
			req.auditMetadata.responseBody = this.sanitizeResponseBody(body);
		}
	}
	async performPostRequestLogging(req, res) {
		if (!req.auditMetadata) return;
		const endTime = perf_hooks_1.performance.now();
		const responseTimeMs = Math.round(endTime - req.auditMetadata.startTime);
		const statusCode = res.statusCode;
		try {
			const shouldLog = this.shouldLogRequest(req, res);
			if (shouldLog || this.config.logAllRequests) {
				await this.auditLoggingService.logApiCall(
					req,
					statusCode,
					responseTimeMs,
					req.user?.id || undefined,
					req.user?.globalRole?.projectId || undefined,
					this.getErrorMessage(req, res) || undefined,
				);
			}
			await this.logSpecificAuditEvents(req, res);
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
	async handleRequestError(req, res, error) {
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
	shouldLogRequest(req, res) {
		if (req.path.includes('/auth') || req.path.includes('/login') || req.path.includes('/logout')) {
			return true;
		}
		if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
			return true;
		}
		if (res.statusCode >= 400) {
			return true;
		}
		if (req.auditMetadata && req.auditMetadata.riskScore >= this.config.riskScoreThreshold) {
			return true;
		}
		if (req.path.includes('/admin') || req.path.includes('/settings')) {
			return true;
		}
		if (req.path.includes('/credentials') || req.path.includes('/workflows')) {
			return true;
		}
		return false;
	}
	async logSpecificAuditEvents(req, res) {
		const path = req.path.toLowerCase();
		const method = req.method.toUpperCase();
		if (path.includes('/workflows')) {
			let eventType = null;
			if (method === 'POST' && res.statusCode < 300) {
				eventType = 'workflow_created';
			} else if (method === 'PUT' && res.statusCode < 300) {
				eventType = 'workflow_updated';
			} else if (method === 'DELETE' && res.statusCode < 300) {
				eventType = 'workflow_deleted';
			}
			if (eventType) {
				await this.auditLoggingService.logEvent({
					eventType: eventType,
					category: 'workflow_management',
					severity: 'medium',
					description: `Workflow ${eventType.replace('workflow_', '')}`,
					userId: req.user?.id,
					resourceType: 'workflow',
					resourceId: req.params.id || null,
					ipAddress: req.auditMetadata?.ipAddress,
					userAgent: req.auditMetadata?.userAgent,
					httpMethod: method,
					endpoint: req.path,
					statusCode: res.statusCode,
				});
			}
		}
		if (path.includes('/credentials')) {
			let eventType = null;
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
					eventType: eventType,
					category: 'data_access',
					severity: eventType === 'credential_accessed' ? 'medium' : 'high',
					description: `Credential ${eventType.replace('credential_', '')}`,
					userId: req.user?.id,
					resourceType: 'credential',
					resourceId: req.params.id || null,
					ipAddress: req.auditMetadata?.ipAddress,
					userAgent: req.auditMetadata?.userAgent,
					httpMethod: method,
					endpoint: req.path,
					statusCode: res.statusCode,
				});
			}
		}
		if (path.includes('/users')) {
			let eventType = null;
			if (method === 'POST' && res.statusCode < 300) {
				eventType = 'user_created';
			} else if (method === 'PUT' && res.statusCode < 300) {
				eventType = 'user_updated';
			} else if (method === 'DELETE' && res.statusCode < 300) {
				eventType = 'user_deleted';
			}
			if (eventType) {
				await this.auditLoggingService.logEvent({
					eventType: eventType,
					category: 'user_management',
					severity: 'high',
					description: `User ${eventType.replace('user_', '')}`,
					userId: req.user?.id,
					resourceType: 'user',
					resourceId: req.params.id || null,
					ipAddress: req.auditMetadata?.ipAddress,
					userAgent: req.auditMetadata?.userAgent,
					httpMethod: method,
					endpoint: req.path,
					statusCode: res.statusCode,
				});
			}
		}
	}
	async logSecurityEvent(req, res, responseTimeMs) {
		const statusCode = res.statusCode;
		let eventType = null;
		let severity = 'medium';
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
				eventType: eventType,
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
	analyzeRequestRate(ipAddress) {
		const now = Date.now();
		const windowMs = 60 * 1000;
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
	analyzeUrlPatterns(url) {
		const indicators = [];
		let score = 0;
		for (const pattern of this.suspiciousPatterns) {
			if (pattern.test(url)) {
				indicators.push('suspicious_url_pattern');
				score += 15;
			}
		}
		if (url.includes('..') || url.includes('%2e%2e')) {
			indicators.push('path_traversal_attempt');
			score += 20;
		}
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
	analyzeUserAgent(userAgent) {
		const indicators = [];
		let score = 0;
		if (!userAgent || userAgent.trim().length === 0) {
			indicators.push('empty_user_agent');
			score += 5;
		} else if (userAgent.length < 10) {
			indicators.push('short_user_agent');
			score += 10;
		}
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
	analyzeAuthenticationContext(_req) {
		const indicators = [];
		let score = 0;
		return {
			suspicious: score > 0,
			score,
			indicators,
		};
	}
	analyzeRequestBody(body) {
		const indicators = [];
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
		} catch (error) {}
		return {
			suspicious: score > 0,
			score,
			indicators,
		};
	}
	shouldExcludePath(path) {
		return this.config.excludePaths.some((excludePath) => path.startsWith(excludePath));
	}
	shouldLogResponseBody(path, statusCode) {
		return (
			statusCode < 400 &&
			(path.includes('/credentials') || path.includes('/workflows') || path.includes('/users'))
		);
	}
	sanitizeResponseBody(body) {
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
	extractIpAddress(req) {
		const forwardedFor = req.get('X-Forwarded-For');
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}
		return req.ip || req.connection.remoteAddress || 'unknown';
	}
	generateRequestId() {
		return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
	getErrorMessage(req, res) {
		if (res.statusCode >= 400) {
			return `HTTP ${res.statusCode} - ${req.method} ${req.path}`;
		}
		return null;
	}
	startRequestCleanup() {
		setInterval(() => {
			const now = Date.now();
			const cleanupThreshold = 5 * 60 * 1000;
			for (const [ip, data] of this.requestCounts) {
				if (now - data.lastRequest > cleanupThreshold) {
					this.requestCounts.delete(ip);
				}
			}
		}, 60 * 1000);
	}
}
exports.AuditLoggingMiddleware = AuditLoggingMiddleware;
const createAuditMiddleware = (config) => {
	const middleware = new AuditLoggingMiddleware(config);
	return middleware.auditRequest();
};
exports.createAuditMiddleware = createAuditMiddleware;
exports.auditMiddleware = (0, exports.createAuditMiddleware)();
//# sourceMappingURL=audit-logging.middleware.js.map
