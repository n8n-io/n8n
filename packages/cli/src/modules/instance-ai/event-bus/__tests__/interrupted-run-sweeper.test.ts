import type { InstanceAiEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { N8NCheckpointStorage } from '../../../agents/integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from '../../../agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '../../../agents/repositories/agent-execution-thread.repository';

import { DurableLogMetrics } from '../durable-log-metrics';
import {
	AGENT_INTERRUPTED_MESSAGE,
	InterruptedRunSweeper,
	TOOL_INTERRUPTED_MESSAGE,
	type InterruptedRunResumeHost,
} from '../interrupted-run-sweeper';
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

function agentSpawned(agentId: string, role = 'agent-builder'): InstanceAiEvent {
	return {
		type: 'agent-spawned',
		runId: RUN,
		agentId,
		payload: { parentId: AGENT, role, tools: [] },
	};
}

function agentCompleted(agentId: string, role = 'agent-builder'): InstanceAiEvent {
	return {
		type: 'agent-completed',
		runId: RUN,
		agentId,
		payload: { role, result: 'done' },
	};
}

interface Setup {
	events?: InstanceAiEvent[];
	/** Run id stored in the thread's suspended Agents checkpoint. */
	suspendedRunId?: string;
	/** Whether the Agents runtime has a running execution on the thread. */
	running?: boolean;
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
	// Mirrors the repository contract: DISTINCT (threadId, runId) pairs,
	// optionally scoped to one thread (the in-memory log is all THREAD).
	eventLogRepo.findUnfinishedRuns.mockImplementation(async (threadId) =>
		threadId !== undefined && threadId !== THREAD
			? []
			: [
					...new Map(
						log
							.filter((e) => e.type === 'run-start')
							.filter((s) => !log.some((f) => f.type === 'run-finish' && f.runId === s.runId))
							.map((s) => [s.runId, { threadId: THREAD, runId: s.runId }]),
					).values(),
				],
	);
	eventLogRepo.getForRuns.mockImplementation(async (_threadId, runIds) =>
		log.filter((e) => runIds.includes(e.runId)),
	);

	Container.set(AgentExecutionThreadRepository, {
		findOneBy: async () => ({ id: THREAD, agentId: 'n8n-assistant' }),
	} as never);
	Container.set(AgentExecutionRepository, {
		existsRunningByThread: async () => setup.running ?? false,
	} as never);
	Container.set(N8NCheckpointStorage, {
		findSuspendedForThread: async () =>
			setup.suspendedRunId
				? { persistence: { hostMetadata: { instanceAiTurn: { runId: setup.suspendedRunId } } } }
				: null,
	} as never);

	const published: InstanceAiEvent[] = [];
	const eventBus = {
		publish: (_threadId: string, event: InstanceAiEvent) => {
			published.push(event);
			log.push(event);
		},
	};

	const metrics = new DurableLogMetrics(mock<EventService>());
	const host: InterruptedRunResumeHost = {
		isRunLive: setup.host?.isRunLive ?? (() => false),
	};

	const sweeper = new InterruptedRunSweeper(logger, eventLogRepo, eventBus as never, metrics);
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

	it('appends agent-completed{error} for spawned children with no terminal fact', async () => {
		const { sweeper, published } = buildSweeper({
			events: [
				runStart(),
				agentSpawned('child-done'),
				agentCompleted('child-done'),
				agentSpawned('child-orphaned'),
			],
		});

		await sweeper.sweep();

		// run-finish settles only the root: without this fact the orphaned
		// child would render `active` forever in every fold of the log.
		expect(published.map((e) => e.type)).toEqual(['agent-completed', 'run-finish']);
		const completed = published[0];
		expect(completed.type === 'agent-completed' && completed.agentId).toBe('child-orphaned');
		expect(completed.type === 'agent-completed' && completed.payload.error).toBe(
			AGENT_INTERRUPTED_MESSAGE,
		);
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
			host: { isRunLive: (_threadId, runId) => runId === RUN },
		});

		await sweeper.sweep();

		expect(published).toHaveLength(0);
	});

	it('sweeps an older crashed run while a different run is live on the thread', async () => {
		const { sweeper, published } = buildSweeper({
			events: [runStart()],
			host: { isRunLive: (_threadId, runId) => runId === 'run-other' },
		});

		await sweeper.sweep();

		expect(published.at(-1)?.type).toBe('run-finish');
	});

	it('skips the run of the suspended Agents checkpoint (the resume path owns it)', async () => {
		const { sweeper, published } = buildSweeper({ events: [runStart()], suspendedRunId: RUN });

		await sweeper.sweep();

		expect(published).toHaveLength(0);
	});

	it('sweeps a crashed run even when a different run in the thread is HITL-suspended', async () => {
		const { sweeper, published } = buildSweeper({
			events: [runStart()],
			suspendedRunId: 'run-other',
		});

		await sweeper.sweep();

		expect(published.at(-1)?.type).toBe('run-finish');
	});

	it('skips a run while the Agents runtime has a running execution on the thread', async () => {
		const { sweeper, published } = buildSweeper({ events: [runStart()], running: true });

		await sweeper.sweep();

		expect(published).toHaveLength(0);
	});
});

