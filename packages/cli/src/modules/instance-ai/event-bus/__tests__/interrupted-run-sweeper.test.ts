import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
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
			messageList: { messages: [] },
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
	durableLog?: boolean;
	host?: Partial<InterruptedRunResumeHost>;
}

function buildSweeper(setup: Setup) {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	// A minimal in-memory log: publishes append durable facts (mirroring the
	// event-bus graft), and the unfinished-runs query derives from the log
	// contents — so a sweep's own run-finish makes the next sweep a no-op.
	const log: InstanceAiEvent[] = [...(setup.events ?? [])];

	const eventLogRepo = mock<InstanceAiEventLogRepository>();
	eventLogRepo.findUnfinishedRuns.mockImplementation(async () =>
		log
			.filter((e) => e.type === 'run-start')
			.filter((s) => !log.some((f) => f.type === 'run-finish' && f.runId === s.runId))
			.map((s) => ({ threadId: THREAD, runId: s.runId })),
	);
	eventLogRepo.getForRuns.mockImplementation(async (_threadId, runIds) =>
		log.filter((e) => runIds.includes(e.runId)),
	);
	eventLogRepo.lastFactAt.mockResolvedValue(setup.lastFactAt ?? null);

	const checkpointRepo = mock<InstanceAiCheckpointRepository>();
	checkpointRepo.findActiveByThreadId.mockResolvedValue(setup.checkpoints ?? []);

	const published: InstanceAiEvent[] = [];
	const eventBus = {
		publish: (_threadId: string, event: InstanceAiEvent) => {
			published.push(event);
			log.push(event);
		},
	};

	const metrics = new DurableLogMetrics(mock<EventService>());
	const host: InterruptedRunResumeHost = {
		hasActiveRun: setup.host?.hasActiveRun ?? (() => false),
	};

	const sweeper = new InterruptedRunSweeper(
		logger,
		eventLogRepo,
		checkpointRepo,
		eventBus as never,
		metrics,
		{ instanceAi: { durableLog: setup.durableLog ?? true } } as GlobalConfig,
		{ isMultiMain: setup.isMultiMain ?? false } as InstanceSettings,
	);
	sweeper.setResumeHost(host);
	return { sweeper, published, metrics, eventLogRepo };
}

describe('InterruptedRunSweeper', () => {
	it('appends tool-interrupted facts and run-finish{interrupted} for a crashed run', async () => {
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
		expect(finish.type === 'run-finish' && finish.payload.reason).toBe('crash_interrupted');
		expect(metrics.sweep.runsMarkedInterrupted).toBe(1);
		expect(metrics.sweep.toolInterruptedFacts).toBe(1);
	});

	it('does nothing when the durable log is disabled', async () => {
		const { sweeper, published, eventLogRepo } = buildSweeper({
			events: [runStart()],
			durableLog: false,
		});

		await sweeper.sweep();

		expect(eventLogRepo.findUnfinishedRuns).not.toHaveBeenCalled();
		expect(published).toHaveLength(0);
	});

	it('is idempotent: a second sweep after the first is a no-op', async () => {
		const { sweeper, published, metrics } = buildSweeper({
			events: [runStart(), toolCall('tc-inflight')],
		});

		await sweeper.sweep();
		expect(published.map((e) => e.type)).toEqual(['tool-interrupted', 'run-finish']);

		await sweeper.sweep();

		expect(published).toHaveLength(2);
		expect(metrics.sweep.runsMarkedInterrupted).toBe(1);
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
		const { sweeper, published } = buildSweeper({
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
	});

	it('marks a run with a running step checkpoint interrupted (crash-resume is a later phase)', async () => {
		const { sweeper, published, metrics } = buildSweeper({
			events: [runStart()],
			checkpoints: [runningCheckpoint()],
		});

		await sweeper.sweep();

		expect(published.at(-1)?.type).toBe('run-finish');
		expect(metrics.sweep.runsMarkedInterrupted).toBe(1);
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
});
