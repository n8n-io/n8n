import { Service } from '@n8n/di';
import type { IDataObject, OauthJweProxyProvider } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

export interface OAuthJweDecryptHandler {
	decryptOAuth2TokenData(tokenData: IDataObject): Promise<IDataObject>;
}

/**
 * CLI-side proxy for OAuth2 JWE decryption. Lives outside the `oauth-jwe`
 * module so non-module callers (the OAuth2 callback controller) and the
 * execution engine (via `additionalData['oauth-jwe']`) consume it without
 * importing module internals. The module wires the real handler at init time
 * via {@link setHandler}; callers gate on the per-credential `jweEnabled`
 * flag, so reaching this proxy means decryption was explicitly requested —
 * a missing handler means the OAuth2 JWE feature is disabled while a stored
 * credential still expects it, and we surface that loudly rather than
 * silently persisting an undecrypted JWE blob.
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
		if (!this.handler) {
			throw new UserError(
				'OAuth2 JWE decryption was requested but the feature is not enabled on this instance',
			);
		}
		return await this.handler.decryptOAuth2TokenData(tokenData);
	}
}
