import '../../openapi-extend';

import { z } from 'zod';

import { promotionDisplayNameSchema } from './promotion-common.dto';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const promotionProviderTypeSchema = z.enum(['git']);
export type PromotionProviderType = z.infer<typeof promotionProviderTypeSchema>;

/** `token` is an HTTP(S) username and password, not a Git host API token. */
export const promotionProviderAuthTypeSchema = z.enum(['ssh-key', 'token']);
export type PromotionProviderAuthType = z.infer<typeof promotionProviderAuthTypeSchema>;

/** Key algorithms the backend can generate for an `ssh-key` provider. */
export const promotionSshKeyTypeSchema = z.enum(['ed25519', 'rsa']);
export type PromotionSshKeyType = z.infer<typeof promotionSshKeyTypeSchema>;

/**
 * The backend writes the public key and key type when it generates the key pair.
 * No request schema accepts them.
 */
export const promotionGitSshKeyConfigSchema = z
	.object({
		schemaVersion: z.literal(1),
		publicKey: z.string().min(1),
		keyType: promotionSshKeyTypeSchema,
	})
	.strict();

/** HTTP(S) keeps the username with the password, so there is nothing public. */
export const promotionGitTokenConfigSchema = z.object({ schemaVersion: z.literal(1) }).strict();

/**
 * Config schema for each auth type. Use this map once the auth type is known: the
 * union below accepts either shape and cannot tell them apart. A new provider type
 * adds its own map.
 */
export const promotionGitConfigSchemas = {
	'ssh-key': promotionGitSshKeyConfigSchema,
	token: promotionGitTokenConfigSchema,
} as const;

export const promotionProviderConfigSchema = z.union([
	promotionGitSshKeyConfigSchema,
	promotionGitTokenConfigSchema,
]);
export type PromotionProviderConfig = z.infer<typeof promotionProviderConfigSchema>;

// Trim the username, so a padded value is never saved.
const promotionUsernameSchema = z.string().trim().min(1);
// Do not trim the password. A token is saved exactly as sent, and a blank one is rejected.
const promotionSecretSchema = z.string().min(1);

/*
 * The auth payload carries its own `authType`, so it is a discriminated union and
 * a request cannot pair one auth type with another's fields. Keeping the
 * discriminator inside `auth` rather than beside it is what lets the request body
 * stay a plain object: only a field can be a union here, not the body root.
 *
 * Responses have no `auth` at all, so they report `authType` at the top level.
 */

/** The backend generates the key pair. The caller only picks the algorithm. */
export const promotionGitSshKeyAuthInputSchema = z
	.object({
		authType: z.literal('ssh-key'),
		keyType: promotionSshKeyTypeSchema.default('ed25519'),
	})
	.strict();

/**
 * The same payload for an update, but `keyType` has no default. An omitted value
 * stays omitted, so the service can rotate the key with the algorithm the provider
 * already uses. A default here would turn an `rsa` provider into an `ed25519` one
 * on an edit that never mentioned the key.
 */
export const promotionGitSshKeyAuthUpdateSchema = z
	.object({
		authType: z.literal('ssh-key'),
		keyType: promotionSshKeyTypeSchema.optional(),
	})
	.strict();

/** Username and password are required together, on create and on update. */
export const promotionGitTokenAuthInputSchema = z
	.object({
		authType: z.literal('token'),
		username: promotionUsernameSchema,
		password: promotionSecretSchema,
	})
	.strict();

export const promotionProviderAuthInputSchema = z.discriminatedUnion('authType', [
	promotionGitSshKeyAuthInputSchema,
	promotionGitTokenAuthInputSchema,
]);
export type PromotionProviderAuthInput = z.infer<typeof promotionProviderAuthInputSchema>;

export const promotionProviderAuthUpdateSchema = z.discriminatedUnion('authType', [
	promotionGitSshKeyAuthUpdateSchema,
	promotionGitTokenAuthInputSchema,
]);
export type PromotionProviderAuthUpdate = z.infer<typeof promotionProviderAuthUpdateSchema>;

/**
 * The auth type is stated once, inside `auth`, so it always matches the credentials
 * beside it. The service reads it from there for the `authType` column.
 *
 * `git` is the only provider type today, so its two auth methods are the only ones
 * the union accepts. A second provider type brings its own auth variants, and the
 * pairing of provider type to auth method becomes a choice to model here.
 */
export class CreatePromotionProviderDto extends Z.class(
	{
		name: promotionDisplayNameSchema,
		type: promotionProviderTypeSchema,
		auth: promotionProviderAuthInputSchema,
	},
	{ strict: true },
) {}

/**
 * `type` cannot change and `config` holds generated key material, so a strict shape
 * rejects both. Leaving out `auth` keeps the stored credentials. Sending it replaces
 * them.
 *
 * `auth.authType` states which credentials are being sent, and the auth type itself
 * cannot change, so the service compares it with the stored one and rejects a
 * mismatch. It also reads an omitted `keyType` from the provider's current key type,
 * so rotating an `rsa` key keeps it `rsa`.
 */
const updatePromotionProviderSchema = z
	.object({
		name: promotionDisplayNameSchema.optional(),
		auth: promotionProviderAuthUpdateSchema.optional(),
	})
	.strict()
	.refine(({ name, auth }) => name !== undefined || auth !== undefined, {
		message: 'At least one field is required',
	})
	.openapi({ minProperties: 1 });

type UpdatePromotionProvider = z.infer<typeof updatePromotionProviderSchema>;

export class UpdatePromotionProviderDto implements UpdatePromotionProvider {
	name?: string;

	auth?: PromotionProviderAuthUpdate;

	static schema = updatePromotionProviderSchema;

	constructor(data: UpdatePromotionProvider) {
		Object.assign(this, updatePromotionProviderSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return updatePromotionProviderSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return updatePromotionProviderSchema.parse(data);
	}
}

/** Leaves out `auth`, which is never returned. */
export const promotionProviderPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: promotionProviderTypeSchema,
	authType: promotionProviderAuthTypeSchema,
	config: promotionProviderConfigSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class PromotionProviderPublicDto extends Z.class(promotionProviderPublicSchema.shape) {}

/**
 * A provider without its public config. Used for list rows and inside a
 * connection, neither of which shows the SSH public key. Only the provider detail
 * route does.
 */
export const promotionProviderSummarySchema = promotionProviderPublicSchema.omit({ config: true });

export class PromotionProviderListPublicDto extends Z.class({
	data: z.array(promotionProviderSummarySchema),
	nextCursor: z.string().nullable(),
}) {}

/**
 * Returns the generated public key on its own, so a client does not have to read
 * the config variant. `token` providers have none.
 */
export class PromotionProviderCreatedPublicDto extends Z.class({
	provider: promotionProviderPublicSchema,
	publicKey: z.string().nullable(),
}) {}

export class ListPromotionProvidersQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
