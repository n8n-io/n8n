import { toEngineConnections, type WorkflowJSON } from '@n8n/workflow-sdk';
import { mapConnectionsByDestination, getParentNodes, NodeConnectionTypes } from 'n8n-workflow';

import type { DataContract } from '../ir/schema';
import type { ValidationIssue } from './report';

const NODE_REFERENCE =
	/\$\((['"])([^'"]+)\1\)(?:\.(?:item|first\(\)|last\(\)|all\(\))(?:\.json((?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])*))?)?/g;

function* stringValues(
	value: unknown,
	path: string[] = [],
): Generator<{ path: string; value: string }> {
	if (typeof value === 'string') {
		yield { path: path.join('.'), value };
	} else if (Array.isArray(value)) {
		for (const [index, item] of value.entries())
			yield* stringValues(item, [...path, String(index)]);
	} else if (typeof value === 'object' && value !== null) {
		for (const [key, item] of Object.entries(value)) yield* stringValues(item, [...path, key]);
	}
}

function ancestorsOf(workflow: WorkflowJSON): (nodeName: string) => Set<string> {
	const byDestination = mapConnectionsByDestination(toEngineConnections(workflow.connections));
	const cache = new Map<string, Set<string>>();
	return (nodeName) => {
		let cached = cache.get(nodeName);
		if (!cached) {
			cached = new Set(getParentNodes(byDestination, nodeName, NodeConnectionTypes.Main));
			cache.set(nodeName, cached);
		}
		return cached;
	};
}

/**
 * Data-flow checks for every `={{ }}` expression: referenced nodes exist,
 * execute upstream of the referencing node, and referenced top-level fields
 * appear in the producer's output contract when one is known.
 */
export function validateExpressions(
	workflow: WorkflowJSON,
	outputContracts: ReadonlyMap<string, DataContract> = new Map(),
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const names = new Set(workflow.nodes.map((node) => node.name ?? ''));
	const ancestors = ancestorsOf(workflow);
	for (const node of workflow.nodes) {
		if (!node.name || node.disabled) continue;
		for (const { path, value } of stringValues(node.parameters)) {
			if (!value.startsWith('=')) continue;
			const opens = (value.match(/\{\{/g) ?? []).length;
			const closes = (value.match(/\}\}/g) ?? []).length;
			if (opens !== closes) {
				issues.push({
					severity: 'error',
					code: 'unbalanced_expression',
					message: `${node.name}: expression in "${path}" has unbalanced braces.`,
					nodeName: node.name,
					parameter: path,
				});
			}
			for (const match of value.matchAll(NODE_REFERENCE)) {
				const referenced = match[2];
				if (!names.has(referenced)) {
					issues.push({
						severity: 'error',
						code: 'expression_unknown_node',
						message: `${node.name}: "${path}" references missing node "${referenced}".`,
						nodeName: node.name,
						parameter: path,
					});
					continue;
				}
				if (referenced !== node.name && !ancestors(node.name).has(referenced)) {
					issues.push({
						severity: 'error',
						code: 'expression_node_not_upstream',
						message: `${node.name}: "${path}" references "${referenced}", which does not execute before it.`,
						nodeName: node.name,
						parameter: path,
					});
					continue;
				}
				const fieldPath = match[3];
				const contract = outputContracts.get(referenced);
				if (contract && fieldPath && contract.fields.length > 0) {
					const first = fieldPath.match(/^\.([A-Za-z_$][\w$]*)|^\["([^"]+)"\]/);
					const fieldName = first?.[1] ?? first?.[2];
					if (fieldName && !contract.fields.some((field) => field.name === fieldName)) {
						issues.push({
							severity: 'warning',
							code: 'expression_unknown_field',
							message: `${node.name}: "${path}" reads "${fieldName}" from "${referenced}", which is not in its known output.`,
							nodeName: node.name,
							parameter: path,
						});
					}
				}
			}
		}
	}
	return issues;
}
