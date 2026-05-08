import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoErrorInstanceInToThrowRule } from './no-error-instance-in-to-throw.js';

const ruleTester = new RuleTester();

ruleTester.run('no-error-instance-in-to-throw', NoErrorInstanceInToThrowRule, {
	valid: [
		// Passing a class reference is fine
		{ code: 'expect(() => foo()).toThrow(NodeOperationError)' },
		// Passing a string is fine
		{ code: "expect(() => foo()).toThrow('expected message')" },
		// Passing a regex is fine
		{ code: 'expect(() => foo()).toThrow(/expected/)' },
		// No argument is fine
		{ code: 'expect(() => foo()).toThrow()' },
		// Async with class reference is fine
		{ code: 'await expect(foo()).rejects.toThrow(NodeOperationError)' },
		// Async with string is fine
		{ code: "await expect(foo()).rejects.toThrow('expected message')" },
		// NewExpression not inside toThrow is fine
		{ code: 'const err = new Error("test")' },
	],
	invalid: [
		{
			code: "expect(() => foo()).toThrow(new Error('bad'))",
			errors: [{ messageId: 'noErrorInstance', data: { className: 'Error' } }],
		},
		{
			code: "expect(() => foo()).toThrow(new NodeOperationError(node, 'bad'))",
			errors: [{ messageId: 'noErrorInstance', data: { className: 'NodeOperationError' } }],
		},
		{
			code: "await expect(foo()).rejects.toThrow(new Error('bad'))",
			errors: [{ messageId: 'noErrorInstance', data: { className: 'Error' } }],
		},
		{
			code: "await expect(foo()).rejects.toThrow(new NodeOperationError(node, 'message'))",
			errors: [{ messageId: 'noErrorInstance', data: { className: 'NodeOperationError' } }],
		},
		{
			code: 'expect(() => foo()).toThrow(new TypeError())',
			errors: [{ messageId: 'noErrorInstance', data: { className: 'TypeError' } }],
		},
	],
});
