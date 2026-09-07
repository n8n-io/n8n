import { LICENSE_FEATURES } from '@n8n/constants';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { TypeAvailabilityPoliciesModule } from '../type-availability-policies.module';

describe('TypeAvailabilityPoliciesModule', () => {
	it('registers itself under the correct module name', () => {
		const entry = Container.get(ModuleMetadata).get('type-availability-policies');

		expect(entry).toBeDefined();
	});

	it('is gated behind the node type policies license feature', () => {
		const entry = Container.get(ModuleMetadata).get('type-availability-policies');

		expect(entry?.licenseFlag).toBe(LICENSE_FEATURES.NODE_TYPE_POLICIES);
	});

	it('initializes with no side effects (empty scaffold)', async () => {
		const module = new TypeAvailabilityPoliciesModule();

		await expect(module.init()).resolves.toBeUndefined();
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
