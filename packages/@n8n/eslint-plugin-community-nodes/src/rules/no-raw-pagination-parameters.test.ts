import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

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
