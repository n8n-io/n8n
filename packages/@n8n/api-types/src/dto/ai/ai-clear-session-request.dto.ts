import { z } from 'zod';

import { Z } from '../../zod-class';

export class AiClearSessionRequestDto extends Z.class({
	workflowId: z.string(),
}) {}
