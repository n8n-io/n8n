import '../../openapi-extend';

import { z } from 'zod';

import {
	communityPackageFieldDocs,
	installCommunityPackageFieldDocs,
} from './community-package-public.openapi';
import { Z } from '../../zod-class';

// Preserve extra loader fields that the legacy response returned with each installed node.
const communityPackageInstalledNodeSchema = z
	.object({
		name: z.string(),
		type: z.string(),
		latestVersion: z.number(),
	})
	.passthrough();

export const communityPackagePublicSchema = z.object({
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

export class CommunityPackagePublicDto extends Z.class(communityPackagePublicSchema.shape) {}

export class InstallCommunityPackagePublicDto extends Z.class(
	{
		name: z.string().openapi(installCommunityPackageFieldDocs.name),
		version: z.string().optional().openapi(installCommunityPackageFieldDocs.version),
		verify: z.boolean().optional().openapi(installCommunityPackageFieldDocs.verify),
	},
	{ strict: true },
) {}
