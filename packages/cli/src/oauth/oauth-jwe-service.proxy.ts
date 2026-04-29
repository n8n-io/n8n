import { Service } from '@n8n/di';
import type { IDataObject, OauthJweProxyProvider } from 'n8n-workflow';

export interface OAuthJweDecryptHandler {
	decryptOAuth2TokenData(tokenData: IDataObject): Promise<IDataObject>;
}

/**
 * CLI-side proxy for OAuth2 JWE decryption. Lives outside the `oauth-jwe`
 * module so non-module callers (the OAuth2 callback controller) and the
 * execution engine (via `additionalData['oauth-jwe']`) consume it without
 * importing module internals. The module wires the real handler at init time
 * via {@link setHandler}; if the module never inits or the env flag is off,
 * decryption is a no-op and `tokenData` is returned unchanged. Callers are
 * responsible for the per-credential `jweEnabled` opt-in.
 *
 * Mirrors the redaction proxy pattern in `execution-redaction-proxy.service.ts`.
 */
@Service()
export class OAuthJweServiceProxy implements OauthJweProxyProvider {
	private handler?: OAuthJweDecryptHandler;

	setHandler(handler: OAuthJweDecryptHandler) {
		this.handler = handler;
	}

	async decryptOAuth2TokenData(tokenData: IDataObject): Promise<IDataObject> {
		if (!this.handler) return tokenData;
		return await this.handler.decryptOAuth2TokenData(tokenData);
	}
}
