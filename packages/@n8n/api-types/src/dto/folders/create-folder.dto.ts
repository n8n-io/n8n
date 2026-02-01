import { Z } from 'zod-class';

import { folderNameSchema, folderIdSchema } from '../../schemas/folder.schema';

export class CreateFolderDto extends Z.class({
	name: folderNameSchema,
	parentFolderId: folderIdSchema.optional(),
}) {}
