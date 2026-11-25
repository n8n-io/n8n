import { ModuleRegistry } from '@n8n/backend-common';
import { RefreshTokenPort } from '@n8n/backend-module-mcp-servers';
import { Service } from '@n8n/di';

import { RefreshTokenRepository } from '@/modules/oauth-server/database/repositories/oauth-refresh-token.repository';

/** Deletes refresh tokens of the shared OAuth server for one custom MCP server. */
@Service()
export class RefreshTokenAdapter extends RefreshTokenPort {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly refreshTokens: RefreshTokenRepository,
	) {
		super();
	}

	async deleteForPerson(resource: string, userId: string): Promise<number> {
		if (!this.oauthServerActive()) return 0;
		return await this.refreshTokens.deleteByUserAndResource(userId, resource, {});
	}

	async deleteForResource(resource: string): Promise<number> {
		if (!this.oauthServerActive()) return 0;
		return await this.refreshTokens.deleteByResource(resource, {});
	}

	// Without the OAuth server module, no refresh token exists and its table has no entity.
	private oauthServerActive() {
		return this.moduleRegistry.isActive('oauth-server');
	}
}
