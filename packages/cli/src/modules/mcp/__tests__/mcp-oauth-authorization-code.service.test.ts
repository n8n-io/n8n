import { MoreThan, type DataSource, type EntityManager, type UpdateResult } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

import { AuthorizationCode } from '../database/entities/oauth-authorization-code.entity';
import { AuthorizationCodeRepository } from '../database/repositories/oauth-authorization-code.repository';
import { McpOAuthAuthorizationCodeService } from '../mcp-oauth-authorization-code.service';

let authorizationCodeRepository: AuthorizationCodeRepository;
let service: McpOAuthAuthorizationCodeService;
const manager = mock<EntityManager>();

describe('McpOAuthAuthorizationCodeService', () => {
	beforeAll(() => {
		authorizationCodeRepository = new AuthorizationCodeRepository(mock<DataSource>({ manager }));
		service = new McpOAuthAuthorizationCodeService(authorizationCodeRepository);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createAuthorizationCode', () => {
		it('should generate and save authorization code with all parameters', async () => {
			const clientId = 'client-123';
			const userId = 'user-456';
			const redirectUri = 'https://example.com/callback';
			const codeChallenge = 'challenge-abc';
			const state = 'state-xyz';

			manager.insert.mockResolvedValue(mock());

			const result = await service.createAuthorizationCode(
				clientId,
				userId,
				redirectUri,
				codeChallenge,
				state,
			);

			expect(result).toHaveLength(64); // 32 bytes hex = 64 characters
			expect(manager.insert).toHaveBeenCalledWith(AuthorizationCode, {
				code: result,
				clientId,
				userId,
				redirectUri,
				codeChallenge,
				codeChallengeMethod: 'S256',
				state,
				expiresAt: expect.any(Number),
				used: false,
			});
		});

		it('should handle null state', async () => {
			manager.insert.mockResolvedValue(mock());

			await service.createAuthorizationCode(
				'client-123',
				'user-456',
				'https://example.com',
				'challenge',
				null,
			);

			expect(manager.insert).toHaveBeenCalledWith(
				AuthorizationCode,
				expect.objectContaining({
					state: null,
				}),
			);
		});
	});

	describe('findAndValidateAuthorizationCode', () => {
		it('should return auth record when valid', async () => {
			const authRecord = mock<AuthorizationCode>({
				code: 'code-123',
				clientId: 'client-123',
				expiresAt: Date.now() + 10000, // Future expiry
				used: false,
			});

			manager.findOne.mockResolvedValue(authRecord);

			const result = await service.findAndValidateAuthorizationCode('code-123', 'client-123');

			expect(result).toEqual(authRecord);
			expect(manager.findOne).toHaveBeenCalledWith(AuthorizationCode, {
				where: {
					code: 'code-123',
					clientId: 'client-123',
				},
			});
		});

		it('should throw error when authorization code not found', async () => {
			manager.findOne.mockResolvedValue(null);

			await expect(
				service.findAndValidateAuthorizationCode('invalid-code', 'client-123'),
			).rejects.toThrow('Invalid authorization code');
		});

		it('should throw error and remove when authorization code expired', async () => {
			const authRecord = mock<AuthorizationCode>({
				code: 'code-123',
				clientId: 'client-123',
				expiresAt: Date.now() - 1000, // Expired
			});

			manager.findOne.mockResolvedValue(authRecord);

			await expect(
				service.findAndValidateAuthorizationCode('code-123', 'client-123'),
			).rejects.toThrow('Authorization code expired');

			expect(manager.delete).toHaveBeenCalledWith(AuthorizationCode, {
				code: authRecord.code,
				clientId: 'client-123',
			});
		});
	});

	describe('validateAndConsumeAuthorizationCode', () => {
		it('should mark code as used and return auth record', async () => {
			const authRecord = mock<AuthorizationCode>({
				code: 'code-123',
				clientId: 'client-123',
				expiresAt: Date.now() + 10000,
				used: false,
				redirectUri: 'https://example.com/callback',
			});

			manager.findOne.mockResolvedValue(authRecord);
			manager.update.mockResolvedValue(mock<UpdateResult>({ affected: 1 }));

			const result = await service.validateAndConsumeAuthorizationCode(
				'code-123',
				'client-123',
				'https://example.com/callback',
			);

			expect(result).toEqual(authRecord);
			expect(authRecord.used).toBe(true);
			expect(manager.update).toHaveBeenCalledWith(
				AuthorizationCode,
				{
					code: 'code-123',
					clientId: 'client-123',
					used: false,
					expiresAt: MoreThan(expect.any(Number)),
				},
				{ used: true },
			);
		});

		it('should throw error when code already used (atomic update fails)', async () => {
			const authRecord = mock<AuthorizationCode>({
				code: 'code-123',
				clientId: 'client-123',
				expiresAt: Date.now() + 10000,
				used: false,
				redirectUri: 'https://example.com/callback',
			});

			manager.findOne.mockResolvedValue(authRecord);
			manager.update.mockResolvedValue(mock<UpdateResult>({ affected: 0 }));

			await expect(
				service.validateAndConsumeAuthorizationCode('code-123', 'client-123'),
			).rejects.toThrow('Authorization code already used');
		});

		it('should throw error when redirect URI mismatch', async () => {
			const authRecord = mock<AuthorizationCode>({
				code: 'code-123',
				clientId: 'client-123',
				expiresAt: Date.now() + 10000,
				used: false,
				redirectUri: 'https://example.com/callback',
			});

			manager.findOne.mockResolvedValue(authRecord);

			await expect(
				service.validateAndConsumeAuthorizationCode(
					'code-123',
					'client-123',
					'https://evil.com/callback',
				),
			).rejects.toThrow('Redirect URI mismatch');
		});

		it('should allow missing redirect URI parameter', async () => {
			const authRecord = mock<AuthorizationCode>({
				code: 'code-123',
				clientId: 'client-123',
				expiresAt: Date.now() + 10000,
				used: false,
				redirectUri: 'https://example.com/callback',
			});

			manager.findOne.mockResolvedValue(authRecord);
			manager.update.mockResolvedValue(mock<UpdateResult>({ affected: 1 }));

			const result = await service.validateAndConsumeAuthorizationCode('code-123', 'client-123');

			expect(result).toEqual(authRecord);
			expect(manager.update).toHaveBeenCalledWith(
				AuthorizationCode,
				{
					code: 'code-123',
					clientId: 'client-123',
					used: false,
					expiresAt: MoreThan(expect.any(Number)),
				},
				{ used: true },
			);
		});
	});

	describe('getCodeChallenge', () => {
		it('should return code challenge from valid auth record', async () => {
			const authRecord = mock<AuthorizationCode>({
				code: 'code-123',
				clientId: 'client-123',
				expiresAt: Date.now() + 10000,
				codeChallenge: 'challenge-abc',
			});

			manager.findOne.mockResolvedValue(authRecord);

			const result = await service.getCodeChallenge('code-123', 'client-123');

			expect(result).toBe('challenge-abc');
		});

		it('should throw error when code invalid', async () => {
			manager.findOne.mockResolvedValue(null);

			await expect(service.getCodeChallenge('invalid-code', 'client-123')).rejects.toThrow(
				'Invalid authorization code',
			);
		});
	});
});
