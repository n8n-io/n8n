import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	AuthenticationService,
	IdentityService,
	TrustedSourceGate,
	type Extracted,
	type Result,
	type Verified,
} from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';

// Fail-closed defaults: a consumer that runs before a real implementation is registered gets a
// rejection, not a throw. The OAuth2 driver replaces the AuthenticationService binding.
class UnregisteredAuthenticationService extends AuthenticationService {
	async authenticate(_extracted: Extracted): Promise<Result<Verified>> {
		return { ok: false, reason: 'source-unusable' };
	}

	async advertise() {
		return { authorizationServers: [], challenges: [] };
	}
}

class UnregisteredIdentityService extends IdentityService {
	async identify(_verified: Verified): Promise<Result<SecurityContext>> {
		return { ok: false, reason: 'source-unusable' };
	}
}

class UnregisteredTrustedSourceGate extends TrustedSourceGate {
	async authorizeSealed() {
		return false;
	}
}

/**
 * Owns the `trusted_source` and `trusted_source_identity` tables and binds the inbound-auth
 * contracts. Main, webhook and worker instances load it, because workers and webhook processes
 * resolve the same entities and contracts as main.
 */
@BackendModule({ name: 'inbound-auth-core', instanceTypes: ['main', 'webhook', 'worker'] })
export class InboundAuthCoreModule implements ModuleInterface {
	async init() {
		Container.set(AuthenticationService, new UnregisteredAuthenticationService());
		Container.set(IdentityService, new UnregisteredIdentityService());
		Container.set(TrustedSourceGate, new UnregisteredTrustedSourceGate());
	}

	async entities() {
		const { TrustedSourceEntity } = await import('./database/entities/trusted-source.entity.js');
		const { TrustedSourceIdentityEntity } = await import(
			'./database/entities/trusted-source-identity.entity.js'
		);

		return [TrustedSourceEntity, TrustedSourceIdentityEntity];
	}
}
