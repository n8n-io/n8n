import '../../openapi-extend';

import { z } from 'zod';

import { folderFieldDocs, folderProjectIdParamDocs } from './folder-public.openapi';
import { folderIdSchema, folderNameSchema } from '../../schemas/folder.schema';
import { Z } from '../../zod-class';

/** `personal` is accepted next to a real id, so this cannot reuse `projectIdParamSchema`. */
export const folderProjectIdParamSchema = z.string().openapi(folderProjectIdParamDocs);

/** The folder as the Public API publishes it. */
export const folderPublicSchema = z.object({
	id: z.string().openapi(folderFieldDocs.id),
	name: z.string().openapi(folderFieldDocs.name),
	parentFolderId: z.string().nullable().openapi(folderFieldDocs.parentFolderId),
	createdAt: z.string().datetime().openapi(folderFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(folderFieldDocs.updatedAt),
});

export type FolderPublic = z.infer<typeof folderPublicSchema>;

export class FolderPublicDto extends Z.class(folderPublicSchema.shape) {}

export class CreateFolderPublicDto extends Z.class(
	{
		name: folderNameSchema.openapi(folderFieldDocs.name),
		parentFolderId: folderIdSchema.optional().openapi(folderFieldDocs.parentFolderId),
	},
	{ strict: true },
) {}
