import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/typescript-estree';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs, rules } from '../plugin.js';
import { HintMaxLengthRule } from './hint-max-length.js';

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

function property(fields: string, type = 'string'): string {
	return `{ displayName: 'Query', name: 'query', type: '${type}', default: '', ${fields} }`;
}

ruleTester.run('hint-max-length', HintMaxLengthRule, {
	valid: [
		{
			name: 'accepts a node without an inline description',
			filename: '/tmp/TestNode.node.ts',
			code: 'export class TestNode implements INodeType { description = nodeDescription; }',
		},
		{
			name: 'ignores dynamic hint values',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(`properties: [${property('hint: getHint()')}]`),
		},
		{
			name: 'ignores template hints with dynamic values',
			// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string -- Keep the template expression in the fixture.
			code: createNodeDescriptionCode(`properties: [${property('hint: `Use ${getHint()}`')}]`),
		},
		{
			name: 'allows long descriptions',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(
				`properties: [${property(`description: '${TOO_LONG_HINT}'`)}]`,
			),
		},
		{
			name: 'does not count HTML markup toward the limit',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(
				`properties: [${property(`hint: 'See the <a href="https://example.com/${'x'.repeat(120)}" target="_blank">docs</a>'`)}]`,
			),
		},
		{
			name: 'ignores a hint key in a default value',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(
				`properties: [{ displayName: 'Body', name: 'body', type: 'json', default: { hint: '${TOO_LONG_HINT}' } }]`,
			),
		},
		{
			name: 'ignores a hint key in a request body',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(
				`properties: [${property(`routing: { request: { body: { hint: '${TOO_LONG_HINT}' } } }`)}]`,
			),
		},
		{
			name: 'ignores a hint key in a spread-based default value',
			code: createNodeDescriptionCode(
				`properties: [{ displayName: 'Body', name: 'body', type: 'json', default: { ...baseDefaults, hint: '${TOO_LONG_HINT}' } }]`,
			),
		},
		{
			name: 'ignores a hint key in a spread-based request body',
			code: createNodeDescriptionCode(
				`properties: [${property(`routing: { request: { body: { ...baseBody, hint: '${TOO_LONG_HINT}' } } }`)}]`,
			),
		},
		{
			name: 'ignores a hint key in an unrelated spread-based object',
			code: `export const body = { ...baseBody, hint: '${TOO_LONG_HINT}' };`,
		},
		{
			name: 'ignores a hint key in an unrelated options array',
			code: `export const body = { options: [{ ...baseOptions, hint: '${TOO_LONG_HINT}' }] };`,
		},
		...[
			{ encoded: '&lt;script&gt;', text: '<script>' },
			{ encoded: '&copy;&eacute;&nbsp;&amp;', text: '©é &' },
			{ encoded: '&#65;&#x42;', text: 'AB' },
			{ encoded: '&amp;lt;', text: '&lt;' },
		].map(({ encoded, text }) => ({
			name: `counts ${encoded} as decoded text at the limit`,
			code: createNodeDescriptionCode(
				`properties: [${property(`hint: '${'x'.repeat(MAX_HINT_LENGTH - text.length)}${encoded}'`)}]`,
			),
		})),
	],
	invalid: [
		{
			name: 'reports a hint built from string concatenation',
			code: createNodeDescriptionCode(
				`properties: [${property(`hint: '${'x'.repeat(60)}' + '${'y'.repeat(61)}'`)}]`,
			),
			errors: [{ messageId: 'hintTooLong', data: { length: 121, max: MAX_HINT_LENGTH } }],
		},
		{
			name: 'reports a hint defined by a local constant in a resource file',
			filename: '/tmp/nodes/TestNode/resources/issue/getAll.ts',
			code: `const hint = '${TOO_LONG_HINT}';
				export const getAll: INodeProperties[] = [${property('hint')}];`,
			errors: [
				{ messageId: 'hintTooLong', data: { length: TOO_LONG_HINT.length, max: MAX_HINT_LENGTH } },
			],
		},
		{
			name: 'reports a hint in a resource file outside the node file',
			filename: '/tmp/nodes/TestNode/resources/issue/getAll.ts',
			code: `export const getAll: INodeProperties[] = [${property(`hint: '${TOO_LONG_HINT}'`)}];`,
			errors: [{ messageId: 'hintTooLong' }],
		},
		{
			name: 'reports a hint in a versioned node class outside a .node.ts file',
			filename: '/tmp/nodes/TestNode/v1/TestNodeV1.ts',
			code: createNodeDescriptionCode(`properties: [${property(`hint: '${TOO_LONG_HINT}'`)}]`),
			errors: [{ messageId: 'hintTooLong' }],
		},
		{
			name: 'reports a hint that overrides a spread property',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(
				`properties: [{ ...baseProperty, hint: '${TOO_LONG_HINT}' }]`,
			),
			errors: [{ messageId: 'hintTooLong' }],
		},
		{
			name: 'reports a spread property in a typed resource array',
			code: `export const fields: INodeProperties[] = [{ ...baseProperty, hint: '${TOO_LONG_HINT}' }];`,
			errors: [{ messageId: 'hintTooLong' }],
		},
		{
			name: 'reports a spread property in a typed resource object',
			code: `export const field: INodeProperties = { ...baseProperty, hint: '${TOO_LONG_HINT}' };`,
			errors: [{ messageId: 'hintTooLong' }],
		},
		{
			name: 'reports a spread property in credential properties',
			code: `export class TestCredential implements ICredentialType { properties = [{ ...baseProperty, hint: '${TOO_LONG_HINT}' }]; }`,
			errors: [{ messageId: 'hintTooLong' }],
		},
		...[
			{
				type: 'collection',
				fields: `options: [{ ...baseProperty, hint: '${TOO_LONG_HINT}' }]`,
			},
			{
				type: 'fixedCollection',
				fields: `options: [{ name: 'values', values: [{ ...baseProperty, hint: '${TOO_LONG_HINT}' }] }]`,
			},
			{
				type: 'resourceLocator',
				fields: `modes: [{ ...baseMode, hint: '${TOO_LONG_HINT}' }]`,
			},
		].map(({ type, fields }) => ({
			name: `reports a spread property inside a ${type}`,
			code: createNodeDescriptionCode(`properties: [${property(fields, type)}]`),
			errors: [{ messageId: 'hintTooLong' as const }],
		})),
		{
			name: 'counts plain-text comparisons toward the limit',
			code: createNodeDescriptionCode(
				`properties: [${property(`hint: '${'x'.repeat(MAX_HINT_LENGTH - 4)} < 10 and > 5'`)}]`,
			),
			errors: [
				{
					messageId: 'hintTooLong',
					data: { length: MAX_HINT_LENGTH - 4 + ' < 10 and > 5'.length, max: MAX_HINT_LENGTH },
				},
			],
		},
		...[
			{ encoded: '&lt;script&gt;', text: '<script>' },
			{ encoded: '&#65;&#x42;', text: 'AB' },
			{ encoded: '&amp;lt;', text: '&lt;' },
		].map(({ encoded, text }) => ({
			name: `reports the decoded length of ${encoded} over the limit`,
			code: createNodeDescriptionCode(
				`properties: [${property(`hint: '${'x'.repeat(MAX_HINT_LENGTH)}${encoded}'`)}]`,
			),
			errors: [
				{
					messageId: 'hintTooLong' as const,
					data: { length: MAX_HINT_LENGTH + text.length, max: MAX_HINT_LENGTH },
				},
			],
		})),
		{
			name: 'reports the visible length of a hint with HTML markup',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(
				`properties: [${property(`hint: '<b>${TOO_LONG_HINT}</b>'`)}]`,
			),
			errors: [
				{
					messageId: 'hintTooLong',
					data: { length: TOO_LONG_HINT.length, max: MAX_HINT_LENGTH },
				},
			],
		},
		{
			name: 'reports a hint on a resource locator mode',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(
				`properties: [{ displayName: 'Issue', name: 'issue', type: 'resourceLocator', default: {}, modes: [{ displayName: 'ID', name: 'id', type: 'string', hint: '${TOO_LONG_HINT}' }] }]`,
			),
			errors: [{ messageId: 'hintTooLong' }],
		},
		{
			name: 'reports a quoted hint key and keeps the author text unchanged',
			filename: '/tmp/TestNode.node.ts',
			code: createNodeDescriptionCode(`properties: [${property(`'hint': '${TOO_LONG_HINT}'`)}]`),
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
							${property(`hint: '${TOO_LONG_HINT}'`)},
						],
					}],
				}]
			`),
			errors: [{ messageId: 'hintTooLong' }],
		},
	],
});

function createNodeCode(hint: string, delimiter: "'" | '`' = "'"): string {
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
						hint: ${delimiter}${hint}${delimiter},
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

		it('reports a template hint one character over the limit', () => {
			const hint = 'a'.repeat(MAX_HINT_LENGTH + 1);
			expect(hintReports(createNodeCode(hint, '`'), configName)).toHaveLength(1);
		});

		it('accepts a template hint exactly on the limit', () => {
			const hint = 'a'.repeat(MAX_HINT_LENGTH);
			expect(hintReports(createNodeCode(hint, '`'), configName)).toEqual([]);
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
