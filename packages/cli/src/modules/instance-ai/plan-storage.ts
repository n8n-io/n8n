import type { Memory } from '@mastra/memory';
import { instanceAiPlanSpecSchema } from '@n8n/api-types';
import type { InstanceAiPlanSpec } from '@n8n/api-types';
import type { PlanStorage } from '@n8n/instance-ai';

const PLAN_METADATA_KEY = 'instanceAiPlan';

export class MastraPlanStorage implements PlanStorage {
	constructor(private readonly memory: Memory) {}

	async get(threadId: string): Promise<InstanceAiPlanSpec | null> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread?.metadata?.[PLAN_METADATA_KEY]) return null;
		const result = instanceAiPlanSpecSchema.safeParse(thread.metadata[PLAN_METADATA_KEY]);
		return result.success ? result.data : null;
	}

	async save(threadId: string, plan: InstanceAiPlanSpec): Promise<void> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread) {
			throw new Error(`Thread ${threadId} not found`);
		}

		await this.memory.updateThread({
			id: threadId,
			title: thread.title ?? threadId,
			metadata: {
				...thread.metadata,
				[PLAN_METADATA_KEY]: plan,
			},
		});
	}
}
