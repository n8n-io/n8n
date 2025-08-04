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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ActiveExecutions = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const node_assert_1 = require('node:assert');
const execution_not_found_error_1 = require('@/errors/execution-not-found-error');
const utils_1 = require('@/utils');
const concurrency_control_service_1 = require('./concurrency/concurrency-control.service');
const config_1 = __importDefault(require('./config'));
let ActiveExecutions = class ActiveExecutions {
	constructor(logger, executionRepository, concurrencyControl) {
		this.logger = logger;
		this.executionRepository = executionRepository;
		this.concurrencyControl = concurrencyControl;
		this.activeExecutions = {};
	}
	has(executionId) {
		return this.activeExecutions[executionId] !== undefined;
	}
	async add(executionData, executionId) {
		let executionStatus = executionId ? 'running' : 'new';
		const mode = executionData.executionMode;
		if (executionId === undefined) {
			const fullExecutionData = {
				data: executionData.executionData,
				mode,
				finished: false,
				workflowData: executionData.workflowData,
				status: executionStatus,
				workflowId: executionData.workflowData.id,
			};
			fullExecutionData.retryOf = executionData.retryOf ?? undefined;
			const workflowId = executionData.workflowData.id;
			if (workflowId !== undefined && (0, utils_1.isWorkflowIdValid)(workflowId)) {
				fullExecutionData.workflowId = workflowId;
			}
			executionId = await this.executionRepository.createNewExecution(fullExecutionData);
			(0, node_assert_1.strict)(executionId);
			if (config_1.default.getEnv('executions.mode') === 'regular') {
				await this.concurrencyControl.throttle({ mode, executionId });
				await this.executionRepository.setRunning(executionId);
			}
			executionStatus = 'running';
		} else {
			await this.concurrencyControl.throttle({ mode, executionId });
			const execution = {
				id: executionId,
				data: executionData.executionData,
				waitTill: null,
				status: executionStatus,
			};
			await this.executionRepository.updateExistingExecution(executionId, execution);
		}
		const resumingExecution = this.activeExecutions[executionId];
		const postExecutePromise = (0, n8n_workflow_1.createDeferredPromise)();
		const execution = {
			executionData,
			startedAt: resumingExecution?.startedAt ?? new Date(),
			postExecutePromise,
			status: executionStatus,
			responsePromise: resumingExecution?.responsePromise,
			httpResponse: executionData.httpResponse ?? undefined,
		};
		this.activeExecutions[executionId] = execution;
		void postExecutePromise.promise
			.catch((error) => {
				if (error instanceof n8n_workflow_1.ExecutionCancelledError) return;
				throw error;
			})
			.finally(() => {
				this.concurrencyControl.release({ mode: executionData.executionMode });
				if (execution.status === 'waiting') {
					delete execution.workflowExecution;
				} else {
					delete this.activeExecutions[executionId];
					this.logger.debug('Execution removed', { executionId });
				}
			});
		this.logger.debug('Execution added', { executionId });
		return executionId;
	}
	attachWorkflowExecution(executionId, workflowExecution) {
		this.getExecutionOrFail(executionId).workflowExecution = workflowExecution;
	}
	attachResponsePromise(executionId, responsePromise) {
		this.getExecutionOrFail(executionId).responsePromise = responsePromise;
	}
	resolveResponsePromise(executionId, response) {
		const execution = this.activeExecutions[executionId];
		execution?.responsePromise?.resolve(response);
	}
	sendChunk(executionId, chunkText) {
		const execution = this.activeExecutions[executionId];
		if (execution?.httpResponse) {
			execution?.httpResponse.write(JSON.stringify(chunkText) + '\n');
			execution?.httpResponse.flush();
		}
	}
	stopExecution(executionId) {
		const execution = this.activeExecutions[executionId];
		if (execution === undefined) {
			return;
		}
		const error = new n8n_workflow_1.ExecutionCancelledError(executionId);
		execution.responsePromise?.reject(error);
		if (execution.status === 'waiting') {
			delete this.activeExecutions[executionId];
		} else {
			execution.workflowExecution?.cancel();
			execution.postExecutePromise.reject(error);
		}
		this.logger.debug('Execution cancelled', { executionId });
	}
	finalizeExecution(executionId, fullRunData) {
		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);
		if (execution.executionData.httpResponse) {
			try {
				this.logger.debug('Closing response for execution', { executionId });
				execution.executionData.httpResponse.end();
			} catch (error) {
				this.logger.error('Error closing streaming response', {
					executionId,
					error: error.message,
				});
			}
		}
		execution.postExecutePromise.resolve(fullRunData);
		this.logger.debug('Execution finalized', { executionId });
	}
	resolveExecutionResponsePromise(executionId) {
		if (!this.has(executionId)) return;
		const execution = this.getExecutionOrFail(executionId);
		if (execution.status !== 'waiting' && execution?.responsePromise) {
			execution.responsePromise.resolve({});
			this.logger.debug('Execution response promise cleaned', { executionId });
		}
	}
	async getPostExecutePromise(executionId) {
		return await this.getExecutionOrFail(executionId).postExecutePromise.promise;
	}
	getActiveExecutions() {
		const returnData = [];
		let data;
		for (const id of Object.keys(this.activeExecutions)) {
			data = this.activeExecutions[id];
			returnData.push({
				id,
				retryOf: data.executionData.retryOf ?? undefined,
				startedAt: data.startedAt,
				mode: data.executionData.executionMode,
				workflowId: data.executionData.workflowData.id,
				status: data.status,
			});
		}
		return returnData;
	}
	setStatus(executionId, status) {
		this.getExecutionOrFail(executionId).status = status;
	}
	getStatus(executionId) {
		return this.getExecutionOrFail(executionId).status;
	}
	async shutdown(cancelAll = false) {
		const isRegularMode = config_1.default.getEnv('executions.mode') === 'regular';
		if (isRegularMode) {
			this.concurrencyControl.disable();
		}
		let executionIds = Object.keys(this.activeExecutions);
		const toCancel = [];
		for (const executionId of executionIds) {
			const { responsePromise, status } = this.activeExecutions[executionId];
			if (!!responsePromise || (isRegularMode && cancelAll)) {
				this.stopExecution(executionId);
				toCancel.push(executionId);
			} else if (status === 'waiting' || status === 'new') {
				delete this.activeExecutions[executionId];
			}
		}
		await this.concurrencyControl.removeAll(toCancel);
		let count = 0;
		executionIds = Object.keys(this.activeExecutions);
		while (executionIds.length !== 0) {
			if (count++ % 4 === 0) {
				this.logger.info(`Waiting for ${executionIds.length} active executions to finish...`);
			}
			await (0, n8n_workflow_1.sleep)(500);
			executionIds = Object.keys(this.activeExecutions);
		}
	}
	getExecutionOrFail(executionId) {
		const execution = this.activeExecutions[executionId];
		if (!execution) {
			throw new execution_not_found_error_1.ExecutionNotFoundError(executionId);
		}
		return execution;
	}
};
exports.ActiveExecutions = ActiveExecutions;
exports.ActiveExecutions = ActiveExecutions = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.ExecutionRepository,
			concurrency_control_service_1.ConcurrencyControlService,
		]),
	],
	ActiveExecutions,
);
//# sourceMappingURL=active-executions.js.map
