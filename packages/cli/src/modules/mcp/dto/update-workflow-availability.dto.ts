import { z } from 'zod';
import { Z } from 'zod-class';

export class UpdateWorkflowAvailabilityDto extends Z.class({
	availableInMCP: z.boolean(),
}) {}
