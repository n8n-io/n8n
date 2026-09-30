import { spawn } from 'node:child_process';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export interface ExecResult {
	readonly code: number | null;
	readonly output: string;
	readonly timedOut: boolean;
}

/** Runs a command in its own process group, so a timeout also kills its children. */
export async function exec(
	command: string,
	args: readonly string[],
	options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number },
): Promise<ExecResult> {
	return await new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd: options.cwd,
			env: options.env ?? process.env,
			stdio: ['ignore', 'pipe', 'pipe'],
			detached: true,
		});
		const chunks: Buffer[] = [];
		const timedOut = { value: false };
		child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));
		const timer = setTimeout(() => {
			timedOut.value = true;
			killGroup(child.pid);
		}, options.timeoutMs ?? 300_000);
		const done = (code: number | null) => {
			clearTimeout(timer);
			resolve({ code, output: Buffer.concat(chunks).toString(), timedOut: timedOut.value });
		};
		child.on('error', (error) => {
			chunks.push(Buffer.from(error.message));
			done(null);
		});
		child.on('close', done);
	});
}

export function killGroup(pid: number | undefined) {
	if (pid === undefined) return;
	try {
		process.kill(-pid, 'SIGKILL');
	} catch {
		// The process group is already gone.
	}
}

/** Median of the values, `undefined` for none. */
export function median(values: readonly number[]): number | undefined {
	const sorted = [...values].sort((a, b) => a - b);
	if (sorted.length === 0) return undefined;
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
