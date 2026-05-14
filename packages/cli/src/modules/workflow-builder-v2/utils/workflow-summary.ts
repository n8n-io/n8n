import type { INode } from 'n8n-workflow';

import type { WorkflowJson } from '../session/session.types';

/**
 * Produce a short, LLM-friendly summary of the current workflow being built.
 *
 * The model only sees state across turns via conversation history. The tool
 * result of every builder tool embeds this summary so the LLM has a fresh,
 * concise "here's what you've built so far" view every time it reasons —
 * preventing it from losing track of node ids, naming, and insertion points.
 *
 * Keep this output compact: a few lines per node, ASCII only, no JSON dump.
 */
export function summarizeWorkflow(workflow: WorkflowJson): string {
	if (workflow.nodes.length === 0) {
		return '[Current workflow state]\nNodes: (none yet — first commit must use insertionPoint { kind: "fromStart" })';
	}

	const lines: string[] = ['[Current workflow state]', 'Nodes (in commit order):'];
	workflow.nodes.forEach((node, index) => {
		const paramHint = oneLineParamHint(node);
		const paramSuffix = paramHint ? ` — ${paramHint}` : '';
		lines.push(
			`  ${index + 1}. id=${node.id}  name="${node.name}"  type=${node.type}@${node.typeVersion}${paramSuffix}`,
		);
	});

	const last = workflow.nodes[workflow.nodes.length - 1];
	lines.push(
		`Next ghost insertion point: { kind: "after", afterNodeId: "${last.id}" } (afterNodeId is the most recently committed node's id).`,
	);
	return lines.join('\n');
}

/**
 * One-line summary of the most useful, top-level parameters for a node. Keeps
 * the workflow summary readable. Falls back to empty string when nothing
 * interesting is set.
 */
function oneLineParamHint(node: INode): string {
	const params = node.parameters ?? {};
	const interesting: string[] = [];
	const keysOfInterest = ['operation', 'resource', 'mode', 'authentication'];
	for (const key of keysOfInterest) {
		const value = (params as Record<string, unknown>)[key];
		if (typeof value === 'string' && value.length > 0) {
			interesting.push(`${key}=${value}`);
		}
	}
	if (interesting.length === 0) {
		const populatedKeys = Object.keys(params).filter((k) => {
			const v = (params as Record<string, unknown>)[k];
			return v !== undefined && v !== null && v !== '';
		});
		if (populatedKeys.length === 0) return 'no parameters set yet';
		return `params: ${populatedKeys.slice(0, 4).join(', ')}${populatedKeys.length > 4 ? ', …' : ''}`;
	}
	return interesting.join(', ');
}
