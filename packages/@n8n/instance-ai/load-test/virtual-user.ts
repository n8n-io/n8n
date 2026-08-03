// ---------------------------------------------------------------------------
// Virtual user
//
// One virtual user = one real n8n account, one thread, one SSE connection, one
// multi-turn conversation. That 1:1:1 mapping is what makes the backend's
// per-user and per-thread state actually multiply under load.
//
// Lifecycle is split so the CLI can measure between the steps:
//   open    -> logged in, thread created, SSE connected, NO messages sent
//   run     -> the conversation
//   closeSse-> SSE aborted, thread still alive
//   deleteThread / cleanupResources -> teardown, measured separately
// ---------------------------------------------------------------------------

import { randomUUID } from 'node:crypto';

import { createScriptedDecider, renderCase, type BuildCase, type RenderedCase } from './cases';
import { createPrunedEventSink, startPrunedSseConnection, type PrunedEventSink } from './event-log';
import type { LoadTestUser } from './provision';
import { delay, describeError } from './sampler';
import {
	buildAutoApprovePayload,
	recordUserTurn,
	runMultiTurnConversation,
	countEvents,
} from '../evaluations/harness/chat-loop';
import type { EvalLogger } from '../evaluations/harness/logger';

/** Long enough for the stream to reach its live phase before we send anything. */
const SSE_CONNECT_SETTLE_MS = 500;

export interface VirtualUser {
	index: number;
	email: string;
	threadId: string;
	projectId: string;
	renderedCase: RenderedCase;
	user: LoadTestUser;
	sink: PrunedEventSink;
	sseAbort: AbortController;
	/** Resolves when the SSE stream ends. Kept so teardown can await it. */
	ssePromise: Promise<void>;
	/** Snapshot at open, so cleanup only deletes what this run created. */
	workflowIdsAtOpen: Set<string>;
	dataTableIdsAtOpen: Set<string>;
}

export interface VirtualUserResult {
	index: number;
	email: string;
	threadId: string;
	caseName: string;
	workflowName?: string;
	completed: boolean;
	error?: string;
	durationMs: number;
	turnsSent: number;
	runStarts: number;
	runFinishes: number;
	/** Wire volume and pruning effectiveness, from the event sink. */
	eventsReceived: number;
	eventsRetained: number;
	approxSseBytes: number;
	droppedEphemeral: number;
	droppedOverflow: number;
}

export interface OpenOptions {
	logger: EvalLogger;
	cases: readonly BuildCase[];
	/** Per-thread cap on retained events in the driver. */
	eventCap?: number;
}

/**
 * Log in (already done by provisioning), create the thread and connect SSE —
 * but send nothing. The CLI takes a stabilized reading after this across all
 * users, which is what yields the per-user idle-connection cost.
 */
export async function openVirtualUser(
	user: LoadTestUser,
	caseIndex: number,
	options: OpenOptions,
): Promise<VirtualUser> {
	const { logger } = options;
	const buildCase = options.cases[caseIndex % options.cases.length];
	const renderedCase = renderCase(buildCase, user.index);

	const projectId = await user.client.getPersonalProjectId();
	const threadId = randomUUID();
	await user.client.ensureThread(threadId, projectId);

	// Snapshot before any building so cleanup can diff and only remove ours.
	const workflowIdsAtOpen = new Set(await user.client.listWorkflowIds());
	const dataTableIdsAtOpen = new Set(await user.client.listDataTableIds(projectId));

	const sink = createPrunedEventSink(options.eventCap);
	const sseAbort = new AbortController();
	const ssePromise = startPrunedSseConnection(user.client, threadId, sink, sseAbort.signal).catch(
		(error: unknown) => {
			// An aborted stream is the normal shutdown path, not a failure.
			if (!sseAbort.signal.aborted) {
				logger.warn(`[u${user.index}] SSE ended unexpectedly: ${describeError(error)}`);
			}
		},
	);

	// Let the stream finish bootstrapping before the first message, so the
	// opening run's events aren't racing the replay phase.
	await delay(SSE_CONNECT_SETTLE_MS);

	logger.verbose(`[u${user.index}] ${user.email} thread=${threadId} case=${renderedCase.caseName}`);

	return {
		index: user.index,
		email: user.email,
		threadId,
		projectId,
		renderedCase,
		user,
		sink,
		sseAbort,
		ssePromise,
		workflowIdsAtOpen,
		dataTableIdsAtOpen,
	};
}

export interface RunOptions {
	logger: EvalLogger;
	/** Per-conversation budget. */
	timeoutMs: number;
	maxTurns: number;
	/** Stagger before the first message, to avoid a thundering herd. */
	startDelayMs: number;
	/** Fires when the run must stop early (wall clock or cost kill-switch). */
	abortSignal: AbortSignal;
}

/**
 * Drive the conversation. Delegates the whole turn loop to the eval harness's
 * `runMultiTurnConversation`, which already knows how to wait for run-finish,
 * drain background agent tasks, wait out observational-memory jobs and
 * auto-approve HITL gates.
 */
