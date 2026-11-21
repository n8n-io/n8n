import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';
import { NoRawPaginationParametersRule } from './no-raw-pagination-parameters.js';

const linter = new Linter();
const ruleId = '@n8n/community-nodes/no-raw-pagination-parameters';

function createNodeCode(properties: string, execute = ''): string {
	return `
export class TestNode extends Node {
	description = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['transform'],
		version: 1,
		description: 'Get items',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [{ name: 'Get Many', value: 'getAll', action: 'Get many items' }],
				default: 'getAll',
			},
			${properties}
		],
	};
	${execute}
}`;
}

const returnAllAndLimit = `
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		displayOptions: { show: { returnAll: [false] } },
	},
`;

const ruleTester = new RuleTester();

ruleTester.run('no-raw-pagination-parameters', NoRawPaginationParametersRule, {
	valid: [
		{
			name: 'unrelated class in a node file',
			filename: 'Test.node.ts',
			code: `class Test {
				description = { properties: [{ name: 'offset', type: 'number', default: 0 }] };
			}`,
		},
		{
			name: 'request data in a node execute method',
			filename: 'Test.node.ts',
			code: createNodeCode(
				'',
				`execute() {
				return { name: 'cursor', type: 'string', default: '' };
			}`,
			),
		},
		{
			name: 'unrelated exported array',
			filename: 'Description.ts',
			code: "export const fields = [{ name: 'offset', type: 'number', default: 0 }];",
		},
		{
			name: 'hidden pagination field in an exported properties array',
			filename: 'Description.ts',
			code: `export const fields: INodeProperties[] = [
				{ displayName: 'Cursor', name: 'cursor', type: 'hidden', default: '' },
			];`,
		},
		{
			name: 'pagination names in option entries without a type',
			filename: 'Test.node.ts',
			code: createNodeCode(`{
				displayName: 'Sort By', name: 'sortBy', type: 'options', default: 'offset',
				options: [{ name: 'offset', value: 'offset' }, { name: 'cursor', value: 'cursor' }],
			}`),
		},
		{
			name: 'pagination name in a fixed collection group without a type',
			filename: 'Test.node.ts',
			code: createNodeCode(`{
				displayName: 'Filters', name: 'filters', type: 'fixedCollection', default: {},
				options: [{ name: 'cursor', displayName: 'Cursor', values: [
					{ displayName: 'Status', name: 'status', type: 'string', default: '' },
				] }],
			}`),
		},
	],
	invalid: [
		...[
			'offset',
			'cursor',
			'page',
			'pageToken',
			'page_token',
			'pageSize',
			'page_size',
			'skip',
			'perPage',
			'per_page',
			'startIndex',
			'nextToken',
		].map((name) => ({
			name: `pagination field ${name} in an exported properties array`,
			filename: 'Description.ts',
			code: `export const fields: INodeProperties[] = [
				{ displayName: '${name}', name: '${name}', type: 'string', default: '' },
			];`,
			errors: [{ messageId: 'rawPaginationParameter' as const, data: { name } }],
		})),
		{
			name: 'pagination field with a const-asserted type',
			filename: 'Description.ts',
			code: `export const fields: INodeProperties[] = [
				{ displayName: 'Offset', name: 'offset', type: 'number' as const, default: 0 },
			];`,
			errors: [{ messageId: 'rawPaginationParameter', data: { name: 'offset' } }],
		},
		{
			name: 'pagination field with a type from a variable',
			filename: 'Test.node.ts',
			code: `const fieldType: INodeProperties['type'] = 'string';
			${createNodeCode(`{
				displayName: 'Cursor', name: 'cursor', type: fieldType, default: '',
			}`)}`,
			errors: [{ messageId: 'rawPaginationParameter', data: { name: 'cursor' } }],
		},
		{
			name: 'pagination field in a fixed collection',
			filename: 'Test.node.ts',
			code: createNodeCode(`{
				displayName: 'Filters', name: 'filters', type: 'fixedCollection', default: {},
				options: [{ name: 'filter', displayName: 'Filter', values: [
					{ displayName: 'Skip', name: 'skip', type: 'number', default: 0 },
				] }],
			}`),
			errors: [{ messageId: 'rawPaginationParameter', data: { name: 'skip' } }],
		},
	],
});

