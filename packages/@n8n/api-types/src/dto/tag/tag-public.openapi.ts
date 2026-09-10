import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

// Key order below reaches the generated OpenAPI fragments verbatim, so each literal keeps the
// order the published spec already uses.

export const tagFieldDocs = {
	id: { readOnly: true, example: '2tUt1wbLX592XDdX' },
	name: { example: 'Production' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
	updatedTagCreatedAt: {
		readOnly: true,
		description: 'Absent in the answer to an update, which does not read the tag back.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

/** `z.undefined()` emits no type of its own, so the write side states the documented one. */
export const tagWriteReadOnlyFieldDocs = {
	id: { ...tagFieldDocs.id, type: 'string' },
	createdAt: { ...tagFieldDocs.createdAt, type: 'string', format: 'date-time' },
	updatedAt: { ...tagFieldDocs.updatedAt, type: 'string', format: 'date-time' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
