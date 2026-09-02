import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { JSONSchema7 } from 'json-schema';
import { createHash } from 'node:crypto';

import type { McpCallToolResult, McpConnection } from './mcp-connection';
import { sanitizeToolName } from '../../sdk/tool';
import type { AgentMessage, ContentFile, ContentText } from '../../types/sdk/message';
import type { BuiltTool, InterruptibleToolContext, ToolContext } from '../../types/sdk/tool';

type McpContentBlock = McpCallToolResult['content'][number];

const MAX_TOOL_NAME_LENGTH = 64;
const TOOL_NAME_HASH_LENGTH = 8;

type ToolNameCandidate = {
	index: number;
	normalizedName: string;
	stableIdentity: string;
};

/**
 * Convert raw MCP tool definitions into BuiltTool instances.
 * Tool names are prefixed with the server name to prevent collisions.
 * Not publicly exported.
 */
export class McpToolResolver {
	resolve(connection: McpConnection, tools: Tool[]): BuiltTool[] {
		return ensureUniqueMcpToolNames(tools.map((tool) => this.resolveTool(connection, tool)));
	}

	private resolveTool(connection: McpConnection, tool: Tool): BuiltTool {
		const prefixedName = sanitizeToolName(`${connection.name}_${tool.name}`);
		const originalName = tool.name;

		const handler = async (
			input: unknown,
			ctx: ToolContext | InterruptibleToolContext,
		): Promise<unknown> => {
			const args = (input ?? {}) as Record<string, unknown>;
			return await connection.callTool(originalName, args, {
				abortSignal: ctx.abortSignal,
				modelToolName: ctx.toolName ?? prefixedName,
			});
		};

		const toMessage = (output: unknown): AgentMessage | undefined => {
			return buildRichMessage(output as McpCallToolResult);
		};

		const builtTool: BuiltTool = {
			name: prefixedName,
			description: tool.description ?? '',
			inputSchema: tool.inputSchema as JSONSchema7,
			handler,
			toMessage,
			mcpTool: true,
			mcpServerName: connection.name,
			mcpToolName: originalName,
		};

		return builtTool;
	}
}

export function ensureUniqueMcpToolNames(tools: BuiltTool[]): BuiltTool[] {
	const candidates = tools.map<ToolNameCandidate>((tool, index) => {
		const serverName = tool.mcpServerName;
		const originalName = tool.mcpToolName;
		const normalizedName =
			serverName !== undefined && originalName !== undefined
				? sanitizeToolName(`${serverName}_${originalName}`)
				: sanitizeToolName(tool.name);
		const stableIdentity = JSON.stringify([serverName ?? null, originalName ?? tool.name]);
		return { index, stableIdentity, normalizedName };
	});
	const candidatesByName = new Map<string, ToolNameCandidate[]>();
	for (const candidate of candidates) {
		const group = candidatesByName.get(candidate.normalizedName);
		if (group) {
			group.push(candidate);
		} else {
			candidatesByName.set(candidate.normalizedName, [candidate]);
		}
	}
	const resolvedNames = candidates.map(({ normalizedName }) => normalizedName);
	const assignedNames = new Set(resolvedNames);

	const collisionGroups = [...candidatesByName.entries()]
		.filter(([, group]) => group.length > 1)
		.sort(([left], [right]) => left.localeCompare(right));

	for (const [normalizedName, group] of collisionGroups) {
		const sortedGroup = [...group].sort((left, right) => {
			const nameComparison = left.stableIdentity.localeCompare(right.stableIdentity);
			return nameComparison !== 0 ? nameComparison : left.index - right.index;
		});

		for (const candidate of sortedGroup) {
			let attempt = 0;
			let uniqueName: string;
			do {
				uniqueName = appendStableSuffix(normalizedName, candidate.stableIdentity, attempt++);
			} while (assignedNames.has(uniqueName));

			resolvedNames[candidate.index] = uniqueName;
			assignedNames.add(uniqueName);
		}
	}

	return tools.map((tool, index) =>
		tool.name === resolvedNames[index] ? tool : { ...tool, name: resolvedNames[index] },
	);
}

function appendStableSuffix(name: string, stableIdentity: string, attempt: number): string {
	const hashSource = attempt === 0 ? stableIdentity : `${stableIdentity}:${attempt}`;
	const suffix = createHash('sha256')
		.update(hashSource)
		.digest('hex')
		.slice(0, TOOL_NAME_HASH_LENGTH);
	const prefixLength = MAX_TOOL_NAME_LENGTH - TOOL_NAME_HASH_LENGTH - 1;
	const prefix = name.slice(0, prefixLength).replace(/[_-]+$/, '');
	return `${prefix}_${suffix}`;
}

/**
 * Convert an MCP CallToolResult into a rich AgentMessage containing text and image content parts.
 * Returns undefined if the result contains only text (the tool-result JSON is sufficient for the LLM).
 * Returns an assistant Message with ContentFile parts for image blocks so multimodal models can process them.
 */
function buildRichMessage(result: McpCallToolResult): AgentMessage | undefined {
	if (!result?.content) return undefined;

	const hasImages = result.content.some((block) => block.type === 'image');
	if (!hasImages) return undefined;

	const contentParts: Array<ContentText | ContentFile> = [];

	for (const block of result.content) {
		const part = blockToContentPart(block);
		if (part) contentParts.push(part);
	}

	if (contentParts.length === 0) return undefined;

	return { role: 'assistant', content: contentParts };
}

function blockToContentPart(block: McpContentBlock): ContentText | ContentFile | undefined {
	if (block.type === 'text' && block.text) {
		return { type: 'text', text: block.text };
	}

	if (block.type === 'image' && block.data) {
		return {
			type: 'file',
			data: block.data,
			mediaType: block.mimeType ?? 'image/png',
		};
	}

	if (block.type === 'resource' && block.resource) {
		const text = 'text' in block.resource ? block.resource.text : block.resource.uri;
		return { type: 'text', text };
	}

	return undefined;
}
