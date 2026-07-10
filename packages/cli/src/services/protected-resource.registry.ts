import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UnexpectedError } from 'n8n-workflow';

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

	/**
	 * Optional explicit allowlist of `redirect_uri` values accepted at
	 * `/authorize` for this resource. Returning an empty array means "no
	 * additional restriction" — the OAuth server still enforces the
	 * registered-URIs match per RFC 6749 §3.1.2.4.
	 */
	getAllowedRedirectUris?(): Promise<string[]>;

	/**
	 * Determine whether the given user is authorized to access this resource.
	 * Called during the consent flow to gate access to the resource.
	 *
	 * @param user The user to authorize
	 * @returns A promise that resolves to a boolean indicating whether the user is authorized
	 **/
	authorize(user: User): Promise<boolean>;

	/**
	 * Whether resource URLs for this resource may also match by URL path alone,
	 * accepting any hostname that reaches this instance as an alias of the
	 * canonical URL (split-hostname deployments, where clients reach the
	 * backend at a hostname the config does not know about). Only the instance
	 * MCP server opts in today.
	 */
	acceptsHostAliases?: boolean;
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
		this.assertHostAliasPathIsUnique(resource);
		this.resources.set(resource.id, resource);
	}

	/**
	 * The alias-by-path match in `getByResourceUrl` is only unambiguous while at
	 * most one alias-accepting resource owns a given URL path: two would let a
	 * token minted for one pass the other's gate (the path resolves to both).
	 * Guard against that drift at registration time rather than shipping a silent
	 * cross-resource replay.
	 */
	private assertHostAliasPathIsUnique(resource: ProtectedResource): void {
		if (!resource.acceptsHostAliases) return;

		let path: string;
		try {
			path = trimTrailingSlash(new URL(resource.getResourceUrl()).pathname);
		} catch {
			return;
		}

		for (const existing of this.resources.values()) {
			if (existing.id === resource.id || !existing.acceptsHostAliases) continue;
			try {
				if (trimTrailingSlash(new URL(existing.getResourceUrl()).pathname) === path) {
					throw new UnexpectedError(
						`Cannot register protected resource "${resource.id}": another alias-accepting resource ("${existing.id}") already owns the path "${path}"`,
					);
				}
			} catch (error) {
				if (error instanceof UnexpectedError) throw error;
			}
		}
	}

	registerResolver(resolver: ProtectedResourceResolver) {
		this.resolvers.add(resolver);
	}

	getById(id: string): ProtectedResource | undefined {
		return this.resources.get(id);
	}

	/**
	 * Look up a resource by a resource URL (trailing slashes ignored).
	 *
	 * When no resource matches the full URL, resources that opt into host
	 * aliases (`acceptsHostAliases`) are matched by URL path alone: deployments
	 * may serve this instance at hostnames the config does not know about (e.g.
	 * a dedicated MCP alias in front of the same backend), and clients build
	 * their RFC 8707 resource indicator from the URL they connect to. The path
	 * is matched exactly — no prefix or wildcard matching.
	 */
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

		let pathname: string;
		try {
			pathname = trimTrailingSlash(new URL(normalized).pathname);
		} catch {
			return undefined;
		}
		for (const resource of this.resources.values()) {
			if (!resource.acceptsHostAliases) continue;
			try {
				if (trimTrailingSlash(new URL(resource.getResourceUrl()).pathname) === pathname) {
					return resource;
				}
			} catch {
				continue;
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
