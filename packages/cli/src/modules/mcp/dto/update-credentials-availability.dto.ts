import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class UpdateCredentialsAvailabilityDto extends Z.class({
	credentialIds: z.array(z.string().min(1)).min(1).max(100),
	availableInMCP: z.boolean(),
}) {}
