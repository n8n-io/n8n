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

export const EXECUTIONS_NL_FILTER_VOTES = ['all', 'up', 'down'] as const;

/**
 * A text-extraction result — every field is a raw value pulled out of the query, not yet
 * resolved against the user's actual data. In particular `workflowNames` and `annotationTagNames`
 * are names as written in the query (e.g. "Daily Report"), not IDs: the model has no access to
 * the user's workflow/tag lists, so it cannot map a name to an ID without risking a hallucinated
 * one. The frontend resolves each name to a real ID against its already-loaded workflow/tag
 * stores, and merges whatever resolves into the existing filter defaults rather than replacing
 * them wholesale. Note `ExecutionFilterType.workflowId` only supports a single workflow — if
 * more than one name resolves, that's a frontend-side decision (e.g. use the first match).
 */
export class ExecutionsNlFilterResponseDto extends Z.class({
	status: z.enum(EXECUTIONS_NL_FILTER_STATUSES).optional(),
	/** Workflow names/references as they appear in the query, e.g. ["Daily Report", "Slack Alerts"]. Resolved to IDs by the frontend. */
	workflowNames: z.array(z.string()).optional(),
	/** ISO 8601 timestamp. */
	startDate: z.string().optional(),
	/** ISO 8601 timestamp. */
	endDate: z.string().optional(),
	/** Annotation tag names as they appear in the query. Resolved to IDs by the frontend. */
	annotationTagNames: z.array(z.string()).optional(),
	/** Annotation rating ("Good"/"Bad" in the UI). */
	vote: z.enum(EXECUTIONS_NL_FILTER_VOTES).optional(),
	/** Custom/"highlighted" execution data to match on, e.g. a specific field's value. */
	metadata: z
		.array(
			z.object({
				key: z.string(),
				value: z.string(),
				exactMatch: z.boolean().optional(),
			}),
		)
		.optional(),
}) {}
