import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { EventService } from '@/events/event.service';
import { AuthlessRequest } from '@/requests';

import { z } from 'zod';

import { TOKEN_EXCHANGE_GRANT_TYPE, TokenExchangeRequestSchema } from './token-exchange.schemas';
import { TokenExchangeService } from './token-exchange.service';

@RestController('/auth/oauth')
export class TokenExchangeController {
	private readonly globalConfig = Container.get(GlobalConfig);

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
		ipRateLimit: { limit: 20, windowMs: 1 * Time.minutes.toMilliseconds },
	})
	async exchangeToken(req: AuthlessRequest, res: Response): Promise<void> {
		if (!this.globalConfig.tokenExchange.enabled) {
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
			await this.tokenExchangeService.exchange(parsed.data);

			this.eventService.emit('token-exchange-succeeded', {
				subject: '', // sub claim extracted by service in later ticket
				actor: undefined, // act.sub claim extracted by service in later ticket
				scopes: parsed.data.scope,
				resource: parsed.data.resource,
				grantType: parsed.data.grant_type,
				clientIp,
				issuer: '', // populated by service in later ticket
			});

			res.json({
				access_token: 'stub-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				issued_token_type: 'urn:ietf:params:oauth:token-type:access_token',
			});
		} catch (error) {
			this.errorReporter.error(error instanceof Error ? error : new Error(String(error)));

			this.eventService.emit('token-exchange-failed', {
				subject: '', // sub claim extracted by service in later ticket
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
