import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

import { isServiceAccountsEnvFeatureFlagEnabled } from '@/constants/service-accounts';

/**
 * Service accounts: non-human principals that a human impersonates to act on
 * behalf of. No new entities — the principal lives in `user.type`.
 *
 * Only the REST surface is modular. The auth-side changes (the `act` claim,
 * actor validation, the MFA gate) live in core because `createAuthMiddleware`
 * runs on every request regardless of module state.
 *
 * POC: gated on an env flag rather than a licence.
 */
@BackendModule({ name: 'service-accounts' })
export class ServiceAccountsModule implements ModuleInterface {
	async init() {
		if (!isServiceAccountsEnvFeatureFlagEnabled()) return;

		await import('./service-accounts.controller.js');
		await import('./impersonation.controller.js');
	}
}
