/**
 * Descriptions and examples for the public tag schemas, carried over from the hand-written
 * `handlers/tags/spec/schemas/tag.yml` the decorator routes replaced.
 */
export const tagFieldDocs = {
	id: { readOnly: true, example: '2tUt1wbLX592XDdX' },
	name: { example: 'Production' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
} as const;

/**
 * The same server-managed fields as a write body documents them: `z.undefined()` carries no type of
 * its own, so each descriptor states the type the response schema infers.
 */
export const tagWriteReadOnlyFieldDocs = {
	id: { type: 'string', readOnly: true, example: '2tUt1wbLX592XDdX' },
	createdAt: { type: 'string', format: 'date-time', readOnly: true },
	updatedAt: { type: 'string', format: 'date-time', readOnly: true },
} as const;
