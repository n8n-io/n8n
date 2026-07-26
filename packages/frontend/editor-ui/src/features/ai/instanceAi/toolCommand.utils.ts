export interface ExecuteCommandArgsView {
	command: string;
	cwd?: string;
}

export interface ExecuteCommandResultView {
	success?: boolean;
	exitCode?: number;
	stdout: string;
	stderr: string;
	executionTimeMs?: number;
}

const EXECUTE_COMMAND_TOOLS = new Set([
	'workspace_execute_command',
	'shell_execute',
	'execute_command',
]);

function asString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

export function isExecuteCommandTool(toolName: string): boolean {
	return EXECUTE_COMMAND_TOOLS.has(toolName);
}

export function extractExecuteCommandArgs(
	toolName: string,
	args: Record<string, unknown> | undefined,
): ExecuteCommandArgsView | undefined {
	if (!args || !isExecuteCommandTool(toolName)) return undefined;

	const command = asString(args.command);
	if (command === undefined) return undefined;

	return {
		command,
		cwd: asString(args.cwd),
	};
}

export function extractExecuteCommandResult(
	toolName: string,
	result: unknown,
): ExecuteCommandResultView | undefined {
	if (!isExecuteCommandTool(toolName) || !result || typeof result !== 'object') return undefined;

	const obj = result as Record<string, unknown>;
	const stdout = asString(obj.stdout);
	const stderr = asString(obj.stderr);

	// Require at least one stream field so incomplete streaming payloads fall back to JSON.
	if (stdout === undefined && stderr === undefined) return undefined;

	return {
		success: asBoolean(obj.success),
		exitCode: asNumber(obj.exitCode),
		stdout: stdout ?? '',
		stderr: stderr ?? '',
		executionTimeMs: asNumber(obj.executionTimeMs),
	};
}
