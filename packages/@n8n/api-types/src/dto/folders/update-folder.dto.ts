import { z } from 'zod';
import { Z } from 'zod-class';

import { folderNameSchema } from '../../schemas/folder.schema';
export class UpdateFolderDto extends Z.class({
	name: folderNameSchema.optional(),
	tagIds: z.array(z.string().max(24)).optional(),
}) {}
