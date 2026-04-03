import { z } from 'zod';

import { domainAccessActionSchema } from '../../schemas/instance-ai.schema';
import { Z } from '../../zod-class';

export class InstanceAiConfirmRequestDto extends Z.class({
	approved: z.boolean(),
	credentialId: z.string().optional(),
	credentials: z.record(z.string()).optional(),
	nodeCredentials: z.record(z.record(z.string())).optional(),
	autoSetup: z.object({ credentialType: z.string() }).optional(),
	userInput: z.string().optional(),
	domainAccessAction: domainAccessActionSchema.optional(),
	action: z.enum(['apply', 'test-trigger']).optional(),
	nodeParameters: z.record(z.record(z.unknown())).optional(),
	testTriggerNode: z.string().optional(),
	answers: z
		.array(
			z.object({
				questionId: z.string(),
				selectedOptions: z.array(z.string()),
				customText: z.string().optional(),
				skipped: z.boolean().optional(),
			}),
		)
		.optional(),
	resourceDecision: z.string().optional(),
}) {}
