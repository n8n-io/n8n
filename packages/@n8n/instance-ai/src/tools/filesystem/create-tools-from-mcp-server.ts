import {
	Tool,
	type AgentMessage,
	type BuiltTool,
	type ContentFile,
	type ContentText,
} from '@n8n/agents';
import {
	GATEWAY_CONFIRMATION_REQUIRED_PREFIX,
	gatewayConfirmationRequiredPayloadSchema,
	instanceAiConfirmationSeveritySchema,
	type GatewayConfirmationRequiredPayload,
	type McpToolCallResult,
} from '@n8n/api-types';
import type * as McpBrowserCredentialMod from '@n8n/mcp-browser/dist/tools/credential';
import { isRecord } from '@n8n/utils';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { convertJsonSchemaToZod } from 'zod-from-json-schema-v3';
import type { JSONSchema } from 'zod-from-json-schema-v3';

let _mcpBrowserCredentialMod: typeof McpBrowserCredentialMod | undefined;
function loadMcpBrowserCredential(): typeof McpBrowserCredentialMod {
	if (!_mcpBrowserCredentialMod) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('@n8n/mcp-browser/dist/tools/credential') as typeof McpBrowserCredentialMod;
		_mcpBrowserCredentialMod = mod;
	}
	return _mcpBrowserCredentialMod;
}

import {
	addSafeMcpTools,
	createClaimedToolNames,
	McpToolNameValidationError,
	validateMcpToolName,
} from '../../agent/mcp-tool-name-validation';
import {
	assertMcpJsonSchemaWithinLimits,
	McpSchemaSanitizationError,
	sanitizeMcpToolSchemas,
} from '../../agent/sanitize-mcp-schemas';
import type { Logger } from '../../logger';
import { createToolRegistry } from '../../tool-registry';
import type { InstanceAiToolRegistry, LocalMcpServer } from '../../types';

type McpContentBlock = McpToolCallResult['content'][number];
type ModelContentPart =
	| { type: 'text'; text: string }
	| { type: 'image-data'; data: string; mediaType: string }
	| { type: 'file-data'; data: string; mediaType: string };

// ---------------------------------------------------------------------------
// Schemas shared across all gateway-gated tools
// ---------------------------------------------------------------------------

const gatewayConfirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	inputType: z.literal('resource-decision'),
	resourceDecision: gatewayConfirmationRequiredPayloadSchema,
});

const gatewayResourceDecisionSchema = z.enum(['denyOnce', 'allowOnce', 'allowForSession']);

const gatewayConfirmationRequiredWirePayloadSchema =
	gatewayConfirmationRequiredPayloadSchema.extend({
		options: z.array(z.string()),
	});

const gatewayConfirmationResumeSchema = z.object({
	approved: z.boolean(),
	resourceDecision: gatewayResourceDecisionSchema.optional(),
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function isGatewayResourceDecision(
	option: string,
): option is z.infer<typeof gatewayResourceDecisionSchema> {
	return gatewayResourceDecisionSchema.safeParse(option).success;
}

function isMcpContentBlock(value: unknown): value is McpContentBlock {
	if (!isRecord(value)) return false;
	if (value.type === 'text') return typeof value.text === 'string';
	if (value.type === 'image') {
		return typeof value.data === 'string' && typeof value.mimeType === 'string';
	}
	if (value.type === 'resource') {
		if (!isRecord(value.resource)) return false;
		return typeof value.resource.uri === 'string' && typeof value.resource.blob === 'string';
	}
	return false;
}

function unwrapMcpToolResult(result: unknown): McpToolCallResult | undefined {
	const raw = isRecord(result) && 'output' in result ? result.output : result;
	if (!isRecord(raw) || !Array.isArray(raw.content)) return undefined;
	if (!raw.content.every(isMcpContentBlock)) return undefined;

	return {
		content: raw.content,
		...(isRecord(raw.structuredContent) ? { structuredContent: raw.structuredContent } : {}),
		...(typeof raw.isError === 'boolean' ? { isError: raw.isError } : {}),
	};
}

function tryParseGatewayConfirmationRequired(
	result: McpToolCallResult,
): GatewayConfirmationRequiredPayload | null {
	if (!result.isError) return null;
	const raw = result.content
		.filter((c) => c.type === 'text')
		.map((c) => c.text ?? '')
		.join('');

	// Unwrap JSON envelope `{"error":"GATEWAY_CONFIRMATION_REQUIRED::..."}` if present
	let candidate = raw;
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			'error' in parsed &&
			typeof (parsed as Record<string, unknown>).error === 'string'
		) {
			candidate = (parsed as Record<string, unknown>).error as string;
		}
	} catch {
		// Not JSON — use raw text as-is
	}

	if (!candidate.startsWith(GATEWAY_CONFIRMATION_REQUIRED_PREFIX)) return null;
	try {
		const json = JSON.parse(
			candidate.slice(GATEWAY_CONFIRMATION_REQUIRED_PREFIX.length),
		) as unknown;
		const parsed = gatewayConfirmationRequiredWirePayloadSchema.safeParse(json);
		if (!parsed.success) return null;

		const options = parsed.data.options.filter(isGatewayResourceDecision);
		if (options.length === 0) return null;

		return { ...parsed.data, options };
	} catch {
		return null;
	}
}

