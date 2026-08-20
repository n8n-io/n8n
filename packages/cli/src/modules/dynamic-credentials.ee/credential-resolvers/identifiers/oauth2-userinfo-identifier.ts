import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { JSONWebKeySet, JWTPayload } from 'jose';
import type { ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';

import { CacheService } from '@/services/cache/cache.service';

import { IdentifierValidationError, ITokenIdentifier } from './identifier-interface';
import { OAuth2MetadataHttpClient } from './oauth2-metadata-http-client';
import { assertAudience, OAuth2OptionsSchema, sha256 } from './oauth2-utils';

// Cap at 5 minutes to ensure periodic revalidation
const MAX_TOKEN_CACHE_TIMEOUT = 5 * Time.minutes.toMilliseconds;
const DEFAULT_CACHE_TIMEOUT = 60 * Time.seconds.toMilliseconds; // 60 seconds

export const OAuth2UserInfoOptionsSchema = z.object({
	...OAuth2OptionsSchema.shape,
	validation: z.literal('oauth2-userinfo'),
});

type OAuth2UserInfoOptions = z.infer<typeof OAuth2UserInfoOptionsSchema>;

const OAuth2MetadataSchema = z.object({
	issuer: z.string().url(),
	userinfo_endpoint: z.string().url(),
	jwks_uri: z.string().url().optional(),
});

type OAuth2Metadata = z.infer<typeof OAuth2MetadataSchema>;

/** Shortest interval between key-set refreshes triggered by an unknown key id. */
const JWKS_REFRESH_COOLDOWN = 30 * Time.seconds.toMilliseconds;

/** jose reports a key id absent from the set with this code, before verifying anything. */
function isNoMatchingKeyError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		error.code === 'ERR_JWKS_NO_MATCHING_KEY'
	);
}

function isJwks(value: unknown): value is JSONWebKeySet {
	return (
		typeof value === 'object' && value !== null && 'keys' in value && Array.isArray(value.keys)
	);
}

const JwksSchema = z.custom<JSONWebKeySet>(isJwks, { message: 'Invalid JWKS format' });

export const UserInfoResponseSchema = z
	.object({
		// Standard optional fields
		sub: z.string().optional(),
	})
	.passthrough();

export type UserInfoResponse = z.infer<typeof UserInfoResponseSchema>;

const CACHE_PREFIX = 'oauth2-userinfo-identifier';

@Service()
export class OAuth2UserInfoIdentifier implements ITokenIdentifier {
	/** Key-set refreshes currently in flight, keyed by `jwks_uri`. */
	private readonly jwksRefreshes = new Map<string, Promise<JSONWebKeySet | undefined>>();

	constructor(
		private readonly logger: Logger,
		private readonly cache: CacheService,
		private readonly http: OAuth2MetadataHttpClient,
	) {}

	async validateOptions(identifierOptions: Record<string, unknown>): Promise<void> {
		const options = this.parseOptions(identifierOptions);

		let metadata;
		try {
			metadata = await this.fetchMetadata(options, true);
		} catch (error) {
			if (error instanceof IdentifierValidationError) {
				throw error;
			}
			this.logger.error(`Failed to reach OAuth2 metadata URL ${options.metadataUri}`, {
				error,
			});
			throw new IdentifierValidationError(
				`Could not reach metadata URL: ${error instanceof Error ? error.message : String(error)}`,
				{ cause: error },
			);
		}
		if (!metadata.userinfo_endpoint) {
			this.logger.error('Metadata does not contain an userinfo endpoint');
			throw new IdentifierValidationError('Metadata does not contain an userinfo endpoint');
		}
		// Only needed once an audience is configured, since that is what turns on access
		// token verification. Without one the resolver never reaches for the keys.
		if (options.expectedAudience && !metadata.jwks_uri) {
			this.logger.error('Metadata does not contain a JWKS endpoint');
			throw new IdentifierValidationError(
				'Metadata does not contain a JWKS endpoint, which is required to verify access tokens',
			);
		}
	}

	async resolve(
		context: ICredentialContext,
		identifierOptions: Record<string, unknown>,
	): Promise<string> {
		const options = this.parseOptions(identifierOptions);
		const metadata = await this.fetchMetadata(options);

		const hashedToken = sha256(context.identity);

		// Fold the options that decide the subject into the key, so a reconfigured
		// resolver cannot keep serving subjects cached under its previous settings.
		const optionsFingerprint = sha256(`${options.subjectClaim}:${options.expectedAudience ?? ''}`);
		const identifierCacheKey = `${CACHE_PREFIX}:subject:${metadata.issuer}:${optionsFingerprint}:${hashedToken}`;
		const cached = await this.cache.get<string>(identifierCacheKey);
		if (cached) {
			return cached;
		}

		const { subject, ttl: ttlOverwrite } = await this.resolveSubject(metadata, options, context);

		// `??`, not truthiness: a zero TTL means the token is spent, and caching the
		// subject under the default would keep resolving it after it expired.
		const ttl = ttlOverwrite ?? DEFAULT_CACHE_TIMEOUT;
		if (ttl > 0) {
			await this.cache.set(identifierCacheKey, subject, ttl);
		}
		return subject;
	}

