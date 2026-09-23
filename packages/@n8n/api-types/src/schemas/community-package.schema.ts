import '../openapi-extend';

import { z } from 'zod';

import { communityPackageFieldDocs } from '../dto/community-packages/community-package-public.openapi';

/**
 * Per-node payload from npm / the nodes loader. Only the package-level object is
 * strictly shaped; node entries pass through extra npm and loader fields.
 */
const communityPackageInstalledNodeSchema = z
	.object({
		name: z.string().optional(),
		type: z.string().optional(),
		latestVersion: z.number().optional(),
	})
	.passthrough();

/**
 * Public API community package response (matches OpenAPI `communityPackage.yml`
 * at the top level).
 */
export const communityPackageResponseSchema = z.object({
	packageName: z.string().openapi(communityPackageFieldDocs.packageName),
	installedVersion: z.string().openapi(communityPackageFieldDocs.installedVersion),
	authorName: z.string().optional().openapi(communityPackageFieldDocs.authorName),
	authorEmail: z.string().optional().openapi(communityPackageFieldDocs.authorEmail),
	installedNodes: z
		.array(communityPackageInstalledNodeSchema)
		.openapi(communityPackageFieldDocs.installedNodes),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	updateAvailable: z.string().optional().openapi(communityPackageFieldDocs.updateAvailable),
	failedLoading: z.boolean().optional().openapi(communityPackageFieldDocs.failedLoading),
});

export type CommunityPackageResponse = z.infer<typeof communityPackageResponseSchema>;
