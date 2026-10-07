import type { Logger } from '@n8n/backend-common';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { N8NCheckpointStorage } from '../../../agents/integrations/n8n-checkpoint-storage';
import type {
	AgentExecutionRepository,
	ThreadRunSummary,
} from '../../../agents/repositories/agent-execution.repository';
import { ASSISTANT_AGENT_ID } from '../../assistant-turn-options';
import {
	THREAD_FACTS_LIMIT,
	ThreadFactsService,
	type ThreadFactsSession,
} from '../thread-facts.service';

const SESSION_UPDATED = new Date('2026-10-02T12:00:00.000Z');
const STOPPED = new Date('2026-10-01T09:05:00.000Z');
const STARTED = new Date('2026-10-01T09:00:00.000Z');

function sessions(count: number): ThreadFactsSession[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `thread-${i}`,
		updatedAt: new Date(SESSION_UPDATED.getTime() + i),
	}));
}

function summary(
	status: ThreadRunSummary['latest']['status'],
	running = status === 'running',
): ThreadRunSummary {
	return {
		latest: {
			status,
			createdAt: STARTED,
			startedAt: STARTED,
			stoppedAt: status === 'running' ? null : STOPPED,
		},
		running,
	};
}

function setup() {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const executions = mock<AgentExecutionRepository>();
	const checkpoints = mock<N8NCheckpointStorage>();
	executions.findRunSummariesByThreadIds.mockResolvedValue(new Map());
	checkpoints.findSuspendedThreadIds.mockResolvedValue(new Set());
	const service = new ThreadFactsService(logger, executions, checkpoints);
	return { logger, executions, checkpoints, service };
}

describe('ThreadFactsService.getFacts', () => {
	it('returns an empty map and reads nothing for an empty list', async () => {
		const { executions, checkpoints, service } = setup();

		await expect(service.getFacts([])).resolves.toEqual(new Map());

		expect(executions.findRunSummariesByThreadIds).not.toHaveBeenCalled();
		expect(checkpoints.findSuspendedThreadIds).not.toHaveBeenCalled();
	});

	it.each([1, 10, 50])(
		'reads %i threads with exactly one checkpoint read and one execution read',
		async (count) => {
			const { executions, checkpoints, service } = setup();
			const page = sessions(count);
			const ids = page.map(({ id }) => id);

			const result = await service.getFacts(page);

			expect(result.size).toBe(count);
			expect(checkpoints.findSuspendedThreadIds).toHaveBeenCalledTimes(1);
			expect(checkpoints.findSuspendedThreadIds).toHaveBeenCalledWith(ASSISTANT_AGENT_ID, ids);
			expect(executions.findRunSummariesByThreadIds).toHaveBeenCalledTimes(1);
			expect(executions.findRunSummariesByThreadIds).toHaveBeenCalledWith(ids);
		},
	);

	it('reads the Assistant checkpoints, not those of another agent', async () => {
		const { checkpoints, service } = setup();

		await service.getFacts(sessions(1));

		expect(checkpoints.findSuspendedThreadIds.mock.calls[0][0]).toBe('n8n-assistant');
	});

	it('combines the checkpoint and execution reads into the facts of each thread', async () => {
		const { executions, checkpoints, service } = setup();
		const [waiting, working, failed, cancelled, fresh] = sessions(5);
		checkpoints.findSuspendedThreadIds.mockResolvedValue(new Set([waiting.id]));
		executions.findRunSummariesByThreadIds.mockResolvedValue(
			new Map([
				[waiting.id, summary('success')],
				[working.id, summary('running')],
				[failed.id, summary('error')],
				[cancelled.id, summary('cancelled')],
			]),
		);

		const result = await service.getFacts([waiting, working, failed, cancelled, fresh]);

		expect([...result.entries()]).toEqual([
			[
				waiting.id,
				{ needsInput: true, running: false, lastRunFailed: false, lastActivityAt: STOPPED },
			],
			[
				working.id,
				{ needsInput: false, running: true, lastRunFailed: false, lastActivityAt: STARTED },
			],
			[
				failed.id,
				{ needsInput: false, running: false, lastRunFailed: true, lastActivityAt: STOPPED },
			],
			[
				cancelled.id,
				{ needsInput: false, running: false, lastRunFailed: false, lastActivityAt: STOPPED },
			],
			[
				fresh.id,
				{
					needsInput: false,
					running: false,
					lastRunFailed: false,
					lastActivityAt: fresh.updatedAt,
				},
			],
		]);
	});

	it('reads each thread id once when the list repeats a thread', async () => {
		const { executions, checkpoints, service } = setup();
		const [first, second] = sessions(2);

		const result = await service.getFacts([first, second, first]);

		expect(result.size).toBe(2);
		expect(checkpoints.findSuspendedThreadIds).toHaveBeenCalledWith(ASSISTANT_AGENT_ID, [
			first.id,
			second.id,
		]);
		expect(executions.findRunSummariesByThreadIds).toHaveBeenCalledWith([first.id, second.id]);
	});

	it('rejects more than 50 threads without reading', async () => {
		const { executions, checkpoints, service } = setup();

		expect(THREAD_FACTS_LIMIT).toBe(50);
		await expect(service.getFacts(sessions(51))).rejects.toThrow(UnexpectedError);

		expect(executions.findRunSummariesByThreadIds).not.toHaveBeenCalled();
		expect(checkpoints.findSuspendedThreadIds).not.toHaveBeenCalled();
	});

	it('passes a read failure to the caller', async () => {
		const { executions, service } = setup();
		executions.findRunSummariesByThreadIds.mockRejectedValue(new Error('database is locked'));

		await expect(service.getFacts(sessions(2))).rejects.toThrow('database is locked');
	});
});

