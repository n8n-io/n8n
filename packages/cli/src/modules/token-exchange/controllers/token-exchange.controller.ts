import { Time } from '@n8n/constants';
import { Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { z, ZodError } from 'zod';

import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { AuthlessRequest } from '@/requests';

import { TokenExchangeService } from '../services/token-exchange.service';
import { TokenExchangeConfig } from '../token-exchange.config';
import { TOKEN_EXCHANGE_GRANT_TYPE, TokenExchangeRequestSchema } from '../token-exchange.schemas';

const configService = Container.get(TokenExchangeConfig);

@RestController('/auth/oauth')
export class TokenExchangeController {
	private readonly config = Container.get(TokenExchangeConfig);

	private readonly errorReporter = Container.get(ErrorReporter);

	private readonly eventService = Container.get(EventService);

	private readonly tokenExchangeService = Container.get(TokenExchangeService);

	/**
	 * RFC 8693 token exchange endpoint.
	 * Accepts application/x-www-form-urlencoded; body is pre-parsed by the
	 * global bodyParser middleware before this handler runs.
	 */
	@Post('/token', {
		skipAuth: true,
		ipRateLimit: {
			limit: configService.rateLimitTokenExchange,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async exchangeToken(req: AuthlessRequest, res: Response): Promise<void> {
		if (!this.config.enabled) {
			res.status(501).json({
				error: 'server_error',
				error_description: 'Token exchange is not enabled on this instance',
			});
			return;
		}

		const clientIp = req.ip ?? 'unknown';

		// Stage 1: verify grant_type before full schema validation so we can
		// return the correct RFC 8693 error code for unknown grant types.
		const { data: grantTypeData } = z
			.object({ grant_type: z.string().optional() })
			.safeParse(req.body);
		if (grantTypeData?.grant_type !== TOKEN_EXCHANGE_GRANT_TYPE) {
			res.status(400).json({
				error: 'unsupported_grant_type',
				error_description: `grant_type must be "${TOKEN_EXCHANGE_GRANT_TYPE}"`,
			});
			return;
		}

		// Stage 2: full schema validation → invalid_request on failure.
		const parsed = TokenExchangeRequestSchema.safeParse(req.body);
		if (!parsed.success) {
			const firstIssue = parsed.error.issues[0];
			res.status(400).json({
				error: 'invalid_request',
				error_description: firstIssue?.message ?? 'Invalid request parameters',
			});
			return;
		}

		// Success path: delegate to service.
		try {
			const result = await this.tokenExchangeService.exchange(parsed.data);

			this.eventService.emit('token-exchange-succeeded', {
				subject: result.subject,
				actor: result.actor,
				scopes: parsed.data.scope,
				resource: parsed.data.resource,
				grantType: parsed.data.grant_type,
				clientIp,
				issuer: result.issuer,
			});

			res.json({
				access_token: result.accessToken,
				token_type: 'Bearer',
				expires_in: result.expiresIn,
				issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
			});
		} catch (error) {
			if (error instanceof AuthError) {
				this.eventService.emit('token-exchange-failed', {
					subject: '',
					failureReason: error.message,
					grantType: parsed.data.grant_type,
					clientIp,
				});
				res.status(400).json({
					error: 'invalid_grant',
					error_description: 'Token exchange failed',
				});
				return;
			}

			if (error instanceof BadRequestError) {
				this.eventService.emit('token-exchange-failed', {
					subject: '',
					failureReason: error.message,
					grantType: parsed.data.grant_type,
					clientIp,
				});
				res.status(400).json({
					error: 'invalid_request',
					error_description: error.message,
				});
				return;
			}

			if (error instanceof ZodError) {
				this.eventService.emit('token-exchange-failed', {
					subject: '',
					failureReason: 'invalid_claims',
					grantType: parsed.data.grant_type,
					clientIp,
				});
				res.status(400).json({
					error: 'invalid_request',
					error_description: 'Token claims validation failed',
				});
				return;
			}

			this.errorReporter.error(error instanceof Error ? error : new Error(String(error)));
			this.eventService.emit('token-exchange-failed', {
				subject: '',
				failureReason: 'internal_error',
				grantType: parsed.data.grant_type,
				clientIp,
			});
			res.status(500).json({
				error: 'server_error',
				error_description: 'An unexpected error occurred during token exchange',
			});
		}
	}
}
