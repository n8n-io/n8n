/**
 * Long-lived child processes for run (a) (`v1-run.ts` in worker mode), so
 * n8n-core and the node classes load once for each worker. A job that takes
 * longer than its limit kills its worker; the next job starts a new one.
 */
import type { ChildProcess } from 'node:child_process';
import { fork } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { join } from 'node:path';

import { packageRoot } from './sample.ts';

export class V1Pool {
	private readonly idle: ChildProcess[] = [];

	private readonly all = new Set<ChildProcess>();

	private readonly env: NodeJS.ProcessEnv;

	private readonly log: string;

	constructor(env: NodeJS.ProcessEnv, log: string) {
		this.env = env;
		this.log = log;
	}

	private spawn(): ChildProcess {
		const fd = openSync(this.log, 'a');
		const child = fork(join(packageRoot, 'scripts', 'gym', 'v1-run.ts'), [], {
			env: this.env,
			stdio: ['ignore', fd, fd, 'ipc'],
		});
		closeSync(fd);
		this.all.add(child);
		child.on('exit', () => this.all.delete(child));
		return child;
	}

	/** Runs one job. Returns false when the worker hung or ended. */
	async run(jobFile: string, outFile: string, limitMs: number): Promise<boolean> {
		const child = this.idle.pop() ?? this.spawn();
		return await new Promise<boolean>((resolve) => {
			let settled = false;
			const finish = (ok: boolean) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				child.off('message', onMessage);
				child.off('exit', onExit);
				if (ok) this.idle.push(child);
				else child.kill('SIGKILL');
				resolve(ok);
			};
			const onMessage = (m: unknown) => {
				if (typeof m === 'object' && m !== null && Reflect.get(m, 'done') === outFile) finish(true);
			};
			const onExit = () => finish(false);
			const timer = setTimeout(() => finish(false), limitMs);
			child.on('message', onMessage);
			child.on('exit', onExit);
			child.send({ jobFile, outFile });
		});
	}

	close() {
		for (const c of this.all) c.kill('SIGKILL');
		this.all.clear();
		this.idle.length = 0;
	}
}
