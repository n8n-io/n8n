import { Z } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { Request } from 'express';
import { ICredentialContext, ICredentialResolutionContext } from 'n8n-workflow';
import { z } from 'zod';

import { AuthService } from '@/auth/auth.service';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

import { InboundClaimConnectService } from './inbound-claim-connect.service';

class AuthSourceQuerySchema extends Z.class({
	authSource: z.enum(['bearer', 'cookie']).optional(),
}) {}

const BEARER_TOKEN_REGEX = /^[Bb][Ee][Aa][Rr][Ee][Rr]\s+(.+)$/;

function getBearerToken(req: Request): string | null {
	const headerValue = req.headers['authorization']?.toString();

	if (!headerValue) {
		return null;
	}

	const result = BEARER_TOKEN_REGEX.exec(headerValue);
	const token = result ? result[1] : null;

	if (!token) {
		return null;
	}

	return token;
}

@Service()
export class DynamicCredentialWebService {
	constructor(
		private readonly authService: AuthService,
		private readonly inboundClaimConnectService: InboundClaimConnectService,
	) {}

	private buildCookieCredentialContext(req: Request): ICredentialContext {
		const sessionCookie = this.authService.getCookieToken(req);
		if (sessionCookie === undefined) {
			throw new UnauthenticatedError('Session cookie is missing');
		}
		return {
			identity: sessionCookie,
			version: 1,
			metadata: {
				source: 'cookie-source',
				browserId: this.authService.getBrowserId(req),
				method: this.authService.getMethod(req),
				endpoint: this.authService.getEndpoint(req),
			},
		};
	}

	/**
	 * A presented bearer token is verified here, so a caller arriving with an
	 * external IdP token resolves as that identity. Tokens no trusted source
	 * vouches for are returned untagged, exactly as before - they belong to a
	 * resolver that keys on the token's own subject.
	 */
	async getCredentialContextFromRequest(req: Request): Promise<ICredentialResolutionContext> {
		const parseResult = AuthSourceQuerySchema.safeParse(req.query);

		if (parseResult.success && parseResult.data.authSource !== undefined) {
			const { authSource } = parseResult.data;
			if (authSource === 'bearer') {
				const token = getBearerToken(req);
				if (token === null) {
					throw new UnauthenticatedError('Bearer token is missing');
				}
				return await this.buildBearerCredentialContext(token);
			} else if (authSource === 'cookie') {
				return this.buildCookieCredentialContext(req);
			} else {
				throw new UnauthenticatedError('Invalid auth source');
			}
		}

		const token = getBearerToken(req);
		if (token !== null) {
			return await this.buildBearerCredentialContext(token);
		}

		return this.buildCookieCredentialContext(req);
	}

	private async buildBearerCredentialContext(token: string): Promise<ICredentialResolutionContext> {
		const context: ICredentialContext = {
			identity: token,
			version: 1,
			metadata: {},
		};
		return await this.inboundClaimConnectService.attachVerifiedClaim(context);
	}
}
