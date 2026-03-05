import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoPlainErrorsRule } from './no-plain-errors.js';

const ruleTester = new RuleTester();

ruleTester.run('no-plain-errors', NoPlainErrorsRule, {
	valid: [
		// Proper error classes should not be flagged
		{ code: 'throw new UnexpectedError("something went wrong")' },
		{ code: 'throw new OperationalError("disk full")' },
		{ code: 'throw new UserError("invalid input")' },
		{ code: 'throw new NodeOperationError(node, "bad config")' },
		{ code: 'throw new SomeCustomError("details")' },
		// Non-throw expressions
		{ code: 'const e = new Error("test")' },
		// Throw without argument
		{ code: 'function f() { throw undefined; }' },
	],

	invalid: [
		{
			code: 'throw new Error("something went wrong")',
			errors: [{ messageId: 'useProperErrorClass' }],
		},
		{
			code: 'throw new Error(message)',
			errors: [{ messageId: 'useProperErrorClass' }],
		},
		{
			code: 'throw new ApplicationError("deprecated")',
			errors: [{ messageId: 'noApplicationError' }],
		},
		{
			code: 'throw new ApplicationError(message, { level: "warning" })',
			errors: [{ messageId: 'noApplicationError' }],
		},
	],
});
