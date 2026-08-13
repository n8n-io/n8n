import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
import { createHash } from 'node:crypto';

const TOKEN_SCOPE = 'project-file';

/**
 * JWT mechanics for signed project-file download URLs
 * (`GET /rest/files/signed?token=…`), modeled on
 * `BinaryDataService.createSignedToken` but self-contained: files derive
 * their own secret from the instance encryption key (distinct salt) and sign
 * a scoped payload, so binary-data tokens and project-file tokens can never
 * verify against each other's routes.
 *
 * Tokens are bearer tokens — anyone holding the URL can fetch until expiry —
 * so the TTL is short (`N8N_FILE_STORAGE_SIGNED_URL_TTL_MS`, default 15 min)
 * and each token addresses a single file.
 */
@Service()
export class FileSigningService {
	private readonly signingSecret: string;

	constructor(
		instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {
		this.signingSecret = createHash('sha256')
			.update(`url-signing:project-files:${instanceSettings.encryptionKey}`)
			.digest('base64');
	}

	createSignedToken(fileId: string): string {
		const expiresInSeconds = Math.max(
			1,
			Math.floor(this.globalConfig.fileStorage.signedUrlTtlMs / 1000),
		);
		return jwt.sign({ fileId, scope: TOKEN_SCOPE }, this.signingSecret, {
			expiresIn: expiresInSeconds,
		});
	}

	/**
	 * Resolves a token back to its fileId.
	 *
	 * @throws {JsonWebTokenError} on a bad signature, expiry, or a payload
	 * that is not a project-file token (e.g. a binary-data signed token).
	 */
	validateSignedToken(token: string): string {
		const payload = jwt.verify(token, this.signingSecret);
		if (
			typeof payload === 'string' ||
			payload.scope !== TOKEN_SCOPE ||
			typeof payload.fileId !== 'string'
		) {
			throw new JsonWebTokenError('jwt scope invalid');
		}
		return payload.fileId;
	}
}
