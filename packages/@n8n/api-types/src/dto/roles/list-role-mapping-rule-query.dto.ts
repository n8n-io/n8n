import { z } from 'zod';

import { Z } from '../../zod-class';
import {
	createTakeValidator,
	MAX_ITEMS_PER_PAGE,
	paginationSchema,
} from '../pagination/pagination.dto';

const VALID_SORT_OPTIONS = [
	'order:asc',
	'order:desc',
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
] as const;

const sortByValidator = z
	.enum(VALID_SORT_OPTIONS, { message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}` })
	.optional();

const typeFilterValidator = z.enum(['instance', 'project']).optional();

export class ListRoleMappingRuleQueryDto extends Z.class({
	...paginationSchema,
	take: createTakeValidator(MAX_ITEMS_PER_PAGE),
	type: typeFilterValidator,
	sortBy: sortByValidator,
}) {}

export type ListRoleMappingRuleQueryInput = z.infer<(typeof ListRoleMappingRuleQueryDto)['schema']>;
