import path from 'node:path';
import { z } from 'zod';

import type { CallToolResult, ToolDefinition } from '../types';
import { formatCallToolResult, formatErrorResult } from '../utils';
import { buildShellResource } from './build-shell-resource';
import { spawnShell, type ShellSandboxMode } from './sandbox';

const inputSchema = z.object({
	command: z.string().describe('Shell command to execute'),
	timeout: z.number().int().optional().describe('Timeout in milliseconds (default: 30000)'),
	cwd: z.string().optional().describe('Working directory for the command'),
});

function resolveCommandPath(dir: string, cwd: string | undefined) {
	return path.resolve(dir, cwd ?? '.');
}

/** Mode is baked in at creation, so an unsandboxed shell is only reachable when explicitly built as such. */
export function createShellExecuteTool(mode: ShellSandboxMode): ToolDefinition<typeof inputSchema> {
	return {
		name: 'shell_execute',
		description: 'Execute a shell command and return stdout, stderr, and exit code',
		inputSchema,
		annotations: { destructiveHint: true },
		getAffectedResources({ command, cwd }, { dir }) {
			const resolvedPath = resolveCommandPath(dir, cwd);
			const resource = buildShellResource(command, resolvedPath);
			const description = `Execute shell command: ${command} in ${resolvedPath}`;
			return [
				{
					toolGroup: 'shell' as const,
					resource,
					description,
				},
			];
		},
		async execute({ command, timeout = 30_000, cwd }, { dir }) {
			return await runCommand(command, { timeout, cwd: resolveCommandPath(dir, cwd), mode });
		},
	};
}

async function runCommand(
	command: string,
	{ timeout, cwd, mode }: { timeout: number; cwd?: string; mode: ShellSandboxMode },
): Promise<CallToolResult> {
	let child;
	try {
		child = await spawnShell(command, { cwd, mode });
	} catch (error) {
		// Fail closed: never run unsandboxed.
		return formatErrorResult(
			`Failed to start sandboxed process: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return await new Promise<CallToolResult>((resolve) => {
		let stdout = '';
		let stderr = '';

		child.stdout?.on('data', (chunk: Buffer) => {
			stdout += String(chunk);
		});
		child.stderr?.on('data', (chunk: Buffer) => {
			stderr += String(chunk);
		});

		const timer = setTimeout(() => {
			child.kill();
			resolve(formatCallToolResult({ stdout, stderr, exitCode: null, timedOut: true }));
		}, timeout);

		child.on('close', (code) => {
			clearTimeout(timer);
			const result = formatCallToolResult({ stdout, stderr, exitCode: code });
			if (code !== 0) {
				result.isError = true;
			}
			resolve(result);
		});

		child.on('error', (error) => {
			clearTimeout(timer);
			resolve(formatErrorResult(`Failed to start process: ${error.message}`));
		});
	});
}
