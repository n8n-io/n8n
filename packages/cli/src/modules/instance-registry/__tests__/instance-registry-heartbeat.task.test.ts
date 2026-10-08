import { mock } from 'vitest-mock-extended';

import { InstanceRegistryHeartbeatTask } from '../instance-registry-heartbeat.task';
import type { InstanceRegistryService } from '../instance-registry.service';

const instanceRegistryService = mock<InstanceRegistryService>();

let task: InstanceRegistryHeartbeatTask;

beforeEach(() => {
	vi.clearAllMocks();
	task = new InstanceRegistryHeartbeatTask(instanceRegistryService);
});

describe('InstanceRegistryHeartbeatTask', () => {
	it('should refresh the entry of its own process every 30 seconds', () => {
		expect(task.name).toBe('instance-registry-heartbeat');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 30 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({
			scope: 'instance',
			instanceTypes: ['main', 'worker', 'webhook'],
		});
	});

	describe('run', () => {
		it('should heartbeat through the service', async () => {
			await task.run();

			expect(instanceRegistryService.heartbeat).toHaveBeenCalledTimes(1);
		});

		it('should let a failure reach the runner', async () => {
			const error = new Error('Redis down');
			instanceRegistryService.heartbeat.mockRejectedValue(error);

			await expect(task.run()).rejects.toBe(error);
		});
	});
});
