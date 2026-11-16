import { createTaskConsole, MAX_LOGGED_CALLS, MAX_LOGGED_CALL_LENGTH } from '../task-console';
import { createTaskContext, runInTaskContext } from '../task-context';

async function runWithConsole(code: string) {
	const taskConsole = createTaskConsole();
	await runInTaskContext(code, createTaskContext({ console: taskConsole.console }));
	return taskConsole.getLoggedCalls();
}

describe('createTaskConsole', () => {
	it('formats each argument of a call as text', async () => {
		const loggedCalls = await runWithConsole(
			'const circular = {}; circular.self = circular; console.log("a", { b: 1 }, circular, undefined, { toJSON() {} }, globalThis)',
		);

		expect(loggedCalls).toEqual([
			["'a'", '{"b":1}', '{"self":"[Circular Reference]"}', 'null', 'null', '[[ExecutionContext]]'],
		]);
	});

	it('records each console.log call and ignores the other methods', async () => {
		const loggedCalls = await runWithConsole(
			'console.log(1); console.warn(2); console.error(3); console.log(4)',
		);

		expect(loggedCalls).toEqual([['1'], ['4']]);
	});

	it('keeps the first calls and adds the count of dropped calls', async () => {
		const loggedCalls = await runWithConsole(
			`for (let i = 0; i < ${MAX_LOGGED_CALLS + 5}; i++) console.log(i)`,
		);

		expect(loggedCalls).toHaveLength(MAX_LOGGED_CALLS + 1);
		expect(loggedCalls.at(-2)).toEqual([String(MAX_LOGGED_CALLS - 1)]);
		expect(loggedCalls.at(-1)).toEqual(['[Output truncated - 5 more entries]']);
	});

	it('cuts a call at the max length without splitting a surrogate pair', async () => {
		const loggedCalls = await runWithConsole(
			`console.log("a".repeat(${MAX_LOGGED_CALL_LENGTH - 2}) + "😀", "not kept")`,
		);

		expect(loggedCalls).toEqual([[`'${'a'.repeat(MAX_LOGGED_CALL_LENGTH - 2)}... [truncated]`]]);
	});
});
