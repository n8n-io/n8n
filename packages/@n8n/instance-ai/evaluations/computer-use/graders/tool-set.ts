// ---------------------------------------------------------------------------
// Tool name set for the computer-use MCP server.
//
// The agent sees these tool names verbatim — they're what shows up in the SSE
// trace `toolName` field for tool-call/tool-result events. Native instance-ai
// tools use hyphenated names (build-workflow, run-workflow); computer-use
// tools use snake_case, which is what the daemon advertises over MCP.
// ---------------------------------------------------------------------------

const FILESYSTEM_TOOLS = [
	'read_file',
	'list_files',
	'get_file_tree',
	'search_files',
	'write_file',
	'edit_file',
	'create_directory',
	'delete',
	'move',
	'copy_file',
] as const;

const SHELL_TOOLS = ['shell_execute'] as const;

const FIXED_COMPUTER_USE_TOOLS = new Set<string>([...FILESYSTEM_TOOLS, ...SHELL_TOOLS]);

const COMPUTER_USE_PREFIXES = ['browser_', 'screen_', 'mouse_', 'keyboard_'] as const;

/** Whether this tool name belongs to the computer-use MCP server. */
export function isComputerUseTool(toolName: string): boolean {
	if (FIXED_COMPUTER_USE_TOOLS.has(toolName)) return true;
	return COMPUTER_USE_PREFIXES.some((prefix) => toolName.startsWith(prefix));
}
