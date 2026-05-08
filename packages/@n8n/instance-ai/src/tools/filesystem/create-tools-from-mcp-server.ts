import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import {
	GATEWAY_CONFIRMATION_REQUIRED_PREFIX,
	gatewayConfirmationRequiredPayloadSchema,
	instanceAiConfirmationSeveritySchema,
	type GatewayConfirmationRequiredPayload,
	type McpToolCallResult,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { convertJsonSchemaToZod } from 'zod-from-json-schema-v3';
import type { JSONSchema } from 'zod-from-json-schema-v3';

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
import type { LocalMcpServer } from '../../types';

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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const LOCAL_GATEWAY_MCP_SOURCE = 'local gateway MCP';

function warnSkippedLocalMcpSchema(logger: Logger | undefined) {
	return (error: McpSchemaSanitizationError) => {
		logger?.warn('Skipped local gateway MCP tool with unsupported schema', {
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

function warnSkippedLocalMcpTool(logger: Logger | undefined) {
	return (error: McpToolNameValidationError) => {
		logger?.warn('Skipped local gateway MCP tool with unsafe name', {
			toolName: error.toolName,
			source: error.source,
			reason: error.message,
		});
	};
}

/**
 * Build Mastra tools dynamically from the MCP tools advertised by a connected
 * local MCP server (e.g. the computer-use daemon).
 *
 * Each tool's input schema is converted from the daemon's JSON Schema definition
 * to a Zod schema so the LLM receives accurate parameter information. Falls back
 * to `z.record(z.unknown())` if conversion fails for a particular tool.
 *
 * When the daemon responds with `GATEWAY_CONFIRMATION_REQUIRED`, the tool
 * suspends the agent via Mastra's native `suspend()` mechanism. This persists
 * the confirmation request to the database, so it survives page reloads and
 * server restarts. On resume, the tool re-calls the daemon with the selected
 * decision token.
 *
 * The `toModelOutput` callback converts MCP content blocks (text and image)
 * into the AI SDK's multimodal format so the LLM receives images.
 */
export function createToolsFromLocalMcpServer(server: LocalMcpServer, logger?: Logger): ToolsInput {
	const tools: ToolsInput = {};
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
			// Convert JSON Schema → Zod (v3) so the LLM sees the actual parameter shapes.
			// McpTool.inputSchema properties are typed as Record<string, unknown> to
			// accommodate arbitrary JSON Schema values; the cast is safe here because
			// the daemon always sends valid JSON Schema objects.
			inputSchema = convertJsonSchemaToZod(mcpTool.inputSchema as JSONSchema);
		} catch {
			// Fallback: accept any object if conversion fails
			inputSchema = z.record(z.unknown());
		}

		const tool = createTool({
			id: toolName,
			description,
			inputSchema,
			suspendSchema: gatewayConfirmationSuspendSchema,
			resumeSchema: gatewayConfirmationResumeSchema,
			execute: async (args: Record<string, unknown>, ctx) => {
				const resumeData = ctx?.agent?.resumeData as
					| z.infer<typeof gatewayConfirmationResumeSchema>
					| undefined;
				const suspend = ctx?.agent?.suspend;

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
				if (result.isError && suspend) {
					const payload = tryParseGatewayConfirmationRequired(result);
					if (payload) {
						await suspend({
							requestId: nanoid(),
							message: `${toolName}: ${payload.description}`,
							severity: 'warning',
							inputType: 'resource-decision',
							resourceDecision: payload,
						});
						// suspend() never resolves — this line is unreachable but satisfies the type checker
						return result;
					}
				}

				return result;
			},
			toModelOutput: (result: unknown) => {
				// Mastra passes { toolCallId, input, output } — unwrap to get the actual MCP result.
				// Handle both shapes for forward-compatibility.
				const raw = (
					result !== null && typeof result === 'object' && 'output' in result
						? (result as { output: unknown }).output
						: result
				) as {
					content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
					structuredContent?: Record<string, unknown>;
				};

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

				// Convert MCP 'image' → Mastra 'media' (Mastra translates to 'image-data' for the provider)
				const value = raw.content.map((item) => {
					if (item.type === 'image') {
						return {
							type: 'media' as const,
							data: item.data ?? '',
							mediaType: item.mimeType ?? 'image/jpeg',
						};
					}
					return { type: 'text' as const, text: item.text ?? '' };
				});
				return { type: 'content', value };
			},
		});

		tools[toolName] = tool;
	}

	const sanitizedTools = sanitizeMcpToolSchemas(tools, {
		onError: warnSkippedLocalMcpSchema(logger),
	});
	const safeTools: ToolsInput = {};
	addSafeMcpTools(safeTools, sanitizedTools, {
		source: LOCAL_GATEWAY_MCP_SOURCE,
		claimedToolNames: createClaimedToolNames([]),
		warn: warnTool,
	});
	return safeTools;
}
