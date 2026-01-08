import type { CredentialsRepository, WorkflowRepository } from '@n8n/db';
import { CredentialsEntity, WorkflowEntity } from '@n8n/db';
import type { ICredentialResolver } from '@n8n/decorators';
import type { Cipher } from 'n8n-core';
import type { INode } from 'n8n-workflow';

import { DynamicCredentialResolver } from '../../database/entities/credential-resolver';
import type { DynamicCredentialResolverRepository } from '../../database/repositories/credential-resolver.repository';
import type { DynamicCredentialResolverRegistry } from '../credential-resolver-registry.service';
import { CredentialResolverWorkflowService } from '../credential-resolver-workflow.service';

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
	let mockWorkflowRepository: jest.Mocked<WorkflowRepository>;
	let mockCredentialRepository: jest.Mocked<CredentialsRepository>;
	let mockResolverRegistry: jest.Mocked<DynamicCredentialResolverRegistry>;
	let mockResolverRepository: jest.Mocked<DynamicCredentialResolverRepository>;
	let mockCipher: jest.Mocked<Cipher>;
	let mockResolverImplementation: jest.Mocked<ICredentialResolver>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockWorkflowRepository = {
			get: jest.fn(),
		} as unknown as jest.Mocked<WorkflowRepository>;

		mockCredentialRepository = {
			find: jest.fn(),
		} as unknown as jest.Mocked<CredentialsRepository>;

		mockResolverRegistry = {
			getResolverByTypename: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRegistry>;

		mockResolverRepository = {
			findOneBy: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialResolverRepository>;

		mockCipher = {
			decrypt: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;

		mockResolverImplementation = {
			metadata: {
				name: 'test.resolver',
				description: 'A test resolver',
			},
			getSecret: jest.fn(),
			setSecret: jest.fn(),
			validateOptions: jest.fn(),
		};

		service = new CredentialResolverWorkflowService(
			mockWorkflowRepository,
			mockCredentialRepository,
			mockResolverRegistry,
			mockResolverRepository,
			mockCipher,
		);
	});

	describe('getWorkflowStatus', () => {
		it('should throw when workflow not found', async () => {
			mockWorkflowRepository.get.mockResolvedValue(null);

			await expect(service.getWorkflowStatus('workflow-1', 'token-123')).rejects.toThrow(
				'Workflow not found',
			);
		});

		it('should return empty array when workflow has no nodes', async () => {
			mockWorkflowRepository.get.mockResolvedValue(createMockWorkflow({ nodes: [] }));

			const result = await service.getWorkflowStatus('workflow-1', 'token-123');

			expect(result).toEqual([]);
			expect(mockCredentialRepository.find).not.toHaveBeenCalled();
		});

		it('should return empty array when workflow has no credentials', async () => {
			mockWorkflowRepository.get.mockResolvedValue(
				createMockWorkflow({
					nodes: [createMockNode({ credentials: {} })],
				}),
			);

			const result = await service.getWorkflowStatus('workflow-1', 'token-123');

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
			mockCipher.decrypt.mockReturnValue(JSON.stringify({ prefix: 'test' }));
			mockResolverImplementation.getSecret.mockResolvedValue('secret-value' as any);

			const result = await service.getWorkflowStatus('workflow-1', 'token-123');

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
				{ identity: 'token-123', version: 1 },
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
			mockCipher.decrypt.mockReturnValue(JSON.stringify({ prefix: 'test' }));
			mockResolverImplementation.getSecret.mockRejectedValue(new Error('Secret not found'));

			const result = await service.getWorkflowStatus('workflow-1', 'token-123');

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
			mockCipher.decrypt
				.mockReturnValueOnce(JSON.stringify({ prefix: 'test-1' }))
				.mockReturnValueOnce(JSON.stringify({ prefix: 'test-2' }));
			mockResolverImplementation.getSecret.mockResolvedValue('secret-value' as any);

			const result = await service.getWorkflowStatus('workflow-1', 'token-123');

			expect(result).toHaveLength(1);
			expect(result[0].resolverId).toBe('resolver-2');
			expect(mockResolverImplementation.getSecret).toHaveBeenCalledWith(
				'cred-1',
				{ identity: 'token-123', version: 1 },
				{
					configuration: { prefix: 'test-2' },
					resolverName: 'test.resolver',
					resolverId: 'resolver-2',
				},
			);
		});

		it('should skip credentials without resolver ID', async () => {
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
				isResolvable: true,
				resolverId: null,
			});

			mockWorkflowRepository.get.mockResolvedValue(mockWorkflow);
			mockCredentialRepository.find.mockResolvedValue([mockCredential]);

			const result = await service.getWorkflowStatus('workflow-1', 'token-123');

			expect(result).toEqual([]);
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
			mockCipher.decrypt.mockReturnValue(JSON.stringify({ prefix: 'test' }));
			mockResolverImplementation.getSecret
				.mockResolvedValueOnce('secret-1' as any)
				.mockResolvedValueOnce('secret-2' as any);

			const result = await service.getWorkflowStatus('workflow-1', 'token-123');

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
			mockCipher.decrypt.mockReturnValue(JSON.stringify({ prefix: 'test' }));
			mockResolverImplementation.getSecret
				.mockResolvedValueOnce('secret-1' as any)
				.mockRejectedValueOnce(new Error('Secret not found'));

			const result = await service.getWorkflowStatus('workflow-1', 'token-123');

			expect(result).toHaveLength(2);
			expect(result[0].status).toBe('configured');
			expect(result[1].status).toBe('missing');
		});
	});
});
