import { Service } from '@n8n/di';

/**
 * Descriptor for an OAuth 2.1 protected resource served by this instance.
 *
 * All resources share a single authorization server (one issuer, one set of
 * `/authorize`/`/token`/`/register` endpoints, one signing key) but each
 * resource has its own canonical RFC 8707 resource URL, accepted audiences,
 * and advertised scopes.
 */
export interface ProtectedResource {
	/** Stable identifier, e.g. `'instance-mcp'`. */
	id: string;

	/**
	 * Canonical RFC 8707 resource URL used as the JWT `aud` claim and advertised
	 * as the resource indicator (e.g. `https://instance.example/mcp-server/http`).
	 * Resolved lazily so the instance base URL is read per request, matching the
	 * previous `getCanonicalResourceUrl()` behaviour.
	 */
	getResourceUrl(): string;

	/**
	 * All `aud` values accepted at this resource's gate. Must include the
	 * canonical resource URL; may include resource-specific legacy audiences.
	 */
	getAudiences(): string[];

	/** OAuth scopes advertised for this resource in discovery documents. */
	scopes: string[];

	/**
	 * Whether the fully registered resource is currently available. When every
	 * registered resource reports `false`, the shared OAuth endpoints reject
	 * requests with 403. Omit for resources that are always available.
	 */
	isEnabled?(): Promise<boolean>;

	/**
	 * Fallback audience for token requests that omit an RFC 8707 `resource`
	 * parameter (pre-8707 clients). At most one registered resource may be the
	 * default.
	 */
	isDefault?: boolean;
}

const trimTrailingSlash = (url: string): string => url.replace(/\/$/, '');

/**
 * Registry of the protected resources served by this instance's shared OAuth
 * server. Modules register their resources on init (e.g. instance MCP
 * registers `/mcp-server/http`); the OAuth server resolves audiences, resource
 * indicators, and discovery metadata against it.
 */
@Service()
export class ProtectedResourceRegistry {
	private readonly resources = new Map<string, ProtectedResource>();

	register(resource: ProtectedResource): void {
		this.resources.set(resource.id, resource);
	}

	getById(id: string): ProtectedResource | undefined {
		return this.resources.get(id);
	}

	/** Look up a resource by its canonical URL (trailing slashes ignored). */
	getByResourceUrl(resourceUrl: string): ProtectedResource | undefined {
		const normalized = trimTrailingSlash(resourceUrl);
		for (const resource of this.resources.values()) {
			if (trimTrailingSlash(resource.getResourceUrl()) === normalized) return resource;
		}
		return undefined;
	}

	/** Look up a resource by its URL path (e.g. `/mcp-server/http`). */
	getByResourcePath(pathname: string): ProtectedResource | undefined {
		const normalized = trimTrailingSlash(pathname);
		for (const resource of this.resources.values()) {
			try {
				if (trimTrailingSlash(new URL(resource.getResourceUrl()).pathname) === normalized) {
					return resource;
				}
			} catch {
				continue;
			}
		}
		return undefined;
	}

	getAll(): ProtectedResource[] {
		return [...this.resources.values()];
	}

	/** Resource accepting tokens minted without an explicit RFC 8707 resource. */
	getDefaultResource(): ProtectedResource | undefined {
		for (const resource of this.resources.values()) {
			if (resource.isDefault) return resource;
		}
		return undefined;
	}

	/**
	 * Union of every registered resource's audiences, deduplicated in
	 * registration order.
	 *
	 * Intended only for callers that cannot know which resource a token targets
	 * (e.g. the SDK's generic token verification). Resource gates must instead
	 * verify against a single resource's audiences via `getByResourceUrl` —
	 * see `OAuthTokenService.verifyAccessToken`.
	 */
	getAllAudiences(): string[] {
		const audiences = new Set<string>();
		for (const resource of this.resources.values()) {
			for (const audience of resource.getAudiences()) audiences.add(audience);
		}
		return [...audiences];
	}

	/** Union of every registered resource's scopes, deduplicated in registration order. */
	getAllScopes(): string[] {
		const scopes = new Set<string>();
		for (const resource of this.resources.values()) {
			for (const scope of resource.scopes) scopes.add(scope);
		}
		return [...scopes];
	}

	/**
	 * Whether at least one registered resource is currently enabled. Drives the
	 * availability guard on the shared OAuth endpoints.
	 */
	async isAnyResourceEnabled(): Promise<boolean> {
		for (const resource of this.resources.values()) {
			if (!resource.isEnabled || (await resource.isEnabled())) return true;
		}
		return false;
	}
}
