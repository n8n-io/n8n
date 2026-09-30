import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { WorkflowSuggestionsController } from '../workflow-suggestions.controller';

it('exposes only the proposal read route and requires edit access', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		WorkflowSuggestionsController as never,
	);
	expect([...metadata.routes.keys()]).toEqual(['detail']);
	for (const route of metadata.routes.values()) {
		expect(route.accessScope).toEqual({
			scope: 'workflow:update',
			globalOnly: false,
		});
		expect(route.skipAuth).not.toBe(true);
	}
});
