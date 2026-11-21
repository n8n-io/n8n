import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { Publisher, Subscriber } from '@n8n/backend-services';

import type { AgentClusterService } from '../../agent-cluster.service';
import { AgentQueuedTestStreamService } from '../../agent-queued-test-stream.service';
import { AgentQueueMetrics } from '../../queue/agent-queue-metrics';
import type { AgentStreamChannel } from '../../queue/agent-stream-channel.service';
import { AgentTurnDispatcher } from '../../queue/agent-turn-dispatcher.service';
import type { AgentTurnGate } from '../../queue/agent-turn-gate.service';
import { AgentTurnHandlers } from '../../queue/agent-turn-handlers.service';
import type { AgentTurnPlacement } from '../../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../../queue/agent-turn-queue.service';
import { type AgentTurnRequestPayload, isPublicTurn } from '../../queue/agent-turn-request.types';
import { InProcessTurnRunner } from '../../queue/in-process-turn-runner';
import { QueuedTurnRunner } from '../../queue/queued-turn-runner';
import { QueuedTurnWorker } from '../../queue/queued-turn-worker';
import type { AgentMessageQueueRepository } from '../../repositories/agent-message-queue.repository';
import type { AgentTurnRequestRepository } from '../../repositories/agent-turn-request.repository';
import { testCluster } from './cluster';
import { fakeStreamChannel } from './stream-channel';

export interface TestTurnsOptions {
	cluster?: AgentClusterService;
	/** Defaults to a placement with no agent worker. */
	placement?: AgentTurnPlacement;
	/** Defaults to a gate that admits every turn. */
	gate?: AgentTurnGate;
	agentsConfig?: AgentsConfig;
	/** Defaults to a queue that hands each request job to the worker side at once. */
	turnQueue?: AgentTurnQueue;
	/** Defaults to an in-memory table, see `fakeRequests`. */
	requests?: AgentTurnRequestRepository;
	streams?: AgentQueuedTestStreamService;
	channel?: AgentStreamChannel;
	metrics?: AgentQueueMetrics;
}

/** An in-memory `agent_turn_request` table. Each row can be claimed once. */
export function fakeRequests() {
	const rows = new Map<string, { payload: AgentTurnRequestPayload; claimedBy: string | null }>();
	const requests = mock<AgentTurnRequestRepository>({
		createPending: vi.fn(async (id: string, payload: AgentTurnRequestPayload) => {
			rows.set(id, { payload, claimedBy: null });
		}),
		createPendingIfAbsent: vi.fn(async (id: string, payload: AgentTurnRequestPayload) => {
			if (rows.has(id)) return false;
			rows.set(id, { payload, claimedBy: null });
			return true;
		}),
		claim: vi.fn(async (id: string, instanceKey: string) => {
			const row = rows.get(id);
			if (!row || row.claimedBy !== null) return null;
			row.claimedBy = instanceKey;
			return row.payload;
		}),
		remove: vi.fn(async (id: string) => {
			rows.delete(id);
		}),
		removeStale: vi.fn(async () => ({ removed: 0, expiredDurable: 0 })),
		findUnclaimedDurable: vi.fn(async () => []),
		countPendingForAgent: vi.fn(
			async (agentId: string) =>
				[...rows.values()].filter(
					({ payload, claimedBy }) =>
						claimedBy === null && isPublicTurn(payload) && payload.agentId === agentId,
				).length,
		),
	});
	return { requests, rows };
}

/**
 * The real handler registry, runners and dispatcher over in-memory storage,
 * so that a test of a service that runs agent turns runs them for real.
 *
 * One `QueuedTurnRunner` plays the main and one `QueuedTurnWorker` plays the
 * agent worker. They share the in-memory channel and request table, as real
 * processes share Redis and the database.
 *
 * A request job that the default queue runs and that throws is kept in
 * `workerErrors`, and it is also an unhandled rejection, so the test run fails.
 */
export function testTurns(options: TestTurnsOptions = {}) {
	const cluster = options.cluster ?? testCluster({ instanceKey: 'instance-a' });
	const metrics = options.metrics ?? new AgentQueueMetrics();
	const placement =
		options.placement ??
		mock<AgentTurnPlacement>({
			dispatchEnabled: false,
			mayRunHere: () => true,
			workersAvailable: async () => false,
			queueFull: async () => false,
			retryAfterSeconds: async () => 15,
		});
	const gate =
		options.gate ?? mock<AgentTurnGate>({ waitForRoom: async () => ({ admitted: true }) });
	const streams =
		options.streams ??
		new AgentQueuedTestStreamService(
			mock<Publisher>(),
			testCluster(),
			mock<AgentMessageQueueRepository>(),
			mockLogger(),
			mock<Subscriber>(),
			mock<AgentStreamChannel>({ enabled: false }),
			metrics,
		);
	const channel = options.channel ?? fakeStreamChannel().channel;
	const requests = options.requests ?? fakeRequests().requests;
	const handlers = new AgentTurnHandlers(mockLogger());
	const inProcess = new InProcessTurnRunner(cluster, gate, handlers, placement);
	const worker = new QueuedTurnWorker(mockLogger(), cluster, requests, channel, handlers);
	const workerErrors: unknown[] = [];
	const turnQueue =
		options.turnQueue ??
		mock<AgentTurnQueue>({
			enqueueRequest: async (turnId) => {
				setImmediate(() => {
					void worker.runJob(turnId).catch((error: unknown) => {
						workerErrors.push(error);
						throw error;
					});
				});
			},
			removeRequest: async () => {},
		});
	const queued: QueuedTurnRunner = new QueuedTurnRunner(
		mockLogger(),
		options.agentsConfig ?? mock<AgentsConfig>({ queueMaxWaitSeconds: 0 }),
		cluster,
		placement,
		gate,
		turnQueue,
		requests,
		channel,
		handlers,
		worker,
		metrics,
	);
	const dispatcher = new AgentTurnDispatcher(mockLogger(), placement, inProcess, queued);
	return {
		handlers,
		inProcess,
		queued,
		worker,
		workerErrors,
		dispatcher,
		streams,
		channel,
		requests,
		turnQueue,
		metrics,
	};
}
