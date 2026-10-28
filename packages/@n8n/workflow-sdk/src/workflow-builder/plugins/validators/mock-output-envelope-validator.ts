/**
 * Mock Output Envelope Validator
 *
 * Warns when a node's mock `output` wraps every item in the runtime envelope
 * `{ json: { ... } }`. SDK mocks are raw `$json` objects, so a wrapped item turns
 * every downstream `$json.field` into `$json.json.field`: expressions resolve empty
 * and verification passes on fields that never resolved.
 */

import { isPlainObject } from '../../../utils/safe-access';
import type { PluginContext, ValidatorPlugin, ValidationIssue } from '../types';

function isJsonEnvelope(item: unknown): boolean {
	return isPlainObject(item) && Object.keys(item).length === 1 && isPlainObject(item.json);
}

/** True when any node parameter reads a nested `json` field, so a `{ json }` item is intended. */
function readsNestedJson(ctx: PluginContext): boolean {
	for (const graphNode of ctx.nodes.values()) {
		if (JSON.stringify(graphNode.instance.config?.parameters ?? {}).includes('$json.json'))
			return true;
	}
	return false;
}

export const mockOutputEnvelopeValidator: ValidatorPlugin = {
	id: 'core:mock-output-envelope',
	name: 'Mock Output Envelope Validator',
	priority: 40,

	// Per-node validation not used - the exception depends on downstream expressions
	validateNode: (): ValidationIssue[] => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		if (readsNestedJson(ctx)) return [];
		const issues: ValidationIssue[] = [];
		for (const [nodeName, graphNode] of ctx.nodes) {
			const output: unknown = graphNode.instance.config?.output;
			if (!Array.isArray(output) || output.length === 0 || !output.every(isJsonEnvelope)) continue;
			issues.push({
				code: 'MOCK_OUTPUT_JSON_ENVELOPE',
				message:
					`Node '${nodeName}' wraps every mock \`output\` item in \`{ json: ... }\`. Mock items ` +
					'are raw $json objects, so downstream `$json.field` expressions resolve empty. Write ' +
					"`output: [{ orderId: 'ord_1' }]`, not `output: [{ json: { orderId: 'ord_1' } }]`.",
				severity: 'warning',
				nodeName,
			});
		}
		return issues;
	},
};
