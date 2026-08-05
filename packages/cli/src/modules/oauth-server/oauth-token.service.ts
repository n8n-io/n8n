import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { TransactionRunner, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UnexpectedError } from 'n8n-workflow';
import { randomBytes, randomUUID } from 'node:crypto';

import { EventService } from '@/events/event.service';
import { JwtService } from '@/services/jwt.service';
import type {
	OAuthTokenVerifier,
	UserWithContext,
} from '@/services/oauth-token-verifier-proxy.service';
import type { ProtectedResource } from '@/services/protected-resource.registry';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

import { AccessTokenRepository } from './database/repositories/oauth-access-token.repository';
import { RefreshTokenRepository } from './database/repositories/oauth-refresh-token.repository';
import { AccessTokenNotFoundError, JWTVerificationError } from './oauth.errors';

/**
 * Manages the OAuth 2.1 token lifecycle for the shared OAuth server.
 * Generates, validates, rotates, and revokes access and refresh tokens.
 *
 * Registered as the `OAuthTokenVerifierProxy` provider on module init, so
 * protected-resource modules can verify tokens through the core proxy
 * without importing this module.
 */
@Service()
export class OAuthTokenService implements OAuthTokenVerifier {
	private readonly ACCESS_TOKEN_EXPIRY_SECONDS = 1 * Time.hours.toSeconds;
	private readonly REFRESH_TOKEN_EXPIRY_MS = 30 * Time.days.toMilliseconds;
	// A subject assertion is a short-lived, single-use bridge consumed synchronously
	// by the token-exchange grant; it never travels further than the AS itself.
	private readonly SUBJECT_ASSERTION_EXPIRY_SECONDS = 60;

	constructor(
		private readonly logger: Logger,
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
		private readonly resourceRegistry: ProtectedResourceRegistry,
		private readonly txRunner: TransactionRunner,
		private readonly eventService: EventService,
	) {}

	getAccessTokenExpirySeconds(): number {
		return this.ACCESS_TOKEN_EXPIRY_SECONDS;
	}

	/**
	 * Mint a short-lived subject assertion for the internal token-exchange
	 * (on-behalf-of) grant. It represents the human "subject" the AS itself
	 * vouches for; the exchange grant validates it and mints a delegated access
	 * token whose `sub` is this user.
	 *
	 * It is NOT an access token: no `oauth_access_tokens` row is persisted and no
	 * `meta.isOAuth` marker is set, and the `purpose` claim keeps it from ever
	 * being replayed as one (see {@link validateSubjectAssertion}).
	 */
	mintSubjectAssertion(userId: string): string {
		const now = Math.floor(Date.now() / 1000);
		return this.jwtService.sign({
			sub: userId,
			purpose: 'subject_token',
			iat: now,
			exp: now + this.SUBJECT_ASSERTION_EXPIRY_SECONDS,
		});
	}

	/**
	 * Validate a subject assertion minted by {@link mintSubjectAssertion}:
	 * signature + expiry (enforced by `jwtService.verify`) and
	 * `purpose === 'subject_token'`. Returns the subject `sub`; throws otherwise.
	 */
	validateSubjectAssertion(token: string): string {
		let decoded: unknown;
		try {
			decoded = this.jwtService.verify(token);
		} catch {
			throw new JWTVerificationError();
		}

		const purpose = this.getStringClaim(decoded, 'purpose');
		const sub = this.getStringClaim(decoded, 'sub');
		if (purpose !== 'subject_token' || !sub) {
			throw new JWTVerificationError();
		}

		return sub;
	}

