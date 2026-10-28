import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { getResourcePermissions } from '@n8n/permissions';

export function getAppPermissions(projectId: string) {
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);
	const app = getResourcePermissions(permissions.scopesFor(projectId)).app;

	return {
		canList: Boolean(app?.list),
		canRead: Boolean(app?.read),
		canDelete: !permissions.isReadOnly() && Boolean(app?.delete),
	};
}
