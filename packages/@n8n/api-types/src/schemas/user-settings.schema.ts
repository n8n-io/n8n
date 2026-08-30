import { z } from 'zod';

export const npsSurveyRespondedSchema = z.object({
	lastShownAt: z.number(),
	responded: z.literal(true),
});

export const npsSurveyWaitingSchema = z.object({
	lastShownAt: z.number(),
	waitingForResponse: z.literal(true),
	ignoredCount: z.number(),
});

export const npsSurveySchema = z.union([npsSurveyRespondedSchema, npsSurveyWaitingSchema]);

export const userSettingsSchema = z.object({
	isOnboarded: z.boolean().optional(),
	firstSuccessfulWorkflowId: z.string().optional(),
	userActivated: z.boolean().optional(),
	userActivatedAt: z.number().optional(),
	allowSSOManualLogin: z.boolean().optional(),
	npsSurvey: npsSurveySchema.optional(),
	easyAIWorkflowOnboarded: z.boolean().optional(),
	userClaimedAiCredits: z.boolean().optional(),
	dismissedCallouts: z.record(z.boolean()).optional(),
	// `GET /users` removes the keys that are not listed here. The frontend then
	// merges that response over the settings of the current user. Add every key
	// that the UI reads from `currentUser.settings`.
	instanceAi: z
		.object({
			defaultEditor: z.enum(['assistant', 'manual']).optional(),
		})
		.optional(),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;
