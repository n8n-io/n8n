import { Service } from '@n8n/di';

import { UrlService } from '@/services/url.service';

import { TokenExchangeConfig } from '../token-exchange.config';

/**
 * Single source of truth for the audience external tokens must target to be
 * accepted at context establishment. Kept separate from
 * `InboundClaimVerificationHook` so this decision is independently testable
 * and swappable later (e.g. by IAM-1175's per-surface work) without touching
 * the hook.
 */
@Service()
export class InboundAudienceService {
	constructor(
		private readonly config: TokenExchangeConfig,
		private readonly urlService: UrlService,
	) {}

	getExpectedAudience(): string {
		return this.config.inboundAudience || this.urlService.getInstanceBaseUrl();
	}
}
