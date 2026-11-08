import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	NodeHelpers,
	type INodeParameters,
	type INodeProperties,
	type INodeTypeDescription,
	type INodeTypes,
} from 'n8n-workflow';

import type { ValidationWarning } from './workflow-validation-warnings';

export const EMPTY_REQUIRED_VALUE_CODE = 'EMPTY_REQUIRED_VALUE';

/** Types where an empty string means "the user has not filled this in". */
const VALUE_TYPES = new Set<INodeProperties['type']>([
	'string',
	'resourceLocator',
	'options',
	'workflowSelector',
]);

function nodeDescription(
	nodeTypes: INodeTypes,
	node: { type?: string; typeVersion?: number },
): INodeTypeDescription | undefined {
	if (!node.type) return undefined;
	try {
		return nodeTypes.getByNameAndVersion(node.type, node.typeVersion)?.description;
	} catch {
		return undefined;
	}
}

function isEmptyValue(value: unknown): boolean {
	if (typeof value === 'string') return value.trim() === '';
	if (isRecord(value) && '__rl' in value) {
		return typeof value.value !== 'number' && (value.value ?? '') === '';
	}
	return false;
}

/**
 * A required parameter written as `''` passes schema checks, because the key
 * is present. Setup does not ask for it either, because it only detects
 * `placeholder()` values. The node then fails at run time (for example a
 * LinkedIn post with `person: ''`). Only top-level parameters that the node
 * shows for the chosen resource and operation are checked.
 *
 * Blocking: the fix is one edit, and the node cannot run without the value.
 */
export function detectEmptyRequiredValues(
	json: WorkflowJSON,
	nodeTypes: INodeTypes | undefined,
): ValidationWarning[] {
	if (!nodeTypes) return [];
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (!node.type || node.disabled || !isRecord(node.parameters)) continue;
		const description = nodeDescription(nodeTypes, node);
		if (!description?.properties) continue;

		// Display conditions read defaults for parameters the source left out.
		const values: INodeParameters = {};
		for (const prop of description.properties) {
			if (!(prop.name in values)) values[prop.name] = prop.default;
		}
		Object.assign(values, node.parameters);

		const seen = new Set<string>();
		for (const prop of description.properties) {
			if (!prop.required || !VALUE_TYPES.has(prop.type) || seen.has(prop.name)) continue;
			if (!(prop.name in node.parameters)) continue;
			if (!isEmptyValue(node.parameters[prop.name])) continue;
			if (
				!NodeHelpers.displayParameter(
					values,
					prop,
					{ typeVersion: node.typeVersion ?? 1 },
					description,
				)
			) {
				continue;
			}
			seen.add(prop.name);
			warnings.push({
				code: EMPTY_REQUIRED_VALUE_CODE,
				message:
					`Required parameter "${prop.displayName}" (${prop.name}) is empty. Setup does not ask ` +
					'for empty values, so the node fails at run time. Use the real value if the user gave ' +
					"one, else placeholder('hint') so setup asks the user for it.",
				nodeName: node.name,
				parameterPath: prop.name,
				severity: 'error',
			});
		}
	}
	return warnings;
}
