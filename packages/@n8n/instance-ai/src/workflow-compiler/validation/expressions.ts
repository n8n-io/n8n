import { isRecord } from '@n8n/utils/is-record';
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
	} else if (isRecord(value)) {
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
		const nodeName = node.name;
		for (const { path, value } of stringValues(node.parameters)) {
			if (!value.startsWith('=')) continue;
			const report = (severity: ValidationIssue['severity'], code: string, message: string) =>
				issues.push({
					severity,
					code,
					message: `${nodeName}: ${message}`,
					nodeName,
					parameter: path,
				});
			const opens = (value.match(/\{\{/g) ?? []).length;
			const closes = (value.match(/\}\}/g) ?? []).length;
			if (opens !== closes)
				report('error', 'unbalanced_expression', `expression in "${path}" has unbalanced braces.`);
			for (const [, , referenced, fieldPath] of value.matchAll(NODE_REFERENCE)) {
				if (!names.has(referenced)) {
					const message = `"${path}" references missing node "${referenced}".`;
					report('error', 'expression_unknown_node', message);
					continue;
				}
				if (referenced !== nodeName && !ancestors(nodeName).has(referenced)) {
					const message = `"${path}" references "${referenced}", which does not execute before it.`;
					report('error', 'expression_node_not_upstream', message);
					continue;
				}
				const contract = outputContracts.get(referenced);
				if (!contract || !fieldPath || contract.fields.length === 0) continue;
				const first = fieldPath.match(/^\.([A-Za-z_$][\w$]*)|^\["([^"]+)"\]/);
				const fieldName = first?.[1] ?? first?.[2];
				if (fieldName && !contract.fields.some((field) => field.name === fieldName)) {
					const message = `"${path}" reads "${fieldName}" from "${referenced}", which is not in its known output.`;
					report('warning', 'expression_unknown_field', message);
				}
			}
		}
	}
	return issues;
}
