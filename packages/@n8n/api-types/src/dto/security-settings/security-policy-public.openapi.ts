import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const securityPolicyFieldDocs = {
	personalSpacePublishing: {
		description: 'Whether members may publish workflows and agents from their personal space.',
		example: true,
	},
	personalSpaceSharing: {
		description: 'Whether members may share workflows and credentials from their personal space.',
		example: true,
	},
	publishedPersonalWorkflowsCount: {
		readOnly: true,
		description:
			'Number of currently published personal workflows, shown for awareness before tightening the policy.',
		example: 3,
	},
	sharedPersonalWorkflowsCount: {
		readOnly: true,
		description: 'Number of personal workflows currently shared with other users.',
		example: 5,
	},
	sharedPersonalCredentialsCount: {
		readOnly: true,
		description: 'Number of personal credentials currently shared with other users.',
		example: 2,
	},
	redactionEnforcementFloor: {
		description: 'Minimum execution-data redaction level enforced across the instance.',
		example: 'production',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const securityPolicyUpdateFieldDocs = {
	personalSpacePublishing: {
		...securityPolicyFieldDocs.personalSpacePublishing,
		example: false,
	},
	personalSpaceSharing: {
		...securityPolicyFieldDocs.personalSpaceSharing,
		example: false,
	},
	usageCount: {
		description:
			'Read-only usage count returned by GET. Ignored on write so a GET response can be sent back as a PUT body.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
