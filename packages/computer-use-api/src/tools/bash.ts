import { BaseTool, ToolError } from './base';
import { BashAction, BashActionSchema, ToolResult } from '../types';
import { spawn, type ChildProcess } from 'child_process';

const MAX_OUTPUT_LENGTH = 16000;
const COMMAND_TIMEOUT = 120000; // 120 seconds

export class BashTool extends BaseTool {
	name = 'bash';

	private session: BashSession | null = null;

	async execute(input: Record<string, any>): Promise<ToolResult> {
		const validated = BashActionSchema.parse(input);
		return this.handleAction(validated);
	}

	private async handleAction(action: BashAction): Promise<ToolResult> {
		try {
			if (action.restart) {
				return this.restart();
			}

			if (!action.command) {
				throw new ToolError('No command provided');
			}

			if (!this.session) {
				this.session = new BashSession();
				await this.session.start();
			}

			const result = await this.session.execute(action.command);
			return result;
		} catch (error) {
			if (error instanceof ToolError) {
				return { error: error.message };
			}
			return { error: `Bash error: ${error}` };
		}
	}

	private restart(): ToolResult {
		if (this.session) {
			this.session.close();
			this.session = null;
		}
		return { output: 'Bash session restarted' };
	}
}

class BashSession {
	private process: ChildProcess | null = null;
	private buffer: Buffer[] = [];
	private errorBuffer: Buffer[] = [];
	private executing = false;

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			// Start bash with process group for proper cleanup
			this.process = spawn('/bin/bash', ['-i'], {
				detached: false,
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {
					...process.env,
					PS1: '', // Disable prompt
					TERM: 'dumb', // Simple terminal
				},
			});

			if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
				reject(new ToolError('Failed to create bash process'));
				return;
			}

			// Buffer output
			this.process.stdout.on('data', (data: Buffer) => {
				this.buffer.push(data);
			});

			this.process.stderr.on('data', (data: Buffer) => {
				this.errorBuffer.push(data);
			});

			this.process.on('error', (error) => {
				reject(new ToolError(`Bash process error: ${error.message}`));
			});

			// Give bash time to start
			setTimeout(() => {
				// Clear startup output
				this.buffer = [];
				this.errorBuffer = [];
				resolve();
			}, 500);
		});
	}

	async execute(command: string): Promise<ToolResult> {
		if (!this.process || !this.process.stdin) {
			throw new ToolError('Bash session not initialized');
		}

		if (this.executing) {
			throw new ToolError('Another command is currently executing');
		}

		this.executing = true;
		this.buffer = [];
		this.errorBuffer = [];

		console.log(`[bash] Executing: ${command}`);

		try {
			// Use a unique sentinel to detect command completion
			const sentinel = `__COMMAND_DONE_${Date.now()}__`;
			const fullCommand = `${command}\necho "${sentinel}"\n`;

			// Write command
			this.process.stdin.write(fullCommand);

			// Wait for completion with timeout
			const result = await this.waitForCompletion(sentinel, COMMAND_TIMEOUT);

			console.log(
				`[bash] Result: stdout=${result.stdout.slice(0, 200)}${result.stdout.length > 200 ? '...' : ''}${result.stderr ? `, stderr=${result.stderr}` : ''}`,
			);

			return {
				output: this.truncateOutput(result.stdout),
				error: result.stderr ? this.truncateOutput(result.stderr) : undefined,
			};
		} catch (error) {
			console.error(`[bash] Error: ${error}`);
			throw error;
		} finally {
			this.executing = false;
		}
	}

	private async waitForCompletion(
		sentinel: string,
		timeout: number,
	): Promise<{ stdout: string; stderr: string }> {
		const startTime = Date.now();

		return new Promise((resolve, reject) => {
			const checkInterval = setInterval(() => {
				const stdout = Buffer.concat(this.buffer).toString('utf-8');
				const stderr = Buffer.concat(this.errorBuffer).toString('utf-8');

				// Check if sentinel is in output
				if (stdout.includes(sentinel)) {
					clearInterval(checkInterval);

					// Remove sentinel from output
					const cleanStdout = stdout.split(sentinel)[0].trim();

					resolve({
						stdout: cleanStdout,
						stderr: stderr.trim(),
					});
					return;
				}

				// Check timeout
				if (Date.now() - startTime > timeout) {
					clearInterval(checkInterval);
					reject(new ToolError('Command execution timeout'));
				}
			}, 100); // Check every 100ms
		});
	}

	private truncateOutput(output: string): string {
		if (output.length <= MAX_OUTPUT_LENGTH) {
			return output;
		}

		const truncated = output.slice(0, MAX_OUTPUT_LENGTH);
		return `${truncated}\n\n[Output truncated after ${MAX_OUTPUT_LENGTH} characters]`;
	}

	close(): void {
		if (this.process) {
			this.process.kill('SIGTERM');
			this.process = null;
		}
	}
}
