import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Workflow names are sent purely as matching context — the model picks the right full name when
 * the query only carries a fragment or a rough paraphrase. It still returns *names*, never IDs, so
 * the frontend keeps ownership of resolving a name to a real workflow (see
 * `ExecutionsNlFilterResponseDto`).
 */
export class ExecutionsNlFilterRequestDto extends Z.class({
	/** The user's natural-language query, e.g. "failed runs in the last 24 hours". */
	query: z.string().min(1).max(500),
	/** ISO 8601 timestamp for "now", so the model can resolve relative dates. */
	now: z.string(),
	/** IANA timezone (e.g. "Europe/London"), so relative dates resolve in the user's timezone. */
	timezone: z.string(),
	/** Names of the workflows visible to the user, so a fragment in the query can be matched to one. */
	workflowNames: z.array(z.string()).default([]),
}) {}
