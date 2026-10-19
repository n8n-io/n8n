import '../../openapi-extend';

import { z } from 'zod';

import { promotionDisplayNameSchema } from './promotion-common.dto';
import { promotionProviderSummarySchema } from './promotion-provider.dto';
import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const promotionDirectionSchema = z.enum(['apply', 'promote']);
export type PromotionDirection = z.infer<typeof promotionDirectionSchema>;

/**
 * `instance` covers the whole instance. `projects` covers the projects linked to
 * the environment. The instance has at most one environment for each direction.
 */
export const promotionEnvironmentScopeSchema = z.enum(['instance', 'projects']);
export type PromotionEnvironmentScope = z.infer<typeof promotionEnvironmentScopeSchema>;

/**
 * Checks the shape only. The backend checks the URL itself: allowed protocols,
 * accepted SSH forms, and no credentials in the URL.
 */
const remoteUrlSchema = z.string().trim().min(1);

/** Git host remotes store a path internally. The API exposes the resolved clone URL. */
export const promotionEnvironmentRemoteSchema = z
	.object({
		schemaVersion: z.literal(1),
		remoteUrl: remoteUrlSchema,
	})
	.strict();
export type PromotionEnvironmentRemote = z.infer<typeof promotionEnvironmentRemoteSchema>;

const promotionEnvironmentRemotePublicSchema = promotionEnvironmentRemoteSchema.extend({
	repositoryPath: z.string().optional().openapi({
		description:
			'The stored repository path of a GitLab remote. URL-encode it before you use it as repositoryId to list branches. Requests do not accept it.',
	}),
});

/**
 * Every environment carries a branch for its direction. Git sets no limit on
 * branch names, so cap it here to keep the payload small. The backend still
 * checks the name with Git.
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
 * `createBranchOnPromotion` is always required. A write replaces the whole
 * settings object, so a default here would let an unrelated edit reset it. The
 * off-by-default choice lives in the UI toggle and the CLI examples instead.
 */
export const promotionGitPromoteSettingsSchema = z
	.object({
		schemaVersion: z.literal(1),
		baseBranchName: branchNameSchema,
		createBranchOnPromotion: z.boolean(),
	})
	.strict();

export const promotionEnvironmentSettingsSchema = z.union([
	promotionGitApplySettingsSchema,
	promotionGitPromoteSettingsSchema,
]);
export type PromotionEnvironmentSettings = z.infer<typeof promotionEnvironmentSettingsSchema>;

const createPromotionEnvironmentFields = {
	name: promotionDisplayNameSchema,
	scope: promotionEnvironmentScopeSchema,
	/** Providers are created on their own route. An environment only picks one. */
	providerId: n8nIdSchema,
	remote: promotionEnvironmentRemoteSchema,
};

const createPromotionEnvironmentSchema = z.discriminatedUnion('direction', [
	z
		.object({
			...createPromotionEnvironmentFields,
			direction: z.literal('apply'),
			settings: promotionGitApplySettingsSchema,
		})
		.strict(),
	z
		.object({
			...createPromotionEnvironmentFields,
			direction: z.literal('promote'),
			settings: promotionGitPromoteSettingsSchema,
		})
		.strict(),
]);

export type CreatePromotionEnvironmentDto = z.infer<typeof createPromotionEnvironmentSchema>;
export const CreatePromotionEnvironmentDto = class {
	static schema = createPromotionEnvironmentSchema;

	static safeParse(data: unknown) {
		return createPromotionEnvironmentSchema.safeParse(data);
	}

	static parse(data: unknown): CreatePromotionEnvironmentDto {
		return createPromotionEnvironmentSchema.parse(data);
	}
};

/**
 * `direction` and `scope` cannot change, so a strict shape rejects them. The
 * server checks `settings` against the stored direction and replaces the whole
 * settings object.
 */
const updatePromotionEnvironmentSchema = z
	.object({
		name: promotionDisplayNameSchema.optional(),
		providerId: n8nIdSchema.optional(),
		remote: promotionEnvironmentRemoteSchema.optional(),
		settings: promotionEnvironmentSettingsSchema.optional(),
	})
	.strict()
	.refine(
		({ name, providerId, remote, settings }) =>
			name !== undefined ||
			providerId !== undefined ||
			remote !== undefined ||
			settings !== undefined,
		{ message: 'At least one field is required' },
	)
	.openapi({ minProperties: 1 });

