import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';
import { Z } from '../../zod-class';
import { paginationSchema } from '../pagination/pagination.dto';

export class ListPromotionProjectEnvironmentsAllowListQueryDto extends Z.class({
	...paginationSchema,
	search: z.string().trim().max(255).optional(),
	allowEnvironments: booleanFromString.optional(),
}) {}

export class UpdatePromotionProjectEnvironmentsAllowListDto extends Z.class({
	allowEnvironments: z.boolean(),
}) {}

export type PromotionProjectEnvironmentsAllowListProject = {
	id: string;
	name: string;
	allowEnvironments: boolean;
};

export type PromotionProjectEnvironmentsAllowList = {
	count: number;
	data: PromotionProjectEnvironmentsAllowListProject[];
};

export type PromotionProjectEnvironmentsAllowListResponse = {
	allowEnvironments: boolean;
};
