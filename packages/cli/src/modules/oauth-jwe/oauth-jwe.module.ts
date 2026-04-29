import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { OAuthJweServiceProxy } from '@/oauth/oauth-jwe-service.proxy';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_OAUTH2_JWE === 'true';
}

@BackendModule({ name: 'oauth-jwe' })
export class OAuthJweModule implements ModuleInterface {
	async init() {
		const { OAuthJweKeyService } = await import('./oauth-jwe-key.service');
		await Container.get(OAuthJweKeyService).initialize();

		if (isFeatureFlagEnabled()) {
			const { OAuthJweDecryptService } = await import('./oauth-jwe-decrypt.service');
			Container.get(OAuthJweServiceProxy).setHandler(Container.get(OAuthJweDecryptService));

			// Controller only runs on main; workers don't serve REST.
			if (Container.get(InstanceSettings).instanceType === 'main') {
				await import('./oauth-jwe.controller');
			}
		}
	}

	async context() {
		return { oauthJweProxyProvider: Container.get(OAuthJweServiceProxy) };
	}
}
