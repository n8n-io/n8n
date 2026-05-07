import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';
import { UnexpectedError, UserError } from 'n8n-workflow';

import type { DcrJweFields } from '@/oauth/oauth-jwe-service.proxy';
import { UrlService } from '@/services/url.service';

import { OAuthJweKeyService } from './oauth-jwe-key.service';
import { decryptJweToken, isJweToken } from './oauth-jwe.utils';

const JWE_TOKEN_FIELDS = ['access_token', 'id_token'] as const;

/**
 * Decrypts JWE-wrapped OAuth2 token responses using the active instance
 * private key, and produces the JWE-related fields of an RFC 7591 dynamic
 * client registration payload. Callers must already have decided that the
 * credential expects JWE — the decrypt path rejects responses with no JWE
 * tokens at all so a misconfigured IdP cannot silently downgrade the channel.
 */
@Service()
export class OAuthJweDecryptService {
	constructor(
		private readonly keyService: OAuthJweKeyService,
		private readonly urlService: UrlService,
	) {}

	async getDcrJweFields(): Promise<DcrJweFields> {
		const publicJwk = await this.keyService.getPublicJwk();
		if (typeof publicJwk.alg !== 'string' || publicJwk.alg.length === 0) {
			throw new UnexpectedError('OAuth JWE public key is missing an "alg" field');
		}
		return {
			jwks_uri: this.urlService.getInstanceJwksUri(),
			id_token_encrypted_response_alg: publicJwk.alg,
		};
	}

	async decryptOAuth2TokenData(tokenData: IDataObject): Promise<IDataObject> {
		const { privateKey } = await this.keyService.getKeyPair();
		const result: IDataObject = { ...tokenData };
		let presentAny = false;
		let decryptedAny = false;

		for (const field of JWE_TOKEN_FIELDS) {
			const value = result[field];
			if (value === undefined || value === null) continue;
			presentAny = true;
			if (isJweToken(value)) {
				result[field] = await decryptJweToken(value, privateKey);
				decryptedAny = true;
			}
		}

		if (presentAny && !decryptedAny) {
			throw new UserError('Expected at least one JWE-encrypted token but received only plaintext');
		}

		return result;
	}
}
