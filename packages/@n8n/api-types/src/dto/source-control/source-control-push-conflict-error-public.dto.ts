import { z } from 'zod';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { Z } from '../../zod-class';

export class SourceControlPushConflictErrorPublicDto extends Z.class({
	message: z.string(),
	conflicts: z.array(SourceControlledFileSchema),
}) {}
