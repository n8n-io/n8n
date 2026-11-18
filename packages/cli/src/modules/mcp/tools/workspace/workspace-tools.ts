import { createWorkspaceTools, type BuiltTool } from '@n8n/agents';
import type { User } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import type { McpWorkspaceService } from '../../mcp-workspace.service';
import type { RegisterToolFn, ToolDefinition } from '../../mcp.types';

export const OPEN_WORKSPACE_TOOL_NAME = 'open_workspace';
export const WORKSPACE_READ_FILE_TOOL_NAME = 'workspace_read_file';
export const WORKSPACE_WRITE_FILE_TOOL_NAME = 'workspace_write_file';
export const WORKSPACE_STR_REPLACE_FILE_TOOL_NAME = 'workspace_str_replace_file';
export const WORKSPACE_LIST_FILES_TOOL_NAME = 'workspace_list_files';
export const WORKSPACE_EXECUTE_COMMAND_TOOL_NAME = 'workspace_execute_command';

/** The key every workspace tool takes: the server is stateless, so the caller names its workspace. */
export const workspaceKeySchema = z
	.string()
	.optional()
	.describe(
		'Which of your workspaces to use. Omit for your default workspace. Use the key that open_workspace returned.',
	);

const pathDescription =
	'Path relative to the workspace root (an absolute path must be under the root).';

/** Finds the `@n8n/agents` workspace tool of the same name, bound to the opened workspace. */
function findWorkspaceTool(tools: BuiltTool[], name: string): BuiltTool {
	const tool = tools.find((candidate) => candidate.name === name);
	if (!tool?.handler) throw new Error(`Workspace tool ${name} is not available in this sandbox`);
	return tool;
}

function toResult(output: unknown) {
	const structuredContent = isRecord(output) ? output : { result: output };
	const isError = isRecord(output) && output.success === false;
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(structuredContent, null, 2) }],
		structuredContent,
		...(isError ? { isError: true } : {}),
	};
}

/**
 * One of the Assistant's own workspace tools (`@n8n/agents`), exposed over MCP.
 * Every call opens (or reattaches) the caller's workspace by key and runs the
 * same tool handler the Assistant used natively, with the same path scoping.
 */
function defineWorkspaceTool<Shape extends z.ZodRawShape>(
	user: User,
	workspaceService: McpWorkspaceService,
	name: string,
	description: string,
	readOnly: boolean,
	shape: Shape,
): ToolDefinition<Shape & { workspaceKey: typeof workspaceKeySchema }> {
	return {
		name,
		config: {
			description,
			inputSchema: { ...shape, workspaceKey: workspaceKeySchema },
			annotations: {
				title: name,
				readOnlyHint: readOnly,
				destructiveHint: !readOnly,
				idempotentHint: readOnly,
				openWorldHint: false,
			},
		},
		handler: async (args) => {
			const { workspaceKey, ...toolArgs } = args;
			const { workspace } = await workspaceService.open(user, workspaceKey);
			const tool = findWorkspaceTool(createWorkspaceTools(workspace), name);
			const output = await tool.handler?.(toolArgs, {});
			return toResult(output);
		},
	};
}

export function registerWorkspaceTools(
	register: RegisterToolFn,
	user: User,
	workspaceService: McpWorkspaceService,
): void {
	register(createOpenWorkspaceTool(user, workspaceService));
	register(
		defineWorkspaceTool(
			user,
			workspaceService,
			WORKSPACE_READ_FILE_TOOL_NAME,
			'Read a file of your workspace in the build sandbox. The workspace holds the n8n workflow SDK, the node type catalog (node-types/index.txt), the knowledge base (knowledge-base/index.json: best practices, templates, SDK reference) and your workflow sources under src/.',
			true,
			{
				path: z.string().describe(pathDescription),
				encoding: z.enum(['utf-8', 'base64']).optional().describe('File encoding (default: utf-8)'),
			},
		),
	);
	register(
		defineWorkspaceTool(
			user,
			workspaceService,
			WORKSPACE_WRITE_FILE_TOOL_NAME,
			'Write a file in your workspace. Put workflow sources under src/workflows/<name>.workflow.ts, then build them with build_workflow.',
			false,
			{
				path: z.string().describe(pathDescription),
				content: z.string().describe('Content to write to the file'),
				recursive: z
					.boolean()
					.optional()
					.describe('Create parent directories if they do not exist'),
			},
		),
	);
	register(
		defineWorkspaceTool(
			user,
			workspaceService,
			WORKSPACE_STR_REPLACE_FILE_TOOL_NAME,
			'Edit a file in your workspace with exact string replacements, applied atomically. Prefer this over rewriting a whole file.',
			false,
			{
				path: z.string().describe(pathDescription),
				replacements: z
					.array(
						z.object({
							old_str: z
								.string()
								.describe('Exact text to replace. Must match exactly and be unique.'),
							new_str: z.string().describe('Replacement text to write in place of old_str.'),
						}),
					)
					.min(1)
					.describe('Ordered exact string replacements applied atomically.'),
			},
		),
	);
	register(
		defineWorkspaceTool(
			user,
			workspaceService,
			WORKSPACE_LIST_FILES_TOOL_NAME,
			'List the files of a directory in your workspace.',
			true,
			{
				path: z.string().describe('Directory path to list, relative to the workspace root'),
				recursive: z.boolean().optional().describe('List files recursively'),
			},
		),
	);
	register(
		defineWorkspaceTool(
			user,
			workspaceService,
			WORKSPACE_EXECUTE_COMMAND_TOOL_NAME,
			'Run a shell command in your workspace sandbox (for example `npx tsc --noEmit` on a workflow source, or `grep` over the knowledge base). The sandbox is off the n8n host and has no access to it.',
			false,
			{
				command: z.string().describe('The shell command to run in the sandbox'),
				cwd: z.string().optional().describe('Working directory, relative to the workspace root'),
				timeout: z.number().optional().describe('Timeout in milliseconds'),
			},
		),
	);
}

const openWorkspaceInputSchema = {
	key: z
		.string()
		.optional()
		.describe(
			'A name for the workspace, 1 to 64 letters, digits, dots, underscores or dashes. Omit for your default workspace. The same key reattaches to the same workspace later.',
		),
} satisfies z.ZodRawShape;

export function createOpenWorkspaceTool(
	user: User,
	workspaceService: McpWorkspaceService,
): ToolDefinition<typeof openWorkspaceInputSchema> {
	return {
		name: OPEN_WORKSPACE_TOOL_NAME,
		config: {
			description:
				'Open your build workspace: a sandbox with the n8n workflow SDK installed and typed for this instance, the node type catalog, and the knowledge base. Call it once, then write workflow sources with workspace_write_file and build them with build_workflow. Reattaches to the same workspace on later calls with the same key.',
			inputSchema: openWorkspaceInputSchema,
			annotations: {
				title: 'Open Workspace',
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({ key }) => {
			const { workspaceKey, root } = await workspaceService.open(user, key);
			const output = {
				workspaceKey,
				root,
				layout: {
					'src/workflows/': 'your workflow sources (*.workflow.ts)',
					'node-types/index.txt': 'the node type catalog of this instance',
					'knowledge-base/index.json': 'best practices, templates and the SDK reference',
					'package.json': 'the pinned @n8n/workflow-sdk and tsx',
				},
				note: `Paths in workspace tools are relative to ${root}. Build a source with build_workflow({ workspaceKey: "${workspaceKey}", filePath: "src/workflows/<name>.workflow.ts" }).`,
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		},
	};
}
