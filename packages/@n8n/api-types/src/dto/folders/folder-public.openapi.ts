import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const folderFieldDocs = {
	id: { readOnly: true, example: 'VmwOO9HeTEj20kxM' },
	name: { example: 'My Folder' },
	parentFolderId: { example: 'kRZ0ewrAEAhCkTBd' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const folderContentCountFieldDocs = {
	totalSubFolders: { description: 'Total number of sub-folders (recursive).' },
	totalWorkflows: { description: 'Total number of workflows (recursive).' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
