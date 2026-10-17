import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const discoverQueryFieldDocs = {
	include: {
		description:
			'Include additional data. Use "schemas" to inline request body schemas per endpoint, eliminating the need to fetch the full OpenAPI spec.',
	},
	resource: {
		description: 'Filter to a specific resource (e.g. "workflow", "tags", "credential").',
	},
	operation: {
		description: 'Filter to endpoints with a specific operation (e.g. "read", "create", "list").',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const discoverResponseFieldDocs = {
	scopes: { description: "The API key's active scopes" },
	requestSchema: {
		type: 'object',
		description:
			'Request body schema (only present when include=schemas and the endpoint accepts a request body).',
	},
	filters: {
		description:
			"Available query parameter filters. The values arrays reflect what the caller's scopes permit.",
	},
	specUrl: { description: 'URL to the full OpenAPI specification' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
