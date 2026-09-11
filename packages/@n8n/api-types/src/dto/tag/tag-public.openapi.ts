import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const tagFieldDocs = {
	id: { readOnly: true, example: '2tUt1wbLX592XDdX' },
	name: { example: 'Production' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const createTagReadOnlyFieldDocs = {
	id: { type: 'string', readOnly: true, example: '2tUt1wbLX592XDdX' },
	createdAt: { type: 'string', format: 'date-time', readOnly: true },
	updatedAt: { type: 'string', format: 'date-time', readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
