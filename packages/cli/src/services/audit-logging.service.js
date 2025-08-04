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
exports.AuditLoggingService = void 0;
const db_1 = require('@n8n/db');
const typeorm_1 = require('@n8n/typeorm');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
let AuditLoggingService = class AuditLoggingService {
	constructor() {
		this.logger = n8n_workflow_1.LoggerProxy;
		const dataSource = di_1.Container.get(typeorm_1.DataSource);
		this.auditEventRepository = dataSource.getRepository(db_1.AuditEvent);
	}
	async logEvent(eventData) {
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
			});
			const eventEntity = Array.isArray(auditEvent) ? auditEvent[0] : auditEvent;
			eventEntity.archiveAt = this.calculateArchiveDate(eventEntity.retentionCategory);
			const savedEvents = await this.auditEventRepository.save(auditEvent);
			const savedEvent = Array.isArray(savedEvents) ? savedEvents[0] : savedEvents;
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
	async logApiCall(req, statusCode, responseTimeMs, userId, projectId, errorMessage) {
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
			sessionId: req.sessionID || null,
			errorMessage,
			metadata: {
				query: req.query,
				params: req.params,
				headers: this.sanitizeHeaders(req.headers),
			},
			retentionCategory: statusCode >= 400 ? 'extended' : 'standard',
		});
	}
	async logWorkflowExecution(workflowId, userId, projectId, executionId, success, errorMessage) {
		return this.logEvent({
			eventType: 'workflow_executed',
			category: 'workflow_management',
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
	async logAuthentication(eventType, userId, ipAddress, userAgent, success = true, errorMessage) {
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
	async logDataModification(
		eventType,
		resourceType,
		resourceId,
		userId,
		projectId,
		beforeState,
		afterState,
		description,
	) {
		return this.logEvent({
			eventType,
			category: 'data_modification',
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
	async getAuditEvents(options) {
		const queryBuilder = this.auditEventRepository.createQueryBuilder('audit_event');
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
		const total = await queryBuilder.getCount();
		queryBuilder
			.orderBy('audit_event.createdAt', 'DESC')
			.limit(options.limit || 100)
			.offset(options.offset || 0);
		queryBuilder
			.leftJoinAndSelect('audit_event.user', 'user')
			.leftJoinAndSelect('audit_event.project', 'project');
		const events = await queryBuilder.getMany();
		return { events, total };
	}
	async markAsReviewed(eventId, reviewedBy, reviewNotes) {
		await this.auditEventRepository.update(eventId, {
			reviewedBy,
			reviewedAt: new Date(),
			reviewNotes: reviewNotes || null,
		});
	}
	async cleanupArchivedEvents() {
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
	async getStatistics(startDate, endDate) {
		const queryBuilder = this.auditEventRepository
			.createQueryBuilder('audit_event')
			.where('audit_event.createdAt >= :startDate', { startDate })
			.andWhere('audit_event.createdAt <= :endDate', { endDate });
		const totalEvents = await queryBuilder.getCount();
		const eventTypeStats = await queryBuilder
			.select('audit_event.eventType', 'eventType')
			.addSelect('COUNT(*)', 'count')
			.groupBy('audit_event.eventType')
			.getRawMany();
		const eventsByType = eventTypeStats.reduce((acc, stat) => {
			acc[stat.eventType] = parseInt(stat.count);
			return acc;
		}, {});
		const categoryStats = await queryBuilder
			.select('audit_event.category', 'category')
			.addSelect('COUNT(*)', 'count')
			.groupBy('audit_event.category')
			.getRawMany();
		const eventsByCategory = categoryStats.reduce((acc, stat) => {
			acc[stat.category] = parseInt(stat.count);
			return acc;
		}, {});
		const severityStats = await queryBuilder
			.select('audit_event.severity', 'severity')
			.addSelect('COUNT(*)', 'count')
			.groupBy('audit_event.severity')
			.getRawMany();
		const eventsBySeverity = severityStats.reduce((acc, stat) => {
			acc[stat.severity] = parseInt(stat.count);
			return acc;
		}, {});
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
	calculateArchiveDate(retentionCategory) {
		if (retentionCategory === 'permanent') {
			return null;
		}
		const now = new Date();
		const archiveDate = new Date(now);
		switch (retentionCategory) {
			case 'minimal':
				archiveDate.setDate(now.getDate() + 90);
				break;
			case 'standard':
				archiveDate.setFullYear(now.getFullYear() + 1);
				break;
			case 'extended':
				archiveDate.setFullYear(now.getFullYear() + 7);
				break;
		}
		return archiveDate;
	}
	determineSeverityFromStatusCode(statusCode) {
		if (statusCode >= 500) return 'high';
		if (statusCode >= 400) return 'medium';
		return 'low';
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
exports.AuditLoggingService = AuditLoggingService;
exports.AuditLoggingService = AuditLoggingService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [])],
	AuditLoggingService,
);
//# sourceMappingURL=audit-logging.service.js.map
