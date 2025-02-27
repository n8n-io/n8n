import { z } from 'zod';
import { Z } from 'zod-class';

import { folderNameSchema } from '../../schemas/folder.schema';

export class CreateFolderDto extends Z.class({
	name: folderNameSchema,
	parentFolderId: z.string().optional(),
}) {}
