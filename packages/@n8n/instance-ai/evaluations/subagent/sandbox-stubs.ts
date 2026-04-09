/**
 * In-memory sandbox stubs for eval.
 *
 * The production builder agent writes code to a sandbox filesystem, runs tsc,
 * then calls submit-workflow with a file path. These stubs simulate that
 * environment so the agent follows its normal flow without a real sandbox.
 */

import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { layoutWorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import type { InstanceAiContext } from '../../src/types';
import { parseAndValidate, partitionWarnings } from '../../src/workflow-builder';
import { extractWorkflowCode } from '../../src/workflow-builder/extract-code';
import { ensureWebhookIds } from '../../src/tools/workflows/submit-workflow.tool';
import {
	buildCredentialMap,
	resolveCredentials,
} from '../../src/tools/workflows/resolve-credentials';

// ---------------------------------------------------------------------------
// In-memory filesystem
// ---------------------------------------------------------------------------

export class MemoryFs {
	private files = new Map<string, string>();

	write(path: string, content: string): void {
		this.files.set(this.normalize(path), content);
	}

	read(path: string): string | undefined {
		return this.files.get(this.normalize(path));
	}

	exists(path: string): boolean {
		return this.files.has(this.normalize(path));
	}

	list(dir: string): string[] {
		const prefix = this.normalize(dir).replace(/\/$/, '') + '/';
		return [...this.files.keys()].filter((k) => k.startsWith(prefix));
	}

	private normalize(path: string): string {
		return path.replace(/^~\/workspace/, '/home/daytona/workspace').replace(/^~/, '/home/daytona');
	}
}

// ---------------------------------------------------------------------------
// Sandbox tool stubs
// ---------------------------------------------------------------------------

export function createSandboxStubs(
	fs: MemoryFs,
	context: InstanceAiContext,
): Record<string, ToolsInput[string]> {
	return {
		write_file: createTool({
			id: 'write_file',
			description: 'Write content to a file in the sandbox.',
			inputSchema: z.object({
				file_path: z.string(),
				content: z.string(),
			}),
			execute: async ({ file_path, content }) => {
				fs.write(file_path, content);
				return { success: true, path: file_path, bytes: content.length };
			},
		}),

		edit_file: createTool({
			id: 'edit_file',
			description: 'Edit a file by replacing text.',
			inputSchema: z.object({
				file_path: z.string(),
				old_string: z.string(),
				new_string: z.string(),
			}),
			execute: async ({ file_path, old_string, new_string }) => {
				const content = fs.read(file_path);
				if (!content) return { success: false, error: `File not found: ${file_path}` };
				if (!content.includes(old_string)) {
					return { success: false, error: 'old_string not found in file' };
				}
				fs.write(file_path, content.replace(old_string, new_string));
				return { success: true };
			},
		}),

		read_file: createTool({
			id: 'read_file',
			description: 'Read a file from the sandbox.',
			inputSchema: z.object({
				file_path: z.string(),
			}),
			execute: async ({ file_path }) => {
				const content = fs.read(file_path);
				if (content === undefined) return { success: false, error: `File not found: ${file_path}` };
				return { success: true, content };
			},
		}),

		execute_command: createTool({
			id: 'execute_command',
			description: 'Execute a shell command in the sandbox.',
			inputSchema: z.object({
				command: z.string(),
			}),
			execute: async ({ command }) => {
				// tsc check: always report clean
				if (command.includes('tsc')) {
					return { exitCode: 0, stdout: '', stderr: '' };
				}
				// grep on node-types catalog: return empty (no catalog in eval)
				if (command.includes('grep') && command.includes('node-types')) {
					return { exitCode: 1, stdout: '', stderr: '' };
				}
				// Default: success with empty output
				return { exitCode: 0, stdout: '', stderr: '' };
			},
		}),

		'submit-workflow': createSubmitWorkflowStub(fs, context),
	};
}

// ---------------------------------------------------------------------------
// submit-workflow stub
//
// Reads code from the in-memory filesystem, parses and validates it using
// the same logic as build-workflow, then saves via the stubbed workflowService.
// ---------------------------------------------------------------------------

function createSubmitWorkflowStub(fs: MemoryFs, context: InstanceAiContext) {
	return createTool({
		id: 'submit-workflow',
		description:
			'Submit a workflow from a TypeScript file. Reads the file, validates it, and saves to n8n.',
		inputSchema: z.object({
			filePath: z.string().optional().describe('Path to the TypeScript workflow file'),
			workflowId: z.string().optional(),
			projectId: z.string().optional(),
			name: z.string().optional(),
		}),
		execute: async ({ filePath, workflowId, projectId, name }) => {
			const resolvedPath = filePath ?? '/home/daytona/workspace/src/workflow.ts';
			const code = fs.read(resolvedPath);

			if (!code) {
				return {
					success: false,
					errors: [`File not found: ${resolvedPath}`],
				};
			}

			let finalCode: string;
			try {
				finalCode = extractWorkflowCode(code);
			} catch (error) {
				return {
					success: false,
					errors: [error instanceof Error ? error.message : 'Failed to extract workflow code'],
				};
			}

			let result;
			try {
				result = parseAndValidate(finalCode);
			} catch (error) {
				return {
					success: false,
					errors: [error instanceof Error ? error.message : 'Failed to parse workflow code'],
				};
			}

			const { errors, informational } = partitionWarnings(result.warnings);

			if (errors.length > 0) {
				return {
					success: false,
					errors: errors.map(
						(e) => `[${e.code}]${e.nodeName ? ` (${e.nodeName})` : ''}: ${e.message}`,
					),
				};
			}

			const json = layoutWorkflowJSON(result.workflow);
			if (name) {
				json.name = name;
			} else if (!json.name && !workflowId) {
				return {
					success: false,
					errors: ['Workflow name is required for new workflows.'],
				};
			}

			const credentialMap = await buildCredentialMap(context.credentialService);
			await resolveCredentials(json, workflowId, context, credentialMap);
			await ensureWebhookIds(json, workflowId, context);

			try {
				const opts = projectId ? { projectId } : undefined;
				if (workflowId) {
					const updated = await context.workflowService.updateFromWorkflowJSON(
						workflowId,
						json,
						opts,
					);
					return {
						success: true,
						workflowId: updated.id,
						warnings:
							informational.length > 0
								? informational.map((w) => `[${w.code}]: ${w.message}`)
								: undefined,
					};
				} else {
					const created = await context.workflowService.createFromWorkflowJSON(json, opts);
					return {
						success: true,
						workflowId: created.id,
						warnings:
							informational.length > 0
								? informational.map((w) => `[${w.code}]: ${w.message}`)
								: undefined,
					};
				}
			} catch (error) {
				return {
					success: false,
					errors: [
						`Workflow save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					],
				};
			}
		},
	});
}
