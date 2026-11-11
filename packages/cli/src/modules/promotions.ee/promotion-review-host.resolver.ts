import type { PromotionProviderAuthType, PromotionReviewType } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { BadRequestError } from '@n8n/errors';

import type { PromotionEnvironment } from './database/entities/promotion-environment.entity';
import { promotionHostBaseUrl, repositoryPathFromUrl } from './git-hosts/git-host-remote';
import type { GitHostAccess } from './git-hosts/git-host.types';
import { PromotionProvidersService } from './promotion-providers.service';
import type { PromotionOperationInput } from './promotions.types';

/** Where a Promotion Review lives on the host: API access and the project it belongs to. */
export type PromotionReviewHost = Readonly<{
	access: GitHostAccess;
	projectPath: string;
}>;

/**
 * Finds the host API behind a promotion environment. A plain Git provider has no
 * host API, so Promote pushes without opening a review.
 */
@Service()
export class PromotionReviewHostResolver {
	constructor(private readonly providersService: PromotionProvidersService) {}

	async resolve(input: PromotionOperationInput): Promise<PromotionReviewHost | null> {
		if (input.providerType !== 'gitlab') return null;

		const access = await this.accessFor(input.hostBaseUrl, {
			authType: input.authType,
			auth: input.encryptedAuth,
		});
		return {
			access,
			projectPath: repositoryPathFromUrl(access.baseUrl, input.remote.remoteUrl),
		};
	}

	/** Host access for a stored review. NULL when the provider no longer matches the review type. */
	async resolveForEnvironment(
		environment: PromotionEnvironment,
		type: PromotionReviewType,
	): Promise<GitHostAccess | null> {
		const provider = await this.providersService.getEntity(environment.providerId);
		if (provider.type !== type) return null;
		return await this.accessFor(promotionHostBaseUrl(provider), provider);
	}

	private async accessFor(
		baseUrl: string | null,
		storedAuth: { authType: PromotionProviderAuthType; auth: string },
	): Promise<GitHostAccess> {
		if (!baseUrl) {
			throw new BadRequestError(
				'The stored provider config cannot be read. Update the provider to replace it.',
			);
		}

		const credentials = await this.providersService.decryptCredentials(storedAuth);
		if (credentials.authType !== 'token') {
			throw new BadRequestError(
				'The stored provider credentials cannot be read. Update the provider to replace them.',
			);
		}

		return { baseUrl, accessToken: credentials.password };
	}
}
