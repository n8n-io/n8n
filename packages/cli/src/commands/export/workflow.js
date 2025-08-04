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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExportWorkflowsCommand = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const fs_1 = __importDefault(require('fs'));
const n8n_workflow_1 = require('n8n-workflow');
const path_1 = __importDefault(require('path'));
const zod_1 = require('zod');
const base_command_1 = require('../base-command');
const flagsSchema = zod_1.z.object({
	all: zod_1.z.boolean().describe('Export all workflows').optional(),
	backup: zod_1.z
		.boolean()
		.describe(
			'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
		)
		.optional(),
	id: zod_1.z.string().describe('The ID of the workflow to export').optional(),
	output: zod_1.z
		.string()
		.alias('o')
		.describe('Output file name or directory if using separate files')
		.optional(),
	pretty: zod_1.z.boolean().describe('Format the output in an easier to read fashion').optional(),
	separate: zod_1.z
		.boolean()
		.describe(
			'Exports one file per workflow (useful for versioning). Must inform a directory via --output.',
		)
		.optional(),
});
let ExportWorkflowsCommand = class ExportWorkflowsCommand extends base_command_1.BaseCommand {
	async run() {
		const { flags } = this;
		if (flags.backup) {
			flags.all = true;
			flags.pretty = true;
			flags.separate = true;
		}
		if (!flags.all && !flags.id) {
			this.logger.info('Either option "--all" or "--id" have to be set!');
			return;
		}
		if (flags.all && flags.id) {
			this.logger.info('You should either use "--all" or "--id" but never both!');
			return;
		}
		if (flags.separate) {
			try {
				if (!flags.output) {
					this.logger.info(
						'You must inform an output directory via --output when using --separate',
					);
					return;
				}
				if (fs_1.default.existsSync(flags.output)) {
					if (!fs_1.default.lstatSync(flags.output).isDirectory()) {
						this.logger.info('The parameter --output must be a directory');
						return;
					}
				} else {
					fs_1.default.mkdirSync(flags.output, { recursive: true });
				}
			} catch (e) {
				this.logger.error(
					'Aborting execution as a filesystem error has been encountered while creating the output directory. See log messages for details.',
				);
				this.logger.error('\nFILESYSTEM ERROR');
				this.logger.info('====================================');
				if (e instanceof Error) {
					this.logger.error(e.message);
					this.logger.error(e.stack);
				}
				process.exit(1);
			}
		} else if (flags.output) {
			if (fs_1.default.existsSync(flags.output)) {
				if (fs_1.default.lstatSync(flags.output).isDirectory()) {
					this.logger.info('The parameter --output must be a writeable file');
					return;
				}
			}
		}
		const workflows = await di_1.Container.get(db_1.WorkflowRepository).find({
			where: flags.id ? { id: flags.id } : {},
			relations: ['tags'],
		});
		if (workflows.length === 0) {
			throw new n8n_workflow_1.UserError('No workflows found with specified filters');
		}
		if (flags.separate) {
			let fileContents;
			let i;
			for (i = 0; i < workflows.length; i++) {
				fileContents = JSON.stringify(workflows[i], null, flags.pretty ? 2 : undefined);
				const filename = `${
					(flags.output.endsWith(path_1.default.sep)
						? flags.output
						: flags.output + path_1.default.sep) + workflows[i].id
				}.json`;
				fs_1.default.writeFileSync(filename, fileContents);
			}
			this.logger.info(`Successfully exported ${i} workflows.`);
		} else {
			const fileContents = JSON.stringify(workflows, null, flags.pretty ? 2 : undefined);
			if (flags.output) {
				fs_1.default.writeFileSync(flags.output, fileContents);
				this.logger.info(
					`Successfully exported ${workflows.length} ${workflows.length === 1 ? 'workflow.' : 'workflows.'}`,
				);
			} else {
				this.logger.info(fileContents);
			}
		}
	}
	async catch(error) {
		this.logger.error('Error exporting workflows. See log messages for details.');
		this.logger.error(error.message);
	}
};
exports.ExportWorkflowsCommand = ExportWorkflowsCommand;
exports.ExportWorkflowsCommand = ExportWorkflowsCommand = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'export:workflow',
			description: 'Export workflows',
			examples: [
				'--all',
				'--id=5 --output=file.json',
				'--all --output=backups/latest/',
				'--backup --output=backups/latest/',
			],
			flagsSchema,
		}),
	],
	ExportWorkflowsCommand,
);
//# sourceMappingURL=workflow.js.map
