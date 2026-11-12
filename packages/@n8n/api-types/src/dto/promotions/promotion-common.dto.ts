import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';

/** Prefix for timestamped branches created when createBranchOnPromotion is enabled. */
export const PROMOTION_BRANCH_PREFIX = 'n8n-promotion/';

/**
 * Display name of a provider or environment. Both are `varchar(128)`, so cap
 * the length here to reject over-long text with a 400 instead of a 500.
 * Names do not have to be unique.
 */
export const promotionDisplayNameSchema = z.string().trim().min(1).max(128);

/** The longest commit message that Promote accepts. */
export const PROMOTION_COMMIT_MESSAGE_MAX_LENGTH = 1000;

export const promotionCommitMessageSchema = z
	.string()
	.trim()
	.min(1)
	.max(PROMOTION_COMMIT_MESSAGE_MAX_LENGTH)
	.describe(
		'Message for the promotion commit. If you omit it, the commit uses a generated message.',
	)
	.optional();

/** A selection is a set, so a repeated id is a malformed request. Omitted means none. */
export const promotionSelectedIdsSchema = (field: string) =>
	z
		.array(n8nIdSchema)
		.refine((ids) => new Set(ids).size === ids.length, { message: `${field} contains duplicates` })
		.optional();
