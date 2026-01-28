import { z } from 'zod';
import { Z } from 'zod-class';

export class UpdateWorkflowHistoryVersionDto extends Z.class({
	nodes: z.array(z.any()).optional(),
	connections: z.record(z.any()).optional(),
	authors: z.string().optional(),
	name: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
}) {}
