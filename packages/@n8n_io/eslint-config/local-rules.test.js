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

ruleTester.run('no-json-parse-json-stringify', rules['no-json-parse-json-stringify'], {
	valid: [
		{
			code: 'deepCopy(foo)',
		},
	],
	invalid: [
		{
			code: 'JSON.parse(JSON.stringify(foo))',
			errors: [{ messageId: 'noJsonParseJsonStringify' }],
			output: 'deepCopy(foo)',
		},
		{
			code: 'JSON.parse(JSON.stringify(foo.bar))',
			errors: [{ messageId: 'noJsonParseJsonStringify' }],
			output: 'deepCopy(foo.bar)',
		},
		{
			code: 'JSON.parse(JSON.stringify(foo.bar.baz))',
			errors: [{ messageId: 'noJsonParseJsonStringify' }],
			output: 'deepCopy(foo.bar.baz)',
		},
		{
			code: 'JSON.parse(JSON.stringify(foo.bar[baz]))',
			errors: [{ messageId: 'noJsonParseJsonStringify' }],
			output: 'deepCopy(foo.bar[baz])',
		},
	],
});
