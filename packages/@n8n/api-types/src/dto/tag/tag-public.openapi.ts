import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const tagFieldDocs = {
	id: { readOnly: true, example: '2tUt1wbLX592XDdX' },
	name: { example: 'Production' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

/** The read-only fields a write body still documents, so the spec keeps them. */
export const tagWriteReadOnlyFieldDocs = {
	id: { type: 'string', readOnly: true, example: '2tUt1wbLX592XDdX' },
	createdAt: { type: 'string', format: 'date-time', readOnly: true },
	updatedAt: { type: 'string', format: 'date-time', readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
