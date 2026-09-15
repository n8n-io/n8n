import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

export const folderFieldDocs = {
	id: { readOnly: true },
	name: { example: 'My Folder' },
	parentFolderId: { example: 'abc123' },
	createdAt: { readOnly: true },
	updatedAt: { readOnly: true },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const folderProjectIdParamDocs = {
	param: {
		description:
			"The ID of the project, or `personal` to create the folder in the calling user's own " +
			'personal project.',
	},
} as const satisfies ZodOpenAPIMetadata;
