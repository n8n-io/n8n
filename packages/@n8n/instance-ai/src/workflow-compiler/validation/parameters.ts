import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { matchesDisplayOptions } from '@n8n/workflow-sdk';

import type { NodeRegistry } from '../catalog/node-registry';
import type { NodeOperation } from '../catalog/types';
import type { ValidationIssue } from './report';

type ArrayOptions = Record<string, unknown[]> | undefined;

/** Keeps only the array-valued entries, the shape `matchesDisplayOptions` accepts. */
function pickArrays(source: Record<string, unknown> | undefined): ArrayOptions {
	if (!source) return undefined;
	const result: Record<string, unknown[]> = {};
	for (const [key, value] of Object.entries(source)) if (Array.isArray(value)) result[key] = value;
	return result;
}

function readPath(parameters: Record<string, unknown> | undefined, path: string): unknown {
	let cursor: unknown = parameters;
	for (const segment of path.split('.')) {
		if (typeof cursor !== 'object' || cursor === null) return undefined;
		cursor = (cursor as Record<string, unknown>)[segment];
	}
	return cursor;
}

function isEmpty(value: unknown): boolean {
	if (value === undefined || value === null || value === '') return true;
	if (typeof value === 'object' && '__rl' in value)
		return isEmpty((value as { value?: unknown }).value);
	return false;
}

/**
 * Parameter validation against the registry entry (required semantic
 * parameters, enum values, credential requirements) and, when a live node
 * description is available, against the node's own required properties.
 */
export async function validateParameters(
	workflow: WorkflowJSON,
	registry: NodeRegistry,
	nodeOperations: ReadonlyMap<string, NodeOperation>,
): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];
	for (const node of workflow.nodes) {
		if (!node.name || node.disabled) continue;
		const operation = nodeOperations.get(node.name);
		if (!operation) continue;
		const nodeName = node.name;
		const error = (code: string, message: string, parameter: string) =>
			issues.push({
				severity: 'error',
				code,
				message: `${nodeName}: ${message}`,
				nodeName,
				parameter,
			});
		const parameters = node.parameters ?? {};
		for (const { name, path, type, options } of operation.requiredParameters) {
			const value = readPath(parameters, path);
			if (isEmpty(value)) error('missing_required_parameter', `"${name}" is required.`, name);
			else if (type === 'enum' && options && typeof value === 'string' && !options.includes(value))
				error('invalid_enum_value', `"${name}" must be one of ${options.join(', ')}.`, name);
		}
		for (const [key, expected] of Object.entries(operation.baseParameters)) {
			if (typeof expected === 'string' && parameters[key] !== expected)
				error('discriminator_mismatch', `"${key}" must be "${expected}" for ${operation.id}.`, key);
		}
		for (const credential of operation.credentials) {
			if (credential.required && !node.credentials?.[credential.type]) {
				const message = `${nodeName}: needs a "${credential.type}" credential.`;
				issues.push({ severity: 'warning', code: 'credential_unresolved', message, nodeName });
			}
		}
		const description = await registry.describe(node.type, node.typeVersion);
		for (const property of description?.properties ?? []) {
			if (!property.required) continue;
			const display = property.displayOptions;
			const shown = { show: pickArrays(display?.show), hide: pickArrays(display?.hide) };
			if (display && !matchesDisplayOptions({ parameters, nodeVersion: node.typeVersion }, shown))
				continue;
			if (isEmpty(parameters[property.name]) && isEmpty(property.default)) {
				const message = `node property "${property.displayName}" is required.`;
				error('missing_node_property', message, property.name);
			}
		}
	}
	return issues;
}
