import { mock } from 'vitest-mock-extended';

import type { CheckService } from '../checks/check.service';
import { InstanceRegistryReconciliationTask } from '../checks/instance-registry-reconciliation.task';

const checkService = mock<CheckService>();

let task: InstanceRegistryReconciliationTask;

beforeEach(() => {
	vi.clearAllMocks();
	task = new InstanceRegistryReconciliationTask(checkService);
});

describe('InstanceRegistryReconciliationTask', () => {
	it('should declare the reconciliation cadence', () => {
		expect(task.name).toBe('instance-registry-reconciliation');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 180 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
		expect(task.runOnTakeover).toBe(true);
	});

	describe('run', () => {
		it('should run one reconciliation cycle with the run signal', async () => {
			const signal = new AbortController().signal;

			await task.run(signal);

			expect(checkService.reconcile).toHaveBeenCalledTimes(1);
			expect(checkService.reconcile).toHaveBeenCalledWith(signal);
		});

		it('should let a failed cycle reach the runner', async () => {
			const error = new Error('boom');
			checkService.reconcile.mockRejectedValue(error);

			await expect(task.run(new AbortController().signal)).rejects.toBe(error);
		});
	});
});
