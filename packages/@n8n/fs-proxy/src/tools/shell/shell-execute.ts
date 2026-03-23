import { spawn } from 'child_process';
import { z } from 'zod';

import type { CallToolResult, ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';

const inputSchema = z.object({
	command: z.string().describe('Shell command to execute'),
	timeout: z.number().int().optional().describe('Timeout in milliseconds (default: 30000)'),
	cwd: z.string().optional().describe('Working directory for the command'),
});

const SHELL_RESOURCE = '*';

export const shellExecuteTool: ToolDefinition<typeof inputSchema> = {
	name: 'shell_execute',
	description: 'Execute a shell command and return stdout, stderr, and exit code',
	inputSchema,
	annotations: { defaultPermission: 'confirm', destructiveHint: true },
	getAffectedResources({ command }) {
		return [
			{
				toolGroup: 'shell' as const,
				resource: SHELL_RESOURCE,
				description: `Execute shell command: ${command}`,
			},
		];
	},
	async execute({ command, timeout = 30_000, cwd }) {
		return await runCommand(command, { timeout, cwd });
	},
};

async function runCommand(
	command: string,
	options: { timeout: number; cwd?: string },
): Promise<CallToolResult> {
	return await new Promise<CallToolResult>((resolve) => {
		const isWindows = process.platform === 'win32';
		const child = spawn(
			isWindows ? 'cmd.exe' : 'sh',
			isWindows ? ['/C', command] : ['-c', command],
			{ cwd: options.cwd },
		);

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += String(chunk);
		});
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += String(chunk);
		});

		const timer = setTimeout(() => {
			child.kill();
			resolve(formatCallToolResult({ stdout, stderr, exitCode: null, timedOut: true }));
		}, options.timeout);

		child.on('close', (code) => {
			clearTimeout(timer);
			resolve(formatCallToolResult({ stdout, stderr, exitCode: code }));
		});
	});
}
