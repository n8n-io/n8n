import type { CredentialsRepository, WorkflowRepository } from '@n8n/db';
import { CredentialsEntity, WorkflowEntity } from '@n8n/db';
import type { ICredentialResolver } from '@n8n/decorators';
import type { Cipher } from 'n8n-core';
import type { INode } from 'n8n-workflow';

import type { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';

import { DynamicCredentialResolver } from '../../database/entities/credential-resolver';
import type { DynamicCredentialResolverRepository } from '../../database/repositories/credential-resolver.repository';
import type { DynamicCredentialResolverRegistry } from '../credential-resolver-registry.service';
import { CredentialResolverWorkflowService } from '../credential-resolver-workflow.service';
import type { Mocked } from 'vitest';

const createMockWorkflow = (overrides: Partial<WorkflowEntity> = {}): WorkflowEntity => {
	const workflow = new WorkflowEntity();
	workflow.id = 'workflow-1';
	workflow.name = 'Test Workflow';
	workflow.description = null;
	workflow.active = false;
	workflow.isArchived = false;
	workflow.nodes = [];
	workflow.connections = {};
	workflow.settings = {};
	workflow.createdAt = new Date('2024-01-01');
	workflow.updatedAt = new Date('2024-01-01');
	Object.assign(workflow, overrides);
	return workflow;
};

const createMockCredential = (overrides: Partial<CredentialsEntity> = {}): CredentialsEntity => {
	const credential = new CredentialsEntity();
	credential.id = 'cred-1';
	credential.name = 'Test Credential';
	credential.type = 'oauth2Api';
	credential.data = '';
	credential.shared = [];
	credential.isManaged = false;
	credential.isGlobal = false;
	credential.isResolvable = true;
	credential.resolvableAllowFallback = false;
	credential.resolverId = null;
	credential.createdAt = new Date('2024-01-01');
	credential.updatedAt = new Date('2024-01-01');
	Object.assign(credential, overrides);
	return credential;
};

const createMockResolver = (
	overrides: Partial<DynamicCredentialResolver> = {},
): DynamicCredentialResolver => {
	const resolver = new DynamicCredentialResolver();
	resolver.id = 'resolver-1';
	resolver.name = 'Test Resolver';
	resolver.type = 'test.resolver';
	resolver.config = 'encrypted-config';
	resolver.createdAt = new Date('2024-01-01');
	resolver.updatedAt = new Date('2024-01-01');
	Object.assign(resolver, overrides);
	return resolver;
};

const createMockNode = (overrides: Partial<INode> = {}): INode => {
	return {
		id: 'node-1',
		name: 'Node1',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: {},
		...overrides,
	};
};

describe('CredentialResolverWorkflowService', () => {
	let service: CredentialResolverWorkflowService;
	let mockWorkflowRepository: Mocked<WorkflowRepository>;
	let mockCredentialRepository: Mocked<CredentialsRepository>;
	let mockResolverRegistry: Mocked<DynamicCredentialResolverRegistry>;
	let mockResolverRepository: Mocked<DynamicCredentialResolverRepository>;
	let mockCipher: Mocked<Cipher>;
	let mockResolverImplementation: Mocked<ICredentialResolver>;
	let mockDynamicCredentialsProxy: Mocked<DynamicCredentialsProxy>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockWorkflowRepository = {
			get: vi.fn(),
		} as unknown as Mocked<WorkflowRepository>;

		mockCredentialRepository = {
			find: vi.fn(),
		} as unknown as Mocked<CredentialsRepository>;

		mockResolverRegistry = {
			getResolverByTypename: vi.fn(),
		} as unknown as Mocked<DynamicCredentialResolverRegistry>;

		mockResolverRepository = {
			findOneBy: vi.fn(),
		} as unknown as Mocked<DynamicCredentialResolverRepository>;

		mockCipher = {
			decryptV2: vi.fn(),
		} as unknown as Mocked<Cipher>;

		mockResolverImplementation = {
			metadata: {
				name: 'test.resolver',
				description: 'A test resolver',
			},
			getSecret: vi.fn(),
			setSecret: vi.fn(),
			validateOptions: vi.fn(),
		};

		mockDynamicCredentialsProxy = {
			getSystemResolverId: vi.fn().mockReturnValue(null),
			// Default to the real semantics with no system resolver seeded:
			// pass through the workflow override if any, otherwise null.
			getEffectiveResolverId: vi.fn((settings) => settings?.credentialResolverId ?? null),
		} as unknown as Mocked<DynamicCredentialsProxy>;

		service = new CredentialResolverWorkflowService(
			mockWorkflowRepository,
			mockCredentialRepository,
			mockResolverRegistry,
			mockResolverRepository,
			mockCipher,
			mockDynamicCredentialsProxy,
		);
	});

	describe('getWorkflowStatus', () => {
		it('should throw when workflow not found', async () => {
			mockWorkflowRepository.get.mockResolvedValue(null);

			await expect(
				service.getWorkflowStatus('workflow-1', {
					identity: 'token-123',
					version: 1 as const,
					metadata: {},
				}),
			).rejects.toThrow('Workflow not found');
		});

		it('should return empty array when workflow has no nodes', async () => {
			mockWorkflowRepository.get.mockResolvedValue(createMockWorkflow({ nodes: [] }));

			const result = await service.getWorkflowStatus('workflow-1', {
				identity: 'token-123',
				version: 1 as const,
				metadata: {},
			});

			expect(result).toEqual([]);
			expect(mockCredentialRepository.find).not.toHaveBeenCalled();
		});

		it('should return empty array when workflow has no credentials', async () => {
			mockWorkflowRepository.get.mockResolvedValue(
				createMockWorkflow({
					nodes: [createMockNode({ credentials: {} })],
				}),
			);

			const result = await service.getWorkflowStatus('workflow-1', {
				identity: 'token-123',
				version: 1 as const,
				metadata: {},
			});

			expect(result).toEqual([]);
			expect(mockCredentialRepository.find).not.toHaveBeenCalled();
		});

		it('should return configured status when getSecret succeeds', async () => {
			const mockWorkflow = createMockWorkflow({
				nodes: [
					createMockNode({
						credentials: {
							oauth2Api: { id: 'cred-1', name: 'OAuth2 API' },
						},
					}),
				],
				settings: { credentialResolverId: 'resolver-1' },
			});

			const mockCredential = createMockCredential({
				id: 'cred-1',
				type: 'oauth2Api',
				name: 'OAuth2 API',
				isResolvable: true,
				resolverId: null,
			});

			const mockResolver = createMockResolver({
				id: 'resolver-1',
				type: 'test.resolver',
				config: 'encrypted-config',
			});

			mockWorkflowRepository.get.mockResolvedValue(mockWorkflow);
			mockCredentialRepository.find.mockResolvedValue([mockCredential]);
			mockResolverRepository.findOneBy.mockResolvedValue(mockResolver);
			mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockCipher.decryptV2.mockResolvedValue(JSON.stringify({ prefix: 'test' }));
			mockResolverImplementation.getSecret.mockResolvedValue('secret-value' as any);

			const credentialContext = {
				identity: 'token-123',
				version: 1 as const,
				metadata: {},
			};

			const result = await service.getWorkflowStatus('workflow-1', credentialContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				credentialId: 'cred-1',
				resolverId: 'resolver-1',
				credentialName: 'OAuth2 API',
				status: 'configured',
				credentialType: 'oauth2Api',
			});
			expect(mockResolverImplementation.getSecret).toHaveBeenCalledWith(
				'cred-1',
				credentialContext,
				{
					configuration: { prefix: 'test' },
					resolverName: 'test.resolver',
					resolverId: 'resolver-1',
				},
			);
		});

		it('should return missing status when getSecret fails', async () => {
			const mockWorkflow = createMockWorkflow({
				nodes: [
					createMockNode({
						credentials: {
							oauth2Api: { id: 'cred-1', name: 'OAuth2 API' },
						},
					}),
				],
				settings: { credentialResolverId: 'resolver-1' },
			});

			const mockCredential = createMockCredential({
				id: 'cred-1',
				type: 'oauth2Api',
				name: 'OAuth2 API',
				isResolvable: true,
				resolverId: null,
			});

			const mockResolver = createMockResolver({
				id: 'resolver-1',
				type: 'test.resolver',
				config: 'encrypted-config',
			});

			mockWorkflowRepository.get.mockResolvedValue(mockWorkflow);
			mockCredentialRepository.find.mockResolvedValue([mockCredential]);
			mockResolverRepository.findOneBy.mockResolvedValue(mockResolver);
			mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockCipher.decryptV2.mockResolvedValue(JSON.stringify({ prefix: 'test' }));
			mockResolverImplementation.getSecret.mockRejectedValue(new Error('Secret not found'));

			const result = await service.getWorkflowStatus('workflow-1', {
				identity: 'token-123',
				version: 1 as const,
				metadata: {},
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				credentialId: 'cred-1',
				resolverId: 'resolver-1',
				credentialName: 'OAuth2 API',
				status: 'missing',
				credentialType: 'oauth2Api',
			});
		});

		it('should use credential-level resolver when present', async () => {
			const mockWorkflow = createMockWorkflow({
				nodes: [
					createMockNode({
						credentials: {
							oauth2Api: { id: 'cred-1', name: 'OAuth2 API' },
						},
					}),
				],
				settings: { credentialResolverId: 'resolver-1' },
			});

			const mockCredential = createMockCredential({
				id: 'cred-1',
				type: 'oauth2Api',
				isResolvable: true,
				resolverId: 'resolver-2',
			});

			const mockResolver1 = createMockResolver({
				id: 'resolver-1',
				type: 'test.resolver',
				config: 'encrypted-config-1',
			});

			const mockResolver2 = createMockResolver({
				id: 'resolver-2',
				type: 'test.resolver',
				config: 'encrypted-config-2',
			});

			mockWorkflowRepository.get.mockResolvedValue(mockWorkflow);
			mockCredentialRepository.find.mockResolvedValue([mockCredential]);
			mockResolverRepository.findOneBy
				.mockResolvedValueOnce(mockResolver1)
				.mockResolvedValueOnce(mockResolver2);
			mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockCipher.decryptV2
				.mockResolvedValueOnce(JSON.stringify({ prefix: 'test-1' }))
				.mockResolvedValueOnce(JSON.stringify({ prefix: 'test-2' }));
			mockResolverImplementation.getSecret.mockResolvedValue('secret-value' as any);

			const credentialContext = {
				identity: 'token-123',
				version: 1 as const,
				metadata: {},
			};

			const result = await service.getWorkflowStatus('workflow-1', credentialContext);

			expect(result).toHaveLength(1);
			expect(result[0].resolverId).toBe('resolver-2');
			expect(mockResolverImplementation.getSecret).toHaveBeenCalledWith(
				'cred-1',
				credentialContext,
				{
					configuration: { prefix: 'test-2' },
					resolverName: 'test.resolver',
					resolverId: 'resolver-2',
				},
			);
		});

		it('should return resolver_missing status for credentials without resolver ID', async () => {
			const mockWorkflow = createMockWorkflow({
				nodes: [
					createMockNode({
						credentials: {
							oauth2Api: { id: 'cred-1', name: 'OAuth2 API' },
						},
					}),
				],
				settings: {},
			});

			const mockCredential = createMockCredential({
				id: 'cred-1',
				type: 'oauth2Api',
				name: 'OAuth2 API',
				isResolvable: true,
				resolverId: null,
			});

			mockWorkflowRepository.get.mockResolvedValue(mockWorkflow);
			mockCredentialRepository.find.mockResolvedValue([mockCredential]);

			const result = await service.getWorkflowStatus('workflow-1', {
				identity: 'token-123',
				version: 1 as const,
				metadata: {},
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				credentialId: 'cred-1',
				credentialName: 'OAuth2 API',
				status: 'resolver_missing',
				credentialType: 'oauth2Api',
			});
			expect(mockResolverImplementation.getSecret).not.toHaveBeenCalled();
		});

		it('should handle multiple credentials in parallel', async () => {
			const mockWorkflow = createMockWorkflow({
				nodes: [
					createMockNode({
						credentials: {
							oauth2Api: { id: 'cred-1', name: 'OAuth2 API' },
							httpBasicAuth: { id: 'cred-2', name: 'Basic Auth' },
						},
					}),
				],
				settings: { credentialResolverId: 'resolver-1' },
			});

			const mockCredentials = [
				createMockCredential({
					id: 'cred-1',
					type: 'oauth2Api',
					isResolvable: true,
					resolverId: null,
				}),
				createMockCredential({
					id: 'cred-2',
					type: 'httpBasicAuth',
					isResolvable: true,
					resolverId: null,
				}),
			];

			const mockResolver = createMockResolver({
				id: 'resolver-1',
				type: 'test.resolver',
				config: 'encrypted-config',
			});

			mockWorkflowRepository.get.mockResolvedValue(mockWorkflow);
			mockCredentialRepository.find.mockResolvedValue(mockCredentials);
			mockResolverRepository.findOneBy.mockResolvedValue(mockResolver);
			mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockCipher.decryptV2.mockResolvedValue(JSON.stringify({ prefix: 'test' }));
			mockResolverImplementation.getSecret
				.mockResolvedValueOnce('secret-1' as any)
				.mockResolvedValueOnce('secret-2' as any);

			const result = await service.getWorkflowStatus('workflow-1', {
				identity: 'token-123',
				version: 1 as const,
				metadata: {},
			});

			expect(result).toHaveLength(2);
			expect(mockResolverImplementation.getSecret).toHaveBeenCalledTimes(2);
			expect(result[0].status).toBe('configured');
			expect(result[1].status).toBe('configured');
		});

		it('should handle mixed success and failure statuses', async () => {
			const mockWorkflow = createMockWorkflow({
				nodes: [
					createMockNode({
						credentials: {
							oauth2Api: { id: 'cred-1', name: 'OAuth2 API' },
							httpBasicAuth: { id: 'cred-2', name: 'Basic Auth' },
						},
					}),
				],
				settings: { credentialResolverId: 'resolver-1' },
			});

			const mockCredentials = [
				createMockCredential({
					id: 'cred-1',
					type: 'oauth2Api',
					isResolvable: true,
					resolverId: null,
				}),
				createMockCredential({
					id: 'cred-2',
					type: 'httpBasicAuth',
					isResolvable: true,
					resolverId: null,
				}),
			];

			const mockResolver = createMockResolver({
				id: 'resolver-1',
				type: 'test.resolver',
				config: 'encrypted-config',
			});

			mockWorkflowRepository.get.mockResolvedValue(mockWorkflow);
			mockCredentialRepository.find.mockResolvedValue(mockCredentials);
			mockResolverRepository.findOneBy.mockResolvedValue(mockResolver);
			mockResolverRegistry.getResolverByTypename.mockReturnValue(mockResolverImplementation);
			mockCipher.decryptV2.mockResolvedValue(JSON.stringify({ prefix: 'test' }));
			mockResolverImplementation.getSecret
				.mockResolvedValueOnce('secret-1' as any)
				.mockRejectedValueOnce(new Error('Secret not found'));

			const result = await service.getWorkflowStatus('workflow-1', {
				identity: 'token-123',
				version: 1 as const,
				metadata: {},
			});

			expect(result).toHaveLength(2);
			expect(result[0].status).toBe('configured');
			expect(result[1].status).toBe('missing');
		});
	});
});
