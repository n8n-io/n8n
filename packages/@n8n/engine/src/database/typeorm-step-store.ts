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

		// Ids are assigned here because the entity's insert hook only runs on class
		// instances, and these are plain values.
		const rows = records.map((record) => ({ ...record, id: generateId() }));

		// `orIgnore` is the unique key doing its job: a node another planner already
		// queued is skipped, leaving the rest of the batch to land. RETURNING emits
		// exactly the rows that were inserted, keyed by database column name.
		const result = await this.repo
			.createQueryBuilder()
			.insert()
			.values(rows)
			.orIgnore()
			.returning(['id', 'nodeId'])
			.execute();

		return (result.raw as Array<{ id: string; node_id: string }>).map(
			({ id, node_id: nodeId }) => ({ id, nodeId }),
		);
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
		// `exists({ where })`, not `existsBy`, for the reason given in `loadStep`.
		return await this.repo.exists({
			where: { executionId, status: In<StepStatus>(['queued', 'running']) },
		});
	}

	async hasFailedSteps(executionId: string): Promise<boolean> {
		return await this.repo.exists({ where: { executionId, status: 'failed' } });
	}
}
