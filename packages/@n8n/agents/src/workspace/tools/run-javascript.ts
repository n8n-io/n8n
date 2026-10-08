import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { Tool } from '../../sdk/tool';
import type { BuiltTool } from '../../types/sdk/tool';
import type { CommandResult, WorkspaceFilesystem, WorkspaceSandbox } from '../types';

export const WORKSPACE_RUN_TIMEOUT_MS = 60_000;

const SNIPPET_DIR = '.n8n-run';

export const runJavascriptInputSchema = z
	.object({
		path: z
			.string()
			.min(1)
			.optional()
			.describe(
				'Path of the JavaScript file, relative to the workspace root (absolute paths must be under it)',
			),
		code: z
			.string()
			.min(1)
			.optional()
			.describe(
				'JavaScript source to run as a Scratch File. If both path and code are set, code is used.',
			),
	})
	.refine((value) => Boolean(value.path) || Boolean(value.code), {
		message: 'Provide path or code',
	});

const runJavascriptOutputSchema = z.object({
	exitCode: z.number(),
	stdout: z.string(),
	stderr: z.string(),
	executionTimeMs: z.number(),
});

function formatRunFailure(result: CommandResult): string {
	return `JavaScript run failed (exitCode=${result.exitCode}, timedOut=${Boolean(result.timedOut)})\n${result.stderr}\n${result.stdout}`;
}

export function createRunJavascriptTool(
	sandbox: WorkspaceSandbox,
	filesystem: WorkspaceFilesystem,
): BuiltTool {
	return new Tool('workspace_run_javascript')
		.description(
			'Run a JavaScript file in the sandbox with node. Provide path or code. If both are set, code is used. Read Attachments from `$N8N_UPLOADS_DIR` or `$N8N_UPLOADS_MANIFEST`. Write files the user should retrieve only under `$N8N_OUTPUTS_DIR`. This tool has a 60 second limit. Use `workspace_execute_command` for longer jobs.',
		)
		.input(runJavascriptInputSchema)
		.output(runJavascriptOutputSchema)
		.handler(async (input, ctx) => {
			if (!sandbox.executeCommand) {
				throw new Error('Sandbox does not support command execution');
			}

			let scriptPath: string;
			if (input.code) {
				scriptPath = `${SNIPPET_DIR}/${randomUUID()}.js`;
				await filesystem.mkdir(SNIPPET_DIR, {
					recursive: true,
					abortSignal: ctx.abortSignal,
				});
				await filesystem.writeFile(scriptPath, input.code, {
					overwrite: true,
					abortSignal: ctx.abortSignal,
				});
			} else if (input.path) {
				scriptPath = input.path;
			} else {
				throw new Error('Provide path or code');
			}

			const result = await sandbox.executeCommand('node', [scriptPath], {
				timeout: WORKSPACE_RUN_TIMEOUT_MS,
				abortSignal: ctx.abortSignal,
			});

			if (result.success === false || result.exitCode !== 0 || result.timedOut) {
				throw new Error(formatRunFailure(result));
			}

			return {
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
				executionTimeMs: result.executionTimeMs,
			};
		})
		.build();
}
