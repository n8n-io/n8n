import { z } from 'zod';

import { Z } from '../../zod-class';

export class ExportFoldersRequestDto extends Z.class({
	folderIds: z.array(z.string().trim().min(1)).min(1),
	includeVariableValues: z.boolean().optional().default(true),
}) {}
