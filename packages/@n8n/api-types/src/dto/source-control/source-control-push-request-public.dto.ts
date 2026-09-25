import { z } from 'zod';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { Z } from '../../zod-class';

const PushFileSelectorSchema = z.object({
	id: z.string().min(1),
	type: SourceControlledFileSchema.shape.type,
});

export class SourceControlPushRequestPublicDto extends Z.class({
	commitMessage: z.string().trim().min(1).max(1000),
	fileNames: z.array(PushFileSelectorSchema).min(1),
	force: z.boolean().optional(),
}) {}
