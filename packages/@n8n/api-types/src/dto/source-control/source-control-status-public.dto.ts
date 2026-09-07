import { z } from 'zod';

import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { Z } from '../../zod-class';

export class SourceControlStatusPublicDto extends Z.class({
	data: z.array(SourceControlledFileSchema),
}) {}
