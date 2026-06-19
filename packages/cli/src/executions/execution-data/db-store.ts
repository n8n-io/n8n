import { ExecutionData, ExecutionDataRepository, In } from '@n8n/db';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';

import { EXECUTION_DATA_BUNDLE_VERSION } from './constants';
import { MissingExecutionDataError } from './missing-execution-data.error';
import type {
	ExecutionDataStore,
	ExecutionRef,
	ExecutionDataPayload,
	ExecutionDataBundle,
} from './types';

// Max number of ids per IN-clause. Conservative, as some databases cap near 1000.
const MAX_READ_BATCH_SIZE = 900;

@Service()
export class DbStore implements ExecutionDataStore {
	constructor(private readonly repository: ExecutionDataRepository) {}

	async write(
		{ executionId }: ExecutionRef,
		payload: ExecutionDataPayload,
		tx?: EntityManager,
	): Promise<number> {
		const repo = this.getRepository(tx);
		await repo.upsert({ ...payload, executionId }, ['executionId']);
		return this.measureBundleBytes(payload);
	}

	/**
	 * Overwrite an existing bundle's data and workflow snapshot in place, returning its byte size.
	 * Unlike {@link write} (an upsert), the row must already exist - a missing row means the
	 * execution's data was lost, which we surface rather than silently recreate.
	 */
	async overwrite(
		ref: ExecutionRef,
		payload: ExecutionDataPayload,
		tx?: EntityManager,
	): Promise<number> {
		const repo = this.getRepository(tx);
		const result = await repo.update(
			{ executionId: ref.executionId },
			{ data: payload.data, workflowData: payload.workflowData },
		);
		if ((result.affected ?? 0) === 0) throw new MissingExecutionDataError(ref);
		return this.measureBundleBytes(payload);
	}

	/**
	 * Byte size of a bundle as stored in the DB: the run data string, the JSON-serialized workflow
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
	): Promise<ExecutionDataBundle | null> {
		const repo = this.getRepository(tx);
		const result = await repo.findOne({
			where: { executionId },
			select: ['data', 'workflowData', 'workflowVersionId'],
		});

		if (!result) return null;

		return { ...result, version: EXECUTION_DATA_BUNDLE_VERSION };
	}

	async readWorkflowData({ executionId }: ExecutionRef, tx?: EntityManager) {
		const repo = this.getRepository(tx);
		const result = await repo.findOne({
			where: { executionId },
			select: ['workflowData', 'workflowVersionId'],
		});

		if (!result) return null;

		return { workflowData: result.workflowData, workflowVersionId: result.workflowVersionId };
	}

	async getDataByteSize({ executionId }: ExecutionRef, tx?: EntityManager): Promise<number | null> {
		const repo = this.getRepository(tx);
		// LENGTH() avoids loading the column into memory. It counts characters, not bytes, but the
		// data is a near-ASCII flatted string, so it's close enough to guard on.
		const row = await repo
			.createQueryBuilder('d')
			.select('LENGTH(d.data)', 'size')
			.where('d.executionId = :executionId', { executionId })
			.getRawOne<{ size: number | string | null }>();

		if (!row || row.size === null) return null;

		return Number(row.size);
	}

	async readMany(refs: ExecutionRef[]) {
		const bundles = new Map<string, ExecutionDataBundle>();
		if (refs.length === 0) return bundles;

		const ids = refs.map((r) => r.executionId);

		// Batch the IN-clause so an unbounded set of ids cannot exceed the DB's
		// limit on bound parameters (SQLite caps near 1000).
		for (const batch of chunk(ids, MAX_READ_BATCH_SIZE)) {
			const rows = await this.repository.find({
				where: { executionId: In(batch) },
				select: ['executionId', 'data', 'workflowData', 'workflowVersionId'],
			});

			for (const row of rows) {
				bundles.set(row.executionId, {
					data: row.data,
					workflowData: row.workflowData,
					workflowVersionId: row.workflowVersionId,
					version: EXECUTION_DATA_BUNDLE_VERSION,
				});
			}
		}

		return bundles;
	}

	async delete(ref: ExecutionRef | ExecutionRef[]) {
		const ids = (Array.isArray(ref) ? ref : [ref]).map((r) => r.executionId);

		await this.repository.deleteMany(ids);
	}

	private getRepository(tx?: EntityManager) {
		return tx ? tx.getRepository(ExecutionData) : this.repository;
	}
}
