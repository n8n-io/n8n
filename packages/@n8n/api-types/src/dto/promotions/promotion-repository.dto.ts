import { z } from 'zod';

import { Z } from '../../zod-class';
import { createLimitValidator } from '../pagination/pagination.dto';

/** Git host APIs such as GitLab's return at most 100 items for each page. */
export const MAX_PROMOTION_REPOSITORIES_PER_PAGE = 100;

export class ListPromotionRepositoriesQueryDto extends Z.class({
	limit: createLimitValidator(MAX_PROMOTION_REPOSITORIES_PER_PAGE).refine((limit) => limit > 0, {
		message: 'Param `limit` must be a positive integer',
	}),
	cursor: z.string().optional(),
	/** Matches the repository name or its namespace path. */
	search: z.string().trim().max(255).optional(),
}) {}

/**
 * A repository that the provider's credentials can reach. `remoteUrl` suits the
 * provider's auth type, so a connection can use it as its target unchanged.
 */
export const promotionRepositorySchema = z.object({
	id: z.string(),
	fullPath: z.string(),
	remoteUrl: z.string(),
});
export type PromotionRepository = z.infer<typeof promotionRepositorySchema>;

export class PromotionRepositoryListPublicDto extends Z.class({
	data: z.array(promotionRepositorySchema),
	nextCursor: z.string().nullable(),
}) {}
