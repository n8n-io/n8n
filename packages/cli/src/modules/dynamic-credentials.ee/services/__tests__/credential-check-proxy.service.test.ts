import type { Mocked } from 'vitest';
import type { GlobalConfig } from '@n8n/config';
import type {
	ICredentialContext,
	ICredentialType,
	IExecutionContext,
	INodeType,
	PlaintextExecutionContext,
	Themed,
} from 'n8n-workflow';

import type { CredentialTypes } from '@/credential-types';
import type { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import type { NodeTypes } from '@/node-types';
import type { UrlService } from '@/services/url.service';
import type { ExecutionContextService } from 'n8n-core';
import { CredentialsEntity } from '@n8n/db';

import type { AuthorizeIntentService } from '../authorize-intent.service';
import type { CredentialResolverWorkflowService } from '../credential-resolver-workflow.service';
import { CredentialCheckProxyService } from '../credential-check-proxy.service';
import type { DynamicCredentialService } from '../dynamic-credential.service';

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
	let mockCredentialResolverWorkflowService: Mocked<CredentialResolverWorkflowService>;
	let mockExecutionContextService: Mocked<ExecutionContextService>;
	let mockEnterpriseCredentialsService: Mocked<EnterpriseCredentialsService>;
	let mockAuthorizeIntentService: Mocked<AuthorizeIntentService>;
	let mockDynamicCredentialService: Mocked<DynamicCredentialService>;
	let mockUrlService: Mocked<UrlService>;
	let mockCredentialTypes: Mocked<CredentialTypes>;
	let mockNodeTypes: Mocked<NodeTypes>;

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
		vi.clearAllMocks();

		mockCredentialResolverWorkflowService = {
			getWorkflowStatus: vi.fn(),
		} as unknown as Mocked<CredentialResolverWorkflowService>;

		mockExecutionContextService = {
			decryptCredentialContext: vi.fn().mockResolvedValue(plaintextContext.credentials),
		} as unknown as Mocked<ExecutionContextService>;

		mockEnterpriseCredentialsService = {
			getOne: vi.fn(),
		} as unknown as Mocked<EnterpriseCredentialsService>;

		mockAuthorizeIntentService = {
			create: vi.fn().mockResolvedValue('intent-token'),
		} as unknown as Mocked<AuthorizeIntentService>;

		mockDynamicCredentialService = {
			resolveOwningUserIdForAuthorization: vi.fn().mockResolvedValue({ status: 'unbound' }),
		} as unknown as Mocked<DynamicCredentialService>;

		mockUrlService = {
			getInstanceBaseUrl: vi.fn().mockReturnValue('http://localhost:5678'),
		} as unknown as Mocked<UrlService>;

		// Unknown types throw in the real registry, which is the no-icon path.
		mockCredentialTypes = {
			getByName: vi.fn().mockImplementation(() => {
				throw new Error('Unrecognized credential type');
			}),
		} as unknown as Mocked<CredentialTypes>;

		mockNodeTypes = {
			getByName: vi.fn().mockImplementation(() => {
				throw new Error('Unrecognized node type');
			}),
		} as unknown as Mocked<NodeTypes>;

		const globalConfig = { endpoints: { rest: 'rest' } } as unknown as GlobalConfig;

		service = new CredentialCheckProxyService(
			mockCredentialResolverWorkflowService,
			mockExecutionContextService,
			mockEnterpriseCredentialsService,
			mockAuthorizeIntentService,
			mockDynamicCredentialService,
			mockUrlService,
			globalConfig,
			mockCredentialTypes,
			mockNodeTypes,
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
			mockExecutionContextService.decryptCredentialContext.mockResolvedValue(
				undefined as unknown as ICredentialContext,
			);

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
			mockExecutionContextService.decryptCredentialContext.mockResolvedValue({
				version: 1,
				metadata: {},
			} as unknown as ICredentialContext);

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

		it('should bind the intent to the resolved user when the resolver names one', async () => {
			mockDynamicCredentialService.resolveOwningUserIdForAuthorization.mockResolvedValue({
				status: 'bound',
				userId: 'user-1',
			});
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'OAuth2 API',
					credentialType: 'oauth2Api',
					resolverId: 'resolver-1',
					status: 'missing',
				},
			]);
			mockEnterpriseCredentialsService.getOne.mockResolvedValue(
				createMockCredentialEntity({ id: 'cred-1', type: 'oauth2Api' }),
			);

			await service.checkCredentialStatus('workflow-1', executionContext);

			expect(mockAuthorizeIntentService.create).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 'user-1' }),
			);
		});

		it('should not issue a link when the owning user cannot be resolved', async () => {
			mockDynamicCredentialService.resolveOwningUserIdForAuthorization.mockResolvedValue({
				status: 'unresolved',
			});
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'OAuth2 API',
					credentialType: 'oauth2Api',
					resolverId: 'resolver-1',
					status: 'missing',
				},
			]);
			mockEnterpriseCredentialsService.getOne.mockResolvedValue(
				createMockCredentialEntity({ id: 'cred-1', type: 'oauth2Api' }),
			);

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.credentials[0].authorizationUrl).toBeUndefined();
			expect(mockAuthorizeIntentService.create).not.toHaveBeenCalled();
		});

		it('should issue an unbound link when the resolver does not map to a user', async () => {
			mockDynamicCredentialService.resolveOwningUserIdForAuthorization.mockResolvedValue({
				status: 'unbound',
			});
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'OAuth2 API',
					credentialType: 'oauth2Api',
					resolverId: 'resolver-1',
					status: 'missing',
				},
			]);
			mockEnterpriseCredentialsService.getOne.mockResolvedValue(
				createMockCredentialEntity({ id: 'cred-1', type: 'oauth2Api' }),
			);

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.credentials[0].authorizationUrl).toBe(
				'http://localhost:5678/rest/credentials/cred-1/authorize?token=intent-token',
			);
			expect(mockAuthorizeIntentService.create).toHaveBeenCalledWith(
				expect.objectContaining({ userId: undefined }),
			);
		});

		it('should return readyToExecute:true for empty credentials list', async () => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([]);

			const result = await service.checkCredentialStatus('workflow-1', executionContext);

			expect(result.readyToExecute).toBe(true);
			expect(result.credentials).toHaveLength(0);
		});
	});

	describe('iconUrl', () => {
		const credentialType = (overrides: Partial<ICredentialType>): ICredentialType => ({
			name: 'someApi',
			displayName: 'Some API',
			properties: [],
			...overrides,
		});

		// Only the description's icon is read, so that's all the stand-in carries.
		const nodeType = (iconUrl: Themed<string>) => ({ description: { iconUrl } }) as INodeType;

		const iconUrlFor = async (type: string) => {
			mockCredentialResolverWorkflowService.getWorkflowStatus.mockResolvedValue([
				{
					credentialId: 'cred-1',
					credentialName: 'Google Sheets account',
					credentialType: type,
					resolverId: 'resolver-1',
					status: 'configured',
				},
			]);
			const result = await service.checkCredentialStatus('workflow-1', executionContext);
			return result.credentials[0].iconUrl;
		};

		it("should use the credential type's own iconUrl, made absolute", async () => {
			mockCredentialTypes.getByName.mockReturnValue(
				credentialType({ iconUrl: 'icons/n8n-nodes-base/dist/nodes/Slack/slack.svg' }),
			);

			await expect(iconUrlFor('slackOAuth2Api')).resolves.toBe(
				'http://localhost:5678/icons/n8n-nodes-base/dist/nodes/Slack/slack.svg',
			);
		});

		it('should use the light variant of a themed iconUrl', async () => {
			mockCredentialTypes.getByName.mockReturnValue(
				credentialType({ iconUrl: { light: 'icons/pkg/light.svg', dark: 'icons/pkg/dark.svg' } }),
			);

			await expect(iconUrlFor('themedApi')).resolves.toBe(
				'http://localhost:5678/icons/pkg/light.svg',
			);
		});

		it("should resolve a node: icon reference to that node type's icon", async () => {
			mockCredentialTypes.getByName.mockReturnValue(
				credentialType({ icon: 'node:n8n-nodes-base.googleSheets' }),
			);
			mockNodeTypes.getByName.mockReturnValue(
				nodeType('icons/n8n-nodes-base/dist/nodes/Google/Sheet/googleSheets.svg'),
			);

			await expect(iconUrlFor('googleSheetsOAuth2Api')).resolves.toBe(
				'http://localhost:5678/icons/n8n-nodes-base/dist/nodes/Google/Sheet/googleSheets.svg',
			);
			expect(mockNodeTypes.getByName).toHaveBeenCalledWith('n8n-nodes-base.googleSheets');
		});

		it('should fall back to the extends chain when the type has no icon of its own', async () => {
			mockCredentialTypes.getByName.mockImplementation((name) =>
				name === 'childApi'
					? credentialType({ name, extends: ['parentApi'] })
					: credentialType({ name, iconUrl: 'icons/pkg/parent.svg' }),
			);

			await expect(iconUrlFor('childApi')).resolves.toBe(
				'http://localhost:5678/icons/pkg/parent.svg',
			);
		});

		it('should not loop on a circular extends chain', async () => {
			mockCredentialTypes.getByName.mockImplementation((name) =>
				credentialType({ name, extends: [name === 'aApi' ? 'bApi' : 'aApi'] }),
			);

			await expect(iconUrlFor('aApi')).resolves.toBeUndefined();
		});

		it('should leave iconUrl undefined when nothing resolves', async () => {
			await expect(iconUrlFor('unknownApi')).resolves.toBeUndefined();
		});

		it('should leave an already-absolute iconUrl untouched', async () => {
			mockCredentialTypes.getByName.mockReturnValue(
				credentialType({ iconUrl: 'https://cdn.example.com/icon.svg' }),
			);

			await expect(iconUrlFor('remoteApi')).resolves.toBe('https://cdn.example.com/icon.svg');
		});

		it('should ignore fa: icons, which the shell cannot render', async () => {
			mockCredentialTypes.getByName.mockReturnValue(credentialType({ icon: 'fa:key' }));

			await expect(iconUrlFor('faApi')).resolves.toBeUndefined();
		});
	});
});
