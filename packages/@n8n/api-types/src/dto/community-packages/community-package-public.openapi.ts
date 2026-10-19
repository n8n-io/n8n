import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const installCommunityPackageFieldDocs = {
	name: {
		description:
			'npm package name. Unscoped names start with n8n-nodes-. Scoped names use the @[author]/n8n-nodes- form.',
	},
	version: {
		description:
			'Semver version or npm dist-tag, such as latest or beta. When unverified packages are disabled, only versions verified by n8n can be installed.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const updateCommunityPackageFieldDocs = {
	version: {
		description:
			'Semver version or npm dist-tag to update to, such as latest or beta. When unverified packages are disabled, only versions verified by n8n can be installed.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
