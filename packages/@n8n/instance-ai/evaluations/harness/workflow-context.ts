import type { WorkflowNodeResponse, WorkflowResponse } from '../clients/n8n-client';

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

function renderSettingsLines(wf: WorkflowResponse): string[] {
	const settings = wf.settings ?? {};
	const header =
		'**Workflow settings** (an absent or "DEFAULT" value means the instance default; an absent `executionOrder` means the legacy `v0` order):';
	if (Object.keys(settings).length === 0) {
		// Stated absence, not omission — the judge must be able to tell "no time
		// zone set" from "the time zone is not shown to me".
		return [header, '', '(none set)', ''];
	}
	return [header, '```json', JSON.stringify(settings, null, 2), '```', ''];
}

/**
 * A node as the judge reads it: every saved field except the two it cannot use.
 * The context is name-keyed, so the id is hidden, and canvas coordinates say
 * nothing about behavior. Hiding by exception keeps a node field that n8n adds
 * later visible — a field that is silently missing makes the judge fail a
 * correct build.
 */
function renderNode(node: WorkflowNodeResponse): Record<string, unknown> {
	const { id: _id, position: _position, name, parameters, ...shown } = node;
	return { name: name ?? '(unnamed)', ...shown, parameters: parameters ?? {} };
}

/** Render the per-build workflow structure: nodes, all configs, connections, settings, node groups. */
export function buildWorkflowContextBlock(wf: WorkflowResponse | undefined): string {
	if (!wf) return '## Workflow structure\n\n(no workflow built)';
	const lines: string[] = ['## Workflow structure', ''];
	for (const node of wf.nodes) {
		lines.push(`- **${node.name ?? '(unnamed)'}** (${node.type})`);
	}
	lines.push('');
	lines.push('**All node configs:**');
	lines.push('```json', JSON.stringify(wf.nodes.map(renderNode), null, 2), '```', '');
	lines.push('**Connections:**');
	lines.push('```json', JSON.stringify(wf.connections, null, 2), '```', '');
	lines.push(...renderSettingsLines(wf));
	lines.push(...renderNodeGroupLines(wf));
	return lines.join('\n');
}
