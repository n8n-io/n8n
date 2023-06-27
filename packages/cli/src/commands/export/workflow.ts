import { flags } from '@oclif/command';
import fs from 'fs';
import path from 'path';
import type { FindOptionsWhere } from 'typeorm';
import * as Db from '@/Db';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { BaseCommand } from '../BaseCommand';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';

export class ExportWorkflowsCommand extends BaseCommand {
	static description = 'Export workflows';

	static examples = [
		'$ n8n export:workflow --all',
		'$ n8n export:workflow --id=5 --output=file.json',
		'$ n8n export:workflow --all --output=backups/latest/',
		'$ n8n export:workflow --backup --output=backups/latest/',
		'$ n8n export:workflow --all --userId=ef4793f5-46fa-4ef7-ca81-01575a749621 --output=backups/latest.json'
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		all: flags.boolean({
			description: 'Export all workflows',
		}),
		backup: flags.boolean({
			description:
				'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
		}),
		id: flags.string({
			description: 'The ID of the workflow to export',
		}),
		userId: flags.string({
			description: 'The ID of the user who owns workflows'
		}),
		output: flags.string({
			char: 'o',
			description: 'Output file name or directory if using separate files',
		}),
		pretty: flags.boolean({
			description: 'Format the output in an easier to read fashion',
		}),
		separate: flags.boolean({
			description:
				'Exports one file per workflow (useful for versioning). Must inform a directory via --output.',
		}),
	};

	async run() {
		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(ExportWorkflowsCommand);

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
		if (flags.id && flags.userId) {
			this.logger.info('You should either use "--id" or "--userId" but never both!');
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

				if (fs.existsSync(flags.output)) {
					if (!fs.lstatSync(flags.output).isDirectory()) {
						this.logger.info('The parameter --output must be a directory');
						return;
					}
				} else {
					fs.mkdirSync(flags.output, { recursive: true });
				}
			} catch (e) {
				this.logger.error(
					'Aborting execution as a filesystem error has been encountered while creating the output directory. See log messages for details.',
				);
				this.logger.error('\nFILESYSTEM ERROR');
				this.logger.info('====================================');
				if (e instanceof Error) {
					this.logger.error(e.message);
					this.logger.error(e.stack!);
				}
				this.exit(1);
			}
		} else if (flags.output) {
			if (fs.existsSync(flags.output)) {
				if (fs.lstatSync(flags.output).isDirectory()) {
					this.logger.info('The parameter --output must be a writeable file');
					return;
				}
			}
		}

		const findQuery: FindOptionsWhere<WorkflowEntity>[] = [{}];
		const findSharedWorkflowsQuery: FindOptionsWhere<SharedWorkflow> = {};

		if (flags.id) {
			findQuery.push({
				id: flags.id
			})
		
		}
		if (flags.userId) {
			findSharedWorkflowsQuery.userId = flags.userId;
			const workflowsOfUser = await Db.collections.SharedWorkflow.findBy(findSharedWorkflowsQuery)
			
			if (workflowsOfUser.length === 0) {
				this.logger.error('This user does not have any workflow');
				return;
			}
		    workflowsOfUser.forEach(workflow => findQuery.push({
				id: workflow.workflowId
			}))
			
		}
       
		const workflows = await Db.collections.Workflow.find({
			where: findQuery,
			relations: ['tags'],
		});

		if (workflows.length === 0) {
			throw new Error('No workflows found with specified filters.');
		}

		if (flags.separate) {
			let fileContents: string;
			let i: number;
			for (i = 0; i < workflows.length; i++) {
				fileContents = JSON.stringify(workflows[i], null, flags.pretty ? 2 : undefined);
				const filename = `${
					// eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-non-null-assertion
					(flags.output!.endsWith(path.sep) ? flags.output! : flags.output + path.sep) +
					workflows[i].id
				}.json`;
				fs.writeFileSync(filename, fileContents);
			}
			this.logger.info(`Successfully exported ${i} workflows.`);
		} else {
			const fileContents = JSON.stringify(workflows, null, flags.pretty ? 2 : undefined);
			if (flags.output) {
				fs.writeFileSync(flags.output, fileContents);
				this.logger.info(
					`Successfully exported ${workflows.length} ${
						workflows.length === 1 ? 'workflow.' : 'workflows.'
					}`,
				);
			} else {
				this.logger.info(fileContents);
			}
		}
	}

	async catch(error: Error) {
		this.logger.error('Error exporting workflows. See log messages for details.');
		this.logger.error(error.message);
	}
}
