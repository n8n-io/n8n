import { z } from 'zod';
import { Z } from 'zod-class';

import { InsightsDateFilterDto } from './date-filter.dto';
import { createTakeValidator, paginationSchema } from '../pagination/pagination.dto';

export const MAX_ITEMS_PER_PAGE = 100;

const VALID_SORT_OPTIONS = [
	'total:asc',
	'total:desc',
	'succeeded:asc',
	'succeeded:desc',
	'failed:asc',
	'failed:desc',
	'failureRate:asc',
	'failureRate:desc',
	'timeSaved:asc',
	'timeSaved:desc',
	'runTime:asc',
	'runTime:desc',
	'averageRunTime:asc',
	'averageRunTime:desc',
	'workflowName:asc',
	'workflowName:desc',
] as const;

// ---------------------
// Parameter Validators
// ---------------------

const sortByValidator = z
	.enum(VALID_SORT_OPTIONS, { message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}` })
	.optional();

export class ListInsightsWorkflowQueryDto extends Z.class({
	...paginationSchema,
	take: createTakeValidator(MAX_ITEMS_PER_PAGE),
	dateRange: InsightsDateFilterDto.shape.dateRange,
	sortBy: sortByValidator,
}) {}
