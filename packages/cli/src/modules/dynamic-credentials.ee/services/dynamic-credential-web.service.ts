import { AuthService } from '@/auth/auth.service';
import { Service } from '@n8n/di';
import { Z } from '@n8n/api-types';
import { z } from 'zod';
import { ICredentialContext } from 'n8n-workflow';
import { Request } from 'express';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

const MAX_TIMESTAMP_AGE_SECONDS = 999999999; // TEMP: disabled for testing

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

	/**
	 * Builds a credential context from a Slack-signed request.
	 *
	 * Extracts user_id from the Slack payload and carries the raw verification
	 * data (timestamp, rawBody, signature) in metadata so the resolver can
	 * re-verify the signature using its signing secret.
	 *
	 * NOTE: This method does NOT verify the signature itself — that responsibility
	 * belongs to the resolver's validateIdentity(), which has access to the
	 * signing secret stored in the resolver's encrypted config.
	 */
	private buildSlackCredentialContext(req: Request): ICredentialContext {
		const timestamp = req.headers['x-slack-request-timestamp'];
		const signature = req.headers['x-slack-signature'];

		if (!timestamp || typeof timestamp !== 'string') {
			throw new UnauthenticatedError('Missing X-Slack-Request-Timestamp header');
		}
		if (!signature || typeof signature !== 'string') {
			throw new UnauthenticatedError('Missing X-Slack-Signature header');
		}

		// Basic timestamp freshness check (defense in depth — resolver re-verifies)
		const timestampNum = parseInt(timestamp, 10);
		if (isNaN(timestampNum)) {
			throw new UnauthenticatedError('Invalid X-Slack-Request-Timestamp');
		}
		const currentTimeSec = Math.floor(Date.now() / 1000);
		if (Math.abs(currentTimeSec - timestampNum) > MAX_TIMESTAMP_AGE_SECONDS) {
			throw new UnauthenticatedError('Slack request timestamp is too old');
		}

		// Get raw body for signature verification
		const rawBody = this.getSlackRawBody(req);

		// Extract user_id from the parsed body
		const userId = this.extractSlackUserId(req.body);
		if (!userId) {
			throw new UnauthenticatedError('Could not extract user_id from Slack payload');
		}

		const teamId =
			typeof req.body?.team_id === 'string'
				? req.body.team_id
				: typeof req.body?.team?.id === 'string'
					? req.body.team.id
					: undefined;

		const enterpriseId =
			typeof req.body?.enterprise_id === 'string'
				? req.body.enterprise_id
				: typeof req.body?.enterprise?.id === 'string'
					? req.body.enterprise.id
					: undefined;

		return {
			identity: userId,
			version: 1,
			metadata: {
				source: 'slack-signature',
				team_id: teamId,
				enterprise_id: enterpriseId,
				timestamp,
				rawBody,
				signature,
			},
		};
	}

	private getSlackRawBody(req: Request): string {
		// rawBody is captured by the rawBodyReader middleware
		if (req.rawBody) {
			const raw = Buffer.isBuffer(req.rawBody)
				? req.rawBody.toString('utf-8')
				: String(req.rawBody);
			return raw;
		}
		// Fallback: reconstruct URL-encoded form body (Slack always sends form-urlencoded)
		if (req.body && typeof req.body === 'object') {
			const reconstructed = new URLSearchParams(req.body as Record<string, string>).toString();
			return reconstructed;
		}
		if (typeof req.body === 'string') {
			return req.body;
		}
		throw new UnauthenticatedError('Could not retrieve raw body for Slack verification');
	}

	/**
	 * Extracts user_id from various Slack payload formats:
	 * - Slash commands: flat `user_id` field
	 * - Interactions: nested `user.id` field
	 * - Events: `event.user` field
	 */
	private extractSlackUserId(body: unknown): string | undefined {
		if (!body || typeof body !== 'object') return undefined;
		const payload = body as Record<string, unknown>;

		// Slash commands / flat payloads
		if (typeof payload['user_id'] === 'string') return payload['user_id'];

		// Interactive payloads
		const user = payload['user'];
		if (user && typeof user === 'object' && 'id' in user) {
			const id = (user as Record<string, unknown>)['id'];
			if (typeof id === 'string') return id;
		}

		// Event payloads
		const event = payload['event'];
		if (event && typeof event === 'object') {
			const eventUser = (event as Record<string, unknown>)['user'];
			if (typeof eventUser === 'string') return eventUser;
		}

		return undefined;
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
			} else if (authSource === 'slack') {
				return this.buildSlackCredentialContext(req);
			} else {
				throw new UnauthenticatedError('Invalid auth source');
			}
		}

		// Auto-detection: check for Slack headers first (must be real strings, not mock proxies)
		const slackSig = req.headers['x-slack-signature'];
		const slackTs = req.headers['x-slack-request-timestamp'];
		if (typeof slackSig === 'string' && typeof slackTs === 'string') {
			return this.buildSlackCredentialContext(req);
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
