import type { InstanceAiAttachment } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { DesktopAssistantPromptMode } from '@n8n/instance-ai';

import { InstanceAiService } from '../instance-ai.service';

/**
 * The desktop assistant's single entry point into the Instance AI run engine.
 *
 * This facade is the ONLY place in the desktop-assistant directory that knows
 * about `InstanceAiService.startRun` and the desktop prompt modes. Everything
 * else (one-shot tasks, promote builds) goes through these two methods, so the
 * coupling surface to the orchestrator stays one file wide.
 */
@Service()
export class DesktopAssistantRunner {
	constructor(private readonly instanceAiService: InstanceAiService) {}

	/** Kick off a one-shot "do it now" task run on a (fresh) desktop thread. */
	startOneShotTask(
		user: User,
		threadId: string,
		message: string,
		attachments?: InstanceAiAttachment[],
	): string {
		return this.startRun(user, threadId, message, 'desktop-assistant-one-shot', attachments);
	}

	/** Kick off a promote run that compiles an executed task into a workflow. */
	startPromoteBuild(user: User, threadId: string, message: string): string {
		return this.startRun(user, threadId, message, 'desktop-assistant-promote');
	}

	/** Whether `runId` is still the thread's active run (dedupes promote polling). */
	isRunActive(threadId: string, runId: string): boolean {
		return this.instanceAiService.getActiveRunId(threadId) === runId;
	}

	private startRun(
		user: User,
		threadId: string,
		message: string,
		promptMode: DesktopAssistantPromptMode,
		attachments?: InstanceAiAttachment[],
	): string {
		return this.instanceAiService.startRun(
			user,
			threadId,
			message,
			attachments,
			undefined,
			undefined,
			{ promptMode },
		);
	}
}
