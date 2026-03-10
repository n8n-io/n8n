import type { Memory } from '@mastra/memory';
import { planObjectSchema } from '@n8n/api-types';
import type { PlanObject, PlanStorage } from '@n8n/instance-ai';

const PLAN_METADATA_KEY = 'instanceAiPlan';

export class MastraPlanStorage implements PlanStorage {
	constructor(private readonly memory: Memory) {}

	async get(threadId: string): Promise<PlanObject | null> {
		const thread = await this.memory.getThreadById({ threadId });
		if (!thread?.metadata?.[PLAN_METADATA_KEY]) return null;
		const result = planObjectSchema.safeParse(thread.metadata[PLAN_METADATA_KEY]);
		return result.success ? result.data : null;
	}

	async save(threadId: string, plan: PlanObject): Promise<void> {
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
