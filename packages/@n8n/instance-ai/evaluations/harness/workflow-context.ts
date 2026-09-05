import type { WorkflowResponse } from '../clients/n8n-client';

/**
 * Renders node groups for the judge. Groups persist member node *ids*, but the
 * judge context is name-keyed and never exposes ids — so members are mapped to
 * node names and stale ids are dropped, mirroring the MCP read path
 * (`toNodeGroupSummary` in packages/cli/src/modules/mcp/tools/schemas.ts).
 */
function renderNodeGroupLines(wf: WorkflowResponse): string[] {
	const groups = wf.nodeGroups ?? [];
	if (groups.length === 0) {
		// Stated absence, not omission — a negative assertion ("the nodes are not
		// grouped") needs the judge to see that no groups exist.
		return ['**Node groups:**', '', '(none)'];
	}
	const nameById = new Map(
		wf.nodes.flatMap((node) => (node.id === undefined ? [] : [[node.id, node.name] as const])),
	);
	return [
		'**Node groups:**',
		'```json',
		JSON.stringify(
			groups.map((group) => ({
				name: group.name,
				nodes: group.nodeIds.flatMap((nodeId) => nameById.get(nodeId) ?? []),
				...(group.description !== undefined ? { description: group.description } : {}),
			})),
			null,
			2,
		),
		'```',
	];
}

/** Render the per-build workflow structure: nodes, connections, all configs, node groups. */
export function buildWorkflowContextBlock(wf: WorkflowResponse | undefined): string {
	if (!wf) return '## Workflow structure\n\n(no workflow built)';
	const lines: string[] = ['## Workflow structure', ''];
	for (const node of wf.nodes) {
		lines.push(`- **${node.name ?? '(unnamed)'}** (${node.type})`);
	}
	lines.push('');
	lines.push('**All node configs:**');
	lines.push(
		'```json',
		JSON.stringify(
			wf.nodes.map((node) => ({
				name: node.name ?? '(unnamed)',
				type: node.type,
				typeVersion: node.typeVersion,
				...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
				...(node.onError !== undefined ? { onError: node.onError } : {}),
				// Node-level behavior flags — preservation-style expectations assert on
				// these, so omitting them makes the judge read a correct build as a fail.
				...(node.alwaysOutputData !== undefined ? { alwaysOutputData: node.alwaysOutputData } : {}),
				...(node.retryOnFail !== undefined ? { retryOnFail: node.retryOnFail } : {}),
				...(node.maxTries !== undefined ? { maxTries: node.maxTries } : {}),
				...(node.waitBetweenTries !== undefined ? { waitBetweenTries: node.waitBetweenTries } : {}),
				...(node.executeOnce !== undefined ? { executeOnce: node.executeOnce } : {}),
				...(node.credentials !== undefined ? { credentials: node.credentials } : {}),
				parameters: node.parameters ?? {},
			})),
			null,
			2,
		),
		'```',
		'',
	);
	lines.push('**Connections:**');
	lines.push('```json', JSON.stringify(wf.connections, null, 2), '```', '');
	lines.push(...renderNodeGroupLines(wf));
	return lines.join('\n');
}
