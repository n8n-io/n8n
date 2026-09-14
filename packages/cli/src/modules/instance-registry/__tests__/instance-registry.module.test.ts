import { InstanceRegistryReconciliationTask } from '../checks/instance-registry-reconciliation.task';
import { InstanceRegistryModule } from '../instance-registry.module';
import { StaleMemberCleanupTask } from '../stale-member-cleanup.task';

describe('InstanceRegistryModule', () => {
	it('should register the cleanup and reconciliation system tasks', async () => {
		const tasks = await new InstanceRegistryModule().systemTasks();

		expect(tasks).toEqual([StaleMemberCleanupTask, InstanceRegistryReconciliationTask]);
	});
});
