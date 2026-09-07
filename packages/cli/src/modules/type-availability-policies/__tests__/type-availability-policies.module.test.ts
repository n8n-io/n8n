import { ControllerRegistryMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { TypeAvailabilityPoliciesModule } from '../type-availability-policies.module';

describe('TypeAvailabilityPoliciesModule', () => {
	it('registers itself under the correct module name', () => {
		const entry = Container.get(ModuleMetadata).get('type-availability-policies');

		expect(entry).toBeDefined();
	});

	it('registers the instance controller on init', async () => {
		const module = new TypeAvailabilityPoliciesModule();

		await module.init();

		const { TypeAvailabilityPolicyInstanceController } = await import(
			'../type-availability-policy-instance.controller.js'
		);
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			TypeAvailabilityPolicyInstanceController as never,
		);

		expect(metadata.routes.size).toBeGreaterThan(0);
	});

	it('exposes its entities so the datasource picks them up', async () => {
		const module = new TypeAvailabilityPoliciesModule();

		const entities = (await module.entities()) as unknown as Array<{ name: string }>;

		expect(entities.map((entity) => entity.name)).toEqual([
			'TypeAvailabilityPolicy',
			'TypeAvailabilityPolicyScope',
			'TypeAvailabilityPolicyAttachment',
		]);
	});
});
