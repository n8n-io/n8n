import { instanceAiTaskRunSchema } from '@n8n/api-types';
import type { InstanceAiTaskRun } from '@n8n/api-types';
import type { TaskRunStorage } from '@n8n/instance-ai';

import type { InstanceAiTaskRunRepository } from './repositories/instance-ai-task-run.repository';

function parseTaskRun(raw: unknown): InstanceAiTaskRun | null {
	const result = instanceAiTaskRunSchema.safeParse(raw);
	return result.success ? result.data : null;
}

export class MastraTaskRunStorage implements TaskRunStorage {
	constructor(private readonly taskRunRepo: InstanceAiTaskRunRepository) {}

	async get(threadId: string): Promise<InstanceAiTaskRun[]> {
		const entities = await this.taskRunRepo.find({
			where: { threadId },
			order: { sortUpdatedAt: 'DESC', updatedAt: 'DESC' },
		});

		return entities
			.map((entity) => parseTaskRun(entity.data))
			.filter((taskRun): taskRun is InstanceAiTaskRun => taskRun !== null);
	}

	async save(threadId: string, taskRuns: InstanceAiTaskRun[]): Promise<void> {
		const nextTaskIds = new Set(taskRuns.map((taskRun) => taskRun.taskId));
		const existing = await this.taskRunRepo.find({ where: { threadId } });
		const staleTaskIds = existing
			.filter((entity) => !nextTaskIds.has(entity.taskId))
			.map((entity) => entity.taskId);

		if (staleTaskIds.length > 0) {
			await this.taskRunRepo.delete(staleTaskIds);
		}

		for (const taskRun of taskRuns) {
			await this.upsert(taskRun);
		}
	}

	async upsert(taskRun: InstanceAiTaskRun): Promise<void> {
		const entity = this.taskRunRepo.create({
			taskId: taskRun.taskId,
			threadId: taskRun.threadId,
			originRunId: taskRun.originRunId,
			messageGroupId: taskRun.messageGroupId ?? null,
			agentId: taskRun.agentId,
			role: taskRun.role,
			kind: taskRun.kind,
			status: taskRun.status,
			planId: taskRun.planId ?? null,
			phaseId: taskRun.phaseId ?? null,
			sortUpdatedAt: String(taskRun.updatedAt),
			data: taskRun,
		});

		await this.taskRunRepo.save(entity);
	}
}
