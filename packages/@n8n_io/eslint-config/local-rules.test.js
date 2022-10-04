'use strict';

const rules = require('./local-rules'),
	RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester();

ruleTester.run('no-uncaught-json-parse', rules['no-uncaught-json-parse'], {
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
