import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import type { HarnessTaskResult, HarnessTaskSettings } from './types';

const SIGKILL_GRACE_MS = 5_000;

/**
 * Execute a CLI command in a controlled environment.
 *
 * - Spawns the command as a child process with curated env and cwd.
 * - Captures stdout/stderr with configurable size limits.
 * - Enforces timeout via SIGTERM -> SIGKILL escalation.
 * - Supports abort signal for cancellation.
 * - Streams stdout lines to an optional callback for live progress.
 */
export async function executeCli(
	settings: HarnessTaskSettings,
	options?: {
		/** Called for each line of stdout, enabling live event streaming */
		onStdoutLine?: (line: string) => void;
		/** Abort signal for cancellation */
		signal?: AbortSignal;
	},
): Promise<HarnessTaskResult> {
	const { command, args, workDir, env, timeout, maxOutputSize, stdin } = settings;
	const { onStdoutLine, signal } = options ?? {};

	return new Promise<HarnessTaskResult>((resolve, reject) => {
		const startTime = Date.now();

		let stdoutBuf = '';
		let stderrBuf = '';
		let stdoutTruncated = false;
		let stderrTruncated = false;
		let killed = false;

		const child = spawn(command, args, {
			cwd: workDir,
			env,
			stdio: ['pipe', 'pipe', 'pipe'],
			// Do not allocate a TTY; OpenCode's `process.stdin.isTTY` check will return false,
			// which triggers non-interactive mode automatically.
		});

		// --- stdin handling ---
		if (stdin) {
			child.stdin.write(stdin);
		}
		child.stdin.end();

		// --- stdout streaming + capture ---
		if (child.stdout) {
			if (onStdoutLine) {
				const rl = createInterface({ input: child.stdout });
				rl.on('line', (line) => {
					onStdoutLine(line);
					appendToBuffer('stdout', line + '\n');
				});
			} else {
				child.stdout.on('data', (chunk: Buffer) => {
					appendToBuffer('stdout', chunk.toString());
				});
			}
		}

		// --- stderr capture ---
		if (child.stderr) {
			child.stderr.on('data', (chunk: Buffer) => {
				appendToBuffer('stderr', chunk.toString());
			});
		}

		function appendToBuffer(target: 'stdout' | 'stderr', data: string) {
			if (target === 'stdout') {
				if (stdoutTruncated) return;
				stdoutBuf += data;
				if (stdoutBuf.length > maxOutputSize) {
					stdoutBuf = stdoutBuf.slice(0, maxOutputSize) + `\n[truncated at ${maxOutputSize} bytes]`;
					stdoutTruncated = true;
				}
			} else {
				if (stderrTruncated) return;
				stderrBuf += data;
				if (stderrBuf.length > maxOutputSize) {
					stderrBuf = stderrBuf.slice(0, maxOutputSize) + `\n[truncated at ${maxOutputSize} bytes]`;
					stderrTruncated = true;
				}
			}
		}

		// --- timeout enforcement ---
		const timeoutTimer = setTimeout(() => {
			killProcess('Execution timed out');
		}, timeout * 1_000);

		// --- abort signal handling ---
		function onAbort() {
			killProcess('Execution cancelled');
		}

		if (signal) {
			if (signal.aborted) {
				// Already aborted before we started
				child.kill('SIGTERM');
				killed = true;
			} else {
				signal.addEventListener('abort', onAbort, { once: true });
			}
		}

		function killProcess(_reason: string) {
			if (killed) return;
			killed = true;

			// Try graceful shutdown first
			child.kill('SIGTERM');

			// Escalate to SIGKILL after grace period
			setTimeout(() => {
				if (!child.killed) {
					child.kill('SIGKILL');
				}
			}, SIGKILL_GRACE_MS).unref();
		}

		// --- process exit ---
		child.on('error', (error) => {
			clearTimeout(timeoutTimer);
			signal?.removeEventListener('abort', onAbort);
			reject(error);
		});

		child.on('close', (code) => {
			clearTimeout(timeoutTimer);
			signal?.removeEventListener('abort', onAbort);

			resolve({
				stdout: stdoutBuf,
				stderr: stderrBuf,
				exitCode: code ?? 1,
				duration: Date.now() - startTime,
				stdoutTruncated,
				stderrTruncated,
			});
		});
	});
}
