import { Service } from '@n8n/di';
import type { IterationEntry, IterationLog } from '@n8n/instance-ai';
import { generateNanoId } from '@n8n/utils';
import { jsonParse } from 'n8n-workflow';

import { InstanceAiIterationLogRepository } from '../repositories/instance-ai-iteration-log.repository';

@Service()
export class DbIterationLogStorage implements IterationLog {
	constructor(private readonly repo: InstanceAiIterationLogRepository) {}

	async append(threadId: string, taskKey: string, entry: IterationEntry): Promise<void> {
		await this.repo.insert({
			id: generateNanoId(),
			threadId,
			taskKey,
			entry: JSON.stringify(entry),
		});
	}

	async getForTask(threadId: string, taskKey: string): Promise<IterationEntry[]> {
		const rows = await this.repo.find({
			where: { threadId, taskKey },
			order: { createdAt: 'ASC' },
		});
		return rows.map((r) => jsonParse<IterationEntry>(r.entry));
	}

	async clear(threadId: string): Promise<void> {
		await this.repo.delete({ threadId });
	}
}
