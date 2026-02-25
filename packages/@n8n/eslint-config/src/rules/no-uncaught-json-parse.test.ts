import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoUncaughtJsonParseRule } from './no-uncaught-json-parse.js';

const ruleTester = new RuleTester();

ruleTester.run('no-uncaught-json-parse', NoUncaughtJsonParseRule, {
	valid: [
		{
			code: 'try { JSON.parse(foo) } catch (e) {}',
		},
		{
			code: 'JSON.parse(JSON.stringify(foo))',
		},
	],
	invalid: [
		{
			code: 'JSON.parse(foo)',
			errors: [{ messageId: 'noUncaughtJsonParse' }],
		},
	],
});
