import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { JwksRegistry } from '@/jwks/jwks.registry';
import { OAuthJweServiceProxy } from '@/oauth/oauth-jwe-service.proxy';

@BackendModule({ name: 'oauth-jwe' })
export class OAuthJweModule implements ModuleInterface {
	async init() {
		const { OAuthJweDecryptService } = await import('./oauth-jwe-decrypt.service.js');
		Container.get(OAuthJweServiceProxy).setHandler(Container.get(OAuthJweDecryptService));

		// Eager key bootstrap and JWKS publishing belong on main only.
		// Workers lazily resolve the key on the first refresh that needs it; if
		// the cache is cold and main hasn't generated yet, the partial unique
		// index on `(type, algorithm)` serializes any concurrent generation.
		if (Container.get(InstanceSettings).instanceType === 'main') {
			const { OAuthJweKeyService } = await import('./oauth-jwe-key.service.js');
			await Container.get(OAuthJweKeyService).initialize();

			const { OAuthJweJwksProvider } = await import('./oauth-jwe-jwks.provider.js');
			Container.get(JwksRegistry).register(Container.get(OAuthJweJwksProvider));
		}
	}

	async context() {
		return { oauthJweProxyProvider: Container.get(OAuthJweServiceProxy) };
	}
}
