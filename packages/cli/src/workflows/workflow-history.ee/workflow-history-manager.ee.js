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
exports.WorkflowHistoryManager = void 0;
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const luxon_1 = require('luxon');
const workflow_history_helper_ee_1 = require('./workflow-history-helper.ee');
let WorkflowHistoryManager = class WorkflowHistoryManager {
	constructor(workflowHistoryRepo) {
		this.workflowHistoryRepo = workflowHistoryRepo;
	}
	init() {
		if (this.pruneTimer !== undefined) {
			clearInterval(this.pruneTimer);
		}
		this.pruneTimer = setInterval(
			async () => await this.prune(),
			1 * constants_1.Time.hours.toMilliseconds,
		);
	}
	shutdown() {
		if (this.pruneTimer !== undefined) {
			clearInterval(this.pruneTimer);
			this.pruneTimer = undefined;
		}
	}
	async prune() {
		if (!(0, workflow_history_helper_ee_1.isWorkflowHistoryEnabled)()) {
			return;
		}
		const pruneHours = (0, workflow_history_helper_ee_1.getWorkflowHistoryPruneTime)();
		if (pruneHours === -1) {
			return;
		}
		const pruneDateTime = luxon_1.DateTime.now().minus({ hours: pruneHours }).toJSDate();
		await this.workflowHistoryRepo.deleteEarlierThan(pruneDateTime);
	}
};
exports.WorkflowHistoryManager = WorkflowHistoryManager;
exports.WorkflowHistoryManager = WorkflowHistoryManager = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [db_1.WorkflowHistoryRepository])],
	WorkflowHistoryManager,
);
//# sourceMappingURL=workflow-history-manager.ee.js.map
