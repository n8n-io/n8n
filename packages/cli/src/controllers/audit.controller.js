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
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuditController = void 0;
const decorators_1 = require('@n8n/decorators');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const audit_logging_service_1 = require('@/services/audit-logging.service');
const compliance_reporting_service_1 = require('@/services/compliance-reporting.service');
const security_monitoring_service_1 = require('@/services/security-monitoring.service');
let AuditController = class AuditController {
	constructor(auditLoggingService, complianceReportingService, securityMonitoringService) {
		this.auditLoggingService = auditLoggingService;
		this.complianceReportingService = complianceReportingService;
		this.securityMonitoringService = securityMonitoringService;
	}
	async getAuditEvents(req, _res, query) {
		try {
			const options = {
				startDate: query.startDate ? new Date(query.startDate) : undefined,
				endDate: query.endDate ? new Date(query.endDate) : undefined,
				eventTypes: query.eventTypes ? query.eventTypes.split(',') : undefined,
				categories: query.categories ? query.categories.split(',') : undefined,
				severities: query.severities ? query.severities.split(',') : undefined,
				userId: query.userId,
				projectId: query.projectId,
				resourceType: query.resourceType,
				requiresReview: query.requiresReview ? query.requiresReview === 'true' : undefined,
				limit: query.limit ? parseInt(query.limit, 10) : 50,
				offset: query.offset ? parseInt(query.offset, 10) : 0,
			};
			if (options.limit < 1 || options.limit > 1000) {
				throw new bad_request_error_1.BadRequestError('Limit must be between 1 and 1000');
			}
			if (options.offset < 0) {
				throw new bad_request_error_1.BadRequestError('Offset must be non-negative');
			}
			const result = await this.auditLoggingService.getAuditEvents(options);
			await this.auditLoggingService.logEvent({
				eventType: 'api_call',
				category: 'data_access',
				severity: 'low',
				description: 'Audit events retrieved',
				userId: req.user.id,
				httpMethod: req.method,
				endpoint: req.path,
				metadata: {
					filters: options,
					resultCount: result.events.length,
				},
			});
			return {
				events: result.events,
				total: result.total,
				page: Math.floor(options.offset / options.limit) + 1,
				pageSize: options.limit,
			};
		} catch (error) {
			console.error('Failed to retrieve audit events', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}
	async getAuditStatistics(req, _res, query) {
		try {
			const startDate = query.startDate
				? new Date(query.startDate)
				: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
			const endDate = query.endDate ? new Date(query.endDate) : new Date();
			const statistics = await this.auditLoggingService.getStatistics(startDate, endDate);
			await this.auditLoggingService.logEvent({
				eventType: 'api_call',
				category: 'data_access',
				severity: 'low',
				description: 'Audit statistics retrieved',
				userId: req.user.id,
				httpMethod: req.method,
				endpoint: req.path,
				metadata: { startDate, endDate },
			});
			return statistics;
		} catch (error) {
			console.error('Failed to retrieve audit statistics', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}
	async createAuditEvent(req, _res, eventData) {
		try {
			if (req.user.role !== 'global:owner' && req.user.role !== 'global:admin') {
				throw new forbidden_error_1.ForbiddenError(
					'Insufficient permissions to create audit events',
				);
			}
			const auditEvent = await this.auditLoggingService.logEvent({
				eventType: eventData.eventType,
				category: eventData.category,
				severity: eventData.severity,
				description: eventData.description,
				userId: req.user.id,
				resourceId: eventData.resourceId,
				resourceType: eventData.resourceType,
				ipAddress: this.extractIpAddress(req),
				userAgent: req.get('User-Agent') || null,
				metadata: eventData.metadata,
				beforeState: eventData.beforeState,
				afterState: eventData.afterState,
				requiresReview: eventData.requiresReview,
				tags: eventData.tags,
			});
			console.log('Manual audit event created', {
				eventId: auditEvent.id,
				eventType: eventData.eventType,
				createdBy: req.user.id,
			});
			return auditEvent;
		} catch (error) {
			console.error('Failed to create audit event', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				eventData,
			});
			throw error;
		}
	}
	async reviewAuditEvent(req, _res, eventId, reviewData) {
		try {
			await this.auditLoggingService.markAsReviewed(eventId, req.user.id, reviewData.notes);
			console.log('Audit event reviewed', {
				eventId,
				reviewedBy: req.user.id,
				notes: reviewData.notes,
			});
			return { success: true };
		} catch (error) {
			console.error('Failed to review audit event', {
				error: error instanceof Error ? error.message : String(error),
				eventId,
				userId: req.user.id,
			});
			throw error;
		}
	}
	async getSecurityEvents(req, _res, query) {
		try {
			const options = {
				startDate: query.startDate ? new Date(query.startDate) : undefined,
				endDate: query.endDate ? new Date(query.endDate) : undefined,
				eventTypes: query.eventTypes ? query.eventTypes.split(',') : undefined,
				severities: query.severities ? query.severities.split(',') : undefined,
				threatLevels: query.threatLevels ? query.threatLevels.split(',') : undefined,
				status: query.status,
				userId: query.userId,
				projectId: query.projectId,
				ipAddress: query.ipAddress,
				resolved: query.resolved ? query.resolved === 'true' : undefined,
				requiresEscalation: query.requiresEscalation
					? query.requiresEscalation === 'true'
					: undefined,
				limit: query.limit ? parseInt(query.limit, 10) : 50,
				offset: query.offset ? parseInt(query.offset, 10) : 0,
			};
			const result = await this.securityMonitoringService.getSecurityEvents(options);
			await this.auditLoggingService.logEvent({
				eventType: 'api_call',
				category: 'security',
				severity: 'low',
				description: 'Security events retrieved',
				userId: req.user.id,
				httpMethod: req.method,
				endpoint: req.path,
				metadata: {
					filters: options,
					resultCount: result.events.length,
				},
			});
			return {
				events: result.events,
				total: result.total,
				page: Math.floor(options.offset / options.limit) + 1,
				pageSize: options.limit,
			};
		} catch (error) {
			console.error('Failed to retrieve security events', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}
	async getSecurityMetrics(req, _res, query) {
		try {
			const startDate = query.startDate
				? new Date(query.startDate)
				: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
			const endDate = query.endDate ? new Date(query.endDate) : new Date();
			const metrics = await this.securityMonitoringService.getSecurityMetrics(startDate, endDate);
			await this.auditLoggingService.logEvent({
				eventType: 'api_call',
				category: 'security',
				severity: 'low',
				description: 'Security metrics retrieved',
				userId: req.user.id,
				httpMethod: req.method,
				endpoint: req.path,
				metadata: { startDate, endDate },
			});
			return metrics;
		} catch (error) {
			console.error('Failed to retrieve security metrics', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}
	async acknowledgeSecurityEvent(req, _res, eventId, acknowledgeData) {
		try {
			await this.securityMonitoringService.acknowledgeEvent(
				eventId,
				req.user.id,
				acknowledgeData.notes,
			);
			console.log('Security event acknowledged', {
				eventId,
				acknowledgedBy: req.user.id,
				notes: acknowledgeData.notes,
			});
			return { success: true };
		} catch (error) {
			console.error('Failed to acknowledge security event', {
				error: error instanceof Error ? error.message : String(error),
				eventId,
				userId: req.user.id,
			});
			throw error;
		}
	}
	async resolveSecurityEvent(req, _res, eventId, resolveData) {
		try {
			if (!resolveData.resolutionNotes || resolveData.resolutionNotes.trim().length === 0) {
				throw new bad_request_error_1.BadRequestError('Resolution notes are required');
			}
			await this.securityMonitoringService.resolveEvent(
				eventId,
				req.user.id,
				resolveData.resolutionNotes,
			);
			console.log('Security event resolved', {
				eventId,
				resolvedBy: req.user.id,
				resolutionNotes: resolveData.resolutionNotes,
			});
			return { success: true };
		} catch (error) {
			console.error('Failed to resolve security event', {
				error: error instanceof Error ? error.message : String(error),
				eventId,
				userId: req.user.id,
			});
			throw error;
		}
	}
	async getComplianceReports(req, _res, query) {
		try {
			const options = {
				complianceStandard: query.complianceStandard,
				status: query.status,
				generatedBy: query.generatedBy,
				projectId: query.projectId,
				startDate: query.startDate ? new Date(query.startDate) : undefined,
				endDate: query.endDate ? new Date(query.endDate) : undefined,
				limit: query.limit ? parseInt(query.limit, 10) : 20,
				offset: query.offset ? parseInt(query.offset, 10) : 0,
			};
			const result = await this.complianceReportingService.getReports(options);
			await this.auditLoggingService.logEvent({
				eventType: 'api_call',
				category: 'data_access',
				severity: 'low',
				description: 'Compliance reports retrieved',
				userId: req.user.id,
				httpMethod: req.method,
				endpoint: req.path,
				metadata: {
					filters: options,
					resultCount: result.reports.length,
				},
			});
			return {
				reports: result.reports,
				total: result.total,
				page: Math.floor(options.offset / options.limit) + 1,
				pageSize: options.limit,
			};
		} catch (error) {
			console.error('Failed to retrieve compliance reports', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}
	async generateComplianceReport(req, _res, reportRequest) {
		try {
			if (req.user.role !== 'global:owner' && req.user.role !== 'global:admin') {
				throw new forbidden_error_1.ForbiddenError(
					'Insufficient permissions to generate compliance reports',
				);
			}
			const periodStart = new Date(reportRequest.periodStart);
			const periodEnd = new Date(reportRequest.periodEnd);
			if (periodStart >= periodEnd) {
				throw new bad_request_error_1.BadRequestError('Period start must be before period end');
			}
			const report = await this.complianceReportingService.generateReport({
				...reportRequest,
				periodStart,
				periodEnd,
				generatedBy: req.user.id,
			});
			console.log('Compliance report generation started', {
				reportId: report.id,
				complianceStandard: reportRequest.complianceStandard,
				generatedBy: req.user.id,
			});
			return report;
		} catch (error) {
			console.error('Failed to generate compliance report', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				reportRequest,
			});
			throw error;
		}
	}
	async downloadComplianceReport(req, res, reportId) {
		try {
			const { reports } = await this.complianceReportingService.getReports({
				limit: 1,
				offset: 0,
			});
			const report = reports.find((r) => r.id === reportId);
			if (!report) {
				throw new not_found_error_1.NotFoundError('Compliance report not found');
			}
			if (report.status !== 'completed' || !report.filePath) {
				throw new bad_request_error_1.BadRequestError('Report is not ready for download');
			}
			await this.complianceReportingService.trackDownload(reportId, req.user.id);
			res.setHeader('Content-Type', report.mimeType || 'application/octet-stream');
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${report.complianceStandard}_${report.id}.${report.format.toLowerCase()}"`,
			);
			res.sendFile(report.filePath);
			console.log('Compliance report downloaded', {
				reportId,
				downloadedBy: req.user.id,
				filePath: report.filePath,
			});
		} catch (error) {
			console.error('Failed to download compliance report', {
				error: error instanceof Error ? error.message : String(error),
				reportId,
				userId: req.user.id,
			});
			throw error;
		}
	}
	async cleanupAuditData(req, _res) {
		try {
			if (req.user.role !== 'global:owner') {
				throw new forbidden_error_1.ForbiddenError(
					'Insufficient permissions to perform cleanup operations',
				);
			}
			const auditEventsDeleted = await this.auditLoggingService.cleanupArchivedEvents();
			const reportsArchived = await this.complianceReportingService.archiveOldReports();
			await this.auditLoggingService.logEvent({
				eventType: 'system_configuration_changed',
				category: 'system_administration',
				severity: 'medium',
				description: 'Audit data cleanup performed',
				userId: req.user.id,
				metadata: {
					auditEventsDeleted,
					reportsArchived,
				},
			});
			console.log('Audit data cleanup completed', {
				auditEventsDeleted,
				reportsArchived,
				performedBy: req.user.id,
			});
			return { auditEventsDeleted, reportsArchived };
		} catch (error) {
			console.error('Failed to cleanup audit data', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
			});
			throw error;
		}
	}
	extractIpAddress(req) {
		const forwardedFor = req.get('X-Forwarded-For');
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}
		return req.ip || req.connection.remoteAddress || null;
	}
};
exports.AuditController = AuditController;
__decorate(
	[
		(0, decorators_1.Get)('/events'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'getAuditEvents',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/events/statistics'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'getAuditStatistics',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/events'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'createAuditEvent',
	null,
);
__decorate(
	[
		(0, decorators_1.Put)('/events/:id/review'),
		__param(2, (0, decorators_1.Param)('id')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'reviewAuditEvent',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/security/events'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'getSecurityEvents',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/security/metrics'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'getSecurityMetrics',
	null,
);
__decorate(
	[
		(0, decorators_1.Put)('/security/events/:id/acknowledge'),
		__param(2, (0, decorators_1.Param)('id')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'acknowledgeSecurityEvent',
	null,
);
__decorate(
	[
		(0, decorators_1.Put)('/security/events/:id/resolve'),
		__param(2, (0, decorators_1.Param)('id')),
		__param(3, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'resolveSecurityEvent',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/compliance/reports'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'getComplianceReports',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/compliance/reports'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'generateComplianceReport',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/compliance/reports/:id/download'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'downloadComplianceReport',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/cleanup'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	AuditController.prototype,
	'cleanupAuditData',
	null,
);
exports.AuditController = AuditController = __decorate(
	[
		(0, decorators_1.RestController)('/audit'),
		__metadata('design:paramtypes', [
			audit_logging_service_1.AuditLoggingService,
			compliance_reporting_service_1.ComplianceReportingService,
			security_monitoring_service_1.SecurityMonitoringService,
		]),
	],
	AuditController,
);
//# sourceMappingURL=audit.controller.js.map
