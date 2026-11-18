import type { McpServer } from '@modelcontextprotocol/server';
import type {
	McpServerCallerType,
	McpServerCallKind,
	McpServerCallStatus,
	McpServerToolInput,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { lazyImport } from '@n8n/utils/lazy-import';
import { z } from 'zod';

import type { ToolHandlerResult } from '@/modules/mcp/mcp.types';
import { shapeToStandardSchema } from '@/modules/mcp/tool-schema.util';

import type { McpServerEntity } from './database/mcp-server.entities';
import { joinLabel, matchTool, toLabel } from './mcp-server-insights';
import { McpServerStoreService, type ResolvedTool } from './mcp-server-store.service';
import { McpServerTargetsService } from './mcp-server-targets.service';

export interface RuntimeCaller {
	type: McpServerCallerType;
	/** What the logs show: an email, a key label, or "Anonymous". */
	label: string;
	userId?: string;
	apiKeyId?: string;
	sessionId?: string;
}

/** The slice of the SDK handler context this runtime reads. */
type HandlerContext = {
	mcpReq?: {
		envelope?: Record<string, unknown>;
		inputResponses?: Record<string, unknown>;
		elicitInput?: (params: {
			mode?: 'form';
			message: string;
			requestedSchema: { type: 'object'; properties: Record<string, unknown> };
		}) => Promise<{ action: 'accept' | 'decline' | 'cancel' }>;
	};
	signal?: AbortSignal;
};

const CONFIRM_KEY = 'confirm';
const MAX_STORED_CHARS = 100_000;
const WINDOW_MS = 60_000;
const MAX_INTENT_CHARS = 1000;

/** The extra input on every tool that carries the reason for the call. */
const INTENT_KEY = 'context';
const INTENT_DESCRIPTION =
	'In one sentence, say what the person wants to achieve with this call. Do not include secrets or personal data.';

const MISSING_TOOL_NAME = 'get_more_tools';
const MISSING_TOOL_DESCRIPTION =
	'Call this when none of the available tools can do what the person needs. Describe what you need. Nothing runs: the request is recorded so the server owner can add the tool.';

function stringifyForLog(value: unknown): string | null {
	if (value === undefined) return null;
	try {
		const text = typeof value === 'string' ? value : JSON.stringify(value);
		return text.length > MAX_STORED_CHARS ? `${text.slice(0, MAX_STORED_CHARS)}…` : text;
	} catch {
		return String(value);
	}
}

function inputToZod(input: McpServerToolInput): z.ZodTypeAny {
	let schema: z.ZodTypeAny;
	switch (input.type) {
		case 'number':
			schema = z.number();
			break;
		case 'boolean':
			schema = z.boolean();
			break;
		case 'object':
			schema = z.record(z.unknown());
			break;
		case 'array':
			schema = z.array(z.unknown());
			break;
		default:
			schema = z.string();
	}
	if (input.description) schema = schema.describe(input.description);
	return input.required ? schema : schema.optional();
}

function supportsFormElicitation(capabilities: unknown): boolean {
	const elicitation = isRecord(capabilities) ? capabilities.elicitation : undefined;
	if (!isRecord(elicitation)) return false;
	return 'form' in elicitation || !('url' in elicitation);
}

/** Calls per server and caller in the last minute. One process only (hack scope). */
@Service()
export class McpServerRateLimiter {
	private readonly hits = new Map<string, number[]>();

	/** Returns false when the caller is over the limit. 0 means no limit. */
	take(serverId: string, callerKey: string, limitPerMinute: number): boolean {
		if (limitPerMinute <= 0) return true;
		const key = `${serverId}:${callerKey}`;
		const now = Date.now();
		const recent = (this.hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
		if (recent.length >= limitPerMinute) {
			this.hits.set(key, recent);
			return false;
		}
		recent.push(now);
		this.hits.set(key, recent);
		return true;
	}
}

/**
 * Builds the per-request MCP server for one user-built server. Every tool call and
 * resource read goes through {@link McpServerRuntimeService.record}, the single
 * place that writes the call log.
 */
@Service()
export class McpServerRuntimeService {
	constructor(
		private readonly logger: Logger,
		private readonly store: McpServerStoreService,
		private readonly targets: McpServerTargetsService,
		private readonly rateLimiter: McpServerRateLimiter,
	) {}

	/** Enabled, available tools with their effective names. Used by the runtime and the playground. */
	async listCallableTools(server: McpServerEntity): Promise<ResolvedTool[]> {
		const tools = await this.store.resolveTools(await this.store.listToolRows(server.id));
		return tools.filter((tool) => tool.row.enabled && tool.target.available);
	}

	needsConfirmation(server: McpServerEntity, tool: ResolvedTool) {
		return (
			(tool.row.behavior === 'delete' && server.confirmDestructive) ||
			(tool.row.behavior === 'write' && server.confirmWrite)
		);
	}

	confirmMessage(server: McpServerEntity, tool: ResolvedTool, input: Record<string, unknown>) {
		const verb = tool.row.behavior === 'delete' ? 'deletes data' : 'changes data';
		const args = Object.keys(input).length ? `\n\nInput: ${JSON.stringify(input)}` : '';
		return `${server.name} wants to run "${tool.name}". This tool ${verb}${tool.row.behavior === 'delete' ? ' and you cannot undo it' : ''}. Do you approve?${args}`;
	}

	async build(server: McpServerEntity, caller: RuntimeCaller, clientName: string | null) {
		const { McpServer, inputRequired, inputResponse, CLIENT_CAPABILITIES_META_KEY } =
			await lazyImport<typeof import('@modelcontextprotocol/server')>(
				async () => await import('@modelcontextprotocol/server'),
			);

		const mcp: McpServer = new McpServer(
			{ name: server.name, version: '1.0.0' },
			{
				instructions:
					server.instructions.trim() ||
					`${server.name}: ${server.description || 'Tools built in n8n.'}`.trim(),
			},
		);

		const tools = await this.listCallableTools(server);
		for (const tool of tools) {
			const captureIntent =
				server.captureIntent && !tool.inputs.some((input) => input.name === INTENT_KEY);
			const shape = {
				...Object.fromEntries(tool.inputs.map((input) => [input.name, inputToZod(input)])),
				...(captureIntent
					? { [INTENT_KEY]: z.string().describe(INTENT_DESCRIPTION).optional() }
					: {}),
			} satisfies z.ZodRawShape;

			mcp.registerTool(
				tool.name,
				{
					title: tool.target.name,
					description: tool.description,
					inputSchema: shapeToStandardSchema(shape),
					annotations: {
						title: tool.target.name,
						readOnlyHint: tool.row.behavior === 'read',
						destructiveHint: tool.row.behavior === 'delete',
						openWorldHint: true,
					},
				},
				async (args: unknown, extra: unknown): Promise<ToolHandlerResult> => {
					const raw = isRecord(args) ? args : {};
					// The workflow must not see the reason, so it leaves the input here.
					const input = captureIntent
						? Object.fromEntries(Object.entries(raw).filter(([key]) => key !== INTENT_KEY))
						: raw;
					const stated = captureIntent ? raw[INTENT_KEY] : undefined;
					const intent = typeof stated === 'string' ? stated : undefined;
					const ctx = (extra ?? {}) as HandlerContext;

					if (!this.rateLimiter.take(server.id, caller.label, server.rateLimitPerMinute)) {
						await this.record(server, caller, clientName, {
							kind: 'tool',
							name: tool.name,
							status: 'rateLimited',
							input,
							intent,
							error: `Rate limit of ${server.rateLimitPerMinute} calls each minute reached.`,
						});
						return errorResult(
							`Rate limit reached: this server allows ${server.rateLimitPerMinute} calls each minute for each caller. Wait a minute, then try again.`,
						);
					}

					if (this.needsConfirmation(server, tool)) {
						const decision = await this.confirm(server, tool, input, ctx, {
							inputRequired,
							inputResponse,
							capabilitiesKey: CLIENT_CAPABILITIES_META_KEY,
						});
						if (decision.kind === 'ask') return decision.result;
						if (decision.kind === 'declined' || decision.kind === 'unsupported') {
							await this.record(server, caller, clientName, {
								kind: 'tool',
								name: tool.name,
								status: 'declined',
								input,
								intent,
								error: decision.message,
							});
							return errorResult(decision.message);
						}
					}

					return await this.runTool(server, tool, input, caller, clientName, ctx.signal, intent);
				},
			);
		}

		if (server.missingCapabilityTool && !tools.some((tool) => tool.name === MISSING_TOOL_NAME)) {
			mcp.registerTool(
				MISSING_TOOL_NAME,
				{
					title: 'Request a missing tool',
					description: MISSING_TOOL_DESCRIPTION,
					inputSchema: shapeToStandardSchema({
						request: z.string().describe('What you need to do, in one sentence.'),
						label: z
							.string()
							.describe(
								'A short name for the capability, as a verb and a noun with underscores, for example "cancel_order". Use the same name each time you need the same capability.',
							),
					}),
					annotations: { title: 'Request a missing tool', readOnlyHint: true },
				},
				async (args: unknown): Promise<ToolHandlerResult> => {
					if (!this.rateLimiter.take(server.id, caller.label, server.rateLimitPerMinute)) {
						return errorResult('Rate limit reached. Wait a minute, then try again.');
					}
					const request = isRecord(args) && typeof args.request === 'string' ? args.request : null;
					const label = isRecord(args) ? toLabel(args.label) : null;
					await this.record(server, caller, clientName, {
						kind: 'missing',
						name: MISSING_TOOL_NAME,
						status: 'ok',
						intent: joinLabel(label, request),
					});
					const toolNames = tools.map((tool) => tool.name);
					const match =
						matchTool(request ?? '', toolNames) ?? matchTool(label ?? '', toolNames, true);
					return {
						content: [
							{
								type: 'text',
								text: match
									? `The tool "${match}" can do this. Call it.`
									: 'No tool is available for this yet. The request is recorded for the server owner.',
							},
						],
					};
				},
			);
		}

		const resources = await this.store.listResources(server.id);
		for (const resource of resources) {
			const uri = this.store.resourceUri(server, resource);
			mcp.registerResource(
				resource.name,
				uri,
				{
					title: resource.name,
					description:
						resource.description ||
						(resource.kind === 'skill' ? `Skill: ${resource.name}` : resource.name),
					mimeType: resource.mimeType,
				},
				async () => {
					const started = Date.now();
					try {
						const text = await this.store.readResource(server, resource);
						await this.record(server, caller, clientName, {
							kind: 'resource',
							name: resource.name,
							status: 'ok',
							durationMs: Date.now() - started,
							output: `${text.length} characters`,
						});
						return { contents: [{ uri, mimeType: resource.mimeType, text }] };
					} catch (error) {
						await this.record(server, caller, clientName, {
							kind: 'resource',
							name: resource.name,
							status: 'error',
							durationMs: Date.now() - started,
							error: ensureError(error).message,
						});
						throw error;
					}
				},
			);
		}

		return mcp;
	}

	private async confirm(
		server: McpServerEntity,
		tool: ResolvedTool,
		input: Record<string, unknown>,
		ctx: HandlerContext,
		sdk: {
			inputRequired: typeof import('@modelcontextprotocol/server').inputRequired;
			inputResponse: typeof import('@modelcontextprotocol/server').inputResponse;
			capabilitiesKey: string;
		},
	): Promise<
		| { kind: 'approved' }
		| { kind: 'declined'; message: string }
		| { kind: 'unsupported'; message: string }
		| { kind: 'ask'; result: ToolHandlerResult }
	> {
		const message = this.confirmMessage(server, tool, input);
		const declined = {
			kind: 'declined' as const,
			message: `The person declined "${tool.name}". Nothing ran. Do not call it again unless the person asks.`,
		};

		// 2026-07-28 clients: multi-round-trip elicitation, the answer arrives on a retry.
		if (ctx.mcpReq?.envelope) {
			const answer = sdk.inputResponse(ctx.mcpReq.inputResponses, CONFIRM_KEY);
			if (answer.kind === 'elicit') {
				return answer.action === 'accept' ? { kind: 'approved' } : declined;
			}
			if (!supportsFormElicitation(ctx.mcpReq.envelope[sdk.capabilitiesKey])) {
				return {
					kind: 'unsupported',
					message: `"${tool.name}" needs a confirmation from the person, but this client cannot show one. Use a client that supports MCP elicitation, or ask the server owner to turn off the confirmation.`,
				};
			}
			return {
				kind: 'ask',
				result: sdk.inputRequired({
					inputRequests: {
						[CONFIRM_KEY]: sdk.inputRequired.elicit({
							message,
							requestedSchema: { type: 'object', properties: {} },
						}),
					},
				}),
			};
		}

		// 2025 clients: a push-style elicitation on the open request.
		try {
			const result = await ctx.mcpReq?.elicitInput?.({
				mode: 'form',
				message,
				requestedSchema: { type: 'object', properties: {} },
			});
			if (!result) throw new Error('No elicitation');
			return result.action === 'accept' ? { kind: 'approved' } : declined;
		} catch (error) {
			this.logger.debug('MCP servers: elicitation failed', { error: ensureError(error).message });
			return {
				kind: 'unsupported',
				message: `"${tool.name}" needs a confirmation from the person, but this client cannot show one. Use a client that supports MCP elicitation, or ask the server owner to turn off the confirmation.`,
			};
		}
	}

	/** Runs one tool and writes the log row. Shared with the playground. */
	async runTool(
		server: McpServerEntity,
		tool: ResolvedTool,
		input: Record<string, unknown>,
		caller: RuntimeCaller,
		clientName: string | null,
		signal?: AbortSignal,
		intent?: string,
	): Promise<ToolHandlerResult & { durationMs?: number; status?: McpServerCallStatus }> {
		const started = Date.now();
		try {
			const owner = await this.targets.getOwner(server.ownerId);
			const result = await this.targets.run(owner, tool.target, input, signal);
			const durationMs = Date.now() - started;
			await this.record(server, caller, clientName, {
				kind: 'tool',
				name: tool.name,
				status: result.ok ? 'ok' : 'error',
				durationMs,
				input,
				intent,
				output: result.output,
				error: result.error ?? null,
				executionId: result.executionId ?? null,
				workflowId: result.workflowId ?? null,
			});
			const text = result.ok
				? JSON.stringify(result.output ?? {}, null, 2)
				: `Error: ${result.error ?? 'The tool failed.'}`;
			return {
				content: [{ type: 'text', text }],
				...(result.ok ? {} : { isError: true }),
				durationMs,
				status: result.ok ? 'ok' : 'error',
			};
		} catch (error) {
			const message = ensureError(error).message;
			const durationMs = Date.now() - started;
			await this.record(server, caller, clientName, {
				kind: 'tool',
				name: tool.name,
				status: 'error',
				durationMs,
				input,
				intent,
				error: message,
			});
			return { ...errorResult(`Error: ${message}`), durationMs, status: 'error' };
		}
	}

	async record(
		server: McpServerEntity,
		caller: RuntimeCaller,
		clientName: string | null,
		call: {
			kind: McpServerCallKind;
			name: string;
			intent?: string | null;
			status: McpServerCallStatus;
			durationMs?: number;
			input?: unknown;
			output?: unknown;
			error?: string | null;
			executionId?: string | null;
			workflowId?: string | null;
		},
	) {
		try {
			await this.store.recordCall({
				serverId: server.id,
				kind: call.kind,
				name: call.name,
				callerType: caller.type,
				caller: caller.label.slice(0, 320),
				callerUserId: caller.userId ?? null,
				apiKeyId: caller.apiKeyId ?? null,
				clientName: clientName?.slice(0, 128) ?? null,
				status: call.status,
				durationMs: call.durationMs ?? null,
				input: stringifyForLog(call.input),
				output: stringifyForLog(call.output),
				error: call.error ?? null,
				executionId: call.executionId ?? null,
				workflowId: call.workflowId ?? null,
				intent: call.intent?.slice(0, MAX_INTENT_CHARS) ?? null,
				sessionId: caller.sessionId ?? null,
			});
		} catch (error) {
			this.logger.warn('MCP servers: could not record a call', {
				serverId: server.id,
				error: ensureError(error).message,
			});
		}
	}
}

function errorResult(text: string): ToolHandlerResult {
	return { isError: true, content: [{ type: 'text', text }] };
}
