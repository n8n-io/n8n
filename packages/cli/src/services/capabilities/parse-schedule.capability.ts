import type * as InstanceAi from '@n8n/instance-ai';
import type { ScheduleTrigger } from '@n8n/instance-ai';
import { lazyImport } from '@n8n/utils/lazy-import';
import z from 'zod';

import { type CapabilityToolDefinition, defineCapability } from './capability';

export const PARSE_SCHEDULE_CAPABILITY_NAME = 'parse_schedule';

export const PARSE_SCHEDULE_MAX_TEXT_LENGTH = 2000;

const inputSchema = {
	text: z
		.string()
		.min(1)
		.max(PARSE_SCHEDULE_MAX_TEXT_LENGTH)
		.describe(
			'A message or phrase that can contain a schedule, for example "every weekday at 8" or "each Monday morning"',
		),
} satisfies z.ZodRawShape;

const hour = z.number().int().min(0).max(23);
const minute = z.number().int().min(0).max(59);

// Mirrors `ScheduleTrigger`. The SDK checks each result against this schema.
const triggerSchema = z
	.discriminatedUnion('mode', [
		z.object({ mode: z.literal('everyMinute') }),
		z.object({
			mode: z.literal('everyX'),
			unit: z.enum(['minutes', 'hours']),
			value: z.number().int().positive(),
		}),
		z.object({ mode: z.literal('everyHour'), minute }),
		z.object({ mode: z.literal('everyDay'), hour, minute }),
		z.object({ mode: z.literal('weekdays'), hour, minute }),
		z.object({
			mode: z.literal('everyWeek'),
			hour,
			minute,
			weekday: z.number().int().min(0).max(6).describe('0 is Sunday'),
		}),
		z.object({
			mode: z.literal('everyMonth'),
			hour,
			minute,
			dayOfMonth: z.number().int().min(1).max(31),
		}),
		z.object({ mode: z.literal('custom'), cronExpression: z.string() }),
	])
	.describe('The schedule in the shape that the n8n Schedule Trigger uses');

const outputSchema = {
	found: z.boolean().describe('True when the text contains a schedule'),
	trigger: triggerSchema.optional(),
	cron: z.string().optional().describe('Five-field cron expression, for example "0 8 * * 1-5"'),
	description: z
		.string()
		.optional()
		.describe('en-GB description with a 24-hour clock, for example "Every weekday at 08:00"'),
	matchedText: z.string().optional().describe('The part of the text that names the schedule'),
} satisfies z.ZodRawShape;

export type ParseScheduleResult = {
	found: boolean;
	trigger?: ScheduleTrigger;
	cron?: string;
	description?: string;
	matchedText?: string;
};

/** Finds the first schedule phrase in the text. Returns `found: false` when there is none. */
export async function parseSchedule(text: string): Promise<ParseScheduleResult> {
	// Loaded at the first call, so the MCP module does not load the Assistant package at startup.
	const { parseSchedulePhrase, scheduleToCron } = await lazyImport<typeof InstanceAi>(
		async () => await import('@n8n/instance-ai'),
	);
	const phrase = parseSchedulePhrase(text);
	if (!phrase) return { found: false };

	return {
		found: true,
		trigger: phrase.trigger,
		cron: scheduleToCron(phrase.trigger),
		description: phrase.description,
		matchedText: phrase.matchedText,
	};
}

const parseScheduleTool: CapabilityToolDefinition<typeof inputSchema> = {
	name: PARSE_SCHEDULE_CAPABILITY_NAME,
	config: {
		description:
			'Turn a phrase like "every weekday at 8" into a schedule: the Schedule Trigger settings, a cron expression and an en-GB description. Returns found: false when the text has no schedule.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Parse schedule',
			readOnlyHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ text }) => {
		const result = await parseSchedule(text);
		return {
			content: [{ type: 'text', text: JSON.stringify(result) }],
			structuredContent: result,
		};
	},
};

/** Read-only and the same for every user, so any client with `workflow:read` can use it. */
export const parseScheduleCapability = defineCapability({
	name: PARSE_SCHEDULE_CAPABILITY_NAME,
	scope: 'workflow:read',
	build: () => parseScheduleTool,
});
