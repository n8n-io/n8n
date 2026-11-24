import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const insightsSummaryQueryFieldDocs = {
	startDate: { description: 'ISO 8601 start date. Defaults to 7 days ago.' },
	endDate: { description: 'ISO 8601 end date. Defaults to now.' },
	projectId: {
		description: 'Project identifier to filter insights by project.',
		example: 'VmwOO9HeTEj20kxM',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;
