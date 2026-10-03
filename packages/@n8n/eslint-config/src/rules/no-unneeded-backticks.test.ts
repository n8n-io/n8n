import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoUnneededBackticksRule } from './no-unneeded-backticks.js';

const ruleTester = new RuleTester();

ruleTester.run('no-unneeded-backticks', NoUnneededBackticksRule, {
	valid: [
		{ code: 'const a = `x${b}`;' },
		{ code: 'const a = `line 1\nline 2`;' },
		{ code: 'const a = path`/items`;' },
		{ code: 'const a = String.raw`\\d+`;' },
	],

	invalid: [
		{
			code: 'const a = `x`;',
			output: "const a = 'x';",
			errors: [{ messageId: 'noUnneededBackticks' }],
		},
		{
			code: "const a = `it's`;",
			output: "const a = 'it\\'s';",
			errors: [{ messageId: 'noUnneededBackticks' }],
		},
	],
});
