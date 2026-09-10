import { z } from 'zod';

export const MAX_BROWSER_AUTOMATION_IDEAS = 3;
export const MAX_BROWSER_AUTOMATION_IDEA_TITLE_LENGTH = 80;
export const MAX_BROWSER_AUTOMATION_IDEA_DESCRIPTION_LENGTH = 140;

export const browserAutomationIdeaSchema = z
	.object({
		id: z.string().uuid(),
		title: z.string().min(1).max(MAX_BROWSER_AUTOMATION_IDEA_TITLE_LENGTH),
		description: z.string().min(1).max(MAX_BROWSER_AUTOMATION_IDEA_DESCRIPTION_LENGTH),
	})
	.strict();

export type BrowserAutomationIdea = z.infer<typeof browserAutomationIdeaSchema>;
