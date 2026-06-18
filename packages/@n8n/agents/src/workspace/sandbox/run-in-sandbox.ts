interface SandboxCommandResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface SandboxCommandTarget {
	sandbox?: {
		provider?: string;
		executeCommand?: (
			command: string,
			args?: string[],
			options?: { cwd?: string },
		) => Promise<SandboxCommandResult>;
		processes?: {
			spawn: (
				command: string,
				options?: { cwd?: string },
			) => Promise<{ wait: () => Promise<SandboxCommandResult> }>;
		};
	};
}

/**
 * Execute a shell command in the sandbox and wait for completion.
 * Tries `executeCommand` first, falls back to `processes.spawn` + wait.
 */
export async function runInSandbox(
	workspace: SandboxCommandTarget,
	command: string,
	cwd?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
	const sandbox = workspace.sandbox;
	if (!sandbox) throw new Error('Workspace has no sandbox');

	if (sandbox.executeCommand) {
		const result = await sandbox.executeCommand(command, [], { cwd });
		return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
	}

	if (sandbox.processes) {
		const handle = await sandbox.processes.spawn(command, { cwd });
		const result = await handle.wait();
		return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
	}

	throw new Error('Sandbox has neither executeCommand nor processes available');
}
