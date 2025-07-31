import { Column, Entity, Index, ManyToOne, type Relation } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Project } from './project';
import { User } from './user';

export type AuditEventType =
	| 'api_call'
	| 'workflow_created'
	| 'workflow_updated'
	| 'workflow_deleted'
	| 'workflow_executed'
	| 'workflow_activated'
	| 'workflow_deactivated'
	| 'credential_created'
	| 'credential_updated'
	| 'credential_deleted'
	| 'credential_accessed'
	| 'user_login'
	| 'user_logout'
	| 'user_created'
	| 'user_updated'
	| 'user_deleted'
	| 'user_role_changed'
	| 'project_created'
	| 'project_updated'
	| 'project_deleted'
	| 'project_member_added'
	| 'project_member_removed'
	| 'file_uploaded'
	| 'file_downloaded'
	| 'file_deleted'
	| 'security_event'
	| 'system_configuration_changed'
	| 'data_exported'
	| 'compliance_report_generated';

export type AuditEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AuditEventCategory =
	| 'authentication'
	| 'authorization'
	| 'data_access'
	| 'data_modification'
	| 'system_administration'
	| 'workflow_management'
	| 'user_management'
	| 'security';

@Entity('audit_event')
@Index(['eventType', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['projectId', 'createdAt'])
@Index(['category', 'createdAt'])
@Index(['severity', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
export class AuditEvent extends WithTimestampsAndStringId {
	/**
	 * Type of the audit event
	 */
	@Column({ type: 'varchar', length: 50 })
	eventType: AuditEventType;

	/**
	 * Category of the audit event for grouping and filtering
	 */
	@Column({ type: 'varchar', length: 30 })
	category: AuditEventCategory;

	/**
	 * Severity level of the event
	 */
	@Column({ type: 'varchar', length: 10, default: 'medium' })
	severity: AuditEventSeverity;

	/**
	 * Human-readable description of the event
	 */
	@Column({ type: 'text' })
	description: string;

	/**
	 * User who performed the action (if applicable)
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	userId: string | null;

	@ManyToOne('User', { nullable: true })
	user: Relation<User> | null;

	/**
	 * Project context for the event (if applicable)
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	projectId: string | null;

	@ManyToOne('Project', { nullable: true })
	project: Relation<Project> | null;

	/**
	 * Resource ID that was affected (workflow ID, credential ID, etc.)
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	resourceId: string | null;

	/**
	 * Type of resource affected (workflow, credential, user, etc.)
	 */
	@Column({ type: 'varchar', length: 50, nullable: true })
	resourceType: string | null;

	/**
	 * IP address of the client that initiated the action
	 */
	@Column({ type: 'varchar', length: 45, nullable: true })
	ipAddress: string | null;

	/**
	 * User agent string from the client request
	 */
	@Column({ type: 'text', nullable: true })
	userAgent: string | null;

	/**
	 * HTTP method for API calls (GET, POST, PUT, DELETE, etc.)
	 */
	@Column({ type: 'varchar', length: 10, nullable: true })
	httpMethod: string | null;

	/**
	 * API endpoint or route that was accessed
	 */
	@Column({ type: 'varchar', length: 500, nullable: true })
	endpoint: string | null;

	/**
	 * HTTP status code for API responses
	 */
	@Column({ type: 'int', nullable: true })
	statusCode: number | null;

	/**
	 * Response time in milliseconds for performance tracking
	 */
	@Column({ type: 'int', nullable: true })
	responseTimeMs: number | null;

	/**
	 * Session ID or authentication token ID
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	sessionId: string | null;

	/**
	 * Additional structured metadata about the event
	 */
	@Column({ type: 'json', nullable: true })
	metadata: IDataObject | null;

	/**
	 * Before state for data modification events (JSON snapshot)
	 */
	@Column({ type: 'json', nullable: true })
	beforeState: IDataObject | null;

	/**
	 * After state for data modification events (JSON snapshot)
	 */
	@Column({ type: 'json', nullable: true })
	afterState: IDataObject | null;

	/**
	 * Error message if the action failed
	 */
	@Column({ type: 'text', nullable: true })
	errorMessage: string | null;

	/**
	 * Indicates if this event requires review or investigation
	 */
	@Column({ type: 'boolean', default: false })
	requiresReview: boolean;

	/**
	 * User who reviewed this audit event (if applicable)
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	reviewedBy: string | null;

	/**
	 * When this audit event was reviewed
	 */
	@Column({ type: 'timestamp', nullable: true })
	reviewedAt: Date | null;

	/**
	 * Review notes or comments
	 */
	@Column({ type: 'text', nullable: true })
	reviewNotes: string | null;

	/**
	 * Retention category for data lifecycle management
	 */
	@Column({ type: 'varchar', length: 20, default: 'standard' })
	retentionCategory: 'minimal' | 'standard' | 'extended' | 'permanent';

	/**
	 * When this audit event should be archived
	 */
	@Column({ type: 'timestamp', nullable: true })
	archiveAt: Date | null;

	/**
	 * Tags for categorization and search
	 */
	@Column({ type: 'json', nullable: true })
	tags: string[] | null;
}
