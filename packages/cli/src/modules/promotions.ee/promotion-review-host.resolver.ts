import { Service } from '@n8n/di';

import type { GitHostAccess } from './git-hosts/gitlab-merge-request.client';
import type { PromotionOperationInput } from './promotions.types';

/** Where a Promotion Review lives on the host: API access and the project it belongs to. */
export type PromotionReviewHost = Readonly<{
	access: GitHostAccess;
	projectPath: string;
}>;

/**
 * Finds the host API behind a promotion connection. A plain Git provider has no
 * host API, so Promote pushes without opening a review.
 *
 * The GitLab provider type (LIGO-1063) is not on master yet. Once it lands, this
 * resolves a `gitlab` provider to its base URL, token and project path.
 */
@Service()
export class PromotionReviewHostResolver {
	async resolve(_input: PromotionOperationInput): Promise<PromotionReviewHost | null> {
		return null;
	}
}
