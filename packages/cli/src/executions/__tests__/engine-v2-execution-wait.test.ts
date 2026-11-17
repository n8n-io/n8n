import type { ExecutionSnapshot } from '@n8n/engine';

import { waitForEngineV2Execution } from '../engine-v2-execution-wait';
import type { ExecutionIdV2 } from '../execution-id';

const id = '019a0000-0000-7000-8000-000000000001' as ExecutionIdV2;

const snapshot = (status: ExecutionSnapshot['status']) => ({ status }) as ExecutionSnapshot;

describe('waitForEngineV2Execution', () => {
	test('settles once the data plane reports a terminal status', async () => {
		const getExecution = vi
			.fn()
			.mockResolvedValueOnce(snapshot('running'))
			.mockResolvedValueOnce(snapshot('completed'));
		const cancelExecution = vi.fn();

		const outcome = await waitForEngineV2Execution({
			dataPlane: { getExecution, cancelExecution },
			executionId: id,
			timeoutMs: 5_000,
			pollIntervalMs: 1,
		});

		expect(outcome).toEqual({ kind: 'settled' });
		expect(getExecution).toHaveBeenCalledTimes(2);
		expect(cancelExecution).not.toHaveBeenCalled();
	});

	test('reports a run the data plane does not have', async () => {
		const outcome = await waitForEngineV2Execution({
			dataPlane: { getExecution: vi.fn().mockResolvedValue(undefined), cancelExecution: vi.fn() },
			executionId: id,
			timeoutMs: 5_000,
		});

		expect(outcome).toEqual({ kind: 'missing' });
	});

	// An abandoned run keeps writing to the user's systems, so a timeout cancels it.
	test('cancels the run at the timeout', async () => {
		const cancelExecution = vi.fn().mockResolvedValue({ kind: 'cancelled' });

		const outcome = await waitForEngineV2Execution({
			dataPlane: { getExecution: vi.fn().mockResolvedValue(snapshot('running')), cancelExecution },
			executionId: id,
			timeoutMs: 0,
		});

		expect(outcome).toEqual({ kind: 'timeout' });
		expect(cancelExecution).toHaveBeenCalledWith(id);
	});
});
