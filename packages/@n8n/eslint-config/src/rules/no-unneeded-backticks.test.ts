import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoUnneededBackticksRule } from './no-unneeded-backticks.js';

const ruleTester = new RuleTester();

ruleTester.run('no-unneeded-backticks', NoUnneededBackticksRule, {
	valid: [
		{ code: 'requestPath`channels/members`' },
		{ code: 'String.raw`value`' },
		{ code: 'const value = `hello ${name}`' },
		{ code: 'const value = `hello\nworld`' },
	],
	invalid: [
		{
			code: 'const value = `hello`',
			output: "const value = 'hello'",
			errors: [{ messageId: 'noUnneededBackticks' }],
		},
	],
});
