import type { SelfHealingExecutionReference } from '@n8n/api-types';
import type { OperationContext, User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { BadRequestError, ConflictError, ForbiddenError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { randomUUID } from 'node:crypto';

import type { SelfHealingResult } from './database/self-healing-result.entity';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import {
	AUTO_FOLLOW_UP_MESSAGE,
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
} from '../internal-messages';
import { InstanceAiThreadRepository } from '../repositories/instance-ai-thread.repository';

@Service()
export class SelfHealingChatService {
	constructor(
		private readonly threads: InstanceAiThreadRepository,
		private readonly settings: InstanceAiSettingsService,
	) {}

	async assertAvailable(user: User): Promise<void> {
		if (user.disabled || !hasGlobalScope(user, 'instanceAi:message')) {
			throw new ForbiddenError('Assistant message access is required.');
		}
		if (!this.settings.isInstanceAiEnabled()) {
			throw new ForbiddenError('Instance AI is disabled');
		}
		if (!(await this.settings.isModelConfigured())) {
			throw new BadRequestError(
				'The n8n Assistant has no model configured. An instance owner can add one in Settings > Assistant.',
			);
		}
		if (!(await this.settings.isSetupCompleted())) {
			throw new BadRequestError('Complete n8n Assistant setup before continuing in chat.');
		}
		await this.threads.getPersonalProjectForChat(user.id, {});
	}

	async prepare(
		user: User,
		result: SelfHealingResult,
		ctx: OperationContext,
		execution?: SelfHealingExecutionReference,
	): Promise<{ threadId: string; created: boolean }> {
		const project = await this.threads.getPersonalProjectForChat(user.id, ctx);
		const existing = await this.threads.findSelfHealingChat(result.id, user.id, ctx);
		if (existing) {
			if (existing.projectId !== project.id) {
				throw new ConflictError('The continuation chat is not in your personal project.');
			}
			return { threadId: existing.id, created: false };
		}

		const context = buildThreadContextBlock([
			buildThreadArtifactsBlock(undefined, [
				{
					type: 'workflow',
					id: result.workflowId,
					...(execution?.status === 'available' ? { executionId: execution.id } : {}),
				},
			]),
		]);
		const message = `${context}\n\nHelp me continue with this saved Assistant report. Read the current saved workflow before making more changes. The suggested changes may already be applied.\n\n${result.report}`;
		const thread = await this.threads.createSelfHealingChat(
			{
				id: randomUUID(),
				resourceId: user.id,
				projectId: project.id,
				selfHealingResultId: result.id,
				title: result.summary,
				metadata: {
					source: 'self_healing_result',
					origin: 'internal',
					sourceContext: { resultId: result.id, outcome: result.outcome },
				},
			},
			{
				id: randomUUID(),
				createdAt: new Date(),
				type: 'llm',
				role: 'user',
				content: [{ type: 'text', text: message }],
			},
			ctx,
		);
		return { threadId: thread.id, created: true };
	}

	async canReadThread(userId: string, threadId: string): Promise<boolean> {
		return !!(await this.threads.findOwnedSelfHealingChat(threadId, userId));
	}

	async start(user: User, threadId: string): Promise<void> {
		if (!(await this.canReadThread(user.id, threadId))) {
			throw new ForbiddenError('The continuation chat is not available.');
		}
		const { InstanceAiService } = await import('../instance-ai.service.js');
		const assistant = Container.get(InstanceAiService);
		if (assistant.hasActiveRun(threadId)) return;
		await this.assertAvailable(user);
		if (
			(await this.threads.hasUserTurnAfterOpening(threadId)) ||
			assistant.hasActiveRun(threadId)
		) {
			return;
		}
		// The saved opening turn survives a refused run and stays visible when the chat opens.
		assistant.startRun(user, threadId, AUTO_FOLLOW_UP_MESSAGE);
	}
}
