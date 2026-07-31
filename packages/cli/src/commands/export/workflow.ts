import { WorkflowRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import fs from 'fs';
import { UserError } from 'n8n-workflow';
import path from 'path';
import { z } from 'zod';
import '../../zod-alias-support';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	all: z.boolean().describe('Export all workflows').optional(),
	backup: z
		.boolean()
		.describe(
			'Sets --all --pretty --separate for simple backups. Only --output has to be set additionally.',
		)
		.optional(),
	id: z.string().describe('The ID of the workflow to export').optional(),
	projectId: z.string().describe('Export all workflows in the specified project').optional(),
	output: z
		.string()
		.alias('o')
		.describe('Output file name or directory if using separate files')
		.optional(),
	pretty: z.boolean().describe('Format the output in an easier to read fashion').optional(),
	separate: z
		.boolean()
		.describe(
			'Exports one file per workflow (useful for versioning). Must inform a directory via --output.',
		)
		.optional(),
});

@Command({
	name: 'export:workflow',
	description: 'Export workflows',
	examples: [
		'--all',
		'--projectId=Ox8O54VQrmBrb4qL',
		'--id=5 --output=file.json',
		'--all --output=backups/latest/',
		'--backup --output=backups/latest/',
	],
	flagsSchema,
})
export class ExportWorkflowsCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	// eslint-disable-next-line complexity
	async run() {
		const { flags } = this;

		if (flags.backup) {
			flags.all = true;
			flags.pretty = true;
			flags.separate = true;
		}

		const selectorCount = [flags.all, flags.id, flags.projectId].filter(Boolean).length;

		if (selectorCount === 0) {
			this.logger.info('One of "--all", "--id", or "--projectId" has to be set!');
			return;
		}

		if (selectorCount > 1) {
			this.logger.info('Use exactly one of "--all", "--id", or "--projectId".');
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
				process.exit(1);
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
			where: this.getWhereFilter(flags),
			relations: ['tags', 'shared', 'shared.project'],
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
					(flags.output!.endsWith(path.sep) ? flags.output : flags.output + path.sep) +
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

	private getWhereFilter(flags: z.infer<typeof flagsSchema>) {
		if (flags.id) {
			return { id: flags.id };
		}

		if (flags.projectId) {
			return { shared: { projectId: flags.projectId } };
		}

		return {};
	}
}
