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

	// Deduplicate findings that flag the same secret on the same node/parameter.
	// AI-specific checks (id prefix "ai-") provide better context, so when both
	// a generic and an AI-specific finding exist for the same spot, keep the AI one.
	const seen = new Map<string, SecurityFinding>();
	for (const finding of findings) {
		if (finding.category !== 'hardcoded-secret' || !finding.parameterPath) {
			seen.set(finding.id, finding);
			continue;
		}
		const dedupeKey = `${finding.category}:${finding.nodeId}:${finding.parameterPath}`;
		const existing = seen.get(dedupeKey);
		if (!existing) {
			seen.set(dedupeKey, finding);
		} else if (finding.id.startsWith('ai-')) {
			seen.set(dedupeKey, finding);
		}
	}
	const deduped = [...seen.values()];

	deduped.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2));

	return deduped;
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
