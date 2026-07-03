import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import type { EntityManager } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { UnexpectedError } from 'n8n-workflow';

import { ScheduledTask } from '../entities/scheduled-task';

/**
 * The columns set when the materializer records an occurrence.
 * Everything else (status, attempts, lease/fencing fields) takes its column default.
 */
export interface NewOccurrence {
	jobId: number;
	taskType: string;
	payload: Record<string, unknown>;
	scheduledFor: Date;
	runAt: Date;
	maxAttempts: number;
}

@Service()
export class ScheduledTaskRepository extends Repository<ScheduledTask> {
	constructor(dataSource: DataSource) {
		super(ScheduledTask, dataSource.manager);
	}

	/**
	 * Insert occurrences, skipping any that collide with an existing row on the
	 * unique `(jobId, scheduledFor)` identity (`ON CONFLICT DO NOTHING`).
	 * This is what makes recording the same occurrence twice a no-op instead of a duplicate run.
	 *
	 * Must run inside a transaction!
	 *
	 * @returns how many rows were actually inserted (skipped duplicates excluded)
	 */
	async insertIgnoringDuplicates(
		manager: EntityManager,
		occurrences: NewOccurrence[],
		// Chunked so a large batch stays under the driver's bind-parameter ceiling
		// (Postgres 65535, SQLite 32766); the default leaves headroom for the widest row.
		chunkSize = 1000,
	): Promise<number> {
		const { queryRunner } = manager;
		if (queryRunner === undefined) {
			throw new UnexpectedError('insertIgnoringDuplicates must run within a transaction');
		}

		const chunks = Array.from({ length: Math.ceil(occurrences.length / chunkSize) }, (_, i) =>
			occurrences.slice(i * chunkSize, (i + 1) * chunkSize),
		);

		let recorded = 0;
		for (const chunk of chunks) {
			const [sql, parameters] = manager
				.createQueryBuilder()
				.insert()
				.into(ScheduledTask)
				// `payload` is a free-form JSON column, which TypeORM's QueryDeepPartialEntity
				// can't express, so the well-typed rows are cast at this boundary.
				.values(chunk as Array<QueryDeepPartialEntity<ScheduledTask>>)
				.orIgnore()
				.getQueryAndParameters();
			const result = await queryRunner.query(sql, parameters, true);
			recorded += result.affected ?? 0;
		}
		return recorded;
	}
}
