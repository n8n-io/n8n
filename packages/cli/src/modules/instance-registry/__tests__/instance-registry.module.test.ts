import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { InstanceRegistryReconciliationTask } from '../checks/instance-registry-reconciliation.task';
import { InstanceRegistryModule } from '../instance-registry.module';
import { InstanceRegistryService } from '../instance-registry.service';
import { StaleMemberCleanupTask } from '../stale-member-cleanup.task';

describe('InstanceRegistryModule', () => {
	const useBackend = (storageBackend: InstanceRegistryService['storageBackend']): void => {
		Container.set(InstanceRegistryService, mock<InstanceRegistryService>({ storageBackend }));
	};

	it('should register the cleanup and reconciliation system tasks when the registry uses Redis', async () => {
		useBackend('redis');

		const tasks = await new InstanceRegistryModule().systemTasks();

		expect(tasks).toEqual([StaleMemberCleanupTask, InstanceRegistryReconciliationTask]);
	});

	it('should register only the reconciliation system task when the registry uses memory storage', async () => {
		useBackend('memory');

		const tasks = await new InstanceRegistryModule().systemTasks();

		expect(tasks).toEqual([InstanceRegistryReconciliationTask]);
	});
});
