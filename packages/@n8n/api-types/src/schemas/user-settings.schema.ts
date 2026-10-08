import { z } from 'zod';

import { experienceModeSchema } from './experience-mode.schema';

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

/** How often the MCP JSON nudge was shown. The self-service settings DTO accepts the same shape. */
export const mcpJsonNudgeSettingsSchema = z.object({
	impressions: z.number().int().nonnegative(),
});

// Each preference is dropped on its own, so one bad value does not hide the others.
const instanceAiUserSettingsSchema = z.object({
	credentialId: z.string().nullable().optional().catch(undefined),
	modelName: z.string().optional().catch(undefined),
	localGatewayDisabled: z.boolean().optional().catch(undefined),
});

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
	// Unknown saved values are dropped, not rejected, so that one bad row cannot fail a users list.
	experienceMode: experienceModeSchema.optional().catch(undefined),
	mcpJsonNudge: mcpJsonNudgeSettingsSchema.optional().catch(undefined),
	instanceAi: instanceAiUserSettingsSchema.optional().catch(undefined),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;
