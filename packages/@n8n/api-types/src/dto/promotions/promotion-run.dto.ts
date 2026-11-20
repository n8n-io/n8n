import { z } from 'zod';

/**
 * How the package moved. GitHub, GitLab and plain Git are all `git`. The
 * application checks this value. The database does not.
 */
export const promotionRunTypeSchema = z.enum(['git']);
export type PromotionRunType = z.infer<typeof promotionRunTypeSchema>;

/**
 * What a run carries. A run without `projectIds` covers every project of its environment.
 * This is the place to add finer-grained ids, such as workflows.
 */
export const promotionRunContentsSchema = z
	.object({
		projectIds: z.array(z.string().min(1)).optional(),
	})
	.strict();
export type PromotionRunContents = z.infer<typeof promotionRunContentsSchema>;

/**
 * Payload for a `git` run. `branchName` is the branch the run pushed to or
 * applied from. `commitSha` is the commit it pushed or applied. `contents` is what the
 * run pushed.
 */
export const promotionGitRunDetailsSchema = z
	.object({
		schemaVersion: z.literal(1),
		branchName: z.string().min(1).max(255),
		commitSha: z.string().min(1).max(64),
		contents: promotionRunContentsSchema.optional(),
	})
	.strict();
export type PromotionGitRunDetails = z.infer<typeof promotionGitRunDetailsSchema>;

/** Details schema for each run type. Code selects the schema from the type column. */
export const promotionRunDetailsSchemas = {
	git: promotionGitRunDetailsSchema,
} as const;

export type PromotionRunDetails = {
	[Type in PromotionRunType]: z.infer<(typeof promotionRunDetailsSchemas)[Type]>;
}[PromotionRunType];

/** Parse `details` with the schema for `type`. Do not infer the type from the payload. */
export function parsePromotionRunDetails<T extends PromotionRunType>(
	type: T,
	details: unknown,
): z.infer<(typeof promotionRunDetailsSchemas)[T]> {
	return promotionRunDetailsSchemas[type].parse(details);
}
