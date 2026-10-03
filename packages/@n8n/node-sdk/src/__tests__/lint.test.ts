import { RuleTester } from 'oxlint/plugins-dev';

import contractLint from '../lint';

const tester = new RuleTester({ languageOptions: { sourceType: 'module' } });
const rawError = { messageId: 'rawError' };

tester.run('no-raw-error', contractLint.rules['no-raw-error'], {
	valid: [
		"import { UserError } from '@n8n/node-sdk';\nthrow new UserError('No item');",
		"import { OperationalError } from '@n8n/node-sdk';\nthrow new OperationalError('Later');",
		'if (error instanceof Error) throw error;',
		'const failed = new HttpError();',
	],
	invalid: [
		{ code: "throw new Error('No item');", errors: [rawError] },
		{ code: "const failed = new Error('No item');", errors: [rawError] },
		{ code: "throw Error('No item');", errors: [rawError] },
	],
});

describe('n8n-contract/no-redefault', () => {
	it('refuses to run without type information', () => {
		const create = contractLint.rules['no-redefault'].create;
		expect(() =>
			create?.({
				id: 'n8n-contract/no-redefault',
				sourceCode: { parserServices: {} },
			} as never),
		).toThrow('n8n-contract/no-redefault needs type information');
	});
});
