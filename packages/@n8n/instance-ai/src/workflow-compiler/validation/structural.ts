import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { isTriggerNodeType } from '../../tools/workflows/workflow-json-utils';
import type { ValidationIssue } from './report';

/**
 * Graph invariants: unique ids and names, connections that reference existing
 * nodes and valid ports, at least one trigger, every non-trigger reachable
 * from a trigger.
 */
export function validateStructure(workflow: WorkflowJSON): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const names = new Map<string, WorkflowJSON['nodes'][number]>();
	const ids = new Set<string>();
	for (const node of workflow.nodes) {
		if (!node.name) {
			issues.push({
				severity: 'error',
				code: 'node_without_name',
				message: `Node ${node.id} has no name.`,
			});
			continue;
		}
		if (names.has(node.name)) {
			issues.push({
				severity: 'error',
				code: 'duplicate_node_name',
				message: `Node name "${node.name}" is used twice.`,
				nodeName: node.name,
			});
		}
		names.set(node.name, node);
		if (ids.has(node.id)) {
			issues.push({
				severity: 'error',
				code: 'duplicate_node_id',
				message: `Node id "${node.id}" is used twice.`,
				nodeName: node.name,
			});
		}
		ids.add(node.id);
	}
	if (workflow.nodes.length === 0) {
		issues.push({ severity: 'error', code: 'no_nodes', message: 'The workflow has no nodes.' });
		return issues;
	}
	const triggers = workflow.nodes.filter((node) => !node.disabled && isTriggerNodeType(node.type));
	if (triggers.length === 0) {
		issues.push({
			severity: 'error',
			code: 'missing_trigger',
			message: 'The workflow has no trigger node.',
		});
	}

	const adjacency = new Map<string, Set<string>>();
	for (const [source, outputs] of Object.entries(workflow.connections)) {
		if (!names.has(source)) {
			issues.push({
				severity: 'error',
				code: 'connection_from_unknown_node',
				message: `Connections reference unknown source node "${source}".`,
				nodeName: source,
			});
			continue;
		}
		for (const [type, slots] of Object.entries(outputs)) {
			slots.forEach((slot, outputIndex) => {
				for (const connection of slot ?? []) {
					if (!names.has(connection.node)) {
						issues.push({
							severity: 'error',
							code: 'connection_to_unknown_node',
							message: `"${source}" connects to unknown node "${connection.node}".`,
							nodeName: source,
						});
						continue;
					}
					if (connection.index < 0 || !Number.isInteger(connection.index)) {
						issues.push({
							severity: 'error',
							code: 'invalid_input_index',
							message: `"${source}" → "${connection.node}" uses input index ${connection.index}.`,
							nodeName: source,
						});
					}
					if (type === 'main') {
						const targets = adjacency.get(source) ?? new Set<string>();
						targets.add(connection.node);
						adjacency.set(source, targets);
						if (isTriggerNodeType(names.get(connection.node)?.type ?? '')) {
							issues.push({
								severity: 'error',
								code: 'connection_into_trigger',
								message: `"${source}" connects into trigger "${connection.node}".`,
								nodeName: source,
							});
						}
					}
					void outputIndex;
				}
			});
		}
	}

	const reachable = new Set<string>();
	const stack = triggers.map((node) => node.name ?? '');
	while (stack.length > 0) {
		const current = stack.pop() ?? '';
		if (reachable.has(current)) continue;
		reachable.add(current);
		for (const next of adjacency.get(current) ?? []) stack.push(next);
	}
	for (const node of workflow.nodes) {
		if (!node.name || node.disabled || isTriggerNodeType(node.type)) continue;
		if (node.type === 'n8n-nodes-base.stickyNote') continue;
		if (!reachable.has(node.name) && !isSubnode(node.type)) {
			issues.push({
				severity: 'error',
				code: 'unreachable_node',
				message: `"${node.name}" is not reachable from any trigger.`,
				nodeName: node.name,
			});
		}
	}
	return issues;
}

function isSubnode(type: string): boolean {
	return (
		type.startsWith('@n8n/n8n-nodes-langchain.') &&
		!type.endsWith('.agent') &&
		!type.includes('chain')
	);
}
