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
exports.DebugController = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const n8n_core_1 = require('n8n-core');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const multi_main_setup_ee_1 = require('@/scaling/multi-main-setup.ee');
let DebugController = class DebugController {
	constructor(multiMainSetup, activeWorkflowManager, workflowRepository, instanceSettings) {
		this.multiMainSetup = multiMainSetup;
		this.activeWorkflowManager = activeWorkflowManager;
		this.workflowRepository = workflowRepository;
		this.instanceSettings = instanceSettings;
	}
	async getMultiMainSetupDetails() {
		const leaderKey = await this.multiMainSetup.fetchLeaderKey();
		const triggersAndPollers = await this.workflowRepository.findIn(
			this.activeWorkflowManager.allActiveInMemory(),
		);
		const webhooks = await this.workflowRepository.findWebhookBasedActiveWorkflows();
		const activationErrors = await this.activeWorkflowManager.getAllWorkflowActivationErrors();
		return {
			instanceId: this.instanceSettings.instanceId,
			leaderKey,
			isLeader: this.instanceSettings.isLeader,
			activeWorkflows: {
				webhooks,
				triggersAndPollers,
			},
			activationErrors,
		};
	}
};
exports.DebugController = DebugController;
__decorate(
	[
		(0, decorators_1.Get)('/multi-main-setup', { skipAuth: true }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	DebugController.prototype,
	'getMultiMainSetupDetails',
	null,
);
exports.DebugController = DebugController = __decorate(
	[
		(0, decorators_1.RestController)('/debug'),
		__metadata('design:paramtypes', [
			multi_main_setup_ee_1.MultiMainSetup,
			active_workflow_manager_1.ActiveWorkflowManager,
			db_1.WorkflowRepository,
			n8n_core_1.InstanceSettings,
		]),
	],
	DebugController,
);
//# sourceMappingURL=debug.controller.js.map
