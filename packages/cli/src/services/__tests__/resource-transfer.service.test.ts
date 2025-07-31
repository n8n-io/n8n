import type {
	BatchTransferWorkflowsRequestDto,
	BatchTransferCredentialsRequestDto,
	ProjectResourceTransferRequestDto,
	TransferDependencyAnalysisDto,
	TransferPreviewRequestDto,
} from '@n8n/api-types';
import type {
	User,
	WorkflowRepository,
	CredentialsRepository,
	SharedWorkflowRepository,
	SharedCredentialsRepository,
	ProjectRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { EventService } from '@/events/event.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { EnterpriseCredentialsService } from '@/credentials/credentials.service.ee';
import { RoleService } from '@/services/role.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { ResourceTransferService } from '../resource-transfer.service';

describe('ResourceTransferService', () => {
	let resourceTransferService: ResourceTransferService;
	let workflowRepository: WorkflowRepository;
	let credentialsRepository: CredentialsRepository;
	let sharedWorkflowRepository: SharedWorkflowRepository;
	let sharedCredentialsRepository: SharedCredentialsRepository;
	let projectRepository: ProjectRepository;
	let eventService: EventService;
	let enterpriseWorkflowService: EnterpriseWorkflowService;
	let enterpriseCredentialsService: EnterpriseCredentialsService;
	let roleService: RoleService;

	beforeEach(() => {
		workflowRepository = mock<WorkflowRepository>();
		credentialsRepository = mock<CredentialsRepository>();
		sharedWorkflowRepository = mock<SharedWorkflowRepository>();
		sharedCredentialsRepository = mock<SharedCredentialsRepository>();
		projectRepository = mock<ProjectRepository>();
		eventService = mock<EventService>();
		enterpriseWorkflowService = mock<EnterpriseWorkflowService>();
		enterpriseCredentialsService = mock<EnterpriseCredentialsService>();
		roleService = mock<RoleService>();

		resourceTransferService = new ResourceTransferService(
			mock(),
			workflowRepository,
			credentialsRepository,
			sharedWorkflowRepository,
			sharedCredentialsRepository,
			projectRepository,
			eventService,
			enterpriseWorkflowService,
			enterpriseCredentialsService,
			roleService,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('batchTransferWorkflows', () => {
		const mockUser = mock<User>({ id: 'user-123', role: 'global:admin' });
		const mockProject = mock({ id: 'project-456', name: 'Destination Project' });

		const batchRequest: BatchTransferWorkflowsRequestDto = {
			workflowIds: ['workflow-1', 'workflow-2'],
			destinationProjectId: 'project-456',
			shareCredentials: ['credential-1'],
		};

		beforeEach(() => {
			projectRepository.findOneBy.mockResolvedValue(mockProject);
			roleService.hasScope.mockResolvedValue(true);
		});

		it('should successfully transfer multiple workflows', async () => {
			const mockWorkflow1 = mock({ id: 'workflow-1', name: 'Workflow 1' });
			const mockWorkflow2 = mock({ id: 'workflow-2', name: 'Workflow 2' });
			const mockSharing = mock({ projectId: 'project-123' });

			workflowRepository.findOneBy
				.mockResolvedValueOnce(mockWorkflow1)
				.mockResolvedValueOnce(mockWorkflow2);

			sharedWorkflowRepository.findOne
				.mockResolvedValueOnce(mockSharing)
				.mockResolvedValueOnce(mockSharing);

			enterpriseWorkflowService.transferWorkflow
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(undefined);

			const result = await resourceTransferService.batchTransferWorkflows(mockUser, batchRequest);

			expect(result.totalProcessed).toBe(2);
			expect(result.successCount).toBe(2);
			expect(result.errorCount).toBe(0);
			expect(result.success).toHaveLength(2);
			expect(result.errors).toHaveLength(0);

			expect(enterpriseWorkflowService.transferWorkflow).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
		});

		it('should handle partial failures in batch transfer', async () => {
			const mockWorkflow1 = mock({ id: 'workflow-1', name: 'Workflow 1' });

			workflowRepository.findOneBy.mockResolvedValueOnce(mockWorkflow1).mockResolvedValueOnce(null); // Second workflow not found

			sharedWorkflowRepository.findOne.mockResolvedValueOnce(mock({ projectId: 'project-123' }));
			enterpriseWorkflowService.transferWorkflow.mockResolvedValueOnce(undefined);

			const result = await resourceTransferService.batchTransferWorkflows(mockUser, batchRequest);

			expect(result.totalProcessed).toBe(2);
			expect(result.successCount).toBe(1);
			expect(result.errorCount).toBe(1);
			expect(result.success).toHaveLength(1);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0].error).toBe('Workflow not found');
		});

		it('should throw error for non-existent destination project', async () => {
			projectRepository.findOneBy.mockResolvedValue(null);

			await expect(
				resourceTransferService.batchTransferWorkflows(mockUser, batchRequest),
			).rejects.toThrow(NotFoundError);
		});

		it('should throw error for insufficient destination permissions', async () => {
			roleService.hasScope.mockResolvedValue(false);

			await expect(
				resourceTransferService.batchTransferWorkflows(mockUser, batchRequest),
			).rejects.toThrow(ForbiddenError);
		});

		it('should skip workflows without move permissions', async () => {
			const mockWorkflow = mock({ id: 'workflow-1', name: 'Workflow 1' });

			workflowRepository.findOneBy.mockResolvedValue(mockWorkflow);
			roleService.hasScope
				.mockResolvedValueOnce(true) // destination project permission
				.mockResolvedValueOnce(false); // workflow move permission

			const result = await resourceTransferService.batchTransferWorkflows(mockUser, batchRequest);

			expect(result.successCount).toBe(0);
			expect(result.errorCount).toBe(2);
			expect(result.errors[0].error).toBe('Insufficient permissions to move this workflow');
		});

		it('should skip workflows already in destination project', async () => {
			const mockWorkflow = mock({ id: 'workflow-1', name: 'Workflow 1' });
			const mockSharing = mock({ projectId: 'project-456' }); // Same as destination

			workflowRepository.findOneBy.mockResolvedValue(mockWorkflow);
			sharedWorkflowRepository.findOne.mockResolvedValue(mockSharing);

			const result = await resourceTransferService.batchTransferWorkflows(mockUser, batchRequest);

			expect(result.errorCount).toBe(2);
			expect(result.errors[0].error).toBe('Workflow is already in the destination project');
		});
	});

	describe('batchTransferCredentials', () => {
		const mockUser = mock<User>({ id: 'user-123', role: 'global:admin' });
		const mockProject = mock({ id: 'project-456', name: 'Destination Project' });

		const batchRequest: BatchTransferCredentialsRequestDto = {
			credentialIds: ['credential-1', 'credential-2'],
			destinationProjectId: 'project-456',
		};

		beforeEach(() => {
			projectRepository.findOneBy.mockResolvedValue(mockProject);
			roleService.hasScope.mockResolvedValue(true);
		});

		it('should successfully transfer multiple credentials', async () => {
			const mockCredential1 = mock({
				id: 'credential-1',
				name: 'Credential 1',
				type: 'httpBasicAuth',
			});
			const mockCredential2 = mock({ id: 'credential-2', name: 'Credential 2', type: 'oauth2Api' });
			const mockSharing = mock({ projectId: 'project-123' });

			credentialsRepository.findOneBy
				.mockResolvedValueOnce(mockCredential1)
				.mockResolvedValueOnce(mockCredential2);

			sharedCredentialsRepository.findOne
				.mockResolvedValueOnce(mockSharing)
				.mockResolvedValueOnce(mockSharing);

			enterpriseCredentialsService.transferOne
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce(undefined);

			const result = await resourceTransferService.batchTransferCredentials(mockUser, batchRequest);

			expect(result.totalProcessed).toBe(2);
			expect(result.successCount).toBe(2);
			expect(result.errorCount).toBe(0);
			expect(result.success).toHaveLength(2);
			expect(result.errors).toHaveLength(0);

			expect(enterpriseCredentialsService.transferOne).toHaveBeenCalledTimes(2);
			expect(eventService.emit).toHaveBeenCalledTimes(2);
		});

		it('should handle transfer errors gracefully', async () => {
			const mockCredential = mock({
				id: 'credential-1',
				name: 'Credential 1',
				type: 'httpBasicAuth',
			});
			const mockSharing = mock({ projectId: 'project-123' });

			credentialsRepository.findOneBy.mockResolvedValue(mockCredential);
			sharedCredentialsRepository.findOne.mockResolvedValue(mockSharing);
			enterpriseCredentialsService.transferOne.mockRejectedValue(new Error('Transfer failed'));

			const result = await resourceTransferService.batchTransferCredentials(mockUser, batchRequest);

			expect(result.errorCount).toBe(2);
			expect(result.errors[0].error).toBe('Transfer failed');
		});
	});

	describe('transferProjectResources', () => {
		const mockUser = mock<User>({ id: 'user-123', role: 'global:admin' });

		const multiRequest: ProjectResourceTransferRequestDto = {
			destinationProjectId: 'project-456',
			workflowIds: ['workflow-1'],
			credentialIds: ['credential-1'],
		};

		it('should transfer multiple resource types', async () => {
			// Mock successful batch operations
			jest.spyOn(resourceTransferService, 'batchTransferWorkflows').mockResolvedValue({
				success: [{ workflowId: 'workflow-1', name: 'Workflow 1', message: 'Success' }],
				errors: [],
				totalProcessed: 1,
				successCount: 1,
				errorCount: 0,
			});

			jest.spyOn(resourceTransferService, 'batchTransferCredentials').mockResolvedValue({
				success: [{ credentialId: 'credential-1', name: 'Credential 1', message: 'Success' }],
				errors: [],
				totalProcessed: 1,
				successCount: 1,
				errorCount: 0,
			});

			const result = await resourceTransferService.transferProjectResources(mockUser, multiRequest);

			expect(result.summary.totalProcessed).toBe(2);
			expect(result.summary.totalSuccess).toBe(2);
			expect(result.summary.totalErrors).toBe(0);
			expect(result.workflows.success).toHaveLength(1);
			expect(result.credentials.success).toHaveLength(1);
		});

		it('should handle mixed success and failure across resource types', async () => {
			jest.spyOn(resourceTransferService, 'batchTransferWorkflows').mockResolvedValue({
				success: [{ workflowId: 'workflow-1', name: 'Workflow 1', message: 'Success' }],
				errors: [],
				totalProcessed: 1,
				successCount: 1,
				errorCount: 0,
			});

			jest.spyOn(resourceTransferService, 'batchTransferCredentials').mockResolvedValue({
				success: [],
				errors: [{ credentialId: 'credential-1', error: 'Transfer failed' }],
				totalProcessed: 1,
				successCount: 0,
				errorCount: 1,
			});

			const result = await resourceTransferService.transferProjectResources(mockUser, multiRequest);

			expect(result.summary.totalProcessed).toBe(2);
			expect(result.summary.totalSuccess).toBe(1);
			expect(result.summary.totalErrors).toBe(1);
			expect(result.workflows.success).toHaveLength(1);
			expect(result.credentials.errors).toHaveLength(1);
		});
	});

	describe('analyzeTransferDependencies', () => {
		const mockUser = mock<User>({ id: 'user-123', role: 'global:admin' });
		const mockProject = mock({ id: 'project-123', name: 'Source Project' });

		const analysisRequest: TransferDependencyAnalysisDto = {
			resourceId: 'workflow-1',
			resourceType: 'workflow',
			projectId: 'project-123',
		};

		beforeEach(() => {
			roleService.hasScope.mockResolvedValue(true);
			projectRepository.findOneBy.mockResolvedValue(mockProject);
		});

		it('should analyze workflow dependencies successfully', async () => {
			const mockWorkflow = mock({
				id: 'workflow-1',
				name: 'Test Workflow',
				nodes: [
					{
						credentials: {
							httpBasicAuth: { id: 'credential-1' },
						},
					},
				],
				shared: [mock({ projectId: 'project-123' })],
			});

			const mockCredential = mock({
				id: 'credential-1',
				name: 'Test Credential',
				type: 'httpBasicAuth',
				shared: [mock({ projectId: 'project-123', project: mockProject })],
			});

			workflowRepository.findOne.mockResolvedValue(mockWorkflow);
			credentialsRepository.findOne.mockResolvedValue(mockCredential);

			const result = await resourceTransferService.analyzeTransferDependencies(
				mockUser,
				analysisRequest,
			);

			expect(result.resourceId).toBe('workflow-1');
			expect(result.resourceName).toBe('Test Workflow');
			expect(result.dependencies.requiredCredentials).toHaveLength(1);
			expect(result.dependencies.requiredCredentials[0].name).toBe('Test Credential');
		});

		it('should throw error for insufficient read permissions', async () => {
			roleService.hasScope.mockResolvedValue(false);

			await expect(
				resourceTransferService.analyzeTransferDependencies(mockUser, analysisRequest),
			).rejects.toThrow(ForbiddenError);
		});

		it('should throw error for non-existent project', async () => {
			projectRepository.findOneBy.mockResolvedValue(null);

			await expect(
				resourceTransferService.analyzeTransferDependencies(mockUser, analysisRequest),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('previewTransfer', () => {
		const mockUser = mock<User>({ id: 'user-123', role: 'global:admin' });
		const mockProject = mock({ id: 'project-456', name: 'Destination Project' });

		const previewRequest: TransferPreviewRequestDto = {
			destinationProjectId: 'project-456',
			workflowIds: ['workflow-1', 'workflow-2'],
			credentialIds: ['credential-1'],
		};

		beforeEach(() => {
			projectRepository.findOneBy.mockResolvedValue(mockProject);
			roleService.hasScope.mockResolvedValue(true);
		});

		it('should generate transfer preview successfully', async () => {
			const result = await resourceTransferService.previewTransfer(mockUser, previewRequest);

			expect(result.totalResources).toBe(3);
			expect(result.summary.workflows).toBe(2);
			expect(result.summary.credentials).toBe(1);
			expect(result.summary.folders).toBe(0);
			expect(result.canTransfer).toBe(true);
		});

		it('should identify permission issues in preview', async () => {
			roleService.hasScope.mockResolvedValue(false);

			const result = await resourceTransferService.previewTransfer(mockUser, previewRequest);

			expect(result.canTransfer).toBe(false);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].type).toBe('permission');
			expect(result.requiredPermissions).toHaveLength(1);
		});

		it('should identify missing destination project', async () => {
			projectRepository.findOneBy.mockResolvedValue(null);

			const result = await resourceTransferService.previewTransfer(mockUser, previewRequest);

			expect(result.canTransfer).toBe(false);
			expect(result.warnings).toHaveLength(1);
			expect(result.warnings[0].type).toBe('dependency');
		});

		it('should provide recommendations for large transfers', async () => {
			const largeRequest: TransferPreviewRequestDto = {
				destinationProjectId: 'project-456',
				workflowIds: Array.from({ length: 15 }, (_, i) => `workflow-${i}`),
			};

			const result = await resourceTransferService.previewTransfer(mockUser, largeRequest);

			expect(result.recommendations).toContain(
				'Consider transferring resources in smaller batches for better performance',
			);
		});
	});
});
