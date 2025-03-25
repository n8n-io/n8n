import { z } from 'zod';
import { Z } from 'zod-class';

const VALID_SORT_OPTIONS = [
	'total:asc',
	'total:desc',
	'succeeded:asc',
	'succeeded:desc',
	'failed:asc',
	'failed:desc',
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

// Skip parameter validation
const skipValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 0))
	.refine((val) => !isNaN(val), {
		message: 'Skip must be a valid number',
	});

// Take parameter validation
const takeValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : 10))
	.refine((val) => !isNaN(val), {
		message: 'Take must be a valid number',
	});

// SortBy parameter validation
const sortByValidator = z
	.enum(VALID_SORT_OPTIONS, { message: `sortBy must be one of: ${VALID_SORT_OPTIONS.join(', ')}` })
	.optional();

export class ListInsightsWorkflowQueryDto extends Z.class({
	skip: skipValidator,
	take: takeValidator,
	sortBy: sortByValidator,
}) {}
