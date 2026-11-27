import { ModuleRegistry } from '@n8n/backend-common';
import { OAuthGrantPort } from '@n8n/backend-module-mcp-servers';
import { Container, Service } from '@n8n/di';

/** Revokes the sign-in grants of a server URL, so a new server with an old slug starts clean. */
@Service()
export class OAuthGrantAdapter extends OAuthGrantPort {
	constructor(private readonly moduleRegistry: ModuleRegistry) {
		super();
	}

	async revokeForResource(resource: string): Promise<void> {
		// Without the n8n sign-in, no grant exists to revoke, and its table is not loaded.
		if (!this.moduleRegistry.isActive('oauth-server')) return;
		const { RefreshTokenRepository } = await import(
			'@/modules/oauth-server/database/repositories/oauth-refresh-token.repository.js'
		);
		await Container.get(RefreshTokenRepository).deleteByResource(resource, {});
	}
}
