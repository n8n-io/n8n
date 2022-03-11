/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Command, flags } from '@oclif/command';

import { INode, INodeCredentialsDetails, LoggerProxy } from 'n8n-workflow';

import * as fs from 'fs';
import * as glob from 'fast-glob';
import { UserSettings } from 'n8n-core';
import { getLogger } from '../../src/Logger';
import { Db, ICredentialsDb } from '../../src';

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

	private transformCredentials(node: INode, credentialsEntities: ICredentialsDb[]) {
		if (node.credentials) {
			const allNodeCredentials = Object.entries(node.credentials);
			// eslint-disable-next-line no-restricted-syntax
			for (const [type, name] of allNodeCredentials) {
				if (typeof name === 'string') {
					const nodeCredentials: INodeCredentialsDetails = {
						id: null,
						name,
					};

					const matchingCredentials = credentialsEntities.filter(
						(credentials) => credentials.name === name && credentials.type === type,
					);

					if (matchingCredentials.length === 1) {
						nodeCredentials.id = matchingCredentials[0].id.toString();
					}

					// eslint-disable-next-line no-param-reassign
					node.credentials[type] = nodeCredentials;
				}
			}
		}
	}

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
			const credentialsEntities = (await Db.collections.Credentials?.find()) ?? [];
			let i;
			if (flags.separate) {
				let inputPath = flags.input;
				if (process.platform === 'win32') {
					inputPath = inputPath.replace(/\\/g, '/');
				}
				inputPath = inputPath.replace(/\/$/g, '');
				const files = await glob(`${inputPath}/*.json`);
				for (i = 0; i < files.length; i++) {
					const workflow = JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));
					if (credentialsEntities.length > 0) {
						// eslint-disable-next-line
						workflow.nodes.forEach((node: INode) => {
							this.transformCredentials(node, credentialsEntities);
						});
					}
					// eslint-disable-next-line no-await-in-loop, @typescript-eslint/no-non-null-assertion
					await Db.collections.Workflow!.save(workflow);
				}
			} else {
				const fileContents = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

				if (!Array.isArray(fileContents)) {
					throw new Error(`File does not seem to contain workflows.`);
				}

				for (i = 0; i < fileContents.length; i++) {
					if (credentialsEntities.length > 0) {
						// eslint-disable-next-line
						fileContents[i].nodes.forEach((node: INode) => {
							this.transformCredentials(node, credentialsEntities);
						});
					}
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
