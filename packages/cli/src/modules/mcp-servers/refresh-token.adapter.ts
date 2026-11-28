import { ModuleRegistry } from '@n8n/backend-common';
import { RefreshTokenPort } from '@n8n/backend-module-mcp-servers';
import { Container, Service } from '@n8n/di';

/** Deletes refresh tokens of the shared OAuth server for one custom MCP server. */
@Service()
export class RefreshTokenAdapter extends RefreshTokenPort {
	constructor(private readonly moduleRegistry: ModuleRegistry) {
		super();
	}

	async deleteForPerson(resource: string, userId: string): Promise<number> {
		return await this.revoke(resource, userId);
	}

	async deleteForResource(resource: string): Promise<number> {
		return await this.revoke(resource);
	}

	private async revoke(resource: string, userId?: string): Promise<number> {
		// Without the OAuth server module, no refresh token exists and its table has no entity.
		if (!this.moduleRegistry.isActive('oauth-server')) return 0;
		const { OAuthTokenService } = await import('@/modules/oauth-server/oauth-token.service.js');
		return await Container.get(OAuthTokenService).revokeRefreshTokensForResource(resource, userId);
	}
}
