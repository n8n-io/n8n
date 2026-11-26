import '../../openapi-extend';

import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';
import {
	promotionApplyCheckSchema,
	promotionBindingWarningSchema,
	promotionDependencyWarningSchema,
	promotionMissingDependencySchema,
} from './promotion-apply-check.dto';
import {
	confirmMissingDependenciesSchema,
	expectedPreviewRevisionSchema,
	promotionCommitMessageSchema,
	promotionSelectedIdsSchema,
} from './promotion-common.dto';
import { promotionReviewResultSchema } from './promotion-review.dto';

export class PromotePackageDto extends Z.class(
	{
		commitMessage: promotionCommitMessageSchema,
		force: z.boolean().optional(),
		expectedPreviewRevision: expectedPreviewRevisionSchema.openapi({
			description:
				'The `revision` of the reviewed Promote check. The Promote reads the check again. ' +
				'When it differs, the Promote returns status `preview-changed` and pushes nothing.',
		}),
		confirmMissingDependencies: confirmMissingDependenciesSchema,
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
	/** The confirmed missing dependencies. The branch does not hold them after this Promote. */
	missingDependencies: z.array(promotionMissingDependencySchema).openapi({
		description:
			'The missing dependencies that the caller confirmed. The branch does not hold them after this Promote.',
	}),
});

/** The result of a Promote, of a project or of the instance. Read `status` before the other fields. */
export const promoteResultSchema = z.discriminatedUnion('status', [
	promotePackageResultSchema.extend({ status: z.literal('promoted') }),
	/** The projects or the branch changed after the reviewed preview. Nothing was pushed. */
	z.object({ status: z.literal('preview-changed'), environmentId: n8nIdSchema }),
	/** The Promote has missing dependencies that the caller did not confirm. Nothing was pushed. */
	z.object({
		status: z.literal('missing-dependencies'),
		environmentId: n8nIdSchema,
		missingDependencies: z.array(promotionMissingDependencySchema).min(1),
		warnings: z.array(promotionDependencyWarningSchema),
	}),
]);

export const PromotePackageResultDto = {
	name: 'PromotePackageResultDto',
	schema: promoteResultSchema,
	parse: (value: unknown) => promoteResultSchema.parse(value),
};

export type PromotePackageResultDto = z.infer<typeof promoteResultSchema>;

/** A project Promote returns the same result as an instance Promote. */
export const promoteSelectionResultSchema = promoteResultSchema;

export const PromoteSelectionResultDto = {
	name: 'PromoteSelectionResultDto',
	schema: promoteSelectionResultSchema,
	parse: (value: unknown) => promoteSelectionResultSchema.parse(value),
};

export type PromoteSelectionResultDto = z.infer<typeof promoteSelectionResultSchema>;

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

/** Apply may pin the reviewed source and preview. Without them, the branch tip is applied. */
export class ApplyPackageDto extends Z.class(
	{
		expectedSource: expectedSourceSchema.optional(),
		expectedPreviewRevision: expectedPreviewRevisionSchema,
	},
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
			'Without `expectedPreviewRevision`, the confirmation covers every such change and deletion ' +
			'when Continue runs, including those that are not in the reviewed result.',
	});

/** Continue must name the source that the paused Apply reported. */
export class ContinueApplyPackageDto extends Z.class(
	{
		expectedSource: expectedSourceSchema,
		expectedPreviewRevision: expectedPreviewRevisionSchema,
		confirmDestructiveChanges: confirmDestructiveChangesSchema,
		confirmMissingDependencies: confirmMissingDependenciesSchema,
	},
	{ strict: true },
) {}

/**
 * The selection of a project Apply. Apply always applies the project details, so a request
 * without workflows and folders applies only the project.
 */
const applySelectionShape = {
	workflowIds: promotionSelectedIdsSchema('workflowIds'),
	folderIds: promotionSelectedIdsSchema('folderIds').openapi({
		description:
			'Folders of the project on the branch. Apply creates a selected folder, or moves and renames it to match the branch.',
	}),
};

export class ApplySelectionDto extends Z.class(
	{
		...applySelectionShape,
		expectedSource: expectedSourceSchema.optional(),
		expectedPreviewRevision: expectedPreviewRevisionSchema,
	},
	{ strict: true },
) {}

export class ContinueApplySelectionDto extends Z.class(
	{
		...applySelectionShape,
		expectedSource: expectedSourceSchema,
		expectedPreviewRevision: expectedPreviewRevisionSchema,
		confirmDestructiveChanges: confirmDestructiveChangesSchema,
		confirmMissingDependencies: confirmMissingDependenciesSchema,
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
		/** The confirmed missing dependencies. They are still missing after this Apply. */
		missingDependencies: z.array(promotionMissingDependencySchema).openapi({
			description:
				'The missing dependencies that the caller confirmed. They are still missing on this instance after this Apply.',
		}),
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
