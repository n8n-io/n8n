import { AuditEvent } from '@n8n/db';
import { Repository, DataSource } from '@n8n/typeorm';
import { Service, Container } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';
import type { Request } from 'express';
import { LoggerProxy } from 'n8n-workflow';

// TODO: Add these types to @n8n/db package exports
type AuditEventType = string;
type AuditEventCategory =
	| 'authentication'
	| 'authorization'
	| 'data_access'
	| 'configuration'
	| 'system'
	| 'security'
	| 'workflow_management'
	| 'user_management';
type AuditEventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Interface for audit event creation
 */
export interface IAuditEventData {
	eventType: AuditEventType;
	category: AuditEventCategory;
	severity?: AuditEventSeverity;
	description: string;
	userId?: string | null;
	projectId?: string | null;
	resourceId?: string | null;
	resourceType?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	httpMethod?: string | null;
	endpoint?: string | null;
	statusCode?: number | null;
	responseTimeMs?: number | null;
	sessionId?: string | null;
	metadata?: IDataObject | null;
	beforeState?: IDataObject | null;
	afterState?: IDataObject | null;
	errorMessage?: string | null;
	requiresReview?: boolean;
	retentionCategory?: 'minimal' | 'standard' | 'extended' | 'permanent';
	tags?: string[] | null;
}

/**
 * Audit logging service for comprehensive event tracking and compliance
 */
@Service()
export class AuditLoggingService {
	private auditEventRepository: Repository<AuditEvent>;
	private readonly logger = LoggerProxy;

	constructor() {
		// Get repository through Container to ensure proper DI
		const dataSource = Container.get(DataSource);
		this.auditEventRepository = dataSource.getRepository(AuditEvent);
	}

