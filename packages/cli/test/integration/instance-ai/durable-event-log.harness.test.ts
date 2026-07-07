/**
 * Durable-log evaluation harness (RFC: instance-ai durable event log).
 *
 * Drives the REAL InProcessEventBus + DurableEventLog + repositories over a
 * real test DB with scripted event streams, flag off vs flag on, and both
 * asserts the correctness matrix and records the measured numbers to a JSON
 * file (DURABLE_LOG_RESULTS, default os.tmpdir()/durable-log-synthetic.json)
 * consumed by .context/durable-log-evaluation-report.md.
 *
 * Run: pnpm test:sqlite test/integration/instance-ai/durable-event-log.harness.test.ts
 */
import { createTeamProject, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import type {
	InstanceAiAgentNode,
	InstanceAiEvent,
	InstanceAiRunStatus,
} from '@n8n/api-types';
import { createInitialState, reduceEvent, toAgentTree } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { AgentDbMessage, StoredEvent } from '@n8n/instance-ai';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';
import { v4 as uuid } from 'uuid';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { DurableEventLog } from '@/modules/instance-ai/event-bus/durable-event-log';
import { DurableLogMetrics } from '@/modules/instance-ai/event-bus/durable-log-metrics';
import { InProcessEventBus } from '@/modules/instance-ai/event-bus/in-process-event-bus';
import {
	InterruptedRunSweeper,
	TOOL_INTERRUPTED_MESSAGE,
} from '@/modules/instance-ai/event-bus/interrupted-run-sweeper';
import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';
import { InstanceAiCheckpointRepository } from '@/modules/instance-ai/repositories/instance-ai-checkpoint.repository';
import { InstanceAiEventLogRepository } from '@/modules/instance-ai/repositories/instance-ai-event-log.repository';
import { InstanceAiThreadRepository } from '@/modules/instance-ai/repositories/instance-ai-thread.repository';
import { DbSnapshotStorage } from '@/modules/instance-ai/storage/db-snapshot-storage';
import { TypeORMAgentMemory } from '@/modules/instance-ai/storage/typeorm-agent-memory';

// ---------------------------------------------------------------------------
// Result recording
// ---------------------------------------------------------------------------

const RESULTS_PATH =
	process.env.DURABLE_LOG_RESULTS ?? path.join(tmpdir(), 'durable-log-synthetic.json');

function recordResult(section: string, data: unknown): void {
	let all: Record<string, unknown> = {};
	if (existsSync(RESULTS_PATH)) {
		try {
			all = JSON.parse(readFileSync(RESULTS_PATH, 'utf8')) as Record<string, unknown>;
		} catch {}
	}
	all[section] = data;
	writeFileSync(RESULTS_PATH, JSON.stringify(all, null, 1));
}

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return NaN;
	const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
	return sorted[Math.max(0, idx)];
}

function stats(samples: number[]) {
	const sorted = [...samples].sort((a, b) => a - b);
	return {
		n: sorted.length,
		p50: round(percentile(sorted, 50)),
		p95: round(percentile(sorted, 95)),
		max: round(sorted[sorted.length - 1] ?? NaN),
		mean: round(sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1)),
	};
}

