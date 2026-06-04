import type { WorkflowResponse } from '../clients/n8n-client';

/** Render the per-build workflow structure: nodes, connections, all configs. */
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
				parameters: node.parameters ?? {},
			})),
			null,
			2,
		),
		'```',
		'',
	);
	lines.push('**Connections:**');
	lines.push('```json', JSON.stringify(wf.connections, null, 2), '```');
	return lines.join('\n');
}
