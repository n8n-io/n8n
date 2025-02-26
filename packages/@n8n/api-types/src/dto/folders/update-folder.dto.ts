import { Z } from 'zod-class';

import { folderNameSchema } from '../../schemas/folder.schema';

export class UpdateFolderDto extends Z.class({
	name: folderNameSchema,
}) {}
