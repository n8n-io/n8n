import { TASK_INPUT_PATH, TASK_RESULT_PATH } from '@n8n/code-task-contract';
import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import type { Duplex } from 'node:stream';

import { newTaskInput } from './fixtures';

describe('snapshot', () => {
	it('builds, and a process that starts from it runs a task of the daemon', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'code-runtime-js-'));
		const bundle = join(dir, 'bundle.js');
		const blob = join(dir, 'snapshot.blob');
		const taskDir = join(dir, 'task-1');
		let spawned: ChildProcess | undefined;

		try {
			execFileSync(process.execPath, [join(__dirname, '../../esbuild.config.mts'), bundle]);
			execFileSync(process.execPath, ['--snapshot-blob', blob, '--build-snapshot', bundle], {
				stdio: ['ignore', 'ignore', 'pipe'],
			});
			mkdirSync(join(taskDir, 'in'), { recursive: true });
			mkdirSync(join(taskDir, 'out'));
			writeFileSync(
				join(taskDir, 'in', TASK_INPUT_PATH),
				// The process must outlive a throw and a rejection that the user code does not handle
				JSON.stringify(
					newTaskInput(
						'setTimeout(() => { throw new Error("x") }); Promise.reject(new Error("y")); await new Promise((r) => setTimeout(r, 10)); return [1]',
					),
				),
			);

			// As the daemon does, give the process one end of a socket pair on FD 3
			const runtime = spawn(process.execPath, ['--snapshot-blob', blob], {
				stdio: ['ignore', 'ignore', 'pipe', 'pipe'],
			});
			spawned = runtime;
			let stderr = '';
			runtime.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
			const exited = new Promise<number | null>((resolve) => runtime.on('exit', resolve));
			const control = runtime.stdio[3] as Duplex;
			const lines = createInterface({ input: control })[Symbol.asyncIterator]();

			expect(JSON.parse((await lines.next()).value as string)).toEqual({ type: 'ready' });
			control.write(`${JSON.stringify({ type: 'start', taskId: 't1', dir: taskDir })}\n`);
			expect(JSON.parse((await lines.next()).value as string)).toEqual({
				type: 'done',
				taskId: 't1',
			});
			expect(JSON.parse(readFileSync(join(taskDir, 'out', TASK_RESULT_PATH), 'utf8'))).toEqual({
				version: 1,
				status: 'success',
				result: [1],
				console: { entries: [] },
			});

			// The process exits when the daemon closes the control socket
			control.end();
			expect(await exited).toBe(0);
			expect(stderr).toBe('');
		} finally {
			// After a failed assertion, a running process would keep the test worker alive
			spawned?.kill();
			rmSync(dir, { recursive: true, force: true });
		}
	}, 30_000);
});
