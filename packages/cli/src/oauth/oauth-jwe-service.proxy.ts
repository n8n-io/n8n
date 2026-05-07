import { Service } from '@n8n/di';
import type { IDataObject, OauthJweProxyProvider } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

/**
 * JWE-related fields of an RFC 7591 dynamic client registration payload.
 * Empty when the JWE feature is not in play for a given registration.
 */
export type DcrJweFields = {
	jwks_uri?: string;
	id_token_encrypted_response_alg?: string;
};

export interface OAuthJweHandler {
	decryptOAuth2TokenData(tokenData: IDataObject): Promise<IDataObject>;
	getDcrJweFields(): Promise<DcrJweFields>;
}

/**
 * CLI-side proxy for the OAuth2 JWE module. Lives outside the `oauth-jwe`
 * module so non-module callers (the OAuth2 callback controller, the OAuth
 * service for dynamic client registration) and the execution engine
 * (via `additionalData['oauth-jwe']`) consume it without importing module
 * internals or knowing about the JWE feature flag.
 *
 * Mirrors the redaction proxy pattern in `execution-redaction-proxy.service.ts`.
 */
@Service()
export class OAuthJweServiceProxy implements OauthJweProxyProvider {
	private handler?: OAuthJweHandler;

	setHandler(handler: OAuthJweHandler) {
		this.handler = handler;
	}

	/**
	 * Strict: callers reaching this method have confirmed
	 * `credential.jweEnabled === true`, so a missing handler means a
	 * misconfiguration we want to surface loudly rather than silently
	 * persisting an undecrypted JWE blob.
	 */
	async decryptOAuth2TokenData(tokenData: IDataObject): Promise<IDataObject> {
		if (!this.handler) {
			throw new UserError(
				'OAuth2 JWE decryption was requested but the feature is not enabled on this instance',
			);
		}
		return await this.handler.decryptOAuth2TokenData(tokenData);
	}

	/**
	 * Lenient: returns an empty object when either the JWE feature is off on
	 * the instance or the credential has not opted in. The OAuth service
	 * always asks for the fields and lets this method produce a no-op when
	 * appropriate.
	 */
	async getDcrJweFields(jweEnabledOnCredential: boolean): Promise<DcrJweFields> {
		if (!jweEnabledOnCredential || !this.handler) return {};
		return await this.handler.getDcrJweFields();
	}
}