	// ------------------------ Private Methods ----------------------- //

	private parseOptions(options: Record<string, unknown>): OAuth2UserInfoOptions {
		try {
			return OAuth2UserInfoOptionsSchema.parse(options);
		} catch (error) {
			this.logger.error('Invalid OAuth2 identifier options', { error });
			throw new IdentifierValidationError('Invalid OAuth2 identifier options', {
				cause: error,
			});
		}
	}

	private async fetchMetadata(
		options: OAuth2UserInfoOptions,
		skipCache: boolean = false,
	): Promise<OAuth2Metadata> {
		return await this.http.fetchMetadata(OAuth2MetadataSchema, {
			metadataUri: options.metadataUri,
			cachePrefix: CACHE_PREFIX,
			skipCache,
		});
	}

	private parseUserInfoResponse(data: unknown): UserInfoResponse {
		try {
			return UserInfoResponseSchema.parse(data);
		} catch (error) {
			this.logger.error('Invalid userinfo response format', { error });
			throw new IdentifierValidationError('Invalid userinfo response format');
		}
	}

	private async resolveSubject(
		metadata: OAuth2Metadata,
		options: OAuth2UserInfoOptions,
		context: ICredentialContext,
	): Promise<{ subject: string; ttl?: number }> {
		if (!options.expectedAudience) {
			// Resolvers configured before an expected audience was required keep working
			// so upgrades do not break running workflows. `validateOptions` rejects the
			// same configuration, so this only ever covers stored resolvers, and the
			// resolver stays flagged in the UI until an audience is set.
			this.logger.warn(
				'OAuth2 resolver has no expected audience configured, so access tokens are not bound to this instance. Set an expected audience on the resolver.',
				{ issuer: metadata.issuer },
			);
			return await this.resolveBasedOnUserInfo(metadata, options, context);
		}

		const claims = await this.verifyAccessToken(
			metadata,
			context.identity,
			options.expectedAudience,
		);
		const ttl = this.cacheTtlFor(claims.exp);

		// The verified token is a better source than the UserInfo response: signed,
		// audience-bound and already in hand. Only call UserInfo when the configured
		// claim is absent from the token, which is why the mode exists at all.
		const tokenSubject = claims[options.subjectClaim];
		if (typeof tokenSubject === 'string' && tokenSubject !== '') {
			this.logger.debug('Resolved subject from access token', { subject: tokenSubject });
			return { subject: tokenSubject, ttl };
		}

		const userData = await this.queryUserInfo(metadata, context);

		// Both responses must describe the same principal, otherwise the enrichment
		// step could substitute a different one.
		if (claims.sub && userData.sub && claims.sub !== userData.sub) {
			this.logger.error('UserInfo subject does not match the verified access token');
			throw new IdentifierValidationError(
				'UserInfo subject does not match the verified access token',
			);
		}

		return { subject: this.extractSubject(userData, options), ttl };
	}

	/**
	 * Verifies the caller's access token against the issuer's published keys and
	 * confirms it was issued for this instance.
	 */
	private async verifyAccessToken(
		metadata: OAuth2Metadata,
		token: string,
		expectedAudience: string,
	): Promise<JWTPayload> {
		if (token.split('.').length !== 3) {
			throw new IdentifierValidationError(
				'Access token is not a JWT, so its audience cannot be verified. Use the token introspection validation method with this provider.',
			);
		}

		if (!metadata.jwks_uri) {
			throw new IdentifierValidationError(
				'Metadata does not contain a JWKS endpoint, which is required to verify access tokens',
			);
		}

		const { createLocalJWKSet, jwtVerify } = await import('jose');

		const verify = async (jwks: JSONWebKeySet) =>
			await jwtVerify(token, createLocalJWKSet(jwks), { issuer: metadata.issuer });

		let payload: JWTPayload;
		try {
			payload = (await verify(await this.fetchJwks(metadata.jwks_uri))).payload;
		} catch (error) {
			// A key set cached before the issuer rotated its keys has no entry for the new
			// `kid`. Refetch once so a rotation does not black out verification until the
			// cached copy expires. Rate limited, because the key lookup happens before any
			// signature check and so is reachable with an unauthenticated token.
			let refreshed: JSONWebKeySet | undefined;
			if (isNoMatchingKeyError(error)) {
				try {
					refreshed = await this.refreshJwks(metadata.jwks_uri);
				} catch (refreshError) {
					// The refetch itself failed, on transport or on a malformed key set. Report
					// it as a resolution failure rather than let a raw error leave the resolver.
					this.logger.error('Failed to refresh the key set', { error: refreshError });
					throw new IdentifierValidationError('Access token verification failed', {
						cause: refreshError,
					});
				}
			}

			if (!refreshed) {
				this.logger.error('Access token verification failed', { error });
				throw new IdentifierValidationError('Access token verification failed', { cause: error });
			}

			try {
				payload = (await verify(refreshed)).payload;
			} catch (retryError) {
				this.logger.error('Access token verification failed', { error: retryError });
				throw new IdentifierValidationError('Access token verification failed', {
					cause: retryError,
				});
			}

			this.logger.debug('Verified access token after refreshing the key set', {
				issuer: metadata.issuer,
			});
		}

		// Reached by both the cached and the refreshed key set, so an audience failure is
		// never caught by the retry above and relabelled as a verification failure.
		assertAudience(payload, expectedAudience);
		return payload;
	}

