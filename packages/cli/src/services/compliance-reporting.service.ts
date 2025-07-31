import {
	ComplianceReport,
	AuditEvent,
	SecurityEvent,
	type ComplianceStandard,
	type ReportStatus,
	type ReportFormat,
} from '@n8n/db';
import { Repository } from '@n8n/typeorm';
import { Service, Container } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'path';

import { Logger } from '@/logger';
import { AuditLoggingService } from './audit-logging.service';

/**
 * Interface for compliance report generation options
 */
export interface IComplianceReportOptions {
	complianceStandard: ComplianceStandard;
	title: string;
	description?: string;
	periodStart: Date;
	periodEnd: Date;
	generatedBy: string;
	projectId?: string | null;
	format: ReportFormat;
	parameters?: IDataObject;
}

/**
 * Interface for compliance findings
 */
export interface IComplianceFindings {
	summary: string;
	compliantEvents: number;
	violationEvents: number;
	riskLevel: 'low' | 'medium' | 'high' | 'critical';
	recommendations: string[];
	details: IDataObject;
}

/**
 * Compliance reporting service for generating SOX, GDPR, HIPAA and other compliance reports
 */
@Service()
export class ComplianceReportingService {
	private complianceReportRepository: Repository<ComplianceReport>;
	private auditEventRepository: Repository<AuditEvent>;
	private securityEventRepository: Repository<SecurityEvent>;
	private readonly logger = Container.get(Logger);
	private readonly auditLoggingService = Container.get(AuditLoggingService);
	private readonly reportsBasePath: string;

	constructor() {
		// Get repositories through Container to ensure proper DI
		const dataSource = Container.get('DataSource');
		this.complianceReportRepository = dataSource.getRepository(ComplianceReport);
		this.auditEventRepository = dataSource.getRepository(AuditEvent);
		this.securityEventRepository = dataSource.getRepository(SecurityEvent);

		// Configure reports storage path
		this.reportsBasePath =
			process.env.N8N_COMPLIANCE_REPORTS_PATH || path.join(process.cwd(), 'compliance-reports');
	}

