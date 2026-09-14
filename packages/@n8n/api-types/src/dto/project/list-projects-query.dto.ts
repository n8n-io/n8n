import { z } from 'zod';

import { Z } from '../../zod-class';
import { MAX_ITEMS_PER_PAGE } from '../pagination/pagination.dto';

const searchValidator = z.string().trim().optional();

// Custom skip validator that defaults to undefined (not 0) for backward
// compatibility — existing callers that omit pagination params receive a bare array.
const skipValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : undefined))
	.refine((val) => val === undefined || (!isNaN(val) && Number.isInteger(val)), {
		message: 'Param `skip` must be a valid integer',
	})
	.refine((val) => val === undefined || val >= 0, {
		message: 'Param `skip` must be a non-negative integer',
	});

const typeValidator = z.enum(['personal', 'team']).optional();

const activatedValidator = z
	.enum(['true', 'false'])
	.optional()
	.transform((val) => (val === undefined ? undefined : val === 'true'));

// Custom take validator that defaults to undefined (no limit) for backward
// compatibility — existing callers that omit `take` receive all projects.
// When provided, the value is capped at MAX_ITEMS_PER_PAGE.
const takeValidator = z
	.string()
	.optional()
	.transform((val) => (val ? parseInt(val, 10) : undefined))
	.refine((val) => val === undefined || (!isNaN(val) && Number.isInteger(val)), {
		message: 'Param `take` must be a valid integer',
	})
	.refine((val) => val === undefined || val >= 0, {
		message: 'Param `take` must be a non-negative integer',
	})
	.transform((val) => (val !== undefined ? Math.min(val, MAX_ITEMS_PER_PAGE) : undefined));

export class ListProjectsQueryDto extends Z.class({
	skip: skipValidator,
	take: takeValidator,
	search: searchValidator,
	type: typeValidator,
	activated: activatedValidator,
}) {}
