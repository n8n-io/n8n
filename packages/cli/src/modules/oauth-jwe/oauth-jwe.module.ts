import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { OAuthJweServiceProxy } from '@/oauth/oauth-jwe-service.proxy';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_OAUTH2_JWE === 'true';
}

@BackendModule({ name: 'oauth-jwe', instanceTypes: ['main'] })
export class OAuthJweModule implements ModuleInterface {
	async init() {
		const { OAuthJweKeyService } = await import('./oauth-jwe-key.service');
		await Container.get(OAuthJweKeyService).initialize();

		if (isFeatureFlagEnabled()) {
			await import('./oauth-jwe.controller');
			const { OAuthJweDecryptService } = await import('./oauth-jwe-decrypt.service');
			Container.get(OAuthJweServiceProxy).setHandler(Container.get(OAuthJweDecryptService));
		}
	}

	async context() {
		return { oauthJweProxyProvider: Container.get(OAuthJweServiceProxy) };
	}
}
