import { z } from 'zod';
import { Z } from 'zod-class';

export class CreateAccessRequestDto extends Z.class({
	projectId: z.string().min(1),
	nodeType: z.string().min(1).max(255),
	justification: z.string().min(10).max(1000),
	workflowName: z.string().max(255).optional(),
}) {}
