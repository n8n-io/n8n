import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { CredentialTypePolicyInstanceController } from '../credential-type-policy-instance.controller';

/**
 * Every route on this controller must be owner-only (`@GlobalScope`) on
 * `credentialTypePolicy:manage` — a separate permission from `nodeTypePolicy:manage`, never
 * `@ProjectScope` and never left ungated. Every route must also require the node type policies
 * license feature, same as the sibling node-types controller.
 */
describe('CredentialTypePolicyInstanceController route access scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		CredentialTypePolicyInstanceController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));

	it('registers at least one route', () => {
		expect(routeCases.length).toBeGreaterThan(0);
	});

	it.each(routeCases)(
		'$handlerName is gated by a global-only credentialTypePolicy:manage check',
		({ route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(true);
			expect(route.accessScope?.scope).toBe('credentialTypePolicy:manage');
		},
	);

	it('is gated by the node type policies license feature', () => {
		for (const { route } of routeCases) {
			expect(route.licenseFeature).toBe(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
		}
	});
});
