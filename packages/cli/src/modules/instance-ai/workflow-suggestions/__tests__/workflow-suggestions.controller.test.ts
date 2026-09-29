import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { WorkflowSuggestionsController } from '../workflow-suggestions.controller';

it('requires edit or publish scope for every suggestion route', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		WorkflowSuggestionsController as never,
	);
	expect(metadata.routes.size).toBe(5);
	for (const [method, route] of metadata.routes) {
		expect(route.accessScope).toEqual({
			scope:
				method === 'approveAndPublish' || method === 'retryPublication'
					? 'workflow:publish'
					: 'workflow:update',
			globalOnly: false,
		});
		expect(route.skipAuth).not.toBe(true);
	}
});
