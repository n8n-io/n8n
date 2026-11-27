import {
	MCP_SERVER_CONSENT_TYPE,
	mcpServerSlugSchema,
	type McpServerConnectRefusal,
} from '@n8n/api-types';
import { ProjectScopeService, UrlService } from '@n8n/backend-services';
import type { ProtectedResourceResolver } from '@n8n/backend-services/auth';
import { ProjectRelationRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	SYSTEM_TRUSTED_SOURCE_ID,
	type ConsentRefusal,
	type ProtectedResource,
	type ResourcePrincipal,
} from '@n8n/inbound-auth';
import type { Scope } from '@n8n/permissions';

import { McpServerBlockRepository } from '../access/mcp-server-block.repository';
import { CustomMcpServersFlagGate } from '../services/custom-mcp-servers-flag-gate';
import type { McpServer } from '../database/entities/mcp-server.entity';
import { McpServerRepository } from '../database/repositories/mcp-server.repository';

/** The path of the runtime endpoint, after the instance base URL. */
export const MCP_SERVERS_PATH = '/mcp-servers';

const CONNECT_SCOPE: Scope = 'mcpServer:connect';

/**
 * One protected resource for each server, with the server URL as the resource URL and the
 * token audience. So a token for one server does not work on another server or on the
 * instance MCP. Only the n8n sign-in (the system trusted source) issues these tokens.
 */
@Service()
export class McpServerProtectedResource implements ProtectedResourceResolver {
	readonly id = 'mcp-servers';

	readonly scopes: string[] = [];

	constructor(
		private readonly servers: McpServerRepository,
		private readonly projectScope: ProjectScopeService,
		private readonly projectRelations: ProjectRelationRepository,
		private readonly urls: UrlService,
		private readonly flag: CustomMcpServersFlagGate,
		private readonly blocks: McpServerBlockRepository,
	) {}

	serverUrl(server: Pick<McpServer, 'slug'>): string {
		return `${this.urls.getInstanceBaseUrl()}${MCP_SERVERS_PATH}/${server.slug}`;
	}

	forServer(server: McpServer): ProtectedResource {
		const url = this.serverUrl(server);
		// The server row can change between the sign-in and a later request: read it again.
		const current = async () => {
			const found = await this.servers.findBySlug(server.slug);
			return found?.id === server.id ? found : null;
		};
		return {
			id: `mcp-server:${server.id}`,
			surface: 'mcp-servers',
			displayName: server.name,
			uiHints: { icon: 'mcp', consentType: MCP_SERVER_CONSENT_TYPE },
			scopes: [],
			getResourceUrl: () => url,
			getAudiences: () => [url],
			getAcceptedSourceIds: () => [SYSTEM_TRUSTED_SOURCE_ID],
			isAvailable: async () => !!(await current()),
			authorize: async (user) => {
				const found = await current();
				return !!found && (await this.canConnect(found, user));
			},
			describeRefusal: async (user) => await this.describeRefusal(server, user),
		};
	}

	/**
	 * The admission calls this on every request, and the consent service before consent. So a
	 * block takes effect at once, also for an access token that is still valid.
	 */
	async canConnect(server: McpServer, user: ResourcePrincipal): Promise<boolean> {
		if (await this.blocks.isBlocked(server.id, user.id)) return false;
		return await this.projectScope.hasScopes(user, server.projectId, [CONNECT_SCOPE]);
	}

	async resolveByUrl(value: string): Promise<ProtectedResource | undefined> {
		const prefix = `${this.urls.getInstanceBaseUrl()}${MCP_SERVERS_PATH}/`;
		if (!value.startsWith(prefix)) return undefined;
		return await this.resolveSlug(value.slice(prefix.length));
	}

	async resolveByPath(pathname: string): Promise<ProtectedResource | undefined> {
		const basePath = new URL(this.urls.getInstanceBaseUrl()).pathname.replace(/\/$/, '');
		const prefix = `${basePath}${MCP_SERVERS_PATH}/`;
		if (!pathname.startsWith(prefix)) return undefined;
		return await this.resolveSlug(pathname.slice(prefix.length));
	}

	/** The server of a slug. A flag that is off hides every server, as if none exists. */
	async findServer(slug: string): Promise<McpServer | null> {
		if (!mcpServerSlugSchema.safeParse(slug).success) return null;
		const server = await this.servers.findBySlug(slug);
		if (!server || !(await this.flag.isEnabled())) return null;
		return server;
	}

	private async resolveSlug(slug: string): Promise<ProtectedResource | undefined> {
		const server = await this.findServer(slug);
		return server ? this.forServer(server) : undefined;
	}

	/** A block comes first: a blocked person can also have a role that cannot connect. */
	private async describeRefusal(
		server: McpServer,
		user: ResourcePrincipal,
	): Promise<ConsentRefusal | undefined> {
		const [withProject] = await this.servers.withProjects([server]);
		if (!withProject) return undefined;
		// The name of a personal project holds the email of its owner, so the screen gets no name.
		const projectName = withProject.project.type === 'team' ? withProject.project.name : undefined;
		if (await this.blocks.isBlocked(server.id, user.id)) return { reason: 'blocked', projectName };
		const role = await this.projectRelations.findProjectRole({
			userId: user.id,
			projectId: server.projectId,
		});
		const reason: McpServerConnectRefusal = role ? 'no_connect_scope' : 'not_member';
		return { reason, projectName };
	}
}
