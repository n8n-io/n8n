import { Service } from '@n8n/di';
import {
	LocalAuthorizationServer,
	type AuthorizationServerMetadata,
	type Jwk,
} from '@n8n/inbound-auth';
import { OperationalError } from 'n8n-workflow';

type Listener = () => Promise<void>;

/**
 * The binding of `LocalAuthorizationServer`. The module that serves the instance's OAuth2
 * server initializes after this one, so it registers the server here, as it registers its
 * token verifier and its flow. Until then every read fails, and with it the discovery of the
 * local source.
 */
@Service()
export class LocalAuthorizationServerProxy extends LocalAuthorizationServer {
	private provider: LocalAuthorizationServer | undefined;

	private readonly listeners: Listener[] = [];

	/** Binds the server and runs every listener in order. A listener owns its own failures. */
	async registerProvider(provider: LocalAuthorizationServer): Promise<void> {
		this.provider = provider;
		for (const listener of this.listeners) await listener();
	}

	/** What to do once a server is bound. Runs at once when one already is. */
	async onProviderRegistered(listener: Listener): Promise<void> {
		this.listeners.push(listener);
		if (this.provider) await listener();
	}

	async getMetadata(): Promise<AuthorizationServerMetadata> {
		return await this.required().getMetadata();
	}

	async getJwks(): Promise<{ keys: Jwk[] }> {
		return await this.required().getJwks();
	}

	/** Fails closed: no token is active at a server that is not there. */
	async isAccessTokenActive(token: string): Promise<boolean> {
		return this.provider ? await this.provider.isAccessTokenActive(token) : false;
	}

	private required(): LocalAuthorizationServer {
		if (!this.provider) throw new OperationalError('No local authorization server is registered');
		return this.provider;
	}
}
