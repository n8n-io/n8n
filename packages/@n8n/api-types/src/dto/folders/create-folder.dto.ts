import { z } from 'zod';
import { Z } from 'zod-class';

export class CreateFolderDto extends Z.class({
	name: z.string().trim().min(1).max(128),
	parentFolderId: z.string().optional(),
}) {}
