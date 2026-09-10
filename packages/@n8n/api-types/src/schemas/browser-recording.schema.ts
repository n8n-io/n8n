import { z } from 'zod';

import { Z } from '../zod-class';

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

export const browserRecordingCaptureSettingsSchema = z
	.object({
		networkRequests: z.boolean(),
		screenshots: z.boolean(),
	})
	.strict();

export const browserRecordingNetworkRequestSchema = z
	.object({
		id: z.string().uuid(),
		actionId: z.string().uuid(),
		url: z.string().max(500),
		method: z.string().min(1).max(20),
		status: z.number().int().min(0).max(999),
		contentType: z.string().max(100).optional(),
		timestamp: z
			.number()
			.int()
			.nonnegative()
			.max(24 * 60 * 60 * 1000),
	})
	.strict();

export const MAX_BROWSER_RECORDING_SCREENSHOTS = 20;
export const MAX_BROWSER_RECORDING_NETWORK_REQUESTS = 500;
export const MAX_BROWSER_RECORDING_SCREENSHOT_BASE64_BYTES = 1024 * 1024;
export const MAX_BROWSER_RECORDING_SCREENSHOTS_BASE64_BYTES = 20 * 1024 * 1024;

export const browserRecordingScreenshotSchema = z
	.object({
		id: z.string().uuid(),
		actionId: z.string().uuid(),
		data: z.string().max(MAX_BROWSER_RECORDING_SCREENSHOT_BASE64_BYTES),
		mimeType: z.literal('image/jpeg'),
		timestamp: z
			.number()
			.int()
			.nonnegative()
			.max(24 * 60 * 60 * 1000),
	})
	.strict();

export const browserRecordingSchema = z
	.object({
		id: z.string().uuid(),
		startedAt: z.string().datetime(),
		actions: z.array(browserRecordingActionSchema).min(1).max(250),
		captureSettings: browserRecordingCaptureSettingsSchema.optional(),
		networkRequests: z
			.array(browserRecordingNetworkRequestSchema)
			.max(MAX_BROWSER_RECORDING_NETWORK_REQUESTS)
			.optional(),
		screenshots: z
			.array(browserRecordingScreenshotSchema)
			.max(MAX_BROWSER_RECORDING_SCREENSHOTS)
			.optional(),
	})
	.strict()
	.superRefine((recording, context) => {
		const actionIds = new Set(recording.actions.map((action) => action.id));
		for (const request of recording.networkRequests ?? []) {
			if (!actionIds.has(request.actionId)) {
				context.addIssue({
					code: 'custom',
					message: 'Network request references an unknown action',
					path: ['networkRequests'],
				});
			}
		}
		let screenshotBytes = 0;
		for (const screenshot of recording.screenshots ?? []) {
			screenshotBytes += screenshot.data.length;
			if (!actionIds.has(screenshot.actionId)) {
				context.addIssue({
					code: 'custom',
					message: 'Screenshot references an unknown action',
					path: ['screenshots'],
				});
			}
		}
		if (screenshotBytes > MAX_BROWSER_RECORDING_SCREENSHOTS_BASE64_BYTES) {
			context.addIssue({
				code: 'custom',
				message: 'Screenshots exceed the recording size limit',
				path: ['screenshots'],
			});
		}
	});

export class InstanceAiBrowserRecordingRequest extends Z.class({
	recording: browserRecordingSchema,
}) {}

export interface InstanceAiBrowserRecordingResponse {
	threadId: string;
}

export type BrowserRecordingTarget = z.infer<typeof browserRecordingTargetSchema>;
export type BrowserRecordingAction = z.infer<typeof browserRecordingActionSchema>;
export type BrowserRecordingActionType = BrowserRecordingAction['type'];
export type BrowserRecordingCaptureSettings = z.infer<typeof browserRecordingCaptureSettingsSchema>;
export type BrowserRecordingNetworkRequest = z.infer<typeof browserRecordingNetworkRequestSchema>;
export type BrowserRecordingScreenshot = z.infer<typeof browserRecordingScreenshotSchema>;
export type BrowserRecording = z.infer<typeof browserRecordingSchema>;
