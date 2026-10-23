/**
 * Mock Output Envelope Validator
 *
 * Warns when a node's mock `output` wraps every item in the runtime envelope
 * `{ json: { ... } }`. SDK mocks are raw `$json` objects, so a wrapped item turns
 * every downstream `$json.field` into `$json.json.field`: expressions resolve empty
 * and verification passes on fields that never resolved.
 */

import { isPlainObject } from '../../../utils/safe-access';
import type { ValidatorPlugin, ValidationIssue } from '../types';

function isJsonEnvelope(item: unknown): boolean {
	return isPlainObject(item) && Object.keys(item).length === 1 && isPlainObject(item.json);
}

export const mockOutputEnvelopeValidator: ValidatorPlugin = {
	id: 'core:mock-output-envelope',
	name: 'Mock Output Envelope Validator',
	priority: 40,

	validateNode(node): ValidationIssue[] {
		const output: unknown = node.config?.output;
		if (!Array.isArray(output) || output.length === 0 || !output.every(isJsonEnvelope)) return [];

		return [
			{
				code: 'MOCK_OUTPUT_JSON_ENVELOPE',
				message:
					`Node '${node.name}' wraps every mock \`output\` item in \`{ json: ... }\`. Mock items ` +
					'are raw $json objects, so downstream `$json.field` expressions resolve empty. Write ' +
					"`output: [{ orderId: 'ord_1' }]`, not `output: [{ json: { orderId: 'ord_1' } }]`, " +
					'unless downstream expressions intentionally read `$json.json.*`.',
				severity: 'warning',
				nodeName: node.name,
			},
		];
	},
};
