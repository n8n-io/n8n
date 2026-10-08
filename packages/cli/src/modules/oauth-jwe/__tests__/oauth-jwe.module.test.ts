import { Container } from '@n8n/di';
import type { InstanceType } from '@n8n/constants';
import { InstanceSettings } from 'n8n-core';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { JwksRegistry } from '@/jwks/jwks.registry';
import { OAuthJweServiceProxy } from '@/oauth/oauth-jwe-service.proxy';

import { OAuthJweDecryptService } from '../oauth-jwe-decrypt.service';
import { OAuthJweJwksProvider } from '../oauth-jwe-jwks.provider';
import { OAuthJweKeyService } from '../oauth-jwe-key.service';
import { OAuthJweModule } from '../oauth-jwe.module';

describe('OAuthJweModule', () => {
	let decryptService: Mocked<OAuthJweDecryptService>;
	let keyService: Mocked<OAuthJweKeyService>;
	let jwksProvider: Mocked<OAuthJweJwksProvider>;
	let proxy: Mocked<OAuthJweServiceProxy>;
	let jwksRegistry: Mocked<JwksRegistry>;

	const setUp = (instanceType: InstanceType) => {
		Container.reset();

		decryptService = mock<OAuthJweDecryptService>();
		keyService = mock<OAuthJweKeyService>();
		keyService.initialize.mockResolvedValue(undefined);
		jwksProvider = mock<OAuthJweJwksProvider>();
		proxy = mock<OAuthJweServiceProxy>();
		jwksRegistry = mock<JwksRegistry>();

		Container.set(InstanceSettings, mock<InstanceSettings>({ instanceType }));
		Container.set(OAuthJweDecryptService, decryptService);
		Container.set(OAuthJweKeyService, keyService);
		Container.set(OAuthJweJwksProvider, jwksProvider);
		Container.set(OAuthJweServiceProxy, proxy);
		Container.set(JwksRegistry, jwksRegistry);

		return new OAuthJweModule();
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('sets the decrypt handler on the proxy', async () => {
		await setUp('main').init();

		expect(proxy.setHandler).toHaveBeenCalledWith(decryptService);
	});

	test('initializes the key and registers the JWKS provider on main', async () => {
		await setUp('main').init();

		expect(keyService.initialize).toHaveBeenCalledTimes(1);
		expect(jwksRegistry.register).toHaveBeenCalledWith(jwksProvider);
	});

	test('sets the decrypt handler but skips key bootstrap and JWKS on a worker', async () => {
		await setUp('worker').init();

		expect(proxy.setHandler).toHaveBeenCalledWith(decryptService);
		expect(keyService.initialize).not.toHaveBeenCalled();
		expect(jwksRegistry.register).not.toHaveBeenCalled();
	});
});
