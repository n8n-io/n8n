import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { Z } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { Request } from 'express';
import { ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';

import { SlackAuthService } from './slack-auth.service';

class AuthSourceQuerySchema extends Z.class({
	authSource: z.enum(['bearer', 'cookie', 'slack']).optional(),
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
		private readonly slackAuthService: SlackAuthService,
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

	async getCredentialContextFromRequest(
		req: Request,
		workflowId?: string,
	): Promise<ICredentialContext> {
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
			} else if (authSource === 'slack') {
				if (!workflowId) {
					throw new BadRequestError('workflowId is required for Slack authentication');
				}
				return await this.slackAuthService.buildSlackCredentialContext(req, workflowId);
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
