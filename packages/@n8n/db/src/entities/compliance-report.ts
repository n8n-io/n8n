import { Column, Entity, Index, ManyToOne, type Relation } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Project } from './project';
import { User } from './user';

export type ComplianceStandard =
	| 'SOX'
	| 'GDPR'
	| 'HIPAA'
	| 'SOC2'
	| 'PCI_DSS'
	| 'ISO_27001'
	| 'NIST'
	| 'CUSTOM';

export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'archived';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

@Entity('compliance_report')
@Index(['complianceStandard', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['generatedBy', 'createdAt'])
@Index(['projectId', 'createdAt'])
@Index(['periodStart', 'periodEnd'])
export class ComplianceReport extends WithTimestampsAndStringId {
	/**
	 * Title of the compliance report
	 */
	@Column({ type: 'varchar', length: 255 })
	title: string;

	/**
	 * Compliance standard this report addresses
	 */
	@Column({ type: 'varchar', length: 20 })
	complianceStandard: ComplianceStandard;

	/**
	 * Current status of the report generation
	 */
	@Column({ type: 'varchar', length: 20, default: 'pending' })
	status: ReportStatus;

	/**
	 * Description of the report scope and purpose
	 */
	@Column({ type: 'text', nullable: true })
	description: string | null;

	/**
	 * Start date of the reporting period
	 */
	@Column({ type: 'datetime' })
	periodStart: Date;

	/**
	 * End date of the reporting period
	 */
	@Column({ type: 'datetime' })
	periodEnd: Date;

	/**
	 * User who requested the report generation
	 */
	@Column({ type: 'varchar', length: 36 })
	generatedBy: string;

	@ManyToOne('User')
	generatedByUser: Relation<User>;

	/**
	 * Project scope for the report (null = all projects)
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@ManyToOne('Project', { nullable: true })
	project: Relation<Project> | null;

	/**
	 * Format of the generated report
	 */
	@Column({ type: 'varchar', length: 10, default: 'pdf' })
	format: ReportFormat;

	/**
	 * File path where the generated report is stored
	 */
	@Column({ type: 'varchar', length: 500, nullable: true })
	filePath: string | null;

	/**
	 * Size of the generated report file in bytes
	 */
	@Column({ type: 'bigint', nullable: true })
	fileSizeBytes: number | null;

	/**
	 * MIME type of the generated report file
	 */
	@Column({ type: 'varchar', length: 100, nullable: true })
	mimeType: string | null;

	/**
	 * When the report generation started
	 */
	@Column({ type: 'datetime', nullable: true })
	generationStartedAt: Date | null;

	/**
	 * When the report generation completed
	 */
	@Column({ type: 'datetime', nullable: true })
	generationCompletedAt: Date | null;

	/**
	 * Duration of report generation in milliseconds
	 */
	@Column({ type: 'int', nullable: true })
	generationDurationMs: number | null;

	/**
	 * Error message if report generation failed
	 */
	@Column({ type: 'text', nullable: true })
	errorMessage: string | null;

	/**
	 * Number of audit events included in this report
	 */
	@Column({ type: 'int', default: 0 })
	eventCount: number;

	/**
	 * Number of security events included in this report
	 */
	@Column({ type: 'int', default: 0 })
	securityEventCount: number;

	/**
	 * Number of compliance violations found
	 */
	@Column({ type: 'int', default: 0 })
	violationCount: number;

	/**
	 * Report generation parameters and filters
	 */
	@Column({ type: 'json', nullable: true })
	parameters: IDataObject | null;

	/**
	 * Executive summary of the report findings
	 */
	@Column({ type: 'text', nullable: true })
	summary: string | null;

	/**
	 * Key findings and recommendations
	 */
	@Column({ type: 'json', nullable: true })
	findings: IDataObject | null;

	/**
	 * Compliance score or rating (0-100)
	 */
	@Column({ type: 'int', nullable: true })
	complianceScore: number | null;

	/**
	 * Previous report ID for comparison tracking
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	previousReportId: string | null;

	/**
	 * Number of times this report has been downloaded
	 */
	@Column({ type: 'int', default: 0 })
	downloadCount: number;

	/**
	 * Last time this report was downloaded
	 */
	@Column({ type: 'datetime', nullable: true })
	lastDownloadedAt: Date | null;

	/**
	 * User who last downloaded this report
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	lastDownloadedBy: string | null;

	/**
	 * When this report should be archived
	 */
	@Column({ type: 'datetime', nullable: true })
	archiveAt: Date | null;

	/**
	 * Retention period in days
	 */
	@Column({ type: 'int', default: 2555 }) // 7 years default for compliance
	retentionDays: number;

	/**
	 * Tags for categorization and search
	 */
	@Column({ type: 'json', nullable: true })
	tags: string[] | null;

	/**
	 * Additional metadata for the report
	 */
	@Column({ type: 'json', nullable: true })
	metadata: IDataObject | null;
}
