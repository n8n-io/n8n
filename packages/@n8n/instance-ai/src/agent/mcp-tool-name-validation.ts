import type { ToolsInput } from '@mastra/core/agent';
import { isSafeObjectKey } from '@n8n/api-types';

export class McpToolNameValidationError extends Error {
	constructor(
		message: string,
		readonly toolName: string,
		readonly source: string,
	) {
		super(message);
		this.name = 'McpToolNameValidationError';
	}
}

const MCP_TOOL_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

export function isSafeMcpIdentifierName(name: string): boolean {
	const normalizedName = name.normalize('NFKC');
	return (
		normalizedName === name &&
		MCP_TOOL_NAME_PATTERN.test(name) &&
		isSafeObjectKey(normalizedName.toLowerCase())
	);
}

export function normalizeMcpToolName(name: string): string {
	return name
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

export function validateMcpToolName(name: string, source: string): string {
	if (!isSafeMcpIdentifierName(name)) {
		throw new McpToolNameValidationError(
			`MCP tool "${name}" from ${source} has an invalid name`,
			name,
			source,
		);
	}
	return normalizeMcpToolName(name);
}

export function createClaimedToolNames(names: Iterable<string>): Map<string, string> {
	const claimed = new Map<string, string>();
	for (const name of names) {
		claimed.set(normalizeMcpToolName(name), name);
	}
	return claimed;
}

export function addSafeMcpTools(
	target: ToolsInput,
	sourceTools: ToolsInput,
	options: {
		source: string;
		claimedToolNames: Map<string, string>;
		warn?: (error: McpToolNameValidationError) => void;
	},
): void {
	for (const [name, tool] of Object.entries(sourceTools)) {
		try {
			const normalizedName = validateMcpToolName(name, options.source);
			const claimedBy = options.claimedToolNames.get(normalizedName);
			if (claimedBy) {
				throw new McpToolNameValidationError(
					`MCP tool "${name}" from ${options.source} conflicts with "${claimedBy}"`,
					name,
					options.source,
				);
			}
			options.claimedToolNames.set(normalizedName, name);
			target[name] = tool;
		} catch (error) {
			if (error instanceof McpToolNameValidationError) {
				options.warn?.(error);
				continue;
			}
			throw error;
		}
	}
}
