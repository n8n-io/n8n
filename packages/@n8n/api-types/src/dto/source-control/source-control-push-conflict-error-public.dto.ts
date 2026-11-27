import { z } from 'zod';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { Z } from '../../zod-class';

export class SourceControlPushConflictErrorPublicDto extends Z.class({
	message: z.string(),
	/** Only present when files have unresolved conflicts. A remote-ahead 409 has no file list. */
	conflicts: z.array(SourceControlledFileSchema).optional(),
}) {}
