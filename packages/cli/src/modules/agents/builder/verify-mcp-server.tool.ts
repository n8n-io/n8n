import type { BuiltTool, CredentialProvider, McpClient, ToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { McpAuthenticationSchemaTypes } from '@n8n/api-types';
import type { CustomFetch } from '@n8n/backend-network';
import { z } from 'zod';

import type { OauthService } from '@/oauth/oauth.service';

import { BUILDER_TOOLS } from './builder-tool-names';
import { buildMcpClientForServer } from '../json-config/mcp-client-factory';

export interface VerifyMcpServerDeps {
	agentId?: string;
	credentialProvider: CredentialProvider;
	oauthService: OauthService;
	projectId: string;
	proxyFetch: CustomFetch;
	/** When verification succeeds with a credential, writes it into the matching
	 *  mcpServers entry so the builder can skip read_config → patch_config. */
	applyCredentialToMcpServer?: (
		serverName: string,
		credentialId: string,
	) => Promise<{ applied: boolean }>;
}

/** Default deadline for the whole verify operation (connect + listTools) when the
 *  caller does not provide `connectionTimeoutMs`. Matches the Instance AI MCP registry default. */
const DEFAULT_MCP_VERIFICATION_TIMEOUT_MS = 10_000;

/**
 * Race `client.listTools()` against a timeout and the run's abort signal.
 * Callers are responsible for closing `client` on rejection — the tool
 * handler's own `finally` already does this on every exit path, so this
 * helper only decides when to give up waiting.
 */
async function listToolsWithinDeadline(
	client: McpClient,
	timeoutMs: number,
	abortSignal: AbortSignal | undefined,
): Promise<Awaited<ReturnType<McpClient['listTools']>>> {
	if (abortSignal?.aborted) {
		throw new Error('MCP server verification was cancelled');
	}

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	let onAbort: (() => void) | undefined;

	const control = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`MCP server verification timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		if (abortSignal) {
			onAbort = () => reject(new Error('MCP server verification was cancelled'));
			abortSignal.addEventListener('abort', onAbort, { once: true });
		}
	});

	try {
		return await Promise.race([client.listTools(), control]);
	} finally {
		if (timeoutId !== undefined) clearTimeout(timeoutId);
		if (onAbort) abortSignal?.removeEventListener('abort', onAbort);
	}
}

/**
 * Input schema mirrors the required subset of `McpServerConfigSchema` that the
 * builder can have in hand before writing the config. The credential field is
 * optional here so the tool can also be used to test unauthenticated servers.
 *
 * `toolFilter` and `approval` are intentionally excluded — they have no bearing
 * on whether the underlying transport connects, and simplifying the input keeps
 * the LLM context small.
 */
const verifyMcpServerInputSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-zA-Z0-9_-]+$/)
		.describe('The server name (used as the tool-name prefix)'),
	url: z.string().min(1).describe('The MCP server endpoint URL'),
	transport: z
		.enum(['sse', 'streamableHttp'])
		.default('streamableHttp')
		.describe('Transport type. Defaults to streamableHttp'),
	authentication: z
		.union([McpAuthenticationSchemaTypes, z.string().endsWith('McpOAuth2Api')])
		.default('none')
		.describe('Authentication scheme'),
	credential: z
		.string()
		.optional()
		.describe(
			'Credential id returned by ask_credential. Required when authentication is not "none"',
		),
	connectionTimeoutMs: z
		.number()
		.int()
		.min(1)
		.max(120_000)
		.optional()
		.describe(
			'Timeout in milliseconds for the whole verification (connect + list tools). Defaults to 10000ms',
		),
});

type VerifyMcpServerInput = z.infer<typeof verifyMcpServerInputSchema>;

export function buildVerifyMcpServerTool(deps: VerifyMcpServerDeps): BuiltTool {
	return new Tool(BUILDER_TOOLS.VERIFY_MCP_SERVER)
		.description(
			'Test connectivity to an MCP server before adding it to the agent config. ' +
				'Establishes a temporary connection, lists the available tools, then closes the connection. ' +
				'Returns { ok: true, tools: [{ name, description }] } on success, or ' +
				'{ ok: false, error: string } on failure. ' +
				'When a credential is provided and a matching mcpServers entry already exists, ' +
				'a successful verify also writes the credential into that entry ' +
				'({ credentialApplied: true, configMutated: true, agentId }) — no read_config/patch_config follow-up. ' +
				'Call this after ask_credential when authentication is not "none".',
		)
		.input(verifyMcpServerInputSchema)
		.handler(async (input: VerifyMcpServerInput, ctx: ToolContext) => {
			const timeoutMs = input.connectionTimeoutMs ?? DEFAULT_MCP_VERIFICATION_TIMEOUT_MS;
			let client: McpClient | undefined;
			try {
				client = await buildMcpClientForServer(
					{
						name: input.name,
						url: input.url,
						transport: input.transport,
						authentication: input.authentication,
						credential: input.credential,
						connectionTimeoutMs: timeoutMs,
					},
					deps,
				);
				const tools = await listToolsWithinDeadline(client, timeoutMs, ctx.abortSignal);
				const mappedTools = tools.map((t) => ({
					name: t.name,
					description: t.description ?? '',
				}));

				if (input.credential && deps.applyCredentialToMcpServer) {
					try {
						const { applied } = await deps.applyCredentialToMcpServer(input.name, input.credential);
						if (applied && deps.agentId) {
							return {
								ok: true,
								tools: mappedTools,
								credentialApplied: true,
								configMutated: true,
								agentId: deps.agentId,
							};
						}
					} catch {
						return {
							ok: true,
							tools: mappedTools,
							credentialApplied: false,
						};
					}
				}

				return {
					ok: true,
					tools: mappedTools,
				};
			} catch (error) {
				return {
					ok: false,
					error: error instanceof Error ? error.message : String(error),
				};
			} finally {
				await client?.close().catch(() => {});
			}
		})
		.build();
}
