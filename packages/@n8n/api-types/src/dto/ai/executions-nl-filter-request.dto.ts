import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * A pure text-extraction request — the backend has no knowledge of the user's workflows or
 * tags. Any workflow/tag name the query mentions comes back as a raw string in the response;
 * resolving that name to an actual ID is the frontend's job, since it already holds the
 * user's workflow and tag lists locally.
 */
export class ExecutionsNlFilterRequestDto extends Z.class({
	/** The user's natural-language query, e.g. "failed runs in the last 24 hours". */
	query: z.string().min(1).max(500),
	/** ISO 8601 timestamp for "now", so the model can resolve relative dates. */
	now: z.string(),
	/** IANA timezone (e.g. "Europe/London"), so relative dates resolve in the user's timezone. */
	timezone: z.string(),
}) {}
