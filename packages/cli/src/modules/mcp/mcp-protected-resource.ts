import { Service } from '@n8n/di';

import type { ProtectedResource } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

export const INSTANCE_MCP_RESOURCE_ID = 'instance-mcp';

/** MCP tool scopes — gated by the MCP server itself, not by n8n RBAC. */
export const MCP_TOOL_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails'];

/**
 * n8n RBAC scopes grantable to OAuth clients (e.g. the native app). These map 1:1 to the
 * scope slugs enforced by `@GlobalScope`/`@ProjectScope` decorators, so a token carrying them
 * is downscoped to the intersection of (granted ∩ the user's real permission) at request time.
 */
export const N8N_OAUTH_SCOPES = [
	'instanceAi:message',
	'instanceAi:gateway',
	'workflow:read',
	'workflow:execute',
	'workflow:delete',
	'execution:read',
	'execution:list',
	'insights:list',
];

/** OAuth scopes advertised for the instance MCP server in discovery documents. */
export const SUPPORTED_SCOPES = [...MCP_TOOL_SCOPES, ...N8N_OAUTH_SCOPES];

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

	constructor(private readonly urlService: UrlService) {}

	getResourceUrl(): string {
		const baseUrl = this.urlService.getInstanceBaseUrl().replace(/\/$/, '');
		return `${baseUrl}${MCP_RESOURCE_PATH}`;
	}

	getAudiences(): string[] {
		// The legacy audience stays scoped to this resource only — it must never
		// be accepted at another protected resource's gate.
		return [this.getResourceUrl(), LEGACY_MCP_AUDIENCE];
	}
}
