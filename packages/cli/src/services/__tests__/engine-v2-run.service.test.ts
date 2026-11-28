import { mockInstance } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import type { LifecycleEvent } from '@n8n/engine';
import { UnexpectedError } from '@n8n/errors';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	EngineV2LifecycleSubscriptions,
	type LifecycleEventListener,
} from '@/modules/engine-v2/lifecycle-events/engine-lifecycle-event-subscriptions';
import {
	type EngineDataPlaneProxyService,
	EngineV2UnavailableError,
} from '@/services/engine-data-plane-proxy.service';
import type { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import { type EngineV2RunOutcome, EngineV2RunService } from '@/services/engine-v2-run.service';
import type { WorkflowRunner } from '@/workflow-runner';

const data = {
	executionMode: 'manual',
	workflowData: { id: 'wf-1' },
} as IWorkflowExecutionDataProcess;
const options = { timeoutMs: 1_000 };
const success: EngineV2RunOutcome = { kind: 'finished', status: 'success' };

describe('EngineV2RunService', () => {
	const runner = mock<WorkflowRunner>();
	const dispatcher = mock<EngineV2Dispatcher>();
	const proxy = mock<EngineDataPlaneProxyService>();
	const subscriptions = mockInstance(EngineV2LifecycleSubscriptions);
	const removeListener = vi.fn<() => void>();
	const runs = new EngineV2RunService(runner, dispatcher, proxy);
	let listener: LifecycleEventListener | undefined;

	const listenedId = () => subscriptions.listen.mock.calls[0][0];
	const emit = (type: LifecycleEvent['type']) =>
		listener?.({
			type,
			executionId: listenedId(),
			workflowId: 'wf-1',
			at: '2026-11-27T10:00:00.000Z',
			mode: 'manual',
			hostMode: 'manual',
		} as LifecycleEvent);
	const emitWhileStarting = (...types: Array<LifecycleEvent['type']>) =>
		runner.run.mockImplementation(async ({ engineV2ExecutionId }) => {
			for (const type of types) emit(type);
			return engineV2ExecutionId ?? '';
		});
	const until = async (done: () => boolean) => {
		while (!done()) await new Promise(setImmediate);
	};
	const untilWaiting = async () => {
		await until(() => runner.run.mock.calls.length > 0);
		await new Promise(setImmediate);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		listener = undefined;
		dispatcher.routesToEngineV2.mockReturnValue(true);
		proxy.isAvailable.mockReturnValue(true);
		proxy.cancelExecution.mockResolvedValue(undefined);
		subscriptions.listen.mockImplementation(async (_executionId, added) => {
			listener = added;
			return removeListener;
		});
		emitWhileStarting('execution:completed');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('routes a run as the dispatcher does', () => {
		dispatcher.routesToEngineV2.mockReturnValue(false);

		expect(runs.routesToEngineV2(data)).toBe(false);
		expect(dispatcher.routesToEngineV2).toHaveBeenCalledWith(data);
	});

	it.each<[string, () => void, number, typeof UnexpectedError]>([
		[
			'a run that does not go to engine v2',
			() => dispatcher.routesToEngineV2.mockReturnValue(false),
			options.timeoutMs,
			UnexpectedError,
		],
		['a timeout above 24 hours', () => {}, Time.days.toMilliseconds + 1, UnexpectedError],
		[
			'a run with EngineV2UnavailableError when engine v2 is not available',
			() => proxy.isAvailable.mockReturnValue(false),
			options.timeoutMs,
			EngineV2UnavailableError,
		],
	])('refuses %s, and listens to and starts nothing', async (_name, arrange, timeoutMs, error) => {
		arrange();

		await expect(runs.runAndWait(data, { timeoutMs })).rejects.toThrow(error);
		expect(subscriptions.listen).not.toHaveBeenCalled();
		expect(runner.run).not.toHaveBeenCalled();
	});

	it('listens to the execution before it starts the run', async () => {
		await runs.runAndWait(data, options);

		expect(subscriptions.listen.mock.invocationCallOrder[0]).toBeLessThan(
			runner.run.mock.invocationCallOrder[0],
		);
	});

	it('starts the run under the id it listens to, and returns that id', async () => {
		const { executionId } = await runs.runAndWait(data, options);

		expect(runner.run).toHaveBeenCalledWith({ ...data, engineV2ExecutionId: listenedId() });
		expect(executionId).toBe(listenedId());
	});

	it.each([
		['execution:completed', 'success'],
		['execution:failed', 'error'],
		['execution:cancelled', 'canceled'],
	] as const)(
		'reports %s that arrives while the run starts as finished with status %s',
		async (type, status) => {
			emitWhileStarting(type);

			const { outcome } = await runs.runAndWait(data, options);

			expect(outcome).toEqual({ kind: 'finished', status });
			expect(proxy.cancelExecution).not.toHaveBeenCalled();
		},
	);

	it('reports an end that arrives after the run has started', async () => {
		emitWhileStarting();
		const result = runs.runAndWait(data, options);
		await untilWaiting();

		emit('execution:failed');

		await expect(result).resolves.toMatchObject({ outcome: { kind: 'finished', status: 'error' } });
	});

	it('keeps the first end when a second end event arrives', async () => {
		emitWhileStarting('execution:completed', 'execution:failed');

		await expect(runs.runAndWait(data, options)).resolves.toMatchObject({ outcome: success });
	});

	it('ignores events that do not end the execution, and resolves as timeout', async () => {
		emitWhileStarting('execution:started', 'step:started', 'step:waiting');
		const result = runs.runAndWait(data, options);
		await untilWaiting();

		await vi.advanceTimersByTimeAsync(options.timeoutMs);

		await expect(result).resolves.toMatchObject({ outcome: { kind: 'timeout' } });
	});

	it('counts the timeout from the moment the run has started', async () => {
		runner.run.mockImplementation(async ({ engineV2ExecutionId }) => {
			await new Promise((resolve) => setTimeout(resolve, 500));
			return engineV2ExecutionId ?? '';
		});
		let settled = false;
		const result = runs.runAndWait(data, options).finally(() => (settled = true));
		await untilWaiting();

		await vi.advanceTimersByTimeAsync(500 + options.timeoutMs - 1);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);

		await expect(result).resolves.toMatchObject({ outcome: { kind: 'timeout' } });
	});

	it('waits up to a timeout of exactly 24 hours', async () => {
		emitWhileStarting();
		const result = runs.runAndWait(data, { timeoutMs: Time.days.toMilliseconds });
		await untilWaiting();

		await vi.advanceTimersByTimeAsync(Time.days.toMilliseconds - 1);
		emit('execution:completed');

		await expect(result).resolves.toMatchObject({ outcome: success });
	});

	it('resolves as aborted when the signal aborts while it waits', async () => {
		emitWhileStarting();
		const controller = new AbortController();
		const result = runs.runAndWait(data, { ...options, abortSignal: controller.signal });
		await untilWaiting();

		controller.abort();

		await expect(result).resolves.toMatchObject({ outcome: { kind: 'aborted' } });
	});

	it('resolves as aborted when the signal is already aborted and no end has arrived', async () => {
		emitWhileStarting();

		await expect(
			runs.runAndWait(data, { ...options, abortSignal: AbortSignal.abort() }),
		).resolves.toMatchObject({ outcome: { kind: 'aborted' } });
	});

	it('reports an end that arrived while the run started, although the signal is already aborted', async () => {
		await expect(
			runs.runAndWait(data, { ...options, abortSignal: AbortSignal.abort() }),
		).resolves.toMatchObject({ outcome: success });
	});

	it.each<[string, (controller: AbortController) => unknown]>([
		['the run ends', () => emit('execution:completed')],
		['the time runs out', async () => await vi.advanceTimersByTimeAsync(options.timeoutMs)],
		['the signal aborts', (controller) => controller.abort()],
	])(
		'cancels nothing, and clears its timer, its abort listener and its lifecycle listener when %s',
		async (_name, end) => {
			emitWhileStarting();
			const controller = new AbortController();
			const removeEventListener = vi.spyOn(controller.signal, 'removeEventListener');
			const result = runs.runAndWait(data, { ...options, abortSignal: controller.signal });
			await untilWaiting();

			await end(controller);
			await result;

			expect(proxy.cancelExecution).not.toHaveBeenCalled();
			expect(vi.getTimerCount()).toBe(0);
			expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
			expect(removeListener).toHaveBeenCalledTimes(1);
		},
	);

	it('passes on the error of listen and starts no run', async () => {
		const failure = new Error('no subscription');
		subscriptions.listen.mockRejectedValueOnce(failure);

		await expect(runs.runAndWait(data, options)).rejects.toBe(failure);
		expect(runner.run).not.toHaveBeenCalled();
	});

	it.each<[string, () => void, boolean]>([
		['answers', () => {}, true],
		['fails', () => proxy.cancelExecution.mockRejectedValue(new Error('data plane down')), true],
		[
			'does not answer in 5 seconds',
			() => proxy.cancelExecution.mockReturnValue(new Promise<never>(() => {})),
			false,
		],
	])(
		'cancels the minted id, removes its lifecycle listener and passes on the start error when the start fails and the cancel %s',
		async (_name, arrange, settlesBefore5Seconds) => {
			const failure = new Error('refused');
			runner.run.mockRejectedValue(failure);
			arrange();

			let settled = false;
			const result = runs.runAndWait(data, options).finally(() => (settled = true));
			const assertion = expect(result).rejects.toBe(failure);
			await until(() => proxy.cancelExecution.mock.calls.length > 0);
			await vi.advanceTimersByTimeAsync(4_999);
			expect(settled).toBe(settlesBefore5Seconds);
			await vi.advanceTimersByTimeAsync(1);

			await assertion;
			expect(proxy.cancelExecution).toHaveBeenCalledWith(listenedId());
			expect(removeListener).toHaveBeenCalledTimes(1);
		},
	);

	it('refuses a run that started under a different id, removes its lifecycle listener and cancels nothing', async () => {
		runner.run.mockResolvedValue('other-id');

		await expect(runs.runAndWait(data, options)).rejects.toThrow(UnexpectedError);
		expect(removeListener).toHaveBeenCalledTimes(1);
		expect(proxy.cancelExecution).not.toHaveBeenCalled();
	});
});