function mcpBlockToMessagePart(block: McpContentBlock): ContentText | ContentFile | undefined {
	if (block.type === 'text' && block.text) {
		return { type: 'text', text: block.text };
	}

	if (block.type === 'image' && block.data) {
		return {
			type: 'file',
			data: block.data,
			mediaType: block.mimeType || 'image/png',
		};
	}

	if (block.type === 'resource' && block.resource.blob) {
		return {
			type: 'file',
			data: block.resource.blob,
			mediaType: block.resource.mimeType ?? 'application/octet-stream',
		};
	}

	return undefined;
}

function mcpBlockToModelContentPart(block: McpContentBlock): ModelContentPart | undefined {
	if (block.type === 'text' && block.text) {
		return { type: 'text', text: block.text };
	}

	if (block.type === 'image' && block.data) {
		return {
			type: 'image-data',
			data: block.data,
			mediaType: block.mimeType || 'image/png',
		};
	}

	if (block.type === 'resource' && block.resource.blob) {
		return {
			type: 'file-data',
			data: block.resource.blob,
			mediaType: block.resource.mimeType ?? 'application/octet-stream',
		};
	}

	return undefined;
}

function isMcpMediaBlock(block: McpContentBlock): boolean {
	return block.type === 'image' || block.type === 'resource';
}

