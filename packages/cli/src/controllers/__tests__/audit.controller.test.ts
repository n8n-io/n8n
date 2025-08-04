import { AuditEvent, ComplianceReport, SecurityEvent } from '@n8n/db';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AuditLoggingService } from '@/services/audit-logging.service';
import { ComplianceReportingService } from '@/services/compliance-reporting.service';
import { SecurityMonitoringService } from '@/services/security-monitoring.service';

import {
	AuditController,
	type AuditEventsQueryDto,
	type SecurityEventsQueryDto,
	type ComplianceReportsQueryDto,
	type CreateComplianceReportDto,
	type ManualAuditEventDto,
	type AcknowledgeEventDto,
	type ResolveEventDto,
} from '../audit.controller';

describe('AuditController', () => {
	const auditLoggingService = mockInstance(AuditLoggingService);
	const complianceReportingService = mockInstance(ComplianceReportingService);
	const securityMonitoringService = mockInstance(SecurityMonitoringService);

	const controller = Container.get(AuditController);

	let mockUser: User;
	let mockAdminUser: User;
	let mockOwnerUser: User;
	let mockResponse: Response;

	beforeEach(() => {
		jest.clearAllMocks();

		mockUser = mock<User>({
			id: 'user-123',
			email: 'test@example.com',
			role: 'global:member',
		});

		mockAdminUser = mock<User>({
			id: 'admin-123',
			email: 'admin@example.com',
			role: 'global:admin',
		});

		mockOwnerUser = mock<User>({
			id: 'owner-123',
			email: 'owner@example.com',
			role: 'global:owner',
		});

		mockResponse = mock<Response>();
	});

	describe('getAuditEvents', () => {
		it('should return paginated audit events with default parameters', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				method: 'GET',
				path: '/audit/events',
			});

			const mockAuditEvents = [
				mock<AuditEvent>({ id: 'event-1', eventType: 'user_login' }),
				mock<AuditEvent>({ id: 'event-2', eventType: 'workflow_created' }),
			];

			const serviceResult = { events: mockAuditEvents, total: 2 };
			auditLoggingService.getAuditEvents.mockResolvedValue(serviceResult);

			// Act
			const result = await controller.getAuditEvents(req, mockResponse, {});

			// Assert
			expect(auditLoggingService.getAuditEvents).toHaveBeenCalledWith({
				startDate: undefined,
				endDate: undefined,
				eventTypes: undefined,
				categories: undefined,
				severities: undefined,
				userId: undefined,
				projectId: undefined,
				resourceType: undefined,
				requiresReview: undefined,
				limit: 50,
				offset: 0,
			});

			expect(auditLoggingService.logEvent).toHaveBeenCalledWith({
				eventType: 'api_call',
				category: 'data_access',
				severity: 'low',
				description: 'Audit events retrieved',
				userId: mockUser.id,
				httpMethod: 'GET',
				endpoint: '/audit/events',
				metadata: expect.any(Object),
			});

			expect(result).toEqual({
				events: mockAuditEvents,
				total: 2,
				page: 1,
				pageSize: 50,
			});
		});

		it('should parse query parameters correctly', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				method: 'GET',
				path: '/audit/events',
			});
			const query: AuditEventsQueryDto = {
				startDate: '2023-01-01',
				endDate: '2023-12-31',
				eventTypes: 'user_login,workflow_created',
				categories: 'authentication,workflow',
				severities: 'low,medium',
				userId: 'user-456',
				projectId: 'project-789',
				resourceType: 'workflow',
				requiresReview: 'true',
				limit: '25',
				offset: '50',
			};

			auditLoggingService.getAuditEvents.mockResolvedValue({ events: [], total: 0 });

			// Act
			await controller.getAuditEvents(req, mockResponse, query);

			// Assert
			expect(auditLoggingService.getAuditEvents).toHaveBeenCalledWith({
				startDate: new Date('2023-01-01'),
				endDate: new Date('2023-12-31'),
				eventTypes: ['user_login', 'workflow_created'],
				categories: ['authentication', 'workflow'],
				severities: ['low', 'medium'],
				userId: 'user-456',
				projectId: 'project-789',
				resourceType: 'workflow',
				requiresReview: true,
				limit: 25,
				offset: 50,
			});
		});

		it('should validate pagination parameters', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const query: AuditEventsQueryDto = { limit: '1001', offset: '-1' };

			// Act & Assert
			await expect(controller.getAuditEvents(req, mockResponse, query)).rejects.toThrow(
				BadRequestError,
			);
		});

		it('should handle service errors', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const serviceError = new Error('Database error');
			auditLoggingService.getAuditEvents.mockRejectedValue(serviceError);

			// Act & Assert
			await expect(controller.getAuditEvents(req, mockResponse, {})).rejects.toThrow(
				'Database error',
			);
		});
	});

	describe('getAuditStatistics', () => {
		it('should return audit statistics with default date range', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				method: 'GET',
				path: '/audit/events/statistics',
			});

			const mockStats = { totalEvents: 100, eventsByType: { user_login: 50 } };
			auditLoggingService.getStatistics.mockResolvedValue(mockStats);

			// Act
			const result = await controller.getAuditStatistics(req, mockResponse, {});

			// Assert
			expect(auditLoggingService.getStatistics).toHaveBeenCalledWith(
				expect.any(Date),
				expect.any(Date),
			);
			expect(result).toEqual(mockStats);
		});

		it('should use custom date range when provided', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				method: 'GET',
				path: '/audit/events/statistics',
			});
			const startDate = '2023-01-01';
			const endDate = '2023-12-31';

			auditLoggingService.getStatistics.mockResolvedValue({});

			// Act
			await controller.getAuditStatistics(req, mockResponse, { startDate, endDate });

			// Assert
			expect(auditLoggingService.getStatistics).toHaveBeenCalledWith(
				new Date(startDate),
				new Date(endDate),
			);
		});
	});

	describe('createAuditEvent', () => {
		it('should create audit event for admin user', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockAdminUser,
				get: jest.fn().mockImplementation((header: string) => {
					if (header === 'User-Agent') return 'Mozilla/5.0';
					if (header === 'X-Forwarded-For') return undefined;
					return undefined;
				}),
				ip: '192.168.1.1',
				connection: { remoteAddress: '192.168.1.1' },
			} as any);

			const eventData: ManualAuditEventDto = {
				eventType: 'workflow_updated',
				category: 'workflow',
				severity: 'medium',
				description: 'Workflow manually updated',
				resourceId: 'workflow-123',
				resourceType: 'workflow',
			};

			const mockAuditEvent = mock<AuditEvent>({ id: 'event-123' });
			auditLoggingService.logEvent.mockResolvedValue(mockAuditEvent);

			// Act
			const result = await controller.createAuditEvent(req, mockResponse, eventData);

			// Assert
			expect(auditLoggingService.logEvent).toHaveBeenCalledWith({
				eventType: eventData.eventType,
				category: eventData.category,
				severity: eventData.severity,
				description: eventData.description,
				userId: mockAdminUser.id,
				resourceId: eventData.resourceId,
				resourceType: eventData.resourceType,
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0',
				metadata: eventData.metadata,
				beforeState: eventData.beforeState,
				afterState: eventData.afterState,
				requiresReview: eventData.requiresReview,
				tags: eventData.tags,
			});

			expect(result).toEqual(mockAuditEvent);
		});

		it('should reject non-admin user', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const eventData: ManualAuditEventDto = {
				eventType: 'workflow_updated',
				category: 'workflow',
				description: 'Test event',
			};

			// Act & Assert
			await expect(controller.createAuditEvent(req, mockResponse, eventData)).rejects.toThrow(
				ForbiddenError,
			);
		});
	});

	describe('reviewAuditEvent', () => {
		it('should mark audit event as reviewed', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const eventId = 'event-123';
			const reviewData: AcknowledgeEventDto = { notes: 'Reviewed and approved' };

			auditLoggingService.markAsReviewed.mockResolvedValue(undefined);

			// Act
			const result = await controller.reviewAuditEvent(req, mockResponse, eventId, reviewData);

			// Assert
			expect(auditLoggingService.markAsReviewed).toHaveBeenCalledWith(
				eventId,
				mockUser.id,
				reviewData.notes,
			);
			expect(result).toEqual({ success: true });
		});
	});

	describe('getSecurityEvents', () => {
		it('should return paginated security events', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				method: 'GET',
				path: '/audit/security/events',
			});

			const mockSecurityEvents = [mock<SecurityEvent>({ id: 'security-1' })];
			const serviceResult = { events: mockSecurityEvents, total: 1 };
			securityMonitoringService.getSecurityEvents.mockResolvedValue(serviceResult);

			// Act
			const result = await controller.getSecurityEvents(req, mockResponse, {});

			// Assert
			expect(securityMonitoringService.getSecurityEvents).toHaveBeenCalled();
			expect(result).toEqual({
				events: mockSecurityEvents,
				total: 1,
				page: 1,
				pageSize: 50,
			});
		});

		it('should parse security event query parameters', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				method: 'GET',
				path: '/audit/security/events',
			});
			const query: SecurityEventsQueryDto = {
				eventTypes: 'failed_login,suspicious_activity',
				severities: 'high,critical',
				threatLevels: 'medium,high',
				resolved: 'false',
				requiresEscalation: 'true',
			};

			securityMonitoringService.getSecurityEvents.mockResolvedValue({ events: [], total: 0 });

			// Act
			await controller.getSecurityEvents(req, mockResponse, query);

			// Assert
			expect(securityMonitoringService.getSecurityEvents).toHaveBeenCalledWith({
				startDate: undefined,
				endDate: undefined,
				eventTypes: ['failed_login', 'suspicious_activity'],
				severities: ['high', 'critical'],
				threatLevels: ['medium', 'high'],
				status: undefined,
				userId: undefined,
				projectId: undefined,
				ipAddress: undefined,
				resolved: false,
				requiresEscalation: true,
				limit: 50,
				offset: 0,
			});
		});
	});

	describe('getSecurityMetrics', () => {
		it('should return security metrics with default date range', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				method: 'GET',
				path: '/audit/security/metrics',
			});

			const mockMetrics = { totalEvents: 25, threatsByLevel: { high: 5 } };
			securityMonitoringService.getSecurityMetrics.mockResolvedValue(mockMetrics);

			// Act
			const result = await controller.getSecurityMetrics(req, mockResponse, {});

			// Assert
			expect(securityMonitoringService.getSecurityMetrics).toHaveBeenCalledWith(
				expect.any(Date),
				expect.any(Date),
			);
			expect(result).toEqual(mockMetrics);
		});
	});

	describe('acknowledgeSecurityEvent', () => {
		it('should acknowledge security event', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const eventId = 'security-123';
			const acknowledgeData: AcknowledgeEventDto = { notes: 'False positive' };

			securityMonitoringService.acknowledgeEvent.mockResolvedValue(undefined);

			// Act
			const result = await controller.acknowledgeSecurityEvent(
				req,
				mockResponse,
				eventId,
				acknowledgeData,
			);

			// Assert
			expect(securityMonitoringService.acknowledgeEvent).toHaveBeenCalledWith(
				eventId,
				mockUser.id,
				acknowledgeData.notes,
			);
			expect(result).toEqual({ success: true });
		});
	});

	describe('resolveSecurityEvent', () => {
		it('should resolve security event with resolution notes', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const eventId = 'security-123';
			const resolveData: ResolveEventDto = {
				resolutionNotes: 'Issue resolved by updating firewall rules',
			};

			securityMonitoringService.resolveEvent.mockResolvedValue(undefined);

			// Act
			const result = await controller.resolveSecurityEvent(req, mockResponse, eventId, resolveData);

			// Assert
			expect(securityMonitoringService.resolveEvent).toHaveBeenCalledWith(
				eventId,
				mockUser.id,
				resolveData.resolutionNotes,
			);
			expect(result).toEqual({ success: true });
		});

		it('should reject empty resolution notes', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const eventId = 'security-123';
			const resolveData: ResolveEventDto = { resolutionNotes: '   ' };

			// Act & Assert
			await expect(
				controller.resolveSecurityEvent(req, mockResponse, eventId, resolveData),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('getComplianceReports', () => {
		it('should return paginated compliance reports', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({
				user: mockUser,
				method: 'GET',
				path: '/audit/compliance/reports',
			});

			const mockReports = [mock<ComplianceReport>({ id: 'report-1' })];
			const serviceResult = { reports: mockReports, total: 1 };
			complianceReportingService.getReports.mockResolvedValue(serviceResult);

			// Act
			const result = await controller.getComplianceReports(req, mockResponse, {});

			// Assert
			expect(complianceReportingService.getReports).toHaveBeenCalled();
			expect(result).toEqual({
				reports: mockReports,
				total: 1,
				page: 1,
				pageSize: 20,
			});
		});
	});

	describe('generateComplianceReport', () => {
		it('should generate compliance report for admin user', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockAdminUser });
			const reportRequest: CreateComplianceReportDto = {
				complianceStandard: 'SOC2',
				title: 'Q4 SOC2 Report',
				periodStart: '2023-10-01',
				periodEnd: '2023-12-31',
				format: 'PDF',
			};

			const mockReport = mock<ComplianceReport>({ id: 'report-123' });
			complianceReportingService.generateReport.mockResolvedValue(mockReport);

			// Act
			const result = await controller.generateComplianceReport(req, mockResponse, reportRequest);

			// Assert
			expect(complianceReportingService.generateReport).toHaveBeenCalledWith({
				...reportRequest,
				periodStart: new Date('2023-10-01'),
				periodEnd: new Date('2023-12-31'),
				generatedBy: mockAdminUser.id,
			});
			expect(result).toEqual(mockReport);
		});

		it('should reject non-admin user', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const reportRequest: CreateComplianceReportDto = {
				complianceStandard: 'SOC2',
				title: 'Report',
				periodStart: '2023-01-01',
				periodEnd: '2023-12-31',
				format: 'PDF',
			};

			// Act & Assert
			await expect(
				controller.generateComplianceReport(req, mockResponse, reportRequest),
			).rejects.toThrow(ForbiddenError);
		});

		it('should validate date range', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockAdminUser });
			const reportRequest: CreateComplianceReportDto = {
				complianceStandard: 'SOC2',
				title: 'Invalid Report',
				periodStart: '2023-12-31',
				periodEnd: '2023-01-01',
				format: 'PDF',
			};

			// Act & Assert
			await expect(
				controller.generateComplianceReport(req, mockResponse, reportRequest),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('downloadComplianceReport', () => {
		it('should download completed compliance report', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const reportId = 'report-123';
			const mockReport = mock<ComplianceReport>({
				id: reportId,
				status: 'completed',
				filePath: '/reports/report.pdf',
				mimeType: 'application/pdf',
				complianceStandard: 'SOC2',
				format: 'PDF',
			});

			complianceReportingService.getReports.mockResolvedValue({
				reports: [mockReport],
				total: 1,
			});
			complianceReportingService.trackDownload.mockResolvedValue(undefined);
			mockResponse.sendFile = jest.fn();

			// Act
			await controller.downloadComplianceReport(req, mockResponse, reportId);

			// Assert
			expect(complianceReportingService.trackDownload).toHaveBeenCalledWith(reportId, mockUser.id);
			expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="SOC2_report-123.pdf"',
			);
			expect(mockResponse.sendFile).toHaveBeenCalledWith('/reports/report.pdf');
		});

		it('should handle report not found', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const reportId = 'nonexistent-report';

			complianceReportingService.getReports.mockResolvedValue({ reports: [], total: 0 });

			// Act & Assert
			await expect(
				controller.downloadComplianceReport(req, mockResponse, reportId),
			).rejects.toThrow(NotFoundError);
		});

		it('should handle report not ready for download', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const reportId = 'report-123';
			const mockReport = mock<ComplianceReport>({
				id: reportId,
				status: 'generating',
				filePath: null,
			});

			complianceReportingService.getReports.mockResolvedValue({
				reports: [mockReport],
				total: 1,
			});

			// Act & Assert
			await expect(
				controller.downloadComplianceReport(req, mockResponse, reportId),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('cleanupAuditData', () => {
		it('should perform cleanup for owner user', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockOwnerUser });

			auditLoggingService.cleanupArchivedEvents.mockResolvedValue(100);
			complianceReportingService.archiveOldReports.mockResolvedValue(5);
			auditLoggingService.logEvent.mockResolvedValue(mock<AuditEvent>());

			// Act
			const result = await controller.cleanupAuditData(req, mockResponse);

			// Assert
			expect(auditLoggingService.cleanupArchivedEvents).toHaveBeenCalled();
			expect(complianceReportingService.archiveOldReports).toHaveBeenCalled();
			expect(auditLoggingService.logEvent).toHaveBeenCalledWith({
				eventType: 'system_configuration_changed',
				category: 'system_administration',
				severity: 'medium',
				description: 'Audit data cleanup performed',
				userId: mockOwnerUser.id,
				metadata: {
					auditEventsDeleted: 100,
					reportsArchived: 5,
				},
			});
			expect(result).toEqual({ auditEventsDeleted: 100, reportsArchived: 5 });
		});

		it('should reject non-owner user', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockAdminUser });

			// Act & Assert
			await expect(controller.cleanupAuditData(req, mockResponse)).rejects.toThrow(ForbiddenError);
		});
	});

	describe('error handling', () => {
		it('should handle and log service errors consistently', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

			auditLoggingService.getAuditEvents.mockRejectedValue(new Error('Service error'));

			// Act & Assert
			await expect(controller.getAuditEvents(req, mockResponse, {})).rejects.toThrow(
				'Service error',
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to retrieve audit events',
				expect.objectContaining({
					error: 'Service error',
					userId: mockUser.id,
				}),
			);

			consoleErrorSpy.mockRestore();
		});
	});
});
