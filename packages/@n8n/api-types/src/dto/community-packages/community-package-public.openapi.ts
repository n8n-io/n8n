import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const communityPackageFieldDocs = {
	packageName: { description: 'npm package name' },
	installedVersion: { description: 'Currently installed version' },
	authorName: { description: 'Package author name' },
	authorEmail: { description: 'Package author email' },
	installedNodes: { description: 'Nodes included in this package' },
	updateAvailable: { description: 'Version available for update, if any' },
	failedLoading: { description: 'Whether the package failed to load' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const updateCommunityPackageFieldDocs = {
	version: { description: 'Specific semver version to update to' },
	verify: {
		description:
			'Whether to verify the package against the n8n-vetted package list. Setting to false will allow installing or updating to an unverified version. Default is true.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
