import { Column, Entity, Index, ManyToOne, type Relation } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { WithTimestampsAndStringId } from './abstract-entity';
import { Project } from './project';
import { User } from './user';

export type SecurityEventType =
	| 'failed_login_attempt'
	| 'successful_login'
	| 'password_changed'
	| 'account_locked'
	| 'privilege_escalation'
	| 'unauthorized_access_attempt'
	| 'suspicious_activity'
	| 'data_breach_attempt'
	| 'malware_detected'
	| 'vulnerability_exploit_attempt'
	| 'rate_limit_exceeded'
	| 'unusual_login_location'
	| 'session_hijacking_attempt'
	| 'brute_force_attack'
	| 'sql_injection_attempt'
	| 'xss_attempt'
	| 'csrf_attempt'
	| 'file_upload_threat'
	| 'configuration_change'
	| 'system_compromise_indicator';

export type SecurityEventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type SecurityEventStatus =
	| 'open'
	| 'investigating'
	| 'acknowledged'
	| 'resolved'
	| 'false_positive';

export type ThreatLevel = 'minimal' | 'low' | 'moderate' | 'high' | 'severe';

@Entity('security_event')
@Index(['eventType', 'createdAt'])
@Index(['severity', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['threatLevel', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['resolved', 'createdAt'])
export class SecurityEvent extends WithTimestampsAndStringId {
	/**
	 * Type of security event
	 */
	@Column({ type: 'varchar', length: 50 })
	eventType: SecurityEventType;

	/**
	 * Severity level of the security event
	 */
	@Column({ type: 'varchar', length: 10 })
	severity: SecurityEventSeverity;

	/**
	 * Current status of the security event
	 */
	@Column({ type: 'varchar', length: 20, default: 'open' })
	status: SecurityEventStatus;

	/**
	 * Assessed threat level
	 */
	@Column({ type: 'varchar', length: 10, default: 'moderate' })
	threatLevel: ThreatLevel;

	/**
	 * Title or short description of the event
	 */
	@Column({ type: 'varchar', length: 255 })
	title: string;

	/**
	 * Detailed description of the security event
	 */
	@Column({ type: 'text' })
	description: string;

	/**
	 * User associated with the security event (if known)
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
	 * Source IP address of the security event
	 */
	@Column({ type: 'varchar', length: 45, nullable: true })
	ipAddress: string | null;

	/**
	 * Geolocation information for the IP address
	 */
	@Column({ type: 'json', nullable: true })
	geolocation: IDataObject | null;

	/**
	 * User agent string from the request
	 */
	@Column({ type: 'text', nullable: true })
	userAgent: string | null;

	/**
	 * Session ID associated with the event
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	sessionId: string | null;

	/**
	 * Request ID for tracking related events
	 */
	@Column({ type: 'varchar', length: 255, nullable: true })
	requestId: string | null;

	/**
	 * HTTP method if related to web request
	 */
	@Column({ type: 'varchar', length: 10, nullable: true })
	httpMethod: string | null;

	/**
	 * Endpoint or URL that was accessed
	 */
	@Column({ type: 'varchar', length: 500, nullable: true })
	endpoint: string | null;

	/**
	 * HTTP status code of the response
	 */
	@Column({ type: 'int', nullable: true })
	statusCode: number | null;

	/**
	 * Number of similar events from the same source
	 */
	@Column({ type: 'int', default: 1 })
	eventCount: number;

	/**
	 * Time window for event aggregation in minutes
	 */
	@Column({ type: 'int', nullable: true })
	aggregationWindowMinutes: number | null;

	/**
	 * Raw log data or evidence
	 */
	@Column({ type: 'text', nullable: true })
	rawData: string | null;

	/**
	 * Attack vectors or techniques used
	 */
	@Column({ type: 'json', nullable: true })
	attackVectors: string[] | null;

	/**
	 * MITRE ATT&CK technique IDs (if applicable)
	 */
	@Column({ type: 'json', nullable: true })
	mitreAttackIds: string[] | null;

	/**
	 * Additional structured metadata
	 */
	@Column({ type: 'json', nullable: true })
	metadata: IDataObject | null;

	/**
	 * Risk score (0-100) based on threat assessment
	 */
	@Column({ type: 'int', nullable: true })
	riskScore: number | null;

	/**
	 * Automated response actions taken
	 */
	@Column({ type: 'json', nullable: true })
	automaticActions: string[] | null;

	/**
	 * Whether this event has been resolved
	 */
	@Column({ type: 'boolean', default: false })
	resolved: boolean;

	/**
	 * User who acknowledged/resolved the event
	 */
	@Column({ type: 'varchar', length: 36, nullable: true })
	acknowledgedBy: string | null;

	@ManyToOne('User', { nullable: true })
	acknowledgedByUser: Relation<User> | null;

	/**
	 * When the event was acknowledged
	 */
	@Column({ type: 'timestamp', nullable: true })
	acknowledgedAt: Date | null;

	/**
	 * When the event was resolved
	 */
	@Column({ type: 'timestamp', nullable: true })
	resolvedAt: Date | null;

	/**
	 * Resolution notes or actions taken
	 */
	@Column({ type: 'text', nullable: true })
	resolutionNotes: string | null;

	/**
	 * Time to acknowledge in minutes
	 */
	@Column({ type: 'int', nullable: true })
	timeToAcknowledgeMinutes: number | null;

	/**
	 * Time to resolve in minutes
	 */
	@Column({ type: 'int', nullable: true })
	timeToResolveMinutes: number | null;

	/**
	 * Related audit event IDs
	 */
	@Column({ type: 'json', nullable: true })
	relatedAuditEventIds: string[] | null;

	/**
	 * Related security event IDs (for event chains)
	 */
	@Column({ type: 'json', nullable: true })
	relatedSecurityEventIds: string[] | null;

	/**
	 * Alert channels that were notified
	 */
	@Column({ type: 'json', nullable: true })
	alertChannels: string[] | null;

	/**
	 * When alerts were sent
	 */
	@Column({ type: 'timestamp', nullable: true })
	alertSentAt: Date | null;

	/**
	 * Tags for categorization and correlation
	 */
	@Column({ type: 'json', nullable: true })
	tags: string[] | null;

	/**
	 * Whether this event should be escalated
	 */
	@Column({ type: 'boolean', default: false })
	requiresEscalation: boolean;

	/**
	 * Evidence files or attachments
	 */
	@Column({ type: 'json', nullable: true })
	evidenceFiles: string[] | null;
}
