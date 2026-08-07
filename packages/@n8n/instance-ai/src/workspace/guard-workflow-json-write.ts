/**
 * Full `.workflow.json` rewrites via `workspace_write_file` force the model to
 * stream the entire WorkflowJSON as a tool argument. On large workflows that
 * hangs the assistant on "Writing file" and can leave Stop ineffective until
 * the stream finishes (see GitHub #35862).
 */
export const MAX_WORKFLOW_JSON_WRITE_CHARS = 8_192;

export const WORKFLOW_JSON_WRITE_GUIDANCE =
	'Refusing to overwrite a large .workflow.json file via workspace_write_file. ' +
	'For edits, call workflows(action="get-as-code", workflowId), apply the smallest ' +
	'TypeScript change to a .workflow.ts file (prefer workspace_str_replace_file), then ' +
	'build-workflow with that filePath. Targeted JSON patches must use workspace_str_replace_file ' +
	'(or build-workflow sourceCode), never a full JSON rewrite.';

export const GET_JSON_EDITING_GUIDANCE =
	'For workflow edits, call workflows(action="get-as-code", workflowId), apply the smallest ' +
	'TypeScript change, write or patch a .workflow.ts file (prefer workspace_str_replace_file), ' +
	'then build-workflow. Do not rewrite the full WorkflowJSON with workspace_write_file — ' +
	'large JSON rewrites hang the assistant.';

const WORKFLOW_JSON_PATH = /\.workflow\.json$/i;

export function isOversizedWorkflowJsonWrite(path: string, content: string): boolean {
	return WORKFLOW_JSON_PATH.test(path) && content.length > MAX_WORKFLOW_JSON_WRITE_CHARS;
}

interface WritableWorkspaceTool {
	name: string;
	description?: string;
	systemInstruction?: string;
	handler?: (input: unknown, ctx: unknown) => Promise<unknown>;
}

/**
 * Wraps `workspace_write_file` so oversized `.workflow.json` full rewrites fail
 * fast with remediation instead of hanging the chat.
 */
export function guardWorkspaceWriteFileTool<T extends WritableWorkspaceTool>(tool: T): T {
	if (tool.name !== 'workspace_write_file' || !tool.handler) return tool;

	const inner = tool.handler;
	const priorInstruction = tool.systemInstruction?.trim();
	const systemInstruction = [
		priorInstruction,
		'Never rewrite an entire .workflow.json with workspace_write_file. Prefer get-as-code + .workflow.ts + workspace_str_replace_file, then build-workflow.',
	]
		.filter(Boolean)
		.join('\n');

	return {
		...tool,
		systemInstruction,
		handler: async (input: unknown, ctx: unknown) => {
			if (isRecord(input) && typeof input.path === 'string' && typeof input.content === 'string') {
				if (isOversizedWorkflowJsonWrite(input.path, input.content)) {
					throw new Error(WORKFLOW_JSON_WRITE_GUIDANCE);
				}
			}
			return await inner(input, ctx);
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
