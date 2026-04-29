import { Service } from '@n8n/di';
import type { IDataObject, OauthJweProxyProvider } from 'n8n-workflow';

import { isOAuth2JweEnabled } from '@/modules/oauth-jwe/oauth-jwe.constants';

export interface OAuthJweDecryptHandler {
	decryptOAuth2TokenData(
		tokenData: IDataObject,
		opts: { jweEnabled: boolean },
	): Promise<IDataObject>;
}

/**
 * CLI-side proxy for OAuth2 JWE decryption. Lives outside the `oauth-jwe`
 * module so non-module callers (the OAuth2 callback controller) and the
 * execution engine (via `additionalData['oauth-jwe']`) consume it without
 * importing module internals. The module wires the real handler at init time
 * via {@link setHandler}; if the module never inits or the env flag is off,
 * decryption is a no-op and `tokenData` is returned unchanged.
 *
 * Mirrors the redaction proxy pattern in `execution-redaction-proxy.service.ts`.
 */
@Service()
export class OAuthJweServiceProxy implements OauthJweProxyProvider {
	private handler?: OAuthJweDecryptHandler;

	setHandler(handler: OAuthJweDecryptHandler) {
		this.handler = handler;
	}

	async decryptOAuth2TokenData(
		tokenData: IDataObject,
		opts: { jweEnabled: boolean },
	): Promise<IDataObject> {
		if (!isOAuth2JweEnabled()) return tokenData;
		if (!this.handler) return tokenData;
		return await this.handler.decryptOAuth2TokenData(tokenData, opts);
	}
}
