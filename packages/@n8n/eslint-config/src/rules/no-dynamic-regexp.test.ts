import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoDynamicRegExpRule } from './no-dynamic-regexp.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: require('@typescript-eslint/parser'),
		parserOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
	},
});

const repeatedStaticPattern = [
	"const pattern0 = 'x';",
	...Array.from(
		{ length: 30 },
		(_, index) => `const pattern${index + 1} = pattern${index} + pattern${index};`,
	),
	'new RegExp(pattern30);',
].join('\n');

ruleTester.run('no-dynamic-regexp', NoDynamicRegExpRule, {
	valid: [
		"new RegExp('^foo$');",
		'new RegExp();',
		'new OtherRegExp(dynamicPattern);',
		`
			const name = 'foo';
			new RegExp(\`^\${name}$\`);
		`,
		`
			const prefix = 'foo';
			const pattern = '^' + prefix + '$';
			new RegExp(pattern);
		`,
		`
			const source = /foo/.source;
			const pattern = source.replace('foo', 'bar').toUpperCase();
			new RegExp(pattern);
		`,
		`
			const source = 'foo';
			new RegExp(\`^\${source}:\${source}$\`);
		`,
		`
			import { RUNTIME_SKILL_NAME_PATTERN } from '@n8n/agents';

			const skillNameSource = RUNTIME_SKILL_NAME_PATTERN.source.replace(/^\\^|\\$$/g, '');
			new RegExp(\`^(?:\${skillNameSource}:)?\${skillNameSource}$\`);
		`,
		`
			const pattern = '^foo$' as const;
			new RegExp(pattern satisfies string);
		`,
		repeatedStaticPattern,
		// very deep expression, don't report
		`new RegExp(${Array.from({ length: 101 }, () => "'x'").join(' + ')});`,
	],
	invalid: [
		{
			code: `
				function createPattern(name: string) {
					return new RegExp(\`^\${name}$\`);
				}
			`,
			errors: [{ messageId: 'noDynamicRegExp' }],
		},
		{
			code: `
				let pattern = '^foo$';
				new RegExp(pattern);
			`,
			errors: [{ messageId: 'noDynamicRegExp' }],
		},
		{
			code: `
				const pattern = getPattern();
				new RegExp(pattern);
			`,
			errors: [{ messageId: 'noDynamicRegExp' }],
		},
		{
			code: `
				function createPattern(options: { pattern: string }) {
					return new RegExp(options.pattern);
				}
			`,
			errors: [{ messageId: 'noDynamicRegExp' }],
		},
		{
			code: `
				function createPattern(suffix: string) {
					const source = 'foo';
					return new RegExp(source.replace('foo', suffix));
				}
			`,
			errors: [{ messageId: 'noDynamicRegExp' }],
		},
		{
			code: `
				function createPattern(authCookieName = 'n8n-auth') {
					return new RegExp(\`(^| )\${authCookieName}=(?<token>[^;]+)\`);
				}
			`,
			errors: [{ messageId: 'noDynamicRegExp' }],
		},
		{
			code: 'new RegExp(unknownPattern);',
			errors: [{ messageId: 'noDynamicRegExp' }],
		},
	],
});
