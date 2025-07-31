import { SecurityEvent } from '@n8n/db';
import type {
	SecurityEventType,
	SecurityEventSeverity,
	SecurityEventStatus,
	ThreatLevel,
} from '@n8n/db/src/entities/security-event';
import { Repository, DataSource } from '@n8n/typeorm';
import { Service, Container } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';
import type { Request } from 'express';

import { LoggerProxy } from 'n8n-workflow';
import { EventService } from '@/events/event.service';
import { AuditLoggingService } from './audit-logging.service';

/**
 * Interface for security event creation
 */
export interface ISecurityEventData {
	eventType: SecurityEventType;
	severity: SecurityEventSeverity;
	threatLevel?: ThreatLevel;
	title: string;
	description: string;
	userId?: string | null;
	projectId?: string | null;
	ipAddress?: string | null;
	geolocation?: IDataObject | null;
	userAgent?: string | null;
	sessionId?: string | null;
	requestId?: string | null;
	httpMethod?: string | null;
	endpoint?: string | null;
	statusCode?: number | null;
	eventCount?: number;
	aggregationWindowMinutes?: number | null;
	rawData?: string | null;
	attackVectors?: string[] | null;
	mitreAttackIds?: string[] | null;
	metadata?: IDataObject | null;
	riskScore?: number | null;
	automaticActions?: string[] | null;
	tags?: string[] | null;
	requiresEscalation?: boolean;
	evidenceFiles?: string[] | null;
}

/**
 * Interface for threat detection rules
 */
export interface IThreatDetectionRule {
	id: string;
	name: string;
	description: string;
	eventTypes: SecurityEventType[];
	severity: SecurityEventSeverity;
	conditions: IDataObject;
	enabled: boolean;
	alertThreshold: number;
	timeWindowMinutes: number;
	actions: string[];
}

/**
 * Interface for security metrics
 */
export interface ISecurityMetrics {
	period: string;
	totalEvents: number;
	eventsBySeverity: Record<SecurityEventSeverity, number>;
	eventsByType: Record<string, number>;
	threatLevelDistribution: Record<ThreatLevel, number>;
	averageResponseTime: number;
	escalatedEvents: number;
	resolvedEvents: number;
	topAttackVectors: Array<{ vector: string; count: number }>;
	topSourceIPs: Array<{ ip: string; count: number; threatLevel: ThreatLevel }>;
}

/**
 * Security monitoring service for real-time threat detection and alerting
 */
@Service()
export class SecurityMonitoringService {
	private securityEventRepository: Repository<SecurityEvent>;
	private readonly logger = LoggerProxy;
	private readonly eventService = Container.get(EventService);
	private readonly auditLoggingService = Container.get(AuditLoggingService);

	// In-memory rule cache for performance
	private threatDetectionRules: Map<string, IThreatDetectionRule> = new Map();

	// Event aggregation for pattern detection
	private eventAggregator: Map<string, { count: number; firstSeen: Date; lastSeen: Date }> =
		new Map();

	constructor() {
		// Get repository through Container to ensure proper DI
		const dataSource = Container.get(DataSource);
		this.securityEventRepository = dataSource.getRepository(SecurityEvent);

		// Initialize threat detection rules
		this.initializeThreatDetectionRules();

		// Start background processes
		this.startEventAggregationCleanup();
	}

