import { Service } from '@n8n/di';
import type { InstanceAiEvent } from '@n8n/api-types';
import { DataSource, Repository } from '@n8n/typeorm';
import type { StoredEvent } from '@n8n/instance-ai';

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
	 * and retries.
	 *
	 * SKETCH: when #33558 lands, its per-thread drain calls this instead of
	 * Redis INCRBY — id assignment and durable insert collapse into one round trip.
	 */
	async appendBatch(threadId: string, firstSeq: number, events: InstanceAiEvent[]): Promise<void> {
		const rows = events.map((event, i) =>
			this.create({
				threadId,
				seq: firstSeq + i,
				runId: event.runId,
				type: event.type,
				payload: JSON.stringify(event),
			}),
		);
		await this.insert(rows);
	}

	async getAfter(threadId: string, afterSeq: number): Promise<StoredEvent[]> {
		const rows = await this.find({
			where: { threadId },
			order: { seq: 'ASC' },
		});
		// SKETCH: move the cursor filter into SQL (seq > :afterSeq) — kept in JS
		// here only to reuse the parse step below.
		return rows
			.filter((r) => r.seq > afterSeq)
			.map((r) => ({ id: r.seq, event: JSON.parse(r.payload) as InstanceAiEvent }));
	}

	async getForRuns(threadId: string, runIds: string[]): Promise<InstanceAiEvent[]> {
		if (runIds.length === 0) return [];
		const rows = await this.createQueryBuilder('e')
			.where('e.threadId = :threadId', { threadId })
			.andWhere('e.runId IN (:...runIds)', { runIds })
			.orderBy('e.seq', 'ASC')
			.getMany();
		return rows.map((r) => JSON.parse(r.payload) as InstanceAiEvent);
	}
}
