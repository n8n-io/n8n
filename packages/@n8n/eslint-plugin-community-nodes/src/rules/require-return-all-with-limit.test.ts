import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';
import { RequireReturnAllWithLimitRule } from './require-return-all-with-limit.js';

const ruleId = '@n8n/community-nodes/require-return-all-with-limit';
const languageOptions = RuleTester.getDefaultConfig().languageOptions as Linter.LanguageOptions;
const missingCompanionMessage =
	'`Limit` has no `Return All` companion. List operations should offer `Return All` so users are not silently capped at the default.';
const ungatedLimitMessage =
	'`Limit` is always visible. It should be gated on `displayOptions: { show: { returnAll: [false] } }` so it disappears when Return All is on.';

const returnAll = `{
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	default: false,
	description: 'Whether to return all results or only up to a given limit',
}`;

function limitProperty(displayOptions = ''): string {
	return `{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
		${displayOptions}
	}`;
}

function nodeCode(properties: string): string {
	return `
		import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

		export class TestNode implements INodeType {
			description: INodeTypeDescription = {
				displayName: 'Test Node',
				name: 'testNode',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Test Node' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						default: 'getMany',
						options: [{ name: 'Get Many', value: 'getMany', action: 'Get many records' }],
					},
					${properties}
				],
			};
		}
	`;
}

