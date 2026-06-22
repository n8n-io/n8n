import { Service } from '@n8n/di';
import { DataSource, In, IsNull, LessThan, MoreThanOrEqual, Or, Repository } from '@n8n/typeorm';

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
	 * was registered for someone else, and by `expiresAt` so an expired row
	 * is treated as gone.
	 */
	async claim(
		requestId: string,
		userId: string,
	): Promise<InstanceAiPendingConfirmation | undefined> {
		return await this.manager.transaction(async (manager) => {
			const repo = manager.getRepository(InstanceAiPendingConfirmation);
			const now = new Date();
			const liveWhere = {
				requestId,
				userId,
				expiresAt: Or(IsNull(), MoreThanOrEqual(now)),
			};
			const row = await repo.findOne({
				where: liveWhere,
				...(manager.connection.options.type === 'postgres'
					? { lock: { mode: 'pessimistic_write' as const } }
					: {}),
			});
			if (!row) return undefined;

			const result = await repo.delete(liveWhere);
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

	async deleteExpired(now: Date): Promise<number> {
		const result = await this.delete({ expiresAt: LessThan(now) });
		return result.affected ?? 0;
	}

	async findByThreadId(threadId: string): Promise<InstanceAiPendingConfirmation[]> {
		return await this.find({ where: { threadId } });
	}

	/** Of the given request IDs, return those still actionable (row exists and
	 *  not past `expiresAt`). The complement is treated as expired by the UI. */
	async findLiveRequestIds(requestIds: string[], now: Date): Promise<Set<string>> {
		if (requestIds.length === 0) return new Set();
		const rows = await this.find({
			where: {
				requestId: In(requestIds),
				expiresAt: Or(IsNull(), MoreThanOrEqual(now)),
			},
			select: ['requestId'],
		});
		return new Set(rows.map((row) => row.requestId));
	}
}
