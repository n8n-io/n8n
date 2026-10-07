import type { ConsentUiHints } from '@n8n/api-types';
import type { AuthPrincipal, SecurityContext } from '@n8n/permissions';
import type { OAuthResourceGrant } from 'n8n-workflow';

import type { Extracted, Inbound, Result, Verified } from './pipeline';
import type { AuthorizationServerMetadata, Jwk, TrustedSource } from './trusted-source';
import type { SurfaceId } from './trusted-source-config';

/** What a protected resource reads from the user. The `User` entity satisfies it. */
export type ResourceUser = AuthPrincipal & { id: string; createdAt: Date };

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

	/** The surface this resource is served on. Every resolver knows which one it serves. */
	readonly surface: SurfaceId;

	/** Human readable name, for consent screen */
	displayName?: string;

	/** Presentational hints for the consent screen; omit for the default generic MCP icon. */
	uiHints?: ConsentUiHints;

	/**
	 * Canonical RFC 8707 resource URL used as the JWT `aud` claim and advertised
	 * as the resource indicator (e.g. `https://instance.example/mcp-server/http`).
	 * Resolved lazily so the instance base URL is read per request.
	 */
	getResourceUrl(): string;

	/**
	 * Every resource URL this resource is served at, canonical URL
	 * (`getResourceUrl()`) first. Treated as `[getResourceUrl()]` when not implemented.
	 */
	getResourceUrls?(): string[];

	/**
	 * All `aud` values accepted at this resource's gate. Must include the
	 * canonical resource URL; may include resource-specific legacy audiences.
	 */
	getAudiences(): string[];

	/** Trusted sources this resource accepts, when it narrows the surface's set (a trigger's selection). */
	getAcceptedSourceIds?(): string[];

	/** OAuth scopes advertised for this resource in discovery documents. */
	scopes: string[];

	/**
	 * Scopes *this user* may actually grant, narrowing {@link scopes}. Omit when
	 * every authenticated user can grant everything the resource supports.
	 */
	getGrantableScopes?(user: ResourceUser): Promise<string[]>;

	/** Tool names unlocked by each grantable scope, for display on the consent screen. */
	getScopeTools?(): Record<string, string[]> | Promise<Record<string, string[]>>;

	/**
	 * Fallback audience for token requests that omit an RFC 8707 `resource`
	 * parameter (pre-8707 clients). At most one registered resource may be the default.
	 */
	isDefault?: boolean;

	/**
	 * Optional explicit allowlist of `redirect_uri` values accepted at `/authorize` for this
	 * resource. An empty array means "no additional restriction".
	 */
	getAllowedRedirectUris?(): Promise<string[]>;

	/** First-party resources skip the third-party consent treatment. */
	isFirstParty?: boolean;

	/** Whether the resource is currently served. Treated as `true` when not implemented. */
	isAvailable?(): Promise<boolean>;

	/** Whether `user` may access this resource at all. */
	authorize(user: ResourceUser): Promise<boolean>;

	/** The grant sealed into a run, so the worker re-takes the same decision without the resource. */
	getGrant?(): OAuthResourceGrant;
}

/** What a resource contributes to advertising: RFC 9728 metadata and the 401 challenge. */
export type AdvertisedResource = Pick<Inbound, 'surface' | 'resource' | 'acceptedSourceIds'>;

/** The dispatcher. Owns what every method shares: driver lookup and surface acceptance. */
export abstract class AuthenticationService {
	abstract authenticate(extracted: Extracted): Promise<Result<Verified>>;

	abstract advertise(
		resource: AdvertisedResource,
	): Promise<{ authorizationServers: string[]; challenges: string[] }>;
}

export abstract class IdentityService {
	abstract identify(verified: Verified): Promise<Result<SecurityContext>>;
}

/** Read-only: writes stay on the module's own store. Extend here when a second consumer needs one. */
export abstract class TrustedSourceStore {
	abstract getById(id: string): Promise<TrustedSource | undefined>;

	abstract getByIssuer(issuer: string): Promise<TrustedSource | undefined>;

	abstract listBySurface(surface: SurfaceId): Promise<TrustedSource[]>;
}

/** The running instance's own OAuth2 server, read in process so its source is discovered like any other. */
export abstract class LocalAuthorizationServer {
	abstract getMetadata(): Promise<AuthorizationServerMetadata>;

	abstract getJwks(): Promise<{ keys: Jwk[] }>;
}

export abstract class TrustedSourceGate {
	/** The worker path: re-take the sealed grant and the binding status without a token. */
	abstract authorizeSealed(input: {
		userId: string;
		grant: OAuthResourceGrant;
		binding?: { sourceId: string; subject: string };
	}): Promise<boolean>;
}
