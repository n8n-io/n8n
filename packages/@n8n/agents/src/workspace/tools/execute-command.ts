import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { WorkspaceSandbox } from '../types';

export function createExecuteCommandTool(sandbox: WorkspaceSandbox): BuiltTool {
	return new Tool('workspace_execute_command')
		.description('Execute a shell command in the sandbox')
		.input(
			z.object({
				command: z.string().describe('The shell command to execute'),
				cwd: z.string().optional().describe('Working directory for the command'),
				timeout: z.number().optional().describe('Timeout in milliseconds'),
			}),
		)
		.output(
			z.object({
				success: z.boolean(),
				exitCode: z.number(),
				stdout: z.string(),
				stderr: z.string(),
				executionTimeMs: z.number(),
			}),
		)
		.handler(async (input) => {
			if (!sandbox.executeCommand) {
				throw new Error('Sandbox does not support command execution');
			}
			const result = await sandbox.executeCommand(input.command, undefined, {
				cwd: input.cwd,
				timeout: input.timeout,
			});
			return {
				success: result.success,
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
				executionTimeMs: result.executionTimeMs,
			};
		})
		.build();
}
