import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const ruleId = '@n8n/community-nodes/no-confirmation-checkbox';
const linter = new Linter();

function createNodeCode(property: string): string {
	return `
		import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

		export class TestNode implements INodeType {
			description: INodeTypeDescription = {
				displayName: 'Test Node',
				name: 'testNode',
				group: ['transform'],
				version: 1,
				description: 'Manage alerts',
				defaults: { name: 'Test Node' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [${property}],
			};
		}
	`;
}

function createDescriptionCode(property: string): string {
	return `
		import type { INodeProperties } from 'n8n-workflow';

		export const alertFields: INodeProperties[] = [${property}];
	`;
}

function lint(code: string, filename: string, config: keyof typeof configs) {
	const messages = linter.verify(
		code,
		{
			...configs[config],
			files: ['**/*.ts'],
			languageOptions: RuleTester.getDefaultConfig().languageOptions as Linter.LanguageOptions,
		},
		{ filename },
	);

	expect(messages.filter(({ fatal }) => fatal)).toEqual([]);
	return messages;
}

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)('%s', (config) => {
	it('runs the configured rules on node properties', () => {
		const messages = lint(
			createNodeCode(`{
				displayName: 'Configuration',
				name: 'configuration',
				type: 'json',
				default: '{}',
			}`),
			'TestNode.node.ts',
			config,
		);

		expect(messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					ruleId: '@n8n/community-nodes/open-ended-node-fields',
					severity: 1,
				}),
			]),
		);
	});

	describe.each([
		{ filename: 'TestNode.node.ts', createCode: createNodeCode },
		{ filename: 'AlertDescription.ts', createCode: createDescriptionCode },
	])('$filename', ({ filename, createCode }) => {
		// CE-3546: Report confirmation fields before they can block unattended executions.
		it.each([
			{ displayName: 'Confirm Write Operation', name: 'confirmWrite' },
			{ displayName: 'Write Operation', name: 'ConfirmWrite' },
			{ displayName: 'I confirm this operation', name: 'writeApproved' },
			{ displayName: 'Are you sure?', name: 'writeApproved' },
			{ displayName: 'confirm write operation', name: 'writeApproved' },
		])('warns about $displayName ($name)', ({ displayName, name }) => {
			const code = createCode(`{
				displayName: '${displayName}',
				name: '${name}',
				type: 'boolean',
				default: false,
			}`);

			expect(lint(code, filename, config).filter((message) => message.ruleId === ruleId)).toEqual([
				expect.objectContaining({
					ruleId,
					severity: 1,
					message:
						`\`${name}\` asks the user to confirm an operation they have already selected. ` +
						'n8n has no confirmation-checkbox convention, and a workflow running unattended has nobody to tick it. ' +
						'Remove the field; if the operation is destructive, say so in its `description`.',
				}),
			]);
		});

		it.each([
			{
				label: 'Dry Run',
				property: "{ displayName: 'Dry Run', name: 'dryRun', type: 'boolean', default: false }",
			},
			{
				label: 'Estimate Only',
				property:
					"{ displayName: 'Estimate Only', name: 'estimateOnly', type: 'boolean', default: false }",
			},
			{
				label: 'a required API boolean',
				property:
					"{ displayName: 'Enabled', name: 'enabled', type: 'boolean', default: false, required: true }",
			},
			{
				label: 'a confirmation field that defaults to true',
				property:
					"{ displayName: 'Confirm Write Operation', name: 'confirmWrite', type: 'boolean', default: true }",
			},
			{
				label: 'a non-boolean field',
				property:
					"{ displayName: 'Confirmation ID', name: 'confirmationId', type: 'string', default: '' }",
			},
		])('accepts $label', ({ property }) => {
			expect(
				lint(createCode(property), filename, config).filter((message) => message.ruleId === ruleId),
			).toEqual([]);
		});
	});
});
