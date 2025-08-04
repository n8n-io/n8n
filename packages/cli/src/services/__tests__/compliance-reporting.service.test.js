'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const node_fs_1 = require('node:fs');
const promises_1 = require('node:fs/promises');
const logger_1 = require('@/logger');
const audit_logging_service_1 = require('../audit-logging.service');
const compliance_reporting_service_1 = require('../compliance-reporting.service');
jest.mock('node:fs', () => ({
	existsSync: jest.fn(),
}));
jest.mock('node:fs/promises', () => ({
	mkdir: jest.fn(),
	writeFile: jest.fn(),
}));
describe('ComplianceReportingService', () => {
	let complianceReportingService;
	let mockComplianceReportRepository;
	let mockAuditEventRepository;
	let mockSecurityEventRepository;
	let mockLogger;
	let mockAuditLoggingService;
	const mockReportOptions = {
		complianceStandard: 'SOX',
		title: 'SOX Compliance Report Q4 2023',
		description: 'Quarterly compliance assessment',
		periodStart: new Date('2023-10-01'),
		periodEnd: new Date('2023-12-31'),
		generatedBy: 'admin-123',
		projectId: 'project-123',
		format: 'pdf',
		parameters: { includeDetails: true },
	};
	beforeEach(() => {
		jest.clearAllMocks();
		mockComplianceReportRepository = (0, jest_mock_extended_1.mock)();
		mockAuditEventRepository = (0, jest_mock_extended_1.mock)();
		mockSecurityEventRepository = (0, jest_mock_extended_1.mock)();
		mockLogger = (0, jest_mock_extended_1.mock)();
		mockAuditLoggingService = (0, jest_mock_extended_1.mock)();
		node_fs_1.existsSync.mockReturnValue(true);
		promises_1.mkdir.mockResolvedValue(undefined);
		promises_1.writeFile.mockResolvedValue(undefined);
		di_1.Container.get = jest.fn().mockImplementation((token) => {
			if (token === logger_1.Logger) return mockLogger;
			if (token === audit_logging_service_1.AuditLoggingService) return mockAuditLoggingService;
			if (token === 'DataSource') {
				return {
					getRepository: (entity) => {
						if (entity === db_1.ComplianceReport) return mockComplianceReportRepository;
						if (entity === db_1.AuditEvent) return mockAuditEventRepository;
						if (entity === db_1.SecurityEvent) return mockSecurityEventRepository;
						return (0, jest_mock_extended_1.mock)();
					},
				};
			}
			return {};
		});
		process.env.N8N_COMPLIANCE_REPORTS_PATH = '/tmp/test-reports';
		complianceReportingService = new compliance_reporting_service_1.ComplianceReportingService();
	});
	afterEach(() => {
		delete process.env.N8N_COMPLIANCE_REPORTS_PATH;
	});
	describe('generateReport', () => {
		it('should successfully generate a compliance report', async () => {
			const mockInitialReport = {
				id: 'report-123',
				status: 'generating',
				generationStartedAt: new Date(),
			};
			const mockCompletedReport = {
				...mockInitialReport,
				status: 'completed',
				filePath: '/tmp/test-reports/SOX_report-123_1234567890.pdf',
				generationCompletedAt: new Date(),
			};
			const mockAuditEvents = [
				{ id: 'audit-1', eventType: 'api_call', severity: 'low' },
				{ id: 'audit-2', eventType: 'workflow_created', severity: 'medium' },
			];
			const mockSecurityEvents = [
				{ id: 'security-1', eventType: 'failed_login_attempt', severity: 'medium' },
			];
			mockComplianceReportRepository.create.mockReturnValue(mockInitialReport);
			mockComplianceReportRepository.save.mockResolvedValueOnce(mockInitialReport);
			mockComplianceReportRepository.update.mockResolvedValue({ affected: 1 });
			mockComplianceReportRepository.findOneOrFail.mockResolvedValue(mockCompletedReport);
			mockAuditLoggingService.getAuditEvents.mockResolvedValue({
				events: mockAuditEvents,
				total: 2,
			});
			const mockSecurityQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockSecurityEvents),
			};
			mockSecurityEventRepository.createQueryBuilder.mockReturnValue(mockSecurityQueryBuilder);
			const result = await complianceReportingService.generateReport(mockReportOptions);
			expect(mockComplianceReportRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'SOX Compliance Report Q4 2023',
					complianceStandard: 'SOX',
					status: 'generating',
					periodStart: mockReportOptions.periodStart,
					periodEnd: mockReportOptions.periodEnd,
					generatedBy: 'admin-123',
					projectId: 'project-123',
					format: 'pdf',
				}),
			);
			expect(mockComplianceReportRepository.update).toHaveBeenCalledWith(
				'report-123',
				expect.objectContaining({
					status: 'completed',
					filePath: expect.stringContaining('SOX_report-123_'),
					eventCount: 2,
					securityEventCount: 1,
				}),
			);
			expect(mockAuditLoggingService.logEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'compliance_report_generated',
					category: 'system_administration',
					description: 'Generated SOX compliance report: SOX Compliance Report Q4 2023',
					userId: 'admin-123',
					resourceId: 'report-123',
					resourceType: 'compliance_report',
				}),
			);
			expect(result).toEqual(mockCompletedReport);
		});
		it('should handle report generation failures', async () => {
			const mockInitialReport = {
				id: 'report-123',
				status: 'generating',
				generationStartedAt: new Date(),
			};
			mockComplianceReportRepository.create.mockReturnValue(mockInitialReport);
			mockComplianceReportRepository.save.mockResolvedValue(mockInitialReport);
			const error = new Error('Database connection failed');
			mockAuditLoggingService.getAuditEvents.mockRejectedValue(error);
			await expect(complianceReportingService.generateReport(mockReportOptions)).rejects.toThrow(
				'Compliance report generation failed: Database connection failed',
			);
			expect(mockComplianceReportRepository.update).toHaveBeenCalledWith(
				'report-123',
				expect.objectContaining({
					status: 'failed',
					errorMessage: 'Database connection failed',
				}),
			);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to generate compliance report',
				expect.objectContaining({
					reportId: 'report-123',
					error: 'Database connection failed',
				}),
			);
		});
		it('should create reports directory if it does not exist', async () => {
			node_fs_1.existsSync.mockReturnValue(false);
			const mockInitialReport = {
				id: 'report-123',
				status: 'generating',
				generationStartedAt: new Date(),
			};
			const mockCompletedReport = {
				...mockInitialReport,
				status: 'completed',
			};
			mockComplianceReportRepository.create.mockReturnValue(mockInitialReport);
			mockComplianceReportRepository.save.mockResolvedValue(mockInitialReport);
			mockComplianceReportRepository.update.mockResolvedValue({ affected: 1 });
			mockComplianceReportRepository.findOneOrFail.mockResolvedValue(mockCompletedReport);
			mockAuditLoggingService.getAuditEvents.mockResolvedValue({ events: [], total: 0 });
			const mockSecurityQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			};
			mockSecurityEventRepository.createQueryBuilder.mockReturnValue(mockSecurityQueryBuilder);
			await complianceReportingService.generateReport(mockReportOptions);
			expect(promises_1.mkdir).toHaveBeenCalledWith('/tmp/test-reports', { recursive: true });
		});
	});
	describe('compliance standard specific findings', () => {
		const setupMockData = () => {
			const mockReport = {
				id: 'report-123',
				status: 'generating',
				generationStartedAt: new Date(),
			};
			mockComplianceReportRepository.create.mockReturnValue(mockReport);
			mockComplianceReportRepository.save.mockResolvedValue(mockReport);
			mockComplianceReportRepository.update.mockResolvedValue({ affected: 1 });
			mockComplianceReportRepository.findOneOrFail.mockResolvedValue({
				...mockReport,
				status: 'completed',
			});
			const mockSecurityQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			};
			mockSecurityEventRepository.createQueryBuilder.mockReturnValue(mockSecurityQueryBuilder);
		};
		it('should generate SOX-specific findings', async () => {
			setupMockData();
			const mockAuditEvents = [
				{
					id: 'audit-1',
					eventType: 'api_call',
					severity: 'low',
					tags: ['financial'],
					category: 'data_modification',
					beforeState: { value: 100 },
					afterState: { value: 200 },
				},
				{
					id: 'audit-2',
					eventType: 'user_role_changed',
					severity: 'medium',
					category: 'user_management',
				},
			];
			mockAuditLoggingService.getAuditEvents.mockResolvedValue({
				events: mockAuditEvents,
				total: 2,
			});
			await complianceReportingService.generateReport({
				...mockReportOptions,
				complianceStandard: 'SOX',
			});
			expect(mockComplianceReportRepository.update).toHaveBeenCalledWith(
				'report-123',
				expect.objectContaining({
					status: 'completed',
					summary: expect.stringContaining('SOX compliance analysis'),
				}),
			);
		});
		it('should generate GDPR-specific findings', async () => {
			setupMockData();
			const mockAuditEvents = [
				{
					id: 'audit-1',
					eventType: 'data_exported',
					severity: 'medium',
					tags: ['personal_data'],
					metadata: { gdpr_compliant: true },
				},
				{
					id: 'audit-2',
					eventType: 'api_call',
					severity: 'low',
					description: 'Accessed personal information',
				},
			];
			const mockSecurityEvents = [
				{
					id: 'security-1',
					eventType: 'data_breach_attempt',
					severity: 'critical',
				},
			];
			mockAuditLoggingService.getAuditEvents.mockResolvedValue({
				events: mockAuditEvents,
				total: 2,
			});
			const mockSecurityQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockSecurityEvents),
			};
			mockSecurityEventRepository.createQueryBuilder.mockReturnValue(mockSecurityQueryBuilder);
			await complianceReportingService.generateReport({
				...mockReportOptions,
				complianceStandard: 'GDPR',
			});
			expect(mockComplianceReportRepository.update).toHaveBeenCalledWith(
				'report-123',
				expect.objectContaining({
					status: 'completed',
					summary: expect.stringContaining('GDPR compliance analysis'),
				}),
			);
		});
		it('should generate HIPAA-specific findings', async () => {
			setupMockData();
			const mockAuditEvents = [
				{
					id: 'audit-1',
					eventType: 'api_call',
					severity: 'low',
					tags: ['phi', 'health_data'],
					description: 'Accessed health information',
				},
			];
			const mockSecurityEvents = [
				{
					id: 'security-1',
					eventType: 'unauthorized_access_attempt',
					severity: 'high',
					tags: ['phi'],
				},
			];
			mockAuditLoggingService.getAuditEvents.mockResolvedValue({
				events: mockAuditEvents,
				total: 1,
			});
			const mockSecurityQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockSecurityEvents),
			};
			mockSecurityEventRepository.createQueryBuilder.mockReturnValue(mockSecurityQueryBuilder);
			await complianceReportingService.generateReport({
				...mockReportOptions,
				complianceStandard: 'HIPAA',
			});
			expect(mockComplianceReportRepository.update).toHaveBeenCalledWith(
				'report-123',
				expect.objectContaining({
					status: 'completed',
					summary: expect.stringContaining('HIPAA compliance analysis'),
				}),
			);
		});
	});
	describe('report format generation', () => {
		const setupMockReportGeneration = () => {
			const mockReport = {
				id: 'report-123',
				status: 'generating',
				generationStartedAt: new Date(),
			};
			mockComplianceReportRepository.create.mockReturnValue(mockReport);
			mockComplianceReportRepository.save.mockResolvedValue(mockReport);
			mockComplianceReportRepository.update.mockResolvedValue({ affected: 1 });
			mockComplianceReportRepository.findOneOrFail.mockResolvedValue({
				...mockReport,
				status: 'completed',
			});
			mockAuditLoggingService.getAuditEvents.mockResolvedValue({ events: [], total: 0 });
			const mockSecurityQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			};
			mockSecurityEventRepository.createQueryBuilder.mockReturnValue(mockSecurityQueryBuilder);
		};
		it('should generate JSON format report', async () => {
			setupMockReportGeneration();
			await complianceReportingService.generateReport({
				...mockReportOptions,
				format: 'json',
			});
			expect(promises_1.writeFile).toHaveBeenCalledWith(
				expect.stringMatching(/\.json$/),
				expect.stringContaining('"reportId"'),
			);
		});
		it('should generate CSV format report', async () => {
			setupMockReportGeneration();
			await complianceReportingService.generateReport({
				...mockReportOptions,
				format: 'csv',
			});
			expect(promises_1.writeFile).toHaveBeenCalledWith(
				expect.stringMatching(/\.csv$/),
				expect.stringContaining('Compliance Report Summary'),
			);
		});
		it('should generate PDF format report', async () => {
			setupMockReportGeneration();
			await complianceReportingService.generateReport({
				...mockReportOptions,
				format: 'pdf',
			});
			expect(promises_1.writeFile).toHaveBeenCalledWith(
				expect.stringMatching(/\.pdf$/),
				expect.stringContaining('COMPLIANCE REPORT'),
			);
		});
		it('should generate Excel format report', async () => {
			setupMockReportGeneration();
			await complianceReportingService.generateReport({
				...mockReportOptions,
				format: 'excel',
			});
			expect(promises_1.writeFile).toHaveBeenCalledWith(
				expect.stringMatching(/\.csv$/),
				expect.stringContaining('Compliance Report Summary'),
			);
		});
	});
	describe('getReports', () => {
		it('should retrieve compliance reports with filtering', async () => {
			const mockReports = [
				{
					id: 'report-1',
					complianceStandard: 'SOX',
					status: 'completed',
					generatedBy: 'admin-123',
				},
				{
					id: 'report-2',
					complianceStandard: 'GDPR',
					status: 'generating',
					generatedBy: 'admin-456',
				},
			];
			const mockQueryBuilder = {
				andWhere: jest.fn().mockReturnThis(),
				getCount: jest.fn().mockResolvedValue(2),
				orderBy: jest.fn().mockReturnThis(),
				limit: jest.fn().mockReturnThis(),
				offset: jest.fn().mockReturnThis(),
				leftJoinAndSelect: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockReports),
			};
			mockComplianceReportRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
			const options = {
				complianceStandard: 'SOX',
				status: 'completed',
				generatedBy: 'admin-123',
				limit: 10,
				offset: 0,
			};
			const result = await complianceReportingService.getReports(options);
			expect(mockComplianceReportRepository.createQueryBuilder).toHaveBeenCalledWith('report');
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
				'report.complianceStandard = :standard',
				{ standard: 'SOX' },
			);
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.status = :status', {
				status: 'completed',
			});
			expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('report.generatedBy = :generatedBy', {
				generatedBy: 'admin-123',
			});
			expect(result).toEqual({
				reports: mockReports,
				total: 2,
			});
		});
	});
	describe('trackDownload', () => {
		it('should track report download and log audit event', async () => {
			const reportId = 'report-123';
			const downloadedBy = 'user-456';
			mockComplianceReportRepository.update.mockResolvedValue({ affected: 1 });
			await complianceReportingService.trackDownload(reportId, downloadedBy);
			expect(mockComplianceReportRepository.update).toHaveBeenCalledWith(reportId, {
				downloadCount: expect.any(Function),
				lastDownloadedAt: expect.any(Date),
				lastDownloadedBy: downloadedBy,
			});
			expect(mockAuditLoggingService.logEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'file_downloaded',
					category: 'data_access',
					description: `Compliance report downloaded: ${reportId}`,
					userId: downloadedBy,
					resourceId: reportId,
					resourceType: 'compliance_report',
				}),
			);
		});
	});
	describe('archiveOldReports', () => {
		it('should archive old reports and return count', async () => {
			const mockQueryBuilder = {
				update: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 3 }),
			};
			mockComplianceReportRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
			const result = await complianceReportingService.archiveOldReports();
			expect(mockComplianceReportRepository.createQueryBuilder).toHaveBeenCalled();
			expect(mockQueryBuilder.update).toHaveBeenCalled();
			expect(mockQueryBuilder.set).toHaveBeenCalledWith({ status: 'archived' });
			expect(mockQueryBuilder.where).toHaveBeenCalledWith('archiveAt < :now', {
				now: expect.any(Date),
			});
			expect(result).toBe(3);
			expect(mockLogger.info).toHaveBeenCalledWith('Archived 3 compliance reports');
		});
		it('should return 0 when no reports are archived', async () => {
			const mockQueryBuilder = {
				update: jest.fn().mockReturnThis(),
				set: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				execute: jest.fn().mockResolvedValue({ affected: 0 }),
			};
			mockComplianceReportRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
			const result = await complianceReportingService.archiveOldReports();
			expect(result).toBe(0);
			expect(mockLogger.info).not.toHaveBeenCalled();
		});
	});
	describe('compliance score calculation', () => {
		it('should calculate compliance score correctly', async () => {
			const mockReport = {
				id: 'report-123',
				status: 'generating',
				generationStartedAt: new Date(),
			};
			mockComplianceReportRepository.create.mockReturnValue(mockReport);
			mockComplianceReportRepository.save.mockResolvedValue(mockReport);
			mockComplianceReportRepository.findOneOrFail.mockResolvedValue({
				...mockReport,
				status: 'completed',
				complianceScore: 85,
			});
			const mockAuditEvents = Array(100)
				.fill(null)
				.map((_, i) => ({
					id: `audit-${i}`,
					eventType: 'api_call',
					severity: i < 20 ? 'critical' : 'low',
				}));
			const mockSecurityEvents = Array(10)
				.fill(null)
				.map((_, i) => ({
					id: `security-${i}`,
					eventType: 'unauthorized_access_attempt',
					severity: 'high',
				}));
			mockAuditLoggingService.getAuditEvents.mockResolvedValue({
				events: mockAuditEvents,
				total: 100,
			});
			const mockSecurityQueryBuilder = {
				createQueryBuilder: jest.fn().mockReturnThis(),
				where: jest.fn().mockReturnThis(),
				andWhere: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue(mockSecurityEvents),
			};
			mockSecurityEventRepository.createQueryBuilder.mockReturnValue(mockSecurityQueryBuilder);
			await complianceReportingService.generateReport(mockReportOptions);
			expect(mockComplianceReportRepository.update).toHaveBeenCalledWith(
				'report-123',
				expect.objectContaining({
					complianceScore: expect.any(Number),
				}),
			);
		});
	});
});
//# sourceMappingURL=compliance-reporting.service.test.js.map
