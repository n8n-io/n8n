import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

/**
 * The state of a Promotion Review. `open` mirrors the merge request while it is
 * open. `merged` and `closed` are terminal and owned by n8n. `unavailable` means
 * the merge request or its connection is gone.
 */
export const promotionRunStateSchema = z.enum(['open', 'merged', 'closed', 'unavailable']);
export type PromotionRunState = z.infer<typeof promotionRunStateSchema>;

const reviewUserSchema = z.object({
	id: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string().nullable(),
});

/** One inbox row. Everything here comes from the database, so the list is cheap. */
export const promotionReviewSummarySchema = z.object({
	id: n8nIdSchema,
	title: z.string(),
	state: promotionRunStateSchema,
	hasConflicts: z.boolean(),
	branchName: z.string(),
	commitSha: z.string(),
	webUrl: z.string(),
	mergeRequestIid: z.number().int(),
	connection: z.object({ id: n8nIdSchema, name: z.string() }).nullable(),
	projectId: n8nIdSchema.nullable(),
	createdBy: reviewUserSchema.nullable(),
	approvedBy: reviewUserSchema.nullable(),
	createdAt: z.string(),
	approvedAt: z.string().nullable(),
	mergedAt: z.string().nullable(),
	closedAt: z.string().nullable(),
	lastSyncedAt: z.string().nullable(),
});
export type PromotionReviewSummary = z.infer<typeof promotionReviewSummarySchema>;

export const promotionReviewListPublicSchema = z.object({
	count: z.number().int().nonnegative(),
	data: z.array(promotionReviewSummarySchema),
});
export class PromotionReviewListPublicDto extends Z.class(promotionReviewListPublicSchema.shape) {}

/** Open rows are one tab, every terminal state is the other. */
export const promotionReviewTabSchema = z.enum(['open', 'closed']);
export type PromotionReviewTab = z.infer<typeof promotionReviewTabSchema>;

export class ListPromotionReviewsQueryDto extends Z.class({
	tab: promotionReviewTabSchema.optional(),
	skip: z.coerce.number().int().nonnegative().optional(),
	take: z.coerce.number().int().positive().max(100).optional(),
}) {}

export const promotionReviewChangeKindSchema = z.enum(['added', 'modified', 'deleted']);
export type PromotionReviewChangeKind = z.infer<typeof promotionReviewChangeKindSchema>;

/** A workflow the Promotion Run changed against the Review Baseline. */
export const promotionReviewWorkflowChangeSchema = z.object({
	workflowId: z.string(),
	name: z.string(),
	projectName: z.string().nullable(),
	change: promotionReviewChangeKindSchema,
	/** Repository path of the workflow file at the head commit, or at the baseline for a deletion. */
	path: z.string(),
});
export type PromotionReviewWorkflowChange = z.infer<typeof promotionReviewWorkflowChangeSchema>;

/** The detail view: the row, the merge request as the host reports it, and the changed workflows. */
export const promotionReviewDetailSchema = promotionReviewSummarySchema.extend({
	mergeRequest: z
		.object({
			description: z.string().nullable(),
			sourceBranch: z.string(),
			targetBranch: z.string(),
			authorName: z.string().nullable(),
			approvalsLeft: z.number().int().nullable(),
			mergeStatus: z.string().nullable(),
		})
		.nullable(),
	/** The merge base of the promotion branch head and the base branch. NULL when the checkout cannot compute it. */
	baselineCommitSha: z.string().nullable(),
	workflows: z.array(promotionReviewWorkflowChangeSchema),
	/** Why parts of the detail are missing, for the UI to show. */
	warnings: z.array(z.string()),
});
export class PromotionReviewDetailDto extends Z.class(promotionReviewDetailSchema.shape) {}

/** The two sides of a workflow diff. A side is NULL when the workflow does not exist on that commit. */
export const promotionReviewWorkflowDiffSchema = z.object({
	workflowId: z.string(),
	baselineCommitSha: z.string().nullable(),
	headCommitSha: z.string(),
	base: z.record(z.unknown()).nullable(),
	head: z.record(z.unknown()).nullable(),
});
export class PromotionReviewWorkflowDiffDto extends Z.class(
	promotionReviewWorkflowDiffSchema.shape,
) {}

/** The merge request a Promote opened, as returned with the promote result. */
export const promotionMergeRequestResultSchema = z.object({
	runId: n8nIdSchema,
	iid: z.number().int(),
	webUrl: z.string(),
});
export type PromotionMergeRequestResult = z.infer<typeof promotionMergeRequestResultSchema>;
