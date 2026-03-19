import { z } from 'zod';

import { domainAccessActionSchema } from '../../schemas/instance-ai.schema';
import { Z } from '../../zod-class';

export class InstanceAiConfirmRequestDto extends Z.class({
	approved: z.boolean(),
	credentialId: z.string().optional(),
	credentials: z.record(z.string()).optional(),
	autoSetup: z.object({ credentialType: z.string() }).optional(),
	userInput: z.string().optional(),
	domainAccessAction: domainAccessActionSchema.optional(),
}) {}
