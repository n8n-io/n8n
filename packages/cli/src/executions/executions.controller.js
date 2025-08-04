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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExecutionsController = void 0;
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const active_executions_1 = require('@/active-executions');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const license_1 = require('@/license');
const utils_1 = require('@/utils');
const workflow_sharing_service_1 = require('@/workflows/workflow-sharing.service');
const execution_service_1 = require('./execution.service');
const execution_service_ee_1 = require('./execution.service.ee');
const validation_1 = require('./validation');
let ExecutionsController = class ExecutionsController {
	constructor(
		logger,
		executionService,
		enterpriseExecutionService,
		workflowSharingService,
		license,
		activeExecutions,
		eventService,
	) {
		this.logger = logger;
		this.executionService = executionService;
		this.enterpriseExecutionService = enterpriseExecutionService;
		this.workflowSharingService = workflowSharingService;
		this.license = license;
		this.activeExecutions = activeExecutions;
		this.eventService = eventService;
	}
	async getAccessibleWorkflowIds(user, scope) {
		if (this.license.isSharingEnabled()) {
			return await this.workflowSharingService.getSharedWorkflowIds(user, { scopes: [scope] });
		} else {
			return await this.workflowSharingService.getSharedWorkflowIds(user, {
				workflowRoles: ['workflow:owner'],
				projectRoles: ['project:personalOwner'],
			});
		}
	}
	async getMany(req) {
		const typedReq = req;
		const accessibleWorkflowIds = await this.getAccessibleWorkflowIds(
			typedReq.user,
			'workflow:read',
		);
		if (accessibleWorkflowIds.length === 0) {
			return { count: 0, estimated: false, results: [] };
		}
		const { rangeQuery: query } = typedReq;
		if (query.workflowId && !accessibleWorkflowIds.includes(query.workflowId)) {
			return { count: 0, estimated: false, results: [] };
		}
		query.accessibleWorkflowIds = accessibleWorkflowIds;
		if (!this.license.isAdvancedExecutionFiltersEnabled()) {
			delete query.metadata;
			delete query.annotationTags;
		}
		const noStatus = !query.status || query.status.length === 0;
		const noRange = !query.range.lastId || !query.range.firstId;
		if (noStatus && noRange) {
			const executions = await this.executionService.findLatestCurrentAndCompleted(query);
			await this.executionService.addScopes(req.user, executions.results);
			return executions;
		}
		const executions = await this.executionService.findRangeWithCount(query);
		await this.executionService.addScopes(req.user, executions.results);
		return executions;
	}
	async getOne(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		return this.license.isSharingEnabled()
			? await this.enterpriseExecutionService.findOne(req, workflowIds)
			: await this.executionService.findOne(req, workflowIds);
	}
	async stop(req) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		const executionId = req.params.id;
		return await this.executionService.stop(executionId, workflowIds);
	}
	async retry(req) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		return await this.executionService.retry(req, workflowIds);
	}
	async delete(req) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		return await this.executionService.delete(req, workflowIds);
	}
	async update(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		const { body: payload } = req;
		const validatedPayload = (0, validation_1.validateExecutionUpdatePayload)(payload);
		await this.executionService.annotate(req.params.id, validatedPayload, workflowIds);
		return await this.executionService.findOne(req, workflowIds);
	}
	async cancel(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		this.logger.debug('Advanced execution cancellation requested', {
			executionId: req.params.id,
			userId: req.user.id,
			force: req.body.force,
		});
		const result = await this.executionService.cancel(req.params.id, workflowIds, req.body);
		this.eventService.emit('workflow-deleted', {
			user: req.user,
			workflowId: req.params.id,
			publicApi: false,
		});
		return result;
	}
	async retryAdvanced(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		this.logger.debug('Advanced execution retry requested', {
			executionId: req.params.id,
			userId: req.user.id,
			fromNodeName: req.body.fromNodeName,
			modifiedParameters: Object.keys(req.body.modifiedParameters ?? {}).length,
		});
		const result = await this.executionService.retryAdvanced(req.params.id, workflowIds, req.body);
		this.eventService.emit('workflow-created', {
			user: req.user,
			workflow: {
				id: req.params.id,
				name: 'Retry execution',
				active: false,
				isArchived: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				versionId: '',
				nodes: [],
				connections: {},
			},
			publicApi: false,
			projectId: '',
			projectType: 'Personal',
		});
		return result;
	}
	async getFullContext(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		this.logger.debug('Full execution context requested', {
			executionId: req.params.id,
			userId: req.user.id,
			includePerformanceMetrics: req.query.includePerformanceMetrics,
		});
		return await this.executionService.getFullContext(req.params.id, workflowIds, req.query);
	}
	async getProgress(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		const executionId = req.params.id;
		if (!this.activeExecutions.has(executionId)) {
			const execution = await this.executionService.findOne(req, workflowIds);
			if (!execution) {
				throw new not_found_error_1.NotFoundError('Execution not found');
			}
			return {
				executionId,
				status: execution.status,
				finished: execution.finished,
				progress: {
					percent: execution.finished ? 100 : 0,
					completedNodes: execution.finished ? execution.workflowData?.nodes?.length || 0 : 0,
					totalNodes: execution.workflowData?.nodes?.length || 0,
				},
				startedAt: execution.startedAt,
				stoppedAt: execution.stoppedAt,
			};
		}
		return await this.executionService.getExecutionProgress(executionId, workflowIds);
	}
	async bulkCancel(req) {
		if (!req.body.executionIds || req.body.executionIds.length === 0) {
			throw new bad_request_error_1.BadRequestError('At least one execution ID is required');
		}
		if (req.body.executionIds.length > 50) {
			throw new bad_request_error_1.BadRequestError(
				'Maximum 50 executions can be cancelled at once',
			);
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0)
			throw new not_found_error_1.NotFoundError('No accessible workflows found');
		this.logger.debug('Bulk execution cancellation requested', {
			executionCount: req.body.executionIds.length,
			userId: req.user.id,
			force: req.body.force,
		});
		const result = await this.executionService.bulkCancel(
			req.body.executionIds,
			workflowIds,
			req.body,
		);
		this.eventService.emit('workflow-deleted', {
			user: req.user,
			workflowId: req.body.executionIds[0] || '',
			publicApi: false,
		});
		return result;
	}
	async pause(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		this.logger.debug('Execution pause requested', {
			executionId: req.params.id,
			userId: req.user.id,
		});
		const result = await this.executionService.pause(req.params.id, workflowIds);
		this.eventService.emit('workflow-paused', {
			user: req.user,
			workflowId: req.params.id,
			publicApi: false,
		});
		return result;
	}
	async resume(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		this.logger.debug('Execution resume requested', {
			executionId: req.params.id,
			userId: req.user.id,
		});
		const result = await this.executionService.resume(req.params.id, workflowIds);
		this.eventService.emit('workflow-resumed', {
			user: req.user,
			workflowId: req.params.id,
			publicApi: false,
		});
		return result;
	}
	async step(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		this.logger.debug('Execution step requested', {
			executionId: req.params.id,
			userId: req.user.id,
			steps: req.body.steps,
		});
		const result = await this.executionService.step(req.params.id, workflowIds, req.body);
		return result;
	}
	async getNodeStatus(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		return await this.executionService.getNodeStatus(
			req.params.id,
			req.params.nodeName,
			workflowIds,
		);
	}
	async retryNode(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		this.logger.debug('Node retry requested', {
			executionId: req.params.id,
			nodeName: req.params.nodeName,
			userId: req.user.id,
		});
		const result = await this.executionService.retryNode(
			req.params.id,
			req.params.nodeName,
			workflowIds,
			req.body,
		);
		return result;
	}
	async skipNode(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:execute');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		this.logger.debug('Node skip requested', {
			executionId: req.params.id,
			nodeName: req.params.nodeName,
			userId: req.user.id,
		});
		const result = await this.executionService.skipNode(
			req.params.id,
			req.params.nodeName,
			workflowIds,
			req.body,
		);
		return result;
	}
	async getDebugInfo(req) {
		if (!(0, utils_1.isPositiveInteger)(req.params.id)) {
			throw new bad_request_error_1.BadRequestError('Execution ID is not a number');
		}
		const workflowIds = await this.getAccessibleWorkflowIds(req.user, 'workflow:read');
		if (workflowIds.length === 0) throw new not_found_error_1.NotFoundError('Execution not found');
		return await this.executionService.getDebugInfo(req.params.id, workflowIds, req.query);
	}
};
exports.ExecutionsController = ExecutionsController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'getMany',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'getOne',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/stop'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'stop',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/retry'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'retry',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/delete'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'delete',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:id'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'update',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/cancel'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'cancel',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/retry-advanced'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'retryAdvanced',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/full-context'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'getFullContext',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/progress'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'getProgress',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk-cancel'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'bulkCancel',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/pause'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'pause',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/resume'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'resume',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/step'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'step',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/node/:nodeName/status'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'getNodeStatus',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/node/:nodeName/retry'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'retryNode',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:id/node/:nodeName/skip'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'skipNode',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/debug-info'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ExecutionsController.prototype,
	'getDebugInfo',
	null,
);
exports.ExecutionsController = ExecutionsController = __decorate(
	[
		(0, decorators_1.RestController)('/executions'),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			execution_service_1.ExecutionService,
			execution_service_ee_1.EnterpriseExecutionsService,
			workflow_sharing_service_1.WorkflowSharingService,
			license_1.License,
			active_executions_1.ActiveExecutions,
			event_service_1.EventService,
		]),
	],
	ExecutionsController,
);
//# sourceMappingURL=executions.controller.js.map
