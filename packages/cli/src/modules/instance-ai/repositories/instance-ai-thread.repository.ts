import type { Thread } from '@n8n/agents';
import { BaseRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { InstanceAiThread } from '../entities/instance-ai-thread.entity';

@Service()
export class InstanceAiThreadRepository extends BaseRepository<InstanceAiThread> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(InstanceAiThread, dataSource.manager, transactionRunner);
	}

	/** Apply decisions to the locked row so sibling mains cannot claim the same state. */
	async updateThread(args: {
		threadId: string;
		update: (
			current: Thread,
		) => Partial<Pick<Thread, 'title' | 'metadata' | 'resourceId'>> | null | undefined;
	}): Promise<Thread | null> {
		return await this.runInTransaction({}, async (manager) => {
			const repository = manager.getRepository(InstanceAiThread);
			const row = await repository.findOne({
				where: { id: args.threadId },
				lock:
					manager.connection.options.type === 'postgres'
						? { mode: 'pessimistic_write' }
						: undefined,
			});
			if (!row) return null;
			const current: Thread = {
				id: row.id,
				resourceId: row.resourceId,
				title: row.title || undefined,
				metadata: row.metadata ?? undefined,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			};
			const patch = args.update(current);
			if (!patch) return current;
			if (patch.title !== undefined) row.title = patch.title;
			if (patch.metadata !== undefined) row.metadata = patch.metadata;
			if (patch.resourceId !== undefined) row.resourceId = patch.resourceId;
			const saved = await repository.save(row);
			return { ...current, ...patch, title: saved.title || undefined, updatedAt: saved.updatedAt };
		});
	}
}
