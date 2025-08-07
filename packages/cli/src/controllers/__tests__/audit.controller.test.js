'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const audit_logging_service_1 = require('@/services/audit-logging.service');
const compliance_reporting_service_1 = require('@/services/compliance-reporting.service');
const security_monitoring_service_1 = require('@/services/security-monitoring.service');
const audit_controller_1 = require('../audit.controller');
describe('AuditController', () => {
	const auditLoggingService = (0, backend_test_utils_1.mockInstance)(
		audit_logging_service_1.AuditLoggingService,
	);
	const complianceReportingService = (0, backend_test_utils_1.mockInstance)(
		compliance_reporting_service_1.ComplianceReportingService,
	);
	const securityMonitoringService = (0, backend_test_utils_1.mockInstance)(
		security_monitoring_service_1.SecurityMonitoringService,
	);
	const controller = di_1.Container.get(audit_controller_1.AuditController);
	let mockUser;
	let mockAdminUser;
	let mockOwnerUser;
	let mockResponse;
	beforeEach(() => {
		jest.clearAllMocks();
		mockUser = (0, jest_mock_extended_1.mock)({
			id: 'user-123',
			email: 'test@example.com',
			role: 'global:member',
		});
		mockAdminUser = (0, jest_mock_extended_1.mock)({
			id: 'admin-123',
			email: 'admin@example.com',
			role: 'global:admin',
		});
		mockOwnerUser = (0, jest_mock_extended_1.mock)({
			id: 'owner-123',
			email: 'owner@example.com',
			role: 'global:owner',
		});
		mockResponse = (0, jest_mock_extended_1.mock)();
	});
	describe('getAuditEvents', () => {
		it('should return paginated audit events with default parameters', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				method: 'GET',
				path: '/audit/events',
			});
			const mockAuditEvents = [
				(0, jest_mock_extended_1.mock)({ id: 'event-1', eventType: 'user_login' }),
				(0, jest_mock_extended_1.mock)({ id: 'event-2', eventType: 'workflow_created' }),
			];
			const serviceResult = { events: mockAuditEvents, total: 2 };
			auditLoggingService.getAuditEvents.mockResolvedValue(serviceResult);
			const result = await controller.getAuditEvents(req, mockResponse, {});
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
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				method: 'GET',
				path: '/audit/events',
			});
			const query = {
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
			await controller.getAuditEvents(req, mockResponse, query);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const query = { limit: '1001', offset: '-1' };
			await expect(controller.getAuditEvents(req, mockResponse, query)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
		it('should handle service errors', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const serviceError = new Error('Database error');
			auditLoggingService.getAuditEvents.mockRejectedValue(serviceError);
			await expect(controller.getAuditEvents(req, mockResponse, {})).rejects.toThrow(
				'Database error',
			);
		});
	});
	describe('getAuditStatistics', () => {
		it('should return audit statistics with default date range', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				method: 'GET',
				path: '/audit/events/statistics',
			});
			const mockStats = { totalEvents: 100, eventsByType: { user_login: 50 } };
			auditLoggingService.getStatistics.mockResolvedValue(mockStats);
			const result = await controller.getAuditStatistics(req, mockResponse, {});
			expect(auditLoggingService.getStatistics).toHaveBeenCalledWith(
				expect.any(Date),
				expect.any(Date),
			);
			expect(result).toEqual(mockStats);
		});
		it('should use custom date range when provided', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				method: 'GET',
				path: '/audit/events/statistics',
			});
			const startDate = '2023-01-01';
			const endDate = '2023-12-31';
			auditLoggingService.getStatistics.mockResolvedValue({});
			await controller.getAuditStatistics(req, mockResponse, { startDate, endDate });
			expect(auditLoggingService.getStatistics).toHaveBeenCalledWith(
				new Date(startDate),
				new Date(endDate),
			);
		});
	});
	describe('createAuditEvent', () => {
		it('should create audit event for admin user', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockAdminUser,
				get: jest.fn().mockImplementation((header) => {
					if (header === 'User-Agent') return 'Mozilla/5.0';
					if (header === 'X-Forwarded-For') return undefined;
					return undefined;
				}),
				ip: '192.168.1.1',
				connection: { remoteAddress: '192.168.1.1' },
			});
			const eventData = {
				eventType: 'workflow_updated',
				category: 'workflow',
				severity: 'medium',
				description: 'Workflow manually updated',
				resourceId: 'workflow-123',
				resourceType: 'workflow',
			};
			const mockAuditEvent = (0, jest_mock_extended_1.mock)({ id: 'event-123' });
			auditLoggingService.logEvent.mockResolvedValue(mockAuditEvent);
			const result = await controller.createAuditEvent(req, mockResponse, eventData);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const eventData = {
				eventType: 'workflow_updated',
				category: 'workflow',
				description: 'Test event',
			};
			await expect(controller.createAuditEvent(req, mockResponse, eventData)).rejects.toThrow(
				forbidden_error_1.ForbiddenError,
			);
		});
	});
	describe('reviewAuditEvent', () => {
		it('should mark audit event as reviewed', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const eventId = 'event-123';
			const reviewData = { notes: 'Reviewed and approved' };
			auditLoggingService.markAsReviewed.mockResolvedValue(undefined);
			const result = await controller.reviewAuditEvent(req, mockResponse, eventId, reviewData);
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
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				method: 'GET',
				path: '/audit/security/events',
			});
			const mockSecurityEvents = [(0, jest_mock_extended_1.mock)({ id: 'security-1' })];
			const serviceResult = { events: mockSecurityEvents, total: 1 };
			securityMonitoringService.getSecurityEvents.mockResolvedValue(serviceResult);
			const result = await controller.getSecurityEvents(req, mockResponse, {});
			expect(securityMonitoringService.getSecurityEvents).toHaveBeenCalled();
			expect(result).toEqual({
				events: mockSecurityEvents,
				total: 1,
				page: 1,
				pageSize: 50,
			});
		});
		it('should parse security event query parameters', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				method: 'GET',
				path: '/audit/security/events',
			});
			const query = {
				eventTypes: 'failed_login,suspicious_activity',
				severities: 'high,critical',
				threatLevels: 'medium,high',
				resolved: 'false',
				requiresEscalation: 'true',
			};
			securityMonitoringService.getSecurityEvents.mockResolvedValue({ events: [], total: 0 });
			await controller.getSecurityEvents(req, mockResponse, query);
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
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				method: 'GET',
				path: '/audit/security/metrics',
			});
			const mockMetrics = { totalEvents: 25, threatsByLevel: { high: 5 } };
			securityMonitoringService.getSecurityMetrics.mockResolvedValue(mockMetrics);
			const result = await controller.getSecurityMetrics(req, mockResponse, {});
			expect(securityMonitoringService.getSecurityMetrics).toHaveBeenCalledWith(
				expect.any(Date),
				expect.any(Date),
			);
			expect(result).toEqual(mockMetrics);
		});
	});
	describe('acknowledgeSecurityEvent', () => {
		it('should acknowledge security event', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const eventId = 'security-123';
			const acknowledgeData = { notes: 'False positive' };
			securityMonitoringService.acknowledgeEvent.mockResolvedValue(undefined);
			const result = await controller.acknowledgeSecurityEvent(
				req,
				mockResponse,
				eventId,
				acknowledgeData,
			);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const eventId = 'security-123';
			const resolveData = {
				resolutionNotes: 'Issue resolved by updating firewall rules',
			};
			securityMonitoringService.resolveEvent.mockResolvedValue(undefined);
			const result = await controller.resolveSecurityEvent(req, mockResponse, eventId, resolveData);
			expect(securityMonitoringService.resolveEvent).toHaveBeenCalledWith(
				eventId,
				mockUser.id,
				resolveData.resolutionNotes,
			);
			expect(result).toEqual({ success: true });
		});
		it('should reject empty resolution notes', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const eventId = 'security-123';
			const resolveData = { resolutionNotes: '   ' };
			await expect(
				controller.resolveSecurityEvent(req, mockResponse, eventId, resolveData),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('getComplianceReports', () => {
		it('should return paginated compliance reports', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				method: 'GET',
				path: '/audit/compliance/reports',
			});
			const mockReports = [(0, jest_mock_extended_1.mock)({ id: 'report-1' })];
			const serviceResult = { reports: mockReports, total: 1 };
			complianceReportingService.getReports.mockResolvedValue(serviceResult);
			const result = await controller.getComplianceReports(req, mockResponse, {});
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockAdminUser });
			const reportRequest = {
				complianceStandard: 'SOC2',
				title: 'Q4 SOC2 Report',
				periodStart: '2023-10-01',
				periodEnd: '2023-12-31',
				format: 'PDF',
			};
			const mockReport = (0, jest_mock_extended_1.mock)({ id: 'report-123' });
			complianceReportingService.generateReport.mockResolvedValue(mockReport);
			const result = await controller.generateComplianceReport(req, mockResponse, reportRequest);
			expect(complianceReportingService.generateReport).toHaveBeenCalledWith({
				...reportRequest,
				periodStart: new Date('2023-10-01'),
				periodEnd: new Date('2023-12-31'),
				generatedBy: mockAdminUser.id,
			});
			expect(result).toEqual(mockReport);
		});
		it('should reject non-admin user', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const reportRequest = {
				complianceStandard: 'SOC2',
				title: 'Report',
				periodStart: '2023-01-01',
				periodEnd: '2023-12-31',
				format: 'PDF',
			};
			await expect(
				controller.generateComplianceReport(req, mockResponse, reportRequest),
			).rejects.toThrow(forbidden_error_1.ForbiddenError);
		});
		it('should validate date range', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockAdminUser });
			const reportRequest = {
				complianceStandard: 'SOC2',
				title: 'Invalid Report',
				periodStart: '2023-12-31',
				periodEnd: '2023-01-01',
				format: 'PDF',
			};
			await expect(
				controller.generateComplianceReport(req, mockResponse, reportRequest),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('downloadComplianceReport', () => {
		it('should download completed compliance report', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const reportId = 'report-123';
			const mockReport = (0, jest_mock_extended_1.mock)({
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
			await controller.downloadComplianceReport(req, mockResponse, reportId);
			expect(complianceReportingService.trackDownload).toHaveBeenCalledWith(reportId, mockUser.id);
			expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
			expect(mockResponse.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="SOC2_report-123.pdf"',
			);
			expect(mockResponse.sendFile).toHaveBeenCalledWith('/reports/report.pdf');
		});
		it('should handle report not found', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const reportId = 'nonexistent-report';
			complianceReportingService.getReports.mockResolvedValue({ reports: [], total: 0 });
			await expect(
				controller.downloadComplianceReport(req, mockResponse, reportId),
			).rejects.toThrow(not_found_error_1.NotFoundError);
		});
		it('should handle report not ready for download', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const reportId = 'report-123';
			const mockReport = (0, jest_mock_extended_1.mock)({
				id: reportId,
				status: 'generating',
				filePath: null,
			});
			complianceReportingService.getReports.mockResolvedValue({
				reports: [mockReport],
				total: 1,
			});
			await expect(
				controller.downloadComplianceReport(req, mockResponse, reportId),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('cleanupAuditData', () => {
		it('should perform cleanup for owner user', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockOwnerUser });
			auditLoggingService.cleanupArchivedEvents.mockResolvedValue(100);
			complianceReportingService.archiveOldReports.mockResolvedValue(5);
			auditLoggingService.logEvent.mockResolvedValue((0, jest_mock_extended_1.mock)());
			const result = await controller.cleanupAuditData(req, mockResponse);
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
			const req = (0, jest_mock_extended_1.mock)({ user: mockAdminUser });
			await expect(controller.cleanupAuditData(req, mockResponse)).rejects.toThrow(
				forbidden_error_1.ForbiddenError,
			);
		});
	});
	describe('error handling', () => {
		it('should handle and log service errors consistently', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
			auditLoggingService.getAuditEvents.mockRejectedValue(new Error('Service error'));
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
//# sourceMappingURL=audit.controller.test.js.map
