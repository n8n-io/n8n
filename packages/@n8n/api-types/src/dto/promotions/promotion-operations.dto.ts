import '../../openapi-extend';

import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';
import {
	promotionAppliedMoveSchema,
	promotionApplyCheckSchema,
	promotionBindingWarningSchema,
} from './promotion-apply-check.dto';
import {
	expectedPreviewRevisionSchema,
	promotionCommitMessageSchema,
	promotionSelectedIdsSchema,
} from './promotion-common.dto';
import {
	confirmedGapIdsSchema,
	promotionApplyConfirmationShape,
	promotionApplyDependencyResultShape,
	promotionDependencyReportSchema,
} from './promotion-dependency.dto';
import { promotionReviewResultSchema } from './promotion-review.dto';

export class PromotePackageDto extends Z.class(
	{
		commitMessage: promotionCommitMessageSchema,
		force: z.boolean().optional(),
		confirmedGapIds: confirmedGapIdsSchema,
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
	/** Set when the Promote checked its dependencies. An incomplete Promote lists its gaps here. */
	dependencyReport: promotionDependencyReportSchema.optional(),
});

export class PromotePackageResultDto extends Z.class(promotePackageResultSchema.shape) {}

/** The result of a project Promote. Read `status` before the other fields. */
export const promoteSelectionResultSchema = z.discriminatedUnion('status', [
	promotePackageResultSchema.extend({ status: z.literal('promoted') }),
	/** The project or its branch changed after the reviewed preview. Nothing was pushed. */
	z.object({ status: z.literal('preview-changed'), environmentId: n8nIdSchema }),
	/**
	 * The gaps differ from `confirmedGapIds`, or the environment is strict and gaps exist.
	 * Nothing was pushed. The report holds the current gaps.
	 */
	z.object({
		status: z.literal('gaps-changed'),
		environmentId: n8nIdSchema,
		dependencyReport: promotionDependencyReportSchema,
	}),
]);

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
		...promotionApplyConfirmationShape,
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
			'On an apply of an environment, also moves the workflows and folders that `plannedMoves` ' +
			'reports with `needsConfirmation`: they leave a project that the branch does not hold. ' +
			'Without `expectedPreviewRevision`, the confirmation covers every such change and deletion ' +
			'when Continue runs, including those that are not in the reviewed result.',
	});

/** Continue must name the source that the paused Apply reported. */
export class ContinueApplyPackageDto extends Z.class(
	{
		expectedSource: expectedSourceSchema,
		expectedPreviewRevision: expectedPreviewRevisionSchema,
		confirmDestructiveChanges: confirmDestructiveChangesSchema,
		...promotionApplyConfirmationShape,
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
		...promotionApplyConfirmationShape,
	},
	{ strict: true },
) {}

export class ContinueApplySelectionDto extends Z.class(
	{
		...applySelectionShape,
		expectedSource: expectedSourceSchema,
		expectedPreviewRevision: expectedPreviewRevisionSchema,
		confirmDestructiveChanges: confirmDestructiveChangesSchema,
		...promotionApplyConfirmationShape,
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
		/** The workflows and folders that the Apply moved between two team projects. */
		moves: z.array(promotionAppliedMoveSchema).optional(),
		...promotionApplyDependencyResultShape,
		/** Set when the Apply checked its dependencies. An incomplete Apply lists its gaps here. */
		dependencyReport: promotionDependencyReportSchema.optional(),
	}),
	applyPackageIdentitySchema.extend({
		status: z.literal('blocked'),
		check: promotionApplyCheckSchema,
		dependencyReport: promotionDependencyReportSchema.optional(),
		/** Grants that the Apply made before it stopped. A retry does not grant them again. */
		grants: promotionApplyDependencyResultShape.grants,
	}),
	/**
	 * The gaps or the grants differ from the confirmed lists, or the environment is strict and
	 * gaps exist. Nothing was imported. The report holds the current state.
	 */
	applyPackageIdentitySchema.extend({
		status: z.literal('gaps-changed'),
		dependencyReport: promotionDependencyReportSchema,
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

/**
 * The items of one project in a selection across projects. Credentials, data tables, variables
 * and tags of the project come with the workflows that use them. `credentialIds` adds a
 * credential that no selected workflow of its project uses: the exit "Include it" of a gap.
 */
const environmentSelectionProjectSchema = z
	.object({
		projectId: n8nIdSchema,
		workflowIds: promotionSelectedIdsSchema('workflowIds'),
		folderIds: promotionSelectedIdsSchema('folderIds'),
		credentialIds: promotionSelectedIdsSchema('credentialIds'),
	})
	.strict();
export type PromotionEnvironmentSelectionProject = z.infer<
	typeof environmentSelectionProjectSchema
>;

const environmentSelectionProjectsSchema = z
	.array(environmentSelectionProjectSchema)
	.min(1)
	.refine(
		(projects) => new Set(projects.map(({ projectId }) => projectId)).size === projects.length,
		{
			message: 'projects contains a project more than once',
		},
	)
	.openapi({
		description:
			'The selection of each project. Every project must be in the scope of the environment, and the user needs the right to run the operation in each of them.',
	});

/**
 * A selection whose dependency report the client wants before the operation. It is the
 * selection of a Promote or an Apply across projects, and it writes nothing.
 */
export class PromotionDependencyReportRequestDto extends Z.class(
	{
		projects: environmentSelectionProjectsSchema,
		credentialHomes: promotionApplyConfirmationShape.credentialHomes,
	},
	{ strict: true },
) {}

/** A Promote across projects. It writes one commit and opens at most one review. */
export class PromoteEnvironmentSelectionRequestDto extends Z.class(
	{
		projects: environmentSelectionProjectsSchema,
		commitMessage: promotionCommitMessageSchema,
		expectedPreviewRevision: expectedPreviewRevisionSchema,
		confirmedGapIds: confirmedGapIdsSchema,
	},
	{ strict: true },
) {}

/** An Apply across projects. It resolves each reference against the whole selection. */
export class ApplyEnvironmentSelectionRequestDto extends Z.class(
	{
		projects: environmentSelectionProjectsSchema,
		expectedSource: expectedSourceSchema.optional(),
		expectedPreviewRevision: expectedPreviewRevisionSchema,
		confirmDestructiveChanges: confirmDestructiveChangesSchema,
		...promotionApplyConfirmationShape,
	},
	{ strict: true },
) {}
