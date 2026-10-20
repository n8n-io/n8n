import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
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

/** What the host reports about the review. NULL when the host did not answer. */
const promotionReviewRemoteSchema = z.object({
	title: z.string(),
	webUrl: z.string(),
	hasConflicts: z.boolean(),
});
export type PromotionReviewRemote = z.infer<typeof promotionReviewRemoteSchema>;

/**
 * One inbox row. The branch and commit stay off this row. They live on the newest
 * run, and the list query does not load runs.
 */
export const promotionReviewSummarySchema = z.object({
	id: n8nIdSchema,
	state: promotionReviewStateSchema,
	/** Host reference for the review type. GitLab stores `<projectId>!<iid>`. NULL when the review lives in n8n. */
	remoteReviewId: z.string().nullable(),
	environment: z.object({ id: n8nIdSchema, name: z.string() }).nullable(),
	createdBy: reviewUserSchema.nullable(),
	approvedBy: reviewUserSchema.nullable(),
	createdAt: z.string().datetime(),
	approvedAt: z.string().datetime().nullable(),
	/** Time of the latest state change. NULL until the first change. */
	lastStateChangeAt: z.string().datetime().nullable(),
	remote: promotionReviewRemoteSchema.nullable(),
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
	offset: z.coerce.number().int().nonnegative().optional(),
	limit: z.coerce.number().int().positive().max(100).optional(),
}) {}

export const promotionReviewChangeKindSchema = z.enum(['added', 'modified', 'deleted']);
export type PromotionReviewChangeKind = z.infer<typeof promotionReviewChangeKindSchema>;

/** A workflow the Promotion Review changed against the Review Baseline. */
export const promotionReviewWorkflowChangeSchema = z.object({
	workflowId: z.string(),
	name: z.string(),
	projectName: z.string().nullable(),
	change: promotionReviewChangeKindSchema,
	/** Repository path of the workflow file at the head commit, or at the baseline for a deletion. */
	path: z.string(),
});
export type PromotionReviewWorkflowChange = z.infer<typeof promotionReviewWorkflowChangeSchema>;

/** The detail view: the row, the newest run, the merge request, and the changed workflows. */
export const promotionReviewDetailSchema = promotionReviewSummarySchema.extend({
	/** The branch of the newest run. */
	branchName: z.string(),
	/** The commit of the newest run. */
	commitSha: z.string(),
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
	/**
	 * The commit the review diffs against. Open: the merge base of the promotion
	 * branch head and the base branch. Merged or closed: the base the host reports.
	 * NULL when neither can be read.
	 */
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

/** The review a Promote opened, returned with the promote result. */
export const promotionReviewResultSchema = z.object({
	reviewId: n8nIdSchema,
	['number']: z.number().int(),
	webUrl: z.string(),
});
export type PromotionReviewResult = z.infer<typeof promotionReviewResultSchema>;
