import { folderIdSchema } from '../../schemas/folder.schema';
import { Z } from '../../zod-class';

export class DeleteFolderDto extends Z.class({
	transferToFolderId: folderIdSchema.optional(),
}) {}