function expectedWarning(name: string) {
	return expect.objectContaining({
		ruleId,
		severity: 1,
		message:
			`\`${name}\` exposes a pagination token to the user. ` +
			'Nodes should page internally: offer a `Return All` boolean and a `Limit` shown only when Return All is off, ' +
			'and follow the cursor or offset in the execute path until the results run out or the limit is reached.',
	});
}

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)(
	'%s pagination parameters',
	(config) => {
		function paginationWarnings(code: string) {
			const messages = linter.verify(code, [{ ...configs[config], files: ['**/*.node.ts'] }], {
				filename: 'src/rules/TestNode.node.ts',
			});

			expect(messages.filter(({ fatal }) => fatal)).toEqual([]);
			return messages.filter((message) => message.ruleId === ruleId);
		}

		// CE-3540: Report user-facing pagination fields, including nested fields.
		it('warns about Offset in Additional Fields on Get Many', () => {
			const code = createNodeCode(`{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				default: {},
				displayOptions: { show: { operation: ['getAll'] } },
				options: [{
					displayName: 'Offset',
					name: 'offset',
					type: 'number',
					default: 0,
					description: 'Use 0, 100, 200 with Limit 100',
				}],
			}`);

			expect(paginationWarnings(code)).toEqual([expectedWarning('offset')]);
		});

		it('warns about both Page Size and Page Token on Get Many', () => {
			const code = createNodeCode(`
				{
					displayName: 'Page Size',
					name: 'pageSize',
					type: 'number',
					default: 100,
					displayOptions: { show: { operation: ['getAll'] } },
				},
				{
					displayName: 'Page Token',
					name: 'pageToken',
					type: 'string',
					default: '',
					displayOptions: { show: { operation: ['getAll'] } },
				},
			`);

			expect(paginationWarnings(code)).toEqual([
				expectedWarning('pageSize'),
				expectedWarning('pageToken'),
			]);
		});

		it('warns about a Cursor in Filters even with Return All and Limit', () => {
			const code = createNodeCode(`${returnAllAndLimit}
				{
					displayName: 'Filters',
					name: 'filters',
					type: 'collection',
					default: {},
					options: [{ displayName: 'Cursor', name: 'cursor', type: 'string', default: '' }],
				},
			`);

			expect(paginationWarnings(code)).toEqual([expectedWarning('cursor')]);
		});

		it('accepts Return All and gated Limit with internal cursor pagination', () => {
			const code = createNodeCode(
				returnAllAndLimit,
				`async execute() {
					const returnAll = this.getNodeParameter('returnAll', 0);
					const limit = returnAll ? Infinity : this.getNodeParameter('limit', 0);
					const items = [];
					let cursor;
					do {
						const response = await this.helpers.httpRequest({
							method: 'GET',
							url: 'https://example.com/items',
							qs: { cursor, pageSize: Math.min(100, limit - items.length) },
						});
						items.push(...response.items);
						cursor = response.nextCursor;
					} while (cursor && items.length < limit);
					return [this.helpers.returnJsonArray(items.slice(0, limit))];
				}`,
			);

			expect(paginationWarnings(code)).toEqual([]);
		});

		it('accepts a hidden cursor used by declarative routing', () => {
			const code = createNodeCode(`{
				displayName: 'Cursor',
				name: 'cursor',
				type: 'hidden',
				default: '',
				routing: { send: { type: 'query', property: 'cursor' } },
			}`);

			expect(paginationWarnings(code)).toEqual([]);
		});
	},
);
