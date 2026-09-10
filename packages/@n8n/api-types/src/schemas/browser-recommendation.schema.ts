import { z } from 'zod';

export const MAX_BROWSER_AUTOMATION_IDEAS = 3;

export const browserAutomationIdeaSchema = z
	.object({
		id: z.string().uuid(),
		title: z.string().min(1).max(80),
		description: z.string().min(1).max(140),
	})
	.strict();

export type BrowserAutomationIdea = z.infer<typeof browserAutomationIdeaSchema>;
