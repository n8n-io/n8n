import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

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

				expect(lint(properties)).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							ruleId,
							severity: 1,
							message: ungatedLimitMessage,
						}),
					]),
				);
			});

			it.each(['[true]', '[false, true]'])('warns when Limit uses returnAll: %s', (gate) => {
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
			});

			it('accepts Return All with Limit gated on returnAll: [false]', () => {
				const properties = `${returnAll}, ${limitProperty(
					'displayOptions: { show: { returnAll: [false] } },',
				)}`;

				expect(lint(properties)).toEqual([]);
			});
		});
	},
);
