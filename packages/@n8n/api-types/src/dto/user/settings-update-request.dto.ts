import { z } from 'zod';
import { Z } from 'zod-class';

export class SettingsUpdateRequestDto extends Z.class({
	userActivated: z.boolean().optional(),
	allowSSOManualLogin: z.boolean().optional(),
	easyAIWorkflowOnboarded: z.boolean().optional(),
	dismissedCallouts: z.record(z.string(), z.boolean()).optional(),
	aiAssistant: z
		.object({
			allowAssistantToSendParameterValues: z.boolean().optional(),
			allowAssistantToSendExpressions: z.boolean().optional(),
		})
		.optional(),
}) {}
