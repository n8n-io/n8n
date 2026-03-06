import { z } from 'zod';

import { folderNameSchema, folderIdSchema } from '../../schemas/folder.schema';
import { Z } from '../../zod-class';

export class UpdateFolderDto extends Z.class({
	name: folderNameSchema.optional(),
	tagIds: z.array(z.string().max(24)).optional(),
	parentFolderId: folderIdSchema.optional(),
}) {}
