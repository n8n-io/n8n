import { SandboxManager, type SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import { rgPath } from '@vscode/ripgrep';
import { spawn } from 'child_process';
import { z } from 'zod';

import type { CallToolResult, ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { buildShellResource } from './build-shell-resource';

let sandboxInitialized = false;

async function initializeSandbox(cwd: string) {
	if (!sandboxInitialized) {
		// Define your sandbox configuration
		const config: SandboxRuntimeConfig = {
			ripgrep: {
				command: rgPath,
			},
			network: {
				allowedDomains: [],
				deniedDomains: [],
			},
			filesystem: {
				denyRead: ['~/.ssh', '.git', '/'],
				allowRead: [cwd],
				// todo: add write access based on config?
				allowWrite: [],
				denyWrite: [],
			},
		};
		console.error('CONFIG', config);

		// Initialize the sandbox (starts proxy servers, etc.)
		await SandboxManager.initialize(config);

		sandboxInitialized = true;
	}
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
	annotations: { defaultPermission: 'confirm', destructiveHint: true },
	getAffectedResources({ command }) {
		return [
			{
				toolGroup: 'shell' as const,
				resource: buildShellResource(command),
				description: `Execute shell command: ${command}`,
			},
		];
	},
	async execute({ command, timeout = 30_000, cwd }) {
		return await runCommand(command, { timeout, cwd });
	},
};

async function spawnCommand(command: string, cwd?: string) {
	const isWindows = process.platform === 'win32';

	if (isWindows) {
		return spawn('cmd.exe', ['/C', command], { cwd });
	}

	await initializeSandbox();
	const sandboxedCommand = await SandboxManager.wrapWithSandbox(command);
	return spawn(sandboxedCommand, { shell: true, cwd });
}

async function runCommand(
	command: string,
	{ timeout, cwd }: { timeout: number; cwd?: string },
): Promise<CallToolResult> {
	return await new Promise<CallToolResult>((resolve, reject) => {
		/*
		const child = spawn(
			isWindows ? 'cmd.exe' : 'sh',
			isWindows ? ['/C', command] : ['-c', command],
			{ cwd: options.cwd },
		);
*/
		spawnCommand(command, cwd)
			.then((child) => {
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
				}, timeout);

				child.on('close', (code) => {
					clearTimeout(timer);
					resolve(formatCallToolResult({ stdout, stderr, exitCode: code }));
				});
			})
			.catch(reject);
	});
}
