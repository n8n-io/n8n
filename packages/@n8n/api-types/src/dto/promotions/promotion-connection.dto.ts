import '../../openapi-extend';

import { z } from 'zod';

import { promotionDisplayNameSchema } from './promotion-common.dto';
import {
	UpsertPromotionApplyConfigDto,
	UpsertPromotionPromoteConfigDto,
	promotionConnectionConfigsPublicSchema,
} from './promotion-config.dto';
import { promotionProviderSummarySchema } from './promotion-provider.dto';
import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

/**
 * `instance` covers the whole instance. `projects` covers the projects linked to
 * the connection. Only one instance connection can exist.
 */
export const promotionConnectionScopeSchema = z.enum(['instance', 'projects']);
export type PromotionConnectionScope = z.infer<typeof promotionConnectionScopeSchema>;

/**
 * Checks the shape only. The backend checks the URL itself: allowed protocols,
 * accepted SSH forms, and no credentials in the URL.
 */
const remoteUrlSchema = z.string().trim().min(1);

/**
 * Plain Git points at a repository with its full SSH or HTTP(S) remote URL. A new
 * provider type adds its own target here and needs no remote URL.
 */
export const promotionConnectionTargetSchema = z
	.object({ schemaVersion: z.literal(1), remoteUrl: remoteUrlSchema })
	.strict();
export type PromotionConnectionTarget = z.infer<typeof promotionConnectionTargetSchema>;

export class CreatePromotionConnectionDto extends Z.class(
	{
		name: promotionDisplayNameSchema,
		scope: promotionConnectionScopeSchema,
		/** Providers are created on their own route. A connection only picks one. */
		providerId: n8nIdSchema,
		target: promotionConnectionTargetSchema,
		/**
		 * Initial configs, keyed by direction, reusing the bodies of the config
		 * routes. Keying makes "one per direction" structural. A connection can start
		 * with no configs, which lets an admin read the provider's public key before
		 * the remote can be cloned.
		 */
		configs: z
			.object({
				apply: UpsertPromotionApplyConfigDto.schema.optional(),
				promote: UpsertPromotionPromoteConfigDto.schema.optional(),
			})
			.strict()
			.optional(),
	},
	{ strict: true },
) {}

/**
 * Connection fields only. `scope` cannot change, and configs, project links, and
 * package operations each have their own route, so a strict shape rejects them
 * here.
 */
const updatePromotionConnectionSchema = z
	.object({
		name: promotionDisplayNameSchema.optional(),
		target: promotionConnectionTargetSchema.optional(),
		providerId: n8nIdSchema.optional(),
	})
	.strict()
	.refine(
		({ name, target, providerId }) =>
			name !== undefined || target !== undefined || providerId !== undefined,
		{ message: 'At least one field is required' },
	)
	.openapi({ minProperties: 1 });

type UpdatePromotionConnection = z.infer<typeof updatePromotionConnectionSchema>;

export class UpdatePromotionConnectionDto implements UpdatePromotionConnection {
	name?: string;

	target?: PromotionConnectionTarget;

	providerId?: string;

	static schema = updatePromotionConnectionSchema;

	constructor(data: UpdatePromotionConnection) {
		Object.assign(this, updatePromotionConnectionSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return updatePromotionConnectionSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return updatePromotionConnectionSchema.parse(data);
	}
}

/**
 * The `providerId` filter shows which connections a provider edit affects. The
 * instance settings page asks for `scope=instance` rather than taking whichever
 * connection comes first.
 */
export class ListPromotionConnectionsQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
	scope: promotionConnectionScopeSchema.optional(),
	providerId: n8nIdSchema.optional(),
}) {}

/**
 * There are at most two configs, so they are embedded instead of paginated, keyed
 * by direction to match the request side.
 *
 * The provider is embedded as a summary, which names it but leaves out its public
 * config. Detail and list share this schema, so the full form would put the SSH
 * public key in every row of the connection list. Read the key from the provider
 * detail route.
 */
export const promotionConnectionPublicSchema = z.object({
	id: n8nIdSchema,
	name: z.string(),
	scope: promotionConnectionScopeSchema,
	target: promotionConnectionTargetSchema,
	provider: promotionProviderSummarySchema,
	configs: promotionConnectionConfigsPublicSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class PromotionConnectionPublicDto extends Z.class(promotionConnectionPublicSchema.shape) {}

export class PromotionConnectionListPublicDto extends Z.class({
	data: z.array(promotionConnectionPublicSchema),
	nextCursor: z.string().nullable(),
}) {}

export const promotionConnectionProjectPublicSchema = z.object({
	projectId: n8nIdSchema,
	connectionId: n8nIdSchema,
});

export class PromotionConnectionProjectPublicDto extends Z.class(
	promotionConnectionProjectPublicSchema.shape,
) {}

export class PromotionConnectionProjectListPublicDto extends Z.class({
	projectIds: z.array(n8nIdSchema),
}) {}
