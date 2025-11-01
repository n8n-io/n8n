import { z } from 'zod';
import { Z } from 'zod-class';

export class AiSessionRetrievalRequestDto extends Z.class({
	workflowId: z.string().optional(),
}) {}
