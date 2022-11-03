/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */
import { Command, flags } from '@oclif/command';

import { IDataObject, LoggerProxy } from 'n8n-workflow';

import fs from 'fs';
import path from 'path';
import { getLogger } from '@/Logger';
import * as Db from '@/Db';

export class ExportWorkflowsCommand extends Command {
	static description = 'Export workflows';

	static examples = [
		`$ n8n export:workflow --all`,
		`$ n8n export:workflow --id=5 --output=file.json`,
		`$ n8n export:workflow --all --output=backups/latest/`,
		`$ n8n export:workflow --backup --output=backups/latest/`,
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

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(ExportWorkflowsCommand);

		if (flags.backup) {
			flags.all = true;
			flags.pretty = true;
			flags.separate = true;
		}

		if (!flags.all && !flags.id) {
			console.info(`Either option "--all" or "--id" have to be set!`);
			return;
		}

		if (flags.all && flags.id) {
			console.info(`You should either use "--all" or "--id" but never both!`);
			return;
		}

		if (flags.separate) {
			try {
				if (!flags.output) {
					console.info(`You must inform an output directory via --output when using --separate`);
					return;
				}

				if (fs.existsSync(flags.output)) {
					if (!fs.lstatSync(flags.output).isDirectory()) {
						console.info(`The parameter --output must be a directory`);
						return;
					}
				} else {
					fs.mkdirSync(flags.output, { recursive: true });
				}
			} catch (e) {
				console.error(
					'Aborting execution as a filesystem error has been encountered while creating the output directory. See log messages for details.',
				);
				logger.error('\nFILESYSTEM ERROR');
				logger.info('====================================');
				logger.error(e.message);
				logger.error(e.stack);
				this.exit(1);
			}
		} else if (flags.output) {
			if (fs.existsSync(flags.output)) {
				if (fs.lstatSync(flags.output).isDirectory()) {
					console.info(`The parameter --output must be a writeable file`);
					return;
				}
			}
		}

		try {
			await Db.init();

			const findQuery: IDataObject = {};
			if (flags.id) {
				findQuery.id = flags.id;
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
				console.info(`Successfully exported ${i} workflows.`);
			} else {
				const fileContents = JSON.stringify(workflows, null, flags.pretty ? 2 : undefined);
				if (flags.output) {
					fs.writeFileSync(flags.output, fileContents);
					console.info(
						`Successfully exported ${workflows.length} ${
							workflows.length === 1 ? 'workflow.' : 'workflows.'
						}`,
					);
				} else {
					console.info(fileContents);
				}
			}
			// Force exit as process won't exit using MySQL or Postgres.
			process.exit(0);
		} catch (error) {
			console.error('Error exporting workflows. See log messages for details.');
			logger.error(error.message);
			this.exit(1);
		}
	}
}
