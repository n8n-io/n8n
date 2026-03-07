import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';

export type SecuritySeverity = 'critical' | 'warning' | 'info';

export type SecurityCategory =
	| 'hardcoded-secret'
	| 'pii-data-flow'
	| 'insecure-config'
	| 'data-exposure'
	| 'expression-risk';

export interface SecurityFinding {
	id: string;
	category: SecurityCategory;
	severity: SecuritySeverity;
	title: string;
	description: string;
	remediation: string;
	nodeName: string;
	nodeId: string;
	nodeType: string;
	parameterPath?: string;
	matchedValue?: string;
}

export interface SecurityScanSummary {
	critical: number;
	warning: number;
	info: number;
	total: number;
}

export interface ScanContext {
	nodes: INodeUi[];
	connections: IConnections;
	nodesByName: Map<string, INodeUi>;
}

export function findingId(category: string, nodeId: string, path?: string): string {
	return `${category}-${nodeId}-${path ?? 'node'}`;
}
