import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

/**
 * Shared layer every policy feature is built on: it registers the policy
 * enforcement implementation that runs the registered `@PolicyCheck`s.
 *
 * Runs on all instance types — enforcement points sit on execution paths that
 * also run on workers and webhook processes.
 *
 * Opt-in via `N8N_ENABLED_MODULES=policy-infrastructure` while it is being
 * built out; becomes a default module at GA. Disabling it is the documented
 * break-glass lever: no checks run and everything is allowed.
 */
@BackendModule({ name: 'policy-infrastructure' })
export class PolicyInfrastructureModule implements ModuleInterface {
	async init() {
		const { PolicyDecisionService } = await import('./policy-decision.service.js');

		Container.get(PolicyEnforcementService).setImplementation(Container.get(PolicyDecisionService));

		// Imported for its side effect: `@OnLifecycleEvent` registers on class definition.
		await import('./policy-lifecycle-handler.js');
	}
}
