import { z } from 'zod';
import { Z } from 'zod-class';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';

export class PushWorkFolderRequestDto extends Z.class({
	force: z.boolean().optional(),
	commitMessage: z.string().optional(),
	fileNames: z.array(SourceControlledFileSchema),
}) {}
