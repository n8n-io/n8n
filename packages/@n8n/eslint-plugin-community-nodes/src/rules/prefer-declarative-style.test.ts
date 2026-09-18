import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import communityNodesPlugin, { configs } from '../plugin.js';

const ruleName = '@n8n/community-nodes/prefer-declarative-style';

describe('prefer-declarative-style', () => {
	it('warns for a non-trigger node that sends one HTTP request per item', () => {
		const severity = Reflect.get(configs.recommended.rules ?? {}, ruleName);
		expect(severity).toBe('warn');

		const messages = new Linter().verify(
			`
class TestNode extends Node {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'Get an item',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	};

	async execute() {
		const items = this.getInputData();
		const returnData = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'testApi', {
				method: 'GET',
				url: 'https://api.example.com/items',
			});
			returnData.push({ json: response, pairedItem: { item: itemIndex } });
		}

		return [returnData];
	}
}
`,
			[
				{
					files: ['**/*.ts'],
					plugins: { '@n8n/community-nodes': communityNodesPlugin },
					rules: { [ruleName]: 'warn' },
				},
			],
			{ filename: 'Test.node.ts' },
		);

		expect(messages).toEqual([
			expect.objectContaining({
				ruleId: ruleName,
				severity: 1,
			}),
		]);
	});
});
