import { z } from 'zod';

import { promotionDisplayNameSchema } from './promotion-common.dto';
import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

export const promotionDirectionSchema = z.enum(['apply', 'promote']);
export type PromotionDirection = z.infer<typeof promotionDirectionSchema>;

/**
 * Every config carries a branch for its direction. A direction that is not set up
 * has no config at all. Git sets no limit on branch names, so cap it here to keep
 * the payload small. The backend still checks the name with Git.
 */
const branchNameSchema = z.string().trim().min(1).max(255);

/** Apply imports the package from `branchName`. */
export const promotionGitApplySettingsSchema = z
	.object({ schemaVersion: z.literal(1), branchName: branchNameSchema })
	.strict();

/**
 * Promote starts from `baseBranchName`. With branching off it pushes there
 * directly. With branching on it creates the promotion branch from there. The
 * branch it really pushed to comes back in the result and is never saved here.
 *
 * `createBranchOnPromotion` is always required. A write replaces the whole config,
 * so a default here would let an unrelated edit reset it. The off-by-default
 * choice lives in the UI toggle and the CLI examples instead.
 */
export const promotionGitPromoteSettingsSchema = z
	.object({
		schemaVersion: z.literal(1),
		baseBranchName: branchNameSchema,
		createBranchOnPromotion: z.boolean(),
	})
	.strict();

/**
 * Settings schema for each direction. Use this map when the direction is known,
 * such as when checking a stored row. A new provider type adds its own map, with
 * its own fields and no branch name.
 */
export const promotionGitSettingsSchemas = {
	apply: promotionGitApplySettingsSchema,
	promote: promotionGitPromoteSettingsSchema,
} as const;

export const promotionConfigSettingsSchema = z.union([
	promotionGitApplySettingsSchema,
	promotionGitPromoteSettingsSchema,
]);
export type PromotionConfigSettings = z.infer<typeof promotionConfigSettingsSchema>;

/*
 * Request bodies for `PUT /connections/:id/configs/:direction`, which creates the
 * config or replaces it. The direction is in the path, so the body needs no
 * discriminator and each direction gets a plain object of its own.
 *
 * A write replaces the whole config. An omitted `name` resets it to the direction
 * label, so a client changing only a branch has to resend the name it wants to
 * keep. The connection-create payload reuses these same two schemas.
 */

export class UpsertPromotionApplyConfigDto extends Z.class(
	{
		name: promotionDisplayNameSchema.optional(),
		settings: promotionGitApplySettingsSchema,
	},
	{ strict: true },
) {}

export class UpsertPromotionPromoteConfigDto extends Z.class(
	{
		name: promotionDisplayNameSchema.optional(),
		settings: promotionGitPromoteSettingsSchema,
	},
	{ strict: true },
) {}

const configPublicFields = {
	/**
	 * Also names the local checkout directory. Stable while the config exists, and
	 * replaced by a new one if the direction is deleted and set up again.
	 */
	id: n8nIdSchema,
	name: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
};

/*
 * Responses leave out the connection and the direction: both are the address the
 * caller already used.
 */

export const promotionApplyConfigPublicSchema = z.object({
	...configPublicFields,
	settings: promotionGitApplySettingsSchema,
});

export class PromotionApplyConfigPublicDto extends Z.class(
	promotionApplyConfigPublicSchema.shape,
) {}

export const promotionPromoteConfigPublicSchema = z.object({
	...configPublicFields,
	settings: promotionGitPromoteSettingsSchema,
});

export class PromotionPromoteConfigPublicDto extends Z.class(
	promotionPromoteConfigPublicSchema.shape,
) {}

/**
 * Configs keyed by direction, so a client reads `configs.promote?.settings`
 * without narrowing a union. A missing key means that direction is not set up.
 */
export const promotionConnectionConfigsPublicSchema = z.object({
	apply: promotionApplyConfigPublicSchema.optional(),
	promote: promotionPromoteConfigPublicSchema.optional(),
});
export type PromotionConnectionConfigsPublic = z.infer<
	typeof promotionConnectionConfigsPublicSchema
>;
