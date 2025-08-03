import {
	BatchTransferWorkflowsRequestDto,
	BatchTransferWorkflowsResponseDto,
	BatchTransferCredentialsRequestDto,
	BatchTransferCredentialsResponseDto,
	ProjectResourceTransferRequestDto,
	ProjectResourceTransferResponseDto,
	TransferDependencyAnalysisDto,
	TransferDependencyResponseDto,
	TransferPreviewRequestDto,
	TransferPreviewResponseDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { RestController, Post, Body, Query, GlobalScope, Licensed } from '@n8n/decorators';
import { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { ResourceTransferService } from '@/services/resource-transfer.service';

@RestController('/transfer')
export class ResourceTransferController {
	constructor(
		private readonly logger: Logger,
		private readonly resourceTransferService: ResourceTransferService,
		private readonly _eventService: EventService, // eslint-disable-line @typescript-eslint/no-unused-vars
	) {}

	// Batch Workflow Transfer
	@Post('/workflows/batch')
	@GlobalScope('workflow:move')
	@Licensed('feat:advancedPermissions')
	async batchTransferWorkflows(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: BatchTransferWorkflowsRequestDto,
	): Promise<BatchTransferWorkflowsResponseDto> {
		this.logger.debug('Batch workflow transfer requested', {
			requesterId: req.user.id,
			workflowCount: request.workflowIds.length,
			destinationProjectId: request.destinationProjectId,
		});

		if (request.workflowIds.length === 0) {
			throw new BadRequestError('At least one workflow ID is required');
		}

		if (request.workflowIds.length > 50) {
			throw new BadRequestError('Maximum 50 workflows can be transferred in a single batch');
		}

		const result = await this.resourceTransferService.batchTransferWorkflows(req.user, request);

		// TODO: Add 'batch-workflow-transfer-requested' event to EventService type map
		// this.eventService.emit('batch-workflow-transfer-requested', {
		//	requesterId: req.user.id,
		//	workflowCount: request.workflowIds.length,
		//	destinationProjectId: request.destinationProjectId,
		//	successCount: result.successCount,
		//	errorCount: result.errorCount,
		//	publicApi: false,
		// });

		return result;
	}

	// Batch Credential Transfer
	@Post('/credentials/batch')
	@GlobalScope('credential:move')
	@Licensed('feat:advancedPermissions')
	async batchTransferCredentials(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: BatchTransferCredentialsRequestDto,
	): Promise<BatchTransferCredentialsResponseDto> {
		this.logger.debug('Batch credential transfer requested', {
			requesterId: req.user.id,
			credentialCount: request.credentialIds.length,
			destinationProjectId: request.destinationProjectId,
		});

		if (request.credentialIds.length === 0) {
			throw new BadRequestError('At least one credential ID is required');
		}

		if (request.credentialIds.length > 50) {
			throw new BadRequestError('Maximum 50 credentials can be transferred in a single batch');
		}

		const result = await this.resourceTransferService.batchTransferCredentials(req.user, request);

		// TODO: Add 'batch-credential-transfer-requested' event to EventService type map
		// this.eventService.emit('batch-credential-transfer-requested', {
		//	requesterId: req.user.id,
		//	credentialCount: request.credentialIds.length,
		//	destinationProjectId: request.destinationProjectId,
		//	successCount: result.successCount,
		//	errorCount: result.errorCount,
		//	publicApi: false,
		// });

		return result;
	}

	// Multi-Resource Project Transfer
	@Post('/projects/resources')
	@GlobalScope('project:update')
	@Licensed('feat:advancedPermissions')
	async transferProjectResources(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: ProjectResourceTransferRequestDto,
	): Promise<ProjectResourceTransferResponseDto> {
		this.logger.debug('Multi-resource project transfer requested', {
			requesterId: req.user.id,
			destinationProjectId: request.destinationProjectId,
			workflowCount: request.workflowIds?.length || 0,
			credentialCount: request.credentialIds?.length || 0,
			folderCount: request.folderIds?.length || 0,
		});

		// Validate that at least one resource type is provided
		const totalResources =
			(request.workflowIds?.length || 0) +
			(request.credentialIds?.length || 0) +
			(request.folderIds?.length || 0);

		if (totalResources === 0) {
			throw new BadRequestError('At least one resource must be specified for transfer');
		}

		if (totalResources > 100) {
			throw new BadRequestError(
				'Maximum 100 total resources can be transferred in a single operation',
			);
		}

		const result = await this.resourceTransferService.transferProjectResources(req.user, request);

		// TODO: Add 'multi-resource-transfer-requested' event to EventService type map
		// this.eventService.emit('multi-resource-transfer-requested', {
		//	requesterId: req.user.id,
		//	destinationProjectId: request.destinationProjectId,
		//	totalResources,
		//	successCount: result.summary.totalSuccess,
		//	errorCount: result.summary.totalErrors,
		//	publicApi: false,
		// });

		return result;
	}

	// Transfer Dependency Analysis
	@Post('/analyze')
	@GlobalScope('project:read')
	@Licensed('feat:advancedPermissions')
	async analyzeTransferDependencies(
		req: AuthenticatedRequest,
		_: Response,
		@Body analysis: TransferDependencyAnalysisDto,
	): Promise<TransferDependencyResponseDto> {
		this.logger.debug('Transfer dependency analysis requested', {
			requesterId: req.user.id,
			resourceId: analysis.resourceId,
			resourceType: analysis.resourceType,
			projectId: analysis.projectId,
		});

		const result = await this.resourceTransferService.analyzeTransferDependencies(
			req.user,
			analysis,
		);

		// TODO: Add 'transfer-dependency-analysis' event to EventService type map
		// this.eventService.emit('transfer-dependency-analysis', {
		//	requesterId: req.user.id,
		//	resourceId: analysis.resourceId,
		//	resourceType: analysis.resourceType,
		//	canTransfer: result.transferImpact.canTransfer,
		//	dependencyCount: result.dependencies.requiredCredentials.length,
		//	publicApi: false,
		// });

		return result;
	}

	// Transfer Preview
	@Post('/preview')
	@GlobalScope('project:read')
	@Licensed('feat:advancedPermissions')
	async previewTransfer(
		req: AuthenticatedRequest,
		_: Response,
		@Body request: TransferPreviewRequestDto,
	): Promise<TransferPreviewResponseDto> {
		this.logger.debug('Transfer preview requested', {
			requesterId: req.user.id,
			destinationProjectId: request.destinationProjectId,
			workflowCount: request.workflowIds?.length || 0,
			credentialCount: request.credentialIds?.length || 0,
			folderCount: request.folderIds?.length || 0,
		});

		// Validate that at least one resource type is provided
		const totalResources =
			(request.workflowIds?.length || 0) +
			(request.credentialIds?.length || 0) +
			(request.folderIds?.length || 0);

		if (totalResources === 0) {
			throw new BadRequestError('At least one resource must be specified for preview');
		}

		const result = await this.resourceTransferService.previewTransfer(req.user, request);

		// TODO: Add 'transfer-preview-requested' event to EventService type map
		// this.eventService.emit('transfer-preview-requested', {
		//	requesterId: req.user.id,
		//	destinationProjectId: request.destinationProjectId,
		//	totalResources: result.totalResources,
		//	canTransfer: result.canTransfer,
		//	warningCount: result.warnings.length,
		//	publicApi: false,
		// });

		return result;
	}

	// Quick Transfer Validation Endpoint
	@Post('/validate')
	@GlobalScope('project:read')
	@Licensed('feat:advancedPermissions')
	async validateTransfer(
		req: AuthenticatedRequest,
		_: Response,
		@Query resourceType: 'workflow' | 'credential' | 'folder',
		@Query resourceId: string,
		@Query destinationProjectId: string,
	): Promise<{
		canTransfer: boolean;
		reasons: string[];
		recommendations: string[];
	}> {
		this.logger.debug('Quick transfer validation requested', {
			requesterId: req.user.id,
			resourceType,
			resourceId,
			destinationProjectId,
		});

		if (!resourceType || !resourceId || !destinationProjectId) {
			throw new BadRequestError('resourceType, resourceId, and destinationProjectId are required');
		}

		// Quick validation using the preview functionality
		const resourceKey = `${resourceType}Ids` as keyof TransferPreviewRequestDto;
		const previewRequest: TransferPreviewRequestDto = {
			destinationProjectId,
			[resourceKey]: [resourceId],
		};

		const preview = await this.resourceTransferService.previewTransfer(req.user, previewRequest);

		return {
			canTransfer: preview.canTransfer,
			reasons: preview.warnings.map((w) => w.message),
			recommendations: preview.recommendations,
		};
	}
}
