import { ESLint } from 'eslint';
import nodesBasePlugin from 'eslint-plugin-n8n-nodes-base';
import { describe, expect, it } from 'vitest';

const ruleName = 'n8n-nodes-base/node-param-type-options-password-missing';

const eslint = new ESLint({
	overrideConfigFile: true,
	overrideConfig: [
		{
			files: ['**/*.ts'],
			plugins: { 'n8n-nodes-base': nodesBasePlugin },
			rules: { [ruleName]: 'error' },
		},
	],
});

async function lintParameter(name: string, type: string, defaultValue: string) {
	const [result] = await eslint.lintText(
		`const properties = [{ name: '${name}', type: '${type}', default: ${defaultValue} }];`,
		{ filePath: 'nodes/Test/Test.node.ts' },
	);
	return result.messages.filter((message) => message.ruleId === ruleName);
}

describe('node-param-type-options-password-missing (CE-2025)', () => {
	it.each(['promptTokens', 'completionTokens'])(
		'does not require password masking for the %s count',
		async (name) => {
			// Count values can be entered as numeric strings without becoming secrets.
			expect(await lintParameter(name, 'string', "'0'")).toEqual([]);
		},
	);

	it('does not flag a number-typed token count', async () => {
		expect(await lintParameter('promptTokens', 'number', '0')).toEqual([]);
	});

	it('still requires password masking for an access token', async () => {
		expect(await lintParameter('accessToken', 'string', "''")).toEqual([
			expect.objectContaining({ ruleId: ruleName, messageId: 'addPasswordAutofixable' }),
		]);
	});
});
