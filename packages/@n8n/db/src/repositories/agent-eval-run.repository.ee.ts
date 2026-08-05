import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
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

	/**
	 * `metrics` is optional: a run failing before any case ran has none, but one
	 * failing partway keeps its counts where the other statuses put them.
	 */
	async markAsError(
		id: string,
		errorCode: string,
		errorDetails?: IDataObject | null,
		metrics?: IDataObject | null,
	) {
		return await this.update(id, {
			status: 'error',
			completedAt: new Date(),
			errorCode,
			errorDetails: errorDetails ?? null,
			metrics: metrics ?? null,
			runningInstanceId: null,
		});
	}

	async markAsCancelled(id: string, metrics: IDataObject | null = null) {
		return await this.update(id, {
			status: 'cancelled',
			completedAt: new Date(),
			metrics,
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

	async findById(id: string): Promise<AgentEvalRun | null> {
		return await this.findOneBy({ id });
	}

	// A run has no agent column — the agent under test is its dataset's — so the
	// ownership check walks the relation instead of trusting a bare run id.
	async findByIdAndAgentId(id: string, agentId: string): Promise<AgentEvalRun | null> {
		return await this.findOne({ where: { id, dataset: { agentId } } });
	}

	/**
	 * One page of a dataset's runs, newest first, scoped to its agent. The `id`
	 * tiebreak is what keeps equal-`createdAt` rows from landing on two pages or
	 * none — ids are random nanoids, so it orders nothing, it just stays stable.
	 */
	async findAndCountByDatasetIdAndAgentId(
		datasetId: string,
		agentId: string,
		options: { skip?: number; take?: number } = {},
	): Promise<[AgentEvalRun[], number]> {
		return await this.findAndCount({
			where: { datasetId, dataset: { agentId } },
			order: { createdAt: 'DESC', id: 'DESC' },
			skip: options.skip,
			take: options.take,
		});
	}

	/**
	 * Mark every run still in an incomplete state as errored. Called on startup:
	 * the runner has no resume mechanism, so a run interrupted by a process
	 * restart can never continue and would otherwise poll as `running` forever.
	 * Blanket sweep, mirroring the workflow eval's `markAllIncompleteAsFailed`.
	 */
	async markAllIncompleteAsError() {
		return await this.update(
			{ status: In(['new', 'running']) },
			{
				status: 'error',
				errorCode: 'interrupted',
				completedAt: new Date(),
				runningInstanceId: null,
			},
		);
	}

	/** Lightweight read of just the cross-main cancellation flag for a run. */
	async isCancellationRequested(id: string): Promise<boolean> {
		const run = await this.findOne({ where: { id }, select: ['id', 'cancelRequested'] });
		return run?.cancelRequested ?? false;
	}
}
