import { z } from 'zod/v4';

/**
 * Per-node payload from npm / the nodes loader. Only the package-level object is
 * strictly shaped; node entries use `looseObject` so keys are not stripped.
 */
const communityPackageInstalledNodeSchema = z.looseObject({});

/**
 * Public API community package response (matches OpenAPI `communityPackage.yml`
 * at the top level).
 */
export const communityPackageResponseSchema = z.object({
	packageName: z.string(),
	installedVersion: z.string(),
	authorName: z.string().optional(),
	authorEmail: z.string().optional(),
	installedNodes: z.array(communityPackageInstalledNodeSchema),
	createdAt: z.string(),
	updatedAt: z.string(),
	updateAvailable: z.string().optional(),
	failedLoading: z.boolean().optional(),
});

export type CommunityPackageResponse = z.infer<typeof communityPackageResponseSchema>;
