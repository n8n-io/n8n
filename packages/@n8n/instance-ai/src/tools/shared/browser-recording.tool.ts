import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { DOMAIN_TOOL_IDS } from '../tool-ids';

export const START_BROWSER_RECORDING_TOOL_ID = DOMAIN_TOOL_IDS.START_BROWSER_RECORDING;
export const STOP_BROWSER_RECORDING_TOOL_ID = DOMAIN_TOOL_IDS.STOP_BROWSER_RECORDING;

const startInputSchema = z.object({});

const startResumeSchema = z.object({
	approved: z.boolean(),
});

/**
 * Offers to start a browser recording: if the user's extension isn't paired, tells the
 * model so in plain text (no button — nothing to click yet); if it is, suspends with a
 * one-click "Start recording" action. On approval, asks the paired extension to start.
 */
export function createStartBrowserRecordingTool(context: InstanceAiContext) {
	return new Tool(START_BROWSER_RECORDING_TOOL_ID)
		.description(
			'Offer to record the user demonstrating a task in their browser, so you can build a workflow ' +
				'from what they do. Use when the task involves interacting with a website, or when the user ' +
				'seems unsure what to build and might benefit from being watched while they work. This tool ' +
				'attaches a one-click "Start recording" action to your message — call it once you have proposed ' +
				'recording and the user agreed (by clicking it, or by replying "yes"/"go ahead" in chat).',
		)
		.input(startInputSchema)
		.output(
			z.object({
				started: z.boolean(),
				reason: z.string().optional(),
			}),
		)
		.suspend(
			z.object({
				requestId: z.string(),
				message: z.string(),
				severity: z.literal('info'),
				inputType: z.literal('continue'),
				continueLabel: z.string(),
				continueIcon: z.string(),
			}),
		)
		.resume(startResumeSchema)
		.handler(async (_input, ctx) => {
			const service = context.browserRecordingService;
			if (!service?.isConnected(context.userId)) {
				return {
					started: false,
					reason:
						"The user's browser extension isn't paired yet. Tell them to connect it from the AI " +
						'Assistant panel, then ask again once it is.',
				};
			}

			if (ctx.resumeData === undefined || ctx.resumeData === null) {
				return await ctx.suspend({
					requestId: nanoid(),
					message: "I'll watch what you do in the browser and build a workflow from it.",
					severity: 'info' as const,
					inputType: 'continue' as const,
					continueLabel: 'Start recording',
					continueIcon: 'circle-dot',
				});
			}

			if (!ctx.resumeData.approved) {
				return { started: false, reason: 'The user declined to start recording.' };
			}

			const threadId = context.threadId;
			if (!threadId) {
				return {
					started: false,
					reason: 'No active thread to resume once the recording completes.',
				};
			}

			const { started, reason } = await service.startRecording(context.userId, threadId);
			return started
				? { started: true }
				: {
						started: false,
						reason: reason ?? 'The browser extension disconnected before recording could start.',
					};
		})
		.build();
}

const stopInputSchema = z.object({});

/**
 * Stops the active recording and submits it immediately, when the user says (in chat)
 * that they're done — no suspend, this is a direct action rather than a confirmation.
 */
export function createStopBrowserRecordingTool(context: InstanceAiContext) {
	return new Tool(STOP_BROWSER_RECORDING_TOOL_ID)
		.description(
			'Call when the user tells you (in chat) that they are done performing the actions to record — ' +
				'e.g. "I\'m done", "that\'s it". Stops the recording and pulls the recorded actions directly, ' +
				"without the user needing to go back to the extension's Stop/Submit buttons.",
		)
		.input(stopInputSchema)
		.output(
			z.object({
				stopped: z.boolean(),
				reason: z.string().optional(),
			}),
		)
		.handler(async () => {
			const service = context.browserRecordingService;
			if (!service?.isConnected(context.userId)) {
				return { stopped: false, reason: "The browser extension isn't connected." };
			}
			const { stopped, reason } = await service.stopAndSubmitRecording(context.userId);
			return stopped
				? {
						stopped: true,
						reason:
							"The recording is submitted. It will arrive as this conversation's next turn — don't " +
							'say anything further until then.',
					}
				: {
						stopped: false,
						reason: reason ?? 'The browser extension disconnected before it could stop.',
					};
		})
		.build();
}