function round(x: number): number {
	return Math.round(x * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Stack construction (one per arm, flag off vs on)
// ---------------------------------------------------------------------------

interface Stack {
	bus: InProcessEventBus;
	eventLog: DurableEventLog;
	metrics: DurableLogMetrics;
	repo: InstanceAiEventLogRepository;
}

function buildStack(durableLog: boolean): Stack {
	const logger = mockLogger();
	const metrics = new DurableLogMetrics();
	const repo = Container.get(InstanceAiEventLogRepository);
	const eventLog = new DurableEventLog(logger, repo, metrics);
	const globalConfig = { instanceAi: { durableLog } } as GlobalConfig;
	const instanceSettings = { isMultiMain: false } as InstanceSettings;
	const publisher = mock<Publisher>();
	publisher.publishCommand.mockResolvedValue(undefined);
	const bus = new InProcessEventBus(logger, instanceSettings, publisher, eventLog, globalConfig);
	return { bus, eventLog, metrics, repo };
}

async function createThread(): Promise<string> {
	const project = await createTeamProject();
	const threadId = uuid();
	await Container.get(InstanceAiThreadRepository).insert({
		id: threadId,
		resourceId: 'harness-user',
		projectId: project.id,
		title: 'harness',
	});
	return threadId;
}

// ---------------------------------------------------------------------------
// Scripted streams
// ---------------------------------------------------------------------------

const DELTA_TEXT = 'the quick brown fox jumps over the l'; // ~36 chars, realistic token chunk

function orchestrator(runId: string): string {
	return `orchestrator:${runId}`;
}

/** One "LLM step": reasoning deltas, text deltas, a tool call and its result. */
function step(
	runId: string,
	agentId: string,
	stepIdx: number,
	opts: { reasoningDeltas: number; textDeltas: number },
): InstanceAiEvent[] {
	const responseId = `msg_${runId.slice(-6)}_${agentId.slice(-8)}_${stepIdx}`;
	const events: InstanceAiEvent[] = [];
	for (let i = 0; i < opts.reasoningDeltas; i++) {
		events.push({
			type: 'reasoning-delta',
			runId,
			agentId,
			responseId,
			payload: { text: DELTA_TEXT },
		});
	}
	for (let i = 0; i < opts.textDeltas; i++) {
		events.push({ type: 'text-delta', runId, agentId, responseId, payload: { text: DELTA_TEXT } });
	}
	const toolCallId = `tc_${agentId.slice(-8)}_${stepIdx}`;
	events.push({
		type: 'tool-call',
		runId,
		agentId,
		responseId,
		payload: { toolCallId, toolName: 'search-workflows', args: { query: `step ${stepIdx}` } },
	});
	events.push({
		type: 'tool-result',
		runId,
		agentId,
		responseId,
		payload: { toolCallId, result: { matches: stepIdx } },
	});
	return events;
}

function runStart(runId: string, userId = 'harness-user', messageGroupId?: string): InstanceAiEvent {
	return {
		type: 'run-start',
		runId,
		agentId: orchestrator(runId),
		userId,
		payload: { messageId: `m_${runId}`, ...(messageGroupId ? { messageGroupId } : {}) },
	};
}

function runFinish(runId: string, status: InstanceAiRunStatus = 'completed'): InstanceAiEvent {
	return { type: 'run-finish', runId, agentId: orchestrator(runId), payload: { status } };
}

/** S1 small run: 3 steps, ~30 events. */
function smallRun(runId: string): InstanceAiEvent[] {
	const agentId = orchestrator(runId);
	const events: InstanceAiEvent[] = [runStart(runId)];
	for (let s = 0; s < 3; s++) events.push(...step(runId, agentId, s, { reasoningDeltas: 3, textDeltas: 4 }));
	events.push(runFinish(runId));
	return events;
}

/** S2 long run: 60 steps x ~32 deltas, ~2000 events. */
function longRun(runId: string): InstanceAiEvent[] {
	const agentId = orchestrator(runId);
	const events: InstanceAiEvent[] = [runStart(runId)];
	for (let s = 0; s < 60; s++) events.push(...step(runId, agentId, s, { reasoningDeltas: 8, textDeltas: 22 }));
	events.push(runFinish(runId));
	return events;
}

/** S3 concurrent multi-agent: orchestrator + 2 sub-agents, interleaved. */
function multiAgentRun(runId: string): InstanceAiEvent[] {
	const orch = orchestrator(runId);
	const subA = `sub:${runId}:builder`;
	const subB = `sub:${runId}:researcher`;
	const events: InstanceAiEvent[] = [runStart(runId)];
	for (const [agentId, role] of [
		[subA, 'builder'],
		[subB, 'researcher'],
	] as const) {
		events.push({
			type: 'agent-spawned',
			runId,
			agentId,
			payload: { parentId: orch, role, tools: ['search-workflows'] },
		});
	}
	// Interleave 6 steps round-robin across the three agents, delta by delta.
	const perAgent = [orch, subA, subB].map((agentId) =>
		[0, 1].flatMap((s) => step(runId, agentId, s, { reasoningDeltas: 4, textDeltas: 6 })),
	);
	const cursors = perAgent.map(() => 0);
	let remaining = perAgent.reduce((n, arr) => n + arr.length, 0);
	let turn = 0;
	while (remaining > 0) {
		const lane = turn % perAgent.length;
		if (cursors[lane] < perAgent[lane].length) {
			events.push(perAgent[lane][cursors[lane]++]);
			remaining--;
		}
		turn++;
	}
	for (const [agentId, role] of [
		[subA, 'builder'],
		[subB, 'researcher'],
	] as const) {
		events.push({
			type: 'agent-completed',
			runId,
			agentId,
			payload: { role, result: `${role} finished` },
		});
	}
	events.push(runFinish(runId));
	return events;
}

// ---------------------------------------------------------------------------
// Publish helpers
// ---------------------------------------------------------------------------

interface LiveCapture {
	stored: StoredEvent;
	at: number;
}

function subscribeCapture(stack: Stack, threadId: string): LiveCapture[] {
	const received: LiveCapture[] = [];
	stack.bus.subscribe(threadId, (stored) => received.push({ stored, at: performance.now() }));
	return received;
}

/** Publish all events; paced mode yields a macrotask between steps (structural facts). */
async function publishAll(
	stack: Stack,
	threadId: string,
	events: InstanceAiEvent[],
	mode: 'burst' | 'paced',
): Promise<number[]> {
	const publishedAt: number[] = [];
	for (const event of events) {
		publishedAt.push(performance.now());
		stack.bus.publish(threadId, event);
		if (mode === 'paced' && (event.type === 'tool-result' || event.type === 'run-start')) {
			await new Promise((resolve) => setTimeout(resolve, 2));
		}
	}
	await stack.eventLog.flush(threadId);
	// Legacy arm is synchronous; flush is a no-op there.
	return publishedAt;
}

function foldTree(events: InstanceAiEvent[]): InstanceAiAgentNode {
	let state = createInitialState(events[0]?.agentId ?? 'orchestrator:none');
	for (const event of events) state = reduceEvent(state, event);
	return toAgentTree(state);
}

function countToolCalls(tree: InstanceAiAgentNode): number {
	let n = 0;
	const stack = [tree];
	while (stack.length) {
		const node = stack.pop()!;
		n += node.toolCalls.length;
		stack.push(...node.children);
	}
	return n;
}

/** Strip fold-time wall-clock stamps (startedAt/completedAt) for tree equality. */
function normalizeTree(tree: InstanceAiAgentNode): unknown {
	return JSON.parse(
		JSON.stringify(tree, (key, value: unknown) =>
			key === 'startedAt' || key === 'completedAt' ? undefined : value,
		),
	);
}

// ---------------------------------------------------------------------------

describe('durable event log harness', () => {
	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	// -------------------------------------------------------------------------
	// 1. Publish -> subscriber delivery latency, S1/S2/S3, burst + paced
	// -------------------------------------------------------------------------
	it(
		'measures publish-to-delivery latency, flag off vs on',
		async () => {
			const results: Record<string, unknown> = {};
			for (const [scenarioName, factory] of [
				['smallRun', smallRun],
				['longRun', longRun],
				['multiAgent', multiAgentRun],
			] as const) {
				for (const mode of ['burst', 'paced'] as const) {
					if (scenarioName === 'longRun' && mode === 'paced') continue; // 60 steps x 2ms is enough via smallRun
					for (const flag of [false, true]) {
						const samplesDelta: number[] = [];
						const samplesStructural: number[] = [];
						const runs = 5;
						for (let r = 0; r < runs; r++) {
							const stack = buildStack(flag);
							const threadId = await createThread();
							const received = subscribeCapture(stack, threadId);
							const events = factory(`run_${uuid()}`);
							const publishedAt = await publishAll(stack, threadId, events, mode);
							expect(received.length).toBe(events.length); // live stream is complete in both arms
							for (let i = 0; i < events.length; i++) {
								const latency = received[i].at - publishedAt[i];
								const kind = events[i].type.endsWith('-delta') ? samplesDelta : samplesStructural;
								if (r > 0) kind.push(latency); // first run is warmup
							}
						}
						results[`${scenarioName}.${mode}.${flag ? 'on' : 'off'}`] = {
							delta: stats(samplesDelta),
							structural: stats(samplesStructural),
						};
					}
				}
			}
			recordResult('latency', results);
		},
		240_000,
	);

	// -------------------------------------------------------------------------
	// 2. Rows + bytes written per run
	// -------------------------------------------------------------------------
	it(
		'measures DB rows and bytes written per run',
		async () => {
			const results: Record<string, unknown> = {};
			for (const [scenarioName, factory] of [
				['smallRun', smallRun],
				['longRun', longRun],
				['multiAgent', multiAgentRun],
			] as const) {
				for (const flag of [false, true]) {
					const stack = buildStack(flag);
					const threadId = await createThread();
					subscribeCapture(stack, threadId);
					const events = factory(`run_${uuid()}`);
					await publishAll(stack, threadId, events, 'burst');
					const dbRows = await stack.repo.count({ where: { threadId } });
					results[`${scenarioName}.${flag ? 'on' : 'off'}`] = {
						published: events.length,
						rowsWritten: stack.metrics.drain.rowsWritten,
						bytesWritten: stack.metrics.drain.bytesWritten,
						dbRows,
						batches: stack.metrics.drain.batches,
						queueLatency: {
							p50: round(
								stack.metrics.drain.queueLatencySamples
									? stack.metrics.drain.queueLatencyMsTotal / stack.metrics.drain.queueLatencySamples
									: 0,
							),
							max: stack.metrics.drain.queueLatencyMsMax,
						},
					};
					if (flag) {
						expect(dbRows).toBe(stack.metrics.drain.rowsWritten);
						expect(dbRows).toBeGreaterThan(0);
					} else {
						expect(dbRows).toBe(0);
					}
				}
			}
			recordResult('writeVolume', results);
		},
		120_000,
	);

	// -------------------------------------------------------------------------
	// 3. Replay correctness across a simulated restart + flag-off loss
	// -------------------------------------------------------------------------
	it('replays exactly across a restart (flag on); flag off demonstrably loses everything', async () => {
		// Flag ON: publish, capture live; "restart" = fresh stack over same DB.
		const stackA = buildStack(true);
		const threadId = await createThread();
		const live = subscribeCapture(stackA, threadId);
		const events = smallRun(`run_${uuid()}`);
		await publishAll(stackA, threadId, events, 'burst');

		const stackB = buildStack(true); // fresh process: empty caches, same DB
		const replayAll = await stackB.eventLog.getEventsAfter(threadId, 0);
		expect(replayAll.length).toBeGreaterThan(0);
		// Seq contiguity from 1.
		expect(replayAll.map((e) => e.id)).toEqual(replayAll.map((_, i) => i + 1));
		// Fold of full replay equals fold of full live stream.
		const fullLiveTree = foldTree(live.map((c) => c.stored.event));
		const fullReplayTree = foldTree(replayAll.map((e) => e.event));
		expect(normalizeTree(fullReplayTree)).toEqual(normalizeTree(fullLiveTree));

		// Continuation from a mid-stream cursor: live prefix + replayed tail == full.
		const durableIds = live.filter((c) => c.stored.id !== undefined);
		const mid = durableIds[Math.floor(durableIds.length / 2)].stored.id!;
		const prefixEndIdx = live.findIndex((c) => c.stored.id === mid);
		const prefix = live.slice(0, prefixEndIdx + 1).map((c) => c.stored.event);
		const tail = (await stackB.eventLog.getEventsAfter(threadId, mid)).map((e) => e.event);
		const continuationTree = foldTree([...prefix, ...tail]);
		expect(normalizeTree(continuationTree)).toEqual(normalizeTree(fullLiveTree));
		expect(await stackB.eventLog.getNextEventId(threadId)).toBe(replayAll.length + 1);

		// Flag OFF: same scripted run, fresh bus after "restart" has nothing.
		const legacyA = buildStack(false);
		const threadId2 = await createThread();
		subscribeCapture(legacyA, threadId2);
		await publishAll(legacyA, threadId2, smallRun(`run_${uuid()}`), 'burst');
		expect(legacyA.bus.getEventsAfter(threadId2, 0).length).toBeGreaterThan(0);
		const legacyB = buildStack(false); // fresh process
		expect(legacyB.bus.getEventsAfter(threadId2, 0)).toHaveLength(0);
		// And the id counter resets, so stale client cursors would replay wrongly.
		expect(legacyB.bus.getNextEventId(threadId2)).toBe(1);

		recordResult('restartReplay', {
			flagOn: { replayedEvents: replayAll.length, continuationExact: true },
			flagOff: { replayedEventsAfterRestart: 0, nextEventIdAfterRestart: 1 },
		});
	});

	// -------------------------------------------------------------------------
	// 4. Long-run eviction: flag off loses early events, flag on does not
	// -------------------------------------------------------------------------
	it(
		'long run: flag off evicts its own history, flag on retains all facts',
		async () => {
			const runId = `run_${uuid()}`;
			const events = longRun(runId);
			const expectedToolCalls = 60;

			const legacy = buildStack(false);
			const threadIdOff = await createThread();
			subscribeCapture(legacy, threadIdOff);
			await publishAll(legacy, threadIdOff, events, 'burst');
			const legacyStored = legacy.bus.getEventsAfter(threadIdOff, 0);
			const legacyTree = foldTree(legacy.bus.getEventsForRun(threadIdOff, runId));
			const legacyToolCalls = countToolCalls(legacyTree);

			const durable = buildStack(true);
			const threadIdOn = await createThread();
			subscribeCapture(durable, threadIdOn);
			await publishAll(durable, threadIdOn, events, 'burst');
			const durableFacts = await durable.eventLog.getEventsForRuns(threadIdOn, [runId]);
			const durableTree = foldTree(durableFacts);
			const durableToolCalls = countToolCalls(durableTree);

			// Flag off: the 500-event cap evicted most of the run, including early
			// tool calls, so the fold (= today's snapshot input) is incomplete.
			expect(legacyStored.length).toBeLessThanOrEqual(500);
			expect(legacyToolCalls).toBeLessThan(expectedToolCalls);
			// Flag on: every structural fact survives.
			expect(durableToolCalls).toBe(expectedToolCalls);

			recordResult('eviction', {
				published: events.length,
				flagOff: {
					eventsRetained: legacyStored.length,
					eventsLost: events.length - legacyStored.length,
					toolCallsInTree: legacyToolCalls,
					expectedToolCalls,
				},
				flagOn: {
					factsPersisted: durableFacts.length,
					toolCallsInTree: durableToolCalls,
					expectedToolCalls,
				},
			});
		},
		120_000,
	);

	// -------------------------------------------------------------------------
	// 5. Mid-block reconnect: replace semantics, no duplicate text
	// -------------------------------------------------------------------------
	it('mid-block reconnect never renders text or reasoning twice (flag on)', async () => {
		const stack = buildStack(true);
		const threadId = await createThread();
		const live = subscribeCapture(stack, threadId);
		const runId = `run_${uuid()}`;
		const events = smallRun(runId);
		await publishAll(stack, threadId, events, 'burst');

		const expectedTree = foldTree((await stack.eventLog.getEventsAfter(threadId, 0)).map((e) => e.event));

		// Disconnect mid-segment: client saw everything up to (and including) a
		// few deltas that follow the last durable fact it received.
		const lastDurableIdx = live.findIndex((c) => c.stored.id !== undefined);
		// Take the SECOND durable fact, then 2 more live events (deltas of the open segment).
		let durableSeen = 0;
		let disconnectIdx = -1;
		for (let i = 0; i < live.length; i++) {
			if (live[i].stored.id !== undefined) durableSeen++;
			if (durableSeen === 2) {
				disconnectIdx = i;
				break;
			}
		}
		expect(lastDurableIdx).toBeGreaterThanOrEqual(0);
		disconnectIdx += 3; // partial open segment seen live
		const cursor = live
			.slice(0, disconnectIdx + 1)
			.filter((c) => c.stored.id !== undefined)
			.at(-1)!.stored.id!;

		const prefix = live.slice(0, disconnectIdx + 1).map((c) => c.stored.event);
		const replay = (await stack.eventLog.getEventsAfter(threadId, cursor)).map((e) => e.event);
		const reconnectedTree = foldTree([...prefix, ...replay]);

		expect(normalizeTree(reconnectedTree)).toEqual(normalizeTree(expectedTree));
		recordResult('midBlockReconnect', {
			cursor,
			partialDeltasSeenLive: 3,
			duplicateFreeAfterReplay: true,
		});
	});

	// -------------------------------------------------------------------------
	// 6. Concurrent writers: append conflict retried, no loss, contiguous seqs
	// -------------------------------------------------------------------------
	it('append conflicts between two writers are retried without loss (flag on)', async () => {
		const threadId = await createThread();
		const writerA = buildStack(true);
		const writerB = buildStack(true);
		subscribeCapture(writerA, threadId);
		subscribeCapture(writerB, threadId);

		// Seed both writers' seq caches on the same thread, then interleave.
		writerA.bus.publish(threadId, runStart('run_a'));
		await writerA.eventLog.flush(threadId);
		writerB.bus.publish(threadId, {
			type: 'tool-call',
			runId: 'run_b',
			agentId: 'orchestrator:run_b',
			payload: { toolCallId: 'tc_b1', toolName: 'x', args: {} },
		});
		await writerB.eventLog.flush(threadId);
		// A's cached seq is now stale; its next append must conflict and retry.
		writerA.bus.publish(threadId, runFinish('run_a'));
		await writerA.eventLog.flush(threadId);

		const rows = await writerA.eventLog.getEventsAfter(threadId, 0);
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
		expect(writerA.metrics.drain.appendConflicts).toBeGreaterThanOrEqual(1);
		expect(writerA.metrics.drain.appendFailures).toBe(0);
		recordResult('appendConflict', {
			conflictsRetried: writerA.metrics.drain.appendConflicts,
			failures: writerA.metrics.drain.appendFailures,
			rowsPersisted: rows.length,
		});
	});

	// -------------------------------------------------------------------------
	// 7. History load: snapshot read vs fold at 10/100/500 persisted facts,
	//    plus the degenerate-snapshot bug fixed by the fold.
	// -------------------------------------------------------------------------
	it(
		'measures history-load latency and fixes degenerate snapshots (phase 2)',
		async () => {
			const memoryService = Container.get(InstanceAiMemoryService);
			const agentMemory = Container.get(TypeORMAgentMemory);
			const snapshotStorage = Container.get(DbSnapshotStorage);
			const eventLogRepo = Container.get(InstanceAiEventLogRepository);
			const globalConfig = Container.get(GlobalConfig);

			const results: Record<string, unknown> = {};
			const emptyTree = (runId: string): InstanceAiAgentNode => ({
				agentId: orchestrator(runId),
				role: 'orchestrator',
				status: 'completed',
				textContent: '',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
			});

			// Latency A/B uses REALISTIC complete snapshot trees (parity content);
			// the degenerate10 case reproduces the shipped empty-agentTree bug and
			// proves the fold fixes it (correctness, reported separately).
			for (const [label, runCount, factsPerRun, degenerate] of [
				['facts10', 1, 10, false],
				['facts100', 5, 20, false],
				['facts500', 10, 50, false],
				['degenerate10', 1, 10, true],
			] as const) {
				const project = await createTeamProject();
				const threadId = uuid();
				await agentMemory.saveThreadWithProject(
					{ id: threadId, resourceId: 'harness-user', title: 'history' },
					project.id,
				);

				let seq = 0;
				let expectedToolCallsPerRun = 0;
				const baseTime = Date.now() - runCount * 60_000;
				for (let r = 0; r < runCount; r++) {
					const runId = `run_hist_${r}_${threadId.slice(0, 8)}`;
					const groupId = `mg_${r}_${threadId.slice(0, 8)}`;
					// Log facts: run-start + (toolCall+result) pairs + text-block + run-finish.
					const facts: InstanceAiEvent[] = [runStart(runId, 'harness-user', groupId)];
					const pairs = Math.floor((factsPerRun - 3) / 2);
					expectedToolCallsPerRun = pairs;
					for (let p = 0; p < pairs; p++) {
						const toolCallId = `tc_${r}_${p}`;
						facts.push({
							type: 'tool-call',
							runId,
							agentId: orchestrator(runId),
							payload: { toolCallId, toolName: 'search-workflows', args: { p } },
						});
						facts.push({
							type: 'tool-result',
							runId,
							agentId: orchestrator(runId),
							payload: { toolCallId, result: { ok: true } },
						});
					}
					facts.push({
						type: 'text-block',
						runId,
						agentId: orchestrator(runId),
						responseId: `msg_${r}`,
						payload: { text: `answer for run ${r}` },
					});
					facts.push(runFinish(runId));
					await eventLogRepo.appendBatch(threadId, seq + 1, facts);
					seq += facts.length;

					// Realistic case: the snapshot tree matches the run's real work
					// (what today's snapshot write persists). Degenerate case: empty
					// tree, the shipped empty-agentTree bug class.
					const snapshotTree = degenerate ? emptyTree(runId) : foldTree(facts);
					await snapshotStorage.save(threadId, snapshotTree, runId, {
						messageGroupId: groupId,
						runIds: [runId],
					});

					// Message pair so parseStoredMessages has rows to align.
					const t0 = new Date(baseTime + r * 60_000);
					const t1 = new Date(baseTime + r * 60_000 + 30_000);
					const messages: AgentDbMessage[] = [
						{ id: `u_${r}_${threadId.slice(0, 8)}`, role: 'user', content: [{ type: 'text', text: `question ${r}` }], createdAt: t0 } as AgentDbMessage,
						{ id: `a_${r}_${threadId.slice(0, 8)}`, role: 'assistant', content: [{ type: 'text', text: `answer for run ${r}` }], createdAt: t1 } as AgentDbMessage,
					];
					await agentMemory.saveMessages({ threadId, resourceId: 'harness-user', messages });
				}

				for (const flag of [false, true]) {
					globalConfig.instanceAi.durableLog = flag;
					const samples: number[] = [];
					let lastResult;
					for (let i = 0; i < 23; i++) {
						const t0 = performance.now();
						lastResult = await memoryService.getRichMessages('harness-user', threadId, {});
						const dt = performance.now() - t0;
						if (i >= 3) samples.push(dt); // 3 warmups
					}
					const assistant = (lastResult?.messages ?? []).filter((m) => m.role === 'assistant');
					const treeToolCalls = assistant.reduce(
						(n, m) => n + (m.agentTree ? countToolCalls(m.agentTree) : 0),
						0,
					);
					results[`${label}.${flag ? 'on' : 'off'}`] = {
						...stats(samples),
						assistantMessages: assistant.length,
						toolCallsRendered: treeToolCalls,
						expectedToolCalls: expectedToolCallsPerRun * runCount,
					};
					if (flag) {
						// Phase 2: the fold renders the real work in both cases, incl.
						// when the persisted snapshot is degenerate.
						expect(treeToolCalls).toBe(expectedToolCallsPerRun * runCount);
					}
					if (!flag && !degenerate) {
						// Parity check: realistic snapshots render the same work flag-off.
						expect(treeToolCalls).toBe(expectedToolCallsPerRun * runCount);
					}
					if (!flag && degenerate) {
						// The shipped bug, reproduced: the degenerate snapshot renders nothing.
						expect(treeToolCalls).toBe(0);
					}
				}
				globalConfig.instanceAi.durableLog = false;
			}
			recordResult('historyLoad', results);
		},
		240_000,
	);

	// -------------------------------------------------------------------------
	// 8. Interrupted-run sweep (phase 3, cli side)
	// -------------------------------------------------------------------------
	it('sweep marks crashed runs interrupted and resolves in-flight tool calls', async () => {
		const stack = buildStack(true);
		const threadId = await createThread();
		subscribeCapture(stack, threadId);
		const runId = `run_${uuid()}`;
		// Crash simulation: run-start + one completed step + one IN-FLIGHT call, no run-finish.
		stack.bus.publish(threadId, runStart(runId));
		for (const event of step(runId, orchestrator(runId), 0, { reasoningDeltas: 2, textDeltas: 2 }))
			stack.bus.publish(threadId, event);
		stack.bus.publish(threadId, {
			type: 'tool-call',
			runId,
			agentId: orchestrator(runId),
			payload: { toolCallId: 'tc_inflight', toolName: 'update-workflow', args: { id: 'w1' } },
		});
		await stack.eventLog.flush(threadId);

		const sweeper = new InterruptedRunSweeper(
			mockLogger(),
			stack.repo,
			Container.get(InstanceAiCheckpointRepository),
			stack.bus,
			stack.metrics,
			{ instanceAi: { durableLog: true } } as GlobalConfig,
		);
		sweeper.setResumeHost({
			hasActiveRun: () => false,
			crashResumeInterruptedRun: async () => false, // no checkpoint: falls through to interrupted
		});
		await sweeper.sweep();
		await stack.eventLog.flush(threadId);

		const facts = (await stack.eventLog.getEventsAfter(threadId, 0)).map((e) => e.event);
		const interruptedFacts = facts.filter((e) => e.type === 'tool-interrupted');
		const finish = facts.filter((e) => e.type === 'run-finish');
		expect(interruptedFacts).toHaveLength(1);
		expect(
			interruptedFacts[0].type === 'tool-interrupted' && interruptedFacts[0].payload.toolCallId,
		).toBe('tc_inflight');
		expect(finish).toHaveLength(1);
		expect(finish[0].type === 'run-finish' && finish[0].payload.status).toBe('interrupted');

		// The fold renders the run terminal with the in-flight call resolved.
		const tree = foldTree(facts);
		expect(tree.status).toBe('cancelled');
		const inflight = tree.toolCalls.find((tc) => tc.toolCallId === 'tc_inflight');
		expect(inflight?.error).toBe(TOOL_INTERRUPTED_MESSAGE);
		expect(inflight?.isLoading).toBe(false);

		// Second sweep is idempotent: the run now has a run-finish.
		const before = stack.metrics.sweep.runsMarkedInterrupted;
		await sweeper.sweep();
		expect(stack.metrics.sweep.runsMarkedInterrupted).toBe(before);

		recordResult('sweepInterrupted', {
			toolInterruptedFacts: stack.metrics.sweep.toolInterruptedFacts,
			runsMarkedInterrupted: stack.metrics.sweep.runsMarkedInterrupted,
			foldStatus: tree.status,
			idempotent: true,
		});
	});

	it('sweep crash-resumes from a running checkpoint and re-queues undrained corrections', async () => {
		const stack = buildStack(true);
		const threadId = await createThread();
		subscribeCapture(stack, threadId);
		const runId = `run_${uuid()}`;
		stack.bus.publish(threadId, runStart(runId, 'user-42'));
		// A drained correction (in checkpoint) and an undrained one (log only).
		stack.bus.publish(threadId, {
			type: 'tool-call',
			runId,
			agentId: orchestrator(runId),
			payload: {
				toolCallId: 'tc_corr_drained',
				toolName: 'task-control',
				args: { action: 'correct-task', taskId: 't1', correction: 'use Projects database' },
			},
		});
		stack.bus.publish(threadId, {
			type: 'tool-result',
			runId,
			agentId: orchestrator(runId),
			payload: { toolCallId: 'tc_corr_drained', result: { queued: true } },
		});
		stack.bus.publish(threadId, {
			type: 'tool-call',
			runId,
			agentId: orchestrator(runId),
			payload: {
				toolCallId: 'tc_corr_undrained',
				toolName: 'task-control',
				args: { action: 'correct-task', taskId: 't1', correction: 'rename the column first' },
			},
		});
		await stack.eventLog.flush(threadId);

		// Running step checkpoint whose message list contains only the drained correction.
		const checkpointRepo = Container.get(InstanceAiCheckpointRepository);
		await checkpointRepo.insert({
			key: `agent:${runId}`,
			runId,
			threadId,
			resourceId: 'user-42',
			state: {
				persistence: { threadId, resourceId: 'user-42' },
				status: 'running',
				messageList: { messages: [{ id: 'm1', content: 'includes tc_corr_drained marker' }] },
				pendingToolCalls: {},
			} as never,
			expiredAt: null,
		});

		const sweeper = new InterruptedRunSweeper(
			mockLogger(),
			stack.repo,
			checkpointRepo,
			stack.bus,
			stack.metrics,
			{ instanceAi: { durableLog: true } } as GlobalConfig,
		);
		const resumeCalls: Array<Record<string, unknown>> = [];
		sweeper.setResumeHost({
			hasActiveRun: () => false,
			crashResumeInterruptedRun: async (request) => {
				resumeCalls.push(request as unknown as Record<string, unknown>);
				return true;
			},
		});
		await sweeper.sweep();
		await stack.eventLog.flush(threadId);

		expect(resumeCalls).toHaveLength(1);
		expect(resumeCalls[0].threadId).toBe(threadId);
		expect(resumeCalls[0].runId).toBe(runId);
		expect(resumeCalls[0].userId).toBe('user-42');
		expect(resumeCalls[0].checkpointKey).toBe(`agent:${runId}`);
		const notes = resumeCalls[0].contextNotes as string[];
		// Both correction tool calls were in-flight (no results) -> verify-first notes,
		// and only the UNDRAINED correction is re-queued.
		expect(notes.join('\n')).toContain('rename the column first');
		expect(notes.join('\n')).not.toContain('use Projects database');
		expect(notes.join('\n')).toContain('effect is unverified');

		// Crash-resumed run publishes its own terminal event; the sweep must not.
		const facts = (await stack.eventLog.getEventsAfter(threadId, 0)).map((e) => e.event);
		expect(facts.filter((e) => e.type === 'run-finish')).toHaveLength(0);
		expect(stack.metrics.sweep.runsCrashResumed).toBe(1);
		expect(stack.metrics.sweep.correctionsRequeued).toBe(1);

		recordResult('sweepCrashResume', {
			crashResumed: stack.metrics.sweep.runsCrashResumed,
			correctionsRequeued: stack.metrics.sweep.correctionsRequeued,
			contextNotes: notes.length,
		});
	});

	it('sweep skips HITL-suspended runs (confirmation orphan path owns them)', async () => {
		const stack = buildStack(true);
		const threadId = await createThread();
		subscribeCapture(stack, threadId);
		const runId = `run_${uuid()}`;
		stack.bus.publish(threadId, runStart(runId));
		await stack.eventLog.flush(threadId);

		await Container.get(InstanceAiCheckpointRepository).insert({
			key: `agent:${runId}`,
			runId,
			threadId,
			resourceId: 'user-42',
			state: {
				persistence: { threadId, resourceId: 'user-42' },
				status: 'suspended',
				messageList: { messages: [] },
				pendingToolCalls: { tc_pending: { suspended: true } },
			} as never,
			expiredAt: null,
		});

		const sweeper = new InterruptedRunSweeper(
			mockLogger(),
			stack.repo,
			Container.get(InstanceAiCheckpointRepository),
			stack.bus,
			stack.metrics,
			{ instanceAi: { durableLog: true } } as GlobalConfig,
		);
		sweeper.setResumeHost({
			hasActiveRun: () => false,
			crashResumeInterruptedRun: async () => {
				throw new Error('must not be called for suspended runs');
			},
		});
		await sweeper.sweep();
		await stack.eventLog.flush(threadId);

		const facts = (await stack.eventLog.getEventsAfter(threadId, 0)).map((e) => e.event);
		expect(facts.filter((e) => e.type === 'run-finish')).toHaveLength(0);
		recordResult('sweepSkipsSuspended', { skipped: true });
	});
});