	/**
	 * Report a security event and trigger real-time analysis
	 */
	async reportSecurityEvent(eventData: ISecurityEventData): Promise<SecurityEvent> {
		try {
			// Create and save the security event
			const securityEvent = await this.createSecurityEvent(eventData);

			// Perform real-time threat analysis
			await this.analyzeSecurityEvent(securityEvent);

			// Update event aggregation
			this.updateEventAggregation(securityEvent);

			// Check for pattern-based threats
			await this.checkThreatPatterns(securityEvent);

			// Emit security event for real-time processing
			// TODO: Add 'security-event' to relay event map or use existing event
			// this.eventService.emit('security-event', {
			//	event: securityEvent,
			//	timestamp: new Date(),
			// });

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

	/**
	 * Analyze a failed login attempt and detect patterns
	 */
	async reportFailedLogin(
		ipAddress: string,
		userAgent?: string,
		userId?: string,
		additionalData?: IDataObject,
	): Promise<SecurityEvent> {
		// Check for brute force patterns
		const recentFailures = await this.getRecentFailedLogins(ipAddress, 15); // Last 15 minutes
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

	/**
	 * Report suspicious API activity
	 */
	async reportSuspiciousApiActivity(
		req: Request,
		suspicionReason: string,
		riskScore: number,
		userId?: string,
	): Promise<SecurityEvent> {
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
			sessionId: (req as any).sessionID || null,
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

	/**
	 * Report potential data breach attempt
	 */
	async reportDataBreachAttempt(
		eventType: 'data_breach_attempt' | 'unauthorized_access_attempt',
		resourceType: string,
		resourceId: string,
		userId?: string,
		ipAddress?: string,
		details?: IDataObject,
	): Promise<SecurityEvent> {
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

	/**
	 * Get security events with filtering and analysis
	 */
	async getSecurityEvents(options: {
		startDate?: Date;
		endDate?: Date;
		eventTypes?: SecurityEventType[];
		severities?: SecurityEventSeverity[];
		threatLevels?: ThreatLevel[];
		status?: SecurityEventStatus;
		userId?: string;
		projectId?: string;
		ipAddress?: string;
		resolved?: boolean;
		requiresEscalation?: boolean;
		limit?: number;
		offset?: number;
	}): Promise<{ events: SecurityEvent[]; total: number }> {
		const queryBuilder = this.securityEventRepository.createQueryBuilder('security_event');

		// Apply filters
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

	/**
	 * Acknowledge a security event
	 */
	async acknowledgeEvent(eventId: string, acknowledgedBy: string, notes?: string): Promise<void> {
		const acknowledgedAt = new Date();

		// Get the event to calculate response time
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

		// Log the acknowledgment
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

	/**
	 * Resolve a security event
	 */
	async resolveEvent(eventId: string, resolvedBy: string, resolutionNotes: string): Promise<void> {
		const resolvedAt = new Date();

		// Get the event to calculate response time
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

		// Log the resolution
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

	/**
	 * Get security metrics for dashboard
	 */
	async getSecurityMetrics(startDate: Date, endDate: Date): Promise<ISecurityMetrics> {
		const queryBuilder = this.securityEventRepository
			.createQueryBuilder('security_event')
			.where('security_event.createdAt >= :startDate', { startDate })
			.andWhere('security_event.createdAt <= :endDate', { endDate });

		const totalEvents = await queryBuilder.getCount();

		// Events by severity
		const severityStats = await queryBuilder
			.select('security_event.severity', 'severity')
			.addSelect('COUNT(*)', 'count')
			.groupBy('security_event.severity')
			.getRawMany();

		const eventsBySeverity = severityStats.reduce(
			(acc, stat) => {
				acc[stat.severity as SecurityEventSeverity] = parseInt(stat.count);
				return acc;
			},
			{} as Record<SecurityEventSeverity, number>,
		);

		// Events by type
		const typeStats = await queryBuilder
			.select('security_event.eventType', 'eventType')
			.addSelect('COUNT(*)', 'count')
			.groupBy('security_event.eventType')
			.getRawMany();

		const eventsByType = typeStats.reduce(
			(acc, stat) => {
				acc[stat.eventType] = parseInt(stat.count);
				return acc;
			},
			{} as Record<string, number>,
		);

		// Threat level distribution
		const threatStats = await queryBuilder
			.select('security_event.threatLevel', 'threatLevel')
			.addSelect('COUNT(*)', 'count')
			.groupBy('security_event.threatLevel')
			.getRawMany();

		const threatLevelDistribution = threatStats.reduce(
			(acc, stat) => {
				acc[stat.threatLevel as ThreatLevel] = parseInt(stat.count);
				return acc;
			},
			{} as Record<ThreatLevel, number>,
		);

		// Response time metrics
		const responseTimeStats = await queryBuilder
			.select('AVG(security_event.timeToAcknowledgeMinutes)', 'avgResponseTime')
			.getRawOne();

		const averageResponseTime = parseFloat(responseTimeStats.avgResponseTime) || 0;

		// Escalated and resolved events
		const escalatedEvents = await queryBuilder
			.andWhere('security_event.requiresEscalation = :escalated', { escalated: true })
			.getCount();

		const resolvedEvents = await queryBuilder
			.andWhere('security_event.resolved = :resolved', { resolved: true })
			.getCount();

		// Top attack vectors
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

		// Top source IPs
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
			threatLevel: stat.threatLevel as ThreatLevel,
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

	/**
	 * Create a security event in the database
	 */
	private async createSecurityEvent(eventData: ISecurityEventData): Promise<SecurityEvent> {
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

	/**
	 * Analyze security event for immediate threats
	 */
	private async analyzeSecurityEvent(event: SecurityEvent): Promise<void> {
		// Check if this is a critical event requiring immediate action
		if (event.severity === 'critical' || event.threatLevel === 'severe') {
			this.logger.error(`Critical security event detected`, {
				eventId: event.id,
				eventType: event.eventType,
				severity: event.severity,
				threatLevel: event.threatLevel,
				description: event.description,
			});

			// Emit critical alert
			// TODO: Add 'critical-security-alert' to relay event map or use existing event
			// this.eventService.emit('critical-security-alert', {
			//	event,
			//	timestamp: new Date(),
			// });
			this.logger.error('Critical security alert triggered', { eventId: event.id });
		}

		// Execute automatic actions
		if (event.automaticActions && event.automaticActions.length > 0) {
			await this.executeAutomaticActions(event);
		}
	}

	/**
	 * Execute automatic response actions
	 */
	private async executeAutomaticActions(event: SecurityEvent): Promise<void> {
		for (const action of event.automaticActions || []) {
			try {
				switch (action) {
					case 'alert_admin':
						// TODO: Add 'admin-alert' to relay event map or use existing event
						// this.eventService.emit('admin-alert', { event });
						this.logger.warn('Admin alert triggered', { eventId: event.id });
						break;
					case 'block_ip':
						if (event.ipAddress) {
							// TODO: Add 'block-ip' to relay event map or use existing event
							// this.eventService.emit('block-ip', { ip: event.ipAddress, event });
							this.logger.warn('IP block triggered', { eventId: event.id, ip: event.ipAddress });
						}
						break;
					case 'rate_limit':
						if (event.ipAddress) {
							// TODO: Add 'rate-limit' to relay event map or use existing event
							// this.eventService.emit('rate-limit', { ip: event.ipAddress, event });
							this.logger.warn('Rate limit triggered', { eventId: event.id, ip: event.ipAddress });
						}
						break;
					case 'immediate_alert':
						// TODO: Add 'immediate-alert' to relay event map or use existing event
						// this.eventService.emit('immediate-alert', { event });
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

	/**
	 * Get recent failed login attempts from an IP
	 */
	private async getRecentFailedLogins(
		ipAddress: string,
		windowMinutes: number,
	): Promise<SecurityEvent[]> {
		const startTime = new Date(Date.now() - windowMinutes * 60 * 1000);

		return await this.securityEventRepository.find({
			where: {
				eventType: 'failed_login_attempt',
				ipAddress,
				createdAt: {
					$gte: startTime,
				} as any,
			},
			order: { createdAt: 'DESC' },
		});
	}

	/**
	 * Update event aggregation for pattern detection
	 */
	private updateEventAggregation(event: SecurityEvent): void {
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

	/**
	 * Check for threat patterns based on aggregated events
	 */
	private async checkThreatPatterns(event: SecurityEvent): Promise<void> {
		// Implement pattern-based threat detection
		// This is a simplified example - production would have more sophisticated pattern matching

		for (const [ruleId, rule] of this.threatDetectionRules) {
			if (!rule.enabled || !rule.eventTypes.includes(event.eventType)) continue;

			// Check if threshold is exceeded within time window
			const windowStart = new Date(Date.now() - rule.timeWindowMinutes * 60 * 1000);
			const whereCondition: any = {
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

				// Execute rule actions
				for (const action of rule.actions) {
					// TODO: Add dynamic rule actions to relay event map or use existing events
					// this.eventService.emit(`rule-action:${action}`, {
					//	rule,
					//	event,
					//	eventCount: recentEvents,
					// });
					this.logger.info(`Rule action triggered: ${action}`, {
						ruleId,
						eventId: event.id,
						eventCount: recentEvents,
					});
				}
			}
		}
	}

	/**
	 * Initialize threat detection rules
	 */
	private initializeThreatDetectionRules(): void {
		const rules: IThreatDetectionRule[] = [
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

	/**
	 * Start background cleanup for event aggregation
	 */
	private startEventAggregationCleanup(): void {
		// Clean up old aggregation data every hour
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
		); // Every hour
	}

	/**
	 * Calculate severity from risk score
	 */
	private calculateSeverityFromRiskScore(riskScore: number): SecurityEventSeverity {
		if (riskScore >= 90) return 'critical';
		if (riskScore >= 70) return 'high';
		if (riskScore >= 40) return 'medium';
		if (riskScore >= 20) return 'low';
		return 'info';
	}

	/**
	 * Calculate threat level from risk score
	 */
	private calculateThreatLevel(riskScore: number): ThreatLevel {
		if (riskScore >= 90) return 'severe';
		if (riskScore >= 70) return 'high';
		if (riskScore >= 40) return 'moderate';
		if (riskScore >= 20) return 'low';
		return 'minimal';
	}

	/**
	 * Extract IP address from request
	 */
	private extractIpAddress(req: Request): string | null {
		const forwardedFor = req.get('X-Forwarded-For');
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}
		return req.ip || req.connection.remoteAddress || null;
	}

	/**
	 * Sanitize headers for logging
	 */
	private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
		const sanitized = { ...headers };
		const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

		sensitiveHeaders.forEach((header) => {
			if (sanitized[header]) {
				sanitized[header] = '[REDACTED]';
			}
		});

		return sanitized;
	}
}
