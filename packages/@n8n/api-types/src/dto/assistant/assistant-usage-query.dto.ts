import { z } from 'zod';

import { TimeZoneSchema } from '../../schemas/timezone.schema';
import { Z } from '../../zod-class';
import { createTakeValidator, paginationSchema } from '../pagination/pagination.dto';

/** The longest date range that the usage endpoints accept. */
export const ASSISTANT_USAGE_MAX_RANGE_DAYS = 366;

const ASSISTANT_USAGE_USERS_SORT_OPTIONS = [
	'conversations:asc',
	'conversations:desc',
	'messages:asc',
	'messages:desc',
	'workflowsCreated:asc',
	'workflowsCreated:desc',
	'agentsCreated:asc',
	'agentsCreated:desc',
	'dataTablesCreated:asc',
	'dataTablesCreated:desc',
	'lastUsedAt:asc',
	'lastUsedAt:desc',
] as const;

export type AssistantUsageUsersSortBy = (typeof ASSISTANT_USAGE_USERS_SORT_OPTIONS)[number];

const rangeShape = {
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	/** Counts only the usage in this project. */
	projectId: z.string().min(1).max(36).optional(),
};

export class AssistantUsageQueryDto extends Z.class({
	...rangeShape,
	/** Time zone of the daily buckets. Defaults to UTC. */
	timeZone: TimeZoneSchema,
}) {}

export class AssistantUsageUsersQueryDto extends Z.class({
	...rangeShape,
	...paginationSchema,
	take: createTakeValidator(100),
	sortBy: z
		.enum(ASSISTANT_USAGE_USERS_SORT_OPTIONS, {
			message: `sortBy must be one of: ${ASSISTANT_USAGE_USERS_SORT_OPTIONS.join(', ')}`,
		})
		.optional(),
}) {}
