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
Object.defineProperty(exports, '__esModule', { value: true });
exports.UpdateWorkflowCommand = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const zod_1 = require('zod');
const base_command_1 = require('../base-command');
const flagsSchema = zod_1.z.object({
	active: zod_1.z.string().describe('Active state the workflow/s should be set to').optional(),
	all: zod_1.z.boolean().describe('Operate on all workflows').optional(),
	id: zod_1.z.string().describe('The ID of the workflow to operate on').optional(),
});
let UpdateWorkflowCommand = class UpdateWorkflowCommand extends base_command_1.BaseCommand {
	async run() {
		const { flags } = this;
		if (!flags.all && !flags.id) {
			this.logger.error('Either option "--all" or "--id" have to be set!');
			return;
		}
		if (flags.all && flags.id) {
			this.logger.error(
				'Either something else on top should be "--all" or "--id" can be set never both!',
			);
			return;
		}
		if (flags.active === undefined) {
			this.logger.error('No update flag like "--active=true" has been set!');
			return;
		}
		if (!['false', 'true'].includes(flags.active)) {
			this.logger.error('Valid values for flag "--active" are only "false" or "true"!');
			return;
		}
		const newState = flags.active === 'true';
		const action = newState ? 'Activating' : 'Deactivating';
		if (flags.id) {
			this.logger.info(`${action} workflow with ID: ${flags.id}`);
			await di_1.Container.get(db_1.WorkflowRepository).updateActiveState(flags.id, newState);
		} else {
			this.logger.info(`${action} all workflows`);
			if (newState) {
				await di_1.Container.get(db_1.WorkflowRepository).activateAll();
			} else {
				await di_1.Container.get(db_1.WorkflowRepository).deactivateAll();
			}
		}
		this.logger.info('Activation or deactivation will not take effect if n8n is running.');
		this.logger.info('Please restart n8n for changes to take effect if n8n is currently running.');
	}
	async catch(error) {
		this.logger.error('Error updating database. See log messages for details.');
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack);
	}
};
exports.UpdateWorkflowCommand = UpdateWorkflowCommand;
exports.UpdateWorkflowCommand = UpdateWorkflowCommand = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'update:workflow',
			description: 'Update workflows',
			examples: ['--all --active=false', '--id=5 --active=true'],
			flagsSchema,
		}),
	],
	UpdateWorkflowCommand,
);
//# sourceMappingURL=workflow.js.map
