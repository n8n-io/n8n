import {
	AuditEvent,
	ComplianceReport,
	SecurityEvent,
	type AuditEventType,
	type AuditEventCategory,
	type AuditEventSeverity,
	type ComplianceStandard,
	type ReportFormat,
	type ReportStatus,
	type SecurityEventType,
	type SecurityEventSeverity,
	type ThreatLevel,
} from '@n8n/db';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, Put, RestController, Param, Query } from '@n8n/decorators';
import { Response } from 'express';
import type { IDataObject } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { Logger } from '@/logger';
import { AuditLoggingService } from '@/services/audit-logging.service';
import { ComplianceReportingService } from '@/services/compliance-reporting.service';
import { SecurityMonitoringService } from '@/services/security-monitoring.service';

/**
 * DTOs for API requests and responses
 */
export interface AuditEventsQueryDto {
	startDate?: string;
	endDate?: string;
	eventTypes?: string;
	categories?: string;
	severities?: string;
	userId?: string;
	projectId?: string;
	resourceType?: string;
	requiresReview?: string;
	limit?: string;
	offset?: string;
}

export interface SecurityEventsQueryDto {
	startDate?: string;
	endDate?: string;
	eventTypes?: string;
	severities?: string;
	threatLevels?: string;
	status?: string;
	userId?: string;
	projectId?: string;
	ipAddress?: string;
	resolved?: string;
	requiresEscalation?: string;
	limit?: string;
	offset?: string;
}

export interface ComplianceReportsQueryDto {
	complianceStandard?: ComplianceStandard;
	status?: ReportStatus;
	generatedBy?: string;
	projectId?: string;
	startDate?: string;
	endDate?: string;
	limit?: string;
	offset?: string;
}

export interface CreateComplianceReportDto {
	complianceStandard: ComplianceStandard;
	title: string;
	description?: string;
	periodStart: string;
	periodEnd: string;
	projectId?: string;
	format: ReportFormat;
	parameters?: IDataObject;
}

export interface AcknowledgeEventDto {
	notes?: string;
}

export interface ResolveEventDto {
	resolutionNotes: string;
}

export interface ManualAuditEventDto {
	eventType: AuditEventType;
	category: AuditEventCategory;
	severity?: AuditEventSeverity;
	description: string;
	resourceId?: string;
	resourceType?: string;
	metadata?: IDataObject;
	beforeState?: IDataObject;
	afterState?: IDataObject;
	requiresReview?: boolean;
	tags?: string[];
}

/**
 * Enterprise audit and compliance API controller
 * Provides comprehensive audit logging, compliance reporting, and security monitoring endpoints
 */
@RestController('/audit')
export class AuditController {
	constructor(
		private readonly logger: Logger,
		private readonly auditLoggingService: AuditLoggingService,
		private readonly complianceReportingService: ComplianceReportingService,
		private readonly securityMonitoringService: SecurityMonitoringService,
	) {}

