import { isRecord } from '@n8n/utils/is-record';
import type { BuiltTool, CredentialProvider, McpClient, ToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import { classifyMcpTool } from '@n8n/ai-utilities/agent-config';
import {
	type AgentJsonConfig,
	McpAuthenticationSchemaTypes,
	McpOAuth2CredentialTypeSchema,
	getLegacyBuilderToolNames,
} from '@n8n/api-types';
import type { CustomFetch } from '@n8n/backend-network';
import { z } from 'zod';

import type { OauthService } from '@/oauth/oauth.service';

import { BUILDER_TOOLS } from './builder-tool-names';
import {
	type BuildMcpClientDeps,
	buildMcpClientForServer,
} from '../json-config/mcp-client-factory';

export type McpCredentialApplyResult =
	| { applied: false }
	| { applied: true; config: AgentJsonConfig; configHash: string };

export interface VerifyMcpServerDeps {
	agentId?: string;
	credentialProvider: CredentialProvider;
	oauthService: OauthService;
	projectId: string;
	proxyFetch: CustomFetch;
	resolveRegistryConnection?: BuildMcpClientDeps['resolveRegistryConnection'];
	/** When verification succeeds with a credential, writes it into the matching
	 *  mcpServers entry so the builder can skip agent-context → agent_builder_patch_config. */
	applyCredentialToMcpServer?: (
		serverName: string,
		credentialId: string,
	) => Promise<McpCredentialApplyResult>;
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
 * Tool permissions are intentionally excluded. They have no bearing on whether
 * the underlying transport connects, and simplifying the input keeps the LLM
 * context small.
 */
const verifyMcpServerInputSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(64)
		.refine((name) => name.trim().length > 0, 'MCP server name cannot be blank')
		.describe('User-facing server name'),
	url: z.string().min(1).describe('Endpoint URL'),
	transport: z.enum(['sse', 'streamableHttp']).default('streamableHttp'),
	authentication: z
		.union([McpAuthenticationSchemaTypes, McpOAuth2CredentialTypeSchema])
		.default('none'),
	credential: z
		.string()
		.optional()
		.describe(
			'credentialId from setup_credentials(target: "agent"); required unless authentication is "none"',
		),
	metadata: z.object({ nodeTypeName: z.string().optional() }).optional(),
	connectionTimeoutMs: z
		.number()
		.int()
		.min(1)
		.max(120_000)
		.optional()
		.describe('Timeout for connect and list tools. Defaults to 10000'),
});

type VerifyMcpServerInput = z.infer<typeof verifyMcpServerInputSchema>;

/** What the model must do with a verification result. The tool description stays short. */
function withNextStep(result: unknown): unknown {
	if (!isRecord(result) || result.credentialApplied !== true) return result;
	return {
		...result,
		nextStep:
			'The credential is saved in the mcpServers entry. Do not patch it. Treat `config` as ' +
			'the current state and use its configHash as baseConfigHash.',
	};
}

export function buildVerifyMcpServerTool(deps: VerifyMcpServerDeps): BuiltTool {
	return new Tool(BUILDER_TOOLS.VERIFY_MCP_SERVER)
		.legacyNames(...getLegacyBuilderToolNames(BUILDER_TOOLS.VERIFY_MCP_SERVER))
		.description(
			'Connect to an MCP server, list its tools, and close the connection. Call it before you ' +
				'add the server to the config, after setup_credentials(target: "agent") when authentication ' +
				'is not "none". Result tool names have no server prefix. With a credential, a ' +
				'successful call also writes it into a matching mcpServers entry. Results that need ' +
				'an action carry `nextStep`: follow it.',
		)
		.toModelOutput(withNextStep)
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
						metadata: input.metadata,
						toolPermissions: {
							categories: { read: 'always_allow', write: 'always_allow' },
						},
						connectionTimeoutMs: timeoutMs,
					},
					deps,
				);
				const tools = await listToolsWithinDeadline(client, timeoutMs, ctx.abortSignal);
				const failures = client.getConnectionFailures();
				if (failures.length > 0) {
					return {
						ok: false,
						error: failures
							.map(
								(failure) => `MCP server "${failure.server}" connection failed: ${failure.error}`,
							)
							.join('; '),
					};
				}
				const mappedTools = tools.map((t) => ({
					name: t.mcpToolName ?? t.name,
					description: t.description ?? '',
					category: classifyMcpTool({
						name: t.mcpToolName ?? t.name,
						annotations: t.mcpAnnotations,
					}),
				}));

				if (input.credential && deps.applyCredentialToMcpServer) {
					try {
						const applyResult = await deps.applyCredentialToMcpServer(input.name, input.credential);
						if (applyResult.applied && deps.agentId) {
							return {
								ok: true,
								tools: mappedTools,
								credentialApplied: true,
								configMutated: true,
								agentId: deps.agentId,
								config: applyResult.config,
								configHash: applyResult.configHash,
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
