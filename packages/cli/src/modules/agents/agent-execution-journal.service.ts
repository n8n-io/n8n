import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import type { TimelineEvent } from './execution-recorder';
import { AgentExecutionTimelineJournalRepository } from './repositories/agent-execution-timeline-journal.repository';

const APPEND_ATTEMPTS = 4;
const APPEND_RETRY_DELAY_MS = 1_000;

@Service()
export class AgentExecutionJournalService {
	private readonly pending = new Map<string, TimelineEvent[]>();

	private readonly draining = new Map<string, Promise<void>>();

	private readonly liveExecutions = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly repository: AgentExecutionTimelineJournalRepository,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = this.logger.scoped('agents');
	}

	publish(executionId: string, event: TimelineEvent): void {
		try {
			const events = this.pending.get(executionId) ?? [];
			events.push(structuredClone(event));
			this.pending.set(executionId, events);
			this.ensureDraining(executionId);
		} catch (error) {
			this.logger.error('Failed to enqueue an agent execution timeline event', {
				executionId,
				error,
			});
			this.errorReporter.error(error);
		}
	}

	async flush(executionId: string): Promise<void> {
		while (this.pending.has(executionId) || this.draining.has(executionId)) {
			this.ensureDraining(executionId);
			await this.draining.get(executionId);
		}
	}

	async getTimeline(executionId: string): Promise<TimelineEvent[]> {
		return (await this.getTimelines([executionId])).get(executionId) ?? [];
	}

	async getTimelines(executionIds: string[]): Promise<Map<string, TimelineEvent[]>> {
		const eventsByExecution = await this.repository.getForExecutions(executionIds);
		return new Map(
			[...eventsByExecution.entries()].map(([executionId, events]) => [
				executionId,
				foldTimelineEvents(events),
			]),
		);
	}

	async lastActivityAt(executionId: string): Promise<Date | null> {
		return await this.repository.lastActivityAt(executionId);
	}

	async delete(executionId: string): Promise<void> {
		await this.repository.deleteByExecutionId(executionId);
		this.clear(executionId);
	}

	registerLive(executionId: string): void {
		this.liveExecutions.add(executionId);
	}

	unregisterLive(executionId: string): void {
		this.liveExecutions.delete(executionId);
	}

	isLive(executionId: string): boolean {
		return this.liveExecutions.has(executionId);
	}

	clear(executionId: string): void {
		this.pending.delete(executionId);
		this.liveExecutions.delete(executionId);
	}

	private ensureDraining(executionId: string): void {
		if (this.draining.has(executionId) || !this.pending.has(executionId)) return;
		const drain = this.drain(executionId).finally(() => this.draining.delete(executionId));
		this.draining.set(executionId, drain);
	}

	private async drain(executionId: string): Promise<void> {
		while (true) {
			const events = this.pending.get(executionId);
			if (!events?.length) {
				this.pending.delete(executionId);
				return;
			}
			this.pending.delete(executionId);
			while (true) {
				try {
					await this.appendWithRetry(executionId, events);
					break;
				} catch (error) {
					this.logger.error('Failed to append agent execution timeline events; retrying', {
						executionId,
						eventCount: events.length,
						error,
					});
					this.errorReporter.error(error);
					await new Promise((resolve) => setTimeout(resolve, APPEND_RETRY_DELAY_MS));
				}
			}
		}
	}

	private async appendWithRetry(executionId: string, events: TimelineEvent[]): Promise<void> {
		let lastError: unknown;
		for (let attempt = 1; attempt <= APPEND_ATTEMPTS; attempt++) {
			const firstSeq = (await this.repository.maxSeq(executionId)) + 1;
			try {
				await this.repository.appendBatch(executionId, firstSeq, events);
				return;
			} catch (error) {
				if (await this.didBatchCommit(executionId, firstSeq, events[0])) return;
				lastError = error;
			}
		}
		throw lastError;
	}

	private async didBatchCommit(
		executionId: string,
		firstSeq: number,
		firstEvent: TimelineEvent,
	): Promise<boolean> {
		try {
			return (
				(await this.repository.payloadAt(executionId, firstSeq)) === JSON.stringify(firstEvent)
			);
		} catch {
			return false;
		}
	}
}

export function foldTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
	const timeline: TimelineEvent[] = [];
	const toolCallIndexes = new Map<string, number>();
	for (const event of events) {
		const lastEvent = timeline.at(-1);
		if ((event.type === 'text' || event.type === 'reasoning') && lastEvent?.type === event.type) {
			timeline[timeline.length - 1] =
				lastEvent.timestamp === event.timestamp && event.content.startsWith(lastEvent.content)
					? event
					: {
							...lastEvent,
							content: lastEvent.content + event.content,
							endTime: event.endTime,
						};
			continue;
		}
		if (event.type === 'tool-call' && event.toolCallId) {
			const existingIndex = toolCallIndexes.get(event.toolCallId);
			if (existingIndex !== undefined) {
				timeline[existingIndex] = event;
				continue;
			}
			toolCallIndexes.set(event.toolCallId, timeline.length);
		}
		timeline.push(event);
	}
	return timeline;
}
