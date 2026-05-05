import { Tool, type BuiltTool } from '@n8n/agents';
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

import { sanitizeMcpToolSchemas } from '../../agent/sanitize-mcp-schemas';
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

const gatewayConfirmationResumeSchema = z.object({
	approved: z.boolean(),
	resourceDecision: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

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
		const parsed = gatewayConfirmationRequiredPayloadSchema.safeParse(json);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

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
 * The `toModelOutput` callback converts MCP content blocks (text and image)
 * into the AI SDK's multimodal format so the LLM receives images.
 */
export function createToolsFromLocalMcpServer(server: LocalMcpServer): Record<string, BuiltTool> {
	const tools: Record<string, BuiltTool> = {};

	for (const mcpTool of server.getAvailableTools()) {
		const toolName = mcpTool.name;
		const description = mcpTool.description ?? toolName;

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

		const tool = new Tool(toolName)
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

				// Convert MCP image content into the native model-output media part.
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
			})
			.build();

		tools[toolName] = tool;
	}

	return sanitizeMcpToolSchemas(tools);
}
