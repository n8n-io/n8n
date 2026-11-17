import { createTaskConsole, MAX_LOGGED_CALLS, MAX_LOGGED_CALL_LENGTH } from '../task-console';
import { createTaskContext, runInTaskContext } from '../task-context';

async function runWithConsole(code: string) {
	const taskConsole = createTaskConsole();
	await runInTaskContext(code, createTaskContext({ console: taskConsole.console }));
	return taskConsole.getOutput();
}

describe('createTaskConsole', () => {
	it('formats each argument of a call as text', async () => {
		const output = await runWithConsole(
			'const circular = {}; circular.self = circular; console.log("a", { b: 1 }, circular, undefined, { toJSON() {} }, globalThis)',
		);

		expect(output).toEqual({
			entries: [
				[
					"'a'",
					'{"b":1}',
					'{"self":"[Circular Reference]"}',
					'null',
					'null',
					'[[ExecutionContext]]',
				],
			],
		});
	});

	it('records each console.log call and ignores the other methods', async () => {
		const output = await runWithConsole(
			'console.log(1); console.warn(2); console.error(3); console.log(4)',
		);

		expect(output).toEqual({ entries: [['1'], ['4']] });
	});

	it('keeps the first calls and marks the output as truncated', async () => {
		const output = await runWithConsole(
			`for (let i = 0; i < ${MAX_LOGGED_CALLS + 5}; i++) console.log(i)`,
		);

		expect(output.entries).toHaveLength(MAX_LOGGED_CALLS);
		expect(output.entries.at(-1)).toEqual([String(MAX_LOGGED_CALLS - 1)]);
		expect(output.truncated).toBe(true);
	});

	it('cuts a call at the max length without splitting a surrogate pair', async () => {
		const output = await runWithConsole(
			`console.log("a".repeat(${MAX_LOGGED_CALL_LENGTH - 2}) + "😀", "not kept")`,
		);

		expect(output).toEqual({
			entries: [[`'${'a'.repeat(MAX_LOGGED_CALL_LENGTH - 2)}... [truncated]`]],
		});
	});
});
