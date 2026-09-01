import { Service } from '@n8n/di';
import { DataSource, In, LessThan, Not, Repository } from '@n8n/typeorm';

import {
	AgentBackgroundJob,
	type AgentBackgroundJobKind,
	type AgentBackgroundJobStatus,
} from '../entities/agent-background-job.entity';

type NewAgentBackgroundJobBase = {
	id: string;
	parentAgentId: string;
	parentThreadId: string;
	title: string;
};

export type NewSubAgentJob = NewAgentBackgroundJobBase & {
	kind: 'subagent';
	subAgentId: string;
	childThreadId: string;
	timeoutAt: Date;
};

export type NewWorkflowJob = NewAgentBackgroundJobBase & {
	kind: 'workflow';
	workflowId: string;
	childExecutionId: string;
};

export type NewAgentBackgroundJob = NewSubAgentJob | NewWorkflowJob;

export type AgentBackgroundJobSettlement = {
	status: Exclude<AgentBackgroundJobStatus, 'running'>;
	result?: string | null;
	error?: string | null;
};

@Service()
export class AgentBackgroundJobRepository extends Repository<AgentBackgroundJob> {
	constructor(dataSource: DataSource) {
		super(AgentBackgroundJob, dataSource.manager);
	}

	async insertJob(job: NewAgentBackgroundJob): Promise<void> {
		await this.insert({ ...job, status: 'running' });
	}

	async countRunningByParentThread(parentThreadId: string): Promise<number> {
		return await this.count({ where: { parentThreadId, status: 'running' } });
	}

	async findByParentThread(parentThreadId: string, ids?: string[]): Promise<AgentBackgroundJob[]> {
		return await this.find({
			where: ids?.length ? { parentThreadId, id: In(ids) } : { parentThreadId },
			order: { createdAt: 'ASC' },
		});
	}

	async findRunningWorkflowJobByExecutionId(
		executionId: string,
	): Promise<AgentBackgroundJob | null> {
		return await this.findOne({
			where: { kind: 'workflow', status: 'running', childExecutionId: executionId },
		});
	}

	async findRunningJobs(kind?: AgentBackgroundJobKind): Promise<AgentBackgroundJob[]> {
		return await this.find({ where: kind ? { status: 'running', kind } : { status: 'running' } });
	}

	/** Running jobs whose timeout has passed — reconciliation fails these. */
	async findRunningPastTimeout(now: Date): Promise<AgentBackgroundJob[]> {
		return await this.find({ where: { status: 'running', timeoutAt: LessThan(now) } });
	}

	/**
	 * Settle the job iff it is still running. Every writer that ends a job —
	 * child settle, cancel, timeout, sweeper reconciliation — funnels through
	 * this guarded update, so the first writer wins and the rest are no-ops.
	 */
	async settleIfRunning(id: string, settlement: AgentBackgroundJobSettlement): Promise<boolean> {
		const result = await this.update(
			{ id, status: 'running' },
			{
				status: settlement.status,
				result: settlement.result ?? null,
				error: settlement.error ?? null,
				settledAt: new Date(),
			},
		);
		return result.affected === 1;
	}

	/** Retention: drop settled rows past the cutoff. */
	async deleteSettledBefore(cutoff: Date): Promise<void> {
		await this.delete({ status: Not('running'), settledAt: LessThan(cutoff) });
	}
}
