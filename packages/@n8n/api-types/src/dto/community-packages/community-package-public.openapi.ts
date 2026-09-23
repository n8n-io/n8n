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

export const installCommunityPackageFieldDocs = {
	name: { description: 'npm package name (must start with n8n-nodes-)' },
	version: { description: 'Specific semver version to install' },
	verify: {
		description:
			'Whether to verify the package against the n8n-vetted package list. Required when the instance has N8N_UNVERIFIED_PACKAGES_ENABLED=false.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
