import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const ruleId = '@n8n/community-nodes/optional-fields-in-collection';
const optionalFields = `
	{ displayName: 'Email', name: 'email', type: 'string', default: '' },
	{ displayName: 'Name', name: 'name', type: 'string', required: false, default: '' },
	{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
`;

function createNodeCode(properties: string, declarations = ''): string {
	return `
${declarations}
export class ContactNode extends Node {
	description = {
		displayName: 'Contact',
		name: 'contact',
		group: ['transform'],
		version: 1,
		description: 'Manage contacts',
		defaults: { name: 'Contact' },
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		properties: [${properties}],
	};
}`;
}

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)(
	'%s optional field review',
	(config) => {
		const linter = new Linter();
		const lint = (code: string) => {
			const messages = linter.verify(code, [{ ...configs[config], files: ['**/*.node.ts'] }], {
				filename: 'src/rules/Contact.node.ts',
			});

			expect(messages.filter(({ fatal }) => fatal)).toEqual([]);
			return messages;
		};
		const lintOptionalFields = (code: string) =>
			lint(code).filter((message) => message.ruleId === ruleId);

		// CE-3538 / CE-3539: Report optional fields before a creator submits the package for review.
		it('warns about each top-level optional contact field', () => {
			expect(lintOptionalFields(createNodeCode(optionalFields))).toEqual(
				['email', 'name', 'phone'].map((name) =>
					expect.objectContaining({
						ruleId,
						severity: 1,
						message: expect.stringContaining(name),
					}),
				),
			);
		});

		it('accepts optional contact fields inside an Options collection', () => {
			const code = createNodeCode(`{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				options: [${optionalFields}],
			}`);

			expect(lintOptionalFields(code)).toEqual([]);
		});

		it('accepts shared optional fields spread into a collection', () => {
			const code = createNodeCode(
				`{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					default: {},
					options: [...sharedFields],
				}`,
				`export const sharedFields = [${optionalFields}];`,
			);

			expect(lintOptionalFields(code)).toEqual([]);
		});

		it('accepts required inputs and conventional top-level fields', () => {
			const code = createNodeCode(`
				{ displayName: 'Resource', name: 'resource', type: 'options', default: 'contact',
					options: [{ name: 'Contact', value: 'contact' }] },
				{ displayName: 'Operation', name: 'operation', type: 'options', default: 'get',
					options: [{ name: 'Get', value: 'get', action: 'Get a contact' }] },
				{ displayName: 'Return All', name: 'returnAll', type: 'boolean', default: false },
				{ displayName: 'Limit', name: 'limit', type: 'number', default: 50,
					displayOptions: { show: { returnAll: [false] } } },
				{ displayName: 'Simplify', name: 'simplify', type: 'boolean', default: true },
				{ displayName: 'Authentication', name: 'authentication', type: 'options', default: 'apiKey',
					options: [{ name: 'API Key', value: 'apiKey' }] },
				{ displayName: 'Contact ID', name: 'contactId', type: 'string', required: true, default: '' },
				{ displayName: 'Mode', name: 'mode', type: 'options', noDataExpression: true,
					default: 'id', options: [{ name: 'By ID', value: 'id' }] },
			`);

			expect(lintOptionalFields(code)).toEqual([]);
		});

		it('accepts hidden fields', () => {
			const code = createNodeCode(`
				{ displayName: 'Internal Mode', name: 'internalMode', type: 'hidden', default: 'contact' },
				{ displayName: 'Schema Version', name: 'schemaVersion', type: 'hidden', required: false, default: 1 },
			`);

			expect(lintOptionalFields(code)).toEqual([]);
		});

		it('accepts notices and fixed collections', () => {
			const code = createNodeCode(`
				{ displayName: 'A helpful notice', name: 'notice', type: 'notice', default: '' },
				{ displayName: 'Values', name: 'values', type: 'fixedCollection', default: {},
					options: [{ displayName: 'Contact', name: 'contact', values: [${optionalFields}] }] },
			`);

			expect(lintOptionalFields(code)).toEqual([]);
		});

		it('does not inspect classes that are not nodes', () => {
			const code = `class Helper { description = { properties: [${optionalFields}] }; }`;

			expect(lintOptionalFields(code)).toEqual([]);
		});

		it('runs existing node review rules on the same fixture', () => {
			const code = createNodeCode(`{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: 'contact',
				options: [{ name: 'Contact 🚀', value: 'contact' }],
			}`);

			expect(
				lint(code).filter(
					(message) => message.ruleId === '@n8n/community-nodes/no-emoji-in-options',
				),
			).toEqual([
				expect.objectContaining({
					messageId: 'emojiInOption',
					severity: 2,
				}),
			]);
		});
	},
);
