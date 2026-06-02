/** Daytona / snapshot tests use this workspace root; n8n-sandbox-service uses `/home/user/workspace`. */
export const SANDBOX_WORKSPACE_ROOT = '/home/daytona/workspace';

export const SANDBOX_KNOWLEDGE_BASE_DIR = 'knowledge-base';
export const SANDBOX_KNOWLEDGE_BASE_PATH = `${SANDBOX_WORKSPACE_ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}`;
export const SANDBOX_KNOWLEDGE_BASE_BEST_PRACTICES_DIR = 'best-practices';

/** Absolute path to the baked-in best-practices index inside the sandbox workspace. */
export const SANDBOX_KNOWLEDGE_BASE_INDEX_PATH = `${SANDBOX_WORKSPACE_ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${SANDBOX_KNOWLEDGE_BASE_BEST_PRACTICES_DIR}/index.json`;

// Baked-in KB lives under …/workspace/knowledge-base/… inside the sandbox.
const SANDBOX_KNOWLEDGE_BASE_PATH_PATTERN = /(?:^|\/)workspace\/knowledge-base(?:\/|$)/i;

const KNOWLEDGE_BASE_WORKSPACE_TOOLS = new Set([
	'workspace_read_file',
	'workspace_execute_command',
	'workspace_list_files',
	'workspace_file_stat',
]);

function getWorkspacePathArg(args?: Record<string, unknown>): string | undefined {
	if (typeof args?.path === 'string') return args.path;
	return undefined;
}

function getWorkspaceCommandArg(args?: Record<string, unknown>): string | undefined {
	if (typeof args?.command === 'string') return args.command;
	return undefined;
}

function getWorkspaceCwdArg(args?: Record<string, unknown>): string | undefined {
	if (typeof args?.cwd === 'string') return args.cwd;
	return undefined;
}

function touchesSandboxKnowledgeBasePath(value: string): boolean {
	return SANDBOX_KNOWLEDGE_BASE_PATH_PATTERN.test(value);
}

/** True when a workspace tool call targets the baked-in sandbox knowledge base. */
export function isKnowledgeBaseWorkspaceToolCall(
	toolName: string,
	args?: Record<string, unknown>,
): boolean {
	if (!KNOWLEDGE_BASE_WORKSPACE_TOOLS.has(toolName)) return false;

	const path = getWorkspacePathArg(args);
	if (path && touchesSandboxKnowledgeBasePath(path)) return true;

	const command = getWorkspaceCommandArg(args);
	if (command && touchesSandboxKnowledgeBasePath(command)) return true;

	const cwd = getWorkspaceCwdArg(args);
	if (cwd && touchesSandboxKnowledgeBasePath(cwd)) return true;

	return false;
}
