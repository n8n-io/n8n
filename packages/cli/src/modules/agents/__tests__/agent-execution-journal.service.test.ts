import { mockLogger } from '@n8n/backend-test-utils';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import {
	AgentExecutionJournalService,
	foldTimelineEvents,
} from '../agent-execution-journal.service';
import type { TimelineEvent } from '../execution-recorder';
import type { AgentExecutionTimelineJournalRepository } from '../repositories/agent-execution-timeline-journal.repository';

describe('AgentExecutionJournalService', () => {
	it('flushes only after queued timeline events are durable', async () => {
		const repository = mock<AgentExecutionTimelineJournalRepository>();
		repository.maxSeq.mockResolvedValue(0);
		let releaseAppend!: () => void;
		repository.appendBatch.mockReturnValue(
			new Promise<void>((resolve) => {
				releaseAppend = resolve;
			}),
		);
		const service = new AgentExecutionJournalService(
			mockLogger(),
			repository,
			mock<ErrorReporter>(),
		);
		const event: TimelineEvent = {
			type: 'text',
			content: 'Partial answer',
			timestamp: 1,
			endTime: 2,
		};

		service.publish('execution-1', event);
		let flushed = false;
		const flush = service.flush('execution-1').then(() => {
			flushed = true;
		});
		await vi.waitFor(() => expect(repository.appendBatch).toHaveBeenCalled());
		expect(flushed).toBe(false);

		releaseAppend();
		await flush;
		expect(repository.appendBatch).toHaveBeenCalledWith('execution-1', 1, [event]);
	});

	it('keeps retrying a batch after the immediate append attempts fail', async () => {
		vi.useFakeTimers();
		try {
			const repository = mock<AgentExecutionTimelineJournalRepository>();
			repository.maxSeq.mockResolvedValue(0);
			repository.appendBatch
				.mockRejectedValueOnce(new Error('database unavailable'))
				.mockRejectedValueOnce(new Error('database unavailable'))
				.mockRejectedValueOnce(new Error('database unavailable'))
				.mockRejectedValueOnce(new Error('database unavailable'))
				.mockResolvedValueOnce(undefined);
			repository.payloadAt.mockResolvedValue(null);
			const service = new AgentExecutionJournalService(
				mockLogger(),
				repository,
				mock<ErrorReporter>(),
			);
			const event: TimelineEvent = { type: 'text', content: 'Durable', timestamp: 1 };

			service.publish('execution-1', event);
			const flush = service.flush('execution-1');
			await vi.advanceTimersByTimeAsync(1_000);
			await flush;

			expect(repository.appendBatch).toHaveBeenCalledTimes(5);
			expect(repository.appendBatch).toHaveBeenLastCalledWith('execution-1', 1, [event]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('folds replacing text and tool snapshots into their original timeline positions', () => {
		const started: TimelineEvent = {
			type: 'tool-call',
			kind: 'tool',
			name: 'lookup',
			toolCallId: 'tool-1',
			input: { id: 1 },
			output: undefined,
			startTime: 10,
			endTime: 20,
			success: true,
		};
		const completed: TimelineEvent = { ...started, output: { name: 'Ada' } };
		const text: TimelineEvent = {
			type: 'text',
			content: 'Found',
			timestamp: 21,
			endTime: 22,
		};
		const completedText: TimelineEvent = {
			...text,
			content: 'Found it',
			endTime: 23,
		};
		const oldPeriodicChunk: TimelineEvent = {
			...text,
			content: ' again',
			timestamp: 23,
			endTime: 24,
		};
		const timestampCollision: TimelineEvent = {
			...text,
			content: ' elsewhere',
			endTime: 25,
		};

		expect(
			foldTimelineEvents([
				started,
				text,
				completedText,
				oldPeriodicChunk,
				timestampCollision,
				completed,
			]),
		).toEqual([completed, { ...completedText, content: 'Found it again elsewhere', endTime: 25 }]);
	});

	it('re-sequences a snapshotted batch after a concurrent writer wins its sequence', async () => {
		const repository = mock<AgentExecutionTimelineJournalRepository>();
		repository.maxSeq.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
		repository.appendBatch
			.mockRejectedValueOnce(new Error('unique constraint'))
			.mockResolvedValueOnce(undefined);
		const service = new AgentExecutionJournalService(
			mockLogger(),
			repository,
			mock<ErrorReporter>(),
		);
		const event: TimelineEvent = { type: 'text', content: 'Original', timestamp: 1 };

		service.publish('execution-1', event);
		event.content = 'Mutated after publish';
		await service.flush('execution-1');

		expect(repository.appendBatch).toHaveBeenNthCalledWith(2, 'execution-1', 3, [
			{ type: 'text', content: 'Original', timestamp: 1 },
		]);
	});

	it('does not duplicate a batch when an append commits before its response is lost', async () => {
		const repository = mock<AgentExecutionTimelineJournalRepository>();
		const event: TimelineEvent = { type: 'text', content: 'Durable', timestamp: 1 };
		repository.maxSeq.mockResolvedValue(0);
		repository.appendBatch.mockRejectedValue(new Error('connection lost'));
		repository.payloadAt.mockResolvedValue(JSON.stringify(event));
		const service = new AgentExecutionJournalService(
			mockLogger(),
			repository,
			mock<ErrorReporter>(),
		);

		service.publish('execution-1', event);
		await service.flush('execution-1');

		expect(repository.appendBatch).toHaveBeenCalledOnce();
	});
});