function descriptionCode(properties: string): string {
	return `
		import type { INodeProperties } from 'n8n-workflow';

		export const getManyFields: INodeProperties[] = [${properties}];
	`;
}

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)(
	'%s config',
	(configName) => {
		const linter = new Linter();
		const config = configs[configName];

		describe.each([
			{ filename: 'TestNode.node.ts', createCode: nodeCode },
			{ filename: 'RecordDescription.ts', createCode: descriptionCode },
		])('$filename', ({ filename, createCode }) => {
			function lint(properties: string) {
				// CE-3541: Use the exported configs so a missing rule produces missing warnings.
				const messages = linter.verify(
					createCode(properties),
					{
						...config,
						files: ['**/*.ts'],
						languageOptions,
					},
					{ filename },
				);

				expect(messages.filter((message) => message.fatal || message.ruleId === null)).toEqual([]);
				return messages.filter((message) => message.ruleId === ruleId);
			}

			it('warns when a Get Many limit has no Return All companion', () => {
				expect(
					lint(limitProperty("displayOptions: { show: { operation: ['getMany'] } },")),
				).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							ruleId,
							severity: 1,
							message: missingCompanionMessage,
						}),
					]),
				);
			});

			it('warns when Limit is ungated beside Return All', () => {
				expect(lint(`${returnAll}, ${limitProperty()}`)).toEqual([
					expect.objectContaining({
						ruleId,
						severity: 1,
						message: ungatedLimitMessage,
					}),
				]);
			});

			it('warns when Return All gates Max Pages while Limit is ungated', () => {
				const properties = `${returnAll}, ${limitProperty()}, {
					displayName: 'Max Pages',
					name: 'maxPages',
					type: 'number',
					default: 10,
					displayOptions: { show: { returnAll: [true] } },
				}`;

				expect(lint(properties)).toEqual([
					expect.objectContaining({ ruleId, severity: 1, message: ungatedLimitMessage }),
					expect.objectContaining({ ruleId, severity: 1, message: ungatedLimitMessage }),
				]);
			});

			it('does not report Return All when it also gates a Limit', () => {
				const properties = `${returnAll}, ${limitProperty()}, ${limitProperty(
					'displayOptions: { show: { returnAll: [false] } },',
				)}, {
					name: 'maxPages', type: 'number', default: 10,
					displayOptions: { show: { returnAll: [true] } },
				}`;

				expect(lint(properties)).toEqual([
					expect.objectContaining({ ruleId, severity: 1, message: ungatedLimitMessage }),
				]);
			});

			it.each(['[true]', '[false, true]', '[]', "['false']", 'false'])(
				'warns when Limit uses returnAll: %s',
				(gate) => {
					const properties = `${returnAll}, ${limitProperty(
						`displayOptions: { show: { returnAll: ${gate} } },`,
					)}`;

					expect(lint(properties)).toEqual(
						expect.arrayContaining([
							expect.objectContaining({
								ruleId,
								severity: 1,
								message: ungatedLimitMessage,
							}),
						]),
					);
				},
			);

			it('accepts Return All with Limit gated on returnAll: [false]', () => {
				const properties = `${returnAll}, ${limitProperty(
					'displayOptions: { show: { returnAll: [false] } },',
				)}`;

				expect(lint(properties)).toEqual([]);
			});

			it('matches companion conditions regardless of key and value order', () => {
				const properties = `{
					name: 'returnAll', type: 'boolean', default: false,
					displayOptions: { show: { resource: ['record'], operation: ['getMany', 'search'] } },
				}, ${limitProperty(`displayOptions: {
					show: { returnAll: [false], operation: ['search', 'getMany'], resource: ['record'] },
				},`)}`;

				expect(lint(properties)).toEqual([]);
			});

			it('matches object-valued conditions regardless of key and condition order', () => {
				const properties = `{
					name: 'returnAll', type: 'boolean', default: false,
					displayOptions: { show: {
						'@version': [{ _cnd: { lte: 2.6 } }, -1],
						count: [{ _cnd: { between: { from: 1, to: 3 } } }],
					} },
				}, ${limitProperty(`displayOptions: { show: {
					returnAll: [false], '@version': [-1, { '_cnd': { lte: 2.6 } }],
					count: [{ _cnd: { between: { to: 3, from: 1 } } }],
				} },`)}`;

				expect(lint(properties)).toEqual([]);
			});

			it.each(['[1, 3]', '[3, 1]'])('preserves nested array order in conditions: %s', (value) => {
				const properties = `{
					name: 'returnAll', type: 'boolean', default: false,
					displayOptions: { show: { selection: [{ _cnd: { eq: ${value} } }] } },
				}, ${limitProperty(`displayOptions: { show: {
					returnAll: [false], selection: [{ _cnd: { eq: [1, 3] } }],
				} },`)}`;

				expect(lint(properties)).toEqual(
					value === '[1, 3]'
						? []
						: [expect.objectContaining({ message: missingCompanionMessage, severity: 1 })],
				);
			});

			it.each([
				'{ _cnd: { lte: 2.5 } }',
				'{ _cnd: { gte: 2.6 } }',
				'{ _cnd: { lte: 2.6, gte: 1 } }',
			])('rejects a companion with a different object condition: %s', (condition) => {
				const properties = `{
					name: 'returnAll', type: 'boolean', default: false,
					displayOptions: { show: { '@version': [${condition}] } },
				}, ${limitProperty(`displayOptions: { show: {
					returnAll: [false], '@version': [{ _cnd: { lte: 2.6 } }],
				} },`)}`;

				expect(lint(properties)).toEqual([
					expect.objectContaining({ message: missingCompanionMessage, severity: 1 }),
				]);
			});

			it.each([
				{ companion: 'displayOptions: sharedOptions', limit: 'displayOptions: gatedOptions' },
				{
					companion: 'displayOptions: sharedOptions',
					limit: "displayOptions: { show: { operation: ['getMany'], returnAll: [false] } }",
				},
				{
					companion: 'displayOptions: { show: sharedShow }',
					limit: 'displayOptions: gatedOptions',
				},
				{
					companion: 'displayOptions: { ...sharedOptions }',
					limit: 'displayOptions: { ...gatedOptions }',
				},
				{
					companion: 'displayOptions: { show: { ...sharedShow } }',
					limit: 'displayOptions: { show: { ...sharedShow, returnAll: [false] } }',
				},
				{
					companion: 'displayOptions: { show: { [conditionKey]: [conditionValue] } }',
					limit:
						'displayOptions: { show: { returnAll: [false], [conditionKey]: [conditionValue] } }',
				},
				{
					companion: "displayOptions: { show: { '@version': [{ _cnd: { lte: version } }] } }",
					limit: "displayOptions: { show: { '@version': [2.6], returnAll: [false] } }",
				},
				{
					companion: "displayOptions: { show: { operation: ['getMany'] } }",
					limit: 'displayOptions: { show: { operation: [...operations], returnAll: [false] } }',
				},
				{ companion: '...sharedReturnAll', limit: '...sharedLimit' },
			])('skips unknown display conditions: %o', ({ companion, limit }) => {
				expect(
					lint(`{ name: 'returnAll', type: 'boolean', ${companion} }, ${limitProperty(limit)}`),
				).toEqual([]);
			});

			it('skips a Return All gate defined through an identifier', () => {
				expect(
					lint(`${returnAll}, ${limitProperty('displayOptions: { show: { returnAll: gate } },')}`),
				).toEqual([]);
			});

			it('still reports a known missing gate when the companion conditions are unknown', () => {
				expect(
					lint(`{ name: 'returnAll', displayOptions: sharedOptions }, ${limitProperty()}`),
				).toEqual([expect.objectContaining({ message: ungatedLimitMessage, severity: 1 })]);
			});

			it.each([
				"operation: ['search'], resource: ['record']",
				"operation: ['getMany'], resource: ['other']",
				"operation: ['getMany']",
			])('rejects a companion with different conditions: %s', (conditions) => {
				const properties = `{
					name: 'returnAll', type: 'boolean', default: false,
					displayOptions: { show: { ${conditions} } },
				}, ${limitProperty(`displayOptions: {
					show: { returnAll: [false], operation: ['getMany'], resource: ['record'] },
				},`)}`;

				expect(lint(properties)).toEqual([
					expect.objectContaining({ message: missingCompanionMessage, severity: 1 }),
				]);
			});

			it('allows a documented suppression for a similarity search limit', () => {
				expect(
					lint(`
						// eslint-disable-next-line ${ruleId} -- Similarity search returns the top K matches.
						${limitProperty("displayOptions: { show: { operation: ['search'] } },")}
					`),
				).toEqual([]);
			});
		});
	},
);

new RuleTester().run('require-return-all-with-limit', RequireReturnAllWithLimitRule, {
	valid: [
		{
			name: 'ignores a class that does not implement INodeType',
			filename: 'TestNode.node.ts',
			code: nodeCode(limitProperty()).replace('implements INodeType', ''),
		},
		{
			name: 'ignores node classes outside node files',
			filename: 'unrelated.ts',
			code: nodeCode(limitProperty()),
		},
		{
			name: 'ignores an exported array with an unrelated type',
			filename: 'unrelated.ts',
			code: descriptionCode(limitProperty()).replace('INodeProperties[]', 'OtherProperties[]'),
		},
	],
	invalid: [],
});
