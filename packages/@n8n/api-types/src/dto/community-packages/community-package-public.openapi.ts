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

export const installCommunityPackageResponseFieldDocs = {
	policyRestrictions: {
		description:
			'Node types from this package that a node type policy blocks. The install does not fail because of a policy. Absent when no policy was evaluated, for example when node type policies are not licensed. An empty nodeTypes list means that no policy blocks a node type from this package.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const packagePolicyRestrictionsFieldDocs = {
	nodeTypes: {
		description:
			'Blocked node types from this package. Lists only the node types that are blocked.',
	},
	type: {
		description: 'Full node type name, such as n8n-nodes-example.exampleNode.',
	},
	blockedOn: {
		description:
			'instance: blocked on the instance by default. projects: allowed on the instance, but blocked in one or more projects.',
	},
	optInAvailable: {
		description:
			'Whether a project can allow this node type. True when an instance policy blocks the node type unless a project allows it.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const updateCommunityPackageFieldDocs = {
	version: {
		description:
			'Semver version or npm dist-tag to update to, such as latest or beta. When unverified packages are disabled, only versions verified by n8n can be installed.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
