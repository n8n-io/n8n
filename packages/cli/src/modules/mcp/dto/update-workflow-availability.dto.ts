import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class UpdateWorkflowAvailabilityDto extends Z.class({
	availableInMCP: z.boolean(),
}) {}
