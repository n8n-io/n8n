import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';

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

	/** Human readable name, for consent screen */
	displayName?: string;

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
	 * Fallback audience for token requests that omit an RFC 8707 `resource`
	 * parameter (pre-8707 clients). At most one registered resource may be the
	 * default.
	 */
	isDefault?: boolean;
}

/**
 * On-demand resolver for protected resources that aren't held in the registry's
 * static map. Registered via {@link ProtectedResourceRegistry.registerResolver},
 * resolvers are consulted only after the static map misses — letting a resource
 * be resolved lazily (e.g. from the database) instead of being materialized up
 * front. A resolver that throws is treated as a non-match (the registry logs and
 * continues), so a backing-store outage fails closed rather than surfacing a 500.
 */
export interface ProtectedResourceResolver {
	/** Stable identifier for the resolver, e.g. `'workflow-trigger'`. */
	readonly id: string;

	/**
	 * Scopes contributed to discovery documents via
	 * {@link ProtectedResourceRegistry.getAllScopes}, unioned with the static
	 * resources' scopes.
	 */
	readonly scopes: string[];

	/**
	 * Resolve a resource by its canonical URL, or `undefined` if this resolver
	 * owns no such resource. The input is pre-normalized (trailing slash
	 * trimmed) by the registry.
	 */
	resolveByUrl(resourceUrl: string): Promise<ProtectedResource | undefined>;

	/**
	 * Resolve a resource by its URL path (e.g. `/webhook/wf-1/mcp`), or
	 * `undefined` if this resolver owns no such resource. The input is
	 * pre-normalized (trailing slash trimmed) by the registry.
	 */
	resolveByPath(pathname: string): Promise<ProtectedResource | undefined>;
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
	private readonly resolvers = new Set<ProtectedResourceResolver>();

	constructor(private readonly logger: Logger) {}

	register(resource: ProtectedResource): void {
		this.resources.set(resource.id, resource);
	}

	registerResolver(resolver: ProtectedResourceResolver) {
		this.resolvers.add(resolver);
	}

	getById(id: string): ProtectedResource | undefined {
		return this.resources.get(id);
	}

	/** Look up a resource by its canonical URL (trailing slashes ignored). */
	async getByResourceUrl(resourceUrl: string): Promise<ProtectedResource | undefined> {
		const normalized = trimTrailingSlash(resourceUrl);
		for (const resource of this.resources.values()) {
			if (trimTrailingSlash(resource.getResourceUrl()) === normalized) return resource;
		}
		for (const resolver of this.resolvers) {
			try {
				const resource = await resolver.resolveByUrl(normalized);
				if (resource) return resource;
			} catch (error) {
				this.logResolverFailure(resolver, error);
			}
		}
		return undefined;
	}

	/** Look up a resource by its URL path (e.g. `/mcp-server/http`). */
	async getByResourcePath(pathname: string): Promise<ProtectedResource | undefined> {
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

		for (const resolver of this.resolvers) {
			try {
				const resource = await resolver.resolveByPath(normalized);
				if (resource) return resource;
			} catch (error) {
				this.logResolverFailure(resolver, error);
			}
		}
		return undefined;
	}

	/**
	 * A resolver that throws (e.g. its backing database or cache is unavailable) is
	 * treated as a non-match rather than propagating the error. Resolution is a
	 * lookup, so a failure is indistinguishable to the caller from "no such
	 * resource" — failing closed yields a 404 / `invalid_target` on the
	 * (unauthenticated) discovery and authorize paths instead of a 500.
	 */
	private logResolverFailure(resolver: ProtectedResourceResolver, error: unknown): void {
		this.logger.warn(`Protected resource resolver "${resolver.id}" failed to resolve`, {
			error: ensureError(error).message,
		});
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
		for (const resolver of this.resolvers) {
			for (const scope of resolver.scopes) scopes.add(scope);
		}
		return [...scopes];
	}
}
