import { z } from 'zod';
import { Z } from 'zod-class';

export class RefreshActiveWorkflowRequestDto extends Z.class({
	workflowId: z.string().min(1),
}) {}
