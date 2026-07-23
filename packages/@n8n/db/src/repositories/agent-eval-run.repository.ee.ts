import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { IDataObject } from 'n8n-workflow';

import { AgentEvalRun } from '../entities';

type CreateAgentEvalRunAttrs = {
	datasetId: string;
	agentVersionId?: string | null;
	createdById?: string | null;
};

@Service()
export class AgentEvalRunRepository extends Repository<AgentEvalRun> {
	constructor(dataSource: DataSource) {
		super(AgentEvalRun, dataSource.manager);
	}

	async createRun(attrs: CreateAgentEvalRunAttrs): Promise<AgentEvalRun> {
		const run = this.create({
			status: 'new',
			datasetId: attrs.datasetId,
			agentVersionId: attrs.agentVersionId ?? null,
			createdById: attrs.createdById ?? null,
			cancelRequested: false,
		});

		return await this.save(run);
	}

	async markAsRunning(id: string, instanceId?: string) {
		return await this.update(id, {
			status: 'running',
			runAt: new Date(),
			runningInstanceId: instanceId ?? null,
		});
	}

	async markAsCompleted(id: string, metrics: IDataObject | null) {
		return await this.update(id, {
			status: 'completed',
			completedAt: new Date(),
			metrics,
			runningInstanceId: null,
		});
	}

	async markAsError(id: string, errorCode: string, errorDetails?: IDataObject | null) {
		return await this.update(id, {
			status: 'error',
			completedAt: new Date(),
			errorCode,
			errorDetails: errorDetails ?? null,
			runningInstanceId: null,
		});
	}

	async markAsCancelled(id: string) {
		return await this.update(id, {
			status: 'cancelled',
			completedAt: new Date(),
			runningInstanceId: null,
		});
	}

	/**
	 * Fallback cancellation signal when the running instance can't be reached
	 * via pub/sub — the running main polls this flag. Mirrors `TestRun`.
	 */
	async requestCancellation(id: string) {
		return await this.update(id, { cancelRequested: true });
	}

	async findByDatasetId(datasetId: string): Promise<AgentEvalRun[]> {
		return await this.find({ where: { datasetId }, order: { createdAt: 'DESC' } });
	}
}
