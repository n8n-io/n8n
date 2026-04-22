import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';

const TRIGGER_TYPE_HINTS = ['Trigger', 'trigger'];
const EVALUATION_TRIGGER_TYPE = 'n8n-nodes-base.evaluationTrigger';

export const TERMINAL_EXCLUDED_TYPES = new Set<string>([
	'n8n-nodes-base.stopAndError',
	'n8n-nodes-base.noOp',
]);

function looksLikeTrigger(node: NodeJSON): boolean {
	if (TRIGGER_TYPE_HINTS.some((hint) => node.type.includes(hint))) return true;
	if (node.type === 'n8n-nodes-base.webhook') return true;
	if (node.type === 'n8n-nodes-base.manualTrigger') return true;
	return false;
}

export function findMainTriggerName(workflow: WorkflowJSON): string | null {
	const triggers = (workflow.nodes ?? [])
		.filter((n) => n.name && looksLikeTrigger(n) && n.type !== EVALUATION_TRIGGER_TYPE)
		.sort((a, b) => (a.position?.[0] ?? 0) - (b.position?.[0] ?? 0));
	return triggers[0]?.name ?? null;
}

export function findFirstProcessingNodeName(
	workflow: WorkflowJSON,
	triggerName: string,
): string | null {
	const conns = (workflow.connections ?? {}) as Record<
		string,
		Record<string, Array<Array<{ node: string }>>>
	>;
	const triggerConns = conns[triggerName]?.main;
	if (!triggerConns || triggerConns.length === 0) return null;
	const firstSlot = triggerConns[0];
	if (!Array.isArray(firstSlot) || firstSlot.length === 0) return null;
	return firstSlot[0].node ?? null;
}

export function findTerminalNodeNames(workflow: WorkflowJSON, startFromName: string): string[] {
	const conns = (workflow.connections ?? {}) as Record<
		string,
		Record<string, Array<Array<{ node: string }>>>
	>;
	const nodeByName = new Map<string, NodeJSON>();
	for (const node of workflow.nodes ?? []) {
		if (node.name) nodeByName.set(node.name, node);
	}

	const visited = new Set<string>();
	const terminals: string[] = [];
	const stack: string[] = [startFromName];

	while (stack.length > 0) {
		const current = stack.pop()!;
		if (visited.has(current)) continue;
		visited.add(current);

		const outgoing = conns[current]?.main ?? [];
		const children: string[] = [];
		for (const slot of outgoing) {
			if (!Array.isArray(slot)) continue;
			for (const c of slot) {
				if (c?.node) children.push(c.node);
			}
		}

		if (children.length === 0) {
			const node = nodeByName.get(current);
			if (node && !TERMINAL_EXCLUDED_TYPES.has(node.type) && current !== startFromName) {
				terminals.push(current);
			}
			continue;
		}

		for (const child of children) {
			if (!visited.has(child)) stack.push(child);
		}
	}

	return terminals;
}
