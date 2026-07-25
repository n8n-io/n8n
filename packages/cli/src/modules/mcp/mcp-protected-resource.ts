import { MCP_INSTANCE_SCOPES } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { BUILDER_TOOLS, TOOLS_BY_SCOPE } from './mcp-scopes';
import { McpConfig } from './mcp.config';
import { McpSettingsService } from './mcp.settings.service';
import type { ProtectedResource } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';
import type { User } from '@n8n/db';

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
		private readonly mcpConfig: McpConfig,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Filtered to the tools this instance actually exposes, so the consent
	 * screen never advertises tools a grant cannot deliver.
	 */
	getScopeTools(): Record<string, string[]> {
		const builderEnabled = this.globalConfig.endpoints.mcpBuilderEnabled;
		const tagsDisabled = this.globalConfig.tags.disabled;

		return Object.fromEntries(
			Object.entries(TOOLS_BY_SCOPE).map(([scope, tools]) => [
				scope,
				tools.filter(
					(tool) =>
						(builderEnabled || !BUILDER_TOOLS.has(tool)) && (!tagsDisabled || tool !== 'list_tags'),
				),
			]),
		);
	}

	getResourceUrl(): string {
		// A dedicated MCP base URL (split-hostname deployments) takes precedence
		// as the canonical resource: it is what clients are told to use.
		if (this.mcpConfig.baseUrl) {
			return `${this.mcpConfig.baseUrl}${MCP_RESOURCE_PATH}`;
		}
		const baseUrl = this.urlService.getInstanceBaseUrl().replace(/\/$/, '');
		return `${baseUrl}${MCP_RESOURCE_PATH}`;
	}

	/**
	 * RFC 9728 §3.1 metadata URL for this resource: `/.well-known/
	 * oauth-protected-resource` with the resource's path inserted after it.
	 * Advertised in `WWW-Authenticate: resource_metadata=...` on 401s so clients
	 * discover the metadata directly instead of guessing the well-known path.
	 */
	getProtectedResourceMetadataUrl(): string {
		const url = new URL(this.getResourceUrl());
		return `${url.origin}/.well-known/oauth-protected-resource${url.pathname}`;
	}

	/**
	 * Canonical resource URL first, then the instance-base-URL-derived one when
	 * a dedicated MCP base URL is configured — clients connecting through the
	 * main hostname (and tokens minted before the config change) must keep
	 * working.
	 */
	getResourceUrls(): string[] {
		const instanceUrl = `${this.urlService.getInstanceBaseUrl().replace(/\/$/, '')}${MCP_RESOURCE_PATH}`;
		return [...new Set([this.getResourceUrl(), instanceUrl])];
	}

	getAudiences(): string[] {
		// The legacy audience stays scoped to this resource only — it must never
		// be accepted at another protected resource's gate.
		return [...this.getResourceUrls(), LEGACY_MCP_AUDIENCE];
	}

	async getAllowedRedirectUris(): Promise<string[]> {
		return await this.mcpSettingsService.getAllowedRedirectUris();
	}

	async authorize(_user: User): Promise<boolean> {
		// The instance MCP server has no per-user authorization rule: any
		// authenticated user may access it while the server is enabled, and all
		// users are denied when it is disabled.
		return await this.mcpSettingsService.getEnabled();
	}
}