	/** `jwks_uri` is third-party controlled, so it goes through the SSRF-guarded client. */
	private async fetchJwks(jwksUri: string, forceRefresh = false): Promise<JSONWebKeySet> {
		return await this.http.fetchMetadata(JwksSchema, {
			metadataUri: jwksUri,
			cachePrefix: `${CACHE_PREFIX}:jwks`,
			skipCache: false,
			forceRefresh,
		});
	}

	/**
	 * Refetches the key set, at most once per cooldown, so a caller presenting tokens
	 * with unknown key ids cannot drive repeated requests at the issuer.
	 *
	 * The cooldown lives in the shared cache so it also holds across mains, but reading
	 * it and then writing it is not atomic and `CacheService` has no set-if-absent. The
	 * in-process table closes the window that matters: a burst of tokens carrying one
	 * unknown key id coalesces into a single request rather than one per caller. Across
	 * mains the cooldown still bounds it to one refresh each.
	 *
	 * @returns the refreshed key set, or undefined when the cooldown is already held.
	 */
	private async refreshJwks(jwksUri: string): Promise<JSONWebKeySet | undefined> {
		const inFlight = this.jwksRefreshes.get(jwksUri);
		if (inFlight) {
			return await inFlight;
		}

		// Registered before the first await inside it runs, so concurrent callers arriving
		// in the meantime join this refresh instead of starting their own.
		const refresh = this.claimAndFetchJwks(jwksUri);
		this.jwksRefreshes.set(jwksUri, refresh);
		try {
			return await refresh;
		} finally {
			this.jwksRefreshes.delete(jwksUri);
		}
	}

	private async claimAndFetchJwks(jwksUri: string): Promise<JSONWebKeySet | undefined> {
		const cooldownKey = `${CACHE_PREFIX}:jwks-refresh:${jwksUri}`;
		if (await this.cache.get<boolean>(cooldownKey)) {
			return undefined;
		}
		await this.cache.set(cooldownKey, true, JWKS_REFRESH_COOLDOWN);
		return await this.fetchJwks(jwksUri, true);
	}

	private async queryUserInfo(
		metadata: OAuth2Metadata,
		context: ICredentialContext,
	): Promise<UserInfoResponse> {
		const response = await this.http.requestFull({
			url: metadata.userinfo_endpoint,
			method: 'GET',
			headers: { authorization: `Bearer ${context.identity}` },
			json: true,
		});

		if (response.statusCode !== 200) {
			this.logger.error('UserInfo failed', {
				status: response.statusCode,
				data: response.body,
			});
			throw new IdentifierValidationError('UserInfo query failed');
		}

		// TODO: Add support for JWT responses in addition to JSON
		return this.parseUserInfoResponse(response.body);
	}

	private extractSubject(userData: UserInfoResponse, options: OAuth2UserInfoOptions): string {
		const subject = userData[options.subjectClaim];
		if (!subject) {
			this.logger.error(`UserInfo response missing subject claim (${options.subjectClaim})`);
			throw new IdentifierValidationError(
				`UserInfo response missing subject claim (${options.subjectClaim})`,
			);
		}

		const subjectStr = String(subject);
		this.logger.debug('UserInfo successfully', { subject: subjectStr });
		return subjectStr;
	}

	/**
	 * `resolve` serves a cached subject without re-verifying the token, so the entry
	 * must never outlive the token itself. The minimum only damps cache churn while
	 * there is lifetime left to spend; it never extends past `exp`.
	 */
	private cacheTtlFor(exp: unknown): number | undefined {
		if (typeof exp !== 'number') {
			return undefined;
		}

		return Math.min(Math.max(exp * 1000 - Date.now(), 0), MAX_TOKEN_CACHE_TIMEOUT);
	}

	/** Legacy path for resolvers stored without an expected audience. */
	private async resolveBasedOnUserInfo(
		metadata: OAuth2Metadata,
		options: OAuth2UserInfoOptions,
		context: ICredentialContext,
	): Promise<{ subject: string; ttl?: number }> {
		const userData = await this.queryUserInfo(metadata, context);

		return {
			subject: this.extractSubject(userData, options),
			ttl: this.cacheTtlFor(userData.exp),
		};
	}
}
