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
	 * When #33558 lands, its per-thread drain calls this instead of Redis
	 * INCRBY — id assignment and durable insert collapse into one round trip.
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

	async getAfter(threadId: string, afterSeq: number): Promise<StoredEvent[]> {
		const rows = await this.find({
			where: { threadId, seq: MoreThan(afterSeq) },
			order: { seq: 'ASC' },
		});
		return rows.map((r) => ({ id: r.seq, event: jsonParse<InstanceAiEvent>(r.payload) }));
	}

	async getForRuns(threadId: string, runIds: string[]): Promise<InstanceAiEvent[]> {
		if (runIds.length === 0) return [];
		const rows = await this.createQueryBuilder('e')
			.where('e.threadId = :threadId', { threadId })
			.andWhere('e.runId IN (:...runIds)', { runIds })
			.orderBy('e.seq', 'ASC')
			.getMany();
		return rows.map((r) => jsonParse<InstanceAiEvent>(r.payload));
	}

	/** All events of a thread with their run + timing metadata, seq order. */
	async getForThread(
		threadId: string,
	): Promise<Array<{ runId: string; createdAt: Date; event: InstanceAiEvent }>> {
		const rows = await this.find({ where: { threadId }, order: { seq: 'ASC' } });
		return rows.map((r) => ({
			runId: r.runId,
			createdAt: r.createdAt,
			event: jsonParse<InstanceAiEvent>(r.payload),
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
	 * Resolve the LangSmith root-run anchor for a responseId (UI sends
	 * `messageGroupId ?? runId`). The ids ride on the run-start fact; prefer the
	 * earliest run-start in the message group so feedback attaches to the
	 * `message_turn` root run, falling back to the run whose id matches.
	 */
	async findLangsmithAnchor(
		threadId: string,
		responseId: string,
	): Promise<{ langsmithRunId: string; langsmithTraceId: string } | undefined> {
		const rows = await this.createQueryBuilder('e')
			.where('e.threadId = :threadId', { threadId })
			.andWhere("e.type = 'run-start'")
			.orderBy('e.seq', 'ASC')
			.getMany();
		const starts = rows.map((r) => jsonParse<InstanceAiEvent>(r.payload));
		const byGroup = starts.find(
			(e) => e.type === 'run-start' && e.payload.messageGroupId === responseId,
		);
		const anchor = byGroup ?? starts.find((e) => e.runId === responseId);
		if (anchor?.type !== 'run-start') return undefined;
		const { langsmithRunId, langsmithTraceId } = anchor.payload;
		if (!langsmithRunId || !langsmithTraceId) return undefined;
		return { langsmithRunId, langsmithTraceId };
	}

	/**
	 * Interrupted-run sweep source: runs whose log has a `run-start` but no
	 * `run-finish`. Pure log query — liveness (is a main still driving it?) is
	 * the caller's concern.
	 */
	async findUnfinishedRuns(): Promise<UnfinishedRun[]> {
		const rows = await this.createQueryBuilder('e')
			.select('e.threadId', 'threadId')
			.addSelect('e.runId', 'runId')
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
			)
			.getRawMany<UnfinishedRun>();
		return rows;
	}
}
