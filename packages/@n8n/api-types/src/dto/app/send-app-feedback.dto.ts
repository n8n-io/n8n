import { z } from 'zod';

import { Z } from '../../zod-class';

export const APP_FEEDBACK_MAX_LENGTH = 12_000;

export const appFeedbackCategorySchema = z.enum(['bug', 'idea', 'other']);
export type AppFeedbackCategory = z.infer<typeof appFeedbackCategorySchema>;

/** Feedback that a user writes about n8n Apps. The server adds the user, instance and app context. */
export class SendAppFeedbackDto extends Z.class(
	{
		category: appFeedbackCategorySchema,
		feedback: z.string().trim().min(1).max(APP_FEEDBACK_MAX_LENGTH),
	},
	{ strict: true },
) {}
