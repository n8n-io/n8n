import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Shared layer every policy feature is built on: it will register the policy
 * enforcement implementation that runs the registered `@PolicyCheck`s.
 *
 * Runs on all instance types — enforcement points sit on execution paths that
 * also run on workers and webhook processes.
 *
 * Opt-in via `N8N_ENABLED_MODULES=policy-infrastructure` while it is being
 * built out; becomes a default module at GA.
 */
@BackendModule({ name: 'policy-infrastructure' })
export class PolicyInfrastructureModule implements ModuleInterface {
	async init() {
		// Later tickets register the enforcement implementation here.
	}
}
