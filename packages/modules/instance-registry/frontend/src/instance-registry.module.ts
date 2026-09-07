import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

/**
 * Store-only: this module contributes no UI surface, so registering it is a no-op —
 * `moduleInitializer` guards every surface it reads. `AboutModal` and `useDebugInfo`
 * consume the store directly; the descriptor is what makes this a module the shell
 * knows about rather than a library it happens to import.
 */
export const InstanceRegistryModule: FrontendModuleDescription = {
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'instance-registry',
	name: 'Instance Registry',
	description: 'Reports which instances are in this deployment and their health',
	icon: 'server',
};
