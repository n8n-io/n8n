import { SandboxManager, type SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import { rgPath } from '@vscode/ripgrep';
import { spawn } from 'child_process';
import { z } from 'zod';

import { getSettingsDir } from '../../config';
import type { CallToolResult, ToolDefinition } from '../types';
import { formatCallToolResult, formatErrorResult } from '../utils';
import { buildShellResource } from './build-shell-resource';

async function initializeSandbox({ dir }: { dir: string }) {
	const config: SandboxRuntimeConfig = {
		ripgrep: {
			command: rgPath,
		},
		network: {
			allowedDomains: [],
			deniedDomains: [],
		},
		filesystem: {
			denyRead: ['~/.ssh', getSettingsDir()],
			allowRead: [],
			allowWrite: [dir],
			denyWrite: [getSettingsDir()],
		},
	};
	await SandboxManager.initialize(config);
}

const inputSchema = z.object({
	command: z.string().describe('Shell command to execute'),
	timeout: z.number().int().optional().describe('Timeout in milliseconds (default: 30000)'),
	cwd: z.string().optional().describe('Working directory for the command'),
});

export const shellExecuteTool: ToolDefinition<typeof inputSchema> = {
	name: 'shell_execute',
	description: 'Execute a shell command and return stdout, stderr, and exit code',
	inputSchema,
	annotations: { destructiveHint: true },
	getAffectedResources({ command }) {
		return [
			{
				toolGroup: 'shell' as const,
				resource: buildShellResource(command),
				description: `Execute shell command: ${command}`,
			},
		];
	},
	async execute({ command, timeout = 30_000, cwd }, { dir }) {
		return await runCommand(command, { timeout, dir, cwd: cwd ?? dir });
	},
};

async function spawnCommand(command: string, { dir, cwd }: { dir: string; cwd?: string }) {
	const isWindows = process.platform === 'win32';
	const isMac = process.platform === 'darwin';

	if (isWindows) {
		return spawn('cmd.exe', ['/C', command], { cwd });
	}

	if (isMac) {
		await initializeSandbox({ dir });
		const sandboxedCommand = await SandboxManager.wrapWithSandbox(command);
		return spawn(sandboxedCommand, { shell: true, cwd });
	}

	return spawn('sh', ['-c', command], { cwd });
}

async function runCommand(
	command: string,
	{ timeout, cwd, dir }: { timeout: number; dir: string; cwd?: string },
): Promise<CallToolResult> {
	return await new Promise<CallToolResult>((resolve, reject) => {
		spawnCommand(command, { dir, cwd })
			.then((child) => {
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
			})
			.catch(reject);
	});
}
