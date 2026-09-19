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
	const error = (code: string, message: string, nodeName?: string) =>
		issues.push({
			severity: 'error',
			code,
			message,
			...(nodeName === undefined ? {} : { nodeName }),
		});
	const names = new Map<string, WorkflowJSON['nodes'][number]>();
	const ids = new Set<string>();
	for (const node of workflow.nodes) {
		if (!node.name) {
			error('node_without_name', `Node ${node.id} has no name.`);
			continue;
		}
		if (names.has(node.name))
			error('duplicate_node_name', `Node name "${node.name}" is used twice.`, node.name);
		names.set(node.name, node);
		if (ids.has(node.id))
			error('duplicate_node_id', `Node id "${node.id}" is used twice.`, node.name);
		ids.add(node.id);
	}
	if (workflow.nodes.length === 0) {
		error('no_nodes', 'The workflow has no nodes.');
		return issues;
	}
	const triggers = workflow.nodes.filter((node) => !node.disabled && isTriggerNodeType(node.type));
	if (triggers.length === 0) error('missing_trigger', 'The workflow has no trigger node.');

	const adjacency = new Map<string, Set<string>>();
	for (const [source, outputs] of Object.entries(workflow.connections)) {
		if (!names.has(source)) {
			error(
				'connection_from_unknown_node',
				`Connections reference unknown source node "${source}".`,
				source,
			);
			continue;
		}
		for (const [type, slots] of Object.entries(outputs)) {
			for (const connection of slots.flatMap((slot) => slot ?? [])) {
				const target = connection.node;
				if (!names.has(target)) {
					error(
						'connection_to_unknown_node',
						`"${source}" connects to unknown node "${target}".`,
						source,
					);
					continue;
				}
				if (connection.index < 0 || !Number.isInteger(connection.index)) {
					const message = `"${source}" → "${target}" uses input index ${connection.index}.`;
					error('invalid_input_index', message, source);
				}
				if (type !== 'main') continue;
				const targets = adjacency.get(source) ?? new Set<string>();
				targets.add(target);
				adjacency.set(source, targets);
				if (isTriggerNodeType(names.get(target)?.type ?? ''))
					error(
						'connection_into_trigger',
						`"${source}" connects into trigger "${target}".`,
						source,
					);
			}
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
		if (!reachable.has(node.name) && !isSubnode(node.type))
			error('unreachable_node', `"${node.name}" is not reachable from any trigger.`, node.name);
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
