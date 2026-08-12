import { z } from 'zod';

import { Z } from '../../zod-class';

export const EXECUTIONS_NL_FILTER_STATUSES = [
	'all',
	'error',
	'canceled',
	'new',
	'running',
	'success',
	'waiting',
] as const;

/**
 * Subset of `ExecutionFilterType` (editor-ui) that a natural-language query can resolve to.
 * Every field is optional — the model only returns what the query actually specifies, and the
 * frontend merges the result into the existing filter defaults rather than replacing them wholesale.
 */
export class ExecutionsNlFilterResponseDto extends Z.class({
	status: z.enum(EXECUTIONS_NL_FILTER_STATUSES).optional(),
	/** A workflow ID from the request's `workflows` list — never invented by the model. */
	workflowId: z.string().optional(),
	/** ISO 8601 timestamp. */
	startDate: z.string().optional(),
	/** ISO 8601 timestamp. */
	endDate: z.string().optional(),
}) {}
