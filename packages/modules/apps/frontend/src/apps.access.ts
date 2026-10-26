import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';

export function canListApps(projectId: string): boolean {
	return capabilityRegistry
		.use(capabilities.projectPermissions)
		.scopesFor(projectId)
		.includes('app:list');
}
