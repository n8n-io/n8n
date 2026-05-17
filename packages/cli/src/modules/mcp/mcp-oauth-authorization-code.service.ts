import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { randomBytes } from 'node:crypto';

import type { AuthorizationCode } from './database/entities/oauth-authorization-code.entity';
import { AuthorizationCodeRepository } from './database/repositories/oauth-authorization-code.repository';
import { OAuthError } from '@modelcontextprotocol/sdk/server/auth/errors';

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

	/**
	 * Atomically marks an authorization code as consumed.
	 *
	 * SECURITY: This method uses a single `UPDATE ... WHERE used = false` database query
	 * (rather than a read-then-write pattern) to prevent race conditions during concurrent
	 * token exchanges. If two simultaneous token requests are made with the same code,
	 * exactly one query will affect a row and succeed; the other will affect 0 rows
	 * and fail with an 'invalid_grant' OAuth error.
	 *
	 * @see findAuthorizationCode For validating the authorization code before consumption.
	 */
	async markAuthorizationCodeAsUsed(authorizationCode: string): Promise<void> {
		// Atomic: UPDATE sets used=true only if used=false; checks affected rows.
		const result = await this.authorizationCodeRepository.update(
			{ code: authorizationCode, used: false },
			{ used: true },
		);

		const numAffected = result.affected ?? 0;
		if (numAffected < 1) {
			throw new OAuthError('invalid_grant', 'Authorization code already used');
		}
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
