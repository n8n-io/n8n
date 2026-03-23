import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import get from 'lodash/get';
import set from 'lodash/set';

/**
 * Keys used as discriminators — displayOptions conditions on these keys
 * are structural (they select which parameter variant to show based on
 * resource/operation/mode), not value-dependent. Wrapping values for
 * these conditions would be wrong — the node's own resource/operation
 * already satisfies them at runtime.
 */
const DISCRIMINATOR_KEYS = new Set(['resource', 'operation', 'mode', '@version']);

/**
 * Walk an `INodeProperties[]` tree and return dot-paths of parameters
 * whose visibility depends on non-discriminator displayOptions conditions.
 *
 * These are the parameters that `displayParameter()` in node-helpers.ts
 * will strip unless their value starts with `=` (expression format).
 */
export function extractConditionalFieldPaths(
	properties: INodeProperties[],
	parentPath?: string,
): string[] {
	const paths: string[] = [];

	for (const prop of properties) {
		const currentPath = parentPath ? `${parentPath}.${prop.name}` : prop.name;

		// Skip discriminator fields themselves — they are never expression-wrapped
		if (DISCRIMINATOR_KEYS.has(prop.name)) continue;

		if (prop.type === 'collection' || prop.type === 'fixedCollection') {
			// Recurse into option groups
			if (prop.options) {
				for (const opt of prop.options) {
					if ('values' in opt) {
						// INodePropertyCollection (fixedCollection items)
						for (const inner of opt.values) {
							recurseProperty(inner, `${currentPath}.${opt.name}`, paths);
						}
					} else if ('name' in opt && 'type' in opt) {
						// INodeProperties nested inside a collection
						recurseProperty(opt, currentPath, paths);
					}
				}
			}
		} else {
			recurseProperty(prop, parentPath, paths);
		}
	}

	return paths;
}

function recurseProperty(prop: INodeProperties, parentPath: string | undefined, paths: string[]) {
	const currentPath = parentPath ? `${parentPath}.${prop.name}` : prop.name;

	// Skip discriminator fields
	if (DISCRIMINATOR_KEYS.has(prop.name)) return;

	// Skip fields that cannot be expressions
	if (prop.noDataExpression) return;

	if (hasNonDiscriminatorDisplayCondition(prop)) {
		paths.push(currentPath);
	}

	// Recurse into nested collection/fixedCollection
	if ((prop.type === 'collection' || prop.type === 'fixedCollection') && prop.options) {
		for (const opt of prop.options) {
			if ('values' in opt) {
				for (const inner of opt.values) {
					recurseProperty(inner, `${currentPath}.${opt.name}`, paths);
				}
			} else if ('name' in opt && 'type' in opt) {
				recurseProperty(opt, currentPath, paths);
			}
		}
	}
}

/**
 * Returns true if `prop` has displayOptions.show or displayOptions.hide
 * conditions on keys OTHER than the discriminator keys.
 */
function hasNonDiscriminatorDisplayCondition(prop: INodeProperties): boolean {
	const { displayOptions } = prop;
	if (!displayOptions) return false;

	for (const section of [displayOptions.show, displayOptions.hide]) {
		if (!section) continue;
		for (const key of Object.keys(section)) {
			if (!DISCRIMINATOR_KEYS.has(key)) return true;
		}
	}
	return false;
}

/**
 * Wrap a primitive value in n8n expression format so that
 * `displayParameter()` in node-helpers.ts treats it as an expression
 * and skips the displayOptions condition check.
 */
function wrapAsExpression(value: unknown): string {
	if (typeof value === 'string') return `={{ ${JSON.stringify(value)} }}`;
	// number or boolean
	return `={{ ${String(value)} }}`;
}

/**
 * Pre-save normalization that ensures parameters with non-discriminator
 * displayOptions conditions are wrapped in expression format.
 *
 * This prevents `getNodeParameters()` from silently stripping these
 * parameters during workflow initialization (when `returnNoneDisplayed: false`).
 *
 * Mutates `json` in place.
 */
export function normalizeWorkflowForSave(
	json: WorkflowJSON,
	getNodeDescription: (nodeType: string, version: number) => INodeTypeDescription | undefined,
): void {
	for (const node of json.nodes) {
		if (!node.parameters) continue;

		const desc = getNodeDescription(node.type, node.typeVersion);
		if (!desc) continue;

		const conditionalPaths = extractConditionalFieldPaths(desc.properties);
		if (conditionalPaths.length === 0) continue;

		for (const path of conditionalPaths) {
			const value = get(node.parameters, path);

			// Skip values that don't need wrapping
			if (value === undefined || value === null) continue;
			if (typeof value === 'object') continue; // arrays or nested objects
			if (typeof value === 'string' && value.startsWith('=')) continue; // already expression

			set(node.parameters, path, wrapAsExpression(value));
		}
	}
}
