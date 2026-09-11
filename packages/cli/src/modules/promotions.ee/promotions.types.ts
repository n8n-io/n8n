import type {
	PromotionConnectionScope,
	PromotionConnectionTarget,
	PromotionProviderAuthType,
	PromotionProviderType,
	promotionGitApplySettingsSchema,
	promotionGitPromoteSettingsSchema,
} from '@n8n/api-types';
import { z } from 'zod';

export type PromotionGitApplySettings = z.infer<typeof promotionGitApplySettingsSchema>;
export type PromotionGitPromoteSettings = z.infer<typeof promotionGitPromoteSettingsSchema>;

/*
 * Decrypted credentials stay in the backend, so their schemas live here rather
 * than in `@n8n/api-types`. Each payload carries its own `schemaVersion`, because
 * a stored row can predate the current shape.
 */

export const promotionSshKeyAuthPayloadSchema = z
	.object({ schemaVersion: z.literal(1), privateKey: z.string().min(1) })
	.strict();

export const promotionTokenAuthPayloadSchema = z
	.object({
		schemaVersion: z.literal(1),
		username: z.string().min(1),
		password: z.string().min(1),
	})
	.strict();

export type PromotionAuthPayload =
	| z.infer<typeof promotionSshKeyAuthPayloadSchema>
	| z.infer<typeof promotionTokenAuthPayloadSchema>;

/** What the Git transport needs, with the auth type it belongs to. */
export type PromotionGitCredentials =
	| { authType: 'ssh-key'; privateKey: string }
	| { authType: 'token'; username: string; password: string };

/**
 * A config whose settings were checked against its direction. The direction is the
 * discriminator, so reading a directional field needs no cast.
 */
export type ResolvedPromotionConfig =
	| { direction: 'apply'; settings: PromotionGitApplySettings }
	| { direction: 'promote'; settings: PromotionGitPromoteSettings };

/**
 * Everything one operation needs, read in a single load so a concurrent edit
 * cannot pair old credentials with a new target. `encryptedAuth` is decrypted at
 * the Git boundary, never held beyond it.
 */
export type PromotionOperationInput = Readonly<{
	connectionId: string;
	connectionScope: PromotionConnectionScope;
	configId: string;
	providerId: string;
	providerType: PromotionProviderType;
	authType: PromotionProviderAuthType;
	encryptedAuth: string;
	target: PromotionConnectionTarget;
	config: ResolvedPromotionConfig;
}>;

/**
 * Written next to a checkout after a successful clone, and compared with the
 * resolved config on every later operation. A mismatch means the checkout is
 * stale and must be cloned again. Holds no secrets.
 */
export type PromotionCacheDescriptor = {
	schemaVersion: 1;
	configId: string;
	connectionId: string;
	remoteUrl: string;
	checkoutBranchName: string;
};
