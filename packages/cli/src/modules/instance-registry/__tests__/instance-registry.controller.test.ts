import type { InstanceRegistration } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { InstanceRegistryController } from '../instance-registry.controller';
import type { InstanceRegistryService } from '../instance-registry.service';

const makeRegistration = (overrides: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
	schemaVersion: 1,
	instanceKey: 'key-1',
	hostId: 'host-1',
	instanceType: 'main',
	instanceRole: 'leader',
	version: '1.0.0',
	registeredAt: Date.now(),
	lastSeen: Date.now(),
	...overrides,
});

describe('InstanceRegistryController', () => {
	let controller: InstanceRegistryController;
	let service: jest.Mocked<InstanceRegistryService>;

	beforeEach(() => {
		service = mock<InstanceRegistryService>();
		controller = new InstanceRegistryController(service);
	});

	describe('getClusterInfo', () => {
		it('should return instances from the service', async () => {
			const instances = [
				makeRegistration({ instanceKey: 'key-1', hostId: 'host-1' }),
				makeRegistration({ instanceKey: 'key-2', hostId: 'host-2', instanceType: 'worker' }),
			];
			service.getAllInstances.mockResolvedValue(instances);

			const result = await controller.getClusterInfo();

			expect(result.instances).toEqual(instances);
			expect(result.versionMismatch).toBeNull();
		});

		it('should return empty instances when no instances are registered', async () => {
			service.getAllInstances.mockResolvedValue([]);

			const result = await controller.getClusterInfo();

			expect(result.instances).toEqual([]);
			expect(result.versionMismatch).toBeNull();
		});
	});
});
