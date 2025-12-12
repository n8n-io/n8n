import { z } from 'zod';
import { Z } from 'zod-class';

export class AiTruncateMessagesRequestDto extends Z.class({
	workflowId: z.string(),
	versionId: z.string(),
}) {}
