import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

/** Copied from the hand-written `folder.yml` the decorator migration deletes. */
export const folderFieldDocs = {
	id: { readOnly: true },
	name: { example: 'My Folder' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

/**
 * Copied from the hand-written `folder.update.yml`. Both fields carry `type` because the runtime
 * schemas behind them are refinements, which alone would not document as a plain `string`.
 */
export const updateFolderFieldDocs = {
	name: { type: 'string', example: 'Renamed Folder' },
	parentFolderId: { type: 'string', example: 'abc123' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
