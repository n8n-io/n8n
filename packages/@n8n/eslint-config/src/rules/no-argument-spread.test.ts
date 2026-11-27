import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoArgumentSpreadRule } from './no-argument-spread.js';

const ruleTester = new RuleTester();

ruleTester.run('no-unbounded-argument-spread', NoArgumentSpreadRule, {
	valid: [
		{ code: 'fn(1, 2, 3)' },
		{ code: 'fn(...[1, 2, 3])' },
		{ code: 'new Foo(...[1, 2])' },
		{ code: 'fn.apply(null, deps)' },
		{ code: 'Reflect.construct(Foo, deps)' },
	],

	invalid: [
		{
			code: 'fn(...deps)',
			output: null, // no autofix: `.apply` fails at the same argument-count limit
			errors: [{ messageId: 'noUnboundedSpread' }],
		},
		{
			code: 'obj.fn(...deps)',
			output: null,
			errors: [{ messageId: 'noUnboundedSpread' }],
		},
		{
			code: 'instance = metadata.factory(...dependencies);',
			output: null,
			errors: [{ messageId: 'noUnboundedSpread' }],
		},
		{
			code: 'new Foo(...deps)',
			output: null, // no autofix: `Reflect.construct` fails at the same argument-count limit
			errors: [{ messageId: 'noUnboundedSpread' }],
		},
		{
			code: 'someFunction(a, ...deps)',
			output: null,
			errors: [{ messageId: 'noUnboundedSpread' }],
		},
		{
			code: 'new Bar(a, ...deps)',
			output: null,
			errors: [{ messageId: 'noUnboundedSpread' }],
		},
	],
});
