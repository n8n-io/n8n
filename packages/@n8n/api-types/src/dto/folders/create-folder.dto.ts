import { folderNameSchema, folderIdSchema } from '../../schemas/folder.schema';
import { Z } from '../../zod-class';

export class CreateFolderDto extends Z.class({
	name: folderNameSchema,
	parentFolderId: folderIdSchema.optional(),
}) {}
