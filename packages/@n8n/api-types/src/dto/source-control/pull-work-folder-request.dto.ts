import { z } from 'zod';
import { Z } from 'zod-class';

export class PullWorkFolderRequestDto extends Z.class({
	force: z.boolean().optional(),
}) {}
