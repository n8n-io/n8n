/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Command, flags } from '@oclif/command';

import { INode, INodeCredentialsDetails, LoggerProxy } from 'n8n-workflow';

import * as fs from 'fs';
import * as glob from 'fast-glob';
import { UserSettings } from 'n8n-core';
import { getLogger } from '../../src/Logger';
import { Db, ICredentialsDb } from '../../src';
import { User } from '../../src/databases/entities/User';
import { SharedWorkflow } from '../../src/databases/entities/SharedWorkflow';

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

	async run(): Promise<void> {
		const logger = getLogger();
		LoggerProxy.init(logger);

		// eslint-disable-next-line @typescript-eslint/no-shadow
		const { flags } = this.parse(ImportWorkflowsCommand);

		if (!flags.input) {
			console.info('An input file or directory with --input must be provided');
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					console.info('The argument to --input must be a directory');
					return;
				}
			}
		}

		try {
			await Db.init();

			const owner = await this.getInstanceOwner();
			const ownerWorkflowRole = await Db.collections.Role!.findOneOrFail({
				name: 'owner',
				scope: 'workflow',
			});

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
						workflow.nodes.forEach((node: INode) => {
							this.transformCredentials(node, credentialsEntities);
						});
					}
					await Db.collections.Workflow!.save(workflow);

					const sharedWorkflow = new SharedWorkflow();

					await Db.collections.SharedWorkflow!.save(
						Object.assign(sharedWorkflow, {
							user: owner,
							workflow,
							role: ownerWorkflowRole,
						}),
					);
				}
			} else {
				const workflows = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

				if (!Array.isArray(workflows)) {
					throw new Error('File does not seem to contain workflows.');
				}

				for (i = 0; i < workflows.length; i++) {
					if (credentialsEntities.length > 0) {
						workflows[i].nodes.forEach((node: INode) => {
							this.transformCredentials(node, credentialsEntities);
						});
					}
					await Db.collections.Workflow!.save(workflows[i]);

					const sharedWorkflow = new SharedWorkflow();

					await Db.collections.SharedWorkflow!.save(
						Object.assign(sharedWorkflow, {
							user: owner,
							workflow: workflows[i],
							role: ownerWorkflowRole,
						}),
					);
				}
			}

			console.info(`Successfully imported ${i} ${i === 1 ? 'workflow.' : 'workflows.'}`);
			process.exit();
		} catch (error) {
			console.error('An error occurred while importing workflows. See log messages for details.');
			if (error instanceof Error) logger.error(error.message);
			this.exit(1);
		}
	}

	private async getInstanceOwner(): Promise<User> {
		const globalRole = await Db.collections.Role!.findOneOrFail({
			name: 'owner',
			scope: 'global',
		});

		const owner = await Db.collections.User!.findOne({ globalRole });

		if (owner) return owner;

		const user = new User();

		await Db.collections.User!.save(
			Object.assign(user, {
				firstName: 'default',
				lastName: 'default',
				email: null,
				password: null,
				resetPasswordToken: null,
				...globalRole,
			}),
		);

		return Db.collections.User!.findOneOrFail({ globalRole });
	}
}
