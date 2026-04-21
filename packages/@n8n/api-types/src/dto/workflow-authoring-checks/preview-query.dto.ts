import { z } from 'zod';

import { Z } from '../../zod-class';

export class WorkflowAuthoringChecksPreviewQueryDto extends Z.class({
	versionId: z.string().optional(),
}) {}
