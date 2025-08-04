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
exports.WaitTracker = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const active_executions_1 = require('@/active-executions');
const ownership_service_1 = require('@/services/ownership.service');
const workflow_runner_1 = require('@/workflow-runner');
let WaitTracker = class WaitTracker {
	constructor(
		logger,
		executionRepository,
		ownershipService,
		activeExecutions,
		workflowRunner,
		instanceSettings,
	) {
		this.logger = logger;
		this.executionRepository = executionRepository;
		this.ownershipService = ownershipService;
		this.activeExecutions = activeExecutions;
		this.workflowRunner = workflowRunner;
		this.instanceSettings = instanceSettings;
		this.waitingExecutions = {};
		this.logger = this.logger.scoped('waiting-executions');
	}
	has(executionId) {
		return this.waitingExecutions[executionId] !== undefined;
	}
	init() {
		if (this.instanceSettings.isLeader) this.startTracking();
	}
	startTracking() {
		this.mainTimer = setInterval(() => {
			void this.getWaitingExecutions();
		}, 60000);
		void this.getWaitingExecutions();
		this.logger.debug('Started tracking waiting executions');
	}
	async getWaitingExecutions() {
		this.logger.debug('Querying database for waiting executions');
		const executions = await this.executionRepository.getWaitingExecutions();
		if (executions.length === 0) {
			return;
		}
		const executionIds = executions.map((execution) => execution.id).join(', ');
		this.logger.debug(
			`Found ${executions.length} executions. Setting timer for IDs: ${executionIds}`,
		);
		for (const execution of executions) {
			const executionId = execution.id;
			if (this.waitingExecutions[executionId] === undefined) {
				const triggerTime = execution.waitTill.getTime() - new Date().getTime();
				this.waitingExecutions[executionId] = {
					executionId,
					timer: setTimeout(() => {
						void this.startExecution(executionId);
					}, triggerTime),
				};
			}
		}
	}
	stopExecution(executionId) {
		if (!this.waitingExecutions[executionId]) return;
		clearTimeout(this.waitingExecutions[executionId].timer);
		delete this.waitingExecutions[executionId];
	}
	async startExecution(executionId) {
		this.logger.debug(`Resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];
		const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		if (!fullExecutionData) {
			throw new n8n_workflow_1.UnexpectedError('Execution does not exist.', {
				extra: { executionId },
			});
		}
		if (fullExecutionData.finished) {
			throw new n8n_workflow_1.UnexpectedError(
				'The execution did succeed and can so not be started again.',
			);
		}
		if (!fullExecutionData.workflowData.id) {
			throw new n8n_workflow_1.UnexpectedError('Only saved workflows can be resumed.');
		}
		const workflowId = fullExecutionData.workflowData.id;
		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
		const data = {
			executionMode: fullExecutionData.mode,
			executionData: fullExecutionData.data,
			workflowData: fullExecutionData.workflowData,
			projectId: project.id,
			pushRef: fullExecutionData.data.pushRef,
			startedAt: fullExecutionData.startedAt,
		};
		await this.workflowRunner.run(data, false, false, executionId);
		const { parentExecution } = fullExecutionData.data;
		if (parentExecution) {
			void this.activeExecutions.getPostExecutePromise(executionId).then(() => {
				void this.startExecution(parentExecution.executionId);
			});
		}
	}
	stopTracking() {
		if (!this.mainTimer) return;
		clearInterval(this.mainTimer);
		Object.keys(this.waitingExecutions).forEach((executionId) => {
			clearTimeout(this.waitingExecutions[executionId].timer);
		});
		this.logger.debug('Stopped tracking waiting executions');
	}
};
exports.WaitTracker = WaitTracker;
__decorate(
	[
		(0, decorators_1.OnLeaderTakeover)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	WaitTracker.prototype,
	'startTracking',
	null,
);
__decorate(
	[
		(0, decorators_1.OnLeaderStepdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	WaitTracker.prototype,
	'stopTracking',
	null,
);
exports.WaitTracker = WaitTracker = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.ExecutionRepository,
			ownership_service_1.OwnershipService,
			active_executions_1.ActiveExecutions,
			workflow_runner_1.WorkflowRunner,
			n8n_core_1.InstanceSettings,
		]),
	],
	WaitTracker,
);
//# sourceMappingURL=wait-tracker.js.map
