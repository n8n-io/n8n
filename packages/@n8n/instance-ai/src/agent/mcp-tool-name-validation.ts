import type { ToolsInput } from '@mastra/core/agent';

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
	return name.normalize('NFKC') === name && MCP_TOOL_NAME_PATTERN.test(name);
}

export function normalizeMcpToolName(name: string): string {
	return name
		.normalize('NFKC')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function validateMcpToolName(name: string, source: string): string {
	if (!isSafeMcpIdentifierName(name)) {
		throw new McpToolNameValidationError(
			`MCP tool "${name}" from ${source} has an invalid name`,
			name,
			source,
		);
	}
	return normalizeMcpToolName(name);
}

function findReservedSuffix(name: string, reservedToolNames: Map<string, string>): string | null {
	const lowerName = name.toLowerCase();
	for (const reservedName of reservedToolNames.values()) {
		const lowerReservedName = reservedName.toLowerCase();
		if (
			lowerName.endsWith(`_${lowerReservedName}`) ||
			lowerName.endsWith(`-${lowerReservedName}`)
		) {
			return reservedName;
		}
	}
	return null;
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
		reservedSuffixToolNames?: Map<string, string>;
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
			const reservedSuffix = options.reservedSuffixToolNames
				? findReservedSuffix(name, options.reservedSuffixToolNames)
				: null;
			if (reservedSuffix) {
				throw new McpToolNameValidationError(
					`MCP tool "${name}" from ${options.source} uses reserved suffix "${reservedSuffix}"`,
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
