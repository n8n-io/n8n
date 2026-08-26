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
	// `.datetime()` reproduces the legacy `format: date-time` check, which answered 400.
	startedAfter: z.string().datetime().optional(),
	startedBefore: z.string().datetime().optional(),
	// `limit` only. Spreading the schema would expose `offset`, which is not a public query param.
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
