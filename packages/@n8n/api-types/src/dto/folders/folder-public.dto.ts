import '../../openapi-extend';

import { z } from 'zod';

import { folderContentCountFieldDocs, folderFieldDocs } from './folder-public.openapi';
import { Z } from '../../zod-class';

/** The folder as the Public API publishes it, on its own routes and inside another resource. */
export const folderPublicSchema = z.object({
	id: z.string().openapi(folderFieldDocs.id),
	name: z.string().openapi(folderFieldDocs.name),
	parentFolderId: z.string().nullable().openapi(folderFieldDocs.parentFolderId),
	createdAt: z.string().datetime().openapi(folderFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(folderFieldDocs.updatedAt),
});

export class FolderDetailsPublicDto extends Z.class({
	...folderPublicSchema.shape,
	totalSubFolders: z.number().int().openapi(folderContentCountFieldDocs.totalSubFolders),
	totalWorkflows: z.number().int().openapi(folderContentCountFieldDocs.totalWorkflows),
}) {}
