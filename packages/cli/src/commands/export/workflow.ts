import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Flags } from '@oclif/core';
import fs from 'fs';
import { UserError } from 'n8n-workflow';
import path from 'path';

import { BaseCommand } from '../base-command';

export class ExportWorkflowsCommand extends BaseCommand {
	static description = 'Export workflows';

	static examples = [
		'$ n8n export:workflow --all',
		'$ n8n export:workflow --id=5 --output=file.json',
		'$ n8n export:workflow --all --output=backups/latest/',
		'$ n8n export:workflow --backup --output=backups/latest/',
	];

	static flags = {
		help: Flags.help({ char: 'h' }),
		all: Flags.boolean({
			description: 'Export all workflows',
		}),
		backup: Flags.boolean({
			description:
				'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
		}),
		id: Flags.string({
			description: 'The ID of the workflow to export',
		}),
		output: Flags.string({
			char: 'o',
			description: 'Output file name or directory if using separate files',
		}),
		pretty: Flags.boolean({
			description: 'Format the output in an easier to read fashion',
		}),
		separate: Flags.boolean({
			description:
				'Exports one file per workflow (useful for versioning). Must inform a directory via --output.',
		}),
	};

	// eslint-disable-next-line complexity
	async run() {
		const { flags } = await this.parse(ExportWorkflowsCommand);

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

		const workflows = await Container.get(WorkflowRepository).find({
			where: flags.id ? { id: flags.id } : {},
			relations: ['tags'],
		});

		if (workflows.length === 0) {
			throw new UserError('No workflows found with specified filters');
		}

		if (flags.separate) {
			let fileContents: string;
			let i: number;
			for (i = 0; i < workflows.length; i++) {
				fileContents = JSON.stringify(workflows[i], null, flags.pretty ? 2 : undefined);
				const filename = `${
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