	/**
	 * Validate an `actor_token` for the RFC 8693 token-exchange grant. Unlike a
	 * subject assertion, this is one of our OWN minted access tokens presented as
	 * an *identity proof* of the acting party: verify its signature/expiry, confirm
	 * its `oauth_access_tokens` row still exists (so a revoked token can't stand in
	 * as an actor — the same existence check {@link verifyTokenWithAudiences} uses),
	 * and return its `sub`. Throws otherwise.
	 *
	 * Audience is deliberately NOT enforced: an actor_token proves who is acting,
	 * it is not an access grant for a specific resource.
	 */
	async validateActorToken(token: string): Promise<string> {
		let decoded: unknown;
		try {
			decoded = this.jwtService.verify(token);
		} catch {
			throw new JWTVerificationError();
		}

		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: { token },
		});
		if (!accessTokenRecord) {
			throw new AccessTokenNotFoundError();
		}

		const sub = this.getStringClaim(decoded, 'sub');
		if (!sub) {
			throw new JWTVerificationError();
		}

		return sub;
	}

	async generateAccessTokenOnly(
		userId: string,
		clientId: string,
		resource: string | undefined,
		scopes: string[],
		actorUserId?: string,
	): Promise<{ accessToken: string; jti: string }> {
		const { accessToken, jti } = this.generateTokenPair(
			userId,
			clientId,
			resource,
			scopes,
			actorUserId,
		);
		// Persist the access token: verification checks the token row exists, so an
		// unsaved token would be rejected. No refresh token is issued for
		// client_credentials (RFC 6749 §4.4.3).
		await this.txRunner.run({}, async (ctx) => {
			await this.accessTokenRepository.insertToken({ token: accessToken, clientId, userId }, ctx);
		});
		return { accessToken, jti };
	}

	generateTokenPair(
		userId: string,
		clientId: string,
		resource: string | undefined,
		scopes: string[],
		actorUserId?: string,
	): { accessToken: string; refreshToken: string; jti: string } {
		// Pre-RFC-8707 clients omit the resource indicator; fall back to the
		// registry's default resource (the instance MCP server).
		const audience = resource ?? this.resourceRegistry.getDefaultResource()?.getResourceUrl();
		if (!audience) {
			throw new UnexpectedError(
				'Cannot mint an OAuth access token: no resource requested and no default protected resource is registered',
			);
		}

		// Surface the jti so mint/verify sites can log it as a correlation handle
		// (grep-stitch a mint to its verify). The token itself is never logged.
		const jti = randomUUID();

		const accessToken = this.jwtService.sign({
			sub: userId,
			// RFC 8693 `act` claim: the delegated (on-behalf-of) actor. Present only
			// for token-exchange grants; autonomous client_credentials pass nothing.
			...(actorUserId ? { act: { sub: actorUserId } } : {}),
			aud: audience,
			client_id: clientId,
			jti,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + this.ACCESS_TOKEN_EXPIRY_SECONDS,
			// RFC 9068 space-delimited scope claim. Always present on new tokens
			// (empty string for scope-less grants), so an absent claim
			// unambiguously identifies a token minted before scoping shipped.
			scope: scopes.join(' '),
			meta: {
				isOAuth: true,
			},
		});

		const refreshToken = randomBytes(32).toString('hex');

		return { accessToken, refreshToken, jti };
	}

	async saveTokenPair(
		accessToken: string,
		refreshToken: string,
		clientId: string,
		userId: string,
		scopes: string[],
	): Promise<void> {
		await this.txRunner.run({}, async (ctx) => {
			await this.accessTokenRepository.insertToken({ token: accessToken, clientId, userId }, ctx);
			await this.refreshTokenRepository.insertToken(
				{
					token: refreshToken,
					clientId,
					userId,
					expiresAt: Date.now() + this.REFRESH_TOKEN_EXPIRY_MS,
					scope: scopes,
				},
				ctx,
			);
		});
	}

	async validateAndRotateRefreshToken(
		refreshToken: string,
		clientId: string,
		resource?: string,
	): Promise<OAuthTokens> {
		return await this.txRunner.run({}, async (ctx) => {
			const now = Date.now();

			const refreshTokenRecord = await this.refreshTokenRepository.findByToken(
				refreshToken,
				clientId,
				ctx,
			);

			// InvalidGrantError so the SDK token handler responds 400 invalid_grant (RFC 6749 §5.2)
			// instead of 500 server_error, letting clients fall back to re-authorization.
			if (!refreshTokenRecord) {
				throw new InvalidGrantError('Invalid refresh token');
			}

			const numAffected = await this.refreshTokenRepository.deleteValidByToken(
				refreshToken,
				clientId,
				now,
				ctx,
			);
			if (numAffected < 1) {
				throw new InvalidGrantError('Invalid refresh token');
			}

			const scopes = refreshTokenRecord.scope;

			const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(
				refreshTokenRecord.userId,
				clientId,
				resource,
				scopes,
			);

			await this.accessTokenRepository.insertToken(
				{ token: accessToken, clientId, userId: refreshTokenRecord.userId },
				ctx,
			);

			await this.refreshTokenRepository.insertToken(
				{
					token: newRefreshToken,
					clientId,
					userId: refreshTokenRecord.userId,
					expiresAt: now + this.REFRESH_TOKEN_EXPIRY_MS,
					scope: scopes,
				},
				ctx,
			);

			this.logger.info('Refresh token rotated and new access token issued', {
				clientId,
				userId: refreshTokenRecord.userId,
			});

			return {
				access_token: accessToken,
				token_type: 'Bearer',
				expires_in: this.ACCESS_TOKEN_EXPIRY_SECONDS,
				refresh_token: newRefreshToken,
				scope: scopes.join(' '),
			};
		});
	}

	async verifyAccessToken(token: string, expectedAudience?: string): Promise<AuthInfo> {
		return await this.verifyTokenWithAudiences(
			token,
			await this.getAllowedAudiences(expectedAudience),
		);
	}

	private async verifyTokenWithAudiences(
		token: string,
		allowedAudiences: string[],
	): Promise<AuthInfo> {
		let decoded: unknown;

		try {
			decoded = this.verifyJwtWithAllowedAudiences(token, allowedAudiences);
		} catch (error) {
			throw new JWTVerificationError();
		}

		const clientId = this.getStringClaim(decoded, 'client_id');
		const userId = this.getStringClaim(decoded, 'sub');
		if (!clientId || !userId) {
			throw new JWTVerificationError();
		}

		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: { token },
		});

		if (!accessTokenRecord) {
			throw new AccessTokenNotFoundError();
		}

		// `jti` is carried through `extra` purely as a log-correlation handle (mint↔verify).
		const jti = this.getStringClaim(decoded, 'jti');

		// RFC 8693 `act.sub`: the delegated actor (agent SA) on an on-behalf-of token.
		// Absent on autonomous (client_credentials) tokens.
		const actorId = this.getActorSub(decoded);

		return {
			token,
			clientId,
			scopes: this.parseScopeClaim(decoded),
			extra: {
				userId,
				...(jti ? { jti } : {}),
				...(actorId ? { actorId } : {}),
			},
		};
	}

	/**
	 * Scopes carried by an access token. Tokens always carry a `scope` claim
	 * (empty string for scope-less grants).
	 */
	private parseScopeClaim(decoded: unknown): string[] {
		const scopeClaim = this.getStringClaim(decoded, 'scope');

		// Migration 1784000000047 deleted every access token minted before
		// scoping shipped, so a claim-less token cannot legitimately occur.
		// Fail closed rather than granting anything.
		if (scopeClaim === null) {
			return [];
		}

		return scopeClaim === '' ? [] : scopeClaim.split(' ');
	}

	private emitTokenVerified(
		sub: string | null,
		aud: string | undefined,
		outcome: 'success' | 'failure',
		act: string | null = null,
	) {
		this.eventService.emit('service-account-token-verified', {
			sub,
			act,
			aud: aud ?? '',
			outcome,
		});
	}

	async verifyOAuthAccessToken(token: string, expectedAudience?: string): Promise<UserWithContext> {
		try {
			const resource = await this.getResourceByAudience(expectedAudience);

			// Fail closed: a token bearing a resource-scoped audience whose resource
			// can't be resolved (deleted, or a transient resolver failure the registry
			// swallows to `undefined`) must NOT bypass the authorize gate below.
			if (expectedAudience && !resource) {
				this.logger.debug('OAuth token verification failed', {
					reason: 'unresolved_audience',
					aud: expectedAudience,
				});
				this.emitTokenVerified(null, expectedAudience, 'failure');
				return { user: null, context: { reason: 'insufficient_scope', auth_type: 'oauth' } };
			}

			const authInfo = await this.verifyTokenWithAudiences(
				token,
				this.audiencesForResource(resource, expectedAudience),
			);

			const userId =
				authInfo.extra && typeof authInfo.extra === 'object'
					? this.getStringClaim(authInfo.extra, 'userId')
					: null;
			if (!userId) {
				this.logger.debug('OAuth token verification failed', {
					reason: 'user_id_not_in_auth_info',
					aud: expectedAudience,
				});
				this.emitTokenVerified(null, expectedAudience, 'failure');
				return { user: null, context: { reason: 'user_id_not_in_auth_info', auth_type: 'oauth' } };
			}

			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['role'],
			});

			if (!user) {
				this.logger.debug('OAuth token verification failed', {
					reason: 'user_not_found',
					aud: expectedAudience,
					sub: userId,
				});
				this.emitTokenVerified(userId, expectedAudience, 'failure');
				return { user: null, context: { reason: 'user_not_found', auth_type: 'oauth' } };
			}

			if (resource && !(await resource.authorize(user))) {
				this.logger.warn('OAuth token denied: user lacks execute access', {
					userId: user.id,
					expectedAudience,
				});
				this.emitTokenVerified(userId, expectedAudience, 'failure');
				return { user: null, context: { reason: 'insufficient_scope', auth_type: 'oauth' } };
			}

			// On a delegated (on-behalf-of) token, resolve the actor (agent SA)
			// alongside the subject. Authorization stays keyed on the SUBJECT above —
			// the actor is surfaced for attribution only, never authorized against.
			const { actorId, actor } = await this.resolveActor(authInfo);

			// Trace: who is acting (verified user + client) against which resource, now.
			// `jti` correlates this verify back to the mint that issued the token.
			const jti =
				authInfo.extra && typeof authInfo.extra === 'object'
					? this.getStringClaim(authInfo.extra, 'jti')
					: null;
			this.logger.info('Verified OAuth access token', {
				userId,
				clientId: authInfo.clientId,
				aud: expectedAudience,
				scope: authInfo.scopes.join(' '),
				...(jti ? { jti } : {}),
				...(actorId ? { act: actorId } : {}),
			});
			this.emitTokenVerified(userId, expectedAudience, 'success', actorId);
			return { user, authType: 'oauth', scopes: authInfo.scopes, ...(actor ? { actor } : {}) };
		} catch (error) {
			this.emitTokenVerified(null, expectedAudience, 'failure');
			const errorForSure = ensureError(error);
			const reason =
				errorForSure instanceof JWTVerificationError
					? 'invalid_token'
					: errorForSure instanceof AccessTokenNotFoundError
						? 'token_not_found_in_db'
						: 'unknown_error';
			this.logger.debug('OAuth token verification failed', { reason, aud: expectedAudience });
			return {
				user: null,
				context: {
					reason,
					auth_type: 'oauth',
					error_details: errorForSure.message,
				},
			};
		}
	}

	/** Deletes every access and refresh token a user holds for a client. */
	async revokeAllTokensForGrant(clientId: string, userId: string): Promise<void> {
		await Promise.all([
			this.accessTokenRepository.delete({ clientId, userId }),
			this.refreshTokenRepository.delete({ clientId, userId }),
		]);
	}

	async revokeAccessToken(token: string, clientId: string): Promise<boolean> {
		const result = await this.accessTokenRepository.delete({
			token,
			clientId,
		});

		const revoked = (result.affected ?? 0) > 0;

		if (revoked) {
			this.logger.info('Access token revoked', { clientId });
		}

		return revoked;
	}

	async revokeRefreshToken(token: string, clientId: string): Promise<boolean> {
		const result = await this.refreshTokenRepository.delete({
			token,
			clientId,
		});

		const revoked = (result.affected ?? 0) > 0;

		if (revoked) {
			this.logger.info('Refresh token revoked', { clientId });
		}

		return revoked;
	}

	/**
	 * Resolve the `aud` values a token may carry for the given resource.
	 *
	 * Audiences come from the matching registered resource ONLY — never union
	 * audiences across resources, otherwise a token minted for one resource
	 * would pass another resource's gate (cross-resource token replay).
	 * Resource-specific legacy audiences (e.g. the instance MCP server's
	 * pre-RFC-8707 `mcp-server-api`) stay scoped to their own resource this way.
	 */
	private async getAllowedAudiences(expectedAudience?: string): Promise<string[]> {
		const resource = expectedAudience
			? await this.resourceRegistry.getByResourceUrl(expectedAudience)
			: undefined;
		return this.audiencesForResource(resource, expectedAudience);
	}

	/**
	 * Derive the `aud` values accepted for a (possibly pre-resolved) resource.
	 * Single source of the audience-derivation rule shared by `getAllowedAudiences`
	 * and the resolve-once path in `verifyOAuthAccessToken`.
	 */
	private audiencesForResource(
		resource: ProtectedResource | undefined,
		expectedAudience?: string,
	): string[] {
		if (expectedAudience) {
			return resource ? resource.getAudiences() : [expectedAudience];
		}

		// No expected audience: the caller cannot know which resource the token
		// targets (MCP SDK generic verification), so accept any registered
		// resource's audiences. Resource gates must pass `expectedAudience`.
		return this.resourceRegistry.getAllAudiences();
	}

	private async getResourceByAudience(
		expectedAudience?: string,
	): Promise<ProtectedResource | undefined> {
		const resource = expectedAudience
			? await this.resourceRegistry.getByResourceUrl(expectedAudience)
			: this.resourceRegistry.getDefaultResource();

		if (resource) {
			// Trace: which registered resource an audience resolved to at verify time.
			this.logger.debug('Resolved protected resource for audience', {
				aud: expectedAudience,
				resourceId: resource.getResourceUrl(),
				resolver: resource.id,
			});
		}

		return resource;
	}

	// TODO: drop legacy audiences and the per-audience fallback once all legacy
	// tokens minted before n8n v2.19 have aged out (refresh-token lifespan).
	private verifyJwtWithAllowedAudiences(token: string, audiences: string[]): unknown {
		try {
			return this.jwtService.verify(token, {
				audience: audiences as [string, ...string[]],
			});
		} catch (error) {
			// Some jsonwebtoken builds reject the array form for tokens signed with a single-string aud.
			for (const audience of audiences) {
				try {
					return this.jwtService.verify(token, { audience });
				} catch {
					continue;
				}
			}

			throw error;
		}
	}

	private getStringClaim(payload: unknown, claim: string): string | null {
		if (!payload || typeof payload !== 'object') return null;
		const claimValue = (payload as Record<string, unknown>)[claim];
		return typeof claimValue === 'string' ? claimValue : null;
	}

	/** Extract the RFC 8693 `act.sub` (delegated actor), or null when absent. */
	private getActorSub(payload: unknown): string | null {
		if (!payload || typeof payload !== 'object') return null;
		const act = (payload as Record<string, unknown>).act;
		return this.getStringClaim(act, 'sub');
	}

	/**
	 * Resolve the delegated actor (agent SA) carried on an on-behalf-of token via
	 * `authInfo.extra.actorId`. Returns the raw `actorId` (for trace logging) and
	 * the resolved `User` when it exists. Both are absent on autonomous tokens.
	 */
	private async resolveActor(
		authInfo: AuthInfo,
	): Promise<{ actorId: string | null; actor?: User }> {
		const actorId =
			authInfo.extra && typeof authInfo.extra === 'object'
				? this.getStringClaim(authInfo.extra, 'actorId')
				: null;
		if (!actorId) {
			return { actorId: null };
		}
		const actor =
			(await this.userRepository.findOne({
				where: { id: actorId },
				relations: ['role'],
			})) ?? undefined;
		return { actorId, actor };
	}
}
