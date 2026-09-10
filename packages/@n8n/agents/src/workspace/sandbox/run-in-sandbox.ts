import { raceWithAbort } from '../../sdk/abort';

interface SandboxCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface RunInSandboxOptions {
	cwd?: string;
	abortSignal?: AbortSignal;
	/** Command timeout in milliseconds. The provider enforces this limit. */
	timeout?: number;
}

export interface SandboxCommandTarget {
	sandbox?: {
		provider?: string;
		executeCommand?: (
			command: string,
			args?: string[],
			options?: RunInSandboxOptions,
		) => Promise<SandboxCommandResult>;
		processes?: {
			spawn: (
				command: string,
				options?: RunInSandboxOptions,
			) => Promise<{ wait: () => Promise<SandboxCommandResult> }>;
		};
	};
}

/**
 * Execute a shell command in the sandbox and wait for completion.
 * Tries `executeCommand` first, falls back to `processes.spawn` + wait.
 *
 * The third argument may be a cwd string (legacy) or {@link RunInSandboxOptions}.
 */
export async function runInSandbox(
	workspace: SandboxCommandTarget,
	command: string,
	cwdOrOptions?: string | RunInSandboxOptions,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const options: RunInSandboxOptions =
		typeof cwdOrOptions === 'string' ? { cwd: cwdOrOptions } : (cwdOrOptions ?? {});
	const sandbox = workspace.sandbox;
	if (!sandbox) throw new Error('Workspace has no sandbox');

	if (sandbox.executeCommand) {
		const result = await sandbox.executeCommand(command, [], options);
		return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
	}

	if (sandbox.processes) {
		const handle = await sandbox.processes.spawn(command, options);
		const result = await raceWithAbort(async () => await handle.wait(), options.abortSignal);
		return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
	}

	throw new Error('Sandbox has neither executeCommand nor processes available');
}
