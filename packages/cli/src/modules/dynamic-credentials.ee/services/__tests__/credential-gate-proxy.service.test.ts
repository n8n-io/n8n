import type { IExecutionContext, PlaintextExecutionContext } from 'n8n-workflow';

import type { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import type { OauthService } from '@/oauth/oauth.service';
import type { ExecutionContextService } from 'n8n-core';
import type { Logger } from '@n8n/backend-common';
import { CredentialsEntity } from '@n8n/db';

import type { CredentialResolverWorkflowService } from '../credential-resolver-workflow.service';
import { CredentialGateProxyService } from '../credential-gate-proxy.service';

const createMockCredentialEntity = (
	overrides: Partial<CredentialsEntity> = {},
): CredentialsEntity => {
	const cred = new CredentialsEntity();
	cred.id = 'cred-1';
	cred.name = 'Test Credential';
	cred.type = 'oauth2Api';
	cred.data = '';
	cred.shared = [];
	cred.isManaged = false;
	cred.isGlobal = false;
	cred.isResolvable = true;
	cred.resolvableAllowFallback = false;
	cred.resolverId = null;
	cred.createdAt = new Date('2024-01-01');
	cred.updatedAt = new Date('2024-01-01');
	Object.assign(cred, overrides);
	return cred;
};

describe('CredentialGateProxyService', () => {
	let service: CredentialGateProxyService;
	let mockCredentialResolverWorkflowService: jest.Mocked<CredentialResolverWorkflowService>;
	let mockExecutionContextService: jest.Mocked<ExecutionContextService>;
	let mockOauthService: jest.Mocked<OauthService>;
	let mockEnterpriseCredentialsService: jest.Mocked<EnterpriseCredentialsService>;
	let mockLogger: jest.Mocked<Logger>;

	const executionContext: IExecutionContext = {
		version: 1,
		establishedAt: Date.now(),
		source: 'webhook',
		credentials: 'encrypted-credentials',
	};

	const plaintextContext: PlaintextExecutionContext = {
		version: 1,
		establishedAt: Date.now(),
		source: 'webhook',
		credentials: {
			identity: 'token-123',
			version: 1,
			metadata: {},
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockCredentialResolverWorkflowService = {
			getWorkflowStatus: jest.fn(),
		} as unknown as jest.Mocked<CredentialResolverWorkflowService>;

		mockExecutionContextService = {
			decryptExecutionContext: jest.fn().mockReturnValue(plaintextContext),
		} as unknown as jest.Mocked<ExecutionContextService>;

		mockOauthService = {
			generateAOauth2AuthUri: jest.fn(),
			generateAOauth1AuthUri: jest.fn(),
		} as unknown as jest.Mocked<OauthService>;

		mockEnterpriseCredentialsService = {
			getOne: jest.fn(),
		} as unknown as jest.Mocked<EnterpriseCredentialsService>;

		mockLogger = {
			debug: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		service = new CredentialGateProxyService(
			mockCredentialResolverWorkflowService,
			mockExecutionContextService,
			mockOauthService,
			mockEnterpriseCredentialsService,
			mockLogger,
		);
	});

	describe('checkCredentialGate', () => {
		it('should return readyToExecute:true when all credentials are configured', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'OAuth2 API',
					credentialType: 'oauth2Api',
					resolverId: 'resolver-1',
					status: 'configured',
				},
			]);

			const result = await service.checkCredentialGate('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(true);
			expect(result.credentials).toHaveLength(1);
			expect(result.credentials[0].status).toBe('configured');
			expect(result.credentials[0].authorizationUrl).toBeUndefined();
		});

		it('should return readyToExecute:false with OAuth URLs when credentials are missing', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'OAuth2 API',
					credentialType: 'oauth2Api',
					resolverId: 'resolver-1',
					status: 'missing',
				},
			]);

			const mockCredential = createMockCredentialEntity({ id: 'cred-1', type: 'oauth2Api' });
			mockEnterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			mockOauthService.generateAOauth2AuthUri.mockResolvedValue(
				'https://accounts.google.com/o/oauth2/auth?...',
			);

			const result = await service.checkCredentialGate('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(false);
			expect(result.credentials).toHaveLength(1);
			expect(result.credentials[0].status).toBe('missing');
			expect(result.credentials[0].authorizationUrl).toBe(
				'https://accounts.google.com/o/oauth2/auth?...',
			);
			expect(mockOauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(
				mockCredential,
				expect.objectContaining({
					cid: 'cred-1',
					origin: 'dynamic-credential',
					credentialResolverId: 'resolver-1',
				}),
			);
		});

		it('should generate OAuth1 URL for OAuth1 credentials', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'Twitter OAuth1',
					credentialType: 'twitterOAuth1Api',
					resolverId: 'resolver-1',
					status: 'missing',
				},
			]);

			const mockCredential = createMockCredentialEntity({
				id: 'cred-1',
				type: 'twitterOAuth1Api',
			});
			mockEnterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			mockOauthService.generateAOauth1AuthUri.mockResolvedValue(
				'https://api.twitter.com/oauth/authorize?...',
			);

			const result = await service.checkCredentialGate('workflow-1', executionContext);

			expect(result.credentials[0].authorizationUrl).toBe(
				'https://api.twitter.com/oauth/authorize?...',
			);
			expect(mockOauthService.generateAOauth1AuthUri).toHaveBeenCalled();
			expect(mockOauthService.generateAOauth2AuthUri).not.toHaveBeenCalled();
		});

		it('should throw when no credential context in execution context', async () => {
			mockExecutionContextService.decryptExecutionContext.mockReturnValue({
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: undefined,
			} as PlaintextExecutionContext);

			await expect(service.checkCredentialGate('workflow-1', executionContext)).rejects.toThrow(
				'No credential context found in execution context',
			);
		});

		it('should handle mixed configured and missing credentials', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'OAuth2 API',
					credentialType: 'oauth2Api',
					resolverId: 'resolver-1',
					status: 'configured',
				},
				{
					credentialId: 'cred-2',
					credentialName: 'Another OAuth2',
					credentialType: 'oauth2Api',
					resolverId: 'resolver-1',
					status: 'missing',
				},
			]);

			const mockCredential = createMockCredentialEntity({ id: 'cred-2', type: 'oauth2Api' });
			mockEnterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);
			mockOauthService.generateAOauth2AuthUri.mockResolvedValue('https://auth.example.com');

			const result = await service.checkCredentialGate('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(false);
			expect(result.credentials).toHaveLength(2);
			expect(result.credentials[0].status).toBe('configured');
			expect(result.credentials[0].authorizationUrl).toBeUndefined();
			expect(result.credentials[1].status).toBe('missing');
			expect(result.credentials[1].authorizationUrl).toBe('https://auth.example.com');
		});

		it('should return undefined authorizationUrl when credential is not found', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-missing',
					credentialName: 'Missing Cred',
					credentialType: 'oauth2Api',
					resolverId: 'resolver-1',
					status: 'missing',
				},
			]);

			mockEnterpriseCredentialsService.getOne.mockResolvedValue(null);

			const result = await service.checkCredentialGate('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(false);
			expect(result.credentials[0].authorizationUrl).toBeUndefined();
		});

		it('should return readyToExecute:true for empty credentials list', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([]);

			const result = await service.checkCredentialGate('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(true);
			expect(result.credentials).toHaveLength(0);
		});
	});
});