describe('ThreadFactsService.getOverviews', () => {
	it('returns the list fields of each thread', async () => {
		const { executions, checkpoints, service } = setup();
		const [waiting, failed, fresh] = sessions(3);
		checkpoints.findSuspendedThreadIds.mockResolvedValue(new Set([waiting.id]));
		executions.findRunSummariesByThreadIds.mockResolvedValue(
			new Map([
				[waiting.id, summary('success')],
				[failed.id, summary('interrupted')],
			]),
		);

		const result = await service.getOverviews([waiting, failed, fresh]);

		expect(Object.fromEntries(result)).toEqual({
			[waiting.id]: {
				state: 'needs-you',
				needsInput: true,
				lastActivityAt: STOPPED.toISOString(),
			},
			[failed.id]: { state: 'failed', needsInput: false, lastActivityAt: STOPPED.toISOString() },
			[fresh.id]: {
				state: 'idle',
				needsInput: false,
				lastActivityAt: fresh.updatedAt.toISOString(),
			},
		});
	});

	it('reads only the first 50 threads of a longer page, with one read of each kind', async () => {
		const { executions, checkpoints, service } = setup();
		const page = sessions(60);
		const firstIds = page.slice(0, 50).map(({ id }) => id);

		const result = await service.getOverviews(page);

		expect([...result.keys()]).toEqual(firstIds);
		expect(checkpoints.findSuspendedThreadIds).toHaveBeenCalledTimes(1);
		expect(checkpoints.findSuspendedThreadIds).toHaveBeenCalledWith(ASSISTANT_AGENT_ID, firstIds);
		expect(executions.findRunSummariesByThreadIds).toHaveBeenCalledTimes(1);
		expect(executions.findRunSummariesByThreadIds).toHaveBeenCalledWith(firstIds);
	});

	it('returns no fields and logs a warning when a read fails', async () => {
		const { logger, checkpoints, service } = setup();
		checkpoints.findSuspendedThreadIds.mockRejectedValue(new Error('database is locked'));

		await expect(service.getOverviews(sessions(3))).resolves.toEqual(new Map());

		expect(logger.warn).toHaveBeenCalledWith('Failed to read the states of Assistant threads', {
			error: 'database is locked',
		});
	});

	it('returns no fields and reads nothing for an empty page', async () => {
		const { logger, executions, checkpoints, service } = setup();

		await expect(service.getOverviews([])).resolves.toEqual(new Map());

		expect(executions.findRunSummariesByThreadIds).not.toHaveBeenCalled();
		expect(checkpoints.findSuspendedThreadIds).not.toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
	});
});
