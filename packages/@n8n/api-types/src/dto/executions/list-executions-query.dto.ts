import { ExecutionStatusList } from 'n8n-workflow';
import { z } from 'zod';

import { booleanFromString } from '../../schemas/boolean-from-string';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';
import { Z } from '../../zod-class';

export class ListExecutionsQueryDto extends Z.class({
	includeData: booleanFromString.optional().default('false'),
	ignoreDataSizeLimit: booleanFromString.optional().default('false'),
	// Tri-state on purpose: `true` always redacts, `false` requests unredacted data and needs the
	// `execution:reveal` scope, and omitted follows the workflow's redaction policy.
	redactExecutionData: booleanFromString.optional(),
	status: z.enum(ExecutionStatusList).optional(),
	workflowId: z.string().optional(),
	projectId: z.string().optional(),
	// `.datetime()` reproduces the `format: date-time` check the legacy validator ran. Without it a
	// malformed value reaches the query builder instead of answering 400.
	startedAfter: z.string().datetime().optional(),
	startedBefore: z.string().datetime().optional(),
	// `limit` only. Spreading `publicApiPaginationSchema` would expose `offset`, which is not a
	// Public API query param.
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
