import { ExecutionData, ExecutionDataRepository, In } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';

import { MissingExecutionDataError } from './missing-execution-data.error';
import type { ExecutionRef, ExecutionDataPayload, BundleWorkflowSnapshot } from './types';

// Max number of ids per IN-clause. Conservative, as some databases cap near 1000.
const MAX_READ_BATCH_SIZE = 900;

@Service()
export class DbStore {
	constructor(private readonly repository: ExecutionDataRepository) {}

	async write(
		{ executionId }: ExecutionRef,
		payload: ExecutionDataPayload,
		tx: EntityManager,
	): Promise<number> {
		const repo = tx.getRepository(ExecutionData);
		await repo.upsert({ ...payload, executionId }, ['executionId']);
		return this.measureBundleBytes(payload);
	}

	/**
	 * Overwrite an existing row's data and workflow snapshot in place, returning its byte size.
	 * Unlike {@link write} (an upsert), the row must already exist - a missing row means the
	 * execution's data was lost, which we surface rather than silently recreate. The
	 * `workflowVersionId` column is left untouched.
	 */
	async overwrite(
		ref: ExecutionRef,
		payload: ExecutionDataPayload,
		tx: EntityManager,
	): Promise<number> {
		const repo = tx.getRepository(ExecutionData);
		const result = await repo.update(
			{ executionId: ref.executionId },
			{ data: payload.data, workflowData: payload.workflowData },
		);
		if ((result.affected ?? 0) === 0) throw new MissingExecutionDataError(ref);
		return this.measureBundleBytes(payload);
	}

	/**
	 * Byte size of a payload as stored in the DB: the run data string, the JSON-serialized workflow
	 * snapshot, and the version id.
	 */
	private measureBundleBytes(payload: ExecutionDataPayload): number {
		return (
			Buffer.byteLength(payload.data, 'utf8') +
			Buffer.byteLength(JSON.stringify(payload.workflowData), 'utf8') +
			Buffer.byteLength(payload.workflowVersionId ?? '', 'utf8')
		);
	}

	async read(
		{ executionId }: ExecutionRef,
		tx?: EntityManager,
	): Promise<ExecutionDataPayload | null> {
		const repo = tx ? tx.getRepository(ExecutionData) : this.repository;
		const result = await repo.findOne({
			where: { executionId },
			select: ['data', 'workflowData', 'workflowVersionId'],
		});

		return result;
	}

	async readWorkflowData({ executionId }: ExecutionRef): Promise<BundleWorkflowSnapshot | null> {
		const result = await this.repository.findOne({
			where: { executionId },
			select: ['workflowData', 'workflowVersionId'],
		});

		if (!result) return null;

		return { workflowData: result.workflowData, workflowVersionId: result.workflowVersionId };
	}

	async getDataByteSize({ executionId }: ExecutionRef): Promise<number | null> {
		// LENGTH() avoids loading the column into memory. It counts characters, not bytes, but the
		// data is a near-ASCII flatted string, so it's close enough to guard on.
		const row = await this.repository
			.createQueryBuilder('d')
			.select('LENGTH(d.data)', 'size')
			.where('d.executionId = :executionId', { executionId })
			.getRawOne<{ size: number | string | null }>();

		if (!row || row.size === null) return null;

		return Number(row.size);
	}

	async readMany(refs: ExecutionRef[]) {
		const payloads = new Map<string, ExecutionDataPayload>();
		if (refs.length === 0) return payloads;

		const ids = refs.map((r) => r.executionId);

		// Batch the IN-clause so an unbounded set of ids cannot exceed the DB's
		// limit on bound parameters (SQLite caps near 1000).
		for (const batch of chunk(ids, MAX_READ_BATCH_SIZE)) {
			const rows = await this.repository.find({
				where: { executionId: In(batch) },
				select: ['executionId', 'data', 'workflowData', 'workflowVersionId'],
			});

			for (const row of rows) {
				payloads.set(row.executionId, {
					data: row.data,
					workflowData: row.workflowData,
					workflowVersionId: row.workflowVersionId,
				});
			}
		}

		return payloads;
	}
}
