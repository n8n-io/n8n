import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { InboundAuthCoreModule } from '../inbound-auth-core.module';

describe('InboundAuthCoreModule', () => {
	it('registers itself on main, webhook and worker instances without a license flag', () => {
		const entry = Container.get(ModuleMetadata).get('inbound-auth-core');

		expect(entry).toBeDefined();
		expect(entry?.instanceTypes).toEqual(['main', 'webhook', 'worker']);
		expect(entry?.licenseFlag).toBeUndefined();
	});

	it('exposes its entities so the datasource picks them up', async () => {
		const module = new InboundAuthCoreModule();

		const entities = (await module.entities()) as unknown as Array<{ name: string }>;

		expect(entities.map((entity) => entity.name)).toEqual([
			'TrustedSourceEntity',
			'TrustedSourceIdentityEntity',
		]);
	});
});
