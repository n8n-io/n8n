import { MCP_SERVERS_RUNTIME_PREFIX } from '@n8n/api-types';
import type { ProtectedResourceResolver } from '@n8n/backend-services/auth';
import { Service } from '@n8n/di';
import {
	SYSTEM_TRUSTED_SOURCE_ID,
	type ProtectedResource,
	type ResourcePrincipal,
} from '@n8n/inbound-auth';

import type { McpServerEntity } from './database/mcp-server.entities';
import { McpServerRepository } from './database/mcp-server.repository';
import { McpServerStoreService } from './mcp-server-store.service';

const PATH = new RegExp(`^/${MCP_SERVERS_RUNTIME_PREFIX}/([a-z0-9-]+)$`);

/**
 * Registers every MCP server in OAuth mode as one protected resource of the shared
 * OAuth server. Clients register themselves and the existing n8n sign-in and consent
 * screen are reused. Any instance user who is not revoked may connect.
 */
@Service()
export class McpServerProtectedResource implements ProtectedResourceResolver {
	readonly id = 'mcp-servers';

	readonly scopes: string[] = [];

	constructor(
		private readonly repository: McpServerRepository,
		private readonly store: McpServerStoreService,
	) {}

	forServer(server: McpServerEntity): ProtectedResource {
		const url = this.store.runtimeUrl(server.slug);
		const current = async () => {
			const row = await this.repository.findServer(server.id);
			return row?.active && row.accessMode === 'oauth' ? row : null;
		};
		return {
			id: `mcp-server:${server.id}`,
			// Tokens of the system source accept this surface, so the n8n sign-in is reused.
			surface: 'instance-mcp',
			displayName: server.name,
			isFirstParty: false,
			scopes: [],
			getResourceUrl: () => url,
			getAudiences: () => [url],
			getAcceptedSourceIds: () => [SYSTEM_TRUSTED_SOURCE_ID],
			isAvailable: async () => !!(await current()),
			authorize: async (user: ResourcePrincipal) => {
				const row = await current();
				return !!row && !(row.revokedUserIds ?? []).includes(user.id);
			},
		};
	}

	protectedResourceMetadataUrl(server: Pick<McpServerEntity, 'slug'>) {
		const url = new URL(this.store.runtimeUrl(server.slug));
		return `${url.origin}/.well-known/oauth-protected-resource${url.pathname}`;
	}

	matchesVirtualClientUrl(): boolean {
		return false;
	}

	async resolveByUrl(value: string): Promise<ProtectedResource | undefined> {
		let pathname: string;
		try {
			pathname = new URL(value).pathname;
		} catch {
			return undefined;
		}
		const resource = await this.resolveByPath(pathname);
		return resource?.getResourceUrl() === value ? resource : undefined;
	}

	async resolveByPath(pathname: string): Promise<ProtectedResource | undefined> {
		const slug = PATH.exec(pathname)?.[1];
		if (!slug) return undefined;
		const server = await this.repository.findServerBySlug(slug);
		if (!server || server.accessMode !== 'oauth') return undefined;
		return this.forServer(server);
	}
}