	/**
	 * Log an audit event with comprehensive tracking
	 */
	async logEvent(eventData: IAuditEventData): Promise<AuditEvent> {
		try {
			const auditEvent = this.auditEventRepository.create({
				eventType: eventData.eventType,
				category: eventData.category,
				severity: eventData.severity || 'medium',
				description: eventData.description,
				userId: eventData.userId,
				projectId: eventData.projectId,
				resourceId: eventData.resourceId,
				resourceType: eventData.resourceType,
				ipAddress: eventData.ipAddress,
				userAgent: eventData.userAgent,
				httpMethod: eventData.httpMethod,
				endpoint: eventData.endpoint,
				statusCode: eventData.statusCode,
				responseTimeMs: eventData.responseTimeMs,
				sessionId: eventData.sessionId,
				metadata: eventData.metadata,
				beforeState: eventData.beforeState,
				afterState: eventData.afterState,
				errorMessage: eventData.errorMessage,
				requiresReview: eventData.requiresReview || false,
				retentionCategory: eventData.retentionCategory || 'standard',
				tags: eventData.tags,
			} as any);

			// Set archive date based on retention category
			const eventEntity = Array.isArray(auditEvent) ? auditEvent[0] : auditEvent;
			eventEntity.archiveAt = this.calculateArchiveDate(eventEntity.retentionCategory);

			const savedEvents = await this.auditEventRepository.save(auditEvent);
			const savedEvent = Array.isArray(savedEvents) ? savedEvents[0] : savedEvents;

			// Log high-severity events immediately
			if (eventData.severity === 'critical' || eventData.severity === 'high') {
				this.logger.warn(`High-severity audit event: ${eventData.description}`, {
					eventId: savedEvent.id,
					eventType: eventData.eventType,
					category: eventData.category,
					severity: eventData.severity,
				});
			}

			return savedEvent;
		} catch (error) {
			this.logger.error('Failed to log audit event', {
				error: error instanceof Error ? error.message : String(error),
				eventData,
			});
			throw new Error(
				`Audit logging failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Log API call audit event from Express request
	 */
	async logApiCall(
		req: Request,
		statusCode: number,
		responseTimeMs: number,
		userId?: string,
		projectId?: string,
		errorMessage?: string,
	): Promise<AuditEvent> {
		return this.logEvent({
			eventType: 'api_call',
			category: 'data_access',
			severity: this.determineSeverityFromStatusCode(statusCode),
			description: `API ${req.method} ${req.path} - Status ${statusCode}`,
			userId,
			projectId,
			ipAddress: this.extractIpAddress(req),
			userAgent: req.get('User-Agent') || null,
			httpMethod: req.method,
			endpoint: req.path,
			statusCode,
			responseTimeMs,
			sessionId: (req as any).sessionID || null,
			errorMessage,
			metadata: {
				query: req.query,
				params: req.params,
				headers: this.sanitizeHeaders(req.headers),
			},
			retentionCategory: statusCode >= 400 ? 'extended' : 'standard',
		});
	}

	/**
	 * Log workflow execution audit event
	 */
	async logWorkflowExecution(
		workflowId: string,
		userId: string,
		projectId: string,
		executionId: string,
		success: boolean,
		errorMessage?: string,
	): Promise<AuditEvent> {
		return this.logEvent({
			eventType: 'workflow_executed',
			category: 'workflow_management' as any,
			severity: success ? 'low' : 'medium',
			description: `Workflow execution ${success ? 'completed' : 'failed'}: ${workflowId}`,
			userId,
			projectId,
			resourceId: workflowId,
			resourceType: 'workflow',
			errorMessage,
			metadata: {
				executionId,
				success,
			},
			retentionCategory: success ? 'standard' : 'extended',
		});
	}

	/**
	 * Log user authentication events
	 */
	async logAuthentication(
		eventType: 'user_login' | 'user_logout',
		userId: string,
		ipAddress: string,
		userAgent?: string,
		success: boolean = true,
		errorMessage?: string,
	): Promise<AuditEvent> {
		return this.logEvent({
			eventType,
			category: 'authentication',
			severity: success ? 'low' : 'high',
			description: `User ${eventType.replace('user_', '')} ${success ? 'successful' : 'failed'}`,
			userId,
			ipAddress,
			userAgent,
			errorMessage,
			requiresReview: !success,
			retentionCategory: success ? 'standard' : 'extended',
			tags: success ? ['authentication', 'success'] : ['authentication', 'failure', 'security'],
		});
	}

	/**
	 * Log data modification events with before/after state
	 */
	async logDataModification(
		eventType: AuditEventType,
		resourceType: string,
		resourceId: string,
		userId: string,
		projectId: string,
		beforeState: IDataObject,
		afterState: IDataObject,
		description?: string,
	): Promise<AuditEvent> {
		return this.logEvent({
			eventType,
			category: 'data_modification' as any,
			severity: 'medium',
			description: description || `${resourceType} ${eventType}`,
			userId,
			projectId,
			resourceId,
			resourceType,
			beforeState,
			afterState,
			retentionCategory: 'extended',
			tags: ['data_modification', resourceType],
		});
	}

	/**
	 * Retrieve audit events with filtering and pagination
	 */
	async getAuditEvents(options: {
		startDate?: Date;
		endDate?: Date;
		eventTypes?: AuditEventType[];
		categories?: AuditEventCategory[];
		severities?: AuditEventSeverity[];
		userId?: string;
		projectId?: string;
		resourceType?: string;
		requiresReview?: boolean;
		limit?: number;
		offset?: number;
	}): Promise<{ events: AuditEvent[]; total: number }> {
		const queryBuilder = this.auditEventRepository.createQueryBuilder('audit_event');

		// Apply filters
		if (options.startDate) {
			queryBuilder.andWhere('audit_event.createdAt >= :startDate', {
				startDate: options.startDate,
			});
		}

		if (options.endDate) {
			queryBuilder.andWhere('audit_event.createdAt <= :endDate', { endDate: options.endDate });
		}

		if (options.eventTypes && options.eventTypes.length > 0) {
			queryBuilder.andWhere('audit_event.eventType IN (:...eventTypes)', {
				eventTypes: options.eventTypes,
			});
		}

		if (options.categories && options.categories.length > 0) {
			queryBuilder.andWhere('audit_event.category IN (:...categories)', {
				categories: options.categories,
			});
		}

		if (options.severities && options.severities.length > 0) {
			queryBuilder.andWhere('audit_event.severity IN (:...severities)', {
				severities: options.severities,
			});
		}

		if (options.userId) {
			queryBuilder.andWhere('audit_event.userId = :userId', { userId: options.userId });
		}

		if (options.projectId) {
			queryBuilder.andWhere('audit_event.projectId = :projectId', { projectId: options.projectId });
		}

		if (options.resourceType) {
			queryBuilder.andWhere('audit_event.resourceType = :resourceType', {
				resourceType: options.resourceType,
			});
		}

		if (options.requiresReview !== undefined) {
			queryBuilder.andWhere('audit_event.requiresReview = :requiresReview', {
				requiresReview: options.requiresReview,
			});
		}

		// Get total count
		const total = await queryBuilder.getCount();

		// Apply pagination and ordering
		queryBuilder
			.orderBy('audit_event.createdAt', 'DESC')
			.limit(options.limit || 100)
			.offset(options.offset || 0);

		// Include related entities
		queryBuilder
			.leftJoinAndSelect('audit_event.user', 'user')
			.leftJoinAndSelect('audit_event.project', 'project');

		const events = await queryBuilder.getMany();

		return { events, total };
	}

	/**
	 * Mark audit event as reviewed
	 */
	async markAsReviewed(eventId: string, reviewedBy: string, reviewNotes?: string): Promise<void> {
		await this.auditEventRepository.update(eventId, {
			reviewedBy,
			reviewedAt: new Date(),
			reviewNotes: reviewNotes || null,
		});
	}

	/**
	 * Clean up archived audit events
	 */
	async cleanupArchivedEvents(): Promise<number> {
		const result = await this.auditEventRepository
			.createQueryBuilder()
			.delete()
			.where('archiveAt < :now', { now: new Date() })
			.execute();

		const deletedCount = result.affected || 0;

		if (deletedCount > 0) {
			this.logger.info(`Cleaned up ${deletedCount} archived audit events`);
		}

		return deletedCount;
	}

	/**
	 * Get audit event statistics
	 */
	async getStatistics(
		startDate: Date,
		endDate: Date,
	): Promise<{
		totalEvents: number;
		eventsByType: Record<string, number>;
		eventsByCategory: Record<string, number>;
		eventsBySeverity: Record<string, number>;
		highRiskEvents: number;
	}> {
		const queryBuilder = this.auditEventRepository
			.createQueryBuilder('audit_event')
			.where('audit_event.createdAt >= :startDate', { startDate })
			.andWhere('audit_event.createdAt <= :endDate', { endDate });

		const totalEvents = await queryBuilder.getCount();

		// Event counts by type
		const eventTypeStats = await queryBuilder
			.select('audit_event.eventType', 'eventType')
			.addSelect('COUNT(*)', 'count')
			.groupBy('audit_event.eventType')
			.getRawMany();

		const eventsByType = eventTypeStats.reduce(
			(acc, stat) => {
				acc[stat.eventType] = parseInt(stat.count);
				return acc;
			},
			{} as Record<string, number>,
		);

		// Event counts by category
		const categoryStats = await queryBuilder
			.select('audit_event.category', 'category')
			.addSelect('COUNT(*)', 'count')
			.groupBy('audit_event.category')
			.getRawMany();

		const eventsByCategory = categoryStats.reduce(
			(acc, stat) => {
				acc[stat.category] = parseInt(stat.count);
				return acc;
			},
			{} as Record<string, number>,
		);

		// Event counts by severity
		const severityStats = await queryBuilder
			.select('audit_event.severity', 'severity')
			.addSelect('COUNT(*)', 'count')
			.groupBy('audit_event.severity')
			.getRawMany();

		const eventsBySeverity = severityStats.reduce(
			(acc, stat) => {
				acc[stat.severity] = parseInt(stat.count);
				return acc;
			},
			{} as Record<string, number>,
		);

		// High risk events (critical and high severity)
		const highRiskEvents = await queryBuilder
			.andWhere('audit_event.severity IN (:...severities)', { severities: ['critical', 'high'] })
			.getCount();

		return {
			totalEvents,
			eventsByType,
			eventsByCategory,
			eventsBySeverity,
			highRiskEvents,
		};
	}

	/**
	 * Calculate archive date based on retention category
	 */
	private calculateArchiveDate(
		retentionCategory: 'minimal' | 'standard' | 'extended' | 'permanent',
	): Date | null {
		if (retentionCategory === 'permanent') {
			return null; // Never archive
		}

		const now = new Date();
		const archiveDate = new Date(now);

		switch (retentionCategory) {
			case 'minimal':
				archiveDate.setDate(now.getDate() + 90); // 3 months
				break;
			case 'standard':
				archiveDate.setFullYear(now.getFullYear() + 1); // 1 year
				break;
			case 'extended':
				archiveDate.setFullYear(now.getFullYear() + 7); // 7 years (compliance requirement)
				break;
		}

		return archiveDate;
	}

	/**
	 * Determine severity based on HTTP status code
	 */
	private determineSeverityFromStatusCode(statusCode: number): AuditEventSeverity {
		if (statusCode >= 500) return 'high';
		if (statusCode >= 400) return 'medium';
		return 'low';
	}

	/**
	 * Extract IP address from request, handling proxies
	 */
	private extractIpAddress(req: Request): string | null {
		const forwardedFor = req.get('X-Forwarded-For');
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}
		return req.ip || req.connection.remoteAddress || null;
	}

	/**
	 * Sanitize request headers to remove sensitive information
	 */
	private sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
		const sanitized = { ...headers };

		// Remove sensitive headers
		const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
		sensitiveHeaders.forEach((header) => {
			if (sanitized[header]) {
				sanitized[header] = '[REDACTED]';
			}
		});

		return sanitized;
	}
}
