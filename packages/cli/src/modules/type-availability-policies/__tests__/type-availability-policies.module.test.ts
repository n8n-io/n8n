import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata, ModuleMetadata, PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

// Importing the module runs the @BackendModule decorator, registering its metadata.
import { TypeAvailabilityPoliciesModule } from '../type-availability-policies.module';

describe('TypeAvailabilityPoliciesModule', () => {
	it('registers itself under the correct module name', () => {
		const entry = Container.get(ModuleMetadata).get('type-availability-policies');

		expect(entry).toBeDefined();
	});

	it('is gated by the type availability policies license feature, so an unlicensed instance skips init', () => {
		const entry = Container.get(ModuleMetadata).get('type-availability-policies');

		expect(entry?.licenseFlag).toBe(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
	});

	// The available-types controller injects the node registry, whose import chain takes
	// several seconds to transform — more than the default per-test timeout.
	//
	// Asserted by class name, read off the registry `init()` itself populated — the same
	// reason the check-registration test below never imports the check class directly.
	// Importing a controller module here (even just to get a class reference to look up)
	// would register it via its own `@RestController`/`@Get` decorators regardless of
	// whether `init()` still imports it, making the assertion pass even after a regression.
	it('registers the node-types and credential-types instance, project and available-types controllers on init', async () => {
		const module = new TypeAvailabilityPoliciesModule();

		await module.init();

		const registry = Container.get(ControllerRegistryMetadata);
		const routeCountByName = new Map(
			Array.from(registry.controllerClasses).map((controllerClass) => [
				controllerClass.name,
				registry.getControllerMetadata(controllerClass).routes.size,
			]),
		);

		for (const name of [
			'TypeAvailabilityPolicyInstanceController',
			'TypeAvailabilityPolicyProjectController',
			'CredentialTypePolicyInstanceController',
			'CredentialTypePolicyProjectController',
			'AvailableTypesController',
		]) {
			expect(routeCountByName.get(name)).toBeGreaterThan(0);
		}
	}, 30_000);

	// Registration is what makes the check run at all: the decision service reads the registry
	// per decision, so a missing import here is silent enforcement loss.
	//
	// Asserted by class name, because importing the check to compare identities would run
	// `@PolicyCheck()` here and register it, and reading `id` off an instance would construct
	// its repositories. Either one would make this pass with `init()` no longer importing it.
	it('registers the node type policy check on init', async () => {
		const module = new TypeAvailabilityPoliciesModule();

		await module.init();

		const registered = Container.get(PolicyCheckMetadata)
			.getClasses()
			.map((checkClass) => checkClass.name);

		expect(registered).toContain('NodeTypePolicyCheck');
	}, 30_000);

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
