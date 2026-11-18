import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { getResourcePermissions } from '@n8n/permissions';

export type PagePermissions = {
	canCreate: boolean;
	canList: boolean;
	canRead: boolean;
	canUpdate: boolean;
	canDelete: boolean;
};

/**
 * Reads what the user can do with the pages of a project.
 * Reads reactive state, so call it in a `computed`.
 */
export function getPagePermissions(projectId: string): PagePermissions {
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);
	const page = getResourcePermissions(permissions.scopesFor(projectId)).page;
	const canWrite = !permissions.isReadOnly();

	return {
		canCreate: canWrite && Boolean(page?.create),
		canList: Boolean(page?.list),
		canRead: Boolean(page?.read),
		canUpdate: canWrite && Boolean(page?.update),
		canDelete: canWrite && Boolean(page?.delete),
	};
}
