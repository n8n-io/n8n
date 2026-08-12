import { z } from 'zod';

import { Z } from '../../zod-class';

export class BatchDeleteProjectFilesDto extends Z.class({
	fileIds: z.array(z.string().min(1)).min(1).max(100),
}) {}
