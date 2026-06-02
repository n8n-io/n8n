import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { randomBytes } from 'node:crypto';

import type { AuthorizationCode } from './database/entities/oauth-authorization-code.entity';
import { AuthorizationCodeRepository } from './database/repositories/oauth-authorization-code.repository';
import { OAuthError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

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
		resource?: string,
	): Promise<string> {
		const code = randomBytes(32).toString('hex');

		await this.authorizationCodeRepository.insert({
			code,
			clientId,
			userId,
			redirectUri,
			codeChallenge,
			codeChallengeMethod: 'S256',
			state,
			resource: resource ?? null,
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
			throw new OAuthError('invalid_grant', 'Invalid authorization code');
		}

		if (authRecord.expiresAt < Date.now()) {
			await this.authorizationCodeRepository.remove(authRecord);
			throw new OAuthError('invalid_grant', 'Authorization code expired');
		}

		return authRecord;
	}

	/**
	 * Finds a non-expired, unused authorization code for validation.
	 *
	 * @see markAuthorizationCodeAsUsed For consuming the code atomically once validated.
	 */
	async findAuthorizationCode(
		code: string,
		clientId: string,
		redirectUri?: string,
	): Promise<AuthorizationCode | null> {
		const authCode = await this.authorizationCodeRepository.findOne({
			where: {
				code,
				clientId,
				used: false,
			},
		});

		if (!authCode) return null;
		if (authCode.expiresAt < Date.now()) {
			await this.authorizationCodeRepository.remove(authCode);
			return null;
		}
		if (redirectUri && authCode.redirectUri !== redirectUri) return null;

		return authCode;
	}

	/**
	 * Validate and consume authorization code
	 * Returns the auth record if valid, throws if invalid/expired/used
	 * @deprecated Use findAuthorizationCode + markAuthorizationCodeAsUsed instead
	 */
	async validateAndConsumeAuthorizationCode(
		authorizationCode: string,
		clientId: string,
		redirectUri?: string,
	): Promise<AuthorizationCode> {
		const authRecord = await this.findAndValidateAuthorizationCode(authorizationCode, clientId);

		if (redirectUri && authRecord.redirectUri !== redirectUri) {
			throw new Error('Redirect URI mismatch');
		}

		const result = await this.authorizationCodeRepository.update(
			{ code: authorizationCode, used: false },
			{ used: true },
		);

		const numAffected = result.affected ?? 0;
		if (numAffected < 1) {
			throw new OAuthError('invalid_grant', 'Authorization code already used');
		}

		authRecord.used = true;
		return authRecord;
	}

	// Single `UPDATE ... WHERE used = false` (no read-then-write) so that concurrent token
	// exchanges with the same code can't both succeed — one wins, the other gets invalid_grant.
	async markAuthorizationCodeAsUsed(authorizationCode: string): Promise<void> {
		const result = await this.authorizationCodeRepository.update(
			{ code: authorizationCode, used: false },
			{ used: true },
		);

		const numAffected = result.affected ?? 0;
		if (numAffected < 1) {
			throw new OAuthError('invalid_grant', 'Authorization code already used');
		}
	}

	// Routed through findAuthorizationCode (filters `used: false`) so a consumed code's PKCE
	// challenge is never returned — preventing replay-probe oracles against used codes.
	async getCodeChallenge(authorizationCode: string, clientId: string): Promise<string> {
		const authRecord = await this.findAuthorizationCode(authorizationCode, clientId);
		if (!authRecord) {
			throw new OAuthError('invalid_grant', 'Invalid authorization code');
		}
		return authRecord.codeChallenge;
	}
}
