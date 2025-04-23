import { z } from 'zod';
import { Z } from 'zod-class';

import { paginationSchema } from '../pagination/pagination.dto';

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
] as const;

// ---------------------
// Parameter Validators
// ---------------------

const sortByValidator = z
	.enum(VALID_SORT_OPTIONS, { message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}` })
	.optional();

export class ListInsightsWorkflowQueryDto extends Z.class({
	...paginationSchema,
	sortBy: sortByValidator,
}) {}
