import type { InstanceAiEvent } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { StoredEvent } from '@n8n/instance-ai';
import { DataSource, MoreThan, Repository } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';

import { InstanceAiEventLogEntry } from '../entities/instance-ai-event-log-entry.entity';

/** A run that has a `run-start` fact but no terminal `run-finish` in the log. */
export interface UnfinishedRun {
	threadId: string;
	runId: string;
}

@Service()
export class InstanceAiEventLogRepository extends Repository<InstanceAiEventLogEntry> {
	constructor(dataSource: DataSource) {
		super(InstanceAiEventLogEntry, dataSource.manager);
	}

	/** Highest seq assigned for a thread, 0 when the log is empty. */
	async maxSeq(threadId: string): Promise<number> {
		const row = await this.createQueryBuilder('e')
			.select('MAX(e.seq)', 'max')
			.where('e.threadId = :threadId', { threadId })
			.getRawOne<{ max: number | null }>();
		return row?.max ?? 0;
	}

	/**
	 * Append a batch of events with contiguous seq values starting at `firstSeq`,
	 * in one transaction. The (threadId, seq) PK makes a concurrent-writer race
	 * fail loudly instead of silently interleaving — the caller re-reads maxSeq
	 * and retries. Returns the serialized payload bytes written (instrumentation).
	 *
	 * INS-844 (compose with the shared-sequence drain): the live-id Redis INCRBY
	 * merges into this call, so id assignment and durable insert become one round trip.
	 */
	async appendBatch(
		threadId: string,
		firstSeq: number,
		events: InstanceAiEvent[],
	): Promise<number> {
		let bytes = 0;
		const rows = events.map((event, i) => {
			const payload = JSON.stringify(event);
			bytes += Buffer.byteLength(payload, 'utf8');
			return {
				threadId,
				seq: firstSeq + i,
				runId: event.runId,
				type: event.type,
				payload,
			};
		});
		await this.insert(rows);
		return bytes;
	}

	/**
	 * Raw payload at an exact (threadId, seq), or null. Used by the writer to
	 * detect whether an append whose response was lost actually committed.
	 */
	async payloadAt(threadId: string, seq: number): Promise<string | null> {
		const row = await this.findOne({ where: { threadId, seq } });
		return row?.payload ?? null;
	}

	async getAfter(threadId: string, afterSeq: number): Promise<StoredEvent[]> {
		const rows = await this.find({
			where: { threadId, seq: MoreThan(afterSeq) },
			order: { seq: 'ASC' },
		});
		return rows.map((r) => ({ id: r.seq, event: this.toEvent(r) }));
	}

	async getForRuns(threadId: string, runIds: string[]): Promise<InstanceAiEvent[]> {
		if (runIds.length === 0) return [];
		const rows = await this.createQueryBuilder('e')
			.where('e.threadId = :threadId', { threadId })
			.andWhere('e.runId IN (:...runIds)', { runIds })
			.orderBy('e.seq', 'ASC')
			.getMany();
		return rows.map((r) => this.toEvent(r));
	}

	/** Every fact of a thread in seq order, with the run and write-time context
	 *  the fold-on-read history derivation needs. */
	async getForThread(
		threadId: string,
	): Promise<Array<{ runId: string; createdAt: Date; event: InstanceAiEvent }>> {
		const rows = await this.find({ where: { threadId }, order: { seq: 'ASC' } });
		return rows.map((r) => ({
			runId: r.runId,
			createdAt: r.createdAt,
			event: this.toEvent(r),
		}));
	}

	/** Timestamp of the run's most recent durable fact (sweep liveness proxy). */
	async lastFactAt(threadId: string, runId: string): Promise<Date | null> {
		const row = await this.createQueryBuilder('e')
			.select('MAX(e.createdAt)', 'max')
			.where('e.threadId = :threadId', { threadId })
			.andWhere('e.runId = :runId', { runId })
			.getRawOne<{ max: string | Date | null }>();
		if (!row?.max) return null;
		return row.max instanceof Date ? row.max : new Date(row.max);
	}

	/**
	 * Interrupted-run sweep source: runs whose log has a `run-start` but no
	 * `run-finish`, as distinct (threadId, runId) pairs. Pure log query —
	 * liveness (is a main still driving it?) is the caller's concern.
	 * Instance-wide for the boot sweep; pass `threadId` to scope a single
	 * thread (cancel-time zombie resolution) to its (threadId, runId) index.
	 */
	async findUnfinishedRuns(threadId?: string): Promise<UnfinishedRun[]> {
		const qb = this.createQueryBuilder('e')
			.select('e.threadId', 'threadId')
			.addSelect('e.runId', 'runId')
			.distinct(true)
			.where("e.type = 'run-start'")
			.andWhere(
				(qb) =>
					'NOT EXISTS ' +
					qb
						.subQuery()
						.select('1')
						.from(InstanceAiEventLogEntry, 'f')
						.where('f.threadId = e.threadId')
						.andWhere('f.runId = e.runId')
						.andWhere("f.type = 'run-finish'")
						.getQuery(),
			);
		if (threadId) qb.andWhere('e.threadId = :threadId', { threadId });
		return await qb.getRawMany<UnfinishedRun>();
	}

	/** Parse a row's event, defaulting the publish timestamp to the row's write
	 *  time for rows that predate the `ts` envelope field (and backfilled rows):
	 *  createdAt ≈ publish time, so replayed tool durations on old threads stay
	 *  honest instead of the reducer falling back to "now" at each fold. */
	private toEvent(row: InstanceAiEventLogEntry): InstanceAiEvent {
		const event = jsonParse<InstanceAiEvent>(row.payload);
		event.ts ??= row.createdAt.getTime();
		return event;
	}
}
