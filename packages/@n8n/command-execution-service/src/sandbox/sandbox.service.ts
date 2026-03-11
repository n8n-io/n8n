import { Injectable } from '@nestjs/common';
import { execSync, spawn } from 'node:child_process';

import type { ExecuteCommandResponse } from '../types';

/**
 * Read-only host paths to expose inside the sandbox so common
 * tools (bash, coreutils, git, ripgrep, etc.) are available.
 */
const RO_BIND_PATHS = ['/usr', '/lib', '/lib64', '/bin', '/sbin', '/etc/alternatives'];

/**
 * Stateless sandbox service that directly constructs bwrap (bubblewrap)
 * arguments per-execution. No shared mutable state — fully concurrent-safe.
 *
 * Each call to `execute()` spawns an independent bwrap process with its
 * own PID / UTS / IPC namespaces. The host workspace directory is
 * bind-mounted read-write at `/workspace` inside the sandbox.
 *
 * Network and user namespace isolation are intentionally omitted because
 * they fail inside Docker (even with SYS_ADMIN + seccomp:unconfined).
 * Network isolation should be handled at the Docker compose level.
 */
@Injectable()
export class SandboxService {
	/**
	 * Execute a command inside a bwrap sandbox.
	 *
	 * @param options.command  Shell command string (passed to `sh -c`)
	 * @param options.workDir  Absolute host path to the per-execution workspace
	 * @param options.timeoutMs  Maximum execution time before SIGKILL
	 * @param options.env  Additional environment variables for the command
	 * @param options.mounts  Additional bind mounts (volumes) to expose inside the sandbox
	 */
	async execute(options: {
		command: string;
		workDir: string;
		timeoutMs: number;
		env?: Record<string, string>;
		mounts?: SandboxMount[];
	}): Promise<ExecuteCommandResponse> {
		const { command, workDir, timeoutMs, env, mounts } = options;

		const args = this.buildBwrapArgs(command, workDir, env, mounts);

		return await new Promise<ExecuteCommandResponse>((resolve, reject) => {
			const stdoutChunks: Buffer[] = [];
			const stderrChunks: Buffer[] = [];

			const child = spawn('bwrap', args, { stdio: ['ignore', 'pipe', 'pipe'] });

			child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
			child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

			const timer = setTimeout(() => {
				child.kill('SIGKILL');
			}, timeoutMs);

			child.on('error', (error) => {
				clearTimeout(timer);
				reject(new Error(`Failed to start bwrap: ${error.message}`));
			});

			child.on('close', (code) => {
				clearTimeout(timer);
				resolve({
					stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
					stderr: Buffer.concat(stderrChunks).toString('utf-8'),
					exitCode: code ?? 1,
				});
			});
		});
	}

	/**
	 * Check whether the `bwrap` binary is available on this system.
	 */
	checkDependencies(): { errors: string[] } {
		const errors: string[] = [];
		try {
			execSync('which bwrap', { stdio: 'ignore' });
		} catch {
			errors.push('bwrap (bubblewrap) binary not found in PATH');
		}
		return { errors };
	}

	/**
	 * Build the bwrap argument array for a single execution.
	 * Pure function — no side effects, no shared state.
	 */
	private buildBwrapArgs(
		command: string,
		workDir: string,
		env?: Record<string, string>,
		mounts?: SandboxMount[],
	): string[] {
		const args: string[] = [
			// Session & lifecycle
			'--new-session',
			'--die-with-parent',

			// Namespace isolation (skip --unshare-net and --unshare-user
			// which fail inside Docker)
			'--unshare-pid',
			'--unshare-uts',
			'--unshare-ipc',

			// Minimal /proc and /dev needed for many CLI tools
			'--proc',
			'/proc',
			'--dev',
			'/dev',

			// Writable /tmp for scratch space
			'--tmpfs',
			'/tmp',
		];

		// Read-only bind mounts for system tools
		for (const hostPath of RO_BIND_PATHS) {
			args.push('--ro-bind-try', hostPath, hostPath);
		}

		// Writable bind mount for the per-execution workspace
		args.push('--bind', workDir, '/workspace');
		args.push('--chdir', '/workspace');

		// Volume mounts — each gets a --bind or --ro-bind into the sandbox
		if (mounts) {
			for (const mount of mounts) {
				if (mount.readOnly) {
					args.push('--ro-bind', mount.hostPath, mount.containerPath);
				} else {
					args.push('--bind', mount.hostPath, mount.containerPath);
				}
			}
		}

		// Environment variables
		if (env) {
			for (const [key, value] of Object.entries(env)) {
				args.push('--setenv', key, value);
			}
		}

		// The actual command, executed via shell
		args.push('--', 'sh', '-c', command);

		return args;
	}
}

export interface SandboxMount {
	/** Absolute host path to the staging directory containing volume files */
	hostPath: string;
	/** Absolute path inside the sandbox where this mount appears */
	containerPath: string;
	/** Whether the mount is read-only inside the sandbox */
	readOnly: boolean;
}
