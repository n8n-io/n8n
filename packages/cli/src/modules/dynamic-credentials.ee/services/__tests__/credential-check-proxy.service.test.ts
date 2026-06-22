import type { GlobalConfig } from '@n8n/config';
import type { IExecutionContext, PlaintextExecutionContext } from 'n8n-workflow';

import type { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import type { UrlService } from '@/services/url.service';
import type { ExecutionContextService } from 'n8n-core';
import { CredentialsEntity } from '@n8n/db';

import type { AuthorizeIntentService } from '../authorize-intent.service';
import type { CredentialResolverWorkflowService } from '../credential-resolver-workflow.service';
import { CredentialCheckProxyService } from '../credential-check-proxy.service';

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

describe('CredentialCheckProxyService', () => {
	let service: CredentialCheckProxyService;
	let mockCredentialResolverWorkflowService: jest.Mocked<CredentialResolverWorkflowService>;
	let mockExecutionContextService: jest.Mocked<ExecutionContextService>;
	let mockEnterpriseCredentialsService: jest.Mocked<EnterpriseCredentialsService>;
	let mockAuthorizeIntentService: jest.Mocked<AuthorizeIntentService>;
	let mockUrlService: jest.Mocked<UrlService>;

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
			decryptExecutionContext: jest.fn().mockResolvedValue(plaintextContext),
		} as unknown as jest.Mocked<ExecutionContextService>;

		mockEnterpriseCredentialsService = {
			getOne: jest.fn(),
		} as unknown as jest.Mocked<EnterpriseCredentialsService>;

		mockAuthorizeIntentService = {
			create: jest.fn().mockResolvedValue('intent-token'),
		} as unknown as jest.Mocked<AuthorizeIntentService>;

		mockUrlService = {
			getInstanceBaseUrl: jest.fn().mockReturnValue('http://localhost:5678'),
		} as unknown as jest.Mocked<UrlService>;

		const globalConfig = { endpoints: { rest: 'rest' } } as unknown as GlobalConfig;

		service = new CredentialCheckProxyService(
			mockCredentialResolverWorkflowService,
			mockExecutionContextService,
			mockEnterpriseCredentialsService,
			mockAuthorizeIntentService,
			mockUrlService,
			globalConfig,
		);
	});

	describe('checkCredentialStatus', () => {
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

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(true);
			expect(result.credentials).toHaveLength(1);
			expect(result.credentials[0].status).toBe('configured');
			expect(result.credentials[0].authorizationUrl).toBeUndefined();
			expect(mockAuthorizeIntentService.create).not.toHaveBeenCalled();
		});

		it('should return a short authorize link and capture an intent when credentials are missing', async () => {
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

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(false);
			expect(result.credentials).toHaveLength(1);
			expect(result.credentials[0].status).toBe('missing');
			expect(result.credentials[0].authorizationUrl).toBe(
				'http://localhost:5678/rest/credentials/cred-1/authorize?token=intent-token',
			);
			// The provider URL is built lazily at click-time, so the intent carries the
			// caller identity rather than a fully-formed authorization URL.
			expect(mockAuthorizeIntentService.create).toHaveBeenCalledWith({
				credentialId: 'cred-1',
				resolverId: 'resolver-1',
				identity: 'token-123',
				metadata: {},
			});
		});

		it('should also return a short link for OAuth1 credentials', async () => {
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

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.credentials[0].authorizationUrl).toBe(
				'http://localhost:5678/rest/credentials/cred-1/authorize?token=intent-token',
			);
			expect(mockAuthorizeIntentService.create).toHaveBeenCalledTimes(1);
		});

		it('should throw when no credential context in execution context', async () => {
			mockExecutionContextService.decryptExecutionContext.mockResolvedValue({
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: undefined,
			} as PlaintextExecutionContext);

			await expect(service.checkCredentialStatus('workflow-1', executionContext)).rejects.toThrow(
				'Execution context is present but contains no credential context. Ensure credential context establishment hooks are configured for this workflow.',
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

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(false);
			expect(result.credentials).toHaveLength(2);
			expect(result.credentials[0].status).toBe('configured');
			expect(result.credentials[0].authorizationUrl).toBeUndefined();
			expect(result.credentials[1].status).toBe('missing');
			expect(result.credentials[1].authorizationUrl).toBe(
				'http://localhost:5678/rest/credentials/cred-2/authorize?token=intent-token',
			);
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

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(false);
			expect(result.credentials[0].authorizationUrl).toBeUndefined();
			expect(mockAuthorizeIntentService.create).not.toHaveBeenCalled();
		});

		it('should capture an empty identity in the intent when identity is missing', async () => {
			mockExecutionContextService.decryptExecutionContext.mockResolvedValue({
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: {
					version: 1,
					metadata: {},
				},
			} as PlaintextExecutionContext);

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

			await service.checkCredentialStatus('workflow-1', executionContext);

			expect(mockAuthorizeIntentService.create).toHaveBeenCalledWith(
				expect.objectContaining({ identity: '' }),
			);
		});

		it('should not generate an authorize link for non-OAuth credential types', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'API Key',
					credentialType: 'apiKeyApi',
					resolverId: 'resolver-1',
					status: 'missing',
				},
			]);

			const mockCredential = createMockCredentialEntity({ id: 'cred-1', type: 'apiKeyApi' });
			mockEnterpriseCredentialsService.getOne.mockResolvedValue(mockCredential);

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.credentials[0].authorizationUrl).toBeUndefined();
			expect(mockAuthorizeIntentService.create).not.toHaveBeenCalled();
		});

		it('should return readyToExecute:true for empty credentials list', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([]);

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(true);
			expect(result.credentials).toHaveLength(0);
		});
	});
});
