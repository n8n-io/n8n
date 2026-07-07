import type { Logger } from '@n8n/backend-common';
import type { InstanceAiEvent } from '@n8n/api-types';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { DurableLogMetrics } from '../durable-log-metrics';
import {
	InterruptedRunSweeper,
	TOOL_INTERRUPTED_MESSAGE,
	type InterruptedRunResumeHost,
} from '../interrupted-run-sweeper';
import type { InstanceAiCheckpoint } from '../../entities/instance-ai-checkpoint.entity';
import type { InstanceAiCheckpointRepository } from '../../repositories/instance-ai-checkpoint.repository';
import type { InstanceAiEventLogRepository } from '../../repositories/instance-ai-event-log.repository';

const THREAD = 'thread-1';
const RUN = 'run-1';
const AGENT = `orchestrator:${RUN}`;

function runStart(userId = 'user-1'): InstanceAiEvent {
	return {
		type: 'run-start',
		runId: RUN,
		agentId: AGENT,
		userId,
		payload: { messageId: 'm-1', messageGroupId: 'mg-1' },
	};
}

function toolCall(toolCallId: string, args: Record<string, unknown> = {}): InstanceAiEvent {
	return {
		type: 'tool-call',
		runId: RUN,
		agentId: AGENT,
		payload: { toolCallId, toolName: 'update-workflow', args },
	};
}

function toolResult(toolCallId: string): InstanceAiEvent {
	return { type: 'tool-result', runId: RUN, agentId: AGENT, payload: { toolCallId, result: {} } };
}

function correction(toolCallId: string, text: string): InstanceAiEvent {
	return {
		type: 'tool-call',
		runId: RUN,
		agentId: AGENT,
		payload: {
			toolCallId,
			toolName: 'task-control',
			args: { action: 'correct-task', taskId: 't-1', correction: text },
		},
	};
}

function runningCheckpoint(overrides: Partial<InstanceAiCheckpoint> = {}): InstanceAiCheckpoint {
	return {
		key: 'agent:run-sdk-1',
		runId: 'run-sdk-1',
		hostRunId: RUN,
		threadId: THREAD,
		resourceId: 'user-1',
		state: {
			persistence: { threadId: THREAD, resourceId: 'user-1', hostRunId: RUN },
			status: 'running',
			messageList: { messages: [{ id: 'm1', content: 'includes tc-drained marker' }] },
			pendingToolCalls: {},
		},
		expiredAt: null,
		createdAt: new Date('2026-07-07T10:00:00Z'),
		updatedAt: new Date('2026-07-07T10:00:00Z'),
		...overrides,
	} as InstanceAiCheckpoint;
}

interface Setup {
	events?: InstanceAiEvent[];
	checkpoints?: InstanceAiCheckpoint[];
	isMultiMain?: boolean;
	lastFactAt?: Date | null;
	claimSucceeds?: boolean;
	host?: Partial<InterruptedRunResumeHost>;
}

function buildSweeper(setup: Setup) {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const eventLogRepo = mock<InstanceAiEventLogRepository>();
	eventLogRepo.findUnfinishedRuns.mockResolvedValue([{ threadId: THREAD, runId: RUN }]);
	eventLogRepo.getForRuns.mockResolvedValue(setup.events ?? []);
	eventLogRepo.lastFactAt.mockResolvedValue(setup.lastFactAt ?? null);

	const checkpointRepo = mock<InstanceAiCheckpointRepository>();
	checkpointRepo.findActiveByThreadId.mockResolvedValue(setup.checkpoints ?? []);
	checkpointRepo.claimForCrashResume.mockResolvedValue(setup.claimSucceeds ?? true);

	const published: InstanceAiEvent[] = [];
	const eventBus = {
		publish: (_threadId: string, event: InstanceAiEvent) => {
			published.push(event);
		},
	};

	const metrics = new DurableLogMetrics(mock<EventService>());
	const crashResumeInterruptedRun = vi.fn(
		setup.host?.crashResumeInterruptedRun ?? (async () => true),
	);
	const host: InterruptedRunResumeHost = {
		hasActiveRun: setup.host?.hasActiveRun ?? (() => false),
		crashResumeInterruptedRun,
	};

	const sweeper = new InterruptedRunSweeper(
		logger,
		eventLogRepo,
		checkpointRepo,
		eventBus as never,
		metrics,
		{ isMultiMain: setup.isMultiMain ?? false } as InstanceSettings,
	);
	sweeper.setResumeHost(host);
	return { sweeper, published, metrics, crashResumeInterruptedRun, checkpointRepo };
}

