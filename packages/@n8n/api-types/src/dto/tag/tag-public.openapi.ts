import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const tagFieldDocs = {
	id: { readOnly: true, example: '2tUt1wbLX592XDdX' },
	name: { example: 'Production' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

/**
 * A read-only request field has no runtime type of its own, so its descriptor must carry the whole
 * documented schema. Every tag write route documents the same three fields.
 */
export const tagRequestReadOnlyFieldDocs = {
	id: { type: 'string', readOnly: true, example: '2tUt1wbLX592XDdX' },
	createdAt: { type: 'string', format: 'date-time', readOnly: true },
	updatedAt: { type: 'string', format: 'date-time', readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
