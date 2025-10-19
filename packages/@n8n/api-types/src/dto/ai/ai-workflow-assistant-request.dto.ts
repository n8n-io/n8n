import type { IWorkflowBase } from 'n8n-workflow';
import { z } from 'zod';
import { Z } from 'zod-class';

export class AiWorkflowAssistantRequestDto extends Z.class({
	workflowId: z.string(),
	workflowData: z.custom<IWorkflowBase>((val: IWorkflowBase) => {
		if (!val.id || !val.name || !val.nodes || !val.connections) {
			return false;
		}
		return val;
	}),
	message: z.string().min(1).max(5000),
	conversationHistory: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant']),
				content: z.string(),
			}),
		)
		.max(50), // Limit history to last 50 messages
}) {}
