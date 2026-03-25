import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Shared OAuth infrastructure module.
 * Owns OAuth entities, repositories, and services used by both MCP and public-api modules.
 * Does NOT expose controllers — consuming modules register their own.
 */
@BackendModule({ name: 'oauth', instanceTypes: ['main'] })
export class OAuthModule implements ModuleInterface {
	async entities() {
		const { OAuthClient } = await import('./database/entities/oauth-client.entity');
		const { AuthorizationCode } = await import(
			'./database/entities/oauth-authorization-code.entity'
		);
		const { AccessToken } = await import('./database/entities/oauth-access-token.entity');
		const { RefreshToken } = await import('./database/entities/oauth-refresh-token.entity');
		const { UserConsent } = await import('./database/entities/oauth-user-consent.entity');

		return [OAuthClient, AuthorizationCode, AccessToken, RefreshToken, UserConsent] as never;
	}
}