export async function runVirtualUser(
	virtualUser: VirtualUser,
	options: RunOptions,
): Promise<VirtualUserResult> {
	const { logger } = options;
	const startTime = Date.now();
	const approvedRequests = new Set<string>();
	const { sink, renderedCase } = virtualUser;

	const baseResult = {
		index: virtualUser.index,
		email: virtualUser.email,
		threadId: virtualUser.threadId,
		caseName: renderedCase.caseName,
		workflowName: renderedCase.workflowName,
	};

	const decider = createScriptedDecider(renderedCase.followUps, options.maxTurns);
	let turnsSent = 0;

	try {
		if (options.startDelayMs > 0) await delay(options.startDelayMs);
		if (options.abortSignal.aborted) throw new Error('aborted before first message');

		recordUserTurn(sink.events, renderedCase.opening);
		await virtualUser.user.client.sendMessage(virtualUser.threadId, renderedCase.opening);
		turnsSent = 1;

		await runMultiTurnConversation({
			client: virtualUser.user.client,
			threadId: virtualUser.threadId,
			events: sink.events,
			approvedRequests,
			startTime,
			timeoutMs: options.timeoutMs,
			logger,
			confirmationStrategy: buildAutoApprovePayload,
			nextMessageDecider: async () => {
				// Honour a global abort between turns rather than mid-run: a
				// half-sent turn would leave the thread with an active run.
				if (options.abortSignal.aborted) return { kind: 'done' };
				const decision = await decider();
				if (decision.kind === 'followUp') turnsSent++;
				return decision;
			},
		});

		return { ...baseResult, ...tally(sink, turnsSent, startTime), completed: true };
	} catch (error) {
		const message = describeError(error);
		logger.warn(`[u${virtualUser.index}] conversation failed: ${message}`);
		// Leave no active run behind — it would hold a thread's server state
		// (and its sandbox) for the rest of the measurement.
		await virtualUser.user.client.cancelRun(virtualUser.threadId).catch(() => {});
		return {
			...baseResult,
			...tally(sink, turnsSent, startTime),
			completed: false,
			error: message,
		};
	}
}

function tally(
	sink: PrunedEventSink,
	turnsSent: number,
	startTime: number,
): Omit<VirtualUserResult, 'index' | 'email' | 'threadId' | 'caseName' | 'completed'> {
	return {
		durationMs: Date.now() - startTime,
		turnsSent,
		runStarts: countEvents(sink.events, 'run-start'),
		runFinishes: countEvents(sink.events, 'run-finish'),
		eventsReceived: sink.stats.received,
		eventsRetained: sink.stats.retained,
		approxSseBytes: sink.stats.approxSseBytes,
		droppedEphemeral: sink.stats.droppedEphemeral,
		droppedOverflow: sink.stats.droppedOverflow,
	};
}

/** Abort the SSE stream, leaving the thread alive. Measured as its own phase. */
export async function closeSse(virtualUser: VirtualUser): Promise<void> {
	virtualUser.sseAbort.abort();
	await virtualUser.ssePromise;
}

export interface CleanupTally {
	threadsDeleted: number;
	workflowsDeleted: number;
	dataTablesDeleted: number;
	failures: string[];
}

export function emptyTally(): CleanupTally {
	return { threadsDeleted: 0, workflowsDeleted: 0, dataTablesDeleted: 0, failures: [] };
}

/**
 * Delete the thread. Kept separate from resource cleanup because the memory
 * freed by dropping a thread is the number we actually care about, and mixing
 * workflow deletion into the same phase would make it unattributable.
 */
export async function deleteThread(
	virtualUser: VirtualUser,
	tally: CleanupTally,
	logger: EvalLogger,
): Promise<void> {
	try {
		await virtualUser.user.client.deleteThread(virtualUser.threadId);
		tally.threadsDeleted++;
	} catch (error) {
		const message = `u${virtualUser.index} deleteThread: ${describeError(error)}`;
		logger.warn(message);
		tally.failures.push(message);
	}
}

/**
 * Remove what the agent created, diffed against the open-time snapshot so we
 * never touch pre-existing data. Best-effort: a failure is recorded (and
 * invalidates the residual-leak number) but never aborts teardown.
 */
export async function cleanupResources(
	virtualUser: VirtualUser,
	tally: CleanupTally,
	logger: EvalLogger,
): Promise<void> {
	const { client } = virtualUser.user;

	try {
		const current = await client.listWorkflowIds();
		for (const id of current.filter((id) => !virtualUser.workflowIdsAtOpen.has(id))) {
			try {
				await client.deleteWorkflow(id);
				tally.workflowsDeleted++;
			} catch (error) {
				const message = `u${virtualUser.index} deleteWorkflow ${id}: ${describeError(error)}`;
				logger.warn(message);
				tally.failures.push(message);
			}
		}
	} catch (error) {
		const message = `u${virtualUser.index} listWorkflowIds: ${describeError(error)}`;
		logger.warn(message);
		tally.failures.push(message);
	}

	try {
		const current = await client.listDataTableIds(virtualUser.projectId);
		for (const id of current.filter((id) => !virtualUser.dataTableIdsAtOpen.has(id))) {
			try {
				await client.deleteDataTable(virtualUser.projectId, id);
				tally.dataTablesDeleted++;
			} catch (error) {
				const message = `u${virtualUser.index} deleteDataTable ${id}: ${describeError(error)}`;
				logger.warn(message);
				tally.failures.push(message);
			}
		}
	} catch (error) {
		const message = `u${virtualUser.index} listDataTableIds: ${describeError(error)}`;
		logger.warn(message);
		tally.failures.push(message);
	}
}

/** Cancel any in-flight run — used by the wall-clock and cost kill-switches. */
export async function cancelRun(virtualUser: VirtualUser, logger: EvalLogger): Promise<void> {
	try {
		await virtualUser.user.client.cancelRun(virtualUser.threadId);
	} catch (error) {
		logger.verbose(`[u${virtualUser.index}] cancelRun: ${describeError(error)}`);
	}
}