type UpdatePromotionEnvironment = z.infer<typeof updatePromotionEnvironmentSchema>;

export class UpdatePromotionEnvironmentDto implements UpdatePromotionEnvironment {
	name?: string;

	providerId?: string;

	remote?: PromotionEnvironmentRemote;

	settings?: PromotionEnvironmentSettings;

	static schema = updatePromotionEnvironmentSchema;

	constructor(data: UpdatePromotionEnvironment) {
		Object.assign(this, updatePromotionEnvironmentSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return updatePromotionEnvironmentSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return updatePromotionEnvironmentSchema.parse(data);
	}
}

/**
 * The `providerId` filter shows which environments a provider edit affects. The
 * instance settings page asks for `scope=instance` rather than taking whichever
 * environment comes first.
 */
export class ListPromotionEnvironmentsQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
	scope: promotionEnvironmentScopeSchema.optional(),
	direction: promotionDirectionSchema.optional(),
	providerId: n8nIdSchema.optional(),
}) {}

/**
 * The local checkout state of an environment on the instance that answered. A
 * package operation needs a checkout that was cloned from the current remote and
 * branch, so both flags report on this replica only. Other replicas may differ.
 */
export const promotionEnvironmentCheckoutSchema = z.object({
	/** A local checkout exists for this environment on this instance. */
	hasCheckout: z.boolean(),
	/** The checkout was cloned from the current remote and branch, so it is not stale. */
	matchesConfig: z.boolean(),
});
export type PromotionEnvironmentCheckout = z.infer<typeof promotionEnvironmentCheckoutSchema>;

/**
 * The provider is embedded as a summary, which names it but leaves out its public
 * config. Read the key from the provider detail route.
 */
const promotionEnvironmentFields = {
	/** Also names the local checkout directory. */
	id: n8nIdSchema,
	name: z.string(),
	scope: promotionEnvironmentScopeSchema,
	remote: promotionEnvironmentRemotePublicSchema,
	provider: promotionProviderSummarySchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
};

/**
 * Lists contain stored environment data only. Checkout state is local to the
 * responding instance, so callers read it from the environment detail route.
 */
export const promotionEnvironmentSummarySchema = z.discriminatedUnion('direction', [
	z.object({
		...promotionEnvironmentFields,
		direction: z.literal('apply'),
		settings: promotionGitApplySettingsSchema,
	}),
	z.object({
		...promotionEnvironmentFields,
		direction: z.literal('promote'),
		settings: promotionGitPromoteSettingsSchema,
	}),
]);
export type PromotionEnvironmentSummary = z.infer<typeof promotionEnvironmentSummarySchema>;

export const promotionEnvironmentPublicSchema = z.discriminatedUnion('direction', [
	promotionEnvironmentSummarySchema.options[0].extend({
		checkout: promotionEnvironmentCheckoutSchema,
	}),
	promotionEnvironmentSummarySchema.options[1].extend({
		checkout: promotionEnvironmentCheckoutSchema,
	}),
]);

export const PromotionEnvironmentPublicDto = {
	name: 'PromotionEnvironmentPublicDto',
	schema: promotionEnvironmentPublicSchema,
	parse: (value: unknown) => promotionEnvironmentPublicSchema.parse(value),
};
export type PromotionEnvironmentPublicDto = z.infer<typeof promotionEnvironmentPublicSchema>;

export class PromotionEnvironmentListPublicDto extends Z.class({
	data: z.array(promotionEnvironmentSummarySchema),
	nextCursor: z.string().nullable(),
}) {}

export const promotionEnvironmentProjectPublicSchema = z.object({
	projectId: n8nIdSchema,
	environmentId: n8nIdSchema,
});

export class PromotionEnvironmentProjectPublicDto extends Z.class(
	promotionEnvironmentProjectPublicSchema.shape,
) {}

export class PromotionEnvironmentProjectListPublicDto extends Z.class({
	projectIds: z.array(n8nIdSchema),
}) {}
