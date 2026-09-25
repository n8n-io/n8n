import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Owns the `trusted_source` and `trusted_source_identity` tables. Main, webhook and worker
 * instances load it, because workers and webhook processes resolve the same entities as main.
 */
@BackendModule({ name: 'inbound-auth-core', instanceTypes: ['main', 'webhook', 'worker'] })
export class InboundAuthCoreModule implements ModuleInterface {
	async entities() {
		const { TrustedSourceEntity } = await import('./database/entities/trusted-source.entity.js');
		const { TrustedSourceIdentityEntity } = await import(
			'./database/entities/trusted-source-identity.entity.js'
		);

		return [TrustedSourceEntity, TrustedSourceIdentityEntity];
	}
}
