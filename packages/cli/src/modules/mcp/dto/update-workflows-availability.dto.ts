import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class UpdateWorkflowsAvailabilityDto extends Z.class({
	availableInMCP: z.boolean(),
	workflowIds: z.array(z.string().min(1)).min(1).max(100).optional(),
	projectId: z.string().min(1).optional(),
	folderId: z.string().min(1).optional(),
}) {}
