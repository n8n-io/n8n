import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/typescript-estree';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs, rules } from '../plugin.js';
import { HintMaxLengthRule } from './hint-max-length.js';

/**
 * Maximum allowed hint length. This is the 95th percentile of `hint` length in
 * first-party nodes (506 single-line literal hints: median 59, p90 95, p95 120,
 * longest 268), so the limit only cuts the long tail.
 */
const MAX_HINT_LENGTH = 120;

/** A hint of the shape reviewers ask community authors to move to `description`. */
const TOO_LONG_HINT =
	'The query must be an array of operations with the required selection and the optional filtering, sorting and pagination fields';

const SHORT_HINT = 'The name of the input field that holds the binary data';

const ruleTester = new RuleTester();

function createNodeDescriptionCode(body: string): string {
	return `
		export class TestNode implements INodeType {
			description = { ${body} };
		}
	`;
}

ruleTester.run('hint-max-length', HintMaxLengthRule, {
	valid: [
		{
			name: 'ignores files outside the node file scope',
			filename: '/tmp/TestNode.credentials.ts',
			code: createNodeCode(TOO_LONG_HINT),
		},
		{
			name: 'ignores classes that do not implement INodeType',
			filename: '/tmp/TestNode.node.ts',
			code: `export class NotANode {
				description = { properties: [{ hint: '${TOO_LONG_HINT}' }] };
			}`,
		},
		{
			name: 'accepts a node without an inline description',
			filename: '/tmp/TestNode.node.ts',
			code: 'export class TestNode implements INodeType { description = nodeDescription; }',
		},
		{
			name: 'ignores dynamic hint values',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode('properties: [{ hint: getHint() }]'),
		},
		{
			name: 'allows long descriptions',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(`properties: [{ description: '${TOO_LONG_HINT}' }]`),
		},
	],
	invalid: [
		{
			name: 'reports a quoted hint key and keeps the author text unchanged',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(`properties: [{ 'hint': '${TOO_LONG_HINT}' }]`),
			errors: [
				{
					messageId: 'hintTooLong',
					data: { length: TOO_LONG_HINT.length, max: MAX_HINT_LENGTH },
				},
			],
			output: null,
		},
		{
			name: 'reports a hint nested in a fixed collection with shared properties',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(`
				properties: [{
					type: 'fixedCollection',
					options: [{
						name: 'values',
						values: [
							...sharedProperties,
							{ hint: '${TOO_LONG_HINT}' },
						],
					}],
				}]
			`),
			errors: [{ messageId: 'hintTooLong' }],
		},
	],
});

function createNodeCode(hint: string): string {
	return `
		import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

		export class TestNode implements INodeType {
			description: INodeTypeDescription = {
				displayName: 'Test Node',
				name: 'testNode',
				icon: 'file:testNode.svg',
				group: ['transform'],
				version: 1,
				subtitle: '={{ $parameter["operation"] }}',
				description: 'A test node',
				defaults: { name: 'Test Node' },
				usableAsTool: true,
				inputs: [],
				outputs: [],
				properties: [
					{
						displayName: 'Query',
						name: 'query',
						type: 'string',
						default: '',
						hint: '${hint}',
						description: 'The query to run against the API',
					},
				],
			};
		}
	`;
}

/** Same node, but the offending property sits inside a collection. */
function createNodeCodeWithNestedHint(hint: string): string {
	return `
		import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

		export class TestNode implements INodeType {
			description: INodeTypeDescription = {
				displayName: 'Test Node',
				name: 'testNode',
				icon: 'file:testNode.svg',
				group: ['transform'],
				version: 1,
				subtitle: '={{ $parameter["operation"] }}',
				description: 'A test node',
				defaults: { name: 'Test Node' },
				usableAsTool: true,
				inputs: [],
				outputs: [],
				properties: [
					{
						displayName: 'Options',
						name: 'options',
						type: 'collection',
						default: {},
						options: [
							{
								displayName: 'Query',
								name: 'query',
								type: 'string',
								default: '',
								hint: '${hint}',
								description: 'The query to run against the API',
							},
						],
					},
				],
			};
		}
	`;
}

/** One-based line of the `hint` property in generated fixture code. */
function hintLine(code: string): number {
	return code.split('\n').findIndex((line) => line.includes('hint:')) + 1;
}

/** Lints fixture code with every rule the given config enables. */
function lintNodeCode(code: string, configName: keyof typeof configs): Linter.LintMessage[] {
	return new Linter().verify(
		code,
		{
			files: ['**/*.node.ts'],
			languageOptions: {
				parser: parser as never,
				parserOptions: { loc: true, range: true, tokens: true, comment: true },
			},
			plugins: { '@n8n/community-nodes': { rules: rules as never } },
			rules: configs[configName].rules as never,
		} as never,
		'nodes/TestNode/TestNode.node.ts',
	);
}

/** Reports that point at the `hint` of the fixture. */
function hintReports(code: string, configName: keyof typeof configs): string[] {
	const line = hintLine(code);
	return lintNodeCode(code, configName)
		.filter((message) => message.line === line)
		.map((message) => `${message.ruleId ?? 'unknown'}: ${message.message}`);
}

const configNames = Object.keys(configs) as Array<keyof typeof configs>;

describe('node property hint length', () => {
	it('uses fixture hints that sit on either side of the limit', () => {
		expect(TOO_LONG_HINT.length).toBeGreaterThan(MAX_HINT_LENGTH);
		expect(SHORT_HINT.length).toBeLessThanOrEqual(MAX_HINT_LENGTH);
	});

	describe.each(configNames)('%s', (configName) => {
		it('reports a hint over the limit', () => {
			const code = createNodeCode(TOO_LONG_HINT);
			const reports = lintNodeCode(code, configName).filter(
				(message) => message.line === hintLine(code),
			);
			expect(reports).toEqual([
				expect.objectContaining({
					ruleId: '@n8n/community-nodes/hint-max-length',
					severity: 1,
					message: `The "hint" is ${TOO_LONG_HINT.length} characters long, over the limit of ${MAX_HINT_LENGTH}. A hint is a short inline nudge. Move the longer text to "description", which renders as the tooltip.`,
				}),
			]);
		});

		it('reports a hint over the limit inside a collection', () => {
			expect(hintReports(createNodeCodeWithNestedHint(TOO_LONG_HINT), configName)).toHaveLength(1);
		});

		it('reports a hint one character over the limit', () => {
			const hint = 'a'.repeat(MAX_HINT_LENGTH + 1);
			expect(hintReports(createNodeCode(hint), configName)).toHaveLength(1);
		});

		it('accepts a hint exactly on the limit', () => {
			const hint = 'a'.repeat(MAX_HINT_LENGTH);
			expect(hintReports(createNodeCode(hint), configName)).toEqual([]);
		});

		it('accepts a short hint', () => {
			expect(hintReports(createNodeCode(SHORT_HINT), configName)).toEqual([]);
		});
	});
});
