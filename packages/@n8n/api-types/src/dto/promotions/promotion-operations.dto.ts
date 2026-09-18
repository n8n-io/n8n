import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';
import {
	promotionBindingPreflightResultSchema,
	promotionBindingWarningSchema,
} from './promotion-binding-preflight.dto';

export class PromotePackageDto extends Z.class(
	{
		commitMessage: z.string().trim().min(1).max(1000),
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

/** Describes the instance that handled the request, not any other instance. */
export const promotePackageResultSchema = z.object({
	connectionId: n8nIdSchema,
	configId: n8nIdSchema,
	counts: promotePackageCountsSchema,
	git: promotionGitResultSchema,
});

export class PromotePackageResultDto extends Z.class(promotePackageResultSchema.shape) {}

/** What the import changed. Partial results are visible here too. */
export const applyPackageCountsSchema = z.object({
	projects: z.object({ created: count(), updated: count(), skipped: count(), deleted: count() }),
	folders: z.object({ created: count(), skipped: count(), removed: count() }),
	workflows: z.object({
		created: count(),
		updated: count(),
		skipped: count(),
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
	credentials: z.object({ matched: count(), stubbed: count() }),
	dataTables: z.object({ matched: count(), created: count() }),
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

export class ContinueApplyPackageDto extends Z.class(
	{
		expectedSource: z
			.object({
				configId: n8nIdSchema,
				branchName: z.string().min(1),
				commitSha: z.string().regex(/^[0-9a-f]{40}$/),
			})
			.strict(),
	},
	{ strict: true },
) {}

const applyPackageIdentitySchema = z.object({
	connectionId: n8nIdSchema,
	configId: n8nIdSchema,
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
		preflight: promotionBindingPreflightResultSchema,
	}),
	applyPackageIdentitySchema.extend({ status: z.literal('source-changed') }),
]);

export const ApplyPackageResultDto = {
	name: 'ApplyPackageResultDto',
	schema: applyPackageResultSchema,
	parse: (value: unknown) => applyPackageResultSchema.parse(value),
};

export type ApplyPackageResultDto = z.infer<typeof applyPackageResultSchema>;
