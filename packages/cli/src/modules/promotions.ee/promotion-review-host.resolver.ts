import { Service } from '@n8n/di';

import { BadRequestError } from '@n8n/errors';

import { repositoryPathFromUrl } from './git-hosts/git-host-remote';
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
		if (!input.hostBaseUrl) {
			throw new BadRequestError(
				'The stored provider config cannot be read. Update the provider to replace it.',
			);
		}

		const credentials = await this.providersService.decryptCredentials({
			authType: input.authType,
			auth: input.encryptedAuth,
		});
		if (credentials.authType !== 'token') {
			throw new BadRequestError(
				'The stored provider credentials cannot be read. Update the provider to replace them.',
			);
		}

		return {
			access: {
				baseUrl: input.hostBaseUrl,
				accessToken: credentials.password,
			},
			projectPath: repositoryPathFromUrl(input.hostBaseUrl, input.remote.remoteUrl),
		};
	}
}
