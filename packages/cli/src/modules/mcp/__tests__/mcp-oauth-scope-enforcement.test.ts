/**
 * Regression tests for ADO-4985: MCP OAuth Scope Non-Enforcement
 *
 * This file contains failing tests that demonstrate a critical security vulnerability
 * where OAuth scopes are never enforced, allowing clients to access ALL tools regardless
 * of the scopes they were granted during the authorization flow.
 *
 * Root Cause:
 * 1. Scopes are never stored in the database (not in AccessToken, AuthorizationCode, or UserConsent)
 * 2. verifyAccessToken() returns hardcoded empty scopes array
 * 3. No tool handler checks scopes before executing
 *
 * Impact:
 * A malicious client that requests only read access (tool:listWorkflows) can execute
 * workflows on behalf of the user, violating the consent model.
 */

import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';

import type { AccessToken } from '../database/entities/oauth-access-token.entity';
import type { AuthorizationCode } from '../database/entities/oauth-authorization-code.entity';
import { AccessTokenRepository } from '../database/repositories/oauth-access-token.repository';
import { AuthorizationCodeRepository } from '../database/repositories/oauth-authorization-code.repository';
import { RefreshTokenRepository } from '../database/repositories/oauth-refresh-token.repository';
import { McpOAuthAuthorizationCodeService } from '../mcp-oauth-authorization-code.service';
import { McpOAuthTokenService } from '../mcp-oauth-token.service';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());

let logger: jest.Mocked<Logger>;
let userRepository: jest.Mocked<UserRepository>;
let accessTokenRepository: jest.Mocked<AccessTokenRepository>;
let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
let authCodeRepository: jest.Mocked<AuthorizationCodeRepository>;
let tokenService: McpOAuthTokenService;
let authCodeService: McpOAuthAuthorizationCodeService;
let mockTransactionManager: any;

