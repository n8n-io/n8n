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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ComplianceReportingService = void 0;
const db_1 = require('@n8n/db');
const typeorm_1 = require('@n8n/typeorm');
const di_1 = require('@n8n/di');
const promises_1 = require('node:fs/promises');
const node_fs_1 = require('node:fs');
const path_1 = __importDefault(require('path'));
const n8n_workflow_1 = require('n8n-workflow');
const audit_logging_service_1 = require('./audit-logging.service');
let ComplianceReportingService = class ComplianceReportingService {
	constructor() {
		this.logger = n8n_workflow_1.LoggerProxy;
		this.auditLoggingService = di_1.Container.get(audit_logging_service_1.AuditLoggingService);
		const dataSource = di_1.Container.get(typeorm_1.DataSource);
		this.complianceReportRepository = dataSource.getRepository(db_1.ComplianceReport);
		this.securityEventRepository = dataSource.getRepository(db_1.SecurityEvent);
		this.reportsBasePath =
			process.env.N8N_COMPLIANCE_REPORTS_PATH ||
			path_1.default.join(process.cwd(), 'compliance-reports');
	}
	async generateReport(options) {
		const report = this.complianceReportRepository.create({
			title: options.title,
			complianceStandard: options.complianceStandard,
			status: 'generating',
			description: options.description || null,
			periodStart: options.periodStart,
			periodEnd: options.periodEnd,
			generatedBy: options.generatedBy,
			projectId: options.projectId || null,
			format: options.format.toUpperCase(),
			parameters: options.parameters || null,
			generationStartedAt: new Date(),
		});
		const savedReports = await this.complianceReportRepository.save(report);
		const savedReport = Array.isArray(savedReports) ? savedReports[0] : savedReports;
		try {
			const reportData = await this.generateReportData(options, savedReport.id);
			await this.ensureReportsDirectory();
			const filePath = await this.generateReportFile(savedReport, reportData, options.format);
			const completedAt = new Date();
			const generationDuration = completedAt.getTime() - report.generationStartedAt.getTime();
			await this.complianceReportRepository.update(savedReport.id, {
				status: 'completed',
				filePath,
				generationCompletedAt: completedAt,
				generationDurationMs: generationDuration,
				eventCount: reportData.totalAuditEvents,
				securityEventCount: reportData.totalSecurityEvents,
				violationCount: reportData.findings.violationEvents,
				summary: reportData.findings.summary,
				findings: reportData.findings,
				complianceScore: this.calculateComplianceScore(reportData.findings),
				mimeType: this.getMimeType(options.format),
			});
			await this.auditLoggingService.logEvent({
				eventType: 'compliance_report_generated',
				category: 'system',
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
	async generateReportData(options, reportId) {
		const auditResult = await this.auditLoggingService.getAuditEvents({
			startDate: options.periodStart,
			endDate: options.periodEnd,
			projectId: options.projectId || undefined,
			limit: 10000,
		});
		const securityEvents = await this.securityEventRepository
			.createQueryBuilder('security_event')
			.where('security_event.createdAt >= :startDate', { startDate: options.periodStart })
			.andWhere('security_event.createdAt <= :endDate', { endDate: options.periodEnd })
			.getMany();
		const findings = await this.generateComplianceFindings(
			options.complianceStandard,
			auditResult.events,
			securityEvents,
		);
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
	async generateComplianceFindings(standard, auditEvents, securityEvents) {
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
	generateSOXFindings(auditEvents, securityEvents) {
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
	generateGDPRFindings(auditEvents, securityEvents) {
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
	generateHIPAAFindings(auditEvents, securityEvents) {
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
	generateSOC2Findings(auditEvents, securityEvents) {
		return this.generateGenericFindings(auditEvents, securityEvents, 'SOC2');
	}
	generatePCIDSSFindings(auditEvents, securityEvents) {
		return this.generateGenericFindings(auditEvents, securityEvents, 'PCI DSS');
	}
	generateISO27001Findings(auditEvents, securityEvents) {
		return this.generateGenericFindings(auditEvents, securityEvents, 'ISO 27001');
	}
	generateNISTFindings(auditEvents, securityEvents) {
		return this.generateGenericFindings(auditEvents, securityEvents, 'NIST');
	}
	generateGenericFindings(auditEvents, securityEvents, standardName) {
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
	categorizeEventsByCompliance(_standard, auditEvents, securityEvents) {
		const categories = {
			criticalEvents: [],
			securityEvents: [],
			dataAccessEvents: [],
			systemChanges: [],
			userManagement: [],
		};
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
		for (const event of securityEvents) {
			categories.securityEvents.push(this.sanitizeEventForReport(event));
		}
		return categories;
	}
	sanitizeEventForReport(event) {
		return {
			id: event.id,
			eventType: 'eventType' in event ? event.eventType : undefined,
			severity: event.severity,
			description: event.description,
			createdAt: event.createdAt,
			userId: event.userId,
			projectId: 'projectId' in event ? event.projectId : undefined,
			ipAddress: 'ipAddress' in event ? event.ipAddress : undefined,
		};
	}
	async generateReportFile(report, reportData, format) {
		const fileName = `${report.complianceStandard}_${report.id}_${Date.now()}.${format.toLowerCase()}`;
		const filePath = path_1.default.join(this.reportsBasePath, fileName);
		switch (format) {
			case 'json':
				await (0, promises_1.writeFile)(
					filePath,
					JSON.stringify(reportData.reportContent, null, 2),
				);
				break;
			case 'csv':
				await this.generateCSVReport(filePath, reportData.reportContent);
				break;
			case 'pdf':
				await this.generatePDFReport(filePath, reportData.reportContent);
				break;
			case 'html':
				await this.generateHTMLReport(filePath, reportData.reportContent);
				break;
			default:
				throw new Error(`Unsupported report format: ${format}`);
		}
		return filePath;
	}
	async generateCSVReport(filePath, reportContent) {
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
		await (0, promises_1.writeFile)(filePath, lines.join('\n'));
	}
	async generatePDFReport(filePath, reportContent) {
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
${reportContent.recommendations?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'None'}
		`;
		await (0, promises_1.writeFile)(filePath, content.trim());
	}
	async generateHTMLReport(filePath, reportContent) {
		const htmlContent = `
<!DOCTYPE html>
<html>
<head>
	<title>Compliance Report</title>
	<style>
		body { font-family: Arial, sans-serif; margin: 20px; }
		.header { border-bottom: 2px solid #333; padding-bottom: 10px; }
		.metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
	</style>
</head>
<body>
	<div class="header">
		<h1>Compliance Report</h1>
		<p>Report ID: ${reportContent.reportId}</p>
		<p>Standard: ${reportContent.complianceStandard}</p>
		<p>Generated: ${reportContent.generatedAt}</p>
	</div>
	<div class="content">
		<h2>Executive Summary</h2>
		<p>${reportContent.executiveSummary}</p>
		<div class="metric">
			<strong>Compliance Score: ${reportContent.complianceScore}/100</strong>
		</div>
	</div>
</body>
</html>`;
		await (0, promises_1.writeFile)(filePath, htmlContent);
	}
	calculateComplianceScore(findings) {
		const totalEvents = findings.compliantEvents + findings.violationEvents;
		if (totalEvents === 0) return 100;
		const baseScore = (findings.compliantEvents / totalEvents) * 100;
		const riskPenalty = {
			low: 0,
			medium: 10,
			high: 20,
			critical: 30,
		}[findings.riskLevel];
		return Math.max(0, Math.round(baseScore - riskPenalty));
	}
	getMimeType(format) {
		const mimeTypes = {
			pdf: 'application/pdf',
			excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			csv: 'text/csv',
			json: 'application/json',
			html: 'text/html',
		};
		return mimeTypes[format] || 'application/octet-stream';
	}
	async ensureReportsDirectory() {
		if (!(0, node_fs_1.existsSync)(this.reportsBasePath)) {
			await (0, promises_1.mkdir)(this.reportsBasePath, { recursive: true });
		}
	}
	async getReports(options) {
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
	async trackDownload(reportId, downloadedBy) {
		await this.complianceReportRepository.update(reportId, {
			downloadCount: () => 'downloadCount + 1',
			lastDownloadedAt: new Date(),
			lastDownloadedBy: downloadedBy,
		});
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
	async archiveOldReports() {
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
};
exports.ComplianceReportingService = ComplianceReportingService;
exports.ComplianceReportingService = ComplianceReportingService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [])],
	ComplianceReportingService,
);
//# sourceMappingURL=compliance-reporting.service.js.map