	/**
	 * GET /audit/events
	 * Retrieve audit events with filtering and pagination
	 */
	@Get('/events')
	async getAuditEvents(
		req: AuthenticatedRequest,
		res: Response,
		@Query() query: AuditEventsQueryDto,
	): Promise<{ events: AuditEvent[]; total: number; page: number; pageSize: number }> {
		try {
			// Parse query parameters
			const options = {
				startDate: query.startDate ? new Date(query.startDate) : undefined,
				endDate: query.endDate ? new Date(query.endDate) : undefined,
				eventTypes: query.eventTypes
					? (query.eventTypes.split(',') as AuditEventType[])
					: undefined,
				categories: query.categories
					? (query.categories.split(',') as AuditEventCategory[])
					: undefined,
				severities: query.severities
					? (query.severities.split(',') as AuditEventSeverity[])
					: undefined,
				userId: query.userId,
				projectId: query.projectId,
				resourceType: query.resourceType,
				requiresReview: query.requiresReview ? query.requiresReview === 'true' : undefined,
				limit: query.limit ? parseInt(query.limit, 10) : 50,
				offset: query.offset ? parseInt(query.offset, 10) : 0,
			};

			// Validate pagination parameters
			if (options.limit < 1 || options.limit > 1000) {
				throw new BadRequestError('Limit must be between 1 and 1000');
			}

			if (options.offset < 0) {
				throw new BadRequestError('Offset must be non-negative');
			}

			// Get audit events
			const result = await this.auditLoggingService.getAuditEvents(options);

			// Log the access
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
			this.logger.error('Failed to retrieve audit events', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}

	/**
	 * GET /audit/events/statistics
	 * Get audit event statistics for dashboard
	 */
	@Get('/events/statistics')
	async getAuditStatistics(
		req: AuthenticatedRequest,
		res: Response,
		@Query() query: { startDate?: string; endDate?: string },
	): Promise<any> {
		try {
			const startDate = query.startDate
				? new Date(query.startDate)
				: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
			const endDate = query.endDate ? new Date(query.endDate) : new Date();

			const statistics = await this.auditLoggingService.getStatistics(startDate, endDate);

			// Log the access
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
			this.logger.error('Failed to retrieve audit statistics', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}

	/**
	 * POST /audit/events
	 * Manually create an audit event (for admin use)
	 */
	@Post('/events')
	async createAuditEvent(
		req: AuthenticatedRequest,
		res: Response,
		@Body eventData: ManualAuditEventDto,
	): Promise<AuditEvent> {
		try {
			// Only admins can manually create audit events
			if (req.user.role !== 'global:owner' && req.user.role !== 'global:admin') {
				throw new ForbiddenError('Insufficient permissions to create audit events');
			}

			const auditEvent = await this.auditLoggingService.logEvent({
				...eventData,
				userId: req.user.id,
				ipAddress: this.extractIpAddress(req),
				userAgent: req.get('User-Agent') || null,
			});

			this.logger.info('Manual audit event created', {
				eventId: auditEvent.id,
				eventType: eventData.eventType,
				createdBy: req.user.id,
			});

			return auditEvent;
		} catch (error) {
			this.logger.error('Failed to create audit event', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				eventData,
			});
			throw error;
		}
	}

	/**
	 * PUT /audit/events/:id/review
	 * Mark an audit event as reviewed
	 */
	@Put('/events/:id/review')
	async reviewAuditEvent(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') eventId: string,
		@Body reviewData: AcknowledgeEventDto,
	): Promise<{ success: boolean }> {
		try {
			await this.auditLoggingService.markAsReviewed(eventId, req.user.id, reviewData.notes);

			this.logger.info('Audit event reviewed', {
				eventId,
				reviewedBy: req.user.id,
				notes: reviewData.notes,
			});

			return { success: true };
		} catch (error) {
			this.logger.error('Failed to review audit event', {
				error: error instanceof Error ? error.message : String(error),
				eventId,
				userId: req.user.id,
			});
			throw error;
		}
	}

	/**
	 * GET /audit/security/events
	 * Retrieve security events with filtering and pagination
	 */
	@Get('/security/events')
	async getSecurityEvents(
		req: AuthenticatedRequest,
		res: Response,
		@Query() query: SecurityEventsQueryDto,
	): Promise<{ events: SecurityEvent[]; total: number; page: number; pageSize: number }> {
		try {
			const options = {
				startDate: query.startDate ? new Date(query.startDate) : undefined,
				endDate: query.endDate ? new Date(query.endDate) : undefined,
				eventTypes: query.eventTypes
					? (query.eventTypes.split(',') as SecurityEventType[])
					: undefined,
				severities: query.severities
					? (query.severities.split(',') as SecurityEventSeverity[])
					: undefined,
				threatLevels: query.threatLevels
					? (query.threatLevels.split(',') as ThreatLevel[])
					: undefined,
				status: query.status as any,
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

			// Log the access
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
			this.logger.error('Failed to retrieve security events', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}

	/**
	 * GET /audit/security/metrics
	 * Get security metrics for dashboard
	 */
	@Get('/security/metrics')
	async getSecurityMetrics(
		req: AuthenticatedRequest,
		res: Response,
		@Query() query: { startDate?: string; endDate?: string },
	): Promise<any> {
		try {
			const startDate = query.startDate
				? new Date(query.startDate)
				: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: 7 days ago
			const endDate = query.endDate ? new Date(query.endDate) : new Date();

			const metrics = await this.securityMonitoringService.getSecurityMetrics(startDate, endDate);

			// Log the access
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
			this.logger.error('Failed to retrieve security metrics', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}

	/**
	 * PUT /audit/security/events/:id/acknowledge
	 * Acknowledge a security event
	 */
	@Put('/security/events/:id/acknowledge')
	async acknowledgeSecurityEvent(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') eventId: string,
		@Body acknowledgeData: AcknowledgeEventDto,
	): Promise<{ success: boolean }> {
		try {
			await this.securityMonitoringService.acknowledgeEvent(
				eventId,
				req.user.id,
				acknowledgeData.notes,
			);

			this.logger.info('Security event acknowledged', {
				eventId,
				acknowledgedBy: req.user.id,
				notes: acknowledgeData.notes,
			});

			return { success: true };
		} catch (error) {
			this.logger.error('Failed to acknowledge security event', {
				error: error instanceof Error ? error.message : String(error),
				eventId,
				userId: req.user.id,
			});
			throw error;
		}
	}

	/**
	 * PUT /audit/security/events/:id/resolve
	 * Resolve a security event
	 */
	@Put('/security/events/:id/resolve')
	async resolveSecurityEvent(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') eventId: string,
		@Body resolveData: ResolveEventDto,
	): Promise<{ success: boolean }> {
		try {
			if (!resolveData.resolutionNotes || resolveData.resolutionNotes.trim().length === 0) {
				throw new BadRequestError('Resolution notes are required');
			}

			await this.securityMonitoringService.resolveEvent(
				eventId,
				req.user.id,
				resolveData.resolutionNotes,
			);

			this.logger.info('Security event resolved', {
				eventId,
				resolvedBy: req.user.id,
				resolutionNotes: resolveData.resolutionNotes,
			});

			return { success: true };
		} catch (error) {
			this.logger.error('Failed to resolve security event', {
				error: error instanceof Error ? error.message : String(error),
				eventId,
				userId: req.user.id,
			});
			throw error;
		}
	}

	/**
	 * GET /audit/compliance/reports
	 * Retrieve compliance reports with filtering
	 */
	@Get('/compliance/reports')
	async getComplianceReports(
		req: AuthenticatedRequest,
		res: Response,
		@Query() query: ComplianceReportsQueryDto,
	): Promise<{ reports: ComplianceReport[]; total: number; page: number; pageSize: number }> {
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

			// Log the access
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
			this.logger.error('Failed to retrieve compliance reports', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				query,
			});
			throw error;
		}
	}

	/**
	 * POST /audit/compliance/reports
	 * Generate a new compliance report
	 */
	@Post('/compliance/reports')
	async generateComplianceReport(
		req: AuthenticatedRequest,
		res: Response,
		@Body reportRequest: CreateComplianceReportDto,
	): Promise<ComplianceReport> {
		try {
			// Only admins can generate compliance reports
			if (req.user.role !== 'global:owner' && req.user.role !== 'global:admin') {
				throw new ForbiddenError('Insufficient permissions to generate compliance reports');
			}

			// Validate date range
			const periodStart = new Date(reportRequest.periodStart);
			const periodEnd = new Date(reportRequest.periodEnd);

			if (periodStart >= periodEnd) {
				throw new BadRequestError('Period start must be before period end');
			}

			// Generate the report
			const report = await this.complianceReportingService.generateReport({
				...reportRequest,
				periodStart,
				periodEnd,
				generatedBy: req.user.id,
			});

			this.logger.info('Compliance report generation started', {
				reportId: report.id,
				complianceStandard: reportRequest.complianceStandard,
				generatedBy: req.user.id,
			});

			return report;
		} catch (error) {
			this.logger.error('Failed to generate compliance report', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
				reportRequest,
			});
			throw error;
		}
	}

	/**
	 * GET /audit/compliance/reports/:id/download
	 * Download a compliance report file
	 */
	@Get('/compliance/reports/:id/download')
	async downloadComplianceReport(
		req: AuthenticatedRequest,
		res: Response,
		@Param('id') reportId: string,
	): Promise<void> {
		try {
			// Get report details
			const { reports } = await this.complianceReportingService.getReports({
				limit: 1,
				offset: 0,
			});

			const report = reports.find((r) => r.id === reportId);
			if (!report) {
				throw new NotFoundError('Compliance report not found');
			}

			if (report.status !== 'completed' || !report.filePath) {
				throw new BadRequestError('Report is not ready for download');
			}

			// Track the download
			await this.complianceReportingService.trackDownload(reportId, req.user.id);

			// Set response headers for file download
			res.setHeader('Content-Type', report.mimeType || 'application/octet-stream');
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${report.complianceStandard}_${report.id}.${report.format.toLowerCase()}"`,
			);

			// Send file (in a real implementation, you'd stream the file from storage)
			res.sendFile(report.filePath);

			this.logger.info('Compliance report downloaded', {
				reportId,
				downloadedBy: req.user.id,
				filePath: report.filePath,
			});
		} catch (error) {
			this.logger.error('Failed to download compliance report', {
				error: error instanceof Error ? error.message : String(error),
				reportId,
				userId: req.user.id,
			});
			throw error;
		}
	}

	/**
	 * GET /audit/cleanup
	 * Clean up archived audit data (admin only)
	 */
	@Get('/cleanup')
	async cleanupAuditData(
		req: AuthenticatedRequest,
		res: Response,
	): Promise<{ auditEventsDeleted: number; reportsArchived: number }> {
		try {
			// Only admin users can trigger cleanup
			if (req.user.role !== 'global:owner') {
				throw new ForbiddenError('Insufficient permissions to perform cleanup operations');
			}

			const auditEventsDeleted = await this.auditLoggingService.cleanupArchivedEvents();
			const reportsArchived = await this.complianceReportingService.archiveOldReports();

			// Log the cleanup operation
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

			this.logger.info('Audit data cleanup completed', {
				auditEventsDeleted,
				reportsArchived,
				performedBy: req.user.id,
			});

			return { auditEventsDeleted, reportsArchived };
		} catch (error) {
			this.logger.error('Failed to cleanup audit data', {
				error: error instanceof Error ? error.message : String(error),
				userId: req.user.id,
			});
			throw error;
		}
	}

	/**
	 * Extract IP address from request
	 */
	private extractIpAddress(req: AuthenticatedRequest): string | null {
		const forwardedFor = req.get('X-Forwarded-For');
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}
		return req.ip || req.connection.remoteAddress || null;
	}
}
