import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';

import type { ScanContext, SecurityFinding, SecurityScanSummary } from './types';
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

	const ctx: ScanContext = {
		nodes,
		connections,
		nodesByName: new Map(nodes.map((n) => [n.name, n])),
	};

	const findings: SecurityFinding[] = [
		...checkHardcodedSecrets(nodes),
		...checkPiiPatterns(nodes),
		...checkInsecureConfig(nodes),
		...checkDataExposure(ctx),
		...checkExpressionRisks(nodes),
		...checkAiSecurity(ctx),
	];

	// Deduplicate findings that flag the same issue on the same node/parameter.
	// AI-specific checks (id prefix "ai-") provide better context, so when both
	// a generic and an AI-specific finding exist for the same spot, keep the AI one.
	const seen = new Map<string, SecurityFinding>();
	for (const finding of findings) {
		const dedupeKey = finding.parameterPath
			? `${finding.category}:${finding.nodeId}:${finding.parameterPath}`
			: finding.id;
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

export function computeSummary(findings: SecurityFinding[]): SecurityScanSummary {
	const summary: SecurityScanSummary = { critical: 0, warning: 0, info: 0, total: 0 };

	for (const finding of findings) {
		summary[finding.severity]++;
		summary.total++;
	}

	return summary;
}
