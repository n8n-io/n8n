import type { ToolResult } from '../types';
import { spawn, type SpawnOptions } from 'child_process';

export abstract class BaseTool {
	abstract name: string;

	abstract execute(input: Record<string, unknown>): Promise<ToolResult>;

	/**
	 * Execute a shell command efficiently with proper error handling
	 */
	protected async execCommand(
		command: string,
		args: string[] = [],
		options: SpawnOptions = {},
	): Promise<{ stdout: string; stderr: string; exitCode: number }> {
		const fullCommand = `${command} ${args.join(' ')}`;
		console.log(`[${this.name}] Executing: ${fullCommand}`);

		return new Promise((resolve, reject) => {
			const proc = spawn(command, args, {
				shell: true,
				...options,
			});

			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];

			proc.stdout?.on('data', (data: Buffer) => {
				stdout.push(data);
			});

			proc.stderr?.on('data', (data: Buffer) => {
				stderr.push(data);
			});

			proc.on('error', (error: Error) => {
				console.error(`[${this.name}] Command error: ${error.message}`);
				reject(error);
			});

			proc.on('close', (exitCode: number | null) => {
				const stdoutStr = Buffer.concat(stdout).toString('utf-8');
				const stderrStr = Buffer.concat(stderr).toString('utf-8');
				const code = exitCode ?? 1;

				console.log(
					`[${this.name}] Result: exitCode=${code}${stdoutStr ? `, stdout=${stdoutStr.slice(0, 200)}` : ''}${stderrStr ? `, stderr=${stderrStr}` : ''}`,
				);

				resolve({
					stdout: stdoutStr,
					stderr: stderrStr,
					exitCode: code,
				});
			});
		});
	}

	/**
	 * Execute command and return stdout as Buffer for binary data (e.g., images)
	 */
	protected async execCommandBinary(
		command: string,
		args: string[] = [],
		options: SpawnOptions = {},
	): Promise<{ data: Buffer; stderr: string; exitCode: number }> {
		return new Promise((resolve, reject) => {
			const proc = spawn(command, args, {
				shell: true,
				...options,
			});

			const stdout: Buffer[] = [];
			const stderr: Buffer[] = [];

			proc.stdout?.on('data', (data: Buffer) => {
				stdout.push(data);
			});

			proc.stderr?.on('data', (data: Buffer) => {
				stderr.push(data);
			});

			proc.on('error', (error: Error) => {
				reject(error);
			});

			proc.on('close', (exitCode: number | null) => {
				resolve({
					data: Buffer.concat(stdout),
					stderr: Buffer.concat(stderr).toString('utf-8'),
					exitCode: exitCode ?? 1,
				});
			});
		});
	}

	/**
	 * Safely quote shell arguments
	 */
	protected shellQuote(arg: string): string {
		if (!/[^a-zA-Z0-9_\-./]/.test(arg)) {
			return arg;
		}
		return `'${arg.replace(/'/g, "'\\''")}'`;
	}
}

export class ToolError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ToolError';
	}
}
