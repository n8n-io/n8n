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
		if (!isFeatureFlagEnabled()) return;

		const { OAuthJweDecryptService } = await import('./oauth-jwe-decrypt.service');
		Container.get(OAuthJweServiceProxy).setHandler(Container.get(OAuthJweDecryptService));

		// Eager key bootstrap and the JWKS controller belong on main only.
		// Workers lazily resolve the key on the first refresh that needs it; if
		// the cache is cold and main hasn't generated yet, the partial unique
		// index on `(type, algorithm)` serializes any concurrent generation.
		if (Container.get(InstanceSettings).instanceType === 'main') {
			const { OAuthJweKeyService } = await import('./oauth-jwe-key.service');
			await Container.get(OAuthJweKeyService).initialize();
			await import('./oauth-jwe.controller');
		}
	}

	async context() {
		return { oauthJweProxyProvider: Container.get(OAuthJweServiceProxy) };
	}
}