describe('InterruptedRunSweeper', () => {
	it('appends tool-interrupted facts and run-finish{interrupted} for a crashed run without a checkpoint', async () => {
		const { sweeper, published, metrics } = buildSweeper({
			events: [runStart(), toolCall('tc-done'), toolResult('tc-done'), toolCall('tc-inflight')],
		});

		await sweeper.sweep();

		expect(published.map((e) => e.type)).toEqual(['tool-interrupted', 'run-finish']);
		const interrupted = published[0];
		expect(interrupted.type === 'tool-interrupted' && interrupted.payload.toolCallId).toBe(
			'tc-inflight',
		);
		expect(interrupted.type === 'tool-interrupted' && interrupted.payload.error).toBe(
			TOOL_INTERRUPTED_MESSAGE,
		);
		const finish = published[1];
		expect(finish.type === 'run-finish' && finish.payload.status).toBe('interrupted');
		expect(metrics.sweep.runsMarkedInterrupted).toBe(1);
		expect(metrics.sweep.toolInterruptedFacts).toBe(1);
	});

	it('skips a run that is live in this process', async () => {
		const { sweeper, published } = buildSweeper({
			events: [runStart()],
			host: { hasActiveRun: () => true },
		});

		await sweeper.sweep();

		expect(published).toHaveLength(0);
	});

	it('skips HITL-suspended runs entirely (the confirmation orphan path owns them)', async () => {
		const { sweeper, published, crashResumeInterruptedRun } = buildSweeper({
			events: [runStart()],
			checkpoints: [
				runningCheckpoint({
					state: {
						persistence: { threadId: THREAD, resourceId: 'user-1' },
						status: 'suspended',
						messageList: { messages: [] },
						pendingToolCalls: { 'tc-p': { suspended: true } },
					} as never,
				}),
			],
		});

		await sweeper.sweep();

		expect(published).toHaveLength(0);
		expect(crashResumeInterruptedRun).not.toHaveBeenCalled();
	});

	it('crash-resumes from the hostRunId-matched checkpoint with verify-first notes and only the undrained correction', async () => {
		const { sweeper, published, metrics, crashResumeInterruptedRun } = buildSweeper({
			events: [
				runStart('user-42'),
				correction('tc-drained', 'use Projects database'),
				toolResult('tc-drained'),
				correction('tc-undrained', 'rename the column first'),
			],
			checkpoints: [
				// A decoy running checkpoint from another run must NOT be picked.
				runningCheckpoint({ key: 'agent:other', hostRunId: 'run-other' }),
				runningCheckpoint(),
			],
		});

		await sweeper.sweep();

		expect(crashResumeInterruptedRun).toHaveBeenCalledTimes(1);
		const request = crashResumeInterruptedRun.mock.calls[0][0];
		expect(request).toMatchObject({
			threadId: THREAD,
			runId: RUN,
			userId: 'user-42',
			checkpointKey: 'agent:run-sdk-1',
			messageGroupId: 'mg-1',
		});
		const notes = (request.contextNotes ?? []).join('\n');
		expect(notes).toContain('effect is unverified'); // the in-flight correction call
		expect(notes).toContain('rename the column first'); // undrained: re-queued
		expect(notes).not.toContain('use Projects database'); // drained: in the checkpoint
		// The resumed run owns its terminal event: nothing appended here.
		expect(published.filter((e) => e.type === 'run-finish')).toHaveLength(0);
		expect(metrics.sweep.runsCrashResumed).toBe(1);
		expect(metrics.sweep.correctionsRequeued).toBe(1);
	});

	it('falls back to interrupted marking when no checkpoint matches and no legacy rows exist', async () => {
		const { sweeper, published, crashResumeInterruptedRun } = buildSweeper({
			events: [runStart()],
			checkpoints: [runningCheckpoint({ key: 'agent:other', hostRunId: 'run-other' })],
		});

		await sweeper.sweep();

		expect(crashResumeInterruptedRun).not.toHaveBeenCalled();
		expect(published.at(-1)?.type).toBe('run-finish');
	});

	it('leaves the run alone when the CAS claim is lost to a concurrent sweeper', async () => {
		const { sweeper, published, crashResumeInterruptedRun } = buildSweeper({
			events: [runStart()],
			checkpoints: [runningCheckpoint()],
			claimSucceeds: false,
		});

		await sweeper.sweep();

		expect(crashResumeInterruptedRun).not.toHaveBeenCalled();
		expect(published).toHaveLength(0);
	});

	it('multi-main: recent durable activity is a liveness heartbeat and skips the run', async () => {
		const { sweeper, published } = buildSweeper({
			events: [runStart()],
			isMultiMain: true,
			lastFactAt: new Date(), // written seconds ago: a sibling is driving it
		});

		await sweeper.sweep();

		expect(published).toHaveLength(0);
	});

	it('multi-main: stale activity past the grace window is swept', async () => {
		const { sweeper, published } = buildSweeper({
			events: [runStart()],
			isMultiMain: true,
			lastFactAt: new Date(Date.now() - InterruptedRunSweeper.LIVENESS_GRACE_MS - 1000),
		});

		await sweeper.sweep();

		expect(published.at(-1)?.type).toBe('run-finish');
	});

	it('single-main ignores the grace window (immediate post-crash sweeps work)', async () => {
		const { sweeper, published } = buildSweeper({
			events: [runStart()],
			isMultiMain: false,
			lastFactAt: new Date(), // fresh facts, but no siblings exist
		});

		await sweeper.sweep();

		expect(published.at(-1)?.type).toBe('run-finish');
	});

	it('falls back to interrupted marking when the resume host refuses', async () => {
		const { sweeper, published, metrics } = buildSweeper({
			events: [runStart()],
			checkpoints: [runningCheckpoint()],
			host: { crashResumeInterruptedRun: async () => false },
		});

		await sweeper.sweep();

		expect(published.at(-1)?.type).toBe('run-finish');
		expect(metrics.sweep.runsMarkedInterrupted).toBe(1);
		expect(metrics.sweep.runsCrashResumed).toBe(0);
	});
});
