import { mock } from 'vitest-mock-extended';

import type { AgentTurnGate } from '../queue/agent-turn-gate.service';
import type { AgentTurnEntry } from '../queue/agent-turn-runner';
import { AgentTurnNotAdmittedError } from '../queue/agent-turn-runner';
import type {
	AgentTaskRunRequest,
	AgentWebhookRespondRequest,
	AgentWakeRequest,
} from '../queue/agent-turn-request.types';
import type { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import { testCluster } from './test-utils/cluster';
import { testTurns } from './test-utils/turns';

const webhook: AgentWebhookRespondRequest = {
	kind: 'webhook-respond',
	agentId: 'agent-1',
	input: 'Hi',
	approvalBaseUrl: 'https://n8n.example.com/agent-webhook/agent-1',
};

const fullGate = () =>
	mock<AgentTurnGate>({
		waitForRoom: vi.fn(async () => ({
			admitted: false as const,
			reason: 'main-at-limit' as const,
			retryAfterSeconds: 17,
		})),
	});

/** Resolves on the next turn of the event loop, after started handlers ran. */
const tick = async () => await new Promise((resolve) => setImmediate(resolve));

describe('InProcessTurnRunner', () => {
	it('sends the entries of a turn to its subscribers with consecutive sequence numbers', async () => {
		const { handlers, inProcess } = testTurns();
		handlers.handle('chat-resume', {
			mode: 'stream',
			run: async (_payload, { send }) => {
				send({ type: 'text-delta', id: 't', delta: 'a' });
				send({ type: 'text-delta', id: 't', delta: 'b' });
			},
			onError: () => {},
		});
		const entries: AgentTurnEntry[] = [];
		await inProcess.subscribe('turn-1', (entry) => entries.push(entry));

		await inProcess.start({ turnId: 'turn-1', payload: mock({ kind: 'chat-resume' }) });
		await inProcess.whenIdle();

		expect(entries.map((entry) => entry.sequence)).toEqual([1, 2, 3]);
		expect(entries[2]).toEqual({ sequence: 3, end: { outcome: 'done' } });
	});

	it('throws not admitted and runs nothing when the gate has no room', async () => {
		const run = vi.fn();
		const { handlers, inProcess } = testTurns({ gate: fullGate() });
		handlers.handle('webhook-respond', { mode: 'result', run });

		const start = inProcess.start({ turnId: 'turn-1', payload: webhook });

		await expect(start).rejects.toBeInstanceOf(AgentTurnNotAdmittedError);
		await expect(start).rejects.toMatchObject({ reason: 'main-at-limit', retryAfterSeconds: 17 });
		expect(run).not.toHaveBeenCalled();
		expect(inProcess.runningCount).toBe(0);
	});

	it('ends a cancelled turn as cancelled and aborts its handler', async () => {
		let signal: AbortSignal | undefined;
		const { handlers, inProcess } = testTurns();
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async (_payload, { abortSignal }) => {
				signal = abortSignal;
				await new Promise((resolve) => abortSignal.addEventListener('abort', resolve));
				return {};
			},
		});
		const entries: AgentTurnEntry[] = [];
		await inProcess.subscribe('turn-1', (entry) => entries.push(entry));

		await inProcess.start({ turnId: 'turn-1', payload: webhook });
		await tick();
		await inProcess.cancel('turn-1');
		await inProcess.whenIdle();

		expect(signal?.aborted).toBe(true);
		expect(entries).toEqual([{ sequence: 1, end: { outcome: 'cancelled' } }]);
	});

	it('skips the gate on an agent worker', async () => {
		const gate = fullGate();
		const { handlers, inProcess } = testTurns({
			gate,
			cluster: testCluster({ queue: true, instanceType: 'worker', instanceKey: 'worker-a' }),
		});
		handlers.handle('webhook-respond', { mode: 'result', run: async () => ({}) });

		await inProcess.start({ turnId: 'turn-1', payload: webhook });
		await inProcess.whenIdle();

		expect(gate.waitForRoom).not.toHaveBeenCalled();
	});
});

