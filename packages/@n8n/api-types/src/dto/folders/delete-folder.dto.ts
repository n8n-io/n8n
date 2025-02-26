import { z } from 'zod';
import { Z } from 'zod-class';

export class DeleteFolderDto extends Z.class({
	transferToFolderId: z.string().max(36).optional(),
}) {}
