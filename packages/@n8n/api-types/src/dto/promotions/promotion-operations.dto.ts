import '../../openapi-extend';

import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';
import {
	promotionApplyCheckSchema,
	promotionBindingWarningSchema,
} from './promotion-apply-check.dto';
import { promotionCommitMessageSchema } from './promotion-common.dto';
import { promotionReviewResultSchema } from './promotion-review.dto';

export class PromotePackageDto extends Z.class(
	{
		commitMessage: promotionCommitMessageSchema,
		force: z.boolean().optional(),
	},
	{ strict: true },
) {}

/** The Git part of an operation result. A new transport returns its own instead. */
export const promotionGitResultSchema = z.object({
	commitSha: z.string(),
	/**
	 * For Promote, the branch it pushed to. That is the configured base branch for a
	 * direct push, or the new promotion branch once branching lands. For Apply, the
	 * branch the package came from.
	 */
	branchName: z.string(),
});

const count = () => z.number().int().nonnegative();

/** What ended up in the exported package, after folders and auto-inclusion. */
export const promotePackageCountsSchema = z.object({
	workflows: count(),
	folders: count(),
	credentials: count(),
	dataTables: count(),
	variables: count(),
	tags: count(),
});

/** A follow-up step that failed after the push. `linkUrl` is an http(s) URL that n8n wrote. */
export const promotionPromoteWarningSchema = z.object({
	message: z.string(),
	linkUrl: z.string().optional(),
});
export type PromotionPromoteWarning = z.infer<typeof promotionPromoteWarningSchema>;

/** Describes the instance that handled the request, not any other instance. */
export const promotePackageResultSchema = z.object({
	environmentId: n8nIdSchema,
	counts: promotePackageCountsSchema,
	git: promotionGitResultSchema,
	/** Set when the push opened a review for the promotion branch. */
	review: promotionReviewResultSchema.optional(),
	/** The push succeeded, but a follow-up step did not. The admin can finish it on the host. */
	warnings: z.array(promotionPromoteWarningSchema).optional(),
});

export class PromotePackageResultDto extends Z.class(promotePackageResultSchema.shape) {}

/** What the import changed. Partial results are visible here too. */
export const applyPackageCountsSchema = z.object({
	projects: z.object({ created: count(), updated: count(), skipped: count(), deleted: count() }),
	folders: z.object({
		created: count(),
		updated: count().openapi({
			description: 'Existing folders that Apply moved or renamed to match the branch.',
		}),
		skipped: count(),
		moved: count().openapi({
			description:
				'Updated folders that Apply moved under another parent of their project. Included in `updated`.',
		}),
		renamed: count().openapi({
			description: 'Updated folders that Apply gave the name on the branch. Included in `updated`.',
		}),
		removed: count(),
	}),
	workflows: z.object({
		created: count(),
		updated: count(),
		skipped: count(),
		moved: count().openapi({
			description:
				'Updated workflows that Apply also moved to another folder of their project. Included in `updated`.',
		}),
		archived: count(),
		deleted: count(),
		publishing: z.object({
			published: count(),
			unpublished: count(),
			unchanged: count(),
			blocked: count(),
			failed: count(),
		}),
	}),
	credentials: z.object({ matched: count(), stubbed: count(), updated: count() }),
	dataTables: z.object({ matched: count(), created: count(), updated: count() }),
	variables: z.object({
		matched: count(),
		created: count(),
		updated: count(),
		stubbed: count(),
		missing: count(),
	}),
	tags: z.object({
		matched: count(),
		created: count(),
		renamed: count(),
		reconciled: count(),
		skipped: count(),
	}),
});

const expectedSourceSchema = z
	.object({
		environmentId: n8nIdSchema,
		branchName: z.string().min(1),
		commitSha: z.string().regex(/^[0-9a-f]{40}([0-9a-f]{24})?$/),
	})
	.strict();

/** Apply may pin the reviewed source. Without it, the branch tip is applied. */
export class ApplyPackageDto extends Z.class(
	{ expectedSource: expectedSourceSchema.optional() },
	{ strict: true },
) {}

const confirmDestructiveChangesSchema = z
	.boolean()
	.optional()
	.openapi({
		description:
			'Also applies destructive data table changes, which a `destructive-change` conflict reports: ' +
			'removed or retyped columns. The values in those columns are removed. ' +
			'Rows and other columns are kept. ' +
			'On a full apply, also deletes the team projects that a `project-deletion` conflict reports, ' +
			'with everything in them. ' +
			'The confirmation covers every such change and deletion when Continue runs, ' +
			'including those that are not in the reviewed result.',
	});

/** Continue must name the source that the paused Apply reported. */
export class ContinueApplyPackageDto extends Z.class(
	{
		expectedSource: expectedSourceSchema,
		confirmDestructiveChanges: confirmDestructiveChangesSchema,
	},
	{ strict: true },
) {}

const expectedPreviewRevisionSchema = z
	.string()
	.regex(/^[0-9a-f]{64}$/)
	.optional()
	.openapi({
		description:
			'The `revision` of the reviewed Apply preview. Apply builds the preview again and returns ' +
			'status `preview-changed` without writing when it differs, for example after a local edit.',
	});

/** The selection is a set, so a repeated workflow id is a malformed request. */
const selectedWorkflowIdsSchema = z
	.array(n8nIdSchema)
	.min(1)
	.refine((ids) => new Set(ids).size === ids.length, {
		message: 'workflowIds contains duplicates',
	});

export class ApplySelectionDto extends Z.class(
	{
		workflowIds: selectedWorkflowIdsSchema,
		expectedSource: expectedSourceSchema.optional(),
		expectedPreviewRevision: expectedPreviewRevisionSchema,
	},
	{ strict: true },
) {}

export class ContinueApplySelectionDto extends Z.class(
	{
		workflowIds: selectedWorkflowIdsSchema,
		expectedSource: expectedSourceSchema,
		expectedPreviewRevision: expectedPreviewRevisionSchema,
		confirmDestructiveChanges: confirmDestructiveChangesSchema,
	},
	{ strict: true },
) {}

const applyPackageIdentitySchema = z.object({
	environmentId: n8nIdSchema,
	git: promotionGitResultSchema,
});

export const applyPackageResultSchema = z.discriminatedUnion('status', [
	applyPackageIdentitySchema.extend({
		status: z.literal('applied'),
		counts: applyPackageCountsSchema,
		warnings: z.array(promotionBindingWarningSchema),
	}),
	applyPackageIdentitySchema.extend({
		status: z.literal('blocked'),
		check: promotionApplyCheckSchema,
	}),
	applyPackageIdentitySchema.extend({ status: z.literal('source-changed') }),
	/** This instance changed after the reviewed preview. Nothing was imported. */
	applyPackageIdentitySchema.extend({ status: z.literal('preview-changed') }),
]);

export const ApplyPackageResultDto = {
	name: 'ApplyPackageResultDto',
	schema: applyPackageResultSchema,
	parse: (value: unknown) => applyPackageResultSchema.parse(value),
};

export type ApplyPackageResultDto = z.infer<typeof applyPackageResultSchema>;
