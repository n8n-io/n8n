import { Z } from 'zod-class';

import { folderId } from '../../schemas/folder.schema';

export class DeleteFolderDto extends Z.class({
	transferToFolderId: folderId.optional(),
}) {}
