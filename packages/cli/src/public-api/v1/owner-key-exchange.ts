import { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { N8N_CLIENT_HEADER, Time } from '@n8n/constants';
import { GLOBAL_OWNER_ROLE, isUniqueConstraintError } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	AuthError,
	BadRequestError,
	ConflictError,
	ForbiddenError,
	OperationalError,
} from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import express from 'express';

import { EmailAuthHandler } from '@/auth/handlers/email.auth-handler';
import { MfaService } from '@/mfa/mfa.service';
import { resolvePublicApiClient } from '@/public-api/public-api-client';
import { PublicApiKeyService } from '@/services/public-api-key.service';
import { RateLimitService } from '@/services/rate-limit.service';

import { OwnerKeyExchangeDto, ownerKeyExchangePath } from './owner-key-exchange.dto';

/** This credential exchange has no session, API key middleware or response replay cache. */
export function ownerKeyExchangeRouter(isApiKeyAuthEnabled: () => boolean): express.Router {
	const router = express.Router();
	const limits = Container.get(RateLimitService);
	const parseCredentials = express.json({ limit: '16kb', inflate: false });
	router.post(
		ownerKeyExchangePath,
		(req, res, next) => {
			res.set('Cache-Control', 'no-store');
			if (
				!Container.get(GlobalConfig).publicApi.ownerKeyExchangeEnabled ||
				!isApiKeyAuthEnabled()
			) {
				res.status(404).json({ message: 'not found' });
				return;
			}
			if (!req.is('application/json')) {
				res.status(415).json({ message: 'Use application/json' });
				return;
			}
			next();
		},
		limits.createIpRateLimitMiddleware({ limit: 20, windowMs: Time.minutes.toMilliseconds }),
		(req, res, next) =>
			parseCredentials(req, res, (error: unknown) => {
				if (!error) return next();
				// A parser error can contain the raw body. Do not pass it to the error logger.
				const status = error instanceof Error && 'status' in error ? error.status : 400;
				res
					.status(status === 413 || status === 415 ? status : 400)
					.json({ message: 'Invalid key exchange request' });
			}),
		(req, res, next) => {
			const result = OwnerKeyExchangeDto.safeParse(req.body);
			if (!result.success) {
				res.status(400).json({ message: 'Invalid key exchange request' });
				return;
			}
			// Normalize the identifier before the limiter and password check.
			req.body = result.data;
			next();
		},
		limits.createBodyKeyedRateLimitMiddleware(OwnerKeyExchangeDto, {
			source: 'body',
			field: 'email',
			limit: 5,
			windowMs: Time.minutes.toMilliseconds,
		}),
		async (req: express.Request<object, unknown, OwnerKeyExchangeDto>, res) => {
			const { email, password, mfaCode, label, scopes, expiresInDays } = req.body;
			const user = await Container.get(EmailAuthHandler)
				.handleLogin(email, password)
				.catch((error: unknown) => {
					if (error instanceof AuthError) return undefined;
					throw error;
				});
			const mfa = Container.get(MfaService);
			if (
				!user ||
				user.disabled ||
				user.role.slug !== GLOBAL_OWNER_ROLE.slug ||
				(user.mfaEnabled
					? !mfaCode || !(await mfa.validateMfa(user.id, mfaCode, undefined))
					: await mfa.isMFAEnforced())
			) {
				Container.get(EventService).emit('user-login-failed', {
					authenticationMethod: 'email',
					userEmail: email,
					reason: 'wrong credentials',
				});
				throw new AuthError('Unauthorized');
			}
			const keys = Container.get(PublicApiKeyService);
			if (!hasGlobalScope(user, 'apiKey:create')) throw new ForbiddenError('Forbidden');
			if (!keys.apiKeyHasValidScopesForRole(user, scopes))
				throw new BadRequestError('Invalid scopes for the owner');
			const expiresAt = Math.floor(Date.now() / 1000) + expiresInDays * Time.days.toSeconds;
			const key = await keys
				.createPublicApiKeyForUser(user, { label, scopes, expiresAt })
				.catch((error: unknown) => {
					if (isUniqueConstraintError(error)) throw new ConflictError('Use a new API key label');
					// Database errors can contain query parameters. Do not return or log them.
					throw new OperationalError('Could not create the API key');
				});
			Container.get(EventService).emit('public-api-key-created', {
				user,
				publicApi: resolvePublicApiClient(req.headers[N8N_CLIENT_HEADER]),
			});
			res.status(201).json({ id: key.id, apiKey: key.apiKey, expiresAt });
		},
	);
	return router;
}
