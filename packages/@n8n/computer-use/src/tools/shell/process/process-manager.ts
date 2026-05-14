import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { spawnCommand } from '../shell-execute';

export type ManagedProcessStatus = 'running' | 'exited' | 'error' | 'killed';

interface ManagedProcess {
	id: string;
	command: string;
	cwd: string;
	startedAt: number;
	child: ChildProcess;
	status: ManagedProcessStatus;
	stdout: string;
	stderr: string;
	stdoutCursor: number;
	stderrCursor: number;
	exitCode: number | null;
	error?: string;
}

export interface ProcessSnapshot {
	processId: string;
	command: string;
	cwd: string;
	status: ManagedProcessStatus;
	stdoutDelta: string;
	stderrDelta: string;
	exitCode: number | null;
	durationMs: number;
}

class ProcessManager {
	private readonly processes = new Map<string, ManagedProcess>();

	async start(command: string, options: { dir: string; cwd: string }): Promise<ProcessSnapshot> {
		const child = await spawnCommand(command, options);
		const id = `proc_${randomUUID()}`;
		const process: ManagedProcess = {
			id,
			command,
			cwd: options.cwd,
			startedAt: Date.now(),
			child,
			status: 'running',
			stdout: '',
			stderr: '',
			stdoutCursor: 0,
			stderrCursor: 0,
			exitCode: null,
		};

		child.stdout?.on('data', (chunk: Buffer) => {
			process.stdout += String(chunk);
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			process.stderr += String(chunk);
		});
		child.on('close', (code) => {
			if (process.status === 'killed') {
				process.exitCode = code;
				return;
			}
			process.status = 'exited';
			process.exitCode = code;
		});
		child.on('error', (error) => {
			process.status = 'error';
			process.error = error.message;
		});

		this.processes.set(id, process);
		return this.snapshot(process);
	}

	poll(processId: string): ProcessSnapshot {
		return this.snapshot(this.get(processId));
	}

	async wait(processId: string, timeoutMs: number): Promise<ProcessSnapshot> {
		const process = this.get(processId);
		if (process.status !== 'running') return this.snapshot(process);

		await new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, timeoutMs);
			process.child.once('close', () => {
				clearTimeout(timer);
				resolve();
			});
		});

		return this.snapshot(process);
	}

	write(processId: string, input: string): ProcessSnapshot {
		const process = this.get(processId);
		if (process.status !== 'running') {
			throw new Error(`Process is not running: ${processId}`);
		}
		process.child.stdin?.write(input);
		return this.snapshot(process);
	}

	kill(processId: string): ProcessSnapshot {
		const process = this.get(processId);
		if (process.status === 'running') {
			process.status = 'killed';
			process.child.kill();
		}
		return this.snapshot(process);
	}

	private get(processId: string): ManagedProcess {
		const process = this.processes.get(processId);
		if (!process) throw new Error(`Unknown process: ${processId}`);
		return process;
	}

	private snapshot(process: ManagedProcess): ProcessSnapshot {
		const stdoutDelta = process.stdout.slice(process.stdoutCursor);
		const stderrDelta = process.stderr.slice(process.stderrCursor);
		process.stdoutCursor = process.stdout.length;
		process.stderrCursor = process.stderr.length;

		return {
			processId: process.id,
			command: process.command,
			cwd: process.cwd,
			status: process.status,
			stdoutDelta,
			stderrDelta: process.error ? `${stderrDelta}${process.error}` : stderrDelta,
			exitCode: process.exitCode,
			durationMs: Date.now() - process.startedAt,
		};
	}
}

export const processManager = new ProcessManager();
