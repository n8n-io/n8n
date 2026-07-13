import type { InstanceAiEvent } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { StoredEvent } from '@n8n/instance-ai';
import { DataSource, MoreThan, Repository } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';

import { InstanceAiEventLogEntry } from '../entities/instance-ai-event-log-entry.entity';

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
}
