import { MCP_SERVERS_RUNTIME_PREFIX } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Get, Head, Post, RootLevelController } from '@n8n/decorators';
import { extractBearer, inboundFrom, inboundRequestOf, ResourceAdmission } from '@n8n/inbound-auth';
import { lazyImport } from '@n8n/utils/lazy-import';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { getClientInfo } from '@/modules/mcp/mcp.utils';

import { accountEmail } from './account-label';
import type { McpServerEntity } from './database/mcp-server.entities';
import { McpServerProtectedResource } from './mcp-server-protected-resource';
import { McpServerRuntimeService, type RuntimeCaller } from './mcp-server-runtime.service';
import { resolveSessionId, type SessionMap } from './mcp-server-session';
import { McpServerStoreService } from './mcp-server-store.service';

type AuthOutcome = { ok: true; caller: RuntimeCaller } | { ok: false };

/** Known clients by User-Agent, for calls whose body names no client (2025-era requests). */
const USER_AGENT_CLIENTS: Array<[RegExp, string]> = [
	[/claude[\s_-]?code/i, 'Claude Code'],
	[/claude/i, 'Claude'],
	[/openai|chatgpt/i, 'ChatGPT'],
	[/cursor/i, 'Cursor'],
	[/vscode|visual studio code/i, 'VS Code'],
	[/codex/i, 'Codex'],
	[/n8n/i, 'n8n'],
];

