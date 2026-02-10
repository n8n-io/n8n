import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';

import type { SecurityFinding, SecurityScanSummary } from './types';
import { checkHardcodedSecrets } from './checks/hardcodedSecrets';
import { checkPiiPatterns } from './checks/piiPatterns';
import { checkInsecureConfig } from './checks/insecureConfig';
import { checkDataExposure } from './checks/dataExposure';
import { checkExpressionRisks } from './checks/expressionRisks';
import { checkAiSecurity } from './checks/aiSecurityChecks';

const SEVERITY_ORDER: Record<string, number> = {
	critical: 0,
	warning: 1,
	info: 2,
};

/**
 * Runs all security checks against the given workflow nodes and connections.
 * Returns findings sorted by severity (critical first).
 */
export function runSecurityScan(nodes: INodeUi[], connections: IConnections): SecurityFinding[] {
	if (!nodes.length) return [];

	const findings: SecurityFinding[] = [
		...checkHardcodedSecrets(nodes),
		...checkPiiPatterns(nodes),
		...checkInsecureConfig(nodes),
		...checkDataExposure(nodes, connections),
		...checkExpressionRisks(nodes),
		...checkAiSecurity(nodes, connections),
	];

	findings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2));

	return findings;
}

/**
 * Computes a summary of findings by severity.
 */
export function computeSummary(findings: SecurityFinding[]): SecurityScanSummary {
	const summary: SecurityScanSummary = { critical: 0, warning: 0, info: 0, total: 0 };

	for (const finding of findings) {
		summary[finding.severity]++;
		summary.total++;
	}

	return summary;
}
