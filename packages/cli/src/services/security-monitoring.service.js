'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.SecurityMonitoringService = void 0;
const db_1 = require('@n8n/db');
const typeorm_1 = require('@n8n/typeorm');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const event_service_1 = require('@/events/event.service');
const audit_logging_service_1 = require('./audit-logging.service');
let SecurityMonitoringService = class SecurityMonitoringService {
	constructor() {
		this.logger = n8n_workflow_1.LoggerProxy;
		this.eventService = di_1.Container.get(event_service_1.EventService);
		this.auditLoggingService = di_1.Container.get(audit_logging_service_1.AuditLoggingService);
		this.threatDetectionRules = new Map();
		this.eventAggregator = new Map();
		const dataSource = di_1.Container.get(typeorm_1.DataSource);
		this.securityEventRepository = dataSource.getRepository(db_1.SecurityEvent);
		this.initializeThreatDetectionRules();
		this.startEventAggregationCleanup();
	}
	async reportSecurityEvent(eventData) {
		try {
			const securityEvent = await this.createSecurityEvent(eventData);
			await this.analyzeSecurityEvent(securityEvent);
			this.updateEventAggregation(securityEvent);
			await this.checkThreatPatterns(securityEvent);
			return securityEvent;
		} catch (error) {
			this.logger.error('Failed to report security event', {
				error: error instanceof Error ? error.message : String(error),
				eventData,
			});
			throw new Error(
				`Security event reporting failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async reportFailedLogin(ipAddress, userAgent, userId, additionalData) {
		const recentFailures = await this.getRecentFailedLogins(ipAddress, 15);
		const isPatternDetected = recentFailures.length >= 5;
		return this.reportSecurityEvent({
			eventType: isPatternDetected ? 'brute_force_attack' : 'failed_login_attempt',
			severity: isPatternDetected ? 'high' : 'medium',
			threatLevel: isPatternDetected ? 'high' : 'moderate',
			title: isPatternDetected ? 'Brute Force Attack Detected' : 'Failed Login Attempt',
			description: isPatternDetected
				? `Brute force attack detected from ${ipAddress} - ${recentFailures.length + 1} failed attempts`
				: `Failed login attempt from ${ipAddress}`,
			userId,
			ipAddress,
			userAgent,
			eventCount: recentFailures.length + 1,
			aggregationWindowMinutes: 15,
			metadata: {
				...additionalData,
				recentFailureCount: recentFailures.length,
				isPatternDetected,
			},
			riskScore: isPatternDetected ? 85 : 35,
			automaticActions: isPatternDetected ? ['rate_limit', 'alert_admin'] : ['log'],
			tags: isPatternDetected
				? ['brute_force', 'authentication', 'critical']
				: ['authentication', 'failure'],
			requiresEscalation: isPatternDetected,
		});
	}
	async reportSuspiciousApiActivity(req, suspicionReason, riskScore, userId) {
		const severity = this.calculateSeverityFromRiskScore(riskScore);
		const threatLevel = this.calculateThreatLevel(riskScore);
		return this.reportSecurityEvent({
			eventType: 'suspicious_activity',
			severity,
			threatLevel,
			title: 'Suspicious API Activity Detected',
			description: `Suspicious API activity: ${suspicionReason}`,
			userId,
			ipAddress: this.extractIpAddress(req),
			userAgent: req.get('User-Agent') || null,
			sessionId: req.sessionID || null,
			httpMethod: req.method,
			endpoint: req.path,
			metadata: {
				suspicionReason,
				query: req.query,
				params: req.params,
				headers: this.sanitizeHeaders(req.headers),
			},
			riskScore,
			automaticActions: riskScore > 70 ? ['alert_admin', 'increase_monitoring'] : ['log'],
			tags: ['suspicious_activity', 'api', severity],
			requiresEscalation: riskScore > 80,
		});
	}
	async reportDataBreachAttempt(eventType, resourceType, resourceId, userId, ipAddress, details) {
		return this.reportSecurityEvent({
			eventType,
			severity: 'critical',
			threatLevel: 'severe',
			title: 'Potential Data Breach Detected',
			description: `Unauthorized access attempt to ${resourceType}: ${resourceId}`,
			userId,
			ipAddress,
			metadata: {
				resourceType,
				resourceId,
				...details,
			},
			riskScore: 95,
			automaticActions: ['immediate_alert', 'block_ip', 'escalate'],
			tags: ['data_breach', 'critical', 'security_incident'],
			requiresEscalation: true,
		});
	}
	async getSecurityEvents(options) {
		const queryBuilder = this.securityEventRepository.createQueryBuilder('security_event');
		if (options.startDate) {
			queryBuilder.andWhere('security_event.createdAt >= :startDate', {
				startDate: options.startDate,
			});
		}
		if (options.endDate) {
			queryBuilder.andWhere('security_event.createdAt <= :endDate', { endDate: options.endDate });
		}
		if (options.eventTypes && options.eventTypes.length > 0) {
			queryBuilder.andWhere('security_event.eventType IN (:...eventTypes)', {
				eventTypes: options.eventTypes,
			});
		}
		if (options.severities && options.severities.length > 0) {
			queryBuilder.andWhere('security_event.severity IN (:...severities)', {
				severities: options.severities,
			});
		}
		if (options.threatLevels && options.threatLevels.length > 0) {
			queryBuilder.andWhere('security_event.threatLevel IN (:...threatLevels)', {
				threatLevels: options.threatLevels,
			});
		}
		if (options.status) {
			queryBuilder.andWhere('security_event.status = :status', { status: options.status });
		}
		if (options.userId) {
			queryBuilder.andWhere('security_event.userId = :userId', { userId: options.userId });
		}
		if (options.projectId) {
			queryBuilder.andWhere('security_event.projectId = :projectId', {
				projectId: options.projectId,
			});
		}
		if (options.ipAddress) {
			queryBuilder.andWhere('security_event.ipAddress = :ipAddress', {
				ipAddress: options.ipAddress,
			});
		}
		if (options.resolved !== undefined) {
			queryBuilder.andWhere('security_event.resolved = :resolved', { resolved: options.resolved });
		}
		if (options.requiresEscalation !== undefined) {
			queryBuilder.andWhere('security_event.requiresEscalation = :requiresEscalation', {
				requiresEscalation: options.requiresEscalation,
			});
		}
		const total = await queryBuilder.getCount();
		queryBuilder
			.orderBy('security_event.createdAt', 'DESC')
			.limit(options.limit || 100)
			.offset(options.offset || 0)
			.leftJoinAndSelect('security_event.user', 'user')
			.leftJoinAndSelect('security_event.project', 'project')
			.leftJoinAndSelect('security_event.acknowledgedByUser', 'acknowledgedBy');
		const events = await queryBuilder.getMany();
		return { events, total };
	}
	async acknowledgeEvent(eventId, acknowledgedBy, notes) {
		const acknowledgedAt = new Date();
		const event = await this.securityEventRepository.findOne({ where: { id: eventId } });
		if (!event) {
			throw new Error('Security event not found');
		}
		const timeToAcknowledgeMinutes = Math.round(
			(acknowledgedAt.getTime() - event.createdAt.getTime()) / (1000 * 60),
		);
		await this.securityEventRepository.update(eventId, {
			status: 'acknowledged',
			acknowledgedBy,
			acknowledgedAt,
			timeToAcknowledgeMinutes,
			resolutionNotes: notes || null,
		});
		await this.auditLoggingService.logEvent({
			eventType: 'security_event',
			category: 'security',
			severity: 'low',
			description: `Security event acknowledged: ${eventId}`,
			userId: acknowledgedBy,
			resourceId: eventId,
			resourceType: 'security_event',
			metadata: {
				action: 'acknowledge',
				timeToAcknowledgeMinutes,
				notes,
			},
		});
	}
	async resolveEvent(eventId, resolvedBy, resolutionNotes) {
		const resolvedAt = new Date();
		const event = await this.securityEventRepository.findOne({ where: { id: eventId } });
		if (!event) {
			throw new Error('Security event not found');
		}
		const timeToResolveMinutes = Math.round(
			(resolvedAt.getTime() - event.createdAt.getTime()) / (1000 * 60),
		);
		await this.securityEventRepository.update(eventId, {
			status: 'resolved',
			resolved: true,
			resolvedAt,
			timeToResolveMinutes,
			resolutionNotes,
		});
		await this.auditLoggingService.logEvent({
			eventType: 'security_event',
			category: 'security',
			severity: 'low',
			description: `Security event resolved: ${eventId}`,
			userId: resolvedBy,
			resourceId: eventId,
			resourceType: 'security_event',
			metadata: {
				action: 'resolve',
				timeToResolveMinutes,
				resolutionNotes,
			},
		});
	}
	async getSecurityMetrics(startDate, endDate) {
		const queryBuilder = this.securityEventRepository
			.createQueryBuilder('security_event')
			.where('security_event.createdAt >= :startDate', { startDate })
			.andWhere('security_event.createdAt <= :endDate', { endDate });
		const totalEvents = await queryBuilder.getCount();
		const severityStats = await queryBuilder
			.select('security_event.severity', 'severity')
			.addSelect('COUNT(*)', 'count')
			.groupBy('security_event.severity')
			.getRawMany();
		const eventsBySeverity = severityStats.reduce((acc, stat) => {
			acc[stat.severity] = parseInt(stat.count);
			return acc;
		}, {});
		const typeStats = await queryBuilder
			.select('security_event.eventType', 'eventType')
			.addSelect('COUNT(*)', 'count')
			.groupBy('security_event.eventType')
			.getRawMany();
		const eventsByType = typeStats.reduce((acc, stat) => {
			acc[stat.eventType] = parseInt(stat.count);
			return acc;
		}, {});
		const threatStats = await queryBuilder
			.select('security_event.threatLevel', 'threatLevel')
			.addSelect('COUNT(*)', 'count')
			.groupBy('security_event.threatLevel')
			.getRawMany();
		const threatLevelDistribution = threatStats.reduce((acc, stat) => {
			acc[stat.threatLevel] = parseInt(stat.count);
			return acc;
		}, {});
		const responseTimeStats = await queryBuilder
			.select('AVG(security_event.timeToAcknowledgeMinutes)', 'avgResponseTime')
			.getRawOne();
		const averageResponseTime = parseFloat(responseTimeStats.avgResponseTime) || 0;
		const escalatedEvents = await queryBuilder
			.andWhere('security_event.requiresEscalation = :escalated', { escalated: true })
			.getCount();
		const resolvedEvents = await queryBuilder
			.andWhere('security_event.resolved = :resolved', { resolved: true })
			.getCount();
		const attackVectorStats = await this.securityEventRepository
			.createQueryBuilder('security_event')
			.select('UNNEST(security_event.attackVectors)', 'vector')
			.addSelect('COUNT(*)', 'count')
			.where('security_event.createdAt >= :startDate', { startDate })
			.andWhere('security_event.createdAt <= :endDate', { endDate })
			.andWhere('security_event.attackVectors IS NOT NULL')
			.groupBy('vector')
			.orderBy('count', 'DESC')
			.limit(10)
			.getRawMany();
		const topAttackVectors = attackVectorStats.map((stat) => ({
			vector: stat.vector,
			count: parseInt(stat.count),
		}));
		const ipStats = await queryBuilder
			.select('security_event.ipAddress', 'ip')
			.addSelect('security_event.threatLevel', 'threatLevel')
			.addSelect('COUNT(*)', 'count')
			.where('security_event.ipAddress IS NOT NULL')
			.groupBy('security_event.ipAddress, security_event.threatLevel')
			.orderBy('count', 'DESC')
			.limit(10)
			.getRawMany();
		const topSourceIPs = ipStats.map((stat) => ({
			ip: stat.ip,
			count: parseInt(stat.count),
			threatLevel: stat.threatLevel,
		}));
		return {
			period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
			totalEvents,
			eventsBySeverity,
			eventsByType,
			threatLevelDistribution,
			averageResponseTime,
			escalatedEvents,
			resolvedEvents,
			topAttackVectors,
			topSourceIPs,
		};
	}
	async createSecurityEvent(eventData) {
		const securityEvent = this.securityEventRepository.create({
			eventType: eventData.eventType,
			severity: eventData.severity,
			status: 'open',
			threatLevel: eventData.threatLevel || 'moderate',
			title: eventData.title,
			description: eventData.description,
			userId: eventData.userId,
			projectId: eventData.projectId,
			ipAddress: eventData.ipAddress,
			geolocation: eventData.geolocation,
			userAgent: eventData.userAgent,
			sessionId: eventData.sessionId,
			requestId: eventData.requestId,
			httpMethod: eventData.httpMethod,
			endpoint: eventData.endpoint,
			statusCode: eventData.statusCode,
			eventCount: eventData.eventCount || 1,
			aggregationWindowMinutes: eventData.aggregationWindowMinutes,
			rawData: eventData.rawData,
			attackVectors: eventData.attackVectors,
			mitreAttackIds: eventData.mitreAttackIds,
			metadata: eventData.metadata,
			riskScore: eventData.riskScore,
			automaticActions: eventData.automaticActions,
			requiresEscalation: eventData.requiresEscalation || false,
			tags: eventData.tags,
			evidenceFiles: eventData.evidenceFiles,
		});
		return await this.securityEventRepository.save(securityEvent);
	}
	async analyzeSecurityEvent(event) {
		if (event.severity === 'critical' || event.threatLevel === 'severe') {
			this.logger.error(`Critical security event detected`, {
				eventId: event.id,
				eventType: event.eventType,
				severity: event.severity,
				threatLevel: event.threatLevel,
				description: event.description,
			});
			this.logger.error('Critical security alert triggered', { eventId: event.id });
		}
		if (event.automaticActions && event.automaticActions.length > 0) {
			await this.executeAutomaticActions(event);
		}
	}
	async executeAutomaticActions(event) {
		for (const action of event.automaticActions || []) {
			try {
				switch (action) {
					case 'alert_admin':
						this.logger.warn('Admin alert triggered', { eventId: event.id });
						break;
					case 'block_ip':
						if (event.ipAddress) {
							this.logger.warn('IP block triggered', { eventId: event.id, ip: event.ipAddress });
						}
						break;
					case 'rate_limit':
						if (event.ipAddress) {
							this.logger.warn('Rate limit triggered', { eventId: event.id, ip: event.ipAddress });
						}
						break;
					case 'immediate_alert':
						this.logger.error('Immediate alert triggered', { eventId: event.id });
						break;
					case 'escalate':
						await this.securityEventRepository.update(event.id, { requiresEscalation: true });
						break;
					default:
						this.logger.warn(`Unknown automatic action: ${action}`, { eventId: event.id });
				}
			} catch (error) {
				this.logger.error(`Failed to execute automatic action: ${action}`, {
					eventId: event.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}
	async getRecentFailedLogins(ipAddress, windowMinutes) {
		const startTime = new Date(Date.now() - windowMinutes * 60 * 1000);
		return await this.securityEventRepository.find({
			where: {
				eventType: 'failed_login_attempt',
				ipAddress,
				createdAt: {
					$gte: startTime,
				},
			},
			order: { createdAt: 'DESC' },
		});
	}
	updateEventAggregation(event) {
		if (!event.ipAddress) return;
		const key = `${event.eventType}:${event.ipAddress}`;
		const existing = this.eventAggregator.get(key);
		if (existing) {
			existing.count++;
			existing.lastSeen = new Date();
		} else {
			this.eventAggregator.set(key, {
				count: 1,
				firstSeen: new Date(),
				lastSeen: new Date(),
			});
		}
	}
	async checkThreatPatterns(event) {
		for (const [ruleId, rule] of this.threatDetectionRules) {
			if (!rule.enabled || !rule.eventTypes.includes(event.eventType)) continue;
			const windowStart = new Date(Date.now() - rule.timeWindowMinutes * 60 * 1000);
			const whereCondition = {
				eventType: event.eventType,
				createdAt: {
					$gte: windowStart,
				},
			};
			if (event.ipAddress) {
				whereCondition.ipAddress = event.ipAddress;
			}
			const recentEvents = await this.securityEventRepository.count({
				where: whereCondition,
			});
			if (recentEvents >= rule.alertThreshold) {
				this.logger.warn(`Threat pattern detected: ${rule.name}`, {
					ruleId,
					eventType: event.eventType,
					ipAddress: event.ipAddress,
					eventCount: recentEvents,
					threshold: rule.alertThreshold,
				});
				for (const action of rule.actions) {
					this.logger.info(`Rule action triggered: ${action}`, {
						ruleId,
						eventId: event.id,
						eventCount: recentEvents,
					});
				}
			}
		}
	}
	initializeThreatDetectionRules() {
		const rules = [
			{
				id: 'brute-force-detection',
				name: 'Brute Force Attack Detection',
				description: 'Detect brute force login attempts',
				eventTypes: ['failed_login_attempt'],
				severity: 'high',
				conditions: {},
				enabled: true,
				alertThreshold: 5,
				timeWindowMinutes: 15,
				actions: ['alert_admin', 'rate_limit'],
			},
			{
				id: 'suspicious-api-burst',
				name: 'Suspicious API Activity Burst',
				description: 'Detect unusual API activity patterns',
				eventTypes: ['suspicious_activity'],
				severity: 'medium',
				conditions: {},
				enabled: true,
				alertThreshold: 10,
				timeWindowMinutes: 5,
				actions: ['alert_admin'],
			},
		];
		for (const rule of rules) {
			this.threatDetectionRules.set(rule.id, rule);
		}
	}
	startEventAggregationCleanup() {
		setInterval(
			() => {
				const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
				for (const [key, data] of this.eventAggregator) {
					if (data.lastSeen < oneHourAgo) {
						this.eventAggregator.delete(key);
					}
				}
			},
			60 * 60 * 1000,
		);
	}
	calculateSeverityFromRiskScore(riskScore) {
		if (riskScore >= 90) return 'critical';
		if (riskScore >= 70) return 'high';
		if (riskScore >= 40) return 'medium';
		if (riskScore >= 20) return 'low';
		return 'info';
	}
	calculateThreatLevel(riskScore) {
		if (riskScore >= 90) return 'severe';
		if (riskScore >= 70) return 'high';
		if (riskScore >= 40) return 'moderate';
		if (riskScore >= 20) return 'low';
		return 'minimal';
	}
	extractIpAddress(req) {
		const forwardedFor = req.get('X-Forwarded-For');
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}
		return req.ip || req.connection.remoteAddress || null;
	}
	sanitizeHeaders(headers) {
		const sanitized = { ...headers };
		const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
		sensitiveHeaders.forEach((header) => {
			if (sanitized[header]) {
				sanitized[header] = '[REDACTED]';
			}
		});
		return sanitized;
	}
};
exports.SecurityMonitoringService = SecurityMonitoringService;
exports.SecurityMonitoringService = SecurityMonitoringService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [])],
	SecurityMonitoringService,
);
//# sourceMappingURL=security-monitoring.service.js.map
