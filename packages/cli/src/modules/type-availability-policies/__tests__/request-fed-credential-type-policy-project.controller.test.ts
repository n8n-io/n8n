import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { RequestFedCredentialTypePolicyProjectController } from '../request-fed-credential-type-policy-project.controller';

/**
 * Every route on this controller must be project-scoped (`@ProjectScope`) on
 * `credentialTypePolicy:manageRequestFed`, never `@GlobalScope` and never left ungated — a project admin
 * self-governs their own project's row, same as the sibling node-types controller. Every route
 * must also require the type availability policies license feature.
 */
describe('RequestFedCredentialTypePolicyProjectController route access scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		RequestFedCredentialTypePolicyProjectController as never,
	);
	const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));

	it('registers at least one route', () => {
		expect(routeCases.length).toBeGreaterThan(0);
	});

	it.each(routeCases)(
		'$handlerName is gated by a project-scoped credentialTypePolicy:manageRequestFed check',
		({ route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope).toBe('credentialTypePolicy:manageRequestFed');
		},
	);

	it('is gated by the type availability policies license feature', () => {
		for (const { route } of routeCases) {
			expect(route.licenseFeature).toBe(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES);
		}
	});
});
