import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { TypeAvailabilityPolicyProjectController } from '../type-availability-policy-project.controller';

/**
 * Every route on this controller must be project-scoped (`@ProjectScope`), never
 * `@GlobalScope` and never left ungated — a project admin self-governs their own project's
 * row, per IAM-1142's RFC decision. Every route must also require the node type policies
 * license feature, same as the instance controller.
 */
describe('TypeAvailabilityPolicyProjectController route access scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		TypeAvailabilityPolicyProjectController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));

	it('registers at least one route', () => {
		expect(routeCases.length).toBeGreaterThan(0);
	});

	it.each(routeCases)(
		'$handlerName is gated by a project-scoped nodeTypePolicy:manage check',
		({ route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope).toBe('nodeTypePolicy:manage');
		},
	);

	it('is gated by the node type policies license feature', () => {
		for (const { route } of routeCases) {
			expect(route.licenseFeature).toBe(LICENSE_FEATURES.NODE_TYPE_POLICIES);
		}
	});
});
