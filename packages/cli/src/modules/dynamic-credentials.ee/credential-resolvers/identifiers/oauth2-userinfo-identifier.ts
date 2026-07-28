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

// Use minimum of 30 seconds to avoid cache thrashing
// Cap at 5 minutes to ensure periodic revalidation
const MIN_TOKEN_CACHE_TIMEOUT = 30 * Time.seconds.toMilliseconds;
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
	constructor(
		private readonly logger: Logger,
		private readonly cache: CacheService,
		private readonly http: OAuth2MetadataHttpClient,
	) {}

	async validateOptions(identifierOptions: Record<string, unknown>): Promise<void> {
		const options = this.parseOptions(identifierOptions);

		// A UserInfo response carries claims about the user, never about the token, so
		// there is nothing in it to prove the token was issued for us. Binding the
		// identity to an audience means verifying the access token itself, which needs
		// an expected audience to check against.
		if (!options.expectedAudience) {
			throw new IdentifierValidationError(
				'An expected audience is required when validating via the UserInfo endpoint',
			);
		}

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
		if (!metadata.jwks_uri) {
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

		let ttl = DEFAULT_CACHE_TIMEOUT;
		const { subject, ttl: ttlOverwrite } = await this.resolveSubject(metadata, options, context);
		if (ttlOverwrite) {
			ttl = ttlOverwrite;
		}

		await this.cache.set(identifierCacheKey, subject, ttl);
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

		// `jwks_uri` comes from the third-party metadata document, so the fetch goes
		// through the SSRF-guarded client rather than jose's own remote key set.
		const jwks = await this.http.fetchMetadata(JwksSchema, {
			metadataUri: metadata.jwks_uri,
			cachePrefix: `${CACHE_PREFIX}:jwks`,
			skipCache: false,
		});

		const { createLocalJWKSet, jwtVerify } = await import('jose');

		let payload: JWTPayload;
		try {
			({ payload } = await jwtVerify(token, createLocalJWKSet(jwks), {
				issuer: metadata.issuer,
			}));
		} catch (error) {
			this.logger.error('Access token verification failed', { error });
			throw new IdentifierValidationError('Access token verification failed', { cause: error });
		}

		// Checked outside the catch so an audience mismatch is not relabelled as a
		// verification failure, and so both validation modes apply the same rule.
		assertAudience(payload, expectedAudience);

		return payload;
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

	private cacheTtlFor(exp: unknown): number | undefined {
		if (typeof exp !== 'number') {
			return undefined;
		}

		const expiresIn = exp * 1000 - Date.now();
		if (expiresIn > 0) {
			return Math.max(MIN_TOKEN_CACHE_TIMEOUT, Math.min(expiresIn, MAX_TOKEN_CACHE_TIMEOUT));
		}
		return MIN_TOKEN_CACHE_TIMEOUT;
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
