import { Z } from 'zod-class';

import { folderIdSchema } from '../../schemas/folder.schema';

export class DeleteFolderDto extends Z.class({
	transferToFolderId: folderIdSchema.optional(),
}) {}
