import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoUnboundedArgumentSpread } from './no-unbounded-argument-spread.js';

const ruleTester = new RuleTester();

ruleTester.run('no-unbounded-argument-spread', NoUnboundedArgumentSpread, {
	valid: [
		{ code: 'fn(1, 2, 3)' },
		{ code: 'fn(...[1, 2, 3])' }, // safe spread
		{ code: 'new Foo(...[1, 2])' },
		{ code: 'fn.apply(null, deps)' },
		{ code: 'Reflect.construct(Foo, deps)' },
	],

	invalid: [
		{
			code: 'fn(...deps)',
			output: 'fn.apply(null, deps)',
			errors: [{ messageId: 'replaceWithApply' }],
		},
		{
			code: 'new Foo(...deps)',
			output: 'Reflect.construct(Foo, deps)',
			errors: [{ messageId: 'replaceWithReflect' }],
		},
		{
			code: 'someFunction(a, ...deps)',
			output: null, // multiple args — no fix
			errors: [{ messageId: 'replaceWithApply' }],
		},
		{
			code: 'new Bar(a, ...deps)',
			output: null,
			errors: [{ messageId: 'replaceWithReflect' }],
		},
	],
});
