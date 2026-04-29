import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { OAuthJweKeyService } from './oauth-jwe-key.service';
import { decryptJweToken, isJweToken } from './oauth-jwe.utils';

const JWE_TOKEN_FIELDS = ['access_token', 'id_token'] as const;

/**
 * Decrypts JWE-wrapped OAuth2 token responses using the active instance
 * private key. When `jweEnabled` is true, plaintext tokens are rejected so
 * a misconfigured IdP cannot silently downgrade the channel.
 */
@Service()
export class OAuthJweDecryptService {
	constructor(private readonly keyService: OAuthJweKeyService) {}

	async decryptOAuth2TokenData(
		tokenData: IDataObject,
		opts: { jweEnabled: boolean },
	): Promise<IDataObject> {
		if (!opts.jweEnabled) return tokenData;

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
