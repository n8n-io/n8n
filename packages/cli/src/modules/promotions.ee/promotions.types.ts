import type {
	PromotionEnvironmentRemote,
	PromotionEnvironmentScope,
	PromotionProviderAuthType,
	PromotionProviderType,
	promotionGitApplySettingsSchema,
	promotionGitPromoteSettingsSchema,
} from '@n8n/api-types';
import { z } from 'zod';

import type { PackageFile } from './base-branch-files';

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
 * cannot pair old credentials with a new remote. `encryptedAuth` is decrypted at
 * the Git boundary, never held beyond it.
 */
export type PromotionOperationInput = Readonly<{
	environmentId: string;
	scope: PromotionEnvironmentScope;
	providerId: string;
	providerType: PromotionProviderType;
	authType: PromotionProviderAuthType;
	encryptedAuth: string;
	/** The Git host base URL from the same read as `encryptedAuth`. Null for plain Git. */
	hostBaseUrl: string | null;
	remote: PromotionEnvironmentRemote;
	config: ResolvedPromotionConfig;
}>;

/**
 * The package one branch holds for one project, read at a single commit. The
 * files come from the listing, and `readFile` reads one of them by its
 * repository path, so the listing and the contents never describe two commits.
 */
export type BranchPackage = Readonly<{
	environmentId: string;
	branchName: string;
	commitSha: string | null;
	files: PackageFile[];
	/** Whether the branch holds a package manifest. It can list other projects when `files` is empty. */
	hasManifest: boolean;
	readFiles: (paths: readonly string[]) => Promise<Map<string, string>>;
}>;

/** The package at one commit of the checkout. */
export type PackageCommit = Readonly<{
	commitSha: string;
	/** The blob SHA of each package file, by repository path. */
	listFiles: () => Promise<Map<string, string>>;
	/** Reads files by repository path. Paths that the commit does not hold are left out. */
	readFiles: (paths: readonly string[]) => Promise<Map<string, string>>;
}>;

/**
 * Written next to a checkout after a successful clone, and compared with the
 * resolved config on every later operation. A mismatch means the checkout is
 * stale and must be cloned again. Holds no secrets.
 */
export type PromotionCacheDescriptor = {
	schemaVersion: 1;
	environmentId: string;
	remoteUrl: string;
	checkoutBranchName: string;
};
