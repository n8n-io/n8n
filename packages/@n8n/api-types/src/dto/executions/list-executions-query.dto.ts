import { ExecutionStatusList } from 'n8n-workflow';
import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';
import { Z } from '../../zod-class';

export class ListExecutionsQueryDto extends Z.class({
	includeData: booleanFromString.optional().default('false'),
	ignoreDataSizeLimit: booleanFromString.optional().default('false'),
	// Tri-state: `true` redacts, `false` needs the `execution:reveal` scope, omitted follows policy.
	redactExecutionData: booleanFromString.optional(),
	status: z.enum(ExecutionStatusList).optional(),
	workflowId: z.string().optional(),
	projectId: z.string().optional(),
	// `{ offset: true }` matches the legacy `format: date-time` check exactly: it accepts `Z` and a
	// numeric offset, and rejects a value with no timezone.
	startedAfter: z.string().datetime({ offset: true }).optional(),
	startedBefore: z.string().datetime({ offset: true }).optional(),
	// `limit` only. Spreading the schema would expose `offset`, which is not a public query param.
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
