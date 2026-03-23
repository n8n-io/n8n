import { AuthService } from '@/auth/auth.service';
import { Service } from '@n8n/di';
import { Z } from '@n8n/api-types';
import { z } from 'zod';
import { ICredentialContext } from 'n8n-workflow';
import { Request } from 'express';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

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
	constructor(private readonly authService: AuthService) {}

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

	getCredentialContextFromRequest(req: Request): ICredentialContext {
		const parseResult = AuthSourceQuerySchema.safeParse(req.query);

		if (parseResult.success && parseResult.data.authSource !== undefined) {
			const { authSource } = parseResult.data;
			if (authSource === 'bearer') {
				const token = getBearerToken(req);
				if (token === null) {
					throw new UnauthenticatedError('Bearer token is missing');
				}
				return {
					identity: token,
					version: 1,
					metadata: {},
				};
			} else if (authSource === 'cookie') {
				return this.buildCookieCredentialContext(req);
			} else {
				throw new UnauthenticatedError('Invalid auth source');
			}
		}

		const token = getBearerToken(req);
		if (token !== null) {
			return {
				identity: token,
				version: 1,
				metadata: {},
			};
		}

		return this.buildCookieCredentialContext(req);
	}
}
