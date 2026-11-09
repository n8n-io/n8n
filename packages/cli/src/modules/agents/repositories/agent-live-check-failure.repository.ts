import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentLiveCheckFailure } from '../entities/agent-live-check-failure.entity';

/** Sessions a published version ran, and when the first one started. */
export interface VersionSessions {
	versionId: string;
	sessions: number;
	firstAt: Date;
	lastAt: Date;
}

/** Sessions of one version where a check failed at least once. */
export interface VersionCheckFailures {
	versionId: string;
	checkId: string;
	sessions: number;
}

function toDate(value: unknown): Date {
	return value instanceof Date ? value : new Date(String(value));
}

@Service()
export class AgentLiveCheckFailureRepository extends Repository<AgentLiveCheckFailure> {
	constructor(dataSource: DataSource) {
		super(AgentLiveCheckFailure, dataSource.manager);
	}

	/** Idempotent: a second save of the same execution and check is ignored. */
	async saveFailures(
		rows: Array<
			Pick<
				AgentLiveCheckFailure,
				'executionId' | 'checkId' | 'agentId' | 'agentVersionId' | 'reason'
			>
		>,
	) {
		if (rows.length === 0) return;
		await this.createQueryBuilder().insert().values(rows).orIgnore().execute();
	}

	async stampVersion(executionId: string, agentVersionId: string) {
		await this.manager.update(AgentExecution, { id: executionId }, { agentVersionId });
	}

	/** Sessions each published version of the agent ran since `since`, newest version first. */
	async sessionsPerVersion(agentId: string, since: Date): Promise<VersionSessions[]> {
		const rows = await this.manager
			.createQueryBuilder(AgentExecution, 'execution')
			.innerJoin('execution.thread', 'thread')
			.select('execution.agentVersionId', 'versionId')
			.addSelect('COUNT(DISTINCT execution.threadId)', 'sessions')
			.addSelect('MIN(execution.createdAt)', 'firstAt')
			.addSelect('MAX(execution.createdAt)', 'lastAt')
			.where('thread.agentId = :agentId', { agentId })
			.andWhere('execution.agentVersionId IS NOT NULL')
			.andWhere('execution.createdAt >= :since', { since })
			.groupBy('execution.agentVersionId')
			.getRawMany<{
				versionId: string;
				sessions: string | number;
				firstAt: unknown;
				lastAt: unknown;
			}>();
		return rows
			.map((row) => ({
				versionId: row.versionId,
				sessions: Number(row.sessions),
				firstAt: toDate(row.firstAt),
				lastAt: toDate(row.lastAt),
			}))
			.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
	}

	/** For each version and check, the sessions where it failed at least once since `since`. */
	async failedSessions(
		agentId: string,
		versionIds: string[],
		since: Date,
	): Promise<VersionCheckFailures[]> {
		if (versionIds.length === 0) return [];
		const rows = await this.createQueryBuilder('failure')
			.innerJoin(AgentExecution, 'execution', 'execution.id = failure.executionId')
			.select('failure.agentVersionId', 'versionId')
			.addSelect('failure.checkId', 'checkId')
			.addSelect('COUNT(DISTINCT execution.threadId)', 'sessions')
			.where('failure.agentId = :agentId', { agentId })
			.andWhere('failure.agentVersionId IN (:...versionIds)', { versionIds })
			.andWhere('failure.createdAt >= :since', { since })
			.groupBy('failure.agentVersionId')
			.addGroupBy('failure.checkId')
			.getRawMany<{ versionId: string; checkId: string; sessions: string | number }>();
		return rows.map((row) => ({ ...row, sessions: Number(row.sessions) }));
	}

	/** The failed checks of these executions, for the Sessions view. */
	async forExecutions(executionIds: string[]): Promise<AgentLiveCheckFailure[]> {
		if (executionIds.length === 0) return [];
		return await this.createQueryBuilder('failure')
			.where('failure.executionId IN (:...executionIds)', { executionIds })
			.getMany();
	}
}
