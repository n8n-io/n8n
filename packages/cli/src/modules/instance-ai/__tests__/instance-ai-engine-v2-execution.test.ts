import type { ExecutionSnapshot } from '@n8n/engine';
import { mock } from 'vitest-mock-extended';

import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import { waitForEngineV2Execution } from '../instance-ai-engine-v2-execution';

const EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';

const snapshot = (status: ExecutionSnapshot['status']) => ({ status }) as ExecutionSnapshot;

describe('waitForEngineV2Execution', () => {
	const dataPlane = mock<EngineDataPlaneProxyService>();

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('completes once the data plane reports a terminal status', async () => {
		dataPlane.getExecution
			.mockResolvedValueOnce(snapshot('queued'))
			.mockResolvedValueOnce(snapshot('running'))
			.mockResolvedValueOnce(snapshot('completed'));

		const outcome = waitForEngineV2Execution({
			dataPlane,
			executionId: EXECUTION_ID,
			timeoutMs: 10_000,
			pollIntervalMs: 50,
		});
		await vi.advanceTimersByTimeAsync(200);

		await expect(outcome).resolves.toEqual({ kind: 'completed' });
		expect(dataPlane.getExecution).toHaveBeenCalledTimes(3);
	});

	it('treats a failed run as completed, since the result carries the error', async () => {
		dataPlane.getExecution.mockResolvedValue(snapshot('failed'));

		const outcome = waitForEngineV2Execution({
			dataPlane,
			executionId: EXECUTION_ID,
			timeoutMs: 10_000,
			pollIntervalMs: 50,
		});
		await vi.advanceTimersByTimeAsync(0);

		await expect(outcome).resolves.toEqual({ kind: 'completed' });
	});

	it('cancels the run on the data plane when the wait times out', async () => {
		dataPlane.getExecution.mockResolvedValue(snapshot('running'));

		const outcome = waitForEngineV2Execution({
			dataPlane,
			executionId: EXECUTION_ID,
			timeoutMs: 120,
			pollIntervalMs: 50,
		});
		await vi.advanceTimersByTimeAsync(200);

		await expect(outcome).resolves.toEqual({
			kind: 'cancelled',
			reason: 'timeout',
			message: 'Execution timed out after 120ms and was cancelled',
		});
		expect(dataPlane.cancelExecution).toHaveBeenCalledWith(EXECUTION_ID);
	});

	it('cancels the run on the data plane when the caller aborts', async () => {
		dataPlane.getExecution.mockResolvedValue(snapshot('running'));
		const controller = new AbortController();

		const outcome = waitForEngineV2Execution({
			dataPlane,
			executionId: EXECUTION_ID,
			timeoutMs: 10_000,
			pollIntervalMs: 50,
			abortSignal: controller.signal,
		});
		await vi.advanceTimersByTimeAsync(60);
		controller.abort();
		await vi.advanceTimersByTimeAsync(60);

		await expect(outcome).resolves.toEqual({
			kind: 'cancelled',
			reason: 'abort',
			message: 'Execution was cancelled',
		});
		expect(dataPlane.cancelExecution).toHaveBeenCalledWith(EXECUTION_ID);
	});

	it('completes when the data plane no longer knows the execution', async () => {
		dataPlane.getExecution.mockResolvedValue(undefined);

		const outcome = waitForEngineV2Execution({
			dataPlane,
			executionId: EXECUTION_ID,
			timeoutMs: 10_000,
			pollIntervalMs: 50,
		});
		await vi.advanceTimersByTimeAsync(0);

		await expect(outcome).resolves.toEqual({ kind: 'completed' });
	});
});
