import type {
	BatchTransferWorkflowsRequestDto,
	BatchTransferCredentialsRequestDto,
	ProjectResourceTransferRequestDto,
	TransferDependencyAnalysisDto,
	TransferPreviewRequestDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { EventService } from '@/events/event.service';
import type { ResourceTransferService } from '@/services/resource-transfer.service';

import { ResourceTransferController } from '../resource-transfer.controller';

describe('ResourceTransferController', () => {
	let resourceTransferController: ResourceTransferController;
	let resourceTransferService: ResourceTransferService;
	let eventService: EventService;
	let mockUser: User;
	let mockRequest: Request;
	let mockResponse: Response;

	beforeEach(() => {
		resourceTransferService = mock<ResourceTransferService>();
		eventService = mock<EventService>();
		mockUser = mock<User>({ id: 'user-123', role: 'global:admin' });
		mockRequest = mock<Request>({ user: mockUser });
		mockResponse = mock<Response>();

		resourceTransferController = new ResourceTransferController(
			mock(),
			resourceTransferService,
			eventService,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('batchTransferWorkflows', () => {
		const validRequest: BatchTransferWorkflowsRequestDto = {
			workflowIds: ['workflow-1', 'workflow-2'],
			destinationProjectId: 'project-456',
			shareCredentials: ['credential-1'],
		};

		const mockServiceResponse = {
			success: [
				{ workflowId: 'workflow-1', name: 'Workflow 1', message: 'Success' },
				{ workflowId: 'workflow-2', name: 'Workflow 2', message: 'Success' },
			],
			errors: [],
			totalProcessed: 2,
			successCount: 2,
			errorCount: 0,
		};

		it('should successfully process batch workflow transfer', async () => {
			resourceTransferService.batchTransferWorkflows.mockResolvedValue(mockServiceResponse);

			const result = await resourceTransferController.batchTransferWorkflows(
				mockRequest as any,
				mockResponse,
				validRequest,
			);

			expect(result).toEqual(mockServiceResponse);
			expect(resourceTransferService.batchTransferWorkflows).toHaveBeenCalledWith(
				mockUser,
				validRequest,
			);
			expect(eventService.emit).toHaveBeenCalledWith('batch-workflow-transfer-requested', {
				requesterId: mockUser.id,
				workflowCount: 2,
				destinationProjectId: validRequest.destinationProjectId,
				successCount: 2,
				errorCount: 0,
				publicApi: false,
			});
		});

		it('should throw BadRequestError for empty workflow IDs', async () => {
			const invalidRequest = { ...validRequest, workflowIds: [] };

			await expect(
				resourceTransferController.batchTransferWorkflows(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow(BadRequestError);
			await expect(
				resourceTransferController.batchTransferWorkflows(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow('At least one workflow ID is required');
		});

		it('should throw BadRequestError for too many workflows', async () => {
			const invalidRequest = {
				...validRequest,
				workflowIds: Array.from({ length: 51 }, (_, i) => `workflow-${i}`),
			};

			await expect(
				resourceTransferController.batchTransferWorkflows(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow(BadRequestError);
			await expect(
				resourceTransferController.batchTransferWorkflows(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow('Maximum 50 workflows can be transferred in a single batch');
		});

		it('should handle service errors gracefully', async () => {
			const serviceError = new Error('Service unavailable');
			resourceTransferService.batchTransferWorkflows.mockRejectedValue(serviceError);

			await expect(
				resourceTransferController.batchTransferWorkflows(
					mockRequest as any,
					mockResponse,
					validRequest,
				),
			).rejects.toThrow(serviceError);
		});

		it('should emit event with correct parameters for partial failures', async () => {
			const partialFailureResponse = {
				...mockServiceResponse,
				successCount: 1,
				errorCount: 1,
			};
			resourceTransferService.batchTransferWorkflows.mockResolvedValue(partialFailureResponse);

			await resourceTransferController.batchTransferWorkflows(
				mockRequest as any,
				mockResponse,
				validRequest,
			);

			expect(eventService.emit).toHaveBeenCalledWith('batch-workflow-transfer-requested', {
				requesterId: mockUser.id,
				workflowCount: 2,
				destinationProjectId: validRequest.destinationProjectId,
				successCount: 1,
				errorCount: 1,
				publicApi: false,
			});
		});
	});

	describe('batchTransferCredentials', () => {
		const validRequest: BatchTransferCredentialsRequestDto = {
			credentialIds: ['credential-1', 'credential-2'],
			destinationProjectId: 'project-456',
		};

		const mockServiceResponse = {
			success: [
				{ credentialId: 'credential-1', name: 'Credential 1', message: 'Success' },
				{ credentialId: 'credential-2', name: 'Credential 2', message: 'Success' },
			],
			errors: [],
			totalProcessed: 2,
			successCount: 2,
			errorCount: 0,
		};

		it('should successfully process batch credential transfer', async () => {
			resourceTransferService.batchTransferCredentials.mockResolvedValue(mockServiceResponse);

			const result = await resourceTransferController.batchTransferCredentials(
				mockRequest as any,
				mockResponse,
				validRequest,
			);

			expect(result).toEqual(mockServiceResponse);
			expect(resourceTransferService.batchTransferCredentials).toHaveBeenCalledWith(
				mockUser,
				validRequest,
			);
			expect(eventService.emit).toHaveBeenCalledWith('batch-credential-transfer-requested', {
				requesterId: mockUser.id,
				credentialCount: 2,
				destinationProjectId: validRequest.destinationProjectId,
				successCount: 2,
				errorCount: 0,
				publicApi: false,
			});
		});

		it('should throw BadRequestError for empty credential IDs', async () => {
			const invalidRequest = { ...validRequest, credentialIds: [] };

			await expect(
				resourceTransferController.batchTransferCredentials(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow(BadRequestError);
			await expect(
				resourceTransferController.batchTransferCredentials(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow('At least one credential ID is required');
		});

		it('should throw BadRequestError for too many credentials', async () => {
			const invalidRequest = {
				...validRequest,
				credentialIds: Array.from({ length: 51 }, (_, i) => `credential-${i}`),
			};

			await expect(
				resourceTransferController.batchTransferCredentials(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow(BadRequestError);
			await expect(
				resourceTransferController.batchTransferCredentials(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow('Maximum 50 credentials can be transferred in a single batch');
		});
	});

	describe('transferProjectResources', () => {
		const validRequest: ProjectResourceTransferRequestDto = {
			destinationProjectId: 'project-456',
			workflowIds: ['workflow-1'],
			credentialIds: ['credential-1'],
		};

		const mockServiceResponse = {
			workflows: {
				success: [{ workflowId: 'workflow-1', name: 'Workflow 1', message: 'Success' }],
				errors: [],
			},
			credentials: {
				success: [{ credentialId: 'credential-1', name: 'Credential 1', message: 'Success' }],
				errors: [],
			},
			folders: { success: [], errors: [] },
			summary: { totalProcessed: 2, totalSuccess: 2, totalErrors: 0 },
		};

		it('should successfully process multi-resource transfer', async () => {
			resourceTransferService.transferProjectResources.mockResolvedValue(mockServiceResponse);

			const result = await resourceTransferController.transferProjectResources(
				mockRequest as any,
				mockResponse,
				validRequest,
			);

			expect(result).toEqual(mockServiceResponse);
			expect(resourceTransferService.transferProjectResources).toHaveBeenCalledWith(
				mockUser,
				validRequest,
			);
			expect(eventService.emit).toHaveBeenCalledWith('multi-resource-transfer-requested', {
				requesterId: mockUser.id,
				destinationProjectId: validRequest.destinationProjectId,
				totalResources: 2,
				successCount: 2,
				errorCount: 0,
				publicApi: false,
			});
		});

		it('should throw BadRequestError when no resources are specified', async () => {
			const invalidRequest = { destinationProjectId: 'project-456' };

			await expect(
				resourceTransferController.transferProjectResources(
					mockRequest as any,
					mockResponse,
					invalidRequest as any,
				),
			).rejects.toThrow(BadRequestError);
			await expect(
				resourceTransferController.transferProjectResources(
					mockRequest as any,
					mockResponse,
					invalidRequest as any,
				),
			).rejects.toThrow('At least one resource must be specified for transfer');
		});

		it('should throw BadRequestError for too many total resources', async () => {
			const invalidRequest = {
				destinationProjectId: 'project-456',
				workflowIds: Array.from({ length: 50 }, (_, i) => `workflow-${i}`),
				credentialIds: Array.from({ length: 51 }, (_, i) => `credential-${i}`),
			};

			await expect(
				resourceTransferController.transferProjectResources(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow(BadRequestError);
			await expect(
				resourceTransferController.transferProjectResources(
					mockRequest as any,
					mockResponse,
					invalidRequest,
				),
			).rejects.toThrow('Maximum 100 total resources can be transferred in a single operation');
		});

		it('should handle requests with only workflows', async () => {
			const workflowOnlyRequest = {
				destinationProjectId: 'project-456',
				workflowIds: ['workflow-1'],
			};

			const workflowOnlyResponse = {
				...mockServiceResponse,
				credentials: { success: [], errors: [] },
				summary: { totalProcessed: 1, totalSuccess: 1, totalErrors: 0 },
			};

			resourceTransferService.transferProjectResources.mockResolvedValue(workflowOnlyResponse);

			const result = await resourceTransferController.transferProjectResources(
				mockRequest as any,
				mockResponse,
				workflowOnlyRequest,
			);

			expect(result).toEqual(workflowOnlyResponse);
			expect(eventService.emit).toHaveBeenCalledWith('multi-resource-transfer-requested', {
				requesterId: mockUser.id,
				destinationProjectId: workflowOnlyRequest.destinationProjectId,
				totalResources: 1,
				successCount: 1,
				errorCount: 0,
				publicApi: false,
			});
		});
	});

	describe('analyzeTransferDependencies', () => {
		const validRequest: TransferDependencyAnalysisDto = {
			resourceId: 'workflow-1',
			resourceType: 'workflow',
			projectId: 'project-123',
		};

		const mockServiceResponse = {
			resourceId: 'workflow-1',
			resourceType: 'workflow' as const,
			resourceName: 'Test Workflow',
			currentProjectId: 'project-123',
			currentProjectName: 'Current Project',
			dependencies: {
				requiredCredentials: [
					{
						id: 'credential-1',
						name: 'Test Credential',
						type: 'httpBasicAuth',
						currentProjectId: 'project-123',
						currentProjectName: 'Current Project',
						accessInDestination: false,
					},
				],
				containedWorkflows: [],
				containedFolders: [],
			},
			transferImpact: {
				canTransfer: true,
				reasons: [],
				recommendations: ['Verify credential access before transfer'],
			},
		};

		it('should successfully analyze transfer dependencies', async () => {
			resourceTransferService.analyzeTransferDependencies.mockResolvedValue(mockServiceResponse);

			const result = await resourceTransferController.analyzeTransferDependencies(
				mockRequest as any,
				mockResponse,
				validRequest,
			);

			expect(result).toEqual(mockServiceResponse);
			expect(resourceTransferService.analyzeTransferDependencies).toHaveBeenCalledWith(
				mockUser,
				validRequest,
			);
			expect(eventService.emit).toHaveBeenCalledWith('transfer-dependency-analysis', {
				requesterId: mockUser.id,
				resourceId: validRequest.resourceId,
				resourceType: validRequest.resourceType,
				canTransfer: mockServiceResponse.transferImpact.canTransfer,
				dependencyCount: mockServiceResponse.dependencies.requiredCredentials.length,
				publicApi: false,
			});
		});

		it('should handle dependency analysis for different resource types', async () => {
			const credentialRequest = {
				...validRequest,
				resourceId: 'credential-1',
				resourceType: 'credential' as const,
			};

			const credentialResponse = {
				...mockServiceResponse,
				resourceId: 'credential-1',
				resourceType: 'credential' as const,
				resourceName: 'Test Credential',
				dependencies: {
					requiredCredentials: [],
					containedWorkflows: [],
					containedFolders: [],
				},
			};

			resourceTransferService.analyzeTransferDependencies.mockResolvedValue(credentialResponse);

			const result = await resourceTransferController.analyzeTransferDependencies(
				mockRequest as any,
				mockResponse,
				credentialRequest,
			);

			expect(result).toEqual(credentialResponse);
			expect(resourceTransferService.analyzeTransferDependencies).toHaveBeenCalledWith(
				mockUser,
				credentialRequest,
			);
		});
	});

	describe('previewTransfer', () => {
		const validRequest: TransferPreviewRequestDto = {
			destinationProjectId: 'project-456',
			workflowIds: ['workflow-1', 'workflow-2'],
			credentialIds: ['credential-1'],
		};

		const mockServiceResponse = {
			canTransfer: true,
			totalResources: 3,
			summary: { workflows: 2, credentials: 1, folders: 0 },
			warnings: [],
			recommendations: ['Transfer credentials first to ensure workflow dependencies are met'],
			requiredPermissions: [],
		};

		it('should successfully generate transfer preview', async () => {
			resourceTransferService.previewTransfer.mockResolvedValue(mockServiceResponse);

			const result = await resourceTransferController.previewTransfer(
				mockRequest as any,
				mockResponse,
				validRequest,
			);

			expect(result).toEqual(mockServiceResponse);
			expect(resourceTransferService.previewTransfer).toHaveBeenCalledWith(mockUser, validRequest);
			expect(eventService.emit).toHaveBeenCalledWith('transfer-preview-requested', {
				requesterId: mockUser.id,
				destinationProjectId: validRequest.destinationProjectId,
				totalResources: mockServiceResponse.totalResources,
				canTransfer: mockServiceResponse.canTransfer,
				warningCount: mockServiceResponse.warnings.length,
				publicApi: false,
			});
		});

		it('should throw BadRequestError when no resources are specified', async () => {
			const invalidRequest = { destinationProjectId: 'project-456' };

			await expect(
				resourceTransferController.previewTransfer(
					mockRequest as any,
					mockResponse,
					invalidRequest as any,
				),
			).rejects.toThrow(BadRequestError);
			await expect(
				resourceTransferController.previewTransfer(
					mockRequest as any,
					mockResponse,
					invalidRequest as any,
				),
			).rejects.toThrow('At least one resource must be specified for preview');
		});

		it('should handle preview with warnings', async () => {
			const previewWithWarnings = {
				...mockServiceResponse,
				canTransfer: false,
				warnings: [
					{
						type: 'permission' as const,
						message: 'Insufficient permissions on destination project',
					},
				],
				requiredPermissions: [
					{
						projectId: 'project-456',
						projectName: 'Destination Project',
						permissions: ['workflow:create', 'credential:create'],
					},
				],
			};

			resourceTransferService.previewTransfer.mockResolvedValue(previewWithWarnings);

			const result = await resourceTransferController.previewTransfer(
				mockRequest as any,
				mockResponse,
				validRequest,
			);

			expect(result).toEqual(previewWithWarnings);
			expect(eventService.emit).toHaveBeenCalledWith('transfer-preview-requested', {
				requesterId: mockUser.id,
				destinationProjectId: validRequest.destinationProjectId,
				totalResources: previewWithWarnings.totalResources,
				canTransfer: previewWithWarnings.canTransfer,
				warningCount: previewWithWarnings.warnings.length,
				publicApi: false,
			});
		});
	});

	describe('validateTransfer', () => {
		const mockPreviewResponse = {
			canTransfer: true,
			totalResources: 1,
			summary: { workflows: 1, credentials: 0, folders: 0 },
			warnings: [],
			recommendations: ['Single workflow transfer is straightforward'],
			requiredPermissions: [],
		};

		it('should successfully validate workflow transfer', async () => {
			resourceTransferService.previewTransfer.mockResolvedValue(mockPreviewResponse);

			const result = await resourceTransferController.validateTransfer(
				mockRequest as any,
				mockResponse,
				'workflow',
				'workflow-1',
				'project-456',
			);

			expect(result).toEqual({
				canTransfer: true,
				reasons: [],
				recommendations: ['Single workflow transfer is straightforward'],
			});
			expect(resourceTransferService.previewTransfer).toHaveBeenCalledWith(mockUser, {
				destinationProjectId: 'project-456',
				workflowIds: ['workflow-1'],
			});
		});

		it('should successfully validate credential transfer', async () => {
			const credentialPreview = {
				...mockPreviewResponse,
				summary: { workflows: 0, credentials: 1, folders: 0 },
			};
			resourceTransferService.previewTransfer.mockResolvedValue(credentialPreview);

			const result = await resourceTransferController.validateTransfer(
				mockRequest as any,
				mockResponse,
				'credential',
				'credential-1',
				'project-456',
			);

			expect(result).toEqual({
				canTransfer: true,
				reasons: [],
				recommendations: ['Single workflow transfer is straightforward'],
			});
			expect(resourceTransferService.previewTransfer).toHaveBeenCalledWith(mockUser, {
				destinationProjectId: 'project-456',
				credentialIds: ['credential-1'],
			});
		});

		it('should throw BadRequestError for missing parameters', async () => {
			await expect(
				resourceTransferController.validateTransfer(
					mockRequest as any,
					mockResponse,
					'',
					'resource-1',
					'project-456',
				),
			).rejects.toThrow(BadRequestError);
			await expect(
				resourceTransferController.validateTransfer(
					mockRequest as any,
					mockResponse,
					'',
					'resource-1',
					'project-456',
				),
			).rejects.toThrow('resourceType, resourceId, and destinationProjectId are required');
		});

		it('should handle validation with warnings', async () => {
			const previewWithWarnings = {
				...mockPreviewResponse,
				canTransfer: false,
				warnings: [
					{
						type: 'permission' as const,
						message: 'Insufficient permissions to transfer this resource',
					},
				],
			};
			resourceTransferService.previewTransfer.mockResolvedValue(previewWithWarnings);

			const result = await resourceTransferController.validateTransfer(
				mockRequest as any,
				mockResponse,
				'workflow',
				'workflow-1',
				'project-456',
			);

			expect(result).toEqual({
				canTransfer: false,
				reasons: ['Insufficient permissions to transfer this resource'],
				recommendations: ['Single workflow transfer is straightforward'],
			});
		});
	});
});
