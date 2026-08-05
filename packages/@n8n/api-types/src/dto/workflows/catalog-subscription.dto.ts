import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * A person's own schedule for a catalog workflow.
 *
 * The cron expression and timezone are only shape-checked here; whether they
 * describe a schedule that can actually fire is settled by the scheduler when
 * the subscription is planned, so there is one answer rather than two.
 */
export class CatalogSubscriptionDto extends Z.class({
	cronExpression: z.string().trim().min(1).max(255),
	timezone: z.string().trim().min(1).max(255),
	/**
	 * Left as an open record for the same reason as a manual run: the accepted
	 * keys are whatever the workflow declares, so they cannot be known here.
	 */
	inputs: z.record(z.string(), z.unknown()).optional(),
	/** Defaults to on: someone setting up a schedule means it to run. */
	enabled: z.boolean().optional(),
}) {}
