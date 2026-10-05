import { Service } from '@n8n/di';
import {
	AuthenticationDriver,
	Reject,
	TrustedSourceStore,
	type AdvertisedResource,
	type Extracted,
	type Result,
	type TrustedSource,
	type Verified,
} from '@n8n/inbound-auth';
import jwt from 'jsonwebtoken';

import { Logger } from '@n8n/backend-common';
import { getPublicKeyFromJwk } from './key.utils';

/** The only `typ` accepted today. Its future home is the source config, next to `algorithms`. */
export const ACCEPTED_TOKEN_TYPES = ['at+jwt', 'application/at+jwt'];

type JwtFailure = { name: string; message: string };
const isJwtFailure = (error: unknown): error is JwtFailure =>
	typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string';

/** Verifies `Authorization: Bearer` JWTs against the JWKS discovered for an oauth2 source. */
@Service()
export class Oauth2BearerDriver extends AuthenticationDriver {
	readonly credentialKind = 'bearer' as const;

	readonly sourceTypes: Array<TrustedSource['type']> = ['oauth2'];

	private readonly logger: Logger;

	constructor(
		private readonly store: TrustedSourceStore,
		logger: Logger,
	) {
		super();
		this.logger = logger.scoped('inbound-auth');
	}

	async selectSource(extracted: Extracted): Promise<TrustedSource | undefined> {
		let issuer: string | undefined;
		try {
			const decoded = jwt.decode(extracted.credential.token);
			issuer = typeof decoded === 'object' && decoded !== null ? decoded?.iss : undefined;
		} catch (error) {
			// Handle JWT decode error if necessary
			this.logger.warn('Failed to decode JWT', { error });
		}
		return issuer ? await this.store.getByIssuer(issuer) : undefined;
	}

	private reject(error: unknown): Reject {
		if (!isJwtFailure(error)) return { ok: false, reason: 'signature-invalid' };
		switch (error.name) {
			case 'TokenExpiredError':
				return { ok: false, reason: 'expired', detail: error.message };
			case 'JsonWebTokenError':
				if (error.message === 'jwt must be provided')
					return { ok: false, reason: 'not-an-access-token' };
				if (error.message.startsWith('jwt audience invalid'))
					return { ok: false, reason: 'audience-mismatch', detail: error.message };
				return { ok: false, reason: 'signature-invalid', detail: error.message };
			case 'NotBeforeError':
				return { ok: false, reason: 'expired', detail: error.message };
			default:
				return { ok: false, reason: 'signature-invalid', detail: error.name };
		}
	}

	async verify(extracted: Extracted, source: TrustedSource): Promise<Result<Verified>> {
		const { authentication } = source.config;

		const jwks = source.metadata?.documents.find((doc) => doc.kind === 'jwks');

		if (!jwks) {
			return {
				ok: false,
				reason: 'source-unusable',
				detail: 'JWKS document not found',
			};
		}

		const allowedAudiences =
			source.config.surfaces[extracted.surface]?.audiences ?? extracted.resource.acceptedAudiences;

		let token: jwt.Jwt;
		try {
			token = await new Promise((resolve, reject) => {
				jwt.verify(
					extracted.credential.token,
					(header, keyCallback) => {
						if (!header.kid) {
							return keyCallback(new Error('Missing kid in JWT header'));
						}
						const key = getPublicKeyFromJwk(jwks.keys, header.kid);
						if (!key) {
							return keyCallback(new Error('Public key not found for the given kid'));
						}
						keyCallback(null, key);
					},
					{
						issuer: source.issuer,
						algorithms: authentication.algorithms,
						clockTolerance: authentication.clockSkewSeconds,
						complete: true,
					},
					(jwtError, decoded) => {
						if (jwtError) {
							reject(jwtError);
						} else {
							if (!decoded) {
								reject(new Error('Decoded JWT is undefined'));
								return;
							}
							resolve(decoded);
						}
					},
				);
			});
		} catch (error) {
			return this.reject(error);
		}

		const { typ } = token.header;
		if (!typ || !ACCEPTED_TOKEN_TYPES.includes(typ)) {
			return { ok: false, reason: 'not-an-access-token' };
		}

		const payload =
			typeof token.payload === 'object' && token.payload !== null ? token.payload : {};

		const { exp, iat } = payload;
		if (typeof exp !== 'number' || typeof iat !== 'number') return { ok: false, reason: 'expired' };
		const max = authentication.maxTokenLifetimeSeconds;
		if (exp - iat > max)
			return {
				ok: false,
				reason: 'expired',
				detail: `lifetime ${exp - iat}s exceeds the source maximum of ${max}s`,
			};

		if (iat > Math.floor(Date.now() / 1000) + authentication.clockSkewSeconds) {
			return { ok: false, reason: 'expired', detail: 'Token is not yet valid' };
		}

		const tokenAudiences = typeof payload.aud === 'string' ? [payload.aud] : (payload.aud ?? []);

		if (!tokenAudiences.some((aud) => allowedAudiences.includes(aud))) {
			return {
				ok: false,
				reason: 'audience-mismatch',
				detail: 'JWT audience is not allowed',
			};
		}

		const {
			credential,
			request: { headers: _headers, ...request },
			...rest
		} = extracted;
		return {
			ok: true,
			value: {
				...rest,
				request,
				credentialKind: credential.kind,
				source,
				claims: payload,
				expiresAt: new Date(exp * 1000),
			},
		};
	}

	advertise(
		resource: AdvertisedResource,
		sources: TrustedSource[],
	): { authorizationServers?: string[]; challenge?: string } {
		try {
			const url = new URL(resource.resource.url);

			const path = url.pathname === '/' ? '' : url.pathname;
			return {
				authorizationServers: sources.filter((s) => s.type === 'oauth2').map((s) => s.issuer),
				challenge: `Bearer resource_metadata="${url.origin}/.well-known/oauth-protected-resource${path}"`,
			};
		} catch (error) {
			this.logger.warn('Failed to advertise resource', { error });
			return {};
		}
	}
}
