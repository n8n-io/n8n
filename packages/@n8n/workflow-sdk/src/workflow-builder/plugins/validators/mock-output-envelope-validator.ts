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

/** `$json.json` as a whole path segment: `$json.json.x` or `$json.json[0]`, not `$json.jsonField`. */
const NESTED_JSON_READ = /\$json\.json(?![\w$])/;

/** Names of the nodes that run after `start` on any connection. */
function downstreamNodes(ctx: PluginContext, start: string): Set<string> {
	const seen = new Set<string>();
	const queue = [start];
	while (queue.length > 0) {
		const current = ctx.nodes.get(queue.shift() ?? '');
		for (const outputs of current?.connections.values() ?? []) {
			for (const targets of outputs.values()) {
				for (const { node } of targets) {
					if (seen.has(node)) continue;
					seen.add(node);
					queue.push(node);
				}
			}
		}
	}
	return seen;
}

/** True when a node after `nodeName` reads a nested `json` field, so a `{ json }` item is intended. */
function downstreamReadsNestedJson(ctx: PluginContext, nodeName: string): boolean {
	for (const name of downstreamNodes(ctx, nodeName)) {
		const parameters = ctx.nodes.get(name)?.instance.config?.parameters ?? {};
		if (NESTED_JSON_READ.test(JSON.stringify(parameters))) return true;
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
		const issues: ValidationIssue[] = [];
		for (const [nodeName, graphNode] of ctx.nodes) {
			const output: unknown = graphNode.instance.config?.output;
			if (!Array.isArray(output) || output.length === 0 || !output.every(isJsonEnvelope)) continue;
			if (downstreamReadsNestedJson(ctx, nodeName)) continue;
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
