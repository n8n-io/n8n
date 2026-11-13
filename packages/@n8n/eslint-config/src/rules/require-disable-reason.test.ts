import { RuleTester } from '@typescript-eslint/rule-tester';
import { RequireDisableReasonRule } from './require-disable-reason.js';

const GUARDED = 'n8n-local-rules/require-encoded-path-segments';

// Register the guarded rule so ESLint can resolve the directives under test.
// Only the rule under test runs, so the directives disable nothing.
const ruleTester = new RuleTester({
	linterOptions: { reportUnusedDisableDirectives: 'off' },
	plugins: {
		'n8n-local-rules': {
			rules: {
				'require-encoded-path-segments': { create: () => ({}) },
				'require-disable-reason': RequireDisableReasonRule,
			},
		},
	},
});

const options: [{ rules: string[] }] = [{ rules: [GUARDED] }];

ruleTester.run('require-disable-reason', RequireDisableReasonRule, {
	valid: [
		{
			code: `// eslint-disable-next-line ${GUARDED} -- S3 object keys hold "/" for folders.\nconst a = 1;`,
			options,
		},
		{
			code: `/* eslint-disable-next-line ${GUARDED} -- The API expects the full path. */\nconst a = 1;`,
			options,
		},
		{
			code: `// eslint-disable-next-line no-console, ${GUARDED} -- The value is already encoded.\nconsole.log(1);`,
			options,
		},
		// A directive for another rule needs no reason.
		{ code: '// eslint-disable-next-line no-console\nconsole.log(1);', options },
		{ code: '/* eslint-disable no-console */\nconsole.log(1);', options },
		// A rule named only in the reason is not disabled.
		{
			code: `// eslint-disable-next-line no-console -- see ${GUARDED}\nconsole.log(1);`,
			options,
		},
		// A plain comment is not a directive.
		{ code: `// ${GUARDED} checks this path\nconst a = 1;`, options },
		// Without listed rules, the rule checks nothing.
		{ code: '// eslint-disable-next-line\nconst a = 1;' },
	],

	invalid: [
		{
			code: `// eslint-disable-next-line ${GUARDED}\nconst a = 1;`,
			options,
			errors: [{ messageId: 'missingReason' }],
		},
		{
			code: `// eslint-disable-next-line no-console, ${GUARDED}\nconsole.log(1);`,
			options,
			errors: [{ messageId: 'missingReason' }],
		},
		// An exception covers one line only.
		{
			code: `const a = 1; // eslint-disable-line ${GUARDED} -- The API expects the full path.`,
			options,
			errors: [{ messageId: 'nextLineOnly' }],
		},
		{
			code: `/* eslint-disable ${GUARDED} -- The API expects the full path. */\nconst a = 1;`,
			options,
			errors: [{ messageId: 'nextLineOnly' }],
		},
		{
			code: `/* eslint-disable ${GUARDED} */\nconst a = 1;`,
			options,
			errors: [{ messageId: 'nextLineOnly' }, { messageId: 'missingReason' }],
		},
		// A directive without rule names disables the listed rules too.
		{
			code: '// eslint-disable-next-line\nconst a = 1;',
			options,
			errors: [{ messageId: 'bareDirective' }],
		},
		{
			code: '// eslint-disable-next-line -- The API expects the full path.\nconst a = 1;',
			options,
			errors: [{ messageId: 'bareDirective' }],
		},

		// This rule cannot be disabled, not even with a reason: a directive for it
		// on the line of another directive removes the reason check from that one.
		{
			code: '// eslint-disable-next-line n8n-local-rules/require-disable-reason -- Old code.\nconst a = 1;',
			options,
			errors: [{ messageId: 'noSelfDisable' }],
		},
		{
			code: `// eslint-disable-next-line ${GUARDED}, n8n-local-rules/require-disable-reason -- The API expects the full path.\nconst a = 1;`,
			options,
			errors: [{ messageId: 'noSelfDisable' }],
		},
	],
});
