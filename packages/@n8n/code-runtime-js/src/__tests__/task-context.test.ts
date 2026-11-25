import { createTaskContext, runInTaskContext } from '../task-context';

async function run(code: string, globals?: Record<string, unknown>) {
	return await runInTaskContext(code, createTaskContext(globals));
}

describe('runInTaskContext', () => {
	it('gives the user code the Node.js globals', async () => {
		await expect(
			run(
				'return [typeof Buffer, typeof setTimeout, typeof TextEncoder, typeof atob, global === globalThis, typeof module.exports]',
			),
		).resolves.toEqual(['function', 'function', 'function', 'function', true, 'object']);
	});

	it('does not pass a change to a built-in prototype to the next task', async () => {
		await run('Array.prototype.polluted = true; Object.prototype.polluted = true');

		await expect(run('return [[].polluted, ({}).polluted]')).resolves.toEqual([
			undefined,
			undefined,
		]);
	});

	it('keeps the globals of tasks that run at the same time apart', async () => {
		const code =
			'globalThis.marker = name; await new Promise((resolve) => setTimeout(resolve, 5)); return marker';

		await expect(
			Promise.all([run(code, { name: 'a' }), run(code, { name: 'b' })]),
		).resolves.toEqual(['a', 'b']);
	});

	it('reports errors at the line of the user code', async () => {
		const error: unknown = await run('const a = 1;\nthrow new Error("boom")').catch(
			(e: unknown) => e,
		);

		expect(error).toMatchObject({ message: 'boom' });
		expect((error as Error).stack).toContain('evalmachine.<anonymous>:2');
	});
});
