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
exports.WorkflowStatisticsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const event_service_1 = require('@/events/event.service');
const user_service_1 = require('@/services/user.service');
const typed_emitter_1 = require('@/typed-emitter');
const ownership_service_1 = require('./ownership.service');
const isStatusRootExecution = {
	success: true,
	crashed: true,
	error: true,
	canceled: false,
	new: false,
	running: false,
	unknown: false,
	waiting: false,
};
const isModeRootExecution = {
	cli: true,
	error: true,
	retry: true,
	trigger: true,
	webhook: true,
	evaluation: true,
	integrated: false,
	internal: false,
	manual: false,
};
let WorkflowStatisticsService = class WorkflowStatisticsService extends typed_emitter_1.TypedEmitter {
	constructor(logger, repository, ownershipService, userService, eventService) {
		super({ captureRejections: true });
		this.logger = logger;
		this.repository = repository;
		this.ownershipService = ownershipService;
		this.userService = userService;
		this.eventService = eventService;
		if ('SKIP_STATISTICS_EVENTS' in process.env) return;
		this.on(
			'nodeFetchedData',
			async ({ workflowId, node }) => await this.nodeFetchedData(workflowId, node),
		);
		this.on(
			'workflowExecutionCompleted',
			async ({ workflowData, fullRunData }) =>
				await this.workflowExecutionCompleted(workflowData, fullRunData),
		);
	}
	async workflowExecutionCompleted(workflowData, runData) {
		const isSuccess = runData.status === 'success';
		const manual = runData.mode === 'manual';
		let name;
		const isRootExecution =
			isModeRootExecution[runData.mode] && isStatusRootExecution[runData.status];
		if (isSuccess) {
			if (manual) name = 'manual_success';
			else name = 'production_success';
		} else {
			if (manual) name = 'manual_error';
			else name = 'production_error';
		}
		const workflowId = workflowData.id;
		if (!workflowId) return;
		try {
			const upsertResult = await this.repository.upsertWorkflowStatistics(
				name,
				workflowId,
				isRootExecution,
			);
			if (name === 'production_success' && upsertResult === 'insert') {
				const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
				if (project.type === 'personal') {
					const owner = await this.ownershipService.getPersonalProjectOwnerCached(project.id);
					if (owner && !owner.settings?.userActivated) {
						await this.userService.updateSettings(owner.id, {
							firstSuccessfulWorkflowId: workflowId,
							userActivated: true,
							userActivatedAt: runData.startedAt.getTime(),
						});
					}
					this.eventService.emit('first-production-workflow-succeeded', {
						projectId: project.id,
						workflowId,
						userId: owner.id,
					});
				}
			}
		} catch (error) {
			this.logger.debug('Unable to fire first workflow success telemetry event');
		}
	}
	async nodeFetchedData(workflowId, node) {
		if (!workflowId) return;
		const insertResult = await this.repository.insertWorkflowStatistics('data_loaded', workflowId);
		if (insertResult === 'failed' || insertResult === 'alreadyExists') return;
		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
		const owner = await this.ownershipService.getPersonalProjectOwnerCached(project.id);
		let metrics = {
			userId: owner?.id ?? '',
			project: project.id,
			workflowId,
			nodeType: node.type,
			nodeId: node.id,
		};
		if (node.credentials) {
			Object.entries(node.credentials).forEach(([credName, credDetails]) => {
				metrics = Object.assign(metrics, {
					credentialType: credName,
					credentialId: credDetails.id,
				});
			});
		}
		this.eventService.emit('first-workflow-data-loaded', metrics);
	}
};
exports.WorkflowStatisticsService = WorkflowStatisticsService;
exports.WorkflowStatisticsService = WorkflowStatisticsService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.WorkflowStatisticsRepository,
			ownership_service_1.OwnershipService,
			user_service_1.UserService,
			event_service_1.EventService,
		]),
	],
	WorkflowStatisticsService,
);
//# sourceMappingURL=workflow-statistics.service.js.map
