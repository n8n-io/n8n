import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { getResourcePermissions } from '@n8n/permissions';

/**
 * What the current user may do in a project, by resource. A read-only instance (for example
 * a protected source control branch) permits no change, so it gives `undefined`.
 */
export function useProjectResourcePermissions() {
	const permissions = capabilityRegistry.use(capabilities.projectPermissions);

	function permissionsFor(projectId: string | undefined) {
		if (!projectId || permissions.isReadOnly()) return undefined;
		return getResourcePermissions(permissions.scopesFor(projectId));
	}

	return { permissionsFor };
}