function clientFromUserAgent(userAgent: string | undefined): string | null {
	if (!userAgent) return null;
	return USER_AGENT_CLIENTS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

/**
 * Serves every user-built MCP server at `/mcp-servers/<slug>` with Streamable HTTP,
 * stateless, like the instance MCP server.
 */
@RootLevelController(`/${MCP_SERVERS_RUNTIME_PREFIX}`)
export class McpServerRuntimeController {
	/** Client names seen at the handshake, per server and caller. */
	private readonly clientNames = new Map<string, string>();

	private readonly sessions: SessionMap = new Map();

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly store: McpServerStoreService,
		private readonly runtime: McpServerRuntimeService,
		private readonly protectedResource: McpServerProtectedResource,
		private readonly admission: ResourceAdmission,
		private readonly userRepository: UserRepository,
	) {}

	private setCorsHeaders(res: Response) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		res.header(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-Requested-With, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
		);
		res.header('Access-Control-Max-Age', '86400');
	}

	@Head('/:slug', { skipAuth: true, usesTemplates: true })
	async head(req: Request, res: Response) {
		this.setCorsHeaders(res);
		const server = await this.findActive(req);
		if (!server) {
			res.status(404).end();
			return;
		}
		if (server.accessMode === 'public') {
			res.status(200).end();
			return;
		}
		this.challenge(server, res);
		res.status(401).end();
	}

	@Get('/:slug', { skipAuth: true, usesTemplates: true })
	async get(req: Request, res: Response) {
		this.setCorsHeaders(res);
		const server = await this.findActive(req);
		if (!server) {
			res.status(404).json({ message: 'MCP server not found' });
			return;
		}
		res.header('Allow', 'POST');
		res.status(405).json({
			jsonrpc: '2.0',
			error: { code: -32000, message: 'Method not allowed.' },
			id: null,
		});
	}

	@Post('/:slug', { skipAuth: true, usesTemplates: true })
	async post(req: Request, res: Response) {
		this.setCorsHeaders(res);
		const server = await this.findActive(req);
		if (!server) {
			res.status(404).json({
				jsonrpc: '2.0',
				error: { code: -32001, message: 'MCP server not found' },
				id: null,
			});
			return;
		}

		const auth = await this.authenticate(server, req);
		if (!auth.ok) {
			this.challenge(server, res);
			res.status(401).json({
				jsonrpc: '2.0',
				error: { code: -32001, message: this.unauthorizedMessage(server) },
				id: null,
			});
			return;
		}

		const clientName = this.resolveClientName(server, auth.caller, req);
		const caller: RuntimeCaller = {
			...auth.caller,
			sessionId: resolveSessionId(
				this.sessions,
				`${server.id}:${auth.caller.label}:${clientName ?? ''}`,
			),
		};

		try {
			const { createMcpHandler } = await lazyImport<typeof import('@modelcontextprotocol/server')>(
				async () => await import('@modelcontextprotocol/server'),
			);
			const { toNodeHandler } = await lazyImport<typeof import('@modelcontextprotocol/node')>(
				async () => await import('@modelcontextprotocol/node'),
			);
			const handler = createMcpHandler(
				async () => await this.runtime.build(server, caller, clientName),
				{
					legacy: 'stateless',
					onerror: (error) => this.errorReporter.error(error),
				},
			);
			await toNodeHandler(handler)(req, res, req.body);
		} catch (error) {
			this.errorReporter.error(error);
			if (!res.headersSent) {
				res.status(500).json({
					jsonrpc: '2.0',
					error: { code: -32603, message: 'Internal server error' },
					id: null,
				});
			}
		}
	}

	private async findActive(req: Request): Promise<McpServerEntity | null> {
		const slug = typeof req.params.slug === 'string' ? req.params.slug : '';
		const server = await this.store.findBySlug(slug);
		// An inactive server is not found, so its URL reveals nothing.
		return server?.active ? server : null;
	}

	private challenge(server: McpServerEntity, res: Response) {
		if (server.accessMode === 'oauth') {
			res.header(
				'WWW-Authenticate',
				`Bearer realm="${server.name.replace(/"/g, '')}", resource_metadata="${this.protectedResource.protectedResourceMetadataUrl(server)}"`,
			);
		} else {
			res.header('WWW-Authenticate', 'Bearer realm="n8n MCP server"');
		}
	}

	private unauthorizedMessage(server: McpServerEntity) {
		return server.accessMode === 'apiKey'
			? 'This MCP server needs an API key. Send it as "Authorization: Bearer <key>".'
			: 'Sign in with your n8n account to use this MCP server.';
	}

	private async authenticate(server: McpServerEntity, req: Request): Promise<AuthOutcome> {
		if (server.accessMode === 'public') {
			return { ok: true, caller: { type: 'anonymous', label: 'Anonymous' } };
		}

		const header = req.header('authorization') ?? '';
		const token = /^bearer\s+(.+)$/i.exec(header)?.[1]?.trim();

		if (server.accessMode === 'apiKey') {
			if (!token) return { ok: false };
			const key = await this.store.findApiKey(server.id, token);
			if (!key) return { ok: false };
			void this.store.markApiKeyUsed(key.id).catch(() => {});
			return { ok: true, caller: { type: 'apiKey', label: key.label, apiKeyId: key.id } };
		}

		const resource = this.protectedResource.forServer(server);
		const inbound = inboundFrom(resource, inboundRequestOf(req));
		const extracted = extractBearer(inbound);
		if (!extracted.ok) return { ok: false };
		const admitted = await this.admission.admit(resource, extracted.value);
		if (!admitted.ok) {
			this.logger.debug('MCP servers: OAuth token refused', { reason: admitted.reason });
			return { ok: false };
		}
		const user = await this.userRepository.findOneBy({ id: admitted.context.subject.id });
		if (!user || (server.revokedUserIds ?? []).includes(user.id)) return { ok: false };
		return { ok: true, caller: { type: 'user', label: accountEmail(user), userId: user.id } };
	}

	private resolveClientName(server: McpServerEntity, caller: RuntimeCaller, req: Request) {
		const key = `${server.id}:${caller.label}`;
		const declared = getClientInfo(req)?.name;
		if (declared) {
			const name = prettyClientName(declared);
			this.clientNames.set(key, name);
			return name;
		}
		// The User-Agent comes first: on a public server all callers share one cache key.
		return clientFromUserAgent(req.header('user-agent')) ?? this.clientNames.get(key) ?? null;
	}
}

function prettyClientName(name: string) {
	return clientFromUserAgent(name) ?? name;
}