describe('MCP OAuth Scope Enforcement - ADO-4985', () => {
	beforeAll(() => {
		logger = mockInstance(Logger);
		userRepository = mockInstance(UserRepository);
		accessTokenRepository = mockInstance(
			AccessTokenRepository,
		) as jest.Mocked<AccessTokenRepository>;
		refreshTokenRepository = mockInstance(
			RefreshTokenRepository,
		) as jest.Mocked<RefreshTokenRepository>;
		authCodeRepository = mockInstance(
			AuthorizationCodeRepository,
		) as jest.Mocked<AuthorizationCodeRepository>;

		mockTransactionManager = {
			insert: jest.fn().mockResolvedValue(mock()),
			remove: jest.fn().mockResolvedValue(mock()),
			findOne: jest.fn(),
			delete: jest.fn(),
		};

		const mockManager: any = {
			transaction: jest.fn(async (cb: any) => await cb(mockTransactionManager)),
		};

		(accessTokenRepository as any).manager = mockManager;
		(accessTokenRepository as any).target = 'AccessToken';
		(refreshTokenRepository as any).manager = mockManager;
		(refreshTokenRepository as any).target = 'RefreshToken';
		(authCodeRepository as any).manager = mockManager;

		tokenService = new McpOAuthTokenService(
			logger,
			jwtService,
			userRepository,
			accessTokenRepository,
			refreshTokenRepository,
		);

		authCodeService = new McpOAuthAuthorizationCodeService(
			logger,
			authCodeRepository,
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Scope Storage - Database Schema Gaps', () => {
		it('FAILING: Access tokens should store granted scopes but schema has no scopes column', async () => {
			// SETUP: Create a token that should have limited scopes
			const userId = 'user-123';
			const clientId = 'client-456';
			const grantedScopes = ['tool:listWorkflows']; // User only consented to read access

			const { accessToken } = tokenService.generateTokenPair(userId, clientId);

			// ACT: Save the token (should store scopes but doesn't)
			await tokenService.saveTokenPair(accessToken, 'refresh-token', clientId, userId);

			// ASSERT: The AccessToken entity should have stored the granted scopes
			const savedTokenCall = mockTransactionManager.insert.mock.calls.find(
				(call: any) => call[0] === 'AccessToken',
			);
			expect(savedTokenCall).toBeDefined();

			const savedTokenData = savedTokenCall[1];

			// BUG: The entity doesn't have a 'scopes' field, so granted scopes are lost
			// This assertion will FAIL because scopes are never stored
			expect(savedTokenData).toHaveProperty('scopes');
			expect(savedTokenData.scopes).toEqual(grantedScopes);
		});

		it('FAILING: Authorization codes should store requested scopes for later verification', async () => {
			// SETUP: Create an authorization code with specific scopes
			const userId = 'user-123';
			const clientId = 'client-456';
			const requestedScopes = ['tool:listWorkflows', 'tool:getWorkflowDetails'];

			const authCode = await authCodeService.createAuthorizationCode({
				userId,
				clientId,
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				codeChallengeMethod: 'S256',
				state: null,
			});

			// ASSERT: The authorization code should have stored the requested scopes
			const savedCodeCall = mockTransactionManager.insert.mock.calls.find(
				(call: any) => call[0] === 'AuthorizationCode',
			);
			expect(savedCodeCall).toBeDefined();

			const savedCodeData = savedCodeCall[1];

			// BUG: The AuthorizationCode entity has no 'scopes' field
			// This assertion will FAIL
			expect(savedCodeData).toHaveProperty('scopes');
			expect(savedCodeData.scopes).toEqual(requestedScopes);
		});
	});

	describe('Scope Verification - verifyAccessToken Returns Empty Scopes', () => {
		it('FAILING: verifyAccessToken should return the scopes that were granted during authorization', async () => {
			// SETUP: Create a token with specific granted scopes
			const userId = 'user-123';
			const clientId = 'client-456';
			const grantedScopes = ['tool:listWorkflows']; // Read-only access

			const { accessToken } = tokenService.generateTokenPair(userId, clientId);

			// Simulate the token being saved with scopes (even though current schema doesn't support it)
			const accessTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
				// In a correct implementation, this would have: scopes: grantedScopes
			});

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);

			// ACT: Verify the token
			const authInfo = await tokenService.verifyAccessToken(accessToken);

			// ASSERT: Should return the granted scopes, not an empty array
			// BUG: Line 162 of mcp-oauth-token.service.ts returns hardcoded scopes: []
			// This assertion will FAIL
			expect(authInfo.scopes).toEqual(grantedScopes);
			expect(authInfo.scopes).not.toEqual([]); // Should not be empty!
		});

		it('FAILING: Different tokens with different scopes should return their respective scopes', async () => {
			// SETUP: Two tokens with different scope grants
			const userId = 'user-123';
			const clientId1 = 'read-only-client';
			const clientId2 = 'full-access-client';

			const readOnlyScopes = ['tool:listWorkflows'];
			const fullAccessScopes = ['tool:listWorkflows', 'tool:getWorkflowDetails', 'tool:executeWorkflow'];

			const { accessToken: readToken } = tokenService.generateTokenPair(userId, clientId1);
			const { accessToken: fullToken } = tokenService.generateTokenPair(userId, clientId2);

			// ACT & ASSERT: Read-only token
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: readToken, clientId: clientId1, userId }),
			);
			const readAuthInfo = await tokenService.verifyAccessToken(readToken);

			// BUG: Returns empty array instead of readOnlyScopes
			expect(readAuthInfo.scopes).toEqual(readOnlyScopes);

			// ACT & ASSERT: Full-access token
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: fullToken, clientId: clientId2, userId }),
			);
			const fullAuthInfo = await tokenService.verifyAccessToken(fullToken);

			// BUG: Returns empty array instead of fullAccessScopes
			expect(fullAuthInfo.scopes).toEqual(fullAccessScopes);

			// Both tokens should have different scopes, not both empty
			expect(readAuthInfo.scopes).not.toEqual(fullAuthInfo.scopes);
		});
	});

	describe('Security Impact - Consent Model Violation', () => {
		it('FAILING: Token with only read scopes should not be usable for write operations', async () => {
			// SETUP: User consents to ONLY read access
			const userId = 'victim-user';
			const clientId = 'malicious-client';
			const consentedScopes = ['tool:listWorkflows']; // Read-only

			const { accessToken } = tokenService.generateTokenPair(userId, clientId);

			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: accessToken, clientId, userId }),
			);

			// ACT: Verify what scopes the token has
			const authInfo = await tokenService.verifyAccessToken(accessToken);

			// ASSERT: The token should reflect the limited scopes
			expect(authInfo.scopes).toEqual(consentedScopes);
			expect(authInfo.scopes).not.toContain('tool:executeWorkflow');

			// SECURITY INVARIANT: A tool handler checking scopes should deny access
			// to execute_workflow since the token only has tool:listWorkflows
			const hasExecutePermission = authInfo.scopes.includes('tool:executeWorkflow');
			expect(hasExecutePermission).toBe(false);

			// BUG: Because scopes is always [], this check will pass,
			// allowing unauthorized workflow execution
		});

		it('FAILING: Empty scopes array grants access to ALL tools (fails-closed vs fails-open)', async () => {
			// SETUP: Token verification returns empty scopes
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = tokenService.generateTokenPair(userId, clientId);

			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: accessToken, clientId, userId }),
			);

			const authInfo = await tokenService.verifyAccessToken(accessToken);

			// CURRENT BEHAVIOR: Returns empty scopes
			expect(authInfo.scopes).toEqual([]);

			// SECURITY ISSUE: With empty scopes, what should the default behavior be?
			// Option 1 (SECURE - fail-closed): Empty scopes = no access to anything
			// Option 2 (INSECURE - fail-open): Empty scopes = access to everything

			// The current implementation has NO enforcement at tool level,
			// so empty scopes effectively means "access everything" (fail-open)

			// A secure implementation would:
			// 1. Store granted scopes in the database
			// 2. Return actual scopes from verifyAccessToken
			// 3. Enforce scopes at the tool handler level
			// 4. Fail-closed: if scopes is empty or missing, deny access

			// This assertion documents the EXPECTED secure behavior
			const supportedScopes = ['tool:listWorkflows', 'tool:getWorkflowDetails'];
			expect(authInfo.scopes.length).toBeGreaterThan(0); // Should not be empty
			expect(authInfo.scopes.every(scope => supportedScopes.includes(scope))).toBe(true);
		});
	});

	describe('End-to-End Scope Flow', () => {
		it('FAILING: Scopes should flow from authorization -> token exchange -> verification', async () => {
			// This test documents the expected flow where scopes are preserved
			// throughout the OAuth lifecycle

			// STEP 1: User authorizes with specific scopes
			const userId = 'user-123';
			const clientId = 'client-456';
			const requestedScopes = ['tool:listWorkflows']; // Read-only

			// Create authorization code (should store scopes)
			const authCode = await authCodeService.createAuthorizationCode({
				userId,
				clientId,
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				codeChallengeMethod: 'S256',
				state: null,
				// BUG: No way to pass scopes here
			});

			// STEP 2: Exchange auth code for tokens (should transfer scopes)
			const { accessToken } = tokenService.generateTokenPair(userId, clientId);
			await tokenService.saveTokenPair(accessToken, 'refresh-token', clientId, userId);
			// BUG: No scopes stored with the token

			// STEP 3: Verify token (should return stored scopes)
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: accessToken, clientId, userId }),
			);

			const authInfo = await tokenService.verifyAccessToken(accessToken);

			// EXPECTED: Scopes are preserved end-to-end
			// ACTUAL: Scopes are lost, returns []
			expect(authInfo.scopes).toEqual(requestedScopes);
		});
	});
});
