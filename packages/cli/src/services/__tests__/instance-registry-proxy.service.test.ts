import type { InstanceRegistration } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { InstanceRegistryProvider } from '../instance-registry-proxy.service';
import { InstanceRegistryProxyService } from '../instance-registry-proxy.service';

const makeRegistration = (overrides: Partial<InstanceRegistration> = {}): InstanceRegistration => ({
	schemaVersion: 1,
	instanceKey: 'instance-key-1',
	hostId: 'main-abc123',
	instanceType: 'main',
	instanceRole: 'leader',
	version: '1.0.0',
	registeredAt: 1_000,
	lastSeen: 2_000,
	...overrides,
});

describe('InstanceRegistryProxyService', () => {
	let service: InstanceRegistryProxyService;

	beforeEach(() => {
		service = new InstanceRegistryProxyService();
	});

	describe('without a registered provider', () => {
		it('getAllInstances returns an empty array', async () => {
			await expect(service.getAllInstances()).resolves.toEqual([]);
		});

		it('getLocalInstance returns null', () => {
			expect(service.getLocalInstance()).toBeNull();
		});
	});

	describe('with a registered provider', () => {
		it('getAllInstances delegates to the provider', async () => {
			const instances = [makeRegistration(), makeRegistration({ instanceKey: 'instance-key-2' })];
			const provider = mock<InstanceRegistryProvider>();
			provider.getAllInstances.mockResolvedValue(instances);

			service.registerProvider(provider);

			await expect(service.getAllInstances()).resolves.toBe(instances);
			expect(provider.getAllInstances).toHaveBeenCalledTimes(1);
			expect(provider.getLocalInstance).not.toHaveBeenCalled();
		});

		it('getLocalInstance delegates to the provider', () => {
			const local = makeRegistration();
			const provider = mock<InstanceRegistryProvider>();
			provider.getLocalInstance.mockReturnValue(local);

			service.registerProvider(provider);

			expect(service.getLocalInstance()).toBe(local);
			expect(provider.getLocalInstance).toHaveBeenCalledTimes(1);
			expect(provider.getAllInstances).not.toHaveBeenCalled();
		});

		it('getLocalInstance forwards a null from the provider', () => {
			const provider = mock<InstanceRegistryProvider>();
			provider.getLocalInstance.mockReturnValue(null);

			service.registerProvider(provider);

			expect(service.getLocalInstance()).toBeNull();
		});
	});

	describe('re-registration', () => {
		it('uses the most recently registered provider', async () => {
			const firstProvider = mock<InstanceRegistryProvider>();
			firstProvider.getAllInstances.mockResolvedValue([makeRegistration({ instanceKey: 'first' })]);

			const secondProvider = mock<InstanceRegistryProvider>();
			const secondInstances = [makeRegistration({ instanceKey: 'second' })];
			secondProvider.getAllInstances.mockResolvedValue(secondInstances);

			service.registerProvider(firstProvider);
			service.registerProvider(secondProvider);

			await expect(service.getAllInstances()).resolves.toBe(secondInstances);
			expect(firstProvider.getAllInstances).not.toHaveBeenCalled();
			expect(secondProvider.getAllInstances).toHaveBeenCalledTimes(1);
		});
	});
});
