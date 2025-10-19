import type { IWorkflowDb } from '@n8n/db';
import { z } from 'zod';
import { Z } from 'zod-class';

export class AiWorkflowAssistantRequestDto extends Z.class({
	workflowId: z.string(),
	workflowData: z.custom<IWorkflowDb>((val: IWorkflowDb) => {
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
