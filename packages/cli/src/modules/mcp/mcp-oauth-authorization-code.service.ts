import { Time } from '@n8n/constants';
import type { AuthorizationCode } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomBytes } from 'node:crypto';

import { AuthorizationCodeRepository } from './oauth-authorization-code.repository';

/**
 * Handles OAuth 2.1 authorization code lifecycle for MCP server
 * Generates, validates, and consumes authorization codes with PKCE support
 */
@Service()
export class McpOAuthAuthorizationCodeService {
	private readonly AUTHORIZATION_CODE_EXPIRY_MS = 10 * Time.minutes.toMilliseconds;

	constructor(private readonly authorizationCodeRepository: AuthorizationCodeRepository) {}

	/**
	 * Generate and save authorization code
	 * Returns the generated code string
	 */
	async createAuthorizationCode(
		clientId: string,
		userId: string,
		redirectUri: string,
		codeChallenge: string,
		state: string | null,
	): Promise<string> {
		const code = randomBytes(32).toString('hex');

		await this.authorizationCodeRepository.save({
			code,
			clientId,
			userId,
			redirectUri,
			codeChallenge,
			codeChallengeMethod: 'S256',
			state,
			expiresAt: Date.now() + this.AUTHORIZATION_CODE_EXPIRY_MS,
			used: false,
		});

		return code;
	}

	/**
	 * Find and validate authorization code (without consuming)
	 * Returns the auth record if valid, throws if invalid/expired
	 */
	async findAndValidateAuthorizationCode(
		authorizationCode: string,
		clientId: string,
	): Promise<AuthorizationCode> {
		const authRecord = await this.authorizationCodeRepository.findOne({
			where: {
				code: authorizationCode,
				clientId,
			},
		});

		if (!authRecord) {
			throw new Error('Invalid authorization code');
		}

		if (authRecord.expiresAt < Date.now()) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new Error('Authorization code expired');
		}

		return authRecord;
	}

	/**
	 * Validate and consume authorization code
	 * Returns the auth record if valid, throws if invalid/expired/used
	 */
	async validateAndConsumeAuthorizationCode(
		authorizationCode: string,
		clientId: string,
		redirectUri?: string,
	): Promise<AuthorizationCode> {
		const authRecord = await this.findAndValidateAuthorizationCode(authorizationCode, clientId);

		if (authRecord.used) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new Error('Authorization code already used');
		}

		if (redirectUri && authRecord.redirectUri !== redirectUri) {
			throw new Error('Redirect URI mismatch');
		}

		authRecord.used = true;
		await this.authorizationCodeRepository.save(authRecord);

		return authRecord;
	}

	/**
	 * Get PKCE code challenge for authorization code
	 * Used by MCP SDK for PKCE verification
	 */
	async getCodeChallenge(authorizationCode: string, clientId: string): Promise<string> {
		const authRecord = await this.findAndValidateAuthorizationCode(authorizationCode, clientId);
		return authRecord.codeChallenge;
	}
}