describe('AgentTurnDispatcher', () => {
	it('runs a result turn in this process when no agent worker is up', async () => {
		const { handlers, dispatcher, remote } = testTurns();
		const resultSpy = vi.spyOn(remote, 'result');
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async () => ({ status: 200 }),
		});

		await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
			outcome: 'done',
			result: { status: 200 },
		});
		expect(resultSpy).not.toHaveBeenCalled();
	});

	it('rejects a result turn as busy when this process has no room', async () => {
		const run = vi.fn();
		const { handlers, dispatcher } = testTurns({ gate: fullGate() });
		handlers.handle('webhook-respond', { mode: 'result', run });

		await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
			outcome: 'busy',
			retryAfterSeconds: 17,
		});
		expect(run).not.toHaveBeenCalled();
	});

	it('sends a busy error to a stream turn that this process rejects', async () => {
		const { dispatcher } = testTurns({ gate: fullGate() });
		const send = vi.fn();

		await dispatcher.stream(
			mock({ kind: 'chat-resume' }),
			{ send, abortSignal: new AbortController().signal },
			{ stopOnLeave: true },
		);

		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'error', errorCode: 'main_busy', retryAfterSeconds: 17 }),
		);
	});

	it('stops a result turn when its caller leaves', async () => {
		let signal: AbortSignal | undefined;
		const { handlers, dispatcher } = testTurns();
		handlers.handle('webhook-respond', {
			mode: 'result',
			run: async (_payload, { abortSignal }) => {
				signal = abortSignal;
				await new Promise((resolve) => abortSignal.addEventListener('abort', resolve));
				return {};
			},
		});
		const leave = new AbortController();

		const result = dispatcher.result(webhook, leave.signal);
		await tick();
		leave.abort();

		await expect(result).resolves.toEqual({ outcome: 'left' });
		expect(signal?.aborted).toBe(true);
	});

	it('calls onRejected for a detached turn that this process rejects', async () => {
		const run = vi.fn();
		const onRejected = vi.fn(async () => {});
		const { handlers, dispatcher } = testTurns({ gate: fullGate() });
		handlers.handle('task-run', { mode: 'detached', run });

		await dispatcher.detached(mock<AgentTaskRunRequest>({ kind: 'task-run' }), {
			workerCapable: true,
			onRejected,
		});

		expect(onRejected).toHaveBeenCalledTimes(1);
		expect(run).not.toHaveBeenCalled();
	});

	it('asks the gate to wait for room for a wake, instead of rejecting it', async () => {
		const gate = mock<AgentTurnGate>({
			waitForRoom: vi.fn(async () => ({ admitted: true as const })),
		});
		const { handlers, dispatcher, inProcess } = testTurns({ gate });
		handlers.handle('wake', { mode: 'detached', run: async () => {} });

		await dispatcher.detached(mock<AgentWakeRequest>({ kind: 'wake' }), { workerCapable: true });
		await inProcess.whenIdle();

		expect(gate.waitForRoom).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ untilRoom: true }),
		);
	});

	it('sends a turn to an agent worker when one is up', async () => {
		const run = vi.fn();
		const placement = mock<AgentTurnPlacement>({
			dispatchEnabled: true,
			workersAvailable: async () => true,
		});
		const { handlers, dispatcher, remote } = testTurns({ placement });
		handlers.handle('webhook-respond', { mode: 'result', run });
		const remoteResult = vi
			.spyOn(remote, 'result')
			.mockResolvedValue({ outcome: 'done', result: { status: 202 } });

		await expect(dispatcher.result(webhook, new AbortController().signal)).resolves.toEqual({
			outcome: 'done',
			result: { status: 202 },
		});
		expect(remoteResult).toHaveBeenCalledTimes(1);
		expect(run).not.toHaveBeenCalled();
	});
});
