import { z } from 'zod';

import {
	promotionResourceDependencySchema,
	promotionResourceSchema,
} from './promotion-preview.dto';
import { n8nIdSchema } from '../../schemas/id.schema';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';
import { Z } from '../../zod-class';

/**
 * The state of a Promotion Review. `open` and `changes_requested` mirror the
 * review on the host. `merged` and `closed` are terminal and owned by n8n.
 */
export const promotionReviewStateSchema = z.enum(['open', 'changes_requested', 'merged', 'closed']);
export type PromotionReviewState = z.infer<typeof promotionReviewStateSchema>;

/**
 * Where the review lives. The application checks this value. The database does not.
 */
export const promotionReviewTypeSchema = z.enum(['gitlab']);
export type PromotionReviewType = z.infer<typeof promotionReviewTypeSchema>;

/**
 * Host reference for each review type. Code selects the schema from the type
 * column. GitLab stores `<projectId>!<iid>`. The type column names the host.
 */
export const gitLabRemoteReviewIdSchema = z.string().regex(/^\d+!\d+$/);

export const promotionRemoteReviewIdSchemas = {
	gitlab: gitLabRemoteReviewIdSchema,
} as const;

/** Parse a host reference with the schema for `type`. */
export function parseRemoteReviewId<T extends PromotionReviewType>(
	type: T,
	remoteReviewId: string,
): z.infer<(typeof promotionRemoteReviewIdSchemas)[T]> {
	return promotionRemoteReviewIdSchemas[type].parse(remoteReviewId);
}

const reviewUserSchema = z.object({
	id: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string().nullable(),
});

/**
 * Why the host data of a review is missing. Computed for each request and never stored.
 * `no_connection` means the environment was deleted or its provider no longer matches.
 * The Inbox sync then closes the review.
 */
export const promotionReviewRemoteErrorSchema = z.enum([
	'not_found',
	'auth',
	'unreachable',
	'no_connection',
]);
export type PromotionReviewRemoteError = z.infer<typeof promotionReviewRemoteErrorSchema>;

/** Open rows are one tab, every terminal state is the other. */
export const promotionReviewTabSchema = z.enum(['open', 'closed']);
export type PromotionReviewTab = z.infer<typeof promotionReviewTabSchema>;

/** One review, as the Inbox and the public API show it. */
export const promotionReviewItemSchema = z.object({
	id: z.string(),
	state: promotionReviewTabSchema.openapi({
		description: 'The Inbox tab of the review. `closed` covers the merged and the closed reviews.',
	}),
	reviewState: promotionReviewStateSchema.openapi({
		description:
			'The state of the review. `open` and `changes_requested` come from the Git host. `merged` and `closed` are final.',
	}),
	/** The Git host of the review, such as GitLab. */
	reviewType: promotionReviewTypeSchema,
	title: z.string().nullable(),
	webUrl: z.string().nullable(),
	branchName: z.string().nullable(),
	environmentName: z.string().nullable(),
	requester: reviewUserSchema.nullable(),
	approver: reviewUserSchema.nullable(),
	remoteError: promotionReviewRemoteErrorSchema.nullable().openapi({
		description:
			'Why the Git host data is missing. Then `title`, `webUrl` and `headCommitSha` are NULL, and `hasConflicts` is false without a check. NULL when the Git host answered.',
	}),
	headCommitSha: z.string().nullable().openapi({
		description:
			'The head of the merge request on the Git host. It differs from `runCommitSha` after a push on the Git host.',
	}),
	runCommitSha: z
		.string()
		.nullable()
		.openapi({ description: 'The commit that n8n pushed in the newest promotion.' }),
	hasConflicts: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type PromotionReviewItem = z.infer<typeof promotionReviewItemSchema>;

export class PromotionReviewPublicDto extends Z.class(promotionReviewItemSchema.shape) {}

export class PromotionReviewListPublicDto extends Z.class({
	data: z.array(promotionReviewItemSchema),
	nextCursor: z.string().nullable(),
}) {}

export class ListPromotionReviewsQueryDto extends Z.class(
	{
		state: promotionReviewTabSchema.default('open'),
		limit: publicApiPaginationSchema.limit,
		cursor: z.string().max(2048).optional(),
	},
	{ strict: true },
) {}

const commitShaSchema = z.string().regex(/^[0-9a-f]{40}([0-9a-f]{24})?$/);

export const promotionReviewWarningSchema = z.enum([
	'baselineManifestUnreadable',
	'headManifestUnreadable',
	'commitsUnavailable',
]);
export type PromotionReviewWarning = z.infer<typeof promotionReviewWarningSchema>;

/** How a review ended on the host. The actor is the host user, or the n8n approver. */
export const promotionReviewOutcomeSchema = z.object({
	state: z.enum(['merged', 'closed']),
	at: z.string().datetime().nullable(),
	by: z.string().nullable(),
	webUrl: z.string(),
});
export type PromotionReviewOutcome = z.infer<typeof promotionReviewOutcomeSchema>;

/**
 * What a Promotion Review changes on its target branch, in the shape of the promotion preview.
 * The baseline of an open review is the merge base of its head and the target branch.
 * The baseline of a merged or closed review is the base that the host reports.
 */
export const promotionReviewChangesSchema = z.object({
	baselineCommitSha: commitShaSchema,
	headCommitSha: commitShaSchema,
	resources: z.array(promotionResourceSchema),
	dependencies: z.array(promotionResourceDependencySchema),
	/** Why the changes cannot be listed. The resources are then empty. */
	warnings: z.array(promotionReviewWarningSchema),
	/** NULL while the review is open. */
	outcome: promotionReviewOutcomeSchema.nullable(),
});
export type PromotionReviewChanges = z.infer<typeof promotionReviewChangesSchema>;

/** Repeats the commits of the summary, so the details match it after the review moves. */
export class PromotionReviewDetailsRequestDto extends Z.class(
	{
		baselineCommitSha: commitShaSchema,
		headCommitSha: commitShaSchema,
		keys: z.array(z.string().min(1)).min(1).max(50),
	},
	{ strict: true },
) {}

/** The merge request head the reviewer saw. The approval fails when the host has a newer head. */
export class ApprovePromotionReviewDto extends Z.class({
	headCommitSha: z.string().regex(/^[0-9a-f]{40}([0-9a-f]{24})?$/),
}) {}

/** The review a Promote opened, returned with the promote result. */
export const promotionReviewResultSchema = z.object({
	reviewId: n8nIdSchema,
	['number']: z.number().int(),
	webUrl: z.string(),
});
export type PromotionReviewResult = z.infer<typeof promotionReviewResultSchema>;
