import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const linter = new Linter();

function createNodeCode(property: string): string {
	return `
export class TestNode extends Node {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		inputs: ['main'],
		outputs: ['main'],
		properties: [${property}],
	};
}`;
}

function lintNode(code: string, config: keyof typeof configs) {
	return linter.verify(code, [{ ...configs[config], files: ['**/*.node.ts'] }], {
		filename: 'src/rules/TestNode.node.ts',
	});
}

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)(
	'%s node property review',
	(config) => {
		// CE-1879: Warn when an optional JSON field replaces typed node parameters.
		it('warns about an optional JSON configuration catch-all', () => {
			const code = createNodeCode(`{
				displayName: 'Configuration',
				name: 'configuration',
				type: 'json',
				required: false,
				default: '{}',
			}`);

			const warnings = lintNode(code, config).filter(
				({ severity, message }) => severity === 1 && /Additional (Options|Fields)/i.test(message),
			);

			expect(warnings).toEqual([
				expect.objectContaining({
					severity: 1,
					message: expect.stringMatching(/Additional (Options|Fields)/i),
				}),
			]);
		});

		it('does not warn about typed parameters inside Additional Fields', () => {
			const code = createNodeCode(`{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				options: [{ displayName: 'Limit', name: 'limit', type: 'number', default: 10 }],
			}`);

			const messages = lintNode(code, config);
			expect(messages).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						ruleId: '@n8n/community-nodes/require-node-description-fields',
					}),
				]),
			);

			const warnings = messages.filter(
				({ severity, message }) => severity === 1 && /Additional (Options|Fields)/i.test(message),
			);

			expect(warnings).toEqual([]);
		});

		it('warns when an open-ended JSON field does not declare required', () => {
			const code = createNodeCode(`{
				displayName: 'Configuration',
				name: 'configuration',
				type: 'json',
				default: '{}',
			}`);

			expect(
				lintNode(code, config).filter(
					({ ruleId }) => ruleId === '@n8n/community-nodes/open-ended-node-fields',
				),
			).toHaveLength(1);
		});

		it('does not warn about required JSON fields', () => {
			const code = createNodeCode(`{
				displayName: 'Request Body',
				name: 'body',
				type: 'json',
				required: true,
				default: '{}',
			}`);

			expect(
				lintNode(code, config).filter(
					({ ruleId }) => ruleId === '@n8n/community-nodes/open-ended-node-fields',
				),
			).toEqual([]);
		});

		it('does not inspect classes that are not nodes', () => {
			const code = `class Helper {
				description = { properties: [{ type: 'json', required: false }] };
			}`;

			expect(
				lintNode(code, config).filter(
					({ ruleId }) => ruleId === '@n8n/community-nodes/open-ended-node-fields',
				),
			).toEqual([]);
		});
	},
);
