import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import communityNodesPlugin, { configs } from '../plugin.js';

const ruleName = '@n8n/community-nodes/prefer-declarative-style';

function lint(code: string) {
	return new Linter().verify(
		code,
		[
			{
				files: ['**/*.ts'],
				plugins: { '@n8n/community-nodes': communityNodesPlugin },
				rules: { [ruleName]: 'warn' },
			},
		],
		{ filename: 'Test.node.ts' },
	);
}

function nodeWithExecute(body: string, group = 'transform', outputs = "['main']") {
	return `
class TestNode extends Node {
	description = { group: ['${group}'], outputs: ${outputs} };
	async execute() {
		const items = this.getInputData();
		${body}
	}
}`;
}

const request = "await this.helpers.httpRequest({ url: 'https://api.example.com/items' });";

describe('prefer-declarative-style', () => {
	it('warns for a non-trigger node that sends one HTTP request per item', () => {
		const severity = Reflect.get(configs.recommended.rules ?? {}, ruleName);
		expect(severity).toBe('warn');

		const messages = lint(
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
		);

		expect(messages).toEqual([
			expect.objectContaining({
				ruleId: ruleName,
				severity: 1,
			}),
		]);
	});

	it.each([
		['for-of', `for (const item of items) { ${request} }`],
		[
			'while',
			`let itemIndex = 0; while (itemIndex < items.length) { this.getNodeParameter('id', itemIndex); ${request} itemIndex++; }`,
		],
		[
			'do-while',
			`let itemIndex = 0; do { this.getNodeParameter('id', itemIndex); ${request} itemIndex++; } while (itemIndex < items.length);`,
		],
	])('warns for a per-item %s loop', (_name, body) => {
		expect(lint(nodeWithExecute(body))).toEqual([
			expect.objectContaining({ ruleId: ruleName, severity: 1 }),
		]);
	});

	it.each([
		['retry loop', `for (let retry = 0; retry < 3; retry++) { ${request} }`],
		[
			'retry bounded by item count',
			`for (let retry = 0; retry < items.length; retry++) { ${request} }`,
		],
		[
			'nested retry loop',
			`for (let i = 0; i < items.length; i++) { for (let retry = 0; retry < 3; retry++) { ${request} } }`,
		],
		[
			'retry before item loop',
			`for (let retry = 0; retry < 3; retry++) { ${request} } for (let i = 0; i < items.length; i++) {}`,
		],
		[
			'pagination parameter',
			`for (const item of items) { this.getNodeParameter('returnAll', 0); ${request} }`,
		],
		[
			'binary parameter',
			`for (const item of items) { this.getNodeParameter('binaryPropertyName', 0); ${request} }`,
		],
		[
			'template parameter',
			`for (const item of items) { this.getNodeParameter(\`page\`, 0); ${request} }`,
		],
		['multiple requests', `for (const item of items) { ${request} ${request} }`],
		['non-HTTP transport', `for (const item of items) { this.sendMessage(item); ${request} }`],
		['static data', `for (const item of items) { this.getWorkflowStaticData('node'); ${request} }`],
	])('does not warn for %s', (_name, body) => {
		expect(lint(nodeWithExecute(body))).toEqual([]);
	});

	it('does not warn for a trigger node', () => {
		expect(lint(nodeWithExecute(`for (const item of items) { ${request} }`, 'trigger'))).toEqual(
			[],
		);
	});

	it('does not warn for a node with multiple outputs', () => {
		expect(
			lint(
				nodeWithExecute(
					`for (const item of items) { ${request} }`,
					'transform',
					"['main', 'main']",
				),
			),
		).toEqual([]);
	});

	it('does not warn for a class that is not a node', () => {
		expect(
			lint('class Test { async execute() { for (const item of items) { ' + request + ' } } }'),
		).toEqual([]);
	});
});
