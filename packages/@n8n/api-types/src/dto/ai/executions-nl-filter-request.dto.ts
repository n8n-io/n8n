import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExecutionsNlFilterRequestDto extends Z.class({
	/** The user's natural-language query, e.g. "failed runs in the last 24 hours". */
	query: z.string().min(1).max(500),
	/** ISO 8601 timestamp for "now", so the model can resolve relative dates. */
	now: z.string(),
	/** IANA timezone (e.g. "Europe/London"), so relative dates resolve in the user's timezone. */
	timezone: z.string(),
	/** Workflows visible to the user, so the model can map a workflow name to an ID without inventing one. */
	workflows: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
		}),
	),
}) {}
