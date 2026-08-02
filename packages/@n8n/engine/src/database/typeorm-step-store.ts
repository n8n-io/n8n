import { In, type Repository } from '@n8n/typeorm';

import type { WorkflowStepExecution } from './entities';
import { generateId } from './generate-id';
import type { JsonValue } from '../common';
import type { StepStatus } from '../execution/execution.types';
import {
	StepNotFoundError,
	type NewStepRecord,
	type StepError,
	type StepRecord,
	type StepStore,
} from '../execution/step-store';

/** TypeORM-backed `StepStore` adapter. */
export class TypeOrmStepStore implements StepStore {
	constructor(private readonly repo: Repository<WorkflowStepExecution>) {}

	async createSteps(records: NewStepRecord[]): Promise<Array<{ id: string; nodeId: string }>> {
		if (records.length === 0) return [];

		// Ids are assigned here, not by the entity's insert hook, so the rows that
		// survived the insert can be picked out of what RETURNING gives back.
		const rows = records.map((record) => ({ ...record, id: generateId() }));

		// `orIgnore` is the unique key doing its job: a node another planner already
		// queued is skipped, leaving the rest of the batch to land.
		const result = await this.repo
			.createQueryBuilder()
			.insert()
			// Copies, because TypeORM writes the RETURNING values back onto whatever
			// it is given — which would overwrite the ids we are about to match on.
			.values(rows.map((row) => ({ ...row })))
			.orIgnore()
			.returning(['id'])
			.execute();

		// `raw` is the driver's untyped result; RETURNING was asked for `id` alone.
		const inserted = new Set((result.raw as Array<{ id: string }>).map(({ id }) => id));

		return rows.filter(({ id }) => inserted.has(id)).map(({ id, nodeId }) => ({ id, nodeId }));
	}

	async loadStep(id: string): Promise<StepRecord> {
		// NOTE: `findOne({ where })`, not `findOneBy`: the latter's overload exceeds
		// TypeScript's instantiation depth on the recursive `outputs` column type.
		const row = await this.repo.findOne({ where: { id } });
		if (!row) throw new StepNotFoundError(id);
		return row;
	}

	async claimStep(id: string): Promise<boolean> {
		return await this.transition(id, 'queued', 'running');
	}

	async completeStep(id: string, outputs: JsonValue): Promise<boolean> {
		return await this.transition(id, 'running', 'completed', { outputs });
	}

	async failStep(id: string, error: StepError): Promise<boolean> {
		return await this.transition(id, 'running', 'failed', { error });
	}

	/**
	 * Compare-and-set on `status`, writing any result columns in the same
	 * statement so a step's status and its outcome can't be observed apart.
	 */
	private async transition(
		id: string,
		from: StepStatus,
		to: StepStatus,
		fields: { outputs?: JsonValue; error?: StepError } = {},
	): Promise<boolean> {
		const result = await this.repo.update({ id, status: from }, { ...fields, status: to });
		return result.affected === 1;
	}

	async loadStepOutputs(
		executionId: string,
		nodeIds: string[],
	): Promise<Record<string, JsonValue | null>> {
		const outputsByNodeId: Record<string, JsonValue | null> = {};
		for (const nodeId of nodeIds) outputsByNodeId[nodeId] = null;
		if (nodeIds.length === 0) return outputsByNodeId;

		// Filter on `completed` rather than relying on non-completed rows having a
		// null `outputs` column, so the contract holds however writes are ordered.
		const rows = await this.repo.find({
			where: { executionId, nodeId: In(nodeIds), status: 'completed' },
			select: ['nodeId', 'outputs'],
		});
		for (const row of rows) outputsByNodeId[row.nodeId] = row.outputs;

		return outputsByNodeId;
	}

	async loadCompletedNodeIds(executionId: string, nodeIds: string[]): Promise<Set<string>> {
		if (nodeIds.length === 0) return new Set();

		const rows = await this.repo.find({
			where: { executionId, nodeId: In(nodeIds), status: 'completed' },
			select: ['nodeId'],
		});

		return new Set(rows.map((row) => row.nodeId));
	}

	async hasActiveSteps(executionId: string): Promise<boolean> {
		// `count({ where })`, not `countBy`, for the reason given in `loadStep`.
		const active = await this.repo.count({
			where: { executionId, status: In<StepStatus>(['queued', 'running']) },
		});
		return active > 0;
	}

	async hasFailedSteps(executionId: string): Promise<boolean> {
		const failed = await this.repo.count({ where: { executionId, status: 'failed' } });
		return failed > 0;
	}
}
