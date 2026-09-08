import { z } from 'zod';

export const browserRecordingTargetSchema = z
	.object({
		tag: z.string().min(1).max(30),
		role: z.string().max(40).optional(),
		label: z.string().max(160).optional(),
		name: z.string().max(80).optional(),
		inputType: z.string().max(40).optional(),
	})
	.strict();

export const browserRecordingActionSchema = z
	.object({
		id: z.string().uuid(),
		type: z.enum([
			'navigation',
			'click',
			'context_menu',
			'copy',
			'input',
			'key',
			'select',
			'submit',
			'tab_switch',
		]),
		timestamp: z
			.number()
			.int()
			.nonnegative()
			.max(24 * 60 * 60 * 1000),
		url: z.string().max(500),
		target: browserRecordingTargetSchema.optional(),
		value: z.string().max(200).optional(),
		redacted: z.boolean().optional(),
	})
	.strict();

export const browserRecordingSchema = z
	.object({
		id: z.string().uuid(),
		startedAt: z.string().datetime(),
		actions: z.array(browserRecordingActionSchema).min(1).max(250),
	})
	.strict();

export type BrowserRecordingTarget = z.infer<typeof browserRecordingTargetSchema>;
export type BrowserRecordingAction = z.infer<typeof browserRecordingActionSchema>;
export type BrowserRecordingActionType = BrowserRecordingAction['type'];
export type BrowserRecording = z.infer<typeof browserRecordingSchema>;
