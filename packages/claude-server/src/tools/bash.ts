import { exec } from 'child_process';
import { promisify } from 'util';
import type { ToolDefinition } from '../types';

const execAsync = promisify(exec);

/**
 * Creates a Bash tool for executing shell commands
 */
export function createBashTool(workingDir: string): ToolDefinition {
	return {
		name: 'Bash',
		description:
			'Executes a bash command in the working directory. Use for git, npm, pnpm, file operations, etc.',
		input_schema: {
			type: 'object',
			properties: {
				command: {
					type: 'string',
					description: 'The bash command to execute',
				},
				timeout: {
					type: 'number',
					description: 'Optional timeout in milliseconds (default: 120000)',
				},
			},
			required: ['command'],
		},
		async execute(input: unknown) {
			const { command, timeout = 120000 } = input as { command: string; timeout?: number };

			try {
				const { stdout, stderr } = await execAsync(command, {
					cwd: workingDir,
					timeout,
					maxBuffer: 10 * 1024 * 1024, // 10MB buffer
				});

				let output = '';
				if (stdout) output += stdout;
				if (stderr) output += stderr;

				return output || 'Command completed successfully (no output)';
			} catch (error) {
				const err = error as { stdout?: string; stderr?: string; message: string; code?: number };

				let errorOutput = '';
				if (err.stdout) errorOutput += err.stdout;
				if (err.stderr) errorOutput += err.stderr;
				if (!errorOutput) errorOutput = err.message;

				// Include exit code if available
				if (err.code !== undefined) {
					errorOutput = `Exit code: ${err.code}\n${errorOutput}`;
				}

				return errorOutput;
			}
		},
	};
}
