import {
	folderNameSchema,
	folderIdSchema,
	folderResourceTypeSchema,
} from '../../schemas/folder.schema';
import { Z } from '../../zod-class';

export class CreateFolderDto extends Z.class({
	name: folderNameSchema,
	resourceType: folderResourceTypeSchema.default('workflow'),
	parentFolderId: folderIdSchema.optional(),
}) {}
