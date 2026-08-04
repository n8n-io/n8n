import { In, type Repository } from '@n8n/typeorm';

import type { WorkflowStepExecution } from './entities';
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

	async createSteps(records: NewStepRecord[]): Promise<Array<{ id: string }>> {
		const steps = records.map((record) => this.repo.create(record));
		// NOTE: prefer insert to save for performance reasons.
		await this.repo.insert(steps);
		return steps.map(({ id }) => ({ id }));
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
}
