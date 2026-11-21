import { z } from 'zod';

/** Resources that count as Assistant usage when the Assistant creates them. */
export const assistantUsageResourceTypeSchema = z.enum(['workflow', 'agent', 'data-table']);
export type AssistantUsageResourceType = z.infer<typeof assistantUsageResourceTypeSchema>;

/** Resources that the Assistant created. A resource counts once, however often it was built. */
const createdCountsShape = {
	workflowsCreated: z.number(),
	agentsCreated: z.number(),
	dataTablesCreated: z.number(),
};

/** Messages that users sent, and the conversations that they sent them in. */
const messageCountsShape = {
	conversations: z.number(),
	messages: z.number(),
};

export const assistantUsageSummarySchema = z.object({
	...messageCountsShape,
	/** Users who sent at least one message. */
	activeUsers: z.number(),
	...createdCountsShape,
});
export type AssistantUsageSummary = z.infer<typeof assistantUsageSummarySchema>;

export const assistantUsageDaySchema = z.object({
	/** ISO date in the requested time zone, such as `2026-11-18`. */
	date: z.string(),
	...messageCountsShape,
	...createdCountsShape,
});
export type AssistantUsageDay = z.infer<typeof assistantUsageDaySchema>;

/** Usage of the n8n Assistant on this instance, for admins. */
export const assistantUsageResponseSchema = z.object({
	summary: assistantUsageSummarySchema,
	/** Every day of the range, with zeros for days without usage. */
	byDay: z.array(assistantUsageDaySchema),
});
export type AssistantUsageResponse = z.infer<typeof assistantUsageResponseSchema>;

export const assistantUsageUserSchema = z.object({
	/** `null` groups the usage of deleted users. */
	userId: z.string().nullable(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string().nullable(),
	...messageCountsShape,
	...createdCountsShape,
	/** When the user last sent a message in the range. */
	lastUsedAt: z.string().nullable(),
});
export type AssistantUsageUser = z.infer<typeof assistantUsageUserSchema>;

/** One page of the users who used the Assistant in the range. */
export const assistantUsageUsersResponseSchema = z.object({
	count: z.number(),
	data: z.array(assistantUsageUserSchema),
});
export type AssistantUsageUsersResponse = z.infer<typeof assistantUsageUsersResponseSchema>;
