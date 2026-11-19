import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { RoleMappingProxyService } from '@n8n/backend-services/auth';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { ProvisioningModule } from '../provisioning.module';
import { ProvisioningRoleDeletionChecker } from '../role-deletion-checker.ee';
import { ProvisioningRoleMappingProvider } from '../role-mapping-provider.ee';

describe('ProvisioningModule', () => {
	describe('init on a worker', () => {
		const provider = mock<ProvisioningRoleMappingProvider>();

		beforeAll(async () => {
			Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType: 'worker' }));
			Container.set(ProvisioningRoleDeletionChecker, mock<ProvisioningRoleDeletionChecker>());
			Container.set(ProvisioningRoleMappingProvider, provider);
			await new ProvisioningModule().init();
		});

		it('registers the role mapping provider on the core proxy', () => {
			expect(Container.get(RoleMappingProxyService).getProvider()).toBe(provider);
		});
	});

	it('registers itself on main, webhook and worker instances', () => {
		const entry = Container.get(ModuleMetadata).get('provisioning');

		expect(entry).toBeDefined();
		expect(entry?.instanceTypes).toEqual(['main', 'webhook', 'worker']);
	});
});
