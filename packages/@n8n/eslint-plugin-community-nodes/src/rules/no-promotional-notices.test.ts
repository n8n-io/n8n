import { RuleTester } from '@typescript-eslint/rule-tester';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import { configs } from '../plugin.js';

const ruleId = '@n8n/community-nodes/no-promotional-notices';
const linter = new Linter();

function createNotice(displayName: string): string {
	return `{
		displayName: ${JSON.stringify(displayName)},
		name: 'notice',
		type: 'notice',
		default: '',
	}`;
}

function createNodeCode(property: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		properties: [${property}],
	};
}`;
}

function createPropertiesCode(property: string): string {
	return `
import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [${property}];`;
}

function createCredentialCode(property: string): string {
	return `
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TestApi implements ICredentialType {
	name = 'testApi';
	displayName = 'Test API';
	properties: INodeProperties[] = [${property}];
	test = { request: { method: 'GET', url: 'https://example.com/account' } };
}`;
}

const promotionalNotices = [
	{ name: 'plan-tier sales copy', displayName: 'Needs the Starter plan or above' },
	{
		name: 'a pricing link',
		displayName: 'View <a href="https://example.com/pricing">available plans</a>.',
	},
];

const allowedNotices = [
	'Activating this workflow registers a webhook. Deactivating removes only its own subscription.',
	'Events may be delivered more than once. Deduplicate by eventId before performing side effects.',
];

describe.each(['recommended', 'recommendedWithoutN8nCloudSupport'] as const)(
	'%s promotional notices',
	(config) => {
		function lint(code: string, filename: string) {
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

		it('runs the configured node rules on TypeScript fixtures', () => {
			expect(lint(createNodeCode(''), 'TestNode.node.ts')).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						ruleId: '@n8n/community-nodes/require-node-description-fields',
					}),
				]),
			);
		});

		describe.each([
			{ name: 'node form', filename: 'TestNode.node.ts', createCode: createNodeCode },
			{
				name: 'exported node properties',
				filename: 'TestDescription.ts',
				createCode: createPropertiesCode,
			},
		])('$name', ({ filename, createCode }) => {
			// CE-3544: Promotional notices must produce a warning in the node form.
			it.each(promotionalNotices)('warns about $name', ({ displayName }) => {
				const messages = lint(createCode(createNotice(displayName)), filename);

				expect(messages.filter((message) => message.ruleId === ruleId)).toEqual([
					expect.objectContaining({
						ruleId,
						severity: 1,
						message: expect.stringMatching(/^Notice .+ contains promotional copy\./),
					}),
				]);
			});

			it.each(allowedNotices)('allows the factual notice: %s', (displayName) => {
				const messages = lint(createCode(createNotice(displayName)), filename);

				expect(messages.filter((message) => message.ruleId === ruleId)).toEqual([]);
			});

			it('allows plan information in a related field description', () => {
				const messages = lint(
					createCode(`{
						displayName: 'Workspace ID',
						name: 'workspaceId',
						type: 'string',
						default: '',
						description: 'Requires the Enterprise plan',
					}`),
					filename,
				);

				expect(messages.filter((message) => message.ruleId === ruleId)).toEqual([]);
			});
		});

		it.each(promotionalNotices)('excludes credential notices with $name', ({ displayName }) => {
			const messages = lint(
				createCredentialCode(createNotice(displayName)),
				'TestApi.credentials.ts',
			);

			expect(messages.filter((message) => message.ruleId === ruleId)).toEqual([]);
		});
	},
);
