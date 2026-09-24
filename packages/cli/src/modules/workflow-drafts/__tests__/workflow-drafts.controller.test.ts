import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { WorkflowDraftsController } from '../workflow-drafts.controller';

it('requires project edit scope for every draft route', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		WorkflowDraftsController as never,
	);
	expect(metadata.routes.size).toBe(1);
	for (const route of metadata.routes.values()) {
		expect(route.accessScope).toEqual({ scope: 'workflow:update', globalOnly: false });
		expect(route.skipAuth).not.toBe(true);
	}
});
