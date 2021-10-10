/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Command, flags } from '@oclif/command';

import { LoggerProxy } from 'n8n-workflow';

import * as fs from 'fs';
import * as glob from 'fast-glob';
import * as path from 'path';
import { UserSettings } from 'n8n-core';
import { getLogger } from '../../src/Logger';
import { Db } from '../../src';

export class ImportWorkflowsCommand extends Command {
	static description = 'Import workflows';

	static examples = [
		`$ n8n import:workflow --input=file.json`,
		`$ n8n import:workflow --separate --input=backups/latest/`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		input: flags.string({
			char: 'i',
			description: 'Input file name or directory if --separate is used',
		}),
		separate: flags.boolean({
			description: 'Imports *.json files from directory provided by --input',
		}),
	};

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	async run() {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(ImportWorkflowsCommand);

		if (!flags.input) {
			console.info(`An input file or directory with --input must be provided`);
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					console.info(`The paramenter --input must be a directory`);
					return;
				}
			}
		}

		try {
			await Db.init();

			// Make sure the settings exist
			await UserSettings.prepareUserSettings();
			let i;
			if (flags.separate) {
				const files = await glob(
					`${flags.input.endsWith(path.sep) ? flags.input : flags.input + path.sep}*.json`,
				);
				for (i = 0; i < files.length; i++) {
					const workflow = JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));
					// eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-non-null-assertion
					await Db.collections.Workflow!.save(workflow);
				}
			} else {
				const fileContents = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

				if (!Array.isArray(fileContents)) {
					throw new Error(`File does not seem to contain workflows.`);
				}

				for (i = 0; i < fileContents.length; i++) {
					// eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-non-null-assertion
					await Db.collections.Workflow!.save(fileContents[i]);
				}
			}

			console.info(`Successfully imported ${i} ${i === 1 ? 'workflow.' : 'workflows.'}`);
			process.exit(0);
		} catch (error) {
			console.error('An error occurred while exporting workflows. See log messages for details.');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			logger.error(error.message);
			this.exit(1);
		}
	}
}
