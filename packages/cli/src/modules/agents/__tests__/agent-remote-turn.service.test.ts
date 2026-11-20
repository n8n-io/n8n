import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AgentQueuedTestStreamService } from '../agent-queued-test-stream.service';
import { AgentRemoteTurnService } from '../queue/agent-remote-turn.service';
import type { AgentTurnGate } from '../queue/agent-turn-gate.service';
import { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../queue/agent-turn-queue.service';
import type {
	AgentTurnRequestPayload,
	AgentWebhookRespondRequest,
} from '../queue/agent-turn-request.types';
import type {
	AgentTurnRequestRepository,
	AgentTurnRequestState,
} from '../repositories/agent-turn-request.repository';
import { testCluster } from './test-utils/cluster';

// The main polls with `sleep`. A virtual clock steps through the timeouts without waiting.
let now = 0;
vi.mock('node:timers/promises', () => ({
	setTimeout: vi.fn(async (ms: number) => {
		now += ms;
		await new Promise((resolve) => setImmediate(resolve));
	}),
}));

const RETRY_AFTER = 17;

const payload: AgentWebhookRespondRequest = {
	kind: 'webhook-respond',
	agentId: 'agent-1',
	input: 'Hi',
	approvalBaseUrl: 'https://n8n.example.com/agent-webhook/agent-1',
};

/** An in-memory `agent_turn_request` table. */
function fakeRequests() {
	const rows = new Map<string, AgentTurnRequestState & { payload: AgentTurnRequestPayload }>();
	const requests = mock<AgentTurnRequestRepository>();
	requests.createPending.mockImplementation(async (id, value) => {
		rows.set(id, { payload: value, claimedBy: null, result: null });
	});
	requests.claim.mockImplementation(async (id, key) => {
		const row = rows.get(id);
		if (!row || row.claimedBy !== null) return null;
		row.claimedBy = key;
		return row.payload;
	});
	requests.isPending.mockImplementation(async (id) => rows.get(id)?.claimedBy === null);
	requests.findState.mockImplementation(async (id) => {
		const row = rows.get(id);
		return row ? { claimedBy: row.claimedBy, result: row.result } : null;
	});
	requests.complete.mockImplementation(async (id, result) => {
		const row = rows.get(id);
		if (row) row.result = result;
	});
	requests.remove.mockImplementation(async (id) => {
		rows.delete(id);
	});
	requests.removeOlderThan.mockResolvedValue(0);
	return { requests, rows };
}

describe('AgentRemoteTurnService', () => {
	let turnQueue: ReturnType<typeof mock<AgentTurnQueue>>;
	let requests: ReturnType<typeof mock<AgentTurnRequestRepository>>;
	let rows: ReturnType<typeof fakeRequests>['rows'];

	/** One process. Processes made by one test share the queue and the table. */
	function setup({
		workers = true,
		instanceKey = 'main-a',
		activeInstanceKeys = ['main-a', 'worker-a'],
		queueMaxWaitSeconds = 0,
		roomHere = true,
		queueFull = false,
	}: {
		workers?: boolean;
		instanceKey?: string;
		activeInstanceKeys?: string[];
		queueMaxWaitSeconds?: number;
		roomHere?: boolean;
		queueFull?: boolean;
	} = {}) {
		return new AgentRemoteTurnService(
			mockLogger(),
			mock<AgentsConfig>({ queueMaxWaitSeconds }),
			testCluster({ instanceKey, activeInstanceKeys }),
			mock<AgentTurnPlacement>({
				dispatchEnabled: true,
				queueFull: async () => queueFull,
				retryAfterSeconds: async () => RETRY_AFTER,
				workersAvailable: async () => workers,
				mayFallBack: async (sentAt) => Date.now() - sentAt >= AgentTurnPlacement.FALLBACK_WAIT_MS,
			}),
			mock<AgentTurnGate>({
				waitForRoom: async () =>
					roomHere
						? { admitted: true }
						: { admitted: false, reason: 'main-at-limit', retryAfterSeconds: RETRY_AFTER },
			}),
			turnQueue,
			requests,
			mock<AgentQueuedTestStreamService>(),
		);
	}

	beforeEach(() => {
		turnQueue = mock<AgentTurnQueue>();
		({ requests, rows } = fakeRequests());
		now = 1_000_000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('result', () => {
		it('runs the turn here when no agent worker is up', async () => {
			const service = setup({ workers: false });

			await expect(service.result(payload, new AbortController().signal)).resolves.toEqual({
				outcome: 'local',
			});
			expect(requests.createPending).not.toHaveBeenCalled();
		});

		it('rejects the turn as busy when no worker is up and this main is full', async () => {
			const service = setup({ workers: false, roomHere: false });

			await expect(service.result(payload, new AbortController().signal)).resolves.toEqual({
				outcome: 'busy',
				retryAfterSeconds: RETRY_AFTER,
			});
			expect(requests.createPending).not.toHaveBeenCalled();
		});

		it('rejects the turn as busy without a row when too many turns wait', async () => {
			const service = setup({ queueFull: true });

			await expect(service.result(payload, new AbortController().signal)).resolves.toEqual({
				outcome: 'busy',
				retryAfterSeconds: RETRY_AFTER,
			});
			expect(requests.createPending).not.toHaveBeenCalled();
			expect(turnQueue.enqueueRequest).not.toHaveBeenCalled();
		});

		it('returns the result that a worker stores, and removes the row', async () => {
			const main = setup();
			const worker = setup({ instanceKey: 'worker-a' });
			const run = vi.fn(async () => ({ status: 200, body: { ok: true } }));
			worker.handle('webhook-respond', { mode: 'result', run });
			turnQueue.enqueueRequest.mockImplementation(async (requestId) => {
				setImmediate(() => {
					worker.runRequest(requestId).catch(() => {});
				});
			});

			const outcome = await main.result(payload, new AbortController().signal);

			expect(outcome).toEqual({ outcome: 'done', result: { status: 200, body: { ok: true } } });
			expect(run).toHaveBeenCalledWith(
				payload,
				expect.objectContaining({ requestId: expect.any(String) }),
			);
			expect(rows.size).toBe(0);
		});

		it('claims the turn itself when no worker claims it in time', async () => {
			const service = setup();

			const outcome = await service.result(payload, new AbortController().signal);

			expect(outcome).toEqual({ outcome: 'local' });
			expect(now - 1_000_000).toBeGreaterThanOrEqual(AgentTurnPlacement.FALLBACK_WAIT_MS);
			expect(requests.claim).toHaveBeenCalledWith(expect.any(String), 'main-a');
		});

		it('rejects the turn as busy when no process starts it within the wait limit', async () => {
			const service = setup({ queueMaxWaitSeconds: 10 });

			const outcome = await service.result(payload, new AbortController().signal);

			expect(outcome).toEqual({
				outcome: 'busy',
				retryAfterSeconds: RETRY_AFTER,
			});
			expect(now - 1_000_000).toBeGreaterThanOrEqual(10_000);
			expect(now - 1_000_000).toBeLessThan(AgentTurnPlacement.FALLBACK_WAIT_MS);
			expect(rows.size).toBe(0);
		});

		it('runs the turn itself when the job cannot be sent', async () => {
			const service = setup();
			turnQueue.enqueueRequest.mockRejectedValue(new Error('Redis unavailable'));

			await expect(service.result(payload, new AbortController().signal)).resolves.toEqual({
				outcome: 'local',
			});
		});

		it('reports a lost worker when the worker that claimed the turn leaves the registry', async () => {
			const service = setup({ activeInstanceKeys: ['main-a'] });
			turnQueue.enqueueRequest.mockImplementation(async (requestId) => {
				await requests.claim(requestId, 'worker-gone');
			});

			const outcome = await service.result(payload, new AbortController().signal);

			expect(outcome).toEqual({ outcome: 'lost' });
			expect(rows.size).toBe(0);
		});

		it('removes the row when the caller leaves, so the worker stops the turn', async () => {
			const service = setup();
			const abort = new AbortController();
			turnQueue.enqueueRequest.mockImplementation(async (requestId) => {
				await requests.claim(requestId, 'worker-a');
				setImmediate(() => abort.abort());
			});

			await expect(service.result(payload, abort.signal)).resolves.toEqual({ outcome: 'left' });
			expect(rows.size).toBe(0);
		});
	});

	describe('detached', () => {
		it('returns false instead of throwing when the request cannot be stored', async () => {
			const service = setup();
			requests.createPending.mockRejectedValue(new Error('database unavailable'));

			await expect(service.detached(payload, vi.fn())).resolves.toBe(false);
		});

		it('removes the row and returns false when the job cannot be sent', async () => {
			const service = setup();
			turnQueue.enqueueRequest.mockRejectedValue(new Error('Redis unavailable'));

			await expect(service.detached(payload, vi.fn())).resolves.toBe(false);
			expect(rows.size).toBe(0);
		});
	});

	describe('runRequest', () => {
		it('removes the row when it cannot store the result, so the main sees a lost turn', async () => {
			const service = setup({ instanceKey: 'worker-a' });
			service.handle('webhook-respond', { mode: 'result', run: async () => ({ ok: true }) });
			requests.complete.mockRejectedValue(new Error('database unavailable'));
			await requests.createPending('request-1', payload);

			await service.runRequest('request-1');

			expect(rows.size).toBe(0);
		});

		it('keeps the row of a stored result for the main to read', async () => {
			const service = setup({ instanceKey: 'worker-a' });
			service.handle('webhook-respond', { mode: 'result', run: async () => ({ ok: true }) });
			await requests.createPending('request-1', payload);

			await service.runRequest('request-1');

			expect(rows.get('request-1')?.result).toEqual({ ok: true });
		});

		it('does nothing when another process claimed the request', async () => {
			const service = setup({ instanceKey: 'worker-a' });
			const run = vi.fn();
			service.handle('webhook-respond', { mode: 'result', run });
			await requests.createPending('request-1', payload);
			await requests.claim('request-1', 'main-a');

			await service.runRequest('request-1');

			expect(run).not.toHaveBeenCalled();
		});

		it('drops a request of a kind that this process cannot run', async () => {
			const service = setup({ instanceKey: 'worker-a' });
			await requests.createPending('request-1', payload);

			await service.runRequest('request-1');

			expect(rows.size).toBe(0);
		});

		it('aborts the turn when the main removes the row', async () => {
			vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
			try {
				const service = setup({ instanceKey: 'worker-a' });
				let signal: AbortSignal | undefined;
				service.handle('webhook-respond', {
					mode: 'result',
					run: async (_, context) => {
						signal = context.abortSignal;
						rows.delete('request-1');
						await vi.advanceTimersByTimeAsync(AgentRemoteTurnService.WANTED_CHECK_INTERVAL_MS);
						return {};
					},
				});
				await requests.createPending('request-1', payload);

				await service.runRequest('request-1');

				expect(signal?.aborted).toBe(true);
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
