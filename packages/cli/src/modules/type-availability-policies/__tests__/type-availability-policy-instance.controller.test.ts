import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { TypeAvailabilityPolicyInstanceController } from '../type-availability-policy-instance.controller';

/**
 * Every route on this controller must be owner-only (`@GlobalScope`), never
 * `@ProjectScope` and never left ungated — node type availability policy is an
 * instance-wide setting, per IAM-1327's `nodeTypePolicy:manage` scope.
 */
describe('TypeAvailabilityPolicyInstanceController route access scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		TypeAvailabilityPolicyInstanceController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));

	it('registers at least one route', () => {
		expect(routeCases.length).toBeGreaterThan(0);
	});

	it.each(routeCases)(
		'$handlerName is gated by a global-only nodeTypePolicy:manage check',
		({ route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(true);
			expect(route.accessScope?.scope).toBe('nodeTypePolicy:manage');
		},
	);

	it('is not gated by a license flag (licensing decision left open by IAM-1141)', () => {
		for (const { route } of routeCases) {
			expect(route.licenseFeature).toBeUndefined();
		}
	});
});