function buildNativeMcpMediaMessage(result: unknown): AgentMessage | undefined {
	const raw = unwrapMcpToolResult(result);
	if (!raw?.content.some(isMcpMediaBlock)) return undefined;

	const content = raw.content
		.map(mcpBlockToMessagePart)
		.filter((part): part is ContentText | ContentFile => part !== undefined);
	if (content.length === 0) return undefined;

	return { role: 'assistant', content };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const LOCAL_GATEWAY_MCP_SOURCE = 'local gateway MCP';

function warnSkippedLocalMcpSchema(logger: Logger) {
	return (error: McpSchemaSanitizationError) => {
		logger.warn('Skipped local gateway MCP tool with unsupported schema', {
			toolName: error.details.toolName,
			source: LOCAL_GATEWAY_MCP_SOURCE,
			path: error.details.path,
			depth: error.details.depth,
			maxDepth: error.details.maxDepth,
			limitType: error.details.limitType,
			limit: error.details.limit,
			reason: error.message,
		});
	};
}

function warnSkippedLocalMcpTool(logger: Logger) {
	return (error: McpToolNameValidationError) => {
		logger.warn('Skipped local gateway MCP tool with unsafe name', {
			toolName: error.toolName,
			source: error.source,
			reason: error.message,
		});
	};
}

/**
 * Build native tools dynamically from the MCP tools advertised by a connected
 * local MCP server (e.g. the computer-use daemon).
 *
 * Each tool's input schema is converted from the daemon's JSON Schema definition
 * to a Zod schema so the LLM receives accurate parameter information. Falls back
 * to `z.record(z.unknown())` if conversion fails for a particular tool.
 *
 * When the daemon responds with `GATEWAY_CONFIRMATION_REQUIRED`, the tool
 * suspends the agent via the native `suspend()` mechanism. This persists
 * the confirmation request to the database, so it survives page reloads and
 * server restarts. On resume, the tool re-calls the daemon with the selected
 * decision token.
 *
 * The `toModelOutput` callback converts MCP image blocks into AI SDK content
 * output parts so the LLM receives gateway screenshots as real multimodal input.
 */
export function createToolsFromLocalMcpServer(
	server: LocalMcpServer,
	logger: Logger,
): InstanceAiToolRegistry {
	const tools = createToolRegistry();
	const claimedToolNames = createClaimedToolNames([]);
	const warnTool = warnSkippedLocalMcpTool(logger);
	const warnSchema = warnSkippedLocalMcpSchema(logger);

	for (const mcpTool of server.getAvailableTools()) {
		const toolName = mcpTool.name;
		const description = mcpTool.description ?? toolName;

		try {
			const normalizedName = validateMcpToolName(toolName, LOCAL_GATEWAY_MCP_SOURCE);
			const claimedBy = claimedToolNames.get(normalizedName);
			if (claimedBy) {
				throw new McpToolNameValidationError(
					`MCP tool "${toolName}" from ${LOCAL_GATEWAY_MCP_SOURCE} conflicts with "${claimedBy}"`,
					toolName,
					LOCAL_GATEWAY_MCP_SOURCE,
				);
			}
			assertMcpJsonSchemaWithinLimits(mcpTool.inputSchema, { toolName });
			claimedToolNames.set(normalizedName, toolName);
		} catch (error) {
			if (error instanceof McpToolNameValidationError) {
				warnTool(error);
				continue;
			}
			if (error instanceof McpSchemaSanitizationError) {
				warnSchema(error);
				continue;
			}
			throw error;
		}

		let inputSchema: z.ZodTypeAny;
		try {
			if (toolName === 'browser_create_credential') {
				// when converting json schema the `inputSchema` has the correct shape and parsed to correct output
				// but during execution all unspecified keys from `data` and `resolveData` are stripped,
				// because the schema is converted back and forth and transformed to jsonSchema with
				// `additionalProperties=false`. Passing the schema directly avoids this.
				inputSchema = loadMcpBrowserCredential().browserCreateCredentialSchema;
			} else {
				// Convert JSON Schema → Zod (v3) so the LLM sees the actual parameter shapes.
				// McpTool.inputSchema properties are typed as Record<string, unknown> to
				// accommodate arbitrary JSON Schema values; the cast is safe here because
				// the daemon always sends valid JSON Schema objects.
				inputSchema = convertJsonSchemaToZod(mcpTool.inputSchema as JSONSchema);
			}
		} catch {
			// Fallback: accept any object if conversion fails
			inputSchema = z.record(z.unknown());
		}

		const baseTool = new Tool(toolName)
			.description(description)
			.input(inputSchema)
			.suspend(gatewayConfirmationSuspendSchema)
			.resume(gatewayConfirmationResumeSchema)
			.handler(async (args: Record<string, unknown>, ctx) => {
				const resumeData = ctx.resumeData;

				// Resume path: user has made a resource-access decision
				if (resumeData !== undefined && resumeData !== null) {
					if (!resumeData.resourceDecision) {
						// User denied — no decision provided
						return {
							content: [{ type: 'text', text: JSON.stringify({ error: 'Access denied by user' }) }],
							isError: true,
						};
					}
					// Re-call the daemon with the user's decision
					return await server.callTool({
						name: toolName,
						arguments: { ...args, _confirmation: resumeData.resourceDecision },
					});
				}

				// First-call path: strip any LLM-provided _confirmation key so the agent
				// cannot bypass the human confirmation flow by supplying its own token.
				const { _confirmation: _stripped, ...safeArgs } = args;
				const result = await server.callTool({ name: toolName, arguments: safeArgs });

				// If the daemon requires a resource-access confirmation, suspend the agent
				if (result.isError) {
					const payload = tryParseGatewayConfirmationRequired(result);
					if (payload && typeof ctx.suspend === 'function') {
						return await ctx.suspend({
							requestId: nanoid(),
							message: `${toolName}: ${payload.description}`,
							severity: 'warning',
							inputType: 'resource-decision',
							resourceDecision: payload,
						});
					}
				}

				return result;
			})
			.toModelOutput((result: unknown) => {
				const raw = unwrapMcpToolResult(result);

				if (!raw?.content || !Array.isArray(raw.content)) {
					return { type: 'text', value: JSON.stringify(result) };
				}

				const hasMedia = raw.content.some((item) => item.type === 'image');

				// When we have structuredContent and no media, prefer it as compact text
				if (raw.structuredContent && !hasMedia) {
					return {
						type: 'content',
						value: [{ type: 'text' as const, text: JSON.stringify(raw.structuredContent) }],
					};
				}

				const value = raw.content
					.map(mcpBlockToModelContentPart)
					.filter((part): part is ModelContentPart => part !== undefined);
				return { type: 'content', value };
			})
			.build();
		const tool = {
			...baseTool,
			toMessage: buildNativeMcpMediaMessage,
		} satisfies BuiltTool;

		tools.set(toolName, tool);
	}

	const sanitizedTools = sanitizeMcpToolSchemas(tools, {
		onError: warnSkippedLocalMcpSchema(logger),
	});
	const safeTools = createToolRegistry();
	addSafeMcpTools(safeTools, sanitizedTools, {
		source: LOCAL_GATEWAY_MCP_SOURCE,
		claimedToolNames: createClaimedToolNames([]),
		warn: warnTool,
	});
	return safeTools;
}
