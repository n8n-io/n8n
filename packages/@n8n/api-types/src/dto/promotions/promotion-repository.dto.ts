import { z } from 'zod';

import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

/** GitLab branch pages include full commit details, so keep discovery pages small. */
export const MAX_PROMOTION_DISCOVERY_ITEMS_PER_PAGE = 50;

const discoveryQueryShape = {
	limit: publicApiPaginationSchema.limit.transform((limit) =>
		Math.min(limit, MAX_PROMOTION_DISCOVERY_ITEMS_PER_PAGE),
	),
	cursor: z.string().max(2048).optional(),
	search: z.string().trim().max(255).optional(),
};

export class ListPromotionRepositoriesQueryDto extends Z.class(discoveryQueryShape, {
	strict: true,
}) {}

export class ListPromotionBranchesQueryDto extends Z.class(discoveryQueryShape, {
	strict: true,
}) {}

export const promotionRepositoryIdParamSchema = z
	.string()
	.min(1)
	.max(256)
	.refine((id) => id !== '.' && id !== '..', { message: 'Invalid repository ID' });

export const promotionRepositorySchema = z.object({
	id: z.string(),
	name: z.string(),
	fullPath: z.string(),
	remoteUrl: z.string(),
	defaultBranch: z.string().nullable(),
});
export type PromotionRepository = z.infer<typeof promotionRepositorySchema>;

export class PromotionRepositoryListPublicDto extends Z.class({
	data: z.array(promotionRepositorySchema),
	nextCursor: z.string().nullable(),
}) {}

export const promotionBranchSchema = z.object({
	name: z.string(),
	isDefault: z.boolean(),
});
export type PromotionBranch = z.infer<typeof promotionBranchSchema>;

export class PromotionBranchListPublicDto extends Z.class({
	data: z.array(promotionBranchSchema),
	nextCursor: z.string().nullable(),
}) {}
