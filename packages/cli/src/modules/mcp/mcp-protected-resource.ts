import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { McpSettingsService } from './mcp.settings.service';
import type { ProtectedResource } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

export const INSTANCE_MCP_RESOURCE_ID = 'instance-mcp';

/**
 * Scopes a user can grant on the consent screen. Enforced per-tool via the
 * mapping in `mcp-scopes.ts` when the MCP server registers tools.
 */
export const SUPPORTED_SCOPES: string[] = [...MCP_INSTANCE_SCOPES];

const MCP_RESOURCE_PATH = '/mcp-server/http';

// Pre-RFC-8707 audience value. Do not modify — existing tokens were signed with this string
// and changing it would force all active clients to re-authenticate.
const LEGACY_MCP_AUDIENCE = 'mcp-server-api';

/**
 * The instance MCP server's protected-resource descriptor, registered with the
 * shared OAuth server on module init.
 *
 * Single source of truth for the canonical MCP resource URL — the minted JWT
 * `aud`, the persisted authorization-code `resource`, the RFC 9728 discovery
 * document, and the audience the resource-server middleware validates against
 * all resolve through here, so they can never drift.
 */
@Service()
export class McpProtectedResource implements ProtectedResource {
	readonly id = INSTANCE_MCP_RESOURCE_ID;

	readonly scopes = SUPPORTED_SCOPES;

	/**
	 * Fallback audience for token requests without an RFC 8707 resource
	 * indicator — the instance MCP server predates resource indicators, so
	 * resource-less requests from its clients must keep working.
	 */
	readonly isDefault = true;

	constructor(
		private readonly urlService: UrlService,
		private readonly mcpSettingsService: McpSettingsService,
	) {}

	getResourceUrl(): string {
		const baseUrl = this.urlService.getInstanceBaseUrl().replace(/\/$/, '');
		return `${baseUrl}${MCP_RESOURCE_PATH}`;
	}

	getAudiences(): string[] {
		// The legacy audience stays scoped to this resource only — it must never
		// be accepted at another protected resource's gate.
		return [this.getResourceUrl(), LEGACY_MCP_AUDIENCE];
	}

	async getAllowedRedirectUris(): Promise<string[]> {
		return await this.mcpSettingsService.getAllowedRedirectUris();
	}
}
