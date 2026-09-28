import '../../openapi-extend';

import { z } from 'zod';

import { Z } from '../../zod-class';

const installedNodePublicSchema = z
	.object({
		name: z.string().optional(),
		type: z.string().optional(),
		latestVersion: z.number().optional(),
	})
	.passthrough();

export const communityPackagePublicSchema = z.object({
	packageName: z.string().openapi({ description: 'npm package name' }),
	installedVersion: z.string().openapi({ description: 'Currently installed version' }),
	authorName: z.string().optional().openapi({ description: 'Package author name' }),
	authorEmail: z.string().optional().openapi({ description: 'Package author email' }),
	installedNodes: z
		.array(installedNodePublicSchema)
		.openapi({ description: 'Nodes included in this package' }),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	updateAvailable: z
		.string()
		.optional()
		.openapi({ description: 'Version available for update, if any' }),
	failedLoading: z
		.boolean()
		.optional()
		.openapi({ description: 'Whether the package failed to load' }),
});

export type CommunityPackagePublic = z.infer<typeof communityPackagePublicSchema>;

export class CommunityPackageListPublicDto extends Z.array(communityPackagePublicSchema) {}

export class ListCommunityPackagesQueryDto extends Z.class({}, { strict: true }) {}
