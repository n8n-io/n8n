import { z } from 'zod';

import { Z } from '../../zod-class';

export class ProjectFileContentQueryDto extends Z.class({
	action: z.enum(['view', 'download']).default('download'),
}) {}
