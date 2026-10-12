import type { SelfHealingExecutionReference } from '@n8n/api-types';
import type { OperationContext, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { randomUUID } from 'node:crypto';

import type { SelfHealingResult } from './database/self-healing-result.entity';
import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { buildThreadArtifactsBlock, buildThreadContextBlock } from '../internal-messages';
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
		await this.threads.getPersonalProjectForChat(user.id, {});
	}

	async findThreadId(resultId: string, userId: string): Promise<string | null> {
		return (await this.threads.findSelfHealingChat(resultId, userId, {}))?.id ?? null;
	}

	async prepare(
		user: User,
		result: SelfHealingResult,
		ctx: OperationContext,
		execution?: SelfHealingExecutionReference,
	): Promise<string> {
		const project = await this.threads.getPersonalProjectForChat(user.id, ctx);
		const existing = await this.threads.findSelfHealingChat(result.id, user.id, ctx);
		if (existing) {
			if (existing.projectId !== project.id) {
				throw new ConflictError('The continuation chat is not in your personal project.');
			}
			return existing.id;
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
		const message = `${context}\n\nSaved investigation report\n\n${result.report}`;
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
		return thread.id;
	}
}
