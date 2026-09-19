import { parseAndGenerateServices } from '@typescript-eslint/typescript-estree';
import { ESLint } from 'eslint';
import { expect, test } from 'vitest';

import { configs } from './plugin.js';

const singleCredentialRuleId = '@n8n/community-nodes/single-credential-per-node';

function createNodeCode(credentials: string): string {
	return `
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

export class TestNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'testNode',
		group: ['output'],
		version: 1,
		description: 'Test node',
		defaults: { name: 'Test Node' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: ${credentials},
		properties: [],
	};
}`;
}

async function lintNode(code: string) {
	const eslint = new ESLint({
		overrideConfigFile: true,
		overrideConfig: [
			{
				...configs.recommended,
				files: ['**/*.ts'],
				languageOptions: {
					parser: {
						parseForESLint: parseAndGenerateServices,
					},
				},
			},
		] as unknown as ESLint.Options['overrideConfig'],
	});

	const [result] = await eslint.lintText(code, { filePath: 'Test.node.ts' });
	return result?.messages ?? [];
}

test('allows alternative authentication methods but rejects concurrent credentials (CE-2317)', async () => {
	const alternativeAuthMessages = await lintNode(
		createNodeCode(`[
			{
				name: 'testApi',
				required: true,
				displayOptions: { show: { authentication: ['apiKey'] } },
			},
			{
				name: 'testOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['oAuth2'] } },
			},
		]`),
	);

	expect(alternativeAuthMessages.map(({ ruleId }) => ruleId)).not.toContain(singleCredentialRuleId);

	const concurrentCredentialMessages = await lintNode(
		createNodeCode(`[
			{ name: 'testOAuth2Api', required: true },
			{ name: 'senderProfile', required: true },
		]`),
	);

	expect(concurrentCredentialMessages).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				ruleId: singleCredentialRuleId,
				message: expect.stringContaining('node property'),
			}),
		]),
	);
});
