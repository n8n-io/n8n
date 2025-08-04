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
exports.ListWorkflowCommand = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const zod_1 = require('zod');
const base_command_1 = require('../base-command');
const flagsSchema = zod_1.z.object({
	active: zod_1.z
		.string()
		.describe('Filters workflows by active status. Can be true or false')
		.optional(),
	onlyId: zod_1.z.boolean().describe('Outputs workflow IDs only, one per line.').default(false),
});
let ListWorkflowCommand = class ListWorkflowCommand extends base_command_1.BaseCommand {
	async run() {
		const { flags } = this;
		if (flags.active !== undefined && !['true', 'false'].includes(flags.active)) {
			this.error('The --active flag has to be passed using true or false');
		}
		const workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
		const workflows =
			flags.active !== undefined
				? await workflowRepository.findByActiveState(flags.active === 'true')
				: await workflowRepository.find();
		if (flags.onlyId) {
			workflows.forEach((workflow) => this.logger.info(workflow.id));
		} else {
			workflows.forEach((workflow) => this.logger.info(`${workflow.id}|${workflow.name}`));
		}
	}
	async catch(error) {
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack);
	}
};
exports.ListWorkflowCommand = ListWorkflowCommand;
exports.ListWorkflowCommand = ListWorkflowCommand = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'list:workflow',
			description: 'List workflows',
			examples: ['', '--active=true --onlyId', '--active=false'],
			flagsSchema,
		}),
	],
	ListWorkflowCommand,
);
//# sourceMappingURL=workflow.js.map
