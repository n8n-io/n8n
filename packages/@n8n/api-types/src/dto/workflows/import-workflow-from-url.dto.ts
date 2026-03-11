import { z } from 'zod';

import { Z } from '../../zod-class';

export class ImportWorkflowFromUrlDto extends Z.class({
	url: z.url(),
	projectId: z.string(),
}) {}
