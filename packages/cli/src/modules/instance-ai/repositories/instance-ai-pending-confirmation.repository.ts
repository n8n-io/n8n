import { Service } from '@n8n/di';
import { DataSource, LessThan, Repository } from '@n8n/typeorm';

import { InstanceAiPendingConfirmation } from '../entities/instance-ai-pending-confirmation.entity';

@Service()
export class InstanceAiPendingConfirmationRepository extends Repository<InstanceAiPendingConfirmation> {
	constructor(dataSource: DataSource) {
		super(InstanceAiPendingConfirmation, dataSource.manager);
	}

	/**
	 * Atomically take ownership of a pending confirmation. Returns the row to
	 * the caller who wins the delete; concurrent attempts (e.g. parallel
	 * confirm/cancel/TTL sweep) all return `undefined` except one.
	 *
	 * Scoped by `userId` so a different user cannot claim a confirmation that
	 * was registered for someone else.
	 */
	async claim(
		requestId: string,
		userId: string,
	): Promise<InstanceAiPendingConfirmation | undefined> {
		return await this.manager.transaction(async (manager) => {
			const repo = manager.getRepository(InstanceAiPendingConfirmation);
			const row = await repo.findOne({
				where: { requestId, userId },
				...(manager.connection.options.type === 'postgres'
					? { lock: { mode: 'pessimistic_write' as const } }
					: {}),
			});
			if (!row) return undefined;

			const result = await repo.delete({ requestId, userId });
			if (result.affected === 0) return undefined;
			return row;
		});
	}

	/** Drop a confirmation regardless of owner — for thread/run-level teardown. */
	async deleteByRequestId(requestId: string): Promise<number> {
		const result = await this.delete({ requestId });
		return result.affected ?? 0;
	}

	async deleteByThreadId(threadId: string): Promise<number> {
		const result = await this.delete({ threadId });
		return result.affected ?? 0;
	}

	async deleteByRunId(runId: string): Promise<number> {
		const result = await this.delete({ runId });
		return result.affected ?? 0;
	}

	async findExpired(now: Date): Promise<InstanceAiPendingConfirmation[]> {
		return await this.find({ where: { expiresAt: LessThan(now) } });
	}

	async findByThreadId(threadId: string): Promise<InstanceAiPendingConfirmation[]> {
		return await this.find({ where: { threadId } });
	}
}
