'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ResourceTransferController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const event_service_1 = require('@/events/event.service');
const resource_transfer_service_1 = require('@/services/resource-transfer.service');
let ResourceTransferController = class ResourceTransferController {
	constructor(logger, resourceTransferService, _eventService) {
		this.logger = logger;
		this.resourceTransferService = resourceTransferService;
		this._eventService = _eventService;
	}
	async batchTransferWorkflows(req, _, request) {
		this.logger.debug('Batch workflow transfer requested', {
			requesterId: req.user.id,
			workflowCount: request.workflowIds.length,
			destinationProjectId: request.destinationProjectId,
		});
		if (request.workflowIds.length === 0) {
			throw new bad_request_error_1.BadRequestError('At least one workflow ID is required');
		}
		if (request.workflowIds.length > 50) {
			throw new bad_request_error_1.BadRequestError(
				'Maximum 50 workflows can be transferred in a single batch',
			);
		}
		const result = await this.resourceTransferService.batchTransferWorkflows(req.user, request);
		return result;
	}
	async batchTransferCredentials(req, _, request) {
		this.logger.debug('Batch credential transfer requested', {
			requesterId: req.user.id,
			credentialCount: request.credentialIds.length,
			destinationProjectId: request.destinationProjectId,
		});
		if (request.credentialIds.length === 0) {
			throw new bad_request_error_1.BadRequestError('At least one credential ID is required');
		}
		if (request.credentialIds.length > 50) {
			throw new bad_request_error_1.BadRequestError(
				'Maximum 50 credentials can be transferred in a single batch',
			);
		}
		const result = await this.resourceTransferService.batchTransferCredentials(req.user, request);
		return result;
	}
	async transferProjectResources(req, _, request) {
		this.logger.debug('Multi-resource project transfer requested', {
			requesterId: req.user.id,
			destinationProjectId: request.destinationProjectId,
			workflowCount: request.workflowIds?.length || 0,
			credentialCount: request.credentialIds?.length || 0,
			folderCount: request.folderIds?.length || 0,
		});
		const totalResources =
			(request.workflowIds?.length || 0) +
			(request.credentialIds?.length || 0) +
			(request.folderIds?.length || 0);
		if (totalResources === 0) {
			throw new bad_request_error_1.BadRequestError(
				'At least one resource must be specified for transfer',
			);
		}
		if (totalResources > 100) {
			throw new bad_request_error_1.BadRequestError(
				'Maximum 100 total resources can be transferred in a single operation',
			);
		}
		const result = await this.resourceTransferService.transferProjectResources(req.user, request);
		return result;
	}
	async analyzeTransferDependencies(req, _, analysis) {
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
		return result;
	}
	async previewTransfer(req, _, request) {
		this.logger.debug('Transfer preview requested', {
			requesterId: req.user.id,
			destinationProjectId: request.destinationProjectId,
			workflowCount: request.workflowIds?.length || 0,
			credentialCount: request.credentialIds?.length || 0,
			folderCount: request.folderIds?.length || 0,
		});
		const totalResources =
			(request.workflowIds?.length || 0) +
			(request.credentialIds?.length || 0) +
			(request.folderIds?.length || 0);
		if (totalResources === 0) {
			throw new bad_request_error_1.BadRequestError(
				'At least one resource must be specified for preview',
			);
		}
		const result = await this.resourceTransferService.previewTransfer(req.user, request);
		return result;
	}
	async validateTransfer(req, _, resourceType, resourceId, destinationProjectId) {
		this.logger.debug('Quick transfer validation requested', {
			requesterId: req.user.id,
			resourceType,
			resourceId,
			destinationProjectId,
		});
		if (!resourceType || !resourceId || !destinationProjectId) {
			throw new bad_request_error_1.BadRequestError(
				'resourceType, resourceId, and destinationProjectId are required',
			);
		}
		const resourceKey = `${resourceType}Ids`;
		const previewRequest = {
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
};
exports.ResourceTransferController = ResourceTransferController;
__decorate(
	[
		(0, decorators_1.Post)('/workflows/batch'),
		(0, decorators_1.GlobalScope)('workflow:move'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BatchTransferWorkflowsRequestDto]),
		__metadata('design:returntype', Promise),
	],
	ResourceTransferController.prototype,
	'batchTransferWorkflows',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/credentials/batch'),
		(0, decorators_1.GlobalScope)('credential:move'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			api_types_1.BatchTransferCredentialsRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	ResourceTransferController.prototype,
	'batchTransferCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/projects/resources'),
		(0, decorators_1.GlobalScope)('project:update'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			api_types_1.ProjectResourceTransferRequestDto,
		]),
		__metadata('design:returntype', Promise),
	],
	ResourceTransferController.prototype,
	'transferProjectResources',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/analyze'),
		(0, decorators_1.GlobalScope)('project:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.TransferDependencyAnalysisDto]),
		__metadata('design:returntype', Promise),
	],
	ResourceTransferController.prototype,
	'analyzeTransferDependencies',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/preview'),
		(0, decorators_1.GlobalScope)('project:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.TransferPreviewRequestDto]),
		__metadata('design:returntype', Promise),
	],
	ResourceTransferController.prototype,
	'previewTransfer',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/validate'),
		(0, decorators_1.GlobalScope)('project:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Query),
		__param(3, decorators_1.Query),
		__param(4, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String, String, String]),
		__metadata('design:returntype', Promise),
	],
	ResourceTransferController.prototype,
	'validateTransfer',
	null,
);
exports.ResourceTransferController = ResourceTransferController = __decorate(
	[
		(0, decorators_1.RestController)('/transfer'),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			resource_transfer_service_1.ResourceTransferService,
			event_service_1.EventService,
		]),
	],
	ResourceTransferController,
);
//# sourceMappingURL=resource-transfer.controller.js.map