describe('InterruptedRunSweeper.cancelUnfinishedRuns', () => {
	it('terminalizes a dead run as cancelled and returns the count', async () => {
		const { sweeper, published, metrics } = buildSweeper({
			events: [runStart(), toolCall('tc-inflight')],
		});

		const resolved = await sweeper.cancelUnfinishedRuns(THREAD);

		expect(resolved).toBe(1);
		expect(published.map((e) => e.type)).toEqual(['tool-interrupted', 'run-finish']);
		const finish = published.at(-1);
		expect(finish?.type === 'run-finish' && finish.payload.status).toBe('cancelled');
		expect(finish?.type === 'run-finish' && finish.payload.reason).toBe('user_cancelled');
		// Sweep-outcome metrics stay sweep-only.
		expect(metrics.sweep.runsMarkedInterrupted).toBe(0);
		expect(metrics.sweep.runsCrashResumed).toBe(0);
	});

	it('terminalizes orphaned spawned children as cancelled without an error', async () => {
		const { sweeper, published } = buildSweeper({
			events: [runStart(), agentSpawned('child-orphaned')],
		});

		expect(await sweeper.cancelUnfinishedRuns(THREAD)).toBe(1);

		expect(published.map((e) => e.type)).toEqual(['agent-completed', 'run-finish']);
		const completed = published[0];
		expect(completed.type === 'agent-completed' && completed.agentId).toBe('child-orphaned');
		expect(completed.type === 'agent-completed' && completed.payload).toEqual({
			role: 'agent-builder',
			result: '',
			status: 'cancelled',
		});
	});

	it('is idempotent and scoped to the requested thread', async () => {
		const { sweeper, published, eventLogRepo } = buildSweeper({ events: [runStart()] });

		expect(await sweeper.cancelUnfinishedRuns(THREAD)).toBe(1);
		// The appended run-finish makes the second pass a no-op.
		expect(await sweeper.cancelUnfinishedRuns(THREAD)).toBe(0);
		expect(published.filter((e) => e.type === 'run-finish')).toHaveLength(1);
		// Scoping happens in the query — foreign threads' zombies are never
		// fetched, so an ordinary cancel doesn't scan global history.
		expect(eventLogRepo.findUnfinishedRuns).toHaveBeenCalledWith(THREAD);
	});

	it('leaves live, suspended, and running runs alone', async () => {
		const live = buildSweeper({ events: [runStart()], host: { isRunLive: () => true } });
		expect(await live.sweeper.cancelUnfinishedRuns(THREAD)).toBe(0);
		expect(live.published).toHaveLength(0);

		const suspended = buildSweeper({ events: [runStart()], suspendedRunId: RUN });
		expect(await suspended.sweeper.cancelUnfinishedRuns(THREAD)).toBe(0);
		expect(suspended.published).toHaveLength(0);

		const running = buildSweeper({ events: [runStart()], running: true });
		expect(await running.sweeper.cancelUnfinishedRuns(THREAD)).toBe(0);
		expect(running.published).toHaveLength(0);
	});

	it('never appends a second terminal fact when one landed mid-race', async () => {
		const { sweeper, published, eventLogRepo } = buildSweeper({
			events: [
				runStart(),
				{ type: 'run-finish', runId: RUN, agentId: AGENT, payload: { status: 'completed' } },
			],
		});
		// Simulate the unfinished-run read racing the drain: the query claims the
		// run is unfinished even though its terminal fact is already readable.
		eventLogRepo.findUnfinishedRuns.mockResolvedValue([{ threadId: THREAD, runId: RUN }]);

		expect(await sweeper.cancelUnfinishedRuns(THREAD)).toBe(0);
		expect(published).toHaveLength(0);
	});
});
