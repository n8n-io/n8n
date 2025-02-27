import { Z } from 'zod-class';

import { folderNameSchema, folderId } from '../../schemas/folder.schema';

export class CreateFolderDto extends Z.class({
	name: folderNameSchema,
	parentFolderId: folderId.optional(),
}) {}
