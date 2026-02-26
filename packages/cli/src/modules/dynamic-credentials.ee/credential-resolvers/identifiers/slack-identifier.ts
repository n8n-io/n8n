import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';

import { IdentifierValidationError } from './identifier-interface';

/**
 * Slack identity resolver — passthrough mode only.
 *
 * Expects the `SlackRequestExtractor` context establishment hook to have
 * already verified the request signature and extracted the `user_id`.
 * The identity is used directly as the subject without any API call.
 */
@Service()
export class SlackIdentifier {
	constructor(private readonly logger: Logger) {}

	resolve(context: ICredentialContext): string {
		if (!context.identity || context.identity.length === 0) {
			throw new IdentifierValidationError('Empty identity from Slack request');
		}

		this.logger.debug('Using pre-validated Slack identity', { subject: context.identity });
		return context.identity;
	}
}
