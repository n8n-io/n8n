import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import {
	AgentConversationLeaseLostError,
	CONVERSATION_LEASE_TTL_MS,
	type AgentConversationLeaseHandle,
} from '../agent-conversation-lease.types';
import { AgentConversationLease } from '../entities/agent-conversation-lease.entity';

/** Read the database wall clock, including after a transaction waits for a row. */
export function conversationDbTime(isPostgres: boolean, offsetMs = 0): string {
	return isPostgres
		? `clock_timestamp() + INTERVAL '${offsetMs} milliseconds'`
		: `STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW', '${offsetMs / 1000} seconds')`;
}

@Service()
export class AgentConversationLeaseRepository extends BaseRepository<AgentConversationLease> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentConversationLease, dataSource.manager, transactionRunner);
	}

	private time(offsetMs = 0): string {
		return conversationDbTime(this.manager.connection.options.type === 'postgres', offsetMs);
	}

	async acquire(agentId: string, threadId: string): Promise<AgentConversationLeaseHandle | null> {
		const handle = { agentId, threadId, ownerToken: randomUUID() };
		return await this.runInTransaction({}, async (manager) => {
			const updated = await manager
				.createQueryBuilder()
				.update(AgentConversationLease)
				.set({
					ownerToken: handle.ownerToken,
					expiresAt: () => this.time(CONVERSATION_LEASE_TTL_MS),
				})
				.where({ agentId, threadId })
				.andWhere(`"expiresAt" <= ${this.time()}`)
				.execute();
			if (updated.affected === 1) return handle;

			await manager
				.createQueryBuilder()
				.insert()
				.into(AgentConversationLease)
				.values({ ...handle, expiresAt: () => this.time(CONVERSATION_LEASE_TTL_MS) })
				.orIgnore()
				.execute();
			return (await manager.existsBy(AgentConversationLease, handle)) ? handle : null;
		});
	}

	async assertOwner(handle: AgentConversationLeaseHandle, ctx: OperationContext): Promise<void> {
		const manager = this.managerFor(ctx);
		// The write lock excludes takeover until the caller's protected mutation commits.
		const locked = await manager.update(AgentConversationLease, handle, {
			ownerToken: handle.ownerToken,
		});
		if (locked.affected !== 1) throw new AgentConversationLeaseLostError(handle.threadId);
		const live = await manager
			.createQueryBuilder(AgentConversationLease, 'lease')
			.where(handle)
			.andWhere(`lease.expiresAt > ${this.time()}`)
			.getExists();
		if (!live) throw new AgentConversationLeaseLostError(handle.threadId);
	}

	async renew(handle: AgentConversationLeaseHandle): Promise<boolean> {
		try {
			return await this.runInTransaction({}, async (manager, ctx) => {
				await this.assertOwner(handle, ctx);
				await manager.update(AgentConversationLease, handle, {
					expiresAt: () => this.time(CONVERSATION_LEASE_TTL_MS),
				});
				return true;
			});
		} catch (error) {
			if (error instanceof AgentConversationLeaseLostError) return false;
			throw error;
		}
	}

	async release(handle: AgentConversationLeaseHandle): Promise<boolean> {
		try {
			return await this.runInTransaction({}, async (manager, ctx) => {
				await this.assertOwner(handle, ctx);
				await manager.delete(AgentConversationLease, handle);
				return true;
			});
		} catch (error) {
			if (error instanceof AgentConversationLeaseLostError) return false;
			throw error;
		}
	}

	async isHeld(threadId: string): Promise<boolean> {
		return await this.createQueryBuilder('lease')
			.where({ threadId })
			.andWhere(`lease.expiresAt > ${this.time()}`)
			.getExists();
	}
}