	/**
	 * Generate a comprehensive compliance report
	 */
	async generateReport(options: IComplianceReportOptions): Promise<ComplianceReport> {
		// Create initial report record
		const report = this.complianceReportRepository.create({
			title: options.title,
			complianceStandard: options.complianceStandard,
			status: 'generating',
			description: options.description || null,
			periodStart: options.periodStart,
			periodEnd: options.periodEnd,
			generatedBy: options.generatedBy,
			projectId: options.projectId,
			format: options.format,
			parameters: options.parameters || null,
			generationStartedAt: new Date(),
		});

		const savedReport = await this.complianceReportRepository.save(report);

		try {
			// Generate report content based on compliance standard
			const reportData = await this.generateReportData(options, savedReport.id);

			// Ensure reports directory exists
			await this.ensureReportsDirectory();

			// Generate file based on format
			const filePath = await this.generateReportFile(savedReport, reportData, options.format);

			// Update report with completion details
			const completedAt = new Date();
			const generationDuration = completedAt.getTime() - report.generationStartedAt!.getTime();

			await this.complianceReportRepository.update(savedReport.id, {
				status: 'completed',
				filePath,
				generationCompletedAt: completedAt,
				generationDurationMs: generationDuration,
				eventCount: reportData.totalAuditEvents,
				securityEventCount: reportData.totalSecurityEvents,
				violationCount: reportData.findings.violationEvents,
				summary: reportData.findings.summary,
				findings: reportData.findings as IDataObject,
				complianceScore: this.calculateComplianceScore(reportData.findings),
				mimeType: this.getMimeType(options.format),
			});

			// Log the report generation
			await this.auditLoggingService.logEvent({
				eventType: 'compliance_report_generated',
				category: 'system_administration',
				severity: 'medium',
				description: `Generated ${options.complianceStandard} compliance report: ${options.title}`,
				userId: options.generatedBy,
				projectId: options.projectId,
				resourceId: savedReport.id,
				resourceType: 'compliance_report',
				metadata: {
					complianceStandard: options.complianceStandard,
					format: options.format,
					periodStart: options.periodStart,
					periodEnd: options.periodEnd,
					eventCount: reportData.totalAuditEvents,
					violationCount: reportData.findings.violationEvents,
				},
				retentionCategory: 'extended',
			});

			return this.complianceReportRepository.findOneOrFail({
				where: { id: savedReport.id },
				relations: ['generatedByUser', 'project'],
			});
		} catch (error) {
			// Update report status to failed
			await this.complianceReportRepository.update(savedReport.id, {
				status: 'failed',
				errorMessage: error instanceof Error ? error.message : String(error),
				generationCompletedAt: new Date(),
			});

			this.logger.error('Failed to generate compliance report', {
				reportId: savedReport.id,
				error: error instanceof Error ? error.message : String(error),
				options,
			});

			throw new Error(
				`Compliance report generation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Generate report data based on compliance standard
	 */
	private async generateReportData(
		options: IComplianceReportOptions,
		reportId: string,
	): Promise<{
		totalAuditEvents: number;
		totalSecurityEvents: number;
		findings: IComplianceFindings;
		reportContent: IDataObject;
	}> {
		// Get audit events for the period
		const auditResult = await this.auditLoggingService.getAuditEvents({
			startDate: options.periodStart,
			endDate: options.periodEnd,
			projectId: options.projectId,
			limit: 10000, // High limit for comprehensive analysis
		});

		// Get security events
		const securityEvents = await this.securityEventRepository
			.createQueryBuilder('security_event')
			.where('security_event.createdAt >= :startDate', { startDate: options.periodStart })
			.andWhere('security_event.createdAt <= :endDate', { endDate: options.periodEnd })
			.getMany();

		// Generate compliance-specific analysis
		const findings = await this.generateComplianceFindings(
			options.complianceStandard,
			auditResult.events,
			securityEvents,
		);

		// Create comprehensive report content
		const reportContent = {
			reportId,
			complianceStandard: options.complianceStandard,
			generatedAt: new Date().toISOString(),
			periodStart: options.periodStart.toISOString(),
			periodEnd: options.periodEnd.toISOString(),
			executiveSummary: findings.summary,
			complianceScore: this.calculateComplianceScore(findings),
			eventSummary: {
				totalAuditEvents: auditResult.total,
				totalSecurityEvents: securityEvents.length,
				criticalEvents: auditResult.events.filter((e) => e.severity === 'critical').length,
				highSeverityEvents: auditResult.events.filter((e) => e.severity === 'high').length,
			},
			complianceAnalysis: findings,
			detailedEvents: this.categorizeEventsByCompliance(
				options.complianceStandard,
				auditResult.events,
				securityEvents,
			),
			recommendations: findings.recommendations,
		};

		return {
			totalAuditEvents: auditResult.total,
			totalSecurityEvents: securityEvents.length,
			findings,
			reportContent,
		};
	}

	/**
	 * Generate compliance-specific findings and analysis
	 */
	private async generateComplianceFindings(
		standard: ComplianceStandard,
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): Promise<IComplianceFindings> {
		switch (standard) {
			case 'SOX':
				return this.generateSOXFindings(auditEvents, securityEvents);
			case 'GDPR':
				return this.generateGDPRFindings(auditEvents, securityEvents);
			case 'HIPAA':
				return this.generateHIPAAFindings(auditEvents, securityEvents);
			case 'SOC2':
				return this.generateSOC2Findings(auditEvents, securityEvents);
			case 'PCI_DSS':
				return this.generatePCIDSSFindings(auditEvents, securityEvents);
			case 'ISO_27001':
				return this.generateISO27001Findings(auditEvents, securityEvents);
			case 'NIST':
				return this.generateNISTFindings(auditEvents, securityEvents);
			default:
				return this.generateGenericFindings(auditEvents, securityEvents);
		}
	}

	/**
	 * Generate SOX (Sarbanes-Oxley) compliance findings
	 */
	private generateSOXFindings(
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): IComplianceFindings {
		const financialDataEvents = auditEvents.filter(
			(e) =>
				e.tags?.includes('financial') ||
				e.resourceType?.includes('financial') ||
				e.description.toLowerCase().includes('financial'),
		);

		const accessControlViolations = securityEvents.filter(
			(e) =>
				e.eventType === 'unauthorized_access_attempt' || e.eventType === 'privilege_escalation',
		);

		const dataModificationEvents = auditEvents.filter((e) => e.category === 'data_modification');

		const violations =
			accessControlViolations.length +
			dataModificationEvents.filter((e) => !e.beforeState || !e.afterState).length;

		return {
			summary: `SOX compliance analysis: ${violations} potential violations identified across ${auditEvents.length} audit events`,
			compliantEvents: auditEvents.length - violations,
			violationEvents: violations,
			riskLevel: violations > 10 ? 'high' : violations > 5 ? 'medium' : 'low',
			recommendations: [
				'Implement stronger access controls for financial data',
				'Ensure all data modifications are properly logged with before/after states',
				'Regular review of user access privileges',
				'Implement segregation of duties for financial processes',
			],
			details: {
				financialDataAccess: financialDataEvents.length,
				accessControlViolations: accessControlViolations.length,
				dataModificationWithoutTrail: dataModificationEvents.filter(
					(e) => !e.beforeState || !e.afterState,
				).length,
				userAccessReviews: auditEvents.filter((e) => e.eventType === 'user_role_changed').length,
			},
		};
	}

	/**
	 * Generate GDPR compliance findings
	 */
	private generateGDPRFindings(
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): IComplianceFindings {
		const personalDataEvents = auditEvents.filter(
			(e) =>
				e.tags?.includes('personal_data') ||
				e.description.toLowerCase().includes('personal') ||
				e.description.toLowerCase().includes('pii'),
		);

		const dataExportEvents = auditEvents.filter((e) => e.eventType === 'data_exported');
		const breachEvents = securityEvents.filter((e) => e.eventType === 'data_breach_attempt');
		const consentEvents = auditEvents.filter((e) => e.tags?.includes('consent'));

		const violations =
			breachEvents.length + dataExportEvents.filter((e) => !e.metadata?.['gdpr_compliant']).length;

		return {
			summary: `GDPR compliance analysis: ${violations} potential violations identified across ${personalDataEvents.length} personal data events`,
			compliantEvents: personalDataEvents.length - violations,
			violationEvents: violations,
			riskLevel: breachEvents.length > 0 ? 'critical' : violations > 5 ? 'high' : 'medium',
			recommendations: [
				'Implement data minimization principles',
				'Ensure proper consent management',
				'Conduct regular data protection impact assessments',
				'Implement right to be forgotten procedures',
				'Enhance breach detection and notification procedures',
			],
			details: {
				personalDataAccess: personalDataEvents.length,
				dataExports: dataExportEvents.length,
				breachAttempts: breachEvents.length,
				consentEvents: consentEvents.length,
				rightToErasureRequests: auditEvents.filter((e) => e.tags?.includes('right_to_erasure'))
					.length,
			},
		};
	}

	/**
	 * Generate HIPAA compliance findings
	 */
	private generateHIPAAFindings(
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): IComplianceFindings {
		const phiEvents = auditEvents.filter(
			(e) =>
				e.tags?.includes('phi') ||
				e.tags?.includes('health_data') ||
				e.description.toLowerCase().includes('health'),
		);

		const unauthorizedAccess = securityEvents.filter(
			(e) => e.eventType === 'unauthorized_access_attempt' && e.tags?.includes('phi'),
		);

		const encryptionViolations = securityEvents.filter((e) =>
			e.tags?.includes('encryption_failure'),
		);

		const violations = unauthorizedAccess.length + encryptionViolations.length;

		return {
			summary: `HIPAA compliance analysis: ${violations} potential violations identified across ${phiEvents.length} PHI-related events`,
			compliantEvents: phiEvents.length - violations,
			violationEvents: violations,
			riskLevel: violations > 5 ? 'critical' : violations > 2 ? 'high' : 'medium',
			recommendations: [
				'Implement stronger PHI access controls',
				'Ensure all PHI is encrypted at rest and in transit',
				'Regular security awareness training',
				'Implement audit logs for all PHI access',
				'Conduct regular security risk assessments',
			],
			details: {
				phiAccess: phiEvents.length,
				unauthorizedAccess: unauthorizedAccess.length,
				encryptionViolations: encryptionViolations.length,
				auditLogCompleteness: phiEvents.filter((e) => e.metadata).length / phiEvents.length,
			},
		};
	}

	/**
	 * Generate generic compliance findings for SOC2, PCI DSS, ISO 27001, NIST
	 */
	private generateSOC2Findings(
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): IComplianceFindings {
		return this.generateGenericFindings(auditEvents, securityEvents, 'SOC2');
	}

	private generatePCIDSSFindings(
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): IComplianceFindings {
		return this.generateGenericFindings(auditEvents, securityEvents, 'PCI DSS');
	}

	private generateISO27001Findings(
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): IComplianceFindings {
		return this.generateGenericFindings(auditEvents, securityEvents, 'ISO 27001');
	}

	private generateNISTFindings(
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): IComplianceFindings {
		return this.generateGenericFindings(auditEvents, securityEvents, 'NIST');
	}

	private generateGenericFindings(
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
		standardName?: string,
	): IComplianceFindings {
		const highRiskEvents = [
			...auditEvents.filter((e) => e.severity === 'critical' || e.severity === 'high'),
			...securityEvents.filter((e) => e.severity === 'critical' || e.severity === 'high'),
		];

		const securityIncidents = securityEvents.filter(
			(e) => e.threatLevel === 'high' || e.threatLevel === 'severe',
		);
		const accessViolations = securityEvents.filter(
			(e) => e.eventType === 'unauthorized_access_attempt',
		);

		const violations = highRiskEvents.length + securityIncidents.length;

		return {
			summary: `${standardName || 'Generic'} compliance analysis: ${violations} potential violations identified across ${auditEvents.length + securityEvents.length} total events`,
			compliantEvents: auditEvents.length + securityEvents.length - violations,
			violationEvents: violations,
			riskLevel:
				violations > 20 ? 'critical' : violations > 10 ? 'high' : violations > 5 ? 'medium' : 'low',
			recommendations: [
				'Strengthen access controls and authentication',
				'Implement comprehensive monitoring and alerting',
				'Regular security assessments and penetration testing',
				'Employee security awareness training',
				'Incident response plan testing and updates',
			],
			details: {
				totalEvents: auditEvents.length + securityEvents.length,
				highRiskEvents: highRiskEvents.length,
				securityIncidents: securityIncidents.length,
				accessViolations: accessViolations.length,
				systemChanges: auditEvents.filter((e) => e.eventType === 'system_configuration_changed')
					.length,
			},
		};
	}

	/**
	 * Categorize events by compliance relevance
	 */
	private categorizeEventsByCompliance(
		standard: ComplianceStandard,
		auditEvents: AuditEvent[],
		securityEvents: SecurityEvent[],
	): IDataObject {
		const categories = {
			criticalEvents: [],
			securityEvents: [],
			dataAccessEvents: [],
			systemChanges: [],
			userManagement: [],
		} as Record<string, any[]>;

		// Categorize audit events
		for (const event of auditEvents) {
			if (event.severity === 'critical') {
				categories.criticalEvents.push(this.sanitizeEventForReport(event));
			}
			if (event.category === 'data_access' || event.category === 'data_modification') {
				categories.dataAccessEvents.push(this.sanitizeEventForReport(event));
			}
			if (event.eventType === 'system_configuration_changed') {
				categories.systemChanges.push(this.sanitizeEventForReport(event));
			}
			if (event.category === 'user_management' || event.category === 'authentication') {
				categories.userManagement.push(this.sanitizeEventForReport(event));
			}
		}

		// Categorize security events
		for (const event of securityEvents) {
			categories.securityEvents.push(this.sanitizeEventForReport(event));
		}

		return categories;
	}

	/**
	 * Remove sensitive data from events for reporting
	 */
	private sanitizeEventForReport(event: AuditEvent | SecurityEvent): IDataObject {
		return {
			id: event.id,
			eventType: 'eventType' in event ? event.eventType : undefined,
			severity: event.severity,
			description: event.description,
			createdAt: event.createdAt,
			userId: event.userId,
			projectId: 'projectId' in event ? event.projectId : undefined,
			ipAddress: 'ipAddress' in event ? event.ipAddress : undefined,
			// Exclude sensitive metadata and detailed states
		};
	}

	/**
	 * Generate report file in the specified format
	 */
	private async generateReportFile(
		report: ComplianceReport,
		reportData: { reportContent: IDataObject },
		format: ReportFormat,
	): Promise<string> {
		const fileName = `${report.complianceStandard}_${report.id}_${Date.now()}.${format.toLowerCase()}`;
		const filePath = path.join(this.reportsBasePath, fileName);

		switch (format) {
			case 'JSON':
				await writeFile(filePath, JSON.stringify(reportData.reportContent, null, 2));
				break;
			case 'CSV':
				await this.generateCSVReport(filePath, reportData.reportContent);
				break;
			case 'PDF':
				await this.generatePDFReport(filePath, reportData.reportContent);
				break;
			case 'EXCEL':
				await this.generateExcelReport(filePath, reportData.reportContent);
				break;
			default:
				throw new Error(`Unsupported report format: ${format}`);
		}

		return filePath;
	}

	/**
	 * Generate CSV report (simplified implementation)
	 */
	private async generateCSVReport(filePath: string, reportContent: IDataObject): Promise<void> {
		const lines = [
			'Compliance Report Summary',
			`Report ID,${reportContent.reportId}`,
			`Standard,${reportContent.complianceStandard}`,
			`Generated At,${reportContent.generatedAt}`,
			`Period,${reportContent.periodStart} to ${reportContent.periodEnd}`,
			`Compliance Score,${reportContent.complianceScore}`,
			'',
			'Event Summary',
			'Metric,Count',
			`Total Audit Events,${reportContent.eventSummary?.totalAuditEvents || 0}`,
			`Total Security Events,${reportContent.eventSummary?.totalSecurityEvents || 0}`,
			`Critical Events,${reportContent.eventSummary?.criticalEvents || 0}`,
			`High Severity Events,${reportContent.eventSummary?.highSeverityEvents || 0}`,
		];

		await writeFile(filePath, lines.join('\n'));
	}

	/**
	 * Generate PDF report (placeholder - would need PDF library)
	 */
	private async generatePDFReport(filePath: string, reportContent: IDataObject): Promise<void> {
		// For now, generate a text-based report
		// In production, would use a PDF library like puppeteer or pdfkit
		const content = `
COMPLIANCE REPORT
=================

Report ID: ${reportContent.reportId}
Standard: ${reportContent.complianceStandard}
Generated: ${reportContent.generatedAt}
Period: ${reportContent.periodStart} to ${reportContent.periodEnd}

EXECUTIVE SUMMARY
${reportContent.executiveSummary}

COMPLIANCE SCORE: ${reportContent.complianceScore}/100

EVENT SUMMARY
- Total Audit Events: ${reportContent.eventSummary?.totalAuditEvents || 0}
- Total Security Events: ${reportContent.eventSummary?.totalSecurityEvents || 0}
- Critical Events: ${reportContent.eventSummary?.criticalEvents || 0}
- High Severity Events: ${reportContent.eventSummary?.highSeverityEvents || 0}

RECOMMENDATIONS
${(reportContent.recommendations as string[])?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'None'}
		`;

		await writeFile(filePath, content.trim());
	}

	/**
	 * Generate Excel report (placeholder - would need Excel library)
	 */
	private async generateExcelReport(filePath: string, reportContent: IDataObject): Promise<void> {
		// For now, generate CSV format
		// In production, would use a library like exceljs
		await this.generateCSVReport(filePath.replace('.xlsx', '.csv'), reportContent);
	}

	/**
	 * Calculate compliance score based on findings
	 */
	private calculateComplianceScore(findings: IComplianceFindings): number {
		const totalEvents = findings.compliantEvents + findings.violationEvents;
		if (totalEvents === 0) return 100;

		const baseScore = (findings.compliantEvents / totalEvents) * 100;

		// Apply risk level penalty
		const riskPenalty = {
			low: 0,
			medium: 10,
			high: 20,
			critical: 30,
		}[findings.riskLevel];

		return Math.max(0, Math.round(baseScore - riskPenalty));
	}

	/**
	 * Get MIME type for report format
	 */
	private getMimeType(format: ReportFormat): string {
		const mimeTypes = {
			PDF: 'application/pdf',
			EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			CSV: 'text/csv',
			JSON: 'application/json',
		};
		return mimeTypes[format];
	}

	/**
	 * Ensure reports directory exists
	 */
	private async ensureReportsDirectory(): Promise<void> {
		if (!existsSync(this.reportsBasePath)) {
			await mkdir(this.reportsBasePath, { recursive: true });
		}
	}

	/**
	 * Get compliance reports with filtering
	 */
	async getReports(options: {
		complianceStandard?: ComplianceStandard;
		status?: ReportStatus;
		generatedBy?: string;
		projectId?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	}): Promise<{ reports: ComplianceReport[]; total: number }> {
		const queryBuilder = this.complianceReportRepository.createQueryBuilder('report');

		if (options.complianceStandard) {
			queryBuilder.andWhere('report.complianceStandard = :standard', {
				standard: options.complianceStandard,
			});
		}

		if (options.status) {
			queryBuilder.andWhere('report.status = :status', { status: options.status });
		}

		if (options.generatedBy) {
			queryBuilder.andWhere('report.generatedBy = :generatedBy', {
				generatedBy: options.generatedBy,
			});
		}

		if (options.projectId) {
			queryBuilder.andWhere('report.projectId = :projectId', {
				projectId: options.projectId,
			});
		}

		if (options.startDate) {
			queryBuilder.andWhere('report.createdAt >= :startDate', {
				startDate: options.startDate,
			});
		}

		if (options.endDate) {
			queryBuilder.andWhere('report.createdAt <= :endDate', {
				endDate: options.endDate,
			});
		}

		const total = await queryBuilder.getCount();

		queryBuilder
			.orderBy('report.createdAt', 'DESC')
			.limit(options.limit || 50)
			.offset(options.offset || 0)
			.leftJoinAndSelect('report.generatedByUser', 'user')
			.leftJoinAndSelect('report.project', 'project');

		const reports = await queryBuilder.getMany();

		return { reports, total };
	}

	/**
	 * Track report download
	 */
	async trackDownload(reportId: string, downloadedBy: string): Promise<void> {
		await this.complianceReportRepository.update(reportId, {
			downloadCount: () => 'downloadCount + 1',
			lastDownloadedAt: new Date(),
			lastDownloadedBy: downloadedBy,
		});

		// Log the download
		await this.auditLoggingService.logEvent({
			eventType: 'file_downloaded',
			category: 'data_access',
			severity: 'low',
			description: `Compliance report downloaded: ${reportId}`,
			userId: downloadedBy,
			resourceId: reportId,
			resourceType: 'compliance_report',
			retentionCategory: 'standard',
		});
	}

	/**
	 * Archive old reports
	 */
	async archiveOldReports(): Promise<number> {
		const result = await this.complianceReportRepository
			.createQueryBuilder()
			.update()
			.set({ status: 'archived' })
			.where('archiveAt < :now', { now: new Date() })
			.andWhere('status != :archived', { archived: 'archived' })
			.execute();

		const archivedCount = result.affected || 0;

		if (archivedCount > 0) {
			this.logger.info(`Archived ${archivedCount} compliance reports`);
		}

		return archivedCount;
	}
}
