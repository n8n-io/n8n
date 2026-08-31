import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoTodoTestWithBodyRule } from './no-todo-test-with-body.js';

const ruleTester = new RuleTester();

ruleTester.run('no-todo-test-with-body', NoTodoTestWithBodyRule, {
	valid: [
		// A name-only todo is the whole point of `.todo`
		{ code: "it.todo('name')" },
		{ code: "test.todo('name')" },
		{ code: "describe.todo('name')" },
		// A test that actually runs
		{ code: "it('name', () => {})" },
		{ code: "test('name', async () => {})" },
		// `.skip` keeps the callback, so it can be un-skipped
		{ code: "it.skip('name', () => {})" },
		// A second argument that is not a body
		{ code: "it.todo('name', { timeout: 1000 })" },
		// `.todo` on something that is not a test runner
		{ code: "migrations.todo('name', () => {})" },
		{ code: "helpers.it.todo('name', () => {})" },
	],
	invalid: [
		{
			code: "it.todo('name', () => {})",
			errors: [{ messageId: 'discardedBody', data: { callee: 'it.todo', runner: 'it' } }],
		},
		{
			code: "it.todo('name', function () {})",
			errors: [{ messageId: 'discardedBody', data: { callee: 'it.todo', runner: 'it' } }],
		},
		{
			code: "it.todo('name', async () => {})",
			errors: [{ messageId: 'discardedBody', data: { callee: 'it.todo', runner: 'it' } }],
		},
		{
			code: "test.todo('name', () => {})",
			errors: [{ messageId: 'discardedBody', data: { callee: 'test.todo', runner: 'test' } }],
		},
		{
			code: "test.todo('name', function () {})",
			errors: [{ messageId: 'discardedBody', data: { callee: 'test.todo', runner: 'test' } }],
		},
		// A todo suite does run its collection callback, but marks every test it
		// declares as todo — so it gets the suite-shaped message, not the same one.
		{
			code: "describe.todo('name', () => {})",
			errors: [
				{ messageId: 'todoSuiteBody', data: { callee: 'describe.todo', runner: 'describe' } },
			],
		},
		{
			code: "suite.todo('name', function () {})",
			errors: [{ messageId: 'todoSuiteBody', data: { callee: 'suite.todo', runner: 'suite' } }],
		},
		// Chained modifiers still resolve to the runner
		{
			code: "it.concurrent.todo('name', () => {})",
			errors: [
				{ messageId: 'discardedBody', data: { callee: 'it.concurrent.todo', runner: 'it' } },
			],
		},
		// A body after an options object is discarded just the same
		{
			code: "it.todo('name', { timeout: 1000 }, () => {})",
			errors: [{ messageId: 'discardedBody', data: { callee: 'it.todo', runner: 'it' } }],
		},
	],
});
