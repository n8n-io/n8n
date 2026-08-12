import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentHarnessSession } from '../entities/agent-harness-session.entity';

export interface AgentHarnessSessionKey {
	agentId: string;
	threadId: string;
	runtimeIdentity: string;
}

export interface AgentHarnessSessionClaimHandle extends AgentHarnessSessionKey {
	claimToken: string;
	ownershipEpoch: number;
}

export interface AcquireAgentHarnessSessionOptions {
	adapter: string;
	resourceId: string;
	sessionId: string;
	claimToken: string;
	claimTtlMs: number;
	sessionTtlMs: number;
}

@Service()
export class AgentHarnessSessionRepository extends Repository<AgentHarnessSession> {
	constructor(dataSource: DataSource) {
		super(AgentHarnessSession, dataSource.manager);
	}

	async acquire(
		key: AgentHarnessSessionKey,
		options: AcquireAgentHarnessSessionOptions,
	): Promise<AgentHarnessSession | null> {
		const now = new Date();
		const claimExpiresAt = new Date(now.getTime() + options.claimTtlMs);
		const expiresAt = new Date(now.getTime() + options.sessionTtlMs);
		await this.createQueryBuilder()
			.delete()
			.from(AgentHarnessSession)
			.where('"agentId" = :agentId', { agentId: key.agentId })
			.andWhere('"threadId" = :threadId', { threadId: key.threadId })
			.andWhere('"runtimeIdentity" = :runtimeIdentity', {
				runtimeIdentity: key.runtimeIdentity,
			})
			.andWhere('"expiresAt" <= :now', { now })
			.andWhere('("status" = :idle OR "claimExpiresAt" <= :now)', { idle: 'idle', now })
			.execute();

		const updated = await this.createQueryBuilder()
			.update(AgentHarnessSession)
			.set({
				status: 'claimed',
				claimToken: options.claimToken,
				claimExpiresAt,
				expiresAt,
				resourceId: options.resourceId,
				ownershipEpoch: () => '"ownershipEpoch" + 1',
			})
			.where('"agentId" = :agentId', { agentId: key.agentId })
			.andWhere('"threadId" = :threadId', { threadId: key.threadId })
			.andWhere('"runtimeIdentity" = :runtimeIdentity', {
				runtimeIdentity: key.runtimeIdentity,
			})
			.andWhere('"adapter" = :adapter', { adapter: options.adapter })
			.andWhere('("status" = :idle OR "claimExpiresAt" <= :now)', { idle: 'idle', now })
			.execute();

		if ((updated.affected ?? 0) === 0) {
			await this.createQueryBuilder()
				.insert()
				.into(AgentHarnessSession)
				.values({
					...key,
					adapter: options.adapter,
					resourceId: options.resourceId,
					sessionId: options.sessionId,
					state: null,
					status: 'claimed',
					ownershipEpoch: 1,
					claimToken: options.claimToken,
					claimExpiresAt,
					lastUsedAt: now,
					expiresAt,
				})
				.orIgnore()
				.execute();
		}

		return await this.findOneBy({ ...key, claimToken: options.claimToken, status: 'claimed' });
	}

	async renew(handle: AgentHarnessSessionClaimHandle, claimTtlMs: number): Promise<boolean> {
		const result = await this.update(
			{ ...handle, status: 'claimed' },
			{ claimExpiresAt: new Date(Date.now() + claimTtlMs) },
		);
		return (result.affected ?? 0) > 0;
	}

	async saveClaimedState(
		handle: AgentHarnessSessionClaimHandle,
		state: { sessionId: string; serializedState: string | null },
		sessionTtlMs: number,
	): Promise<boolean> {
		const now = new Date();
		const result = await this.update(
			{ ...handle, status: 'claimed' },
			{
				sessionId: state.sessionId,
				state: state.serializedState,
				lastUsedAt: now,
				expiresAt: new Date(now.getTime() + sessionTtlMs),
			},
		);
		return (result.affected ?? 0) > 0;
	}

	async deleteClaimed(handle: AgentHarnessSessionClaimHandle): Promise<boolean> {
		const result = await this.delete({ ...handle, status: 'claimed' });
		return (result.affected ?? 0) > 0;
	}

	async release(handle: AgentHarnessSessionClaimHandle): Promise<boolean> {
		const result = await this.update(
			{ ...handle, status: 'claimed' },
			{ status: 'idle', claimToken: null, claimExpiresAt: null },
		);
		return (result.affected ?? 0) > 0;
	}

	async deleteByAgentAndThread(agentId: string, threadId: string): Promise<void> {
		await this.delete({ agentId, threadId });
	}

	async deleteByAgentAndThreadPrefix(agentId: string, threadIdPrefix: string): Promise<void> {
		await this.createQueryBuilder()
			.delete()
			.from(AgentHarnessSession)
			.where('"agentId" = :agentId', { agentId })
			.andWhere('"threadId" LIKE :threadIdPrefix', {
				threadIdPrefix: `${threadIdPrefix}%`,
			})
			.execute();
	}
}
