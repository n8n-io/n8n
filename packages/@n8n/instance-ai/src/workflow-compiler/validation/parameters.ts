import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { matchesDisplayOptions } from '@n8n/workflow-sdk';

import type { NodeRegistry } from '../catalog/node-registry';
import type { NodeOperation } from '../catalog/types';
import type { ValidationIssue } from './report';

function toDisplayOptions(options: {
	show?: Record<string, unknown>;
	hide?: Record<string, unknown>;
}): {
	show?: Record<string, unknown[]>;
	hide?: Record<string, unknown[]>;
} {
	const pick = (source: Record<string, unknown> | undefined) => {
		if (!source) return undefined;
		const result: Record<string, unknown[]> = {};
		for (const [key, value] of Object.entries(source))
			if (Array.isArray(value)) result[key] = value;
		return result;
	};
	return { show: pick(options.show), hide: pick(options.hide) };
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
		const parameters = node.parameters ?? {};
		for (const definition of operation.requiredParameters) {
			const value = readPath(parameters, definition.path);
			if (isEmpty(value)) {
				issues.push({
					severity: 'error',
					code: 'missing_required_parameter',
					message: `${node.name}: "${definition.name}" is required.`,
					nodeName: node.name,
					parameter: definition.name,
				});
			} else if (
				definition.type === 'enum' &&
				definition.options &&
				typeof value === 'string' &&
				!definition.options.includes(value)
			) {
				issues.push({
					severity: 'error',
					code: 'invalid_enum_value',
					message: `${node.name}: "${definition.name}" must be one of ${definition.options.join(', ')}.`,
					nodeName: node.name,
					parameter: definition.name,
				});
			}
		}
		for (const [key, expected] of Object.entries(operation.baseParameters)) {
			if (typeof expected !== 'string') continue;
			if (parameters[key] !== expected) {
				issues.push({
					severity: 'error',
					code: 'discriminator_mismatch',
					message: `${node.name}: "${key}" must be "${expected}" for ${operation.id}.`,
					nodeName: node.name,
					parameter: key,
				});
			}
		}
		for (const credential of operation.credentials) {
			if (credential.required && !node.credentials?.[credential.type]) {
				issues.push({
					severity: 'warning',
					code: 'credential_unresolved',
					message: `${node.name}: needs a "${credential.type}" credential.`,
					nodeName: node.name,
				});
			}
		}
		const description = await registry.describe(node.type, node.typeVersion);
		if (!description) continue;
		for (const property of description.properties) {
			if (!property.required) continue;
			if (
				property.displayOptions &&
				!matchesDisplayOptions(
					{ parameters, nodeVersion: node.typeVersion },
					toDisplayOptions(property.displayOptions),
				)
			)
				continue;
			const value = parameters[property.name];
			if (isEmpty(value) && isEmpty(property.default)) {
				issues.push({
					severity: 'error',
					code: 'missing_node_property',
					message: `${node.name}: node property "${property.displayName}" is required.`,
					nodeName: node.name,
					parameter: property.name,
				});
			}
		}
	}
	return issues;
}
