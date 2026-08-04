import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';

import { AgentExecutionTimelineJournalEntry } from '../entities/agent-execution-timeline-journal-entry.entity';
import type { TimelineEvent } from '../execution-recorder';

@Service()
export class AgentExecutionTimelineJournalRepository extends Repository<AgentExecutionTimelineJournalEntry> {
	constructor(dataSource: DataSource) {
		super(AgentExecutionTimelineJournalEntry, dataSource.manager);
	}

	async maxSeq(executionId: string): Promise<number> {
		const row = await this.createQueryBuilder('entry')
			.select('MAX(entry.seq)', 'max')
			.where('entry.executionId = :executionId', { executionId })
			.getRawOne<{ max: number | null }>();
		return row?.max ?? 0;
	}

	async appendBatch(executionId: string, firstSeq: number, events: TimelineEvent[]): Promise<void> {
		await this.insert(
			events.map((event, index) => ({
				executionId,
				seq: firstSeq + index,
				event: JSON.stringify(event),
			})),
		);
	}

	async payloadAt(executionId: string, seq: number): Promise<string | null> {
		const row = await this.findOne({ select: { event: true }, where: { executionId, seq } });
		return row?.event ?? null;
	}

	async getForExecutions(executionIds: string[]): Promise<Map<string, TimelineEvent[]>> {
		if (executionIds.length === 0) return new Map();
		const rows = await this.find({
			where: { executionId: In(executionIds) },
			order: { executionId: 'ASC', seq: 'ASC' },
		});
		const timelines = new Map<string, TimelineEvent[]>();
		for (const row of rows) {
			const events = timelines.get(row.executionId) ?? [];
			events.push(jsonParse<TimelineEvent>(row.event));
			timelines.set(row.executionId, events);
		}
		return timelines;
	}

	async lastActivityAt(executionId: string): Promise<Date | null> {
		const row = await this.createQueryBuilder('entry')
			.select('MAX(entry.createdAt)', 'max')
			.where('entry.executionId = :executionId', { executionId })
			.getRawOne<{ max: Date | string | null }>();
		if (!row?.max) return null;
		return row.max instanceof Date ? row.max : new Date(row.max);
	}

	async deleteByExecutionId(executionId: string): Promise<void> {
		await this.delete({ executionId });
	}
}
