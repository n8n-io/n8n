import { OAuthGrantPort } from '@n8n/backend-module-mcp-servers';
import { Service } from '@n8n/di';

import { RefreshTokenRepository } from '@/modules/oauth-server/database/repositories/oauth-refresh-token.repository';

/** Revokes the sign-in grants of a server URL, so a new server with an old slug starts clean. */
@Service()
export class OAuthGrantAdapter extends OAuthGrantPort {
	constructor(private readonly refreshTokens: RefreshTokenRepository) {
		super();
	}

	async revokeForResource(resource: string): Promise<void> {
		await this.refreshTokens.deleteByResource(resource, {});
	}
}
