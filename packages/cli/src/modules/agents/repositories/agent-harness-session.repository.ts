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

export type AgentHarnessSessionCleanupRecord = Pick<
	AgentHarnessSession,
	'agentId' | 'threadId' | 'runtimeIdentity' | 'adapter' | 'sessionId'
>;

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

	async findForCleanupByAgentAndThread(
		agentId: string,
		threadId: string,
	): Promise<AgentHarnessSessionCleanupRecord[]> {
		return await this.find({
			select: {
				agentId: true,
				threadId: true,
				runtimeIdentity: true,
				adapter: true,
				sessionId: true,
			},
			where: { agentId, threadId },
		});
	}

	async findForCleanupByAgentAndThreadPrefix(
		agentId: string,
		threadIdPrefix: string,
	): Promise<AgentHarnessSessionCleanupRecord[]> {
		return await this.createQueryBuilder('session')
			.select([
				'session.agentId',
				'session.threadId',
				'session.runtimeIdentity',
				'session.adapter',
				'session.sessionId',
			])
			.where('session.agentId = :agentId', { agentId })
			.andWhere('session.threadId LIKE :threadIdPrefix', {
				threadIdPrefix: `${threadIdPrefix}%`,
			})
			.getMany();
	}

	async findForCleanupByAgent(agentId: string): Promise<AgentHarnessSessionCleanupRecord[]> {
		return await this.find({
			select: {
				agentId: true,
				threadId: true,
				runtimeIdentity: true,
				adapter: true,
				sessionId: true,
			},
			where: { agentId },
		});
	}

	async findSupersededForCleanup(
		agentId: string,
		threadId: string,
		runtimeIdentity: string,
	): Promise<AgentHarnessSessionCleanupRecord[]> {
		return await this.createQueryBuilder('session')
			.select([
				'session.agentId',
				'session.threadId',
				'session.runtimeIdentity',
				'session.adapter',
				'session.sessionId',
			])
			.where('session.agentId = :agentId', { agentId })
			.andWhere('session.threadId = :threadId', { threadId })
			.andWhere('session.runtimeIdentity != :runtimeIdentity', { runtimeIdentity })
			.getMany();
	}

	async findExpiredForCleanup(
		agentId: string,
		threadId: string,
		runtimeIdentity: string,
	): Promise<AgentHarnessSessionCleanupRecord[]> {
		const now = new Date();
		return await this.createQueryBuilder('session')
			.select([
				'session.agentId',
				'session.threadId',
				'session.runtimeIdentity',
				'session.adapter',
				'session.sessionId',
			])
			.where('session.agentId = :agentId', { agentId })
			.andWhere('session.threadId = :threadId', { threadId })
			.andWhere('session.runtimeIdentity = :runtimeIdentity', { runtimeIdentity })
			.andWhere('session.expiresAt <= :now', { now })
			.andWhere('(session.status = :idle OR session.claimExpiresAt <= :now)', {
				idle: 'idle',
				now,
			})
			.getMany();
	}

	async deleteCleanupRecord(record: AgentHarnessSessionCleanupRecord): Promise<boolean> {
		const result = await this.delete({
			agentId: record.agentId,
			threadId: record.threadId,
			runtimeIdentity: record.runtimeIdentity,
			sessionId: record.sessionId,
		});
		return (result.affected ?? 0) > 0;
	}
}
