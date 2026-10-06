import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import {
	AuthenticationService,
	IdentityService,
	LocalAuthorizationServer,
	TrustedSourceGate,
	TrustedSourceStore,
	type AuthorizationServerMetadata,
	type Extracted,
	type Jwk,
	type Result,
	type Verified,
} from '@n8n/inbound-auth';
import type { SecurityContext } from '@n8n/permissions';
import { OperationalError } from 'n8n-workflow';

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

// Discovery of the local source must fail, not succeed with made-up documents.
class UnregisteredLocalAuthorizationServer extends LocalAuthorizationServer {
	async getMetadata(): Promise<AuthorizationServerMetadata> {
		throw new OperationalError('No local authorization server is registered');
	}

	async getJwks(): Promise<{ keys: Jwk[] }> {
		throw new OperationalError('No local authorization server is registered');
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
		// A binding that already exists wins: the defaults only fill the gap.
		if (!Container.has(AuthenticationService)) {
			Container.set(AuthenticationService, new UnregisteredAuthenticationService());
		}
		if (!Container.has(IdentityService)) {
			Container.set(IdentityService, new UnregisteredIdentityService());
		}
		if (!Container.has(TrustedSourceGate)) {
			Container.set(TrustedSourceGate, new UnregisteredTrustedSourceGate());
		}
		if (!Container.has(LocalAuthorizationServer)) {
			Container.set(LocalAuthorizationServer, new UnregisteredLocalAuthorizationServer());
		}

		const { TrustedSourceDbStore } = await import('./trusted-source.store.js');
		if (!Container.has(TrustedSourceStore)) {
			Container.set(TrustedSourceStore, Container.get(TrustedSourceDbStore));
		}
	}

	// Ungated: the runner skips a cluster-scoped task on webhook and worker instances itself.
	async systemTasks() {
		const { TrustedSourceDiscoveryTask } = await import('./trusted-source-discovery.task.js');
		return [TrustedSourceDiscoveryTask];
	}

	async entities() {
		const { TrustedSourceEntity } = await import('./database/entities/trusted-source.entity.js');
		const { TrustedSourceIdentityEntity } = await import(
			'./database/entities/trusted-source-identity.entity.js'
		);

		return [TrustedSourceEntity, TrustedSourceIdentityEntity];
	}
}
