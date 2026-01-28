/**
 * Shared types for Security Audit feature
 * Used by both backend (cli) and frontend (editor-ui)
 */

/**
 * Risk categories for security audit
 */
export const RISK_CATEGORIES = [
	'credentials',
	'database',
	'nodes',
	'instance',
	'filesystem',
	'advisories',
] as const;

export type RiskCategory = (typeof RISK_CATEGORIES)[number];

/**
 * Location types for audit findings
 */
export interface CredentialLocation {
	kind: 'credential';
	id: string;
	name: string;
}

export interface NodeLocation {
	kind: 'node';
	workflowId: string;
	workflowName: string;
	nodeId: string;
	nodeName: string;
	nodeType: string;
}

export interface CommunityNodeDetails {
	kind: 'community';
	nodeType: string;
	packageUrl: string;
}

export interface CustomNodeDetails {
	kind: 'custom';
	nodeType: string;
	filePath: string;
}

/**
 * Section types for audit reports
 */
interface SectionBase {
	title: string;
	description: string;
	recommendation: string;
}

export interface StandardSection extends SectionBase {
	location: NodeLocation[] | CredentialLocation[] | CommunityNodeDetails[] | CustomNodeDetails[];
}

export interface N8nVersionInfo {
	name: string;
	createdAt: string;
	description: string;
	documentationUrl: string;
	hasBreakingChange: boolean;
	hasSecurityFix: boolean;
	hasSecurityIssue: boolean;
	securityIssueFixVersion: string;
}

export interface InstanceSection extends SectionBase {
	location?: NodeLocation[];
	settings?: Record<string, unknown>;
	nextVersions?: N8nVersionInfo[];
}

/**
 * Advisory types for security advisories
 */
export type AdvisorySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AdvisoryDetails {
	kind: 'advisory';
	ghsaId: string;
	cveId: string | null;
	severity: AdvisorySeverity;
	summary: string;
	vulnerableVersionRange: string;
	patchedVersions: string | null;
	publishedAt: string;
	htmlUrl: string;
}

export interface AdvisorySection extends SectionBase {
	advisories: AdvisoryDetails[];
	affectsCurrentVersion: boolean;
}

/**
 * Report types for audit results
 */
export interface StandardReport {
	risk: Exclude<RiskCategory, 'instance'>;
	sections: StandardSection[];
}

export interface InstanceReport {
	risk: 'instance';
	sections: InstanceSection[];
}

export interface AdvisoryReport {
	risk: 'advisories';
	sections: AdvisorySection[];
}

export type AuditReport = StandardReport | InstanceReport | AdvisoryReport;

/**
 * API response type for security audit
 */
export type SecurityAuditResponse = Record<string, AuditReport> | [];

/**
 * Options for running a security audit
 */
export interface RunAuditOptions {
	categories?: RiskCategory[];
	daysAbandonedWorkflow?: number;
}
